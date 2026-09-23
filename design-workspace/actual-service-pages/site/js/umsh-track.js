(function (global) {
  'use strict';

  /**
   * 퍼널 수집기.
   *
   * 두 가지만 센다 — 어느 단계에 들어왔는지(step_view), 무엇을 눌렀는지(cta_click).
   * 그 둘이면 "어디서 나가는가"와 "무엇에 관심이 있는가"를 볼 수 있다.
   *
   * 남기지 않는 것: 이름·생년월일·해석 본문·질의문자열. 화면 문구도 남기지 않는다 —
   * 문구는 개편 때마다 바뀌어서 그걸로 세면 통계가 끊긴다. 대신 `data-action` 처럼
   * 바뀌지 않는 행동 이름을 쓴다.
   */
  var ENDPOINT = '/api/events';
  var SESSION_KEY = 'umsh:track:session';
  var queue = [];
  var flushTimer = null;

  function sessionId() {
    try {
      var found = sessionStorage.getItem(SESSION_KEY);
      if (found) return found;
      var made = (global.crypto && global.crypto.randomUUID)
        ? global.crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_KEY, made);
      return made;
    } catch (_) {
      // 저장소가 막힌 브라우저에서도 한 화면 안의 흐름은 이어진다.
      if (!global.__umshTrackSession) global.__umshTrackSession = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      return global.__umshTrackSession;
    }
  }

  /** 경로에서 서비스와 단계를 읽는다. 화면마다 따로 적어 두면 새 서비스에서 빠진다. */
  function placeOf(pathname) {
    var path = String(pathname || '');
    var service = null;
    var map = [
      [/^\/cmdg(\/|$)/, 'cmdg'], [/^\/money\/save/, 'money_save'], [/^\/work\/quit/, 'quit_fortune'],
      [/^\/work\/move/, 'work_move'], [/^\/work\/job-choice/, 'job_choice'], [/^\/work\/job/, 'work_job'],
      [/^\/love\/this-year/, 'love_this_year'], [/^\/love\/signal/, 'couple_signal'], [/^\/love\/mind/, 'love_mind'],
      [/^\/love\/again/, 'love_again'], [/^\/love\/spouse/, 'love_spouse'], [/^\/match\/couple/, 'match_couple'],
      [/^\/match\/marry/, 'marry_match'], [/^\/match\/cat/, 'cat_compatibility'], [/^\/me\/lucky/, 'lucky_color'],
      [/^\/me\/pass-angle/, 'pass_angle'], [/^\/flow\/newyear/, 'newyear_flow'], [/^\/day\/wedding/, 'wedding_day'],
      [/^\/place\/home/, 'home_pungsu'], [/^\/today\/free/, 'today_fortune'],
    ];
    for (var i = 0; i < map.length; i += 1) { if (map[i][0].test(path)) { service = map[i][1]; break; } }

    var step = null;
    if (/01-step-1-story/.test(path)) step = '01-story';
    else if (/02-step-2-saju-input/.test(path)) step = '02-input';
    else if (/03-step-3-service-input/.test(path)) step = '03-service-input';
    else if (/04-step-4-report/.test(path)) step = '04-report';
    else if (/05-step-5-chat/.test(path)) step = '05-toc';
    else if (/06-step-6_1-report-detail/.test(path)) step = '06-detail';
    else if (/^\/vault/.test(path)) step = 'vault';
    else if (/^\/search/.test(path)) step = 'search';
    else if (/^\/payment/.test(path)) step = 'payment';
    else if (/^\/r\//.test(path)) step = '06-detail';
    else if (path === '/' || /^\/index\.html$/.test(path)) step = 'home';
    else if (service) step = 'entry';
    return { service: service, step: step };
  }

  function send(force) {
    if (!queue.length) return;
    var body = JSON.stringify({ sessionId: sessionId(), events: queue.splice(0, 20) });
    try {
      // sendBeacon 은 화면을 떠나는 중에도 전달된다. 이탈 직전 이벤트가 그때 가장 중요하다.
      if (!force && global.navigator && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    } catch (_) { /* 통계 실패가 화면을 막지 않는다 */ }
  }

  function push(event, extra) {
    var place = placeOf(location.pathname);
    queue.push({
      event: event,
      serviceKey: place.service,
      step: place.step,
      target: (extra && extra.target) || null,
      route: location.pathname,
    });
    if (flushTimer) clearTimeout(flushTimer);
    // 클릭 여러 개를 한 번에 보낸다. 누를 때마다 요청을 내면 느린 회선에서 화면이 밀린다.
    flushTimer = setTimeout(send, 1200);
  }

  /** 안정적인 행동 이름을 고른다. 없으면 세지 않는다 — 문구로 세지 않기 위해서다. */
  function targetOf(node) {
    var actionNode = node.closest('[data-action], [data-shell-nav], [data-shell-bottom-menu]');
    if (!actionNode) return null;
    return actionNode.getAttribute('data-action')
      || (actionNode.getAttribute('data-shell-nav') && 'nav:' + actionNode.getAttribute('data-shell-nav'))
      || (actionNode.getAttribute('data-shell-bottom-menu') && 'menu:' + actionNode.getAttribute('data-shell-bottom-menu'))
      || null;
  }

  function start() {
    push('step_view');
    document.addEventListener('click', function (event) {
      var node = event.target && event.target.closest ? event.target : null;
      if (!node) return;
      var target = targetOf(node);
      if (target) push('cta_click', { target: target });
    }, true);
    // 떠나기 직전에 남은 것을 보낸다.
    global.addEventListener('pagehide', function () { send(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  global.UMSHTrack = { push: push, flush: function () { send(true); } };
})(typeof window !== 'undefined' ? window : globalThis);
