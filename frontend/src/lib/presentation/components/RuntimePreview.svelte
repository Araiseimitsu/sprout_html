<script lang="ts">
  // ページ側 script を有効にして表示する読み取り専用プレビュー。
  import { onMount } from 'svelte'
  import { getEngine } from '../../state/editorController'
  import { currentFileStore } from '../../state/stores/editorStore'
  import { buildAssetBaseHref } from '../../shared/utils/assetPath'
  import { prepareRuntimeSrcdoc } from '../../infrastructure/editor/htmlPreparer'

  let { onClose }: { onClose: () => void } = $props()
  let srcdoc = $state('')

  function closeOnEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose()
  }

  onMount(() => {
    const html = getEngine()?.serialize() ?? ''
    const baseHref = $currentFileStore ? buildAssetBaseHref($currentFileStore) : '/assets/'
    srcdoc = prepareRuntimeSrcdoc(html, baseHref)
  })
</script>

<svelte:window onkeydown={closeOnEscape} />

<div class="runtime">
  <header>
    <strong>全画面表示</strong>
    <button onclick={onClose} aria-label="閉じる">×</button>
  </header>
  <iframe
    title="全画面表示"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    {srcdoc}
  ></iframe>
</div>

<style>
  .runtime {
    position: fixed;
    inset: 0;
    z-index: 130;
    display: flex;
    flex-direction: column;
    background: #111817;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--sprout-surface);
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
  }
  button {
    border: 1px solid transparent;
    background: transparent;
    color: var(--sprout-muted);
    border-radius: 8px;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }
  button:hover {
    color: var(--sprout-text);
    background: var(--sprout-accent-soft);
  }
  iframe {
    flex: 1;
    width: 100%;
    border: 0;
    background: white;
  }
</style>
