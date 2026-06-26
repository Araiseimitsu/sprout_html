<script lang="ts">
  import type { EditableStyle, StyleQuickOption } from '../../shared/utils/uiLabels'
  import { toColorInputValue } from '../../shared/utils/uiLabels'

  type Props = {
    item: EditableStyle
    value: string
    defaultValue: string
    computedColor: string
    options: StyleQuickOption[]
    onChange: (prop: string, value: string) => void
  }

  const { item, value, defaultValue, computedColor, options, onChange }: Props = $props()

  const colorValue = $derived(toColorInputValue(value, computedColor, defaultValue))
</script>

<div class="style-field">
  <label class="field">
    <span class="lbl">{item.label}</span>
    {#if item.kind === 'color'}
      <input
        class="color-swatch"
        type="color"
        aria-label={`${item.label}を選ぶ`}
        value={colorValue}
        oninput={(e) => onChange(item.prop, (e.target as HTMLInputElement).value)}
      />
    {/if}
    <input
      value={value}
      placeholder={item.placeholder}
      oninput={(e) => onChange(item.prop, (e.target as HTMLInputElement).value)}
    />
  </label>
  <div class="style-assist">
    <span class="default-value">初期値: {defaultValue}</span>
    {#if options.length > 0}
      <div class="quick-options" aria-label={`${item.label}の候補値`}>
        {#each options as option}
          <button class:active={value === option.value} type="button" onclick={() => onChange(item.prop, option.value)}>
            {option.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .style-field {
    margin-bottom: 9px;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }
  .lbl {
    width: 86px;
    font-size: 11px;
    color: var(--sprout-muted);
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    padding: 6px 7px;
    border: 1px solid var(--sprout-line-strong);
    border-radius: 7px;
    color: var(--sprout-text);
    background: var(--sprout-surface);
  }
  input:focus {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 1px;
    border-color: var(--sprout-accent);
  }
  .color-swatch {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    padding: 2px;
    cursor: pointer;
  }
  .style-assist {
    margin-left: 90px;
  }
  .default-value {
    display: block;
    margin: -1px 0 4px;
    color: var(--sprout-muted);
    font-size: 10px;
  }
  .quick-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .quick-options button {
    border: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
    color: var(--sprout-text);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 11px;
    line-height: 1.2;
    cursor: pointer;
  }
  .quick-options button:hover,
  .quick-options button.active {
    border-color: var(--sprout-accent);
    background: var(--sprout-accent-soft);
    color: var(--sprout-accent-strong);
  }
</style>
