(function (global) {
  'use strict';

  var $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  var state = {
    supabase: null,
    session: null,
    authConfig: null,
    report: null,
    category: '',
    sectionId: '',
    publicId: '',
  };

  var screens = {
    auth: $('[data-screen="auth"]'),
    report: $('[data-screen="report"]'),
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      if (screens[key]) screens[key].classList.toggle('hidden', key !== name);
    });
  }

  function setStatus(message) {
    var node = $('[data-auth-status]');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('hidden', !message);
  }

  function setLoading(on, copy) {
    if (!global.UMSHLoading) return;
    if (on) {
      global.UMSHLoading.show(copy || {
        title: '저장된 해석을 불러오는 중',
        subtitle: '같은 계정의 해석만 열립니다.',
      });
    } else {
      global.UMSHLoading.hide();
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function authHeaders() {
    return state.session && state.session.access_token
      ? { Authorization: 'Bearer ' + state.session.access_token }
      : {};
  }

  function openCommonLogin() {
    var returnTo = (global.UMSHCommonAuth && global.UMSHCommonAuth.currentPageReturnTo)
      ? global.UMSHCommonAuth.currentPageReturnTo()
      : (location.pathname + location.search + location.hash);
    var url = (global.UMSHCommonAuth && global.UMSHCommonAuth.commonLoginUrl)
      ? global.UMSHCommonAuth.commonLoginUrl('saved-report', returnTo)
      : ('/signup?entry=saved-report&returnTo=' + encodeURIComponent(returnTo) + '#login');
    location.replace(url);
  }

  async function api(path, options) {
    options = options || {};
    var response = await fetch(path, Object.assign({}, options, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders(), options.headers || {}),
    }));
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(payload.error || '요청을 처리하지 못했습니다.');
      error.code = payload.code;
      throw error;
    }
    return payload;
  }

  function sectionsByCategory(category) {
    return state.report.sections.filter(function (section) {
      return section.category === category;
    });
  }

  function renderReport() {
    $('[data-report-title]').textContent = state.report.title;
    $('[data-report-subtitle]').textContent = state.report.subtitle;
    var meta = $('[data-report-meta]');
    if (meta) meta.textContent = '고유 주소 /r/' + (state.publicId || state.report.publicId || '');
    var categories = Array.from(new Map(state.report.sections.map(function (section) {
      return [section.category, section.categoryEn];
    })).entries());
    $('[data-category-list]').innerHTML = categories.map(function (entry) {
      var category = entry[0];
      var categoryEn = entry[1];
      return '<button class="toc-card ' + (category === state.category ? 'is-active' : '') + '" type="button" data-category="' + escapeHtml(category) + '">' +
        '<span>' + escapeHtml(categoryEn) + '</span><strong>' + escapeHtml(category) + '</strong></button>';
    }).join('');
    renderChapters();
    renderReading();
  }

  function renderChapters() {
    $('[data-chapter-list]').innerHTML = sectionsByCategory(state.category).map(function (section, index) {
      return '<button class="chapter-card ' + (section.id === state.sectionId ? 'is-active' : '') + ' ' +
        global.UMSHProgressiveReport.chapterStatusClass(section) + '" type="button" data-section-id="' + escapeHtml(section.id) + '">' +
        '<b>' + String(index + 1).padStart(2, '0') + '</b><strong>' + escapeHtml(section.classification) + '</strong></button>';
    }).join('');
  }

  function renderReading() {
    var section = state.report.sections.find(function (item) { return item.id === state.sectionId; }) || state.report.sections[0];
    var index = state.report.sections.findIndex(function (item) { return item.id === section.id; });
    var body = global.UMSHProgressiveReport.sectionReady(section)
      ? '<p class="reading-hook">' + escapeHtml(section.hook) + '</p><pre>' + escapeHtml(section.interpretation) + '</pre>'
      : global.UMSHProgressiveReport.readingPlaceholder(section);
    $('[data-reading]').innerHTML =
      '<img src="' + escapeHtml(section.imageSrc) + '" alt="' + escapeHtml(section.imageAlt) + '" />' +
      '<span class="eyebrow">' + escapeHtml(section.categoryEn) + ' · ' + (index + 1) + '/' + state.report.sections.length + '</span>' +
      '<h3>' + escapeHtml(section.classification) + '</h3>' + body +
      '<div class="pager">' +
      '<button class="btn" type="button" data-prev ' + (index <= 0 ? 'disabled' : '') + '>이전</button>' +
      '<button class="btn primary" type="button" data-next ' + (index >= state.report.sections.length - 1 ? 'disabled' : '') + '>다음</button>' +
      '</div>';
  }

  function moveSection(delta) {
    var index = state.report.sections.findIndex(function (section) { return section.id === state.sectionId; });
    var next = state.report.sections[index + delta];
    if (!next) return;
    state.category = next.category;
    state.sectionId = next.id;
    renderReport();
  }

  async function loadPublicReport() {
    var parts = location.pathname.split('/').filter(Boolean);
    var publicId = parts[parts.length - 1] || '';
    state.publicId = publicId;
    setLoading(true);
    try {
      var payload = await api('/api/r/' + encodeURIComponent(publicId));
      await global.UMSHProgressiveReport.followProgress({
        payload: payload,
        replacePublicUrl: false,
        fetchReport: function (reportId) {
          return api('/api/report/' + encodeURIComponent(reportId));
        },
        onUpdate: function (next) {
          state.report = next.report;
          state.publicId = next.publicId || state.publicId;
          if (!state.sectionId && state.report.sections[0]) {
            state.category = state.report.sections[0].category;
            state.sectionId = state.report.sections[0].id;
          }
          renderReport();
          showScreen('report');
        },
      });
    } catch (error) {
      setStatus(error.message || '해석을 불러오지 못했습니다.');
      showScreen('auth');
      if (error.message && /로그인|회원|인증/.test(error.message)) openCommonLogin();
    } finally {
      setLoading(false);
    }
  }

  async function initAuth() {
    state.authConfig = await fetch('/api/auth/config').then(function (res) { return res.json(); });
    if (!state.authConfig.enabled || !global.supabase || !global.UMSHAuthSession) {
      openCommonLogin();
      return;
    }
    state.supabase = global.UMSHAuthSession.createClient(
      global.supabase,
      state.authConfig.url,
      state.authConfig.publishableKey,
    );
    var sessionResult = await state.supabase.auth.getSession();
    state.session = await global.UMSHAuthSession.enforceDeviceAuthSession(sessionResult.data.session, state.supabase);
    state.supabase.auth.onAuthStateChange(function (_event, session) {
      global.UMSHAuthSession.enforceDeviceAuthSession(session, state.supabase).then(function (nextSession) {
        state.session = nextSession;
        if (!state.session) openCommonLogin();
      }).catch(function () {
        state.session = session || null;
        if (!state.session) openCommonLogin();
      });
    });
    if (!state.session) {
      setStatus('로그인 후 저장된 해석을 확인할 수 있습니다.');
      openCommonLogin();
      return;
    }
    await loadPublicReport();
  }

  document.addEventListener('click', function (event) {
    var category = event.target.closest('[data-category]');
    if (category && state.report) {
      state.category = category.getAttribute('data-category');
      state.sectionId = sectionsByCategory(state.category)[0].id;
      renderReport();
    }
    var sectionButton = event.target.closest('[data-section-id]');
    if (sectionButton) {
      state.sectionId = sectionButton.getAttribute('data-section-id');
      renderChapters();
      renderReading();
    }
    if (event.target.closest('[data-prev]')) moveSection(-1);
    if (event.target.closest('[data-next]')) moveSection(1);
    if (event.target.closest('[data-back]')) {
      if (history.length > 1) history.back();
      else location.assign('/');
    }
    if (event.target.closest('[data-logout]') && state.supabase) {
      state.supabase.auth.signOut().then(function () {
        state.session = null;
        openCommonLogin();
      });
    }
  });

  initAuth().catch(function (error) {
    setStatus(error.message);
    showScreen('auth');
  });
})(typeof window !== 'undefined' ? window : globalThis);
