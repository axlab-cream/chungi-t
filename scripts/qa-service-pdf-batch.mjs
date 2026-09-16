async (page) => {
  const keys = process.env.QA_KEYS
    ? process.env.QA_KEYS.split(',')
    : ['cmdg', 'saju_master', 'love_this_year', 'money_save'];

  const SERVICE_URL = {
    today: (id) => `https://umsh.kr/r/${id}`,
    cmdg: (id) => `https://umsh.kr/r/${id}`,
    saju_master: (id) => `https://umsh.kr/r/${id}`,
    money_save: (id) => `https://umsh.kr/money/save/05-step-5-chat/chat.html?reportId=${id}`,
    pass_angle: (id) => `https://umsh.kr/me/pass-angle/05-step-5-chat/chat.html?reportId=${id}`,
    newyear_flow: (id) => `https://umsh.kr/flow/newyear/05-step-5-chat/chat.html?reportId=${id}`,
    home_fit: (id) => `https://umsh.kr/place/home/05-step-5-chat/chat.html?reportId=${id}`,
    love_this_year: (id) => `https://umsh.kr/love/this-year/05-step-5-chat/chat.html?reportId=${id}`,
    cat_compatibility: (id) => `https://umsh.kr/match/cat/05-step-5-chat/chat.html?reportId=${id}`,
    couple_signal: (id) => `https://umsh.kr/love/signal/05-step-5-chat/chat.html?reportId=${id}`,
    quit_fortune: (id) => `https://umsh.kr/work/quit/05-step-5-chat/chat.html?reportId=${id}`,
    job_choice: (id) => `https://umsh.kr/work/job-choice/05-step-5-chat/chat.html?reportId=${id}`,
    lucky_color: (id) => `https://umsh.kr/me/lucky/05-step-5-chat/chat.html?reportId=${id}`,
    love_spouse: (id) => `https://umsh.kr/r/${id}`,
    love_again: (id) => `https://umsh.kr/r/${id}`,
    love_mind: (id) => `https://umsh.kr/r/${id}`,
    work_job: (id) => `https://umsh.kr/r/${id}`,
  };

  await page.goto('https://umsh.kr/', { waitUntil: 'domcontentloaded' });
  const catalog = await page.evaluate(async (wanted) => {
    const authCfg = await fetch('/api/auth/config').then((r) => r.json());
    const client = window.supabase.createClient(authCfg.url, authCfg.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: window.localStorage,
      },
    });
    const { data } = await client.auth.getSession();
    if (!data.session) return { error: 'no-session' };
    const reports = await fetch('/api/user/reports', {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }).then((r) => r.json());
    const by = {};
    for (const r of reports.reports || []) {
      const key = r.serviceKey || r.productKey || (r.context && r.context.serviceKey) || 'unknown';
      if (!by[key]) by[key] = { id: r.reportId || r.id, serviceKey: key };
    }
    return wanted.map((k) => by[k]).filter(Boolean);
  }, keys);

  if (catalog.error) return catalog;

  const results = [];
  for (const item of catalog) {
    const urlFn = SERVICE_URL[item.serviceKey] || ((id) => `https://umsh.kr/r/${id}`);
    let url = urlFn(item.id);
    const row = { serviceKey: item.serviceKey, id: item.id, url, ok: false, stage: '', detail: '' };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await page.waitForTimeout(2000);

      let state = await page.evaluate(() => {
        const b = document.querySelector('#btn-pdf, [data-report-pdf], #pdf-button');
        return {
          text: (document.body.innerText || '').slice(0, 220),
          hasPdfBtn: Boolean(b),
          disabled: b ? b.disabled : null,
          href: location.href,
        };
      });

      if (!state.hasPdfBtn) {
        url = `https://umsh.kr/r/${item.id}`;
        row.url = url;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        state = await page.evaluate(() => {
          const b = document.querySelector('#btn-pdf, [data-report-pdf], #pdf-button');
          return {
            text: (document.body.innerText || '').slice(0, 220),
            hasPdfBtn: Boolean(b),
            disabled: b ? b.disabled : null,
            href: location.href,
          };
        });
      }

      row.page = state;
      if (!state.hasPdfBtn) {
        // API reachability fallback
        const api = await page.evaluate(async (id) => {
          const authCfg = await fetch('/api/auth/config').then((r) => r.json());
          const client = window.supabase.createClient(authCfg.url, authCfg.publishableKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: 'pkce',
              storage: window.localStorage,
            },
          });
          const { data } = await client.auth.getSession();
          const res = await fetch('/api/report/' + encodeURIComponent(id), {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          const body = await res.json().catch(() => ({}));
          return {
            status: res.status,
            sections: (body.report && body.report.sections && body.report.sections.length) || body.sections?.length || 0,
            error: body.error || null,
            hasContent: Boolean(body.report || body.sections),
          };
        }, item.id);
        row.api = api;
        row.stage = 'no-pdf-button';
        row.detail = state.text.slice(0, 140);
        row.ok = false;
        results.push(row);
        continue;
      }

      const pdfProbe = await page.evaluate(async () => {
        const opened = [];
        const OrigOpen = window.open.bind(window);
        window.open = function (u, n, f) {
          const w = OrigOpen(u || '', n || '_blank', f);
          opened.push(w);
          return w;
        };
        window.print = function () {};
        document.querySelector('#btn-pdf, [data-report-pdf], #pdf-button').click();
        const start = Date.now();
        while (Date.now() - start < 45000) {
          await new Promise((r) => setTimeout(r, 800));
          for (const w of opened) {
            try {
              if (!w || w.closed || !w.document || !w.document.body) continue;
              const t = w.document.body.innerText || '';
              const h = w.document.documentElement.outerHTML || '';
              if (/준비하는 중|준비하고 있습니다/.test(t)) continue;
              if (/실패|오류|찾지 못했|차단/.test(t)) {
                try {
                  w.close();
                } catch (_) {}
                return { ok: false, error: t.slice(0, 200) };
              }
              if (h.length > 1500) {
                try {
                  w.close();
                } catch (_) {}
                return { ok: true, chars: h.length, snippet: t.slice(0, 120) };
              }
            } catch (_) {}
          }
          const body = document.body.innerText || '';
          if (/PDF 준비 중 오류|PDF용 풀이 생성에 실패|팝업이 차단|PDF로 정리할 사주 리포트를 찾지/.test(body)) {
            return { ok: false, error: body.match(/PDF[^\n]{0,100}|팝업[^\n]{0,60}/)?.[0] || 'pdf-error' };
          }
        }
        for (const w of opened) {
          try {
            w.close();
          } catch (_) {}
        }
        return { ok: false, error: 'timeout' };
      });

      row.ok = Boolean(pdfProbe.ok);
      row.stage = pdfProbe.ok ? 'pdf-ready' : 'pdf-fail';
      row.detail = pdfProbe.ok ? `chars=${pdfProbe.chars}` : pdfProbe.error || '';
      row.snippet = pdfProbe.snippet || null;
    } catch (e) {
      row.stage = 'exception';
      row.detail = String(e && e.message ? e.message : e).slice(0, 200);
    }
    results.push(row);
  }

  return {
    keys,
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
    },
    results,
  };
}
