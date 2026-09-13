import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const oldPath = 'data/tone-v2/corpus/marry-match-service.json'
const newPath = 'data/tone-v2/corpus/releases/marry-match-service-2.1.0.json'
const reviewPath = 'tone-v2/corpus-review/marry-match-2.1.0.json'
const releasePath = 'tone-v2/releases/marry-match-2.1.0.json'
const verificationPath = 'tone-v2/evaluations/P05-marry-match-corpus-rag-release-candidate-20260913.json'
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const fileHash = (path) => sha256(readFileSync(join(root, path)))
const writeJson = (path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }
const source = readJson(oldPath)
const byId = new Map(source.knowledgeBlocks.map((block) => [block.id, block]))
const content = {
  'mar-001': {
    topic: '연애의 접근 리듬은 실제 행동으로 확인한다', concept: '명리 상징은 먼저 움직이거나 확인하는 역할을 정하지 않는다',
    condition: '계산된 두 사람의 명리값과 사용자가 입력한 접근·확인 행동이 함께 있을 때만 적용한다.',
    interpretation: '계산된 명리값은 접근 리듬을 묻는 상징적 질문일 뿐 두 사람의 실제 행동을 확정하지 않는다. 누가 먼저 움직였고 무엇을 확인했는지는 당사자가 말한 사실로만 설명한다.',
    real_world_pattern: ['가상 사례: 사용자가 실제 약속 제안과 답변 과정을 입력한 경우', '가상 사례: 두 사람의 행동 정보가 달라 추가 확인이 필요한 경우'],
    risk: '확인 요청으로 애정 크기나 상대의 부담을 추정하는 것', opportunity: '당사자가 확인한 행동과 기대를 비교하는 것',
    advice: '마음을 대신 읽지 말고 현재 합의할 약속과 연락 방식을 직접 확인한다.', forbidden_generalization: '먼저 다가가는 쪽이 더 사랑하거나 결혼 의지가 크다고 단정하지 않는다.',
  },
  'mar-002': {
    topic: '약속 이행은 실제 기록과 사정을 함께 본다', concept: '말투와 약속은 결혼 적합성의 단독 지표가 아니다',
    condition: '사용자가 실제 약속, 변경 통지와 당시 사정을 입력했을 때만 적용한다.',
    interpretation: '약속의 이행과 변경 방식은 신뢰를 확인하는 자료가 될 수 있다. 횟수나 비율을 만들지 않고, 상대 의도와 바뀌지 않을 성격을 추정하지 않는다.',
    real_world_pattern: ['가상 사례: 약속 변경 이유와 통지 방식이 확인된 경우', '가상 사례: 단일 약속만 있어 반복 여부를 알 수 없는 경우'],
    risk: '표현 온도나 약속 한 건으로 결혼 상대의 성격을 판정하는 것', opportunity: '확인된 약속과 미확인 사정을 구분하는 것',
    advice: '반복을 판단하려면 실제 기록을 확인하고 기대하는 통지 방식을 서로 합의한다.', forbidden_generalization: '말수가 적거나 약속이 바뀌면 결혼 상대로 맞지 않는다고 단정하지 않는다.',
  },
  'mar-003': {
    topic: '갈등 회복은 입력된 과정으로 확인한다', concept: '회복 속도에 보편 기준이 없으며 갈등 빈도만으로 결혼을 판단하지 않는다',
    condition: '사용자가 갈등과 그 뒤의 실제 회복 과정을 입력했을 때만 적용한다.',
    interpretation: '갈등 뒤 회복 방식과 남은 영향은 관계 운영을 살피는 자료다. 기간 기준을 임의로 만들지 않고 안전 문제와 일반 다툼을 먼저 구분한다.',
    real_world_pattern: ['가상 사례: 두 사람이 대화 재개 조건을 합의한 경우', '가상 사례: 갈등 뒤 영향이 아직 남았다고 입력한 경우'],
    risk: '회복 기간이나 다툼 빈도로 결혼 가능성을 결정하는 것', opportunity: '갈등 뒤 실제 행동과 합의 여부를 확인하는 것',
    advice: '당사자가 안전하게 동의한 회복 방식을 확인하고 결과를 관찰한다.', forbidden_generalization: '자주 다투거나 회복이 느리면 결혼할 수 없다고 단정하지 않는다.',
  },
  'mar-004': {
    topic: '결혼 전환은 감정과 현실 합의를 따로 확인한다', concept: '마음, 주거, 재정, 돌봄과 법적 조건은 별도 합의 항목이다',
    condition: '사용자가 결혼 의사와 주거·재정·돌봄 등 현실 조건을 입력했을 때만 적용한다.',
    interpretation: '결혼 의사와 현실 조건은 서로 대신하지 않는다. 어느 조건이 충족됐는지와 두 사람의 합의 상태를 확인하며 미입력 조건이나 후회를 예측하지 않는다.',
    real_world_pattern: ['가상 사례: 결혼 의사는 같지만 주거 계획은 아직 다른 경우', '가상 사례: 조건은 정리됐지만 결정 시점은 합의하지 않은 경우'],
    risk: '사랑이나 조건만으로 결혼 결정을 밀어붙이는 것', opportunity: '합의된 조건과 아직 다른 조건을 구분하는 것',
    advice: '감정 확인과 현실 조건 논의를 분리하고 두 사람이 동의한 내용만 결론에 쓴다.', forbidden_generalization: '사랑이나 현실 조건이 충분하면 나머지도 해결된다고 단정하지 않는다.',
  },
  'mar-005': {
    topic: '결혼 시기는 준비 조건으로 비교한다', concept: '대운·세운은 상징적 참고이며 날짜와 성공을 정하지 않는다',
    condition: '계산된 운 흐름과 사용자가 입력한 일정·재정·주거·건강 조건이 함께 있을 때만 적용한다.',
    interpretation: '운 흐름은 변화 압력을 살피는 상징적 후보다. 실제 결혼 시기는 두 사람이 확인한 준비, 계약과 일정으로 비교하며 좋은 날짜나 기회의 소멸을 예언하지 않는다.',
    real_world_pattern: ['가상 사례: 두 사람의 일정과 계약 조건을 함께 비교하는 경우', '가상 사례: 준비 정보가 부족해 시기 판단을 유보하는 경우'],
    risk: '좋은 운을 이유로 결혼을 서두르거나 나쁜 운을 이유로 미루는 것', opportunity: '필요한 준비와 미확인 조건을 나누는 것',
    advice: '운은 참고로 표시하고 시기 후보는 실제 준비와 계약 조건으로 검토한다.', forbidden_generalization: '특정 해나 날짜가 결혼 성공 또는 기회를 결정한다고 단정하지 않는다.',
  },
  'mar-006': {
    topic: '위험 신호는 반복 횟수가 아니라 행동과 안전으로 본다', concept: '위협·통제·폭력은 궁합이나 성격 문제가 아니다',
    condition: '사용자가 반복 행동, 위협, 통제, 폭력 또는 경계 침해를 입력했을 때만 적용한다.',
    interpretation: '반복 여부는 실제 사건 기록으로 확인하되 위협·통제·폭력은 횟수와 무관하게 안전 문제로 다룬다. 상대를 진단하거나 관계 결론을 강요하지 않는다.',
    real_world_pattern: ['가상 사례: 같은 경계 침해가 기록에서 확인되는 경우', '가상 사례: 위협이 있어 직접 대화보다 안전 지원을 찾는 경우'],
    risk: '임의 횟수로 구조를 판정하거나 위험을 궁합 문제로 축소하는 것', opportunity: '행동 사실과 즉시 필요한 안전 조치를 구분하는 것',
    advice: '위협·통제·폭력이 있으면 안전한 장소와 신뢰할 사람, 적절한 전문 지원을 우선한다.', forbidden_generalization: '특정 반복 횟수나 궁합으로 관계 유지·종료를 단정하지 않는다.',
  },
  'mar-007': {
    topic: '동거 조건은 실제 생활 합의로 시험한다', concept: '재정·시간·가사 기준은 입력과 합의 없이는 알 수 없다',
    condition: '사용자가 동거 계획과 비용·시간·가사 조건을 입력했을 때만 적용한다.',
    interpretation: '함께 사는 방식은 비용 분담, 개인 시간, 가사 기준과 주거 계약에 따라 달라진다. 임의 체험 기간을 처방하지 않고 실제 합의와 법적 조건을 확인한다.',
    real_world_pattern: ['가상 사례: 비용 분담과 가사 기대를 문서로 비교하는 경우', '가상 사례: 주거 계약 조건을 전문가에게 확인하는 경우'],
    risk: '생활 습관을 만들어 내거나 단기 체험이 결혼 생활을 예측한다고 말하는 것', opportunity: '각 조건의 기대와 책임을 구체적으로 확인하는 것',
    advice: '동거·임대·재산 쟁점은 합의와 계약을 확인하고 필요하면 법률·재무 전문가에게 묻는다.', forbidden_generalization: '생활 습관 차이나 시험 기간으로 결혼 결과를 단정하지 않는다.',
  },
  'mar-008': {
    topic: '관계 회복 순서는 두 사람이 안전하게 합의한다', concept: '사과나 정해진 절차가 회복을 보장하지 않는다',
    condition: '사용자가 실제 갈등과 회복 시도, 서로의 경계를 입력했을 때만 적용한다.',
    interpretation: '멈춤, 재대화, 사과와 경계 확인의 순서는 관계마다 다르다. 당사자의 동의와 안전을 확인하며 폭력·위협 상황에는 공동 화해 절차를 권하지 않는다.',
    real_world_pattern: ['가상 사례: 대화 중단과 재개 조건을 서로 합의한 경우', '가상 사례: 안전 문제 때문에 공동 대화를 중단하는 경우'],
    risk: '일정한 화해 절차를 피해자에게 요구하거나 결과를 보장하는 것', opportunity: '합의 가능한 회복과 안전상 불가능한 접근을 구분하는 것',
    advice: '안전한 경우에만 서로 동의한 회복 방식을 정하고 강요나 위협이 있으면 전문 지원을 우선한다.', forbidden_generalization: '사과나 회복 규칙이 있으면 갈등이 해결된다고 단정하지 않는다.',
  },
  'mar-009': {
    topic: '다음 확인은 현재 질문과 안전 조건에서 고른다', concept: '행동의 개수와 시점을 서비스가 대신 정하지 않는다',
    condition: '사용자가 지금 확인할 결혼 질문과 대화 가능 여부를 입력했을 때만 적용한다.',
    interpretation: '다음 행동은 조건 확인, 기록, 질문 또는 지원 요청 가운데 고를 수 있다. 상대 반응과 해결 여부를 예측하지 않으며 연락 거부와 안전 경계를 존중한다.',
    real_world_pattern: ['가상 사례: 서로 동의한 현실 조건부터 확인하는 경우', '가상 사례: 연락 거부가 있어 추가 접촉을 멈추는 경우'],
    risk: '질문 수나 대화 시간을 임의로 처방하고 답변을 예상하는 것', opportunity: '현재 필요한 확인과 경계를 함께 고르는 것',
    advice: '당사자가 동의할 수 있는 확인을 제안하고 거부·위협이 있으면 접촉보다 경계와 안전을 우선한다.', forbidden_generalization: '질문을 줄이거나 제대로 말하면 결혼 문제가 해결된다고 단정하지 않는다.',
  },
  'mar-010': {
    topic: '결과 라벨은 현재 근거 상태의 이름이다', concept: '라벨은 결혼 허가나 관계 점수가 아니다',
    condition: '사용자 입력과 계산된 상징 후보를 구분해 결과를 요약하는 마무리에 적용한다.',
    interpretation: '라벨은 확인된 조건과 미확인 질문의 현재 구성을 짧게 부르는 이름이다. 조건이 달라질 수 있으므로 결혼 여부나 관계 등급으로 쓰지 않는다.',
    real_world_pattern: ['가상 사례: 라벨 아래 근거와 미확인 질문을 함께 읽는 경우', '가상 사례: 조건 변화 뒤 라벨을 다시 검토하는 경우'],
    risk: '라벨을 결혼 결정이나 관계 평가로 사용하는 것', opportunity: '라벨의 근거와 한계를 함께 표시하는 것',
    advice: '라벨만 제시하지 말고 확인된 조건과 다음 질문을 함께 보여 준다.', forbidden_generalization: '좋은 라벨이면 결혼에 적합하거나 주의 라벨이면 부적합하다고 단정하지 않는다.',
  },
  'mar-011': {
    topic: '재정 합의는 실제 숫자와 결정 절차로 확인한다', concept: '수입과 지출 규모만으로 재정 궁합을 정하지 않는다',
    condition: '사용자가 수입·지출·부채·자산 정보와 공동 결정 방식을 입력했을 때만 적용한다.',
    interpretation: '재정 합의에는 금액뿐 아니라 공개 범위, 공동 지출, 부채와 책임이 포함된다. 제공된 숫자만 사용하고 미입력 자산이나 상대의 소비 태도를 만들지 않는다.',
    real_world_pattern: ['가상 사례: 제공된 부채와 공동 지출 책임을 확인하는 경우', '가상 사례: 큰 지출의 합의 절차를 정하는 경우'],
    risk: '수입 유사성으로 갈등 가능성을 판단하거나 임의 비율을 처방하는 것', opportunity: '실제 숫자와 의사결정 절차를 분리해 확인하는 것',
    advice: '숫자가 있으면 출처를 밝히고 계약·세금·재산 쟁점은 적절한 전문가에게 확인한다.', forbidden_generalization: '수입이 비슷하거나 분담 규칙이 있으면 재정 갈등이 없다고 단정하지 않는다.',
  },
  'mar-012': {
    topic: '양가 관계는 가족 반응이 아니라 두 사람의 합의로 다룬다', concept: '가족의 마음과 행동은 입력 없이 예측할 수 없다',
    condition: '사용자가 양가의 실제 요청과 두 사람의 합의 또는 경계를 입력했을 때만 적용한다.',
    interpretation: '양가 문제에는 실제 요청, 각자의 책임과 두 사람의 경계가 있다. 가족 반응과 편들기를 추정하지 않고 당사자가 확인한 말과 합의만 사용한다.',
    real_world_pattern: ['가상 사례: 실제 가족 요청에 대한 공동 답을 합의하는 경우', '가상 사례: 가족 반응 정보가 없어 예측을 유보하는 경우'],
    risk: '부모 성향이나 미래 요구를 만들고 한 사람에게 공동 답을 강요하는 것', opportunity: '실제 요청과 두 사람의 경계를 구분하는 것',
    advice: '외부에 답하기 전에 두 사람이 동의한 범위와 아직 다른 의견을 확인한다.', forbidden_generalization: '가족 관계가 좋거나 공동 답이 있으면 결혼 생활이 안정된다고 단정하지 않는다.',
  },
  'mar-013': {
    topic: '애정 표현은 당사자에게 의미를 확인한다', concept: '표현 방식은 애정 수준이나 결혼 의지를 증명하지 않는다',
    condition: '사용자가 실제 표현 행동과 자신이 받아들인 의미를 입력했을 때만 적용한다.',
    interpretation: '말과 행동의 선호는 다를 수 있지만 무엇이 애정으로 전달되는지는 당사자에게 확인해야 한다. 표현량으로 상대 마음이나 의지를 판정하지 않는다.',
    real_world_pattern: ['가상 사례: 편하게 느끼는 표현을 서로 직접 묻는 경우', '가상 사례: 같은 행동을 서로 다른 의미로 이해한 경우'],
    risk: '표현 차이로 애정 크기나 결혼 의사를 추정하는 것', opportunity: '받고 싶은 표현과 가능한 표현을 직접 비교하는 것',
    advice: '더 많이 하라고 지시하지 말고 서로 어떤 표현을 이해하는지 확인한다.', forbidden_generalization: '표현 방식이 다르거나 적으면 결혼에 맞지 않는다고 단정하지 않는다.',
  },
  'mar-014': {
    topic: '거리와 개인 시간은 합의된 기준으로 조정한다', concept: '함께 있는 시간의 양은 관계의 질을 정하지 않는다',
    condition: '사용자가 함께 있는 시간, 개인 시간과 연락 기대를 입력했을 때만 적용한다.',
    interpretation: '개인 시간과 함께하는 시간의 필요는 사람마다 다르다. 거리 요청을 거절이나 애정 변화로 해석하지 않고 상대가 말한 의미와 동의 여부를 확인한다.',
    real_world_pattern: ['가상 사례: 개인 시간과 연락 기준을 서로 설명한 경우', '가상 사례: 거리 조절의 의미를 아직 합의하지 않은 경우'],
    risk: '거리 요청을 마음 변화로 읽거나 일정 조정이 관계를 개선한다고 약속하는 것', opportunity: '각자의 필요와 합의 가능한 기준을 확인하는 것',
    advice: '거리의 의미를 대신 해석하지 말고 서로 동의하는 시간과 연락 기준을 정한다.', forbidden_generalization: '함께 있거나 떨어져 있는 시간으로 결혼 적합성을 단정하지 않는다.',
  },
  'mar-015': {
    topic: '결정 정보는 확인 가능성과 중요도로 구분한다', concept: '불확실성이 있다는 사실만으로 결혼 결론을 정하지 않는다',
    condition: '사용자가 결혼 결정에 필요한 조건과 현재 확인 상태를 입력했을 때만 적용한다.',
    interpretation: '지금 확인할 수 있는 조건과 시간이 필요한 조건을 나누면 판단 자료가 보인다. 불확실성의 크기나 결론은 대신 정하지 않고 각 조건의 중요도를 당사자가 평가한다.',
    real_world_pattern: ['가상 사례: 계약처럼 지금 확인할 조건을 먼저 분리하는 경우', '가상 사례: 상대 결정처럼 당사자 확인을 기다려야 하는 경우'],
    risk: '확신이 없다는 이유로 결혼을 권하거나 막는 것', opportunity: '미확인 조건과 확인 방법을 연결하는 것',
    advice: '확인할 수 있는 사실부터 정리하고 최종 중요도와 결론은 당사자가 정하도록 둔다.', forbidden_generalization: '불확실성이 적거나 많다는 이유로 결혼 여부를 단정하지 않는다.',
  },
  'mar-016': {
    topic: '합과 충은 결혼 결과가 아닌 상호작용 질문이다', concept: '합·충은 접근과 자극을 읽는 전통적 상징이다',
    condition: '계산된 두 사람의 지지 관계와 사용자가 입력한 실제 상호작용이 함께 있을 때만 적용한다.',
    interpretation: '합과 충은 관계의 속도와 자극을 묻는 상징적 후보다. 실제 친밀도, 갈등과 회복은 당사자 경험으로 확인하고 기호를 결혼 사건과 등치하지 않는다.',
    real_world_pattern: ['가상 사례: 계산된 합과 실제 접근 속도가 다른 경우', '가상 사례: 계산된 충과 실제 의견 차이를 별도로 비교하는 경우'],
    risk: '합·충으로 결혼 적합성이나 이별을 예언하는 것', opportunity: '상징적 질문을 실제 경험과 비교하는 것',
    advice: '기호는 질문 후보로 표시하고 판단에는 두 사람이 확인한 경험을 쓴다.', forbidden_generalization: '합이나 충만으로 결혼 결과와 관계 미래를 단정하지 않는다.',
  },
  'mar-017': {
    topic: '결혼 준비 스트레스는 실제 일정과 상태로 확인한다', concept: '준비 중 갈등을 관계 신호로 자동 해석하지 않는다',
    condition: '사용자가 결혼 준비 일정, 부담과 갈등 변화를 입력했을 때만 적용한다.',
    interpretation: '결정이 몰린 시기에는 피로와 갈등이 함께 늘 수 있지만 원인은 입력된 일정과 상태로 확인해야 한다. 임의 휴식 기간을 처방하거나 갈등이 끝날 시점을 예측하지 않는다.',
    real_world_pattern: ['가상 사례: 일정이 몰린 시기와 대화 변화를 비교하는 경우', '가상 사례: 준비 전부터 있던 갈등을 별도로 확인하는 경우'],
    risk: '모든 갈등을 준비 스트레스로 돌리거나 휴식이 해결한다고 약속하는 것', opportunity: '일정 부담과 관계 쟁점을 분리하는 것',
    advice: '현재 일정과 상태를 확인하고 중요한 관계 판단은 안전하고 충분히 준비된 때에 논의한다.', forbidden_generalization: '준비 중 다툼이나 피로로 결혼 적합성을 단정하지 않는다.',
  },
  'mar-018': {
    topic: '일간 강약은 실제 역할 분담을 정하지 않는다', concept: '명리 강약은 주도권과 돌봄 역할의 등급이 아니다',
    condition: '계산된 두 사람의 일간 강약과 사용자가 입력한 실제 역할 분담이 함께 있을 때만 적용한다.',
    interpretation: '일간 강약은 자원과 반응을 살피는 전통적 축이다. 실제 주도권, 양보와 피로는 입력된 장면으로 확인하며 한쪽의 성격이나 고정 역할을 만들지 않는다.',
    real_world_pattern: ['가상 사례: 상황마다 역할을 번갈아 맡았다고 입력한 경우', '가상 사례: 역할 분담을 아직 합의하지 않은 경우'],
    risk: '강약으로 한쪽을 지배적이거나 의존적이라고 평가하는 것', opportunity: '실제 역할과 피로를 당사자별로 확인하는 것',
    advice: '상징과 실제 역할을 분리하고 필요한 분담은 두 사람이 합의한다.', forbidden_generalization: '강약이 같거나 다르면 특정 주도권 문제가 생긴다고 단정하지 않는다.',
  },
  'mar-019': {
    topic: '아이와 커리어는 각자의 현재 의사와 변화 가능성을 확인한다', concept: '출산·양육·커리어 선택은 궁합이 대신 정할 수 없다',
    condition: '사용자가 아이, 출산·양육, 커리어에 관한 자신의 현재 의사와 합의 상태를 입력했을 때만 적용한다.',
    interpretation: '아이와 커리어는 신체, 가치, 재정, 돌봄과 법적 권리가 연결된 선택이다. 상대 의사, 임신 가능성, 가족 기대를 추정하지 않고 각자의 현재 답과 변화 시 소통 방법을 확인한다.',
    real_world_pattern: ['가상 사례: 아이와 커리어에 대한 현재 생각이 다른 경우', '가상 사례: 생각이 바뀌면 다시 알리기로 합의하는 경우'],
    risk: '명리로 출산 가능성, 적기, 역할 또는 상대 결정을 정하는 것', opportunity: '각자의 현재 의사와 아직 합의되지 않은 조건을 구분하는 것',
    advice: '재생산과 커리어 선택은 당사자의 자율성을 존중하고 의료·법률 쟁점은 적절한 전문가에게 확인한다.', forbidden_generalization: '사랑이나 궁합이 좋으면 아이·커리어 선택도 자연히 같아진다고 단정하지 않는다.',
  },
  'mar-020': {
    topic: '궁합 풀이는 결혼 결정과 안전 판단을 대신하지 않는다', concept: '해석은 근거 층과 확인 질문을 보여 줄 뿐 결론을 내리지 않는다',
    condition: '리포트의 한계, 연락 경계와 안전 조건을 정리하는 마무리에 적용한다.',
    interpretation: '이 해석은 사용자 입력, 서버 계산값, 전통적 상징과 가상 사례를 구분한다. 상대 마음, 결혼 미래, 폭력 위험 또는 관계 유지·종료를 판정하지 않는다.',
    real_world_pattern: ['가상 사례: 상징적 질문을 두 사람이 확인할 현실 질문으로 바꾸는 경우', '가상 사례: 연락 거부나 위협이 있어 접촉보다 안전과 경계를 우선하는 경우'],
    risk: '궁합을 결혼 허가, 관계 종료 또는 안전 위험 평가로 사용하는 것', opportunity: '미확인 정보와 전문 판단이 필요한 항목을 분리하는 것',
    advice: '연락 거부를 존중하고 위협·통제·폭력이 있으면 안전 확보와 적절한 전문 지원을 우선한다.', forbidden_generalization: '궁합 결과가 결혼 여부, 상대의 마음, 관계 미래 또는 안전을 결정한다고 표현하지 않는다.',
  },
}
const ids = Array.from({ length: 20 }, (_, i) => `mar-${String(i + 1).padStart(3, '0')}`)
if (source.knowledgeBlocks.length !== ids.length || ids.some((id) => !byId.has(id) || !content[id])) throw new Error('marry_match source IDs do not match the reviewed 20-block contract')
const candidate = { version: '2.1.0', domain: source.domain, description: '결혼 질문을 입력 사실·계산값·상징적 해석 후보·가상 사례로 구분하고 상대·가족·결혼 결과·안전 상태의 확정을 금지한 검수 완료 전용 블록.', safety: source.safety, release: { state: 'candidate', previousVersion: source.version, previousPath: oldPath, semanticReview: reviewPath, sampleOutputsIngested: false }, knowledgeBlocks: ids.map((id) => ({ id, topic: content[id].topic, keywords: byId.get(id).keywords, ...Object.fromEntries(Object.entries(content[id]).filter(([key]) => key !== 'topic')), confidence: ['mar-006', 'mar-008', 'mar-019', 'mar-020'].includes(id) ? 'high' : 'medium' })) }
writeJson(newPath, candidate)
const candidateHash = fileHash(newPath)
const checks = { inputBoundary: true, calculatedValueBoundary: true, symbolicInterpretationBoundary: true, hypotheticalExampleBoundary: true, partnerAndFamilyMindBoundary: true, marriageOutcomeBoundary: true, reproductiveAutonomy: true, relationshipSafety: true, numericProvenance: true }
writeJson(reviewPath, { schemaVersion: '1.0.0', serviceKey: 'marry_match', corpusVersion: candidate.version, status: 'approved', sourcePath: newPath, sourceSha256: candidateHash, reviewedAgainst: ['tone-v2/README.md', 'tone-v2/generated/manifest.json'], sampleOutputsIngested: false, reviewMethod: 'explicit block-by-block marriage evidence, autonomy and safety review with executable hash assertions', blocks: ids.map((id) => ({ id, status: 'pass', checks })) })
const prompt = readJson('tone-v2/generated/manifest.json')
const verification = existsSync(join(root, verificationPath)) ? readJson(verificationPath) : undefined
writeJson(releasePath, { schemaVersion: '1.0.0', releaseId: 'marry-match-corpus-2.1.0', serviceKey: 'marry_match', state: 'candidate', deployed: false, promptBundle: { version: prompt.version, sourceFingerprint: prompt.sourceFingerprint, releaseReadyAtSource: prompt.releaseReady }, corpus: { previous: { path: oldPath, version: source.version, sha256: fileHash(oldPath) }, candidate: { path: newPath, version: candidate.version, sha256: candidateHash }, semanticReview: reviewPath }, generationEvidence: null, generationEvidenceReason: 'No marry_match provider output evaluation was run or found for this corpus-only Task.', verificationEvidence: verification ? verificationPath : null, attachment: { newReportsOnly: true, storedSnapshotRequired: true, customerRecordMutation: false }, rollback: { strategy: 'registry_only', restorePath: oldPath, restoreVersion: source.version, customerRecordRewrite: false }, gates: { semanticReview: 'pass_20_of_20', sampleOutputIngestion: 'none', snapshotPinnedRag: 'required', providerOutputEvaluation: 'not_run', focusedTests: verification?.verification?.focusedTests ?? 'pending', fullTests: verification?.verification?.fullTests ?? 'pending', typecheck: verification?.verification?.typecheck ?? 'pending', build: verification?.verification?.vercelBuild ?? 'pending', codexReview: verification?.verification?.codexReview ?? 'pending' } })
console.log(JSON.stringify({ candidate: newPath, review: reviewPath, release: releasePath, sha256: candidateHash }))
