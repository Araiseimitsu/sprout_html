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
  <!-- sandbox: 同一オリジンでDOM操作するため allow-same-origin。
       スクリプトはhtmlPreparerで無効化済みのため allow-scripts は付けない。 -->
  <iframe
    bind:this={iframe}
    title="プレビュー"
    sandbox="allow-same-origin"
  ></iframe>
</div>

<style>
  .canvas {
    flex: 1;
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
</style>
