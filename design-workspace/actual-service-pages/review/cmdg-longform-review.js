/* 격리된 디자인 검토본: 운영 해석 원문 전문을 펼친 본문에 유지하고 편집 요소를 덧붙인다. */
(() => {
  'use strict';

  const cards = [
    {
      title: '타고난 강점을 쓰는 법',
      lead: '기준을 세우는 힘이 강합니다. 그 기준을 말과 결과로도 보여 주세요.',
      evidence: '리포트에는 나무 기운 5, 불 기운 0으로 표시되어 있습니다. 이는 성격 점수나 미래의 결과가 아니라 전통 해석에 사용된 계산값입니다.',
      focus: '나무 기운 5, 불 기운 0',
      action: '새 요청을 받으면 맡을 범위와 조정할 범위를 한 문장씩 적어 보세요.',
      visual: { type: 'facts', caption: '리포트에 표시된 핵심 계산값', items: [['나무', '5', '계산에 나타난 횟수'], ['불', '0', '계산에 나타난 횟수'], ['충돌 표시', '2', '전통 해석상 표시된 곳']] },
    },
    {
      title: '힘들 때 버티는 방식',
      lead: '더 버티기 전에 마감과 내 책임을 먼저 확인해 보세요.',
      evidence: '자료가 모자라서 답을 미루는 일과, 이미 확인했는데도 결론을 미루는 일은 다릅니다. 먼저 필요한 정보가 남았는지 살펴야 합니다.',
      focus: '필요한 정보가 남았는지',
      action: '요청 하나를 골라 마감과 담당 범위를 적고, 추가 질문이 필요한지만 결정해 보세요.',
      visual: { type: 'columns', caption: '요청을 받은 뒤 나눠 볼 두 가지', items: [['더 확인할 일', '마감이나 담당 범위가 비어 있음'], ['답해도 될 일', '조건을 확인했고 내가 맡을 범위가 분명함']] },
    },
    {
      title: '선택할 때 드러나는 기준',
      lead: '상대에게 맞추는 행동과 내가 지킬 기준을 함께 살펴보세요.',
      evidence: '겉으로 부드럽게 응답해도 약속의 범위를 마음속에서 다시 조정할 수 있습니다. 이는 고정된 성격 판정이 아니라 선택을 점검하는 관점입니다.',
      focus: '고정된 성격 판정이 아니라',
      action: '겹친 약속 중 하나를 골라 받아들일 일과 거절할 일을 구분해 보세요.',
      visual: { type: 'columns', caption: '약속이 겹칠 때', items: [['겉으로 보이는 행동', '상대의 요청을 바로 받아들임'], ['내가 지킬 기준', '가능한 시간과 맡을 범위를 먼저 밝힘']] },
    },
    {
      title: '내 힘이 집중되는 곳',
      lead: '먼저 살피고, 그다음 확인한 내용을 표현해 보세요.',
      evidence: '리포트의 나무 5·불 0은 한쪽에 힘이 모인 계산 표시입니다. 이를 실제 행동으로 옮기면 정보를 살핀 다음 말이나 결과물로 정리하는 순서입니다.',
      focus: '나무 5·불 0',
      action: '지금 맡은 일의 조건을 확인한 뒤, 처리 순서를 짧은 답변으로 보내 보세요.',
      visual: { type: 'steps', caption: '계산값은 리포트 표시값이며 운세 점수가 아닙니다', items: [['1', '살피기', '자료와 마감 확인'], ['2', '표현하기', '맡을 일과 처리 순서 전달']] },
    },
    {
      title: '내 힘을 살리는 방법',
      lead: '자료를 모은 뒤에는 결론을 한 문장으로 말해 보세요.',
      evidence: '전통 해석에서 물은 살피고 생각을 잇는 상징, 불은 확인한 내용을 밖으로 드러내는 상징으로 읽습니다. 어느 쪽도 실제 결과를 보장하지 않습니다.',
      focus: '실제 결과를 보장하지 않습니다',
      action: '비교 중인 선택 하나의 기준을 정하고, 그 기준에 따른 결론을 말해 보세요.',
      visual: { type: 'steps', caption: '상징을 일상적인 선택 순서로 옮긴 예', items: [['1', '살피기', '필요한 정보 찾기'], ['2', '말하기', '확인한 결론 전달하기']] },
    },
    {
      title: '고민이 겹칠 때 먼저 할 일',
      lead: '제안에 빠진 조건부터 찾아보세요.',
      evidence: '기회처럼 보여도 맡을 일, 받을 대가, 끝낼 시점이 흐리면 판단할 자료가 부족합니다. 상대의 의도보다 제안의 구체적인 조건을 살피는 편이 안전합니다.',
      focus: '판단할 자료가 부족합니다',
      action: '새 제안 한 건에서 비어 있는 조건을 질문으로 바꿔 보내 보세요.',
      visual: { type: 'check', caption: '제안받은 일을 살필 때', items: ['내 책임 범위', '받을 대가', '마감 또는 결정 시점'] },
    },
    {
      title: '일과 돈을 함께 살피는 법',
      lead: '새 일을 맡기 전, 업무 범위와 보상 조건을 함께 확인해 보세요.',
      evidence: '일을 맡는다는 말과 그 일의 대가가 서로 다른 곳에 적혀 있다면 오해가 생기기 쉽습니다. 실제 금액이나 수입의 변화를 이 리포트가 보장하지는 않습니다.',
      focus: '실제 금액이나 수입의 변화를 이 리포트가 보장하지는 않습니다',
      action: '구두로 들은 조건과 문서에 적힌 조건이 같은지 맞춰 보세요.',
      context: 'offer',
      visual: { type: 'table', caption: '제안의 역할·보상·마감을 한 문장으로 확인하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['제안 조건', '추가 정보 입력 전']], context: 'offer', contextBindings: [[null, 'condition']] },
    },
    {
      title: '지금 일, 계속할까 옮길까',
      lead: '옮길지 정하기 전에 현재 자리와 새 선택의 조건을 비교해 보세요.',
      evidence: '현재 직장의 역할·평가·보상·소진 정도는 이 리포트에 입력되어 있지 않습니다. 그래서 유지나 이직을 단정할 근거는 없습니다.',
      focus: '유지나 이직을 단정할 근거는 없습니다',
      action: '두 선택의 조건을 같은 항목으로 적고, 빈칸을 담당자에게 물어보세요.',
      context: 'workDecision',
      visual: { type: 'table', caption: '현재 자리와 새 선택을 두 문장으로 비교하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['현재 자리', '추가 정보 입력 전'], ['새 선택', '추가 정보 입력 전']], context: 'workDecision', contextBindings: [[null, 'current'], [null, 'new']] },
    },
    {
      title: '일의 대가를 받을 때 살필 점',
      lead: '맡을 일과 그 대가를 문서에서 함께 확인해 보세요.',
      evidence: '리포트는 바깥에서 들어온 제안을 실제 결과와 보상으로 연결하는 조건을 살피라고 읽습니다. 새로운 수입이 생긴다는 예측은 아닙니다.',
      focus: '새로운 수입이 생긴다는 예측은 아닙니다',
      action: '받은 제안서에 결과물과 대가가 둘 다 적혀 있는지 확인해 보세요.',
      context: 'offer',
      visual: { type: 'steps', caption: '제안 수락 전 확인 순서', items: [['1', '제안', '누가 어떤 일을 요청했나요?'], ['2', '결과물', '무엇을 완성해야 하나요?'], ['3', '대가', '지급 조건은 무엇인가요?']] },
    },
    {
      title: '관계에서 반복하는 선택',
      lead: '약속하기 전에 내 부담도 말해 보세요.',
      evidence: '상대의 마음을 짐작하는 것보다 약속의 시간과 분담이 실제로 어떻게 정해졌는지 보는 편이 분명합니다. 관계의 결과를 미리 정하는 해석은 아닙니다.',
      focus: '관계의 결과를 미리 정하는 해석은 아닙니다',
      action: '다음 약속에서 내가 부담스러운 조건 한 가지를 먼저 말해 보세요.',
      context: 'relationship',
      visual: { type: 'table', caption: '약속·부담·조정할 말을 한 문장으로 정리하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['관계의 조건', '추가 정보 입력 전']], context: 'relationship', contextBindings: [[null, 'condition']] },
    },
    {
      title: '나에게 편안한 관계',
      lead: '끌림만큼 약속이 지켜지는지도 살펴보세요.',
      evidence: '특정한 사람의 성격을 사주로 예측할 수는 없습니다. 여기서는 말이 통하는지, 일정과 책임을 분명히 하는지처럼 확인 가능한 행동을 기준으로 삼습니다.',
      focus: '확인 가능한 행동',
      action: '최근 만남 하나를 떠올리며 아래 질문에 실제 있었던 일로 답해 보세요.',
      context: 'relationship',
      visual: { type: 'check', caption: '관계를 살필 질문', items: ['약속한 시간을 지켰나요?', '변경 사항을 미리 말했나요?', '부담을 함께 조정할 수 있었나요?'] },
    },
    {
      title: '거리를 조절할 때 살필 행동',
      lead: '첫인상보다 반복해서 나타난 행동을 기준으로 삼아 보세요.',
      evidence: '누군가를 “피해야 할 사람”으로 분류하는 해석은 아닙니다. 약속과 책임이 계속 흐려지는 상황에서 내가 정할 경계를 살피는 제안입니다.',
      focus: '누군가를 “피해야 할 사람”으로 분류하는 해석은 아닙니다',
      action: '반복된 요청 하나에 대해 내가 할 수 있는 범위를 분명히 말해 보세요.',
      context: 'relationship',
      visual: { type: 'table', caption: '사람의 등급이 아닌 행동 기준', headers: ['반복된 행동', '내 경계', '다음 대응'], rows: [['역할이 계속 바뀜', '맡을 범위 정하기', '수락 전 다시 묻기'], ['약속 변경을 알리지 않음', '가능한 시간 밝히기', '새 일정 합의하기']] },
    },
    {
      title: '다음 만남을 정할 때 살필 점',
      lead: '언제 인연이 온다는 예측보다, 다음 약속의 조건을 확인해 보세요.',
      evidence: '원문에는 만남 날짜를 계산한 값이 없습니다. 따라서 이 카드에서 특정 시기나 상대의 마음을 예언하지 않고, 실제 답장과 일정 조율을 살핍니다.',
      focus: '만남 날짜를 계산한 값이 없습니다',
      action: '다음 만남을 제안할 때 시간과 장소를 구체적으로 물어보세요.',
      context: 'relationship',
      visual: { type: 'check', caption: '다음 약속의 확인 항목 · 날짜 예측이 아님', items: ['답장이 서로 이어지나요?', '시간과 장소가 정해졌나요?', '변경할 때 서로 알리나요?'] },
    },
    {
      title: '앞으로 살펴볼 큰 흐름',
      lead: '오래 이어지는 기준과 올해의 참고점을 나눠 보세요.',
      evidence: '리포트에는 현재 큰 흐름을 경진, 2026년의 흐름을 병오로 적었습니다. 둘은 길이가 다른 전통 해석 단위이며 사건이 일어날 날짜나 확률이 아닙니다.',
      focus: '길이가 다른 전통 해석 단위',
      action: '현재 맡은 일과 올해 들어온 제안을 나눠 적어 보세요.',
      context: 'planning',
      visual: { type: 'columns', caption: '리포트의 기간 표기', items: [['장기 기준', '현재 경진 · 맡은 책임과 기준 살피기'], ['올해 참고', '2026년 병오 · 제안의 결과물 확인하기']] },
    },
    {
      title: '올해 확인할 변화',
      lead: '새 제안을 받으면 담당자와 마감, 결과물을 먼저 확인해 보세요.',
      evidence: '2026년 병오라는 표기는 전통 해석의 참고점입니다. 일이 반드시 늘거나 좋은 결과가 생긴다는 뜻이 아니라, 실제 제안의 조건을 살필 계기로 읽습니다.',
      focus: '실제 제안의 조건',
      action: '올해 받은 제안 한 건에서 비어 있는 항목을 물어보세요.',
      context: 'planning',
      visual: { type: 'check', caption: '실제 제안서와 대조할 항목', items: ['담당자는 누구인가요?', '마감은 언제인가요?', '완성할 결과물은 무엇인가요?'] },
    },
    {
      title: '지금 먼저 확인할 한 가지',
      lead: '확인한 내용을 바탕으로 지금 답할 수 있는 한 가지를 정해 보세요.',
      evidence: '이 리포트에는 이 날의 세부 운세 계산이 표시되지 않습니다. 따라서 “오늘은 반드시” 같은 판단 대신 확인된 조건과 더 물어볼 조건을 나눕니다.',
      focus: '이 날의 세부 운세 계산이 표시되지 않습니다',
      action: '확인된 일에는 답하고, 빈칸이 남은 일에는 질문 한 가지를 보내 보세요.',
      context: 'planning',
      visual: { type: 'steps', caption: '받은 요청을 정리하는 세 칸', items: [['1', '확인됨', '이미 아는 조건'], ['2', '더 물어볼 것', '결정에 필요한 빈칸'], ['3', '답할 말', '지금 전달할 한 문장']] },
    },
  ];

  /* 원문을 지우거나 숨기지 않고, 카드별로 실제로 확인할 수 있는 장면을 덧붙인다. */
  const extensions = [
    [],
    [
      '버티는 힘을 살필 때는 얼마나 오래 참았는지보다 무엇을 분명히 알고 버티는지 보는 편이 도움이 됩니다. 예를 들어 요청을 받은 뒤 마감만 알고 담당 범위를 모른다면, 지금 필요한 일은 더 열심히 움직이는 것이 아니라 빠진 조건을 묻는 것입니다. 반대로 범위와 마감을 이미 알고 있다면 계속 자료를 찾기보다 지금 가능한 답을 보내는 쪽이 낫습니다.',
      '일이 한꺼번에 몰릴 때 모든 요청을 같은 크기로 받아들이면 실제로 먼저 처리할 일이 가려질 수 있습니다. 각 요청을 한 줄씩 적고 누가 최종 결정을 하는지, 내게 필요한 자료가 무엇인지 표시해 보세요. 이 과정은 일을 거절하라는 뜻이 아닙니다. 무리한 약속을 피하면서도 상대가 기다릴 수 있는 분명한 응답을 만드는 방법입니다.',
      '관계에서도 비슷합니다. 마음이 불편하다는 이유만으로 결론을 내리거나, 불편함을 설명할 말을 찾지 못해 계속 미루는 두 끝을 모두 살펴야 합니다. 어떤 약속이 달라졌는지, 그 변화가 내 일정과 책임에 어떤 영향을 주는지를 먼저 말해 보세요. 상대의 의도를 단정하지 않고도 내가 조정하고 싶은 조건을 충분히 전달할 수 있습니다.',
    ],
    [
      '겉으로 잘 맞춰 주는 모습과 속에서 지키려는 기준은 서로 반대되는 성격이 아닙니다. 대화를 부드럽게 이어 가면서도 일정, 비용, 맡을 일에는 분명한 선을 둘 수 있습니다. 이 카드가 살피는 것은 숨겨진 진짜 성격이라는 판정이 아니라, 요청이 겹칠 때 내가 어떤 기준을 말로 꺼내는지입니다.',
      '예를 들어 직장에서 급한 일을 부탁받고 저녁에는 가까운 사람과 약속이 있다면, 둘 중 누구를 더 중시하는지로만 생각할 필요가 없습니다. 업무의 마감이 실제로 바뀔 수 있는지, 약속의 시간을 조정할 수 있는지 따로 확인해야 합니다. 말없이 모두 받아들인 뒤 피로가 쌓이는 방식과, 초기에 가능한 범위를 밝히는 방식은 결과가 다를 수 있습니다.',
      '내 기준을 말하는 일이 단호하거나 차갑게 보일까 걱정된다면 이유와 대안을 함께 전해 보세요. “이 시간에는 어렵지만 내일 오전에는 가능합니다”처럼 가능한 선택을 제시하면 대화를 끊지 않고 범위를 정할 수 있습니다. 실제 상대가 어떻게 반응하는지는 이 리포트가 알 수 없으므로, 반응을 지켜보고 다시 조정하는 여지도 남겨 두는 편이 좋습니다.',
    ],
    [
      '나무 기운이 다섯이고 불 기운이 비어 있다는 숫자는 계산표에 적힌 횟수입니다. 이것만으로 사람의 능력이나 하루의 운을 점수처럼 평가할 수는 없습니다. 이 카드에서는 계산을 생활의 순서로 번역합니다. 우선 어떤 정보가 필요한지 살피고, 다음에는 확인한 내용을 다른 사람이 이해할 수 있는 말이나 결과물로 옮기는 순서입니다.',
      '이를테면 새로운 업무를 제안받았을 때 처음부터 좋다거나 어렵다고 답하지 않아도 됩니다. 담당자, 마감, 완료 기준을 물어본 뒤 내가 맡을 수 있는 일을 짧게 정리해 전달할 수 있습니다. 이렇게 하면 자료를 확인하는 일과 실제로 답하는 일이 분리됩니다. 무엇을 얼마나 더 확인해야 하는지 알 수 없을 때는 추가 질문 하나를 정하는 것만으로도 다음 단계가 보입니다.',
      '반대로 이미 필요한 조건을 알고 있는데도 더 완벽한 답을 기다리고 있다면, 불확실성을 모두 없애려는 시도가 결정을 미룰 수 있습니다. 그럴 때는 “확인된 내용은 여기까지이며, 남은 조건은 누구에게 묻겠다”라고 나눠 말해 보세요. 이는 특정 사건이 좋아진다는 예언이 아니라, 선택을 점검할 때 써 볼 수 있는 실용적인 방법입니다.',
    ],
    [
      '물과 불은 실제로 무엇을 사거나 어디로 가야 한다는 처방이 아닙니다. 원문에서는 물을 정보를 살피는 태도, 불을 생각을 표현하는 태도에 비유합니다. 따라서 보완이라는 말도 없는 기운을 반드시 채워야 한다는 뜻으로 받아들이기보다, 한쪽에 오래 머무는 행동을 다른 단계로 이어 보자는 제안으로 이해하면 쉽습니다.',
      '선택지가 여러 개일 때는 먼저 비교할 항목을 세 개 이내로 정해 보세요. 일이라면 담당 범위와 마감, 보상이 될 수 있고, 관계의 약속이라면 시간과 장소, 부담이 될 수 있습니다. 항목이 정해진 뒤에는 각 선택의 실제 조건을 적어 봅니다. 조건을 모르는 칸은 임의로 좋거나 나쁘다고 판단하지 않고 질문으로 남겨 두는 편이 정확합니다.',
      '그다음 표현의 단계에서는 결론을 크게 선언할 필요가 없습니다. “이 조건까지는 할 수 있고, 나머지는 확인이 필요합니다”처럼 현재 아는 범위만 말해도 됩니다. 상대의 답이 새 정보를 줄 수 있으므로 한 번의 대화로 모든 것을 결정해야 한다고 생각하지 마세요. 이 카드의 핵심은 신중함과 표현 사이의 균형을 스스로 조절해 보는 데 있습니다.',
    ],
    [
      '제안을 받을 때 마음이 먼저 움직이는 것은 자연스럽습니다. 다만 제안이 커 보일수록 실제로 내가 맡을 일이 어디서 끝나는지 살펴야 합니다. “도와주세요”라는 한마디에는 기간, 담당 범위, 결정 권한이 빠져 있을 수 있습니다. 빈칸을 묻는 행동은 상대를 의심하는 일이 아니라 서로 같은 일을 떠올리고 있는지 확인하는 과정입니다.',
      '먼저 책임을 보세요. 결과를 완성해야 하는 사람이 나인지, 일부만 돕는 사람인지가 다르면 필요한 시간도 달라집니다. 다음으로 대가를 보세요. 금전이 있는 제안이라면 금액과 지급 시점, 그렇지 않은 약속이라면 서로 부담할 시간과 비용을 분명히 해야 합니다. 마지막으로 마감을 보세요. 언제 답해야 하는지와 언제 끝내야 하는지는 다른 날짜일 수 있습니다.',
      '조건을 질문한 뒤에는 답을 그대로 적어 두는 편이 좋습니다. 말로 들은 내용과 문서에 적힌 내용이 다르면 무엇을 기준으로 삼을지 다시 합의해야 합니다. 세 칸 가운데 하나가 비었다고 모든 제안을 거절할 필요는 없습니다. 다만 그 칸이 채워지기 전까지는 확정된 약속처럼 행동하지 않는 편이 오해를 줄일 수 있습니다.',
    ],
    [
      '일과 돈을 함께 본다는 말은 앞으로 수입이 반드시 늘거나 줄 것이라는 뜻이 아닙니다. 이 리포트에는 실제 계약서나 계좌, 지출 내역이 들어 있지 않으므로 금액을 판단할 근거가 없습니다. 여기서는 내가 맡을 일과 그 대가가 같은 약속 안에 분명히 놓였는지를 살피는 데 집중합니다. 조건이 불분명한 상태에서 먼저 움직이면 나중에 서로 기대한 결과가 다를 수 있습니다.',
      '새 업무를 받았다고 가정해 보세요. 요청한 사람은 결과물 하나를 생각하는데 나는 준비와 수정까지 포함한다고 이해할 수 있습니다. 반대로 내가 한 번의 작업으로 생각한 일을 상대는 여러 차례의 수정을 포함한 약속으로 볼 수도 있습니다. 업무 범위, 수정 횟수, 완료 기준을 먼저 맞추면 보상을 논의할 때도 같은 일을 놓고 이야기할 수 있습니다.',
      '보상 조건을 확인할 때는 금액만 보지 말고 지급 기준도 함께 보세요. 결과물이 승인된 뒤인지, 일정한 날짜인지, 단계별인지에 따라 실제 약속의 의미가 달라집니다. 지금의 제안에 이런 조건이 없다면 담당자에게 적어 달라고 요청할 수 있습니다. 이 표는 운세가 계산한 수입표가 아니라 사용자가 실제 제안을 비교하기 위한 빈 확인표입니다.',
    ],
    [
      '현재 자리를 계속할지 새 곳으로 옮길지는 사주에 적힌 단어 하나로 결정할 수 없습니다. 현재의 업무량, 평가 방식, 보상, 건강과 생활의 부담, 다른 선택지의 조건이 실제로 어떤지 알아야 합니다. 이 리포트에는 그런 개인의 현장 정보가 없으므로 “남아야 한다”거나 “옮겨야 한다”는 결론을 대신 내리지 않습니다.',
      '비교를 시작할 때는 두 선택에 같은 질문을 써 보세요. 지금 맡는 역할은 어디까지인지, 새로운 자리에서는 무엇을 책임져야 하는지, 평가와 보상은 어떻게 정해지는지 적어 봅니다. 현재 조건만 자세히 알고 새 선택의 조건은 막연한 상태라면 비교가 기울어집니다. 반대로 새 제안만 좋아 보이고 현재 자리의 조정 가능성은 확인하지 않았다면 역시 판단 재료가 모자랍니다.',
      '소진 정도도 숫자 하나로 꾸며 내지 말고 생활 속 장면으로 적는 편이 좋습니다. 어떤 업무가 반복해 부담이 되는지, 역할을 조정하면 달라질 여지가 있는지, 새 자리에서도 같은 문제가 생길 수 있는지를 살펴보세요. 조건을 모두 모은 뒤에도 선택에는 불확실성이 남습니다. 그때 내가 가장 중요하게 여기는 기준을 한두 개 정해 비교해야 이 리포트의 조언을 실제 결정에 연결할 수 있습니다.',
    ],
    [
      '일의 대가를 받는 장면에서는 기회의 크기보다 약속의 순서를 분명히 하는 일이 중요합니다. 바깥에서 들어온 제안이라는 명리 표현은 실제 수입이 생긴다는 보장이 아닙니다. 이 카드가 제안하는 것은 누가 무엇을 요청했고, 어떤 결과물이 필요한지, 그 결과에 대해 어떤 대가가 약속되었는지를 차례로 확인하라는 뜻입니다.',
      '친한 사람에게 받은 부탁일수록 조건을 묻기 어렵다고 느낄 수 있습니다. 하지만 친밀함과 업무 범위는 서로 다른 문제입니다. 예를 들어 간단한 검토를 부탁받았는데 여러 번의 수정과 발표까지 기대한다면, 처음의 부탁과 실제 일이 달라진 셈입니다. 그때는 처음 들은 범위와 새로 요청된 일을 구분해서 이야기하는 편이 관계에도 도움이 될 수 있습니다.',
      '제안서나 메시지에 결과물의 형태를 적어 보세요. 보고서인지, 회의 참석인지, 물건의 납품인지에 따라 완료 기준이 달라집니다. 대가가 금전이라면 지급 조건을 확인하고, 금전이 아니라면 서로 주고받는 시간과 책임을 살펴야 합니다. 하나라도 비어 있다면 추측으로 채우지 말고 질문으로 남겨 두세요. 확인된 약속만을 바탕으로 수락 여부를 판단하는 것이 이 카드의 실제 적용점입니다.',
    ],
    [
      '관계에서 반복되는 선택을 살핀다고 해서 비슷한 일이 반드시 다시 일어난다는 뜻은 아닙니다. 원문이 주목하는 것은 약속을 정할 때 내 일정이나 부담을 뒤로 미루는 장면입니다. 상대가 무엇을 생각하는지 알 수 없을 때는 말투보다 실제로 정한 약속과 행동을 먼저 보는 편이 분명합니다. 그 안에서 내가 말하지 않은 조건이 있는지 살펴보세요.',
      '예를 들어 만날 장소를 정할 때 늘 한쪽만 이동한다면, 그 사실을 먼저 확인하고 다음에는 번갈아 만나자고 제안할 수 있습니다. 비용이나 시간을 한쪽이 계속 부담한다면 누가 나쁜 사람인지 결론부터 내리기보다 부담이 어떻게 나뉘었는지 이야기할 수 있습니다. 이미 상대와 합의한 사정이 있다면 그 맥락도 함께 보아야 합니다.',
      '부담을 말할 때는 지난 약속을 한꺼번에 꺼내기보다 이번 약속 한 가지를 골라 말해 보세요. “이번에는 이 시간까지만 가능해요”처럼 내가 할 수 있는 범위를 알려 주면 상대도 조정할 자료를 얻습니다. 상대의 답을 들은 뒤에는 실제로 약속이 달라졌는지 확인해야 합니다. 감정의 크기를 점수로 만들거나 미래 관계의 결과를 단정하지 않고, 지금 조정할 수 있는 행동에 초점을 맞춥니다.',
    ],
    [
      '편안한 관계를 찾는 기준은 외모나 직업, 운명적인 분위기를 미리 정하는 데 있지 않습니다. 원문은 생각을 정리할 틈을 주는 대화와 분명한 약속을 중요하게 봅니다. 이는 특정한 상대가 나타난다는 예측이 아니라 실제 만남을 경험한 뒤 관계가 나에게 어떤 느낌과 부담을 남기는지 살펴볼 질문에 가깝습니다.',
      '대화가 잘 통하는 것과 약속이 지켜지는 것은 모두 중요하지만 같은 것은 아닙니다. 처음에는 말이 잘 통해도 일정 변경을 알리지 않거나 맡기로 한 일을 계속 미룰 수 있습니다. 반대로 말수가 적어도 시간을 지키고 어려운 조건을 솔직하게 설명하는 사람이 있을 수 있습니다. 한 번의 장면만으로 성격을 평가하지 말고 여러 번의 행동을 함께 보세요.',
      '나에게 편안한 관계라는 말도 모든 것을 맞춰 주는 관계를 뜻하지는 않습니다. 서로 가능한 시간과 부담을 말할 수 있고, 의견이 달라질 때 조정할 여지가 있는지를 살펴보세요. 다음 만남에서는 약속한 내용, 실제 행동, 그 뒤의 내 느낌을 따로 적어 보는 것도 도움이 됩니다. 끌림을 부정할 필요는 없지만 그 한 가지 신호만으로 다른 조건을 덮지 않는 것이 이 카드의 핵심입니다.',
    ],
    [
      '사람을 멀리해야 한다고 미리 분류하면 실제로 중요한 행동을 놓칠 수 있습니다. 이 카드의 제목을 행동 기준으로 바꾼 이유도 여기에 있습니다. 말투가 마음에 들지 않았다는 인상과, 약속한 시간이나 책임이 반복해서 달라졌다는 사실은 구분해야 합니다. 전자는 느낌이고 후자는 서로 확인할 수 있는 약속의 기록입니다.',
      '예를 들어 함께 준비하기로 한 일에서 역할이 자꾸 바뀐다면 상대의 의도를 추측하기보다 원래 합의한 범위와 지금 요청한 범위를 나눠 보세요. 비용을 함께 내기로 했다면 언제 얼마를 어떻게 나누기로 했는지 확인하는 편이 좋습니다. 불편함이 있다면 그것을 말할 권리가 있으며, 동시에 상대에게 설명할 기회도 줄 수 있습니다.',
      '경계를 정한다는 것은 곧바로 관계를 끝내거나 벌을 주는 일이 아닙니다. “이번에는 이 일까지만 할 수 있어요”라고 범위를 밝히고, 다시 같은 일이 생길 때 어떤 대응을 할지 스스로 정하는 과정입니다. 상대가 조정에 응하는지, 약속이 실제로 바뀌는지를 차분히 살펴보세요. 이 리포트만으로 특정 인물을 위험한 사람이나 좋은 사람으로 판정할 수는 없습니다.',
    ],
    [
      '이 카드의 원래 제목에는 인연이 오는 시기라는 말이 있었지만, 실제 본문에는 특정한 만남 날짜를 계산한 값이 없습니다. 그래서 달력에 표시할 수 있는 예측을 만들어 내지 않았습니다. 지금 할 수 있는 일은 연락을 주고받는 방식과 다음 약속을 정할 때 필요한 조건을 살피는 것입니다. 시기를 알고 싶다는 기대와 화면이 실제로 제공하는 근거를 분리해야 합니다.',
      '답장이 빠르다는 사실만으로 관계의 방향을 알 수 없고, 답장이 늦다는 사실만으로 마음이 없다고 결론 내릴 수도 없습니다. 시간과 장소를 정하려는 대화가 이어지는지, 서로 가능한 일정을 말하는지, 변경이 생기면 알려 주는지를 보세요. 이런 행동도 한 번의 만남으로 상대 전체를 평가하는 기준은 아닙니다. 다만 다음 만남을 정하는 데 실제로 쓸 수 있는 정보입니다.',
      '만남을 제안할 때는 상대의 마음을 시험하는 질문보다 내가 가능한 시간과 원하는 방식을 구체적으로 말해 보세요. 예를 들어 두 가지 가능한 시간을 제시하면 상대도 답하기 쉬워집니다. 일정이 맞지 않으면 다른 날짜를 함께 찾아볼 수 있습니다. 연락을 주고받는 과정에서 계속 조건이 흐려진다면 시기를 예언하려 하기보다 지금 서로 맞출 수 있는 범위를 다시 확인하는 편이 정확합니다.',
    ],
    [
      '전통 해석에서 큰 흐름과 한 해의 흐름은 서로 다른 길이의 기준입니다. 원문에는 현재의 큰 흐름을 경진, 2026년의 흐름을 병오라고 적었습니다. 이 표기를 하나의 그래프로 이어서 특정 달에 좋은 일이나 나쁜 일이 일어난다고 읽으면 원문보다 많은 것을 주장하게 됩니다. 시작과 끝이 표시되지 않은 기간에는 임의의 날짜 눈금을 만들지 않는 이유입니다.',
      '장기 기준에서는 반복해서 맡는 역할과 책임의 방식을 살펴볼 수 있습니다. 어떤 부탁을 쉽게 수락하는지, 평가나 보상을 나중에 확인하는 일이 반복되는지처럼 지속적인 선택을 보는 것입니다. 올해 참고점에서는 지금 들어온 제안의 담당자와 결과물을 확인하는 데 초점을 맞출 수 있습니다. 두 질문을 나누면 큰 말로 모든 일을 설명하려는 부담이 줄어듭니다.',
      '예를 들어 현재 맡은 일에서 역할이 불분명하다면 그것은 장기적으로 조정할 문제일 수 있습니다. 새로 들어온 프로젝트의 마감과 보상이 비어 있다면 당장 질문해야 할 조건입니다. 두 장면은 함께 영향을 주지만 같은 문제가 아닙니다. 리포트의 기호를 실제 삶에 연결하려면 사건을 예언하기보다 어떤 질문을 지금 할 수 있는지로 번역하는 편이 유용합니다.',
    ],
    [
      '올해 달라진다는 표현은 변화가 반드시 일어난다고 들릴 수 있어 조심해야 합니다. 2026년 병오라는 표기는 이 리포트에 표시된 전통 해석의 한 해 기준일 뿐, 실제 직장이나 수입에서 어떤 일이 생기는지를 보여 주는 자료는 아닙니다. 따라서 올해 들어온 제안을 어떻게 확인할지에 관한 참고점으로 읽는 편이 안전합니다.',
      '회의에서 새로운 업무를 제안받았다면 먼저 누가 담당자인지 물어보세요. 그다음 언제까지 무엇을 완성해야 하는지 확인합니다. “잘해 보자”는 격려와 실제 완료 기준은 다를 수 있습니다. 말로 들은 내용과 문서에 적힌 내용을 대조하면 내가 맡기로 한 일과 아직 협의하지 않은 일이 구분됩니다. 업무가 커 보인다는 인상만으로 곧바로 좋은 기회라고 결론 내릴 필요는 없습니다.',
      '이 과정은 기회를 놓치지 않으면서도 무리한 약속을 줄이기 위한 것입니다. 조건이 세 가지 모두 채워졌다면 내가 할 수 있는 범위와 필요한 지원을 말해 보세요. 빠진 항목이 있다면 무엇이 없어서 결정하기 어려운지 구체적으로 질문할 수 있습니다. 실제 결과는 상대의 결정과 업무 환경에 따라 달라지므로, 사주 용어보다 확인된 계약과 대화 내용을 우선해야 합니다.',
    ],
    [
      '마지막 카드에서는 앞에서 반복한 상징을 다시 길게 설명하기보다 지금 답할 수 있는 일을 한 가지로 좁힙니다. 원문은 정보를 살피는 힘과 밖으로 표현하는 힘의 균형을 이야기합니다. 다만 이 리포트에는 특정 날짜의 세부 운세 계산값이 보이지 않으므로, “오늘은 어떤 일이 일어나는 날”이라고 정하지 않습니다.',
      '실제로 요청을 하나 받았다고 생각해 보세요. 먼저 이미 확인된 조건을 적습니다. 담당자와 마감은 알지만 결과물의 범위는 모를 수 있습니다. 그다음 더 물어볼 것을 한 문장으로 정합니다. 질문을 보내는 일도 하나의 답입니다. 모든 빈칸이 채워질 때까지 연락을 멈추거나, 빈칸을 추측으로 채워 수락하는 두 선택만 있는 것은 아닙니다.',
      '답할 말은 길 필요가 없습니다. “이 범위는 가능합니다. 결과물 형식은 확인해 주실 수 있나요?”처럼 현재 가능한 일과 남은 질문을 함께 전할 수 있습니다. 상대의 답이 오면 그때 조건을 다시 맞춰 보면 됩니다. 이 카드가 제안하는 변화는 운세의 확정적인 방향이 아니라, 확인한 사실에 맞춰 다음 한 걸음을 분명히 하는 작은 습관입니다.',
    ],
  ];

  const followups = {
    4: '이 순서를 실제로 써 보려면 하나의 요청만 고르는 것이 좋습니다. 여러 업무를 동시에 정리하려 하면 다시 자료의 양에 압도될 수 있습니다. 선택한 요청에서 빠진 조건을 묻고, 확인된 조건을 바탕으로 다음 행동을 한 줄로 보내 보세요. 답을 보낸 뒤 바뀐 조건이 있다면 그때 다시 조정하면 됩니다. 큰 결심이 아니라 작은 확인과 표현의 반복으로 읽어 주세요.',
    5: '몸과 마음의 상태가 좋지 않거나 시간이 부족할 때는 단계를 더 작게 나누어도 됩니다. 자료를 모두 읽는 대신 꼭 필요한 질문 하나를 정하고, 긴 설명 대신 현재 가능한 범위만 전달할 수 있습니다. 전통 용어가 낯설다면 물과 불이라는 단어를 외우지 않아도 됩니다. 내가 지금 더 필요한 것이 정보인지, 이미 아는 것을 표현할 기회인지 묻는 것만으로 이 풀이를 사용할 수 있습니다.',
    6: '상대가 답을 바로 주지 못한다면 언제까지 확인해 줄 수 있는지도 물어보세요. 기다리는 동안 다른 일을 진행할 수 있는지 알게 되기 때문입니다. 요청과 답을 한 곳에 적어 두면 나중에 약속을 다시 확인하기도 쉽습니다. 이 카드의 확인 목록은 사람이나 기회를 평가하는 점수가 아닙니다. 서로 다른 기대를 같은 문장으로 맞추기 위한 대화 도구입니다.',
    7: '현재 조건과 새 제안을 비교할 때도 같은 표를 쓸 수 있습니다. 한쪽에만 조건이 적혀 있으면 다른 쪽을 더 좋아 보이게 상상하기 쉽습니다. 모르는 칸을 비워 두고 담당자에게 확인해 보세요. 실제 비용이나 계약 문제가 중요한 경우에는 이 풀이만으로 결정하지 말고 계약 내용과 필요한 전문 상담을 우선해야 합니다. 이 표는 판단을 대신하지 않고 확인해야 할 질문을 보여 줍니다.',
    8: '이직은 생활에 큰 영향을 줄 수 있으므로 사주 문장보다 실제 조건과 자신의 우선순위가 앞서야 합니다. 비교표를 채운 뒤에도 답이 같아 보이면 무엇을 포기할 수 없고 무엇은 조정할 수 있는지 나눠 보세요. 가족과 일정, 건강, 경력의 연속성처럼 이 리포트에 없는 조건도 중요한 판단 근거입니다. 그 정보를 넣기 전에는 현재 자리나 새 선택 어느 쪽이 낫다고 단정하지 않습니다.',
    9: '작은 부탁이라도 처음 약속과 추가 요청을 구분해 보는 습관이 도움이 됩니다. 처음의 결과물이 끝났는데 새로운 일을 더 해 달라는 요청이 오면, 그것이 같은 약속에 포함되는지 다시 묻는 편이 좋습니다. 대가를 묻는 일이 어색하다면 “어떤 결과를 언제까지 기대하시나요?”부터 시작할 수 있습니다. 결과물의 범위를 먼저 맞추면 보상에 대한 대화도 더 구체적으로 할 수 있습니다.',
    10: '약속의 부담은 사람마다 다르게 느껴질 수 있으므로 내 느낌을 사실처럼 강요하지 않는 것도 중요합니다. “지난번에는 제가 이쪽 일을 맡았고, 이번에는 나눠 하고 싶어요”처럼 있었던 일과 원하는 조정을 나눠 말해 보세요. 상대가 기억하는 상황이 다를 수도 있습니다. 그 차이를 듣고 다시 약속할 수 있다면, 반복되는 불편함을 대화로 바꾸는 출발점이 됩니다.',
    11: '관계를 살피는 질문에 정답은 없습니다. 누군가에게는 계획을 미리 세우는 일이 중요하고, 다른 사람에게는 변경을 솔직하게 알리는 일이 더 중요할 수 있습니다. 먼저 내가 편안함을 느끼는 장면을 떠올리고 그 장면이 실제로 있었는지 살펴보세요. 상대에게도 편한 방식이 무엇인지 묻는다면 한 사람만 맞추는 관계가 아니라 서로 조건을 조정하는 관계인지 알아갈 수 있습니다.',
    12: '불편한 일이 한 번 있었다면 상황을 확인하는 대화부터 시작할 수 있습니다. 같은 일이 여러 번 반복되고 조정하려는 대화가 이루어지지 않을 때는 내 시간과 부담을 지키기 위한 거리를 정할 수 있습니다. 거리는 연락을 끊는 한 가지 방식만을 뜻하지 않습니다. 만나는 횟수를 줄이거나 비용과 역할을 더 분명히 하는 방식도 있습니다. 무엇이 안전하고 적절한지는 실제 관계의 맥락을 함께 보아야 합니다.',
    13: '연락의 속도나 횟수를 숫자 점수로 바꾸지 않은 이유도 여기에 있습니다. 바쁜 일정과 연락 습관은 사람마다 다르고, 메시지 한두 개만으로 관계의 가능성을 알 수 없습니다. 약속을 정하는 데 필요한 질문을 직접 하고, 답을 듣고, 실제 만남에서 서로 편안한지 살펴보세요. 만남이 정해지지 않더라도 그것은 특정한 운의 증명이 아니라 현재 두 사람의 일정과 선택에 관한 정보입니다.',
    14: '큰 흐름이라는 표현이 막연하게 들린다면 최근 반복한 선택 하나를 떠올려 보세요. 부탁을 받을 때 맡을 일을 먼저 묻는지, 일단 수락한 뒤 나중에 조건을 확인하는지 살펴보는 것입니다. 그 선택은 올해 들어온 제안에서도 나타날 수 있지만, 반드시 같은 결과를 낳지는 않습니다. 장기 기준은 습관을 보는 틀이고 올해 참고점은 실제 제안의 조건을 살피는 틀이라고 구분하면 쉽습니다.',
    15: '제안을 검토하는 사람에게도 내가 필요한 지원을 말해 보세요. 마감이 짧다면 필요한 자료를 받을 수 있는지, 결과물의 기준이 넓다면 누가 승인하는지 확인해야 합니다. 담당자, 마감, 결과물이 확인되더라도 그 일을 수행할 시간과 자원이 있는지는 따로 보아야 합니다. 올해의 운세라는 말로 무리한 약속을 정당화하지 말고, 현실의 준비 상태를 함께 살피는 것이 중요합니다.',
    16: '한 가지 답을 정했다면 그것이 확정된 사실인지 잠정적인 답인지도 구분해 보세요. “현재 확인한 범위에서는 가능합니다”와 “모든 조건에 동의합니다”는 다른 약속입니다. 필요한 정보가 뒤늦게 오면 답을 다시 조정할 수 있어야 합니다. 이렇게 확인된 것과 아직 열린 것을 함께 말하면, 무작정 미루지 않으면서도 모르는 일을 안다고 말하지 않을 수 있습니다.',
  };

  const actionFocus = [
    '맡을 범위와 조정할 범위', '마감과 담당 범위', '받아들일 일과 거절할 일',
    '처리 순서', '그 기준에 따른 결론', '비어 있는 조건', '구두로 들은 조건과 문서에 적힌 조건',
    '두 선택의 조건', '결과물과 대가', '부담스러운 조건 한 가지', '실제 있었던 일',
    '내가 할 수 있는 범위', '시간과 장소', '현재 맡은 일과 올해 들어온 제안',
    '비어 있는 항목', '질문 한 가지',
  ];

  /* 이 검토본에서만 쓰는 추가 맥락. 입력값은 메모리에만 머물고 저장·전송하지 않는다. */
  const additionalContextDefinitions = {
    offer: {
      heading: '제안 조건 추가 정보',
      description: '제안서나 대화에서 확인한 역할·보상·마감을 한 문장으로 적으면 관련 카드의 확인표에 반영합니다.',
      fields: [
        ['condition', '제안의 실제 조건', '예: 기획안 초안 작성 · 계약금은 다음 달 지급 · 금요일까지 답변'],
      ],
    },
    workDecision: {
      heading: '현재 자리와 새 선택의 조건',
      description: '유지·이직을 판정하지 않습니다. 현재 자리와 새 선택의 역할·평가·보상·소진을 각각 한 문장으로 적습니다.',
      fields: [
        ['current', '현재 자리의 조건', '예: 고객 대응·분기 평가 · 야근 주 2회'],
        ['new', '새 선택의 조건', '예: 프로젝트 운영 · 보상 협의 중 · 지원 인력 확인 필요'],
      ],
    },
    relationship: {
      heading: '관계의 실제 조건 추가 정보',
      description: '상대의 마음을 단정하지 않습니다. 실제 약속·내 부담·다음에 조정할 범위를 한 문장으로 적습니다.',
      fields: [
        ['condition', '관계의 실제 조건', '예: 토요일 3시 약속 · 이동 부담 큼 · 다음은 중간 장소 제안'],
      ],
    },
    planning: {
      heading: '현재 계획의 실제 조건',
      description: '전통 해석의 기간 표기를 사건 예측으로 바꾸지 않습니다. 지금 확인한 책임·제안·질문을 한 문장으로 적습니다.',
      fields: [
        ['condition', '현재 계획의 실제 조건', '예: 고객 이관 담당 · 새 프로젝트 제안 · 승인 기준 확인 필요'],
      ],
    },
  };

  const additionalContext = Object.fromEntries(
    Object.entries(additionalContextDefinitions).map(([key, definition]) => [
      key,
      Object.fromEntries(definition.fields.map(([name]) => [name, ''])),
    ]),
  );

  /* 저장된 해석의 시작 나이·역행·월주와 현재 대운을 기준으로 계산한 10개 대운만 사용한다. */
  const lifeFlowProfile = {
    position: '경진 대운 안의 2026년 병오 참고점',
    currentPillar: '庚辰',
    /* 로그인된 저장 리포트의 년주 乙卯에서 읽은 출생년 지지와, 저장된 올해 참고 2026을 사용한다. */
    birthYearBranch: '卯',
    referenceYear: 2026,
    daewoon: [
      ['6~15세', '甲申'], ['16~25세', '癸未'], ['26~35세', '壬午'], ['36~45세', '辛巳'], ['46~55세', '庚辰'],
      ['56~65세', '己卯'], ['66~75세', '戊寅'], ['76~85세', '丁丑'], ['86~95세', '丙子'], ['96~105세', '乙亥'],
    ],
    /* 높이는 성공·수입·사건 확률이 아니다. 저장 원문의 보완 기운과 책임·기준의 해석을 중학생도 읽을 수 있는 세 단계 활용 안내로 옮긴 값이다. */
    flow: [
      ['6~15세', 2, '기준을 배우는 흐름'], ['16~25세', 3, '힘을 키우는 흐름'], ['26~35세', 3, '표현하고 움직이는 흐름'], ['36~45세', 2, '기준을 다듬는 흐름'], ['46~55세', 1, '속도를 조절하는 흐름'],
      ['56~65세', 2, '관계와 일의 기준을 다시 세우는 흐름'], ['66~75세', 2, '무게와 선택을 정리하는 흐름'], ['76~85세', 3, '경험을 표현하는 흐름'], ['86~95세', 3, '생각과 실행을 잇는 흐름'], ['96~105세', 2, '관계와 방향을 점검하는 흐름'],
    ],
    layers: [
      ['올해 참고', '2026년 병오', '들어온 제안의 담당자·결과물·마감을 확인하는 기준'],
    ],
    areas: [
      ['offer', '재물·보상', '재물운', '한 문장 조건', '받을 대가와 지급·평가 조건을 한 문장으로 확인'],
      ['workDecision', '일·직장', '직장운', '현재·새 선택', '현재 자리와 새 선택의 실제 조건을 두 문장으로 비교'],
      ['relationship', '관계·연애', '연애운', '한 문장 조건', '상대의 마음이 아니라 실제 약속과 조정 가능한 범위를 한 문장으로 확인'],
    ],
  };

  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  const svgElement = (tag, attributes = {}, value) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (value !== undefined) node.textContent = value;
    return node;
  };

  const calculateSamjae = (birthYearBranch, referenceYear) => {
    const branchOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const animals = { 子: '쥐', 丑: '소', 寅: '호랑이', 卯: '토끼', 辰: '용', 巳: '뱀', 午: '말', 未: '양', 申: '원숭이', 酉: '닭', 戌: '개', 亥: '돼지' };
    const groups = [
      { birth: ['申', '子', '辰'], period: ['寅', '卯', '辰'] },
      { birth: ['亥', '卯', '未'], period: ['巳', '午', '未'] },
      { birth: ['寅', '午', '戌'], period: ['申', '酉', '戌'] },
      { birth: ['巳', '酉', '丑'], period: ['亥', '子', '丑'] },
    ];
    const group = groups.find(({ birth }) => birth.includes(birthYearBranch));
    const branchForYear = (year) => branchOrder[((year - 1984) % 12 + 12) % 12];
    const starts = Array.from({ length: 49 }, (_, index) => referenceYear - 24 + index).filter((year) => (
      group && group.period.every((branch, offset) => branchForYear(year + offset) === branch)
    ));
    const activeStart = starts.find((year) => referenceYear >= year && referenceYear <= year + 2);
    const nextStart = starts.find((year) => year > referenceYear);
    const start = activeStart ?? nextStart;
    const phase = activeStart ? ['들어가는 해', '가운데 해', '마무리 해'][referenceYear - activeStart] : '다음 기간';
    const period = `${start}~${start + 2}년`;
    return {
      active: Boolean(activeStart),
      phase,
      period,
      value: activeStart ? `현재 삼재 · ${phase}` : `다음 삼재 · ${period}`,
      description: activeStart
        ? `${animals[birthYearBranch]}띠 그룹의 삼재는 ${period}입니다. ${referenceYear}년은 그 ${phase}입니다. 삼재는 전통적인 해 분류일 뿐, 사건의 좋고 나쁨을 정하지 않습니다.`
        : `${animals[birthYearBranch]}띠 그룹의 다음 삼재는 ${period}입니다. 삼재는 전통적인 해 분류일 뿐, 사건의 좋고 나쁨을 정하지 않습니다.`,
      basis: `출생년 지지 ${birthYearBranch} · 기준 연도 ${referenceYear} · 삼재 지지 ${group.period.join('·')}`,
    };
  };

  const appendWithFocus = (parent, value, focus) => {
    const at = value.indexOf(focus);
    if (at < 0) {
      parent.textContent = value;
      return;
    }
    parent.append(document.createTextNode(value.slice(0, at)));
    parent.append(element('mark', 'review-mark', focus));
    parent.append(document.createTextNode(value.slice(at + focus.length)));
  };

  const cleanContextValue = (value) => value.replace(/\s+/g, ' ').trim().slice(0, 120);

  const contextValueOrPlaceholder = (value) => value || '추가 정보 입력 전';

  const getContextResultText = (key) => {
    const values = Object.values(additionalContext[key]);
    if (!values.some(Boolean)) return '추가 정보를 아직 입력하지 않았습니다. 표에는 사실로 확인된 조건만 반영합니다.';
    return '입력한 실제 조건을 이 검토 화면의 표와 보강 문장에 반영했습니다. 비어 있는 조건은 결론으로 바꾸지 않습니다.';
  };

  const updateAdditionalContext = (key) => {
    const values = additionalContext[key];
    document.querySelectorAll(`[data-context-value^="${key}."]`).forEach((node) => {
      const field = node.dataset.contextValue.slice(key.length + 1);
      node.textContent = contextValueOrPlaceholder(values[field]);
      node.toggleAttribute('data-context-empty', !values[field]);
    });
    document.querySelectorAll(`[data-context-result="${key}"]`).forEach((node) => {
      node.textContent = getContextResultText(key);
    });
    document.querySelectorAll(`[data-context-form="${key}"]`).forEach((form) => {
      const toggle = form.closest('.review-context')?.querySelector('[data-context-toggle]');
      if (toggle) toggle.textContent = Object.values(values).some(Boolean) ? '추가 정보 수정' : '추가 정보 입력';
      [...form.elements].forEach((field) => {
        if (field instanceof HTMLTextAreaElement && field.name in values) field.value = values[field.name];
      });
    });
    updateLifeFlowMap();
  };

  const renderAdditionalContext = (key, cardNumber) => {
    const definition = additionalContextDefinitions[key];
    const region = element('section', 'review-context');
    const headingId = `review-context-${key}-${cardNumber}`;
    const heading = element('h3', 'review-context-title', definition.heading);
    heading.id = headingId;
    const intro = element('p', 'review-context-description', definition.description);
    const toggle = element('button', 'review-context-toggle', '추가 정보 입력');
    toggle.type = 'button';
    toggle.dataset.contextToggle = key;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', `${headingId}-form`);
    const form = element('form', 'review-context-form');
    form.id = `${headingId}-form`;
    form.dataset.contextForm = key;
    form.hidden = true;
    form.noValidate = true;
    const fields = element('div', 'review-context-fields');
    definition.fields.forEach(([name, label, placeholder]) => {
      const field = element('label', 'review-context-field');
      const labelText = element('span', '', label);
      const input = element('textarea', '');
      input.name = name;
      input.rows = 2;
      input.maxLength = 120;
      input.placeholder = placeholder;
      input.setAttribute('aria-describedby', `${headingId}-privacy`);
      field.append(labelText, input);
      fields.append(field);
    });
    const error = element('p', 'review-context-error');
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const actions = element('div', 'review-context-actions');
    const apply = element('button', 'review-context-apply', '입력 내용 반영');
    apply.type = 'submit';
    const clear = element('button', 'review-context-clear', '입력한 내용 지우기');
    clear.type = 'reset';
    actions.append(apply, clear);
    const privacy = element('p', 'review-context-privacy', '입력한 내용은 이 브라우저의 현재 검토 화면에서만 사용됩니다. 저장하거나 전송하지 않습니다.');
    privacy.id = `${headingId}-privacy`;
    form.append(fields, error, actions, privacy);
    const result = element('p', 'review-context-result', getContextResultText(key));
    result.dataset.contextResult = key;
    result.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-labelledby', headingId);
    region.append(heading, intro, toggle, form, result);

    toggle.addEventListener('click', () => {
      form.hidden = !form.hidden;
      toggle.setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) form.querySelector('textarea')?.focus();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const next = Object.fromEntries(definition.fields.map(([name]) => [name, cleanContextValue(new FormData(form).get(name)?.toString() || '')]));
      if (!Object.values(next).some(Boolean)) {
        error.textContent = '표에 반영할 실제 조건을 한 항목 이상 입력해 주세요.';
        error.hidden = false;
        form.querySelector('textarea')?.focus();
        return;
      }
      Object.assign(additionalContext[key], next);
      error.hidden = true;
      updateAdditionalContext(key);
      form.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        Object.keys(additionalContext[key]).forEach((field) => { additionalContext[key][field] = ''; });
        error.hidden = true;
        updateAdditionalContext(key);
      }, 0);
    });
    return region;
  };

  const updateLifeFlowMap = () => {
    lifeFlowProfile.areas.forEach(([key]) => {
      const fields = Object.keys(additionalContext[key]);
      const complete = fields.filter((field) => Boolean(additionalContext[key][field])).length;
      const percent = Math.round((complete / fields.length) * 100);
      document.querySelectorAll(`[data-domain-flow="${key}"]`).forEach((flow) => {
        const count = flow.querySelector('[data-domain-flow-count]');
        const status = flow.querySelector('[data-domain-flow-status]');
        if (count) count.textContent = `사실 입력 ${complete}/${fields.length}`;
        if (status) status.textContent = complete
          ? '입력한 실제 조건이 이 카드의 표와 보강 문장에 반영되었습니다.'
          : '이 그래프는 사주 원문 기반 흐름입니다. 현재 사실을 입력하면 해당 카드에서 함께 비교할 수 있습니다.';
      });
    });
  };

  const renderLifeFlowMap = () => {
    const section = element('section', 'review-life-flow');
    section.setAttribute('aria-labelledby', 'review-life-flow-title');
    const eyebrow = element('p', 'review-life-flow-eyebrow', '리포트 근거 기반 · 운세 점수 아님');
    const title = element('h2', 'review-life-flow-title', '나의 대운 흐름');
    title.id = 'review-life-flow-title';
    const lead = element('p', 'review-life-flow-lead', '지금은 46~55세 구간입니다. 금색 점은 지금의 위치이고, 선이 위로 갈수록 힘을 쓰기 쉬운 흐름, 아래로 갈수록 속도를 조절하고 조건을 살필 흐름을 뜻합니다.');
    const curve = element('figure', 'review-life-curve');
    curve.append(
      element('figcaption', 'review-life-curve-caption', '한눈에 읽는 인생 흐름'),
      element('p', 'review-life-curve-intro', '이 선은 잘되고 못되는 점수가 아닙니다. 각 10년 동안 어떤 방식으로 움직이면 덜 무리하는지를 쉽게 옮긴 안내입니다.'),
    );
    const guide = element('div', 'review-life-curve-guide');
    guide.append(
      element('span', 'is-high', '위쪽 · 힘을 쓰기 쉬운 흐름'),
      element('span', 'is-middle', '가운데 · 기준을 정리하는 흐름'),
      element('span', 'is-low', '아래쪽 · 속도를 조절할 흐름'),
    );
    curve.append(guide);
    const plot = element('div', 'review-life-curve-plot');
    plot.setAttribute('role', 'img');
    plot.setAttribute('aria-label', '6세부터 105세까지의 대운 활용 흐름. 현재 46세부터 55세 경진 대운은 속도를 조절하고 현실 조건을 확인하는 위치입니다.');
    const svg = svgElement('svg', { class: 'review-life-curve-svg', viewBox: '0 0 340 166', 'aria-hidden': 'true', focusable: 'false' });
    const levels = { 3: 35, 2: 84, 1: 130 };
    const labels = [['힘을 쓰기 쉬움', 35], ['기준을 정리', 84], ['속도를 조절', 130]];
    labels.forEach(([label, y]) => {
      svg.append(
        svgElement('line', { class: 'review-life-curve-grid', x1: 52, x2: 332, y1: y, y2: y }),
        svgElement('text', { class: 'review-life-curve-axis', x: 0, y: y + 4 }, label),
      );
    });
    const points = lifeFlowProfile.flow.map(([age, level], index) => ({ age, level, x: 56 + (index * 30), y: levels[level] }));
    const pathData = points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
    svg.append(svgElement('path', { class: 'review-life-curve-line', d: pathData }));
    points.forEach(({ age, level, x, y }, index) => {
      const isCurrent = lifeFlowProfile.flow[index][0] === '46~55세';
      svg.append(svgElement('circle', { class: isCurrent ? 'review-life-curve-point is-current' : 'review-life-curve-point', cx: x, cy: y, r: isCurrent ? 6 : 3.5 }));
      if (index % 2 === 0 || isCurrent) svg.append(svgElement('text', { class: isCurrent ? 'review-life-curve-age is-current' : 'review-life-curve-age', x, y: 155, 'text-anchor': 'middle' }, age.replace('세', '')));
    });
    plot.append(svg);
    curve.append(plot);
    const currentFlow = lifeFlowProfile.flow.find(([age]) => age === '46~55세');
    const currentCallout = element('section', 'review-life-current-callout');
    currentCallout.append(
      element('p', 'review-life-current-label', '지금의 위치 · 46~55세'),
      element('strong', '', currentFlow[2]),
      element('p', '', '나쁜 시기라는 뜻이 아닙니다. 더 크게 벌이기보다 역할·계약·비용·마감을 먼저 확인하면 힘을 덜 낭비할 수 있다는 안내입니다.'),
    );
    const samjae = calculateSamjae(lifeFlowProfile.birthYearBranch, lifeFlowProfile.referenceYear);
    const connection = element('section', 'review-life-connection');
    connection.setAttribute('aria-label', '리포트 데이터 연결 상태');
    connection.append(element('h3', '', '리포트에 연결된 정보'));
    const connectionList = element('ul', 'review-life-connection-list');
    [
      ['사주 계산', '연결됨', '사주 구성·대운·2026년 참고·삼재'],
      ['현재 생활 조건', '선택 입력', '제안 1 · 일·직장 2 · 관계 1 · 계획 1'],
    ].forEach(([label, state, description]) => {
      const item = element('li', 'review-life-connection-item');
      item.append(element('strong', '', label), element('b', '', state), element('span', '', description));
      connectionList.append(item);
    });
    connection.append(connectionList, element('p', 'review-life-connection-note', '현재 직장·보상·관계처럼 사주 원문에 없는 사실은 임의 계산으로 채우지 않고, 아래 카드에서 필요한 다섯 문장만 입력하면 해당 표와 해석 보강 문장에 연결됩니다.'));
    const source = element('details', 'review-daewoon-source');
    source.open = true;
    source.append(element('summary', '', '만세력 원자료 보기'));
    const timeline = element('figure', 'review-life-timeline review-daewoon-graph');
    timeline.append(element('figcaption', 'review-life-timeline-caption', '평생 대운 타임라인 · 10년 단위'));
    const rail = element('ol', 'review-daewoon-rail');
    lifeFlowProfile.daewoon.forEach(([age, pillar]) => {
      const isCurrent = pillar === lifeFlowProfile.currentPillar;
      const item = element('li', isCurrent ? 'review-daewoon-segment is-current' : 'review-daewoon-segment');
      if (isCurrent) item.setAttribute('aria-current', 'step');
      item.append(
        element('span', 'review-daewoon-dot', isCurrent ? '현재' : ''),
        element('span', 'review-daewoon-age', age),
        element('strong', 'review-daewoon-pillar', pillar),
      );
      rail.append(item);
    });
    timeline.append(rail);
    const basis = element('p', 'review-daewoon-basis', '저장 해석의 시작 나이 6세·역행·월주 乙酉를 기준으로 계산했습니다. 2026년 병오는 별도 세운 참고값입니다.');
    const track = element('ol', 'review-life-track');
    const layers = [...lifeFlowProfile.layers, ['삼재', samjae.value, samjae.description]];
    layers.forEach(([label, value, description], index) => {
      const item = element('li', 'review-life-track-item');
      item.append(
        element('span', 'review-life-track-index', String(index + 1)),
        element('strong', '', label),
        element('b', '', value),
        element('p', '', description),
      );
      track.append(item);
    });
    timeline.append(track);
    source.append(timeline, basis, element('p', 'review-daewoon-basis', `삼재 계산 근거 · ${samjae.basis}`));
    const note = element('p', 'review-life-flow-note', samjae.active
      ? `삼재 · ${samjae.period} 중 ${samjae.phase}입니다. ${lifeFlowProfile.referenceYear}년은 이 전통 분류의 가운데 해이며, 실제 사건을 예고하거나 결론 내리는 표시는 아닙니다.`
      : `다음 삼재는 ${samjae.period}입니다. 이는 실제 사건을 예고하거나 결론 내리는 표시는 아닙니다.`);
    section.append(eyebrow, title, lead, curve, currentCallout, connection, source, note);
    return section;
  };

  const domainFlowProfiles = {
    offer: ['재물·보상 흐름', '돈이 늘거나 줄어든다는 예측이 아닙니다. 이 대운 흐름에서 맡을 일과 대가를 함께 확인하는 위치를 읽습니다.', '현재는 보상보다 먼저 역할·결과물·지급 조건을 같은 문장에 적어 비교해 보세요.'],
    workDecision: ['일·직장 흐름', '이직이나 유지의 결과를 정하는 그래프가 아닙니다. 이 대운 흐름에서 현재 자리와 새 선택의 조건을 비교하는 위치를 읽습니다.', '현재는 역할·평가·보상·소진을 두 선택에 같은 기준으로 놓고 비교해 보세요.'],
    relationship: ['관계·연애 흐름', '만남이나 관계의 성공을 예측하는 그래프가 아닙니다. 이 대운 흐름에서 약속과 부담을 조정하는 위치를 읽습니다.', '현재는 상대의 마음을 추측하기보다 시간·비용·역할 중 조정할 한 가지를 먼저 정해 보세요.'],
  };

  const renderDomainFlow = (key) => {
    const [title, intro, currentAction] = domainFlowProfiles[key];
    const flow = element('figure', 'review-domain-flow');
    flow.dataset.domainFlow = key;
    flow.append(element('figcaption', 'review-domain-flow-title', title), element('p', 'review-domain-flow-intro', intro));
    const plot = element('div', 'review-domain-flow-plot');
    plot.setAttribute('role', 'img');
    plot.setAttribute('aria-label', `${title}. 현재 46세부터 55세는 조건을 살피고 속도를 조절하는 위치입니다.`);
    const svg = svgElement('svg', { class: 'review-domain-flow-svg', viewBox: '0 0 340 116', 'aria-hidden': 'true', focusable: 'false' });
    const levels = { 3: 22, 2: 52, 1: 82 };
    [[22, '힘을 쓰기 쉬움'], [52, '기준을 정리'], [82, '조건을 살피기']].forEach(([y, label]) => {
      svg.append(svgElement('line', { class: 'review-domain-flow-grid', x1: 58, x2: 334, y1: y, y2: y }), svgElement('text', { class: 'review-domain-flow-axis', x: 0, y: y + 4 }, label));
    });
    const points = lifeFlowProfile.flow.map(([age, level], index) => ({ age, x: 60 + (index * 30), y: levels[level] }));
    svg.append(svgElement('path', { class: 'review-domain-flow-line', d: points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ') }));
    points.forEach(({ age, x, y }) => {
      const current = age === '46~55세';
      svg.append(svgElement('circle', { class: current ? 'review-domain-flow-point is-current' : 'review-domain-flow-point', cx: x, cy: y, r: current ? 5.5 : 3 }));
      if (current) svg.append(svgElement('text', { class: 'review-domain-flow-current', x, y: 108, 'text-anchor': 'middle' }, '현재 46~55'));
    });
    plot.append(svg);
    const count = element('span', 'review-domain-flow-count', `사실 입력 0/${Object.keys(additionalContext[key]).length}`);
    count.dataset.domainFlowCount = '';
    const action = element('p', 'review-domain-flow-action', currentAction);
    const status = element('p', 'review-domain-flow-status', '이 그래프는 사주 원문 기반 흐름입니다. 현재 사실을 입력하면 해당 카드에서 함께 비교할 수 있습니다.');
    status.dataset.domainFlowStatus = '';
    flow.append(plot, count, action, status);
    return flow;
  };

  const renderVisual = (visual) => {
    const box = element('section', 'review-visual review-visual-' + visual.type);
    box.setAttribute('aria-label', visual.caption);
    box.append(element('p', 'review-visual-caption', visual.caption));
    if (visual.type === 'facts') {
      const list = element('div', 'review-facts');
      visual.items.forEach(([name, value, unit]) => {
        const fact = element('div', 'review-fact');
        fact.append(element('span', 'review-fact-name', name), element('strong', 'review-fact-value', value), element('span', 'review-fact-unit', unit));
        list.append(fact);
      });
      box.append(list);
    } else if (visual.type === 'steps') {
      const list = element('ol', 'review-steps');
      visual.items.forEach(([number, name, note]) => {
        const row = element('li', 'review-step');
        row.append(element('span', 'review-step-number', number), element('strong', '', name), element('span', '', note));
        list.append(row);
      });
      box.append(list);
    } else if (visual.type === 'columns') {
      const list = element('div', 'review-columns');
      visual.items.forEach(([name, note]) => {
        const column = element('div', 'review-column');
        column.append(element('strong', '', name), element('p', '', note));
        list.append(column);
      });
      box.append(list);
    } else if (visual.type === 'check') {
      const list = element('ul', 'review-checks');
      visual.items.forEach((note) => list.append(element('li', '', note)));
      box.append(list);
    } else if (visual.type === 'table') {
      const table = element('table', 'review-table');
      const head = element('thead');
      const headerRow = element('tr');
      visual.headers.forEach((name) => headerRow.append(element('th', '', name)));
      head.append(headerRow);
      const body = element('tbody');
      visual.rows.forEach((values, rowIndex) => {
        const row = element('tr');
        values.forEach((value, index) => {
          const cell = element(index === 0 ? 'th' : 'td', '', value);
          if (index === 0) cell.scope = 'row';
          cell.setAttribute('data-label', visual.headers[index]);
          const contextField = visual.contextBindings?.[rowIndex]?.[index];
          if (visual.context && contextField) {
            cell.dataset.contextValue = `${visual.context}.${contextField}`;
            cell.toggleAttribute('data-context-empty', true);
          }
          row.append(cell);
        });
        body.append(row);
      });
      table.append(head, body);
      box.append(table);
    }
    return box;
  };

  const makeTextBlock = (kind, label, text, focus) => {
    const block = element('section', 'reading-block ' + kind);
    block.setAttribute('aria-label', label);
    block.append(element('span', 'reading-role', label));
    const paragraph = element('p');
    if (focus) appendWithFocus(paragraph, text, focus);
    else paragraph.textContent = text;
    block.append(paragraph);
    return block;
  };

  const report = document.querySelector('#umsh-verified-reading');
  const summary = report?.querySelector('.umsh-summary');
  const readingCards = [...(report?.querySelectorAll('.reading-card') || [])];
  if (!summary || readingCards.length !== cards.length) return;

  const summaryBody = summary.querySelector('.umsh-summary-body');
  summaryBody.querySelector('.umsh-summary-eyebrow').after(element('p', 'review-summary-copy', '쉽게 말하면, 기준을 세우는 힘은 충분합니다. 결정을 서두르기보다 내가 지킬 기준과 상대가 요청한 조건을 나눠 보세요.'));
  const summaryLead = element('p', 'review-summary-lead', '지금 중요한 것은 더 많은 선택이 아니라, 확인한 조건을 분명히 말하는 일입니다.');
  summary.querySelector('.umsh-summary-figure').before(summaryLead);
  // 한눈에 보기 다음에서 현재 큰 흐름을 확인한다.
  summary.after(renderLifeFlowMap());

  const highlightContent = [
    ['타고난 강점을 쓰는 법', '기준을 세우는 힘을 일과 관계에서 쓸 수 있습니다. 지킬 약속과 조정할 약속을 나누면 힘을 덜 소모할 수 있습니다.'],
    ['지금의 큰 흐름', '리포트는 현재의 큰 흐름을 경진으로 표시합니다. 새 제안을 고를 때 역할·마감·보상 같은 실제 조건부터 확인해 보세요.'],
    ['반복되는 선택', '작은 양보가 쌓이기 전에 내가 맡을 수 있는 범위를 말해 보세요. 상대의 마음보다 약속의 내용을 확인하는 편이 분명합니다.'],
  ];
  report.querySelector('.umsh-highlights-title').textContent = '먼저 볼 내용';
  [...report.querySelectorAll('.umsh-highlight')].forEach((highlight, index) => {
    const body = highlight.querySelector('.umsh-highlight-body');
    highlight.querySelector('.umsh-highlight-title').textContent = highlightContent[index][0];
    body.prepend(element('p', 'review-highlight-copy', highlightContent[index][1]));
  });

  /* 같은 실제 조건을 쓰는 해석 카드에는 입력 패널을 반복하지 않는다. 첫 관련 카드의 표만 갱신한다. */
  const renderedContexts = new Set();
  const renderedDomainFlows = new Set();

  readingCards.forEach((card, index) => {
    const copy = cards[index];
    const title = card.querySelector('summary');
    const originalTitle = title.textContent;
    title.textContent = copy.title;
    title.setAttribute('data-original-title', originalTitle);
    const lead = element('p', 'review-lead');
    lead.append(element('strong', '', copy.lead));
    const image = card.querySelector('.story-image');
    image.before(lead);
    const evidence = makeTextBlock('reading-evidence review-evidence', '쉬운 풀이·보강', copy.evidence, copy.focus);
    const action = makeTextBlock('reading-action review-action', '추가로 확인할 것', copy.action);
    const actionParagraph = action.querySelector('p');
    const actionAt = copy.action.indexOf(actionFocus[index]);
    if (actionAt >= 0) {
      actionParagraph.replaceChildren(
        document.createTextNode(copy.action.slice(0, actionAt)),
        element('span', 'review-action-underline', actionFocus[index]),
        document.createTextNode(copy.action.slice(actionAt + actionFocus[index].length)),
      );
    }
    const originalAnswer = card.querySelector(':scope > .reading-answer');
    const originalEvidence = card.querySelector(':scope > .reading-evidence');
    const originalAction = card.querySelector(':scope > .reading-action');
    if (index === 1) {
      originalEvidence.querySelector('.reading-subhead:last-child')?.after(element('p', '', '실제 판단 기준은 두 가지입니다. 요청의 마감과 내가 맡을 범위를 알면 답할 수 있습니다. 둘 중 하나라도 비어 있다면 그 조건을 먼저 물어보세요.'));
    }
    if (extensions[index].length) {
      const more = element('section', 'reading-block review-extension');
      more.setAttribute('aria-label', '생활에서 풀어보기');
      more.append(element('span', 'reading-role', '생활에서 풀어보기'));
      extensions[index].forEach((paragraph) => more.append(element('p', '', paragraph)));
      if (followups[index + 1]) more.append(element('p', '', followups[index + 1]));
      originalEvidence.after(more);
    }
    const visual = renderVisual(copy.visual);
    originalAnswer.after(visual);
    let domainFlow;
    if (copy.context && domainFlowProfiles[copy.context] && !renderedDomainFlows.has(copy.context)) {
      domainFlow = renderDomainFlow(copy.context);
      visual.after(domainFlow);
      renderedDomainFlows.add(copy.context);
    }
    if (copy.context && !renderedContexts.has(copy.context)) {
      (domainFlow || visual).after(renderAdditionalContext(copy.context, index + 1));
      renderedContexts.add(copy.context);
    }
    originalEvidence.after(evidence);
    originalAction.after(action);
  });

  Object.keys(additionalContext).forEach(updateAdditionalContext);

})();
