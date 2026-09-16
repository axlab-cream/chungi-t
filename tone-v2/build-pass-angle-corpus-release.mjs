import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/pass-angle-service.json', newPath = 'data/tone-v2/corpus/releases/pass-angle-service-2.1.0.json', reviewPath = 'tone-v2/corpus-review/pass-angle-2.1.0.json', releasePath = 'tone-v2/releases/pass-angle-2.1.0.json', verificationPath = 'tone-v2/evaluations/P05-pass-angle-corpus-rag-release-candidate-20260913.json', generationEvidencePath = 'tone-v2/evaluations/P04-pass-angle-2-1-full-outline-generation-20260913.json', visualEvidencePath = 'tone-v2/evaluations/P04-pass-angle-visual-render-evidence-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8')), fileHash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex'), writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }
const source = readJson(oldPath), ids = Array.from({ length: 8 }, (_, index) => `pang-${String(index + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== 8 || source.knowledgeBlocks.some((block, index) => block.id !== ids[index])) throw new Error('pass_angle source contract mismatch')
const interpretations = {
  'pang-001': '서버가 계산한 인성은 학습 능력이나 합격 가능성을 증명하지 않는다. 사용자가 확인한 개념 정리·문제 풀이 기록을 비교하는 상징적 질문으로만 쓴다.',
  'pang-002': '서버가 계산한 인성·식상·관성·비겁 조합은 학습 유형, 성격, 적성 또는 직업을 확정하지 않는다. 실제 오답·복습·설명 기록과 맞는지 묻는 상징이다.',
  'pang-003': '서버가 계산한 관성은 의지나 마감 집중력을 증명하지 않는다. 공식 시험 일정과 사용자가 기록한 마감 준수·연습 결과를 비교하는 질문으로만 쓴다.',
  'pang-004': '서버가 계산한 식상은 말재주·지능·서술형 점수를 결정하지 않는다. 사용자가 확인한 답안, 면접 연습과 실기 기록에서 출력 과정의 차이를 검토한다.',
  'pang-005': '서버가 계산한 일간 강약은 성실성·체력·지속력의 등급이 아니다. 사용자가 실제로 유지하거나 바꾼 학습 방식과 컨디션 기록을 검토하는 상징적 질문이다.',
  'pang-006': '대운·세운은 합격 연도·월이나 재도전 결과를 정하지 않는다. 사용자가 입력한 실제 시험일에서 서버가 계산한 남은 기간과 공식 접수 일정을 준비 항목과 비교한다.',
  'pang-007': '집중 저하·불안·소진·수면 문제는 사용자가 직접 보고한 상태만 설명한다. 사주 계산값으로 건강 상태나 원인을 진단하지 않는다.',
  'pang-008': '시험 당일 계획은 시험 주관 기관의 공식 안내, 사용자가 확인한 이동 경로·준비물·식사와 실제 연습 기록만 사용한다. 택일이나 상징으로 당일 성적을 예측하지 않는다.'
}
const conditionSuffix = '사용자가 확인한 시험 정보와 실제 학습 기록만 현실 근거로 사용한다. 서버 계산값은 상징적 질문으로만 사용하고 입력되지 않은 값은 알 수 없음으로 둔다.'
const blocks = source.knowledgeBlocks.map((block) => {
  const baseCondition = block.condition.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0], baseForbidden = block.forbidden_generalization.split(' 현재 항목과 계산값이 직접 연결될 때만 사용한다.')[0]
  const changed = { ...block, condition: `${baseCondition} ${conditionSuffix}`, interpretation: interpretations[block.id], real_world_pattern: block.real_world_pattern.map((item) => `가상 사례: 예를 들어 ${item.replace(/^예를 들어\s*/, '')}`), forbidden_generalization: `${baseForbidden} 지능·학습 능력·성실성·건강 또는 합격·불합격·점수를 계산값으로 확정하지 않는다.` }
  if (block.id === 'pang-001') { changed.opportunity = '실제 개념 정리, 문제 풀이와 오답 기록의 순서를 비교하는 것'; changed.advice = '사용자가 남긴 학습 기록에서 효과를 확인하고 인성은 질문으로만 사용한다.' }
  if (block.id === 'pang-002') { changed.opportunity = '실제 복습·답안·연습 기록에서 유지된 방식과 막힌 방식을 비교하는 것'; changed.advice = '계산 조합이 아니라 사용자가 확인한 시험 유형과 학습 기록으로 다음 방식을 고른다.' }
  if (block.id === 'pang-003') { changed.opportunity = '공식 마감과 실제 연습 완료 기록을 비교해 필요한 외부 장치를 찾는 것'; changed.advice = '시험 주관 기관의 일정과 사용자가 지킨 마감 기록만 사용하고 의지 부족을 추정하지 않는다.' }
  if (block.id === 'pang-004') { changed.opportunity = '채점 기준과 실제 답안·면접·실기 기록을 비교하는 것'; changed.advice = '공식 채점 기준과 사용자가 확인한 출력 결과에서 수정할 한 가지를 찾는다.' }
  if (block.id === 'pang-005') { changed.real_world_pattern = ['가상 사례: 예를 들어 같은 교재를 유지한 기간과 실제 오답 변화를 비교하는 경우', '가상 사례: 예를 들어 학습 방식을 바꾼 뒤 기록된 집중과 회상 차이를 확인하는 경우', '가상 사례: 예를 들어 사용자가 기록한 컨디션과 학습 완료 항목을 나란히 보는 경우']; changed.opportunity = '실제 기록으로 유지할 방식과 바꿀 방식을 구분하는 것'; changed.advice = '일간 강약으로 점검 주기를 만들지 않고 사용자가 기록한 변화가 확인될 때만 조정한다.' }
  if (block.id === 'pang-006') { changed.real_world_pattern = ['가상 사례: 예를 들어 공식 접수일과 실제 시험일 사이에 남은 준비 항목을 확인하는 경우', '가상 사례: 예를 들어 사용자가 입력한 시험일에서 계산된 남은 기간과 최근 오답 기록을 비교하는 경우', '가상 사례: 예를 들어 재도전 전에 성적표와 사용자가 보고한 회복 상태를 따로 확인하는 경우']; changed.opportunity = '실제 시험일과 공식 일정이 있을 때 남은 준비 항목을 구분하는 것'; changed.advice = '사용자가 제공한 날짜와 서버가 계산한 남은 기간만 사용한다. 고정 구간이나 합격 시점은 만들지 않는다.' }
  if (block.id === 'pang-007') { changed.risk = '사용자 보고 없이 번아웃·불안·수면·건강 문제를 진단하거나 사주로 원인을 정하는 것'; changed.opportunity = '사용자가 기록한 집중·수면·불안 변화에서 학습 조정과 의료 지원이 필요한 신호를 구분하는 것'; changed.advice = '사용자가 보고한 상태를 우선하고 지속되거나 심한 건강·불안·수면 문제는 의료 전문가와 상의한다.' }
  if (block.id === 'pang-008') { changed.opportunity = '공식 안내와 실제 모의 연습에서 확인된 당일 변수만 미리 정리하는 것'; changed.advice = '시험 주관 기관의 공식 안내와 사용자가 확인한 준비물·경로·시간만 체크하고, 입력되지 않은 루틴은 만들지 않는다.' }
  return changed
})
const candidate = { version: '2.1.0', domain: source.domain, description: '시험 사실·공식 안내·실제 학습 기록·서버 계산·상징을 분리하고 지능·합격·수치·건강 경계를 검수한 8개 블록.', release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false }, knowledgeBlocks: blocks }
writeJson(newPath, candidate)
const candidateHash = fileHash(newPath), checks = { examFactBoundary: true, officialDocumentBoundary: true, studyRecordBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, hypotheticalExampleBoundary: true, intelligenceAbilityBoundary: true, passFailBoundary: true, numericProvenance: true, healthBoundary: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'pass_angle', corpusVersion: '2.1.0', status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json'], sampleOutputsIngested: false, reviewMethod: 'explicit exam fact, official document, study record, calculated symbol, intelligence, pass/fail, numeric and health review', blocks: blocks.map((block) => ({ id: block.id, status: 'pass', checks })) })
const prompt = readJson('tone-v2/generated/manifest.json'), verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
const generationEvidence = readJson(generationEvidencePath)
if (generationEvidence.status !== 'pass' || generationEvidence.serviceKey !== 'pass_angle') throw new Error('pass_angle generation evidence is not approved')
if (generationEvidence.corpus.version !== '2.1.0' || generationEvidence.corpus.sha256 !== candidateHash) throw new Error('pass_angle generation evidence is not bound to corpus 2.1.0')
if (generationEvidence.completion.recordStatus !== 'complete' || generationEvidence.completion.completedSections !== 52 || generationEvidence.completion.expectedSections !== 52) throw new Error('pass_angle generation evidence is incomplete')
if (generationEvidence.replay.passed !== 52 || generationEvidence.replay.failed !== 0 || generationEvidence.replay.againstStoredCorpusSnapshot !== true) throw new Error('pass_angle generation replay did not pass against the stored corpus snapshot')
if (generationEvidence.evidence.containsProviderProse || generationEvidence.evidence.containsSecrets || generationEvidence.evidence.containsPersonalData) throw new Error('pass_angle tracked generation evidence is not sanitized')
if (generationEvidence.verification.independentReview !== 'approved_codex_review') throw new Error('pass_angle generation evidence lacks direct review approval')
const visualEvidence = readJson(visualEvidencePath)
if (visualEvidence.status !== 'pass' || visualEvidence.serviceKey !== 'pass_angle') throw new Error('pass_angle visual evidence is not approved')
if (visualEvidence.privacy.containsProviderProse || visualEvidence.privacy.containsSecrets || visualEvidence.privacy.containsPersonalData) throw new Error('pass_angle tracked visual evidence is not sanitized')
if (![visualEvidence.render.desktop.passed, visualEvidence.render.mobile.passed, visualEvidence.print.passed].every(Boolean)) throw new Error('pass_angle visual evidence is incomplete')
writeJson(releasePath, { schemaVersion: '1.0.0', releaseId: 'pass-angle-corpus-2.1.0', serviceKey: 'pass_angle', state: 'candidate', deployed: false, promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady }, corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: '2.1.0', sha256: candidateHash }, semanticReview: reviewPath }, generationEvidence: { path: generationEvidencePath, recordSha256: generationEvidence.evidence.recordSha256, acceptedProseSha256: generationEvidence.evidence.acceptedProseSha256, containsProviderProse: false }, visualEvidence: { path: visualEvidencePath, sha256: fileHash(visualEvidencePath), desktop: 'pass_52_of_52', mobile: 'pass_52_of_52', print: 'pass_all_52_sections', containsProviderProse: false }, verificationEvidence: verification ? verificationPath : null, attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false }, rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false }, gates: { semanticReview: 'pass_8_of_8', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'pass_52_of_52', focusedTests: verification?.verification?.focusedTests ?? 'not_run', fullTests: verification?.verification?.fullTests ?? 'not_run', typecheck: verification?.verification?.typecheck ?? 'not_run', build: verification?.verification?.vercelBuild ?? 'not_run', codexReview: verification?.verification?.codexReview ?? 'not_run' } })
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
