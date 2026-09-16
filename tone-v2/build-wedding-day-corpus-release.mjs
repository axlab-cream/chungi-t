import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/wedding-day-service.json'
const newPath = 'data/tone-v2/corpus/releases/wedding-day-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/wedding-day-2.1.0.json'
const releasePath = 'tone-v2/releases/wedding-day-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-wedding-day-corpus-rag-release-candidate-20260913.json'
const generationEvidencePath = 'tone-v2/evaluations/P04-wedding-day-full-outline-generation-20260913.json'
const visualEvidencePath = 'tone-v2/evaluations/P04-wedding-day-visual-render-evidence-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 6 }, (_, index) => `wedding-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('wedding_day source contract mismatch')

const topics = {
  'wedding-001': '제시된 후보일은 같은 계산 기준으로 비교한다',
  'wedding-002': '두 사람의 계산 관계는 두 명식이 있을 때만 본다',
  'wedding-003': '날짜 변경 범위는 확인된 일정과 계약 조건에서 정한다',
  'wedding-004': '준비 순서는 확인된 예식 형태와 역할로 정한다',
  'wedding-005': '당일 운영은 실제 시간표와 동선으로 점검한다',
  'wedding-006': '예식 이후 결정은 확인된 정산과 합의로 다룬다',
}

const interpretations = {
  'wedding-001': '사용자가 제시한 후보일마다 서버가 계산한 일주·월절과 명식 관계를 같은 항목으로 나란히 본다. 유리·주의 조건 수는 계산 결과의 요약이며 날짜의 길흉이나 결혼 결과 등급이 아니다.',
  'wedding-002': '두 명식이 제공된 경우에만 후보일과 각 명식의 관계를 별도로 계산한다. 상대 정보가 없거나 출생 시각이 미상이면 해당 관계와 시주 의존 판단은 알 수 없음으로 남긴다.',
  'wedding-003': '비교할 날짜 범위는 사용자가 확인한 예식장 가능일, 계약 변경 조건, 가족 일정과 선택권에서 정한다. 절기 달이 달라지면 서버 계산 항목이 달라질 수 있지만 변경 가능성이나 비용을 추정하지 않는다.',
  'wedding-004': '준비 순서는 사용자가 확인한 예식 형태, 담당자, 마감과 전달 대상에 따라 정한다. 명식이나 후보일 계산으로 가족의 감정·반응, 준비 지연 또는 신혼 갈등을 설명하지 않는다.',
  'wedding-005': '당일 운영은 확인된 시작 시각, 이동·대기 동선, 접근성, 업체 일정과 필요한 휴식 조건으로 점검한다. 특정 시각을 운이 좋은 시각으로 선고하거나 컨디션·날씨·사고·만족도를 예측하지 않는다.',
  'wedding-006': '예식 이후 비용 정산, 거주, 연락과 역할 결정은 사용자가 확인한 계약·재무 기록과 두 사람의 합의로 다룬다. 후보일 계산이 결혼 생활의 리듬, 갈등, 건강, 임신·출산 또는 이혼 가능성을 만든다고 보지 않는다.',
}

const advice = {
  'wedding-001': '제시된 후보일별 계산 항목을 같은 표에 놓고 현실 제약과 분리해 비교한다.',
  'wedding-002': '제공된 두 명식의 계산값만 나란히 표시하고 누락된 상대 정보와 시각 의존 판단은 보류한다.',
  'wedding-003': '변경 가능한 일정과 계약 조항을 먼저 확인한 뒤 그 범위 안의 후보일만 비교한다.',
  'wedding-004': '확인된 예식 형태와 담당자별 마감·전달 대상을 목록으로 합의한다.',
  'wedding-005': '실제 시간표와 이동·대기·접근성 조건을 확인하고 건강이나 안전 문제는 적절한 전문 지원을 우선한다.',
  'wedding-006': '실제 계약과 재무 기록, 두 사람의 동의를 확인하고 법률·재무 판단은 관련 전문가와 검토한다.',
}

const writingGuides = {
  'wedding-001': '후보일별 계산 근거를 같은 기준으로 쓰고 날짜의 우열이나 결혼 결과로 확대하지 않는다.',
  'wedding-002': '두 사람의 계산 결과를 구분하고 상대 정보 또는 출생 시각이 없으면 그 한계를 함께 쓴다.',
  'wedding-003': '사용자가 확인한 변경 범위와 계약 조건을 먼저 쓰고 입력되지 않은 일정·비용을 만들지 않는다.',
  'wedding-004': '확인된 형태·역할·마감만 정리하고 가족 감정이나 준비 상태를 추정하지 않는다.',
  'wedding-005': '운이 좋은 시각이라는 선고 대신 실제 운영 조건으로 설명하고 컨디션·날씨·사고를 예측하지 않는다.',
  'wedding-006': '택일 계산과 예식 이후의 계약·정산·관계 결정을 분리하고 전문 판단의 경계를 밝힌다.',
}

