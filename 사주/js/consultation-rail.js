(function () {
  'use strict';
  const rail = document.querySelector('.consultation-rail'); if (!rail) return;
  const slides = Array.from(rail.querySelectorAll('[data-rail-slide]'));
  const dots = Array.from(rail.querySelectorAll('[data-slide-to]'));
  const pause = rail.querySelector('[data-rail-pause]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The consultation promo is always the last slide; free tests before it keep rotating when it is off.
  const base = Math.max(1, slides.length - 1);
  let index = 0, paused = motion.matches, hovered = false, focused = false, timer, count = slides.length;
  function hideConsultation() { count = base; render(0); rail.querySelector('.consultation-rail-controls').hidden = base < 2; schedule(); }
  function render(next) {
    index = (next + count) % count;
    slides.forEach((slide, i) => { slide.hidden = i !== index; slide.inert = i !== index; slide.setAttribute('aria-hidden', String(i !== index)); });
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

  // 마우스나 손가락으로 옆으로 끌어서 넘긴다. 끄는 동안 다음(이전) 배너가 옆에서 따라 들어온다.
  // 세로로 움직이면 화면 스크롤로 넘기고(touch-action: pan-y), 끌고 난 뒤의 클릭은 막아 배너 링크가 열리지 않게 한다.
  const track = rail.querySelector('.consultation-rail-slides');
  if (track) bindDrag(track);
  function bindDrag(track) {
    const SLIDE_MS = 280;
    let drag = null, swallowClick = false;
    function place(slide, x, animate) {
      slide.style.transition = animate ? 'transform ' + SLIDE_MS + 'ms ease' : 'none';
      slide.style.transform = x ? 'translateX(' + x + 'px)' : '';
    }
    function settle(list) { list.forEach((slide) => { if (!slide) return; slide.style.transition = ''; slide.style.transform = ''; slide.style.visibility = ''; }); }
    function follow(dx) {
      const side = dx < 0 ? 1 : -1;
      const neighbor = slides[(index + side + count) % count];
      if (drag.neighbor && drag.neighbor !== neighbor) settle([drag.neighbor]);
      drag.neighbor = neighbor;
      neighbor.style.visibility = 'visible';
      place(slides[index], dx, false);
      place(neighbor, dx + side * track.clientWidth, false);
    }
    track.addEventListener('pointerdown', (event) => {
      if (count < 2 || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, moving: false, neighbor: null };
    });
    track.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moving) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.moving = true;
        clearInterval(timer);
        track.classList.add('is-dragging');
        try { track.setPointerCapture(event.pointerId); } catch (error) { /* 이미 놓친 포인터 */ }
      }
      drag.dx = dx;
      follow(dx);
    });
    function release(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const done = drag; drag = null;
      if (!done.moving) return;
      track.classList.remove('is-dragging');
      swallowClick = true; setTimeout(() => { swallowClick = false; }, 0);
      const width = track.clientWidth, side = done.dx < 0 ? 1 : -1, current = slides[index];
      const turn = Math.abs(done.dx) > Math.min(80, width * 0.18);
      place(current, turn ? -side * width : 0, true);
      place(done.neighbor, turn ? 0 : side * width, true);
      setTimeout(() => { settle([current, done.neighbor]); if (turn) render(index + side); schedule(); }, SLIDE_MS);
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('click', (event) => { if (swallowClick) { event.preventDefault(); event.stopPropagation(); } }, true);
    track.addEventListener('dragstart', (event) => event.preventDefault());
  }

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
