(() => {
  if (location.hash === '#cmdg') {
    location.replace('/cmdg/');
    return;
  }

  const phone = document.querySelector('.phone');
  const scroller = document.querySelector('.phone-scroll');
  const actionPanel = document.querySelector('#actionPanel');
  const menuButton = document.querySelector('[data-action="toggle-menu"]');
  const bottomMenuPanel = document.querySelector('#bottomMenuPanel');
  const bottomMenuList = document.querySelector('[data-bottom-menu-list]');
  const bottomMenuTitle = document.querySelector('#bottomMenuTitle');
  const bottomMenuDesc = document.querySelector('#bottomMenuDesc');
  const bottomMenuEyebrow = document.querySelector('#bottomMenuEyebrow');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const serviceCards = Array.from(document.querySelectorAll('.service-card'));
  const pendingCards = Array.from(document.querySelectorAll('[data-soon], .is-soon'));
  const sectionBlocks = Array.from(document.querySelectorAll('.section-block'));
  const dragRails = Array.from(document.querySelectorAll('.poster-rail, .category-rail, .price-rail'));
  const mainPosterRail = document.querySelector('#services');
  const posterPageText = document.querySelector('[data-poster-page]');
  const liveLinks = Array.from(document.querySelectorAll('a.service-card[href]'));
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
  const menuFilterButtons = Array.from(document.querySelectorAll('[data-menu-filter]'));
  const menuShortcutButtons = Array.from(document.querySelectorAll('[data-menu-shortcut]'));
  const bottomMenuButtons = Array.from(document.querySelectorAll('[data-bottom-menu]'));
  const hoverTargets = Array.from(document.querySelectorAll('.poster, .product-card, .mini-row, .today-ticket, .tier'));
  const pressTargets = Array.from(document.querySelectorAll('button, a, .tier'));
  const toast = document.querySelector('#toast');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dragThreshold = 24;
  const AUTH_DEVICE_SESSION_KEY = 'cheongi_auth_device_session_started_at_v1';
  const AUTH_DEVICE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
  let toastTimer = 0;
  let activeBottomMenu = 'home';
  let authConfigData = null;
  let authClient = null;
  let authSession = null;
  let authInitPromise = null;
  let posterAutoTimer = 0;
  let posterResumeTimer = 0;
  let posterPagerFrame = 0;

  const protectedMenuIds = new Set(['destiny', 'vault', 'account']);
  const protectedDestinations = {
    destiny: {
      eyebrow: 'LOCKED RECORD',
      title: '운명록',
      href: '/destiny',
      entry: 'destiny',
      desc: '개인 사주의 원국, 신살·길성, 합충, 대운 흐름을 모아 보는 메뉴입니다.',
    },
    vault: {
      eyebrow: 'LOCKED VAULT',
      title: '보관함',
      href: '/cmdg/#vault',
      entry: 'vault',
      desc: '저장한 풀이와 상담 기록을 같은 계정에서 다시 여는 메뉴입니다.',
    },
    account: {
      eyebrow: 'LOCKED MY',
      title: 'MY',
      href: '/my',
      entry: 'my',
      desc: '내 계정과 사주 프로필을 확인하고 수정하는 메뉴입니다.',
    },
  };

  const bottomMenus = {
    home: {
      eyebrow: 'HOME',
      title: '홈',
      desc: '지금 필요한 풀이를 고르고 무료 운부터 시작합니다.',
      items: [
        { label: '홈 맨 위', meta: '처음 화면으로 이동', action: 'scroll-top', status: '이동' },
        { label: '대표 상품 보기', meta: '요즘 많이 고른 풀이', action: 'focus-services', status: '보기' },
        { label: '오늘운 무료 보기', meta: '오늘 흐름과 피할 선택 확인', href: '/signup?entry=today', status: '무료' },
        { label: '천명사주 보기', meta: '종합사주 풀이 시작하기', href: '/cmdg/', status: '시작' },
      ],
    },
    search: {
      eyebrow: 'SEARCH',
      title: '검색',
      desc: '지금 궁금한 주제부터 한 번에 골라보세요.',
      search: true,
      items: [
        { label: '전체 상품', meta: '모든 운세 메뉴 보기', action: 'filter', category: 'all', status: '전체' },
        { label: '종합사주', meta: '내 인생 전체 흐름', action: 'filter', category: '종합', status: '49,900원' },
        { label: '오늘운', meta: '오늘의 선택과 피할 일', action: 'filter', category: '흐름', status: '무료' },
        { label: '연애', meta: '도화와 관계 타이밍', action: 'filter', category: '연애', status: '검색' },
        { label: '궁합', meta: '둘의 끌림과 갈등', action: 'filter', category: '궁합', status: '검색' },
        { label: '재물', meta: '돈이 남는 흐름', action: 'filter', category: '재물', status: '검색' },
        { label: '직업', meta: '일과 적성의 방향', action: 'filter', category: '직업', status: '검색' },
        { label: '풍수', meta: '집과 공간의 기운', action: 'filter', category: '풍수', status: '검색' },
      ],
    },
    vault: {
      eyebrow: 'VAULT',
      title: '보관함',
      desc: '저장한 풀이와 결제한 리포트를 다시 엽니다.',
      items: [
        { label: '풀이 보관함 열기', meta: '저장된 리포트 목록 보기', href: '/cmdg/#vault', status: '열기' },
        { label: '새 사주 저장하기', meta: '새 풀이를 만들고 보관함에 저장', href: '/cmdg/#name', status: '입력' },
        { label: '상담 이어보기', meta: '최근 풀이 상담 화면으로 이동', href: '/chat.html', status: '상담' },
        { label: '보관함 안내', meta: '로그인하면 다른 기기에서도 다시 열 수 있습니다', action: 'toast', message: '로그인 상태에서 만든 풀이는 보관함에서 다시 열 수 있습니다.', status: '안내' },
      ],
    },
    account: {
      eyebrow: 'MY',
      title: 'MY',
      desc: '로그인, 사주 프로필, 결제·환불, 고객센터를 관리합니다.',
      items: [
        { label: '마이페이지', meta: '계정·결제·환불·고객센터 허브', href: '/my', status: 'MY' },
        { label: '개인정보 수정', meta: '이름과 생년월일 등 사주 프로필', href: '/profile', status: '수정' },
        { label: '보관함', meta: '저장한 풀이와 상담 기록', href: '/cmdg/#vault', status: '열기' },
        { label: '결제 내역', meta: '주문과 풀이 진입점', href: '/orders', status: '내역' },
        { label: '환불 신청 · 내역', meta: '결제 건 기준 환불 문의', href: '/refunds', status: '환불' },
        { label: '고객센터', meta: 'FAQ와 문의 접수', href: '/support', status: '문의' },
      ],
    },
  };

  if (actionPanel) {
    actionPanel.inert = true;
  }

  if (bottomMenuPanel) {
    bottomMenuPanel.inert = true;
  }

  function prefersReducedMotion() {
    return motionQuery.matches;
  }

  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
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

  function getLabel(element) {
    const card = element.closest?.('.service-card') || element;
    const primary = card.querySelector?.('strong');
    return cleanText(primary?.innerText || primary?.textContent || element.innerText || element.textContent || '이 서비스');
  }

  function scrollWithinPhone(target, offset = 16) {
    if (!scroller || !target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = scroller.scrollTop + targetRect.top - scrollerRect.top - offset;

    scroller.scrollTo({
      top: Math.max(0, nextTop),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function flashReadableTarget(target) {
    if (!target) return;
    target.classList.add('is-pointed');
    window.setTimeout(() => {
      target.classList.remove('is-pointed');
    }, 700);
  }

  function snapToNearestCard(rail) {
    const cards = Array.from(rail.querySelectorAll('.poster:not(.is-hidden)'));
    if (!cards.length) return;

    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    const nearest = cards.reduce((closest, card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - railCenter);
      return distance < closest.distance ? { card, distance } : closest;
    }, { card: cards[0], distance: Number.POSITIVE_INFINITY }).card;

    rail.scrollTo({
      left: nearest.offsetLeft - (rail.clientWidth - nearest.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function scrollHorizontalCardIntoView(card) {
    const rail = card?.closest?.('.poster-rail, .category-rail, .price-rail');
    if (!rail) return;

    rail.scrollTo({
      left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function visiblePosters(rail = mainPosterRail) {
    return rail ? Array.from(rail.querySelectorAll('.poster:not(.is-hidden)')) : [];
  }

  function currentPosterIndex(rail = mainPosterRail) {
    const cards = visiblePosters(rail);
    if (!cards.length || !rail) return -1;

    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    return cards.reduce((closest, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - railCenter);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
  }

  function updatePosterPager() {
    posterPagerFrame = 0;
    if (!posterPageText) return;

    const cards = visiblePosters();
    const total = cards.length;
    posterPageText.textContent = `${total ? currentPosterIndex() + 1 : 0}/${total}`;
  }

  function schedulePosterPagerUpdate() {
    if (posterPagerFrame) return;
    posterPagerFrame = window.requestAnimationFrame(updatePosterPager);
  }

  function scrollPosterToIndex(index) {
    const cards = visiblePosters();
    if (!mainPosterRail || !cards.length) return;
    const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
    mainPosterRail.scrollTo({
      left: card.offsetLeft - (mainPosterRail.clientWidth - card.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function stopPosterAutoRoll() {
    window.clearInterval(posterAutoTimer);
    posterAutoTimer = 0;
  }

  function startPosterAutoRoll() {
    stopPosterAutoRoll();
    if (!mainPosterRail || prefersReducedMotion() || visiblePosters().length < 2) return;

    posterAutoTimer = window.setInterval(() => {
      const cards = visiblePosters();
      if (document.hidden || cards.length < 2) return;
      const nextIndex = (currentPosterIndex() + 1) % cards.length;
      scrollPosterToIndex(nextIndex);
      window.setTimeout(schedulePosterPagerUpdate, 360);
    }, 4200);
  }

  function pausePosterAutoRoll(resumeDelay = 5200) {
    stopPosterAutoRoll();
    window.clearTimeout(posterResumeTimer);
    if (!mainPosterRail || prefersReducedMotion()) return;
    posterResumeTimer = window.setTimeout(startPosterAutoRoll, resumeDelay);
  }

  function bindMouseDrag(rail) {
    let pointerId = 0;
    let startX = 0;
    let startScrollLeft = 0;
    let didDrag = false;
    let lastDragEndedAt = 0;

    rail.querySelectorAll('img').forEach((img) => {
      img.draggable = false;
    });

    rail.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = rail.scrollLeft;
      didDrag = false;
      rail.classList.add('is-drag-ready');
      if (rail.classList.contains('poster-rail')) pausePosterAutoRoll(6200);
      // Do NOT capture yet — early capture steals click from child links/buttons on desktop.
    });

    rail.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;

      if (Math.abs(deltaX) > dragThreshold && !didDrag) {
        didDrag = true;
        rail.classList.add('is-dragging');
        try {
          rail.setPointerCapture(pointerId);
        } catch (_error) {
          // Synthetic test events and older browser surfaces can reject pointer capture.
        }
      }

      if (!didDrag) return;
      event.preventDefault();
      rail.scrollLeft = startScrollLeft - deltaX;
      if (rail.classList.contains('poster-rail')) schedulePosterPagerUpdate();
    });

    function finishDrag(event) {
      if (event.pointerId !== pointerId) return;
      try {
        if (rail.hasPointerCapture(pointerId)) {
          rail.releasePointerCapture(pointerId);
        }
      } catch (_error) {
        // Drag cleanup should still run even when pointer capture is unavailable.
      }

      pointerId = 0;
      rail.classList.remove('is-drag-ready', 'is-dragging');

      if (didDrag) {
        lastDragEndedAt = Date.now();
        rail.dataset.dragged = '1';
        if (rail.classList.contains('poster-rail')) {
          snapToNearestCard(rail);
          window.setTimeout(schedulePosterPagerUpdate, 320);
          pausePosterAutoRoll(6200);
        }
        window.setTimeout(() => {
          delete rail.dataset.dragged;
        }, 260);
      }
    }

    rail.addEventListener('pointerup', finishDrag);
    rail.addEventListener('pointercancel', finishDrag);
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);

    rail.addEventListener('click', (event) => {
      if (Date.now() - lastDragEndedAt > 260) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    if (rail.classList.contains('poster-rail')) {
      rail.addEventListener('scroll', schedulePosterPagerUpdate, { passive: true });
    }
  }

  function setFilter(category, options = {}) {
    const selectedCategory = category || 'all';

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === selectedCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    serviceCards.forEach((card) => {
      const isMatch = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      card.classList.toggle('is-hidden', !isMatch);
    });

    updatePosterPager();
    startPosterAutoRoll();

    sectionBlocks.forEach((section) => {
      const sectionCards = Array.from(section.querySelectorAll('.service-card'));
      const shouldHide = selectedCategory !== 'all'
        && sectionCards.length > 0
        && sectionCards.every((card) => card.classList.contains('is-hidden'));
      section.classList.toggle('is-empty-filter', shouldHide);
    });

    if (options.reveal === false) return;

    const firstVisible = serviceCards.find((card) => !card.classList.contains('is-hidden'));
    if (!firstVisible) return;

    const section = selectedCategory === 'all'
      ? document.querySelector('#services')
      : firstVisible.closest('.section-block') || firstVisible.closest('.poster-rail') || firstVisible;
    scrollWithinPhone(section);
    scrollHorizontalCardIntoView(firstVisible);
    flashReadableTarget(firstVisible);
  }

  function setSearchQuery(value) {
    const query = cleanText(value).toLowerCase();

    filterButtons.forEach((button) => {
      const isAll = !query && button.dataset.filter === 'all';
      button.classList.toggle('is-active', isAll);
      button.setAttribute('aria-pressed', String(isAll));
    });

    serviceCards.forEach((card) => {
      const text = cleanText(card.textContent).toLowerCase();
      card.classList.toggle('is-hidden', Boolean(query) && !text.includes(query));
    });

    sectionBlocks.forEach((section) => {
      const sectionCards = Array.from(section.querySelectorAll('.service-card'));
      const shouldHide = sectionCards.length > 0 && sectionCards.every((card) => card.classList.contains('is-hidden'));
      section.classList.toggle('is-empty-filter', shouldHide);
    });

    if (!query) {
      setFilter('all', { reveal: false });
      return;
    }

    const firstVisible = serviceCards.find((card) => !card.classList.contains('is-hidden'));
    if (firstVisible) {
      scrollWithinPhone(firstVisible.closest('.section-block') || firstVisible.closest('.poster-rail') || firstVisible);
      scrollHorizontalCardIntoView(firstVisible);
      flashReadableTarget(firstVisible);
    }

    updatePosterPager();
    startPosterAutoRoll();
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || '확인할 메뉴를 선택해 주세요.';
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1700);
  }

  function normalizeProtectedMenuId(menuId) {
    const id = menuId === 'my' ? 'account' : menuId;
    return protectedMenuIds.has(id) ? id : '';
  }

  function protectedSignupHref(menuId) {
    const menu = protectedDestinations[normalizeProtectedMenuId(menuId)] || protectedDestinations.account;
    return `/signup?entry=${encodeURIComponent(menu.entry)}`;
  }

  function localProfileComplete(profile) {
    const birth = profile?.birth || {};
    return Boolean(profile?.name && birth.year && birth.month && birth.day);
  }

  function clearDeviceAuthSession() {
    try {
      localStorage.removeItem(AUTH_DEVICE_SESSION_KEY);
    } catch (_error) {
      // Browser storage can be unavailable in restricted modes.
    }
  }

  function deviceSessionStartedAt() {
    try {
      const value = Number(localStorage.getItem(AUTH_DEVICE_SESSION_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (_error) {
      return 0;
    }
  }

  function rememberDeviceAuthSession(session) {
    if (!session?.access_token) {
      clearDeviceAuthSession();
      return 0;
    }
    const existing = deviceSessionStartedAt();
    if (existing) return existing;
    const lastSignIn = Date.parse(session?.user?.last_sign_in_at || '');
    const startedAt = Number.isFinite(lastSignIn) ? lastSignIn : Date.now();
    try {
      localStorage.setItem(AUTH_DEVICE_SESSION_KEY, String(startedAt));
    } catch (_error) {
      // Supabase still keeps its own session where browser storage allows it.
    }
    return startedAt;
  }

  async function enforceDeviceAuthSession(session) {
    if (!session?.access_token) {
      clearDeviceAuthSession();
      return null;
    }
    const startedAt = deviceSessionStartedAt() || rememberDeviceAuthSession(session);
    if (Date.now() - startedAt <= AUTH_DEVICE_SESSION_MS) return session;
    clearDeviceAuthSession();
    if (authClient) {
      await authClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    return null;
  }

  async function initAuth() {
    if (authInitPromise) return authInitPromise;
    authInitPromise = (async () => {
      const configRes = await fetch('/api/auth/config');
      const config = await configRes.json();
      authConfigData = config;
      if (!config.enabled || !window.supabase?.createClient) return null;
      authClient = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      });
      const { data, error } = await authClient.auth.getSession();
      if (error) throw error;
      authSession = await enforceDeviceAuthSession(data.session || null);
      authClient.auth.onAuthStateChange((_event, session) => {
        enforceDeviceAuthSession(session || null)
          .then((nextSession) => {
            authSession = nextSession;
          })
          .catch(() => {
            authSession = session || null;
          });
      });
      return authSession;
    })();
    return authInitPromise;
  }

  async function currentAuthSession() {
    await initAuth();
    if (!authClient) return null;
    const { data, error } = await authClient.auth.getSession();
    if (error) throw error;
    authSession = await enforceDeviceAuthSession(data.session || null);
    return authSession;
  }

  async function authHeaders(base = {}) {
    const headers = { ...base };
    const session = authSession || await currentAuthSession().catch(() => null);
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }

  async function protectedAccessState() {
    const session = await currentAuthSession();
    if (!session?.access_token) return { state: 'login' };

    const res = await fetch('/api/user/profile', {
      headers: await authHeaders(),
    });
    const json = await res.json();
    if (res.status === 401) return { state: 'login' };
    if (!res.ok) throw new Error(json.error || '사주 프로필을 확인하지 못했습니다.');
    return {
      state: json.complete && localProfileComplete(json.profile) ? 'ready' : 'profile',
      profile: json.profile || null,
    };
  }

  function protectedGateItems(menu, state) {
    if (state === 'checking') {
      return [
        { label: '로그인과 사주등록 확인 중', meta: '잠시만 기다려 주세요.', action: 'toast', message: '접근 상태를 확인 중입니다.', status: '확인' },
      ];
    }

    if (state === 'profile') {
      return [
        { label: '사주 등록하기', meta: `로그인은 확인됐습니다. ${menu.title}을 열려면 기본 사주를 저장해 주세요.`, href: protectedSignupHref(menu.entry), status: '등록' },
        { label: '검색 먼저 보기', meta: '상품과 주제는 로그인 없이 둘러볼 수 있습니다.', action: 'filter', category: 'all', status: '검색' },
      ];
    }

    if (state === 'error') {
      return [
        { label: '다시 로그인하고 확인하기', meta: '접근 상태를 확인하지 못했습니다. 로그인 화면에서 다시 이어갑니다.', href: protectedSignupHref(menu.entry), status: '확인' },
        { label: '홈으로 돌아가기', meta: '운명상회 첫 화면을 다시 봅니다.', action: 'scroll-top', status: '홈' },
      ];
    }

    return [
      { label: '로그인하고 사주 등록하기', meta: `${menu.title}은 계정과 사주 프로필이 모두 필요합니다.`, href: protectedSignupHref(menu.entry), status: '시작' },
      { label: '검색 먼저 보기', meta: '상품과 주제는 로그인 없이 둘러볼 수 있습니다.', action: 'filter', category: 'all', status: '검색' },
    ];
  }

  function renderProtectedGate(menuId, state = 'checking') {
    const normalizedMenuId = normalizeProtectedMenuId(menuId) || 'account';
    const menu = protectedDestinations[normalizedMenuId];
    if (!phone || !bottomMenuPanel || !bottomMenuList || !bottomMenuTitle || !bottomMenuDesc || !bottomMenuEyebrow) return;

    const copy = {
      checking: {
        eyebrow: 'ACCESS CHECK',
        title: `${menu.title} 확인 중`,
        desc: '로그인 여부와 사주 프로필 등록 상태를 확인하고 있습니다.',
      },
      login: {
        eyebrow: menu.eyebrow,
        title: `${menu.title}은 로그인 후 열립니다`,
        desc: `${menu.desc} 먼저 소셜 로그인과 사주등록을 완료해 주세요.`,
      },
      profile: {
        eyebrow: menu.eyebrow,
        title: `${menu.title}은 사주등록 후 열립니다`,
        desc: `${menu.desc} 로그인은 확인됐고, 기본 사주 프로필 저장이 필요합니다.`,
      },
      error: {
        eyebrow: 'CHECK FAILED',
        title: `${menu.title} 상태를 확인하지 못했습니다`,
        desc: '네트워크나 로그인 세션을 다시 확인해야 합니다.',
      },
    }[state] || {};

    activeBottomMenu = normalizedMenuId;
    setMenuOpen(false);
    bottomMenuEyebrow.textContent = copy.eyebrow;
    bottomMenuTitle.textContent = copy.title;
    bottomMenuDesc.textContent = copy.desc;
    bottomMenuList.innerHTML = protectedGateItems(menu, state).map(bottomMenuItemMarkup).join('');
    phone.classList.add('is-bottom-menu-open');
    bottomMenuPanel.inert = false;
    bottomMenuPanel.setAttribute('aria-hidden', 'false');
    updateBottomMenuButtons();
  }

  async function handleProtectedAccess(menuId) {
    const normalizedMenuId = normalizeProtectedMenuId(menuId);
    if (!normalizedMenuId) return;
    const menu = protectedDestinations[normalizedMenuId];
    renderProtectedGate(normalizedMenuId, 'checking');

    try {
      const access = await protectedAccessState();
      if (access.state === 'ready') {
        closeBottomMenu();
        activeBottomMenu = normalizedMenuId;
        updateBottomMenuButtons();
        navigateToHref(menu.href);
        return;
      }
      renderProtectedGate(normalizedMenuId, access.state);
      showToast(access.state === 'profile' ? '사주등록 후 열 수 있습니다.' : '로그인과 사주등록이 필요합니다.');
    } catch (error) {
      console.warn('보호 메뉴 확인 실패', error);
      renderProtectedGate(normalizedMenuId, 'error');
      showToast('접근 상태를 확인하지 못했습니다.');
    }
  }

  function showPendingMessage(event) {
    const source = event.currentTarget;
    const label = getLabel(source);
    showToast(`${label}은 곧 이용할 수 있어요.`);
  }

  function navigateToLink(link) {
    const href = link.getAttribute('href');
    if (!href) return;

    link.classList.add('is-pressing');
    location.assign(new URL(href, location.href).href);
  }

  function navigateToHref(href) {
    if (!href) return;
    location.assign(new URL(href, location.href).href);
  }

  function setPointerPosition(element, event) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    element.style.setProperty('--pointer-x', `${x.toFixed(1)}%`);
    element.style.setProperty('--pointer-y', `${y.toFixed(1)}%`);
  }

  function bindHoverReadability(element) {
    element.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      element.classList.add('is-pointed');
      setPointerPosition(element, event);
    });

    element.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      setPointerPosition(element, event);
    });

    element.addEventListener('pointerleave', () => {
      element.classList.remove('is-pointed');
    });
  }

  function createClickSpark(element, event) {
    if (prefersReducedMotion()) return;
    if (element.closest?.('.poster-rail')?.dataset.dragged === '1') return;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const spark = document.createElement('span');
    spark.className = 'click-spark';
    const x = event.clientX > 0 ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY > 0 ? event.clientY - rect.top : rect.height / 2;
    spark.style.setProperty('--spark-x', `${Math.max(0, Math.min(rect.width, x))}px`);
    spark.style.setProperty('--spark-y', `${Math.max(0, Math.min(rect.height, y))}px`);
    element.appendChild(spark);
    window.setTimeout(() => {
      spark.remove();
    }, 560);
  }

  function bindPressFeedback(element) {
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      element.classList.add('is-pressing');
    });

    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((eventName) => {
      element.addEventListener(eventName, () => {
        element.classList.remove('is-pressing');
      });
    });

    element.addEventListener('click', (event) => {
      createClickSpark(element, event);
    });
  }

  function updateBottomMenuButtons() {
    bottomMenuButtons.forEach((button) => {
      const isActive = button.dataset.bottomMenu === activeBottomMenu;
      const isExpanded = isActive && phone?.classList.contains('is-bottom-menu-open');
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-expanded', String(Boolean(isExpanded)));
    });
  }

  function bottomMenuItemMarkup(item, index) {
    const action = item.action || (item.href ? 'navigate' : 'toast');
    const data = [
      `data-bottom-action="${escapeHtml(action)}"`,
      `data-menu-index="${index}"`,
    ];

    if (item.href) data.push(`data-href="${escapeHtml(item.href)}"`);
    if (item.category) data.push(`data-category="${escapeHtml(item.category)}"`);
    if (item.message) data.push(`data-message="${escapeHtml(item.message)}"`);

    return `
      <button class="bottom-menu-item" type="button" ${data.join(' ')}>
        <span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.meta)}</small>
        </span>
        <em>${escapeHtml(item.status || '보기')}</em>
      </button>
    `;
  }

  function renderBottomMenu(menuId) {
    const menu = bottomMenus[menuId] || bottomMenus.home;
    if (!bottomMenuList || !bottomMenuTitle || !bottomMenuDesc || !bottomMenuEyebrow) return;

    bottomMenuEyebrow.textContent = menu.eyebrow;
    bottomMenuTitle.textContent = menu.title;
    bottomMenuDesc.textContent = menu.desc;

    const searchMarkup = menu.search
      ? `
        <label class="bottom-menu-search">
          <span>상품 검색</span>
          <input type="search" inputmode="search" autocomplete="off" placeholder="연애, 재물, 오늘운..." data-bottom-search />
        </label>
      `
      : '';

    bottomMenuList.innerHTML = `${searchMarkup}${menu.items.map(bottomMenuItemMarkup).join('')}`;
  }

  function closeBottomMenu() {
    if (!phone || !bottomMenuPanel) return;
    phone.classList.remove('is-bottom-menu-open');
    bottomMenuPanel.inert = true;
    bottomMenuPanel.setAttribute('aria-hidden', 'true');
    updateBottomMenuButtons();
  }

  function openBottomMenu(menuId) {
    if (!phone || !bottomMenuPanel) return;
    activeBottomMenu = bottomMenus[menuId] ? menuId : 'home';
    setMenuOpen(false);
    renderBottomMenu(activeBottomMenu);
    phone.classList.add('is-bottom-menu-open');
    bottomMenuPanel.inert = false;
    bottomMenuPanel.setAttribute('aria-hidden', 'false');
    updateBottomMenuButtons();

    const searchInput = bottomMenuPanel.querySelector('[data-bottom-search]');
    if (searchInput) {
      window.setTimeout(() => searchInput.focus(), 80);
    }
  }

  function runBottomMenuAction(button) {
    const action = button.dataset.bottomAction;

    if (action === 'navigate') {
      navigateToHref(button.dataset.href);
      return;
    }

    if (action === 'scroll-top') {
      activeBottomMenu = 'home';
      closeBottomMenu();
      scroller?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      showToast('홈 맨 위로 이동했습니다.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'focus-services') {
      activeBottomMenu = 'home';
      closeBottomMenu();
      scrollWithinPhone(document.querySelector('#services'));
      flashReadableTarget(serviceCards[0]);
      showToast('대표 상품을 보여드립니다.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'focus-pricing') {
      activeBottomMenu = 'home';
      closeBottomMenu();
      const pricingTarget = document.querySelector('.price-rail')?.closest('.section-block')
        || document.querySelector('#services');
      scrollWithinPhone(pricingTarget);
      flashReadableTarget(serviceCards[0]);
      showToast('대표 상품을 보여드립니다.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'filter') {
      activeBottomMenu = 'search';
      closeBottomMenu();
      setFilter(button.dataset.category || 'all');
      showToast(button.dataset.category === 'all' ? '전체 상품을 보여드립니다.' : `${cleanText(button.querySelector('strong')?.textContent)} 메뉴를 모았습니다.`);
      updateBottomMenuButtons();
      return;
    }

    showToast(button.dataset.message || '메뉴를 선택하면 다음 화면으로 이동합니다.');
  }

  function setMenuOpen(isOpen) {
    if (!phone || !actionPanel || !menuButton) return;
    if (isOpen) closeBottomMenu();
    phone.classList.toggle('is-menu-open', isOpen);
    actionPanel.inert = !isOpen;
    actionPanel.setAttribute('aria-hidden', String(!isOpen));
    menuButton.setAttribute('aria-expanded', String(isOpen));
  }

  function setupReveal() {
    const revealTargets = Array.from(document.querySelectorAll('.home-hero, .poster, .today-ticket, .section-block, .tier'));
    revealTargets.forEach((target, index) => {
      target.classList.add('reveal-on-scroll');
      target.style.transitionDelay = `${Math.min(index * 25, 180)}ms`;
    });

    if (!('IntersectionObserver' in window) || !scroller) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      root: scroller,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    });

    revealTargets.forEach((target) => observer.observe(target));
  }

  function setupPosterRailControls() {
    if (!mainPosterRail) return;

    mainPosterRail.addEventListener('wheel', (event) => {
      pausePosterAutoRoll(6200);
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absY <= absX) return;

      event.preventDefault();
      mainPosterRail.scrollLeft += event.deltaY;
      schedulePosterPagerUpdate();
    }, { passive: false });

    mainPosterRail.addEventListener('pointerdown', () => {
      pausePosterAutoRoll(6200);
    }, { passive: true });

    mainPosterRail.addEventListener('mouseenter', () => {
      stopPosterAutoRoll();
    });

    mainPosterRail.addEventListener('mouseleave', () => {
      pausePosterAutoRoll(2200);
    });

    mainPosterRail.addEventListener('focusin', () => {
      stopPosterAutoRoll();
    });

    mainPosterRail.addEventListener('focusout', () => {
      pausePosterAutoRoll(2200);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopPosterAutoRoll();
        return;
      }
      pausePosterAutoRoll(1200);
    });

    updatePosterPager();
    startPosterAutoRoll();
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter || 'all';
      activeBottomMenu = 'search';
      closeBottomMenu();
      setFilter(category);
      updateBottomMenuButtons();
      showToast(category === 'all' ? '전체 운세 상품을 다시 보여드립니다.' : `${cleanText(button.textContent)} 관련 운만 모았습니다.`);
    });
  });

  pendingCards.forEach((card) => {
    card.addEventListener('click', showPendingMessage);
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;

      if (action === 'focus-services') {
        activeBottomMenu = 'home';
        closeBottomMenu();
        setMenuOpen(false);
        scrollWithinPhone(document.querySelector('#services'));
        flashReadableTarget(serviceCards[0]);
        updateBottomMenuButtons();
        return;
      }

      if (action === 'toggle-menu') {
        setMenuOpen(!phone?.classList.contains('is-menu-open'));
        return;
      }

      if (action === 'close-menu') {
        setMenuOpen(false);
      }

      if (action === 'close-bottom-menu') {
        closeBottomMenu();
      }
    });
  });

  menuFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.menuFilter || 'all';
      activeBottomMenu = 'search';
      setFilter(category);
      setMenuOpen(false);
      updateBottomMenuButtons();
      showToast(`${cleanText(button.querySelector('strong')?.textContent)} 상품을 모았습니다.`);
    });
  });

  menuShortcutButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const protectedMenuId = normalizeProtectedMenuId(button.dataset.menuShortcut);
      if (protectedMenuId) {
        handleProtectedAccess(protectedMenuId);
        return;
      }
      openBottomMenu(button.dataset.menuShortcut);
    });
  });

  bottomMenuButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const protectedMenuId = normalizeProtectedMenuId(button.dataset.bottomMenu);
      if (protectedMenuId) {
        handleProtectedAccess(protectedMenuId);
        return;
      }
      openBottomMenu(button.dataset.bottomMenu);
    });
  });

  bottomMenuPanel?.addEventListener('input', (event) => {
    const input = event.target.closest?.('[data-bottom-search]');
    if (!input) return;
    activeBottomMenu = 'search';
    setSearchQuery(input.value);
    updateBottomMenuButtons();
  });

  bottomMenuPanel?.addEventListener('click', (event) => {
    if (event.target === bottomMenuPanel) {
      closeBottomMenu();
      return;
    }

    const item = event.target.closest?.('[data-bottom-action]');
    if (item) {
      runBottomMenuAction(item);
    }
  });

  actionPanel?.addEventListener('click', (event) => {
    if (event.target === actionPanel) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      closeBottomMenu();
    }
  });

  function openMenuFromHash() {
    const hash = location.hash.replace(/^#/, '');
    const menuMap = {
      search: 'search',
      vault: 'vault',
      my: 'account',
      account: 'account',
    };
    if (!menuMap[hash]) return;
    window.setTimeout(() => {
      const protectedMenuId = normalizeProtectedMenuId(menuMap[hash]);
      if (protectedMenuId) {
        handleProtectedAccess(protectedMenuId);
        return;
      }
      openBottomMenu(menuMap[hash]);
    }, 60);
  }

  liveLinks.forEach((link) => {
    let clickStart = null;
    let pointerNavigationAt = 0;

    link.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      clickStart = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    }, true);

    link.addEventListener('pointerup', (event) => {
      if (!clickStart || event.pointerType !== 'mouse' || event.pointerId !== clickStart.pointerId) return;
      const movedX = Math.abs(event.clientX - clickStart.x);
      const movedY = Math.abs(event.clientY - clickStart.y);
      const rail = link.closest('.poster-rail, .category-rail, .price-rail');
      const isClick = movedX <= dragThreshold && movedY <= dragThreshold;
      clickStart = null;

      if (!isClick || rail?.dataset.dragged === '1') return;
      pointerNavigationAt = Date.now();
      event.preventDefault();
      event.stopPropagation();
      navigateToLink(link);
    }, true);

    link.addEventListener('pointercancel', () => {
      clickStart = null;
    }, true);

    link.addEventListener('click', (event) => {
      if (Date.now() - pointerNavigationAt < 500) {
        event.preventDefault();
        return;
      }
      if (link.closest('.poster-rail, .category-rail, .price-rail')?.dataset.dragged === '1') {
        event.preventDefault();
        return;
      }
      // Explicit navigation keeps mouse/touch/keyboard activation consistent across breakpoints.
      event.preventDefault();
      navigateToLink(link);
    });
  });

  dragRails.forEach(bindMouseDrag);
  setupPosterRailControls();
  hoverTargets.forEach(bindHoverReadability);
  pressTargets.forEach(bindPressFeedback);
  setFilter('all', { reveal: false });
  updateBottomMenuButtons();
  setupReveal();
  openMenuFromHash();
  window.addEventListener('hashchange', openMenuFromHash);
})();
