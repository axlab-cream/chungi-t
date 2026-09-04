// Guards the reading polish across every 01~06_1 service flow.
//
// 이 세 가지는 한 번 고쳐 놓아도 새 서비스를 붙일 때 조용히 빠진다. 페이지는 200으로 뜨고
// 글자만 어색해지기 때문에 눈으로는 늦게 발견된다.
//   - 한글 줄바꿈: keep-all이 없으면 제목과 본문이 낱말 중간에서 잘린다
//   - 이미지 경계: 스토리 장면이 맞붙어 가로선이 그대로 보인다
//   - 서비스 이름: 다른 서비스 이름이 설명문과 안내문에 남는다
//
// Usage: node scripts/check-flow-polish.mjs

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf-8') : '')

const chromeCss = read('사주/css/umsh-chrome.css')
const shellCss = read('사주/css/service-shell.css')

/** [서비스 이름, 페이지 폴더, 이 서비스가 자기 이름으로 쓰면 안 되는 낱말] */
const SERVICES = [
  ['결혼궁합', 'match/marry', ['커플궁합', '퇴사운']],
  ['커플궁합', 'match/couple', ['결혼궁합', '퇴사운']],
  ['고양이 궁합', 'match/cat', ['커플궁합', '결혼궁합']],
  ['소비성향', 'money/save', ['커플궁합', '퇴사운']],
  ['퇴사운', 'work/quit', ['커플궁합', '결혼궁합']],
  ['직장 선택', 'work/job-choice', ['커플궁합', '퇴사운']],
  ['관계 신호', 'love/signal', ['커플궁합', '결혼궁합']],
  ['올해 연애운', 'love/this-year', ['커플궁합', '결혼궁합']],
  ['합격운', 'me/pass-angle', ['커플궁합', '퇴사운']],
  ['이직운', 'work/move', ['커플궁합', '결혼궁합']],
  ['집 풍수', 'place/home', ['커플궁합', '결혼궁합']],
]

const KEEP_ALL = /word-break:\s*keep-all/
const SEAM = /mask-image:\s*linear-gradient/

function pagesOf(dir) {
  const base = join(ROOT, '사주', dir)
  if (!existsSync(base)) return []
  const out = []
  for (const step of readdirSync(base).filter((name) => /^0\d-step/.test(name))) {
    for (const file of readdirSync(join(base, step)).filter((name) => name.endsWith('.html'))) {
      const html = readFileSync(join(base, step, file), 'utf-8')
      // 리다이렉트 스텁에는 읽을 글이 없다.
      if (html.length > 400) out.push({ label: `${step}/${file}`, html })
    }
  }
  return out
}

const failures = []

for (const [name, dir, foreignNames] of SERVICES) {
  const pages = pagesOf(dir)
  if (!pages.length) {
    failures.push(`${name}: 페이지를 찾지 못했습니다 (사주/${dir})`)
    continue
  }

  for (const page of pages) {
    const viaChrome = page.html.includes('umsh-chrome.css')
    const viaShell = page.html.includes('service-shell.js')

    const breaks = (viaChrome && KEEP_ALL.test(chromeCss)) || KEEP_ALL.test(page.html)
    if (!breaks) failures.push(`${name} ${page.label}: 한글 줄바꿈(keep-all) 규칙에 닿지 않습니다`)

    const seam = (viaChrome && SEAM.test(chromeCss)) || (viaShell && SEAM.test(shellCss)) || SEAM.test(page.html)
    if (!seam) failures.push(`${name} ${page.label}: 이미지 경계 그라데이션 규칙에 닿지 않습니다`)

    // 설명문과 안내문에 다른 서비스 이름이 남으면 독자가 바로 알아챈다.
    const body = page.html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    const meta = (body.match(/<meta[^>]+name="description"[^>]*content="([^"]*)"/i) ?? [])[1] ?? ''
    const footer = (body.match(/<footer[\s\S]*?<\/footer>/i) ?? [''])[0].replace(/<[^>]+>/g, ' ')
    for (const foreign of foreignNames) {
      if (meta.includes(foreign)) failures.push(`${name} ${page.label}: 설명문이 "${foreign}"을 자기 이름처럼 씁니다`)
      if (footer.includes(foreign)) failures.push(`${name} ${page.label}: 안내문이 "${foreign}"을 자기 이름처럼 씁니다`)
    }
  }
}

if (failures.length === 0) {
  console.log('01~06_1 흐름 마감 상태 정상 (%d개 서비스)', SERVICES.length)
  process.exit(0)
}

console.error(`흐름 마감 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
