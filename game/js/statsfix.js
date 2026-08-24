/* statsfix.js — aplica P/R leídos por OCR a las cartas (override confiable) */
(function () {
  'use strict';
  var F = window.INWO_STATS_FIX || {};
  var K = window.INWO_STATS_KNOWN || {};
  function norm(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var C = window.INWO_CARDS;
  if (!C) return;
  function apply(map, tag) {
    C.cards.forEach(function (c) {
      var f = map[norm(c.name)];
      if (!f) return;
      if (typeof f[0] === 'number' && (c.power == null || tag === 'fix')) c.power = f[0];
      if (typeof f[1] === 'number' && (c.resistance == null || tag === 'fix')) c.resistance = f[1];
      if (c.power != null || c.resistance != null) c.statsFromImage = c.statsFromImage || tag === 'known';
    });
  }
  apply(F, 'fix');
  /* KNOWN solo rellena HUECOS: nunca pisa valores ya verificados */
  C.cards.forEach(function (c) {
    var nk = norm(c.name);
    var f = K[nk] || K[nk.replace(/^the/, '')];
    if (!f) return;
    if (c.power == null && typeof f[0] === 'number') { c.power = f[0]; c.statsKnown = true; }
    if (c.resistance == null && typeof f[1] === 'number') { c.resistance = f[1]; c.statsKnown = true; }
  });
})();
