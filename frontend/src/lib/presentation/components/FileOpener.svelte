<script lang="ts">
  // ファイルを選んで開くためのブラウザ(モーダル)。
  import { fileApi } from '../../infrastructure/api/fileApi'
  import { ApiError } from '../../infrastructure/api/client'
  import { openFile } from '../../application/usecases/fileUsecases'
  import type { FileEntry } from '../../shared/types'

  let { onClose }: { onClose: () => void } = $props()

  let current = $state('')
  let parent = $state('')
  let entries = $state<FileEntry[]>([])
  let error = $state('')

  async function load(path?: string) {
    error = ''
    try {
      const res = await fileApi.browse(path)
      current = res.current
      parent = res.parent
      entries = res.entries
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'ページ一覧を読み込めませんでした'
    }
  }

  async function choose(entry: FileEntry) {
    if (entry.is_dir) {
      await load(entry.path)
    } else if (entry.is_html) {
      await openFile(entry.path)
      onClose()
    }
  }

  // 初期表示でルートを読み込む。
  load()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
  class="overlay"
  role="presentation"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label="ページを開く"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <header>
      <strong>ページを開く</strong>
      <button class="close" onclick={onClose} aria-label="閉じる">×</button>
    </header>

    <div class="path">{current}</div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <ul class="list">
      <li>
        <button class="entry dir" onclick={() => load(parent)}>📁 ひとつ上へ</button>
      </li>
      {#each entries as entry (entry.path)}
        <li>
          <button class="entry" class:dir={entry.is_dir} onclick={() => choose(entry)}>
            {entry.is_dir ? '📁' : '📄'} {entry.name}
          </button>
        </li>
      {/each}
    </ul>

    <footer>編集したいページを選んでください。HTML ページだけ開けます。</footer>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(38, 49, 45, 0.24);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    width: 560px;
    max-width: 90vw;
    max-height: 80vh;
    background: var(--sprout-surface);
    border: 1px solid var(--sprout-line);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 18px 50px rgba(38, 49, 45, 0.2);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
  }
  .close {
    border: 1px solid transparent;
    background: transparent;
    color: var(--sprout-muted);
    border-radius: 8px;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }
  .close:hover {
    color: var(--sprout-text);
    background: var(--sprout-accent-soft);
  }
  .path {
    padding: 8px 16px;
    font-size: 12px;
    color: var(--sprout-muted);
    background: var(--sprout-bg);
    word-break: break-all;
  }
  .error {
    padding: 8px 16px;
    color: var(--sprout-danger);
    background: var(--sprout-danger-soft);
    font-size: 13px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    flex: 1;
  }
  .entry {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--sprout-text);
    cursor: pointer;
    font-size: 14px;
  }
  .entry:hover {
    background: var(--sprout-accent-soft);
  }
  .entry.dir {
    font-weight: 600;
  }
  footer {
    padding: 8px 16px;
    font-size: 12px;
    color: var(--sprout-muted);
    border-top: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
  }
</style>
