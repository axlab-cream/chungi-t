async (page) => {
  const SERVICE_URL = {
    today: (id) => `https://umsh.kr/today/free/04-step-4-teaser/?reportId=${id}`,
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
  const catalog = await page.evaluate(async () => {
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
    const reports = await fetch('/api/user/reports', {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }).then((r) => r.json());
    const by = {};
    for (const r of reports.reports || []) {
      const key = r.serviceKey || r.productKey || (r.context && r.context.serviceKey) || 'unknown';
      if (!by[key]) by[key] = { id: r.reportId || r.id, serviceKey: key };
    }
    return Object.values(by);
  });

  async function pagePdfState() {
    return page.evaluate(() => {
      const b = document.querySelector('#btn-pdf, [data-report-pdf], #pdf-button');
      return {
        title: document.title,
        text: (document.body.innerText || '').slice(0, 240),
        hasPdfBtn: Boolean(b),
        pdfDisabled: b ? b.disabled : null,
        href: location.href,
      };
    });
  }

  const results = [];
  for (const item of catalog) {
    const urlFn = SERVICE_URL[item.serviceKey] || ((id) => `https://umsh.kr/r/${id}`);
    let url = urlFn(item.id);
    const row = { serviceKey: item.serviceKey, id: item.id, url, ok: false, stage: '', detail: '' };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2500);
      row.page = await pagePdfState();
      if (!row.page.hasPdfBtn && !url.includes('/r/')) {
        url = `https://umsh.kr/r/${item.id}`;
        row.url = url;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        row.page = await pagePdfState();
      }
      if (!row.page.hasPdfBtn) {
        row.stage = 'no-pdf-button';
        row.detail = row.page.text.slice(0, 140);
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
        const btn = document.querySelector('#btn-pdf, [data-report-pdf], #pdf-button');
        btn.click();
        const start = Date.now();
        while (Date.now() - start < 90000) {
          await new Promise((r) => setTimeout(r, 1000));
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
              if (h.length > 2000) {
                try {
                  w.close();
                } catch (_) {}
                return { ok: true, chars: h.length, snippet: t.slice(0, 160) };
              }
            } catch (_) {}
          }
          const body = document.body.innerText || '';
          const m = body.match(/PDF[^\n]{0,120}|팝업[^\n]{0,80}/);
          if (/PDF 준비 중 오류|PDF용 풀이 생성에 실패|팝업이 차단/.test(body)) {
            return { ok: false, error: (m && m[0]) || 'pdf-error' };
          }
        }
        for (const w of opened) {
          try {
            w.close();
          } catch (_) {}
        }
        return { ok: false, error: 'timeout waiting PDF window' };
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
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
    },
    results,
  };
}
