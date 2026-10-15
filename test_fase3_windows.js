/* Fase 3 — ventanas de reaccion: la IA respeta al humano y juega sus reactivas.
 *
 * Gate de calidad (mismo patron que test_respond.js): montaje determinista via
 * E._raw() (inyeccion de manos y ventanas sinteticas) y aserciones que FALLAN
 * si falta una pieza. Nunca process.exit(0) sin haber comprobado nada.
 *
 * Cobertura:
 *   T1  rodadero con respondedor HUMANO  -> settleWindows NO cierra la ventana
 *   T2  rodadero enemigo exitoso         -> la IA juega su reactiva y cierra
 *   T3  ataque PROPIO de la IA exitoso   -> la IA pasa (no se sabotea) y cierra
 *   T4  suceso con respondedor HUMANO    -> settleWindows NO cierra la ventana
 *   T5  descarte ajeno                   -> la IA reclama con Stealing the Plans
 *   T6  endTurn con rodadero abierto     -> RECHAZA (guarda de borde de turno)
 *   T7  endTurn con suceso abierto       -> RECHAZA (guarda de borde de turno)
 */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
require('./game/js/ai.js');
var E = window.Engine, C = window.INWO_CARDS, AI = window.AI;

E.newGame([{ name: 'Humano', human: true }, { name: 'IA', human: false }]);
E.setIlluminati(0, 'bavarianilluminati1');
E.setIlluminati(1, 'servantsofcthulhu2');
E.startGame();

var fails = 0;
function ok(cond, msg) {
  if (cond) { console.log('  \u2714 ' + msg); }
  else { fails++; console.log('  \u2718 FALLO: ' + msg); }
}
function cardIxByKind(kind) {
  for (var i = 0; i < C.cards.length; i++) {
    if (C.cards[i].effect && C.cards[i].effect.kind === kind) return i;
  }
  throw new Error('fixture: no se encontro carta con kind ' + kind);
}
function handHas(pid, ix) { return E._raw().players[pid].hand.indexOf(ix) >= 0; }
function give(pid, ix) { E._raw().players[pid].hand.push(ix); }
function respObj(pid, ix) {
  return { pid: pid, name: E._raw().players[pid].name, cardIdx: ix, cardName: C.cards[ix].name };
}
/* Ventanas sinteticas con la forma EXACTA de openRollWindow/openEventWindow:
   pendingRoll = {label,target,klass,pid,roll,total,success,mods,reroll,cancelled,responders,attack}
   pendingEvent = {kind,byPid,label,data,responders} */
function injectRollWindow(opts) {
  var S = E._raw();
  S.pendingRoll = {
    label: opts.label || 'Humano ataca', target: '?', klass: opts.klass || 'control',
    pid: opts.pid, roll: 11, total: 10, success: !!opts.success,
    mods: [], reroll: null, cancelled: null, responders: opts.responders, attack: null
  };
  return S.pendingRoll;
}
function injectEventWindow(opts) {
  var S = E._raw();
  S.pendingEvent = {
    kind: opts.kind, byPid: opts.byPid, label: opts.label || 'suceso',
    data: opts.data, responders: opts.responders
  };
  return S.pendingEvent;
}

console.log('T1 - rodadero con respondedor HUMANO: settleWindows la deja ABIERTA');
(function () {
  var bribe = cardIxByKind('bribery');
  give(0, bribe);
  injectRollWindow({ pid: 1, success: true, responders: [respObj(0, bribe)] });
  AI.settleWindows(E);
  ok(E._raw().pendingRoll != null, 'la ventana sigue abierta (la IA no la cerro a ciegas)');
  ok(handHas(0, bribe), 'la Bribery del humano sigue en su mano');
  E._raw().pendingRoll = null; E._raw().players[0].hand.pop();
})();

console.log('T2 - rodadero enemigo exitoso: la IA JUEGA su reactiva y la ventana se cierra');
(function () {
  var bribe = cardIxByKind('bribery');
  /* Bribery cuesta 1 ficha de accion de la Illuminati (engine:6398): la IA
     arranca la partida sin fichas (beginTurn propio aun no ocurrio). */
  E._raw().players[1].illumTokens = 1;
  give(1, bribe);
  injectRollWindow({ pid: 0, success: true, responders: [respObj(1, bribe)] });
  AI.settleWindows(E);
  ok(E._raw().pendingRoll == null, 'la ventana se cerro (nadie humano por reaccionar)');
  ok(!handHas(1, bribe), 'la Bribery SALIO de la mano de la IA (la gasto)');
})();

