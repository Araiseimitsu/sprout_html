<script lang="ts">
  // 画面全体のレイアウト。
  // 上: Toolbar / 中: [ツリー | キャンバス | プロパティ] / 下: ステータスバー。
  import Toolbar from './lib/presentation/components/Toolbar.svelte'
  import ElementTree from './lib/presentation/components/ElementTree.svelte'
  import EditorCanvas from './lib/presentation/components/EditorCanvas.svelte'
  import PropertiesPanel from './lib/presentation/components/PropertiesPanel.svelte'
  import FileOpener from './lib/presentation/components/FileOpener.svelte'
  import AiAssistant from './lib/presentation/components/AiAssistant.svelte'
  import RuntimePreview from './lib/presentation/components/RuntimePreview.svelte'
  import { currentFileStore, statusStore } from './lib/state/stores/editorStore'
  import { getEngine } from './lib/state/editorController'
  import { openDroppedHtmlFile, saveCurrentFile } from './lib/application/usecases/fileUsecases'
  import { loadAiStatus } from './lib/application/usecases/aiUsecases'

  let showOpener = $state(false)
  let showAi = $state(false)
  let showFullscreenPreview = $state(false)
  let isDraggingFile = $state(false)
  let dragDepth = 0

  // 起動時にAI機能の利用可否を取得しておく(UIの出し分け用)。
  loadAiStatus()

  // キーボードショートカット: Ctrl+S 保存 / Ctrl+Z 戻す / Ctrl+Y(またはShift+Z) やり直し。
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showFullscreenPreview) {
      showFullscreenPreview = false
      return
    }
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 's') {
      e.preventDefault()
      if ($currentFileStore) saveCurrentFile($currentFileStore)
    } else if (key === 'z' && !e.shiftKey) {
      e.preventDefault()
      getEngine()?.undo()
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault()
      getEngine()?.redo()
    }
  }

  function hasFiles(e: DragEvent): boolean {
    return Array.from(e.dataTransfer?.types ?? []).includes('Files')
  }

  function onDragenter(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth += 1
    isDraggingFile = true
  }

  function onDragover(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  function onDragleave(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) isDraggingFile = false
  }

  async function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth = 0
    isDraggingFile = false
    const file = e.dataTransfer?.files?.[0]
    if (file) await openDroppedHtmlFile(file)
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="app"
  role="application"
  ondragenter={onDragenter}
  ondragover={onDragover}
  ondragleave={onDragleave}
  ondrop={onDrop}
>
  <Toolbar
    isPreviewFullscreen={showFullscreenPreview}
    onOpenClick={() => (showOpener = true)}
    onAiClick={() => (showAi = true)}
    onFullscreenToggle={() => (showFullscreenPreview = true)}
  />

  <div class="workspace">
    <ElementTree />
    <EditorCanvas />
    <PropertiesPanel />
  </div>

  <div
    class="statusbar"
    class:error={$statusStore?.kind === 'error'}
    class:success={$statusStore?.kind === 'success'}
  >
    {$statusStore?.message ?? 'Sprout HTML — ページを開いて編集を始めましょう'}
  </div>

  {#if showOpener}
    <FileOpener onClose={() => (showOpener = false)} />
  {/if}

  {#if showAi}
    <AiAssistant onClose={() => (showAi = false)} />
  {/if}

  {#if showFullscreenPreview}
    <RuntimePreview onClose={() => (showFullscreenPreview = false)} />
  {/if}

  {#if isDraggingFile}
    <div class="drop-overlay" aria-hidden="true">
      <div>HTMLファイルをドロップ</div>
    </div>
  {/if}
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
  }
  :global(#app) {
    height: 100vh;
  }
  :global(:root) {
    --sprout-bg: #f6f8f5;
    --sprout-surface: #ffffff;
    --sprout-surface-soft: #f9faf7;
    --sprout-line: #dde5dc;
    --sprout-line-strong: #c8d6ca;
    --sprout-text: #26312d;
    --sprout-muted: #6f7b73;
    --sprout-accent: #4f8a6b;
    --sprout-accent-soft: #e7f3ec;
    --sprout-accent-strong: #2f6f50;
    --sprout-warning: #a66f17;
    --sprout-warning-soft: #fff4d8;
    --sprout-danger: #a0443f;
    --sprout-danger-soft: #fff0ef;
    --sprout-shadow: 0 1px 2px rgba(38, 49, 45, 0.08);
  }
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: system-ui, sans-serif;
    color: var(--sprout-text);
    background: var(--sprout-bg);
  }
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
    background: var(--sprout-bg);
  }
  .statusbar {
    padding: 7px 14px;
    font-size: 12px;
    background: var(--sprout-surface);
    color: var(--sprout-muted);
    border-top: 1px solid var(--sprout-line);
  }
  .statusbar.error {
    background: var(--sprout-danger-soft);
    color: var(--sprout-danger);
  }
  .statusbar.success {
    background: var(--sprout-accent-soft);
    color: var(--sprout-accent-strong);
  }
  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: grid;
    place-items: center;
    pointer-events: none;
    background: rgba(38, 49, 45, 0.24);
    border: 4px solid var(--sprout-accent);
  }
  .drop-overlay div {
    padding: 14px 18px;
    border-radius: 8px;
    background: var(--sprout-surface);
    color: var(--sprout-accent-strong);
    border: 1px solid var(--sprout-line-strong);
    font-weight: 700;
    box-shadow: 0 18px 50px rgba(38, 49, 45, 0.2);
  }
</style>
