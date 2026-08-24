// scripts/audit_usage.cjs — ¿se usan TODAS las cartas? instrumentación por efecto
const fs = require('fs');
const path = require('path');
global.window = {};
['images.js', 'cards.js', 'cardtexts_data.js', 'cardstats_known.js', 'cardstats_fix.js', 'statsfix.js', 'texts.js', 'engine.js']
  .forEach(f => require(path.join(__dirname, '../game/js', f)));
const C = global.window.INWO_CARDS, E = global.window.Engine;
require(path.join(__dirname, '../game/js/ai.js'));
const AI = window.AI;

/* ===== instrumentación: envolver acciones del motor ===== */
const USE = {};
function bump(k) { USE[k] = (USE[k] || 0) + 1; }
['autoTakeover', 'playResource', 'playPlot', 'declareAttack', 'exchangeForPlot',
 'illumDrawGroup', 'extraGroupDraw', 'addBoost', 'moveGroup', 'giveCard', 'discardCard', 'instantAttack'
].forEach(m => {
  const orig = E[m];
  if (typeof orig !== 'function') return;
  E[m] = function () {
    bump('ACCION:' + m);
    try {
      if (m === 'playPlot' || m === 'playResource' || m === 'discardCard') {
        const c = C.cards[arguments[1]];
        if (c) { bump('KIND:' + (c.effect && c.effect.kind ? c.effect.kind : 'sin-effect')); if (c.type === 'resource') bump('RECURSO:' + c.name); }
      }
      if (m === 'declareAttack') bump('ATAQUE:' + arguments[2] && arguments[2] ? (arguments[1 + 1] ? '' : '') : '');
    } catch (e) {}
    return orig.apply(E, arguments);
  };
});
/* ataques por tipo vía log (más fiable que firma variable) */
const ATK = { control: 0, destroy: 0 };
let LOGALL = [];
const origLogPush = null;

/* ===== correr N partidas con Illuminati variados (ids dinámicos) ===== */
const GAMES = 8, MAXT = 80;
for (let g = 0; g < GAMES; g++) {
  E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
  const avail = E.availableIlluminati();
  const i0 = (g * 2) % avail.length, i1 = (g * 2 + 1 + g) % avail.length;
  E.setIlluminati(0, i0 === i1 ? avail[(i0 + 1) % avail.length].id : avail[i0].id);
  E.setIlluminati(1, i0 === i1 ? avail[i0].id : avail[i1].id);
  E.startGame();
  let t = 0;
  while (E.getState().phase !== 'gameover' && t++ < MAXT) {
    const pid = E.getState().currentPid;
    E.beginTurn(pid);
    try { AI.takeTurn(E, pid); } catch (e) {}
    const s = E.getState();
    if (s.attack && !s.attack.resolved) { try { E.resolveAttack(); } catch (e2) {} }
    try { E.endTurn(); } catch (e3) {}
    LOGALL = LOGALL.concat((E.getState().log || []).map(m => m.msg || String(m)));
  }
}
ATK.control = LOGALL.filter(l => /a control con|ATTACK TO CONTROL/.test(l)).length;
ATK.destroy = LOGALL.filter(l => /a destroy con|ATTACK TO DESTROY/.test(l)).length;

/* ===== resumen de uso ===== */
const kinds = {};
C.cards.forEach(c => { const k = c.effect && c.effect.kind ? c.effect.kind : '(sin effect)'; kinds[k] = (kinds[k] || 0) + 1; });
const R = [];
R.push('\n## 5 · Uso real por familia (' + GAMES + ' partidas IA-vs-IA, hasta ' + MAXT + ' turnos)\n');
R.push('| Familia | Cartas en mazo | Veces jugada | Veredicto |');
R.push('|---|---|---|---|');
Object.keys(kinds).sort().forEach(k => {
  const played = USE['KIND:' + k] || 0;
  const verdict =
    k === 'resource_generic' ? '\u2699 pasiva por dise\u00F1o (texto)' :
    k === 'plot_generic' ? '\u2705 pegamento universal (+10)' :
    played > 0 ? '\u2705 SE USA' :
    (k === 'assassination' || k === 'disaster') ? '\u26A0\uFE0F rara: requiere objetivo v\u00E1lido en campo' :
    k === 'goal' || k === 'nwo' ? '\u26A0\uFE0F condicional (meta/fin)' :
    '\u274C no dispar\u00F3 \u2014 revisar';
  R.push('| ' + k + ' | ' + kinds[k] + ' | ' + played + ' | ' + verdict + ' |');
});
R.push('\n### Acciones agregadas\n');
R.push('| Acci\u00F3n | Llamadas |');
R.push('|---|---|');
Object.keys(USE).filter(k => k.startsWith('ACCION:') || k.startsWith('RECURSO:')).sort().forEach(k => R.push('| ' + k.replace('ACCION:', '').replace('RECURSO:', 'res ') + ' | ' + USE[k] + ' |'));
R.push('\n### Ataques por tipo (v\u00EDa log)\n\n- CONTROLAR: ' + ATK.control + '\n- DESTRUIR: ' + ATK.destroy);
R.push('\n### Auditor\u00EDa adicional verificable\n');
const elim = LOGALL.filter(l => /eliminad/i.test(l)).length;
const neutral = LOGALL.filter(l => /\u00E1rea neutral|neutral area/i.test(l)).length;
const limHand = USE['ACCION:discardCard'] || 0;
R.push('- Eliminaciones por quedar sin t\u00EDteres: ' + elim);
R.push('- Eventos de \u00C1REA NEUTRAL (fallos vs mano rival): ' + neutral);
R.push('- Descartes (incluye l\u00EDmite 5 Plots): ' + limHand);
R.push('- Intercambios tokens\u2192Plot: ' + (USE['ACCION:exchangeForPlot'] || 0));
R.push('- Draws extra de Grupo (\u2605): ' + (USE['ACCION:illumDrawGroup'] || 0));
R.push('- Recursos jugados con acci\u00F3n: ' + (USE['ACCION:playResource'] || 0));

fs.appendFileSync(path.join(__dirname, '../SINERGIAS.md'), R.join('\n'), 'utf8');
console.log('USO OK \u00B7 familias:', Object.keys(kinds).length, '\u00B7 playPlot total:', USE['ACCION:playPlot'] || 0,
  '\u00B7 recursos:', USE['ACCION:playResource'] || 0, '\u00B7 boosts:', USE['ACCION:addBoost'] || 0,
  '\u00B7 ctl/dst:', ATK.control + '/' + ATK.destroy);
