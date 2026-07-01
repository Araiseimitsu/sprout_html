<script lang="ts">
  // 上部ツールバー。開く/保存/Undo/Redo/要素追加/削除。
  import {
    currentClientFileNameStore,
    currentFileStore,
    dirtyStore,
    historyStore,
    selectionStore,
    treeStore,
  } from '../../state/stores/editorStore'
  import { getEngine } from '../../state/editorController'
  import { downloadPageZip } from '../../application/usecases/fileUsecases'
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

  async function downloadZip() {
    await downloadPageZip()
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
  <div class="brand" aria-label="Sprout HTML">
    <img src="/icons/favicon-32.png" alt="" />
    <span>Sprout HTML</span>
  </div>

  <span class="sep"></span>

  <button onclick={onOpenClick} title="編集するページを選ぶ">
    <span class="btn-icon" aria-hidden="true">📂</span>
    <span class="btn-text">ページを開く</span>
  </button>
  <button
    onclick={downloadZip}
    disabled={!hasContent}
    class:dirty={$dirtyStore}
    title="HTML と画像を ZIP でダウンロード"
  >
    <span class="btn-icon" aria-hidden="true">📦</span>
    <span class="btn-text">ZIPでダウンロード</span>
  </button>

  <span class="sep"></span>

  <button onclick={undo} disabled={!$historyStore.canUndo} title="元に戻す">
    <span class="btn-icon" aria-hidden="true">↶</span>
    <span class="btn-text">戻す</span>
  </button>
  <button onclick={redo} disabled={!$historyStore.canRedo} title="やり直し">
    <span class="btn-icon" aria-hidden="true">↷</span>
    <span class="btn-text">やり直し</span>
  </button>

  <span class="sep"></span>

  <span class="label">追加</span>
  <select bind:value={tagToAdd} title="ページに追加する部品">
    {#each insertableBlocks as block}
      <option value={block.tag}>{block.label}</option>
    {/each}
  </select>
  <button onclick={addEl} disabled={!hasContent} title="部品を追加">
    <span class="btn-icon" aria-hidden="true">＋</span>
    <span class="btn-text">入れる</span>
  </button>
  <button onclick={del} disabled={!$selectionStore} class="danger" title="選択中の部品を削除">
    <span class="btn-icon" aria-hidden="true">🗑</span>
    <span class="btn-text">選択中を削除</span>
  </button>

  <span class="sep"></span>

  <button onclick={onAiClick} class="ai" title="AIで生成・編集・画像生成">
    <span class="btn-icon" aria-hidden="true">✨</span>
    <span class="btn-text">AI</span>
  </button>

  <span class="spacer"></span>

  <button
    onclick={onFullscreenToggle}
    disabled={!hasContent}
    class:active={isPreviewFullscreen}
    title={isPreviewFullscreen ? '編集画面に戻る' : 'HTMLページを大きく表示'}
  >
    <span class="btn-icon" aria-hidden="true">⛶</span>
    <span class="btn-text">{getFullscreenToggleLabel(isPreviewFullscreen)}</span>
  </button>

  <span class="file">
    {#if $currentClientFileNameStore}{$currentClientFileNameStore}{:else if $currentFileStore}サーバー上のページ{:else if hasContent}{$dirtyStore ? '未ダウンロードの変更あり' : '編集中'}{:else}ページ未選択{/if}
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
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    padding: 7px 11px;
    border: 1px solid var(--sprout-line-strong);
    background: var(--sprout-surface-soft);
    color: var(--sprout-text);
    border-radius: 8px;
    cursor: pointer;
  }
  .btn-icon {
    line-height: 1;
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
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: max-content;
    padding-right: 2px;
    color: var(--sprout-text);
    font-size: 14px;
    font-weight: 700;
  }
  .brand img {
    width: 32px;
    height: 32px;
    display: block;
    border-radius: 6px;
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
  @media (max-width: 768px) {
    .toolbar {
      gap: 6px;
      padding: 8px 10px;
    }
    .brand span {
      display: none;
    }
    .brand img {
      display: none;
    }
    .sep,
    .label,
    .file,
    .spacer {
      display: none;
    }
    .btn-text {
      display: none;
    }
    button,
    select {
      padding: 7px 8px;
    }
    select {
      max-width: 96px;
    }
  }
</style>
