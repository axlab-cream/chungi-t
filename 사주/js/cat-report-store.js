/**
 * Feeds the 고양이 궁합 06 상세 page the real RAG report.
 *
 * That page builds its whole view from `fetch("detail-data.json")` the moment its own
 * script runs, and the design never shipped that file — it was meant to come from the
 * server. This file runs synchronously *before* the page script and answers that one
 * request from the report step 04 cached, so the design's own renderer does the rest.
 *
 * With no cached report the request is left alone and the page shows its own
 * "연결된 리포트를 찾지 못했어요" state, exactly as authored.
 */
(function () {
  var REPORT_KEY = 'umsh:report:cat_compatibility';
  var ASSET_BASE = '../assets/cat-compatibility';

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

  function paragraphs(section) {
    return String((section && section.interpretation) || '')
      .split('\n\n')
      .map(function (text) {
        return text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim();
      })
      .filter(Boolean);
  }

  /**
   * A reading opens by naming the 문 and the item it is about. The page prints both
   * above the text, so repeating them in the lead would read as filler.
   */
  function dropOpeningLabel(text) {
    return String(text || '').replace(/^第[一二三四五六七八九十]+門[^"]*"[^"]*"일세\.\s*/, '');
  }

  /** The 대분류 cover art the design generated for this page. */
  function coverFor(section) {
    return {
      filename: ASSET_BASE + '/06-' + section.imageKey + '-cover.webp',
      alt: section.imageAlt || section.category,
    };
  }

  function buildDetails() {
    var sections = report.sections;
    return sections.map(function (section, index) {
      var parts = paragraphs(section);
      var previous = sections[index - 1];
      var next = sections[index + 1];
      var related = [];
      if (previous) related.push({ relation: '이전 항목', section_id: previous.id, title: previous.classification });
      if (next) related.push({ relation: '다음 항목', section_id: next.id, title: next.classification });

      return {
        section_id: section.id,
        gate: section.categoryEn || '',
        group_title: section.category,
        title: section.classification,
        conclusion: dropOpeningLabel(parts[0] || ''),
        lens: section.category,
        image: coverFor(section),
        basis_summary: { basis: (section.ragTopics || []).filter(Boolean).slice(0, 4) },
        // Six paragraphs of the reading onto the block types this page can render.
        interpretation_blocks: [
          { type: 'text', title: '지금 보이는 모습', content: parts[1] || '' },
          { type: 'text', title: '무엇을 근거로 보나', content: parts[2] || '' },
          { type: 'flow', title: '시기와 조건', content: parts[3] || '', steps: [] },
          { type: 'text', title: '함께 볼 결', content: parts[4] || '' },
          { type: 'action', title: '오늘 할 일', content: parts[5] || '', actions: [] },
        ].filter(function (block) { return block.content; }),
        related_sections: related,
      };
    });
  }

  var payload = {
    service: { category: '반려묘 생활 궁합', report_id: report.reportId || '' },
    default_section_id: report.sections[0].id,
    details: buildDetails(),
  };

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('detail-data.json') !== -1) {
      return Promise.resolve(new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return nativeFetch(input, init);
  };
})();
