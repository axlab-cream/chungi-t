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
  const liveLinks = Array.from(document.querySelectorAll('a.is-live, a.is-cmdg'));
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

  const splashScreen = document.querySelector('#splashScreen');
  const splashVideo = document.querySelector('#splashVideo');
  const splashSkip = document.querySelector('[data-splash-skip]');
  const SPLASH_SESSION_KEY = 'umsh_splash_seen_v1';
  let splashFallbackTimer = 0;

  function hasSeenSplash() {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) === '1';
    } catch (_error) {
      return false;
    }
  }

  function markSplashSeen() {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch (_error) {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  function disableSplash() {
    if (splashScreen) {
      splashScreen.hidden = true;
      splashScreen.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('splash-pending');
    document.documentElement.classList.add('splash-disabled');
    phone.inert = false;
  }

  function finishSplash() {
    if (!splashScreen || splashScreen.hidden || splashScreen.classList.contains('is-closing')) return;
    window.clearTimeout(splashFallbackTimer);
    splashVideo?.pause();
    document.documentElement.classList.remove('splash-pending');
    splashScreen.classList.add('is-closing');
    window.setTimeout(() => {
      splashScreen.hidden = true;
      splashScreen.classList.remove('is-closing');
      splashScreen.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.add('splash-disabled');
      phone.inert = false;
    }, 280);
  }

  function startSplash() {
    const splashPending = document.documentElement.classList.contains('splash-pending');
    if (!splashScreen || !splashVideo || !splashPending || hasSeenSplash() || prefersReducedMotion()) {
      disableSplash();
      return;
    }
    markSplashSeen();
    phone.inert = true;
    splashScreen.setAttribute('aria-hidden', 'false');
    splashVideo.addEventListener('ended', finishSplash, { once: true });
    splashVideo.addEventListener('error', finishSplash, { once: true });
    splashFallbackTimer = window.setTimeout(finishSplash, 6500);
    splashVideo.play().catch(finishSplash);
  }

  splashSkip?.addEventListener('click', finishSplash);
  startSplash();

  const protectedMenuIds = new Set(['destiny', 'account']);
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
      href: '/vault',
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
      desc: '운명상회 첫 화면과 대표 상품으로 이동합니다.',
      items: [
        { label: '홈 맨 위', meta: '처음 화면으로 이동', action: 'scroll-top', status: '이동' },
        { label: '대표 상품 보기', meta: '천명사주와 추천 상품', action: 'focus-services', status: '보기' },
        { label: '오늘운 무료 보기', meta: '회원가입 후 오늘 흐름 확인', href: '/signup?entry=today', status: '무료' },
        { label: '가격 사다리', meta: '무료부터 종합사주까지', action: 'focus-pricing', status: '확인' },
      ],
    },
    search: {
      eyebrow: 'SEARCH',
      title: '검색',
      desc: '궁금한 주제나 상품 분류로 빠르게 좁혀보세요.',
      search: true,
      items: [
        { label: '전체 상품', meta: '모든 운세 메뉴 보기', action: 'filter', category: 'all', status: '전체' },
        { label: '종합사주', meta: '내 인생 전체 흐름', action: 'filter', category: '종합', status: '49,900원' },
        { label: '오늘운', meta: '오늘의 선택과 피할 일', action: 'filter', category: '흐름', status: '무료' },
        { label: '연애', meta: '도화와 관계 타이밍', action: 'filter', category: '연애', status: '검색' },
        { label: '궁합', meta: '둘의 끌림과 갈등', action: 'filter', category: '궁합', status: '검색' },
        { label: '재물', meta: '돈이 남는 흐름', action: 'filter', category: '재물', status: '검색' },
        { label: '직업', meta: '일과 적성의 방향', action: 'filter', category: '직업', status: '검색' },
        // 풍수 숨김: 포털 카드가 접혀 있어 이 항목은 빈 결과로 이어집니다. 카드와 함께 다시 여세요.
        //         { label: '풍수', meta: '집과 공간의 기운', action: 'filter', category: '풍수', status: '검색' },
      ],
    },
    vault: {
      eyebrow: 'VAULT',
      title: '보관함',
      desc: '저장한 풀이와 상담 기록을 다시 여는 곳입니다.',
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
      desc: '로그인과 사주등록을 마친 뒤 내 사주 프로필을 관리합니다.',
      items: [
        { label: '로그인 / 회원가입', meta: '카카오, 네이버, 구글로 계속하기', href: '/signup?entry=my', status: '로그인' },
        { label: '내 사주 프로필', meta: '오늘운과 질문에 쓰는 기본 정보', href: '/signup?entry=my', status: '관리' },
        { label: '내 풀이 목록', meta: '저장한 종합사주와 상담 기록', href: '/cmdg/#vault', status: '보기' },
        { label: '고객센터', meta: '문의와 환불·취소 정책 확인', href: '/cmdg/#support', status: '문의' },
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
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || '이 서비스는 다음 단계에서 연결됩니다.';
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
      if (access.state === 'login') {
        // 로그인 뒤 누르려던 화면으로 이어지도록 돌아올 자리를 같이 넘긴다.
        closeBottomMenu();
        const loginHref = window.UMSHCommonAuth?.commonLoginUrl(menu.entry, menu.href)
          || `/signup?entry=${encodeURIComponent(menu.entry)}&returnTo=${encodeURIComponent(menu.href)}#login`;
        navigateToHref(loginHref);
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

  /**
   * 은/는 depends on the last syllable's final consonant, and every card title ends
   * differently - "나, 붙을 각이야?" wants 는 while "그 사람도 나를 생각할까?" wants 는 as well,
   * but a title ending in a consonant wants 은. Punctuation at the end is ignored.
   */
  function topicParticle(label) {
    const last = String(label || '').replace(/[^가-힣0-9a-zA-Z]/g, '').slice(-1);
    const code = last.charCodeAt(0);
    const hasFinal = last && code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : Boolean(last);
    return `${label}${hasFinal ? '은' : '는'}`;
  }

  function showPendingMessage(event) {
    const source = event.currentTarget;
    const label = getLabel(source);
    showToast(`${topicParticle(label)} 다음 단계에서 연결됩니다.`);
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
      scrollWithinPhone(document.querySelector('.price-rail')?.closest('.section-block'));
      showToast('가격 사다리로 이동했습니다.');
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

    showToast(button.dataset.message || '이 메뉴는 다음 단계에서 연결됩니다.');
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

  /**
   * 하단 메뉴는 시트를 여는 자리가 아니라 화면으로 가는 자리다. 검색과 보관함은 비로그인도
   * 들어올 수 있고, 운명록과 MY는 로그인이 필요해서 protected 흐름을 그대로 탄다.
   */
  const openTabHrefs = { home: '/', search: '/search', vault: '/vault' };

  bottomMenuButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const menuId = button.dataset.bottomMenu;
      const protectedMenuId = normalizeProtectedMenuId(menuId);
      if (protectedMenuId) {
        handleProtectedAccess(protectedMenuId);
        return;
      }
      const href = openTabHrefs[menuId];
      if (href) {
        closeBottomMenu();
        activeBottomMenu = menuId;
        updateBottomMenuButtons();
        navigateToHref(href);
        return;
      }
      openBottomMenu(menuId);
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
      const rail = link.closest('.poster-rail');
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
      if (link.closest('.poster-rail')?.dataset.dragged === '1') return;
      event.preventDefault();
      navigateToLink(link);
    });
  });

  dragRails.forEach(bindMouseDrag);
  hoverTargets.forEach(bindHoverReadability);
  pressTargets.forEach(bindPressFeedback);
  setFilter('all', { reveal: false });
  updateBottomMenuButtons();
  setupReveal();
  openMenuFromHash();
  window.addEventListener('hashchange', openMenuFromHash);
})();
