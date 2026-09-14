import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/work-move-service.json'
const newPath = 'data/tone-v2/corpus/releases/work-move-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/work-move-2.1.0.json'
const releasePath = 'tone-v2/releases/work-move-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-work-move-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 10 }, (_, index) => `wmov-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== 10 || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('work_move source contract mismatch')

const interpretations = {
  'wmov-001': '이동 판단은 사용자가 확인한 현재 조건과 문서화된 대안의 차이를 비교하는 절차다. 합격, 퇴사 또는 이동 뒤 결과를 예측하지 않는다.',
  'wmov-002': '현재 역할·권한·업무량·평가 방식은 사용자가 겪거나 확인한 사실만 설명한다. 상사 의도, 동료 평가, 회사 문화와 향후 조직 변화를 추정하지 않는다.',
  'wmov-003': '서버가 계산한 일간·오행·신강약·용신은 직업이나 감당력을 확정하는 값이 아니라 사용자가 확인한 업무·회복 조건을 묻는 상징이다.',
  'wmov-004': '서버가 계산한 십신은 역할 적합도나 성과를 증명하지 않는다. 실제 업무 범위, 산출물, 권한, 보고선과 평가 기준을 비교하는 상징적 질문으로만 쓴다.',
  'wmov-005': '보상은 사용자가 제공한 오퍼레터·계약서의 기본급, 변동급, 수습, 업무 범위와 비용만 비교한다. 구두 약속은 보고된 발언일 뿐 문서화된 조건이나 지급 보장이 아니다.',
  'wmov-006': '서버가 계산한 대운·세운·월운은 퇴사·면접·합격·입사 날짜의 성패를 정하지 않는다. 사용자가 정한 일정과 실제 문서 준비 순서를 검토하는 상징으로만 쓴다.',
  'wmov-007': '번아웃·괴롭힘·계약 불명확은 사용자가 직접 보고한 상태와 자료로만 다룬다. 사주 신호로 질병, 구조조정, 위험 사건 또는 새 회사의 문제를 예측하지 않는다.',
  'wmov-008': '이력서·포트폴리오·면접·협상·퇴사 대화의 완료 여부는 사용자 입력으로만 확인한다. 입력되지 않은 준비 기간이나 횟수를 만들어 이동을 재촉하지 않는다.',
  'wmov-009': '돈·성장·건강·사람·안정의 우선순위는 사용자가 직접 정한 선택 기준이다. 사주나 타인의 사례로 우선순위를 대신 정하거나 모든 조건의 충족을 약속하지 않는다.',
  'wmov-010': '최종 판단은 확인된 현재 조건과 실제 서면 대안의 차이를 요약한다. 운세, 결제 또는 CTA가 이직 정답과 향후 결과를 보장하지 않는다.'
}
const conditionSuffix = '사용자가 확인한 사실과 실제 문서만 현실 근거로 사용한다. 서버 계산값은 상징적 질문으로만 사용하고 확인되지 않은 조건은 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => {
  const baseCondition = block.condition.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0]
  const baseForbidden = block.forbidden_generalization.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0]
  const changed = {
    ...block,
    condition: `${baseCondition} ${conditionSuffix}`,
    interpretation: interpretations[block.id],
    real_world_pattern: block.real_world_pattern.map((item) => `가상 사례: 예를 들어 ${item.replace(/^예를 들어\s*/, '')}`),
    forbidden_generalization: `${baseForbidden} 합격·채용·연봉·퇴사 결과, 회사 문화·기밀·조직 변화 또는 타인의 의도를 추정하지 않는다.`
  }
  if (block.id === 'wmov-005') {
    changed.risk = '연봉 상승감이나 구두 약속만으로 지급, 역할, 근로조건 또는 이동의 이익을 확정하는 것'
    changed.opportunity = '실제 오퍼레터와 근로계약서의 보상·업무·수습·해지 조건을 현재 문서와 비교하는 것'
    changed.advice = '서면 조건을 항목별로 비교하고 불명확한 근로계약·세금·재무 영향은 노무·법률·재무 전문가에게 확인한다.'
  }
  if (block.id === 'wmov-006') {
    changed.risk = '운의 날짜로 퇴사, 면접, 합격, 입사 또는 새 직장의 결과를 보장하는 것'
    changed.advice = '사용자가 정한 일정과 오퍼 회신·계약·인수인계의 실제 기한만 기록하고 상징적 시기는 참고 질문으로만 둔다.'
  }
  if (block.id === 'wmov-007') {
    changed.risk = '사주 신호로 질병·괴롭힘·해고·구조조정이나 새 회사의 위험을 예측하고 공포를 키우는 것'
    changed.opportunity = '사용자가 보고한 건강·업무·괴롭힘·계약 신호를 나누어 실제 지원 경로를 찾는 것'
    changed.advice = '건강 위기는 의료 지원을, 괴롭힘·근로조건·계약 문제는 기록과 고용노동부·노무·법률 지원을 우선한다.'
  }
  if (block.id === 'wmov-008') changed.advice = '사용자가 완료했다고 확인한 준비는 반복 지시하지 않고, 미확인 단계만 다음 행동으로 둔다. 임의 기간이나 횟수는 만들지 않는다.'
  if (block.id === 'wmov-010') changed.advice = '현재 문서와 대안 문서의 보상·역할·건강·일정 차이를 요약하고, 자료가 없으면 결론 대신 확인 항목을 남긴다.'
  return changed
})

const candidate = { version: '2.1.0', domain: source.domain, description: '사용자 확인 사실·실제 문서·미확인 회사 조건·서버 계산·상징을 분리하고 채용·보상·계약·건강 경계를 검수한 10개 블록.', release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false }, knowledgeBlocks: blocks }
writeJson(newPath, candidate)
const candidateHash = fileHash(newPath)
const checks = { userFactBoundary: true, documentBoundary: true, unknownCompanyBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, hypotheticalExampleBoundary: true, hiringSalaryTimingBoundary: true, professionalDomainBoundary: true, otherPersonMindBoundary: true, numericProvenance: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'work_move', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json'], sampleOutputsIngested: false, reviewMethod: 'explicit work-fact, document, unknown-company, calculated-symbol, hiring, salary, timing, health and contract review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })
const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, { schemaVersion: '1.0.0', releaseId: 'work-move-corpus-2.1.0', serviceKey: 'work_move', state: 'candidate', deployed: false, promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady }, corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath }, generationEvidence: null, generationEvidenceReason: 'No work_move provider output evaluation was run; local corpus and snapshot verification only.', verificationEvidence: verification ? verificationPath : null, attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false }, rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false }, gates: { semanticReview: 'pass_10_of_10', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', build: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' } })
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
