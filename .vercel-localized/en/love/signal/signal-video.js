(() => {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const boundVideos = new WeakSet();
  const observedVideos = new WeakSet();
  let observer = null;

  const load = (video) => {
    if (video.dataset.signalVideoLoaded === "true" || !video.dataset.videoSrc) return;
    video.dataset.signalVideoLoaded = "true";
    video.preload = video.dataset.videoPriority === "high" ? "auto" : "metadata";
    video.src = video.dataset.videoSrc;
    video.load();
  };

  const play = (video) => {
    if (reducedMotion) return;
    load(video);
    const result = video.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  };

  const getObserver = () => {
    if (observer || !("IntersectionObserver" in window) || reducedMotion) return observer;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) play(target);
        else target.pause();
      });
    }, { rootMargin: "240px 0px", threshold: 0.1 });
    return observer;
  };

  const observe = (scope = document) => {
    const videos = [];
    if (scope instanceof HTMLVideoElement && scope.matches("video[data-video-src]")) {
      videos.push(scope);
    } else if (scope?.querySelectorAll) {
      videos.push(...scope.querySelectorAll("video[data-video-src]"));
    }

    videos.forEach((video) => {
      if (!boundVideos.has(video)) {
        boundVideos.add(video);
        video.addEventListener("error", () => {
          video.closest(".hero, .scene, .image-band, .cta-section, .cta-visual, .visual-block, .group-card")?.classList.add("image-failed");
        }, { once: true });
        video.addEventListener("loadeddata", () => video.classList.add("is-ready"), { once: true });
      }
      if (observedVideos.has(video)) return;
      observedVideos.add(video);

      if (video.dataset.videoPriority === "high" && !reducedMotion) {
        play(video);
        return;
      }
      const currentObserver = getObserver();
      if (currentObserver) currentObserver.observe(video);
      else if (!reducedMotion) play(video);
    });
  };

  window.umshSignalVideos = { observe };
  observe();
})();