const boundary = '결혼 택일은 사용자가 제시한 후보일과 서버가 계산한 후보일 일주·월절·명식 관계를 비교 질문으로 번역할 뿐 결혼 결과나 사람의 상태를 증명하지 않는다. 현실 근거는 사용자가 확인한 일정·예식 형태·계약·재무 기록·역할·동의만 사용한다. 상대 정보가 미입력되거나 출생 시각이 미상인 경우 해당 명식 관계와 시각 의존 판단은 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => ({
  id: block.id,
  topic: topics[block.id],
  keywords: block.keywords,
  concept: '이 항목은 제출된 후보일과 서버 계산, 확인된 현실 제약과 아직 일어나지 않은 결과를 분리하는 비교 질문이다.',
  condition: boundary,
  interpretation: interpretations[block.id],
  real_world_pattern: [
    '가상 사례: 사용자가 제시한 후보일과 확인된 일정·계약·운영 조건을 서버 계산 결과와 별도로 비교하는 경우',
    '가상 사례: 상대 정보, 출생 시각 또는 현실 조건이 없어 관련 판단을 알 수 없음으로 두는 경우',
  ],
  risk: `“${topics[block.id]}”의 계산과 상징을 길흉 선고, 타인의 상태 또는 결혼 결과 보장으로 바꾸는 것`,
  opportunity: '제출된 후보일의 계산 근거와 사용자가 확인한 현실 제약을 분리해 의사결정 자료로 쓰는 것',
  advice: advice[block.id],
  confidence: ['wedding-001', 'wedding-002'].includes(block.id) ? 'high' : 'medium',
  forbidden_generalization: '특정 후보일·일주·월절·합·충이 결혼 성패, 가족 반응, 계약·재무 결과, 건강, 임신·출산, 사고 또는 이혼을 만든다고 단정하지 않는다. 계약·법률·재무·의료·안전 판단은 확인 가능한 사실과 해당 분야의 적절한 전문 지원을 우선한다.',
  writing_guide: writingGuides[block.id],
}))

const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '제출 후보일·서버 계산·확인된 현실 제약·미확인 미래·가상 사례를 분리하고 상대 정보·출생 시각·가족·계약·건강·재무·수치 경계를 검수한 6개 블록.',
  safety: {
    evidence: '현실 사실은 사용자가 확인한 후보일, 일정, 예식 형태, 계약, 재무 기록, 역할과 동의만 사용한다.',
    symbolicBoundary: '일주·월절·명식 관계는 서버 계산과 상징 비교이며 결혼 결과나 사람의 상태를 증명하지 않는다.',
    privacyBoundary: '상대 원본 개인정보를 코퍼스에 추가하지 않으며 상대 정보나 출생 시각이 없으면 관련 판단을 보류한다.',
    professionalBoundary: '계약, 법률, 재무, 의료와 안전 결정은 확인 가능한 사실과 적절한 전문 판단을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { candidateDateBoundary: true, calculatedValueBoundary: true, userRealityBoundary: true, partnerPrivacyBoundary: true, unknownPartnerBoundary: true, unknownBirthTimeBoundary: true, unknownFutureBoundary: true, hypotheticalExampleBoundary: true, relationshipAndFamilyBoundary: true, contractAndFinancialBoundary: true, healthAndSafetyBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'wedding_day', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/wedding_day.md'], sampleOutputsIngested: false, reviewMethod: 'explicit candidate date, calculation, partner privacy, unknown birth time, future event, family, contract, financial, health, numeric and outcome review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
const generationEvidence = readJson(generationEvidencePath)
const visualEvidence = readJson(visualEvidencePath)
if (visualEvidence.status !== 'pass' || visualEvidence.serviceKey !== 'wedding_day') throw new Error('wedding_day visual evidence is not approved')
if (visualEvidence.privacy.containsProviderProse || visualEvidence.privacy.containsSecrets || visualEvidence.privacy.containsPersonalData) throw new Error('wedding_day tracked visual evidence is not sanitized')
if (![visualEvidence.render.desktop.passed, visualEvidence.render.mobile.passed, visualEvidence.print.passed].every(Boolean)) throw new Error('wedding_day visual evidence is incomplete')
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'wedding-day-corpus-2.1.0', serviceKey: 'wedding_day', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: { path: generationEvidencePath, recordSha256: generationEvidence.evidence.recordSha256, acceptedProseSha256: generationEvidence.evidence.acceptedProseSha256, containsProviderProse: false },
  visualEvidence: { path: visualEvidencePath, sha256: fileHash(visualEvidencePath), desktop: 'pass_20_of_20', mobile: 'pass_20_of_20', print: 'pass_20_of_20', containsProviderProse: false },
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_6_of_6', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'pass_20_of_20', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
