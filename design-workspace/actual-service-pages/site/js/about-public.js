(() => {
  const root = document.querySelector('.service-gallery');
  const cards = Array.from(root.querySelectorAll('[data-service-pick]'));
  const panels = Array.from(root.querySelectorAll('.service-detail'));
  const rail = root.querySelector('.poster-rail');
  const status = root.querySelector('[data-selection-status]');
  let selected = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function select(index, scroll) {
    selected = (index + cards.length) % cards.length;
    const card = cards[selected];
    cards.forEach((item, i) => {
      item.classList.toggle('is-pick', i === selected);
      if (i === selected) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    panels.forEach(panel => {
      const active = panel.id === 'service-' + card.dataset.servicePick;
      panel.classList.toggle('is-selected', active);
      panel.open = active;
    });
    status.textContent = (selected + 1) + ' / ' + cards.length + ' · ' + card.querySelector('strong').textContent;
    if (scroll) rail.scrollTo({ left: card.offsetLeft - 16, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  // Every answer is present in HTML. Without JS, all native details remain available.
  root.querySelector('.service-details').classList.add('is-enhanced');
  cards.forEach((card, index) => card.addEventListener('click', event => {
    event.preventDefault();
    select(index, true);
    history.replaceState(null, '', card.getAttribute('href'));
  }));
  root.querySelector('[data-rail-prev]').addEventListener('click', () => select(selected - 1, true));
  root.querySelector('[data-rail-next]').addEventListener('click', () => select(selected + 1, true));
  function fromHash() {
    const index = cards.findIndex(card => card.getAttribute('href') === location.hash);
    if (index >= 0) select(index, true);
    else select(0, false);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  const video = document.querySelector('[data-brand-video]');
  const button = document.querySelector('[data-video-toggle]');
  if (!video || !button) return;
  button.hidden = false;
  let userPaused = false;
  let visible = false;
  let userStarted = false;
  function label() { button.textContent = video.paused ? '영상 재생' : '영상 일시정지'; }
  async function sync() {
    if (!visible || document.hidden || userPaused || (reduced.matches && !userStarted)) { video.pause(); label(); return; }
    try { await video.play(); } catch { /* Poster remains visible when autoplay is blocked. */ }
    label();
  }
  button.addEventListener('click', () => {
    if (video.paused) { userPaused = false; userStarted = true; sync(); }
    else { userPaused = true; video.pause(); label(); }
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  video.addEventListener('error', () => { button.hidden = true; });
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .2 });
  observer.observe(video);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { userStarted = false; sync(); });
})();
