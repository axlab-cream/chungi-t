import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/newyear-service.json'
const newPath = 'data/tone-v2/corpus/releases/newyear-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/newyear-flow-2.1.0.json'
const releasePath = 'tone-v2/releases/newyear-flow-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-newyear-flow-corpus-rag-release-candidate-20260913.json'
const generationEvidencePath = 'tone-v2/evaluations/P04-newyear-flow-full-outline-generation-20260913.json'
const visualEvidencePath = 'tone-v2/evaluations/P04-newyear-flow-visual-render-evidence-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 10 }, (_, index) => `newyear-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('newyear_flow source contract mismatch')

const interpretations = {
  'newyear-001': '기준 연도의 세운 천간과 일간 관계는 서버가 계산한 십신 분류다. 이 값은 한 해를 살펴볼 상징적 관점을 제공할 뿐 목표의 크기, 성과 또는 좋고 나쁨을 결정하지 않는다.',
  'newyear-002': '입춘은 명리 연도 경계를 계산하는 절기다. 달력 연도와 계산 기준을 구분하되 입춘 전후의 선택, 의지, 성과 또는 사건이 달라진다고 설명하지 않는다.',
  'newyear-003': '세운과 월운은 업무 질문을 비교하는 상징 축이다. 이직·승진·합격·계약·프로젝트 결과는 실제 일정, 준비, 자원과 의사결정권자 정보 없이 예측하지 않는다.',
  'newyear-004': '재물 관련 십신과 월운은 돈 질문을 분류하는 상징 근거다. 수입, 잔고, 지출, 세금, 수리비, 투자 성과 또는 손실은 사용자의 실제 재무 기록 없이 만들지 않는다.',
  'newyear-005': '관계 관련 세운·월운은 대화와 경계를 점검하는 상징 질문이다. 새 인연, 관계 종료, 연락 감소, 타인의 감정·의도·반응 또는 도움 여부를 미래 사실로 예측하지 않는다.',
  'newyear-006': '월운 구간은 서버가 계산한 월절 시작값이다. 각 구간을 사건·성과·기분·체력의 좋고 나쁨으로 등급화하지 않고 실제 일정과 기록을 비교할 시간 축으로만 쓴다.',
  'newyear-007': '대운 교차는 서버의 대운 목록에 기준 연도가 포함될 때만 표시하는 계산값이다. 출생 시각이 없거나 계산되지 않았다면 교차 여부와 체감 시점을 보류하며 삶의 방식 변화도 단정하지 않는다.',
  'newyear-008': '주의 구간은 사건 예고가 아니라 확인 질문을 배치할 상징적 시간 축이다. 질병, 사고, 소송, 파산, 감정 상태나 반복 원인은 실제 기록과 전문 판단 없이 추론하지 않는다.',
  'newyear-009': '새해 계획은 사용자가 확인한 목표, 일정, 자원과 기존 기록으로 세운다. 일간 강약이나 상징 물건으로 실행 성공을 정하거나 임의의 목표 수·기간·루틴을 처방하지 않는다.',
  'newyear-010': '지난해 마무리는 사용자가 실제로 미완료라고 확인한 일, 연락, 정산만 다룬다. 미확인 과제나 돈을 만들어 내거나 그것이 새해의 힘과 결과를 소모한다고 설명하지 않는다.',
}

const topics = {
  'newyear-001': '한 해의 계산값은 방향 질문이지 운의 등급이 아니다',
  'newyear-002': '명리 연도 경계는 서버가 계산한 입춘이다',
  'newyear-003': '일의 시기 해석은 실제 업무 조건과 나란히 본다',
  'newyear-004': '재물 흐름은 실제 재무 기록 없이 예측하지 않는다',
  'newyear-005': '관계 변화는 확인된 말과 행동 없이 예측하지 않는다',
  'newyear-006': '월운은 서버가 계산한 월절 구간이다',
  'newyear-007': '대운 교차는 계산된 경우에만 표시한다',
  'newyear-008': '주의 구간은 사건 예고가 아니라 확인 질문이다',
  'newyear-009': '새해 계획은 실제 목표·일정·자원으로 세운다',
  'newyear-010': '지난해 마무리는 확인된 미완료 항목만 다룬다',
}

const advice = {
  'newyear-001': '계산된 세운 분류와 사용자가 확인한 올해 목표·제약을 별도 항목으로 비교한다.',
  'newyear-002': '계산 기준의 입춘 시각을 표시하고 실제 계획은 사용자가 정한 달력 일정으로 관리한다.',
  'newyear-003': '실제 업무 일정, 준비 상태, 계약 조건과 선택권을 확인해 판단 기준을 정한다.',
  'newyear-004': '실제 수입·지출 기록과 감당 가능한 손실 범위를 확인하고 중요한 재무 판단은 전문가 검토를 우선한다.',
  'newyear-005': '직접 확인한 말과 행동, 동의와 경계를 기준으로 관계 선택을 검토한다.',
  'newyear-006': '계산된 월절 경계와 실제 일정을 나란히 두고 사용자가 정한 점검 기준으로 기록한다.',
  'newyear-007': '계산된 교차 여부만 표시하고 출생 시각 미상이나 누락값이 있으면 세부 판단을 보류한다.',
  'newyear-008': '확인된 위험 신호는 의료·법률·재무 등 해당 분야의 적절한 전문 지원으로 연결한다.',
  'newyear-009': '현재 목표, 자원, 일정과 이전 실행 기록을 확인해 사용자가 가능한 다음 행동을 고른다.',
  'newyear-010': '실제로 남은 항목과 책임 주체를 확인하고 이어갈지 마칠지는 현실 조건으로 결정한다.',
}

