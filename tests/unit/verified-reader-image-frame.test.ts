import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const readerStyles = readFileSync(new URL('../../사주/css/umsh-verified-reader.css', import.meta.url), 'utf8')

test('public verified reader constrains section images to the reading-column frame', () => {
  assert.match(
    readerStyles,
    /#umsh-verified-reading\s+\.story-image\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10;[^}]*overflow:\s*hidden;/s,
  )
  assert.match(
    readerStyles,
    /#umsh-verified-reading\s+\.story-image\s+img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s,
  )
})
