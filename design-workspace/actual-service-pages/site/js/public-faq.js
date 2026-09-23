(() => {
  function openQuestion() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const item = document.getElementById(id);
    if (item && item.matches('details.faq-question')) {
      item.open = true;
      requestAnimationFrame(() => item.scrollIntoView({ block: 'start' }));
    }
  }
  window.addEventListener('hashchange', openQuestion);
  openQuestion();
})();
