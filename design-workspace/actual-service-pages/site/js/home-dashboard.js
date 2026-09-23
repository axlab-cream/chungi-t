/* Visualize authorized saved inputs; never manufacture a compatibility score. */
(function (global) {
  'use strict';
  var labels = {
    entranceFlow: { direct: '안쪽까지 곧게 보임', bent: '중간에 꺾이는 동선', blocked: '문·가구로 가려짐' },
    bedroomFeel: { quiet: '안쪽이고 조용함', window_road: '창밖 소음·시선', door_line: '문·복도 자극', too_bright: '강한 빛' },
    deskPosition: { back_wall: '등 뒤가 벽', back_window: '등 뒤가 창', face_door: '문을 정면으로 봄', mixed_rest: '휴식 공간과 섞임' },
    outsideFlow: { open: '앞이 트임', pressed: '건물 압박감', road_noise: '도로 소음', balanced: '무난한 창밖' }
  };
  var axes = [
    { key: 'terrain', label: '터 유사도', section: 'terrain-support', target: '비슷한 터의 생활 패턴', fields: ['terrainEvidence'] },
    { key: 'outsideFlow', label: '수계·도로 흐름', section: 'external-flow', target: '바깥 흐름', fields: ['outsideFlow'] },
    { key: 'lightAirNoise', label: '빛·바람·소음', section: 'light-air-noise', target: '시간대별 자극', fields: ['outsideFlow', 'bedroomFeel'] },
    { key: 'entranceFlow', label: '현관·동선', section: 'entrance-flow', target: '편하게 드나들기', fields: ['entranceFlow'] },
    { key: 'sleep', label: '수면·회복', section: 'sleep-recovery', target: '잠과 기상 리듬', fields: ['bedroomFeel', 'mainPurpose'] },
    { key: 'focus', label: '집중·업무', section: 'remote-focus', target: '시작과 마감', fields: ['deskPosition'] },
    { key: 'money', label: '살림·재물 관리', section: 'money-living', target: '수납·반품·구독', fields: ['painPoints'] },
    { key: 'saju', label: '개인 상징 궁합', section: 'saju-house-ohaeng', target: '사주와 목적', fields: ['sajuElements'] }
  ];
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function model(payload) {
    var context = payload.context || {}, home = context.home || {}, analysis = payload.analysis || {};
    var fields = ['mainPurpose', 'buildingType', 'entranceFlow', 'bedroomFeel', 'deskPosition', 'outsideFlow'];
    var count = fields.filter(function (key) { return key in labels ? Boolean(labels[key][home[key]]) : Boolean(home[key] && home[key] !== 'unknown'); }).length;
    var raw = context.birthTimeKnown === false ? null : analysis.elements;
    var elements = ['wood','fire','earth','metal','water'].map(function (key, i) { return { label: ['목 · 나무','화 · 불','토 · 흙','금 · 금속','수 · 물'][i], value: raw && typeof raw[key] === 'number' && Number.isFinite(raw[key]) && raw[key] >= 0 ? raw[key] : null }; });
    var totalElements = elements.reduce(function (sum, item) { return sum + (item.value || 0); }, 0);
    var axisScores = axes.map(function (axis) {
      var known = axis.fields.filter(function (field) {
        if (field === 'terrainEvidence') return !!(home.terrainEvidence && (typeof home.terrainEvidence.siteSimilarityScore === 'number' || typeof home.terrainEvidence.slopeDeg === 'number' || home.terrainEvidence.summary));
        if (field === 'sajuElements') return totalElements > 0 && context.birthTimeKnown !== false;
        if (field === 'painPoints') return Array.isArray(home.painPoints) && home.painPoints.length > 0;
        return Boolean(home[field] && home[field] !== 'unknown');
      }).length;
      var coverage = known / axis.fields.length;
      return { label: axis.label, section: axis.section, target: axis.target, known: known, total: axis.fields.length, coverage: coverage, value: coverage < 0.45 ? null : Math.round(coverage * 20) * 5 };
    });
    return { home: home, analysis: analysis, context: context, count: count, score: Math.round(count / fields.length * 100), elements: elements, total: totalElements, axisScores: axisScores };
  }
  function html(payload) {
    var data = model(payload), home = data.home, id = payload.reportId || payload.resultId;
    var rows = [
      ['bedroomFeel', '잠·회복', '조용히 쉬기', 'sleep-recovery'],
      ['deskPosition', '일·집중', '일과 휴식 구분', 'remote-focus'],
      ['entranceFlow', '출입·동선', '편하게 드나들기', 'entrance-flow'],
      ['outsideFlow', '창밖 환경', '빛·소음·시야 확인', 'external-flow']
    ].map(function (axis) {
      var value = labels[axis[0]][home[axis[0]]] || '아직 입력하지 않음';
      var href = id ? '../06-step-6_1-report-detail/index.html?reportId=' + encodeURIComponent(id) + '&section=' + encodeURIComponent(axis[3]) + '#step-6_1-report' : '#';
      return '<tr><th scope="row"><a href="' + escape(href) + '">' + axis[1] + '</a></th><td>' + escape(value) + '</td><td>' + axis[2] + '</td></tr>';
    }).join('');
    var axisBars = data.axisScores.map(function (item) {
      var href = id ? '../06-step-6_1-report-detail/index.html?reportId=' + encodeURIComponent(id) + '&section=' + encodeURIComponent(item.section) + '#step-6_1-report' : '#';
      var label = item.value === null ? '분석 대기' : item.value + '점';
      var width = item.value === null ? 0 : item.value;
      return '<tr><th scope="row"><a href="' + escape(href) + '">' + escape(item.label) + '</a></th><td><div class="home-chart-track"><i style="width:' + width + '%" aria-hidden="true"></i></div></td><td><strong>' + escape(label) + '</strong><br><span>' + escape(item.target) + '</span></td></tr>';
    }).join('');
    var chart = data.total > 0 && data.elements.every(function (item) { return item.value !== null; }) ? data.elements.map(function (item, i) {
      return '<div class="home-chart-row"><span>' + item.label + '</span><div class="home-chart-track"><i style="width:' + (item.value / data.total * 100) + '%;background:var(--home-element-' + i + ')" aria-hidden="true"></i></div><strong>' + item.value + '</strong></div>';
    }).join('') : '<p>오행 분포를 표시할 계산값이 충분하지 않습니다.</p>';
    var terrain = home.terrainEvidence || {}, slope = typeof terrain.slopeDeg === 'number' && Number.isFinite(terrain.slopeDeg) && terrain.slopeDeg >= 0 && terrain.slopeDeg <= 90 ? terrain.slopeDeg : null;
    var fortune = data.analysis.fortune || {};
    var timing = fortune.currentYear && fortune.yearPillar ? '<p><strong>' + escape(fortune.currentYear) + '년 · ' + escape(fortune.yearPillar) + '</strong></p><p>저장된 해석의 기준 연도입니다. 연간 기운은 전통적 해석이며 사건의 발생 확률이 아닙니다.</p>' : '<p>기준 연도·세운 자료가 없어 연간 기운은 표시하지 않습니다.</p>';
    return '<div class="home-dashboard">' +
      '<div class="home-dashboard-card"><h3>내 집을 얼마나 파악했을까?</h3><div class="home-dashboard-score"><strong>' + data.score + '<small>/100</small></strong><span>입력 충족도 · ' + data.count + '/6</span></div><meter min="0" max="100" value="' + data.score + '" aria-label="주거 정보 입력 충족도">' + data.score + '</meter><p>생활 목적·주거 형태·현관·침실·책상·창밖, 6개 정보의 입력 비율입니다. 집과의 궁합 점수가 아닙니다.</p><details><summary>궁합 총점은 왜 없나요?</summary><p>현재 자료만으로 집과 사람이 얼마나 잘 맞는지 수치화할 검증된 기준은 없습니다. 아래 조건과 항목별 해석을 함께 비교해 주세요.</p></details></div>' +
      '<div class="home-dashboard-card"><h3>한눈에 보는 8축 점수판</h3><table><caption>점수는 현재 리포트에서 비교 가능한 근거의 충족도입니다.</caption><thead><tr><th>축</th><th>그래프</th><th>상태</th></tr></thead><tbody>' + axisBars + '</tbody></table></div>' +
      '<div class="home-dashboard-card"><h3>내 생활과 집의 조건 비교</h3><table><caption>입력한 조건과 확인할 생활 기준</caption><thead><tr><th>생활 영역</th><th>지금 집</th><th>함께 볼 기준</th></tr></thead><tbody>' + rows + '</tbody></table><p>각 생활 영역을 누르면 해당 해석으로 이동합니다. 다른 집의 자료가 없어 집 간 순위는 매기지 않습니다.</p></div>' +
      '<div class="home-dashboard-card"><h3>내 사주의 오행 분포</h3><div role="group" aria-label="오행 계산값 막대그래프">' + chart + '</div><p>막대 길이는 저장된 오행 계산값의 비중입니다. 많고 적음이 좋고 나쁨이나 집의 오행을 뜻하지는 않습니다.</p></div>' +
      '<div class="home-dashboard-card"><h3>터 유사도</h3><strong class="home-dashboard-metric">' + escape(typeof terrain.siteSimilarityScore === 'number' ? terrain.siteSimilarityScore + '점' : (terrain.siteSimilarityLabel || terrain.siteArchetype || '생활 패턴 비교')) + '</strong><p>비슷한 터에서 반복되는 생활감을 기준으로 봅니다.</p>' + (typeof terrain.siteSimilarityScore === 'number' ? '<meter min="0" max="100" value="' + terrain.siteSimilarityScore + '" aria-label="터 유사도 0점에서 100점">' + terrain.siteSimilarityScore + '점</meter>' : '') + '<p>' + escape(terrain.siteSimilarityLabel || terrain.siteArchetype || terrain.summary || '이 집은 생활 목적과 실제 체감의 결을 먼저 비교해 보는 유형입니다.') + '</p></div>' +
      '<div class="home-dashboard-card"><h3>이 해석의 연간 흐름</h3>' + timing + '</div></div>';
  }
  function render(payload) {
    var sectionId = new URLSearchParams(location.search).get('section');
    var detailRoot = document.getElementById('step-6_1-report');
    if (!detailRoot || (sectionId && sectionId !== 'home-fit-overall')) {
      document.getElementById('home-dashboard')?.remove();
      return;
    }
    if (!payload.report || payload.previewOnly) return;
    var root = document.getElementById('step-5-chat') || document.getElementById('step-6_1-report');
    if (!root) return;
    var host = document.getElementById('home-dashboard');
    if (!host) {
      host = document.createElement('details'); host.id = 'home-dashboard'; host.className = 'band home-dashboard-shell';
      host.open = true;
      root.querySelector('section').after(host);
    }
    host.innerHTML = '<summary>내 사주와 집 · 한눈에 비교하기</summary>' + html(payload);
  }
  global.UMSHHomeDashboard = { render: render, model: model, html: html };
})(window);
