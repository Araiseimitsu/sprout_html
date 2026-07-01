<script lang="ts">
  let {
    checked = $bindable(false),
    disabled,
  }: {
    checked: boolean
    disabled: boolean
  } = $props()
</script>

<div class="model-row">
  <label class="model-toggle">
    <input type="checkbox" bind:checked disabled={disabled} />
    <span class="switch" aria-hidden="true"></span>
    <span>高性能モード</span>
  </label>
  <span class="model-note">
    {checked && !disabled ? '複雑な生成・全体編集向け' : '通常は標準で実行します'}
  </span>
</div>

<style>
  .model-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--sprout-line);
    background: var(--sprout-surface);
  }
  .model-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: var(--sprout-text);
    font-size: 12px;
  }
  .model-toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .switch {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    background: var(--sprout-line-strong);
    transition: background 0.16s ease;
    flex-shrink: 0;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sprout-surface);
    box-shadow: 0 1px 2px rgba(38, 49, 45, 0.22);
    transition: transform 0.16s ease;
  }
  .model-toggle input:checked + .switch {
    background: var(--sprout-accent);
  }
  .model-toggle input:checked + .switch::after {
    transform: translateX(16px);
  }
  .model-toggle input:focus-visible + .switch {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 2px;
  }
  .model-toggle input:disabled + .switch {
    opacity: 0.5;
  }
  .model-note {
    font-size: 12px;
    color: var(--sprout-muted);
  }
  @media (max-width: 768px) {
    .model-row {
      flex-wrap: wrap;
    }
  }
</style>
