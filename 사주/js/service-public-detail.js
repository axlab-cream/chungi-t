(function () {
  const details = {
    '/today/free': {
      eyebrow: 'TODAY · 무료',
      title: '스토리 페이지 제작중',
      summary: '오늘운 상세 스토리는 준비 중입니다.',
      pending: true,
      cta: '다음 · 오늘운 확인하기',
    },
    '/money/save': {
      eyebrow: 'MONEY · 소비성향',
      title: '돈은 들어오는데\n왜 남지 않을까?',
      summary: '재성, 비겁, 소비 습관을 겹쳐 돈이 새는 지점과 모아야 할 타이밍을 봅니다.',
      image: '/assets/umsh-money-card-bg.png',
      problem: '아끼겠다는 의지만으로는 반복되는 지출 패턴을 끊기 어렵습니다.',
      risk: '관계 비용, 충동 결제, 고정비 착시처럼 모르게 새는 돈의 흐름',
      chance: '줄일 지출과 써도 되는 지출을 나눠 목표 자금으로 연결하는 흐름',
      cta: '다음 · 내 소비성향 확인하기',
    },
    '/work/job': {
      eyebrow: 'WORK · 직업운',
      title: '지금 일이\n나랑 맞을까?',
      summary: '관성, 식상, 적성의 흐름으로 지금 일의 지속 가능성과 바꿔야 할 기준을 봅니다.',
      image: '/assets/umsh-work-card-bg.png',
      problem: '일이 힘든 건지, 내 운과 맞지 않는 방식으로 버티고 있는 건지 구분해야 합니다.',
      risk: '역할 불일치, 평가 피로, 성장 정체가 반복되는 구간',
      chance: '강점이 살아나는 업무 방식과 더 오래 버틸 수 있는 환경',
      cta: '다음 · 내 직업운 확인하기',
    },
    '/match/marry': {
      eyebrow: 'MATCH · 결혼궁합',
      title: '연애 말고\n결혼까지 가능?',
      summary: '배우자궁, 대운, 합충 흐름으로 두 사람이 오래 갈 수 있는 조건을 봅니다.',
      image: '/assets/umsh-match-card-bg.png',
      problem: '좋아하는 마음과 함께 살아갈 궁합은 다른 문제입니다.',
      risk: '결혼 뒤 부딪히기 쉬운 돈, 가족, 생활 리듬, 책임의 차이',
      chance: '서로를 지치게 하지 않는 역할 분담과 맞춰 가기 좋은 시기',
      cta: '다음 · 결혼궁합 확인하기',
    },
    '/match/couple': {
      eyebrow: 'MATCH · 커플궁합',
      title: '우리 둘,\n진짜 잘 맞아?',
      summary: '끌림, 갈등, 오래 가는 방식까지 두 사람의 사주를 나란히 놓고 봅니다.',
      image: '/assets/umsh-match-banner-visual.png',
      problem: '좋을 때의 끌림보다 싸운 뒤 회복 방식이 관계를 오래 결정합니다.',
      risk: '반복되는 말투, 거리감, 감정 속도 차이로 생기는 갈등',
      chance: '서로를 편하게 만드는 대화 방식과 관계가 안정되는 흐름',
      cta: '다음 · 커플궁합 확인하기',
    },
    '/love/mind': {
      eyebrow: 'LOVE · 상대방 마음',
      title: '그 사람도\n나를 생각할까?',
      summary: '현재 관계의 신호와 사주 흐름을 겹쳐 마음이 남아 있는지 봅니다.',
      image: '/assets/umsh-love-card-bg.webp',
      problem: '연락 한 번, 답장 속도 하나만으로 마음을 단정하면 흐름을 놓치기 쉽습니다.',
      risk: '혼자 기대하다가 타이밍을 놓치거나 관계의 선을 잘못 읽는 상황',
      chance: '상대가 열리는 순간과 내가 움직여도 되는 대화의 온도',
      cta: '다음 · 상대 마음 확인하기',
    },
    '/love/again': {
      eyebrow: 'LOVE · 재회운',
      title: '그 사람,\n다시 돌아올까?',
      summary: '세운, 궁합, 이별 뒤 관계 흐름으로 그리움과 재회 신호를 구분합니다.',
      image: '/assets/umsh-love-card-bg.webp',
      problem: '보고 싶다는 마음과 다시 만나도 되는 흐름은 따로 봐야 합니다.',
      risk: '같은 이유로 다시 멀어질 수 있는 말, 시기, 감정 패턴',
      chance: '연락해도 되는 타이밍과 관계를 다시 열 수 있는 단서',
      cta: '다음 · 재회운 확인하기',
    },
    '/love/spouse': {
      eyebrow: 'LOVE · 배우자운',
      title: '내가 결혼하게 될 사람',
      summary: '배우자궁과 인연의 흐름으로 오래 함께할 사람의 결을 살펴봅니다.',
      image: '/assets/umsh-love-card-bg.webp',
      problem: '막연한 이상형보다 실제로 오래 맞는 사람의 조건을 알아야 합니다.',
      risk: '끌리지만 생활과 책임에서 어긋날 수 있는 관계 패턴',
      chance: '내 배우자궁에 맞는 사람의 성향과 만나기 쉬운 흐름',
      cta: '다음 · 배우자운 확인하기',
    },
  };

  function normalizePath() {
    return location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function renderTitle(value) {
    return escapeHtml(value).replace(/\n/g, '<br />');
  }

  function render() {
    const root = document.querySelector('[data-service-public-detail]');
    if (!root || root.dataset.rendered === '1') return;

    const detail = details[normalizePath()];
    if (!detail) return;

    root.dataset.rendered = '1';
    if (detail.pending) {
      root.innerHTML = `
        <div class="service-story service-story-pending">
          <section class="service-story-card service-story-section service-story-empty">
            <span class="eyebrow">${escapeHtml(detail.eyebrow || 'STORY')}</span>
            <h2>${renderTitle(detail.title || '스토리 페이지 제작중')}</h2>
            <p>${escapeHtml(detail.summary || '상세 스토리는 준비 중입니다.')}</p>
          </section>

          <div class="service-story-cta">
            <button class="primary-cta" type="button" data-start-report>${escapeHtml(detail.cta || '다음')}</button>
            <p class="service-story-fineprint">다음 단계에서 로그인 상태를 확인합니다.</p>
          </div>
        </div>
      `;
      window.UMSHServiceSteps?.markStory();
      return;
    }
    root.innerHTML = `
      <div class="service-story">
        <section class="service-story-card">
          <div class="service-story-visual" style="background-image:url('${escapeHtml(detail.image)}')">
            <div class="service-story-copy">
              <span class="eyebrow">${escapeHtml(detail.eyebrow)}</span>
              <h2>${renderTitle(detail.title)}</h2>
              <p>${escapeHtml(detail.summary)}</p>
            </div>
          </div>
        </section>

        <section class="service-story-card service-story-section">
          <span class="eyebrow">PROBLEM</span>
          <h2>궁금한 건 하나지만,<br />판단해야 할 흐름은 여러 갈래입니다</h2>
          <p>${escapeHtml(detail.problem)}</p>
          <div class="service-story-list">
            <div class="service-story-item">지금 눈앞의 선택이 단기 감정인지 실제 흐름인지 구분합니다.</div>
            <div class="service-story-item">불리한 신호와 살릴 수 있는 기회를 함께 봅니다.</div>
            <div class="service-story-item">결정 전에 확인해야 할 질문을 현실적인 순서로 정리합니다.</div>
          </div>
        </section>

        <section class="service-story-card service-story-section">
          <span class="eyebrow">RISK · OPPORTUNITY</span>
          <h2>위험과 기회가 같이 보여야<br />다음 선택이 선명해집니다</h2>
          <table class="service-story-table" aria-label="상세 풀이 미리보기">
            <tbody>
              <tr><th>위험</th><td>${escapeHtml(detail.risk)}</td></tr>
              <tr><th>기회</th><td>${escapeHtml(detail.chance)}</td></tr>
              <tr><th>해답</th><td>내 사주와 현재 고민을 겹쳐 지금 확인해야 할 선택 기준을 제시합니다.</td></tr>
            </tbody>
          </table>
        </section>

        <div class="service-story-cta">
          <button class="primary-cta" type="button" data-start-report>${escapeHtml(detail.cta)}</button>
          <p class="service-story-fineprint">다음 단계에서 로그인 상태를 확인합니다. 로그인 전에도 상세 내용을 먼저 볼 수 있습니다.</p>
        </div>
      </div>
    `;
    window.UMSHServiceSteps?.markStory();
  }

  window.UMSHServiceDetail = { render };
})();
