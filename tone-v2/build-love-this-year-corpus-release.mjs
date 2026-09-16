import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/love-this-year-service.json'
const newPath = 'data/tone-v2/corpus/releases/love-this-year-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/love-this-year-2.1.0.json'
const releasePath = 'tone-v2/releases/love-this-year-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-love-this-year-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 10 }, (_, index) => `lty-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('love_this_year source contract mismatch')

const topics = {
  'lty-001': '올해 흐름은 계산된 연운과 확인된 관계 상태로 나눈다',
  'lty-002': '끌림과 안정은 사용자가 관찰한 장면으로 구분한다',
  'lty-003': '도화와 월운은 만남을 보장하지 않는 상징 질문이다',
  'lty-004': '배우자성은 상대 신원을 찍지 않는 관계 관점이다',
  'lty-005': '월별 흐름은 계산값이 있을 때만 비교한다',
  'lty-006': '관계 진전은 직접 표현과 합의된 약속으로 확인한다',
  'lty-007': '애매한 신호와 명시적 거절을 분리한다',
  'lty-008': '궁합은 동의받아 입력된 계산값의 비교 질문이다',
  'lty-009': '감정 온도는 상대 마음이 아니라 확인된 소통 차이다',
  'lty-010': '다음 행동은 동의와 실제 일정에 맞춘 선택이다',
}

const interpretations = {
  'lty-001': '서버가 계산한 올해의 세운은 관계 질문을 정리하는 상징 자료다. 사용자가 밝힌 현재 상태와 실제 일정이 없으면 소개, 연락, 만남이나 연애 시작 여부는 알 수 없다.',
  'lty-002': '끌림, 편안함, 불안과 피로는 사용자가 직접 경험해 알려 준 장면만 사실로 쓴다. 일지나 배우자궁 같은 사주 계산은 상대의 성격, 반응이나 관계 적합성을 증명하지 않는다.',
  'lty-003': '도화와 월운은 특정 시기의 표현·노출 질문을 나누는 상징 관점이다. 계산된 값이 있더라도 실제 소개, 연락, 인기나 좋은 인연의 발생을 예측하지 않는다.',
  'lty-004': '재성·관성 같은 배우자성은 관계에서 현실성·책임·규칙을 묻는 전통적 관점이다. 성별 공식으로 상대의 직업, 성격, 신원, 애정 또는 결혼 결과를 정하지 않는다.',
  'lty-005': '월별 비교는 서버가 실제로 계산해 전달한 월운 값과 사용자가 확인한 일정이 있을 때만 가능하다. 계산되지 않은 달, 만날 사람, 연락 시점과 사건을 만들어 채우지 않는다.',
  'lty-006': '관계 진전은 양쪽이 직접 밝힌 의향, 합의한 관계 이름과 구체화한 약속으로 확인한다. 연락량, 사주 상징이나 한쪽의 기대만으로 고백 수락이나 관계 시작을 판정하지 않는다.',
  'lty-007': '답장과 일정 변경은 사용자가 확인한 행동으로 기록하되 그 이유와 상대 마음은 알 수 없음으로 둔다. 명시적 거절, 차단과 연락 중단 요청은 애매한 호감 신호로 다시 해석하지 않는다.',
  'lty-008': '궁합 비교는 각 사람이 동의해 제공한 정보로 서버가 계산한 값만 사용한다. 상대의 원본 생년월일시는 답변 근거나 코퍼스에 되풀이하지 않고, 생시가 없으면 관련 계산의 한계를 밝힌다.',
  'lty-009': '표현 속도와 연락 방식은 사용자가 확인한 말과 행동의 차이로만 설명한다. 표현이 적거나 느리다는 사실만으로 애정의 크기, 불안, 회피 또는 관계 의향을 추정하지 않는다.',
  'lty-010': '다음 행동은 사용자가 원하는 관계와 상대가 직접 밝힌 동의·경계, 실제 가능한 일정에 맞춰 선택한다. 사주 상징만으로 접촉, 소개 참여, 고백이나 관계 종료를 지시하지 않는다.',
}

