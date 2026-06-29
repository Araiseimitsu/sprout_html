<script lang="ts">
  // 右パネル: 選択要素のスタイル・属性を編集する。
  import { selectionStore } from '../../state/stores/editorStore'
  import { getEngine } from '../../state/editorController'
  import {
    describeElement,
    getEditableStyleGroups,
    getStyleDefaults,
    getStyleQuickOptions,
  } from '../../shared/utils/uiLabels'
  import StyleFieldEditor from './StyleFieldEditor.svelte'

  // 新規属性追加用の一時入力。
  let newAttrName = $state('')
  let newAttrValue = $state('')
  let showDetails = $state(false)
  const styleGroups = getEditableStyleGroups()
  const styleDefaults = getStyleDefaults()
  const styleQuickOptions = getStyleQuickOptions()
  const friendlyAttributeNames: Record<string, string> = {
    id: '部品ID',
    class: '種類名',
    href: 'リンク先',
    src: '画像の場所',
    alt: '画像の説明',
    title: '補足テキスト',
  }

  function styleValue(prop: string): string {
    return $selectionStore?.styles[prop] ?? ''
  }
  function computedColor(prop: string): string {
    return $selectionStore?.computedColors[prop] ?? ''
  }
  function onStyleInput(prop: string, value: string) {
    getEngine()?.setStyle(prop, value)
  }
  function styleDefault(prop: string): string {
    return styleDefaults[prop] ?? ''
  }
  function quickOptions(prop: string) {
    return styleQuickOptions[prop] ?? []
  }
  function onAttrInput(name: string, value: string) {
    getEngine()?.setAttribute(name, value)
  }
  function removeAttr(name: string) {
    getEngine()?.removeAttribute(name)
  }
  function addAttr() {
    const name = newAttrName.trim()
    if (!name) return
    getEngine()?.setAttribute(name, newAttrValue)
    newAttrName = ''
    newAttrValue = ''
  }
  function attrLabel(name: string): string {
    return friendlyAttributeNames[name] ?? name
  }
</script>

<div class="panel">
  <div class="head">選択中の部品</div>

  {#if !$selectionStore}
    <p class="empty">ページ上の文字や画像をクリックすると、ここで見た目を調整できます。文章はダブルクリックで直接書き換えられます。</p>
  {:else}
    {#key $selectionStore.id}
      <div class="body">
        <div class="selected-summary">
          <strong>{describeElement($selectionStore.tag).name}</strong>
          <span>{describeElement($selectionStore.tag).hint}</span>
        </div>

        <section>
          <h4>見た目</h4>
          {#each styleGroups as group}
            <div class="group-title">{group.title}</div>
            {#each group.styles as item}
              <StyleFieldEditor
                {item}
                value={styleValue(item.prop)}
                defaultValue={styleDefault(item.prop)}
                computedColor={computedColor(item.prop)}
                options={quickOptions(item.prop)}
                onChange={onStyleInput}
              />
            {/each}
          {/each}
        </section>

        <section class="details">
          <button class="details-toggle" onclick={() => (showDetails = !showDetails)}>
            {showDetails ? '詳細設定を閉じる' : '詳細設定を開く'}
          </button>
        </section>

        {#if showDetails}
          <section>
            <h4>リンクや画像などの設定</h4>
          {#each Object.entries($selectionStore.attributes) as [name, value] (name)}
            <label class="field">
              <span class="lbl">{attrLabel(name)}</span>
              <input
                value={value}
                oninput={(e) => onAttrInput(name, (e.target as HTMLInputElement).value)}
              />
              <button class="x" title="削除" onclick={() => removeAttr(name)}>×</button>
            </label>
          {/each}
          <div class="field add">
            <input class="aname" placeholder="設定名" bind:value={newAttrName} />
            <input class="aval" placeholder="値" bind:value={newAttrValue} />
            <button class="add-btn" onclick={addAttr}>＋</button>
          </div>
          </section>
        {/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  .panel {
    width: 300px;
    min-width: 240px;
    flex: 1;
    height: 100%;
    background: var(--sprout-surface);
    border-left: 1px solid var(--sprout-line);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .head {
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
    background: var(--sprout-surface-soft);
  }
  .empty {
    padding: 16px 14px;
    color: var(--sprout-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .body {
    overflow: auto;
    flex: 1;
    padding: 12px 14px;
  }
  .selected-summary {
    margin-bottom: 12px;
    padding: 11px;
    background: var(--sprout-accent-soft);
    border: 1px solid #cce4d5;
    border-radius: 8px;
  }
  .selected-summary strong,
  .selected-summary span {
    display: block;
  }
  .selected-summary strong {
    color: var(--sprout-accent-strong);
    font-size: 14px;
  }
  .selected-summary span {
    margin-top: 2px;
    color: var(--sprout-muted);
    font-size: 11px;
  }
  .group-title {
    margin: 8px 0 4px;
    color: var(--sprout-muted);
    font-size: 11px;
    margin-bottom: 8px;
  }
  section {
    margin-bottom: 16px;
  }
  h4 {
    margin: 8px 0 6px;
    font-size: 12px;
    color: var(--sprout-text);
    border-bottom: 1px solid var(--sprout-line);
    padding-bottom: 3px;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }
  .field .lbl {
    width: 86px;
    font-size: 11px;
    color: var(--sprout-muted);
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .field input {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    padding: 6px 7px;
    border: 1px solid var(--sprout-line-strong);
    border-radius: 7px;
    color: var(--sprout-text);
    background: var(--sprout-surface);
  }
  .field input:focus {
    outline: 2px solid var(--sprout-accent);
    outline-offset: 1px;
    border-color: var(--sprout-accent);
  }
  .details {
    margin-bottom: 8px;
  }
  .details-toggle {
    width: 100%;
    border: 1px solid var(--sprout-line-strong);
    background: var(--sprout-surface-soft);
    color: var(--sprout-text);
    border-radius: 8px;
    padding: 7px 8px;
    cursor: pointer;
  }
  .details-toggle:hover {
    background: var(--sprout-accent-soft);
  }
  .field.add {
    margin-top: 6px;
  }
  .field.add .aname {
    flex: 0 0 90px;
  }
  .x,
  .add-btn {
    border: none;
    background: var(--sprout-surface-soft);
    border: 1px solid var(--sprout-line);
    border-radius: 4px;
    cursor: pointer;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }
  .x:hover {
    background: var(--sprout-danger-soft);
    color: var(--sprout-danger);
  }
  .add-btn:hover {
    background: var(--sprout-accent-soft);
    color: var(--sprout-accent-strong);
  }
  @media (max-width: 768px) {
    .panel {
      width: 100%;
      min-width: 0;
      border-left: none;
    }
  }
</style>
