(function (global) {
  'use strict';
  if (global.UMSHReportAccess) return;
  var ROUTES = [
    ['/day/wedding', 'wedding_day'],
    ['/love/this-year', 'love_this_year'], ['/work/job-choice', 'job_choice'],
    ['/work/quit', 'quit_fortune'], ['/money/save', 'money_save'],
    ['/match/cat', 'cat_compatibility'], ['/me/lucky', 'lucky_color'], ['/flow/newyear', 'newyear_flow'], ['/day/wedding', 'wedding_day'],
    ['/match/couple', 'match_couple'], ['/match/marry', 'marry_match'],
    ['/love/signal', 'couple_signal'], ['/me/pass-angle', 'pass_angle'],
    ['/work/move', 'work_move'], ['/work/job', 'work_job'],
    ['/love/mind', 'love_mind'], ['/love/again', 'love_again'],
    ['/love/spouse', 'love_spouse'], ['/place/home', 'home_fit'], ['/today/free', 'today_fortune'], ['/cmdg', 'saju_master']
  ];
  var route = ROUTES.find(function (item) { return location.pathname === item[0] || location.pathname.indexOf(item[0] + '/') === 0; });
  var key = route && route[1];
  if(key==='saju_master' && (new URLSearchParams(location.search).get('entry')==='today' || location.hash==='#todayResult')) key='today_fortune';
  var LEGACY = {newyear_flow:['umsh_newyear_report_v1'],love_this_year:['umsh:report:love_this_year'],job_choice:['umsh:report:job_choice'],quit_fortune:['umsh_quit_report_v1'],money_save:['umsh_save_report_v1'],cat_compatibility:['umsh:report:cat_compatibility'],lucky_color:['umsh:report:lucky_color'],match_couple:['umsh:couple-match:report-v1'],marry_match:['umsh_marry_report_v1'],couple_signal:['umsh:report:couple_signal'],pass_angle:['umsh_pass_angle_report_v1'],work_move:['umsh_work_move_report_v1','umsh_work_move_analysis_v1'],home_fit:['umsh_home_fit_report_v1'],saju_master:['cheongi_analysis']};
  var NESTED = {work_move:['umsh_work_move_input_payload_v1','umsh:work_move:form_v1'],home_fit:['umsh_home_fit_step2_payload_v1','umsh_home_fit_input_payload_v1']};
  var CMDG_TEMPLATE_IMAGES = {
    profile: '01-core-strength.png', 'day-master-strength': '02-resilience.png', 'hidden-personality': '03-private-presence.png', balance: '04-energy-focus.png',
    'useful-god-eokbu': '05-restoration.png', 'concern-loop': '06-priority.png', 'career-money': '07-work-money.png', 'career-transition': '08-stay-or-move.png',
    'wealth-flow': '09-value-created.png', 'love-loop': '10-relationship-pattern.png', 'destiny-partner': '11-relationship-atmosphere.png', 'avoid-relationship': '12-boundary.png',
    'love-timing': '13-relationship-timing.png', 'future-flow': '14-long-current.png', 'sewoon-detail': '15-yearly-change.png', 'action-guide': '16-next-signal.png'
  };
  var CMDG_CARD_TITLES = {
    profile: '타고난 강점을 쓰는 법', 'day-master-strength': '힘들 때 버티는 방식', 'hidden-personality': '선택할 때 드러나는 기준', balance: '내 힘이 집중되는 곳',
    'useful-god-eokbu': '내 힘을 살리는 방법', 'concern-loop': '고민이 겹칠 때 먼저 할 일', 'career-money': '일과 돈을 함께 살피는 법', 'career-transition': '지금 일, 계속할까 옮길까',
    'wealth-flow': '일의 대가를 받을 때 살필 점', 'love-loop': '관계에서 반복하는 선택', 'destiny-partner': '나에게 편안한 관계', 'avoid-relationship': '거리를 조절할 때 살필 행동',
    'love-timing': '다음 만남을 정할 때 살필 점', 'future-flow': '앞으로 살펴볼 큰 흐름', 'sewoon-detail': '올해 확인할 변화', 'action-guide': '지금 먼저 확인할 한 가지'
  };
  var CMDG_CARD_LEADS = {
    profile: '타고난 특징을 일상의 선택에 어떻게 쓸지 살펴봅니다.', 'day-master-strength': '버티기 전에 내 책임과 마감을 먼저 확인해 보세요.',
    'hidden-personality': '상대에게 맞추는 행동과 내가 지킬 기준을 함께 살펴보세요.', balance: '힘이 모인 곳과 보완할 곳을 나눠 읽어 보세요.',
    'useful-god-eokbu': '자료를 모은 뒤에는 결론을 한 문장으로 말해 보세요.', 'concern-loop': '제안에 빠진 조건부터 찾아보세요.',
    'career-money': '새 일을 맡기 전 업무 범위와 보상 조건을 함께 확인해 보세요.', 'career-transition': '옮길지 정하기 전에 두 선택의 실제 조건을 비교해 보세요.',
    'wealth-flow': '맡을 일과 그 대가를 문서에서 함께 확인해 보세요.', 'love-loop': '약속하기 전에 내 부담도 말해 보세요.',
    'destiny-partner': '끌림만큼 약속이 지켜지는지도 살펴보세요.', 'avoid-relationship': '첫인상보다 반복해서 나타난 행동을 기준으로 삼아 보세요.',
    'love-timing': '다음 약속의 시간과 장소처럼 확인할 수 있는 조건을 보세요.', 'future-flow': '오래 이어지는 기준과 올해의 참고점을 나눠 보세요.',
    'sewoon-detail': '새 제안을 받으면 담당자와 마감, 결과물을 먼저 확인해 보세요.', 'action-guide': '확인한 내용을 바탕으로 지금 답할 수 있는 한 가지를 정해 보세요.'
  };
  var CMDG_EDITORIAL = {
    profile: ['오행의 개수는 전통 해석에 쓰이는 계산값이지 성격 점수나 미래 결과가 아닙니다. 가장 많은 기운과 보완할 기운을 나누어 읽어 보세요.', '새 요청을 받으면 맡을 범위와 조정할 범위를 한 문장씩 적어 보세요.'],
    'day-master-strength': ['자료가 모자라서 답을 미루는 일과 이미 확인했는데도 결론을 미루는 일은 다릅니다. 필요한 정보가 남았는지 먼저 살펴보세요.', '요청 하나를 골라 마감과 담당 범위를 적고 추가 질문이 필요한지만 결정해 보세요.'],
    'hidden-personality': ['상대에게 부드럽게 답하면서도 약속의 범위를 다시 조정할 수 있습니다. 이것은 고정된 성격 판정이 아니라 선택을 점검하는 관점입니다.', '겹친 약속 중 하나를 골라 받아들일 일과 거절할 일을 구분해 보세요.'],
    balance: ['한쪽에 힘이 모인 계산 표시를 실제 행동으로 옮길 때에는 정보를 살핀 다음 말이나 결과물로 정리하는 순서가 도움이 됩니다.', '지금 맡은 일의 조건을 확인한 뒤 처리 순서를 짧은 답변으로 보내 보세요.'],
    'useful-god-eokbu': ['전통 해석의 기운은 선택을 설명하는 상징입니다. 어느 기운도 실제 결과를 보장하지 않습니다.', '비교 중인 선택 하나의 기준을 정하고 그 기준에 따른 결론을 말해 보세요.'],
    'concern-loop': ['기회처럼 보여도 맡을 일, 받을 대가, 끝낼 시점이 흐리면 판단할 자료가 부족합니다. 상대의 의도보다 제안의 조건을 살펴보세요.', '새 제안 한 건에서 비어 있는 조건을 질문으로 바꿔 보내 보세요.'],
    'career-money': ['일을 맡는다는 말과 대가가 서로 다른 곳에 적혀 있다면 오해가 생기기 쉽습니다. 실제 금액이나 수입 변화를 이 리포트가 보장하지는 않습니다.', '구두로 들은 조건과 문서에 적힌 조건이 같은지 맞춰 보세요.'],
    'career-transition': ['현재 자리와 새 선택의 실제 조건이 비어 있다면 유지나 이직을 단정할 근거는 없습니다. 입력한 조건이 있어도 역할·평가·보상·소진을 함께 비교해야 합니다.', '두 선택의 조건을 같은 항목으로 적고 빈칸을 담당자에게 물어보세요.'],
    'wealth-flow': ['받은 제안이 실제 결과와 보상으로 이어지려면 조건을 확인해야 합니다. 새로운 수입이 생긴다는 예측은 아닙니다.', '제안서에 결과물과 대가가 둘 다 적혀 있는지 확인해 보세요.'],
    'love-loop': ['상대의 마음을 짐작하는 것보다 약속의 시간과 분담이 실제로 어떻게 정해졌는지 보는 편이 분명합니다. 관계의 결과를 미리 정하는 해석은 아닙니다.', '다음 약속에서 내가 부담스러운 조건 한 가지를 먼저 말해 보세요.'],
    'destiny-partner': ['특정한 사람의 성격을 사주로 예측할 수는 없습니다. 말이 통하는지, 일정과 책임을 분명히 하는지처럼 확인 가능한 행동을 기준으로 삼으세요.', '최근 만남 하나를 떠올리며 아래 질문에 실제 있었던 일로 답해 보세요.'],
    'avoid-relationship': ['누군가를 피해야 할 사람으로 분류하는 해석은 아닙니다. 약속과 책임이 계속 흐려지는 상황에서 내가 정할 경계를 살펴보세요.', '반복된 요청 하나에 대해 내가 할 수 있는 범위를 분명히 말해 보세요.'],
    'love-timing': ['만남 날짜를 계산한 값이 없다면 특정 시기나 상대의 마음을 예언할 수 없습니다. 실제 답장과 일정 조율을 살펴보세요.', '다음 만남을 제안할 때 시간과 장소를 구체적으로 물어보세요.'],
    'future-flow': ['큰 흐름과 올해의 참고는 길이가 다른 전통 해석 단위입니다. 사건이 일어날 날짜나 확률이 아닙니다.', '현재 맡은 일과 올해 들어온 제안을 나눠 적어 보세요.'],
    'sewoon-detail': ['올해 간지는 전통 해석의 참고점입니다. 일이 반드시 늘거나 좋은 결과가 생긴다는 뜻이 아니라 실제 제안의 조건을 살필 계기로 읽으세요.', '올해 받은 제안 한 건에서 비어 있는 항목을 물어보세요.'],
    'action-guide': ['세부 운세 계산이 표시되지 않은 날에는 오늘은 반드시라는 판단을 더하지 않습니다. 확인된 조건과 더 물어볼 조건을 나누세요.', '확인된 일에는 답하고 빈칸이 남은 일에는 질문 한 가지를 보내 보세요.' ]
  };
  var rawFetch = global.fetch.bind(global);
  var authorized = null;
  var rememberedId = '';
  var headerCache = null;
  var ownerId = '';
  var ownerEpoch = 0;
  var pollTimer = null;
  var resuming = new Set();
  var booting = false;
  var printOpenedSections = [];
  var ALIASES = {cmdg:'saju_master',home_pungsu:'home_fit',home:'home_fit',love_thisyear:'love_this_year',love_signal:'couple_signal',today:'today_fortune'};
  function canonical(value) { return ALIASES[value] || value; }
  function withCmdgTemplateImages(report, serviceKey) {
    if (serviceKey !== 'saju_master' || !report || !Array.isArray(report.sections)) return report;
    return Object.assign({}, report, { sections: report.sections.map(function (section) {
      var filename = CMDG_TEMPLATE_IMAGES[section && section.id];
      if (!filename) return section;
      return Object.assign({}, section, {
        imageKey: 'cmdg-review-' + String(section.order || ''),
        imageSrc: '/assets/cmdg-review/' + filename,
        imageAlt: String(section.category || '천명사주') + ' 풀이 이미지'
      });
    }) });
  }
  function identity(payload) { return payload && (payload.resultId || payload.publicId || payload.reportId || (payload.report && (payload.report.resultId || payload.report.publicId || payload.report.reportId))) || ''; }
  function isPermalink() { return /^\/r\/[^/]+\/?$/.test(location.pathname); }
  function locationId() {
    var query = new URLSearchParams(location.search);
    var queryId = query.get('reportId') || query.get('resultId');
    if (queryId) return queryId;
    if (!isPermalink()) return '';
    try { return decodeURIComponent(location.pathname.replace(/^\/r\//, '').replace(/\/$/, '')); }
    catch (_) { return ''; }
  }
  function reportUrl(id, orderId) {
    var query=new URLSearchParams();
    if(orderId) query.set('orderId',orderId);
    else if(key==='newyear_flow' && new URLSearchParams(location.search).get('preview')==='1' && new URLSearchParams(location.search).get('paid')!=='1') query.set('preview','1');
    return '/api/report/'+encodeURIComponent(id)+(query.toString()?'?'+query.toString():'');
  }
  function isOutputPage() { return /(?:04-step|05-step|06-step)/.test(location.pathname) || isPermalink() || Boolean(locationId()); }
  function isDetailPage() { return /(?:05-step|06-step)/.test(location.pathname); }
  function isTeaserPage() { return /04-step/.test(location.pathname); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function remember(payload) {
    var id = identity(payload);
    if (!id) return;
    rememberedId = id;
    if(ownerId && key) { try {sessionStorage.setItem('umsh:report-identity:'+ownerId+':'+key,id);} catch(_) {} }
    var url = new URL(location.href);
    url.searchParams.set('reportId', id);
    if(key==='newyear_flow') {
      if(payload.previewOnly===true && !url.searchParams.get('orderId') && url.searchParams.get('paid')!=='1') url.searchParams.set('preview','1');
      else if(payload.report || url.searchParams.get('orderId') || url.searchParams.get('paid')==='1') url.searchParams.delete('preview');
    }
    if(payload.todayFortune) {
      url.searchParams.delete('start');
      if(/^\/cmdg(?:\/|$)/.test(url.pathname)) {url.searchParams.set('entry','today');url.hash='todayResult';}
      else if(/^\/today\/free(?:\/|$)/.test(url.pathname)) url.hash='';
    }
    url.searchParams.delete('paid');
    if(key!=='newyear_flow') url.searchParams.delete('orderId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function setOwner(id) {
    var next=String(id || '');
    if(next!==ownerId) {
      ownerEpoch+=1;
      if(ownerId) {
        authorized=null;rememberedId='';headerCache=null;
        if(document.getElementById('umsh-verified-reading') || ((key === 'home_fit' || key === 'wedding_day') && isOutputPage())) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
      }
    }
    ownerId=next;
    if(next && key && isOutputPage() && !locationId()) {try {rememberedId=sessionStorage.getItem('umsh:report-identity:'+next+':'+key) || rememberedId;}catch(_) {}}
  }
  function firstInsight(text) {
    var clean = String(text || '').replace(/^\s*\[[^\]]+\]\s*/, '').replace(/^\s*(?:흠|허허|잠깐)[.…\s]+/, '').trim();
    return clean.split(/\n\s*\n|(?<=[.!?。])\s+/).find(function(line){return line.trim().length > 5;}) || clean;
  }
  function panel() {
    var node = document.getElementById('umsh-verified-reading');
    if (node) return node;
    var layout = document.createElement('div'); layout.id = 'umsh-verified-layout';
    layout.setAttribute('data-umsh-chrome','');
    layout.setAttribute('data-service','저장된 해석');
    node = document.createElement('main'); node.id = 'umsh-verified-reading';
    node.style.cssText = 'background:#110e0a;color:#f5ead7;word-break:keep-all;overflow-wrap:anywhere';
    Array.from(document.body.children || []).forEach(function (item) { if (!['SCRIPT','STYLE','LINK'].includes(item.tagName) && !item.hasAttribute('data-umsh-service-bottom')) { item.setAttribute('data-report-concealed',''); item.hidden = true; item.style.setProperty('display','none','important'); } });
    layout.appendChild(node);
    document.body.appendChild(layout);
    document.documentElement.setAttribute('data-umsh-verified-reader','');
    var css=document.createElement('link');css.rel='stylesheet';css.href='/css/umsh-verified-reader.css?v=20260922-report-share';css.addEventListener('load',mountChrome);document.head.appendChild(css);
    function mountChrome() { if(global.UMSHChrome)global.UMSHChrome.mount({root:'#umsh-verified-layout',service:key==='today_fortune'?'오늘운':'저장된 해석',category:'흐름'}); }
    if(global.UMSHChrome) mountChrome();
    else if(!document.querySelector('script[src="/js/umsh-chrome.js"]')) {var script=document.createElement('script');script.src='/js/umsh-chrome.js';script.addEventListener('load',mountChrome);document.head.appendChild(script);}
    return node;
  }
  function navigation() { return '<nav aria-label="결과 화면 이동" style="display:flex;gap:18px;margin-bottom:22px"><a style="color:#e5bd69" href="/">운명상회 홈</a><a style="color:#e5bd69" href="/orders">내 구매 내역</a></nav>'; }
  function gate(message) {
    authorized = null;
    if (pollTimer) clearTimeout(pollTimer);
    if (gateInPlace(message)) return;
    var node = panel();
    node.innerHTML = navigation() + '<h1 style="font-size:24px">저장된 해석 확인</h1><p>' + escapeHtml(message) + '</p><a style="color:#e5bd69" href="/signup?entry=saved-report&returnTo='+encodeURIComponent(location.pathname+location.search)+'#login">로그인</a> · <a href="' + escapeHtml(route ? route[0] : '/') + '">서비스로 돌아가기</a>';
  }
  function labelText(value) { return String(value == null ? '' : value).trim().replace(/[.。]+$/, ''); }

  /*
   * 본문 안의 마크다운을 옮긴다.
   *
   * 모델이 표·목록·굵은 글씨를 쓰는데 렌더러가 글자를 이스케이프해 <p> 하나에 통째로
   * 넣기만 해서, 올해 연애운 본문에 `| 마음 신호 | 올해의 장면 |` `| --- | --- |` 가 그대로
   * 보였다(한 리포트에 표 줄 55개, 2026-09-18). 이미 저장된 해석도 다시 만들지 않고 제대로
   * 보이게 하려면 화면에서 옮기는 쪽이 맞다.
   *
   * 안전 규칙: **이스케이프를 먼저 하고** 그 결과 위에 서식 태그를 붙인다. 본문의 <, & 는
   * 글자로 남고, 우리가 만든 태그만 살아난다.
   */
  var richTextStyled = false;
  function ensureRichTextStyles() {
    if (richTextStyled || typeof document === 'undefined' || !document.head) return;
    richTextStyled = true;
    var style = document.createElement('style');
    style.id = 'umsh-richtext-css';
    style.textContent = [
      '.reading-table-wrap{overflow-x:auto;margin:10px 0}',
      '.reading-table{width:100%;border-collapse:collapse;font-size:.95em}',
      '.reading-table th,.reading-table td{border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 24%,transparent);padding:7px 9px;text-align:left;vertical-align:top;word-break:keep-all}',
      '.reading-table th{font-weight:800;background:color-mix(in srgb,currentColor 8%,transparent)}',
      '.reading-list{margin:8px 0;padding-left:1.2em}',
      '.reading-list li{margin:4px 0}',
      '.reading-subhead{font-weight:800;margin:10px 0 4px}',
    ].join('');
    document.head.appendChild(style);
  }
  function inlineMarkdown(escaped) {
    return escaped
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }
  function isTableRow(line) { return /^\|.*\|$/.test(line.trim()); }
  function isTableDivider(line) { return /^\|[\s:|-]+\|$/.test(line.trim()) && line.indexOf('-') !== -1; }
  function tableCells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) { return cell.trim(); });
  }
  function cellsHtml(cells, tag) {
    return cells.map(function (cell) { return '<' + tag + '>' + inlineMarkdown(escapeHtml(cell)) + '</' + tag + '>'; }).join('');
  }
  function richText(raw) {
    ensureRichTextStyles();
    var lines = String(raw == null ? '' : raw).split('\n');
    var html = '';
    var plain = [];
    function flush() {
      if (!plain.length) return;
      html += '<p>' + inlineMarkdown(escapeHtml(plain.join(' '))) + '</p>';
      plain = [];
    }
    for (var index = 0; index < lines.length;) {
      var line = lines[index];
      if (isTableRow(line)) {
        var rows = [];
        while (index < lines.length && isTableRow(lines[index])) {
          if (!isTableDivider(lines[index])) rows.push(tableCells(lines[index]));
          index += 1;
        }
        if (rows.length) {
          flush();
          var head = rows.shift();
          html += '<div class="reading-table-wrap"><table class="reading-table"><thead><tr>' + cellsHtml(head, 'th') + '</tr></thead>'
            + (rows.length ? '<tbody>' + rows.map(function (row) { return '<tr>' + cellsHtml(row, 'td') + '</tr>'; }).join('') + '</tbody>' : '')
            + '</table></div>';
        }
        continue;
      }
      if (/^\s*[-*]\s+\S/.test(line)) {
        flush();
        var bullets = [];
        while (index < lines.length && /^\s*[-*]\s+\S/.test(lines[index])) {
          bullets.push(lines[index].replace(/^\s*[-*]\s+/, '')); index += 1;
        }
        html += '<ul class="reading-list">' + cellsHtml(bullets, 'li') + '</ul>';
        continue;
      }
      if (/^\s*\d+[.)]\s+\S/.test(line)) {
        flush();
        var ordered = [];
        while (index < lines.length && /^\s*\d+[.)]\s+\S/.test(lines[index])) {
          ordered.push(lines[index].replace(/^\s*\d+[.)]\s+/, '')); index += 1;
        }
        html += '<ol class="reading-list">' + cellsHtml(ordered, 'li') + '</ol>';
        continue;
      }
      if (/^\s*#{1,4}\s+\S/.test(line)) {
        flush();
        html += '<p class="reading-subhead">' + inlineMarkdown(escapeHtml(line.replace(/^\s*#{1,4}\s+/, ''))) + '</p>';
        index += 1;
        continue;
      }
      if (line.trim()) plain.push(line.trim());
      index += 1;
    }
    flush();
    return html;
  }
  function readingBlock(kind, label, paragraphs) {
    if (!paragraphs.length) return '';
    return '<section class="reading-block reading-' + kind + '" aria-label="' + escapeHtml(label) + '"><span class="reading-role">' + escapeHtml(label) + '</span>' + paragraphs.map(richText).join('') + '</section>';
  }
  function readySectionBody(section) {
    var interpretation = String(section.interpretation || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    var hook = String(section.hook || '').trim();
    if (hook && interpretation.indexOf(hook) === 0) interpretation = interpretation.slice(hook.length).trim();
    var paragraphs = interpretation.split(/\n\s*\n/).map(function(paragraph){return paragraph.trim();}).filter(Boolean);
    /*
     * 항목 그림.
     *
     * 2026-09-18 실측: 서버는 항목마다 imageSrc 와 imageAlt 를 빠짐없이 준다(퇴사운 20/20,
     * 천명사주 37/37 …). 그런데 화면에는 한 장도 나오지 않았다. 그림을 그리는 쪽은
     * `richSectionBody` 뿐이고, 그건 storytelling 이 있는 항목에서만 쓰인다. LLM 이 만든 항목에는
     * 그 필드가 없어 전부 이 함수로 떨어졌고, 여기에는 그림이 없었다. 해석만 이어지는 글 벽이 됐다.
     */
    var answer = renderSectionImage(section) + (hook ? readingBlock('answer', '한 줄 답', [hook]) : '');
    if (paragraphs.length >= 2) {
      return answer + readingBlock('evidence', '근거', paragraphs.slice(0, -1)) + readingBlock('action', '행동', paragraphs.slice(-1));
    }
    return answer + readingBlock('evidence', '근거와 행동', paragraphs);
  }

  /* ==================================================================
   * 긴 풀이 블록 — 결론 · 서머리 · 하이라이트
   *
   * 해석 목차 위에 온다. 세 블록의 뼈대(판정 축·하이라이트 제목·이미지 2컷)는
   * /data/longform-blocks.json 이 가지고 있고, 본문은 리포트가 채운다. 본문이 아직
   * 없으면 뼈대만 스켈레톤으로 보여준다 — 구조가 먼저 보여야 무엇을 받는지 안다.
   *
   * 이미지는 각 서비스의 cutA·cutB 설정을 따른다. 천명사주 cutB는
   * 첫 하이라이트의 본문과 맞는 별도 실사형 배너다.
   * ================================================================== */
  var longform = { config: null, loading: null, failed: false };

  function ensureLongformStyles() {
    if (document.getElementById('umsh-longform-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-longform-css';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-longform.css?v=lf-20260918c';
    document.head.appendChild(link);
  }

  function loadLongformConfig() {
    if (longform.config || longform.failed) return Promise.resolve(longform.config);
    if (longform.loading) return longform.loading;
    longform.loading = rawFetch('/data/longform-blocks.json?v=lf-20260922-wood-banner', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        longform.config = data && data.services ? data.services : null;
        if (!longform.config) longform.failed = true;
        return longform.config;
      })
      .catch(function () { longform.failed = true; return null; });
    return longform.loading;
  }

  /** 라우트 키와 설정 키가 다르다 — cmdg 는 saju_master 로 정규화된다. 양쪽을 다 본다. */
  function longformConfigFor(serviceKey) {
    if (!longform.config) return null;
    var normalized = canonical(serviceKey || key);
    var wanted = [serviceKey, normalized, normalized === 'saju_master' ? 'cmdg' : '', key, canonical(key)];
    for (var index = 0; index < wanted.length; index += 1) {
      var name = wanted[index];
      if (name && longform.config[name]) return longform.config[name];
    }
    return null;
  }

  function longformParagraphs(text) {
    return String(text == null ? '' : text)
      .split(/\n\s*\n/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function longformSkeleton(label) {
    return '<div class="umsh-lf-skeleton" role="status" aria-live="polite">' +
      '<strong>' + escapeHtml(label) + ' 준비하고 있어요</strong>' +
      '<p>목차와 본문은 먼저 보실 수 있고, 이 자리는 준비가 끝나는 대로 채워집니다.</p>' +
      '</div>';
  }

  function verdictBlock(report, config) {
    var verdict = report && report.verdict;
    var statement = verdict ? String(verdict.statement || '').trim() : '';
    var axis = (verdict ? String(verdict.axis || '').trim() : '') || (config && config.verdictAxis) || '';
    /*
     * 결론은 이 사람의 사주로 만든 문장일 때만 건다. 예전에는 결론이 없으면 설정에 적어 둔
     * 판단 축을 "…를 먼저 정리합니다."로 바꿔 내걸었는데, 모든 사용자에게 같은 문장이라
     * 목업처럼 보였다(2026-09-18). 아직 없으면 자리째 비운다.
     */
    if (!statement) return '';
    var headline = statement;
    return '<section class="umsh-verdict" aria-labelledby="umsh-verdict-title">' +
      '<span class="umsh-verdict-badge">결론</span>' +
      '<p class="umsh-verdict-statement" id="umsh-verdict-title">' + escapeHtml(headline) + '</p>' +
      (axis && statement ? '<p class="umsh-verdict-axis">판단 축 · ' + escapeHtml(axis) + '</p>' : '') +
      '</section>';
  }

  function summaryBlock(report, config, entitled) {
    var summary = report && report.summary;
    if (summary && summary.status === 'failed') return '';
    var paragraphs = longformParagraphs(summary && summary.text);
    var locked = !entitled && paragraphs.length > 1;
    var shown = locked ? paragraphs.slice(0, 1) : paragraphs;
    var cut = config && config.cutA;
    var figure = cut
      ? '<figure class="umsh-summary-figure"><img src="' + escapeHtml(cut) + '" alt="" loading="lazy" decoding="async" aria-hidden="true"></figure>'
      : '';
    var body = shown.length
      ? shown.map(richText).join('')
      : longformSkeleton('전체 요약을');
    var unlock = locked
      ? '<div class="umsh-lf-locked"><p>요약의 나머지와 하이라이트는 결제 후 열립니다.</p>' +
        '<a class="umsh-lf-cta" href="' + escapeHtml(tocHref(identity(report) || rememberedId)) + '">전체 해석 열기</a></div>'
      : '';
    // 글이 아직 없으면 장식 컷을 걸지 않는다 — 첫 화면이 이미지와 골격으로만 차 버린다.
    return '<section class="umsh-summary' + (shown.length ? '' : ' is-pending') + '" aria-label="전체 요약">' +
      figure +
      '<div class="umsh-summary-body">' +
        '<p class="umsh-summary-eyebrow">한눈에 보기</p>' +
        body +
      '</div>' + unlock +
      '</section>';
  }

  function highlightBlocks(report, config, entitled) {
    var defined = (config && Array.isArray(config.highlights)) ? config.highlights : [];
    if (!defined.length) return '';
    var written = (report && Array.isArray(report.highlights)) ? report.highlights : [];
    var cut = config && config.cutB;
    var cards = defined.map(function (item, index) {
      var match = written[index] || {};
      if (match.status === 'failed') return '';
      var paragraphs = longformParagraphs(match.text);
      var locked = !entitled && paragraphs.length > 0;
      var body = paragraphs.length
        ? (locked ? richText(paragraphs[0]) : paragraphs.map(richText).join(''))
        : longformSkeleton(labelText(item.title) + ' 항목을');
      var banner = (index === 0 && cut)
        ? '<figure class="umsh-highlight-banner"><img src="' + escapeHtml(cut) + '" alt="" loading="lazy" decoding="async" aria-hidden="true"></figure>'
        : '';
      return '<article class="umsh-highlight' + (locked ? ' is-locked' : '') + '">' +
        banner +
        '<span class="umsh-highlight-index" aria-hidden="true">' + (index + 1) + '</span>' +
        '<h3 class="umsh-highlight-title">' + escapeHtml(labelText(item.title)) + '</h3>' +
        '<div class="umsh-highlight-body">' + body + '</div>' +
        '</article>';
    }).filter(Boolean).join('');
    if (!cards) return '';
    return '<section class="umsh-highlights" aria-label="하이라이트">' +
      '<div class="umsh-highlights-head"><h2 class="umsh-highlights-title">하이라이트</h2></div>' +
      '<div class="umsh-highlights-grid">' + cards + '</div>' +
      '</section>';
  }

  /**
   * accent is a page :root token name, never a hex.
   * Unknown names omit the inline style so CSS falls back to --gold.
   */
  var LONGFORM_ACCENT_TOKENS = { gold: 1, teal: 1, rose: 1, coral: 1, pink: 1, green: 1 };
  function longformAccentStyle(config) {
    var name = config && String(config.accent || '').replace(/^--/, '').trim();
    if (!LONGFORM_ACCENT_TOKENS[name]) return '';
    return ' style="--umsh-lf-accent:var(--' + name + ', var(--gold))"';
  }

  /** 세 블록의 HTML. 설정이 없으면 아무것도 그리지 않는다 — 하위 호환. */
  function longformHtml(report, entitled, serviceKey, payload) {
    var config = longformConfigFor(serviceKey);
    if (!config) return '';
    var inner = verdictBlock(report, config) + summaryBlock(report, config, entitled)
      + highlightBlocks(report, config, entitled);
    if (!inner) return '';
    return '<div class="umsh-longform" id="umsh-longform-host"' + longformAccentStyle(config) + '>' + inner + '</div>';
  }

  /**
   * 설정은 네트워크로 온다. 리포트가 먼저 그려졌으면 도착한 뒤 한 번 더 채운다.
   * 목차 위 자리만 건드리고 본문 섹션은 그대로 둔다.
   */
  function mountLongform(host, report, entitled, serviceKey, payload) {
    if (!host) return;
    ensureLongformStyles();
    var paint = function () {
      var html = longformHtml(report, entitled, serviceKey, payload);
      var existing = host.querySelector('#umsh-longform-host');
      if (!html) { if (existing && existing.parentNode) existing.parentNode.removeChild(existing); return; }
      if (existing) existing.outerHTML = html;
      else host.insertAdjacentHTML('afterbegin', html);
      if (canonical(serviceKey) === 'saju_master') {
        var container = host.parentNode || host;
        var summary = container.querySelector('.umsh-summary');
        var flow = container.querySelector('.umsh-life-flow');
        if (summary && flow && summary.parentNode) summary.parentNode.insertBefore(flow, summary.nextSibling);
      }
    };
    if (longform.config) { paint(); return; }
    loadLongformConfig().then(paint).catch(function () {});
  }

  /**
   * 서버가 저장 리포트의 만세력으로 계산한 대운·삼재만 화면에 옮긴다. 브라우저에서는 나이·삼재·운세 점수나
   * 미래 사건을 다시 계산하거나 만들지 않는다. memberContext 는 회원이 프로필에 직접
   * 저장한 현실 기준이며, 리포트 원문과는 별개다.
   */
  var CMDG_STEM_ELEMENTS = { '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토', '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수' };
  var CMDG_BRANCH_ELEMENTS = { '寅': '목', '卯': '목', '巳': '화', '午': '화', '辰': '토', '戌': '토', '丑': '토', '未': '토', '申': '금', '酉': '금', '亥': '수', '子': '수' };
  var CMDG_FLOW_LABELS = { 1: '속도를 조절할 흐름', 2: '기준을 정리할 흐름', 3: '힘을 쓰기 쉬운 흐름' };

  /** 대운 간지의 대표 오행과 저장 분석의 보완 기운을 비교한 세 단계 안내다. 결과 예측 점수가 아니다. */
  function cmdgFlowLevel(pillar, analysis) {
    // API는 '수(水)'처럼 한글·한자를 함께 주므로, 간지 오행의 한글 한 글자와 맞춘다.
    var useful = String(analysis && (analysis.usefulGod || analysis.weakElement) || '').charAt(0);
    var dominant = String(analysis && analysis.dominantElement || '').charAt(0);
    var elements = [CMDG_STEM_ELEMENTS[pillar && pillar[0]], CMDG_BRANCH_ELEMENTS[pillar && pillar[1]]].filter(Boolean);
    if (!elements.length || !useful) return 2;
    var support = elements.filter(function (element) { return element === useful; }).length;
    var pressure = elements.filter(function (element) { return element === dominant; }).length;
    return Math.max(1, Math.min(3, 2 + support - pressure));
  }

  function cmdgFlowCurveHtml(payload, compact) {
    var analysis = payload && payload.analysis || {};
    var fortune = analysis.fortune || {};
    var segments = Array.isArray(fortune.daewoon) ? fortune.daewoon.filter(function (item) {
      return item && typeof item.age === 'string' && typeof item.pillar === 'string';
    }).slice(0, 10) : [];
    if (!segments.length) return '';
    var currentPillar = typeof fortune.currentDaewoon === 'string' ? fortune.currentDaewoon : String(fortune.currentDaewoon && fortune.currentDaewoon.pillar || '');
    var levels = segments.map(function (item) { return cmdgFlowLevel(item.pillar, analysis); });
    var height = compact ? 116 : 166;
    var y = compact ? { 1: 82, 2: 52, 3: 22 } : { 1: 130, 2: 84, 3: 35 };
    var x = function (index) { return 58 + index * 30; };
    var path = levels.map(function (level, index) { return (index ? 'L' : 'M') + x(index) + ' ' + y[level]; }).join(' ');
    var currentIndex = segments.findIndex(function (item) { return item.pillar === currentPillar; });
    var guide = [[3, '힘을 쓰기 쉬움'], [2, '기준을 정리'], [1, '속도를 조절']].map(function (item) {
      return '<line x1="53" x2="334" y1="' + y[item[0]] + '" y2="' + y[item[0]] + '" class="umsh-flow-grid"/>'
        + '<text x="0" y="' + (y[item[0]] + 4) + '" class="umsh-flow-axis">' + item[1] + '</text>';
    }).join('');
    var points = segments.map(function (item, index) {
      var current = index === currentIndex;
      return '<circle cx="' + x(index) + '" cy="' + y[levels[index]] + '" r="' + (current ? 6 : 3) + '" class="umsh-flow-point' + (current ? ' is-current' : '') + '"/>'
        + ((!compact && (index % 2 === 0 || current)) ? '<text x="' + x(index) + '" y="158" text-anchor="middle" class="umsh-flow-age' + (current ? ' is-current' : '') + '">' + escapeHtml(item.age.replace(/세$/, '')) + '</text>' : '');
    }).join('');
    var summary = segments.map(function (item, index) { return item.age + ' ' + CMDG_FLOW_LABELS[levels[index]]; }).join(', ');
    return '<figure class="umsh-flow-curve' + (compact ? ' is-compact' : '') + '" role="img" aria-label="' + escapeHtml(summary) + '">'
      + '<div class="umsh-flow-plot"><svg viewBox="0 0 340 ' + height + '" aria-hidden="true" focusable="false">'
      + guide + '<path d="' + path + '" class="umsh-flow-line"/>' + points + '</svg></div>'
      + '</figure>';
  }

  function lifeFlowHtml(payload) {
    var fortune = payload && payload.analysis && payload.analysis.fortune;
    var daewoon = fortune && Array.isArray(fortune.daewoon) ? fortune.daewoon.filter(function (item) {
      return item && typeof item.age === 'string' && typeof item.startYear === 'number' && typeof item.pillar === 'string';
    }) : [];
    if (!daewoon.length) return '';
    var current = fortune.currentDaewoon || {};
    var currentYear = typeof fortune.currentYear === 'number' ? fortune.currentYear : null;
    var currentPillar = typeof current === 'string' ? current.trim() : String(current.pillar || '').trim();
    var currentSegment = daewoon.find(function (item) { return item.pillar === currentPillar; }) || null;
    var currentLabel = currentSegment ? currentSegment.age : String(current.age || '').trim();
    var currentStart = currentSegment ? Number(currentSegment.startYear) : Number(current.startYear);
    var currentText = [currentLabel, currentPillar && currentPillar + ' 대운', currentYear && String(currentYear) + '년 기준'].filter(Boolean).join(' · ');
    var samjae = fortune && fortune.samjae && typeof fortune.samjae === 'object' ? fortune.samjae : null;
    var samjaeStart = samjae && Number(samjae.periodStartYear);
    var samjaeEnd = samjae && Number(samjae.periodEndYear);
    var samjaePhases = { entering: '들어가는 해', middle: '가운데 해', leaving: '마무리 해' };
    var samjaePhase = samjae && samjaePhases[samjae.phase] ? samjaePhases[samjae.phase] : '';
    var samjaePeriod = Number.isFinite(samjaeStart) && Number.isFinite(samjaeEnd) ? String(samjaeStart) + '~' + String(samjaeEnd) + '년' : '';
    var timeline = daewoon.map(function (item) {
      var isCurrent = (Number.isFinite(currentStart) && item.startYear === currentStart)
        || (!currentStart && currentLabel && item.age === currentLabel && item.pillar === currentPillar);
      return '<li class="umsh-life-flow-segment' + (isCurrent ? ' is-current' : '') + '"' + (isCurrent ? ' aria-current="step"' : '') + '>'
        + '<span class="umsh-life-flow-age">' + escapeHtml(item.age) + '</span>'
        + '<strong>' + escapeHtml(item.pillar) + '</strong>'
        + '<span>' + escapeHtml(String(item.startYear)) + '년 시작</span>'
        + (isCurrent ? '<em>현재</em>' : '')
        + '</li>';
    }).join('');
    var labels = { work: '일·직장', workAlternative: '새 직장·제안', money: '재물·보상', relationship: '관계·연애', planning: '계획 기준' };
    var member = payload && payload.memberContext && typeof payload.memberContext === 'object' ? payload.memberContext : {};
    var contextRows = Object.keys(labels).map(function (field) {
      var value = typeof member[field] === 'string' ? member[field].trim() : '';
      return value ? '<li><strong>' + labels[field] + '</strong><span>' + escapeHtml(value) + '</span></li>' : '';
    }).filter(Boolean).join('');
    var serviceKey = canonical((payload && payload.context && payload.context.serviceKey) || (payload && payload.report && payload.report.serviceKey) || key);
    var cmdg = serviceKey === 'saju_master';
    var currentLevel = currentSegment ? cmdgFlowLevel(currentSegment.pillar, payload.analysis) : 2;
    return '<section class="umsh-life-flow" aria-labelledby="umsh-life-flow-title">'
      + '<span class="umsh-life-flow-eyebrow">만세력 계산 결과</span>'
      + '<h2 id="umsh-life-flow-title">나의 대운 흐름</h2>'
      + (currentText ? '<p class="umsh-life-flow-current">현재 위치 · ' + escapeHtml(currentText) + '</p>' : '')
      + (cmdg ? '<p class="umsh-flow-intro">선이 위로 갈수록 보완 기운을 쓰기 쉬운 구간, 아래로 갈수록 속도와 조건을 살필 구간입니다. 인생의 성공·수입을 예측한 점수는 아닙니다.</p>' + cmdgFlowCurveHtml(payload, false)
        + '<div class="umsh-flow-callout"><strong>지금의 위치 · ' + escapeHtml(currentLabel || '현재') + '</strong><span>' + CMDG_FLOW_LABELS[currentLevel] + '</span></div>' : '')
      + '<section class="umsh-life-flow-reference" aria-label="올해 참고와 삼재">'
      + '<p><strong>올해 참고</strong><span>' + escapeHtml(String(currentYear || '')) + '년 ' + escapeHtml(String(fortune.yearPillar || '')) + '</span></p>'
      + (samjaePeriod ? '<p><strong>삼재</strong><span>' + escapeHtml(samjae.status === 'current' ? '현재 삼재 · ' + samjaePeriod + (samjaePhase ? ' · ' + samjaePhase : '') : '다음 삼재 · ' + samjaePeriod) + '</span></p>' : '')
      + '</section>'
      + '<details class="umsh-life-flow-source" open><summary>만세력 원자료 보기</summary>'
      + '<ol class="umsh-life-flow-timeline" aria-label="대운 구간">' + timeline + '</ol>'
      + '<p class="umsh-life-flow-note">대운의 나이 구간·간지와 올해 참고는 저장 리포트의 만세력 계산 결과입니다. 삼재는 출생 년주와 절기 기준 해의 지지로 계산한 전통적인 연도 분류이며, 성공·실패 점수나 사건 예측이 아닙니다.</p>'
      + '</details>'
      + '<section class="umsh-life-context" aria-labelledby="umsh-life-context-title">'
      + '<h3 id="umsh-life-context-title">내가 저장한 현실 기준</h3>'
      + (contextRows
        ? '<ul>' + contextRows + '</ul>'
        : '<p>아직 등록한 현실 기준이 없습니다. <a href="/profile">MY에서 한 번 등록</a>하면 이후 해석에서 다시 사용합니다.</p>')
      + '</section></section>';
  }

  function mountLifeFlow(host, payload) {
    if (!host) return;
    var html = lifeFlowHtml(payload);
    var existing = host.querySelector && host.querySelector('.umsh-life-flow');
    if (!html) { if (existing && existing.parentNode) existing.parentNode.removeChild(existing); return; }
    if (existing) { existing.outerHTML = html; return; }
    host.insertAdjacentHTML('afterbegin', html);
  }

  function isCmdgPayload(payload) {
    return canonical((payload && payload.context && payload.context.serviceKey) || (payload && payload.report && payload.report.serviceKey) || key) === 'saju_master';
  }

  function cmdgVisualSpec(section, payload) {
    var analysis = payload && payload.analysis || {};
    var member = payload && payload.memberContext || {};
    var fortune = analysis.fortune || {};
    var fields = analysis.elements || {};
    var saved = function (value) { return typeof value === 'string' && value.trim() ? value.trim() : '추가 정보 입력 전'; };
    switch (section.id) {
      case 'profile': return { type: 'facts', caption: '저장 리포트의 오행 계산값 · 성격 점수가 아닙니다', items: [['나무', fields.wood], ['불', fields.fire], ['흙', fields.earth], ['쇠', fields.metal], ['물', fields.water]].filter(function (item) { return typeof item[1] === 'number'; }) };
      case 'day-master-strength': return { type: 'columns', caption: '요청을 받은 뒤 나눠 볼 두 가지', items: [['더 확인할 일', '마감이나 담당 범위가 비어 있음'], ['답해도 될 일', '조건을 확인했고 맡을 범위가 분명함']] };
      case 'hidden-personality': return { type: 'columns', caption: '약속이 겹칠 때', items: [['겉으로 보이는 행동', '상대의 요청에 답하는 방식'], ['내가 지킬 기준', '가능한 시간과 맡을 범위를 먼저 밝히기']] };
      case 'balance': return { type: 'steps', caption: '계산값을 일상적인 선택 순서로 옮긴 예', items: [['1', '살피기', '자료와 마감 확인'], ['2', '표현하기', '맡을 일과 처리 순서 전달']] };
      case 'useful-god-eokbu': return { type: 'steps', caption: '보완 기운은 실제 결과를 보장하지 않습니다', items: [['1', '살피기', '필요한 정보 찾기'], ['2', '말하기', '확인한 결론 전달하기']] };
      case 'concern-loop': return { type: 'check', caption: '제안받은 일을 살필 때', items: ['내 책임 범위', '받을 대가', '마감 또는 결정 시점'] };
      case 'career-money': return { type: 'table', caption: '제안의 역할·보상·마감을 한 문장으로 확인하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['제안 조건', saved(member.money)]] };
      case 'career-transition': return { type: 'table', caption: '현재 자리와 새 선택의 조건을 비교하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['현재 자리', saved(member.work)], ['새 선택', saved(member.workAlternative)]] };
      case 'wealth-flow': return { type: 'steps', caption: '제안 수락 전 확인 순서', items: [['1', '제안', '누가 어떤 일을 요청했나요?'], ['2', '결과물', '무엇을 완성해야 하나요?'], ['3', '대가', '지급 조건은 무엇인가요?']] };
      case 'love-loop': return { type: 'table', caption: '약속·부담·조정할 말을 한 문장으로 정리하는 표', headers: ['구분', '입력한 실제 조건'], rows: [['관계의 조건', saved(member.relationship)]] };
      case 'destiny-partner': return { type: 'check', caption: '관계를 살필 질문', items: ['약속한 시간을 지켰나요?', '변경 사항을 미리 말했나요?', '부담을 함께 조정할 수 있었나요?'] };
      case 'avoid-relationship': return { type: 'table', caption: '사람의 등급이 아닌 행동 기준', headers: ['반복된 행동', '내 경계', '다음 대응'], rows: [['역할이 계속 바뀜', '맡을 범위 정하기', '수락 전 다시 묻기'], ['약속 변경을 알리지 않음', '가능한 시간 밝히기', '새 일정 합의하기']] };
      case 'love-timing': return { type: 'check', caption: '다음 약속의 확인 항목 · 날짜 예측이 아닙니다', items: ['답장이 서로 이어지나요?', '시간과 장소가 정해졌나요?', '변경할 때 서로 알리나요?'] };
      case 'future-flow': return { type: 'columns', caption: '리포트의 기간 표기', items: [['장기 기준', saved(fortune.currentDaewoon) + ' 대운'], ['올해 참고', saved(fortune.yearPillar) + ' · ' + saved(member.planning)]] };
      case 'sewoon-detail': return { type: 'check', caption: '실제 제안서와 대조할 항목', items: ['담당자는 누구인가요?', '마감은 언제인가요?', '완성할 결과물은 무엇인가요?'] };
      case 'action-guide': return { type: 'steps', caption: '받은 요청을 정리하는 세 칸', items: [['1', '확인됨', '이미 아는 조건'], ['2', '더 물어볼 것', '결정에 필요한 빈칸'], ['3', '답할 말', '지금 전달할 한 문장']] };
      default: return null;
    }
  }

  function cmdgVisualHtml(spec) {
    if (!spec || !Array.isArray(spec.items || spec.rows)) return '';
    var html = '';
    if (spec.type === 'facts') html = '<div class="umsh-cmdg-facts">' + spec.items.map(function (item) {
      return '<div><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(String(item[1])) + '</strong><small>계산에 나타난 횟수</small></div>';
    }).join('') + '</div>';
    if (spec.type === 'columns') html = '<div class="umsh-cmdg-columns">' + spec.items.map(function (item) {
      return '<div><strong>' + escapeHtml(item[0]) + '</strong><p>' + escapeHtml(item[1]) + '</p></div>';
    }).join('') + '</div>';
    if (spec.type === 'steps') html = '<ol class="umsh-cmdg-steps">' + spec.items.map(function (item) {
      return '<li><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong><p>' + escapeHtml(item[2]) + '</p></li>';
    }).join('') + '</ol>';
    if (spec.type === 'check') html = '<ul class="umsh-cmdg-checks">' + spec.items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>';
    if (spec.type === 'table') html = '<div class="umsh-cmdg-table-scroll"><table><thead><tr>' + spec.headers.map(function (item) { return '<th scope="col">' + escapeHtml(item) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + spec.rows.map(function (row) { return '<tr>' + row.map(function (cell, index) { return '<' + (index ? 'td' : 'th scope="row"') + '>' + escapeHtml(cell) + '</' + (index ? 'td' : 'th') + '>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    return '<figure class="umsh-cmdg-visual"><figcaption>' + escapeHtml(spec.caption) + '</figcaption>' + html + '</figure>';
  }

  function cmdgDomainFlowHtml(section, payload) {
    var labels = { 'career-money': ['재물·보상', '재물운', 'money'], 'career-transition': ['일·직장', '직장운', 'work'], 'love-loop': ['관계·연애', '연애운', 'relationship'] };
    var item = labels[section.id];
    if (!item) return '';
    var member = payload && payload.memberContext || {};
    var recorded = typeof member[item[2]] === 'string' && member[item[2]].trim();
    return '<section class="umsh-cmdg-domain-flow" aria-label="' + item[0] + ' 흐름">'
      + '<h3>' + item[0] + ' · ' + item[1] + ' 참고 흐름</h3>'
      + '<p>위의 대운과 같은 기운 균형 흐름입니다. 재물·직장·연애의 결과나 성공률을 예측하지 않습니다.</p>'
      + cmdgFlowCurveHtml(payload, true)
      + '<span>' + (recorded ? '실제 조건 등록됨' : '실제 조건 입력 전') + '</span>'
      + '<a href="/profile">MY에서 실제 조건 확인하기</a>'
      + '</section>';
  }

  function cmdgCardBody(section, payload, body) {
    if (!isCmdgPayload(payload) || !CMDG_CARD_TITLES[section.id]) return body;
    var lead = '<p class="umsh-cmdg-lead"><strong>' + escapeHtml(CMDG_CARD_LEADS[section.id]) + '</strong></p>';
    var visual = cmdgVisualHtml(cmdgVisualSpec(section, payload)) + cmdgDomainFlowHtml(section, payload);
    var image = renderSectionImage(section);
    var answer = section.hook ? readingBlock('answer', '한 줄 답', [String(section.hook).trim()]) : '';
    var prefix = image + answer;
    var editorial = CMDG_EDITORIAL[section.id] || [];
    var supplement = editorial.length ? readingBlock('evidence umsh-cmdg-editorial', '쉬운 풀이·보강', [editorial[0]])
      + readingBlock('action umsh-cmdg-editorial', '추가로 확인할 것', [editorial[1]]) : '';
    return body.indexOf(prefix) === 0 ? lead + prefix + visual + body.slice(prefix.length) + supplement : lead + body + visual + supplement;
  }

  function cmdgCardTitle(section, payload) {
    return isCmdgPayload(payload) && CMDG_CARD_TITLES[section.id]
      ? CMDG_CARD_TITLES[section.id]
      : labelText(section.category) + ' · ' + labelText(section.classification);
  }

  /* ==================================================================
   * in-place 렌더 — 등록 디자인을 감추지 않고 슬롯에만 검증 본문을 넣는다.
   *
   * 기존 동작은 `panel()` 이 body 자식을 전부 숨기고 자체 마크업으로 화면을
   * 갈아끼우는 것이었다. 그 결과 서비스별로 등록한 히어로 이미지·영상·레이아웃이
   * 전부 사라졌다. 디자인 껍데기에는 유료 본문이 없고(04 티저 1.2KB · 06 상세
   * 186자 = 라벨뿐, 본문은 전부 <script type=json>) 숨길 이유도 없다.
   *
   * 옵트인은 <html data-umsh-verified-inplace>. 속성이 없는 페이지는 기존
   * 전면 은폐를 그대로 쓴다 — 슬롯을 아직 안 단 서비스가 조용히 깨지지 않게.
   *
   * 검증 전에는 CSS 가드가 채워지지 않은 슬롯을 visibility:hidden 으로 가린다.
   * 정적 HTML 에 박힌 샘플 문구(모든 사용자에게 동일)가 잠깐이라도 내 결과처럼
   * 보이면 안 되기 때문이다.
   * ================================================================== */
  function inPlaceEnabled() {
    return Boolean(document.documentElement && document.documentElement.hasAttribute('data-umsh-verified-inplace'));
  }
  /**
   * 슬롯 해석 순서
   *   1) 명시적 `data-umsh-slot` — 서비스별로 손으로 맞춘 것이 항상 이긴다
   *   2) 알려진 컨테이너 id — 서비스마다 이름이 다르지만(detail-stack · detail-root ·
   *      detailStage · section-items …) 역할은 같다. 26개 HTML을 일일이 고치는 대신
   *      여기서 흡수한다
   *   3) 진행률처럼 디자인에 자리가 아예 없는 것은 만들어 넣는다
   */
  var SLOT_FALLBACK_IDS = {
    // 06 상세 본문 → 04 티저 본문 → 05 결과 목록 순. 05 는 목록형이라 id 가 또 다르다.
    // 채팅 로그(`chat-log`·`chatLog`·`chatScroll`)는 넣지 않는다. 대화 기록 자리에
    // 섹션 목록을 밀어 넣으면 그 화면이 망가진다.
    sections: ['detail-stack', 'detail-root', 'detail-body', 'detailStage',
               'section-items', 'interpretationBlocks', 'reportStage', 'teaserStack', 'detail-group',
               'groupList', 'group-list', 'group-grid', 'item-list', 'reportGroups', 'report-list',
               'reportIndex', 'section-panel', 'content'],
    title: ['detail-title', 'detailTitle', 'page-title', 'pageTitle', 'report-title', 'resultTitle',
            'hero-title', 'sectionTitle', 'title'],
    subtitle: ['detail-conclusion', 'detailIntro', 'page-summary', 'hero-summary', 'summaryCopy',
               'resultAnswer', 'conclusion', 'subtitle', 'summary'],
    state: ['state-panel', 'statePanel', 'status-root', 'state-message', 'stateNotice', 'stateCopy',
            'state-copy', 'loading-panel', 'lockedState', 'accessState', 'state-card',
            'permission-note', 'emptyPanel', 'missing-input', 'status-box', 'access-notice',
            'emptyState', 'offline'],
    insights: ['signal-list', 'signalList', 'signal-tags', 'heroTags', 'evidencePills', 'flowList'],
    'paid-value': ['scope-list', 'scopeGrid', 'scope-grid', 'unlockList'],
    headline: ['hero-title', 'pageTitle', 'page-title', 'report-title', 'resultTitle'],
    summary: ['freeSummary', 'hero-summary', 'summaryCopy', 'resultAnswer', 'sectionPreview', 'answerLine', 'signal-main-copy'],
  };

  /** 껍데기 안에서 본문을 넣기 적당한 컨테이너. 스크롤 영역이 있으면 그 안. */
  function contentHost() {
    var shell = document.querySelector('#step-6_1-report, #step-5-chat, #step-4-report, .phone');
    if (!shell) return null;
    return shell.querySelector('#scroll-area, .scroll-area, .scroll, main') || shell;
  }

  /**
   * 본문 자리가 아예 없는 디자인(wedding·newyear·lucky·pass-angle·quit 상세)에는
   * 컨테이너를 만들어 넣는다. 기존 블록(evidence·scene·actions 같은 서비스 전용 자리)에
   * 섹션 목록을 밀어 넣으면 그 서비스의 렌더가 깨지므로 건드리지 않는다.
   */
  function ensureSectionsHost() {
    var existing = document.getElementById('umsh-sections-host');
    if (existing) return existing;
    // 04 는 무료 티저다. 자리를 만들어서까지 전체 목차를 쏟으면 티저가 목록 화면이 되고,
    // 05 목록·06 상세와 같은 내용이 세 번 나온다. 티저 디자인에 명시적인 sections 슬롯이
    // 있는 서비스는 그 슬롯이 1순위로 잡히므로 여기까지 오지 않는다.
    if (/\/04-step-4-report\//.test(location.pathname)) return null;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-sections-host';
    node.setAttribute('data-umsh-slot', 'sections');
    node.setAttribute('aria-label', '해석 본문');
    var progress = document.getElementById('umsh-progress-host');
    if (progress && progress.parentElement === host) host.insertBefore(node, progress.nextSibling);
    else host.appendChild(node);
    return node;
  }

  /**
   * 만들어 넣는 자리는 **공용 GNB 바로 아래**에서 시작한다.
   *
   * 예전에는 host.firstChild 앞에 넣었는데, 공용 크롬의 상단 호스트도 같은 자리에
   * 들어간다. 먼저 들어간 쪽이 밀려서 진행률과 상태 안내가 GNB 위에 떠 버렸다.
   * GNB 는 어느 화면에서나 맨 위에 고정되어야 한다.
   */
  function insertBelowChrome(host, node) {
    var top = host.querySelector(':scope > [data-umsh-service-top]') || document.querySelector('[data-umsh-service-top]');
    var anchor = top && top.parentElement === host ? top.nextSibling : host.firstChild;
    host.insertBefore(node, anchor);
    return node;
  }

  /** 진행률 자리가 없는 디자인에는 GNB 아래에 하나 만들어 넣는다. */
  function ensureProgressHost() {
    var existing = document.getElementById('umsh-progress-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-progress-host';
    node.className = 'umsh-progress-panel';
    node.setAttribute('data-umsh-slot', 'progress');
    node.setAttribute('aria-label', '해석 준비 진행률');
    node.hidden = true;
    return insertBelowChrome(host, node);
  }

  /**
   * id 대신 data 속성으로 자리를 표시한 디자인도 있다(wedding 상세: data-title·data-body …).
   */
  var SLOT_FALLBACK_ATTRS = {
    sections: ['[data-body]', '[data-sections]', '[data-reading-body]'],
    title: ['[data-title]'],
    subtitle: ['[data-subtitle]', '[data-conclusion]'],
    state: ['[data-state]', '[data-status]'],
    summary: ['[data-one-line-answer]', '[data-teaser-summary]', '#answerLine', '#signal-main-copy', '#freeSummary', '#resultAnswer'],
    headline: ['[data-teaser-headline]'],
    insights: ['[data-signal-list]', '#signal-tags'],
  };

  /**
   * 내용을 넣을 수 없는 요소를 슬롯으로 잡으면 안 된다.
   * `wedding-section` 은 `<select>` 였고, 거기에 본문을 넣으면 아무것도 렌더되지 않는다.
   */
  var UNFILLABLE = { SELECT: 1, INPUT: 1, TEXTAREA: 1, IMG: 1, BR: 1, HR: 1, OPTION: 1, VIDEO: 1, AUDIO: 1, IFRAME: 1 };
  function usableSlotTarget(node) {
    return Boolean(node) && !UNFILLABLE[node.tagName];
  }

  /** 상태 안내 자리가 없는 디자인에는 만들어 넣는다. 없으면 panel() 로 떨어져 디자인이 사라진다. */
  function ensureStateHost() {
    var existing = document.getElementById('umsh-state-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-state-host';
    node.className = 'umsh-state-panel';
    node.setAttribute('data-umsh-slot', 'state');
    node.setAttribute('aria-live', 'polite');
    return insertBelowChrome(host, node);
  }

  /**
   * 미리보기(무료 티저) 자리가 없는 디자인에는 만들어 넣는다.
   *
   * 이게 없으면 renderPreviewInPlace 의 filled 가 false 가 되고, showPreview 가
   * panel() 로 떨어져 **등록 디자인이 통째로 사라진다**. 04 티저는 대부분
   * headline·summary·insights·paid-value·checkout 자리에 id 가 없어서 그렇게 됐다.
   * sections·state·progress 가 이미 같은 방식으로 자리를 만든다.
   */
  function ensurePreviewHost() {
    var existing = document.getElementById('umsh-preview-host');
    if (existing) return existing;
    var host = contentHost();
    if (!host) return null;
    var node = document.createElement('section');
    node.id = 'umsh-preview-host';
    node.className = 'umsh-preview-panel';
    node.setAttribute('data-umsh-slot', 'preview');
    node.setAttribute('aria-label', '내 입력으로 먼저 보는 해석');
    // 상태 안내 바로 아래, 본문 자리보다 위. 진행률·상태는 이미 맨 위에 붙는다.
    var after = document.getElementById('umsh-state-host') || document.getElementById('umsh-progress-host');
    if (after && after.parentElement === host) { host.insertBefore(node, after.nextSibling); return node; }
    return insertBelowChrome(host, node);
  }

  /**
   * 해석 슬롯을 히어로 이미지 아래로 내린다.
   *
   * 퇴사운·이직운·커플궁합 06 화면은 슬롯이 히어로보다 **앞**에 있었다. 그래서 고객은 표지
   * 이미지와 제목을 보기도 전에 본문부터 만나고, 정작 이미지는 본문 수천 픽셀 아래에 홀로
   * 남았다 — 화면이 깨진 것처럼 보인다(2026-09-18). 페이지마다 마크업이 달라 26개를 손으로
   * 고치는 대신, 히어로가 뒤에 있는 경우에만 슬롯을 히어로 바로 아래로 옮긴다. 옮기는 자리는
   * 히어로의 부모라서 그 화면이 원래 쓰던 레이아웃 안으로 들어간다.
   */
  var slotsPlaced = false;
  function placeSlotsUnderHero() {
    if (slotsPlaced || !document.querySelector) return;
    var hero = document.querySelector('[data-umsh-hero], .hero');
    if (!hero || !hero.parentNode) return;
    var slots = ['progress', 'state', 'sections']
      .map(function (name) { return document.querySelector('[data-umsh-slot="' + name + '"]'); })
      .filter(Boolean);
    if (!slots.length || !hero.compareDocumentPosition) return;
    slotsPlaced = true;
    // 4 = DOCUMENT_POSITION_FOLLOWING. 슬롯이 이미 히어로 뒤면 그대로 둔다.
    if (hero.compareDocumentPosition(slots[0]) & 4) return;
    var anchor = hero;
    slots.forEach(function (slot) {
      try { anchor.parentNode.insertBefore(slot, anchor.nextSibling); anchor = slot; } catch (_) {}
    });
  }
  /**
   * 화면이 가진 그림을 관련 해석 항목 **바로 위**로 옮긴다.
   *
   * 퇴사운의 '다섯 스승' 그림은 본문과 한참 떨어진 화면 맨 아래에 있었다. 그림과 그 그림이
   * 말하는 해석이 따로 놀면 둘 다 장식으로 읽힌다(2026-09-18). 그림 쪽에
   * `data-umsh-visual-for="<항목 id>"` 를 달면 그 항목 카드 앞으로 옮겨 붙인다. 짝이 없는
   * 그림은 원래 자리에 그대로 둔다.
   */
  var sectionVisuals = null;
  function placeSectionVisuals(host) {
    if (!host || !document.querySelectorAll) return;
    /*
     * 원소를 **처음 한 번** 붙잡아 둔다. 옮겨 넣은 자리는 본문 host 안인데, 폴링이 돌 때마다
     * host.innerHTML 을 다시 쓰므로 그때 함께 지워진다. 실제로 그림이 화면에서 사라졌다.
     * 참조를 들고 있으면 지워져도 같은 원소를 다시 끼워 넣을 수 있다(2026-09-18).
     */
    if (!sectionVisuals) {
      sectionVisuals = [].slice.call(document.querySelectorAll('[data-umsh-visual-for]'))
        .filter(function (node) { return !host.contains(node); });
    }
    sectionVisuals.forEach(function (visual) {
      var target = host.querySelector('[data-section="' + visual.getAttribute('data-umsh-visual-for') + '"]');
      if (!target || !target.parentNode) return;
      try { target.parentNode.insertBefore(visual, target); } catch (_) {}
    });
  }
  function slotNode(name) {
    placeSlotsUnderHero();
    var explicit = document.querySelector('[data-umsh-slot="' + name + '"]');
    if (usableSlotTarget(explicit)) return explicit;

    var ids = SLOT_FALLBACK_IDS[name] || [];
    for (var i = 0; i < ids.length; i++) {
      var byId = document.getElementById(ids[i]);
      if (usableSlotTarget(byId)) { byId.setAttribute('data-umsh-slot', name); return byId; }
    }
    var attrs = SLOT_FALLBACK_ATTRS[name] || [];
    for (var j = 0; j < attrs.length; j++) {
      var byAttr = document.querySelector(attrs[j]);
      if (usableSlotTarget(byAttr)) { byAttr.setAttribute('data-umsh-slot', name); return byAttr; }
    }
    if (name === 'progress') return ensureProgressHost();
    if (name === 'sections') return ensureSectionsHost();
    if (name === 'state') return ensureStateHost();
    if (name === 'preview') return ensurePreviewHost();
    return null;
  }
  function markFilled(node) { if (node) node.setAttribute('data-umsh-filled', ''); }
  /**
   * Single-section seed cards (#detailContent) are not the live TOC. After the
   * paid reading mounts, hide that seed so 06-1 matches the this-year stack.
   *
   * 저축운(money/save) 06 페이지는 이 씨앗 카드와 함께 그 서비스만의 옛 한 칸씩 넘기는
   * 뷰어(#lockedState·#missingState, prev/next)를 따로 갖고 있다. 그 뷰어는 자기 자신의
   * `hasVerifiedEntitlement()` 를 페이지 로드 시점에 딱 한 번만 동기로 검사하는데, 공용
   * 검증은 비동기라 그 시점에 아직 끝나지 않은 적이 있다 — 그러면 "권한 확인이 필요합니다"
   * 배너가 `hidden` 클래스를 벗고 영구히 남는다. 다시 부르는 코드가 없어서 스스로는 안
   * 닫힌다. 공용 리딩 뷰가 실제로 열렸다는 것은 검증이 끝났다는 뜻이므로, 여기서 같이 닫는다.
   * 2026-09-18 저축운 리포트에서 실측(완성본 위에 배너가 그대로 떠 있었다).
   *
   * 결혼궁합(match/marry) 06 페이지는 또 다른 모양의 같은 문제를 갖고 있다. 자기만의 옛
   * 목업 뷰어가 `#access-chip` 에 "권한 불일치"·"항목 없음" 같은 내부 상태 문구를 적는데,
   * 그 뷰어의 항목 배열은 설계 시점의 목업 id(`marry-01-01` 등)만 담고 있어 실제 생성된
   * 리포트의 항목 id 와 맞는 적이 없다 — 그래서 실제 고객에게도 항상 이 칩이 뜬다. 상위
   * `.contextbar` 째로 닫는다. 그 칩이 없는 서비스의 `.contextbar` 는 건드리지 않는다.
   * 2026-09-18 결혼궁합 리포트에서 실측("항목 없음" 칩이 탭처럼 보였다).
   */
  var LEGACY_GATE_IDS = ['lockedState', 'missingState'];
  function closestByClass(node, className) {
    var el = node;
    while (el) {
      if (el.classList && el.classList.contains(className)) return el;
      el = el.parentElement || el.parentNode || null;
    }
    return null;
  }
  /*
   * 서비스마다 "가린다"의 구현이 다르다 — 저축운은 자기 CSS 에 `.hidden{display:none!important}`
   * 를 따로 두고 클래스로 가리고, 결혼궁합은 그런 규칙 없이 네이티브 `hidden` 속성만 쓴다.
   * 그런데 결혼궁합의 `.contextbar{display:flex}` 처럼, 클래스 선택자가 `[hidden]` 의 낮은
   * 명시도를 이겨 `hidden` 속성만으로는 실제로 안 가려지는 경우가 있다(2026-09-18 실측 —
   * `hidden:true` 인데 `getComputedStyle().display`는 `flex` 그대로였다). 인라인 `style.display`
   * 는 그 페이지의 어떤 클래스 규칙보다도 위에 있으므로 셋을 모두 건다.
   */
  function hideLegacyNode(node) {
    if (!node) return;
    node.hidden = true;
    if (node.classList) node.classList.add('hidden');
    if (node.style) node.style.display = 'none';
  }
  function hideNativeSeedDetail(liveHost) {
    var native = document.getElementById('detailContent');
    if (native && native !== liveHost) {
      hideLegacyNode(native);
      native.setAttribute('data-umsh-seed-hidden', '');
    }
    for (var i = 0; i < LEGACY_GATE_IDS.length; i++) {
      var gate = document.getElementById(LEGACY_GATE_IDS[i]);
      if (gate && gate !== liveHost) hideLegacyNode(gate);
    }
    var accessChip = document.getElementById('access-chip');
    if (accessChip) {
      var bar = closestByClass(accessChip, 'contextbar') || accessChip;
      if (bar !== liveHost) hideLegacyNode(bar);
    }
  }
  function allowDesignMockReading() {
    try { return String(location.protocol) === 'file:'; }
    catch (_) { return false; }
  }
  /** 슬롯 표시 전에 시안 본문이 잠깐이라도 내 결과처럼 보이면 안 된다. */
  var LIVE_READING_HOST_IDS = [
    'detail-stack', 'detail-body', 'interpretationBlocks', 'detail-conclusion',
    'conclusionBody', 'realityBody', 'conditionBody', 'focusBody', 'evidenceBody',
    'conclusionText',
  ];
  function unfilledHostCss() {
    return LIVE_READING_HOST_IDS.map(function (id) {
      return 'html[data-umsh-report-check][data-umsh-verified-inplace] #' + id + ':not([data-umsh-filled])';
    }).join(',');
  }
  /**
   * 슬롯의 조상이 `hidden` 으로 접혀 있으면 채워도 보이지 않는다. 디자인 페이지는
   * 자체 스크립트가 열어 주는 전제로 `#detail-content` 같은 래퍼를 hidden 으로 두는데,
   * in-place 모드에서는 그 스크립트가 렌더를 양보하므로 여기서 직접 연다.
   */
  function revealAncestors(node) {
    var el = node;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('hidden')) el.removeAttribute('hidden');
      el = el.parentElement;
    }
  }
  function fillSlot(name, html) {
    var node = slotNode(name);
    if (!node) return false;
    node.innerHTML = html;
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  function fillText(name, value) {
    var node = slotNode(name);
    if (!node) return false;
    node.textContent = String(value == null ? '' : value);
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  function ensureInPlaceStyles() {
    if (document.getElementById('umsh-inplace-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-inplace-css';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-verified-inplace.css';
    document.head.appendChild(link);
  }
  /**
   * 규칙을 바꿨는데 캐시된 옛 파일이 남으면 PDF 가 다시 화면 배색으로 찍힌다. 실제로
   * 브라우저가 새 규칙을 무시하고 옛 사본을 쓰는 것을 확인했다. HTML 의 `?v=` 규약과 같이
   * 버전을 붙인다 — 규칙을 고칠 때 이 값을 함께 올린다.
   */
  var PRINT_CSS_HREF = '/css/umsh-report-print.css?v=print-20260917b';
  function ensurePrintStyles() {
    if (document.getElementById('umsh-report-print-css')) return;
    var link = document.createElement('link');
    link.id = 'umsh-report-print-css';
    link.rel = 'stylesheet';
    link.href = PRINT_CSS_HREF;
    document.head.appendChild(link);
  }
  /**
   * PDF 는 인쇄 대화상자의 "PDF로 저장"으로 받는다. 14개 상세 화면 가운데 버튼이 붙어
   * 있던 것은 두 곳뿐이었고, 다른 두 곳은 로드되지 않는 모듈을 부르고 있었다. 화면마다
   * 마크업이 달라 개별로 넣는 대신, 본문이 실제로 그려진 뒤 이 자리에서 한 번만 넣는다.
   * 이미 자체 버튼이 있는 화면은 건드리지 않는다 — 한 화면에 같은 버튼이 둘이면 안 된다.
   */
  /**
   * 목차 위 "중요 안내".
   *
   * 해석은 목차를 하나씩 만들어 가고 전체가 끝나기까지 시간이 걸린다. 그 사실을 미리
   * 말해 주지 않으면 사용자는 화면이 멈춘 줄 안다 — 실제로 % 가 안 움직인다는 문의가
   * 먼저 왔다(2026-09-17).
   *
   * 14개 06-1 화면이 모두 이 파일을 싣는다. 화면마다 문구를 넣으면 새 서비스가 생길
   * 때마다 빠지므로 여기서 한 번만 올린다.
   */
  /**
   * 완성됐으면 "정밀 분석 중… 30~50분" 안내는 낼 이유가 없다. 그런데 이 함수는 지금까지
   * `report.status` 를 보지 않고 매 렌더에서 한 번만(중복 방지 가드) 무조건 붙였다 — 그래서
   * 21/21·28/28 처럼 이미 다 끝난 리포트를 처음 여는 순간에도 "완성까지 30~50분" 문구가
   * 최상단(GNB 위)에 실렸다. 14개 06-1 화면이 다 이 파일을 쓰므로 넓게 걸린 문제였다.
   * 완성 여부는 상태값과 진행률 두 신호를 함께 본다 — 어느 한쪽 필드가 비어 있는 서비스가
   * 있을 수 있어서다.
   */
  function reportIsComplete(report) {
    if (!report) return false;
    if (report.status === 'complete') return true;
    var progress = report.progress;
    return Boolean(progress && progress.total > 0 && progress.complete >= progress.total);
  }
  function ensureImportantNotice(host, report) {
    if (!isDetailPage() && !isPermalink()) return;
    var existing = document.querySelector('[data-umsh-notice]');
    if (reportIsComplete(report)) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (existing) return;
    var anchor = host && host.closest ? (host.closest('section, article, main, body') || host) : document.body;
    if (!anchor) return;
    var box = document.createElement('aside');
    box.setAttribute('data-umsh-notice', '');
    box.setAttribute('role', 'note');
    box.style.cssText = [
      'margin:0 0 18px', 'padding:14px 16px', 'border-radius:14px',
      'background:#fff8ee', 'border:1px solid #c9a15a',
      'display:flex', 'gap:11px', 'align-items:flex-start', 'word-break:keep-all',
    ].join(';');
    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📜';
    icon.style.cssText = 'flex:none;font-size:18px;line-height:1.3';
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';
    var title = document.createElement('strong');
    title.textContent = '중요 안내';
    title.style.cssText = 'display:block;margin-bottom:5px;font-size:13px;font-weight:900;letter-spacing:.06em;color:#6b3f0e';
    var lines = [
      ['당신만의 운명 해석이 지금 정밀하게 완성되고 있습니다.', 'lead'],
      ['구매하신 해석은 단순히 정해진 결과를 보여드리는 방식이 아닙니다. 자체 만세력 · 자미두수 · 명리학 데이터를 함께 분석해, 당신의 사주에 맞춰 목차별 해석을 하나씩 생성합니다.', ''],
      ['정밀한 분석 과정으로 인해 전체 완성까지 약 30~50분 정도 소요될 수 있습니다.', 'strongish'],
      ['창을 닫으셔도 분석은 계속 진행됩니다. 지금 나가셔도 괜찮습니다. 나중에 다시 이 자리로 돌아오시면 완성된 해석을 이어서 확인하실 수 있습니다.', ''],
      ['조금만 기다려 주세요. 당신의 데이터를 바탕으로 한 해석이 하나씩 완성되고 있습니다.', ''],
    ];
    body.appendChild(title);
    for (var i = 0; i < lines.length; i += 1) {
      var line = document.createElement('p');
      line.textContent = lines[i][0];
      var tone = lines[i][1] === 'lead' ? 'color:#1a1814;font-weight:700'
        : lines[i][1] === 'strongish' ? 'color:#6b3f0e;font-weight:800'
          : 'color:#1a1814';
      line.style.cssText = 'margin:0 0 7px;font-size:13.5px;line-height:1.75;' + tone;
      if (i === lines.length - 1) line.style.marginBottom = '0';
      body.appendChild(line);
    }
    box.appendChild(icon);
    box.appendChild(body);
    // 목차 위에 놓는 것이 목적이지만, 앞에 끼울 수 없는 자리면 붙이기라도 한다 —
    // 안내가 사라지는 것보다 위치가 아쉬운 편이 낫다.
    if (typeof anchor.insertBefore === 'function' && anchor.firstChild) anchor.insertBefore(box, anchor.firstChild);
    else if (typeof anchor.appendChild === 'function') anchor.appendChild(box);
  }

  function ensurePdfDock(host) {
    // 06-1 상세 화면이 없는 서비스는 공용 리더(`/r/:id`)로 떨어진다. 보관함에서 여는 화면이
    // 거기라서, 고유 주소도 상세 화면과 같이 PDF 를 받을 수 있어야 한다. 티저(04)는 제외 —
    // 아직 열지 않은 본문의 PDF 를 권할 자리가 아니다.
    if (!isDetailPage() && !isPermalink()) return;
    ensurePrintStyles();
    if (document.querySelector('[data-umsh-pdf], #btn-pdf')) return;
    var anchor = host && host.closest ? (host.closest('section, article, main, body') || host) : document.body;
    if (!anchor) return;
    var dock = document.createElement('div');
    dock.className = 'umsh-pdf-dock';
    dock.setAttribute('data-umsh-pdf-auto', '');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pdf-button';
    button.setAttribute('data-umsh-pdf', '');
    button.textContent = 'PDF 저장';
    dock.appendChild(button);
    anchor.appendChild(dock);
  }
  function sectionStateClass(section) {
    if (!section) return 'is-pending';
    if (section.status === 'complete') return 'is-ready';
    if (section.status === 'generating') return 'is-generating';
    if (section.status === 'failed') return 'is-failed';
    return 'is-pending';
  }
  /**
   * 확정형 진행률. 서버가 주는 report.progress {complete,total} 를 퍼센트로 그린다.
   * 기존 `.interpret-progress` 는 방향만 보여주는 무한 스캔 애니메이션이라
   * "얼마나 남았는지"를 답하지 못했다.
   */
  function renderProgress(report) {
    var node = slotNode('progress');
    if (!node) return;
    var sections = (report && report.sections) || [];
    var progress = report && report.progress;
    var total = (progress && progress.total) || sections.length || 0;
    if (!total) { node.setAttribute('hidden', ''); return; }
    var done = progress && typeof progress.complete === 'number'
      ? progress.complete
      : sections.filter(function (item) { return item.status === 'complete'; }).length;
    done = Math.max(0, Math.min(total, done));
    var percent = Math.round((done / total) * 100);
    var complete = done >= total;
    node.removeAttribute('hidden');
    revealAncestors(node);
    node.setAttribute('role', 'progressbar');
    node.setAttribute('aria-valuemin', '0');
    node.setAttribute('aria-valuemax', String(total));
    node.setAttribute('aria-valuenow', String(done));
    node.setAttribute('aria-valuetext', total + '개 항목 중 ' + done + '개 준비 완료');
    node.setAttribute('data-umsh-progress-state', complete ? 'complete' : 'working');
    node.innerHTML =
      '<div class="umsh-progress-head">' +
        '<span class="umsh-progress-label">' + (complete ? '해석 준비 완료' : '해석 준비 중') + '</span>' +
        '<span class="umsh-progress-count"><strong>' + done + '</strong> / ' + total + '</span>' +
      '</div>' +
      '<div class="umsh-progress-track"><div class="umsh-progress-fill" style="width:' + percent + '%"></div></div>';
    // 안내 문구는 걷어냈다. "목차는 지금 보실 수 있고…" 같은 설명은 우리 사정이지
    // 읽는 사람이 알아야 할 내용이 아니다. 숫자와 막대, 항목별 배지로 충분하다.
    // (failed 개수는 항목 카드의 '미완성' 배지가 이미 말한다.)
    markFilled(node);
  }
  /** 무료 티저 — 정적 샘플 문구를 내 입력에서 검증된 값으로 교체한다. */
  function renderPreviewInPlace(payload) {
    if (!inPlaceEnabled()) return false;
    ensureInPlaceStyles();
    var preview = payload.preview || {};
    var source = preview.signals && preview.signals.length ? preview.signals : (preview.insights || []);
    var insights = source.filter(function (line) {
      return String(line).trim() !== String(preview.summary || '').trim();
    });
    var filled = false;
    if (paintTeaserPreview(preview)) filled = true;
    if (fillText('headline', preview.headline || preview.title || '먼저 확인한 방향')) filled = true;
    if (fillText('summary', preview.summary || '')) filled = true;
    if (fillSlot('insights', insights.map(function (line, index) {
      return '<article class="umsh-insight">' +
        '<span class="umsh-insight-index" aria-hidden="true">' + ('0' + (index + 1)).slice(-2) + '</span>' +
        '<p>' + escapeHtml(line) + '</p></article>';
    }).join(''))) filled = true;
    if (fillText('paid-value', preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.')) filled = true;
    var checkout = slotNode('checkout');
    if (checkout) {
      var cta = previewCta(payload);
      if (checkout.tagName === 'A') {
        checkout.setAttribute('href', cta.href);
        if (checkout.textContent && /전체|보기|목차|결제/.test(checkout.textContent)) checkout.textContent = cta.label;
      } else checkout.setAttribute('data-umsh-checkout-url', cta.href);
      markFilled(checkout);
      filled = true;
    }
    // 디자인에 맞는 자리가 하나도 없으면 만들어 넣는다. 여기서 false 를 돌려주면
    // showPreview 가 panel() 로 떨어져 등록 디자인이 사라진다 — 그 경로를 없앤다.
    if (!filled) filled = fillSlot('preview', previewBlock(payload, insights));
    renderProgress(payload.report);
    return filled;
  }
  /** 자리를 만들어 넣을 때 쓰는 미리보기 본문. 디자인 슬롯을 찾은 경우에는 쓰지 않는다. */
  function previewBlock(payload, insights) {
    var preview = payload.preview || {};
    var cta = previewCta(payload);
    return '<h2 class="umsh-preview-headline">' + escapeHtml(preview.headline || preview.title || '먼저 확인한 방향') + '</h2>'
      + (preview.summary ? '<p class="umsh-preview-summary">' + escapeHtml(preview.summary) + '</p>' : '')
      + (insights.length
        ? '<div class="umsh-preview-insights">' + insights.map(function (line, index) {
            return '<article class="umsh-insight">'
              + '<span class="umsh-insight-index" aria-hidden="true">' + ('0' + (index + 1)).slice(-2) + '</span>'
              + '<p>' + escapeHtml(line) + '</p></article>';
          }).join('') + '</div>'
        : '')
      + '<p class="umsh-preview-paid">' + escapeHtml(preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.') + '</p>'
      + '<a class="umsh-preview-checkout" href="' + escapeHtml(cta.href) + '">' + escapeHtml(cta.label) + '</a>';
  }
  /** 전체 해석 — 목록과 본문을 디자인 안 슬롯에 채운다. */
  function renderReportInPlace(payload) {
    if (!inPlaceEnabled()) return false;
    var report = payload.report;
    var host = slotNode('sections');
    if (!host) return false;
    ensureInPlaceStyles();
    var selected = new URLSearchParams(location.search).get('section') || '';
    var opened = Array.prototype.map.call(host.querySelectorAll('details[open]'), function (item) { return item.dataset.section; });
    fillText('title', report.title);
    fillText('subtitle', report.subtitle);
    host.innerHTML = report.sections.map(function (section, index) {
      var ready = section.status === 'complete' && typeof section.interpretation === 'string' && section.interpretation.trim();
      var body = ready ? cmdgCardBody(section, payload, richSectionBody(section)) : (
        '<div class="umsh-section-skeleton" role="status" aria-live="polite">' +
          '<strong>' + escapeHtml(labelText(section.classification) || '이 항목') + ' 해석을 준비하고 있어요</strong>' +
          '<p>' + (section.status === 'failed'
            ? '이 항목을 완성하지 못했습니다. 완료된 항목은 그대로 읽을 수 있습니다.'
            : '목차는 바로 보실 수 있고, 이 장의 풀이가 끝나는 대로 채워집니다.') + '</p>' +
          (section.status === 'failed'
            ? '<button type="button" class="reading-retry" data-retry-section="' + escapeHtml(section.id) + '">이 항목 다시 준비하기</button>'
            : '<div class="interpret-progress" aria-hidden="true"></div>') +
        '</div>');
      var open = opened.indexOf(section.id) !== -1 || selected === section.id
        || selected === section.generationId || (!opened.length && !selected && index === 0);
      return '<details class="reading-card ' + sectionStateClass(section) + '" data-section="' + escapeHtml(section.id) + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + escapeHtml(cmdgCardTitle(section, payload)) + '</summary>' +
        body + '</details>';
    }).join('');
    // 목차 위에 계산 결과·결론·서머리·하이라이트를 올린다. 본문 섹션 마크업은 건드리지 않는다.
    mountLifeFlow(host, payload);
    mountLongform(host, report, payload.entitled !== false, (payload.context && payload.context.serviceKey) || report.serviceKey || key, payload);
    placeSectionVisuals(host);
    revealAncestors(host);
    markFilled(host);
    hideNativeSeedDetail(host);
    renderProgress(report);
    ensureImportantNotice(host, report);
    ensurePdfDock(host);
    return true;
  }
  /** 진행 안내를 디자인 안 상태 슬롯에 표시한다. 본문 슬롯은 건드리지 않는다. */
  function statusInPlace(message) {
    if (!inPlaceEnabled()) return false;
    var node = slotNode('state');
    if (!node) return false;
    ensureInPlaceStyles();
    node.innerHTML = '<p class="umsh-gate-message" role="status">' + escapeHtml(message) + '</p>';
    revealAncestors(node);
    markFilled(node);
    return true;
  }
  /** 접근 차단 안내를 디자인 안에서 보여준다. 본문 슬롯은 채우지 않아 가려진 채로 둔다. */
  function gateInPlace(message) {
    if (!inPlaceEnabled()) return false;
    var node = slotNode('state');
    if (!node) return false;
    ensureInPlaceStyles();
    node.innerHTML = '<p class="umsh-gate-message" role="status">' + escapeHtml(message) + '</p>' +
      '<p class="umsh-gate-actions">' +
        '<a href="/signup?entry=saved-report&returnTo=' + encodeURIComponent(location.pathname + location.search) + '#login">로그인</a>' +
        ' · <a href="' + escapeHtml(route ? route[0] : '/') + '">서비스로 돌아가기</a>' +
      '</p>';
    markFilled(node);
    return true;
  }


  /* ==================================================================
   * 톤 v2 섹션 렌더
   *
   * `SectionStorytelling` 은 본문 문단 말고도 아래를 싣고 온다.
   *   feel · softBridge · tableMd/tableCaption · chartPoints/chartCaption
   *   · scene · actions[]
   * 여기에 섹션 단위 이미지(imageSrc/imageAlt)와 근거(patternKeys/ragTopics)가 붙는다.
   *
   * 기존 `readySectionBody()` 는 hook + 문단만 그려서 이 중 대부분을 버렸다.
   * 등록 디자인이 이미 이미지·표·행동 블록을 전제로 잡혀 있으므로, 빠진 만큼을
   * 여기서 만들어 채운다. storytelling 이 없으면 기존 렌더로 폴백한다.
   * ================================================================== */

  /** 마크다운 파이프 표를 안전한 HTML 표로. 셀은 전부 이스케이프한다. */
  function renderMarkdownTable(markdown, caption) {
    var lines = String(markdown || '').split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    var rows = lines.filter(function (line) { return line.indexOf('|') !== -1; }).map(function (line) {
      return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) { return cell.trim(); });
    });
    // 두 번째 줄이 --- 구분선이면 헤더가 있는 표다.
    var hasHeader = rows.length > 1 && rows[1].every(function (cell) { return /^:?-{2,}:?$/.test(cell); });
    if (hasHeader) rows.splice(1, 1);
    if (!rows.length) return '';
    var head = hasHeader
      ? '<thead><tr>' + rows[0].map(function (cell) { return '<th scope="col">' + escapeHtml(cell) + '</th>'; }).join('') + '</tr></thead>'
      : '';
    var bodyRows = hasHeader ? rows.slice(1) : rows;
    var body = '<tbody>' + bodyRows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<figure class="story-table-figure">' +
      '<div class="story-table-scroll"><table class="story-table">' + head + body + '</table></div>' +
      (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
      '</figure>';
  }

  /**
   * 수평 막대. 항목이 적고(보통 3~6개) 크기 비교가 목적이라 막대가 맞다.
   * 단일 계열이라 범례를 두지 않고, 값과 설명을 전부 글자로 직접 붙인다 —
   * 색만으로 정보를 전달하지 않고, 표 대체본이 따로 필요하지도 않게 된다.
   */
  function renderStoryChart(points, caption) {
    var list = (points || []).filter(function (point) {
      return point && typeof point.value === 'number' && isFinite(point.value);
    });
    if (!list.length) return '';
    var max = list.reduce(function (acc, point) { return Math.max(acc, Math.abs(point.value)); }, 0) || 1;
    var bars = list.map(function (point) {
      var percent = Math.max(2, Math.round((Math.abs(point.value) / max) * 100));
      var note = String(point.note || '').trim();
      return '<li class="story-chart-row"' + (note ? ' title="' + escapeHtml(note) + '"' : '') + '>' +
        '<div class="story-chart-head">' +
          '<span class="story-chart-label">' + escapeHtml(point.label) + '</span>' +
          '<span class="story-chart-value">' + escapeHtml(String(point.value)) + '</span>' +
        '</div>' +
        '<div class="story-chart-track"><div class="story-chart-fill" style="width:' + percent + '%"></div></div>' +
        (note ? '<p class="story-chart-note">' + escapeHtml(note) + '</p>' : '') +
        '</li>';
    }).join('');
    var summary = list.map(function (point) { return point.label + ' ' + point.value; }).join(', ');
    return '<figure class="story-chart-figure">' +
      '<ul class="story-chart" role="img" aria-label="' + escapeHtml(summary) + '">' + bars + '</ul>' +
      (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
      '</figure>';
  }

  /** 섹션 전용 이미지. 등록 디자인의 장면 이미지가 여기로 들어온다. */
  function renderSectionImage(section) {
    var src = String(section.imageSrc || '').trim();
    if (!src) return '';
    return '<figure class="story-image">' +
      '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(section.imageAlt || '') + '" loading="lazy" decoding="async" />' +
      '</figure>';
  }

  /**
   * 근거 칩 — 고객 화면에서 내린다(2026-09-18).
   *
   * `patternKeys` 와 `ragTopics` 는 생성기가 쓰는 내부 식별자다. 화면에 그대로 붙으니
   * `service:love_this_year`, `birth:solar:1975-9-26:5`, `yearPillar:乙卯`,
   * `dayMasterElement:wood` 같은 줄이 항목마다 찍혔다 — 올해 연애운 06-1 한 페이지에만
   * 열 군데였고, 생년월일과 내부 서비스 키가 그대로 노출됐다. 고객에게 보여 줄 내용이
   * 아니고, 근거는 본문이 문장으로 말한다.
   *
   * 값을 쓰는 곳이 더 없는지 확인한 뒤 호출부까지 지우는 편이 깔끔하지만, 지금은 노출만
   * 막는다. 함수와 호출부는 그대로 두어 되돌리기 쉽게 한다.
   */
  function renderSectionEvidence(_section) {
    return '';
  }

  function paragraphsOf(value) {
    return String(value || '').split(/\n\s*\n/).map(function (part) { return part.trim(); }).filter(Boolean);
  }

  /** 톤 v2 본문. storytelling 이 없으면 기존 렌더로 넘긴다. */
  function richSectionBody(section) {
    var story = section && section.storytelling;
    if (!story) return readySectionBody(section);

    var blocks = [];
    blocks.push(renderSectionImage(section));

    var hook = String(section.hook || '').trim();
    if (hook) blocks.push(readingBlock('answer', '한 줄 답', [hook]));
    if (story.feel) blocks.push(readingBlock('feel', '지금 상태', paragraphsOf(story.feel)));
    if (story.softBridge) blocks.push(readingBlock('bridge', '이어서', paragraphsOf(story.softBridge)));

    // 본문에서 hook 중복을 덜어낸다.
    var interpretation = String(section.interpretation || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    if (hook && interpretation.indexOf(hook) === 0) interpretation = interpretation.slice(hook.length).trim();
    var body = paragraphsOf(interpretation);
    if (body.length) blocks.push(readingBlock('evidence', '근거', body));

    if (story.tableMd) blocks.push(renderMarkdownTable(story.tableMd, story.tableCaption));
    if (story.chartPoints && story.chartPoints.length) blocks.push(renderStoryChart(story.chartPoints, story.chartCaption));
    if (story.scene) blocks.push(readingBlock('scene', '생활 장면', paragraphsOf(story.scene)));

    if (Array.isArray(story.actions) && story.actions.length) {
      blocks.push('<section class="reading-block reading-action" aria-label="지금 할 것">' +
        '<span class="reading-role">지금 할 것</span>' +
        '<ol class="story-actions">' + story.actions.map(function (action) {
          return '<li>' + escapeHtml(String(action)) + '</li>';
        }).join('') + '</ol></section>');
    }

    blocks.push(renderSectionEvidence(section));
    return blocks.filter(Boolean).join('');
  }

  function showPreview(payload, request) {
    authorized = null;
    if (key === 'home_fit' && global.UMSHHomeReading && global.UMSHHomeReading.render(payload)) return;
    if (key === 'wedding_day' && global.UMSHWeddingReading && global.UMSHWeddingReading.render(payload)) return;
    // 등록 디자인에 슬롯이 있으면 화면을 갈아끼우지 않고 슬롯만 채운다.
    if (renderPreviewInPlace(payload)) { if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search); return; }
    // 옵트인한 페이지에서 여기까지 왔다면 자리조차 만들 수 없었다는 뜻이다. 그래도
    // 디자인을 지우지는 않는다 — 사용자가 본 것은 등록 화면이고, 갈아끼우면 남의 화면이 된다.
    if (inPlaceEnabled()) { if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search); return; }
    var preview = payload.preview || {};
    var sourceInsights = preview.signals && preview.signals.length ? preview.signals : (preview.insights || []);
    var insights = sourceInsights.filter(function(line){return String(line).trim()!==String(preview.summary || '').trim();});
  var node = panel();
    var cta = previewCta(payload);
    node.innerHTML = ''
      + '<header class="preview-heading"><span class="preview-eyebrow">운명상회 · 내 입력으로 먼저 보는 해석</span><h1>' + escapeHtml(preview.headline || preview.title || '먼저 확인한 방향') + '</h1><p class="preview-summary">' + escapeHtml(preview.summary || '') + '</p></header>'
      + '<section class="preview-evidence" aria-labelledby="preview-evidence-title"><span class="reading-role">대표 근거</span><h2 id="preview-evidence-title">지금 먼저 확인할 장면</h2><div class="preview-evidence-list">' + insights.map(function(line,index){return '<article><span aria-hidden="true">0'+(index+1)+'</span><p>' + escapeHtml(line) + '</p></article>';}).join('') + '</div></section>'
      + '<section class="preview-scope" aria-labelledby="preview-scope-title"><span class="reading-role">전체 해석 범위</span><h2 id="preview-scope-title">이어서 비교할 내용</h2><p>' + escapeHtml(preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.') + '</p></section>'
      + '<a id="umsh-preview-checkout" class="reading-primary-link" href="' + escapeHtml(cta.href) + '">' + escapeHtml(cta.label) + '</a><p class="preview-note">현재 화면은 전체 본문을 열지 않고, 내 입력에서 확인된 방향과 대표 근거만 보여줍니다. 이미 받은 결과는 고유 주소로 다시 확인할 수 있어요.</p>';
    if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search);
  }
  function showReport(payload) {
    var report = payload.report;
    if (!report || !Array.isArray(report.sections)) return;
    var serverKey = canonical((payload.context && payload.context.serviceKey) || report.serviceKey || key);
    if (key && serverKey !== key) { gate('이 서비스의 해석이 아닙니다. 구매 내역에서 해당 결과를 열어 주세요.'); return; }
    report = withCmdgTemplateImages(report, serverKey);
    payload = Object.assign({}, payload, { report: report });
    authorized = report;
    if (key === 'home_fit' && global.UMSHHomeReading && global.UMSHHomeReading.render(payload)) return;
    if (key === 'wedding_day' && global.UMSHWeddingReading && global.UMSHWeddingReading.render(payload)) return;
    if (renderReportInPlace(payload)) return;
    if (inPlaceEnabled()) return;
    var selected = new URLSearchParams(location.search).get('section') || '';
    var node = panel();
    var opened = Array.from(node.querySelectorAll('details[open]')).map(function(item){return item.dataset.section;});
    /*
     * 상단 안내 줄(홈·구매 내역 링크, "운명상회 · 저장된 전체 해석", 주소 안내)은 걷어냈다.
     * 공용 상단바와 하단 내비게이션이 이미 같은 이동을 제공하고, 해석을 열자마자 읽을 것은
     * 제목과 결론이다. 오류·로그인 화면(gate)에는 갈 곳이 필요하므로 그쪽 navigation() 은 남긴다.
     */
    node.innerHTML = '<h1 style="font-size:26px">' + escapeHtml(report.title) + '</h1><p>' + escapeHtml(report.subtitle) + '</p>' + '<div id="umsh-longform-mount"></div>' + lifeFlowHtml(payload) + report.sections.map(function(section,index) {
      var ready = section.status === 'complete' && typeof section.interpretation === 'string' && section.interpretation.trim();
      var body = ready ? cmdgCardBody(section, payload, richSectionBody(section)) : '<p role="status">' + (section.status === 'failed' ? '이 항목을 완성하지 못했습니다. 완료된 항목은 그대로 읽을 수 있습니다.' : '해석을 준비하고 있습니다. 완료되면 이 자리에 전체 내용이 표시됩니다.') + '</p>' + (section.status === 'failed' ? '<button type="button" class="reading-retry" data-retry-section="'+escapeHtml(section.id)+'">이 항목 다시 준비하기</button>':'');
      return '<details data-section="' + escapeHtml(section.id) + '" class="reading-card"' + ((opened.indexOf(section.id) !== -1 || selected === section.id || selected === section.generationId || (!opened.length && !selected && index===0))?' open':'') + '><summary>' + escapeHtml(cmdgCardTitle(section, payload)) + '</summary>' + body + '</details>';
    }).join('');
    // 공용 리더(/r/:id). 06-1 이 없는 서비스(cmdg)가 여기로 온다 — 같은 세 블록을 같은 자리에 올린다.
    mountLongform(document.getElementById('umsh-longform-mount'), report, payload.entitled !== false, serverKey, payload);
    var id = identity(payload);
    if (id && key !== 'home_fit') node.insertAdjacentHTML('beforeend','<div class="umsh-report-share"><button type="button" data-umsh-report-share="'+escapeHtml(id)+'">링크 공유하기</button><span role="status" aria-live="polite"></span></div>');
    ensureImportantNotice(node, report);
    ensurePdfDock(node);
  }
  function expandReportForPrint() {
    printOpenedSections = Array.from(document.querySelectorAll('details.reading-card:not([open])'));
    printOpenedSections.forEach(function (item) { item.setAttribute('open', ''); });
  }
  function restoreReportAfterPrint() {
    printOpenedSections.forEach(function (item) { item.removeAttribute('open'); });
    printOpenedSections = [];
  }
  function validTodayScore(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  }
  function todayScoreBadge(value, label, total) {
    if (value === null) return '';
    return '<div class="'+(total?'daily-score-total':'daily-score-badge')+'" role="img" aria-label="'+escapeHtml(label+' 점수 '+value+'점, 100점 만점')+'"><span aria-hidden="true">'+(total?'<span class="daily-score-label">오늘의 운</span>':'')+'<strong>'+value+'</strong><span class="daily-score-unit">점</span></span></div>';
  }
  function showToday(payload) {
    authorized=null;
    // 저장된 오늘운은 천명사주 포털의 todayResult 한 화면에서 연다.
    // /r/:id 와 /today/free 의 기존 주소는 그대로 받아 같은 결과 ID로 정규화한다.
    var todayId=identity(payload);
    if(todayId && !/^\/cmdg(?:\/|$)/.test(location.pathname) && typeof global.location.replace==='function') {
      global.location.replace('/cmdg/?reportId='+encodeURIComponent(todayId)+'#todayResult');
      return;
    }
    var fortune=payload.todayFortune || {}, reading=fortune.reading || {};
    var details=reading.details || {}, scores=reading.score || {};
    var totalScore=validTodayScore(scores.total);
    var rows=[['work','일과 활동','01'],['money','돈과 선택','02'],['relationship','관계와 대화','03'],['caution','오늘 챙길 것','04']];
    var node=panel();
    var zodiac=reading.zodiac;
    node.className='umsh-daily-reading';
    node.innerHTML='<header class="daily-heading"><span class="daily-eyebrow">오늘 나한테 들어온 운</span><p class="daily-date">'+escapeHtml(fortune.date && fortune.date.label)+' · '+escapeHtml(fortune.profile && fortune.profile.name)+'</p><div class="daily-heading-row"><h1>'+escapeHtml(reading.title || '오늘의 운세')+'</h1>'+todayScoreBadge(totalScore,'오늘의 운',true)+'</div>'+(totalScore!==null?'<p class="daily-score-caption">100점 기준 · 오늘의 흐름 지표</p>':'')+'<p class="daily-summary">'+escapeHtml(reading.summary)+'</p></header>'+(zodiac?'<section class="daily-zodiac" aria-label="출생연도별 오늘운"><span class="daily-eyebrow">나의 띠별 오늘운 · 출생연도 기준</span><h2>'+escapeHtml(zodiac.title || zodiac.birthYear+'년생 · '+zodiac.animal+'띠')+'</h2><p>'+escapeHtml(zodiac.text)+'</p></section>':'')+'<div class="daily-sections">'+rows.map(function(row){var detail=details[row[0]] || {};var score=validTodayScore(detail.score);if(score===null)score=validTodayScore(scores[row[0]]);return '<section class="daily-card"><span class="daily-index" aria-hidden="true">'+row[2]+'</span><div class="daily-card-heading"><h2>'+row[1]+'</h2>'+todayScoreBadge(score,row[1],false)+'</div><p>'+escapeHtml(detail.text || reading[row[0]])+'</p>'+(detail.opportunity?'<p class="daily-tip"><strong>이렇게 활용하세요</strong> '+escapeHtml(detail.opportunity)+'</p>':'')+(detail.caution?'<p class="daily-tip"><strong>한 가지만 주의하세요</strong> '+escapeHtml(detail.caution)+'</p>':'')+'</section>';}).join('')+'</div><section class="daily-conclusion"><span class="daily-eyebrow">오늘의 결론</span><h2>오늘은 이렇게 움직이세요</h2><p>'+escapeHtml(reading.action)+'</p></section><p class="daily-note">내 사주와 오늘의 일진으로 풀어보는 하루의 방향</p><nav class="daily-links" aria-label="평생운 보기"><a class="daily-primary-link" href="/cmdg/?entry=lifelong">평생운 확인</a></nav>';
  }
  function consume(payload, headers, request) {
    if (!payload || (!payload.report && !payload.previewOnly && !payload.todayFortune)) return payload;
    var responseKey=canonical(payload.todayFortune ? 'today' : payload.serviceKey || (payload.context && payload.context.serviceKey) || (payload.report && payload.report.serviceKey) || key);
    if(key && responseKey!==key) {gate('이 서비스의 해석이 아닙니다. 구매 내역에서 해당 결과를 열어 주세요.');return payload;}
    remember(payload);
    var epoch=ownerEpoch;
    setTimeout(function(){if(epoch===ownerEpoch)remember(payload);},0);
    headerCache = headers || headerCache;
    if (payload.todayFortune) showToday(payload);
    else if (payload.previewOnly) {
      // 04는 동결 티저를 유지한다. 05·06·종합은 권한이 있으면 본문 GET으로 넘어간다.
      if (isEntitled(payload) && identity(payload) && !isTeaserPage()) {
        refresh(identity(payload));
        return payload;
      }
      showPreview(payload, request);
    }
    else if (isOutputPage() || /\/(?:love\/(?:mind|again|spouse)|work\/job)(?:\/|$)/.test(location.pathname)) {
      showReport(payload);
      resumePending(payload);
      var pending = payload.report.sections.some(function(section){return !['complete','failed'].includes(section.status);});
      if (pending && !pollTimer) pollTimer = setTimeout(function(){pollTimer=null;refresh(identity(payload)).catch(function(){});},1800);
      // 전부 실패로 멈춘 리포트도 서버 큐가 뒤에서 다시 만든다. 화면이 그 결과를 받으려면
      // 느리게라도 물어야 한다 — 12초 간격, 열 번까지(2분). 그 뒤엔 새로고침에 맡긴다.
      else if (!pending && payload.report.status === 'failed' && !pollTimer && failedPolls < 10) {
        failedPolls += 1;
        pollTimer = setTimeout(function(){pollTimer=null;refresh(identity(payload)).catch(function(){});},12000);
      }
    }
    return payload;
  }
  var failedPolls = 0;
  async function resumeSection(reportId,sectionId,retry) {
    if(resuming.has(sectionId) || resuming.size>=4)return;
    resuming.add(sectionId);
    try {
      await rawFetch('/api/report/section',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headerCache || {}),body:JSON.stringify({reportId:reportId,sectionId:sectionId,...(retry ? {retry:true}:{})})});
    } finally {resuming.delete(sectionId);}
  }
  // 이 화면에서 이미 다시 세워 본 실패 항목. 한 번 열 때 같은 칸을 거듭 보내지 않는다.
  var retriedFailed = Object.create(null);
  function resumePending(payload) {
    if(!headerCache || !payload.report)return;
    var id=payload.reportId || payload.report.reportId || identity(payload);
    var sections=payload.report.sections;
    var budget=Math.max(0,4-resuming.size);
    var waiting=sections.filter(function(section){return !resuming.has(section.id) && (section.status==='pending' || section.status==='generating');});
    waiting.slice(0,budget).forEach(function(section){resumeSection(id,section.id).catch(function(){});});
    budget-=Math.min(waiting.length,budget);
    /*
     * 실패로 굳은 칸도 다시 세운다.
     *
     * 예전에는 pending·generating 만 재개했다. 그래서 검수에 막힌 칸 하나가 그대로 남아 고객
     * 화면에 "미완성"이 계속 보였다 — 큐가 그 리포트를 다시 집지 않으면 영영 그대로다. 직장 선택
     * '대운·유년상 변동기'가 실제로 그랬다. 막은 검수 규칙을 고쳐 배포한 뒤에도 아무도 다시
     * 돌리지 않아 한 시간 반을 실패로 남아 있었고, 한 번 다시 세우자 곧바로 통과했다(2026-09-18).
     *
     * 읽는 사람이 화면을 여는 순간이 가장 확실한 재시작 신호다. 다만 비용이 드는 일이라 한 화면에서
     * 같은 칸은 한 번만, 동시에 두 칸까지만 보낸다. 서버도 짧은 재시도 간격을 따로 둔다.
     */
    sections.filter(function(section){return section.status==='failed' && !resuming.has(section.id) && !retriedFailed[section.id];})
      .slice(0,Math.min(budget,2))
      .forEach(function(section){retriedFailed[section.id]=1;resumeSection(id,section.id,true).catch(function(){});});
  }
  async function refresh(id) {
    if (!id) return;
    var epoch=ownerEpoch;
    var response = await rawFetch(reportUrl(id,new URLSearchParams(location.search).get('orderId')), {headers:headerCache || {},cache:'no-store'});
    var payload = await response.json().catch(function(){return {};});
    if(epoch!==ownerEpoch) return;
    if (!response.ok) { gate(payload.error || '이 계정에서 해석을 확인할 수 없습니다. 로그인과 구매 내역을 확인해 주세요.'); return; }
    consume(payload,headerCache);
  }
  async function reportFetch(path, options) {
    options = options || {};
    var daily=/\/api\/today\/fortune(?:\?|$)/.test(path);
    if (!daily && !/\/analyze(?:\?|$)/.test(path)) return rawFetch(path,options);
    var body = {}; try {body=JSON.parse(options.body || '{}');} catch (_) {}
    var id = body.reportId || body.resultId || ((!daily || !key || key==='today_fortune') ? locationId() || (isOutputPage() ? rememberedId : '') : '');
    if(daily && (key==='saju_master' || key==='today_fortune')) key='today_fortune';
    var explicitPaid = Boolean(body.orderId);
    var target = path;
    var next = Object.assign({},options);
    if (id) { target=reportUrl(id,body.orderId || new URLSearchParams(location.search).get('orderId')); delete next.body;next.method='GET';next.cache='no-store'; }
    else if (!explicitPaid && !daily && !isDetailPage()) {
      // 04·입력·종합은 동결 티저. 05·06에 preview를 붙이면 권한 있는 목차가 빈 골격으로 남는다.
      next.body=JSON.stringify(Object.assign({},body,{preview:true}));
    }
    var epoch=ownerEpoch;
    var response=await rawFetch(target,next);
    var payload=await response.clone().json().catch(function(){return {};});
    if(epoch!==ownerEpoch) return new Response(JSON.stringify({error:'계정이 변경되었습니다. 현재 계정으로 다시 열어 주세요.',code:'ACCOUNT_CHANGED'}),{status:403,headers:{'Content-Type':'application/json'}});
    if (response.ok) consume(payload,next.headers,body);
    else if (id) gate(payload.error || '저장된 해석을 확인할 수 없습니다.');
    return response;
  }
  async function boot() {
    if (booting || (!key && !isPermalink()) || !isOutputPage()) return;
    var id=locationId() || rememberedId;
    booting=true;
    // 확인 중이라는 문구는 화면에 쓰지 않는다. 등록 디자인이 이미 떠 있고, 곧
    // 진행률이나 본문이 그 자리를 채운다. 옵트인하지 않은 화면에서만 예전처럼 알린다.
    // (panel() 은 등록 디자인을 통째로 감추므로 in-place 화면에서는 절대 부르지 않는다.)
    if (!inPlaceEnabled()) {
      panel().innerHTML='<p role="status">저장된 해석을 확인하고 있습니다.</p>';
    }
    try {
      var config=await rawFetch('/api/auth/config').then(function(r){return r.json();});
      if(config.developmentReportAccess===true) {headerCache={};if(id)await refresh(id);return;}
      if (!config.enabled) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      var runtimeOk = global.UMSHAuthSession && global.UMSHAuthSession.waitForRuntime
        ? await global.UMSHAuthSession.waitForRuntime(1500)
        : Boolean(global.supabase && global.UMSHAuthSession);
      if (!runtimeOk || !global.UMSHAuthSession) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      var resolved = global.UMSHAuthSession.resolveLiveSession
        ? await global.UMSHAuthSession.resolveLiveSession(config, 900)
        : null;
      var client = resolved && resolved.client || global.UMSHAuthSession.createClient(global.supabase,config.url,config.publishableKey);
      var session = resolved && resolved.session;
      if (!session || !session.access_token) {
        if (!session && client) {
          var result=await client.auth.getSession();
          session=await global.UMSHAuthSession.enforceDeviceAuthSession(result.data.session,client);
        }
      }
      if (!session || !session.access_token) {
        if (/\/04-step-4-report\//.test(location.pathname) && !id) {
          document.documentElement.removeAttribute('data-umsh-report-check');
          return;
        }
        throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      }
      setOwner(session.user && session.user.id);
      headerCache={Authorization:'Bearer '+session.access_token};
      client.auth.onAuthStateChange(function(event,nextSession){
        setOwner(nextSession && nextSession.user && nextSession.user.id);
        if(event==='SIGNED_OUT' || !nextSession || nextSession.user.id!==session.user.id) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
        else if(nextSession.access_token) headerCache={Authorization:'Bearer '+nextSession.access_token};
      });
      id=locationId() || rememberedId;
      if(id) await refresh(id);
      else if(key==='newyear_flow' && /04-step/.test(location.pathname) && new URLSearchParams(location.search).get('orderId')) {
        var response=await reportFetch('/api/flow/newyear/analyze',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headerCache),body:JSON.stringify({orderId:new URLSearchParams(location.search).get('orderId')})});
        if(!response.ok) {var failed=await response.json().catch(function(){return {};});gate(failed.error || '구매 내역에서 결제 상태를 확인해 주세요.');}
      }
      else if(!authorized) {
        // 04 무료 티저는 reportId 없이 analyze(preview)로 채운다. 여기서 막으면
        // 정상 미리보기도 "확인 중/계산 실패"로 덮인다.
        if (/\/04-step-4-report\//.test(location.pathname) && !id) {
          document.documentElement.removeAttribute('data-umsh-report-check');
          return;
        }
        gate(isDetailPage() ? '저장된 해석 주소가 없습니다. 구매 내역에서 결과를 열어 주세요.' : '입력한 내용을 확인하고 있습니다. 입력이 아직 없다면 서비스로 돌아가 사주와 현재 상황을 알려 주세요.');
      }
    } catch(error) {
      if (/\/04-step-4-report\//.test(location.pathname) && !id) {
        document.documentElement.removeAttribute('data-umsh-report-check');
        return;
      }
      gate(error.message || '저장된 해석을 불러오지 못했습니다.');
    }
  }
  // Browser caches are lookup hints, never proof of ownership or purchase. Only a
  // fresh authenticated GET may supply displayable report content on a new page.
  if (key) {
    try {
      for(var index=sessionStorage.length-1;index>=0;index--) {
        var cacheKey=sessionStorage.key(index);
        if (!(LEGACY[key] || []).concat(NESTED[key] || []).includes(cacheKey)) continue;
        var parsed;try{parsed=JSON.parse(sessionStorage.getItem(cacheKey));}catch(_){continue;}
        var report=parsed && (parsed.sections?parsed:parsed.report || (parsed.analysis && parsed.analysis.report));
        if (!report || !Array.isArray(report.sections)) continue;
        if (isOutputPage() && !rememberedId && identity(report)) rememberedId=identity(report);
        if((NESTED[key] || []).includes(cacheKey)) {delete parsed.analysis;sessionStorage.setItem(cacheKey,JSON.stringify(parsed));}
        else sessionStorage.removeItem(cacheKey);
      }
    } catch(_) {}
  }
  function hasPaidReading(report) {
    if (report && (report.isPaid === true || report.paid === true || report.entitlement === 'paid')) return true;
    return Boolean(report && Array.isArray(report.sections) && report.sections.some(function (section) {
      return String((section && (section.interpretation || section.hook)) || '').trim();
    }));
  }
  function isEntitled(outcome) {
    if (!outcome || typeof outcome !== 'object') return false;
    var payload = outcome.payload && typeof outcome.payload === 'object' ? outcome.payload : outcome;
    var report = outcome.report;
    if (!report && payload.report && Array.isArray(payload.report.sections)) report = payload.report;
    if (outcome.entitled === true || payload.entitled === true) return true;
    if (hasPaidReading(report)) return true;
    var reason = String(payload.unlockReason || (report && report.unlockReason) || '').trim();
    return reason === 'admin' || reason === 'open' || reason === 'order';
  }
  function tocHref(reportId) {
    var id = String(reportId || rememberedId || '').trim();
    try {
      var url = new URL('../05-step-5-chat/chat.html', location.href);
      if (id) url.searchParams.set('reportId', id);
      url.hash = 'step-5-chat';
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '../05-step-5-chat/chat.html' + (id ? '?reportId=' + encodeURIComponent(id) : '') + '#step-5-chat';
    }
  }
  function previewCta(payload) {
    var entitled = isEntitled(payload);
    var id = identity(payload);
    if (entitled) {
      if (isTeaserPage()) return { href: tocHref(id), label: '전체 목차 열기' };
      if (id) return { href: '/r/' + encodeURIComponent(id), label: '전체 목차 열기' };
      return { href: location.pathname + location.search, label: '전체 목차 열기' };
    }
    return {
      href: (payload && payload.paymentUrl) || ('/payment?service=' + encodeURIComponent(key || 'cmdg')),
      label: '전체 보기',
    };
  }
  function acceptAnalyze(payload) {
    if (!payload || typeof payload !== 'object') return null;
    var preview = payload.preview;
    var hasPreview = Boolean(preview && String(preview.headline || preview.summary || preview.title || '').trim());
    var report = payload.report && Array.isArray(payload.report.sections) && payload.report.sections.length
      ? payload.report
      : (Array.isArray(payload.sections) && payload.sections.length ? payload : null);
    var toc = Array.isArray(payload.toc) ? payload.toc.filter(function (item) { return item && item.id; }) : [];
    var skeleton = !report && toc.length ? { sections: toc } : null;
    var entitled = isEntitled({ payload: payload, report: report });
    if (hasPreview) {
      var paid = hasPaidReading(report) || entitled;
      // 04 티저는 동결 preview만 쓴다. toc 골격을 report로 넘기면 빈 섹션 제목만 12% 칸을 덮는다.
      return {
        preview: preview,
        previewOnly: payload.previewOnly !== false && !paid,
        entitled: entitled,
        payload: payload,
        paymentUrl: payload.paymentUrl,
        toc: toc,
        report: paid ? (report || undefined) : (isDetailPage() ? (report || skeleton || undefined) : undefined),
      };
    }
    if (report) return { report: report, payload: payload, toc: toc, entitled: entitled };
    if (skeleton) return { report: skeleton, previewOnly: true, payload: payload, toc: toc, paymentUrl: payload.paymentUrl, entitled: entitled };
    return null;
  }
  function paintTeaserPreview(preview) {
    if (!preview) return false;
    var headline = String(preview.headline || '').trim();
    var summary = String(preview.summary || preview.headline || preview.title || '').trim();
    var line = headline || summary;
    if (!line) return false;
    var painted = false;
    document.querySelectorAll('[data-teaser-headline]').forEach(function (node) {
      node.textContent = headline || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    document.querySelectorAll('[data-teaser-summary]').forEach(function (node) {
      node.textContent = summary || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    document.querySelectorAll('[data-one-line-answer], #answerLine, #signal-main-copy, #freeSummary, #resultAnswer, #personal-teaser, #hero-summary, [data-hero-summary]').forEach(function (node) {
      if (node.hasAttribute('data-teaser-summary') || node.hasAttribute('data-teaser-headline')) return;
      node.textContent = headline || line;
      node.dataset.boundPreview = '1';
      markFilled(node);
      painted = true;
    });
    var insights = (preview.signals && preview.signals.length ? preview.signals : preview.insights) || [];
    var list = document.querySelector('[data-signal-list]');
    if (list && insights.length) {
      list.innerHTML = insights.slice(0, 3).map(function (item, index) {
        var title = item && typeof item === 'object' ? String(item.title || ('근거 ' + (index + 1))) : ('근거 ' + (index + 1));
        var body = item && typeof item === 'object' ? String(item.body || item.text || '') : String(item || '');
        return '<div class="signal-item"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(body) + '</span></div>';
      }).join('');
      painted = true;
    }
    var insightText = function (item) {
      if (item && typeof item === 'object') return String(item.body || item.text || item.title || '').trim();
      return String(item || '').trim();
    };
    ['#condition-signal', '#blocker-signal', '[data-flow-main]', '[data-flow-condition]', '[data-flow-obstacle]'].forEach(function (selector, index) {
      var node = document.querySelector(selector);
      if (node && insights[index]) {
        node.textContent = insightText(insights[index]);
        painted = true;
      }
    });
    document.querySelectorAll('#step-4-report .teaser .item p, #step-4-report .teaser-grid .mini-card span').forEach(function (node, index) {
      if (insights[index]) {
        node.textContent = insightText(insights[index]);
        painted = true;
      }
    });
    if (!painted) {
      var lead = document.querySelector('#step-4-report .teaser > p, #step-4-report .hero .copy > p');
      if (lead) {
        lead.textContent = line;
        painted = true;
      }
    } else if (!document.querySelector('[data-one-line-answer], #answerLine, #signal-main-copy, #freeSummary, #resultAnswer, #hero-summary, [data-hero-summary]')) {
      var luckyLead = document.querySelector('#step-4-report .teaser > p');
      if (luckyLead) luckyLead.textContent = String(preview.summary || line);
    }
    return painted;
  }
  global.UMSHReportAccess={fetch:reportFetch,consume:consume,remember:remember,setOwner:setOwner,inPlace:inPlaceEnabled,renderProgress:renderProgress,ownerEpoch:function(){return ownerEpoch;},firstInsight:firstInsight,showPreview:showPreview,showReport:showReport,acceptAnalyze:acceptAnalyze,hasPaidReading:hasPaidReading,isEntitled:isEntitled,tocHref:tocHref,previewCta:previewCta,paintTeaserPreview:paintTeaserPreview,verifiedReport:function(){return authorized;},identity:identity,allowDesignMockReading:allowDesignMockReading,markFilled:markFilled,richText:richText};
  if (typeof document !== 'undefined') {
    if (global.addEventListener) {
      global.addEventListener('beforeprint', expandReportForPrint);
      global.addEventListener('afterprint', restoreReportAfterPrint);
    }
    if((key || isPermalink()) && isOutputPage() && document.documentElement && document.head) {
      document.documentElement.setAttribute('data-umsh-report-check','');
      var guard=document.createElement('style');
      /*
       * in-place 페이지는 디자인을 살린다. 대신 검증 전 슬롯을 가려서 정적 샘플 문구가
       * 내 결과처럼 잠깐이라도 보이는 일을 막는다. 진행률 슬롯은 처음부터 보여야 한다.
       *
       * 가릴 때 자리는 남기지 않는다(display). visibility 로 가리면 글자만 사라지고 상자는
       * 그대로 남는다 — 올해 연애운 06-1 의 상태 패널이 min-height 260px 라, 리포트가 정상으로
       * 열렸는데도 상단바와 첫 이미지 사이에 245px 짜리 빈 구멍이 생겼다(2026-09-18 실측).
       * 채워지면 규칙이 풀리므로 보이는 결과는 같고, 빈 자리만 사라진다.
       */
      guard.textContent = inPlaceEnabled()
        ? [
          'html[data-umsh-report-check][data-umsh-verified-inplace] [data-umsh-slot]:not([data-umsh-slot="progress"]):not([data-umsh-filled])',
          unfilledHostCss(),
        ].filter(Boolean).join(',') + '{display:none}'
        : 'html[data-umsh-report-check] body > :not(#umsh-verified-layout):not([data-umsh-service-bottom]):not(.umsh-service-toast):not(script):not(style):not(link){display:none!important}';
      document.head.appendChild(guard);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
    document.addEventListener('click',function(event){var link=event.target.closest && event.target.closest('a[href]');if(!link || !rememberedId)return;var url=new URL(link.href,location.origin);if(url.origin===location.origin && route && url.pathname.indexOf(route[0])===0 && /(?:04-step|05-step|06-step)/.test(url.pathname)){url.searchParams.set('reportId',rememberedId);var query=new URLSearchParams(location.search);var orderId=query.get('orderId');if(key==='newyear_flow') {if(orderId) {url.searchParams.set('orderId',orderId);url.searchParams.delete('preview');}else if(query.get('preview')==='1' && query.get('paid')!=='1')url.searchParams.set('preview','1');}link.href=url.pathname+url.search+url.hash;}},true);
    document.addEventListener('click',function(event){var button=event.target.closest && event.target.closest('[data-retry-section]');if(!button || !authorized)return;button.disabled=true;resumeSection(authorized.reportId || rememberedId,button.dataset.retrySection,true).then(function(){return refresh(rememberedId);}).catch(function(){button.disabled=false;});});
    document.addEventListener('click',async function(event){
      var button=event.target.closest && event.target.closest('[data-umsh-report-share]');
      if(!button || !authorized || button.dataset.umshReportShare!==rememberedId)return;
      event.preventDefault();
      var status=button.nextElementSibling;
      try {
        if(!global.navigator || !global.navigator.clipboard || !global.navigator.clipboard.writeText)throw new Error('clipboard unavailable');
        await global.navigator.clipboard.writeText(location.origin+'/r/'+encodeURIComponent(rememberedId));
        if(status)status.textContent='링크를 복사했습니다. 해석은 권한 있는 계정에서만 열 수 있어요.';
      } catch(_) {
        if(status)status.textContent='링크를 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.';
      }
    });
    document.addEventListener('click',function(event){
      // 냥궁합·올해연애의 `#btn-pdf` 는 자체 핸들러가 이미 `window.print()` 로 떨어진다.
      // 여기서 같이 받으면 인쇄가 두 번 열린다.
      var pdf = event.target.closest && event.target.closest('[data-umsh-pdf]');
      if (!pdf) return;
      event.preventDefault();
      ensurePrintStyles();
      try { global.print(); } catch (_) {}
    });
  }
})(typeof window!=='undefined'?window:globalThis);
