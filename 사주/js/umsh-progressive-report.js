(function (global) {
  'use strict';

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function sectionReady(section) {
    return section && (section.status === 'complete' || section.status === 'failed');
  }

  function reportDone(report) {
    if (!report) return false;
    if (report.status === 'complete' || report.status === 'failed') return true;
    var sections = report.sections || [];
    return sections.length > 0 && sections.every(sectionReady);
  }

  function progressLabel(report) {
    var progress = report && report.progress;
    if (progress && progress.total) {
      return '해석 준비 중 · ' + (progress.complete || 0) + '/' + progress.total;
    }
    var sections = (report && report.sections) || [];
    var done = sections.filter(sectionReady).length;
    return '해석 준비 중 · ' + done + '/' + sections.length;
  }

  /**
   * After analyze returns TOC, poll GET /api/report/:id until sections complete.
   * Keeps shared UmshLoading chrome while generation continues in the background.
   */
  async function followProgress(options) {
    var payload = options.payload;
    var report = payload && payload.report;
    var reportId = (payload && payload.reportId) || (report && report.reportId);
    var publicId = (payload && payload.publicId) || (report && report.publicId);
    var onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : function () {};
    var fetchReport = options.fetchReport;
    var pollMs = Number(options.pollMs) > 0 ? Number(options.pollMs) : 1200;
    var maxPolls = Number(options.maxPolls) > 0 ? Number(options.maxPolls) : 180;
    var replacePublicUrl = options.replacePublicUrl !== false;

    onUpdate(payload);

    if (replacePublicUrl && publicId && typeof history !== 'undefined' && history.replaceState) {
      try {
        history.replaceState(null, '', '/r/' + publicId);
      } catch (_err) {
        /* ignore */
      }
    }

    if (reportDone(report) || !reportId || typeof fetchReport !== 'function') {
      return payload;
    }

    if (global.UmshLoading && typeof global.UmshLoading.show === 'function') {
      global.UmshLoading.show({
        title: '목차는 준비됐어요',
        subtitle: progressLabel(report) + ' · 장마다 이어서 채워질 거예요',
      });
    }

    var latest = payload;
    for (var i = 0; i < maxPolls; i += 1) {
      await sleep(pollMs);
      try {
        var next = await fetchReport(reportId);
        if (next && next.report) {
          latest = Object.assign({}, latest, next, {
            report: next.report,
            reportId: next.reportId || reportId,
            publicId: next.publicId || publicId,
            publicUrl: next.publicUrl || (publicId ? '/r/' + publicId : undefined),
          });
          onUpdate(latest);
          if (global.UmshLoading && typeof global.UmshLoading.show === 'function' && !reportDone(next.report)) {
            global.UmshLoading.show({
              title: '해석을 이어서 준비하고 있어요',
              subtitle: progressLabel(next.report),
            });
          }
          if (reportDone(next.report)) break;
        }
      } catch (_err) {
        /* keep polling through transient errors */
      }
    }

    if (global.UmshLoading && typeof global.UmshLoading.hide === 'function') {
      global.UmshLoading.hide();
    }
    return latest;
  }

  function readingPlaceholder(section) {
    var title = section && section.classification ? section.classification : '이 장';
    return (
      '<div class="umsh-section-skeleton" role="status" aria-live="polite">' +
      '<strong>' + title + ' 해석을 준비하고 있어요</strong>' +
      '<p>목차는 바로 보실 수 있고, 이 장의 풀이가 끝나는 대로 채워집니다.</p>' +
      '<div class="interpret-progress" aria-hidden="true"></div>' +
      '</div>'
    );
  }

  function chapterStatusClass(section) {
    if (!section) return 'is-pending';
    if (section.status === 'complete') return 'is-ready';
    if (section.status === 'generating') return 'is-generating';
    if (section.status === 'failed') return 'is-failed';
    return 'is-pending';
  }

  global.UMSHProgressiveReport = {
    followProgress: followProgress,
    reportDone: reportDone,
    sectionReady: sectionReady,
    readingPlaceholder: readingPlaceholder,
    chapterStatusClass: chapterStatusClass,
    progressLabel: progressLabel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
