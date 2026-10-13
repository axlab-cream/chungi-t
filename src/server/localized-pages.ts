import { localizeAssetPaths } from '../i18n/localized-assets.js'
import { existsSync, readFileSync } from 'node:fs'
import { replaceVisibleLocaleText } from '../i18n/visible-locale-replacements.js'
import { resolve } from 'node:path'
import type { NextFunction, Request, Response } from 'express'

/** Serves built EN/JA pages. Korean routes are untouched. Missing localized files fail closed. */
export function localizedPages(localizedRoot: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const match = /^\/(en|ja)(\/.*)?$/.exec(req.path)
    if (!match || (req.method !== 'GET' && req.method !== 'HEAD')) return next()
    const locale = match[1]
    let rel = match[2] || '/'
    if (rel.includes('..') || rel.includes('\\') || rel.includes('\0')) return res.status(400).end()
    if (rel.endsWith('/')) rel += 'index.html'
    else if (!/\.[a-z0-9]+$/i.test(rel)) rel += '/index.html'
    const root = resolve(localizedRoot, locale)
    if (rel === '/index.html' && existsSync(resolve(root, './portal.html'))) rel = '/portal.html'
    const file = resolve(root, `.${rel}`)
    if (file !== root && !file.startsWith(root + '\\') && !file.startsWith(root + '/')) return res.status(400).end()
    if (!existsSync(file)) return res.status(404).type('text/plain').send('This localized page is not ready')
    if (!file.endsWith('.html')) return res.sendFile(file)
    const design = locale === 'en'
      ? '<style>[data-umsh-slot="sections"] .umsh-life-flow-source > summary::after{content:"Hide" !important}[data-umsh-slot="sections"] .umsh-life-flow-source:not([open]) > summary::after{content:"Show" !important}</style>'
      : '<style>[data-umsh-slot="sections"] .umsh-life-flow-source > summary::after{content:"閉じる" !important}[data-umsh-slot="sections"] .umsh-life-flow-source:not([open]) > summary::after{content:"開く" !important}.section-title h2{word-break:keep-all}</style>'
    const html = readFileSync(file, 'utf8')
      .replace(/<html lang="ko">/g, `<html lang="${locale}">`)
      .replace(/content="ko_KR"/g, `content="${locale === 'en' ? 'en_US' : 'ja_JP'}"`)
      .replace(/url=\/(?![a-z])/g, `url=/${locale}/`)
      .replace(/(href|action)="\/(?!en\/|ja\/|api\/|auth\/|css\/|js\/|assets\/)/g, `$1="/${locale}/`)
      .replace('</head>', design + '</head>')
    const assetHtml = localizeAssetPaths(html, locale === 'ja' ? 'ja' : 'en')
    const withZone = assetHtml.includes('</body>') ? assetHtml.replace('</body>', birthZoneScript(locale === 'ja' ? 'ja' : 'en') + '</body>') : assetHtml
    res.type('html').send(replaceVisibleLocaleText(withZone, locale === 'ja' ? 'ja' : 'en'))
  }
}

function birthZoneScript(locale: 'en' | 'ja'): string {
  return '<script src="/' + locale + '/js/locale-runtime.js?v=20261013-price-align1" defer></script>'
}
