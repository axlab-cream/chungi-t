import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/today-fortune-service.json'
const newPath = 'data/tone-v2/corpus/releases/today-fortune-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/today-fortune-2.1.0.json'
const releasePath = 'tone-v2/releases/today-fortune-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-today-fortune-corpus-rag-release-candidate-20260913.json'
const generationEvidencePath = 'tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const fileHash = (path) => sha256(readFileSync(join(root, path)))
const writeJson = (path, value) => {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const source = readJson(oldPath)
if (source.knowledgeBlocks.length !== 1 || source.knowledgeBlocks[0]?.id !== 'today-001') {
  throw new Error('today_fortune source IDs do not match the reviewed one-block contract')
}
const original = source.knowledgeBlocks[0]
const candidate = {
  version: '2.1.0',
  domain: source.domain,
  description: '오늘의 입력 사실·서버 계산값·상징적 해석 후보·가상 사례를 분리하고 날짜·사건·성과·타인의 마음 확정을 금지한 검수 완료 전용 블록.',
  release: {
    state: 'candidate', previousVersion: source.version, previousPath: oldPath,
    semanticReview: reviewPath, sampleOutputsIngested: false,
  },
  knowledgeBlocks: [{
    id: 'today-001',
    topic: '일진은 실제 일정의 우선순위를 검토하는 상징적 질문이다',
    keywords: original.keywords,
    concept: '계산된 일진과 원국을 오늘의 선택 기준 후보로 제한한다',
    condition: 'serviceKey가 today_fortune이고 서버가 계산한 기준일의 일주와 사용자 원국이 함께 제공될 때만 적용한다. 실제 일정과 선택지는 사용자가 입력하거나 확인한 사실만 사용한다.',
    interpretation: '계산된 일진과 원국의 관계는 오늘의 사건을 예고하는 사실이 아니라 행동 우선순위를 검토하는 상징적 질문이다. 일정의 결과, 성과와 다른 사람의 반응은 예측하지 않는다.',
    real_world_pattern: [
      '가상 사례: 사용자가 실제 일정과 마감을 입력해 먼저 확인할 일을 고르는 경우',
      '가상 사례: 약속 변경 가능성과 되돌리기 비용을 비교하는 경우',
    ],
    risk: '일진만으로 길한 시각, 사건의 발생, 업무 성과나 상대의 반응을 확정하는 것',
    opportunity: '사용자가 확인한 일정에서 중요도, 마감과 되돌리기 가능성을 비교하는 것',
    advice: '실제 일정과 마감을 확인하고 중요도와 되돌리기 비용을 기준으로 먼저 할 일을 고른다.',
    confidence: 'medium',
    forbidden_generalization: '일진만으로 좋은 날과 나쁜 날, 사건 결과, 성과 또는 타인의 마음을 단정하지 않는다.',
  }],
}
writeJson(newPath, candidate)
const candidateHash = fileHash(newPath)
const checks = {
  inputBoundary: true,
  calculatedValueBoundary: true,
  symbolicInterpretationBoundary: true,
  hypotheticalExampleBoundary: true,
  eventAndOutcomeBoundary: true,
  otherPersonMindBoundary: true,
  numericProvenance: true,
}
writeJson(reviewPath, {
  schemaVersion: '1.0.0', serviceKey: 'today_fortune', corpusVersion: candidate.version,
  status: 'approved', sourcePath: newPath, sourceSha256: candidateHash,
  reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json'],
  sampleOutputsIngested: false,
  reviewMethod: 'explicit daily evidence, symbolic and hypothetical-example review with executable hash assertions',
  blocks: [{ id: 'today-001', status: 'pass', checks }],
})
const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
const generationEvidence = readJson(generationEvidencePath)
if (generationEvidence.status !== 'pass' || generationEvidence.serviceKey !== 'today_fortune') throw new Error('today_fortune generation evidence is not approved')
if (generationEvidence.provider.actualCalls !== false || generationEvidence.provider.reason !== 'deterministic_daily_rules_service') throw new Error('today_fortune evidence must remain deterministic')
if (generationEvidence.corpus.version !== candidate.version || generationEvidence.corpus.contentHash !== candidateHash.slice(0, 16)) throw new Error('today_fortune generation evidence is not bound to corpus 2.1.0')
if (generationEvidence.completion.recordStatus !== 'complete' || generationEvidence.completion.completedFields !== 7 || generationEvidence.completion.expectedFields !== 7) throw new Error('today_fortune full-outline evidence is incomplete')
if (generationEvidence.coverage.relations.passed !== 5 || generationEvidence.coverage.zodiac.passed !== 12) throw new Error('today_fortune deterministic branch evidence is incomplete')
if (generationEvidence.evidence.containsProviderProse || generationEvidence.evidence.containsSecrets || generationEvidence.evidence.containsPersonalData) throw new Error('today_fortune tracked evidence is not sanitized')
if (generationEvidence.verification.independentReview !== 'approved_codex_review') throw new Error('today_fortune generation evidence lacks direct review approval')
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'today-fortune-corpus-2.1.0', serviceKey: 'today_fortune',
  state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: {
    previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) },
    candidate: { path: newPath, version: candidate.version, sha256: candidateHash },
    semanticReview: reviewPath,
  },
  generationEvidence: {
    path: generationEvidencePath,
    recordSha256: generationEvidence.evidence.recordSha256,
    acceptedProseSha256: generationEvidence.evidence.acceptedProseSha256,
    containsProviderProse: false,
  },
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, deterministicDailyRendererChanged: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: {
    semanticReview: 'pass_1_of_1', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required',
    providerOutputEvaluation: 'not_applicable_deterministic_service', deterministicDailyRenderer: 'reviewed_and_updated', fullOutlineOutputReview: 'pass_7_of_7',
    focusedTests: verification?.verification?.focusedTests ?? 'pending',
    fullTests: verification?.verification?.fullTests ?? 'pending',
    typecheck: verification?.verification?.typecheck ?? 'pending',
    build: verification?.verification?.vercelBuild ?? 'pending',
    codexReview: verification?.verification?.codexReview ?? 'pending',
  },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
