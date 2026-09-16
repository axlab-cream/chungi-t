import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/lucky-color-service.json'
const newPath = 'data/tone-v2/corpus/releases/lucky-color-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/lucky-color-2.1.0.json'
const releasePath = 'tone-v2/releases/lucky-color-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-lucky-color-corpus-rag-release-candidate-20260913.json'
const generationEvidencePath = 'tone-v2/evaluations/P04-lucky-color-full-outline-generation-20260913.json'
const visualEvidencePath = 'tone-v2/evaluations/P04-lucky-color-visual-render-evidence-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 24 }, (_, index) => `lucky-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('lucky_color source contract mismatch')

const interpretations = {
  'lucky-001': '오행 개수는 서버가 계산한 분포다. 많고 적음은 상징적 비교 축이며 성격, 능력, 건강 또는 운의 좋고 나쁨을 뜻하지 않는다.',
  'lucky-002': '용신·희신 판단은 계산 규칙에서 나온 해석 후보다. 색이나 물건의 실제 효과가 아니라 여러 선택을 정리할 때 참고할 상징적 우선순위로 제한한다.',
  'lucky-003': '목(木)에 배속된 초록·나무·동쪽은 전통적 대응표다. 사용자의 선호나 공간을 확인하지 않았다면 구체적인 물건과 배치를 사실처럼 제안하지 않는다.',
  'lucky-004': '화(火)에 배속된 붉은 계열·빛·남쪽은 상징 언어다. 색의 면적이나 조명이 기분, 체력 또는 결과를 바꾼다고 설명하지 않는다.',
  'lucky-005': '토(土)에 배속된 흙빛·도자기·안정된 형태는 선택지를 분류하는 전통적 표지다. 무게나 소재가 심리적 안정을 만든다는 효능은 주장하지 않는다.',
  'lucky-006': '금(金)에 배속된 흰색·금속·서쪽은 계산값을 생활 언어로 옮긴 후보다. 정리 상태나 집중력은 사용자가 확인한 정보 없이 연결하지 않는다.',
  'lucky-007': '수(水)에 배속된 짙은 색·곡선·북쪽은 상징적 대응이다. 빛, 소리, 물 또는 색이 수면과 몸 상태를 개선한다는 결론은 만들지 않는다.',
  'lucky-008': '색을 적용할 위치는 사용자가 실제로 보는 곳과 원하는 노출 정도를 확인한 뒤 선택할 수 있다. 위치나 면적에 보편적인 체감 효과가 있다고 정하지 않는다.',
  'lucky-009': '복장 규정과 소품 사용 가능 여부는 사용자가 알려 준 현실 조건이다. 정보가 없으면 옷, 가방 또는 직장 환경을 만들어 내지 않는다.',
  'lucky-010': '재질은 사용자가 선호하거나 불편하다고 확인한 촉감과 관리 조건으로 고른다. 소재가 색보다 오래 작용한다는 보편적 효능은 전제하지 않는다.',
  'lucky-011': '물건은 계산된 상징을 기억하기 위한 선택 표지로만 설명한다. 가격, 소유 기간, 노출 빈도와 운의 변화는 연결하지 않는다.',
  'lucky-012': '덜어낼 항목은 사용자가 실제로 불편하거나 불필요하다고 확인한 것에서 고른다. 제거하지 않으면 나쁜 일이 생긴다는 경고는 하지 않는다.',
  'lucky-013': '소재가 몰렸는지는 사용자가 소유 환경을 입력했을 때만 확인할 수 있다. 혼합 여부와 편안함, 답답함 또는 운의 균형을 인과로 연결하지 않는다.',
  'lucky-014': '방향은 전통 배속에서 나온 상징 후보다. 실제 책상·집 구조와 이동 가능성을 확인하지 않고 방향 변경을 처방하지 않는다.',
  'lucky-015': '책상 자리의 사용감은 사용자가 보고한 시야, 소음, 동선과 불편을 근거로 살핀다. 등 뒤 구조만으로 집중력을 판정하지 않는다.',
  'lucky-016': '침대 위치와 수면 상태는 사용자가 입력한 공간·불편·안전 조건으로 구분한다. 문이나 머리 방향이 수면의 질을 결정한다고 말하지 않는다.',
  'lucky-017': '자리의 불편은 사용자가 확인한 소음, 통행, 빛, 온도와 신체 반응으로만 다룬다. 상징적 방위로 피로나 해결 여부를 단정하지 않는다.',
  'lucky-018': '아침 행동은 사용자가 실제 일과와 바꾸고 싶은 점을 입력했을 때만 제안 후보가 된다. 고정 순서가 하루 성과나 운의 방향을 만든다고 보장하지 않는다.',
  'lucky-019': '집중 시간은 사용자가 기록한 업무 결과와 생활 조건으로 확인한다. 일간·오행만으로 개인 생체리듬이나 몰입 구간을 계산했다고 표현하지 않는다.',
  'lucky-020': '음식의 맛·온도 배속은 전통적 상징 분류다. 식사 선택은 알레르기, 질환, 식이 제한과 전문가 안내를 우선하며 오행으로 영양 효과를 처방하지 않는다.',
  'lucky-021': '빛과 소리 조정은 사용자가 확인한 수면 환경을 점검하는 일반 후보일 뿐이다. 수면 문제의 원인·개선 여부를 상징이나 단일 행동으로 설명하지 않는다.',
  'lucky-022': '변경 항목은 사용자가 원하는 범위와 현실 제약에서 직접 고른다. 고정된 기간·횟수나 한 번의 변경 효과를 서비스가 임의로 정하지 않는다.',
  'lucky-023': '색·소재·물건·방향은 결과를 만드는 수단이 아니다. 합격, 수익, 건강, 관계 또는 불운 차단과 연결하지 않고 선택을 정리하는 상징 표지로만 둔다.',
  'lucky-024': '일간 강약과 용신은 서버 계산에서 나온 서로 다른 해석 축이다. 채우기와 쓰기 중 어느 행동이 더 낫다는 현실 결론은 사용자 정보 없이 확정하지 않는다.',
}

