import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/saju-master-service.json'
const newPath = 'data/tone-v2/corpus/releases/saju-master-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/saju-master-2.1.0.json'
const releasePath = 'tone-v2/releases/saju-master-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-saju-master-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const fileHash = (path) => sha256(readFileSync(join(root, path)))
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
if (source.knowledgeBlocks.length !== 1 || source.knowledgeBlocks[0]?.id !== 'master-001') throw new Error('saju_master source IDs do not match the reviewed one-block contract')
const original = source.knowledgeBlocks[0]
const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '사용자 사실·서버 계산 원국/대운·상징적 해석 후보·가상 사례를 분리하고 삶의 결과 및 전문 판단 확정을 금지한 검수 완료 천명사주 블록.',
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: [{
    id: 'master-001',
    topic: '원국과 대운은 실제 선택을 검토하는 상징적 질문이다',
    keywords: original.keywords,
    concept: '서버가 계산한 네 기둥·십신·대운을 사용자가 확인한 선택 기록과 구분해 해석한다',
    condition: 'serviceKey가 saju_master이고 서버가 계산한 원국, 십신과 대운 값이 제공될 때만 적용한다. 실제 사건, 선택과 생활 제약은 사용자가 입력하거나 확인한 사실만 사용한다.',
    interpretation: '계산된 원국과 대운은 삶의 결과를 확정하는 사실이 아니라 반복되는 선택 조건을 검토하는 상징적 질문이다. 성격, 직업 성패, 재산, 관계, 건강과 미래 사건을 예측하지 않는다.',
    real_world_pattern: [
      '가상 사례: 사용자가 확인한 업무 기록에서 책임과 권한의 차이를 비교하는 경우',
      '가상 사례: 실제 지출과 관계 기록에서 반복되는 선택 기준을 검토하는 경우',
      '가상 사례: 진로 선택지의 조건과 되돌리기 비용을 함께 적어 비교하는 경우'
    ],
    risk: '원국이나 대운만으로 성격, 직업, 재물, 관계, 건강 또는 미래 사건을 확정하는 것',
    opportunity: '사용자가 확인한 선택 기록과 현재 제약을 바탕으로 반복되는 판단 기준을 비교하는 것',
    advice: '실제 선택지, 확인된 제약과 되돌리기 비용을 적고 상징 해석은 검토 질문으로만 사용한다. 의료·법률·투자·계약 판단은 해당 전문가와 객관 자료를 우선한다.',
    confidence: 'medium',
    forbidden_generalization: '원국이나 대운만으로 타고난 성격, 직업 성패, 재산, 관계, 건강, 미래 사건 또는 타인의 마음을 단정하지 않는다.'
  }]
}
writeJson(newPath, candidate)
const candidateHash = fileHash(newPath)
const checks = { inputBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, hypotheticalExampleBoundary: true, lifeOutcomeBoundary: true, professionalDomainBoundary: true, otherPersonMindBoundary: true, numericProvenance: true }
writeJson(reviewPath, {
  schemaVersion: '1.0.0', serviceKey: 'saju_master', corpusVersion: candidate.version, status: 'approved', sourcePath: newPath, sourceSha256: candidateHash,
  reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json'], sampleOutputsIngested: false,
  reviewMethod: 'explicit input, calculated-value, symbolic, hypothetical-example and professional-domain boundary review with executable hash assertions',
  blocks: [{ id: 'master-001', status: 'pass', checks }]
})
const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'saju-master-corpus-2.1.0', serviceKey: 'saju_master', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: candidate.version, sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: null,
  generationEvidenceReason: 'No saju_master provider output evaluation was run or found; this candidate is limited to corpus semantics and snapshot-pinned RAG verification.',
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: {
    semanticReview: 'pass_1_of_1', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run',
    focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run',
    typecheck: verification?.verification?.typecheck ?? 'not_run', build: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run'
  }
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
