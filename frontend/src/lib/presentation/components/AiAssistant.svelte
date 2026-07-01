<script lang="ts">
  // AIアシスタント(モーダル)。HTMLゼロ生成 / 全体編集 / 部分編集 / 画像生成。
  // 業務処理は application/usecases に委譲し、ここはUIに集中する。
  import {
    aiBusyStore,
    aiStatusStore,
    selectionStore,
    statusStore,
  } from '../../state/stores/editorStore'
  import {
    editSelectedElement,
    editWholePage,
    generateAndInsertImage,
    generateNewPage,
  } from '../../application/usecases/aiUsecases'
  import AiDesignStylePicker from './AiDesignStylePicker.svelte'
  import AiModelToggle from './AiModelToggle.svelte'
  import AiTabs from './AiTabs.svelte'
  import { DEFAULT_AI_DESIGN_STYLE } from '../../shared/constants/aiDesignStyles'

  let { onClose }: { onClose: () => void } = $props()

  type Tab = 'generate' | 'editAll' | 'editSelected' | 'image'
  const STANDARD_TEXT_MODEL = 'gemini-3.1-flash-lite'
  const HIGH_PERFORMANCE_TEXT_MODEL = 'gemini-3.5-flash'

  let activeTab = $state<Tab>('generate')
  let useHighPerformanceModel = $state(false)
  let textModels = $derived(
    $aiStatusStore?.text_models.length
      ? $aiStatusStore.text_models
      : [STANDARD_TEXT_MODEL, HIGH_PERFORMANCE_TEXT_MODEL],
  )
  let canUseHighPerformance = $derived(textModels.includes(HIGH_PERFORMANCE_TEXT_MODEL))
  let selectedTextModel = $derived(
    useHighPerformanceModel && activeTab !== 'editSelected' && canUseHighPerformance
      ? HIGH_PERFORMANCE_TEXT_MODEL
      : STANDARD_TEXT_MODEL,
  )

  // 各タブの入力(タブごとに独立保持)。
  let generatePrompt = $state('')
  let generateDesignStyle = $state(DEFAULT_AI_DESIGN_STYLE)
  let editAllPrompt = $state('')
  let editSelectedPrompt = $state('')
  let imagePrompt = $state('')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'generate', label: 'ページ生成' },
    { id: 'editAll', label: '全体を編集' },
    { id: 'editSelected', label: '部品を編集' },
    { id: 'image', label: '画像生成' },
  ]

  function switchTab(tab: string) {
    if (!tabs.some((item) => item.id === tab)) return
    const nextTab = tab as Tab
    activeTab = nextTab
    useHighPerformanceModel = false
  }

  function runGenerate() {
    generateNewPage(generatePrompt, selectedTextModel, generateDesignStyle)
  }
  function runEditAll() {
    editWholePage(editAllPrompt, selectedTextModel)
  }
  function runEditSelected() {
    editSelectedElement(editSelectedPrompt, selectedTextModel)
  }
  function runImage() {
    generateAndInsertImage(imagePrompt)
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="overlay" role="presentation" onclick={onClose} onkeydown={() => {}}>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label="AIアシスタント"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <header>
      <strong>✨ AIアシスタント</strong>
      <button class="close" onclick={onClose} aria-label="閉じる">×</button>
    </header>

    {#if $aiStatusStore && !$aiStatusStore.configured}
      <div class="warn">
        AI機能が未設定です。バックエンドの <code>GEMINI_API_KEY</code> を設定してください。
      </div>
    {/if}

    {#if activeTab === 'generate' || activeTab === 'editAll'}
      <AiModelToggle bind:checked={useHighPerformanceModel} disabled={!canUseHighPerformance} />
    {/if}

    <AiTabs {tabs} {activeTab} onSelect={switchTab} />

    <div class="body">
      {#if activeTab === 'generate'}
        <p class="desc">作りたいページの内容を書くと、HTMLをゼロから生成します。</p>
        <AiDesignStylePicker bind:value={generateDesignStyle} />
        <textarea bind:value={generatePrompt} placeholder="例: カフェの紹介ページ。営業時間とメニューを載せて"></textarea>
        <button class="run" onclick={runGenerate} disabled={$aiBusyStore || !generatePrompt.trim()}>
          {$aiBusyStore ? '生成中…' : 'ページを生成'}
        </button>
      {:else if activeTab === 'editAll'}
        <p class="desc">いま開いているページ全体を、指示に沿って書き換えます。</p>
        <textarea bind:value={editAllPrompt} placeholder="例: 全体を明るい配色にして、見出しを大きく"></textarea>
        <button class="run" onclick={runEditAll} disabled={$aiBusyStore || !editAllPrompt.trim()}>
          {$aiBusyStore ? '編集中…' : '全体を編集'}
        </button>
      {:else if activeTab === 'editSelected'}
        {#if $selectionStore}
          <p class="desc">選択中の部品 <code>&lt;{$selectionStore.tag}&gt;</code> を、指示に沿って書き換えます。</p>
          <textarea bind:value={editSelectedPrompt} placeholder="例: もっと丁寧な文章にして、太字を加えて"></textarea>
          <button
            class="run"
            onclick={runEditSelected}
            disabled={$aiBusyStore || !editSelectedPrompt.trim()}
          >
            {$aiBusyStore ? '編集中…' : '部品を編集'}
          </button>
        {:else}
          <p class="desc empty">プレビューかツリーで部品を選択すると、その部分だけをAIで編集できます。</p>
        {/if}
      {:else if activeTab === 'image'}
        <p class="desc">画像を生成し、選択中の部品(なければページ末尾)に挿入します。</p>
        <textarea bind:value={imagePrompt} placeholder="例: 朝の海辺の写真、やわらかい光"></textarea>
        <button class="run" onclick={runImage} disabled={$aiBusyStore || !imagePrompt.trim()}>
          {$aiBusyStore ? '生成中…' : '画像を生成して挿入'}
        </button>
      {/if}
    </div>

    {#if $statusStore}
      <footer class:error={$statusStore.kind === 'error'} class:success={$statusStore.kind === 'success'}>
        {$statusStore.message}
      </footer>
    {/if}
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
    max-height: 85vh;
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
  .warn {
    padding: 8px 16px;
    font-size: 12px;
    color: var(--sprout-warning);
    background: var(--sprout-warning-soft);
  }
  .warn code,
  .desc code {
    background: var(--sprout-surface-soft);
    border: 1px solid var(--sprout-line);
    border-radius: 4px;
    padding: 0 4px;
  }
  .body {
    padding: 14px 16px;
    overflow-y: auto;
    flex: 1;
  }
  .desc {
    margin: 0 0 10px;
    font-size: 12px;
    color: var(--sprout-muted);
    line-height: 1.6;
  }
  .desc.empty {
    padding: 16px 0;
  }
  textarea {
    width: 100%;
    min-height: 96px;
    resize: vertical;
    font-size: 13px;
    font-family: inherit;
    padding: 9px 11px;
    border: 1px solid var(--sprout-line-strong);
    border-radius: 8px;
    color: var(--sprout-text);
    background: var(--sprout-surface);
  }
  textarea:focus {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 1px;
    border-color: var(--sprout-accent);
  }
  .run {
    margin-top: 12px;
    padding: 9px 14px;
    border: 1px solid var(--sprout-accent-strong);
    background: var(--sprout-accent);
    color: #ffffff;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
  }
  .run:hover:not(:disabled) {
    background: var(--sprout-accent-strong);
  }
  .run:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  footer {
    padding: 9px 16px;
    font-size: 12px;
    color: var(--sprout-muted);
    border-top: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
  }
  footer.error {
    color: var(--sprout-danger);
    background: var(--sprout-danger-soft);
  }
  footer.success {
    color: var(--sprout-accent-strong);
    background: var(--sprout-accent-soft);
  }
  @media (max-width: 768px) {
    .overlay {
      align-items: flex-end;
    }
    .dialog {
      width: 100%;
      max-width: none;
      max-height: 92vh;
      border-radius: 12px 12px 0 0;
    }
  }
</style>
