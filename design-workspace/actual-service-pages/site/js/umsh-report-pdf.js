/**
 * Shared print/PDF window for specialized reports stored in sessionStorage.
 * The browser print dialog is the download path; keep the HTML self-contained.
 */
(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function paragraphs(section) {
    return String((section && (section.interpretation || section.body || '')) || '')
      .split(/\n\n+/)
      .map(function (text) { return text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim(); })
      .filter(Boolean);
  }

  function buildHtml(report) {
    const title = report.title || '운명상회 리포트';
    const subtitle = report.subtitle || '';
    const generatedAt = new Date().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' });
    const sections = (report.sections || []).map(function (section, index) {
      const heading = section.classification || section.hook || section.title || ('항목 ' + (index + 1));
      const group = section.category || '';
      const parts = paragraphs(section);
      const bodyParts = parts.length > 1 ? parts.slice(1) : parts;
      return (
        '<article class="item">' +
          (group ? '<span class="group">' + escapeHtml(group) + '</span>' : '') +
          '<h2>' + escapeHtml(heading) + '</h2>' +
          '<p>' + bodyParts.map(escapeHtml).join('</p><p>') + '</p>' +
        '</article>'
      );
    }).join('');

    return '<!doctype html><html lang="ko"><head><meta charset="utf-8" />' +
      '<title>' + escapeHtml(title) + '</title>' +
      '<style>' +
      '@page{size:A4;margin:16mm}' +
      'body{margin:0;background:#fff9ef;color:#211715;font-family:"Noto Serif KR",Pretendard,"Malgun Gothic",serif;line-height:1.7;word-break:keep-all;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.sheet{max-width:820px;margin:0 auto;padding:28px 24px 48px}' +
      '.brand{font-size:13px;letter-spacing:.08em;color:#8b1e16;font-weight:800}' +
      'h1{margin:12px 0 8px;font-size:28px;line-height:1.25}' +
      '.sub{margin:0 0 24px;color:#5c4a3a}' +
      '.item{page-break-inside:avoid;margin:0 0 22px;padding:0 0 16px;border-bottom:1px solid rgba(33,23,21,.12)}' +
      '.group{display:block;margin-bottom:6px;color:#8b1e16;font-size:12px;font-weight:800}' +
      'h2{margin:0 0 8px;font-size:18px}' +
      'p{margin:0 0 8px}' +
      '.foot{margin-top:28px;color:#7a6a5a;font-size:12px}' +
      '.tools{display:flex;gap:8px;margin-bottom:18px}.tools button{font:inherit;font-weight:800;padding:12px 16px;border-radius:10px;border:1px solid #8b1e16;background:#8b1e16;color:#fff;cursor:pointer}.tools button+button{background:transparent;color:#8b1e16}' +
      '@media print{.tools{display:none}}' +
      '</style></head><body><div class="sheet">' +
      '<div class="tools"><button type="button" onclick="window.print()">인쇄 · PDF로 저장</button>' +
      '<button type="button" onclick="history.length>1?history.back():window.close()">돌아가기</button></div>' +
      '<div class="brand">운명상회 · UMSH</div>' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      (subtitle ? '<p class="sub">' + escapeHtml(subtitle) + '</p>' : '') +
      sections +
      '<p class="foot">' + escapeHtml(generatedAt) + ' · 이 문서는 사주 기반 참고용 해석입니다.</p>' +
      '</div></body></html>';
  }

  /**
   * 호출부가 클릭 안에서 미리 연 창(`popup`)을 넘길 수 있다. fetch 나 스크립트 로드를 기다린 뒤에
   * 창을 열면 팝업 차단기가 막는다 — 모바일은 거의 항상, 데스크톱도 첫 클릭은 막힌다.
   * 보관함의 「PDF 다운로드」가 조용히 아무 일도 하지 않던 이유다(2026-09-18).
   */
  function open(report, popup) {
    if (!report || !Array.isArray(report.sections) || !report.sections.length) {
      if (popup) { try { popup.close(); } catch (_error) { /* already closed */ } }
      return false;
    }
    const html = buildHtml(report);
    const target = popup || global.open('', '_blank');
    if (!target) {
      // 팝업이 막히면(모바일 기본값) 같은 탭에서 인쇄용 문서를 연다. 문서 안의 버튼으로
      // 인쇄·PDF 저장을 하고 「돌아가기」로 복귀한다. 아무 일도 없는 것보다 낫다.
      try {
        global.location.assign(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })));
        return true;
      } catch (_error) {
        return false;
      }
    }
    try {
      target.document.open();
      target.document.write(html);
      target.document.close();
    } catch (_error) {
      return false;
    }
    setTimeout(function () {
      try { target.focus(); target.print(); } catch (_error) { /* print can be blocked */ }
    }, 400);
    return true;
  }

  /** 클릭 안에서 바로 부른다. 안내 문구를 채운 빈 창을 돌려주고, 못 열면 null. */
  function openPlaceholder(message) {
    const target = global.open('', '_blank');
    if (!target) return null;
    try {
      target.document.open();
      target.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>운명상회</title></head>' +
        '<body style="margin:0;background:#fff9ef;color:#211715;font-family:Pretendard,\'Malgun Gothic\',sans-serif">' +
        '<p style="padding:32px 24px;font-size:16px;line-height:1.6">' + escapeHtml(message || '해석을 준비하고 있어요…') + '</p></body></html>');
      target.document.close();
    } catch (_error) { /* placeholder is best effort */ }
    return target;
  }

  function readStorage(key) {
    try {
      return JSON.parse(global.sessionStorage.getItem(key) || 'null');
    } catch (_error) {
      return null;
    }
  }

  function openFromStorage(key) {
    if (key) return open(readStorage(key));
    const keys = Object.keys(global.sessionStorage || {}).filter(function (item) {
      return item.indexOf('umsh:report:') === 0;
    });
    for (let i = 0; i < keys.length; i += 1) {
      if (open(readStorage(keys[i]))) return true;
    }
    return false;
  }

  global.UMSHReportPdf = { open: open, openPlaceholder: openPlaceholder, openFromStorage: openFromStorage };
})(typeof window !== 'undefined' ? window : globalThis);
