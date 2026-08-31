(() => {
  if (location.hash === '#cmdg') {
    location.replace('/cmdg/');
    return;
  }

  const phone = document.querySelector('.phone');
  const scroller = document.querySelector('.phone-scroll');
  const actionPanel = document.querySelector('#actionPanel');
  const menuButton = document.querySelector('[data-action="toggle-menu"]');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const serviceCards = Array.from(document.querySelectorAll('.service-card'));
  const pendingCards = Array.from(document.querySelectorAll('[data-soon], .is-soon'));
  const sectionBlocks = Array.from(document.querySelectorAll('.section-block'));
  const dragRails = Array.from(document.querySelectorAll('.poster-rail, .category-rail, .price-rail'));
  const liveLinks = Array.from(document.querySelectorAll('a.is-live, a.is-cmdg'));
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
  const menuFilterButtons = Array.from(document.querySelectorAll('[data-menu-filter]'));
  const hoverTargets = Array.from(document.querySelectorAll('.poster, .product-card, .mini-row, .today-ticket, .tier'));
  const pressTargets = Array.from(document.querySelectorAll('button, a, .tier'));
  const toast = document.querySelector('#toast');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dragThreshold = 24;
  let toastTimer = 0;

  if (actionPanel) {
    actionPanel.inert = true;
  }

  function prefersReducedMotion() {
    return motionQuery.matches;
  }

  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function getLabel(element) {
    const card = element.closest?.('.service-card') || element;
    const primary = card.querySelector?.('strong');
    return cleanText(primary?.innerText || primary?.textContent || element.innerText || element.textContent || '이 서비스');
  }

  function scrollWithinPhone(target, offset = 16) {
    if (!scroller || !target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = scroller.scrollTop + targetRect.top - scrollerRect.top - offset;

    scroller.scrollTo({
      top: Math.max(0, nextTop),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function flashReadableTarget(target) {
    if (!target) return;
    target.classList.add('is-pointed');
    window.setTimeout(() => {
      target.classList.remove('is-pointed');
    }, 700);
  }

  function snapToNearestCard(rail) {
    const cards = Array.from(rail.querySelectorAll('.poster:not(.is-hidden)'));
    if (!cards.length) return;

    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    const nearest = cards.reduce((closest, card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - railCenter);
      return distance < closest.distance ? { card, distance } : closest;
    }, { card: cards[0], distance: Number.POSITIVE_INFINITY }).card;

    rail.scrollTo({
      left: nearest.offsetLeft - (rail.clientWidth - nearest.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function scrollHorizontalCardIntoView(card) {
    const rail = card?.closest?.('.poster-rail, .category-rail, .price-rail');
    if (!rail) return;

    rail.scrollTo({
      left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function bindMouseDrag(rail) {
    let pointerId = 0;
    let startX = 0;
    let startScrollLeft = 0;
    let didDrag = false;
    let lastDragEndedAt = 0;

    rail.querySelectorAll('img').forEach((img) => {
      img.draggable = false;
    });

    rail.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = rail.scrollLeft;
      didDrag = false;
      rail.classList.add('is-drag-ready');
    });

    rail.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;

      if (Math.abs(deltaX) > dragThreshold && !didDrag) {
        didDrag = true;
        rail.classList.add('is-dragging');
        try {
          rail.setPointerCapture(pointerId);
        } catch (_error) {
          // Synthetic test events and older browser surfaces can reject pointer capture.
        }
      }

      if (!didDrag) return;
      event.preventDefault();
      rail.scrollLeft = startScrollLeft - deltaX;
    });

    function finishDrag(event) {
      if (event.pointerId !== pointerId) return;
      try {
        if (rail.hasPointerCapture(pointerId)) {
          rail.releasePointerCapture(pointerId);
        }
      } catch (_error) {
        // Drag cleanup should still run even when pointer capture is unavailable.
      }

      pointerId = 0;
      rail.classList.remove('is-drag-ready', 'is-dragging');

      if (didDrag) {
        lastDragEndedAt = Date.now();
        rail.dataset.dragged = '1';
        if (rail.classList.contains('poster-rail')) {
          snapToNearestCard(rail);
        }
        window.setTimeout(() => {
          delete rail.dataset.dragged;
        }, 260);
      }
    }

    rail.addEventListener('pointerup', finishDrag);
    rail.addEventListener('pointercancel', finishDrag);
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);

    rail.addEventListener('click', (event) => {
      if (Date.now() - lastDragEndedAt > 260) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function setFilter(category, options = {}) {
    const selectedCategory = category || 'all';

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === selectedCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    serviceCards.forEach((card) => {
      const isMatch = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      card.classList.toggle('is-hidden', !isMatch);
    });

    sectionBlocks.forEach((section) => {
      const sectionCards = Array.from(section.querySelectorAll('.service-card'));
      const shouldHide = selectedCategory !== 'all'
        && sectionCards.length > 0
        && sectionCards.every((card) => card.classList.contains('is-hidden'));
      section.classList.toggle('is-empty-filter', shouldHide);
    });

    if (options.reveal === false) return;

    const firstVisible = serviceCards.find((card) => !card.classList.contains('is-hidden'));
    if (!firstVisible) return;

    const section = selectedCategory === 'all'
      ? document.querySelector('#services')
      : firstVisible.closest('.section-block') || firstVisible.closest('.poster-rail') || firstVisible;
    scrollWithinPhone(section);
    scrollHorizontalCardIntoView(firstVisible);
    flashReadableTarget(firstVisible);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || '이 서비스는 다음 단계에서 연결됩니다.';
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1700);
  }

  function showPendingMessage(event) {
    const source = event.currentTarget;
    const label = getLabel(source);
    showToast(`${label}은 다음 단계에서 연결됩니다.`);
  }

  function navigateToLink(link) {
    const href = link.getAttribute('href');
    if (!href) return;

    link.classList.add('is-pressing');
    location.assign(new URL(href, location.href).href);
  }

  function setPointerPosition(element, event) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    element.style.setProperty('--pointer-x', `${x.toFixed(1)}%`);
    element.style.setProperty('--pointer-y', `${y.toFixed(1)}%`);
  }

  function bindHoverReadability(element) {
    element.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      element.classList.add('is-pointed');
      setPointerPosition(element, event);
    });

    element.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      setPointerPosition(element, event);
    });

    element.addEventListener('pointerleave', () => {
      element.classList.remove('is-pointed');
    });
  }

  function createClickSpark(element, event) {
    if (prefersReducedMotion()) return;
    if (element.closest?.('.poster-rail')?.dataset.dragged === '1') return;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const spark = document.createElement('span');
    spark.className = 'click-spark';
    const x = event.clientX > 0 ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY > 0 ? event.clientY - rect.top : rect.height / 2;
    spark.style.setProperty('--spark-x', `${Math.max(0, Math.min(rect.width, x))}px`);
    spark.style.setProperty('--spark-y', `${Math.max(0, Math.min(rect.height, y))}px`);
    element.appendChild(spark);
    window.setTimeout(() => {
      spark.remove();
    }, 560);
  }

  function bindPressFeedback(element) {
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      element.classList.add('is-pressing');
    });

    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((eventName) => {
      element.addEventListener(eventName, () => {
        element.classList.remove('is-pressing');
      });
    });

    element.addEventListener('click', (event) => {
      createClickSpark(element, event);
    });
  }

  function setMenuOpen(isOpen) {
    if (!phone || !actionPanel || !menuButton) return;
    phone.classList.toggle('is-menu-open', isOpen);
    actionPanel.inert = !isOpen;
    actionPanel.setAttribute('aria-hidden', String(!isOpen));
    menuButton.setAttribute('aria-expanded', String(isOpen));
  }

  function setupReveal() {
    const revealTargets = Array.from(document.querySelectorAll('.home-hero, .poster, .today-ticket, .section-block, .tier'));
    revealTargets.forEach((target, index) => {
      target.classList.add('reveal-on-scroll');
      target.style.transitionDelay = `${Math.min(index * 25, 180)}ms`;
    });

    if (!('IntersectionObserver' in window) || !scroller) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      root: scroller,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    });

    revealTargets.forEach((target) => observer.observe(target));
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter || 'all';
      setFilter(category);
      showToast(category === 'all' ? '전체 운세 상품을 다시 보여드립니다.' : `${cleanText(button.textContent)} 관련 운만 모았습니다.`);
    });
  });

  pendingCards.forEach((card) => {
    card.addEventListener('click', showPendingMessage);
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;

      if (action === 'focus-services') {
        setMenuOpen(false);
        scrollWithinPhone(document.querySelector('#services'));
        flashReadableTarget(serviceCards[0]);
        return;
      }

      if (action === 'toggle-menu') {
        setMenuOpen(!phone?.classList.contains('is-menu-open'));
        return;
      }

      if (action === 'close-menu') {
        setMenuOpen(false);
      }
    });
  });

  menuFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.menuFilter || 'all';
      setFilter(category);
      setMenuOpen(false);
      showToast(`${cleanText(button.querySelector('strong')?.textContent)} 상품을 모았습니다.`);
    });
  });

  actionPanel?.addEventListener('click', (event) => {
    if (event.target === actionPanel) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
    }
  });

  liveLinks.forEach((link) => {
    let clickStart = null;
    let pointerNavigationAt = 0;

    link.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      clickStart = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    }, true);

    link.addEventListener('pointerup', (event) => {
      if (!clickStart || event.pointerType !== 'mouse' || event.pointerId !== clickStart.pointerId) return;
      const movedX = Math.abs(event.clientX - clickStart.x);
      const movedY = Math.abs(event.clientY - clickStart.y);
      const rail = link.closest('.poster-rail');
      const isClick = movedX <= dragThreshold && movedY <= dragThreshold;
      clickStart = null;

      if (!isClick || rail?.dataset.dragged === '1') return;
      pointerNavigationAt = Date.now();
      event.preventDefault();
      event.stopPropagation();
      navigateToLink(link);
    }, true);

    link.addEventListener('pointercancel', () => {
      clickStart = null;
    }, true);

    link.addEventListener('click', (event) => {
      if (Date.now() - pointerNavigationAt < 500) {
        event.preventDefault();
        return;
      }
      if (link.closest('.poster-rail')?.dataset.dragged === '1') return;
      event.preventDefault();
      navigateToLink(link);
    });
  });

  dragRails.forEach(bindMouseDrag);
  hoverTargets.forEach(bindHoverReadability);
  pressTargets.forEach(bindPressFeedback);
  setFilter('all', { reveal: false });
  setupReveal();
})();
