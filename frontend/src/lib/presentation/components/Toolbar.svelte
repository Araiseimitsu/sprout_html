<script lang="ts">
  // 上部ツールバー。開く/保存/Undo/Redo/要素追加/削除。
  import {
    currentFileStore,
    dirtyStore,
    historyStore,
    selectionStore,
    treeStore,
  } from '../../state/stores/editorStore'
  import { getEngine } from '../../state/editorController'
  import { saveCurrentFile } from '../../application/usecases/fileUsecases'
  import { getFullscreenToggleLabel, getInsertableBlocks } from '../../shared/utils/uiLabels'

  // 編集中コンテンツがあるか。保存先(currentFile)の有無とは独立に判定する。
  // これにより、保存先未指定のAI生成ページでも保存・全画面・要素追加が行える。
  const hasContent = $derived($treeStore.length > 0)

  let {
    isPreviewFullscreen,
    onOpenClick,
    onAiClick,
    onFullscreenToggle,
  }: {
    isPreviewFullscreen: boolean
    onOpenClick: () => void
    onAiClick: () => void
    onFullscreenToggle: () => void
  } = $props()

  const insertableBlocks = getInsertableBlocks()
  let tagToAdd = $state<string>(insertableBlocks[0].tag)

  async function save() {
    let path = $currentFileStore
    // 保存先未指定(AI生成直後など)は、保存先パスの入力を促す。
    if (!path) {
      const input = window.prompt(
        '保存先のパスを入力してください(例: C:\\path\\to\\page.html)',
      )
      path = input?.trim() || null
      if (!path) return
    }
    await saveCurrentFile(path)
  }
  function addEl() {
    getEngine()?.addElement(tagToAdd)
  }
  function del() {
    getEngine()?.deleteSelected()
  }
  function undo() {
    getEngine()?.undo()
  }
  function redo() {
    getEngine()?.redo()
  }
</script>

<div class="toolbar">
  <button onclick={onOpenClick} title="編集するページを選ぶ">📂 ページを開く</button>
  <button onclick={save} disabled={!hasContent} class:dirty={$dirtyStore}>
    💾 {$dirtyStore ? '変更を保存' : '保存済み'}
  </button>

  <span class="sep"></span>

  <button onclick={undo} disabled={!$historyStore.canUndo} title="元に戻す">↶ 戻す</button>
  <button onclick={redo} disabled={!$historyStore.canRedo} title="やり直し">↷ やり直し</button>

  <span class="sep"></span>

  <span class="label">追加</span>
  <select bind:value={tagToAdd} title="ページに追加する部品">
    {#each insertableBlocks as block}
      <option value={block.tag}>{block.label}</option>
    {/each}
  </select>
  <button onclick={addEl} disabled={!hasContent}>＋ 入れる</button>
  <button onclick={del} disabled={!$selectionStore} class="danger">🗑 選択中を削除</button>

  <span class="sep"></span>

  <button onclick={onAiClick} class="ai" title="AIで生成・編集・画像生成">✨ AI</button>

  <span class="spacer"></span>

  <button
    onclick={onFullscreenToggle}
    disabled={!hasContent}
    class:active={isPreviewFullscreen}
    title={isPreviewFullscreen ? '編集画面に戻る' : 'HTMLページを大きく表示'}
  >
    ⛶ {getFullscreenToggleLabel(isPreviewFullscreen)}
  </button>

  <span class="file">
    {#if $currentFileStore}編集中のページあり{:else if hasContent}未保存(保存先未指定){:else}ページ未選択{/if}
  </span>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--sprout-surface);
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
    box-shadow: var(--sprout-shadow);
    flex-wrap: wrap;
  }
  button,
  select {
    font-size: 13px;
    padding: 7px 11px;
    border: 1px solid var(--sprout-line-strong);
    background: var(--sprout-surface-soft);
    color: var(--sprout-text);
    border-radius: 8px;
    cursor: pointer;
  }
  button:hover:not(:disabled),
  select:hover {
    background: var(--sprout-accent-soft);
    border-color: var(--sprout-accent);
  }
  button:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button.dirty {
    background: var(--sprout-warning-soft);
    border-color: #e1bc6f;
    color: var(--sprout-warning);
  }
  button.danger:not(:disabled) {
    background: var(--sprout-danger-soft);
    border-color: #efc4c0;
    color: var(--sprout-danger);
  }
  button.active:not(:disabled) {
    background: var(--sprout-accent);
    border-color: var(--sprout-accent-strong);
    color: #ffffff;
  }
  button.ai {
    background: var(--sprout-accent-soft);
    border-color: var(--sprout-accent);
    color: var(--sprout-accent-strong);
    font-weight: 600;
  }
  button.ai:hover:not(:disabled) {
    background: var(--sprout-accent);
    color: #ffffff;
  }
  .sep {
    width: 1px;
    height: 26px;
    background: var(--sprout-line);
    margin: 0 2px;
  }
  .label {
    font-size: 12px;
    color: var(--sprout-muted);
  }
  .spacer {
    flex: 1;
  }
  .file {
    font-size: 12px;
    color: var(--sprout-muted);
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
