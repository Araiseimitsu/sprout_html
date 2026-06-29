import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync(new URL('../src/App.svelte', import.meta.url), 'utf8')
const layoutSource = readFileSync(
  new URL('../src/lib/shared/constants/layout.ts', import.meta.url),
  'utf8',
)
const toolbarSource = readFileSync(
  new URL('../src/lib/presentation/components/Toolbar.svelte', import.meta.url),
  'utf8',
)
const aiAssistantSource = readFileSync(
  new URL('../src/lib/presentation/components/AiAssistant.svelte', import.meta.url),
  'utf8',
)

assert.match(
  layoutSource,
  /export const MOBILE_MAX_WIDTH = 768/,
  'Responsive layout should use a shared mobile breakpoint',
)
assert.match(
  appSource,
  /MOBILE_WORKSPACE_PANES[\s\S]*mobilePane[\s\S]*class:compact=\{isCompact\}/,
  'App should switch workspace panes on compact screens',
)
assert.match(
  appSource,
  /matchMedia\(`\(max-width: \$\{MOBILE_MAX_WIDTH\}px\)`\)/,
  'App should detect compact layout with matchMedia',
)
assert.match(
  toolbarSource,
  /btn-text[\s\S]*@media \(max-width: 768px\)/,
  'Toolbar should hide button labels on small screens',
)
assert.match(
  aiAssistantSource,
  /@media \(max-width: 768px\)[\s\S]*align-items: flex-end/,
  'AI assistant should use a bottom sheet style on small screens',
)
