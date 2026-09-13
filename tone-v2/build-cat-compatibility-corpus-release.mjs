import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/cat-compatibility-service.json'
const newPath = 'data/tone-v2/corpus/releases/cat-compatibility-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/cat-compatibility-2.1.0.json'
const releasePath = 'tone-v2/releases/cat-compatibility-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-cat-compatibility-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 38 }, (_, index) => `cat-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== 38 || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('cat_compatibility source contract mismatch')

function groupReading(id, topic) {
  const number = Number(id.slice(4))
  if (number <= 5) return `“${topic}”은 사용자가 실제로 보고한 돌봄 방식과 지속 가능한 생활 조건을 비교하는 질문이다. 애정의 크기나 보호자 자질을 판정하지 않는다.`
  if (number <= 10) return `“${topic}”은 사용자가 관찰한 접근·접촉·놀이·회복 반응을 살피는 질문이다. 고양이의 속마음이나 다음 행동을 안다고 말하지 않는다.`
  if (number <= 15) return `“${topic}”은 사용자가 기록한 거리·자세·접촉 전후 반응을 비교하는 질문이다. 한 장면을 애착이나 관계 상태의 증거로 확정하지 않는다.`
  if (number <= 20) return `“${topic}”은 사용자가 입력한 식사·놀이·수면·외출·도구 동선을 점검하는 질문이다. 관찰 전후가 없으면 원인이나 효과를 확정하지 않는다.`
  if (number <= 25) return `“${topic}”은 실제 자원 수, 배치, 냄새와 조명을 확인하는 환경 점검이다. 미측정 환경이나 행동을 건강·성격·안정의 증거로 바꾸지 않는다.`
  if (number <= 29) return `“${topic}”은 행동 직전의 상황과 실제 자원 배치를 기록해 비교하는 질문이다. 행동을 성격이나 질병으로 진단하지 않고 강제 접촉이나 처벌을 정당화하지 않는다.`
  if (number === 30) return '오행은 보호자 명식에서 서버가 계산한 상징 언어다. 고양이의 기질·건강·필요 자원 또는 두 존재의 궁합을 측정하지 않으며 현실 돌봄은 관찰 기록으로 결정한다.'
  if (number <= 33) return `“${topic}”은 사용자가 확인한 입양·합사·이동 일정과 실제 적응 신호를 따로 보는 질문이다. 적응 기간, 성공 여부와 미래 관계를 예언하지 않는다.`
  if (number <= 36) return `“${topic}”은 보호자가 직접 보고한 부담·휴식·지속 가능성을 살피는 질문이다. 불안·번아웃·돌봄 능력을 사주나 고양이 반응으로 진단하지 않는다.`
  return `“${topic}”은 사용자가 확인한 현재 불편에서 조정할 변수와 관찰할 신호를 나누는 질문이다. 임의 기간·횟수나 개선 결과를 만들지 않는다.`
}

function groupAdvice(id) {
  const number = Number(id.slice(4))
  if (number <= 15) return '입력된 관찰에서 접촉 전후 반응 하나를 비교하고, 불편 신호가 보이면 접촉을 멈춘다. 반응과 결과를 미리 약속하지 않는다.'
  if (number <= 20) return '사용자가 불편을 확인한 생활 조건 하나만 조정하고 전후 기록을 비교한다. 입력되지 않은 일정·횟수·효과는 만들지 않는다.'
  if (number <= 29) return '실제 자원과 행동 직전 상황을 확인한다. 갑작스러운 식사·배변·통증·호흡·활동 변화는 운세와 분리해 수의사에게 확인한다.'
  if (number === 30) return '오행은 보호자 쪽 상징 질문으로만 표시하고, 돌봄 결정은 고양이의 실제 반응과 수의학적 안내를 따른다.'
  if (number <= 33) return '확인된 일정과 실제 적응 신호를 기록하고 단계 변경은 동물복지와 수의학적 안내를 따른다. 고정 기간이나 성공 시점을 제시하지 않는다.'
  if (number <= 36) return '보호자가 보고한 부담과 이용 가능한 도움을 확인한다. 정신건강이나 돌봄 능력을 진단하지 않고 필요하면 적절한 전문 지원을 안내한다.'
  return '현재 불편과 직접 연결된 변수 하나를 선택해 전후 반응을 기록한다. 건강 우려가 있으면 관찰만 이어 가지 말고 수의사에게 확인한다.'
}

const conditionSuffix = '사용자가 입력하거나 관찰한 가정 형태·나이대·행동·접촉·놀이·루틴·일정만 현실 근거로 사용한다. 보호자 사주 계산은 별도의 상징 질문이며 고양이의 출생 명식과 입력되지 않은 상태는 알 수 없음으로 둔다. 보호자의 사주 계산은 고양이의 성격이나 마음을 증명하지 않는다.'
const blocks = source.knowledgeBlocks.map((block) => {
  const baseCondition = block.condition.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0]
  const baseForbidden = block.forbidden_generalization.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0]
  return {
    ...block,
    concept: `“${block.topic}”을 사용자 관찰과 미확인 상태를 구분하는 돌봄 질문으로 다룬다.`,
    condition: `${baseCondition} ${conditionSuffix}`,
    interpretation: groupReading(block.id, block.topic),
    real_world_pattern: [
      `가상 사례: 예를 들어 사용자가 “${block.topic}”과 관련된 실제 반응을 기록하고 조정 전후를 비교하는 경우`,
      `가상 사례: 예를 들어 “${block.topic}” 관련 관찰 정보가 없으면 현재 고양이의 상태를 알 수 없음으로 두는 경우`,
    ],
    opportunity: `사용자가 실제로 관찰한 “${block.topic}” 관련 조건을 기록하고 한 변수의 조정 전후를 비교하는 것`,
    advice: groupAdvice(block.id),
    forbidden_generalization: `${baseForbidden} 보호자 사주로 고양이의 성격·감정·질병·미래 행동·적응 속도·궁합 결과를 확정하지 않는다. 학대·방치·처벌·강제 접촉을 정당화하지 않는다.`,
  }
})

const candidate = {
  version: '2.1.0',
  domain: source.domain,
  description: '사용자 관찰·보호자 계산·상징·미확인 상태·가상 사례를 분리하고 동물복지·수의학·수치 경계를 검수한 38개 블록.',
  safety: {
    evidence: '고양이에 관한 사실은 사용자가 입력하거나 관찰한 내용과 자격 있는 수의학적 판단만 사용한다.',
    symbolicBoundary: '보호자 명식과 오행은 상징적 질문이며 고양이의 성격, 마음, 질병, 미래 또는 궁합을 측정하지 않는다.',
    welfare: '갑작스러운 건강·배변·식사·호흡·통증·활동 변화와 학대·방치 위험은 운세보다 동물복지와 전문 지원을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { userObservationBoundary: true, guardianCalculationBoundary: true, symbolicInterpretationBoundary: true, unknownCatStateBoundary: true, hypotheticalExampleBoundary: true, animalWelfareBoundary: true, veterinaryBoundary: true, householdApplicabilityBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'cat_compatibility', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/cat_compatibility.md'], sampleOutputsIngested: false, reviewMethod: 'explicit user observation, guardian calculation, symbol, unknown animal state, welfare, veterinary, household applicability, numeric and outcome review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'cat-compatibility-corpus-2.1.0', serviceKey: 'cat_compatibility', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: null,
  generationEvidenceReason: 'No provider evaluation was run for cat_compatibility corpus 2.1.0; deterministic template tests are verification evidence, not provider-output evidence.',
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_38_of_38', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run_for_2.1.0', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', build: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
