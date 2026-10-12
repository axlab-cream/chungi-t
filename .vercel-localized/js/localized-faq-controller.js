/* Same FAQ selectors/filtering flow as faq-knowledge.js; explicit locale copy only. */
(() => {
  const payload = document.querySelector('#faq-locale-data');
  const form = document.querySelector('[data-faq-search]');
  if (!payload || !form || payload.getAttribute('type') !== 'application/json') return;
  let config;
  try { config = JSON.parse(payload.textContent); } catch { return; }
  if (!config || !['ko', 'en', 'ja'].includes(config.locale) ||
      payload.getAttribute('data-faq-locale') !== config.locale ||
      document.documentElement.lang !== config.locale) return;
  const copy = config.frameCopy;
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) return;
  const validText = value => typeof value === 'string' && value.trim().length > 0 &&
    value.length <= 1000 && !/[<>\u0000-\u001f]/u.test(value) &&
    (config.locale === 'ko' || !/[가-힣]/u.test(value));
  const keys = ['statusIdle', 'statusResults', 'search', 'reset', 'searchLabel',
    'quickSearch', 'emptyTitle', 'emptyBody', 'all'];
  if (!keys.every(key => validText(copy[key])) || !Array.isArray(copy.suggestions) ||
      copy.suggestions.length < 1 || copy.suggestions.length > 12 ||
      !copy.suggestions.every(validText)) return;
  const placeholders = text => (text.match(/\{[^{}]*\}/g) || []).sort().join(',');
  if (placeholders(copy.statusIdle) !== '{count}' ||
      placeholders(copy.statusResults) !== '{count},{query}' ||
      /[{}]/.test(copy.statusIdle.replace('{count}', '')) ||
      /[{}]/.test(copy.statusResults.replace('{count}', '').replace('{query}', ''))) return;
  const input = form.querySelector('input');
  const reset = form.querySelector('[data-search-reset]');
  const status = document.querySelector('[data-search-status]');
  const empty = document.querySelector('[data-search-empty]');
  const suggestions = document.querySelector('[data-suggestions]');
  const buttons = Array.from(document.querySelectorAll('[data-query]'));
  if (!input || !reset || !status || !empty || (suggestions && buttons.length !== copy.suggestions.length)) return;
  const entries = Array.from(document.querySelectorAll('[data-faq-entry]'));
  const groups = Array.from(document.querySelectorAll('[data-faq-group]'));
  // NFKC handles full-width text. Accent-insensitive matching keeps every Unicode letter/number.
  const normalize = value => String(value).normalize('NFKC').toLowerCase().normalize('NFD')
    .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
  const indexed = entries.map(el => ({ el, text: normalize(el.dataset.search || el.textContent) }));
  const format = (template, values) => template.replace(/\{(count|query)\}/g, (_, key) => String(values[key]));
  // Preserve the user's raw Unicode text. Never translate it or send it anywhere.
  const limit = value => Array.from(String(value)).slice(0, 120).join('');
  const text = (element, value) => { if (element) element.textContent = value; };
  text(form.querySelector('label[for="faq-query"]'), copy.searchLabel);
  text(form.querySelector('button[type="submit"]'), copy.search);
  text(reset, copy.reset);
  text(empty.querySelector('h2'), copy.emptyTitle);
  text(empty.querySelector('p'), copy.emptyBody);
  text(empty.querySelector('a'), copy.all);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  if (suggestions) {
    suggestions.setAttribute('aria-label', copy.quickSearch);
    buttons.forEach((button, i) => {
      button.dataset.query = copy.suggestions[i];
      button.textContent = copy.suggestions[i];
    });
    suggestions.hidden = false;
  }
  let timer;
  function search(updateUrl = true) {
    const value = limit(input.value);
    input.value = value;
    const tokens = value.trim().split(/\s+/u).map(normalize).filter(Boolean);
    let found = 0;
    for (const { el, text: indexedText } of indexed) {
      el.hidden = !tokens.every(token => indexedText.includes(token));
      if (!el.hidden) found++;
    }
    for (const group of groups) group.hidden = !Array.from(group.querySelectorAll('[data-faq-entry]')).some(el => !el.hidden);
    empty.hidden = found !== 0;
    reset.hidden = !value;
    status.textContent = format(value ? copy.statusResults : copy.statusIdle, { query: value, count: value ? found : entries.length });
    if (updateUrl) {
      const url = new URL(location.href);
      if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 120); });
  reset.addEventListener('click', () => { clearTimeout(timer); input.value = ''; search(); input.focus(); });
  buttons.forEach(button => button.addEventListener('click', () => {
    clearTimeout(timer); input.value = button.dataset.query; search(); input.focus();
  }));
  function openHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target?.matches('details.knowledge-answer')) {
      if (target.hidden) { clearTimeout(timer); input.value = ''; search(); }
      target.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  }
  input.value = limit(new URLSearchParams(location.search).get('q') || '');
  search(false); openHash();
  window.addEventListener('hashchange', openHash);
  window.addEventListener('popstate', () => {
    clearTimeout(timer); input.value = limit(new URLSearchParams(location.search).get('q') || '');
    search(false); openHash();
  });
})();
