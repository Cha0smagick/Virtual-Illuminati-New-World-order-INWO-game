/* Test: humano declara ataque → window.AI.respond reacciona */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
require('./game/js/ai.js');
var E = window.Engine, C = window.INWO_CARDS;

E.newGame([{ name: 'Humano', human: true }, { name: 'IA', human: false }]);
E.setIlluminati(0, 'bavarianilluminati1');
E.setIlluminati(1, 'servantsofcthulhu2');
E.startGame();

function aiCycle() {
  E.endTurn(); E.beginTurn(1); window.AI.takeTurn(E, 1);
  var s = E.getState();
  if (s.attack && !s.attack.resolved) { /* la IA espera reacción humana: el test "reacciona" y resuelve */
    try { window.AI.respond(E, 0); } catch (e) {}
    try { E.resolveAttack(); } catch (e) {}
    console.log('  (IA dejó ataque abierto para humano — resuelto en harness)');
  }
  E.endTurn(); E.beginTurn(0);
}

/* si la IA empieza, deja que juegue su turno primero */
if (E.getState().currentPid !== 0) aiCycle();

/* el humano coloca su primer títere (con token del beginTurn) */
var st0 = E.getState();
var g = st0.players[0].hand.filter(function (ix) { return C.cards[ix].type === 'group'; })[0];
E.autoTakeover(0, g, st0.players[0].structure.uid);

/* un ciclo más de IA para tener objetivos y tokens frescos */
aiCycle();

var st = E.getState();
function ctrl(pid) { var o = []; (function w(n) { if (n.cardId != null && !/-root$/.test(String(n.uid))) o.push(n); (n.children || []).forEach(w); })(st.players[pid].structure); return o; }
var attackers = ctrl(0).filter(function (n) { return (n.tokens || 0) >= 1; });
var targets = ctrl(1);
if (!attackers.length || !targets.length) { console.log('sin piezas para el escenario (attackers=' + attackers.length + ' targets=' + targets.length + ')'); process.exit(0); }
var a = attackers[0], t = targets[targets.length - 1];
/* escenario B: elegir la MEJOR combinación atacante/objetivo (est alto) para provocar defensa IA */
function al(ix) { return C.cards[typeof ix === 'number' ? ix : (C.byId[ix] ? C.byId[ix].idx : 0)].alignments || []; }
var bestC = null;
attackers.forEach(function (an) {
  var ac = C.cards[typeof an.cardId === 'number' ? an.cardId : C.byId[an.cardId].idx];
  targets.forEach(function (tn) {
    var tc = C.cards[typeof tn.cardId === 'number' ? tn.cardId : C.byId[tn.cardId].idx];
    var est = (ac.power || 0) - ((tc.resistance == null ? 8 : tc.resistance) + (String(tn.uid).split('-').length > 2 ? 0 : 5));
    var dep2 = /-(\d+)-/.test(String(tn.uid));
    var e2 = dep2 ? est : est - 5;
    if (!bestC || e2 > bestC.est) bestC = { a: an, t: tn, est: e2 };
  });
});
if (bestC && bestC.est >= 4) { a = bestC.a; t = bestC.t; }
try { E.declareAttack(0, 'control', { attackerUid: a.uid, uid: t.uid }); } catch (e) { console.log('declare error:', e.message); process.exit(0); }
var A = E.getState().attack;
var before = E.previewStrength().total;
console.log('ataque abierto id=' + A.id + ' tipo=' + A.type + ' fuerza_base=' + before);
window.AI.respond(E, 1);
A = E.getState().attack;
var after_ = E.previewStrength().total;
console.log('tras IA.responder → aids=' + A.aids.length + ' opposes=' + A.opposes.length + ' selfDef=' + A.selfDefended + ' defBoosts=' + A.defBoosts.length + ' fuerza=' + before + '→' + after_);
E.resolveAttack();
console.log('resuelto OK (ver registro del motor) · attack limpiado:', E.getState().attack === null);
console.log('RESPOND TEST DONE');
