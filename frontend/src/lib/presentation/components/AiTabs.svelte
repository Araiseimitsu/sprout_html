<script lang="ts">
  interface AiTabItem {
    id: string
    label: string
  }

  let {
    tabs,
    activeTab,
    onSelect,
  }: {
    tabs: AiTabItem[]
    activeTab: string
    onSelect: (tab: string) => void
  } = $props()
</script>

<nav class="tabs">
  {#each tabs as tab}
    <button class="tab" class:active={activeTab === tab.id} onclick={() => onSelect(tab.id)}>
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    padding: 8px 12px 0;
    border-bottom: 1px solid var(--sprout-line);
  }
  .tab {
    border: 1px solid transparent;
    border-bottom: none;
    background: transparent;
    color: var(--sprout-muted);
    padding: 7px 11px;
    border-radius: 8px 8px 0 0;
    font-size: 13px;
    cursor: pointer;
  }
  .tab:hover {
    background: var(--sprout-accent-soft);
  }
  .tab.active {
    background: var(--sprout-surface);
    border-color: var(--sprout-line);
    color: var(--sprout-accent-strong);
    font-weight: 600;
  }
  @media (max-width: 768px) {
    .tabs {
      flex-wrap: wrap;
      gap: 6px;
      padding-bottom: 8px;
    }
    .tab {
      border: 1px solid var(--sprout-line);
      border-radius: 8px;
    }
    .tab.active {
      border-color: var(--sprout-accent);
    }
  }
</style>
