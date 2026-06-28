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

assert.match(
  appSource,
  /\{#if !isPreviewFullscreen\}\s*<Toolbar[\s\S]*?\/>\s*\{\/if\}/,
  'Toolbar should be hidden while preview fullscreen mode is active',
)
assert.match(
  appSource,
  /<EditorCanvas[\s\S]*isFullscreen=\{isPreviewFullscreen\}[\s\S]*onExitFullscreen=\{\(\) => \(isPreviewFullscreen = false\)\}/,
  'EditorCanvas should receive an explicit fullscreen exit callback',
)
assert.match(
  editorCanvasSource,
  /contentDocument[\s\S]*addEventListener\('keydown'/,
  'EditorCanvas should listen for Escape inside the iframe document',
)
assert.match(
  htmlPreparerSource,
  /html,\s*body[\s\S]*overflow-y:\s*auto\s*!important/,
  'Injected editor styles should keep opened pages vertically scrollable',
)