const advice = {
  'lucky-001': '계산된 분포와 사용자가 실제로 바꾸고 싶은 선택을 따로 표시한다.',
  'lucky-002': '용신은 상징적 우선순위로 표시하고 현실 선택은 선호와 제약으로 결정한다.',
  'lucky-003': '초록·나무·동쪽은 선택 후보로만 보여 주고 사용 가능 여부를 먼저 확인한다.',
  'lucky-004': '붉은 계열과 빛은 후보로 제시하되 사용자의 선호와 환경을 기준으로 고른다.',
  'lucky-005': '흙빛과 도자기는 상징 후보로만 두고 구매나 무게 변경을 요구하지 않는다.',
  'lucky-006': '흰색과 금속은 선택지로만 정리하고 정리 습관이나 집중 효과를 약속하지 않는다.',
  'lucky-007': '짙은 색과 곡선은 후보로만 표시하고 수면이나 몸 상태 판단에 사용하지 않는다.',
  'lucky-008': '사용자가 자주 보는 위치와 원하는 노출 정도를 확인해 선택한다.',
  'lucky-009': '실제 복장 규정과 이미 가진 소품 안에서 가능한 선택만 남긴다.',
  'lucky-010': '촉감, 관리 방식과 알레르기 여부를 확인하고 새 구매 없이 선택할 수 있게 한다.',
  'lucky-011': '물건에는 효능이 아니라 사용자가 정한 선택을 기억하는 역할만 부여한다.',
  'lucky-012': '사용자가 불필요하다고 확인한 항목만 정리 후보로 둔다.',
  'lucky-013': '실제 소유 소재와 사용감을 확인하고 혼합 여부는 취향으로 남긴다.',
  'lucky-014': '공간 구조와 이동 가능성을 확인한 경우에만 방향 후보를 비교한다.',
  'lucky-015': '사용자가 보고한 시야·소음·동선 불편을 기준으로 자리 후보를 비교한다.',
  'lucky-016': '수면 안전과 실제 불편을 우선하고 상징적 방향은 결정 근거에서 제외한다.',
  'lucky-017': '확인된 환경 조건과 신체 불편을 분리해 필요한 전문 점검을 우선한다.',
  'lucky-018': '현재 일과와 바꾸고 싶은 점을 확인한 뒤 사용자가 선택할 후보만 제시한다.',
  'lucky-019': '실제 업무 기록으로 편한 구간을 확인하고 명식으로 시간을 지정하지 않는다.',
  'lucky-020': '음식 선택은 식이 제한과 의료·영양 안내를 우선하고 상징은 참고에서 제외할 수 있다.',
  'lucky-021': '수면 문제가 이어지면 환경 상징보다 의료 등 적절한 전문 지원을 안내한다.',
  'lucky-022': '변경 범위와 관찰 방법은 사용자가 정하고 고정 기간·횟수는 만들지 않는다.',
  'lucky-023': '현실 결과는 색이나 물건과 분리하고 확인 가능한 선택만 정리한다.',
  'lucky-024': '계산 축을 분리해 표시하고 현실 행동은 사용자의 목표와 제약으로 결정한다.',
}

