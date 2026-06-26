<script lang="ts">
  // 要素ツリーの1ノード(再帰)。クリックで選択、ドラッグ&ドロップで移動。
  import type { TreeNode } from '../../shared/types'
  import type { DropPosition } from '../../infrastructure/editor/EditorEngine'
  import { selectionStore } from '../../state/stores/editorStore'
  import { getEngine } from '../../state/editorController'
  import { describeElement } from '../../shared/utils/uiLabels'
  import Self from './TreeNodeView.svelte'

  let {
    node,
    depth = 0,
    draggingId,
    onDragStart,
    onDropMove,
  }: {
    node: TreeNode
    depth?: number
    draggingId: string | null
    onDragStart: (id: string) => void
    onDropMove: (sourceId: string, targetId: string, position: DropPosition) => void
  } = $props()

  // ドロップ位置のホバー表示。
  let dropPos = $state<DropPosition | null>(null)

  const selectedId = $derived($selectionStore?.id ?? null)
  const description = $derived(describeElement(node.tag))

  function select() {
    getEngine()?.select(node.id)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (!draggingId || draggingId === node.id) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
    // 上25%=前、下25%=後、中央=内側 に挿入。
    if (ratio < 0.25) dropPos = 'before'
    else if (ratio > 0.75) dropPos = 'after'
    else dropPos = 'inside'
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    if (draggingId && dropPos) onDropMove(draggingId, node.id, dropPos)
    dropPos = null
  }
</script>

<div class="node" style="--depth: {depth}">
  <div
    class="row"
    class:selected={selectedId === node.id}
    class:drop-before={dropPos === 'before'}
    class:drop-after={dropPos === 'after'}
    class:drop-inside={dropPos === 'inside'}
    role="treeitem"
    aria-selected={selectedId === node.id}
    tabindex="0"
    draggable="true"
    onclick={select}
    onkeydown={(e) => e.key === 'Enter' && select()}
    ondragstart={() => onDragStart(node.id)}
    ondragover={handleDragOver}
    ondragleave={() => (dropPos = null)}
    ondrop={handleDrop}
  >
    <span class="tag">{description.name}</span>
    {#if node.className}<span class="cls">.{node.className.split(' ').join('.')}</span>{/if}
    {#if node.textPreview}<span class="txt">{node.textPreview}</span>{/if}
  </div>

  {#each node.children as child (child.id)}
    <Self node={child} depth={depth + 1} {draggingId} {onDragStart} {onDropMove} />
  {/each}
</div>

<style>
  .row {
    padding: 5px 8px 5px calc(10px + var(--depth) * 14px);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-left: 3px solid transparent;
    color: var(--sprout-text);
  }
  .row:hover {
    background: var(--sprout-accent-soft);
  }
  .row.selected {
    background: var(--sprout-accent-soft);
    border-left-color: var(--sprout-accent);
  }
  .row.drop-before {
    box-shadow: inset 0 2px 0 var(--sprout-accent);
  }
  .row.drop-after {
    box-shadow: inset 0 -2px 0 var(--sprout-accent);
  }
  .row.drop-inside {
    background: #dff0e6;
  }
  .tag {
    color: var(--sprout-accent-strong);
    font-weight: 600;
  }
  .cls {
    color: #6b7c9f;
    margin-left: 4px;
  }
  .txt {
    color: var(--sprout-muted);
    margin-left: 6px;
  }
</style>
