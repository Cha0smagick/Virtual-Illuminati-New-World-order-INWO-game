/* test_appflow.js — verifica alternancia estricta de turnos y que la IA ACTÚA
   Simula exactamente la semántica corregida del app.js: endTurn avanza solo. */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
require('./game/js/ai.js');

var E = window.Engine, AI = window.AI;
var assert = function (cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } console.log('ok  - ' + msg); };

E.newGame([{ name: 'Humano', human: true }, { name: 'IA', human: false }]);
var avail = E.availableIlluminati();
E.setIlluminati(0, avail[0].id);
var rest = E.availableIlluminati();
E.setIlluminati(1, rest.find(function (c) { return c.id !== avail[0].id; }).id);
E.startGame();

function groupsOf(pid) {
  var st = E.getState(), n = 0;
  (function w(nd) { if (nd.cardId != null) n++; (nd.children || []).forEach(w); })(st.players[pid].structure);
  return n;
}

var prevPid = null, endTurns = 0, aiActs = 0, aiGroupsBefore = 0;
for (var round = 0; round < 8; round++) {
  var st = E.getState();
  if (st.phase === 'gameover') break;
  var pid = st.currentPid;

  /* alternancia estricta: nunca repetir jugador sin pasar por el otro */
  if (prevPid !== null) assert(pid !== prevPid || st.players.length === 1, 'turno alterna (r' + round + ')');

  if (!st.players[pid].human) {
    /* --- TURNO IA: debe cambiar algo observable --- */
    aiGroupsBefore = groupsOf(pid);
    var tokBefore = st.players[pid].illumTokens + groupsOf(pid); /* señal combinada */
    AI.takeTurn(E, pid);
    st = E.getState();
    if (st.attack && !st.attack.resolved) { try { E.resolveAttack(); } catch (e) {} }
    st = E.getState();
    var tokAfter = st.players[pid].illumTokens + groupsOf(pid);
    if (tokAfter !== tokBefore || groupsOf(pid) !== aiGroupsBefore) aiActs++;
  } else {
    /* --- TURNO HUMANO simulado: takeover legal + fin --- */
    var me = st.players[pid];
    var gIdx = me.hand.find(function (ix) { return window.INWO_CARDS.cards[ix].type === 'group'; });
    if (gIdx != null && !me.autoUsed) {
      try { E.autoTakeover(pid, gIdx, me.structure.uid.replace(/-root$/, '-root')); } catch (e) { /* sin flechas: ok */ }
    }
  }

  /* flags expuestos para la UI */
  var st2 = E.getState(), cur2 = st2.players[st2.currentPid];
  assert(typeof cur2.autoUsed === 'boolean' && typeof cur2.drewPlot === 'boolean', 'flags autoUsed/drewPlot expuestos');

  var beforePid = pid;
  E.endTurn(); /* el motor avanza SOLO — igual que app.js corregido */
  endTurns++;
  var st3 = E.getState();
  if (st3.phase !== 'gameover') {
    assert(st3.currentPid === (beforePid + 1) % 2,
      'endTurn avanza EXACTAMENTE al siguiente (era p' + beforePid + ', ahora p' + st3.currentPid + ') — SIN doble beginTurn');
  }
  prevPid = beforePid;
}

assert(aiActs > 0, 'la IA realizó acciones observables en sus turnos (' + aiActs + ' turnos con cambios)');
console.log('\nAPPFLOW TEST DONE · endTurns=' + endTurns + ' aiActiveTurns=' + aiActs);