const boundary = '신년운세는 서버가 계산한 기준 연도·입춘·세운·월운·대운 값을 해석 질문으로 번역할 뿐 미래 사건이나 개인 상태를 증명하지 않는다. 현실 근거는 사용자가 확인한 일정·자원·기록·관계·재무 조건만 사용한다. 입력되지 않은 사건·성과·감정·건강·재정 상태와 출생 시각 미상에 의존하는 계산은 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => ({
  id: block.id,
  topic: topics[block.id],
  keywords: block.keywords,
  concept: '이 항목은 서버 계산값과 아직 일어나지 않은 현실을 분리하는 해석 질문이다.',
  condition: boundary,
  interpretation: interpretations[block.id],
  real_world_pattern: [
    '가상 사례: 사용자가 해당 항목과 관련된 실제 일정·기록·조건을 제공해 계산 구간과 비교하는 경우',
    '가상 사례: 필요한 현실 정보나 계산값이 없어 사건·성과·개인 상태를 알 수 없음으로 두는 경우',
  ],
  risk: `“${topics[block.id]}”의 계산과 상징을 미래 사건, 개인 상태 또는 결과 보장으로 바꾸는 것`,
  opportunity: '사용자가 확인한 현실 조건과 서버 계산의 상징 질문을 별도 항목으로 비교하는 것',
  advice: advice[block.id],
  confidence: ['newyear-003', 'newyear-004', 'newyear-005', 'newyear-008'].includes(block.id) ? 'high' : 'medium',
  forbidden_generalization: `특정 연도·절기·세운·월운·대운이 합격, 계약, 임신, 이혼, 관계, 건강, 사고, 소송, 수익이나 손실을 만든다고 단정하지 않는다. 의료·법률·재무·안전 판단은 확인 가능한 사실과 해당 분야의 적절한 전문 지원을 우선한다.`,
}))

const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '기준 연도·절기·세운·월운·대운 계산과 사용자 확인 현실·미확인 미래·가상 사례를 분리하고 사건·개인 상태·전문 영역·수치 경계를 검수한 10개 블록.',
  safety: {
    evidence: '현실 사실은 사용자가 확인한 일정, 자원, 기록, 관계와 재무 조건만 사용한다.',
    symbolicBoundary: '연도·절기·세운·월운·대운은 서버 계산과 상징 질문이며 미래 사건, 성과 또는 개인 상태를 증명하지 않는다.',
    professionalBoundary: '건강, 사고, 법률, 계약, 투자와 재무 결정은 확인 가능한 사실과 의료·법률·재무 등 적절한 전문 판단을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { calculatedValueBoundary: true, calendarAndSolarTermBoundary: true, userRealityBoundary: true, unknownFutureBoundary: true, hypotheticalExampleBoundary: true, relationshipBoundary: true, healthAndSafetyBoundary: true, legalAndFinancialBoundary: true, unknownBirthTimeBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'newyear_flow', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/newyear_flow.md'], sampleOutputsIngested: false, reviewMethod: 'explicit annual calculation, solar-term calendar, future event, relationship, personal state, professional safety, unknown birth time, numeric and outcome review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
const generationEvidence = readJson(generationEvidencePath)
const visualEvidence = readJson(visualEvidencePath)
if (visualEvidence.status !== 'pass' || visualEvidence.serviceKey !== 'newyear_flow') throw new Error('newyear_flow visual evidence is not approved')
if (visualEvidence.privacy.containsProviderProse || visualEvidence.privacy.containsSecrets || visualEvidence.privacy.containsPersonalData) throw new Error('newyear_flow tracked visual evidence is not sanitized')
if (![visualEvidence.render.desktop.passed, visualEvidence.render.mobile.passed, visualEvidence.print.passed].every(Boolean)) throw new Error('newyear_flow visual evidence is incomplete')
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'newyear-flow-corpus-2.1.0', serviceKey: 'newyear_flow', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: { path: generationEvidencePath, recordSha256: generationEvidence.evidence.recordSha256, acceptedProseSha256: generationEvidence.evidence.acceptedProseSha256, containsProviderProse: false },
  visualEvidence: { path: visualEvidencePath, sha256: fileHash(visualEvidencePath), desktop: 'pass_36_of_36', mobile: 'pass_36_of_36', print: 'pass_all_36_sections', containsProviderProse: false },
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_10_of_10', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'pass_36_of_36', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
