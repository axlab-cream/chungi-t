(function (global) {
  'use strict';
  var active = null;
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function styles() {
    if (document.getElementById('cmdg-reader-tools-style')) return;
    var link = document.createElement('link');
    link.id = 'cmdg-reader-tools-style'; link.rel = 'stylesheet'; link.href = '/css/umsh-cmdg-reader-tools.css?v=20260930c'; document.head.appendChild(link);
  }
  function answerHtml(reply, richText) {
    if (!reply) return '';
    return '<section class="cmdg-personal-answer" aria-label="내 질문에 이어지는 풀이"><p class="cmdg-question-echo">' + esc(reply.input) + '</p>'
      + [['answer','지금의 답'],['basis',reply.sectionId === 'ziwei' ? '내 자미두수 명반에서 읽히는 이유' : '내 사주에서 읽히는 이유'],['turn','놓치기 쉬운 조건'],['action','이제 할 일']].map(function (part) {
        return '<section class="reading-block cmdg-beat cmdg-beat-' + part[0] + '"><h4>' + part[1] + '</h4>' + richText(String(reply.answer[part[0]] || '').replace(/^\s*(?:#{1,6}\s*)?(?:지금의 답|내 사주에서 읽히는 이유|내 자미두수 명반에서 읽히는 이유|달라지는 조건|놓치기 쉬운 조건|내가 할 일|이제 할 일)\s*(?:\r?\n)+/, '')) + '</section>';
      }).join('') + '<p class="cmdg-next-question"><strong>이어서 생각할 질문</strong><br>' + esc(reply.answer.question) + '</p></section>';
  }
  function historyHtml(state, sectionId) {
    var replies = state.replies.filter(function(r){return r.sectionId === sectionId;});
    if (!replies.length) return '<p class="cmdg-history-empty">추가로 물어본 내용은 이 장과 보관함에 함께 남습니다.</p>';
    return '<section class="cmdg-question-history"><h4>추가 풀이 이력 ' + replies.length + '개</h4>' + replies.map(function(r,i){
      var date = new Date(r.createdAt), at = isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR');
      return '<details class="cmdg-history-entry" id="reader-reply-' + esc(r.id) + '"' + (state.openReplyId === r.id ? ' open' : '') + '><summary><strong>' + (i+1) + '번째 질문 · ' + esc(at) + '</strong><span>' + esc(r.input) + '</span></summary>' + answerHtml(r,state.richText) + '</details>';
    }).join('') + '</section>';
  }
  function updateUsage(host,state,sectionId) {
    var used=state.replies.filter(function(r){return r.sectionId===sectionId;}).length, limit=state.sectionLimit || 2;
    host.querySelector('[data-reader-usage]').textContent='이 장 추가 풀이 '+used+'/'+limit+'회 · '+Math.max(0,limit-used)+'회 남음';
    host.querySelector('form button').disabled=used>=limit;
    host.querySelector('form textarea').disabled=used>=limit;
  }
  async function json(state, path, options) {
    var response = await state.api(state.base + path, options);
    var data = await response.json();
    if (!state.valid() || active !== state) throw new Error('계정 또는 리포트가 바뀌었습니다. 다시 열어 주세요.');
    if (!response.ok) throw new Error(data.error || '요청을 완료하지 못했습니다.');
    return data;
  }
  function paint(state) {
    if (!state.loaded || !state.valid() || active !== state) return;
    if (state.ziwei && !document.getElementById('cmdg-ziwei-chapter')) {
      var previousHost = document.querySelector('[data-cmdg-reader-tools]');
      var previousCard = previousHost && previousHost.closest('.reading-card');
      if (previousCard && previousCard.parentNode) {
        var chapter = document.createElement('details'); chapter.id = 'cmdg-ziwei-chapter'; chapter.className = 'reading-card'; chapter.dataset.section = 'ziwei'; chapter.open = Boolean(state.ziweiOpen || new URLSearchParams(location.search).get('section') === 'ziwei'); chapter.addEventListener('toggle', function () { state.ziweiOpen = chapter.open; });
        chapter.innerHTML = '<summary>자미두수 · 나의 성향과 삶의 역할</summary><div class="cmdg-ziwei-body">' + (state.ziwei.available ? '<p>나의 성향, 일과 돈, 가까운 관계를 열두 영역으로 나눠 봅니다.</p><div class="cmdg-ziwei-grid">' + state.ziwei.palaces.map(function (p) { return '<section><h4>' + esc(p.label) + (p.body ? ' · 행동의 중심' : '') + '</h4><p>' + esc(p.name + ' · ' + p.branch) + '</p><strong>' + esc(p.stars.map(function (s) { return s.name; }).join(' · ') || '주성 없음') + '</strong>' + p.transformations.map(function (t) { return '<p>' + esc(t.star + ' · ' + t.meaning) + '</p>'; }).join('') + '</section>'; }).join('') + '</div><p class="cmdg-ziwei-note">' + esc(state.ziwei.convention) + '</p><div data-cmdg-reader-tools="ziwei"></div>' : '<p>' + esc(state.ziwei.reason) + '</p>') + '</div>';
        var cards = previousCard.parentNode.querySelectorAll('.reading-card'); var last = cards[cards.length - 1]; last.insertAdjacentElement('afterend', chapter);
        if (state.ziwei.available && !state.drafts.ziwei) state.drafts.ziwei = state.concern || '나의 성향과 일·돈·관계에서 반복되는 어려움, 지금 바꿀 수 있는 행동을 자미두수 명반으로 풀어 주세요.';
      }
    }
    document.querySelectorAll('[data-cmdg-reader-tools]').forEach(function (host) {
      var sectionId = host.getAttribute('data-cmdg-reader-tools');
      if (host.dataset.bound === state.key) return;
      host.dataset.bound = state.key;
      var reply = state.replies.filter(function (r) { return r.sectionId === sectionId; }).slice(-1)[0];
      host.innerHTML = '<div class="cmdg-saved-answer">' + historyHtml(state, sectionId) + '</div><p class="cmdg-reader-usage" data-reader-usage></p><a class="cmdg-history-vault-link" href="/vault?tab=history">보관함에서 이력 보기</a>'
        + '<form class="cmdg-question-form"><label>' + (sectionId === 'ziwei' ? '자미두수로 더 깊이 풀어볼 나의 고민' : '이 장에서 내 상황을 더 자세히 묻기') + '<textarea name="question" maxlength="800" required placeholder="반복되는 상황과 가장 알고 싶은 것을 적어 주세요.">' + esc(state.drafts[sectionId]) + '</textarea></label><small>질문과 답변은 이 리포트에 저장됩니다.</small><button type="submit">' + (sectionId === 'ziwei' ? '나의 자미두수 풀이 보기' : '내 고민에 맞춰 더 풀어보기') + '</button><p role="status" aria-live="polite"></p></form>'
        + (sectionId === 'destiny-partner' ? '<section class="cmdg-sketch"><h4>나에게 편안한 인연, 어떤 분위기일까요?</h4><p>사주 풀이의 관계 분위기를 한국인 성인 인물의 상상 스케치로 표현합니다. 미래 애인의 실제 외모를 예측한 그림은 아닙니다.</p><label>그림 속 인물 표현<select aria-label="그림 속 인물 표현"><option value="neutral">특정 성별 없이</option><option value="woman">여성으로</option><option value="man">남성으로</option></select></label><button type="button" data-sketch-load>인연 이미지 불러오기</button><p data-sketch-status role="status" aria-live="polite"></p><div data-sketch-image></div><small>처음 누르면 이미지를 만들고, 이후에는 저장된 그림을 불러옵니다.</small></section>' : '');
      var form = host.querySelector('form'), textarea = form.querySelector('textarea'), button = form.querySelector('button'), status = form.querySelector('[role=status]');
      updateUsage(host,state,sectionId);
      textarea.addEventListener('input', function () { state.drafts[sectionId] = textarea.value; });
      form.addEventListener('submit', async function (event) {
        event.preventDefault(); if (button.disabled) return;
        button.disabled = true; status.textContent = '사주와 질문을 함께 살펴 답변을 준비하고 있습니다…';
        try {
          var data = await json(state, '/question', { method: 'POST', body: JSON.stringify({ sectionId: sectionId, question: textarea.value }) });
          state.replies = state.replies.filter(function(r){return r.id!==data.reply.id;}).concat(data.reply); state.openReplyId=data.reply.id;
          host.querySelector('.cmdg-saved-answer').innerHTML = historyHtml(state,sectionId); updateUsage(host,state,sectionId);
          status.textContent = '이 장에 답변을 저장했습니다.';
        } catch (error) { if (state.valid()) status.textContent = error.message; }
        finally { updateUsage(host,state,sectionId); }
      });
      var sketchButton = host.querySelector('[data-sketch-load]');
      if (sketchButton) sketchButton.addEventListener('click', async function () {
        if (sketchButton.disabled) return;
        sketchButton.disabled = true;
        var note = host.querySelector('[data-sketch-status]'); note.textContent = state.hasSketch ? '저장된 그림을 불러옵니다…' : '인연의 분위기를 스케치하고 있습니다. 잠시만 기다려 주세요…';
        try {
          if (!state.hasSketch) { await json(state, '/sketch', { method: 'POST', body: JSON.stringify({ presentation: host.querySelector('select').value }) }); state.hasSketch = true; }
          var response = await state.api(state.base + '/sketch');
          if (!response.ok) throw new Error('이미지를 불러오지 못했습니다. 다시 눌러 주세요.');
          var blob = await response.blob();
          if (!state.valid() || active !== state) return;
          if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
          state.imageUrl = URL.createObjectURL(blob);
          var img = document.createElement('img'); img.src = state.imageUrl; img.alt = '개인 사주 풀이에서 영감을 받은 가상의 한국인 성인 인연 스케치';
          host.querySelector('[data-sketch-image]').replaceChildren(img);
          note.textContent = '저장된 나의 인연 분위기 스케치';
        } catch (error) { if (state.valid()) note.textContent = error.message; }
        finally { sketchButton.disabled = false; }
      });
    });
    if (state.openReplyId && !state.historyFocused) { var target=document.getElementById('reader-reply-'+state.openReplyId); if(target){ var card=target.closest('.reading-card');if(card)card.open=true;target.open=true;target.scrollIntoView({block:'start'});state.historyFocused=true;} }
  }
  global.UMSHCmdgReaderTools = {
    mount: function (payload, api, richText, valid) {
      styles();
      var id = payload.reportId || payload.report.reportId || payload.report.publicId;
      if (!id) return;
      if (active && active.id === id && active.valid()) { active.api = api; paint(active); return; }
      if (active && active.imageUrl) URL.revokeObjectURL(active.imageUrl);
      var oldChapter = document.getElementById('cmdg-ziwei-chapter'); if (oldChapter) oldChapter.remove();
      var state = active = { id: id, key: id + '-' + Date.now(), base: '/api/report/' + encodeURIComponent(id) + '/reader', api: api, richText: richText, valid: valid, replies: [], drafts: {}, concern: payload.context && payload.context.concern, hasSketch: false, sectionLimit: 2, openReplyId: new URLSearchParams(location.search).get('readerReply') || '' };
      json(state, '', {}).then(function (data) { state.replies = data.replies || []; state.hasSketch = data.hasSketch; state.sectionLimit = data.sectionLimit || 2; state.ziwei = data.ziwei; state.loaded = true; paint(state); }).catch(function () {
        if (active === state && state.valid()) document.querySelectorAll('[data-cmdg-reader-tools]').forEach(function (host) { host.textContent = '추가 풀이를 불러오지 못했습니다. 잠시 후 페이지를 다시 열어 주세요.'; });
      });
    },
    reset: function () { if (active && active.imageUrl) URL.revokeObjectURL(active.imageUrl); active = null; var chapter = document.getElementById('cmdg-ziwei-chapter'); if(chapter) chapter.remove(); document.querySelectorAll('[data-cmdg-reader-tools]').forEach(function (host) { host.replaceChildren(); delete host.dataset.bound; }); },
  };
})(window);
