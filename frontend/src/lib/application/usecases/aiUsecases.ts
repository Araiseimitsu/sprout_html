// AI(生成・編集・画像)ユースケース。
// API(infrastructure)とエンジン(state/editorController)を協調させ、
// UIに依存しない処理としてまとめる。

import { aiApi } from '../../infrastructure/api/aiApi'
import { ApiError } from '../../infrastructure/api/client'
import { buildAssetBaseHref } from '../../infrastructure/api/fileApi'
import { getEngine } from '../../state/editorController'
import {
  aiBusyStore,
  aiStatusStore,
  currentFileStore,
  setStatus,
} from '../../state/stores/editorStore'
import { get } from 'svelte/store'

/** AI機能の利用可否を取得してストアへ反映する。 */
export async function loadAiStatus(): Promise<void> {
  try {
    const status = await aiApi.status()
    aiStatusStore.set(status)
  } catch {
    // 取得できない場合は未設定扱い(UIで案内)。
    aiStatusStore.set({
      configured: false,
      sdk_available: false,
      text_model: '',
      image_model: '',
    })
  }
}

/** 共通の実行ラッパ。busy制御とエラー処理を一元化する。 */
async function runAi(action: () => Promise<void>): Promise<void> {
  aiBusyStore.set(true)
  try {
    await action()
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : 'AI処理に失敗しました')
  } finally {
    aiBusyStore.set(false)
  }
}

/** 要望からHTMLページをゼロ生成し、エディタに読み込む。savePath指定時は保存先として設定。 */
export async function generateNewPage(prompt: string, savePath?: string): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  await runAi(async () => {
    const { html } = await aiApi.generate(prompt)
    const baseHref = savePath ? buildAssetBaseHref(savePath) : ''
    await engine.mount(html, baseHref)
    currentFileStore.set(savePath ?? null)
    setStatus(
      'success',
      savePath ? `生成しました(保存先: ${savePath})` : '生成しました(保存先を指定して保存してください)',
    )
  })
}

/** ページ全体をAIに編集させ、結果を読み込む。 */
export async function editWholePage(instruction: string): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  await runAi(async () => {
    const current = engine.serialize()
    if (!current.trim()) {
      setStatus('error', '編集対象のページがありません。先にページを開くか生成してください')
      return
    }
    const { html } = await aiApi.editFull(instruction, current)
    const path = get(currentFileStore)
    const baseHref = path ? buildAssetBaseHref(path) : ''
    await engine.mount(html, baseHref)
    setStatus('success', 'ページ全体をAIで編集しました')
  })
}

/** 選択要素をAIに編集させ、置き換える。 */
export async function editSelectedElement(instruction: string): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  await runAi(async () => {
    const fragment = engine.getSelectedOuterHtml()
    if (!fragment) {
      setStatus('error', '部品を選択してから実行してください')
      return
    }
    const { html } = await aiApi.editFragment(instruction, fragment)
    const ok = engine.replaceSelected(html)
    if (!ok) {
      setStatus('error', 'AIの結果を反映できませんでした')
      return
    }
    setStatus('success', '選択した部品をAIで編集しました')
  })
}

/** 画像を生成して挿入する。保存先(編集中ファイル)があればファイル保存、無ければdata URI。 */
export async function generateAndInsertImage(prompt: string): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  await runAi(async () => {
    const referencePath = get(currentFileStore)
    const result = await aiApi.image(prompt, referencePath)
    engine.insertImage(result.src, prompt)
    setStatus(
      'success',
      result.mode === 'file' ? '画像を生成してファイル保存・挿入しました' : '画像を生成して挿入しました',
    )
  })
}
