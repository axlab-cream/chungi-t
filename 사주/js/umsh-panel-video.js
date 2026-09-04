/**
 * Swaps ten 천명사주 story stills for the loops shot from them.
 *
 * Each panel draws its artwork as a child <img> (`.source-img`, `.sample-intro-bg`),
 * and the whole run is re-rendered with innerHTML as the reader steps through the
 * sample. So the clips are attached at runtime and re-attached whenever a panel comes
 * back, instead of editing markup that gets replaced.
 *
 * The still it replaces becomes the clip's poster, so a panel looks identical before
 * playback and identical again if a browser refuses to autoplay.
 *
 * Ten clips are heavy even after re-encoding, so every one stays at preload="none"
 * until its panel is actually on screen, and pauses on the way out or on a hidden tab.
 */
(function () {
  'use strict';

  /**
   * data-sample-section → clip. Matched by pulling a frame from every clip and
   * comparing it against every still on the page.
   */
  var PANELS = [
    ['sample-top', '01-closeup'],
    ['hero-character', '02-ritual-object'],
    ['worry-bg', '03-chin-closeup'],
    ['preview-two', '06-fan-eyes'],
    ['manseryeok', '08-compass'],
    ['character-a', '09-talisman'],
    ['romance-character', '13-fate-network'],
    ['romance-closeup', '14-bell-wand'],
    ['destiny-card', '16-relationship-fog'],
    ['hand-reach', '19-fate-scholar'],
  ];

  var BASE = 'assets/videos/';

  var CSS = [
    /* The clip takes the still's own box, so it inherits whatever crop and position
       the panel had. Only the pieces <video> does not get for free are set here. */
    '.umsh-panel-video { object-fit: cover; background: #050202; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .umsh-panel-video { display: none !important; }',
    '  .umsh-panel-still-hidden { display: revert !important; }',
    '}',
  ].join('\n');

  function injectCss() {
    if (document.querySelector('style[data-umsh-panel-video]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-umsh-panel-video', '');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  var watcher = null;

  function observer() {
    if (watcher || typeof IntersectionObserver !== 'function') return watcher;
    watcher = new IntersectionObserver(function (entries) {
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
    }, { threshold: 0.25 });
    return watcher;
  }

  function attach(img, src) {
    if (!img || img.dataset.umshPanelVideo === src) return;
    var still = img.getAttribute('src') || '';
    if (!still) return;

    var video = document.createElement('video');
    // Same classes as the still, so the panel's own CSS sizes and positions the clip.
    video.className = img.className + ' umsh-panel-video';
    video.src = src;
    video.poster = still;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;

    // The poster is the very still being covered, so hiding it loses no fallback.
    img.classList.add('umsh-panel-still-hidden');
    img.style.display = 'none';
    img.dataset.umshPanelVideo = src;

    if (img.nextSibling) img.parentNode.insertBefore(video, img.nextSibling);
    else img.parentNode.appendChild(video);

    fitToPanel(video);
    var watch = observer();
    if (watch) watch.observe(video);
  }

  /**
   * The stills were crops made for their panel; the clips are the full frames. Covering
   * a 1.20 box with a 0.56 clip threw away three quarters of the picture - the 부적 panel
   * came out as a pair of eyes. Where cover would cut that deep the clip is shown whole
   * instead, against the panel's own near-black ground so the letterbox reads as frame.
   */
  var KEEP_AT_LEAST = 0.62;

  function fitToPanel(video) {
    function apply() {
      var box = video.getBoundingClientRect();
      if (!video.videoWidth || !box.width || !box.height) return;
      var boxRatio = box.width / box.height;
      var clipRatio = video.videoWidth / video.videoHeight;
      var kept = boxRatio > clipRatio ? clipRatio / boxRatio : boxRatio / clipRatio;
      video.style.objectFit = kept < KEEP_AT_LEAST ? 'contain' : 'cover';
    }
    if (video.readyState >= 1) apply();
    else video.addEventListener('loadedmetadata', apply, { once: true });
    window.addEventListener('resize', apply);
  }

  function sweep() {
    PANELS.forEach(function (entry) {
      var hosts = document.querySelectorAll('[data-sample-section="' + entry[0] + '"]');
      Array.prototype.forEach.call(hosts, function (host) {
        var img = host.querySelector('img:not(.umsh-panel-still-hidden)');
        if (img) attach(img, BASE + entry[1] + '.mp4');
      });
    });
  }

  function start() {
    injectCss();
    sweep();

    // Panels come and go through innerHTML, so catch the ones drawn later.
    if (typeof MutationObserver === 'function') {
      var pending = 0;
      new MutationObserver(function () {
        window.clearTimeout(pending);
        pending = window.setTimeout(sweep, 150);
      }).observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      Array.prototype.forEach.call(document.querySelectorAll('.umsh-panel-video'), function (video) {
        video.pause();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
