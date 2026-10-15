/* Lote D (audit ## 90.) — gate de i18n narrativa: 0 pass-through en el log.
 *
 * Corre N partidas IA-vs-IA headless, junta TODAS las lineas de log del motor
 * (objetos {t,p,msg}; extrae .msg como hace normLog en ui.js) y clasifica cada
 * linea unica con I18N.tr bajo lang='en'. FALLA si alguna atraviesa sin
 * traducir: mensaje nuevo del motor => anadir regla a LOG_RULES en i18n.js.
 * Uso: node test_i18n_logrules.js [N=40]
 */
global.window = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.document = {
  readyState: 'complete', documentElement: null,
  getElementById: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
require('./game/js/ai.js');
require('./game/js/i18n.js');
var E = window.Engine, AI = window.AI, I18N = window.I18N;
var N = parseInt(process.argv[2] || '40', 10);
var fails = 0;

function assert(cond, msg) { if (!cond) { console.log('FAIL - ' + msg); fails++; } }

I18N.setLang('en');
var corpus = {};
for (var g = 0; g < N; g++) {
  E.newGame([{ name: 'IA-1', human: false }, { name: 'IA-2', human: false }]);
  var avail = E.availableIlluminati();
  var i0 = g % avail.length;
  E.setIlluminati(0, avail[i0].id);
  var base0 = String(avail[i0].id).replace(/\d+$/, '');
  var avail2 = avail.filter(function (c) { return String(c.id).replace(/\d+$/, '') !== base0; });
  E.setIlluminati(1, avail2[g % avail2.length].id);
  E.startGame();
  var turns = 0;
  while (turns < 80) {
    var st = E.getState();
    if (st.phase === 'gameover') break;
    try { AI.takeTurn(E, st.currentPid); } catch (eT) {
      var r1 = E._raw();
      if (r1.pendingRoll) r1.pendingRoll = null;
      if (r1.pendingEvent) r1.pendingEvent = null;
    }
    if (E.getState().phase === 'gameover') break;
    try { E.endTurn(); } catch (eWin) {
      var raw = E._raw();
      if (raw.pendingRoll) raw.pendingRoll = null;
      if (raw.pendingEvent) raw.pendingEvent = null;
      try { E.endTurn(); } catch (e2) { break; }
    }
    turns++;
  }
  (E.getState().log || []).forEach(function (l) {
    var txt = (l && typeof l === 'object') ? String(l.msg || l.text || '') : String(l);
    if (txt) corpus[txt] = (corpus[txt] || 0) + 1;
  });
}
var pt = Object.keys(corpus).filter(function (t) { return I18N.tr(t) === t; });
pt.slice(0, 30).forEach(function (t) { console.log('  PT | ' + t); });
assert(pt.length === 0, 'log pass-through con lang=en: ' + pt.length + ' de ' + Object.keys(corpus).length + ' lineas unicas (' + N + ' partidas)');
console.log((fails === 0 ? 'I18N LOG RULES PASSED' : 'I18N LOG RULES FAILED') + ' (' + Object.keys(corpus).length + ' lineas unicas en ' + N + ' partidas, pass-through=' + pt.length + ')');
process.exit(fails === 0 ? 0 : 1);
