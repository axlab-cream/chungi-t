(() => {
  /**
   * 공용 로딩 오버레이 주입. 이 모듈은 아래에서 서비스 셸 호스트가 없으면 조기 반환하므로,
   * 주입은 그 판단보다 먼저 해야 전 서비스가 같은 로딩 화면을 쓴다.
   * (2026-09-14 통일: 이전에는 report-view.html 한 곳에서만 로드됐다.)
   */
  if (typeof document !== 'undefined' && !window.UMSHLoading
      && !document.querySelector('script[src*="umsh-loading.js"]')) {
    const loadingScript = document.createElement('script');
    loadingScript.src = '/js/umsh-loading.js';
    loadingScript.async = false;
    (document.head || document.documentElement).appendChild(loadingScript);
  }

  /**
   * 상단 뒤로 가기 경로(2026-10-08).
   *
   * 예전에는 버튼이 무조건 홈으로 갔다. 마이페이지 → 결제 내역에서 뒤로 가면 홈으로 떨어졌다.
   * 이제 같은 탭에서 지나온 화면을 sessionStorage 에 쌓아 두고 바로 앞 화면으로 돌아간다.
   *
   * - 화면이 열릴 때 기록한다. 바로 앞 화면으로 다시 열렸으면(뒤로 간 것) 맨 위를 뺀다.
   * - 로그인·결제 진행 화면은 거쳐 가는 곳이라 기록하지 않는다. 결제 결과에서 뒤로 가도
   *   결제창이 아니라 결제를 시작한 서비스 화면으로 간다.
   * - 앞 화면을 모르면(공유 링크·푸시·즐겨찾기로 바로 들어옴, 저장소를 못 씀) 상위 화면으로
   *   간다: 마이페이지에서 들어가는 화면은 마이페이지, 나머지는 홈.
   */
  const BACK_TRAIL_KEY = 'umsh-back-trail';
  const BACK_TRAIL_MAX = 20;
  const BACK_TRAIL_SKIP = [/^\/signup(\/|$)/, /^\/login(\/|$)/, /^\/auth(\/|$)/, /^\/payment(\/|$)/];
  const MY_CHILD_PATHS = new Set(['/profile', '/vault', '/destiny', '/coupons', '/orders', '/refunds', '/notices', '/inquiries', '/faq', '/support', '/about', '/terms', '/privacy', '/refund', '/leave']);

  function createBackTrail(storage) {
    const pathKey = (pathname) => {
      const clean = String(pathname || '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '');
      return clean || '/';
    };
    const keyOf = (loc) => pathKey(loc.pathname) + (loc.search || '');
    const skipped = (loc) => BACK_TRAIL_SKIP.some((pattern) => pattern.test(pathKey(loc.pathname)));
    const parentOf = (loc) => (MY_CHILD_PATHS.has(pathKey(loc.pathname)) ? '/my' : '/');
    function read() {
      try {
        const value = JSON.parse(storage.getItem(BACK_TRAIL_KEY) || '[]');
        return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.startsWith('/')) : [];
      } catch (error) {
        return null;
      }
    }
    function write(list) {
      try { storage.setItem(BACK_TRAIL_KEY, JSON.stringify(list.slice(-BACK_TRAIL_MAX))); } catch (error) { /* 저장소를 못 쓰면 상위 화면 규칙만 쓴다. */ }
    }
    return {
      keyOf,
      parentOf,
      record(loc) {
        if (skipped(loc)) return;
        const list = read();
        if (!list) return;
        const here = keyOf(loc);
        if (list[list.length - 1] === here) return; // 새로고침
        if (list[list.length - 2] === here) list.pop(); // 뒤로 돌아옴
        else list.push(here);
        write(list);
      },
      target(loc) {
        const list = read();
        const here = keyOf(loc);
        if (!list || !list.length) return parentOf(loc);
        const last = list[list.length - 1];
        if (last !== here) return last; // 지금 화면이 거쳐 가는 화면이라 기록되지 않았다.
        return list.length >= 2 ? list[list.length - 2] : parentOf(loc);
      },
    };
  }

  let sessionStore = null;
  try { sessionStore = window.sessionStorage; } catch (error) { sessionStore = null; }
  const backTrail = createBackTrail(sessionStore || { getItem() { return null; }, setItem() {} });
  window.UMSHBackTrail = { create: createBackTrail, current: backTrail };

  const topHost = document.querySelector('[data-umsh-service-top]');
  const bottomHost = document.querySelector('[data-umsh-service-bottom]');
  if (!topHost && !bottomHost) return;

  backTrail.record(window.location);

  /**
   * 본문 뒤로 가기(2026-10-08 요청). 마이페이지 하위 화면처럼 본문 틀(.payment-shell)을 쓰는 화면은
   * 뒤로 가기를 헤더가 아니라 본문 맨 위(제목 위)에 둔다 — "이 화면에서 뒤로 간다"는 느낌을 주려고.
   * 그 화면에서는 헤더의 뒤로 버튼을 숨긴다. 버튼 이름은 돌아갈 곳을 말한다.
   * 마이페이지 자체는 하단 탭의 첫 화면이라 넣지 않는다.
   */
  function mountInlineBack() {
    const shell = document.querySelector('main .payment-shell');
    if (!shell || shell.querySelector('[data-inline-back]')) return;
    if (backTrail.keyOf({ pathname: window.location.pathname, search: '' }) === '/my') return;
    const target = backTrail.target(window.location);
    const label = target === '/my' ? '마이페이지' : target === '/' ? '홈' : '이전 화면';
    const link = document.createElement('a');
    link.className = 'umsh-inline-back';
    link.href = target;
    link.setAttribute('data-inline-back', '');
    link.setAttribute('aria-label', { 마이페이지: '마이페이지로 돌아가기', 홈: '홈으로 돌아가기' }[label] || '이전 화면으로 돌아가기');
    link.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const text = document.createElement('span');
    text.textContent = label;
    link.appendChild(text);
    shell.insertBefore(link, shell.firstChild);
    document.body.classList.add('has-inline-back');
  }
  mountInlineBack();
  // 브라우저가 이전 화면을 메모리에서 그대로 되살리면(bfcache) 스크립트가 다시 돌지 않는다.
  window.addEventListener('pageshow', (event) => { if (event.persisted) backTrail.record(window.location); });

  document.body.classList.add('has-umsh-service-shell');
  if (document.querySelector('.chat-input')) {
    document.body.classList.add('has-service-fixed-bottom', 'has-chat-fixed-bottom');
  }
  if (document.querySelector('body > .bottom-nav[aria-label="상세 이동과 상담"]')) {
    document.body.classList.add('has-service-fixed-bottom', 'has-detail-fixed-bottom');
  }
  const activeCategory = topHost?.dataset.umshServiceCategory || document.body.dataset.umshServiceCategory || 'all';

  /**
   * Pages do not agree on one column width: most sit at 430px, 집풍수 at 440px and
   * 이직운 at 480px. The fixed bottom menu and the overlay panels are centred on
   * --shell-width, so hardcoding it left the page bleeding past the GNB edges on
   * the wider services. Measure the column the top mount lives in instead.
   */
  function syncShellWidth() {
    const column = topHost?.parentElement
      || document.querySelector('body > .page, body > .app, body > .phone, main.stage');
    const width = Math.round(column?.getBoundingClientRect().width || 0);
    if (width > 0) document.documentElement.style.setProperty('--umsh-page-width', `${width}px`);
  }

  syncShellWidth();
  window.addEventListener('resize', syncShellWidth);

  /**
   * The consultation pages (합격운, 연애, 결혼궁합, 직업운 ...) used to draw their own
   * appbar so they could show a back button and the service name with its price.
   * The shell renders both now, which lets those pages share this one chrome
   * instead of keeping a second look-alike of it.
   */
  const serviceName = topHost?.dataset.umshServiceName?.trim() || '';
  const servicePrice = topHost?.dataset.umshServicePrice?.trim() || '';
  const showBack = topHost?.hasAttribute('data-umsh-service-back') || false;
  const activeTab = topHost?.dataset.umshServiceActive?.trim() || 'home';

  /** Bottom tabs, kept in the same order the 하단 메뉴 has always used. */
  const bottomTabs = [
    ['home', '홈'],
    ['destiny', '운명록'],
    ['search', '검색'],
    ['vault', '보관함'],
    ['account', 'MY'],
  ];

  const categories = [
    ['all', '전체'],
    ['종합', '종합'],
    ['재물', '재물'],
    ['연애', '연애'],
    ['궁합', '궁합'],
    ['직업', '직업'],
    ['흐름', '흐름'],
    // 풍수 숨김: 포털 카드와 같이 접는다. 카드와 함께 다시 여세요.
    // ['풍수', '풍수'],
  ];

  const menuItems = {
    home: {
      eyebrow: 'HOME',
      title: '홈',
      desc: '운명상회 첫 화면과 대표 상품으로 이동합니다.',
      items: [
        { label: '홈 맨 위', meta: '처음 화면으로 이동', href: '/', status: '이동' },
        { label: '대표 상품 보기', meta: '천명사주와 추천 상품', href: '/#services', status: '보기' },
        { label: '오늘운 무료 보기', meta: '일진과 오늘 흐름 확인', href: '/today/free', status: '무료' },
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
        { label: '직업', meta: '일과 적성의 방향', href: '/work/job-choice', status: '보기' },
      ],
    },
    vault: {
      eyebrow: 'VAULT',
      title: '보관함',
      desc: '저장한 풀이와 상담 기록을 다시 여는 곳입니다.',
      items: [
        { label: '풀이 보관함 열기', meta: '저장된 리포트 목록 보기', href: '/vault', status: '열기' },
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

  /**
   * Where each bottom tab goes. 검색과 보관함은 비로그인도 들어올 수 있고, 운명록과 MY는
   * 로그인이 필요하다 — 로그인 화면으로 보낼 때 돌아올 자리를 같이 넘겨서, 로그인 뒤에
   * 누르려던 화면으로 이어지게 한다.
   */
  const navTargets = {
    home: { href: '/', entry: '' },
    destiny: { href: '/destiny', entry: 'destiny', requiresLogin: true },
    search: { href: '/search', entry: '' },
    vault: { href: '/vault', entry: '' },
    account: { href: '/my', entry: 'my', requiresLogin: false },
  };

  function loginHref(entry, returnTo) {
    return (window.UMSHCommonAuth && window.UMSHCommonAuth.commonLoginUrl(entry, returnTo))
      || `/signup?entry=${encodeURIComponent(entry)}&returnTo=${encodeURIComponent(returnTo)}#login`;
  }

  /**
   * Resolves to true only when a live session is readable here. Pages that never load
   * supabase get `null` back and are sent to the destination itself, which carries its
   * own gate — better than bouncing a signed-in visitor through a login screen.
   */
  async function hasSession() {
    if (!window.supabase || !window.UMSHAuthSession) return null;
    try {
      const config = await fetch('/api/auth/config').then((response) => response.json());
      if (!config || !config.enabled) return null;
      const client = window.UMSHAuthSession.createClient(window.supabase, config.url, config.publishableKey);
      const { data } = await client.auth.getSession();
      const session = await window.UMSHAuthSession.enforceDeviceAuthSession(data.session, client);
      return Boolean(session && session.access_token);
    } catch (error) {
      return null;
    }
  }

  async function goToTab(tabId) {
    const target = navTargets[tabId] || navTargets.home;
    if (!target.requiresLogin) {
      navigate(target.href);
      return;
    }
    const signedIn = await hasSession();
    navigate(signedIn === false ? loginHref(target.entry, target.href) : target.href);
  }

  /**
   * The top bar mirrors the /love/this-year sample exactly: the logo on the left, and
   * the back and menu buttons on the right. No category rail and no service/price line,
   * so every service page carries the same GNB the sample established.
   *
   * `data-back` and the two legacy class names stay on the back button because pages
   * still look it up through `.umsh-chrome-appbar [data-back]`; the shell owns the click
   * itself now (see the capture listener below), which is what makes it go home.
   */
  function topMarkup() {
    return `
      <div class="umsh-service-shell" aria-label="운명상회 공통 상단">
        <header class="appbar topbar umsh-chrome-appbar">
          <a class="app-brand topbar-brand-logo umsh-service-logo" href="/" aria-label="운명상회 홈">
            <img src="/assets/umsh-brand-logo.png" alt="운명상회" />
          </a>
          <div class="app-actions topbar-actions">
            <button class="app-back umsh-chrome-back icon-button" type="button" data-back data-shell-back aria-label="뒤로 가기">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="topbar-vault-button" type="button" data-shell-bottom-menu="vault" aria-controls="serviceBottomMenuPanel" aria-expanded="false" aria-label="보관함 열기">
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </header>
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
          ${bottomTabs.map(([id, label]) => {
            const active = id === activeTab ? ' class="is-active"' : '';
            return `<button${active} type="button" data-shell-nav="${id}"><span class="tab-label">${escapeHtml(label)}</span></button>`;
          }).join('')}
        </footer>
      </div>
    `;
  }

  function setBottomMenuOpen(isOpen, menuId = 'home') {
    document.body.classList.toggle('is-umsh-bottom-menu-open', Boolean(isOpen));
    document.querySelector('#serviceBottomMenuPanel')?.setAttribute('aria-hidden', String(!isOpen));
    document.querySelectorAll('[data-shell-bottom-menu]').forEach((button) => {
      const active = button.dataset.shellBottomMenu === menuId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(Boolean(isOpen && active)));
    });
    if (isOpen) renderBottomMenu(menuId);
  }

  if (topHost) topHost.innerHTML = topMarkup();
  if (bottomHost) bottomHost.innerHTML = bottomMarkup();
  renderBottomMenu(activeTab);
  setBottomMenuOpen(false);

  /**
   * The shell's back button follows the trail above. It runs in the capture phase on purpose:
   * several pages still listen for `[data-back]` and call `history.back()`, which on a page
   * opened from a link or a redirect either did nothing or bounced somewhere unrelated.
   *
   * 바로 앞 화면이 브라우저 기록의 직전 화면과 같으면 history.back() 으로 돌아간다 — 스크롤 위치가
   * 남고, 폰의 뒤로 가기 버튼과 같은 기록을 쓴다. 다르면(로그인·결제를 거쳐 왔거나 바로 들어옴)
   * 그 주소로 이동한다.
   */
  document.addEventListener('click', (event) => {
    const shellBack = event.target.closest?.('[data-shell-back], [data-inline-back]');
    if (!shellBack) return;
    event.preventDefault();
    event.stopPropagation();
    const target = backTrail.target(window.location);
    let previous = null;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin === window.location.origin) previous = backTrail.keyOf(referrer);
    } catch (error) { previous = null; }
    if (previous === target && window.history.length > 1) window.history.back();
    else navigate(target);
  }, true);

  document.addEventListener('click', (event) => {
    const shellAction = event.target.closest?.('[data-shell-action]');
    if (shellAction) {
      const action = shellAction.dataset.shellAction;
      if (action === 'close-bottom-menu') setBottomMenuOpen(false);
      return;
    }

    const category = event.target.closest?.('[data-shell-category]');
    if (category) {
      const value = category.dataset.shellCategory || 'all';
      if (value === '풍수') {
        navigate('/place/home');
        return;
      }
      navigate(value === 'all' ? '/' : `/?category=${encodeURIComponent(value)}#services`);
      return;
    }

    const navButton = event.target.closest?.('[data-shell-nav]');
    if (navButton) {
      goToTab(navButton.dataset.shellNav || 'home');
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

    if (event.target.id === 'serviceBottomMenuPanel') setBottomMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setBottomMenuOpen(false);
  });

  showToast.ready = true;
})();
