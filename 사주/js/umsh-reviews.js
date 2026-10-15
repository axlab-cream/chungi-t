/*
 * 다녀간 손님들의 말(상품 후기), 2026-10-15. 천명사주부터 연다.
 * - mountList: 상품 화면에 공개 후기를 보여 준다. 서버가 visible=false 면 아무것도 그리지 않는다.
 * - mountWriter: 결제한 풀이 끝에 한 줄 후기 칸을 붙인다. 이미 썼으면 고맙다는 칸만 보인다.
 * - 이름은 서버가 성만 남겨서 준다(박**). 이 파일은 받은 값을 그대로 이스케이프해서 그린다.
 */
(function (global) {
  'use strict';
  var MIN = 20, MAX = 300, FIRST_PAGE = 3, PAGE = 5;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function count(text) { return Array.from(String(text || '').replace(/\s+/g, ' ').trim()).length; }
  function dateLabel(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    var k = new Date(d.getTime() + 9 * 3600 * 1000);
    return k.getUTCFullYear() + '.' + String(k.getUTCMonth() + 1).padStart(2, '0') + '.' + String(k.getUTCDate()).padStart(2, '0');
  }

  function styles() {
    if (document.getElementById('umsh-reviews-style')) return;
    var style = document.createElement('style');
    style.id = 'umsh-reviews-style';
    style.textContent = [
      '.umsh-rv{padding:44px 22px 40px;background:#050202;color:#f6e6c8;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif}',
      '.umsh-rv *{box-sizing:border-box}',
      '.umsh-rv-eyebrow{margin:0 0 8px;color:#f2bf6b;font-size:12px;font-weight:800;letter-spacing:.12em}',
      '.umsh-rv-title{margin:0;font-family:"Noto Serif KR",serif;font-size:24px;line-height:1.3;font-weight:700;color:#f6e6c8;word-break:keep-all}',
      '.umsh-rv-sub{margin:8px 0 18px;color:rgba(246,230,200,.62);font-size:13px;line-height:1.6;word-break:keep-all}',
      '.umsh-rv-list{display:grid;gap:0;margin:0;padding:0;list-style:none;border-top:1px solid rgba(113,86,49,.7)}',
      '.umsh-rv-item{padding:16px 2px;border-bottom:1px solid rgba(113,86,49,.45)}',
      '.umsh-rv-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.umsh-rv-name{font-size:14px;font-weight:800;color:#f6e6c8}',
      '.umsh-rv-badge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;border:1px solid rgba(242,191,107,.55);color:#f2bf6b;font-size:11px;font-weight:800}',
      '.umsh-rv-meta{margin-top:4px;color:rgba(246,230,200,.5);font-size:12px}',
      '.umsh-rv-body{margin:8px 0 0;font-size:15px;line-height:1.65;color:#f0e2c8;word-break:keep-all;overflow-wrap:anywhere}',
      '.umsh-rv-more{display:block;width:100%;min-height:46px;margin-top:16px;border:1px solid rgba(242,191,107,.45);border-radius:8px;background:transparent;color:#f2bf6b;font:inherit;font-size:14px;font-weight:800;cursor:pointer}',
      '.umsh-rv-card{margin:24px 16px 8px;padding:22px 18px;border:1px solid rgba(242,191,107,.38);border-radius:10px;background:#0d0a08;color:#f6e6c8;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif}',
      '.umsh-rv-card .umsh-rv-title{font-size:21px}',
      '.umsh-rv-card .umsh-rv-sub{margin-bottom:14px}',
      '.umsh-rv-field{display:block;width:100%;min-height:112px;padding:12px 13px;border:1px solid rgba(246,230,200,.22);border-radius:8px;background:#050202;color:#f6e6c8;font:inherit;font-size:15px;line-height:1.6;resize:vertical}',
      '.umsh-rv-field:focus{outline:2px solid #f2bf6b;outline-offset:1px;border-color:transparent}',
      '.umsh-rv-row{display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:rgba(246,230,200,.55);font-size:12px;line-height:1.5}',
      '.umsh-rv-count.is-short{color:#f2bf6b}',
      '.umsh-rv-submit{display:block;width:100%;min-height:50px;margin-top:14px;border:0;border-radius:8px;background:#f2bf6b;color:#1b1200;font:inherit;font-size:16px;font-weight:900;cursor:pointer}',
      '.umsh-rv-submit:disabled{opacity:.45;cursor:not-allowed}',
      '.umsh-rv-reward{margin:12px 0 0;color:#f2bf6b;font-size:13px;font-weight:700}',
      '.umsh-rv-status{margin:10px 0 0;font-size:13px;color:#ffb4a8}',
      '.umsh-rv-status:empty{display:none}',
      '.umsh-rv-done .umsh-rv-body{padding:12px 13px;border-radius:8px;background:#050202}',
      '.umsh-rv-link{display:inline-block;margin-top:12px;color:#f2bf6b;font-size:13px;font-weight:800}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function itemMarkup(item) {
    var meta = [item.ilju, item.product, item.date].filter(Boolean).map(esc).join(' · ');
    return '<li class="umsh-rv-item">' +
      '<div class="umsh-rv-head"><span class="umsh-rv-name">' + esc(item.name) + '</span>' +
      (item.verified ? '<span class="umsh-rv-badge">구매 확인</span>' : '') + '</div>' +
      (meta ? '<div class="umsh-rv-meta">' + meta + '</div>' : '') +
      '<p class="umsh-rv-body">' + esc(item.body) + '</p></li>';
  }

  /** 공개 목록 마크업. data = 서버 응답 { visible, total, items }. 숨김이면 빈 문자열. */
  function listMarkup(data, shown) {
    if (!data || data.visible !== true || !data.items || !data.items.length) return '';
    var limit = Math.min(shown || FIRST_PAGE, data.items.length);
    var more = data.items.length > limit || data.total > data.items.length;
    return '<section class="umsh-rv" data-umsh-reviews-list aria-labelledby="umsh-rv-title">' +
      '<p class="umsh-rv-eyebrow">REVIEW</p>' +
      '<h2 class="umsh-rv-title" id="umsh-rv-title">다녀간 손님들의 말</h2>' +
      '<p class="umsh-rv-sub">천명사주를 받아 간 손님 ' + esc(Number(data.total).toLocaleString('ko-KR')) + '명이 남긴 말이야.</p>' +
      '<ul class="umsh-rv-list">' + data.items.slice(0, limit).map(itemMarkup).join('') + '</ul>' +
      (more ? '<button type="button" class="umsh-rv-more" data-umsh-reviews-more>후기 더 보기</button>' : '') +
      '</section>';
  }

  /** 작성 칸 마크업. state = /api/reviews/mine 응답 + { status, done, reward } */
  function writerMarkup(state) {
    if (!state || state.eligible !== true) return '';
    if (state.reviewed || state.done) {
      var review = state.review || {};
      return '<section class="umsh-rv-card umsh-rv-done" data-umsh-review-writer aria-label="내가 남긴 후기">' +
        '<p class="umsh-rv-eyebrow">REVIEW</p>' +
        '<h2 class="umsh-rv-title">장부에 남겼어. 고마워.</h2>' +
        '<p class="umsh-rv-sub">다른 손님에게는 ‘' + esc([review.name, review.ilju].filter(Boolean).join(' · ')) + '’로 보여.</p>' +
        (review.body ? '<p class="umsh-rv-body">' + esc(review.body) + '</p>' : '') +
        (state.reward ? '<p class="umsh-rv-reward">고마워서 쿠폰함에 하나 넣어뒀어: ' + esc(state.reward.title) + ' (' + esc(dateLabel(state.reward.expiresAt)) + '까지)</p><a class="umsh-rv-link" href="/coupons.html">쿠폰함 열기</a>' : '') +
        '</section>';
    }
    var preview = state.preview || {};
    var who = [preview.name, preview.ilju].filter(Boolean).join(' · ');
    var text = state.draft || '';
    var n = count(text);
    return '<section class="umsh-rv-card" data-umsh-review-writer aria-labelledby="umsh-rv-writer-title">' +
      '<p class="umsh-rv-eyebrow">REVIEW</p>' +
      '<h2 class="umsh-rv-title" id="umsh-rv-writer-title">이번 풀이, 어땠어?</h2>' +
      '<p class="umsh-rv-sub">한 줄만 남겨줘. 다음 손님한테 큰 힘이 돼.</p>' +
      '<form data-umsh-review-form novalidate>' +
      '<label class="umsh-rv-sr" for="umsh-rv-body" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">후기 내용</label>' +
      '<textarea class="umsh-rv-field" id="umsh-rv-body" name="body" maxlength="' + (MAX + 40) + '" placeholder="가장 와닿았던 부분을 적어줘 (20자 이상)">' + esc(text) + '</textarea>' +
      '<div class="umsh-rv-row"><span>' + (who ? '‘' + esc(who) + '’로 보여. 생일과 고민 내용은 안 보여.' : '이름은 성만 보여. 생일과 고민 내용은 안 보여.') + '</span>' +
      '<span class="umsh-rv-count' + (n < MIN ? ' is-short' : '') + '" data-umsh-review-count>' + n + '/' + MAX + '</span></div>' +
      (state.rewardOffered ? '<p class="umsh-rv-reward">남겨주면 할인권 하나 줄게.</p>' : '') +
      '<button type="submit" class="umsh-rv-submit"' + (n < MIN || n > MAX || state.sending ? ' disabled' : '') + '>' + (state.sending ? '남기는 중…' : '장부에 남기기') + '</button>' +
      '<p class="umsh-rv-status" role="status" aria-live="polite">' + esc(state.status || '') + '</p>' +
      '</form></section>';
  }

  function defaultFetch(path, options) { return fetch(path, options); }

  /** 상품 화면 공개 목록. host 는 비어 있는 자리. 숨김이면 host 를 지운다. */
  function mountList(host, options) {
    if (!host) return;
    options = options || {};
    var api = options.fetch || defaultFetch;
    var product = options.product || 'cmdg';
    var data = null, shown = FIRST_PAGE, loading = false;
    styles();
    function paint() {
      var html = listMarkup(data, shown);
      if (!html) { host.remove(); return; }
      host.innerHTML = html;
      var more = host.querySelector('[data-umsh-reviews-more]');
      if (more) more.addEventListener('click', loadMore);
    }
    async function loadMore() {
      if (shown < data.items.length) { shown += PAGE; paint(); return; }
      if (loading || data.items.length >= data.total) return;
      loading = true;
      try {
        var r = await api('/api/reviews?product=' + encodeURIComponent(product) + '&offset=' + data.items.length + '&limit=20');
        var next = r.ok ? await r.json() : null;
        if (next && next.items) { data.items = data.items.concat(next.items); shown += PAGE; }
      } catch (e) { /* 다음 클릭에서 다시 시도한다 */ }
      loading = false; paint();
    }
    if (options.data) { data = options.data; paint(); return; }
    api('/api/reviews?product=' + encodeURIComponent(product)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) { data = json; paint(); })
      .catch(function () { host.remove(); });
  }

  /** 결제한 풀이 끝의 작성 칸. api 는 로그인 헤더를 붙여 주는 fetch. */
  function mountWriter(host, options) {
    if (!host) return;
    options = options || {};
    var api = options.fetch || defaultFetch;
    var product = options.product || 'cmdg';
    var reportId = options.reportId || '';
    var state = options.state || null;
    styles();
    function paint() {
      var html = writerMarkup(state);
      if (!html) { host.remove(); return; }
      host.innerHTML = html;
      var form = host.querySelector('[data-umsh-review-form]');
      if (!form) return;
      var field = form.querySelector('textarea');
      var counter = form.querySelector('[data-umsh-review-count]');
      var button = form.querySelector('button[type=submit]');
      field.addEventListener('input', function () {
        state.draft = field.value;
        var n = count(field.value);
        counter.textContent = n + '/' + MAX;
        counter.classList.toggle('is-short', n < MIN);
        button.disabled = n < MIN || n > MAX || state.sending;
      });
      form.addEventListener('submit', submit);
    }
    async function submit(event) {
      event.preventDefault();
      if (state.sending || options.preview) return;
      state.sending = true; state.status = ''; paint();
      try {
        var r = await api('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: product, reportId: reportId, body: state.draft || '' }) });
        var json = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          if (r.status === 409) { state.reviewed = true; }
          state.status = json.error || '후기를 남기지 못했어. 잠시 후 다시 해줘.';
        } else {
          state.done = true; state.review = json.review; state.reward = json.reward;
        }
      } catch (e) { state.status = '연결이 끊겼어. 잠시 후 다시 해줘.'; }
      state.sending = false; paint();
    }
    if (state) { paint(); return; }
    if (!reportId) { host.remove(); return; }
    api('/api/reviews/mine?product=' + encodeURIComponent(product) + '&reportId=' + encodeURIComponent(reportId))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) { state = json; if (state) state.draft = ''; paint(); })
      .catch(function () { host.remove(); });
  }

  global.UMSHReviews = { mountList: mountList, mountWriter: mountWriter, listMarkup: listMarkup, writerMarkup: writerMarkup };
})(typeof window !== 'undefined' ? window : globalThis);
