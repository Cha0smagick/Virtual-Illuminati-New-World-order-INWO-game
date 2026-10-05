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
/* P1-024 — este test mide si la IA responde a un ataque con AYUDAS, no si el
   motor cierra una ventana de reaccion. Con las manos del reparto real, si a
 * cualquiera le toca una carta de rodadero, `E.resolveAttack()` deja el ataque
 * a medias (ventana abierta) y este test falla al azar: se midio 9 fallos en 120
 * ejecuciones. Mismo remedy que en test_fase2_rules.js — `sealWindows()`:
   * se quitan las cartas que abren ventana para que el escenario sea
   * determinista. Quinta vez que aparece esta clase de fragilidad. */
var WINDOW_KINDS = ['bodyguard', 'talisman', 'bribery', 'computervirus', 'murphyslaw',
                    'timewarp', 'mistakenidentity', 'mothersmarch',
                    'stealing_the_plans', 'embezzlement'];
(function sealWindows() {
  var S = E._raw();
  S.players.forEach(function (p) {
    p.hand = p.hand.filter(function (ix) {
      var e = C.cards[ix] && C.cards[ix].effect;
      return !(e && WINDOW_KINDS.indexOf(e.kind) >= 0);
    });
  });
})();
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
/* P1-147: sellarVentanas() cierra cualquier ventana abierta (tirada pendiente,
 * suceso pendiente, ataque pendiente). El montaje deja ventanas abiertas de
 * forma ALEATORIA (un takeover puede abrir un ataque automatico y otro no, segun
 * el reparto), y E.declareAttack() exige fase principal: sin este sello el test
 * fallaba con "declareAttack lanzó -> Fuera de la fase principal" en ~3/80
 * corridas. Es el mismo contrato que usan los helpers sealWindows() de
 * test_fase2_rules.js. */
function sellarVentanas() {
  var n = 0;
  while (n++ < 8) {
    var s = E.getState();
    /* phase 'begin' == ventana de COMIENZO DE TURNO abierta (engine.js:7362 deja
     * S.phase='begin' y espera a E.resolvePendingTurnStart). Es la que bloqueaba el
     * montaje: sin sellarla, cederTurno() se negaba a ceder y el turno se quedaba
     * en el rival, luego E.declareAttack(0,...) lanzaba "Fuera de la fase principal". */
    if (s.pendingTurnStart) { E.resolvePendingTurnStart({}); continue; }
    if (s.pendingRoll) { E.resolvePendingRoll(); continue; }
    if (s.pendingEvent) { E.resolvePendingEvent(); continue; }
    if (s.pendingAttack) { E.resolvePendingAttack(); continue; }
    break;
  }
  return E.getState().phase;
}
seedBothSides();
sellarVentanas();

/* Vuelve al turno del humano para que sus grupos recuperen el token.
 * P1-147: el guard de fase NO es cosmetico. seedBothSides() puede salir con
 * `phase !== 'main'` (devuelve en su linea 76) cuando un takeover o un ataque
 * dejan una ventana abierta; entonces E.endTurn() lanza "No se puede terminar
 * un turno fuera de la fase principal". Era un FLAKE de 1/40 corridas: el
 * reparto aleatorio decide si el ultimo turno planting deja ventana abierta.
 * Con el guard, la linea solo cede el turno cuando CEDERLO es legal. */
if (!onTurn(0) && !E.getState().gameover && E.getState().phase === 'main') E.endTurn();
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

/* Ciclo completo de turnos: repone el Action token del atacante.
 * P1-147: cedeTurno() solo llama a E.endTurn() cuando CEDERLO es legal
 * (fase principal y partida viva). Sin el, las tres llamadas de este bloque
 * lanzaban "No se puede terminar un turno fuera de la fase principal" cuando
 * el reparto aleatorio dejaba una ventana abierta: flake medido de 4/60. */
function cederTurno() {
  sellarVentanas();
  var s = E.getState();
  if (s.gameover || s.phase !== 'main') return false;
  E.endTurn();
  return true;
}
var guard = 0;
while (strongNode && !(strongNode.tokens >= 1) && !E.getState().gameover && guard++ < 6) {
  if (!cederTurno()) break;
  if (!cederTurno()) break;
}
if (E.getState().currentPid !== 0 && !E.getState().gameover) cederTurno();

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

/* P1-147: antes de declarar el ataque hay que devolver la partida a la fase
 * principal: el ciclo de turnos anterior puede haber dejado una ventana. */
sellarVentanas();
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
