<script lang="ts">
  // 中央のプレビュー領域。iframeを保持し、マウント時にエンジンを初期化する。
  import { onMount } from 'svelte'
  import { initEngine } from '../../state/editorController'

  let iframe: HTMLIFrameElement

  onMount(() => {
    initEngine(iframe)
  })
</script>

<div class="canvas">
  <!-- 編集用iframeはDOM操作が必要なため同一オリジンで扱う。
       ページ側scriptはhtmlPreparerでtemplate退避し、全画面表示では実行版を開く。 -->
  <iframe
    bind:this={iframe}
    title="プレビュー"
  ></iframe>
</div>

<style>
  .canvas {
    flex: 1;
    height: 100%;
    background:
      linear-gradient(90deg, rgba(79, 138, 107, 0.06) 1px, transparent 1px),
      linear-gradient(rgba(79, 138, 107, 0.05) 1px, transparent 1px),
      var(--sprout-bg);
    background-size: 24px 24px;
    overflow: hidden;
    display: flex;
    padding: 10px;
  }
  iframe {
    flex: 1;
    border: 1px solid var(--sprout-line);
    border-radius: 10px;
    background: var(--sprout-surface);
    width: 100%;
    height: 100%;
    box-shadow: 0 12px 30px rgba(38, 49, 45, 0.1);
  }
  @media (max-width: 768px) {
    .canvas {
      padding: 6px;
    }
    iframe {
      border-radius: 8px;
    }
  }
</style>
