/**
 * Swaps the sample copy inside the 올해 연애운 05/06 pages for the real RAG report.
 *
 * Those two pages read their whole model out of `<script type="application/json">`
 * blocks at parse time, so patching the DOM afterwards would fight their own renderer.
 * This file runs synchronously *before* the page script and rewrites those blocks from
 * the report step 04 cached, which lets the design's own rendering do the rest.
 *
 * With no cached report the blocks are left exactly as authored, so the pages still
 * preview standalone.
 */
(function () {
  var REPORT_KEY = 'umsh:report:love_this_year';

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
   * 목차 rows are one or two lines tall, so cutting mid-word with an ellipsis reads as
   * broken copy. Take whole sentences instead and only fall back to a hard cut.
   */
  function firstSentences(text, count, limit) {
    var value = String(text || '').trim();
    var sentences = value.split(/(?<=[.!?])\s+/).slice(0, count).join(' ').trim();
    if (!sentences) sentences = value;
    return sentences.length > limit ? sentences.slice(0, limit - 1) + '…' : sentences;
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

  // 05 목차: the group cards keep the designed artwork, titles and per-item lines, and
  // each 대분류's own subtitle becomes what this reader's chart says about that group.
  //
  // The per-item lines are deliberately left alone: inside one 대분류 the personal part
  // of every reading is the same sentence, so pasting it onto five adjacent rows would
  // read as filler. Once per group is where it actually says something.
  patch('REPORT_INDEX_DATA', function (index) {
    if (report.reportId) index.report_id = report.reportId;
    index.source = 'kms_rag';
    (index.groups || []).forEach(function (group) {
      var first = (group.items || []).map(function (item) { return byId[item.section_id]; }).filter(Boolean)[0];
      if (!first) return;
      var parts = paragraphs(first);
      if (parts.length < 2) return;
      // The paragraph runs: the item's own note, what this chart says, then how this
      // 대분류 reads it. Skip the note (the rows below already carry it) and pair the
      // chart line with the group's closing angle, which is the sentence that differs
      // from every other group.
      var sentences = parts[1].split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length < 3) return;
      var picked = [sentences[1]];
      if (sentences[sentences.length - 1] !== sentences[1]) picked.push(sentences[sentences.length - 1]);
      group.subtitle = firstSentences(picked.join(' '), 2, 170);
    });
    return index;
  });

  // 06 상세: six authored blocks, six paragraphs of the reading. The order below keeps
  // each block's own heading honest — evidence under 확인된 근거, timing under 시기, and
  // the closing advice under 지금 할 행동.
  var BLOCK_TO_PARAGRAPH = [0, 2, 1, 3, 5, 4];

  /**
   * A reading opens by naming the 문 and the item it is about. The page already prints
   * both above the text, so repeating them inside 한 줄 결론 reads as filler.
   */
  function dropOpeningLabel(text) {
    return String(text || '').replace(/^第[一二三四五六七八九十]+門[^"]*"[^"]*"일세\.\s*/, '');
  }

  patch('DETAIL_DATA', function (details) {
    details.forEach(function (detail) {
      var section = byId[detail.section_id];
      if (!section) return;
      var parts = paragraphs(section);
      if (parts.length < 6) return;

      detail.report_index_source = 'kms_rag';
      detail.conclusion = dropOpeningLabel(parts[0]);
      (detail.interpretation_blocks || []).forEach(function (block, position) {
        var index = BLOCK_TO_PARAGRAPH[position];
        var paragraph = parts[index];
        if (paragraph) block.content = index === 0 ? dropOpeningLabel(paragraph) : paragraph;
      });
      (detail.evidence || []).forEach(function (entry) {
        if (entry.id === 'calc.personalization_status' && report.subtitle) entry.value = report.subtitle;
      });
    });
    return details;
  });

  // The source grid prints a "still waiting for your numbers" row; once the report is
  // real that row should say what it was actually calculated from.
  patch('CALCULATED_FACTS', function (facts) {
    if (report.subtitle) facts.personalization_note = report.subtitle;
    var groups = {};
    report.sections.forEach(function (section) {
      groups[section.category] = true;
    });
    (facts.confirmed_facts || []).forEach(function (fact) {
      // The preview credited the 목차 to "사용자가 제공한"; on the live page it is the
      // service's own index, and the reader should not be told they supplied it.
      if (fact.key === 'report.index_source') {
        fact.value = Object.keys(groups).length + '개 대분류, ' + report.sections.length + '개 중분류';
      }
    });
    return facts;
  });
})();
