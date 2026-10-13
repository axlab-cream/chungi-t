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
  const dragRails = Array.from(document.querySelectorAll('.poster-rail, .category-rail, .price-rail, .coming-rail'));
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

  /*
   * 오늘운 입구의 "매일" 신호. 오늘 아직 안 봤으면 fresh(점·버튼 맥박), 보고 나면 seen 으로
   * 바꿔 "오늘 확인함"을 쓴다. 날짜는 기기 기준이라 자정이 지나면 다시 fresh 가 된다.
   * 저장은 이 기기에만 남는 편의 정보다 — 없어도 화면은 그대로 동작한다.
   */
  const todayTicket = document.querySelector('.today-ticket');
  if (todayTicket) {
    const TODAY_SEEN_KEY = 'umsh_today_seen_date';
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let seenToday = false;
    try { seenToday = localStorage.getItem(TODAY_SEEN_KEY) === dateKey; } catch (_) { seenToday = false; }
    todayTicket.dataset.todayState = seenToday ? 'seen' : 'fresh';
    const eyebrow = todayTicket.querySelector(':scope > div > span');
    if (eyebrow) eyebrow.textContent = `TODAY · Free · ${now.getMonth() + 1}/${now.getDate()}${seenToday ? ' · Viewed today' : ''}`;
    todayTicket.addEventListener('click', () => {
      try { localStorage.setItem(TODAY_SEEN_KEY, dateKey); } catch (_) { /* private mode */ }
    });
  }
  const AUTH_DEVICE_SESSION_KEY = 'cheongi_auth_device_session_started_at_v1';
  const AUTH_DEVICE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

  function lastHangul(word) {
    const chars = String(word || '').replace(/[^가-힣]/g, '');
    return chars.slice(-1);
  }

  function hasBatchim(word) {
    const last = lastHangul(word);
    if (!last) return false;
    return (last.charCodeAt(0) - 0xac00) % 28 !== 0;
  }

  function objectParticle(word) {
    return hasBatchim(word) ? '을' : '를';
  }

  function topicParticle(word) {
    return hasBatchim(word) ? '은' : '는';
  }
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

  function isStandaloneLaunch() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: window-controls-overlay)').matches
      || Boolean(window.navigator.standalone);
  }

  function isOwnSiteReferrer() {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer).origin === location.origin;
    } catch (_error) {
      return false;
    }
  }

  function shouldSkipSplashBySession() {
    return isOwnSiteReferrer() && !isStandaloneLaunch() && hasSeenSplash();
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
    if (!splashScreen || !splashVideo || !splashPending || shouldSkipSplashBySession() || prefersReducedMotion()) {
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

  const protectedMenuIds = new Set(['destiny']);
  const protectedDestinations = {
    destiny: {
      eyebrow: 'Locked record',
      title: 'Fate log',
      href: '/destiny',
      entry: 'destiny',
      desc: 'See the natal chart, stars, clashes, and luck-pillar flow in one place.',
    },
    vault: {
      eyebrow: 'Locked saved',
      title: 'Saved',
      href: '/vault',
      entry: 'vault',
      desc: 'Sign in with the same account to reopen saved readings and chats.',
    },
    account: {
      eyebrow: 'Locked account',
      title: 'MY',
      href: '/my',
      entry: 'my',
      desc: 'Check and edit your account and chart profile.',
    },
  };

  const bottomMenus = {
    home: {
      eyebrow: 'Home',
      title: 'Home',
      desc: 'Go to the Fortune Shop home and featured readings.',
      items: [
        { label: 'Top of home', meta: 'Back to the top', action: 'scroll-top', status: 'Go' },
        { label: 'Featured readings', meta: 'Full chart and recommended readings', action: 'focus-services', status: 'See' },
        { label: 'Free reading for today', meta: 'Today’s day and flow', href: '/today/free', status: 'Free' },
        { label: 'Price ladder', meta: 'From free to the full chart', action: 'focus-pricing', status: 'Check' },
      ],
    },
    search: {
      eyebrow: 'Search',
      title: 'Search',
      desc: 'Pick a topic or reading type to narrow the list.',
      search: true,
      items: [
        { label: 'All readings', meta: 'See every reading', action: 'filter', category: 'all', status: 'All' },
        { label: 'Full chart', meta: 'The larger flow of a life', action: 'filter', category: '종합', status: '49,900 KRW' },
        { label: 'Today', meta: 'Choices and what to hold today', action: 'filter', category: '흐름', status: 'Free' },
        { status: 'Love', meta: 'Attraction and relationship timing', action: 'filter', category: '연애', status: 'Search' },
        { status: 'Match', meta: 'Where two people pull and clash', action: 'filter', category: '궁합', status: 'Search' },
        { status: 'Money', meta: 'Whether money stays', action: 'filter', category: '재물', status: 'Search' },
        { status: 'Work', meta: 'Work and fit', action: 'filter', category: '직업', status: 'Search' },
        // 고객 화면 보류: 집 풍수
        // { label: '풍수', meta: 'Home and the feel of a space', action: 'filter', category: '풍수', status: 'Search' },
      ],
    },
    vault: {
      eyebrow: 'Saved',
      title: 'Saved',
      desc: 'Open saved readings and chats again.',
      items: [
        { label: 'Open saved readings', meta: 'See the saved report list', href: '/vault', status: 'Open' },
        { label: 'Save a new chart', meta: 'Make a new reading and save it', href: '/cmdg/#name', status: 'Enter' },
        { label: 'Continue a chat', meta: 'Open the latest reading chat', href: '/chat.html', status: 'Chat' },
        { label: 'About saved readings', meta: 'Sign in to open them on another device', action: 'toast', message: 'Readings made after sign-in can be opened again from Saved.', status: 'Info' },
      ],
    },
    account: {
      eyebrow: 'MY',
      title: 'MY',
      desc: 'About and FAQ can be read without signing in.',
      items: [
        { label: 'Open account', meta: 'Public guides and your account', href: '/my', status: 'Open' },
        { label: 'About Fortune Shop', meta: 'What the shop is and how to use it', href: '/about', status: 'About' },
        { label: 'FAQ', meta: 'Use, payment, and refunds', href: '/faq', status: 'FAQ' },
        { label: 'Sign in / Create account', meta: 'Continue with Kakao, Naver, or Google', href: '/signup?entry=my', status: 'Sign in' },
        { label: 'My chart profile', meta: 'The details used for today and questions', href: '/signup?entry=my', status: 'Manage' },
        { label: 'My readings', meta: 'Saved full charts and chats', href: '/vault', status: 'See' },
        { label: 'Support', meta: 'Questions and the refund policy', href: '/cmdg/#support', status: 'Ask' },
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
    return cleanText(primary?.innerText || primary?.textContent || element.innerText || element.textContent || 'This reading');
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

    // The poster dots mirror the visible posters, so they rebuild on every filter.
    document.dispatchEvent(new CustomEvent('umsh:filter-changed'));

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
    toast.textContent = message || 'This reading continues in the next step.';
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
    if (!res.ok) throw new Error(json.error || 'The chart profile could not be checked.');
    return {
      state: json.complete && localProfileComplete(json.profile) ? 'ready' : 'profile',
      profile: json.profile || null,
    };
  }

  function protectedGateItems(menu, state) {
    if (state === 'checking') {
      return [
        { label: 'Checking sign-in and chart registration', meta: 'Please wait a moment.', action: 'toast', message: 'Checking whether this can be opened now.', status: 'Check' },
      ];
    }

    if (state === 'profile') {
      return [
        { label: 'Register a chart', meta: `You are signed in. Save your birth profile to open ${menu.title}.`, href: protectedSignupHref(menu.entry), status: 'Register' },
        { label: 'Browse search first', meta: 'Readings and topics can be browsed without signing in.', action: 'filter', category: 'all', status: 'Search' },
      ];
    }

    if (state === 'error') {
      return [
        { label: 'Sign in again and check', meta: 'Could not check access. Continue from the sign-in screen.', href: protectedSignupHref(menu.entry), status: 'Check' },
        { label: 'Back home', meta: 'Return to the Fortune Shop home.', action: 'scroll-top', status: 'Home' },
      ];
    }

    return [
      { label: 'Sign in and register a chart', meta: `${menu.title} needs both an account and a birth profile.`, href: protectedSignupHref(menu.entry), status: 'Start' },
      { label: 'Browse search first', meta: 'Readings and topics can be browsed without signing in.', action: 'filter', category: 'all', status: 'Search' },
    ];
  }

  function renderProtectedGate(menuId, state = 'checking') {
    const normalizedMenuId = normalizeProtectedMenuId(menuId) || 'account';
    const menu = protectedDestinations[normalizedMenuId];
    if (!phone || !bottomMenuPanel || !bottomMenuList || !bottomMenuTitle || !bottomMenuDesc || !bottomMenuEyebrow) return;

    const copy = {
      checking: {
        eyebrow: 'ACCESS CHECK',
        title: `Checking ${menu.title}`,
        desc: 'Checking your sign-in and birth profile.',
      },
      login: {
        eyebrow: menu.eyebrow,
        title: `${menu.title} opens after sign-in`,
        desc: `${menu.desc} Sign in and finish chart registration first.`,
      },
      profile: {
        eyebrow: menu.eyebrow,
        title: `${menu.title} opens after the chart is registered`,
        desc: `${menu.desc} Sign-in is confirmed. Save the basic chart profile.`,
      },
      error: {
        eyebrow: 'CHECK FAILED',
        title: `Could not check ${menu.title}`,
        desc: 'Your sign-in expired or the connection was lost. Sign in to continue.',
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
      showToast(access.state === 'profile' ? 'This opens after the chart is registered.' : 'Sign-in and a chart are needed.');
    } catch (error) {
      console.warn('Could not check this menu', error);
      renderProtectedGate(normalizedMenuId, 'error');
      showToast('Could not check access.');
    }
  }

  /**
   * 은/는 depends on the last syllable's final consonant, and every card title ends
   * differently - "나, 붙을 각이야?" wants 는 while "그 사람도 나를 생각할까?" wants 는 as well,
   * but a title ending in a consonant wants 은. Punctuation at the end is ignored.
   */
  function topicParticle() { return "" }

  function showPendingMessage(event) {
    const source = event.currentTarget;
    const label = getLabel(source);
    showToast(`${label} will be connected in a later update.`);
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
        <em>${escapeHtml(item.status || 'View')}</em>
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
          <span>Search readings</span>
          <input type="search" inputmode="search" autocomplete="off" placeholder="Love, money, today..." data-bottom-search />
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
      showToast('Back at the top.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'focus-services') {
      activeBottomMenu = 'home';
      closeBottomMenu();
      scrollWithinPhone(document.querySelector('#services'));
      flashReadableTarget(serviceCards[0]);
      showToast('Featured readings are in view.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'focus-pricing') {
      activeBottomMenu = 'home';
      closeBottomMenu();
      scrollWithinPhone(document.querySelector('.price-rail')?.closest('.section-block'));
      showToast('Moved to the price ladder.');
      updateBottomMenuButtons();
      return;
    }

    if (action === 'filter') {
      activeBottomMenu = 'search';
      closeBottomMenu();
      setFilter(button.dataset.category || 'all');
      showToast(button.dataset.category === 'all' ? 'Showing all readings.' : `Showing ${cleanText(button.querySelector('strong')?.textContent)} options.`);
      updateBottomMenuButtons();
      return;
    }

    showToast(button.dataset.message || 'This option will be connected in a later update.');
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
      showToast(category === 'all' ? 'Showing all readings again.' : `Showing readings for ${cleanText(button.textContent)}.`);
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
      showToast(`Showing ${cleanText(button.querySelector('strong')?.textContent)} readings.`);
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
   * MY도 공개 안내 허브로 들어올 수 있고, 운명록은 기존 로그인 보호 흐름을 탄다.
   */
  const openTabHrefs = { home: '/', search: '/search', vault: '/vault', account: '/my', my: '/my' };

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


  /**
   * The poster rail is the shop window, so it rolls on its own, loops, and says where
   * it is.
   *
   * The loop is done with two clones: a copy of the last poster sits before the first
   * and a copy of the first sits after the last, so the rail always has something to
   * scroll into. Once a smooth scroll lands on a clone the rail jumps to the matching
   * real poster with no animation, which the eye cannot catch because both show the
   * same artwork in the same place.
   *
   * The dots double as the position indicator and the jump control - tapping one is
   * faster than dragging past two posters. Autoplay stands down whenever the visitor
   * is doing something (pointer down, hover, keyboard focus, another tab) and for
   * anyone who asked for reduced motion, and it resumes once they stop.
   */
  function setupPosterCarousel() {
    const rail = document.querySelector('.poster-rail');
    const dotsHost = document.querySelector('#posterDots');
    if (!rail || !dotsHost) return;

    const AUTOPLAY_MS = 4800;
    const SETTLE_MS = 520;
    let reals = [];
    let slides = [];
    let dots = [];
    let slide = 0;
    let timer = 0;
    let settle = 0;
    let syncing = 0;
    let paused = false;

    const looping = () => slides.length > reals.length;
    const firstReal = () => (looping() ? 1 : 0);
    const lastReal = () => firstReal() + reals.length - 1;

    function visiblePosters() {
      return Array.from(rail.querySelectorAll('.poster'))
        .filter((poster) => poster.dataset.clone !== '1' && !poster.classList.contains('is-hidden'));
    }

    function dropClones() {
      rail.querySelectorAll('.poster[data-clone="1"]').forEach((clone) => clone.remove());
    }

    /** A clone is decoration: out of the a11y tree, out of tab order, out of filtering. */
    function cloneOf(poster) {
      const copy = poster.cloneNode(true);
      copy.dataset.clone = '1';
      copy.classList.remove('service-card', 'is-pointed', 'is-pressing');
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('tabindex', '-1');
      copy.querySelectorAll('img').forEach((img) => {
        img.draggable = false;
      });
      return copy;
    }

    function positionOf(index) {
      const poster = slides[index];
      if (!poster) return 0;
      return poster.offsetLeft - (rail.clientWidth - poster.offsetWidth) / 2;
    }

    function goToSlide(next, behavior) {
      if (!slides[next]) return;
      slide = next;
      const mode = behavior || (prefersReducedMotion() ? 'auto' : 'smooth');
      rail.scrollTo({ left: positionOf(next), behavior: mode });
      markActive(realIndexOf(next));

      // Landing on a clone means the loop just wrapped; swap to the real poster once
      // the animation has finished so the jump is invisible.
      window.clearTimeout(settle);
      if (!looping()) return;
      if (next === slides.length - 1) {
        settle = window.setTimeout(() => goToSlide(firstReal(), 'auto'), mode === 'auto' ? 0 : SETTLE_MS);
      } else if (next === 0) {
        settle = window.setTimeout(() => goToSlide(lastReal(), 'auto'), mode === 'auto' ? 0 : SETTLE_MS);
      }
    }

    /** Clones stand in for a real poster, so the dots follow the original. */
    function realIndexOf(index) {
      if (!reals.length) return 0;
      if (!looping()) return index;
      if (index === 0) return reals.length - 1;
      if (index === slides.length - 1) return 0;
      return index - 1;
    }

    function markActive(next) {
      dots.forEach((dot, position) => {
        const active = position === next;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      syncPosterVideo();
    }

    /**
     * A poster can carry a short loop instead of a still. Only the card in the middle
     * plays it - the others hold their poster frame, which keeps the home screen calm
     * and stops the rail downloading video nobody is looking at.
     */
    function syncPosterVideo() {
      slides.forEach((poster, position) => {
        poster.querySelectorAll('video').forEach((video) => {
          if (position === slide && !prefersReducedMotion() && !document.hidden) {
            if (video.preload === 'none') video.preload = 'auto';
            const played = video.play();
            // Autoplay can still be refused; the poster frame is the fallback.
            if (played && typeof played.catch === 'function') played.catch(() => {});
          } else {
            video.pause();
          }
        });
      });
    }

    /** Which slide is closest to the middle of the rail right now. */
    function nearestSlide() {
      const centre = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0;
      let bestGap = Infinity;
      slides.forEach((poster, position) => {
        const gap = Math.abs(poster.offsetLeft + poster.offsetWidth / 2 - centre);
        if (gap < bestGap) {
          bestGap = gap;
          best = position;
        }
      });
      return best;
    }

    function stop() {
      window.clearInterval(timer);
      timer = 0;
    }

    function start() {
      stop();
      if (paused || prefersReducedMotion() || reals.length < 2 || document.hidden) return;
      timer = window.setInterval(() => goToSlide(slide + 1), AUTOPLAY_MS);
    }

    function pause() {
      paused = true;
      stop();
    }

    function resume() {
      paused = false;
      start();
    }

    function build() {
      dropClones();
      reals = visiblePosters();
      if (reals.length > 1) {
        rail.insertBefore(cloneOf(reals[reals.length - 1]), reals[0]);
        rail.appendChild(cloneOf(reals[0]));
      }
      slides = Array.from(rail.querySelectorAll('.poster')).filter((poster) => !poster.classList.contains('is-hidden'));

      dotsHost.innerHTML = '';
      dots = reals.map((poster, position) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'poster-dot';
        // The title is broken across lines with <br>, which textContent joins with
        // nothing at all - innerText keeps the break as a space.
        const title = poster.querySelector('strong');
        const name = cleanText(title?.innerText || title?.textContent) || `Banner ${position + 1}`;
        dot.setAttribute('aria-label', `Go to ${name} banner`);
        dot.addEventListener('click', () => {
          goToSlide(firstReal() + position);
          // A deliberate pick should stay on screen long enough to read.
          pause();
          window.setTimeout(resume, AUTOPLAY_MS);
        });
        dotsHost.appendChild(dot);
        return dot;
      });
      dotsHost.hidden = reals.length < 2;

      goToSlide(firstReal(), 'auto');
      start();
    }

    rail.addEventListener('scroll', () => {
      window.cancelAnimationFrame(syncing);
      syncing = window.requestAnimationFrame(() => {
        slide = nearestSlide();
        markActive(realIndexOf(slide));
      });
    }, { passive: true });

    ['pointerdown', 'mouseenter', 'focusin', 'touchstart'].forEach((type) => {
      rail.addEventListener(type, pause, { passive: true });
    });
    ['mouseleave', 'focusout', 'touchend', 'touchcancel'].forEach((type) => {
      rail.addEventListener(type, resume, { passive: true });
    });
    document.addEventListener('pointerup', () => {
      // A drag that ends on a clone still has to wrap back to the real poster.
      if (!paused) return;
      resume();
      if (looping() && (slide === 0 || slide === slides.length - 1)) {
        goToSlide(realIndexOf(slide) + firstReal(), 'auto');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
      syncPosterVideo();
    });

    // Category filtering hides posters, so the dots and clones rebuild to match.
    document.addEventListener('umsh:filter-changed', build);
    build();
  }

  dragRails.forEach(bindMouseDrag);
  hoverTargets.forEach(bindHoverReadability);
  pressTargets.forEach(bindPressFeedback);
  setFilter('all', { reveal: false });
  updateBottomMenuButtons();
  setupPosterCarousel();

  /**
   * A loop that is not in the poster rail still should not cost anything until it is
   * on screen. `preload="none"` keeps the file off the wire, and the first time the
   * element is actually visible it flips to auto and plays; scrolling away pauses it.
   * The poster frame carries the card in the meantime, so nothing moves visually.
   */
  function setupLazyVideos() {
    const videos = Array.from(document.querySelectorAll('video[data-lazy-play]'));
    if (!videos.length) return;
    if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return;

    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && !document.hidden) {
          if (video.preload === 'none') video.preload = 'auto';
          const played = video.play();
          if (played && typeof played.catch === 'function') played.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.4 });

    videos.forEach((video) => watcher.observe(video));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) videos.forEach((video) => video.pause());
    });
  }

  setupLazyVideos();
  setupReveal();
  openMenuFromHash();
  window.addEventListener('hashchange', openMenuFromHash);
})();
