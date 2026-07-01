import assert from 'node:assert/strict'
import { buildAssetBaseHref, buildAssetFileUrl } from '../src/lib/shared/utils/assetPath.ts'
import {
  collectImageSources,
  collectRelativeAssetPaths,
  rewriteHtmlImageSources,
} from '../src/lib/shared/utils/htmlAssets.ts'
import { toZipFileName } from '../src/lib/infrastructure/export/zipExport.ts'

assert.equal(
  buildAssetBaseHref('C:\\Users\\seizo\\my projects\\page.html'),
  '/assets/C:/Users/seizo/my%20projects/',
)

assert.equal(
  buildAssetFileUrl('C:\\site\\page.html', 'sprout-images/gen-1.png'),
  '/assets/C:/site/sprout-images/gen-1.png',
)

assert.deepEqual(
  collectRelativeAssetPaths(`
    <html><body>
      <img src="sprout-images/gen-1.png" />
      <img src="./sprout-images/gen-2.png" />
      <img src="data:image/png;base64,abc" />
      <img src="https://example.com/a.png" />
      <img src="/absolute.png" />
    </body></html>
  `),
  ['sprout-images/gen-1.png', 'sprout-images/gen-2.png'],
)

assert.deepEqual(
  collectImageSources(
    '<img src="/assets/C:/site/sprout-images/gen-1.png"><img src="data:image/png;base64,abc">',
    null,
  ),
  ['/assets/C:/site/sprout-images/gen-1.png', 'data:image/png;base64,abc'],
)

const rewritten = rewriteHtmlImageSources(
  '<img src="data:image/png;base64,abc">',
  new Map([['data:image/png;base64,abc', 'sprout-images/embedded-0.png']]),
)
assert.equal(rewritten, '<img src="sprout-images/embedded-0.png">')

assert.deepEqual(collectRelativeAssetPaths('<html><body><p>no images</p></body></html>'), [])

assert.equal(toZipFileName('page.html'), 'page.zip')
assert.equal(toZipFileName('index.htm'), 'index.zip')

console.log('htmlAssets.test.ts: ok')
