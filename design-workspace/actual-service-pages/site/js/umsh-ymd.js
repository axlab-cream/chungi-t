/**
 * Native <input type="date"> follows the OS locale, so a Korean page on a
 * US-locale Windows Chrome shows 03/12/1994. 운명상회 입력은 년·월·일 순이다.
 * The original date field stays in the form (yyyy-mm-dd) so existing submit
 * and validation code does not change.
 */
(function (global) {
  'use strict';

  var START_YEAR = 1900;

  function pad2(value) {
    return String(Number(value) || 0).padStart(2, '0');
  }

  function daysInMonth(year, month) {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }

  function parseISO(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return { year: '', month: '', day: '' };
    return {
      year: match[1],
      month: String(Number(match[2])),
      day: String(Number(match[3])),
    };
  }

  function fillSelect(select, start, end, blankLabel, selected, descending) {
    var current = String(selected || '');
    select.textContent = '';
    var blank = global.document.createElement('option');
    blank.value = '';
    blank.textContent = blankLabel;
    select.appendChild(blank);
    if (descending) {
      for (var high = end; high >= start; high -= 1) appendOption(select, high, current);
    } else {
      for (var low = start; low <= end; low += 1) appendOption(select, low, current);
    }
  }

  function appendOption(select, value, selected) {
    var option = global.document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    if (String(value) === String(selected)) option.selected = true;
    select.appendChild(option);
  }

  function makePart(kind, caption) {
    var wrap = global.document.createElement('div');
    wrap.className = 'umsh-ymd-part';
    var select = global.document.createElement('select');
    select.setAttribute('aria-label', caption);
    select.dataset.umshYmdPart = kind;
    wrap.appendChild(select);
    return { wrap: wrap, select: select };
  }

  function yearBounds(source) {
    var now = new Date().getFullYear();
    var minYear = START_YEAR;
    var maxYear = now;
    var minParsed = parseISO(source.getAttribute('min') || source.min);
    var maxParsed = parseISO(source.getAttribute('max') || source.max);
    if (minParsed.year) minYear = Number(minParsed.year);
    if (maxParsed.year) maxYear = Number(maxParsed.year);
    return { minYear: minYear, maxYear: maxYear };
  }

  function enhance(source) {
    if (!source || source.dataset.umshYmd === 'ready' || source.dataset.umshYmd === 'off') return;
    if (String(source.type).toLowerCase() !== 'date') return;
    source.dataset.umshYmd = 'ready';
    source.classList.add('umsh-ymd-source');
    source.setAttribute('tabindex', '-1');
    source.setAttribute('aria-hidden', 'true');

    var group = global.document.createElement('div');
    group.className = 'umsh-ymd';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '생년월일');

    var year = makePart('year', '년');
    var month = makePart('month', '월');
    var day = makePart('day', '일');
    group.appendChild(year.wrap);
    group.appendChild(month.wrap);
    group.appendChild(day.wrap);
    source.insertAdjacentElement('afterend', group);

    var bounds = yearBounds(source);
    var nativeValue = Object.getOwnPropertyDescriptor(global.HTMLInputElement.prototype, 'value');
    var syncing = false;

    function writeSource() {
      var y = year.select.value;
      var m = month.select.value;
      var d = day.select.value;
      var next = y && m && d ? y + '-' + pad2(m) + '-' + pad2(d) : '';
      syncing = true;
      if (nativeValue && nativeValue.set) nativeValue.set.call(source, next);
      else source.value = next;
      syncing = false;
      source.dispatchEvent(new Event('input', { bubbles: true }));
      source.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function refreshDays(preferred) {
      var y = Number(year.select.value) || bounds.maxYear;
      var m = Number(month.select.value) || 1;
      var maxDay = daysInMonth(y, m);
      var keep = preferred && Number(preferred) <= maxDay ? preferred : '';
      fillSelect(day.select, 1, maxDay, '일', keep, false);
    }

    function syncFromSource() {
      var parsed = parseISO(source.value);
      fillSelect(year.select, bounds.minYear, bounds.maxYear, '년', parsed.year, true);
      fillSelect(month.select, 1, 12, '월', parsed.month, false);
      refreshDays(parsed.day);
    }

    year.select.addEventListener('change', function () {
      refreshDays(day.select.value);
      writeSource();
    });
    month.select.addEventListener('change', function () {
      refreshDays(day.select.value);
      writeSource();
    });
    day.select.addEventListener('change', writeSource);

    syncFromSource();

    if (nativeValue && nativeValue.get && nativeValue.set) {
      Object.defineProperty(source, 'value', {
        configurable: true,
        enumerable: true,
        get: function () { return nativeValue.get.call(source); },
        set: function (next) {
          nativeValue.set.call(source, next);
          if (!syncing) syncFromSource();
        },
      });
    }
  }

  function enhanceAll(root) {
    var scope = root || global.document;
    if (!scope || !scope.querySelectorAll) return;
    Array.prototype.forEach.call(scope.querySelectorAll('form input[type="date"]'), enhance);
  }

  global.UMSHYmd = { enhance: enhance, enhanceAll: enhanceAll };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', function () { enhanceAll(); });
  } else {
    enhanceAll();
  }
})(typeof window !== 'undefined' ? window : globalThis);
