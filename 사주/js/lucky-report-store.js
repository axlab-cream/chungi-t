/**
 * Swaps the sample copy inside the 나한테 운 붙는 색과 물건 05/06 pages for the real
 * RAG report.
 *
 * 06 builds its whole model in an inline script at parse time, so this file runs
 * synchronously *before* that script and publishes `window.LuckyReport`. The page
 * script prefers it when it is there and falls back to its own sample sections when
 * it is not, which keeps the design previewable standalone.
 *
 * 05 is static markup, so it is patched once the DOM is ready.
 */
(function () {
  var REPORT_KEY = 'umsh:report:lucky_color';

  function readReport() {
    try {
      var raw = window.sessionStorage.getItem(REPORT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.sections && parsed.sections.length ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  var report = readReport();
  if (!report) return;

  var byId = {};
  report.sections.forEach(function (section) {
    byId[section.id] = section;
  });

  function paragraphs(section) {
    return String((section && section.interpretation) || '')
      .split('\n\n')
      .map(function (text) {
        return text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim();
      })
      .filter(Boolean);
  }

  /**
   * A reading opens by naming the 대분류 and the item. The page prints both above the
   * text, so repeating them inside 한 줄 결론 reads as filler.
   */
  function dropOpeningLabel(text) {
    return String(text || '').replace(/^[^"]*"[^"]*"입니다\.\s*/, '');
  }

  /**
   * List rows are one or two lines tall, so cutting mid-word reads as broken copy.
   * Take whole sentences and only fall back to a hard cut.
   */
  function firstSentences(text, count, limit) {
    var value = String(text || '').trim();
    var picked = value.split(/(?<=[.!?])\s+/).slice(0, count).join(' ').trim() || value;
    return picked.length > limit ? picked.slice(0, limit - 1) + '…' : picked;
  }

  // 06 상세: six authored blocks, six paragraphs of the reading. The order keeps each
  // block's own heading honest - 근거 under 확인한 근거, the scene under 현실에서 보이는
  // 모습, and the closing caution under 오해하지 않을 점.
  window.LuckyReport = {
    reportId: report.reportId || '',
    subtitle: report.subtitle || '',
    raw: report,
    /** The shape 06's own renderer expects, filled from the real report. */
    sections: function () {
      return report.sections.map(function (section) {
        var parts = paragraphs(section);
        return {
          id: section.id,
          group: section.category,
          title: section.classification,
          conclusion: dropOpeningLabel(parts[0] || ''),
          evidence: parts[1] || '',
          scene: parts[2] || '',
          actions: [parts[3], parts[4]].filter(Boolean),
          caution: parts[5] || '',
        };
      });
    },
    sectionById: function (id) {
      return byId[id] || null;
    },
    lineFor: function (id, limit) {
      var parts = paragraphs(byId[id]);
      return firstSentences(parts[1] || parts[0] || '', 1, limit || 120);
    },
  };

  // 05 목차: the design's own rows keep their titles and artwork; only the sample
  // "이 항목 자세히 보기" line becomes something this chart actually says.
  function patchIndex() {
    var groups = document.querySelectorAll('#reportIndex .group');
    if (!groups.length) return;

    groups.forEach(function (group) {
      var links = group.querySelectorAll('.section-link');
      var first = null;

      links.forEach(function (link) {
        var id = (link.getAttribute('href') || '').split('section=')[1];
        if (id) id = id.split('#')[0];
        var section = byId[id];
        if (!section) return;
        if (!first) first = section;
        var note = link.querySelector('span');
        if (note) note.textContent = window.LuckyReport.lineFor(id, 96);
      });

      // The group subtitle carries what this chart says about the 대분류 as a whole.
      var lead = group.querySelector('.group-head p');
      if (lead && first) {
        var parts = paragraphs(first);
        if (parts[1]) lead.textContent = firstSentences(parts[1], 2, 150);
      }
    });

    var head = document.querySelector('#step-5-chat header p');
    if (head && report.subtitle) head.textContent = report.subtitle;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchIndex);
  else patchIndex();
})();
