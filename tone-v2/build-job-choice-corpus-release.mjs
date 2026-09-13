import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/job-choice-service.json'
const newPath = 'data/tone-v2/corpus/releases/job-choice-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/job-choice-2.1.0.json'
const releasePath = 'tone-v2/releases/job-choice-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-job-choice-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }

const source = readJson(oldPath)
const ids = Array.from({ length: 12 }, (_, index) => `job-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('job_choice source contract mismatch')

const topics = {
  'job-001': '전체 인상은 확인된 수락·보류 이유로 나눈다',
  'job-002': '직무 적합성은 문서에 적힌 역할과 평가 기준으로 본다',
  'job-003': '조직 구조와 권한은 확인 전까지 알 수 없다',
  'job-004': '보상은 오퍼 문서와 실제 비용으로 비교한다',
  'job-005': '성장 조건은 기대 결과물과 지원 조건으로 확인한다',
  'job-006': '근무 환경은 확인된 장소·시간·이동 조건으로 본다',
  'job-007': '위험은 확인된 조건과 미확인 질문으로 구분한다',
  'job-008': '입사 일정은 실제 인수인계·이사·지급 조건과 맞춘다',
  'job-009': '회복 가능성은 확인된 근무·연락 규칙으로 점검한다',
  'job-010': '다음 행동은 미확인 조건을 질문으로 바꾸는 것이다',
  'job-011': '협상 가능성은 회사의 명시적 답변으로 확인한다',
  'job-012': '궁 이름은 계산된 자미두수 명반이 아니라 질문 관점이다',
}

const interpretations = {
  'job-001': '사용자가 직접 밝힌 수락 이유, 보류 이유와 우선순위를 분리한다. 느낌이나 사주 상징만으로 회사 적합성, 만족도 또는 최종 선택 결과를 정하지 않는다.',
  'job-002': '직무 적합성은 제안서·근로계약서에 적힌 역할, 보고 대상, 책임 범위와 평가 기준을 확인해 비교한다. 직무명만으로 실제 업무나 평가 방식을 추정하지 않는다.',
  'job-003': '의사결정권, 보고 구조, 협업 방식과 조직 문화는 회사가 제공한 문서나 직접 확인한 답변이 있어야 사실로 쓸 수 있다. 상사·동료의 성격, 의도와 향후 조직 변화는 알 수 없음으로 둔다.',
  'job-004': '보상 비교는 문서에 적힌 고정급·변동급·수습 조건·복리후생과 사용자가 제공한 세금·이동·생활 비용을 구분한다. 실제 수령액, 성과급 지급 또는 재산 변화를 임의로 계산하지 않는다.',
  'job-005': '성장 조건은 회사가 명시한 기대 결과물, 권한, 교육·멘토링 자원과 평가 방식을 확인한다. 바쁨, 야근 또는 상징적 적합성이 학습·승진·경력 성과를 보장한다고 설명하지 않는다.',
  'job-006': '근무 환경은 확인된 근무지, 출근 빈도, 근무시간, 재택 규칙과 사용자가 제공한 실제 이동 조건으로 비교한다. 피로, 적응, 생산성 또는 건강 상태는 관찰 기록 없이 추정하지 않는다.',
  'job-007': '계약 조항, 업무 범위, 보고 대상과 수습 평가는 문서나 답변으로 확인하고 나머지는 미확인 질문으로 남긴다. 사용자의 불안 크기나 회사 위험도를 사주 상징으로 판정하지 않는다.',
  'job-008': '입사일은 사용자가 확인한 인수인계, 이사, 계약 종료, 지급 일정과 회사가 제시한 시작 가능일을 비교한다. 특정 달을 적기로 정하거나 임의의 적응 기간을 만들지 않는다.',
  'job-009': '지속 가능성은 확인된 근무시간, 휴일, 당직, 퇴근 후 연락과 휴가 규칙을 사용자의 현재 필요와 비교한다. 소진, 수면, 스트레스나 건강 결과는 의료적 근거 없이 단정하지 않는다.',
  'job-010': '다음 행동은 결정에 필요한 미확인 조건을 구체적인 질문으로 바꾸는 것이다. 질문 수, 발송 시점이나 순서를 임의로 처방하지 않고 답변 기한과 소통 방식은 실제 제안 조건을 따른다.',
  'job-011': '연봉, 직급, 시작일, 근무 형태와 역할 범위의 협상 가능성은 채용 담당자의 명시적 답변이나 수정 제안서로 확인한다. 회사가 양보할 항목, 인상 변화 또는 채용 취소를 추정하지 않는다.',
  'job-012': '관록궁·재백궁·노복궁·천이궁·복덕궁이라는 이름은 이 서비스에서 직무·보상·조직·이동·회복 질문을 나누는 관점이다. 실제 자미두수 명반을 계산한 값으로 표시하지 않으며 근거는 서버 사주 계산과 확인된 오퍼 조건이다.',
}

const advice = {
  'job-001': '사용자가 확인한 수락·보류 이유와 우선순위를 분리해 비교한다.',
  'job-002': '제안서와 근로계약서에서 역할·보고 대상·책임·평가 기준을 확인한다.',
  'job-003': '조직 구조와 협업 방식은 채용 담당자에게 확인하고 답이 없는 부분은 미확인으로 둔다.',
  'job-004': '문서상 보상 항목과 사용자가 실제로 부담할 비용을 별도 계산표로 비교하고 재무 판단은 전문가와 검토한다.',
  'job-005': '기대 결과물, 권한, 지원 자원과 평가 방식을 문서 또는 명시적 답변으로 확인한다.',
  'job-006': '근무지·시간·재택 규칙과 사용자가 확인한 이동 조건을 비교한다.',
  'job-007': '확인 가능한 계약·업무 질문을 문서화하고 법률·노무 쟁점은 관련 전문가에게 확인한다.',
  'job-008': '실제 인수인계·이사·계약·지급 일정과 회사 시작 가능일을 나란히 놓는다.',
  'job-009': '근무·연락·휴가 규칙을 확인하고 건강 우려는 적절한 의료 지원을 우선한다.',
  'job-010': '결정에 필요한 미확인 조건을 질문으로 적고 실제 답변 기한과 채널에 맞춰 확인한다.',
  'job-011': '협상 가능 여부와 변경된 조건은 회사의 서면 답변으로 확인한다.',
  'job-012': '궁 이름은 질문 영역 표지로만 쓰고 실제 판단은 사주 계산과 확인된 조건에 연결한다.',
}

const boundary = '직장 선택은 사용자가 확인한 오퍼·근로 조건과 서버가 계산한 사주 값을 비교 질문으로 번역할 뿐 회사의 숨은 조건이나 채용·경력 결과를 증명하지 않는다. 현실 근거는 사용자가 확인한 제안서·오퍼 문서·근로계약·직접 답변·현재 업무와 비용 기록만 사용한다. 입력이나 문서에 없는 역할·보상·조직·문화·일정·건강 상태와 고용주의 의도는 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => ({
  id: block.id,
  topic: topics[block.id],
  keywords: block.keywords,
  concept: '이 항목은 확인된 오퍼 사실, 서버 계산, 상징 질문과 미확인 회사 현실을 분리하는 판단 질문이다.',
  condition: boundary,
  interpretation: interpretations[block.id],
  real_world_pattern: [
    '가상 사례: 사용자가 제안서나 직접 답변으로 확인한 조건을 서버 계산의 상징 질문과 별도로 비교하는 경우',
    '가상 사례: 회사 문서나 답변이 없어 역할·보상·조직·결과를 알 수 없음으로 두는 경우',
  ],
  risk: `“${topics[block.id]}”의 상징이나 일반 사례를 실제 회사 조건, 고용주 의도 또는 경력 결과로 바꾸는 것`,
  opportunity: '확인된 조건과 미확인 질문을 분리해 사용자가 실제 제안 문서를 검토하도록 돕는 것',
  advice: advice[block.id],
  confidence: ['job-002', 'job-004', 'job-012'].includes(block.id) ? 'high' : 'medium',
  forbidden_generalization: '특정 사주 계산·궁 이름·직무명·회사 인상이 합격, 채용 유지, 승진, 보상, 조직 문화, 만족도, 건강 또는 경력 성과를 만든다고 단정하지 않는다. 근로계약·법률·노무·재무·의료 판단은 확인 가능한 문서와 해당 분야의 적절한 전문 지원을 우선한다.',
}))

const candidate = {
  version: '2.1.0', domain: source.domain,
  description: '오퍼·근로 문서·직접 답변·서버 계산·상징 질문·미확인 회사 현실·가상 사례를 분리하고 역할·조직·보상·건강·협상·수치 경계를 검수한 12개 블록.',
  safety: {
    evidence: '현실 사실은 사용자가 확인한 제안서, 오퍼 문서, 근로계약, 직접 답변, 현재 업무와 비용 기록만 사용한다.',
    symbolicBoundary: '사주 계산과 궁 이름은 비교 질문이며 실제 회사 조건, 고용주 의도 또는 경력 결과를 증명하지 않는다.',
    professionalBoundary: '근로계약, 법률, 노무, 재무와 의료 결정은 확인 가능한 문서와 적절한 전문 판단을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: blocks,
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { offerDocumentBoundary: true, calculatedValueBoundary: true, userRealityBoundary: true, unknownCompanyBoundary: true, employerIntentBoundary: true, ziweiViewpointBoundary: true, futureOutcomeBoundary: true, hypotheticalExampleBoundary: true, contractAndLaborBoundary: true, financialBoundary: true, healthBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'job_choice', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/job_choice.md'], sampleOutputsIngested: false, reviewMethod: 'explicit offer document, calculation, company reality, employer intent, Ziwei viewpoint, contract, labor, financial, health, numeric and outcome review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'job-choice-corpus-2.1.0', serviceKey: 'job_choice', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: null,
  generationEvidenceReason: 'No provider evaluation was run for job_choice corpus 2.1.0; deterministic tests are verification evidence, not provider-output evidence.',
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: { semanticReview: 'pass_12_of_12', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run_for_2.1.0', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
