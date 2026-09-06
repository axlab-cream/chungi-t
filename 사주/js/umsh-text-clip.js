/**
 * Product rule: interpretation / teaser user copy must not use unfinished
 * ellipsis truncation (… mid-clause). Prefer 1–2 complete sentences.
 */
(function (root) {
  function clipCompleteSentences(text, limit) {
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    var max = typeof limit === 'number' && limit > 0 ? limit : 220;
    if (!clean) return clean;
    if (clean.length <= max) return clean;

    var ends = [];
    var re = /[.!?。]/g;
    var match;
    while ((match = re.exec(clean)) !== null) ends.push(match.index + 1);

    var fitting = ends.filter(function (index) { return index <= max; });
    if (fitting.length > 0) {
      return clean.slice(0, fitting[fitting.length - 1]).trim();
    }

    if (ends.length > 0) {
      var first = clean.slice(0, ends[0]).trim();
      if (ends.length > 1) {
        var two = clean.slice(0, ends[1]).trim();
        if (first.length < Math.floor(max * 0.55) && two.length <= Math.floor(max * 1.65)) {
          return two;
        }
      }
      return first;
    }

    return clean;
  }

  root.UMSHTextClip = { clipCompleteSentences: clipCompleteSentences };
})(typeof window !== 'undefined' ? window : globalThis);
