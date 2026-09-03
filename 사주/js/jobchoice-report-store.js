/**
 * Swaps the sample copy inside the 직장 선택 02/04/05/06 pages for the real RAG report.
 *
 * Those pages render straight out of JobChoice.buildTeaser / buildReport / buildDetail
 * the moment their own script runs, so patching the DOM afterwards would fight their
 * renderer. This file runs synchronously *before* the page script and wraps those three
 * functions: the original still builds the whole shape, and only the reader-facing text
 * is replaced from the report step 04 cached.
 *
 * With no cached report every function behaves exactly as authored, so the pages still
 * preview standalone.
 */
(function () {
  var REPORT_KEY = 'umsh:report:job_choice';
  if (!window.JobChoice) return;

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
  var groupOrder = [];
  var byGroup = {};
  report.sections.forEach(function (section) {
    byId[section.id] = section;
    if (!byGroup[section.category]) {
      byGroup[section.category] = [];
      groupOrder.push(section.category);
    }
    byGroup[section.category].push(section);
  });

  function paragraphs(section) {
    return String((section && section.interpretation) || '')
      .split('\n\n')
      .map(function (text) {
        return text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim();
      })
      .filter(Boolean);
  }

  function sentences(text) {
    return String(text || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  }

  /**
   * A reading opens by naming the 문 and the item it is about. The pages already print
   * both above the text, so repeating them inside a conclusion reads as filler.
   */
  function dropOpeningLabel(text) {
    return String(text || '').replace(/^第[一二三四五六七八九十]+門[^"]*"[^"]*"일세\.\s*/, '');
  }

  function clamp(text, limit) {
    var value = String(text || '').trim();
    return value.length > limit ? value.slice(0, limit - 1) + '…' : value;
  }

  /** The sentence of a reading that is specific to this 중분류, not to its 대분류. */
  function itemLine(section) {
    var parts = paragraphs(section);
    var lines = sentences(parts[1] || '');
    return lines[1] || lines[0] || '';
  }

  /**
   * What a whole 대분류 says: its own opening line plus the 원국 sentence behind it.
   * Several 대분류 read from the same 궁, so the opening line is what keeps the ten
   * group cards from printing the same sentence three times over.
   */
  function groupLine(section) {
    var parts = paragraphs(section);
    var lines = sentences(parts[1] || '');
    if (lines.length < 3) return lines.join(' ');
    return lines[0] + ' ' + lines[2];
  }

  var original = {
    buildTeaser: window.JobChoice.buildTeaser,
    buildReport: window.JobChoice.buildReport,
    buildDetail: window.JobChoice.buildDetail,
  };

  window.JobChoice.buildTeaser = function (input) {
    var teaser = original.buildTeaser(input);
    var first = byGroup[groupOrder[0]][0];
    if (report.subtitle) teaser.summary = report.subtitle;
    teaser.headline = clamp(dropOpeningLabel(paragraphs(first)[0] || teaser.headline), 120);

    // The free teaser opens three representative 대분류 and nothing more.
    var picks = [groupOrder[0], groupOrder[3], groupOrder[6]];
    teaser.signals.forEach(function (signal, position) {
      var group = byGroup[picks[position]] || byGroup[groupOrder[position]];
      if (!group) return;
      signal.title = group[0].category;
      signal.body = clamp(groupLine(group[0]), 150);
    });

    teaser.paid_preview.forEach(function (entry, position) {
      var group = byGroup[groupOrder[position]];
      if (!group) return;
      entry.title = group[0].category;
      entry.preview = clamp(group.map(function (section) { return section.classification; }).slice(0, 3).join(', '), 90);
    });
    return teaser;
  };

  window.JobChoice.buildReport = function (input) {
    var built = original.buildReport(input);
    if (report.reportId) built.report_id = report.reportId;
    built.source = 'kms_rag';
    built.teaser = window.JobChoice.buildTeaser(input);
    (built.report_index.groups || []).forEach(function (group) {
      var owned = (group.sections || []).map(function (section) { return byId[section.section_id]; }).filter(Boolean);
      if (!owned.length) return;
      group.preview = clamp(groupLine(owned[0]), 160);
      (group.sections || []).forEach(function (section) {
        var real = byId[section.section_id];
        if (real) section.preview = clamp(itemLine(real), 140);
      });
    });
    built.report_index.source = 'kms_rag';
    return built;
  };

  window.JobChoice.buildDetail = function (sectionIdValue, input) {
    var built = original.buildDetail(sectionIdValue, input);
    var section = byId[built.detail.section_id];
    if (!section) return built;
    var parts = paragraphs(section);
    if (parts.length < 6) return built;

    built.detail.report_index_source = 'kms_rag';
    built.detail.conclusion = dropOpeningLabel(parts[0]);
    // Three authored blocks: the grounding, what it looks like day to day, and timing.
    var bodies = [parts[1], parts[2], parts[3]];
    (built.detail.interpretation_blocks || []).forEach(function (block, position) {
      if (bodies[position]) block.body = bodies[position];
    });
    // The closing paragraph is the action; the one before it carries the caution.
    if (built.detail.actions && built.detail.actions.length) built.detail.actions[0] = parts[5];
    if (built.detail.cautions && built.detail.cautions.length) built.detail.cautions[0] = parts[4];
    return built;
  };

  // The design gated 05/06 behind its own demo entitlement flag. A cached report only
  // exists because the server already granted access, so lift that gate here.
  if (typeof window.JobChoice.markPaid === 'function') window.JobChoice.markPaid();
})();