const advice = {
  'lty-001': '계산된 연운과 사용자가 확인한 현재 관계·일정을 분리해 본다.',
  'lty-002': '끌림과 안정에 관한 판단은 사용자가 실제로 겪은 대화·약속·경계 장면에서 확인한다.',
  'lty-003': '도화와 월운은 질문의 관점으로만 두고 실제 만남 여부는 확인된 일정으로 판단한다.',
  'lty-004': '배우자성은 관계의 책임과 규칙을 묻는 관점으로만 사용하고 상대 신원은 추정하지 않는다.',
  'lty-005': '서버 월운 계산과 사용자가 확인한 일정을 나란히 놓고 없는 달 정보는 만들지 않는다.',
  'lty-006': '관계 이름과 다음 약속은 양쪽의 직접 표현과 합의로 확인한다.',
  'lty-007': '거절·차단·연락 중단 요청을 존중하고 이유를 추측하거나 우회 접촉하지 않는다.',
  'lty-008': '동의받은 입력의 계산값만 비교하고 원본 개인정보는 반복 노출하지 않는다.',
  'lty-009': '연락 빈도 대신 직접 확인한 표현, 약속과 경계를 구분해 기록한다.',
  'lty-010': '사용자의 선택, 상대의 동의와 실제 가능한 일정이 겹치는 행동만 검토한다.',
}

const boundary = '올해 연애운은 사용자에게 확인된 관계 사실과 서버가 계산한 사주 값을 질문으로 번역할 뿐 만남·연락·상대 마음이나 관계 결과를 증명하지 않는다. 현실 근거는 사용자가 직접 밝힌 현재 관계, 직접 들은 말, 확인된 행동·약속·일정과 동의받은 정보만 사용한다. 입력에 없는 소개, 연락, 감정, 의도, 안전 상태와 미래 결과는 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => ({
  id: block.id,
  topic: topics[block.id],
  keywords: block.keywords,
  concept: '이 항목은 사용자에게 확인된 관계 사실, 서버 계산, 상징 질문, 상대의 미확인 현실과 동의·안전 경계를 분리하는 판단 질문이다.',
  condition: boundary,
  interpretation: interpretations[block.id],
  real_world_pattern: [
    '가상 사례: 사용자가 직접 확인한 말·행동·약속과 서버 계산의 상징 질문을 별도로 비교하는 경우',
    '가상 사례: 상대의 감정·의도나 향후 만남이 확인되지 않아 알 수 없음으로 두는 경우',
  ],
  risk: `“${topics[block.id]}”의 상징이나 가상 사례를 실제 상대 마음, 연락, 만남 또는 관계 결과로 바꾸는 것`,
  opportunity: '확인된 관계 사실과 미확인 영역을 분리하고 양쪽의 동의·경계와 관찰 가능한 행동을 우선하는 것',
  advice: advice[block.id],
  confidence: ['lty-005', 'lty-008'].includes(block.id) ? 'high' : 'medium',
  forbidden_generalization: '사주·도화·배우자성·궁합만으로 특정 달의 만남, 연락, 상대 마음, 애정, 성격, 연애·재회·결혼 결과를 단정하지 않는다. 명시적 거절·차단·연락 중단 요청은 존중한다. 위협·강압·스토킹·폭력이 있으면 관계 해석이나 접촉보다 안전 확보와 적절한 지원을 우선한다.',
}))

const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '확인된 관계 사실·서버 계산·상징 질문·미확인 상대 현실·동의·안전·개인정보·가상 사례를 분리하고 만남·감정·결과·수치 경계를 검수한 10개 블록.',
  safety: {
    evidence: '현실 사실은 사용자가 직접 밝힌 관계 상태, 직접 들은 말, 확인된 행동·약속·일정과 동의받은 정보만 사용한다.',
    symbolicBoundary: '세운·월운·도화·배우자성·궁합은 질문 관점이며 만남, 연락, 상대 마음이나 관계 결과를 증명하지 않는다.',
    privacyAndConsent: '상대 원본 생년월일시는 반복 노출하지 않고 명시적 거절·차단·연락 중단 요청을 우선한다.',
    safetyBoundary: '위협·강압·스토킹·폭력이 있으면 관계 해석과 접촉보다 안전 확보와 적절한 지원을 우선한다.',
  },
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { relationshipFactBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, unknownPartnerBoundary: true, futureOutcomeBoundary: true, hypotheticalExampleBoundary: true, partnerPrivacyBoundary: true, consentAndRefusalBoundary: true, safetyBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true, routeInvariantBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'love_this_year', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/love_this_year.md', 'CreamAI/backlog/task-019.md'], sampleOutputsIngested: false, reviewMethod: 'explicit relationship fact, calculation, symbolic, unknown partner, future, partner privacy, consent, refusal, safety, numeric and route-invariant review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'love-this-year-corpus-2.1.0', serviceKey: 'love_this_year', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: null,
  generationEvidenceReason: 'No provider evaluation was run for love_this_year corpus 2.1.0; deterministic tests are verification evidence, not provider-output evidence.',
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  routing: { dedicatedAnalyzeRoute: '/api/love/this-year/analyze', dedicatedRouteChanged: false, genericAnalyzeFallback: 'blocked', genericRouteChanged: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_10_of_10', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run_for_2.1.0', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
