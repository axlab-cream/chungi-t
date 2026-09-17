(function (global) {
  'use strict';
  if (global.UMSHReportAccess) return;
  var ROUTES = [
    ['/day/wedding', 'wedding_day'],
    ['/love/this-year', 'love_this_year'], ['/work/job-choice', 'job_choice'],
    ['/work/quit', 'quit_fortune'], ['/money/save', 'money_save'],
    ['/match/cat', 'cat_compatibility'], ['/me/lucky', 'lucky_color'], ['/flow/newyear', 'newyear_flow'], ['/day/wedding', 'wedding_day'],
    ['/match/couple', 'match_couple'], ['/match/marry', 'marry_match'],
    ['/love/signal', 'couple_signal'], ['/me/pass-angle', 'pass_angle'],
    ['/work/move', 'work_move'], ['/work/job', 'work_job'],
    ['/love/mind', 'love_mind'], ['/love/again', 'love_again'],
    ['/love/spouse', 'love_spouse'], ['/place/home', 'home_fit'], ['/today/free', 'today_fortune'], ['/cmdg', 'saju_master']
  ];
  var route = ROUTES.find(function (item) { return location.pathname === item[0] || location.pathname.indexOf(item[0] + '/') === 0; });
  var key = route && route[1];
  if(key==='saju_master' && (new URLSearchParams(location.search).get('entry')==='today' || location.hash==='#todayResult')) key='today_fortune';
  var LEGACY = {newyear_flow:['umsh_newyear_report_v1'],love_this_year:['umsh:report:love_this_year'],job_choice:['umsh:report:job_choice'],quit_fortune:['umsh_quit_report_v1'],money_save:['umsh_save_report_v1'],cat_compatibility:['umsh:report:cat_compatibility'],lucky_color:['umsh:report:lucky_color'],match_couple:['umsh:couple-match:report-v1'],marry_match:['umsh_marry_report_v1'],couple_signal:['umsh:report:couple_signal'],pass_angle:['umsh_pass_angle_report_v1'],work_move:['umsh_work_move_report_v1','umsh_work_move_analysis_v1'],home_fit:['umsh_home_fit_report_v1'],saju_master:['cheongi_analysis']};
  var NESTED = {work_move:['umsh_work_move_input_payload_v1','umsh:work_move:form_v1'],home_fit:['umsh_home_fit_step2_payload_v1','umsh_home_fit_input_payload_v1']};
  var rawFetch = global.fetch.bind(global);
  var authorized = null;
  var rememberedId = '';
  var headerCache = null;
  var ownerId = '';
  var ownerEpoch = 0;
  var pollTimer = null;
  var resuming = new Set();
  var booting = false;
  var printOpenedSections = [];
  var ALIASES = {cmdg:'saju_master',home_pungsu:'home_fit',home:'home_fit',love_thisyear:'love_this_year',love_signal:'couple_signal',today:'today_fortune'};
  function canonical(value) { return ALIASES[value] || value; }
  function identity(payload) { return payload && (payload.resultId || payload.publicId || payload.reportId || (payload.report && (payload.report.resultId || payload.report.publicId || payload.report.reportId))) || ''; }
  function isPermalink() { return /^\/r\/[^/]+\/?$/.test(location.pathname); }
  function locationId() {
    var query = new URLSearchParams(location.search);
    var queryId = query.get('reportId') || query.get('resultId');
    if (queryId) return queryId;
    if (!isPermalink()) return '';
    try { return decodeURIComponent(location.pathname.replace(/^\/r\//, '').replace(/\/$/, '')); }
    catch (_) { return ''; }
  }
  function reportUrl(id, orderId) {
    var query=new URLSearchParams();
    if(orderId) query.set('orderId',orderId);
    else if(key==='newyear_flow' && new URLSearchParams(location.search).get('preview')==='1' && new URLSearchParams(location.search).get('paid')!=='1') query.set('preview','1');
    return '/api/report/'+encodeURIComponent(id)+(query.toString()?'?'+query.toString():'');
  }
  function isOutputPage() { return /(?:04-step|05-step|06-step)/.test(location.pathname) || isPermalink() || Boolean(locationId()); }
  function isDetailPage() { return /(?:05-step|06-step)/.test(location.pathname); }
  function isTeaserPage() { return /04-step/.test(location.pathname); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function remember(payload) {
    var id = identity(payload);
    if (!id) return;
    rememberedId = id;
    if(ownerId && key) { try {sessionStorage.setItem('umsh:report-identity:'+ownerId+':'+key,id);} catch(_) {} }
    var url = new URL(location.href);
    url.searchParams.set('reportId', id);
    if(key==='newyear_flow') {
      if(payload.previewOnly===true && !url.searchParams.get('orderId') && url.searchParams.get('paid')!=='1') url.searchParams.set('preview','1');
      else if(payload.report || url.searchParams.get('orderId') || url.searchParams.get('paid')==='1') url.searchParams.delete('preview');
    }
    if(payload.todayFortune) {
      url.searchParams.delete('start');
      if(/^\/cmdg(?:\/|$)/.test(url.pathname)) {url.searchParams.set('entry','today');url.hash='todayResult';}
      else if(/^\/today\/free(?:\/|$)/.test(url.pathname)) url.hash='';
    }
    url.searchParams.delete('paid');
    if(key!=='newyear_flow') url.searchParams.delete('orderId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function setOwner(id) {
    var next=String(id || '');
    if(next!==ownerId) {
      ownerEpoch+=1;
      if(ownerId) {
        authorized=null;rememberedId='';headerCache=null;
        if(document.getElementById('umsh-verified-reading') || ((key === 'home_fit' || key === 'wedding_day') && isOutputPage())) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
      }
    }
    ownerId=next;
    if(next && key && isOutputPage() && !locationId()) {try {rememberedId=sessionStorage.getItem('umsh:report-identity:'+next+':'+key) || rememberedId;}catch(_) {}}
  }
  function firstInsight(text) {
    var clean = String(text || '').replace(/^\s*\[[^\]]+\]\s*/, '').replace(/^\s*(?:흠|허허|잠깐)[.…\s]+/, '').trim();
    return clean.split(/\n\s*\n|(?<=[.!?。])\s+/).find(function(line){return line.trim().length > 5;}) || clean;
  }
  function panel() {
    var node = document.getElementById('umsh-verified-reading');
    if (node) return node;
    var layout = document.createElement('div'); layout.id = 'umsh-verified-layout';
    layout.setAttribute('data-umsh-chrome','');
    layout.setAttribute('data-service','저장된 해석');
    node = document.createElement('main'); node.id = 'umsh-verified-reading';
    node.style.cssText = 'background:#110e0a;color:#f5ead7;word-break:keep-all;overflow-wrap:anywhere';
    Array.from(document.body.children || []).forEach(function (item) { if (!['SCRIPT','STYLE','LINK'].includes(item.tagName) && !item.hasAttribute('data-umsh-service-bottom')) { item.setAttribute('data-report-concealed',''); item.hidden = true; item.style.setProperty('display','none','important'); } });
    layout.appendChild(node);
    document.body.appendChild(layout);
    document.documentElement.setAttribute('data-umsh-verified-reader','');
    var css=document.createElement('link');css.rel='stylesheet';css.href='/css/umsh-verified-reader.css';css.addEventListener('load',mountChrome);document.head.appendChild(css);
    function mountChrome() { if(global.UMSHChrome)global.UMSHChrome.mount({root:'#umsh-verified-layout',service:key==='today_fortune'?'오늘운':'저장된 해석',category:'흐름'}); }
    if(global.UMSHChrome) mountChrome();
    else if(!document.querySelector('script[src="/js/umsh-chrome.js"]')) {var script=document.createElement('script');script.src='/js/umsh-chrome.js';script.addEventListener('load',mountChrome);document.head.appendChild(script);}
    return node;
  }
  function navigation() { return '<nav aria-label="결과 화면 이동" style="display:flex;gap:18px;margin-bottom:22px"><a style="color:#e5bd69" href="/">운명상회 홈</a><a style="color:#e5bd69" href="/orders">내 구매 내역</a></nav>'; }
  function gate(message) {
    authorized = null;
    if (pollTimer) clearTimeout(pollTimer);
    if (gateInPlace(message)) return;
    var node = panel();
    node.innerHTML = navigation() + '<h1 style="font-size:24px">저장된 해석 확인</h1><p>' + escapeHtml(message) + '</p><a style="color:#e5bd69" href="/signup?entry=saved-report&returnTo='+encodeURIComponent(location.pathname+location.search)+'#login">로그인</a> · <a href="' + escapeHtml(route ? route[0] : '/') + '">서비스로 돌아가기</a>';
  }
  function labelText(value) { return String(value == null ? '' : value).trim().replace(/[.。]+$/, ''); }
  function readingBlock(kind, label, paragraphs) {
    if (!paragraphs.length) return '';
    return '<section class="reading-block reading-' + kind + '" aria-label="' + escapeHtml(label) + '"><span class="reading-role">' + escapeHtml(label) + '</span>' + paragraphs.map(function(paragraph){return '<p>' + escapeHtml(paragraph) + '</p>';}).join('') + '</section>';
  }
  function readySectionBody(section) {
    var interpretation = String(section.interpretation || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    var hook = String(section.hook || '').trim();
    if (hook && interpretation.indexOf(hook) === 0) interpretation = interpretation.slice(hook.length).trim();
    var paragraphs = interpretation.split(/\n\s*\n/).map(function(paragraph){return paragraph.trim();}).filter(Boolean);
    var answer = hook ? readingBlock('answer', '한 줄 답', [hook]) : '';
    if (paragraphs.length >= 2) {
      return answer + readingBlock('evidence', '근거', paragraphs.slice(0, -1)) + readingBlock('action', '행동', paragraphs.slice(-1));
    }
    return answer + readingBlock('evidence', '근거와 행동', paragraphs);
  }

  /* ==================================================================
   * 긴 풀이 블록 — 결론 · 서머리 · 하이라이트
   *
   * 해석 목차 위에 온다. 세 블록의 뼈대(판정 축·하이라이트 제목·이미지 2컷)는
   * /data/longform-blocks.json 이 가지고 있고, 본문은 리포트가 채운다. 본문이 아직
   * 없으면 뼈대만 스켈레톤으로 보여준다 — 구조가 먼저 보여야 무엇을 받는지 안다.
   *
   * 이미지는 서비스마다 이미 있는 대표 캐릭터 컷 2장만 쓴다. 새로 만들면 화풍과
   * 인물이 어긋난다(퇴사운 화자 나이 불일치 전례).
   * ================================================================== */
  var longform = { config: null, loading: null, failed: false };

  function ensureLongformStyles() {
    if (document.getElementById('umsh-longform-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-longform-css';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-longform.css?v=lf-20260917a';
    document.head.appendChild(link);
  }

  function loadLongformConfig() {
    if (longform.config || longform.failed) return Promise.resolve(longform.config);
    if (longform.loading) return longform.loading;
    longform.loading = rawFetch('/data/longform-blocks.json?v=lf-20260917a', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        longform.config = data && data.services ? data.services : null;
        if (!longform.config) longform.failed = true;
        return longform.config;
      })
      .catch(function () { longform.failed = true; return null; });
    return longform.loading;
  }

  /** 라우트 키와 설정 키가 다르다 — cmdg 는 saju_master 로 정규화된다. 양쪽을 다 본다. */
  function longformConfigFor(serviceKey) {
    if (!longform.config) return null;
    var wanted = [serviceKey, canonical(serviceKey), 'cmdg', key, canonical(key)];
    for (var index = 0; index < wanted.length; index += 1) {
      var name = wanted[index];
      if (name && longform.config[name]) return longform.config[name];
    }
    return null;
  }

  function longformParagraphs(text) {
    return String(text == null ? '' : text)
      .split(/\n\s*\n/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function longformSkeleton(label) {
    return '<div class="umsh-lf-skeleton" role="status" aria-live="polite">' +
      '<strong>' + escapeHtml(label) + ' 준비하고 있어요</strong>' +
      '<p>목차와 본문은 먼저 보실 수 있고, 이 자리는 준비가 끝나는 대로 채워집니다.</p>' +
      '</div>';
  }

  function verdictBlock(report, config) {
    var verdict = report && report.verdict;
    var statement = verdict ? String(verdict.statement || '').trim() : '';
    var axis = (verdict ? String(verdict.axis || '').trim() : '') || (config && config.verdictAxis) || '';
    if (!statement && !axis) return '';
    var headline = statement || (axis + ' 먼저 정리합니다.');
    return '<section class="umsh-verdict" aria-labelledby="umsh-verdict-title">' +
      '<span class="umsh-verdict-badge">결론</span>' +
      '<p class="umsh-verdict-statement" id="umsh-verdict-title">' + escapeHtml(headline) + '</p>' +
      (axis && statement ? '<p class="umsh-verdict-axis">판단 축 · ' + escapeHtml(axis) + '</p>' : '') +
      '</section>';
  }

  function summaryBlock(report, config, entitled) {
    var summary = report && report.summary;
    if (summary && summary.status === 'failed') return '';
    var paragraphs = longformParagraphs(summary && summary.text);
    var locked = !entitled && paragraphs.length > 1;
    var shown = locked ? paragraphs.slice(0, 1) : paragraphs;
    var cut = config && config.cutA;
    var figure = cut
      ? '<figure class="umsh-summary-figure"><img src="' + escapeHtml(cut) + '" alt="" loading="lazy" decoding="async" aria-hidden="true"></figure>'
      : '';
    var body = shown.length
      ? shown.map(function (part) { return '<p>' + escapeHtml(part) + '</p>'; }).join('')
      : longformSkeleton('전체 요약을');
    var unlock = locked
      ? '<div class="umsh-lf-locked"><p>요약의 나머지와 하이라이트는 결제 후 열립니다.</p>' +
        '<a class="umsh-lf-cta" href="' + escapeHtml(tocHref(identity(report) || rememberedId)) + '">전체 해석 열기</a></div>'
      : '';
    return '<section class="umsh-summary" aria-label="전체 요약">' +
      figure +
      '<div class="umsh-summary-body">' +
        '<p class="umsh-summary-eyebrow">한눈에 보기</p>' +
        body +
      '</div>' + unlock +
      '</section>';
  }

  function highlightBlocks(report, config, entitled) {
    var defined = (config && Array.isArray(config.highlights)) ? config.highlights : [];
    if (!defined.length) return '';
    var written = (report && Array.isArray(report.highlights)) ? report.highlights : [];
    var cut = config && config.cutB;
    var cards = defined.map(function (item, index) {
      var match = written[index] || {};
      if (match.status === 'failed') return '';
      var paragraphs = longformParagraphs(match.text);
      var locked = !entitled && paragraphs.length > 0;
      var body = paragraphs.length
        ? (locked
          ? '<p>' + escapeHtml(paragraphs[0]) + '</p>'
          : paragraphs.map(function (part) { return '<p>' + escapeHtml(part) + '</p>'; }).join(''))
        : longformSkeleton(labelText(item.title) + ' 항목을');
      var banner = (index === 0 && cut)
        ? '<figure class="umsh-highlight-banner"><img src="' + escapeHtml(cut) + '" alt="" loading="lazy" decoding="async" aria-hidden="true"></figure>'
        : '';
      return '<article class="umsh-highlight' + (locked ? ' is-locked' : '') + '">' +
        banner +
        '<span class="umsh-highlight-index" aria-hidden="true">' + (index + 1) + '</span>' +
        '<h3 class="umsh-highlight-title">' + escapeHtml(labelText(item.title)) + '</h3>' +
        '<div class="umsh-highlight-body">' + body + '</div>' +
        '</article>';
    }).filter(Boolean).join('');
    if (!cards) return '';
    return '<section class="umsh-highlights" aria-label="하이라이트">' +
      '<div class="umsh-highlights-head"><h2 class="umsh-highlights-title">하이라이트</h2></div>' +
      '<div class="umsh-highlights-grid">' + cards + '</div>' +
      '</section>';
  }

  /**
   * accent is a page :root token name, never a hex.
   * Unknown names omit the inline style so CSS falls back to --gold.
   */
  var LONGFORM_ACCENT_TOKENS = { gold: 1, teal: 1, rose: 1, coral: 1, pink: 1, green: 1 };
  function longformAccentStyle(config) {
    var name = config && String(config.accent || '').replace(/^--/, '').trim();
    if (!LONGFORM_ACCENT_TOKENS[name]) return '';
    return ' style="--umsh-lf-accent:var(--' + name + ', var(--gold))"';
  }

  /** 세 블록의 HTML. 설정이 없으면 아무것도 그리지 않는다 — 하위 호환. */
  function longformHtml(report, entitled) {
    var config = longformConfigFor(key);
    if (!config) return '';
    var inner = verdictBlock(report, config) + summaryBlock(report, config, entitled) + highlightBlocks(report, config, entitled);
    if (!inner) return '';
    return '<div class="umsh-longform" id="umsh-longform-host"' + longformAccentStyle(config) + '>' + inner + '</div>';
  }

  /**
   * 설정은 네트워크로 온다. 리포트가 먼저 그려졌으면 도착한 뒤 한 번 더 채운다.
   * 목차 위 자리만 건드리고 본문 섹션은 그대로 둔다.
   */
  function mountLongform(host, report, entitled) {
    if (!host) return;
    ensureLongformStyles();
    var paint = function () {
      var html = longformHtml(report, entitled);
      var existing = host.querySelector('#umsh-longform-host');
      if (!html) { if (existing && existing.parentNode) existing.parentNode.removeChild(existing); return; }
      if (existing) { existing.outerHTML = html; return; }
      host.insertAdjacentHTML('afterbegin', html);
    };
    if (longform.config) { paint(); return; }
    loadLongformConfig().then(paint).catch(function () {});
  }

  /* ==================================================================
   * in-place 렌더 — 등록 디자인을 감추지 않고 슬롯에만 검증 본문을 넣는다.
   *
   * 기존 동작은 `panel()` 이 body 자식을 전부 숨기고 자체 마크업으로 화면을
   * 갈아끼우는 것이었다. 그 결과 서비스별로 등록한 히어로 이미지·영상·레이아웃이
   * 전부 사라졌다. 디자인 껍데기에는 유료 본문이 없고(04 티저 1.2KB · 06 상세
   * 186자 = 라벨뿐, 본문은 전부 <script type=json>) 숨길 이유도 없다.
   *
   * 옵트인은 <html data-umsh-verified-inplace>. 속성이 없는 페이지는 기존
   * 전면 은폐를 그대로 쓴다 — 슬롯을 아직 안 단 서비스가 조용히 깨지지 않게.
   *
   * 검증 전에는 CSS 가드가 채워지지 않은 슬롯을 visibility:hidden 으로 가린다.
   * 정적 HTML 에 박힌 샘플 문구(모든 사용자에게 동일)가 잠깐이라도 내 결과처럼
   * 보이면 안 되기 때문이다.
   * ================================================================== */
  function inPlaceEnabled() {
    return Boolean(document.documentElement && document.documentElement.hasAttribute('data-umsh-verified-inplace'));
  }
  /**
   * 슬롯 해석 순서
   *   1) 명시적 `data-umsh-slot` — 서비스별로 손으로 맞춘 것이 항상 이긴다
   *   2) 알려진 컨테이너 id — 서비스마다 이름이 다르지만(detail-stack · detail-root ·
   *      detailStage · section-items …) 역할은 같다. 26개 HTML을 일일이 고치는 대신
   *      여기서 흡수한다
   *   3) 진행률처럼 디자인에 자리가 아예 없는 것은 만들어 넣는다
   */
  var SLOT_FALLBACK_IDS = {
    // 06 상세 본문 → 04 티저 본문 → 05 결과 목록 순. 05 는 목록형이라 id 가 또 다르다.
    // 채팅 로그(`chat-log`·`chatLog`·`chatScroll`)는 넣지 않는다. 대화 기록 자리에
    // 섹션 목록을 밀어 넣으면 그 화면이 망가진다.
    sections: ['detail-stack', 'detail-root', 'detail-body', 'detailStage', 'detailContent',
               'section-items', 'interpretationBlocks', 'reportStage', 'teaserStack', 'detail-group',
               'groupList', 'group-list', 'group-grid', 'item-list', 'reportGroups', 'report-list',
               'reportIndex', 'section-panel', 'content'],
    title: ['detail-title', 'detailTitle', 'page-title', 'pageTitle', 'report-title', 'resultTitle',
            'hero-title', 'sectionTitle', 'title'],
    subtitle: ['detail-conclusion', 'detailIntro', 'page-summary', 'hero-summary', 'summaryCopy',
               'resultAnswer', 'conclusion', 'subtitle', 'summary'],
    state: ['state-panel', 'statePanel', 'status-root', 'state-message', 'stateNotice', 'stateCopy',
            'state-copy', 'loading-panel', 'lockedState', 'accessState', 'state-card',
            'permission-note', 'emptyPanel', 'missing-input', 'status-box', 'access-notice',
            'emptyState', 'offline'],
    insights: ['signal-list', 'signalList', 'signal-tags', 'heroTags', 'evidencePills', 'flowList'],
    'paid-value': ['scope-list', 'scopeGrid', 'scope-grid', 'unlockList'],
    headline: ['hero-title', 'pageTitle', 'page-title', 'report-title', 'resultTitle'],
    summary: ['freeSummary', 'hero-summary', 'summaryCopy', 'resultAnswer', 'sectionPreview', 'answerLine', 'signal-main-copy'],
  };

  /** 껍데기 안에서 본문을 넣기 적당한 컨테이너. 스크롤 영역이 있으면 그 안. */
  function contentHost() {
    var shell = document.querySelector('#step-6_1-report, #step-5-chat, #step-4-report, .phone');
    if (!shell) return null;
    return shell.querySelector('#scroll-area, .scroll-area, .scroll, main') || shell;
  }

  /**
   * 본문 자리가 아예 없는 디자인(wedding·newyear·lucky·pass-angle·quit 상세)에는
   * 컨테이너를 만들어 넣는다. 기존 블록(evidence·scene·actions 같은 서비스 전용 자리)에
   * 섹션 목록을 밀어 넣으면 그 서비스의 렌더가 깨지므로 건드리지 않는다.
   */
  function ensureSectionsHost() {
    var existing = document.getElementById('umsh-sections-host');
    if (existing) return existing;
    // 04 는 무료 티저다. 자리를 만들어서까지 전체 목차를 쏟으면 티저가 목록 화면이 되고,
    // 05 목록·06 상세와 같은 내용이 세 번 나온다. 티저 디자인에 명시적인 sections 슬롯이
    // 있는 서비스는 그 슬롯이 1순위로 잡히므로 여기까지 오지 않는다.
    if (/\/04-step-4-report\//.test(location.pathname)) return null;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-sections-host';
    node.setAttribute('data-umsh-slot', 'sections');
    node.setAttribute('aria-label', '해석 본문');
    var progress = document.getElementById('umsh-progress-host');
    if (progress && progress.parentElement === host) host.insertBefore(node, progress.nextSibling);
    else host.appendChild(node);
    return node;
  }

  /**
   * 만들어 넣는 자리는 **공용 GNB 바로 아래**에서 시작한다.
   *
   * 예전에는 host.firstChild 앞에 넣었는데, 공용 크롬의 상단 호스트도 같은 자리에
   * 들어간다. 먼저 들어간 쪽이 밀려서 진행률과 상태 안내가 GNB 위에 떠 버렸다.
   * GNB 는 어느 화면에서나 맨 위에 고정되어야 한다.
   */
  function insertBelowChrome(host, node) {
    var top = host.querySelector(':scope > [data-umsh-service-top]') || document.querySelector('[data-umsh-service-top]');
    var anchor = top && top.parentElement === host ? top.nextSibling : host.firstChild;
    host.insertBefore(node, anchor);
    return node;
  }

  /** 진행률 자리가 없는 디자인에는 GNB 아래에 하나 만들어 넣는다. */
  function ensureProgressHost() {
    var existing = document.getElementById('umsh-progress-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-progress-host';
    node.className = 'umsh-progress-panel';
    node.setAttribute('data-umsh-slot', 'progress');
    node.setAttribute('aria-label', '해석 준비 진행률');
    node.hidden = true;
    return insertBelowChrome(host, node);
  }

  /**
   * id 대신 data 속성으로 자리를 표시한 디자인도 있다(wedding 상세: data-title·data-body …).
   */
  var SLOT_FALLBACK_ATTRS = {
    sections: ['[data-body]', '[data-sections]', '[data-reading-body]'],
    title: ['[data-title]'],
    subtitle: ['[data-subtitle]', '[data-conclusion]'],
    state: ['[data-state]', '[data-status]'],
    summary: ['[data-one-line-answer]', '[data-teaser-summary]', '#answerLine', '#signal-main-copy', '#freeSummary', '#resultAnswer'],
    headline: ['[data-teaser-headline]'],
    insights: ['[data-signal-list]', '#signal-tags'],
  };

  /**
   * 내용을 넣을 수 없는 요소를 슬롯으로 잡으면 안 된다.
   * `wedding-section` 은 `<select>` 였고, 거기에 본문을 넣으면 아무것도 렌더되지 않는다.
   */
  var UNFILLABLE = { SELECT: 1, INPUT: 1, TEXTAREA: 1, IMG: 1, BR: 1, HR: 1, OPTION: 1, VIDEO: 1, AUDIO: 1, IFRAME: 1 };
  function usableSlotTarget(node) {
    return Boolean(node) && !UNFILLABLE[node.tagName];
  }

  /** 상태 안내 자리가 없는 디자인에는 만들어 넣는다. 없으면 panel() 로 떨어져 디자인이 사라진다. */
  function ensureStateHost() {
    var existing = document.getElementById('umsh-state-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-state-host';
    node.className = 'umsh-state-panel';
    node.setAttribute('data-umsh-slot', 'state');
    node.setAttribute('aria-live', 'polite');
    return insertBelowChrome(host, node);
  }

  /**
   * 미리보기(무료 티저) 자리가 없는 디자인에는 만들어 넣는다.
   *
   * 이게 없으면 renderPreviewInPlace 의 filled 가 false 가 되고, showPreview 가
   * panel() 로 떨어져 **등록 디자인이 통째로 사라진다**. 04 티저는 대부분
   * headline·summary·insights·paid-value·checkout 자리에 id 가 없어서 그렇게 됐다.
   * sections·state·progress 가 이미 같은 방식으로 자리를 만든다.
   */
  function ensurePreviewHost() {
    var existing = document.getElementById('umsh-preview-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-preview-host';
    node.className = 'umsh-preview-panel';
    node.setAttribute('data-umsh-slot', 'preview');
    node.setAttribute('aria-label', '내 입력으로 먼저 보는 해석');
    // 상태 안내 바로 아래, 본문 자리보다 위. 진행률·상태는 이미 맨 위에 붙는다.
    var after = document.getElementById('umsh-state-host') || document.getElementById('umsh-progress-host');
    if (after && after.parentElement === host) { host.insertBefore(node, after.nextSibling); return node; }
    return insertBelowChrome(host, node);
  }

  function slotNode(name) {
    var explicit = document.querySelector('[data-umsh-slot="' + name + '"]');
    if (usableSlotTarget(explicit)) return explicit;

    var ids = SLOT_FALLBACK_IDS[name] || [];
    for (var i = 0; i < ids.length; i++) {
      var byId = document.getElementById(ids[i]);
      if (usableSlotTarget(byId)) { byId.setAttribute('data-umsh-slot', name); return byId; }
    }
    var attrs = SLOT_FALLBACK_ATTRS[name] || [];
    for (var j = 0; j < attrs.length; j++) {
      var byAttr = document.querySelector(attrs[j]);
      if (usableSlotTarget(byAttr)) { byAttr.setAttribute('data-umsh-slot', name); return byAttr; }
    }
    if (name === 'progress') return ensureProgressHost();
    if (name === 'sections') return ensureSectionsHost();
    if (name === 'state') return ensureStateHost();
    if (name === 'preview') return ensurePreviewHost();
    return null;
  }
  function markFilled(node) { if (node) node.setAttribute('data-umsh-filled', ''); }
  function allowDesignMockReading() {
    try { return String(location.protocol) === 'file:'; }
    catch (_) { return false; }
  }
  /** 슬롯 표시 전에 시안 본문이 잠깐이라도 내 결과처럼 보이면 안 된다. */
  var LIVE_READING_HOST_IDS = [
    'detail-stack', 'detail-body', 'interpretationBlocks', 'detail-conclusion',
    'conclusionBody', 'realityBody', 'conditionBody', 'focusBody', 'evidenceBody',
    'conclusionText',
  ];
  function unfilledHostCss() {
    return LIVE_READING_HOST_IDS.map(function (id) {
      return 'html[data-umsh-report-check][data-umsh-verified-inplace] #' + id + ':not([data-umsh-filled])';
    }).join(',');
  }
  /**
   * 슬롯의 조상이 `hidden` 으로 접혀 있으면 채워도 보이지 않는다. 디자인 페이지는
   * 자체 스크립트가 열어 주는 전제로 `#detail-content` 같은 래퍼를 hidden 으로 두는데,
   * in-place 모드에서는 그 스크립트가 렌더를 양보하므로 여기서 직접 연다.
   */
  function revealAncestors(node) {
    var el = node;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('hidden')) el.removeAttribute('hidden');
      el = el.parentElement;
    }
  }
  function fillSlot(name, html) {
    var node = slotNode(name);
    if (!node) return false;
    node.innerHTML = html;
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  function fillText(name, value) {
    var node = slotNode(name);
    if (!node) return false;
    node.textContent = String(value == null ? '' : value);
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  function ensureInPlaceStyles() {
    if (document.getElementById('umsh-inplace-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-inplace-css';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-verified-inplace.css';
    document.head.appendChild(link);
  }
  /**
   * 규칙을 바꿨는데 캐시된 옛 파일이 남으면 PDF 가 다시 화면 배색으로 찍힌다. 실제로
   * 브라우저가 새 규칙을 무시하고 옛 사본을 쓰는 것을 확인했다. HTML 의 `?v=` 규약과 같이
   * 버전을 붙인다 — 규칙을 고칠 때 이 값을 함께 올린다.
   */
  var PRINT_CSS_HREF = '/css/umsh-report-print.css?v=print-20260917b';
  function ensurePrintStyles() {
    if (document.getElementById('umsh-report-print-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-report-print-css';
    link.rel = 'stylesheet';
    link.href = PRINT_CSS_HREF;
    document.head.appendChild(link);
  }
  /**
   * PDF 는 인쇄 대화상자의 "PDF로 저장"으로 받는다. 14개 상세 화면 가운데 버튼이 붙어
   * 있던 것은 두 곳뿐이었고, 다른 두 곳은 로드되지 않는 모듈을 부르고 있었다. 화면마다
   * 마크업이 달라 개별로 넣는 대신, 본문이 실제로 그려진 뒤 이 자리에서 한 번만 넣는다.
   * 이미 자체 버튼이 있는 화면은 건드리지 않는다 — 한 화면에 같은 버튼이 둘이면 안 된다.
   */
  /**
   * 목차 위 "중요 안내".
   *
   * 해석은 목차를 하나씩 만들어 가고 전체가 끝나기까지 시간이 걸린다. 그 사실을 미리
   * 말해 주지 않으면 사용자는 화면이 멈춘 줄 안다 — 실제로 % 가 안 움직인다는 문의가
   * 먼저 왔다(2026-09-17).
   *
   * 14개 06-1 화면이 모두 이 파일을 싣는다. 화면마다 문구를 넣으면 새 서비스가 생길
   * 때마다 빠지므로 여기서 한 번만 올린다.
   */
  function ensureImportantNotice(host) {
    if (!isDetailPage() && !isPermalink()) return;
    if (document.querySelector('[data-umsh-notice]')) return;
    var anchor = host && host.closest ? (host.closest('section, article, main, body') || host) : document.body;
    if (!anchor) return;
    var box = document.createElement('aside');
    box.setAttribute('data-umsh-notice', '');
    box.setAttribute('role', 'note');
    box.style.cssText = [
      'margin:0 0 18px', 'padding:14px 16px', 'border-radius:14px',
      'background:rgba(226,184,123,.16)', 'border:1px solid rgba(246,222,170,.45)',
      'display:flex', 'gap:11px', 'align-items:flex-start', 'word-break:keep-all',
    ].join(';');
    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📜';
    icon.style.cssText = 'flex:none;font-size:18px;line-height:1.3';
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';
    var title = document.createElement('strong');
    title.textContent = '중요 안내';
    title.style.cssText = 'display:block;margin-bottom:5px;font-size:13px;font-weight:900;letter-spacing:.06em;color:#ffe9b8';
    var lines = [
      ['당신만의 운명 해석이 지금 정밀하게 완성되고 있습니다.', 'lead'],
      ['구매하신 해석은 단순히 정해진 결과를 보여드리는 방식이 아닙니다. 자체 만세력 · 자미두수 · 명리학 데이터를 함께 분석해, 당신의 사주에 맞춰 목차별 해석을 하나씩 생성합니다.', ''],
      ['정밀한 분석 과정으로 인해 전체 완성까지 약 30~50분 정도 소요될 수 있습니다.', 'strongish'],
      ['창을 닫으셔도 분석은 계속 진행됩니다. 지금 나가셔도 괜찮습니다. 나중에 다시 이 자리로 돌아오시면 완성된 해석을 이어서 확인하실 수 있습니다.', ''],
      ['조금만 기다려 주세요. 당신의 데이터를 바탕으로 한 해석이 하나씩 완성되고 있습니다.', ''],
    ];
    body.appendChild(title);
    for (var i = 0; i < lines.length; i += 1) {
      var line = document.createElement('p');
      line.textContent = lines[i][0];
      var tone = lines[i][1] === 'lead' ? 'color:#fffaf0;font-weight:700'
        : lines[i][1] === 'strongish' ? 'color:#ffe9b8;font-weight:800'
          : 'color:#f7f2e8';
      line.style.cssText = 'margin:0 0 7px;font-size:13.5px;line-height:1.75;' + tone;
      if (i === lines.length - 1) line.style.marginBottom = '0';
      body.appendChild(line);
    }
    box.appendChild(icon);
    box.appendChild(body);
    // 목차 위에 놓는 것이 목적이지만, 앞에 끼울 수 없는 자리면 붙이기라도 한다 —
    // 안내가 사라지는 것보다 위치가 아쉬운 편이 낫다.
    if (typeof anchor.insertBefore === 'function' && anchor.firstChild) anchor.insertBefore(box, anchor.firstChild);
    else if (typeof anchor.appendChild === 'function') anchor.appendChild(box);
  }

  function ensurePdfDock(host) {
    // 06-1 상세 화면이 없는 서비스는 공용 리더(`/r/:id`)로 떨어진다. 보관함에서 여는 화면이
    // 거기라서, 고유 주소도 상세 화면과 같이 PDF 를 받을 수 있어야 한다. 티저(04)는 제외 —
    // 아직 열지 않은 본문의 PDF 를 권할 자리가 아니다.
    if (!isDetailPage() && !isPermalink()) return;
    ensurePrintStyles();
    if (document.querySelector('[data-umsh-pdf], #btn-pdf')) return;
    var anchor = host && host.closest ? (host.closest('section, article, main, body') || host) : document.body;
    if (!anchor) return;
    var dock = document.createElement('div');
    dock.className = 'umsh-pdf-dock';
    dock.setAttribute('data-umsh-pdf-auto', '');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pdf-button';
    button.setAttribute('data-umsh-pdf', '');
    button.textContent = 'PDF 저장';
    dock.appendChild(button);
    anchor.appendChild(dock);
  }
  function sectionStateClass(section) {
    if (!section) return 'is-pending';
    if (section.status === 'complete') return 'is-ready';
    if (section.status === 'generating') return 'is-generating';
    if (section.status === 'failed') return 'is-failed';
    return 'is-pending';
  }
  /**
   * 확정형 진행률. 서버가 주는 report.progress {complete,total} 를 퍼센트로 그린다.
   * 기존 `.interpret-progress` 는 방향만 보여주는 무한 스캔 애니메이션이라
   * "얼마나 남았는지"를 답하지 못했다.
   */
  function renderProgress(report) {
    var node = slotNode('progress');
    if (!node) return;
    var sections = (report && report.sections) || [];
    var progress = report && report.progress;
    var total = (progress && progress.total) || sections.length || 0;
    if (!total) { node.setAttribute('hidden', ''); return; }
    var done = progress && typeof progress.complete === 'number'
      ? progress.complete
      : sections.filter(function (item) { return item.status === 'complete'; }).length;
    done = Math.max(0, Math.min(total, done));
    var percent = Math.round((done / total) * 100);
    var complete = done >= total;
    node.removeAttribute('hidden');
    revealAncestors(node);
    node.setAttribute('role', 'progressbar');
    node.setAttribute('aria-valuemin', '0');
    node.setAttribute('aria-valuemax', String(total));
    node.setAttribute('aria-valuenow', String(done));
    node.setAttribute('aria-valuetext', total + '개 항목 중 ' + done + '개 준비 완료');
    node.setAttribute('data-umsh-progress-state', complete ? 'complete' : 'working');
    node.innerHTML =
      '<div class="umsh-progress-head">' +
        '<span class="umsh-progress-label">' + (complete ? '해석 준비 완료' : '해석 준비 중') + '</span>' +
        '<span class="umsh-progress-count"><strong>' + done + '</strong> / ' + total + '</span>' +
      '</div>' +
      '<div class="umsh-progress-track"><div class="umsh-progress-fill" style="width:' + percent + '%"></div></div>';
    // 안내 문구는 걷어냈다. "목차는 지금 보실 수 있고…" 같은 설명은 우리 사정이지
    // 읽는 사람이 알아야 할 내용이 아니다. 숫자와 막대, 항목별 배지로 충분하다.
    // (failed 개수는 항목 카드의 '미완성' 배지가 이미 말한다.)
    markFilled(node);
  }
  /** 무료 티저 — 정적 샘플 문구를 내 입력에서 검증된 값으로 교체한다. */
  function renderPreviewInPlace(payload) {
    if (!inPlaceEnabled()) return false;
    ensureInPlaceStyles();
    var preview = payload.preview || {};
    var source = preview.signals && preview.signals.length ? preview.signals : (preview.insights || []);
    var insights = source.filter(function (line) {
      return String(line).trim() !== String(preview.summary || '').trim();
    });
    var filled = false;
    if (paintTeaserPreview(preview)) filled = true;
    if (fillText('headline', preview.headline || preview.title || '먼저 확인한 방향')) filled = true;
    if (fillText('summary', preview.summary || '')) filled = true;
    if (fillSlot('insights', insights.map(function (line, index) {
      return '<article class="umsh-insight">' +
        '<span class="umsh-insight-index" aria-hidden="true">' + ('0' + (index + 1)).slice(-2) + '</span>' +
        '<p>' + escapeHtml(line) + '</p></article>';
    }).join(''))) filled = true;
    if (fillText('paid-value', preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.')) filled = true;
    var checkout = slotNode('checkout');
    if (checkout) {
      var cta = previewCta(payload);
      if (checkout.tagName === 'A') {
        checkout.setAttribute('href', cta.href);
        if (checkout.textContent && /전체|보기|목차|결제/.test(checkout.textContent)) checkout.textContent = cta.label;
      } else checkout.setAttribute('data-umsh-checkout-url', cta.href);
      markFilled(checkout);
      filled = true;
    }
    // 디자인에 맞는 자리가 하나도 없으면 만들어 넣는다. 여기서 false 를 돌려주면
    // showPreview 가 panel() 로 떨어져 등록 디자인이 사라진다 — 그 경로를 없앤다.
    if (!filled) filled = fillSlot('preview', previewBlock(payload, insights));
    renderProgress(payload.report);
    return filled;
  }
  /** 자리를 만들어 넣을 때 쓰는 미리보기 본문. 디자인 슬롯을 찾은 경우에는 쓰지 않는다. */
  function previewBlock(payload, insights) {
    var preview = payload.preview || {};
    var cta = previewCta(payload);
    return '<h2 class="umsh-preview-headline">' + escapeHtml(preview.headline || preview.title || '먼저 확인한 방향') + '</h2>'
      + (preview.summary ? '<p class="umsh-preview-summary">' + escapeHtml(preview.summary) + '</p>' : '')
      + (insights.length
        ? '<div class="umsh-preview-insights">' + insights.map(function (line, index) {
            return '<article class="umsh-insight">'
              + '<span class="umsh-insight-index" aria-hidden="true">' + ('0' + (index + 1)).slice(-2) + '</span>'
              + '<p>' + escapeHtml(line) + '</p></article>';
          }).join('') + '</div>'
        : '')
      + '<p class="umsh-preview-paid">' + escapeHtml(preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.') + '</p>'
      + '<a class="umsh-preview-checkout" href="' + escapeHtml(cta.href) + '">' + escapeHtml(cta.label) + '</a>';
  }
  /** 전체 해석 — 목록과 본문을 디자인 안 슬롯에 채운다. */
  function renderReportInPlace(payload) {
    if (!inPlaceEnabled()) return false;
    var report = payload.report;
    var host = slotNode('sections');
    if (!host) return false;
    ensureInPlaceStyles();
    var selected = new URLSearchParams(location.search).get('section') || '';
    var opened = Array.prototype.map.call(host.querySelectorAll('details[open]'), function (item) { return item.dataset.section; });
    fillText('title', report.title);
    fillText('subtitle', report.subtitle);
    host.innerHTML = report.sections.map(function (section, index) {
      var ready = section.status === 'complete' && typeof section.interpretation === 'string' && section.interpretation.trim();
      var body = ready ? richSectionBody(section) : (
        '<div class="umsh-section-skeleton" role="status" aria-live="polite">' +
          '<strong>' + escapeHtml(labelText(section.classification) || '이 항목') + ' 해석을 준비하고 있어요</strong>' +
          '<p>' + (section.status === 'failed'
            ? '이 항목을 완성하지 못했습니다. 완료된 항목은 그대로 읽을 수 있습니다.'
            : '목차는 바로 보실 수 있고, 이 장의 풀이가 끝나는 대로 채워집니다.') + '</p>' +
          (section.status === 'failed'
            ? '<button type="button" class="reading-retry" data-retry-section="' + escapeHtml(section.id) + '">이 항목 다시 준비하기</button>'
            : '<div class="interpret-progress" aria-hidden="true"></div>') +
        '</div>');
      var open = opened.indexOf(section.id) !== -1 || selected === section.id
        || selected === section.generationId || (!opened.length && !selected && index === 0);
      return '<details class="reading-card ' + sectionStateClass(section) + '" data-section="' + escapeHtml(section.id) + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + escapeHtml(labelText(section.category) + ' · ' + labelText(section.classification)) + '</summary>' +
        body + '</details>';
    }).join('');
    // 목차 위에 결론·서머리·하이라이트를 올린다. 본문 섹션 마크업은 건드리지 않는다.
    mountLongform(host, report, payload.entitled !== false);
    revealAncestors(host);
    markFilled(host);
    renderProgress(report);
    ensureImportantNotice(host);
    ensurePdfDock(host);
    return true;
  }
  /** 진행 안내를 디자인 안 상태 슬롯에 표시한다. 본문 슬롯은 건드리지 않는다. */
  function statusInPlace(message) {
    if (!inPlaceEnabled()) return false;
    var node = slotNode('state');
    if (!node) return false;
    ensureInPlaceStyles();
    node.innerHTML = '<p class="umsh-gate-message" role="status">' + escapeHtml(message) + '</p>';
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  /** 접근 차단 안내를 디자인 안에서 보여준다. 본문 슬롯은 채우지 않아 가려진 채로 둔다. */
  function gateInPlace(message) {
    if (!inPlaceEnabled()) return false;
    var node = slotNode('state');
    if (!node) return false;
    ensureInPlaceStyles();
    node.innerHTML = '<p class="umsh-gate-message" role="status">' + escapeHtml(message) + '</p>' +
      '<p class="umsh-gate-actions">' +
        '<a href="/signup?entry=saved-report&returnTo=' + encodeURIComponent(location.pathname + location.search) + '#login">로그인</a>' +
        ' · <a href="' + escapeHtml(route ? route[0] : '/') + '">서비스로 돌아가기</a>' +
      '</p>';
    markFilled(node);
    return true;
  }


  /* ==================================================================
   * 톤 v2 섹션 렌더
   *
   * `SectionStorytelling` 은 본문 문단 말고도 아래를 싣고 온다.
   *   feel · softBridge · tableMd/tableCaption · chartPoints/chartCaption
   *   · scene · actions[]
   * 여기에 섹션 단위 이미지(imageSrc/imageAlt)와 근거(patternKeys/ragTopics)가 붙는다.
   *
   * 기존 `readySectionBody()` 는 hook + 문단만 그려서 이 중 대부분을 버렸다.
   * 등록 디자인이 이미 이미지·표·행동 블록을 전제로 잡혀 있으므로, 빠진 만큼을
   * 여기서 만들어 채운다. storytelling 이 없으면 기존 렌더로 폴백한다.
   * ================================================================== */

  /** 마크다운 파이프 표를 안전한 HTML 표로. 셀은 전부 이스케이프한다. */
  function renderMarkdownTable(markdown, caption) {
    var lines = String(markdown || '').split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    var rows = lines.filter(function (line) { return line.indexOf('|') !== -1; }).map(function (line) {
      return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) { return cell.trim(); });
    });
    // 두 번째 줄이 --- 구분선이면 헤더가 있는 표다.
    var hasHeader = rows.length > 1 && rows[1].every(function (cell) { return /^:?-{2,}:?$/.test(cell); });
    if (hasHeader) rows.splice(1, 1);
    if (!rows.length) return '';
    var head = hasHeader
      ? '<thead><tr>' + rows[0].map(function (cell) { return '<th scope="col">' + escapeHtml(cell) + '</th>'; }).join('') + '</tr></thead>'
      : '';
    var bodyRows = hasHeader ? rows.slice(1) : rows;
    var body = '<tbody>' + bodyRows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<figure class="story-table-figure">' +
      '<div class="story-table-scroll"><table class="story-table">' + head + body + '</table></div>' +
      (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
      '</figure>';
  }

  /**
   * 수평 막대. 항목이 적고(보통 3~6개) 크기 비교가 목적이라 막대가 맞다.
   * 단일 계열이라 범례를 두지 않고, 값과 설명을 전부 글자로 직접 붙인다 —
   * 색만으로 정보를 전달하지 않고, 표 대체본이 따로 필요하지도 않게 된다.
   */
  function renderStoryChart(points, caption) {
    var list = (points || []).filter(function (point) {
      return point && typeof point.value === 'number' && isFinite(point.value);
    });
    if (!list.length) return '';
    var max = list.reduce(function (acc, point) { return Math.max(acc, Math.abs(point.value)); }, 0) || 1;
    var bars = list.map(function (point) {
      var percent = Math.max(2, Math.round((Math.abs(point.value) / max) * 100));
      var note = String(point.note || '').trim();
      return '<li class="story-chart-row"' + (note ? ' title="' + escapeHtml(note) + '"' : '') + '>' +
        '<div class="story-chart-head">' +
          '<span class="story-chart-label">' + escapeHtml(point.label) + '</span>' +
          '<span class="story-chart-value">' + escapeHtml(String(point.value)) + '</span>' +
        '</div>' +
        '<div class="story-chart-track"><div class="story-chart-fill" style="width:' + percent + '%"></div></div>' +
        (note ? '<p class="story-chart-note">' + escapeHtml(note) + '</p>' : '') +
        '</li>';
    }).join('');
    var summary = list.map(function (point) { return point.label + ' ' + point.value; }).join(', ');
    return '<figure class="story-chart-figure">' +
      '<ul class="story-chart" role="img" aria-label="' + escapeHtml(summary) + '">' + bars + '</ul>' +
      (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
      '</figure>';
  }

  /** 섹션 전용 이미지. 등록 디자인의 장면 이미지가 여기로 들어온다. */
  function renderSectionImage(section) {
    var src = String(section.imageSrc || '').trim();
    if (!src) return '';
    return '<figure class="story-image">' +
      '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(section.imageAlt || '') + '" loading="lazy" decoding="async" />' +
      '</figure>';
  }

  /** 근거 칩. 어떤 기준으로 본 해석인지 드러낸다. */
  function renderSectionEvidence(section) {
    var keys = []
      .concat(Array.isArray(section.patternKeys) ? section.patternKeys : [])
      .concat(Array.isArray(section.ragTopics) ? section.ragTopics : [])
      .map(function (key) { return String(key || '').trim(); })
      .filter(Boolean);
    var seen = {};
    var unique = keys.filter(function (key) { if (seen[key]) return false; seen[key] = 1; return true; }).slice(0, 8);
    if (!unique.length) return '';
    return '<div class="story-evidence"><span class="reading-role">확인된 기준</span>' +
      '<ul>' + unique.map(function (key) { return '<li>' + escapeHtml(key) + '</li>'; }).join('') + '</ul></div>';
  }

  function paragraphsOf(value) {
    return String(value || '').split(/\n\s*\n/).map(function (part) { return part.trim(); }).filter(Boolean);
  }

  /** 톤 v2 본문. storytelling 이 없으면 기존 렌더로 넘긴다. */
  function richSectionBody(section) {
    var story = section && section.storytelling;
    if (!story) return readySectionBody(section);

    var blocks = [];
    blocks.push(renderSectionImage(section));

    var hook = String(section.hook || '').trim();
    if (hook) blocks.push(readingBlock('answer', '한 줄 답', [hook]));
    if (story.feel) blocks.push(readingBlock('feel', '지금 상태', paragraphsOf(story.feel)));
    if (story.softBridge) blocks.push(readingBlock('bridge', '이어서', paragraphsOf(story.softBridge)));

    // 본문에서 hook 중복을 덜어낸다.
    var interpretation = String(section.interpretation || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    if (hook && interpretation.indexOf(hook) === 0) interpretation = interpretation.slice(hook.length).trim();
    var body = paragraphsOf(interpretation);
    if (body.length) blocks.push(readingBlock('evidence', '근거', body));

    if (story.tableMd) blocks.push(renderMarkdownTable(story.tableMd, story.tableCaption));
    if (story.chartPoints && story.chartPoints.length) blocks.push(renderStoryChart(story.chartPoints, story.chartCaption));
    if (story.scene) blocks.push(readingBlock('scene', '생활 장면', paragraphsOf(story.scene)));

    if (Array.isArray(story.actions) && story.actions.length) {
      blocks.push('<section class="reading-block reading-action" aria-label="지금 할 것">' +
        '<span class="reading-role">지금 할 것</span>' +
        '<ol class="story-actions">' + story.actions.map(function (action) {
          return '<li>' + escapeHtml(String(action)) + '</li>';
        }).join('') + '</ol></section>');
    }

    blocks.push(renderSectionEvidence(section));
    return blocks.filter(Boolean).join('');
  }

  function showPreview(payload, request) {
    authorized = null;
    if (key === 'home_fit' && global.UMSHHomeReading && global.UMSHHomeReading.render(payload)) return;
    if (key === 'wedding_day' && global.UMSHWeddingReading && global.UMSHWeddingReading.render(payload)) return;
    // 등록 디자인에 슬롯이 있으면 화면을 갈아끼우지 않고 슬롯만 채운다.
    if (renderPreviewInPlace(payload)) { if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search); return; }
    // 옵트인한 페이지에서 여기까지 왔다면 자리조차 만들 수 없었다는 뜻이다. 그래도
    // 디자인을 지우지는 않는다 — 사용자가 본 것은 등록 화면이고, 갈아끼우면 남의 화면이 된다.
    if (inPlaceEnabled()) { if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search); return; }
    var preview = payload.preview || {};
    var sourceInsights = preview.signals && preview.signals.length ? preview.signals : (preview.insights || []);
    var insights = sourceInsights.filter(function(line){return String(line).trim()!==String(preview.summary || '').trim();});
  var node = panel();
    var cta = previewCta(payload);
    node.innerHTML = navigation()
      + '<header class="preview-heading"><span class="preview-eyebrow">운명상회 · 내 입력으로 먼저 보는 해석</span><h1>' + escapeHtml(preview.headline || preview.title || '먼저 확인한 방향') + '</h1><p class="preview-summary">' + escapeHtml(preview.summary || '') + '</p></header>'
      + '<section class="preview-evidence" aria-labelledby="preview-evidence-title"><span class="reading-role">대표 근거</span><h2 id="preview-evidence-title">지금 먼저 확인할 장면</h2><div class="preview-evidence-list">' + insights.map(function(line,index){return '<article><span aria-hidden="true">0'+(index+1)+'</span><p>' + escapeHtml(line) + '</p></article>';}).join('') + '</div></section>'
      + '<section class="preview-scope" aria-labelledby="preview-scope-title"><span class="reading-role">전체 해석 범위</span><h2 id="preview-scope-title">이어서 비교할 내용</h2><p>' + escapeHtml(preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.') + '</p></section>'
      + '<a id="umsh-preview-checkout" class="reading-primary-link" href="' + escapeHtml(cta.href) + '">' + escapeHtml(cta.label) + '</a><p class="preview-note">현재 화면은 전체 본문을 열지 않고, 내 입력에서 확인된 방향과 대표 근거만 보여줍니다. 이미 받은 결과는 고유 주소로 다시 확인할 수 있어요.</p>';
    if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search);
  }
  function showReport(payload) {
    var report = payload.report;
    if (!report || !Array.isArray(report.sections)) return;
    var serverKey = canonical((payload.context && payload.context.serviceKey) || report.serviceKey || key);
    if (key && serverKey !== key) { gate('이 서비스의 해석이 아닙니다. 구매 내역에서 해당 결과를 열어 주세요.'); return; }
    authorized = report;
    if (key === 'home_fit' && global.UMSHHomeReading && global.UMSHHomeReading.render(payload)) return;
    if (key === 'wedding_day' && global.UMSHWeddingReading && global.UMSHWeddingReading.render(payload)) return;
    if (renderReportInPlace(payload)) return;
    if (inPlaceEnabled()) return;
    var selected = new URLSearchParams(location.search).get('section') || '';
    var node = panel();
    var opened = Array.from(node.querySelectorAll('details[open]')).map(function(item){return item.dataset.section;});
    node.innerHTML = navigation() + '<span style="color:#e5bd69">운명상회 · 저장된 전체 해석</span><h1 style="font-size:26px">' + escapeHtml(report.title) + '</h1><p>' + escapeHtml(report.subtitle) + '</p><p style="font-size:13px">이 주소로 다시 열면 같은 해석을 확인합니다.</p>' + '<div id="umsh-longform-mount"></div>' + report.sections.map(function(section,index) {
      var ready = section.status === 'complete' && typeof section.interpretation === 'string' && section.interpretation.trim();
      var body = ready ? readySectionBody(section) : '<p role="status">' + (section.status === 'failed' ? '이 항목을 완성하지 못했습니다. 완료된 항목은 그대로 읽을 수 있습니다.' : '해석을 준비하고 있습니다. 완료되면 이 자리에 전체 내용이 표시됩니다.') + '</p>' + (section.status === 'failed' ? '<button type="button" class="reading-retry" data-retry-section="'+escapeHtml(section.id)+'">이 항목 다시 준비하기</button>':'');
      return '<details data-section="' + escapeHtml(section.id) + '" class="reading-card"' + ((opened.indexOf(section.id) !== -1 || selected === section.id || selected === section.generationId || (!opened.length && !selected && index===0))?' open':'') + '><summary>' + escapeHtml(labelText(section.category) + ' · ' + labelText(section.classification)) + '</summary>' + body + '</details>';
    }).join('');
    // 공용 리더(/r/:id). 06-1 이 없는 서비스(cmdg)가 여기로 온다 — 같은 세 블록을 같은 자리에 올린다.
    mountLongform(document.getElementById('umsh-longform-mount'), report, payload.entitled !== false);
    var id = identity(payload);
    if (id && key !== 'home_fit') node.insertAdjacentHTML('beforeend','<a style="color:#e5bd69" href="/r/'+encodeURIComponent(id)+'">이 해석의 고유 주소 열기</a>');
    ensureImportantNotice(node);
    ensurePdfDock(node);
  }
  function expandReportForPrint() {
    printOpenedSections = Array.from(document.querySelectorAll('details.reading-card:not([open])'));
    printOpenedSections.forEach(function (item) { item.setAttribute('open', ''); });
  }
  function restoreReportAfterPrint() {
    printOpenedSections.forEach(function (item) { item.removeAttribute('open'); });
    printOpenedSections = [];
  }
  function validTodayScore(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  }
  function todayScoreBadge(value, label, total) {
    if (value === null) return '';
    return '<div class="'+(total?'daily-score-total':'daily-score-badge')+'" role="img" aria-label="'+escapeHtml(label+' 점수 '+value+'점, 100점 만점')+'"><span aria-hidden="true">'+(total?'<span class="daily-score-label">오늘의 운</span>':'')+'<strong>'+value+'</strong><span class="daily-score-unit">점</span></span></div>';
  }
  function showToday(payload) {
    authorized=null;
    var fortune=payload.todayFortune || {}, reading=fortune.reading || {};
    var details=reading.details || {}, scores=reading.score || {};
    var totalScore=validTodayScore(scores.total);
    var rows=[['work','일과 활동','01'],['money','돈과 선택','02'],['relationship','관계와 대화','03'],['caution','오늘 챙길 것','04']];
    var node=panel();
    var zodiac=reading.zodiac;
    node.className='umsh-daily-reading';
    node.innerHTML='<header class="daily-heading"><span class="daily-eyebrow">오늘 나한테 들어온 운</span><p class="daily-date">'+escapeHtml(fortune.date && fortune.date.label)+' · '+escapeHtml(fortune.profile && fortune.profile.name)+'</p><div class="daily-heading-row"><h1>'+escapeHtml(reading.title || '오늘의 운세')+'</h1>'+todayScoreBadge(totalScore,'오늘의 운',true)+'</div>'+(totalScore!==null?'<p class="daily-score-caption">100점 기준 · 오늘의 흐름 지표</p>':'')+'<p class="daily-summary">'+escapeHtml(reading.summary)+'</p></header>'+(zodiac?'<section class="daily-zodiac" aria-label="출생연도별 오늘운"><span class="daily-eyebrow">나의 띠별 오늘운 · 출생연도 기준</span><h2>'+escapeHtml(zodiac.title || zodiac.birthYear+'년생 · '+zodiac.animal+'띠')+'</h2><p>'+escapeHtml(zodiac.text)+'</p></section>':'')+'<div class="daily-sections">'+rows.map(function(row){var detail=details[row[0]] || {};var score=validTodayScore(detail.score);if(score===null)score=validTodayScore(scores[row[0]]);return '<section class="daily-card"><span class="daily-index" aria-hidden="true">'+row[2]+'</span><div class="daily-card-heading"><h2>'+row[1]+'</h2>'+todayScoreBadge(score,row[1],false)+'</div><p>'+escapeHtml(detail.text || reading[row[0]])+'</p>'+(detail.opportunity?'<p class="daily-tip"><strong>이렇게 활용하세요</strong> '+escapeHtml(detail.opportunity)+'</p>':'')+(detail.caution?'<p class="daily-tip"><strong>한 가지만 주의하세요</strong> '+escapeHtml(detail.caution)+'</p>':'')+'</section>';}).join('')+'</div><section class="daily-conclusion"><span class="daily-eyebrow">오늘의 결론</span><h2>오늘은 이렇게 움직이세요</h2><p>'+escapeHtml(reading.action)+'</p></section><p class="daily-note">내 사주와 오늘의 일진으로 풀어보는 하루의 방향</p><nav class="daily-links" aria-label="오늘운 다시 보기"><a class="daily-primary-link" href="/today/free?start=1">새 오늘운 확인</a></nav>';
  }
  function consume(payload, headers, request) {
    if (!payload || (!payload.report && !payload.previewOnly && !payload.todayFortune)) return payload;
    var responseKey=canonical(payload.todayFortune ? 'today' : payload.serviceKey || (payload.context && payload.context.serviceKey) || (payload.report && payload.report.serviceKey) || key);
    if(key && responseKey!==key) {gate('이 서비스의 해석이 아닙니다. 구매 내역에서 해당 결과를 열어 주세요.');return payload;}
    remember(payload);
    var epoch=ownerEpoch;
    setTimeout(function(){if(epoch===ownerEpoch)remember(payload);},0);
    headerCache = headers || headerCache;
    if (payload.todayFortune) showToday(payload);
    else if (payload.previewOnly) {
      // 04는 동결 티저를 유지한다. 05·06·종합은 권한이 있으면 본문 GET으로 넘어간다.
      if (isEntitled(payload) && identity(payload) && !isTeaserPage()) {
        refresh(identity(payload));
        return payload;
      }
      showPreview(payload, request);
    }
    else if (isOutputPage() || /\/(?:love\/(?:mind|again|spouse)|work\/job)(?:\/|$)/.test(location.pathname)) {
      showReport(payload);
      resumePending(payload);
      var pending = payload.report.sections.some(function(section){return !['complete','failed'].includes(section.status);});
      if (pending && !pollTimer) pollTimer = setTimeout(function(){pollTimer=null;refresh(identity(payload)).catch(function(){});},1800);
    }
    return payload;
  }
  async function resumeSection(reportId,sectionId,retry) {
    if(resuming.has(sectionId) || resuming.size>=4)return;
    resuming.add(sectionId);
    try {
      await rawFetch('/api/report/section',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headerCache || {}),body:JSON.stringify({reportId:reportId,sectionId:sectionId,...(retry ? {retry:true}:{})})});
    } finally {resuming.delete(sectionId);}
  }
  function resumePending(payload) {
    if(!headerCache || !payload.report)return;
    var id=payload.reportId || payload.report.reportId || identity(payload);
    payload.report.sections.filter(function(section){return !resuming.has(section.id) && (section.status==='pending' || section.status==='generating');}).slice(0,Math.max(0,4-resuming.size)).forEach(function(section){resumeSection(id,section.id).catch(function(){});});
  }
  async function refresh(id) {
    if (!id) return;
    var epoch=ownerEpoch;
    var response = await rawFetch(reportUrl(id,new URLSearchParams(location.search).get('orderId')), {headers:headerCache || {},cache:'no-store'});
    var payload = await response.json().catch(function(){return {};});
    if(epoch!==ownerEpoch) return;
    if (!response.ok) { gate(payload.error || '이 계정에서 해석을 확인할 수 없습니다. 로그인과 구매 내역을 확인해 주세요.'); return; }
    consume(payload,headerCache);
  }
  async function reportFetch(path, options) {
    options = options || {};
    var daily=/\/api\/today\/fortune(?:\?|$)/.test(path);
    if (!daily && !/\/analyze(?:\?|$)/.test(path)) return rawFetch(path,options);
    var body = {}; try {body=JSON.parse(options.body || '{}');} catch (_) {}
    var id = body.reportId || body.resultId || ((!daily || !key || key==='today_fortune') ? locationId() || (isOutputPage() ? rememberedId : '') : '');
    if(daily && (key==='saju_master' || key==='today_fortune')) key='today_fortune';
    var explicitPaid = Boolean(body.orderId);
    var target = path;
    var next = Object.assign({},options);
    if (id) { target=reportUrl(id,body.orderId || new URLSearchParams(location.search).get('orderId')); delete next.body;next.method='GET';next.cache='no-store'; }
    else if (!explicitPaid && !daily && !isDetailPage()) {
      // 04·입력·종합은 동결 티저. 05·06에 preview를 붙이면 권한 있는 목차가 빈 골격으로 남는다.
      next.body=JSON.stringify(Object.assign({},body,{preview:true}));
    }
    var epoch=ownerEpoch;
    var response=await rawFetch(target,next);
    var payload=await response.clone().json().catch(function(){return {};});
    if(epoch!==ownerEpoch) return new Response(JSON.stringify({error:'계정이 변경되었습니다. 현재 계정으로 다시 열어 주세요.',code:'ACCOUNT_CHANGED'}),{status:403,headers:{'Content-Type':'application/json'}});
    if (response.ok) consume(payload,next.headers,body);
    else if (id) gate(payload.error || '저장된 해석을 확인할 수 없습니다.');
    return response;
  }
  async function boot() {
    if (booting || (!key && !isPermalink()) || !isOutputPage()) return;
    var id=locationId() || rememberedId;
    booting=true;
    // 확인 중이라는 문구는 화면에 쓰지 않는다. 등록 디자인이 이미 떠 있고, 곧
    // 진행률이나 본문이 그 자리를 채운다. 옵트인하지 않은 화면에서만 예전처럼 알린다.
    // (panel() 은 등록 디자인을 통째로 감추므로 in-place 화면에서는 절대 부르지 않는다.)
    if (!inPlaceEnabled()) {
      panel().innerHTML='<p role="status">저장된 해석을 확인하고 있습니다.</p>';
    }
    try {
      var config=await rawFetch('/api/auth/config').then(function(r){return r.json();});
      if(config.developmentReportAccess===true) {headerCache={};if(id)await refresh(id);return;}
      if (!config.enabled) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      var runtimeOk = global.UMSHAuthSession && global.UMSHAuthSession.waitForRuntime
        ? await global.UMSHAuthSession.waitForRuntime(1500)
        : Boolean(global.supabase && global.UMSHAuthSession);
      if (!runtimeOk || !global.UMSHAuthSession) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      var resolved = global.UMSHAuthSession.resolveLiveSession
        ? await global.UMSHAuthSession.resolveLiveSession(config, 900)
        : null;
      var client = resolved && resolved.client || global.UMSHAuthSession.createClient(global.supabase,config.url,config.publishableKey);
      var session = resolved && resolved.session;
      if (!session || !session.access_token) {
        if (!session && client) {
          var result=await client.auth.getSession();
          session=await global.UMSHAuthSession.enforceDeviceAuthSession(result.data.session,client);
        }
      }
      if (!session || !session.access_token) {
        if (/\/04-step-4-report\//.test(location.pathname) && !id) {
          document.documentElement.removeAttribute('data-umsh-report-check');
          return;
        }
        throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      }
      setOwner(session.user && session.user.id);
      headerCache={Authorization:'Bearer '+session.access_token};
      client.auth.onAuthStateChange(function(event,nextSession){
        setOwner(nextSession && nextSession.user && nextSession.user.id);
        if(event==='SIGNED_OUT' || !nextSession || nextSession.user.id!==session.user.id) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
        else if(nextSession.access_token) headerCache={Authorization:'Bearer '+nextSession.access_token};
      });
      id=locationId() || rememberedId;
      if(id) await refresh(id);
      else if(key==='newyear_flow' && /04-step/.test(location.pathname) && new URLSearchParams(location.search).get('orderId')) {
        var response=await reportFetch('/api/flow/newyear/analyze',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headerCache),body:JSON.stringify({orderId:new URLSearchParams(location.search).get('orderId')})});
        if(!response.ok) {var failed=await response.json().catch(function(){return {};});gate(failed.error || '구매 내역에서 결제 상태를 확인해 주세요.');}
      }
      else if(!authorized) {
        // 04 무료 티저는 reportId 없이 analyze(preview)로 채운다. 여기서 막으면
        // 정상 미리보기도 "확인 중/계산 실패"로 덮인다.
        if (/\/04-step-4-report\//.test(location.pathname) && !id) {
          document.documentElement.removeAttribute('data-umsh-report-check');
          return;
        }
        gate(isDetailPage() ? '저장된 해석 주소가 없습니다. 구매 내역에서 결과를 열어 주세요.' : '입력한 내용을 확인하고 있습니다. 입력이 아직 없다면 서비스로 돌아가 사주와 현재 상황을 알려 주세요.');
      }
    } catch(error) {
      if (/\/04-step-4-report\//.test(location.pathname) && !id) {
        document.documentElement.removeAttribute('data-umsh-report-check');
        return;
      }
      gate(error.message || '저장된 해석을 불러오지 못했습니다.');
    }
  }
  // Browser caches are lookup hints, never proof of ownership or purchase. Only a
  // fresh authenticated GET may supply displayable report content on a new page.
  if (key) {
    try {
      for(var index=sessionStorage.length-1;index>=0;index--) {
        var cacheKey=sessionStorage.key(index);
        if (!(LEGACY[key] || []).concat(NESTED[key] || []).includes(cacheKey)) continue;
        var parsed;try{parsed=JSON.parse(sessionStorage.getItem(cacheKey));}catch(_){continue;}
        var report=parsed && (parsed.sections?parsed:parsed.report || (parsed.analysis && parsed.analysis.report));
        if (!report || !Array.isArray(report.sections)) continue;
        if (isOutputPage() && !rememberedId && identity(report)) rememberedId=identity(report);
        if((NESTED[key] || []).includes(cacheKey)) {delete parsed.analysis;sessionStorage.setItem(cacheKey,JSON.stringify(parsed));}
        else sessionStorage.removeItem(cacheKey);
      }
    } catch(_) {}
  }
  function hasPaidReading(report) {
    if (report && (report.isPaid === true || report.paid === true || report.entitlement === 'paid')) return true;
    return Boolean(report && Array.isArray(report.sections) && report.sections.some(function (section) {
      return String((section && (section.interpretation || section.hook)) || '').trim();
    }));
  }
  function isEntitled(outcome) {
    if (!outcome || typeof outcome !== 'object') return false;
    var payload = outcome.payload && typeof outcome.payload === 'object' ? outcome.payload : outcome;
    var report = outcome.report;
    if (!report && payload.report && Array.isArray(payload.report.sections)) report = payload.report;
    if (outcome.entitled === true || payload.entitled === true) return true;
    if (hasPaidReading(report)) return true;
    var reason = String(payload.unlockReason || (report && report.unlockReason) || '').trim();
    return reason === 'admin' || reason === 'open' || reason === 'order';
  }
  function tocHref(reportId) {
    var id = String(reportId || rememberedId || '').trim();
    try {
      var url = new URL('../05-step-5-chat/chat.html', location.href);
      if (id) url.searchParams.set('reportId', id);
      url.hash = 'step-5-chat';
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '../05-step-5-chat/chat.html' + (id ? '?reportId=' + encodeURIComponent(id) : '') + '#step-5-chat';
    }
  }
  function previewCta(payload) {
    var entitled = isEntitled(payload);
    var id = identity(payload);
    if (entitled) {
      if (isTeaserPage()) return { href: tocHref(id), label: '전체 목차 열기' };
      if (id) return { href: '/r/' + encodeURIComponent(id), label: '전체 목차 열기' };
      return { href: location.pathname + location.search, label: '전체 목차 열기' };
    }
    return {
      href: (payload && payload.paymentUrl) || ('/payment?service=' + encodeURIComponent(key || 'cmdg')),
      label: '전체 보기',
    };
  }
  function acceptAnalyze(payload) {
    if (!payload || typeof payload !== 'object') return null;
    var preview = payload.preview;
    var hasPreview = Boolean(preview && String(preview.headline || preview.summary || preview.title || '').trim());
    var report = payload.report && Array.isArray(payload.report.sections) && payload.report.sections.length
      ? payload.report
      : (Array.isArray(payload.sections) && payload.sections.length ? payload : null);
    var toc = Array.isArray(payload.toc) ? payload.toc.filter(function (item) { return item && item.id; }) : [];
    var skeleton = !report && toc.length ? { sections: toc } : null;
    var entitled = isEntitled({ payload: payload, report: report });
    if (hasPreview) {
      var paid = hasPaidReading(report) || entitled;
      // 04 티저는 동결 preview만 쓴다. toc 골격을 report로 넘기면 빈 섹션 제목만 12% 칸을 덮는다.
      return {
        preview: preview,
        previewOnly: payload.previewOnly !== false && !paid,
        entitled: entitled,
        payload: payload,
        paymentUrl: payload.paymentUrl,
        toc: toc,
        report: paid ? (report || undefined) : (isDetailPage() ? (report || skeleton || undefined) : undefined),
      };
    }
    if (report) return { report: report, payload: payload, toc: toc, entitled: entitled };
    if (skeleton) return { report: skeleton, previewOnly: true, payload: payload, toc: toc, paymentUrl: payload.paymentUrl, entitled: entitled };
    return null;
  }
  function paintTeaserPreview(preview) {
    if (!preview) return false;
    var headline = String(preview.headline || '').trim();
    var summary = String(preview.summary || preview.headline || preview.title || '').trim();
    var line = headline || summary;
    if (!line) return false;
    var painted = false;
    document.querySelectorAll('[data-teaser-headline]').forEach(function (node) {
      node.textContent = headline || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    document.querySelectorAll('[data-teaser-summary]').forEach(function (node) {
      node.textContent = summary || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    document.querySelectorAll('[data-one-line-answer], #answerLine, #signal-main-copy, #freeSummary, #resultAnswer, #personal-teaser, #hero-summary, [data-hero-summary]').forEach(function (node) {
      if (node.hasAttribute('data-teaser-summary') || node.hasAttribute('data-teaser-headline')) return;
      node.textContent = headline || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    var insights = (preview.signals && preview.signals.length ? preview.signals : preview.insights) || [];
    var list = document.querySelector('[data-signal-list]');
    if (list && insights.length) {
      list.innerHTML = insights.slice(0, 3).map(function (item, index) {
        var title = item && typeof item === 'object' ? String(item.title || ('근거 ' + (index + 1))) : ('근거 ' + (index + 1));
        var body = item && typeof item === 'object' ? String(item.body || item.text || '') : String(item || '');
        return '<div class="signal-item"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(body) + '</span></div>';
      }).join('');
      painted = true;
    }
    var insightText = function (item) {
      if (item && typeof item === 'object') return String(item.body || item.text || item.title || '').trim();
      return String(item || '').trim();
    };
    ['#condition-signal', '#blocker-signal', '[data-flow-main]', '[data-flow-condition]', '[data-flow-obstacle]'].forEach(function (selector, index) {
      var node = document.querySelector(selector);
      if (node && insights[index]) {
        node.textContent = insightText(insights[index]);
        painted = true;
      }
    });
    document.querySelectorAll('#step-4-report .teaser .item p, #step-4-report .teaser-grid .mini-card span').forEach(function (node, index) {
      if (insights[index]) {
        node.textContent = insightText(insights[index]);
        painted = true;
      }
    });
    if (!painted) {
      var lead = document.querySelector('#step-4-report .teaser > p, #step-4-report .hero .copy > p');
      if (lead) {
        lead.textContent = line;
        painted = true;
      }
    } else if (!document.querySelector('[data-one-line-answer], #answerLine, #signal-main-copy, #freeSummary, #resultAnswer, #hero-summary, [data-hero-summary]')) {
      var luckyLead = document.querySelector('#step-4-report .teaser > p');
      if (luckyLead) luckyLead.textContent = String(preview.summary || line);
    }
    return painted;
  }
  global.UMSHReportAccess={fetch:reportFetch,consume:consume,remember:remember,setOwner:setOwner,inPlace:inPlaceEnabled,renderProgress:renderProgress,ownerEpoch:function(){return ownerEpoch;},firstInsight:firstInsight,showPreview:showPreview,showReport:showReport,acceptAnalyze:acceptAnalyze,hasPaidReading:hasPaidReading,isEntitled:isEntitled,tocHref:tocHref,previewCta:previewCta,paintTeaserPreview:paintTeaserPreview,verifiedReport:function(){return authorized;},identity:identity,allowDesignMockReading:allowDesignMockReading,markFilled:markFilled};
  if (typeof document !== 'undefined') {
    if (global.addEventListener) {
      global.addEventListener('beforeprint', expandReportForPrint);
      global.addEventListener('afterprint', restoreReportAfterPrint);
    }
    if((key || isPermalink()) && isOutputPage() && document.documentElement && document.head) {
      document.documentElement.setAttribute('data-umsh-report-check','');
      var guard=document.createElement('style');
      // in-place 페이지는 디자인을 살린다. 대신 검증 전 슬롯을 가려서 정적 샘플 문구가
      // 내 결과처럼 잠깐이라도 보이는 일을 막는다. 진행률 슬롯은 처음부터 보여야 한다.
      guard.textContent = inPlaceEnabled()
        ? [
          'html[data-umsh-report-check][data-umsh-verified-inplace] [data-umsh-slot]:not([data-umsh-slot="progress"]):not([data-umsh-filled])',
          unfilledHostCss(),
        ].filter(Boolean).join(',') + '{visibility:hidden}'
        : 'html[data-umsh-report-check] body > :not(#umsh-verified-layout):not([data-umsh-service-bottom]):not(.umsh-service-toast):not(script):not(style):not(link){display:none!important}';
      document.head.appendChild(guard);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
    document.addEventListener('click',function(event){var link=event.target.closest && event.target.closest('a[href]');if(!link || !rememberedId)return;var url=new URL(link.href,location.origin);if(url.origin===location.origin && route && url.pathname.indexOf(route[0])===0 && /(?:04-step|05-step|06-step)/.test(url.pathname)){url.searchParams.set('reportId',rememberedId);var query=new URLSearchParams(location.search);var orderId=query.get('orderId');if(key==='newyear_flow') {if(orderId) {url.searchParams.set('orderId',orderId);url.searchParams.delete('preview');}else if(query.get('preview')==='1' && query.get('paid')!=='1')url.searchParams.set('preview','1');}link.href=url.pathname+url.search+url.hash;}},true);
    document.addEventListener('click',function(event){var button=event.target.closest && event.target.closest('[data-retry-section]');if(!button || !authorized)return;button.disabled=true;resumeSection(authorized.reportId || rememberedId,button.dataset.retrySection,true).then(function(){return refresh(rememberedId);}).catch(function(){button.disabled=false;});});
    document.addEventListener('click',function(event){
      // 냥궁합·올해연애의 `#btn-pdf` 는 자체 핸들러가 이미 `window.print()` 로 떨어진다.
      // 여기서 같이 받으면 인쇄가 두 번 열린다.
      var pdf = event.target.closest && event.target.closest('[data-umsh-pdf]');
      if (!pdf) return;
      event.preventDefault();
      ensurePrintStyles();
      try { global.print(); } catch (_) {}
    });
  }
})(typeof window!=='undefined'?window:globalThis);
