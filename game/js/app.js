/* INWO App — orquestador (Sisyphus self-build). Depende de: INWO_CARDS, Engine, AI, UI */
(function () {
'use strict';

var E = window.Engine;

function log(m) { window.UI.log(m); }
function refresh() {
  var st = E.getState();
  window.UI.render(st);
  return st;
}

function baseOf(id) { return String(id || '').replace(/\d+$/, ''); }

function concreteIds(bases) {
  var avail = E.availableIlluminati();
  return bases.map(function (b) {
    var hit = avail.filter(function (c) { return baseOf(c.id) === b; })[0];
    if (!hit) throw new Error('Illuminati no disponible: ' + b);
    return hit.id;
  });
}

var busyAI = false;
var respKey = null, respDone = {}, aiPending = null, respTimer = null;

function humanPid() {
  var st = E.getState();
  for (var i = 0; i < st.players.length; i++) if (st.players[i].human) return i;
  return -1;
}

/* The player who is allowed to SUPPORT the attack under way.
   Must NOT be the attacker: engine.addSupport rejects pid===A.pid and rejects a
   group the pid does not own. In hot-seat (2 humans) humanPid() always returns 0,
   so when player 1 attacked, player 0's own groups could never be used to aid or
   oppose, and self-defend was impossible. This mirrors stepResp()'s iteration:
   first human that is not the attacker. */
function responderPid() {
  var st = E.getState();
  var A = st.attack;
  for (var i = 0; i < st.players.length; i++) {
    if (A && i === A.pid) continue;
    if (st.players[i].human) return i;
  }
  return -1;
}

var CB = {
  onDrawPlot: function () { E.drawPlot(E.getState().currentPid); after('Robas una carta de Plot'); },
  onDrawGroup: function () { E.drawGroup(E.getState().currentPid); after('Robas una carta de Grupo'); },
  onExchangeIllum: function () { E.exchangeForPlot(E.getState().currentPid, { illum: true }); after('Intercambio ★ por Plot'); },
  onExtraGroupDraw: function () { E.illumDrawGroup(E.getState().currentPid); after('Acción Illuminati: draw extra'); },
  onAutoTakeover: function (handIdx, parentUid) { E.autoTakeover(E.getState().currentPid, handIdx, parentUid); after('Takeover automático'); },
  onPlayResource: function (handIdx) { E.playResource(E.getState().currentPid, handIdx); after('Recurso jugado'); },
  onPlayPlot: function (handIdx, targetUid) { E.playPlot(E.getState().currentPid, handIdx, targetUid); after('Plot jugado'); },
  /* P1-010: una carta Goal no se juega, se REVELA al declarar victoria. Si el
     objetivo no se cumple la carta vuelve a la mano expuesta, asi que el
     intento nunca se pierde: solo se gasta la exposicion. */
  onDeclareGoalVictory: function (handIdx) {
    var r = E.declareGoalVictory(E.getState().currentPid, handIdx);
    if (r && r.lastGoalAttempt) {
      var a = r.lastGoalAttempt;
      if (a.met) after('\u{1F3C6} \u00A1VICTORIA! Carta Goal: ' + a.card);
      else log('\u26A0 La carta Goal ' + a.card + ' queda EXPUESTA en tu mano (ya no podras usarla para ganar).');
    }
    after('Carta Goal revelada');
  },
  onDiscard: function (ix) { E.discardCard(E.getState().currentPid, ix); after('Carta descartada'); },
  onDeclareAttack: function (type, attackerUid, tgt) {
    E.declareAttack(E.getState().currentPid, type, { attackerUid: attackerUid, uid: tgt.uid, handIdx: tgt.handIdx });
    try {
      var d = E.previewStrength();
      log('\u{1F3B2} Ataque montado: necesitas sacar ' + d.total + ' o MENOS con dos dados (solo un 11 o un 12 falla). Con ' + d.total + ' de fuerza, ganas casi siempre.');
      var ns = d.notes || [];
      if (ns.length) log('   En n\u00FAmeros: ' + ns.join(' \u00B7 '));
      log('   \u{1F4A1}\u00BFDudas? El bot\u00F3n \u00AB+10\u00BB refuerza tu ataque antes de tirar.');
    } catch (e) { log('⚠ No se pudo calcular la fuerza del ataque: ' + e.message); }
    after('Ataque declarado (' + type + ')');
  },
  onSupport: function (entry) { E.addSupport(responderPid(), entry); after(entry.oppose ? 'Te opones' : 'Ayudas al ataque'); },
  onSelfDefend: function () { E.addSupport(responderPid(), { selfDefend: true }); after('Defensa propia (Power×2)'); },
  onResolveAttack: function () {
    E.resolveAttack();
    var lr = null; try { lr = E.getState().lastResultText; } catch (e) {}
    after(lr ? ('🎲 ' + lr) : 'Ataque resuelto');
  },
  /* P1-016 — Cierre de la ventana de reacción. Si un Assassination quedó
     anunciado (porque alguien tiene un Bodyguard o un Talisman en la mano), el
     ataque NO se resuelve solo: hace falta una acción explícita. Sin este botón
     la partida se queda colgada, porque onPlayPlot nunca resolvía. */
  onResolvePendingAttack: function () {
    var st = E.resolvePendingAttack();
    var r = st.lastPlotResult || {};
    if (r.cancelled) after('❌ ' + (r.reason || 'ataque cancelado'));
    else if (r.pending === undefined && r.ok === false && r.reason) after('❌ ' + r.reason);
    else after((r.ok ? '✅ ' : '❌ ') + (r.plot || 'Ataque instantáneo') + ' vs ' + (r.target || '?') +
               ' · fuerza ' + (r.strength != null ? r.strength : '?') +
               ' · dados ' + (r.roll != null ? r.roll : 'sin tirada') +
               (r.ok ? ' · ÉXITO' : ' · ' + (r.reason || 'fallo')));
  },
  /* P1-016 — Una carta de cancelación no elige objetivo: protege a la carta que
     el ataque iba a matar. Por eso el motor no necesita targetUid. */
  onPlayCancelCard: function (handIdx) {
    try { E.playPlot(E.getState().currentPid, handIdx); after('Carta de cancelación jugada'); }
    catch (e) { log('⚠ ' + e.message); }
  },
  /* P1-024 — Una carta de RODADERO tampoco elige objetivo: modifica el numero
     que ya salio, no a quien se ataca. Ojo con el doble paso: jugar la carta
     MODIFICA el rodadero pero la ventana sigue ABIERTA, porque varias cartas
     pueden encadenarse. El cierre es un boton aparte (onResolvePendingRoll). */
  onPlayRollCard: function (handIdx) {
    try { E.playPlot(E.getState().currentPid, handIdx); after('Carta de rodadero jugada'); }
    catch (e) { log('⚠ ' + e.message); }
  },
  onResolvePendingRoll: function () {
    var st = E.resolvePendingRoll();
    var r = st.lastPlotResult || {};
    if (r.cancelled) after('⚠ ' + (r.reason || 'rodadero anulado'));
    else if (r.reroll) after('🔁 ' + (r.plot || 'Carta de rodadero') + ': ' + (r.reason || 'se repite el rodadero'));
    else if (r.mod) after('🎲 ' + (r.plot || 'Carta de rodadero') + ': el rodadero pasa de ' + r.from + ' a ' + r.roll);
    else after((r.ok ? '✔ ' : '✖ ') + (r.plot || 'Ataque') + ' vs ' + (r.target || '?') +
               ' · fuerza ' + (r.strength != null ? r.strength : '?') +
               ' · dados ' + (r.roll != null ? r.roll : 'sin tirada'));
  },
  onBoost: function (idx, toDefense) { try { E.addBoost(E.getState().currentPid, idx, toDefense); after('📜 Plot +10 añadido al ataque'); } catch (e) { log('⚠ ' + e.message); } },
  /* P1-026 — el ataque privilegiado. Lo declara el ATACANTE sobre su propio
     ataque, y solo antes de que nadie participe. */
  onTogglePrivilege: function () {
    try { E.togglePrivilege(); after('Ataque declarado PRIVILEGIADO: nadie mas puede ayudar ni oponerse'); }
    catch (e) { log('! ' + e.message); }
  },
  /* P1-027 — cartas de la ventana de SUCESO. Mismo contrato de dos pasos que
     §37: jugar la carta NO cierra la ventana; cerrar es otro boton. */
  onPlayEventCard: function (handIdx, opts) {
    try { E.playPlot(E.getState().currentPid, handIdx, null, opts || {}); after('Carta de suceso jugada: ahora aplica el resultado'); }
    catch (e) { log('! ' + e.message); }
  },
  /* L8a — 361/388/411 (deck_manip). `opts` trae lo que el jugador eligio en el menu
     de showDeckMenu: `{n}` para la cima del mazo, `{handIx}` para las cartas de la
     mano y `{bonusUids}` para los grupos que reciben el token extra. Se pasan como
     4º argumento igual que onPlayEventCard; el objetivo de mesa es `null` porque estas
     cartas no tienen un grupo OBJETIVO (los que reciben el token se eligen a mano y ya
     viajan dentro de `opts`). */
  onPlayDeckManip: function (handIdx, opts) {
    try { E.playPlot(E.getState().currentPid, handIdx, null, opts || {}); after('Plot de manipulacion de mazo jugado'); }
    catch (e) { log('! ' + e.message); }
  },
  onResolvePendingEvent: function () {
    var st = E.resolvePendingEvent();
    var r = st.lastPlotResult || {};
    if (r.stolen) after((r.ok ? '✔ ' : '⚠ ') + (r.by ? r.by + ' se queda con ' : '') + r.stolen +
      (r.paid ? ' (paga con ' + r.paid + ')' : ''));
    else after((r.ok ? '✔ ' : '⚠ ') + (r.reason || 'suceso resuelto'));
  },
  /* L8b — 233 Crystal Skull / 367 Shroud of Turin (draw_hook). A diferencia de las otras
     tres ventanas, aqui `act` NO es "aplicar lo que ya decidio una carta": es la ELECCION
     en si. El robo ya se aplazo y las cartas ya salieron del mazo, asi que cada boton de
     la barra llama directamente a este callback con su respuesta: `{pick,rest}` para 233
     (que carta de las tres te quedas, y las otras dos arriba o abajo) o `{take}` para 367
     (la de cima o la del fondo sin mirar). El mensaje se deriva del propio log del motor
     porque el motor ya lo explica con el nombre de las cartas concretas. */
  onResolveDraw: function (act) {
    try { E.resolvePendingDraw(act || {}); after('Eleccion de robo resuelta'); }
    catch (e) { log('! ' + e.message); }
  },
  /* L8c — 405 Unlucky 13: la ventana de comienzo de turno se cierra desde aqui.
   * El play usa humanPid(), NO currentPid: durante la ventana currentPid apunta
   * al jugador cuyo turno va a empezar (el objetivo), no al que reacciona. */
  /* L8c/L14 — la ventana de comienzo de turno se cierra desde aqui, y ahora la
   * comparten 405 Unlucky 13 y 364 Seize the Time!.
   * El play usa humanPid(), NO currentPid: durante la ventana el motor ya ha
   * movido currentPid al jugador cuyo turno va a empezar (engine.js: S.currentPid=next
   * al abrir la ventana), o sea el OBJETIVO, no el que reacciona.
   * cardId solo se usa para el texto del registro: el motor valida la carta por si
   * misma y su error (si lo hay) llega al registro por el catch, no por aqui. */
  onTurnStartPlay: function (handIdx, cardId) {
    var nm = cardId === 'seizethetime' ? 'Seize the Time!' : (cardId === 'unlucky13' ? 'Unlucky 13' : 'la carta');
    try { E.playPlot(humanPid(), handIdx, null, {}); after(nm + ' jugada en el comienzo del turno'); }
    catch (e) { log('! ' + e.message); }
  },
  onTurnStartPass: function () {
    try { E.resolvePendingTurnStart({ pass: true }); after('Los rivales dejan pasar el comienzo del turno'); }
    catch (e) { log('! ' + e.message); }
  },
  /* L9 — 332 Orbital Mind Control Lasers. La ventana la abre E.useGadgetAction y
   * la cierra E.resolveAlignEdit. Aqui NO se elige grupo ni alineacion: eso ya lo
   * ha hecho la UI (pick + selects), asi que solo se reenvia la decision. Usamos
   * currentPid (NO humanPid) porque `useGadgetAction` exige requireOwnMain: el
   * Gadget solo se puede usar en TU turno, a diferencia de la ventana de 405. */
  /* L11 - JUGAR UN DUPLICADO DESDE LA MANO (220/227/287/309). La habilitadora y el
     duplicado se juegan en UNA SOLA llamada: el texto de las 4 cartas dice "Used
     this card WHEN YOU PLAY, from your hand, ...", asi que no hay ventana de
     reaccion y no hace falta settler en la IA. El motor devuelve los errores
     oficiales (falta de original, de alcance o de coste) y aqui se muestran. */
  onPlayDuplicate: function (dupIdx, enablerIdx, parentUid) {
    try {
      E.playGroupFromHand(E.getState().currentPid, dupIdx, enablerIdx, parentUid);
      after('Duplicado jugado');
    } catch (e) { log('! ' + e.message); }
  },
  onUseGadgetAction: function (resourceUid) {
    try { E.useGadgetAction(E.getState().currentPid, { resourceUid: resourceUid }); after('Accion de Gadget abierta'); }
    catch (e) { log('! ' + e.message); }
  },
  onResolveAlignEdit: function (act) {
    try { E.resolveAlignEdit(act || {}); after(act && act.pass ? 'Gadget no usado' : 'Alineacion editada'); }
    catch (e) { log('! ' + e.message); }
  },
  /* L12 / P1-083 - 378 Suicide Squad. Abre y cierra la ventana de la accion de un
   * Resource ya en juego. El objetivo NO lo elige el motor: se abre una ventana y el
 * jugador elige cual de los Resources del rival destruir (DoD 6). El catch es el
 * mismo patron que onUseGadgetAction/onResolveAlignEdit, para que un rechazo por
 * regla del motor llegue al registro y no solo a la consola (P1-076). */
  onUseResDestroy: function (resourceUid) {
    try { E.useResDestroy(E.getState().currentPid, { resourceUid: resourceUid }); after('Accion de Resource abierta'); }
    catch (e) { log('! ' + e.message); }
  },
  onResolveResDestroy: function (act) {
    try { E.resolveResDestroy(act || {}); after(act && act.pass ? 'Resource no usado' : 'Dado tirado'); }
    catch (e) { log('! ' + e.message); }
  },
  /* L13 / P1-091 - 245 Earthquake Projector. Su impreso dice 'This device can act
   * once per turn. It can increase the Power of any Attack to Destroy a Place, or
   * of any Disaster card, by 2. Gadget ACTION': el objetivo es CUALQUIER ataque, no
   * una carta concreta, asi que el motor lo aplica al proximo Disaster/ataque a
   * destruir que se anuncie y NO abre ventana de eleccion. Aqui solo se le da al
   * jugador el boton que ejecuta la accion (lo pone chipAct en el panel de
   * Resources). El catch es el mismo patron que onUseResDestroy: un rechazo por
   * regla del motor llega al registro y no solo a la consola (P1-076). */
  onUseDisasterBoost: function (resourceUid) {
    try { E.useDisasterBoost(E.getState().currentPid, { resourceUid: resourceUid }); after('Earthquake Projector se activa: +2 al Poder del proximo ataque'); }
    catch (e) { log('! ' + e.message); }
  },
  onMoveGroup: function (uid, newParentUid) { E.moveGroup(E.getState().currentPid, uid, newParentUid); after('Grupo movido'); },
  onEndTurn: function () { endTurnFlow(); }
};

function after(msg) {
  if (msg) log(msg);
  var st = refresh();
  if (checkOver(st)) return;
  if (st.attack && !st.attack.resolved) { scheduleResponses(); return; }
  if (respKey !== null) { respKey = null; resumeAfterAttack(); return; }
  maybeRunAI();
}

/* ---- control de velocidad (espectador IA vs IA y ritmo general) ---- */
var SPEEDS = [1, 2, 4];
var speedIx = 0;
try { speedIx = parseInt(localStorage.getItem('inwo_speed') || '0', 10) || 0; } catch (e) {}
if (!(speedIx >= 0 && speedIx < SPEEDS.length)) speedIx = 0;
function isSpec() { try { return E.getState().players.every(function (p) { return !p.human; }); } catch (e) { return false; } }
function D(ms) {
  var f = SPEEDS[speedIx];
  var base = isSpec() ? 4000 : 380;
  return Math.max(120, Math.round(ms * base / 1000 / f));
}
function ensureSpeedBtn() {
  var help = document.getElementById('helpBtn');
  if (!help || document.getElementById('speedBtn')) return;
  var b = document.createElement('button');
  b.id = 'speedBtn'; b.className = 'spdbtn';
  b.title = 'Velocidad de juego de la IA';
  function lbl() { b.textContent = '\u23F1 \u00D7' + SPEEDS[speedIx]; }
  b.onclick = function () { speedIx = (speedIx + 1) % SPEEDS.length; try { localStorage.setItem('inwo_speed', String(speedIx)); } catch (e) {} lbl(); };
  lbl();
  help.parentNode.insertBefore(b, help);
}
/* ---- ventana de reacciones: IA responde a ataques humanos y viceversa ---- */
function scheduleResponses() {
  var st = E.getState();
  var A = st.attack;
  if (!A || A.resolved || st.phase === 'gameover') return;
  if (respKey !== A.id) { respKey = A.id; respDone = {}; }
  clearTimeout(respTimer);
  stepResp();
  function stepResp() {
    var s = E.getState(), a = s.attack;
    if (!a || a.resolved) return;
    for (var q = 0; q < s.players.length; q++) {
      if (q === a.pid) continue;
      if (respDone[a.id + '_' + q]) continue;
      if (s.players[q].human) return; /* espera los botones del humano */
      respDone[a.id + '_' + q] = true;
      respTimer = setTimeout(function () {
        try { window.AI.respond(E, q); } catch (e) { log('⚠ IA reacción: ' + e.message); }
        refresh();
        scheduleResponses();
      }, D(500));
      return;
    }
    /* todos los demás ya reaccionaron */
    if (!s.players[a.pid].human) {
      respTimer = setTimeout(function () {
        try { E.resolveAttack(); } catch (e) { log('⚠ resolver: ' + e.message); }
        resumeAfterAttack();
      }, D(1100));
    }
    /* atacante humano: resuelve con el botón RESOLVER ▶ */
  }
}
function resumeAfterAttack() {
  /* Any AI respond-timer queued by scheduleResponses() is now obsolete: the
     attack is over. It used to survive and fire later against an unrelated game
     state, injecting a support for a player who was no longer defending. */
  if (respTimer != null) { clearTimeout(respTimer); respTimer = null; }
  var st = refresh();
  if (checkOver(st)) return;
  if (aiPending != null) {
    var p = aiPending; aiPending = null;
    finishAITurn(p);
  } else {
    maybeRunAI();
  }
}

function checkOver(st) {
  if (st.phase === 'gameover' && st.winner) {
    var names = (st.winner.pids || []).map(function (p) { return st.players[p] ? st.players[p].name : p; }).join(' & ');
    window.UI.showGameOver((names || 'Alguien') + ' gana: ' + (st.winner.how || ''), st);
    return true;
  }
  return false;
}

function endTurnFlow() {
  try {
    /* IMPORTANTE: E.endTurn() YA avanza currentPid y hace beginTurn del siguiente.
       Nunca volver a llamar beginTurn aquí (bug histórico de doble avance). */
    E.endTurn();
    afterAdvance();
  } catch (e) { log('⚠ ' + e.message); refresh(); }
}

function afterAdvance() {
  var st = refresh();
  if (checkOver(st)) return;
  var cur = st.players[st.currentPid];
  if (!cur) return;
  /* L8c — 405: igual que maybeRunAI: la ventana de comienzo de turno bloquea el
   * turno del proximo jugador; endTurn abre la ventana y retorna sin beginTurn,
   * asi que aqui el turno del IA no puede arrancar todavia (P1-047). */
  if (st.pendingTurnStart) return;
  if (!cur.human) { runAI(st.currentPid); return; }
  if (countHumans(st) > 1) window.UI.showCurtain('Pasa el dispositivo a ' + cur.name, function () { refresh(); });
}

function countHumans(st) { return st.players.filter(function (p) { return p.human; }).length; }

function needsHuman(st) {
  var A = st.attack;
  if (!A) return false;
  for (var q = 0; q < st.players.length; q++) if (q !== A.pid && st.players[q].human) return true;
  return false;
}

function runAI(pid) {
  if (busyAI) return;
  busyAI = true;
  setTimeout(function () {
    try {
      var st = E.getState();
      if (st.phase === 'gameover') { busyAI = false; return; }
      window.AI.takeTurn(E, pid);
      st = E.getState();
      if (st.attack && !st.attack.resolved && needsHuman(st)) {
        /* la IA dejó un ataque abierto esperando tu reacción */
        aiPending = pid; busyAI = false; refresh(); scheduleResponses(); return;
      }
      finishAITurn(pid);
    } catch (e) { busyAI = false; log('⚠ IA: ' + e.message); refresh(); }
  }, D(350));
}

function finishAITurn(pid) {
  busyAI = false;
  try {
    var st = E.getState();
    if (st.phase === 'gameover') { checkOver(refresh()); return; }
    if (st.attack && !st.attack.resolved) { try { E.resolveAttack(); } catch (e) { log('⚠ IA no pudo resolver el ataque: ' + e.message); } }
    /* L8b — ultima puerta antes de terminar: `E.endTurn` rechaza si queda una
       eleccion de robo abierta (233/367). `settleWindows` ya la cierra en cada
       contacto con el motor, asi que esto solo puede saltar si un camino futuro
       se olvida; sin esta linea la partida se quedaria atascada en silencio,
       porque el throw cae en el catch de abajo y solo loguea. */
    if (window.AI && window.AI.settleDraw) { try { window.AI.settleDraw(E); } catch (e) { log('⚠ IA no pudo resolver su eleccion de robo: ' + e.message); } }
    /* E.endTurn avanza y hace beginTurn del siguiente él mismo */
    E.endTurn();
    afterAdvance();
  } catch (e) { busyAI = false; log('⚠ IA fin de turno: ' + e.message); refresh(); }
}

function maybeRunAI() {
  var st = E.getState();
  if (st.phase === 'gameover' || busyAI) return;
  /* L8c — 405: la ventana de comienzo de turno bloquea el turno del proximo
   * jugador hasta que el humano decida. Sin esta guarda runAI arrancaria el
   * turno del IA con la ventana abierta y 405 seria injugable (P1-047). */
  if (st.pendingTurnStart) return;
  var cur = st.players[st.currentPid];
  if (cur && !cur.human) runAI(st.currentPid);
}

function start(mode, bases) {
  try {
    window.UI.init(CB);
    ensureSpeedBtn();
    /* reinicio blindado: sin residuos de partidas anteriores */
    try {
      clearTimeout(respTimer); respTimer = null; respKey = null; respDone = {};
      aiPending = null; busyAI = false;
      document.body.classList.remove('spectate');
      var ovz = document.getElementById('overlays'); if (ovz) ovz.innerHTML = '';
      ['hdrBtns','board','handCards','actionBtns','logLines'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      if (window.UI.resetForNewGame) window.UI.resetForNewGame();
    } catch (e) {}
    window.UI.showSetupScreen({
      illuminati: [],
      onStart: function (m, pickedBases) {
        var players;
        if (m === 'hot-seat') players = [{ name: 'Jugador 1', human: true }, { name: 'Jugador 2', human: true }];
        else if (m === 'ai-vs-ai') players = [{ name: 'IA-1', human: false }, { name: 'IA-2', human: false }];
        else players = [{ name: 'Jugador 1', human: true }, { name: 'IA', human: false }];
        E.newGame(players);
        var ids = concreteIds(pickedBases);
        E.setIlluminati(0, ids[0]);
        E.setIlluminati(1, ids[1]);
        E.startGame();
        document.body.classList[m === 'ai-vs-ai' ? 'add' : 'remove']('spectate');
        document.body.classList.add('ingame');
        log('Partida iniciada: modo ' + (m === 'vs-ai' ? 'Humano vs IA' : (m === 'ai-vs-ai' ? 'IA vs IA (espectador)' : 'Hot-seat')));
        refresh();
        /* tutorial primero; la partida arranca SOLO al pulsar «¡ENTENDIDO, A JUGAR!» */
        window.UI.showHowTo(function () { refresh(); maybeRunAI(); });
      }
    });
  } catch (e) { alert('Error al iniciar: ' + e.message); }
}

window.App = { start: start };
})();