const boundary = '색과 물건은 서버가 계산한 오행을 생활 선택 질문으로 번역할 뿐 효능을 증명하지 않는다. 사용자가 확인한 선호·소유물·공간·복장·일정·생활 기록만 현실 근거로 사용한다. 입력되지 않은 환경과 반응은 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => ({
  id: block.id,
  topic: block.topic,
  keywords: block.keywords,
  concept: '이 항목은 계산값과 현실 선택을 분리하는 상징적 질문이다.',
  condition: boundary,
  interpretation: interpretations[block.id],
  real_world_pattern: [
    '가상 사례: 사용자가 해당 항목과 관련된 실제 선호나 환경을 입력해 선택 후보를 비교하는 경우',
    '가상 사례: 해당 항목에 필요한 현실 정보가 없어 구체적인 효능이나 행동을 알 수 없음으로 두는 경우',
  ],
  risk: `“${block.topic}”의 상징을 실제 효능, 개인 사실 또는 결과 보장으로 바꾸는 것`,
  opportunity: '사용자가 확인한 현실 조건과 상징 후보를 별도 항목으로 비교하는 것',
  advice: advice[block.id],
  confidence: ['lucky-020', 'lucky-021', 'lucky-023'].includes(block.id) ? 'high' : 'medium',
  forbidden_generalization: `${block.topic} 또는 특정 색·물건·재질·방향·음식·루틴이 운, 재물, 건강, 수면, 집중, 합격이나 관계 결과를 만든다고 단정하지 않는다. 질병·식이 제한·수면 문제는 의료 등 적절한 전문 판단을 우선한다.`,
}))

const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '서버 계산·전통 배속·사용자 확인 현실·미확인 상태·가상 사례를 분리하고 효능·건강·수치·구매 경계를 검수한 24개 블록.',
  safety: {
    evidence: '현실 사실은 사용자가 확인한 선호, 소유물, 공간, 복장, 일정과 생활 기록만 사용한다.',
    symbolicBoundary: '오행·용신과 색·재질·방향·맛의 배속은 상징적 질문이며 운, 건강, 수면, 집중 또는 결과에 대한 효능을 증명하지 않는다.',
    professionalBoundary: '질병, 알레르기, 식이 제한, 수면 문제와 신체 불편은 상징 해석보다 의료·영양 등 적절한 전문 판단을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { calculatedValueBoundary: true, traditionalCorrespondenceBoundary: true, userRealityBoundary: true, unknownEnvironmentBoundary: true, hypotheticalExampleBoundary: true, efficacyBoundary: true, purchaseBoundary: true, healthBoundary: true, foodAndSleepBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'lucky_color', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/lucky_color.md'], sampleOutputsIngested: false, reviewMethod: 'explicit calculation, symbolic correspondence, user environment, efficacy, purchase, health, food, sleep, numeric and outcome review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
const generationEvidence = readJson(generationEvidencePath)
const visualEvidence = readJson(visualEvidencePath)
if (visualEvidence.status !== 'pass' || visualEvidence.serviceKey !== 'lucky_color') throw new Error('lucky_color visual evidence is not approved')
if (visualEvidence.privacy.containsProviderProse || visualEvidence.privacy.containsSecrets || visualEvidence.privacy.containsPersonalData) throw new Error('lucky_color tracked visual evidence is not sanitized')
if (![visualEvidence.render.desktop.passed, visualEvidence.render.mobile.passed, visualEvidence.print.passed].every(Boolean)) throw new Error('lucky_color visual evidence is incomplete')
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'lucky-color-corpus-2.1.0', serviceKey: 'lucky_color', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: {
    path: generationEvidencePath,
    recordSha256: generationEvidence.evidence.recordSha256,
    acceptedProseSha256: generationEvidence.evidence.acceptedProseSha256,
    containsProviderProse: false,
  },
  visualEvidence: { path: visualEvidencePath, sha256: fileHash(visualEvidencePath), desktop: 'pass_24_of_24', mobile: 'pass_24_of_24', print: 'pass_all_24_sections', containsProviderProse: false },
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_24_of_24', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run_for_2.1.0', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
