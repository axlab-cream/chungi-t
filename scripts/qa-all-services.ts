import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { KNOWN_SERVICE_KEYS, loadServiceSystemPrompt, type KnownServiceKey } from '../src/prompt/service-system.js'
import { SERVICE_VOICE_CONTRACTS } from '../src/prompt/service-voice-contracts.js'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'prompts', 'services-manifest.json'), 'utf8')) as {
  services: Array<{ key: KnownServiceKey }>
}
const registry = JSON.parse(readFileSync(join(root, 'data', 'corpus', 'registry.json'), 'utf8')) as {
  packs: Array<{ id: string; path: string; domain?: string; role?: string; status?: string; retrievalBoost?: number }>
}

const ROUTES: Partial<Record<KnownServiceKey, { dir?: string; visibility: 'public' | 'hidden' | 'embedded' }>> = {
  today_fortune: { dir: 'today/free', visibility: 'embedded' },
  lucky_color: { dir: 'me/lucky', visibility: 'public' },
  saju_master: { dir: 'cmdg', visibility: 'embedded' },
  love_this_year: { dir: 'love/this-year', visibility: 'public' },
  job_choice: { dir: 'work/job-choice', visibility: 'public' },
  quit_fortune: { dir: 'work/quit', visibility: 'public' },
  money_save: { dir: 'money/save', visibility: 'public' },
  cat_compatibility: { dir: 'match/cat', visibility: 'public' },
  match_couple: { dir: 'match/couple', visibility: 'public' },
  marry_match: { dir: 'match/marry', visibility: 'public' },
  couple_signal: { dir: 'love/signal', visibility: 'public' },
  pass_angle: { dir: 'me/pass-angle', visibility: 'public' },
  work_move: { dir: 'work/move', visibility: 'public' },
  work_job: { visibility: 'hidden' },
  love_mind: { visibility: 'hidden' },
  love_again: { visibility: 'hidden' },
  love_spouse: { visibility: 'hidden' },
  home_fit: { dir: 'place/home', visibility: 'public' },
  newyear_flow: { dir: 'flow/newyear', visibility: 'public' },
  wedding_day: { dir: 'day/wedding', visibility: 'public' },
}

const CUSTOMER_HOSTILE = /로그인과 결제 상태|서버 권한|해석을 준비|결제 후 05 단계|상태별로 다음 행동|운영 서버 기준|측정\s*전|자료가 아직 없어요|DEM|Feature JSON|겁주기보다 확인 방법|이 풀이에 반영한 정보/i
const KEEP_ALL = /word-break:\s*keep-all/
const chromeCss = existsSync(join(root, '사주/css/umsh-chrome.css')) ? readFileSync(join(root, '사주/css/umsh-chrome.css'), 'utf8') : ''

function visibleHtmlText(html: string): string {
  return html
    .replace(/data:image\/[^"'\s>]+/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[a-zA-Z_$][\w$]*\s*:/g, ' ')
    .replace(/\s+/g, ' ')
}

function htmlFilesFor(dir: string): string[] {
  const base = join(root, '사주', dir)
  if (!existsSync(base)) return []
  const out: string[] = []
  function walk(current: string): void {
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, item.name)
      if (item.isDirectory()) walk(path)
      else if (item.name.endsWith('.html')) out.push(path)
    }
  }
  walk(base)
  return out.filter((path) => {
    const html = readFileSync(path, 'utf8')
    return html.length > 400 && !/http-equiv="refresh"/i.test(html)
  })
}

function corpusPackFor(key: KnownServiceKey) {
  const domain = key === 'newyear_flow' ? 'newyear_service' : `${key}_service`
  return registry.packs.find((pack) => pack.domain === domain && pack.role?.startsWith('single_service_'))
}

function corpusVisibleText(value: unknown, key = ''): string[] {
  if (/^(risk|forbidden|forbidden_generalization|condition|keywords|evidence|evidence_ids|calculated_fact_keys)$/i.test(key)) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap((item) => corpusVisibleText(item, key))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([name, item]) => corpusVisibleText(item, name))
  return []
}

