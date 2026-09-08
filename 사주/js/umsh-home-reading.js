/* Bind freshly authorized server data to the existing home service pages. */
(function (global) {
  'use strict';
  var chatBound = false;
  function reveal() {
    var root = document.getElementById('step-4-report') || document.getElementById('step-5-chat') || document.getElementById('step-6_1-report');
    var guardLayout = document.getElementById('umsh-verified-layout');
    var sharedTop = guardLayout && guardLayout.querySelector('[data-umsh-service-top]');
    // The shared shell mounts once. Move its live host before removing the guard,
    // preserving its handlers and avoiding a second, independently styled header.
    if (root && sharedTop) {
      root.querySelector('[data-umsh-service-top]')?.remove();
      root.prepend(sharedTop);
    }
    guardLayout?.remove();
    document.documentElement.removeAttribute('data-umsh-report-check');
    document.documentElement.removeAttribute('data-umsh-verified-reader');
    document.querySelectorAll('[data-report-concealed]').forEach(function (node) {
      node.hidden = false;
      node.style.removeProperty('display');
      node.removeAttribute('data-report-concealed');
    });
  }
  function render(payload) {
    var report = payload.report && Object.assign({}, payload.report, {
      sections: (payload.report.sections || []).map(function (section) {
        return section.status === 'complete' ? section : Object.assign({}, section, { interpretation: '', hook: '해석을 준비하고 있습니다.' });
      })
    });
    var context = payload.context || {};
    var verified = { service: { service_key: 'home_fit' }, context: context, home: context.home || {}, analysis: { report: report } };
    if (document.getElementById('step-4-report')) {
      // Even an entitled reader sees only a teaser on step 4.
      global.applyPayload(verified);
      var preview = payload.preview;
      if (preview) {
        document.getElementById('page-title').textContent = preview.headline || preview.title || '내 집의 무료 방향';
        document.getElementById('verdict-summary').textContent = preview.summary || '';
        document.getElementById('personal-teaser').textContent = [preview.summary].concat(preview.signals || preview.insights || []).filter(Boolean).join('\n\n');
      }
      document.getElementById('missing-input').classList.remove('is-open');
      document.querySelectorAll('[data-action="open-paid"]').forEach(function (link) {
        var next = link.cloneNode(true);
        var id = global.UMSHReportAccess.identity(payload);
        next.href = payload.previewOnly ? payload.paymentUrl || '/payment?service=home_pungsu' : '../05-step-5-chat/chat.html?reportId=' + encodeURIComponent(id) + '#step-5-chat';
        if (!payload.previewOnly) next.textContent = '전체 해석 목차 보기';
        link.replaceWith(next);
      });
    } else if (!report || payload.previewOnly) {
      // Keep the authenticated purchase gate for unpaid detail requests.
      return false;
    } else if (document.getElementById('step-5-chat')) {
      var groups = global.mergeReportGroups(global.readJsonBlock('REPORT_INDEX').groups, report);
      global.renderQuickNav(groups);
      global.renderReportList(groups);
      document.getElementById('hero-summary').textContent = report.subtitle || '';
      renderProgress(report);
      document.getElementById('missing-input').classList.remove('is-open');
    } else if (document.getElementById('step-6_1-report')) {
      var data = global.readJsonBlock('DETAIL_DATA');
      var sections = global.dynamicSectionsFromReport(report, data);
      var wanted = global.selectedSectionId(data);
      var index = sections.findIndex(function (s) { return s.section_id === wanted; });
      var invalid = index < 0;
      if (invalid) index = 0;
      if (!sections[index]) return false;
      global.render(sections[index], sections, index, invalid);
      if (!chatBound) { global.initChat(sections[index]); chatBound = true; }
      document.getElementById('permission-note').classList.remove('is-open');
    } else return false;
    if (report && !payload.previewOnly && global.UMSHHomeDashboard) global.UMSHHomeDashboard.render(payload);
    reveal();
    return true;
  }
  function renderProgress(report) {
    var sections = report.sections || [];
    var total = sections.length;
    var complete = sections.filter(function (s) { return s.status === 'complete'; }).length;
    var failed = sections.filter(function (s) { return s.status === 'failed'; }).length;
    var box = document.getElementById('status-box');
    var pdf = document.getElementById('pdf-button');
    var done = total > 0 && complete === total;
    if (pdf) pdf.disabled = !done;
    box.hidden = done;
    box.setAttribute('aria-busy', String(total > complete + failed));
    if (done) { box.replaceChildren(); return; }
    var label = document.createElement('strong');
    label.textContent = total ? '전체 ' + total + '개 중 ' + complete + '개 완료' : '해석을 불러오는 중입니다';
    var progress = document.createElement('progress');
    progress.setAttribute('aria-label', '해석 생성 진행률');
    if (total) { progress.max = total; progress.value = complete; }
    progress.style.cssText = 'display:block;width:100%;height:12px;margin:12px 0;accent-color:#e5bd69';
    var note = document.createElement('span');
    note.textContent = failed ? failed + '개 항목을 완료하지 못했습니다. 해당 항목에서 다시 시도해 주세요.' : '완료된 항목부터 읽을 수 있습니다.';
    box.replaceChildren(label, progress, note);
  }
  global.UMSHHomeReading = { render: render, renderProgress: renderProgress };
})(window);
