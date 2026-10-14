import { localizeAssetPaths, normalizeLocaleRoot, rebaseSharedVisualPaths, sharedPublicVisualPath } from '../i18n/localized-assets.js'
import { existsSync, readFileSync } from 'node:fs'
import { replaceVisibleLocaleText } from '../i18n/visible-locale-replacements.js'
import { resolve } from 'node:path'
import type { NextFunction, Request, Response } from 'express'

/** Serves built EN/JA pages. Korean routes are untouched. Missing HTML/code/CSS fails closed;
 * neutral binaries may point to an already-public customer media subtree. */
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
    if (!existsSync(file)) {
      const binary = sharedPublicVisualPath(rel)
      if (binary) return res.redirect(302, binary)
      return res.status(404).type('text/plain').send('This localized page is not ready')
    }
    if (!file.endsWith('.html')) return res.sendFile(file)
    const design = locale === 'en'
      ? '<style>[data-umsh-slot="sections"] .umsh-life-flow-source > summary::after{content:"Hide" !important}[data-umsh-slot="sections"] .umsh-life-flow-source:not([open]) > summary::after{content:"Show" !important}</style>'
      : '<style>[data-umsh-slot="sections"] .umsh-life-flow-source > summary::after{content:"閉じる" !important}[data-umsh-slot="sections"] .umsh-life-flow-source:not([open]) > summary::after{content:"開く" !important}</style>'
    const html = normalizeLocaleRoot(readFileSync(file, 'utf8'), locale === 'ja' ? 'ja' : 'en')
      .replace(/content="ko_KR"/g, `content="${locale === 'en' ? 'en_US' : 'ja_JP'}"`)
      .replace(/url=\/(?![a-z])/g, `url=/${locale}/`)
      .replace(/(href|action)="\/(?!en\/|ja\/|api\/|auth\/|css\/|js\/|assets\/)/g, `$1="/${locale}/`)
      .replace('</head>', design + displayLayout(locale === 'ja' ? 'ja' : 'en', rel) + '</head>')
    const assetHtml = rebaseSharedVisualPaths(localizeAssetPaths(html, locale === 'ja' ? 'ja' : 'en'), locale === 'ja' ? 'ja' : 'en', rel,
      canonical => existsSync(resolve(root, `.${canonical}`)))
    const withZone = assetHtml.includes('</body>') ? assetHtml.replace('</body>', birthZoneScript(locale === 'ja' ? 'ja' : 'en') + '</body>') : assetHtml
    res.type('html').send(replaceVisibleLocaleText(withZone, locale === 'ja' ? 'ja' : 'en'))
  }
}

function birthZoneScript(locale: 'en' | 'ja'): string {
  return '<script src="/' + locale + '/js/locale-runtime.js?v=20261013-ui-align1" defer></script>'
}

function displayLayout(locale: 'en' | 'ja', rel: string): string {
  const base = 'html[lang] :is(main,.phone) :is(input,select,textarea){min-width:0;max-width:100%}html[lang] :is(main,.phone) :is(.field,.choice,.panel,.section,.copy,.cta){min-width:0}html[lang] .price-line:has(>b){align-items:baseline}html[lang] .price-line>b{white-space:nowrap;line-height:1.25}html[lang] .price-line:has(>b)>span{flex-shrink:0}'
  const japanese = 'html[lang="ja"] :is(main,.phone) :is(h1,h2,h3,p,li,label,legend,summary,a,button,strong,em,span){word-break:normal!important;overflow-wrap:anywhere!important;line-break:strict}'
  const english = 'html[lang="en"] :is(main,.phone) :is(h1,h2,h3,p,li,label,summary,a,button){overflow-wrap:break-word}'
  const pageFixes: Record<string,string> = {
    '/match/couple/01-step-1-story/index.html': '.price-line{align-items:baseline}.price-line>strong{white-space:nowrap;flex-shrink:0}',
    '/match/couple/04-step-4-report/index.html': '.price-row>strong{white-space:nowrap;flex-shrink:0}',
    '/love/signal/04-step-4-report/index.html': '.price-row{align-items:baseline}.price-row>strong{white-space:nowrap;flex-shrink:0}',
    '/match/marry/04-step-4-report/index.html': '.price-row>strong{white-space:nowrap;flex-shrink:0}',
    '/match/cat/04-step-4-report/index.html': '.price-row>span{flex-shrink:0}.price-slate .price-row:last-child>strong{white-space:nowrap;flex-shrink:0}',
    '/work/move/04-step-4-report/index.html': '.price-line>strong{min-width:0;text-align:right;overflow-wrap:anywhere}.price-line.final>strong{white-space:nowrap;flex-shrink:0}',
    '/match/marry/01-step-1-story/index.html': '.price-line{align-items:baseline}.price-line>strong{min-width:0;text-align:right;overflow-wrap:anywhere}',
    '/love/this-year/02-step-2-saju-input/index.html': 'html[lang] main fieldset{min-inline-size:0;max-width:100%}html[lang] main :is(.field,.form-section,form){grid-template-columns:minmax(0,1fr);min-width:0}html[lang] main :is(.field-grid,.choice-group){min-width:0}',
    '/match/marry/02-step-2-saju-input/index.html': 'html[lang],html[lang] body{min-width:0}html[lang] main .choice-group{min-inline-size:0;max-width:100%;grid-template-columns:minmax(0,1fr)}',
    '/me/lucky/02-step-2-saju-input/index.html': 'html[lang] main fieldset{min-inline-size:0;max-width:100%}',
    '/money/save/04-step-4-report/index.html': '.panel,.panel-head{grid-template-columns:minmax(0,1fr);min-width:0}',
  }
  const narrowEnglishCopy = locale === 'en' && rel === '/work/quit/01-step-1-story/index.html' ? '@media(max-width:360px){.visual:has(.copy>.grid)>.copy{padding:20px 16px 32px}.visual:has(.copy>.grid) .tile{padding:12px}}' : ''
  return '<style id="localized-ui-layout">' + base + (locale === 'ja' ? japanese : english) + (pageFixes[rel] || '') + narrowEnglishCopy + '</style>'
}
