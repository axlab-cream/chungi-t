(function (global) {
  'use strict';
  if (global.UMSHReportAccess) return;
  var ROUTES = [
    ['/love/this-year', 'love_this_year'], ['/work/job-choice', 'job_choice'],
    ['/work/quit', 'quit_fortune'], ['/money/save', 'money_save'],
    ['/match/cat', 'cat_compatibility'], ['/me/lucky', 'lucky_color'],
    ['/match/couple', 'match_couple'], ['/match/marry', 'marry_match'],
    ['/love/signal', 'couple_signal'], ['/me/pass-angle', 'pass_angle'],
    ['/work/move', 'work_move'], ['/work/job', 'work_job'],
    ['/love/mind', 'love_mind'], ['/love/again', 'love_again'],
    ['/love/spouse', 'love_spouse'], ['/place/home', 'home_fit'], ['/today/free', 'today_fortune'], ['/cmdg', 'saju_master']
  ];
  var route = ROUTES.find(function (item) { return location.pathname === item[0] || location.pathname.indexOf(item[0] + '/') === 0; });
  var key = route && route[1];
  if(key==='saju_master' && (new URLSearchParams(location.search).get('entry')==='today' || location.hash==='#todayResult')) key='today_fortune';
  var LEGACY = {love_this_year:['umsh:report:love_this_year'],job_choice:['umsh:report:job_choice'],quit_fortune:['umsh_quit_report_v1'],money_save:['umsh_save_report_v1'],cat_compatibility:['umsh:report:cat_compatibility'],lucky_color:['umsh:report:lucky_color'],match_couple:['umsh:couple-match:report-v1'],marry_match:['umsh_marry_report_v1'],couple_signal:['umsh:report:couple_signal'],pass_angle:['umsh_pass_angle_report_v1'],work_move:['umsh_work_move_report_v1','umsh_work_move_analysis_v1'],home_fit:['umsh_home_fit_report_v1'],saju_master:['cheongi_analysis']};
  var NESTED = {work_move:['umsh_work_move_input_payload_v1','umsh:work_move:form_v1'],home_fit:['umsh_home_fit_step2_payload_v1','umsh_home_fit_input_payload_v1']};
  var rawFetch = global.fetch.bind(global);
  var authorized = null;
  var rememberedId = '';
  var headerCache = null;
  var ownerId = '';
  var ownerEpoch = 0;
  var pollTimer = null;
  var resuming = new Set();
  var booting = false;
  var ALIASES = {cmdg:'saju_master',home_pungsu:'home_fit',home:'home_fit',love_thisyear:'love_this_year',love_signal:'couple_signal',today:'today_fortune'};
  function canonical(value) { return ALIASES[value] || value; }
  function identity(payload) { return payload && (payload.resultId || payload.publicId || payload.reportId || (payload.report && (payload.report.resultId || payload.report.publicId || payload.report.reportId))) || ''; }
  function locationId() { var query = new URLSearchParams(location.search); return query.get('reportId') || query.get('resultId') || ''; }
  function reportUrl(id, orderId) { return '/api/report/' + encodeURIComponent(id) + (orderId ? '?orderId=' + encodeURIComponent(orderId) : ''); }
  function isOutputPage() { return /(?:04-step|05-step|06-step)/.test(location.pathname) || /^\/r\//.test(location.pathname) || Boolean(locationId()); }
  function isDetailPage() { return /(?:05-step|06-step)/.test(location.pathname); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function remember(payload) {
    var id = identity(payload);
    if (!id) return;
    rememberedId = id;
    if(ownerId && key) { try {sessionStorage.setItem('umsh:report-identity:'+ownerId+':'+key,id);} catch(_) {} }
    var url = new URL(location.href);
    url.searchParams.set('reportId', id);
    if(payload.todayFortune) {
      url.searchParams.delete('start');
      if(/^\/cmdg(?:\/|$)/.test(url.pathname)) {url.searchParams.set('entry','today');url.hash='todayResult';}
      else if(/^\/today\/free(?:\/|$)/.test(url.pathname)) url.hash='';
    }
    url.searchParams.delete('paid');
    url.searchParams.delete('orderId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function setOwner(id) {
    var next=String(id || '');
    if(next!==ownerId) {
      ownerEpoch+=1;
      if(ownerId) {
        authorized=null;rememberedId='';headerCache=null;
        if(document.getElementById('umsh-verified-reading')) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
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
    Array.from(document.body.children || []).forEach(function (item) { if (!['SCRIPT','STYLE','LINK'].includes(item.tagName) && !item.hasAttribute('data-umsh-service-bottom')) { item.hidden = true; item.style.setProperty('display','none','important'); } });
    layout.appendChild(node);
    document.body.appendChild(layout);
    document.documentElement.setAttribute('data-umsh-verified-reader','');
    var css=document.createElement('link');css.rel='stylesheet';css.href='/css/umsh-verified-reader.css';css.addEventListener('load',mountChrome);document.head.appendChild(css);
    function mountChrome() { if(global.UMSHChrome)global.UMSHChrome.mount({root:'#umsh-verified-layout',service:key==='today_fortune'?'오늘운':'저장된 해석',category:'흐름'}); }
    if(global.UMSHChrome) mountChrome();
    else if(!document.querySelector('script[src="/js/umsh-chrome.js"]')) {var script=document.createElement('script');script.src='/js/umsh-chrome.js';script.addEventListener('load',mountChrome);document.head.appendChild(script);}
    return node;
  }
  function navigation() { return '<nav aria-label="결과 화면 이동" style="display:flex;gap:18px;margin-bottom:22px"><a style="color:#e5bd69" href="/">운명상회 홈</a><a style="color:#e5bd69" href="/orders">내 구매 내역</a></nav>'; }
  function gate(message) {
    authorized = null;
    if (pollTimer) clearTimeout(pollTimer);
    var node = panel();
    node.innerHTML = navigation() + '<h1 style="font-size:24px">저장된 해석 확인</h1><p>' + escapeHtml(message) + '</p><a style="color:#e5bd69" href="/signup?entry=saved-report&returnTo='+encodeURIComponent(location.pathname+location.search)+'#login">로그인</a> · <a href="' + escapeHtml(route ? route[0] : '/') + '">서비스로 돌아가기</a>';
  }
  function showPreview(payload, request) {
    authorized = null;
    var preview = payload.preview || {};
    var insights = (preview.signals || preview.insights || []).filter(function(line){return String(line).trim()!==String(preview.summary || '').trim();});
    var node = panel();
    node.innerHTML = navigation() + '<span style="color:#e5bd69">운명상회 · 내 입력으로 먼저 보는 해석</span><h1 style="font-size:26px">' + escapeHtml(preview.headline || preview.title || '먼저 확인한 방향') + '</h1><p>' + escapeHtml(preview.summary || '') + '</p>' + insights.map(function(line){return '<p>' + escapeHtml(line) + '</p>';}).join('') + '<hr><h2 style="font-size:20px">전체 풀이에서 더 확인할 내용</h2><p>' + escapeHtml(preview.paidValue || '항목별 근거와 생활 장면, 유지할 강점과 확인할 조건을 자세히 풀어드립니다.') + '</p><a id="umsh-preview-checkout" style="display:block;margin-top:20px;padding:12px;text-align:center;background:#e5bd69;color:#171109;border-radius:10px" href="' + escapeHtml(payload.paymentUrl || '/payment?service=' + encodeURIComponent(key || 'cmdg')) + '">전체 해석 열어보기</a><p style="font-size:13px">현재 미리보기는 결제 전 확인할 수 있는 범위입니다. 이미 받은 결과는 고유 주소로 다시 확인할 수 있어요.</p>';
    if (request && global.UMSHPaymentBridge) global.UMSHPaymentBridge.save(key, request, location.pathname + location.search);
  }
  function showReport(payload) {
    var report = payload.report;
    if (!report || !Array.isArray(report.sections)) return;
    var serverKey = canonical((payload.context && payload.context.serviceKey) || report.serviceKey || key);
    if (key && serverKey !== key) { gate('이 서비스의 해석이 아닙니다. 구매 내역에서 해당 결과를 열어 주세요.'); return; }
    authorized = report;
    var selected = new URLSearchParams(location.search).get('section') || '';
    var node = panel();
    var opened = Array.from(node.querySelectorAll('details[open]')).map(function(item){return item.dataset.section;});
    node.innerHTML = navigation() + '<span style="color:#e5bd69">운명상회 · 저장된 전체 해석</span><h1 style="font-size:26px">' + escapeHtml(report.title) + '</h1><p>' + escapeHtml(report.subtitle) + '</p><p style="font-size:13px">이 주소로 다시 열면 같은 해석을 확인합니다.</p>' + report.sections.map(function(section,index) {
      var ready = section.status === 'complete' && typeof section.interpretation === 'string' && section.interpretation.trim();
      var body = ready ? String(section.interpretation).split(/\n\s*\n/).filter(Boolean).map(function(paragraph){return '<p style="white-space:pre-wrap">' + escapeHtml(paragraph) + '</p>';}).join('') : '<p role="status">' + (section.status === 'failed' ? '이 항목을 완성하지 못했습니다. 완료된 항목은 그대로 읽을 수 있습니다.' : '해석을 준비하고 있습니다. 완료되면 이 자리에 전체 내용이 표시됩니다.') + '</p>' + (section.status === 'failed' ? '<button type="button" style="padding:10px 14px;border:1px solid #6b522c;background:#211a11;color:#f5ead7;border-radius:8px;cursor:pointer" data-retry-section="'+escapeHtml(section.id)+'">이 항목 다시 준비하기</button>':'');
      var duplicateHook=section.hook && String(section.interpretation || '').replace(/^\[[^\]]+\]\s*/, '').trim().startsWith(section.hook);
      return '<details data-section="' + escapeHtml(section.id) + '" style="border-top:1px solid #6b522c;padding:18px 0"' + ((opened.indexOf(section.id) !== -1 || selected === section.id || selected === section.generationId || (!opened.length && !selected && index===0))?' open':'') + '><summary style="cursor:pointer;font-weight:700">' + escapeHtml(section.category + ' · ' + section.classification) + '</summary>' + (ready && section.hook && !duplicateHook?'<p><strong>'+escapeHtml(section.hook)+'</strong></p>':'') + body + '</details>';
    }).join('');
    var id = identity(payload);
    if (id) node.insertAdjacentHTML('beforeend','<a style="color:#e5bd69" href="/r/'+encodeURIComponent(id)+'">이 해석의 고유 주소 열기</a>');
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
    var fortune=payload.todayFortune || {}, reading=fortune.reading || {};
    var details=reading.details || {}, scores=reading.score || {};
    var totalScore=validTodayScore(scores.total);
    var rows=[['work','일과 활동','01'],['money','돈과 선택','02'],['relationship','관계와 대화','03'],['caution','오늘 챙길 것','04']];
    var node=panel();
    var zodiac=reading.zodiac;
    node.className='umsh-daily-reading';
    node.innerHTML='<header class="daily-heading"><span class="daily-eyebrow">오늘 나한테 들어온 운</span><p class="daily-date">'+escapeHtml(fortune.date && fortune.date.label)+' · '+escapeHtml(fortune.profile && fortune.profile.name)+'</p><div class="daily-heading-row"><h1>'+escapeHtml(reading.title || '오늘의 운세')+'</h1>'+todayScoreBadge(totalScore,'오늘의 운',true)+'</div>'+(totalScore!==null?'<p class="daily-score-caption">100점 기준 · 오늘의 흐름 지표</p>':'')+'<p class="daily-summary">'+escapeHtml(reading.summary)+'</p></header>'+(zodiac?'<section class="daily-zodiac" aria-label="출생연도별 오늘운"><span class="daily-eyebrow">나의 띠별 오늘운 · 출생연도 기준</span><h2>'+escapeHtml(zodiac.title || zodiac.birthYear+'년생 · '+zodiac.animal+'띠')+'</h2><p>'+escapeHtml(zodiac.text)+'</p></section>':'')+'<div class="daily-sections">'+rows.map(function(row){var detail=details[row[0]] || {};var score=validTodayScore(detail.score);if(score===null)score=validTodayScore(scores[row[0]]);return '<section class="daily-card"><span class="daily-index" aria-hidden="true">'+row[2]+'</span><div class="daily-card-heading"><h2>'+row[1]+'</h2>'+todayScoreBadge(score,row[1],false)+'</div><p>'+escapeHtml(detail.text || reading[row[0]])+'</p>'+(detail.opportunity?'<p class="daily-tip"><strong>이렇게 활용하세요</strong> '+escapeHtml(detail.opportunity)+'</p>':'')+(detail.caution?'<p class="daily-tip"><strong>한 가지만 주의하세요</strong> '+escapeHtml(detail.caution)+'</p>':'')+'</section>';}).join('')+'</div><section class="daily-conclusion"><span class="daily-eyebrow">오늘의 결론</span><h2>오늘은 이렇게 움직이세요</h2><p>'+escapeHtml(reading.action)+'</p></section><p class="daily-note">내 사주와 오늘의 일진으로 풀어보는 하루의 방향</p><nav class="daily-links" aria-label="오늘운 다시 보기"><a class="daily-primary-link" href="/today/free?start=1">새 오늘운 확인</a></nav>';
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
    else if (payload.previewOnly) showPreview(payload, request);
    else if (isOutputPage() || /\/(?:love\/(?:mind|again|spouse)|work\/job)(?:\/|$)/.test(location.pathname)) {
      showReport(payload);
      resumePending(payload);
      var pending = payload.report.sections.some(function(section){return !['complete','failed'].includes(section.status);});
      if (pending && !pollTimer) pollTimer = setTimeout(function(){pollTimer=null;refresh(identity(payload)).catch(function(){});},1800);
    }
    return payload;
  }
  async function resumeSection(reportId,sectionId,retry) {
    if(resuming.has(sectionId) || resuming.size>=2)return;
    resuming.add(sectionId);
    try {
      await rawFetch('/api/report/section',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},headerCache || {}),body:JSON.stringify({reportId:reportId,sectionId:sectionId,...(retry ? {retry:true}:{})})});
    } finally {resuming.delete(sectionId);}
  }
  function resumePending(payload) {
    if(!headerCache || !payload.report)return;
    var id=payload.reportId || payload.report.reportId || identity(payload);
    payload.report.sections.filter(function(section){return !resuming.has(section.id) && (section.status==='pending' || section.status==='generating');}).slice(0,Math.max(0,2-resuming.size)).forEach(function(section){resumeSection(id,section.id).catch(function(){});});
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
    else if (!explicitPaid && !daily) {
      if (isDetailPage()) return new Response(JSON.stringify({error:'저장된 해석 주소가 없습니다. 구매 내역에서 결과를 열어 주세요.',code:'REPORT_REQUIRED'}),{status:404,headers:{'Content-Type':'application/json'}});
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
    if (booting || !key || !isOutputPage()) return;
    var id=locationId() || rememberedId;
    booting=true;
    panel().innerHTML='<p role="status">저장된 해석과 열람 권한을 확인하고 있습니다.</p>';
    try {
      var config=await rawFetch('/api/auth/config').then(function(r){return r.json();});
      if(config.developmentReportAccess===true) {headerCache={};if(id)await refresh(id);return;}
      if (!config.enabled || !global.supabase || !global.UMSHAuthSession) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      var client=global.UMSHAuthSession.createClient(global.supabase,config.url,config.publishableKey);
      var result=await client.auth.getSession();
      var session=await global.UMSHAuthSession.enforceDeviceAuthSession(result.data.session,client);
      if (!session || !session.access_token) throw new Error('로그인 후 같은 계정의 해석을 확인해 주세요.');
      setOwner(session.user && session.user.id);
      headerCache={Authorization:'Bearer '+session.access_token};
      client.auth.onAuthStateChange(function(event,nextSession){
        setOwner(nextSession && nextSession.user && nextSession.user.id);
        if(event==='SIGNED_OUT' || !nextSession || nextSession.user.id!==session.user.id) gate('계정이 변경되었습니다. 새 계정의 구매 내역에서 결과를 열어 주세요.');
        else if(nextSession.access_token) headerCache={Authorization:'Bearer '+nextSession.access_token};
      });
      id=locationId() || rememberedId;
      if(id) await refresh(id);
      else if(!authorized) gate(isDetailPage() ? '저장된 해석 주소가 없습니다. 구매 내역에서 결과를 열어 주세요.' : '입력한 내용을 확인하고 있습니다. 입력이 아직 없다면 서비스로 돌아가 사주와 현재 상황을 알려 주세요.');
    } catch(error) {gate(error.message || '저장된 해석을 불러오지 못했습니다.');}
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
  global.UMSHReportAccess={fetch:reportFetch,consume:consume,remember:remember,setOwner:setOwner,ownerEpoch:function(){return ownerEpoch;},firstInsight:firstInsight,showPreview:showPreview,showReport:showReport,verifiedReport:function(){return authorized;},identity:identity};
  if (typeof document !== 'undefined') {
    if(key && isOutputPage() && document.documentElement && document.head) {
      document.documentElement.setAttribute('data-umsh-report-check','');
      var guard=document.createElement('style');
      guard.textContent='html[data-umsh-report-check] body > :not(#umsh-verified-layout):not([data-umsh-service-bottom]):not(.umsh-service-toast):not(script):not(style):not(link){display:none!important}';
      document.head.appendChild(guard);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
    document.addEventListener('click',function(event){var link=event.target.closest && event.target.closest('a[href]');if(!link || !rememberedId)return;var url=new URL(link.href,location.origin);if(url.origin===location.origin && route && url.pathname.indexOf(route[0])===0 && /(?:04-step|05-step|06-step)/.test(url.pathname)){url.searchParams.set('reportId',rememberedId);link.href=url.pathname+url.search+url.hash;}},true);
    document.addEventListener('click',function(event){var button=event.target.closest && event.target.closest('[data-retry-section]');if(!button || !authorized)return;button.disabled=true;resumeSection(authorized.reportId || rememberedId,button.dataset.retrySection,true).then(function(){return refresh(rememberedId);}).catch(function(){button.disabled=false;});});
  }
})(typeof window!=='undefined'?window:globalThis);