const services = manifest.services.map(({ key }) => {
  const failures: string[] = []
  const contract = SERVICE_VOICE_CONTRACTS[key]
  if (!contract) failures.push('서비스별 해석 계약 없음')
  else {
    if (contract.requiredScenes.length < 3) failures.push('생활 장면 3개 미만')
    if (contract.decisionCriteria.length < 3) failures.push('판단 기준 3개 미만')
    if (contract.forbiddenCustomerCopy.length < 3) failures.push('고객 본문 금지문 3개 미만')
  }

  const prompt = loadServiceSystemPrompt(key)
  if (!prompt.includes('서비스별 해석 계약')) failures.push('런타임 프롬프트에 서비스 계약 미주입')
  if (!prompt.includes('티저는 공짜 요약이 아니라')) failures.push('티저 품질 공통 규칙 미주입')
  if (!prompt.includes('RAG·코퍼스·첨부 가이드는 문장 공급자가 아니라')) failures.push('RAG 복사 금지 규칙 미주입')

  const pack = corpusPackFor(key)
  let corpusBlocks = 0
  if (!pack) failures.push('전용 코퍼스 도메인 없음')
  else {
    const corpus = JSON.parse(readFileSync(join(root, 'data', pack.path), 'utf8')) as { knowledgeBlocks?: unknown[]; chunks?: unknown[] }
    const blocks = corpus.knowledgeBlocks ?? corpus.chunks ?? []
    corpusBlocks = blocks.length
    if (pack.status !== 'active') failures.push('전용 코퍼스 비활성')
    if ((pack.retrievalBoost ?? 0) < 18) failures.push('전용 코퍼스 검색 가중치 낮음')
    const visible = blocks.flatMap((block) => corpusVisibleText(block)).join('\n')
    if (CUSTOMER_HOSTILE.test(visible)) failures.push('코퍼스 고객 노출 필드에 운영/제작용 문구 존재')
  }

  const route = ROUTES[key] ?? { visibility: 'hidden' as const }
  const pages = route.dir ? htmlFilesFor(route.dir) : []
  if (route.visibility === 'public') {
    if (pages.length < 5) failures.push(`공개 서비스 01~06 정적 페이지 부족(${pages.length})`)
    for (const page of pages) {
      const html = readFileSync(page, 'utf8')
      const visible = visibleHtmlText(html)
      const hasSharedChrome = /umsh-chrome\.css|umsh-chrome\.js|data-umsh-chrome|service-shell\.css|service-shell\.js|data-umsh-service-top/.test(html)
      if (!hasSharedChrome) failures.push(`${page.replace(root, '')}: 공통 GNB/shell 연결 누락`)
      if (!(KEEP_ALL.test(chromeCss) || KEEP_ALL.test(html))) failures.push(`${page.replace(root, '')}: 한글 keep-all 누락`)
      if (CUSTOMER_HOSTILE.test(visible)) failures.push(`${page.replace(root, '')}: 고객 화면 문구에 운영/제작용 표현 존재`)
    }
  }

  return {
    key,
    title: contract?.serviceTitle ?? key,
    visibility: route.visibility,
    staticPages: pages.length,
    corpusBlocks,
    checks: failures.length ? 'fail' : 'pass',
    failures,
  }
})

const allFailures = services.flatMap((service) => service.failures.map((failure) => `${service.key}: ${failure}`))
const outDir = join(root, 'output', 'all-services-qa')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'all-services-qa.json'), JSON.stringify({ generatedAt: new Date().toISOString(), serviceCount: services.length, services, failures: allFailures }, null, 2), 'utf8')
writeFileSync(join(outDir, 'all-services-qa.md'), [
  '# 운명상회 20개 서비스 해석/티저 QA',
  '',
  `- 생성 시각: ${new Date().toISOString()}`,
  `- 서비스 수: ${services.length}`,
  `- 실패 수: ${allFailures.length}`,
  '',
  '| 서비스 | 노출 | 정적 페이지 | 코퍼스 블록 | 결과 |',
  '|---|---:|---:|---:|---|',
  ...services.map((service) => `| ${service.title} (${service.key}) | ${service.visibility} | ${service.staticPages} | ${service.corpusBlocks} | ${service.checks} |`),
  '',
  ...(allFailures.length ? ['## 실패', '', ...allFailures.map((failure) => `- ${failure}`)] : ['## 결과', '', '20개 서비스 해석 계약, 프롬프트 주입, 코퍼스 도메인, 공개 플로우 고객 문구 검수를 통과했습니다.']),
  '',
].join('\n'), 'utf8')

if (allFailures.length) {
  console.error(allFailures.join('\n'))
  process.exit(1)
}
console.log(`20개 서비스 QA 통과: ${services.length}개 · 공개 플로우/숨김 정책/프롬프트/코퍼스 검수 완료`)
