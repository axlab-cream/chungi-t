/**
 * 내 2027년, 풀릴 각이야? 의 연동 지점을 한 번에 확인한다.
 *
 * 이 서비스는 페이지, 서버 라우트, 카탈로그, 검색 디렉토리, 코퍼스, 브리지 JS가 서로
 * 다른 파일에 흩어져 있어서 하나만 빠져도 화면은 열리는데 풀이가 비는 식으로 조용히
 * 깨진다. 여기서 그 지점을 전부 문자열로 확인한다.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const EXPECTED_GROUPS = 10
const EXPECTED_ITEMS = 36
const PAGES = [
  '01-step-1-story/index.html',
  '02-step-2-saju-input/index.html',
  '04-step-4-report/index.html',
  '05-step-5-chat/index.html',
  '05-step-5-chat/chat.html',
  '06-step-6_1-report-detail/index.html',
]

const failures = []
const need = (ok, message) => { if (!ok) failures.push(message) }

// 1) 페이지와 공용 크롬
for (const page of PAGES) {
  const rel = `사주/flow/newyear/${page}`
  if (!existsSync(join(ROOT, rel))) {
    failures.push(`${page} 없음`)
    continue
  }
  const html = read(rel)
  // 0초 meta refresh 스텁은 곧바로 chat.html 로 넘긴다. 크롬과 브리지를 얹을 화면이 아니다.
  if (/http-equiv="refresh"/i.test(html)) {
    need(html.includes('내 2027년, 풀릴 각이야?'), `${page} 서비스 이름 없음`)
    need(html.includes('chat.html'), `${page} 리다이렉트 목적지 없음`)
    continue
  }
  need(html.includes('umsh-chrome.css'), `${page} 공용 크롬 CSS 없음`)
  need(html.includes('/js/umsh-chrome.js'), `${page} 공용 크롬 JS 없음`)
  need(html.includes('data-umsh-chrome'), `${page} 크롬 호스트 표시 없음`)
  need(html.includes('/js/newyear-service.js'), `${page} 브리지 JS 없음`)
  need(html.includes('내 2027년, 풀릴 각이야?'), `${page} 서비스 이름 없음`)
  need(html.includes('body.umsh-has-chrome .phone{overflow:clip}'), `${page} .phone overflow 완화 없음`)
  need(html.includes('body.umsh-has-chrome header.top{display:none}'), `${page} 중복 브랜드바 숨김 없음`)
  need(!/<title>[^<]*무슨 일이[^<]*<\/title>/.test(html), `${page} 제목이 템플릿 원본 그대로`)

  // 참조하는 이미지가 실제로 있는지
  for (const src of new Set([...html.matchAll(/src="([^"]+\.webp)"/g)].map((m) => m[1]))) {
    if (src.startsWith('/') || src.startsWith('http')) continue
    const asset = join(ROOT, '사주/flow/newyear', dirname(page), src)
    need(existsSync(asset), `${page} 이미지 누락: ${src}`)
  }
}

// 2) 목차
const service = read('src/flow/newyear-service.ts')
const groups = (service.match(/^ {4}id: '/gm) ?? []).length
const items = (service.match(/\{ id: '\d+-\d+'/g) ?? []).length
need(groups === EXPECTED_GROUPS, `목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
need(items === EXPECTED_ITEMS, `목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)
need(service.includes('NEWYEAR_TARGET_YEAR = 2027'), '기준 연도 2027 없음')
need(service.includes("getSolarTermKstDate"), '입춘 계산이 절기 함수를 쓰지 않음')
need(service.includes('getMonthStemIndex'), '월주 천간이 五虎遁을 쓰지 않음')

// 3) 서버 라우트와 API
const app = read('src/server/app.ts')
need(app.includes("'/api/flow/newyear/analyze'"), '분석 API 라우트 없음')
need(app.includes("'/flow/newyear'"), '진입 라우트 없음')
for (const alias of ['input', 'report', 'chat', 'detail']) {
  need(app.includes(`'/flow/newyear/${alias}'`), `단축 경로 /${alias} 없음`)
}
need(app.includes("newyear_flow: 'newyear_flow'"), '서비스 키 → 결제 상품 매핑 없음')

// 4) 카탈로그와 검색 디렉토리
const catalog = read('src/payment/catalog.ts')
need(catalog.includes("| 'newyear_flow'"), '카탈로그 키 유니온 없음')
need(catalog.includes('amount: 19900'), '카탈로그 금액 19,900원 없음')
need(catalog.includes("returnPath: '/flow/newyear'"), '카탈로그 복귀 경로 없음')
const directory = read('src/server/service-directory.ts')
need(directory.includes("key: 'newyear_flow'"), '검색 디렉토리 등록 없음')

// 5) 코퍼스
const registry = JSON.parse(read('data/corpus/registry.json'))
const pack = registry.packs.find((entry) => entry.id === 'newyear-service')
need(Boolean(pack), '코퍼스 팩이 registry 에 없음')
if (pack) {
  need(pack.domain === 'newyear_service', `코퍼스 도메인 ${pack.domain}`)
  need(pack.status === 'active', `코퍼스 상태 ${pack.status}`)
  need(pack.retrievalBoost >= 20, `검색 가중치 ${pack.retrievalBoost} (20 이상 기대)`)
}
const corpus = JSON.parse(read('data/corpus/newyear-service.json'))
need(corpus.domain === 'newyear_service', '코퍼스 도메인 불일치')
need(corpus.knowledgeBlocks.length >= EXPECTED_GROUPS, `코퍼스 블록 ${corpus.knowledgeBlocks.length}개 (대분류 수 이상 기대)`)
for (const block of corpus.knowledgeBlocks) {
  for (const field of ['topic', 'interpretation', 'risk', 'opportunity', 'advice', 'forbidden_generalization']) {
    need(Boolean(block[field]), `${block.id} ${field} 비어 있음`)
  }
}
need(Array.isArray(corpus.safety?.excluded) && corpus.safety.excluded.length >= 4, '코퍼스 안전 제외 항목 부족')

// 6) 브리지 JS
const bridge = read('사주/js/newyear-service.js')
need(bridge.includes('/api/flow/newyear/analyze'), '브리지가 분석 API 를 부르지 않음')
need(bridge.includes('Authorization'), '브리지가 로그인 토큰을 붙이지 않음')
need(bridge.includes('#step-2-saju-input'), '브리지가 02 입력을 잡지 않음')
need(bridge.includes('#step-4-report'), '브리지가 04 티저를 잡지 않음')
need(bridge.includes('#step-5-chat'), '브리지가 05 목차를 잡지 않음')
need(bridge.includes('#step-6_1-report'), '브리지가 06 상세를 잡지 않음')

// 7) 홈에서는 출시 예정 카드로 표시한다. 직접 서비스/저장 결과 경로는 유지한다.
const portal = read('사주/portal.html')
const portalSections = [...portal.matchAll(/<section\b[^>]*class="[^"]*\bsection-block\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map((match) => match[0])
const releasedSections = portalSections.filter((section) => /<span>\s*RELEASED NOW\s*<\/span>/.test(section))
const comingSections = portalSections.filter((section) => /<span>\s*COMING SOON\s*<\/span>/.test(section))
const portalCards = (html) => [...html.matchAll(/<(a|button)\b[^>]*class="[^"]*\bservice-card\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g)].map((match) => match[0])
const isNewyearCard = (card) => card.includes('umsh-newyear-card-bg.webp') || card.includes('내 2027년, 풀릴 각이야?')
const newyearCards = portalCards(portal).filter(isNewyearCard)
const comingCards = portalCards(comingSections[0] ?? '')
const newyearCard = newyearCards[0] ?? ''
need(releasedSections.length === 1 && comingSections.length === 1, '포탈의 RELEASED NOW/COMING SOON 영역은 각각 하나여야 함')
need(!releasedSections.some((section) => isNewyearCard(section)), '신년운세가 RELEASED NOW 영역에 남아 있음')
need(newyearCards.length === 1, `신년운세 홈 카드 ${newyearCards.length}개 (COMING SOON에 하나만 허용)`)
need(comingCards[0] === newyearCard && Boolean(newyearCard), '신년운세는 COMING SOON의 첫 카드여야 함')
need(/^<button\b/.test(newyearCard) && /\btype="button"/.test(newyearCard), '신년운세 홈 카드는 이동 링크가 아닌 button이어야 함')
need(/\bclass="[^"]*\bis-soon\b[^"]*"/.test(newyearCard) && !/\bis-live\b/.test(newyearCard), '신년운세 홈 카드의 출시 예정 상태가 올바르지 않음')
need(/<span\b[^>]*class="coming-tag"[^>]*>\s*SOON\s*<\/span>/.test(newyearCard), '신년운세 홈 카드에 SOON 표시 없음')
need(/\baria-label="[^"]*준비 중인 서비스[^"]*"/.test(newyearCard), '신년운세 홈 카드의 접근성 안내에 준비 중 상태 없음')
need(!/\bhref\s*=/.test(newyearCard) && !/\bhref=["']\/flow\/newyear(?:[/?#]|["'])/.test(portal), '신년운세 홈 카드의 직접 이동 링크가 남아 있음')

if (failures.length > 0) {
  console.error('newyear_flow 연동 점검 실패')
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}
console.log(`newyear_flow 연동 지점 전부 정상 (${PAGES.length}개 페이지, ${EXPECTED_GROUPS}개 대분류, ${EXPECTED_ITEMS}개 중분류, 코퍼스 ${corpus.knowledgeBlocks.length}블록)`)
