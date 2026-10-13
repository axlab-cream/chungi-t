import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const copies = {
  en: {
    title: 'Four Pillars Reading | Fate Shop',
    labels: ['Calendar type', "Partner's calendar type", "Partner's gender", "Partner's birth time availability", 'Create an account', 'Account benefits', 'Love reading summary', 'Four Pillars chart'],
    deleteLabel: 'Delete saved reading',
  },
  ja: {
    title: '四柱推命 | 運命商会',
    labels: ['暦の種類', '相手の暦の種類', '相手の性別', '相手の出生時刻の確認', 'アカウント作成', '登録特典', '恋愛運のまとめ', '四柱の命式'],
    deleteLabel: '保存した鑑定を削除',
  },
} as const

function accessibleLabelText(html: string): string[] {
  return [...html.matchAll(/aria-label="((?:\$\{[^}]*\}|[^"])*)"/g)]
    .map(match => match[1].replace(/\$\{[^}]*\}/g, ''))
}

test('accessibility audit separates label text from adjacent machine values and dynamic titles', () => {
  const sample = '<button aria-label="Calendar type" data-value="양력"></button>'
    + '<button aria-label="Delete saved reading: ${escapeHtml(entry.title || "제목")}" data-category="연애"></button>'
  assert.deepEqual(accessibleLabelText(sample), ['Calendar type', 'Delete saved reading: '])
  assert.ok(accessibleLabelText('<div aria-label="달력 선택"></div>').some(label => /[가-힣]/.test(label)))
})

for (const locale of ['en', 'ja'] as const) {
  const html = fs.readFileSync(new URL(`../../.vercel-localized/${locale}/cmdg/index.html`, import.meta.url), 'utf8')
  test(`${locale} full reading uses a local title and accessible labels with no Korean remnants`, () => {
    assert.equal(html.match(/<title>([^<]+)<\/title>/)?.[1], copies[locale].title)
    assert.ok(html.includes(`<html lang="${locale}">`))
    assert.ok(html.includes(`property="og:locale" content="${locale === 'en' ? 'en_US' : 'ja_JP'}"`))
    assert.ok(html.includes(`property="og:title" content="${copies[locale].title}"`))
    assert.ok(html.includes(`name="twitter:title" content="${copies[locale].title}"`))
    for (const label of copies[locale].labels) assert.ok(html.includes(`aria-label="${label}"`), label)
    for (const label of accessibleLabelText(html)) assert.ok(!/[가-힣]/.test(label), `Accessible label contains Korean: ${label}`)
    assert.ok(html.includes(copies[locale].deleteLabel), 'History removal action must use locale wording')
  })
  test(`${locale} label corrections preserve calendar, gender and birthplace machine values`, () => {
    for (const value of ['solar', 'lunar', 'male', 'female']) assert.ok(html.includes(`data-value="${value}"`), value)
    assert.ok(html.includes('birthTimeZone'))
    assert.ok(html.includes('birthTimeDisambiguation'))
    assert.ok(html.includes('America/New_York'))
  })
  test(`${locale} customer input examples use local wording without changing stored values`, () => {
    const placeholders = [...html.matchAll(/placeholder="([^"]*)"/g)].map(match => match[1])
    for (const placeholder of placeholders) assert.ok(!/[가-힣]/.test(placeholder), placeholder)
    assert.ok(placeholders.includes(locale === 'en' ? 'Optional' : '任意'))
    assert.ok(placeholders.includes(locale === 'en' ? 'e.g. dating, a crush, an ex' : '例：交際中、片思い、元恋人'))
    assert.ok(placeholders.includes(locale === 'en' ? 'What is on your mind?' : '気になることを入力'))
    assert.ok(placeholders.includes(locale === 'en' ? 'Alex Morgan' : '例：佐藤 花子'))
    assert.ok(html.includes('value="${escapeHtml(state.partnerRelationship)}"'))
    assert.ok(html.includes('value="${state.concern}"'))
    assert.ok(html.includes('state.time === "모름"'))
  })
  test(`${locale} inline scripts remain syntactically valid`, () => {
    let checked = 0
    for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=|\btype=["'](?:application\/ld\+json|application\/json)/.test(match[1])) continue
      if (!match[2].trim()) continue
      new vm.Script(match[2])
      checked++
    }
    assert.ok(checked > 0)
  })
}
