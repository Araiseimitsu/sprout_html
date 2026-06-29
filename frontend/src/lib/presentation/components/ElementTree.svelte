<script lang="ts">
  // 左パネル: 要素ツリー全体。ドラッグ中のIDを保持し、移動操作をエンジンへ渡す。
  import { treeStore } from '../../state/stores/editorStore'
  import { getEngine } from '../../state/editorController'
  import type { DropPosition } from '../../infrastructure/editor/EditorEngine'
  import TreeNodeView from './TreeNodeView.svelte'

  let draggingId = $state<string | null>(null)

  function onDragStart(id: string) {
    draggingId = id
  }
  function onDropMove(sourceId: string, targetId: string, position: DropPosition) {
    getEngine()?.moveElement(sourceId, targetId, position)
    draggingId = null
  }
</script>

<div class="tree">
  <div class="head">
    <strong>ページの部品</strong>
    <span>クリックで選択、ドラッグで移動</span>
  </div>
  <div class="body" role="tree">
    {#if $treeStore.length === 0}
      <p class="empty">ページを開くと、見出しや画像などの部品がここに並びます。</p>
    {:else}
      {#each $treeStore as node (node.id)}
        <TreeNodeView {node} {draggingId} {onDragStart} {onDropMove} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .tree {
    width: 260px;
    min-width: 200px;
    flex: 1;
    height: 100%;
    background: var(--sprout-surface);
    border-right: 1px solid var(--sprout-line);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .head {
    padding: 11px 14px;
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
  }
  .head strong {
    display: block;
    font-size: 13px;
  }
  .head span {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: var(--sprout-muted);
  }
  .body {
    overflow: auto;
    flex: 1;
    padding: 4px 0;
  }
  .empty {
    padding: 16px 12px;
    color: var(--sprout-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  @media (max-width: 768px) {
    .tree {
      width: 100%;
      min-width: 0;
      border-right: none;
    }
    .head span {
      display: none;
    }
  }
</style>
