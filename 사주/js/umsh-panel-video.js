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
   * data-sample-section → clip, with the clip's own pixel size. Matched by pulling a
   * frame from every clip and comparing it against every still on the page.
   *
   * The size is written down instead of read back from the file so a panel can be laid
   * out the moment it is drawn. The clips sit at preload="none" until they scroll into
   * view, so waiting for loadedmetadata would resize the section under the reader.
   */
  var PANELS = [
    ['sample-top', '01-closeup', 1280, 720],
    ['hero-character', '02-ritual-object', 720, 1280],
    ['worry-bg', '03-chin-closeup', 1280, 720],
    ['preview-two', '06-fan-eyes', 1280, 720],
    ['manseryeok', '08-compass', 1280, 720],
    ['character-a', '09-talisman', 720, 1280],
    ['romance-character', '13-fate-network', 720, 1280],
    ['romance-closeup', '14-bell-wand', 720, 1280],
    ['destiny-card', '16-relationship-fog', 1280, 720],
    ['hand-reach', '19-fate-scholar', 834, 1112],
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

  function attach(img, src, clipW, clipH) {
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

    fitToPanel(video, clipW / clipH);
    var watch = observer();
    if (watch) watch.observe(video);
  }

  /**
   * The stills were crops made for their panel; the clips are the full frames. Covering
   * a 1.20 box with a 0.56 clip threw away three quarters of the picture - the 부적 panel
   * came out as a pair of eyes. Where cover would cut that deep the clip is shown whole
   * instead, against the panel's own near-black ground.
   */
  var KEEP_AT_LEAST = 0.62;

  /** Below this the clip is upright, and any bars it leaves are down its sides. */
  var LANDSCAPE_AT_LEAST = 1.25;

  /** Black between the picture and the caption, and below the caption. */
  var COPY_GAP = 32;
  var TAIL = 44;

  function fitToPanel(video, clipRatio) {
    var section = video.parentElement;
    var retries = 4;

    function apply() {
      // Start from the panel's own layout so a resize re-measures rather than stacks.
      release(video, section);
      var box = video.getBoundingClientRect();
      if (!box.width || !box.height) {
        // A panel drawn this tick may not be laid out yet; look again next frame.
        if (retries-- > 0 && video.isConnected) window.requestAnimationFrame(apply);
        return;
      }
      var boxRatio = box.width / box.height;

      if (clipRatio >= LANDSCAPE_AT_LEAST && boxRatio < clipRatio - 0.02) {
        trimLetterbox(video, section, clipRatio, box);
        return;
      }
      var kept = boxRatio > clipRatio ? clipRatio / boxRatio : boxRatio / clipRatio;
      video.style.objectFit = kept < KEEP_AT_LEAST ? 'contain' : 'cover';
    }

    apply();
    window.addEventListener('resize', apply);
  }

  function release(video, section) {
    video.style.objectFit = '';
    video.style.top = '';
    video.style.height = '';
    if (!section) return;
    section.style.minHeight = '';
    section.style.height = '';
    var fade = section.querySelector('.source-fade');
    if (fade) {
      fade.style.top = '';
      fade.style.bottom = '';
      fade.style.height = '';
    }
    var copy = section.querySelector('.source-copy');
    if (copy) {
      copy.style.top = '';
      copy.style.bottom = '';
      copy.style.transform = '';
    }
  }

  /**
   * A 16:9 clip in an upright panel.
   *
   * Shown whole it left flat black bars above and below, and the caption - written to
   * sit over a full-bleed still - landed on top of the picture. So the clip's box is
   * cut down to the picture itself: no bars, the panel's own top-and-bottom gradient
   * moves onto the picture's edges instead of onto the bars, the caption drops clear
   * of it, and the section gives back the height nothing was using.
   */
  function trimLetterbox(video, section, clipRatio, box) {
    if (!section) return;
    var sectionBox = section.getBoundingClientRect();
    var height = Math.round(box.width / clipRatio);
    var top = Math.round(box.top - sectionBox.top);

    var copy = section.querySelector('.source-copy');
    var copyHeight = copy ? Math.round(copy.getBoundingClientRect().height) : 0;
    var above = copy && copy.classList.contains('top');
    if (above) {
      // Keep the picture below a caption the panel puts above it.
      top = Math.max(top, Math.round(copy.getBoundingClientRect().bottom - sectionBox.top) + COPY_GAP);
    }

    video.style.top = top + 'px';
    video.style.height = height + 'px';
    video.style.objectFit = 'cover'; // The box is the clip's own shape now.

    var fade = section.querySelector('.source-fade');
    if (fade) {
      fade.style.top = top + 'px';
      fade.style.bottom = 'auto';
      fade.style.height = height + 'px';
    }

    var end = top + height;
    if (copy && !above) {
      if (copy.classList.contains('mid')) {
        copy.style.top = end + COPY_GAP + 'px';
        copy.style.bottom = 'auto';
        copy.style.transform = 'none';
        end += COPY_GAP + copyHeight;
        end += TAIL;
      } else {
        // Bottom-anchored: shrinking the section is what brings it under the picture.
        var inset = parseFloat(window.getComputedStyle(copy).bottom);
        end += COPY_GAP + copyHeight + (isNaN(inset) ? TAIL : inset);
      }
    } else {
      end += TAIL;
    }

    // Only the four elements above are placed against the old height; anything else in
    // the panel was positioned by hand, so leave that section's height alone.
    if (hasPlacedExtras(section, video)) return;
    section.style.minHeight = end + 'px';
    section.style.height = end + 'px';
  }

  function hasPlacedExtras(section, video) {
    return Array.prototype.some.call(section.children, function (el) {
      if (el === video) return false;
      var name = el.className || '';
      if (typeof name !== 'string') return true;
      return !/(^|\s)(source-img|source-fade|source-copy)(\s|$)/.test(name);
    });
  }

  function sweep() {
    PANELS.forEach(function (entry) {
      var hosts = document.querySelectorAll('[data-sample-section="' + entry[0] + '"]');
      Array.prototype.forEach.call(hosts, function (host) {
        var img = host.querySelector('img:not(.umsh-panel-still-hidden)');
        if (img) attach(img, BASE + entry[1] + '.mp4', entry[2], entry[3]);
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
