(function () {
  const stepHashes = {
    story: '#step-1-story',
    auth: '#step-2-saju-input',
    profile: '#step-2-saju-input',
    form: '#step-3-service-input',
    report: '#step-4-report',
  };

  const authHashes = new Set([stepHashes.auth, '#start']);

  function set(step) {
    const hash = stepHashes[step] || step;
    if (!hash || location.hash === hash) return;
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }

  function markByScreen(screenName) {
    set(stepHashes[screenName] ? screenName : 'story');
  }

  function isAuthStep() {
    return authHashes.has(location.hash);
  }

  window.UMSHServiceSteps = {
    set,
    markByScreen,
    markStory: () => {
      if (!isAuthStep()) set('story');
    },
    markAuth: () => set('auth'),
    isAuthStep,
  };
})();
