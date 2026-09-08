(function () {
  const form = document.querySelector('[data-wedding-form]');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const required = Array.from(form.querySelectorAll('[required]'));
      const missing = required.find((field) => !field.value);
      const status = document.querySelector('[data-form-status]');
      if (missing) {
        missing.focus();
        if (status) status.textContent = '필수 항목을 채우면 다음 화면으로 이어갈 수 있어요.';
        return;
      }
      sessionStorage.setItem('umsh_wedding_day_schema', 'wedding-day-v1');
      window.location.href = '../04-step-4-report/index.html#step-4-report';
    });
  }

  const detailRoot = document.querySelector('[data-detail-root]');
  if (!detailRoot) return;

  const sections = [
    { id: 1, title: '이 날, 괜찮아?', subtitle: '후보일 판정', conclusion: '후보일은 좋고 나쁨으로 가르기보다 두 분의 조건에 얼마나 맞는지로 읽습니다.', evidence: 'date.wedding.meaning / date.wedding.good_condition / date.wedding.avoid_condition', body: '달력에서 많이 고르는 날이어도 두 사람의 일정, 예식 형태, 준비 여유가 함께 맞아야 실제로 편하게 쓸 수 있습니다. 이 항목은 후보일마다 맞는 조건과 걸리는 조건을 나누어 보여줍니다.', action: '후보일마다 포기하기 어려운 조건을 하나씩 표시해 두세요.' },
    { id: 2, title: '나한테도 좋은 날이야?', subtitle: '두 사람 기준 개인화', conclusion: '남에게 무난한 날이 두 분에게도 같은 의미로 읽히지는 않습니다.', evidence: 'date.wedding.personalize / couple.flow.monthly', body: '두 사람의 생년월일시와 월간 흐름을 함께 놓고, 어느 쪽의 리듬을 더 보호해야 하는지 살핍니다. 한쪽에게만 무리하게 기울지 않는 구간을 우선 봅니다.', action: '두 사람 중 일정 스트레스가 큰 쪽의 준비 리듬을 먼저 적어두세요.' },
    { id: 3, title: '더 나은 날 없어?', subtitle: '같은 달과 다음 달 비교', conclusion: '더 나은 날은 멀리 미루는 뜻이 아니라 조건이 더 잘 맞는 구간을 찾는 과정입니다.', evidence: 'date.rule.shared / monthly.flow.window', body: '같은 달 안에서 조정 가능한 구간, 다음 달까지 넓혔을 때 부담이 줄어드는 구간, 예식장 잡기 전에 확인할 순서를 따로 봅니다.', action: '예식장 가능일과 양가 가능일을 분리해서 후보군을 다시 묶어보세요.' },
    { id: 4, title: '그날 전에 뭐 챙겨?', subtitle: '준비와 알림 순서', conclusion: '날짜를 고른 뒤에는 그날 전까지 정리할 순서가 더 중요해집니다.', evidence: 'purpose.wedding.prepare / relationship.order', body: '미리 챙길 것, 정리해 둘 것, 양가에 알릴 순서를 나누면 날짜 하나 때문에 생기는 부담을 줄일 수 있습니다.', action: '양가에 공유할 기준 문장을 짧게 정리해 두세요.' },
    { id: 5, title: '당일엔 이렇게', subtitle: '시간대와 동선', conclusion: '당일 흐름은 완벽함보다 덜 흔들리는 시간대와 동선으로 봅니다.', evidence: 'purpose.wedding.day / time.path.condition', body: '시간대, 동선, 컨디션, 그날 덜 하는 편이 나은 일을 나누어 읽습니다. 당일의 분위기가 무리하게 흐트러지지 않는 선택을 우선합니다.', action: '당일 아침부터 식장 도착까지 이동 순서를 한 번만 더 줄여보세요.' },
    { id: 6, title: '그 뒤는 어떻게 흘러?', subtitle: '시작 이후의 정리', conclusion: '결혼 이후를 단정하지 않고, 시작 직후 정리해야 할 리듬만 봅니다.', evidence: 'purpose.wedding.after / relationship.money.finish', body: '신혼 시작 흐름, 양가 관계, 혼수와 비용 마무리를 현실적인 체크 항목으로 정리합니다. 부정적인 사건을 예언하지 않고 관리할 순서를 제안합니다.', action: '식 이후 첫 달에 정리할 돈과 가족 연락 일정을 따로 나눠 적어두세요.' }
  ];
  const params = new URLSearchParams(window.location.search);
  let id = Number(params.get('section') || '1');
  if (!sections.some((s) => s.id === id)) id = 1;
  const current = sections.find((s) => s.id === id);
  const prev = id === 1 ? 6 : id - 1;
  const next = id === 6 ? 1 : id + 1;
  detailRoot.querySelector('[data-title]').textContent = current.title;
  detailRoot.querySelector('[data-subtitle]').textContent = current.subtitle;
  detailRoot.querySelector('[data-conclusion]').textContent = current.conclusion;
  detailRoot.querySelector('[data-evidence]').textContent = current.evidence;
  detailRoot.querySelector('[data-body]').textContent = current.body;
  detailRoot.querySelector('[data-action]').textContent = current.action;
  detailRoot.querySelector('[data-prev]').href = `index.html?section=${prev}#step-6_1-report`;
  detailRoot.querySelector('[data-next]').href = `index.html?section=${next}#step-6_1-report`;
})();