console.log('T3 - ataque PROPIO de la IA exitoso: la IA PASA (no se sabotea) y cierra');
(function () {
  var bribe = cardIxByKind('bribery');
  give(1, bribe);
  injectRollWindow({ pid: 1, success: true, responders: [respObj(1, bribe)] });
  AI.settleWindows(E);
  ok(E._raw().pendingRoll == null, 'la ventana se cerro');
  ok(handHas(1, bribe), 'la Bribery SIGUE en la mano de la IA (paso: ataque propio)');
  E._raw().players[1].hand.pop();
})();

console.log('T4 - suceso con respondedor HUMANO: settleWindows la deja ABIERTA');
(function () {
  var stp = cardIxByKind('stealing_the_plans');
  give(0, stp);
  injectEventWindow({ kind: 'plotDiscarded', byPid: 1, data: { taken: null, cardIdx: 5 }, responders: [respObj(0, stp)] });
  AI.settleWindows(E);
  ok(E._raw().pendingEvent != null, 'la ventana sigue abierta');
  ok(handHas(0, stp), 'la Stealing the Plans del humano sigue en su mano');
  E._raw().pendingEvent = null; E._raw().players[0].hand.pop();
})();

console.log('T5 - descarte ajeno: la IA RECLAMA con Stealing the Plans');
(function () {
  var stp = cardIxByKind('stealing_the_plans');
  var somePlot = -1;
  for (var i = 0; i < C.cards.length; i++) {
    if (C.cards[i].type === 'plot' && i !== stp) { somePlot = i; break; }
  }
  if (somePlot < 0) throw new Error('fixture: no hay segunda Plot en el mazo');
  var grp = -1;
  for (var k = 0; k < C.cards.length; k++) {
    if (C.cards[k].type === 'group' && !C.cards[k].effect && (C.cards[k].power || 0) >= 3) { grp = k; break; }
  }
  if (grp < 0) throw new Error('fixture: no hay grupo sin effect con Poder >= 3');
  var S = E._raw();
  S.plotDiscard.push(somePlot);
  /* El robo cuesta la ACCION de un grupo propio con Poder >= 3 (eff.minPower)
     y firstUsableAid excluye la raiz (la Illuminati no paga por aqui): se
     inyecta un grupo con ficha, como tendria la IA a mitad de partida. */
  S.players[1].structure.children.push({ uid: 'fx-grp-1', cardId: grp, tokens: 1, children: [] });
  give(1, stp);
  injectEventWindow({ kind: 'plotDiscarded', byPid: 0, data: { taken: null, cardIdx: somePlot, byName: 'Humano' }, responders: [respObj(1, stp)] });
  AI.settleWindows(E);
  ok(E._raw().pendingEvent == null, 'la ventana se cerro');
  ok(!handHas(1, stp), 'la Stealing the Plans salio de la mano de la IA');
  ok(handHas(1, somePlot) && S.plotDiscard.indexOf(somePlot) < 0, 'la Plot robada paso del descarte a la mano de la IA');
})();

console.log('T6 - endTurn RECHAZA con ventana de rodadero abierta (guarda Fase 3)');
(function () {
  injectRollWindow({ pid: 0, success: true, responders: [] });
  var threw = null;
  try { E.endTurn(); } catch (e) { threw = e.message; }
  ok(threw && /rodadero/.test(threw), 'endTurn lanzo: ' + threw);
  E._raw().pendingRoll = null;
})();

console.log('T7 - endTurn RECHAZA con ventana de suceso abierta (guarda Fase 3)');
(function () {
  injectEventWindow({ kind: 'plotDiscarded', byPid: 0, data: { taken: null, cardIdx: 5 }, responders: [] });
  var threw = null;
  try { E.endTurn(); } catch (e) { threw = e.message; }
  ok(threw && /suceso/.test(threw), 'endTurn lanzo: ' + threw);
  E._raw().pendingEvent = null;
})();

if (fails) { console.error('\nFALLOS: ' + fails); process.exit(1); }
console.log('\nOK: Fase 3 - ventanas de reaccion');
