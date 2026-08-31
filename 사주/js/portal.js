(() => {
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const serviceCards = Array.from(document.querySelectorAll('.service-card'));
  const pendingCards = Array.from(document.querySelectorAll('[data-soon], .is-soon'));
  const toast = document.querySelector('#toast');
  let toastTimer = 0;

  function setFilter(category) {
    filterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.filter === category);
    });

    serviceCards.forEach((card) => {
      const isMatch = category === 'all' || card.dataset.category === category;
      card.classList.toggle('is-hidden', !isMatch);
    });
  }

  function showPendingMessage() {
    if (!toast) return;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1600);
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter || 'all'));
  });

  pendingCards.forEach((card) => {
    card.addEventListener('click', showPendingMessage);
  });
})();
