/* Test: humano declara ataque → window.AI.respond reacciona
 *
 * Gate de calidad: este test NUNCA debe terminar sin comprobar nada.
 * Antes terminaba con `process.exit(0)` cuando no lograba montar el
 * escenario ("sin piezas"), de modo que un fallo silencioso del motor
 * pasaba por verde. Ahora el montaje es determinista y la ausencia de
 * piezas es un FALLO explícito.
 */
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

/* --- Utilidades de estructura ---------------------------------------- */
function nodesOf(pid) {
  var out = [];
  (function w(n) {
    if (n.cardId != null && !/-root$/.test(String(n.uid))) out.push(n);
    (n.children || []).forEach(w);
  })(E.getState().players[pid].structure);
  return out;
}
function hasToken(pid) { return nodesOf(pid).some(function (n) { return (n.tokens || 0) >= 1; }); }
function onTurn(pid) { var s = E.getState(); return !s.gameover && s.phase === 'main' && s.currentPid === pid; }

/* Coloca un grupo de la mano del jugador `pid` bajo su propia raíz.
   Devuelve true si consequentemente existe ≥1 pieza. */
function placeGroup(pid) {
  var s = E.getState();
  var hand = s.players[pid].hand;
  var gh = hand.filter(function (ix) { var c = C.cards[ix]; return c && c.type === 'group' && (c.power || 0) > 0; })[0];
  if (gh == null) {
    try { E.drawGroup(pid); } catch (e) { return nodesOf(pid).length > 0; }
    return placeGroup(pid);
  }
  try { E.autoTakeover(pid, gh, s.players[pid].structure.uid); }
  catch (e) { /* el grupo no se puede colocar aquí: se intentará en otro turno */ }
  return nodesOf(pid).length > 0;
}

/* --- Montaje determinista ---------------------------------------------
   Dos reglas del motor que condicionan el montaje:
   1) twoPlayerGuard: nadie ataca hasta que AMBOS completan un turno.
   2) los grupos PERDEN su Action token al terminar el turno, así que la
      pieza del humano debe colocarse EN SU TURNO. */
function seedBothSides() {
  var budget = 80;
  while (budget-- > 0) {
    var s = E.getState();
    if (s.gameover || s.phase !== 'main') return;
    if (nodesOf(0).length >= 2 && nodesOf(1).length >= 2) return;
    var pid = s.currentPid;
    if (!placeGroup(pid)) { /* sin grupo disponible: cede el turno */ }
    if (onTurn(pid)) E.endTurn();
  }
}
seedBothSides();

/* Vuelve al turno del humano para que sus grupos recuperen el token. */
if (!onTurn(0) && !E.getState().gameover) E.endTurn();
if (onTurn(0) && !hasToken(0)) placeGroup(0);

/* --- Inyección determinista de piezasported ------------------
   El mazo de grupos es fijo, así que las primeras cartas que salen son
   de poder bajo (KKK=2, NASA=4...). Con eso la fuerza del control sale
   negativa y `AI.respond` no tiene nada que reaccionar: el gate pasaba
   en verde SIN ejercitar la defensa. Para que el test sea real se
   inyectan directamente (vía _raw(), igual que test_fase2_rules.js):
     · atacante  = grupo de MAYOR Power
     · objetivo  = grupo de MENOR Resistance
   luego se cicla un turno completo para que `beginTurn` reponga el
   Action token de ambas piezas. */
function groups() {
  return C.cards.filter(function (c) { return c.type === 'group' && c.power != null; });
}
function bestOf(pool, pick) {
  var best = null;
  for (var i = 0; i < pool.length; i++) { if (pick(pool[i], best)) best = pool[i]; }
  return best;
}
var POOL = groups();

/* Inserta `card` en la estructura de `pid` a exactamente `depth` niveles
   bajo la raíz, rellenando con grupos auxiliares.Motivo: `positionBonus()`
   (engine.js) da +10 de defensa a las piezas a profundidad 1 y +5 a
   profundidad 2, así que un objetivo burying más fundo anula esa defensa
   posicional y deja la fuerza de control medible. */
