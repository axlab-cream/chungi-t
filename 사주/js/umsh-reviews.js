/*
 * 다녀간 손님들의 말(상품 후기), 2026-10-15. 천명사주부터 연다.
 * - mountList: 상품 화면에 공개 후기를 보여 준다. 서버가 visible=false 면 아무것도 그리지 않는다.
 * - 이름은 서버가 성만 남겨서 준다(박**). 이 파일은 받은 값을 그대로 이스케이프해서 그린다.
 */
(function (global) {
  'use strict';
  var FIRST_PAGE = 3, PAGE = 5;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
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

  global.UMSHReviews = { mountList: mountList, listMarkup: listMarkup };
})(typeof window !== 'undefined' ? window : globalThis);
