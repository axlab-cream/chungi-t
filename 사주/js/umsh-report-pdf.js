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
      '</style></head><body><div class="sheet">' +
      '<div class="brand">운명상회 · UMSH</div>' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      (subtitle ? '<p class="sub">' + escapeHtml(subtitle) + '</p>' : '') +
      sections +
      '<p class="foot">' + escapeHtml(generatedAt) + ' · 이 문서는 사주 기반 참고용 해석입니다.</p>' +
      '</div></body></html>';
  }

  function open(report) {
    if (!report || !Array.isArray(report.sections) || !report.sections.length) return false;
    const html = buildHtml(report);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const popup = global.open(url, '_blank');
    if (!popup) {
      URL.revokeObjectURL(url);
      return false;
    }
    setTimeout(function () {
      try { popup.focus(); popup.print(); } catch (_error) { /* print can be blocked */ }
      URL.revokeObjectURL(url);
    }, 400);
    return true;
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

  global.UMSHReportPdf = { open: open, openFromStorage: openFromStorage };
})(typeof window !== 'undefined' ? window : globalThis);
