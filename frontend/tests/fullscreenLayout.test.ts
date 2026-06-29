import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync(new URL('../src/App.svelte', import.meta.url), 'utf8')
const editorCanvasSource = readFileSync(
  new URL('../src/lib/presentation/components/EditorCanvas.svelte', import.meta.url),
  'utf8',
)
const htmlPreparerSource = readFileSync(
  new URL('../src/lib/infrastructure/editor/htmlPreparer.ts', import.meta.url),
  'utf8',
)
const toolbarSource = readFileSync(
  new URL('../src/lib/presentation/components/Toolbar.svelte', import.meta.url),
  'utf8',
)
const runtimePreviewSource = readFileSync(
  new URL('../src/lib/presentation/components/RuntimePreview.svelte', import.meta.url),
  'utf8',
)

assert.match(
  appSource,
  /<Toolbar[\s\S]*isPreviewFullscreen=\{showFullscreenPreview\}[\s\S]*onFullscreenToggle=\{\(\) => \(showFullscreenPreview = true\)\}/,
  'Toolbar should open the fullscreen runtime preview',
)
assert.match(
  appSource,
  /\{#if showFullscreenPreview\}\s*<RuntimePreview onClose=\{\(\) => \(showFullscreenPreview = false\)\} \/>/,
  'Fullscreen should render the script-enabled runtime preview',
)
assert.match(
  editorCanvasSource,
  /ページ側scriptはhtmlPreparerでtemplate退避/,
  'Edit iframe should rely on HTML preprocessing instead of sandbox script blocking',
)
assert.doesNotMatch(
  editorCanvasSource,
  /isFullscreen|setPreviewMode/,
  'Editor canvas should not keep a separate fullscreen preview mode',
)
assert.match(
  htmlPreparerSource,
  /html,\s*body[\s\S]*overflow-y:\s*auto\s*!important/,
  'Injected editor styles should keep opened pages vertically scrollable',
)
assert.match(
  appSource,
  /openDroppedHtmlFile[\s\S]*ondrop=\{onDrop\}/,
  'App should support opening dropped HTML files',
)
assert.match(
  htmlPreparerSource,
  /prepareRuntimeSrcdoc[\s\S]*injectRuntimeBase/,
  'Runtime preview should keep page scripts enabled and only inject a base element',
)
assert.match(
  htmlPreparerSource,
  /prepareRuntimeSrcdoc[\s\S]*rewriteRootRelativeAssets[\s\S]*injectRuntimeNetworkGuard/,
  'Runtime preview should keep page root-relative assets and fetch calls inside the edited file context',
)
assert.match(
  htmlPreparerSource,
  /SPROUT_SCRIPT_PLACEHOLDER_ATTR/,
  'Edit preview should park scripts in inert placeholders instead of letting sandbox block them',
)
assert.match(
  htmlPreparerSource,
  /placeholder\.content\.append\(doc\.createTextNode/,
  'Edit preview should keep script bodies inside template content for runtime restoration',
)
assert.match(
  readFileSync(new URL('../src/lib/infrastructure/editor/serializer.ts', import.meta.url), 'utf8'),
  /scriptPlaceholder\.content\.textContent/,
  'Serializer should restore parked script bodies from template content',
)
assert.match(
  toolbarSource,
  /getFullscreenToggleLabel/,
  'Toolbar should expose one fullscreen preview action',
)
assert.match(
  runtimePreviewSource,
  /sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/,
  'Runtime preview should allow same-origin APIs required by script-driven pages',
)
