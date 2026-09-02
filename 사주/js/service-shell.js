(() => {
  const topHost = document.querySelector('[data-umsh-service-top]');
  const bottomHost = document.querySelector('[data-umsh-service-bottom]');
  if (!topHost && !bottomHost) return;

  document.body.classList.add('has-umsh-service-shell');
  if (document.querySelector('.chat-input')) {
    document.body.classList.add('has-service-fixed-bottom', 'has-chat-fixed-bottom');
  }
  if (document.querySelector('body > .bottom-nav[aria-label="상세 이동과 상담"]')) {
    document.body.classList.add('has-service-fixed-bottom', 'has-detail-fixed-bottom');
  }
  const activeCategory = topHost?.dataset.umshServiceCategory || document.body.dataset.umshServiceCategory || '풍수';

  const categories = [
    ['all', '전체'],
    ['종합', '종합'],
    ['재물', '재물'],
    ['연애', '연애'],
    ['궁합', '궁합'],
    ['직업', '직업'],
    ['흐름', '흐름'],
    ['풍수', '풍수'],
  ];

  const menuItems = {
    home: {
      eyebrow: 'HOME',
      title: '홈',
      desc: '운명상회 첫 화면과 대표 상품으로 이동합니다.',
      items: [
        { label: '홈 맨 위', meta: '처음 화면으로 이동', href: '/', status: '이동' },
        { label: '대표 상품 보기', meta: '천명대공과 추천 상품', href: '/#services', status: '보기' },
        { label: '집 풍수 이어보기', meta: '지금 사는 집 풀이 화면', href: '/place/home', status: '풍수' },
        { label: '오늘운 무료 보기', meta: '회원가입 후 오늘 흐름 확인', href: '/signup?entry=today', status: '무료' },
      ],
    },
    destiny: {
      eyebrow: 'LOCKED RECORD',
      title: '운명록',
      desc: '개인 사주의 원국, 신살·길성, 합충, 대운 흐름을 모아 보는 메뉴입니다.',
      items: [
        { label: '운명록 열기', meta: '로그인·사주등록 후 열람', href: '/destiny', status: '열기' },
        { label: '사주 등록하기', meta: '기본 사주 프로필 저장', href: '/signup?entry=destiny', status: '등록' },
      ],
    },
    search: {
      eyebrow: 'SEARCH',
      title: '검색',
      desc: '궁금한 주제나 상품 분류로 빠르게 좁혀보세요.',
      items: [
        { label: '전체 상품', meta: '모든 운세 메뉴 보기', href: '/', status: '전체' },
        { label: '종합사주', meta: '내 인생 전체 흐름', href: '/cmdg/', status: '49,900원' },
        { label: '연애', meta: '도화와 관계 타이밍', href: '/love/this-year', status: '보기' },
        { label: '풍수', meta: '집과 공간의 기운', href: '/place/home', status: '보기' },
      ],
    },
    vault: {
      eyebrow: 'VAULT',
      title: '보관함',
      desc: '저장한 풀이와 상담 기록을 다시 여는 곳입니다.',
      items: [
        { label: '풀이 보관함 열기', meta: '저장된 리포트 목록 보기', href: '/cmdg/#vault', status: '열기' },
        { label: '새 사주 저장하기', meta: '새 풀이를 만들고 보관함에 저장', href: '/cmdg/#name', status: '입력' },
      ],
    },
    account: {
      eyebrow: 'MY',
      title: 'MY',
      desc: '로그인과 사주등록을 마친 뒤 내 사주 프로필을 관리합니다.',
      items: [
        { label: '로그인 / 회원가입', meta: '카카오, 네이버, 구글로 계속하기', href: '/signup?entry=my', status: '로그인' },
        { label: '내 사주 프로필', meta: '오늘운과 질문에 쓰는 기본 정보', href: '/signup?entry=my', status: '관리' },
        { label: '고객센터', meta: '문의와 환불·취소 정책 확인', href: '/support', status: '문의' },
      ],
    },
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function showToast(message) {
    let toast = document.querySelector('.umsh-service-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'umsh-service-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 1700);
  }

  function navigate(href) {
    if (!href) return;
    window.location.assign(new URL(href, window.location.href).href);
  }

  function topMarkup() {
    const categoryButtons = categories.map(([value, label]) => {
      const active = value === activeCategory ? ' is-active' : '';
      return `<button class="chip${active}" type="button" data-shell-category="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
    }).join('');

    return `
      <div class="umsh-service-shell" aria-label="운명상회 공통 상단">
        <header class="appbar">
          <a class="app-brand" href="/" aria-label="운명상회 홈">
            <img src="/assets/umsh-brand-logo.png" alt="운명상회" />
          </a>
          <div class="app-actions">
            <button class="circle-button" type="button" data-shell-action="focus-services" aria-label="대표 상품으로 이동">✎</button>
            <button class="circle-button" type="button" data-shell-action="toggle-menu" aria-label="빠른 메뉴 열기" aria-expanded="false">☰</button>
          </div>
        </header>

        <div class="action-panel" id="serviceActionPanel" aria-hidden="true">
          <div class="action-sheet" role="dialog" aria-label="운명상회 빠른 메뉴">
            <button type="button" data-shell-menu-filter="종합"><strong>종합사주</strong><span>천명대공 바로 보기</span></button>
            <button type="button" data-shell-menu-shortcut="destiny"><strong>운명록</strong><span>로그인·사주등록 후 열람</span></button>
            <button type="button" data-shell-menu-shortcut="search"><strong>검색</strong><span>주제별 상품 빠르게 찾기</span></button>
            <button type="button" data-shell-menu-shortcut="vault"><strong>보관함</strong><span>등록 후 저장한 풀이 열기</span></button>
            <button type="button" data-shell-menu-shortcut="account"><strong>MY</strong><span>내 계정과 사주 프로필</span></button>
            <button type="button" data-shell-action="close-menu"><strong>닫기</strong><span>상회로 돌아가기</span></button>
          </div>
        </div>

        <nav class="category-rail" aria-label="상품 분류">
          ${categoryButtons}
        </nav>
      </div>
    `;
  }

  function bottomMenuItemMarkup(item, index) {
    return `
      <button class="bottom-menu-item" type="button" data-bottom-menu-item="${index}" data-href="${escapeHtml(item.href || '')}">
        <span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.meta)}</small>
        </span>
        <em>${escapeHtml(item.status || '보기')}</em>
      </button>
    `;
  }

  function renderBottomMenu(menuId) {
    const menu = menuItems[menuId] || menuItems.home;
    const eyebrow = document.querySelector('#serviceBottomMenuEyebrow');
    const title = document.querySelector('#serviceBottomMenuTitle');
    const desc = document.querySelector('#serviceBottomMenuDesc');
    const list = document.querySelector('[data-service-bottom-menu-list]');
    if (!eyebrow || !title || !desc || !list) return;

    eyebrow.textContent = menu.eyebrow;
    title.textContent = menu.title;
    desc.textContent = menu.desc;
    list.innerHTML = menu.items.map(bottomMenuItemMarkup).join('');
  }

  function bottomMarkup() {
    return `
      <div class="umsh-service-bottom" aria-label="운명상회 공통 하단">
        <div class="bottom-menu-panel" id="serviceBottomMenuPanel" aria-hidden="true">
          <section class="bottom-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="serviceBottomMenuTitle" aria-describedby="serviceBottomMenuDesc">
            <div class="bottom-menu-head">
              <div>
                <span id="serviceBottomMenuEyebrow">MENU</span>
                <strong id="serviceBottomMenuTitle">메뉴</strong>
                <p id="serviceBottomMenuDesc">필요한 운세 메뉴를 고르세요.</p>
              </div>
              <button class="bottom-menu-close" type="button" data-shell-action="close-bottom-menu" aria-label="하단 메뉴 닫기">닫기</button>
            </div>
            <div class="bottom-menu-list" data-service-bottom-menu-list></div>
          </section>
        </div>

        <footer class="bottom-nav" aria-label="주요 메뉴">
          <button class="is-active" type="button" data-shell-bottom-menu="home" aria-controls="serviceBottomMenuPanel" aria-expanded="false"><span class="tab-label">홈</span></button>
          <button type="button" data-shell-bottom-menu="destiny" aria-controls="serviceBottomMenuPanel" aria-expanded="false"><span class="tab-label">운명록</span></button>
          <button type="button" data-shell-bottom-menu="search" aria-controls="serviceBottomMenuPanel" aria-expanded="false"><span class="tab-label">검색</span></button>
          <button type="button" data-shell-bottom-menu="vault" aria-controls="serviceBottomMenuPanel" aria-expanded="false"><span class="tab-label">보관함</span></button>
          <button type="button" data-shell-bottom-menu="account" aria-controls="serviceBottomMenuPanel" aria-expanded="false"><span class="tab-label">MY</span></button>
        </footer>
      </div>
    `;
  }

  function setTopMenuOpen(isOpen) {
    document.body.classList.toggle('is-umsh-top-menu-open', Boolean(isOpen));
    document.querySelector('[data-shell-action="toggle-menu"]')?.setAttribute('aria-expanded', String(Boolean(isOpen)));
    document.querySelector('#serviceActionPanel')?.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) setBottomMenuOpen(false);
  }

  function setBottomMenuOpen(isOpen, menuId = 'home') {
    document.body.classList.toggle('is-umsh-bottom-menu-open', Boolean(isOpen));
    document.querySelector('#serviceBottomMenuPanel')?.setAttribute('aria-hidden', String(!isOpen));
    document.querySelectorAll('[data-shell-bottom-menu]').forEach((button) => {
      const active = button.dataset.shellBottomMenu === menuId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(Boolean(isOpen && active)));
    });
    if (isOpen) {
      setTopMenuOpen(false);
      renderBottomMenu(menuId);
    }
  }

  if (topHost) topHost.innerHTML = topMarkup();
  if (bottomHost) bottomHost.innerHTML = bottomMarkup();
  renderBottomMenu('home');

  document.addEventListener('click', (event) => {
    const shellAction = event.target.closest?.('[data-shell-action]');
    if (shellAction) {
      const action = shellAction.dataset.shellAction;
      if (action === 'toggle-menu') setTopMenuOpen(!document.body.classList.contains('is-umsh-top-menu-open'));
      if (action === 'close-menu') setTopMenuOpen(false);
      if (action === 'close-bottom-menu') setBottomMenuOpen(false);
      if (action === 'focus-services') navigate('/#services');
      return;
    }

    const category = event.target.closest?.('[data-shell-category], [data-shell-menu-filter]');
    if (category) {
      const value = category.dataset.shellCategory || category.dataset.shellMenuFilter || 'all';
      if (value === '풍수') {
        navigate('/place/home');
        return;
      }
      navigate(value === 'all' ? '/' : `/?category=${encodeURIComponent(value)}#services`);
      return;
    }

    const shortcut = event.target.closest?.('[data-shell-menu-shortcut]');
    if (shortcut) {
      const id = shortcut.dataset.shellMenuShortcut || 'home';
      setBottomMenuOpen(true, id);
      return;
    }

    const bottomButton = event.target.closest?.('[data-shell-bottom-menu]');
    if (bottomButton) {
      setBottomMenuOpen(true, bottomButton.dataset.shellBottomMenu || 'home');
      return;
    }

    const bottomItem = event.target.closest?.('[data-bottom-menu-item]');
    if (bottomItem) {
      navigate(bottomItem.dataset.href || '/');
      return;
    }

    if (event.target.id === 'serviceActionPanel') setTopMenuOpen(false);
    if (event.target.id === 'serviceBottomMenuPanel') setBottomMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setTopMenuOpen(false);
    setBottomMenuOpen(false);
  });

  showToast.ready = true;
})();
