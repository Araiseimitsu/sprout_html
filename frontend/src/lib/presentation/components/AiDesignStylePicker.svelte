<script lang="ts">
  import { AI_DESIGN_STYLE_OPTIONS } from '../../shared/constants/aiDesignStyles'
  import type { AiDesignStyle } from '../../shared/types'

  let { value = $bindable() }: { value: AiDesignStyle } = $props()
</script>

<fieldset class="design-picker">
  <legend>デザイン形式</legend>
  <div class="options">
    {#each AI_DESIGN_STYLE_OPTIONS as option}
      <label class:active={value === option.id}>
        <input type="radio" bind:group={value} value={option.id} />
        <span class="option-title">{option.label}</span>
        <span class="option-desc">{option.description}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .design-picker {
    margin: 0 0 12px;
    padding: 0;
    border: 0;
  }
  legend {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--sprout-text);
  }
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  label {
    display: grid;
    gap: 3px;
    min-height: 74px;
    padding: 9px 10px;
    border: 1px solid var(--sprout-line);
    border-radius: 8px;
    background: var(--sprout-surface);
    cursor: pointer;
  }
  label:hover {
    border-color: var(--sprout-accent);
    background: var(--sprout-accent-soft);
  }
  label.active {
    border-color: var(--sprout-accent-strong);
    box-shadow: inset 0 0 0 1px var(--sprout-accent-strong);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .option-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--sprout-text);
  }
  .option-desc {
    font-size: 11px;
    line-height: 1.45;
    color: var(--sprout-muted);
  }
  label:focus-within {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 2px;
  }
  @media (max-width: 520px) {
    .options {
      grid-template-columns: 1fr;
    }
  }
</style>
