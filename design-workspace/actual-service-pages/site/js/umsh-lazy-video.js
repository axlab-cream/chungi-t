/**
 * Starts a `<video data-lazy-play>` only once it is actually on screen.
 *
 * A story page can carry half a dozen loops. Letting them all load would put ten
 * megabytes on the wire before the reader has scrolled past the first scene, so each
 * one ships with `preload="none"` and its own poster frame: nothing goes over the
 * network until the element is visible, and the still holds the layout in the
 * meantime. Scrolling away pauses it again, and a hidden tab pauses everything.
 */
(function () {
  'use strict';

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function start() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-lazy-play]'));
    if (!videos.length) return;

    // With reduced motion or no observer, the poster frame is the whole experience.
    if (reducedMotion() || typeof IntersectionObserver !== 'function') return;

    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting && !document.hidden) {
          if (video.preload === 'none') video.preload = 'auto';
          var played = video.play();
          // Autoplay can still be refused; the poster frame is the fallback.
          if (played && typeof played.catch === 'function') played.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });

    videos.forEach(function (video) {
      watcher.observe(video);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      videos.forEach(function (video) {
        video.pause();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
