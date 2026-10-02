(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('coupons-app')) return;
  const form = $('coupon-form'), input = $('coupon-code'), submit = $('coupon-submit'), list = $('coupon-list'), state = $('coupon-state'), message = $('coupon-message'), login = $('coupon-login');
  let config, client, owner, generation = 0, busy = false, ready = false;
  login.href = window.UMSHCommonAuth?.commonLoginUrl('my', '/coupons.html') || '/signup?entry=my&returnTo=%2Fcoupons.html#login';
  function revoke() { generation++; ready = false; busy = false; list.replaceChildren(); input.value = ''; input.disabled = submit.disabled = true; message.textContent = ''; state.textContent = '회원 정보가 변경되었어요. 다시 로그인한 뒤 쿠폰을 확인해 주세요.'; login.hidden = false; }
  function errorText(error) {
    if (error.status === 401 || error.code === 'AUTH_REQUIRED') return '로그인한 뒤 쿠폰을 등록하고 확인할 수 있어요.';
    if (/ALREADY|DUPLICATE/.test(error.code || '')) return '이미 등록한 쿠폰이에요. 보유 쿠폰을 확인해 주세요.';
    if (/EXPIRED/.test(error.code || '')) return '사용 기간이 지난 쿠폰이에요.';
    if (/LIMIT|EXHAUSTED/.test(error.code || '')) return '등록 가능한 수량이 모두 소진되었어요.';
    if (/NOT_FOUND|INVALID|DISABLED|INACTIVE|NOT_STARTED/.test(error.code || '')) return '코드 또는 사용 기간을 확인해 주세요. 현재 등록할 수 없는 쿠폰이에요.';
    return '쿠폰을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
  async function api(path, payload) {
    const version = generation;
    if (!config) { const r = await fetch('/api/auth/config', { cache: 'no-store' }); if (!r.ok) throw new Error(); config = await r.json(); }
    if (!config.enabled || !window.UMSHAuthSession || !window.supabase) throw new Error();
    const live = await window.UMSHAuthSession.resolveLiveSession(config, 1200);
    if (version !== generation) throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
    if (!live?.session?.access_token) throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
    if (owner && owner !== live.session.user.id) { revoke(); throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' }); }
    owner = live.session.user.id;
    if (client !== live.client) { client = live.client; client.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT' || (session?.user?.id && owner !== session.user.id)) revoke(); }); }
    const r = await fetch('/api/coupons' + path, { method: payload ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: 'Bearer ' + live.session.access_token, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    const data = await r.json().catch(() => ({}));
    if (version !== generation) throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
    if (!r.ok) throw Object.assign(new Error(), { code: data.code, status: r.status });
    return data;
  }
  function node(tag, text, cls) { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; }
  function safePath(value) { return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value) ? value : '/'; }
  function render(items, products) {
    list.replaceChildren();
    state.textContent = items.length ? '쿠폰별 사용 기간과 적용 서비스를 확인해 주세요.' : '아직 등록한 쿠폰이 없어요. 받은 코드가 있다면 위에서 등록해 주세요.';
    items.forEach((item) => {
      const product = products.find((p) => p.key === item.productKey);
      const used = item.status === 'used' || !!item.reportId || (item.kind === 'consultation_questions' && item.remaining === 0);
      const reserved = !used && (item.status === 'reserved' || !!item.orderId);
      const expired = new Date(item.expiresAt).getTime() <= Date.now();
      const future = item.startsAt && new Date(item.startsAt).getTime() > Date.now();
      const status = used ? 'used' : reserved ? 'reserved' : item.enabled === false ? 'disabled' : expired ? 'expired' : future ? 'scheduled' : 'usable';
      const labels = { used: '사용 완료', reserved: '주문 적용 중', disabled: '사용 중단', expired: '기간 만료', scheduled: '사용 전', usable: '사용 가능' };
      const card = node('article', '', 'coupon'); card.dataset.state = status;
      const top = node('div', '', 'coupon-top'); top.append(node('h3', item.title), node('span', labels[status], 'coupon-badge')); card.append(top);
      const benefit = item.kind === 'service_free' ? '무료 이용권' : item.kind === 'consultation_questions' ? '상담 질문 ' + item.value + '회' : item.kind === 'percent_off' ? item.value + '% 할인' : Number(item.value).toLocaleString('ko-KR') + '원 할인';
      card.append(node('p', benefit, 'coupon-benefit'));
      const date = new Date(item.expiresAt); card.append(node('p', (product?.title || item.productKey) + ' · ' + (Number.isNaN(date.getTime()) ? '기간 확인 필요' : date.toLocaleString('ko-KR') + '까지'), 'coupon-meta'));
      if (item.kind === 'consultation_questions' && Number.isInteger(item.remaining)) card.append(node('p', '남은 질문 ' + item.remaining + '회', 'coupon-meta'));
      let href, label;
      if (used && item.reportId) { href = '/r/' + encodeURIComponent(item.reportId); label = '풀이 다시 읽기'; }
      else if (reserved) {
        card.append(node('p', '이 쿠폰은 기존 주문에 적용되어 있어요. 결제 실패 시 고객 지원에 문의해 주세요.', 'coupon-meta'));
        if (item.orderStatus === 'ready') {
          href = '/payment?product=' + encodeURIComponent(item.productKey) + '&couponId=' + encodeURIComponent(item.id) + (item.orderReportId ? '&reportId=' + encodeURIComponent(item.orderReportId) : '');
          label = '기존 주문 결제 이어가기';
        }
      }
      else if (status === 'usable') {
        if (item.kind === 'consultation_questions') { href = '/consultation/'; label = '천명상담 시작'; }
        else if (item.productKey === 'cheonmyeong_consultation') { href = '/payment?product=' + encodeURIComponent(item.productKey) + '&couponId=' + encodeURIComponent(item.id); label = '질문권 결제에 적용'; }
        else { href = safePath(product?.returnPath); label = '서비스 시작하기'; }
      }
      if (href) { const a = node('a', label, 'coupon-action'); a.href = href; card.append(a); }
      list.append(card);
    });
  }
  async function load() {
    if (busy) return;
    busy = true; const version = generation; $('coupon-refresh').disabled = true; submit.disabled = true; state.textContent = '쿠폰을 확인하고 있어요.';
    try { const data = await api(''); if (version !== generation) return; if (!Array.isArray(data.items) || !Array.isArray(data.products)) throw new Error(); render(data.items, data.products); ready = true; login.hidden = true; }
    catch (error) { if (version !== generation) return; ready = false; list.replaceChildren(); state.textContent = errorText(error); login.hidden = !(error.status === 401 || error.code === 'AUTH_REQUIRED'); }
    finally { if (version === generation) { busy = false; input.disabled = submit.disabled = !ready; } $('coupon-refresh').disabled = false; }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (busy || !ready || !input.value.trim()) return;
    const version = generation; busy = true; submit.disabled = input.disabled = true; message.textContent = '쿠폰을 등록하고 있어요.';
    try { await api('/claim', { code: input.value.trim() }); if (version !== generation) return; input.value = ''; message.textContent = '쿠폰이 등록되었어요. 보유 쿠폰에서 혜택을 확인해 주세요.'; busy = false; await load(); }
    catch (error) { if (version !== generation) return; message.textContent = errorText(error); if (error.status === 401 || error.code === 'AUTH_REQUIRED') { ready = false; list.replaceChildren(); login.hidden = false; } }
    finally { if (version === generation) { busy = false; input.disabled = submit.disabled = !ready; } }
  });
  $('coupon-refresh').addEventListener('click', load);
  void load();
})();
