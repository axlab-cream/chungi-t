(function () {
  'use strict';
  const rail = document.querySelector('.consultation-rail'); if (!rail) return;
  const slides = Array.from(rail.querySelectorAll('[data-rail-slide]'));
  const dots = Array.from(rail.querySelectorAll('[data-slide-to]'));
  const pause = rail.querySelector('[data-rail-pause]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, paused = motion.matches, hovered = false, focused = false, timer, count = slides.length;
  function hideConsultation() { count = 1; render(0); rail.querySelector('.consultation-rail-controls').hidden = true; schedule(); }
  function render(next) {
    index = (next + count) % count;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    dots.forEach((dot, i) => { dot.setAttribute('aria-current', String(i === index)); dot.hidden = i >= count; });
    rail.querySelector('[data-rail-position]').textContent = (index + 1) + ' / ' + count;
  }
  function schedule() {
    clearInterval(timer);
    pause.textContent = motion.matches ? '자동 넘김 꺼짐' : paused ? '자동 넘김 시작' : '자동 넘김 멈춤';
    pause.disabled = motion.matches;
    pause.setAttribute('aria-pressed', String(paused));
    if (count > 1 && !paused && !hovered && !focused && !document.hidden && !motion.matches) timer = setInterval(() => render(index + 1), 6500);
  }
  rail.querySelector('[data-rail-prev]').addEventListener('click', () => { render(index - 1); schedule(); });
  rail.querySelector('[data-rail-next]').addEventListener('click', () => { render(index + 1); schedule(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { render(i); schedule(); }));
  pause.addEventListener('click', () => { paused = !paused; schedule(); });
  rail.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  rail.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  rail.addEventListener('focusin', () => { focused = true; schedule(); });
  rail.addEventListener('focusout', (event) => { focused = rail.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { paused = motion.matches; schedule(); });
  window.addEventListener('pagehide', () => clearInterval(timer));
  hideConsultation();
  // Published administrator content only; no personal data is fetched here.
  fetch('/api/consultation/banner', { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error('Unavailable banner'); return response.json();
  }).then((banner) => {
    if (banner.enabled !== true) { hideConsultation(); return; }
    count = slides.length; rail.querySelector('.consultation-rail-controls').hidden = false; render(0); schedule();
    if (banner.title) rail.querySelector('[data-consultation-title]').textContent = banner.title;
    if (banner.body) rail.querySelector('[data-consultation-body]').textContent = banner.body;
    if (banner.image && /^\/(?!\/)/.test(banner.image)) rail.querySelector('[data-consultation-image]').src = banner.image;
  }).catch(hideConsultation);
})();
