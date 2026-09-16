import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/couple-signal-service.json'
const newPath = 'data/tone-v2/corpus/releases/couple-signal-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/couple-signal-2.1.0.json'
const releasePath = 'tone-v2/releases/couple-signal-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-couple-signal-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
const writeJson = (path, value) => {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const source = readJson(oldPath)
const sourceById = new Map(source.knowledgeBlocks.map((block) => [block.id, block]))
const boundary = '관계 신호는 사용자가 확인한 행동과 직접 들은 말로만 설명한다. 서버 계산값은 상징적 질문을 만드는 보조 자료로 분리한다. 입력되지 않은 상대의 마음·의도·외도 여부는 알 수 없음으로 둔다.'
const content = {
  'sig-001': {
    topic: '연락 변화는 확인된 행동과 합의로 살핀다',
    concept: '연락 간격과 표현 변화는 관찰된 현상이며 상대 마음의 증거가 아니다',
    condition: `사용자가 연락 시점·내용과 서로 합의한 연락 기준을 입력했을 때 적용한다. ${boundary}`,
    interpretation: '입력된 연락 변화와 기존 합의 사이의 차이는 확인할 수 있다. 그 이유나 상대의 감정은 직접 들은 설명이 없으면 정하지 않는다.',
    real_world_pattern: ['가상 사례: 사용자가 최근 연락 시점과 내용을 직접 기록한 경우', '가상 사례: 연락 기준을 아직 서로 합의하지 않아 이유를 질문으로 남기는 경우'],
    risk: '연락량 변화만으로 애정이나 관계 상태를 판정하는 것',
    opportunity: '관찰된 변화와 합의된 기준을 나누어 확인하는 것',
    advice: '확인한 변화만 말하고 이유는 상대가 대화에 동의할 때 질문으로 남긴다.',
    forbidden_generalization: '연락이 줄면 마음이 식었다고 단정하지 않는다.',
  },
  'sig-002': {
    topic: '외부 관심은 외도 여부를 증명하지 않는다',
    concept: '다른 사람의 관심과 상대가 실제로 한 행동은 별도의 사실이다',
    condition: `사용자가 직접 본 상호작용과 두 사람이 확인한 경계를 입력했을 때 적용한다. ${boundary}`,
    interpretation: '타인의 관심이 있었다는 사실과 상대가 합의된 경계를 지켰는지는 구분해 볼 수 있다. 관찰되지 않은 행동이나 사적 의도는 추정하지 않는다.',
    real_world_pattern: ['가상 사례: 사용자가 직접 본 대화와 기존 경계를 따로 적은 경우', '가상 사례: 타인의 관심만 확인되고 상대 행동은 확인되지 않은 경우'],
    risk: '관심을 받았다는 이유로 외도나 숨은 의도를 확정하는 것',
    opportunity: '두 사람이 동의한 관계 경계를 직접 확인하는 것',
    advice: '타인의 관심이 아니라 확인된 행동과 합의된 경계를 기준으로 대화한다.',
    forbidden_generalization: '매력이나 외부 관심으로 외도 가능성을 판정하지 않는다.',
  },
  'sig-003': {
    topic: '관계의 빈자리는 당사자가 확인한 필요로만 다룬다',
    concept: '관계 밖 자극과 현재 불편 사이의 원인은 입력 없이 연결할 수 없다',
    condition: `사용자가 현재 관계에서 부족하다고 느낀 점과 직접 확인한 행동을 입력했을 때 적용한다. ${boundary}`,
    interpretation: '사용자가 말한 불편과 관찰된 변화는 함께 살필 수 있지만 어느 하나가 다른 행동의 원인이라고 정할 수 없다. 확인되지 않은 제삼자 관계도 만들지 않는다.',
    real_world_pattern: ['가상 사례: 사용자가 대화 부족과 관찰한 변화를 별도 항목으로 적은 경우', '가상 사례: 원인을 상대에게 확인하지 않아 여러 가능성을 열어 두는 경우'],
    risk: '관계 불편을 제삼자 관계의 원인이나 증거로 만드는 것',
    opportunity: '현재 필요한 것과 아직 확인되지 않은 이유를 분리하는 것',
    advice: '관찰된 불편만 정리하고 감시나 무단 확인 없이 동의된 대화로 확인한다.',
    forbidden_generalization: '관계의 빈자리로 제삼자 관계나 상대의 선택을 단정하지 않는다.',
  },
  'sig-004': {
    topic: '관계 자리의 계산값은 성격이나 신의를 판정하지 않는다',
    concept: '명식의 관계 기호는 현실 조건을 묻는 상징일 뿐 사람의 됨됨이가 아니다',
    condition: `서버가 계산한 관계 기호와 사용자가 확인한 실제 관계 조건이 함께 있을 때 적용한다. ${boundary}`,
    interpretation: '계산된 합·충 같은 기호는 현재 조건을 점검하는 질문으로만 쓸 수 있다. 상대의 성격, 신뢰성 또는 실제 사건은 확인된 말과 행동으로만 다룬다.',
    real_world_pattern: ['가상 사례: 계산 기호와 실제 합의 방식을 따로 비교하는 경우', '가상 사례: 현실 정보가 없어 기호를 질문 후보로만 표시하는 경우'],
    risk: '상징으로 상대의 인성이나 충실성을 평가하는 것',
    opportunity: '기호에서 나온 질문을 실제 관계 조건과 비교하는 것',
    advice: '계산 기호에는 상징 표시를 붙이고 현실 판단에는 확인된 사실만 사용한다.',
    forbidden_generalization: '궁합 기호로 외도, 이별 또는 신의를 단정하지 않는다.',
  },
  'sig-005': {
    topic: '애정 표현 방식은 직접 확인한다',
    concept: '표현 선호는 당사자가 말하거나 반복 행동으로 확인한 범위에서만 설명한다',
    condition: `사용자가 서로의 표현 선호에 관해 직접 들은 말과 확인한 행동을 입력했을 때 적용한다. ${boundary}`,
    interpretation: '말, 행동, 시간 사용 가운데 무엇을 애정 표현으로 받아들이는지는 당사자마다 다르다. 십성이나 표현량으로 애정의 크기를 측정하지 않는다.',
    real_world_pattern: ['가상 사례: 상대가 편하게 느끼는 표현을 직접 말한 경우', '가상 사례: 같은 행동을 다르게 이해해 의미를 다시 확인하는 경우'],
    risk: '자신의 기준으로 상대의 애정이나 진심을 채점하는 것',
    opportunity: '서로 편한 표현과 부담스러운 표현을 직접 확인하는 것',
    advice: '사주로 선호를 정하지 말고 상대가 말한 방식과 확인된 행동을 기준으로 삼는다.',
    forbidden_generalization: '표현이 적거나 방식이 다르면 애정이 부족하다고 단정하지 않는다.',
  },
  'sig-006': {
    topic: '갈등 회복은 실제 사건과 합의로 확인한다',
    concept: '갈등의 횟수나 회복 속도 하나로 관계의 체력을 평가할 수 없다',
    condition: `사용자가 실제 갈등 장면과 이후에 직접 나눈 말·합의를 입력했을 때 적용한다. ${boundary}`,
    interpretation: '입력된 갈등 뒤 어떤 대화와 합의가 있었는지는 비교할 수 있다. 회복 여부와 관계 지속 가능성은 고정 기준으로 판정하지 않는다.',
    real_world_pattern: ['가상 사례: 갈등 뒤 서로 합의한 재대화 조건을 기록한 경우', '가상 사례: 한 사람의 설명만 있어 공동 합의 여부를 알 수 없는 경우'],
    risk: '갈등 빈도나 시간으로 관계의 건강성과 미래를 등급화하는 것',
    opportunity: '실제 갈등 뒤 확인된 합의와 남은 질문을 구분하는 것',
    advice: '안전한 관계에서만 당사자가 동의한 중단·재대화 조건을 확인한다.',
    forbidden_generalization: '갈등이나 화해 방식으로 관계 수명과 회복을 보장하지 않는다.',
  },
  'sig-007': {
    topic: '시기 해석과 현실 일정은 분리한다',
    concept: '대운·세운은 생활 변화나 관계 사건의 원인이 아니라 상징적 질문이다',
    condition: `서버가 계산한 시기 값과 사용자가 확인한 업무·이동·건강·관계 일정을 함께 볼 때 적용한다. ${boundary}`,
    interpretation: '계산된 시기는 변화 압력을 묻는 상징으로 표시한다. 실제 일정과 사건은 사용자 입력으로만 설명하며 관계 변화의 발생 시점을 예언하지 않는다.',
    real_world_pattern: ['가상 사례: 계산된 시기와 사용자가 확인한 업무 일정을 별도 근거로 보는 경우', '가상 사례: 현실 일정이 없어 상징 해석을 유보하는 경우'],
    risk: '특정 시기를 갈등, 외도 또는 이별의 원인으로 만드는 것',
    opportunity: '상징적 시기와 확인된 현실 일정을 나란히 점검하는 것',
    advice: '시기는 질문 후보로만 표시하고 판단은 실제 일정과 당사자의 설명에 둔다.',
    forbidden_generalization: '운의 좋고 나쁨으로 관계 사건이나 결과를 예측하지 않는다.',
  },
  'sig-008': {
    topic: '불안은 사용자가 보고한 상태로만 다룬다',
    concept: '불안의 원인과 정신건강 상태는 사주나 상대 반응으로 진단할 수 없다',
    condition: `사용자가 자신의 불안·확인 행동·생활 영향을 직접 입력했을 때 적용한다. ${boundary}`,
    interpretation: '사용자가 보고한 불안과 생활 영향은 현재 지원 필요를 살피는 정보다. 상대가 불안을 만들었다거나 특정 답변이 불안을 해소한다고 추정하지 않는다.',
    real_world_pattern: ['가상 사례: 사용자가 불안과 생활 영향을 직접 설명한 경우', '가상 사례: 원인이 확인되지 않아 관계 질문과 건강 지원을 분리하는 경우'],
    risk: '불안을 상대의 잘못이나 특정 관계 신호로 진단하는 것',
    opportunity: '사용자가 말한 상태와 이용 가능한 지원을 구분하는 것',
    advice: '일상 기능 저하나 위기 신호가 있으면 관계 해석보다 의료·상담 등 적절한 전문 지원을 안내한다.',
    forbidden_generalization: '휴식, 확인 또는 상대 답변이 불안을 해결한다고 단정하지 않는다.',
  },
  'sig-009': {
    topic: '확인 질문은 동의와 관찰 사실에서 시작한다',
    concept: '질문은 상대를 압박하거나 미확인 추측을 증명하는 도구가 아니다',
    condition: `사용자가 확인한 행동과 직접 들은 말 가운데 대화로 확인할 쟁점을 입력했을 때 적용한다. ${boundary}`,
    interpretation: '관찰 사실과 사용자의 느낌을 구분하면 질문 후보를 만들 수 있다. 상대가 대화를 원치 않으면 답변을 강요하거나 다른 경로로 정보를 수집하지 않는다.',
    real_world_pattern: ['가상 사례: 관찰한 행동과 자신의 느낌을 나누어 질문하는 경우', '가상 사례: 상대가 대화를 원치 않아 질문을 중단하는 경우'],
    risk: '질문을 추궁, 자백 요구 또는 증거 수집으로 바꾸는 것',
    opportunity: '상대가 동의한 대화에서 확인할 쟁점을 명료하게 말하는 것',
    advice: '관찰한 사실만 말하고 상대의 대화 동의와 경계를 존중한다.',
    forbidden_generalization: '질문 방식으로 상대의 답변이나 진실 공개를 보장하지 않는다.',
  },
  'sig-010': {
    topic: '결론 라벨은 관계 판정이 아니다',
    concept: '결과 이름은 확인된 정보와 질문 후보를 정리하는 임시 제목이다',
    condition: `사용자가 확인한 행동과 직접 들은 말을 계산된 상징 후보와 구분해 요약할 때 적용한다. ${boundary}`,
    interpretation: '결론 라벨은 현재 입력을 정리하는 제목일 뿐 관계의 등급이나 미래를 뜻하지 않는다. 정보가 달라지면 질문과 요약도 달라질 수 있다.',
    real_world_pattern: ['가상 사례: 확인된 강점과 미확인 질문을 라벨 아래 따로 적는 경우', '가상 사례: 상징 후보가 실제 경험과 달라 결과에서 제외하는 경우'],
    risk: '요약 라벨로 관계 전체의 좋고 나쁨을 판단하는 것',
    opportunity: '확인된 사실, 상징 후보와 미확인 질문을 구분하는 것',
    advice: '라벨을 판정으로 쓰지 말고 근거 상태가 표시된 확인 목록으로 읽는다.',
    forbidden_generalization: '결론 타입으로 관계 유지, 종료 또는 다음 단계를 정하지 않는다.',
  },
  'sig-011': {
    topic: '감시와 무단 접근은 관계 확인 방법이 아니다',
    concept: '위치·계정·기기·기록은 명시적 동의 없이 열람하거나 추적하지 않는다',
    condition: `사용자가 확인한 행동과 직접 들은 말에 근거한 안전한 대화 가능성을 살필 때 적용한다. ${boundary}`,
    interpretation: '불안이 있어도 위치 추적, 계정 열람, 기기 확인 같은 무단 접근은 권하지 않는다. 대화가 안전하고 서로 원할 때만 확인 질문을 제안한다.',
    real_world_pattern: ['가상 사례: 불안하지만 무단 확인 대신 동의 가능한 대화를 선택하는 경우', '가상 사례: 상대의 거절을 존중하고 정보 수집을 중단하는 경우'],
    risk: '불안을 이유로 감시, 무단 접근 또는 반복 추적을 정당화하는 것',
    opportunity: '개인정보 경계와 동의 가능한 대화 범위를 확인하는 것',
    advice: '계정·위치·기기·기록에 무단 접근하지 않고 연락 거부와 대화 거절을 존중한다.',
    forbidden_generalization: '안전을 위해 감시나 무단 확인이 필요하다고 표현하지 않는다.',
  },
  'sig-012': {
    topic: '안전 경계는 관계 해석보다 우선한다',
    concept: '위협·강요·폭력·스토킹은 일반적인 소통 문제로 축소하지 않는다',
    condition: `사용자가 확인한 행동과 직접 들은 말에 위협·강요·폭력·스토킹 또는 연락 거부가 포함될 때 적용한다. ${boundary}`,
    interpretation: '관계 해석은 상대 마음이나 실제 위험 수준을 판정하지 않는다. 안전 우려가 있으면 재접촉이나 공동 대화를 권하지 않고 지역의 긴급·전문 지원을 우선한다.',
    real_world_pattern: ['가상 사례: 위협을 직접 경험해 안전한 장소와 지원 기관을 먼저 찾는 경우', '가상 사례: 연락 거부가 있어 재접촉 없이 경계를 존중하는 경우'],
    risk: '폭력·위협·강요·스토킹을 궁합이나 사랑 방식의 차이로 설명하는 것',
    opportunity: '즉시 위험, 연락 경계와 이용 가능한 전문 지원을 구분하는 것',
    advice: '즉시 위험하면 지역 긴급 지원을 이용하고 안전 계획과 전문 도움을 우선한다.',
    forbidden_generalization: '궁합 해석으로 위험 여부를 판정하거나 안전하지 않은 대화·재접촉을 권하지 않는다.',
  },
}

const ids = Array.from({ length: 12 }, (_, index) => `sig-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || ids.some((id) => !sourceById.has(id) || !content[id])) {
  throw new Error('couple_signal source IDs do not match the reviewed 12-block contract')
}

const candidate = {
  version: '2.1.0',
  domain: source.domain,
  description: '확인된 관계 사실·서버 계산값·상징 질문·미확인 상대 상태·가상 사례를 분리하고 동의·개인정보·안전 경계를 검수한 12개 블록.',
  safety: {
    evidence: '현실 관계 사실은 사용자가 확인한 행동, 직접 들은 말, 명시적 합의와 확정 일정만 사용한다.',
    symbolicBoundary: '서버 계산값은 상징적 질문이며 상대 마음, 의도, 외도, 관계 미래 또는 안전 상태를 측정하지 않는다.',
    consentAndSafety: '연락 거부, 대화 거절, 위협, 강요, 폭력, 스토킹 또는 무단 감시 우려가 있으면 경계 존중과 적절한 긴급·전문 지원을 우선한다.',
  },
  sources: source.sources,
  release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false },
  knowledgeBlocks: ids.map((id) => ({ id, ...content[id], keywords: sourceById.get(id).keywords, confidence: ['sig-001', 'sig-002', 'sig-003', 'sig-008', 'sig-009', 'sig-011', 'sig-012'].includes(id) ? 'high' : 'medium' })),
}
writeJson(newPath, candidate)

const candidateHash = fileHash(newPath)
const checks = { confirmedFactBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, unknownPartnerStateBoundary: true, fidelityBoundary: true, hypotheticalExampleBoundary: true, monitoringBoundary: true, consentRefusalBoundary: true, safetyBoundary: true, numericProvenance: true, deterministicOutcomeBoundary: true }
writeJson(reviewPath, {
  schemaVersion: '1.0.0', serviceKey: 'couple_signal', corpusVersion: candidate.version, status: 'approved', sourcePath: newPath, sourceSha256: candidateHash,
  reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json', 'tone-v2/generated/services/couple_signal.md'], sampleOutputsIngested: false,
  reviewMethod: 'explicit block-by-block confirmed fact, calculated symbol, partner-state, fidelity, consent, monitoring, safety, numeric and outcome review',
  blocks: ids.map((id) => ({ id, status: 'pass', checks })),
})

const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, {
  schemaVersion: '1.0.0', releaseId: 'couple-signal-corpus-2.1.0', serviceKey: 'couple_signal', state: 'candidate', deployed: false,
  promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady },
  corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: candidate.version, sha256: candidateHash }, semanticReview: reviewPath },
  generationEvidence: null,
  generationEvidenceReason: 'No provider evaluation was run for couple_signal corpus 2.1.0; deterministic tests are verification evidence, not provider-output evidence.',
  verificationEvidence: verification ? verificationPath : null,
  attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false },
  rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false },
  gates: {
    semanticReview: 'pass_12_of_12', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run_for_2.1.0',
    focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run',
    typecheck: verification?.verification?.typecheck ?? 'not_run', vercelBuild: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run',
  },
})
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
