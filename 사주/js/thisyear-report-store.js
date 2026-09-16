/**
 * Swaps the sample copy inside the 올해 연애운 05/06 pages for the real RAG report.
 *
 * Those two pages read their whole model out of `<script type="application/json">`
 * blocks at parse time, so patching the DOM afterwards would fight their own renderer.
 * This file runs synchronously *before* the page script and rewrites those blocks from
 * the report step 04 cached, which lets the design's own rendering do the rest.
 *
 * http(s) 실서비스에서는 캐시가 없으면 시안 해석을 비운다. file: 로컬 시안만 샘플을 남긴다.
 */
(function () {
  var REPORT_KEY = 'umsh:report:love_this_year';

  function allowDesignMockReading() {
    var access = window.UMSHReportAccess;
    if (access && typeof access.allowDesignMockReading === 'function') return access.allowDesignMockReading();
    try { return window.location.protocol === 'file:'; } catch (error) { return false; }
  }

  function readReport() {
    if (window.UMSHReportAccess) return window.UMSHReportAccess.verifiedReport();
    try {
      var raw = window.sessionStorage.getItem(REPORT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.sections && parsed.sections.length ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function paragraphs(section) {
    return String((section && section.interpretation) || '')
      .split('\n\n')
      .map(function (text) {
        return text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim();
      })
      .filter(Boolean);
  }

  /**
   * 목차 rows are one or two lines tall, so cutting mid-word with an ellipsis reads as
   * broken copy. Take whole sentences instead and only fall back to a hard cut.
   */
  function firstSentences(text, count, limit) {
    var value = String(text || '').trim();
    var sentences = value.split(/(?<=[.!?])\s+/).slice(0, count).join(' ').trim();
    if (!sentences) sentences = value;
    return (window.UMSHTextClip && window.UMSHTextClip.clipCompleteSentences)
      ? window.UMSHTextClip.clipCompleteSentences(sentences, Math.max(limit, 220))
      : (sentences.length > limit ? sentences.split(/(?<=[.!?。])/).slice(0, 2).join('').trim() : sentences);
  }

  function patch(id, transform) {
    var node = document.getElementById(id);
    if (!node) return;
    try {
      var data = JSON.parse(node.textContent);
      var next = transform(data);
      if (next) node.textContent = JSON.stringify(next, null, 2);
    } catch (error) {
      // A malformed block is left alone rather than blanked.
    }
  }

  function dropOpeningLabel(text) {
    return String(text || '').replace(/^第[一二三四五六七八九十]+門[^"]*"[^"]*"(?:일세|입니다)\.\s*/, '');
  }

  function stripMockDetail() {
    patch('DETAIL_DATA', function (details) {
      (details || []).forEach(function (detail) {
        detail.conclusion = '';
        detail.interpretation_blocks = [];
        if (detail.talk_guide) {
          detail.talk_guide.say = '';
          detail.talk_guide.avoid = '';
        }
      });
      return details;
    });
  }

  function applyReport(report) {
    if (!report || !Array.isArray(report.sections) || !report.sections.length) return;
    var byId = {};
    report.sections.forEach(function (section) {
      byId[section.id] = section;
    });

    // 05 목차: the group cards keep the designed artwork, titles and per-item lines, and
    // each 대분류's own subtitle becomes what this reader's chart says about that group.
    patch('REPORT_INDEX_DATA', function (index) {
      if (report.reportId) index.report_id = report.reportId;
      index.source = 'kms_rag';
      (index.groups || []).forEach(function (group) {
        var first = (group.items || []).map(function (item) { return byId[item.section_id]; }).filter(Boolean)[0];
        if (!first) return;
        var parts = paragraphs(first);
        if (parts.length < 2) return;
        var sentences = parts[1].split(/(?<=[.!?])\s+/).filter(Boolean);
        if (sentences.length < 3) return;
        var picked = [sentences[1]];
        if (sentences[sentences.length - 1] !== sentences[1]) picked.push(sentences[sentences.length - 1]);
        group.subtitle = firstSentences(picked.join(' '), 2, 170);
      });
      return index;
    });

    patch('DETAIL_DATA', function (details) {
      details.forEach(function (detail) {
        var section = byId[detail.section_id];
        if (!section) return;
        var parts = paragraphs(section);
        if (!parts.length) return;

        detail.report_index_source = 'kms_rag';
        detail.conclusion = dropOpeningLabel(parts[0]);
        detail.interpretation_blocks = parts.map(function (paragraph, position) {
          return { type: 'text', title: position === 0 ? '전체 해석' : '', content: paragraph };
        });
        (detail.evidence || []).forEach(function (entry) {
          if (entry.id === 'calc.personalization_status' && report.subtitle) entry.value = report.subtitle;
        });
      });
      return details;
    });

    patch('CALCULATED_FACTS', function (facts) {
      if (report.subtitle) facts.personalization_note = report.subtitle;
      var groups = {};
      report.sections.forEach(function (section) {
        groups[section.category] = true;
      });
      (facts.confirmed_facts || []).forEach(function (fact) {
        if (fact.key === 'report.index_source') {
          fact.value = Object.keys(groups).length + '개 대분류, ' + report.sections.length + '개 중분류';
        }
      });
      return facts;
    });
  }

  var report = readReport();
  if (report) applyReport(report);
  else if (!allowDesignMockReading()) stripMockDetail();

  window.UMSHThisYearStore = { apply: applyReport };
})();
