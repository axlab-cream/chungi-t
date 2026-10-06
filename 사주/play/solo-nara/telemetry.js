(function (global) {
  'use strict';
  if (global.UMSHSoloNaraTelemetry || /preview\.html$/.test(global.location.pathname)) return;
  var allowedSources = ['home','share','admin'];
  var source = 'direct';
  try {
    var requested = new URL(global.location.href).searchParams.get('src');
    if (allowedSources.indexOf(requested) !== -1) source = requested;
    else if (new URL(global.location.href).searchParams.has('type')) source = 'share';
    else if (document.referrer) {
      var ref = new URL(document.referrer);
      if (ref.origin === global.location.origin) source = ref.pathname === '/' ? 'home' : 'internal';
      else if (/(^|\.)(google\.[a-z.]+|bing\.com|search\.naver\.com|search\.daum\.net)$/.test(ref.hostname)) source = 'search';
      else if (/(^|\.)(facebook\.com|instagram\.com|t\.co|x\.com|kakao\.com)$/.test(ref.hostname)) source = 'social';
      else source = 'external';
    }
  } catch (_) { /* Missing/invalid referrer remains direct. */ }
  global.UMSHSoloNaraSource = source;
  var actions = ['start','gender','progress','complete','login','result_view','share','share_success','copy','fortune','restart'];
  // Only these never-personal codes leave the page: which question was reached and which public character was shown.
  // Gender, individual answers and axis scores are never sent.
  var params = { question_id: /^q[1-8]$/, result_character: /^[a-z]{2,20}$/ };
  // Result views and progress are automatic, so they are not counted as admin CTA clicks.
  var notClicks = ['result_view','share_success','progress'];
  var completed = false;
  function enabled() { return global.navigator.doNotTrack !== '1' && global.navigator.globalPrivacyControl !== true; }
  function clean(extra) {
    var out = {};
    for (var key in params) if (extra && typeof extra[key] === 'string' && params[key].test(extra[key])) out[key] = extra[key];
    return out;
  }
  function ga(action, extra) {
    try { if (enabled() && global.UMSHAnalytics && typeof global.gtag === 'function') global.gtag('event', 'solo_nara_' + action, Object.assign({ service_key: 'solo_nara', link_source: source }, clean(extra))); } catch (_) { /* Analytics is best-effort. */ }
  }
  function track(action, extra) {
    if (!enabled() || actions.indexOf(action) === -1) return;
    if (action === 'start') completed = false;
    if (action === 'complete') { if (completed) return; completed = true; }
    if (global.UMSHTrack) {
      if (notClicks.indexOf(action) === -1) global.UMSHTrack.push('cta_click', { target: 'solo_nara:' + action });
      var result = clean(extra).result_character;
      // The result screen is a step the visitor reached; recording it as a step view keeps admin counts per character.
      if (action === 'result_view' && result) global.UMSHTrack.push('step_view', { target: 'solo_nara:result:' + result });
    }
    ga(action, extra);
  }
  global.UMSHSoloNaraTelemetry = { track: track };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ga('view'); }, { once: true });
  else ga('view');
})(window);
