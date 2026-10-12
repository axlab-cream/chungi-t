import test from 'node:test'
import assert from 'node:assert/strict'
import {localizeAssetPaths} from '../../src/i18n/localized-assets.js'
test('local assets and scripts receive exactly one locale, preserving third-party URLs',()=>{
 const source='<img src="/assets/umsh-exam-card-bg.png"><script src="/en/js/portal.js?v=old"></script><img src="https://other.test/assets/umsh-exam-card-bg.png"><video src="/ja/assets/umsh-splash.mp4?v=old"></video>'
 const out=localizeAssetPaths(source,'en')
 assert.match(out,/src="\/en\/assets\/umsh-exam-card-bg.png\?v=exam2"/)
 assert.match(out,/src="\/en\/js\/portal.js\?v=20261012-2"/)
 assert.match(out,/https:\/\/other.test\/assets\/umsh-exam-card-bg.png/)
 assert.match(out,/\/en\/assets\/umsh-splash.mp4\?v=locale1/)
 assert.equal(localizeAssetPaths(out,'en'),out)
 assert.equal(out.includes('/en/en/'),false)
})
test('new file extensions and query parameters remain stable',()=>{
 const out=localizeAssetPaths('<img src="assets/umsh-wedding-card-bg.webp?x=1"><img src="/ja/assets/umsh-wedding-card-bg.png">','ja')
 assert.match(out,/\/ja\/assets\/umsh-wedding-card-bg.png\?x=1/)
 assert.equal(localizeAssetPaths(out,'ja'),out)
})
