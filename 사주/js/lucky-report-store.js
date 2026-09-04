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

  function sentences(text) {
    return String(text || '').split(/(?<=[.!?])\s+/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  /**
   * 06 has five authored blocks and the reading has six paragraphs, so they are matched
   * by what each block's heading promises rather than by position:
   *
   *   한 줄 결론      the item's own verdict            (p1)
   *   확인한 근거      what the chart was read from      (p2)
   *   현실에서 보이는 모습  where it shows up in a day        (p3)
   *   오늘 해볼 것      the instructions, as bullets      (tail of p4 + head of p5)
   *   오해하지 않을 점    the limits of this reading        (rest of p5)
   *
   * Paragraph 0 is bookkeeping - the 대분류, the item title and the 일간·일지 - all of
   * which the page already prints above the text.
   */
  var LIMIT_MARK = '물건이 액운을 막거나';

  window.LuckyReport = {
    reportId: report.reportId || '',
    subtitle: report.subtitle || '',
    raw: report,
    /** The shape 06's own renderer expects, filled from the real report. */
    sections: function () {
      return report.sections.map(function (section) {
        var parts = paragraphs(section);
        var closing = parts[5] || '';
        var limitAt = closing.indexOf(LIMIT_MARK);
        var advice = limitAt > 0 ? closing.slice(0, limitAt).trim() : closing;
        var caution = limitAt > 0 ? closing.slice(limitAt).trim() : '';
        var grounded = sentences(parts[4] || '');

        return {
          id: section.id,
          group: section.category,
          title: section.classification,
          conclusion: dropOpeningLabel(parts[1] || parts[0] || ''),
          evidence: parts[2] || '',
          scene: parts[3] || '',
          // The last sentence of the grounded paragraph is the instruction it builds to.
          actions: [grounded[grounded.length - 1], advice].filter(Boolean),
          caution: caution || parts[4] || '',
        };
      });
    },
    sectionById: function (id) {
      return byId[id] || null;
    },
    lineFor: function (id, limit) {
      var parts = paragraphs(byId[id]);
      // Paragraph 4 is a shared RAG closer and often lands off-item.
      // Paragraph 1 is this row's own note + chart lead.
      var line = (parts[1] || parts[0] || '')
        .replace(/^이 대목에서 함께 볼 결은 이렇습니다\.\s*/, '');
      return firstSentences(line, 1, limit || 120);
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