function plantAtDepth(pid, depth, card) {
  var root = E._raw().players[pid].structure;
  var parent = root, filler = 0;
  for (var d = 1; d <= depth; d++) {
    var c = card;
    if (d < depth) {
      c = POOL.filter(function (x) { return (x.power || 0) > 0 && x.idx !== card.idx; })[filler % 3];
      filler++;
    }
    var node = { uid: 'p' + pid + '-seed-' + c.idx + '-d' + d, cardId: c.idx, children: [], tokens: 0 };
    parent.children.push(node);
    parent = node;
  }
  return parent;
}

var strongNode = plantAtDepth(0, 1, bestOf(POOL, function (c, b) { return !b || (c.power || 0) > (b.power || 0); }));
var weakCard = bestOf(POOL, function (c, b) {
  var r = function (x) { return x.resistance == null ? 99 : x.resistance; };
  return !b || r(c) < r(b);
});
var weakNode = plantAtDepth(1, 3, weakCard);
if (strongNode) console.log('inyectado atacante: ' + C.cards[strongNode.cardId].name + ' (poder ' + (C.cards[strongNode.cardId].power || 0) + ')');
if (weakNode) console.log('inyectado objetivo: ' + C.cards[weakNode.cardId].name + ' (resistencia ' + (C.cards[weakNode.cardId].resistance == null ? 99 : C.cards[weakNode.cardId].resistance) + ')');

/* Ciclo completo de turnos: repone el Action token del atacante. */
var guard = 0;
while (strongNode && !(strongNode.tokens >= 1) && !E.getState().gameover && guard++ < 6) {
  E.endTurn(); E.endTurn();
}
if (E.getState().currentPid !== 0 && !E.getState().gameover) E.endTurn();

var st = E.getState();
var attackers = nodesOf(0).filter(function (n) { return (n.tokens || 0) >= 1; });
var targets = nodesOf(1);
if (!attackers.length || !targets.length) {
  console.error('FALLO: no se pudo montar el escenario (attackers=' + attackers.length +
    ' targets=' + targets.length + ' currentPid=' + st.currentPid + ' phase=' + st.phase + ')');
  process.exit(1);
}
console.log('escenario montado: attackers=' + attackers.length + ' targets=' + targets.length +
  ' turno=' + st.currentPid + ' (turn ' + st.turn + ')');

/* Escenario B: se busca la combinación atacante/objetivo con mayor
   fuerza estimada para provocar una defensa real de la IA. */
function pw(n) { return C.cards[n.cardId].power || 0; }
function rs(n) { var r = C.cards[n.cardId].resistance; return r == null ? 8 : r; }
var a = attackers.reduce(function (x, y) { return pw(y) > pw(x) ? y : x; });
var t = targets.reduce(function (x, y) { return rs(y) < rs(x) ? y : x; });
console.log('mejor combinación: atacante=' + C.cards[a.cardId].name + ' (poder ' + pw(a) + ')' +
  ' vs objetivo=' + C.cards[t.cardId].name + ' (resistencia ' + rs(t) + ')');

try {
  E.declareAttack(0, 'control', { attackerUid: a.uid, uid: t.uid });
} catch (e) {
  console.error('FALLO: declareAttack lanzó -> ' + e.message);
  process.exit(1);
}

var A = E.getState().attack;
if (!A) { console.error('FALLO: el ataque no quedó abierto tras declareAttack'); process.exit(1); }
var before = E.previewStrength().total;
console.log('ataque abierto id=' + A.id + ' tipo=' + A.type + ' fuerza_base=' + before +
  ' atacante=' + C.cards[a.cardId].name + ' objetivo=' + C.cards[t.cardId].name);
var DET0 = E.previewStrength();
console.log('desglose inicial: ' + JSON.stringify(DET0.detail || DET0));

window.AI.respond(E, 1);
A = E.getState().attack;
if (!A) { console.error('FALLO: AI.respond cerró el ataque inesperadamente'); process.exit(1); }
var after_ = E.previewStrength().total;
console.log('tras AI.responder → aids=' + A.aids.length + ' opposes=' + A.opposes.length +
  ' selfDef=' + A.selfDefended + ' defBoosts=' + A.defBoosts.length + ' fuerza=' + before + '→' + after_);

E.resolveAttack();
var cleared = E.getState().attack === null;
console.log('resuelto · attack limpiado: ' + cleared);
if (!cleared) { console.error('FALLO: el ataque no se limpió tras resolveAttack'); process.exit(1); }
console.log('RESPOND TEST PASSED');
