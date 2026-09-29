(function (global) {
  'use strict';
  if (global.UMSHLoveSpeedTelemetry || /preview\.html$/.test(global.location.pathname)) return;
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
  global.UMSHLoveSpeedSource = source;
  var actions = ['start','complete','share','share_success','copy','details','login','restart','result_view'];
  var completed = false;
  function enabled() { return global.navigator.doNotTrack !== '1' && global.navigator.globalPrivacyControl !== true; }
  function ga(action) {
    try { if (enabled() && global.UMSHAnalytics && typeof global.gtag === 'function') global.gtag('event', 'love_speed_' + action, { service_key: 'love_speed', link_source: source }); } catch (_) { /* Analytics is best-effort. */ }
  }
  function track(action) {
    if (!enabled() || actions.indexOf(action) === -1) return;
    if (action === 'start') completed = false;
    if (action === 'complete') { if (completed) return; completed = true; }
    // Automatic result rendering is a GA event, never mislabeled as an admin CTA click.
    if (action !== 'result_view' && action !== 'share_success' && global.UMSHTrack) global.UMSHTrack.push('cta_click', { target: 'love_speed:' + action });
    ga(action);
  }
  global.UMSHLoveSpeedTelemetry = { track: track };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ga('view'); }, { once: true });
  else ga('view');
})(window);
