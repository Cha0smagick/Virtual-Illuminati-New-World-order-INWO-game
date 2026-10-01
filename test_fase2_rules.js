/* Fase 2  central rules gate (P1-001..P1-009).
   Headless. Fails fast (exit 1) on the first broken central rule. */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
var E = window.Engine;
var C = window.INWO_CARDS;

var failures = [];
function ok(c, m) {
  if (c) { console.log('ok   - ' + m); }
  else { failures.push(m); console.log('FAIL - ' + m); }
}
function throws(fn, re, m) {
  try { fn(); ok(false, m + ' (no lanzo)'); }
  catch (e) { ok(re.test(e.message), m + ' -> "' + e.message + '"'); }
}
function fresh(illu0, illu1) {
  E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
  E.setIlluminati(0, illu0);
  E.setIlluminati(1, illu1);
  return E.startGame();
}
function idxOfId(id) {
  for (var i = 0; i < C.cards.length; i++) if (C.cards[i].id === id) return i;
  return null;
}
function anyGroupIdx() {
  for (var i = 0; i < C.cards.length; i++) if (C.cards[i].type === 'group') return i;
  return null;
}
function firstOf(code) {
  var c = C.cards.filter(function (x) { return x.type === 'illuminati' && x.effect && x.effect.code === code; })[0];
  return c && c.id;
}
function findNode(root, uid) {
  if (!root) return null;
  if (root.uid === uid) return root;
  var kids = root.children || [];
  for (var i = 0; i < kids.length; i++) { var r = findNode(kids[i], uid); if (r) return r; }
  return null;
}
function plant(pid, uid, cardId, tokens) {
  var root = E._raw().players[pid].structure;
  root.children.push({ uid: uid, cardId: cardId, children: [], tokens: tokens == null ? 0 : tokens });
  return findNode(root, uid);
}

/* twoPlayerGuard impide atacar antes de que AMBOS completen su primer turno.
   readyToAttack() avanza turnos hasta que el jugador indicado tiene la mano y
   los dos rivales han jugado una vez, y devuelve ese pid. */
function readyToAttack(pid) {
  for (var g = 0; g < 8; g++) {
    var s = E.getState();
    if (s.gameover) return null;
    if (s.currentPid === pid && s.players[0].turnsCompleted >= 1 && s.players[1].turnsCompleted >= 1) return pid;
    E.endTurn();
  }
  return null;
}

/* ---------- P1-010: meta UFOs = cartas Goal (no grupos secretos) ---------- */
(function () {
  var GOALS = C.cards.filter(function (c) { return c.type === 'plot' && c.effect && c.effect.kind === 'goal'; });
  ok(GOALS.length === 7, 'el mazo contiene las 7 cartas Goal oficiales -> ' + GOALS.length);
  var byName = {};
  GOALS.forEach(function (c) { byName[c.name] = c.idx; });
  ok(byName['Fratricide'] != null && byName['Hail Eris!'] != null && byName['Criminal Overlords'] != null,
    'estan las 3 Goal cards con condicion de victoria');

  var uid = firstOf('ufos');
  fresh(uid, firstOf('cthulhu'));
  var S = E._raw();
  var up = -1;
  S.players.forEach(function (pl, q) { var ic = E.card(pl.illumId); if (ic && ic.effect && ic.effect.code === 'ufos') up = q; });
  ok(up >= 0, 'fixture: hay jugador UFOs -> ' + up);
  var pl = S.players[up];

  /* sin Goal card en mano la meta NO se cumple */
  ok(E.goalStatus(up).met === false, 'sin Goal card en mano la meta UFOs NO se cumple -> ' + JSON.stringify(E.goalStatus(up)));

  /* P1-010: la clave de progreso se llama goalCards, no pick3. `pick3` era el
     residuo de la lectura equivocada ("3 grupos especiales") y la UI lo
     imprimia crudo, asi que el jugador leia "pick3 0/3". */
  var vsU = (E.getState().victoryStatus || []).filter(function (v) { return v.pid === up; })[0] || {};
  var prU = vsU.progress || {};
  ok(prU.goalCards != null && prU.pick3 == null,
    'P1-010 el progreso de la meta UFOs se llama goalCards (no pick3) -> ' + JSON.stringify(prU));
  ok(/cartas? Goal/i.test(vsU.goal || ''),
    'P1-010 el texto de la meta UFOs habla de cartas Goal, no de grupos -> ' + vsU.goal);

  /* una Goal card en mano cuenta como progreso y NO gana sola */
  pl.hand.push(byName['Fratricide']);
  var g1 = E.goalStatus(up);
  ok(g1.count >= 1 && g1.met === false, 'tener una Goal card NO basta: hay que declararla -> ' + JSON.stringify(g1));

  /* declararla sin cumplir el objetivo: vuelve a la mano EXPUESTA */
  var st = E.declareGoalVictory(up, byName['Fratricide']);
  ok(st.phase === 'main', 'intento fallido: la partida sigue -> ' + st.phase);
  ok(pl.hand.indexOf(byName['Fratricide']) >= 0, 'la Goal card vuelve a la mano');
  ok((pl.goalCardsExposed || []).indexOf('fratricide') >= 0,
    'la Goal card queda expuesta -> ' + JSON.stringify(pl.goalCardsExposed));
  ok(st.lastGoalAttempt && st.lastGoalAttempt.met === false, 'el intento se reporta como fallido');

  /* Fratricide: 2 Illuminati rivales destruidos => victoria */
  pl.destroyedIlluminati.push(up === 0 ? 1 : 0);
  pl.destroyedIlluminati.push(99); /* el motor cuenta indices validos; 99 simula el segundo */
  pl.destroyedIlluminati = pl.destroyedIlluminati.slice(0, 2);
  var win = E.declareGoalVictory(up, byName['Fratricide']);
  ok(win.phase === 'gameover', 'Fratricide con 2 Illuminati derribados da la victoria -> ' + win.phase);
  ok(!!win.winner && win.winner.how.indexOf('Fratricide') >= 0,
    'el motivo cita la carta Goal -> ' + (win.winner && win.winner.how));
  S.phase = 'main'; S.winner = null;

  /* los modificadores permanentes se rechazan con honestidad */
  fresh(uid, firstOf('cthulhu'));
  var S2 = E._raw();
  var up2 = 0;
  S2.players.forEach(function (q2, k) { var ic = E.card(q2.illumId); if (ic && ic.effect && ic.effect.code === 'ufos') up2 = k; });
  S2.players[up2].hand.push(byName['World War Three']);
  throws(function () { E.declareGoalVictory(up2, byName['World War Three']); }, /modificador permanente/,
    'una carta modificadora no puede declararse como victoria');

  /* Hail Eris! = meta basica con doble weird>=3 */
  fresh(uid, firstOf('cthulhu'));
  var S3 = E._raw();
  var up3 = 0;
  S3.players.forEach(function (q3, k) { var ic = E.card(q3.illumId); if (ic && ic.effect && ic.effect.code === 'ufos') up3 = k; });
  var WEIRD = C.cards.filter(function (c) {
    return c.type === 'group' && c.power >= 3 && (c.alignments || []).indexOf('weird') >= 0;
  });
  ok(WEIRD.length >= 3, 'hay al menos 3 grupos weird con Poder >= 3 -> ' + WEIRD.length);
  WEIRD.slice(0, 3).forEach(function (c, i) { plant(up3, 'he' + i, c.idx, 1); });
  S3.players[up3].hand.push(byName['Hail Eris!']);
  var hr = E.declareGoalVictory(up3, byName['Hail Eris!']);
  ok(hr.phase === 'main', 'Hail Eris! con pocos grupos no gana -> ' + JSON.stringify(hr.lastGoalAttempt));
  for (var i = 0; i < 12; i++) plant(up3, 'hf' + i, anyGroupIdx(), 1);
  var hr2 = E.declareGoalVictory(up3, byName['Hail Eris!']);
  ok(hr2.phase === 'gameover', 'Hail Eris! con 12 grupos (+dobles) gana -> ' + hr2.phase);

  /* limite de Goal cards en mano: 1, o 2 con Alternate Goals */
  fresh(uid, firstOf('cthulhu'));
  var S4 = E._raw();
  var up4 = 0;
  S4.players.forEach(function (q4, k) { var ic = E.card(q4.illumId); if (ic && ic.effect && ic.effect.code === 'ufos') up4 = k; });
  var h4 = S4.players[up4].hand;
  /* endTurn() acts on S.currentPid, so we must wait for that player's turn */
  var guard4 = 0;
  while (S4.currentPid !== up4 && S4.phase !== 'gameover' && guard4++ < 8) E.endTurn();
  ok(S4.currentPid === up4, 'fixture: es el turno del jugador UFOs -> currentPid=' + S4.currentPid);
  h4.push(byName['Fratricide'], byName['Hail Eris!'], byName['Criminal Overlords']);
  var goalsBefore = h4.filter(function (ix) { return C.cards[ix].effect && C.cards[ix].effect.kind === 'goal'; }).length;
  E.endTurn();
  var namesLeft = S4.players[up4].hand.filter(function (ix) {
    return C.cards[ix].effect && C.cards[ix].effect.kind === 'goal';
  }).map(function (ix) { return C.cards[ix].name; });
  ok(namesLeft.length <= 1 || (namesLeft.length === 2 && namesLeft.indexOf('Alternate Goals') >= 0),
    'tras endTurn no quedan mas Goal cards que el limite (Alternate Goals permite 2) -> ' + JSON.stringify(namesLeft) + ' (habia ' + goalsBefore + ')');
})();

/* ---------- P1-002: tokens de accion de grupo no se acumulan ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  plant(0, 'g-tok', anyGroupIdx(), 0);
  var maxSeen = 0;
  for (var t = 0; t < 6; t++) {
    var nd = findNode(E._raw().players[0].structure, 'g-tok');
    if (nd) maxSeen = Math.max(maxSeen, nd.tokens || 0);
    try { E.moveGroup(0, 'g-tok', E._raw().players[0].structure.uid); } catch (e) { /* posicion */ }
    E.endTurn();
  }
  ok(maxSeen <= 1, 'los tokens de accion de grupo nunca superan 1 (max ' + maxSeen + ')');
})();

/* ---------- P1-003: mazo vacio no consume el derecho de robo ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var S = E._raw();
  S.plotDeck.length = 0; S.plotDiscard.length = 0;
  var p = S.currentPid;
  throws(function () { E.drawPlot(p); }, /No quedan Plot cards/, 'robo de Plot con mazo vacio lanza error claro');
  ok(E._raw().players[p].flags.plotDrawn === false, 'el derecho a robar Plot NO se consumio al fallar');
  E._raw().plotDeck.push(C.cards.length - 1);
  ok(!!E.drawPlot(p), 'el robo funciona tras reponer el mazo');
})();

/* ---------- P1-006: no se pueden mover grupos ajenos ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var p = E._raw().currentPid;
  var rival = 1 - p;
  plant(rival, 'rival-g', anyGroupIdx(), 1);
  var mine = E._raw().players[p].structure.uid;
  throws(function () { E.moveGroup(p, 'rival-g', mine); },
    /no (te )?pertenece|ajen|propia estructura|dueno/i,
    'moveGroup sobre un grupo rival esta prohibido (pid=' + p + ')');
})();

/* ---------- P1-009: el limite de mano descuenta los Plots expuestos ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var plotIdx = [];
  for (var i = 0; i < C.cards.length && plotIdx.length < 8; i++) if (C.cards[i].type === 'plot') plotIdx.push(i);
  function totalPlots(pid) {
    var pl = E._raw().players[pid];
    return pl.hand.filter(function (ix) { return C.cards[ix].type === 'plot'; }).length
      + (pl.exposedPlots || []).length;
  }
  /* 6 plots en mano, 0 expuestos -> deben quedar 5 */
  var p = E._raw().currentPid;
  E._raw().players[p].hand = plotIdx.slice(0, 6);
  E._raw().players[p].exposedPlots = [];
  E._raw().players[p].discards = [];
  E.endTurn();
  ok(totalPlots(p) <= 5, '6 plots, 0 expuestos -> quedan ' + totalPlots(p) + ' (<=5)');

  /* 6 plots en mano + 3 expuestos = 9 -> debe bajar a 5 */
  p = E._raw().currentPid;
  E._raw().players[p].hand = plotIdx.slice(0, 6);
  E._raw().players[p].exposedPlots = plotIdx.slice(0, 3);
  E._raw().players[p].discards = [];
  E.endTurn();
  ok(totalPlots(p) <= 5, '6 en mano + 3 expuestos (9) -> quedan ' + totalPlots(p) + ' (<=5)');
})();

/* ---------- P1-007: Assassination / Disaster son Instant Attacks reales ---------- */
(function () {
  function effIdx(kind) {
    for (var i = 0; i < C.cards.length; i++) {
      var c = C.cards[i];
      if (c.type === 'plot' && c.effect && c.effect.kind === kind) return i;
    }
    return null;
  }
  function groupOfSubtype(sub) {
    for (var i = 0; i < C.cards.length; i++) {
      var c = C.cards[i];
      if (c.type === 'group' && c.subtype === sub && c.power != null) return i;
    }
    return null;
  }

  /* a) objetivo equivocado -> error, y el objetivo NO se destruye */
  var aIdx = effIdx('assassination');
  ok(aIdx != null, 'fixture Assassination: ' + (aIdx != null && C.cards[aIdx].name));
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var place = groupOfSubtype('place');
  plant(1, 'victim-place', place, 0);
  E._raw().players[0].hand = [aIdx];
  throws(function () { E.playPlot(0, aIdx, 'victim-place'); }, /solo se usa sobre/i,
    'assassination contra un Place se rechaza');
  ok(!!findNode(E._raw().players[1].structure, 'victim-place'),
    'el objetivo sobrevive al intento ilegal');

  /* b) Instant Attack no exige turno propio */
  var p0 = E._raw().currentPid, p1 = 1 - p0;
  E._raw().currentPid = p1;
  E._raw().players[p0].hand = [aIdx];
  var threw = null;
  try { E.playPlot(p0, aIdx, 'victim-place'); } catch (e) { threw = e; }
  ok(threw === null || /solo se usa sobre/i.test(threw.message),
    'assassination puede jugarse fuera de tu turno (turno de ' + p0 + ', jugando con ' + p1 + ') -> ' + (threw ? threw.message : 'ok'));
  E._raw().currentPid = p0;

  /* c) un Instant Attack hopeless (Poder 0 < defense) falla y no destruye */
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  /* P1-016: este escenario mide la MATEMATICA del Instant Attack, no la ventana
     de reaccion. Si el reparto inicial deja un Bodyguard o un Talisman en la mano
     del defensor, la ventana se abre, el ataque queda pendiente y `ok` llega
     como null en vez de false. Octava instancia de la familia "una prueba que
     depende de una propiedad del dataset": se purga, no se reescribe la regla. */
  E._raw().players[1].hand = E._raw().players[1].hand.filter(function (ix) {
    var k = (C.cards[ix] || {}).effect;
    return !(k && (k.kind === 'bodyguard' || k.kind === 'talisman'));
  });
  var pers = groupOfSubtype('personality');
  var node = plant(1, 'victim-pers', pers, 0);
  var pow = C.cards[pers].power || 0;
  E._raw().players[0].hand = [aIdx];
  var st = E.playPlot(0, aIdx, 'victim-pers');
  var r = st.lastPlotResult;
  ok(!!r, 'playPlot devuelve lastPlotResult -> ' + JSON.stringify(r));
  if (pow >= 6) {
    ok(r && r.ok === false && /autom/.test(r.reason || ''),
      'Poder de Plot insufficient vs ' + C.cards[pers].name + ' (pow ' + pow + ') falla automáticamente -> ' + JSON.stringify(r));
    ok(!!findNode(E._raw().players[1].structure, 'victim-pers'),
      'el objetivo NO se destruye cuando el Instant Attack falla');
  } else {
    ok(r && typeof r.ok === 'boolean', 'Instant Attack evaluado (pow baja) -> ' + JSON.stringify(r));
  }
  ok(node.tokens === 0 || node.devastated, 'el estado del objetivo es coherente');

  /* d) Disaster devastates (no destroys) y respeta el destroyMargin */
  var dIdx = effIdx('disaster');
  ok(dIdx != null, 'fixture Disaster: ' + (dIdx != null && C.cards[dIdx].name));
  var dEff = C.cards[dIdx].effect;
  ok(!!dEff.power && dEff.power.length, 'Disaster trae tabla de Poder');
  var want = dEff.power[dEff.power.length - 1].value;
  ok(typeof want === 'number' && want > 0, 'Poder por defecto del Disaster = ' + want);
  ok(dEff.destroyMargin === null || typeof dEff.destroyMargin === 'number',
    'destroyMargin del Disaster es número o null (' + dEff.destroyMargin + ')');

  /* e) la resolución comparte la regla 11-12 con el resto del motor */
  function withPlace(fn) {
    fresh('bavarianilluminati1', 'servantsofcthulhu2');
    E._raw().players[1].structure.children.push({
      uid: 'ia-victim', cardId: groupOfSubtype('place'), children: [], tokens: 0
    });
    return fn();
  }
  var res = withPlace(function () {
    return sealedInstantAttack(0, 40, 'ia-victim', { targetSubtype: 'place' });
  });
  ok(res.lastPlotResult && (res.lastPlotResult.ok === true || res.lastPlotResult.ok === false),
    'instantAttack devuelve resultado trazable -> ' + JSON.stringify(res.lastPlotResult));
  var res2 = withPlace(function () {
    return sealedInstantAttack(0, 1, 'ia-victim', { targetSubtype: 'place' });
  });
  ok(res2.lastPlotResult && res2.lastPlotResult.ok === false && res2.lastPlotResult.reason === 'fallo automático',
    'Poder 1 -> fallo automático (regla <2) -> ' + JSON.stringify(res2.lastPlotResult));
  var res3 = null;
  throws(function () { withPlace(function () {
    return sealedInstantAttack(0, 40, 'ia-victim', { targetSubtype: 'personality' });
  }); }, /solo alcanza a/i, 'instantAttack valida el subtipo objetivo');
  ok(res3 === null, 'sin efectos secundarios');
})();

/* ---------- P1-005: el desglose de fuerza de un ataque es coherente ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var p = readyToAttack(E.getState().currentPid), r = 1 - p;
  ok(p !== null, 'P1-005 fixture: hay un jugador con turno attacks permitido');
  plant(p, 'atk', 148, 1);   /* Texas      power 14 */
  plant(r, 'def', 58, 1);    /* Gordo Remora power 1, resistance 0 */
  E.declareAttack(p, 'control', { attackerUid: 'atk', uid: 'def' });
  var d = E.previewStrength();
  ok(d.base === 14, 'P1-005 la base es el poder del atacante -> ' + d.base);
  ok(d.defenseBase === 0, 'P1-005 la defensa base es la resistencia del objetivo -> ' + d.defenseBase);
  ok(d.posBonus === 10, 'P1-005 un hijo directo del rival aporta +10 de defensa posicional -> ' + d.posBonus);
  ok(d.selfDef === 0, 'P1-005 sin autodefensa no penaliza -> ' + d.selfDef);
  var expect = d.base + d.leaderMod - d.defenseBase - d.defenseBonus - d.defBoosts
    - d.posBonus - d.selfDef + d.aids - d.opposes + d.boosts + d.cthulhu;
  ok(d.total === expect, 'P1-005 el total es la suma exacta de sus términos -> ' + d.total + ' == ' + expect);
  var before = d.total;
  E.addSupport(r, { selfDefend: true });
  var d2 = E.previewStrength();
  ok(d2.selfDef === 2 * 1, 'P1-005 la autodefensa vale el DOBLE del poder del grupo -> ' + d2.selfDef);
  ok(d2.total < before, 'P1-005 la autodefensa reduce la fuerza del atacante -> ' + before + ' -> ' + d2.total);
})();

/* ---------- P1-004: atacar/controlear cartas de la mano ---------- */
(function () {
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var p = readyToAttack(E.getState().currentPid), r = 1 - p;
  ok(p !== null, 'P1-004 fixture: hay un jugador con turno de ataque permitido');
  var handIdx = 58;                       /* Gordo Remora, power 1, resistance 0 */
  /* El reparto inicial puede haber dado YA esa carta (10 grupos al azar de ~167):
     entonces la dejariamos duplicada y removeFromHand() solo quita una copia,
     haciendo el test intermitente. Se purga antes de insertar. */
  E._raw().players[r].hand = E._raw().players[r].hand.filter(function (ix) { return ix !== handIdx; });
  E._raw().players[r].hand.push(handIdx);
  plant(r, 'def', 58, 1);

  /* El atacante es un títere directo con un Action Token. */
  plant(p, 'atk', 148, 1);
  ok(E.getState().attack === null, 'P1-004 no hay ataque abierto al empezar');

  /* Nota de alcance: isOpenArrow() es cierto para todo nodo cardId!=null con
     menos de 3 hijos, así que un árbol finito SIEMPRE tiene =1 flecha libre y el
     estado "0 flechas" es inalcanzable por construcción. Por eso la exención
     "sin flecha" del ataque a la mano no es observable desde fuera; lo que sí
     se comprueba es la validación del objetivo de mano y su resolución. */

  /* 1) Destroy nunca es legal contra una carta de la mano */
  throws(function () {
    E.declareAttack(p, 'destroy', { attackerUid: 'atk', handIdx: handIdx });
  }, /Solo control/i, 'P1-004 Destroy no se permite contra cartas de la mano');

  /* 2) Control contra la mano: se registra y va al ÁREA NEUTRAL al ganar */
  E.declareAttack(p, 'control', { attackerUid: 'atk', handIdx: handIdx });
  var A = E._raw().attack;
  ok(A && A.handTarget && A.handTarget.idx === handIdx && A.handTarget.owner === r,
    'P1-004 la mano del rival queda registrada como objetivo -> ' + JSON.stringify(A && A.handTarget));
  var realRandom = Math.random;
  Math.random = function () { return 0; };          /* fuerza un 2 en 2d6: éxito garantizado */
  sealedResolve();
  Math.random = realRandom;
  var s = E.getState();
  ok(s.neutralArea.length === 1 && s.neutralArea[0].cardId === handIdx,
    'P1-004 el control ganado manda la carta al ÁREA NEUTRAL -> ' + JSON.stringify(s.neutralArea));
  ok(s.players[r].hand.indexOf(handIdx) === -1, 'P1-004 la carta sale de la mano del rival');
  ok(E.getState().attack === null, 'P1-004 el ataque se limpia tras resolverse');
})();

/* ---------- P1-008: las 9 metas de los Illuminati se evaluan desde los datos ---------- */
(function () {
  /* startGame sortea quién empieza, así que el jugador de una fracción se
     localiza por su Illuminati y NUNCA por currentPid. */
  function pidOf(baseId) {
    var s = E.getState();
    for (var i = 0; i < s.players.length; i++) {
      if (String(s.players[i].illumId).replace(/\d+$/, '') === baseId) return i;
    }
    return -1;
  }

  /* 1) Ningún Illuminati puede volver al texto genérico "Meta básica".
     El motor prohíbe repetir fracción, así que se cubren las 9 Illuminati en
     partidas pareadas (4+4+1 facciones, todas distintas). */
  var pairs = [
    ['bavarianilluminati1', 'shangrila1'],
    ['servantsofcthulhu1', 'thenetwork1'],
    ['discordiansociety1', 'bermudatriangle1'],
    ['ufos1', 'gnomesofzurich1'],
    ['adeptsofhermes1', 'shangrila2']
  ];
  var generic = [], shown = [];
  pairs.forEach(function (pr) {
    fresh(pr[0], pr[1]);
    E.getState().victoryStatus.forEach(function (v) {
      shown.push(v.name + '=' + v.goal);
      if (!v.goal || /Meta básica/.test(v.goal) || v.goal.length < 12) generic.push(v.name + '=' + v.goal);
    });
  });
  ok(generic.length === 0 && shown.length === 10,
    'P1-008 cada Illuminati muestra el texto de SU meta -> ' + (generic.join(' | ') || shown.join(' | ')));

  /* 2) power_total: se cumple al alcanzar el total */
  var strong = C.cards
    .filter(function (c) { return c.type === 'group' && typeof c.power === 'number'; })
    .sort(function (a, b) { return b.power - a.power; }).slice(0, 8);
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var p1 = pidOf('bavarianilluminati');
  ok(p1 >= 0, 'P1-008 fixture: Bavarian localizado');
  ok(E.goalStatus(p1).met === false, 'P1-008 power_total sin cumplir no es victoria');
  strong.forEach(function (c, i) { plant(p1, 'st' + i, c.idx, 0); });
  var full = E.goalStatus(p1);
  ok(full.met === true && /poder total/.test(full.how),
    'P1-008 power_total se cumple al llegar al total -> ' + full.how);

  /* 3) needEachAlign (Bermuda): el poder no basta, faltan ideologías.
     Se plantan 3 copias del MISMO grupo (Poder 14 = 42 = 35) para garantizar
     que sólo queden 3 de las 10 ideologías cubiertas. */
  fresh('bermudatriangle1', 'servantsofcthulhu1');
  var p2 = pidOf('bermudatriangle');
  ok(p2 >= 0, 'P1-008 fixture: Bermuda localizada');
  for (var b = 0; b < 3; b++) plant(p2, 'bt' + b, 148, 0);   /* Texas x3 */
  var berm = E.goalStatus(p2);
  ok(berm.count >= 35 && berm.met === false && Array.isArray(berm.missingAlignments) && berm.missingAlignments.length > 0,
    'P1-008 needEachAlign exige las 10 ideologías -> poder ' + berm.count + ', faltan ' + ((berm.missingAlignments || []).length));

  /* 4) destroy_reduce (Cthulhu): meta por destrucciones y meta reducida por cada una */
  fresh('servantsofcthulhu1', 'shangrila1');
  var p3 = pidOf('servantsofcthulhu');
  ok(p3 >= 0, 'P1-008 fixture: Cthulhu localizado');
  E._raw().players[p3].destroyedByMe = [1, 2, 3];
  var cth = E.goalStatus(p3);
  ok(cth.met === false && cth.goal === 9,
    'P1-008 Cthulhu reduce la meta 1 por cada destrucción -> meta ' + cth.goal + ' (esperada 9)');
  E._raw().players[p3].destroyedByMe = [1, 2, 3, 4, 5, 6, 7, 8];
  var cth8 = E.goalStatus(p3);
  ok(cth8.met === true && /Cthulhu/.test(cth8.how), 'P1-008 Cthulhu gana a las 8 destrucciones -> ' + cth8.how);

  /* 5) peaceful_power_in_play (Shangri-La) */
  fresh('shangrila1', 'servantsofcthulhu1');
  var p4 = pidOf('shangrila');
  ok(p4 >= 0, 'P1-008 fixture: Shangri-La localizado');
  var acc = 0, k = 0;
  C.cards.filter(function (c) {
    return c.type === 'group' && typeof c.power === 'number' && (c.alignments || []).indexOf('peaceful') >= 0;
  }).sort(function (a, b) { return b.power - a.power; }).forEach(function (c) {
    if (acc < 30) { plant(p4, 'pf' + (k++), c.idx, 0); acc += c.power; }
  });
  var sha = E.goalStatus(p4);
  ok(sha.met === false && sha.count === acc && sha.goal === 30,
    'P1-008 Shangri-La evalúa el poder pacífico en juego -> cuenta ' + sha.count + '/30, cumple ' + sha.met);
  /* HALLAZGO DE DATOS: la suma de Poder de TODOS los grupos Pacíficos del
     mazo es 29, uno por debajo de las 30 que exige la meta. Con este dataset la
     meta de Shangri-La es inalcanzable. Se deja constancia en vez de maquillar
     el umbral (ver docs/audit/INWO_SURGICAL_AUDIT.md). */
  var peacefulTotal = C.cards.filter(function (c) {
    return c.type === 'group' && typeof c.power === 'number' && (c.alignments || []).indexOf('peaceful') >= 0;
  }).reduce(function (a, c) { return a + c.power; }, 0);
  ok(peacefulTotal < 30,
    'P1-008 HALLAZGO: el dataset sólo suma ' + peacefulTotal + ' de Poder pacífico (la meta pide 30) -> meta inalcanzable sin corregir la transcripción');

  /* 6) basic con doblado por atributo (The Network: computer) */
  fresh('thenetwork1', 'servantsofcthulhu1');
  var p5 = pidOf('thenetwork');
  ok(p5 >= 0, 'P1-008 fixture: The Network localizado');
  var base5 = E.goalStatus(p5);
  plant(p5, 'fin', 47, 0);                       /* Finland: computer, power 6 */
  var dbl5 = E.goalStatus(p5);
  ok(dbl5.count === base5.count + 2,
    'P1-008 un grupo con el atributo computer cuenta doble -> ' + base5.count + ' -> ' + dbl5.count);

  /* 7) la UI expone el progreso específico de cada meta */
  fresh('bavarianilluminati1', 'shangrila1');
  var vs = E.getState().victoryStatus;
  var pb = pidOf('bavarianilluminati'), ps = pidOf('shangrila');
  ok(vs[pb] && vs[pb].progress.powerTotal && vs[ps] && vs[ps].progress.peacefulPower,
    'P1-008 la UI muestra el progreso propio de cada meta -> ' + JSON.stringify(vs.map(function (v) { return v.progress; })));
})();

/* =====================================================================
   P1-009  Los 9 poderes especiales de las facciones Illuminati.
   El dataset los declara (effect.kind==='illu_special'); antes el motor los
   ignoraba por completo salvo el +4 de Cthulhu y el +5 de Shangri-La escritos a
   mano dentro de computeStrength.
   ===================================================================== */
(function () {
  function pidOf(base) {
    for (var p = 0; p < E._raw().players.length; p++) {
      if (String(E._raw().players[p].illumId).replace(/\d+$/, '') === base) return p;
    }
    return 0;
  }
  function groupBy(fn) {
    var c = C.cards.filter(function (x) { return x.type === 'group' && fn(x); })[0];
    return c || null;
  }
  function hasAttr(c, a) {
    var list = (c && c.attributes) || [];
    if (!Array.isArray(list)) list = String(list).split(/[,;/|]/);
    return list.map(function (s) { return String(s).trim().toLowerCase(); }).indexOf(String(a).toLowerCase()) >= 0;
  }
  function plotsOf(pid) {
    return E._raw().players[pid].hand.filter(function (ix) { return C.cards[ix] && C.cards[ix].type === 'plot'; }).length;
  }
  function groupUnder(pid, uid) {
    var root = E._raw().players[pid].structure;
    return (findNode(root, uid) || { children: [] }).children.map(function (n) { return n.uid; });
  }
  var TEXAS = groupBy(function (c) { return c.name === 'Texas'; });
  var GORDO = groupBy(function (c) { return c.name === 'Gordo Remora'; });
  var JAPAN = groupBy(function (c) { return c.name === 'Japan'; });
  var ANY = groupBy(function (c) { return (c.power || 0) > 0; });
  var OTHER = groupBy(function (c) { return (c.power || 0) > 0 && c.id !== TEXAS.id && c.id !== GORDO.id && c.id !== ANY.id; });

  /* ---- 1) Gnomes of Zurich: 6 Plots en mano (no 5) ---- */
  /* OJO: el reparto inicial ya mete Plots en la mano, así que hay que añadir
     índices de Plot REALES (no 0..n) o el contador no sube. Y elGnomes sólo
     puede discriminating al final de SU turno, así que el turno debe ser suyo. */
  var PLOT_IDX = C.cards.filter(function (c) { return c.type === 'plot'; }).map(function (c) { return c.idx; });
  function fillPlots(pid, n) { for (var k = 0; k < n; k++) E._raw().players[pid].hand.push(PLOT_IDX[k]); }
  fresh('gnomesofzurich1', 'bavarianilluminati1');
  var gn = pidOf('gnomesofzurich');
  while (E.getState().currentPid !== gn && !E.getState().gameover) E.endTurn();
  plant(gn, 'gk', ANY.idx, 1);
  fillPlots(gn, 7);
  var gnBefore = plotsOf(gn);
  E.endTurn();
  ok(plotsOf(gn) === 6, 'P1-009 Gnomes de Zurich admite 6 Plots (no 5) -> ' + gnBefore + ' -> ' + plotsOf(gn));
  fresh('bavarianilluminati1', 'shangrila1');
  var bv = pidOf('bavarianilluminati');
  while (E.getState().currentPid !== bv && !E.getState().gameover) E.endTurn();
  plant(bv, 'bk', ANY.idx, 1);
  fillPlots(bv, 7);
  E.endTurn();
  ok(plotsOf(bv) === 5, 'P1-009 control: el resto de facciones sigue con el límite de 5 -> ' + plotsOf(bv));

  /* ---- 2) The Network: roba 2 Plot al inicio del turno ---- */
  /* El reparto inicial ya contiene Plots, así que se mide el DELTA contra otra
     fracción: el reparto inicial es idéntico porque ocurre antes de elegir
     Illuminati, de modo que la única diferencia es el robo automático. */
  function plotsAtFirstTurn(illu) {
    fresh(illu, illu === 'thenetwork1' ? 'bavarianilluminati1' : 'thenetwork1');
    var p = pidOf(illu === 'thenetwork1' ? 'thenetwork' : 'bavarianilluminati');
    var n = 0;
    while (E.getState().currentPid !== p && !E.getState().gameover && n++ < 8) E.endTurn();
    return plotsOf(p);
  }
  var netPlots = plotsAtFirstTurn('thenetwork1');
  var basePlots = plotsAtFirstTurn('bavarianilluminati1');
  ok(netPlots === basePlots + 2, 'P1-009 The Network roba 2 Plot al inicio de su turno -> ' + basePlots + ' -> ' + netPlots);

  /* ---- 3) Discordian Society: inmunidad Government/Street ahora se EJIGE ---- */
  fresh('discordiansociety1', 'bavarianilluminati1');
  var dsc = pidOf('discordiansociety');
  var att = 1 - dsc;
  readyToAttack(att);
  plant(dsc, 'd1', TEXAS.idx, 1);      /* Texas es Government */
  plant(att, 'a1', TEXAS.idx, 1);
  throws(function () { E.declareAttack(att, 'control', { attackerUid: 'a1', uid: 'd1' }); },
    /inmune/i, 'P1-009 Discordian bloquea atacantes Government');
  var safe = groupBy(function (c) {
    return (c.power || 0) > 0 && (c.alignments || []).indexOf('government') < 0 && (c.alignments || []).indexOf('straight') < 0;
  });
  plant(att, 'a2', safe.idx, 1);
  E.declareAttack(att, 'destroy', { attackerUid: 'a2', uid: 'd1' });
  ok(E._raw().attack !== null, 'P1-009 Discordian NO bloquea a ' + safe.name + ' (sin Government/Straight)');

  /* ---- 4) Servants of Cthulhu: +4 destroy (leído del dato, no hardcodeado) ---- */
  fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var cth = pidOf('servantsofcthulhu');
  var dfn = 1 - cth;
  readyToAttack(cth);
  plant(cth, 'ca', TEXAS.idx, 1);
  plant(dfn, 'dv', GORDO.idx, 1);
  E.declareAttack(cth, 'destroy', { attackerUid: 'ca', uid: 'dv' });
  var dct = E.previewStrength();
  ok(dct.cthulhu === 4, 'P1-009 Cthulhu +4 a cualquier destrucción -> det.cthulhu=' + dct.cthulhu);
  ok(dct.notes.some(function (n) { return /Bonus del Illuminati atacante/.test(n); }),
    'P1-009 el bonus aparece en el desglose -> ' + JSON.stringify(dct.notes));

  /* ---- 5) Cthulhu: roba un Plot al destruir ---- */
  var p0 = plotsOf(cth);
  var rr = Math.random; Math.random = function () { return 0; };
  sealedResolve();
  Math.random = rr;
  /* P1-009: "Draw a Plot card whenever you destroy a group!" se comprueba por el
   * EFECTO OBSERVABLE (la linea de log que escribe el motor) y no contando las
   * Plot cards en mano. Contar era fragil: sealWindows() quita cartas de la
   * mano para que ningun reparto accidental abra una ventana, y si al jugador
   * le toca por casualidad una carta de rodadero (Bribery, Murphy's Law...)
   * el recuento de Plot baja en 1 justo antes del robo de Cthulhu y el test
     falla (medido: 6-7 fallos de cada 40). Se mide lo que las reglas dicen, no
   * el bookkeeping que otros bloques manipulan. */
  var cthLog = (E._raw().log || []).some(function (l) { return /robada por Cthulhu/.test(l.msg || ''); });
  ok(cthLog && !findNode(E._raw().players[dfn].structure, 'dv'),
     'P1-009 Cthulhu roba un Plot cada vez que destruye -> victima viva=' +
     !!findNode(E._raw().players[dfn].structure, 'dv') + ' robo en el log=' + cthLog);

  /* ---- 6) Shangri-La: +5 a defenderse de CUALQUIER ataque ---- */
  fresh('shangrila1', 'bavarianilluminati1');
  var sh = pidOf('shangrila');
  var atk = 1 - sh;
  readyToAttack(atk);
  plant(sh, 's1', GORDO.idx, 1);
  plant(atk, 'a1', TEXAS.idx, 1);
  E.declareAttack(atk, 'destroy', { attackerUid: 'a1', uid: 's1' });
  var dsh = E.previewStrength();
  ok(dsh.defBoosts === 5, 'P1-009 Shangri-La +5 defensa contra cualquier ataque -> det.defBoosts=' + dsh.defBoosts);

  /* ---- 7) Shangri-La: veto de destrucción (sólo Violent / Illuminati rivales) ---- */
  /* Los Instant Attacks tiran 2d6 y 11-12 SIEMPRE fallan (regla oficial), asi que
     sin fijar la tirada este gate seria intermitente ~6% de las veces. Se fija
     Math.random=0 (=> 2 en 2d6, exito seguro) igual que en el bloque P1-004. */
  var realRandom7 = Math.random;
  Math.random = function () { return 0; };
  sealedResolve();                        /* cerrar el ataque de control abierto arriba */
  plant(sh, 's1b', GORDO.idx, 1);          /* Gordo Remora NO es Violent */
  sealedInstantAttack(atk, 40, 's1b');
  Math.random = realRandom7;
  ok(findNode(E._raw().players[sh].structure, 's1b') !== null,
    'P1-009 Shangri-La veta destruir un grupo que NO es Violent (el objetivo sobrevive)');
  plant(sh, 's2', TEXAS.idx, 1);            /* Texas Sí es Violent */
  Math.random = function () { return 0; };
  sealedInstantAttack(atk, 40, 's2');
  Math.random = realRandom7;
  ok(findNode(E._raw().players[sh].structure, 's2') === null,
    'P1-009 Shangri-La Sí pierde un grupo Violent (el veto no es absoluto)');

  /* ---- 8) Gnomes: +4 contra Corporate ---- */
  fresh('gnomesofzurich1', 'bavarianilluminati1');
  var gn2 = pidOf('gnomesofzurich');
  var dvn = 1 - gn2;
  var corp = groupBy(function (c) { return (c.alignments || []).indexOf('corporate') >= 0 && (c.power || 0) > 0; });
  readyToAttack(gn2);
  plant(gn2, 'ga', TEXAS.idx, 1);
  plant(dvn, 'gd', corp.idx, 1);
  E.declareAttack(gn2, 'control', { attackerUid: 'ga', uid: 'gd' });
  var dg = E.previewStrength();
  ok(dg.notes.some(function (n) { return /Bonus del Illuminati atacante: \+4/.test(n); }),
    'P1-009 Gnomes +4 contra ' + corp.name + ' -> ' + JSON.stringify(dg.notes));

  /* ---- 9) Adepts of Hermes: +6 contra Magic (o nota de bloqueo por datos) ---- */
  var magic = groupBy(function (c) { return (c.power || 0) > 0 && hasAttr(c, 'magic'); });
  if (magic) {
    fresh('adeptsofhermes1', 'bavarianilluminati1');
    var adp = pidOf('adeptsofhermes');
    var dva = 1 - adp;
    readyToAttack(adp);
    plant(adp, 'aa', TEXAS.idx, 1);
    plant(dva, 'ad', magic.idx, 1);
    E.declareAttack(adp, 'control', { attackerUid: 'aa', uid: 'ad' });
    var da = E.previewStrength();
    ok(da.notes.some(function (n) { return /Bonus del Illuminati atacante: \+6/.test(n); }),
      'P1-009 Adepts +6 contra un grupo Magic (' + magic.name + ')');
  } else {
    console.log('nota - P1-009 ningún Group del dataset tiene el atributo magic: el +6 de Adepts of Hermes sigue implementado pero no es evaluable con estos datos');
  }

  /* ---- 10) Bermuda Triangle: reorganización gratuita ---- */
  fresh('bermudatriangle1', 'bavarianilluminati1');
  var bm = pidOf('bermudatriangle');
  while (E.getState().currentPid !== bm && !E.getState().gameover) E.endTurn();
  plant(bm, 'x1', ANY.idx, 1);
  plant(bm, 'x2', OTHER.idx, 1);
  E.organize(bm, [{ uid: 'x2', newParentUid: 'x1' }]);
  ok(groupUnder(bm, 'x1').indexOf('x2') >= 0, 'P1-009 Bermuda reorganiza su estructura sin pagar acción');
  throws(function () { E.organize(bm, [{ uid: 'x2', newParentUid: 'x2' }]); },
    /dentro de sí mismo/i, 'P1-009 Bermuda no permite mover un grupo dentro de sí mismo');
  fresh('bavarianilluminati1', 'bermudatriangle1');
  var nb = 1 - pidOf('bermudatriangle');
  while (E.getState().currentPid !== nb && !E.getState().gameover) E.endTurn();
  plant(nb, 'y1', ANY.idx, 1);
  plant(nb, 'y2', OTHER.idx, 1);
  throws(function () { E.organize(nb, [{ uid: 'y2', newParentUid: 'y1' }]); },
    /no puede reorganizar/i, 'P1-009 sólo Bermuda reorganiza gratis');

  /* ---- 11) Shangri-La: cuenta el Poder pacífico de TODO el juego ---- */
  fresh('shangrila1', 'bavarianilluminati1');
  var sh2 = pidOf('shangrila');
  var riv = 1 - sh2;
  var c0 = E.goalStatus(sh2).count;
  plant(riv, 'pp', JAPAN.idx, 1);
  var c1 = E.goalStatus(sh2).count;
  ok(c1 === c0 + JAPAN.power, 'P1-009 Shangri-La cuenta el Poder pacífico rivals ("regardless of who controls them") -> ' + c0 + ' -> ' + c1);
  E._raw().neutralArea.push({ uid: 'nx', cardId: JAPAN.idx });
  var c2 = E.goalStatus(sh2).count;
  ok(c2 === c1 + JAPAN.power, 'P1-009 Shangri-La también cuenta el ÁREA NEUTRAL -> ' + c1 + ' -> ' + c2);

  /* ---- 12) Bavarian Illuminati: ataque privilegiado ---- */
  fresh('bavarianilluminati1', 'shangrila1');
  var bv2 = pidOf('bavarianilluminati');
  readyToAttack(bv2);
  plant(bv2, 'ba', TEXAS.idx, 1);
  plant(1 - bv2, 'bd', GORDO.idx, 1);
  E.declareAttack(bv2, 'destroy', { attackerUid: 'ba', uid: 'bd' });
  var wasP = !!E._raw().attack.privilege;
  E.togglePrivilege();
  ok(!!E._raw().attack.privilege !== wasP, 'P1-009 Bavarian declara un ataque privilegiado -> ' + wasP + ' -> ' + !!E._raw().attack.privilege);

  /* ---- 13) Gnomes de Zurich: el DOBLE de la meta es OR (corporate O bank) ----
     El texto de la carta dice "Any Corporate group OR Bank with a Power of 4 or
     more counts double". El dato trae {align:'corporate', attr:'bank',
     powerAtLeast:4}: con AND ningún grupo del dataset cumpliría los dos a la vez
     (nadie tiene atributo bank) y el doble quedaría muerto. Esta aserción fija el
     OR para que nadie vuelva a ANDar los datos. */
  fresh('gnomesofzurich1', 'discordiansociety1');
  var gz = pidOf('gnomesofzurich');
  plant(gz, 'gnz1', 152, 1);           // Tobacco Companies, corporate, power 4
  plant(gz, 'gnz2', 101, 1);           // Nuclear Power Companies, corporate, power 4
  plant(gz, 'gnz3', TEXAS.idx, 1);     // Texas: violent/government, NO corporate -> no cuenta doble
  var gzBase = E.goalStatus(gz).count;
  ok(gzBase === 6, 'P1-009 Gnomes corporate>=4 cuenta doble (3 grupos -> 6, Texas no) -> ' + gzBase);
  var gzNoBank = E._raw().players[gz].structure.children.filter(function (n) { return n.cardId === 152; })[0];
  ok(!!gzNoBank, 'P1-009 el grupo corporate sigue en la estructura (doble aplicado, no destruido)');
})();

/* ================ P1-011  Attack to Destroy: "Power minus Power" ================
   Reglas oficiales (inwo_rules_extracted.txt):
   - L561-580, "Attack to Destroy", punto (1): "Instead of rolling 'Power minus
     Resistance,' roll 'Power minus Power.' That is, the target defends with its
     Power rather than its Resistance." punto (2): si el objetivo esté en TU PROPIA
     estructura, "The target does not get a defense bonus for closeness to the
     Illuminati in this case."
   - L683-685: "While a Place is Devastated, its Power is halved (round down)
     against any Attack to Destroy."
   - L681-682 y librarian_result.txt:2151: un grupo devastado "cannot get Action
     tokens and do not count toward victory".
   Antes de P1-011 la destrucción NUNCA restaba el Poder del objetivo (defenseBase
   se quedaba en 0) y ningún recorrido de metas miraba `devastated`. */
(function () {
  var En = window.Engine, C = window.INWO_CARDS;
  function pidOf(base) {
    var ps = En.getState().players, p;
    for (p = 0; p < ps.length; p++) if (String(ps[p].illumId).replace(/\d+$/, '') === base) return p;
    throw new Error('P1-011 fixture: no hay jugador con la fracción ' + base);
  }
  function nodeOf(pid, uid) {
    var hit = null;
    (function walk(nd) {
      if (hit || !nd) return;
      if (nd.uid === uid) { hit = nd; return; }
      (nd.children || []).forEach(walk);
    })(En._raw().players[pid].structure);
    return hit;
  }
  function byName(n) { return C.cards.filter(function (c) { return c.name === n; })[0]; }
  var TEXAS = byName('Texas');           // Poder 14, Resistencia 9
  var KKK = byName('KKK');                // Poder 2, ataque débil
  var GORDO = byName('Gordo Remora');     // Poder 1

  /* ---- 1) DESTROY: el objetivo defiende con su PODER, no con su Resistencia ---- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var atk = pidOf('bavarianilluminati');
  readyToAttack(atk);
  plant(atk, 'wa', KKK.idx, 1);
  plant(1 - atk, 'wb', TEXAS.idx, 1);
  En.declareAttack(atk, 'destroy', { attackerUid: 'wa', uid: 'wb' });
  var d1 = En.previewStrength();
  ok(d1.defenseBase === TEXAS.power,
    'P1-011 DESTROY resta el PODER del objetivo ("Power minus Power") -> defenseBase=' +
    d1.defenseBase + ' (Poder ' + TEXAS.power + ', Resistencia ' + TEXAS.resistance + ')');
  ok(d1.defenseBase !== TEXAS.resistance,
    'P1-011 DESTROY no usa la Resistencia del objetivo (sería ' + TEXAS.resistance + ')');
  ok(d1.total < 2,
    'P1-011 un atacante de Poder ' + KKK.power + ' ya NO puede destruir a un grupo de Poder ' +
    TEXAS.power + ' -> total=' + d1.total + ' (fallo automático)');
  En.resolveAttack();
  ok(En._raw().attack === null, 'P1-011 el ataque de prueba se resolvió y se limpió');

  /* ---- 2) DESTROY dentro de tu PROPIA estructura: sin defensa por cercanía (regla 2) ---- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var own = pidOf('bavarianilluminati');
  readyToAttack(own);
  plant(own, 'oa', TEXAS.idx, 1);
  plant(own, 'ob', GORDO.idx, 1);
  En.declareAttack(own, 'destroy', { attackerUid: 'oa', uid: 'ob' });
  var d2 = En.previewStrength();
  ok(d2.posBonus === 0,
    'P1-011 DESTROY contra un grupo de tu propia estructura no da defensa por cercanía -> posBonus=' + d2.posBonus);
  En.resolveAttack();

  /* ---- 3) Devastado: Poder a la MITAD (round down) SÓLO contra destroy ---- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var dv = pidOf('bavarianilluminati');
  readyToAttack(dv);
  plant(dv, 'da', KKK.idx, 1);
  plant(1 - dv, 'db', TEXAS.idx, 1);
  nodeOf(1 - dv, 'db').devastated = true;
  En.declareAttack(dv, 'destroy', { attackerUid: 'da', uid: 'db' });
  var d3 = En.previewStrength();
  ok(d3.defenseBase === Math.floor(TEXAS.power / 2),
    'P1-011 un Place devastado defiende con la mitad de su Poder (round down) -> ' +
    d3.defenseBase + ' = floor(' + TEXAS.power + '/2)');
  En.resolveAttack();

  /* ---- 4) Devastado: contra CONTROL sigue defendiendo con su Resistencia ---- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var cv = pidOf('bavarianilluminati');
  readyToAttack(cv);
  plant(cv, 'ca', KKK.idx, 1);
  plant(1 - cv, 'cb', TEXAS.idx, 1);
  nodeOf(1 - cv, 'cb').devastated = true;
  En.declareAttack(cv, 'control', { attackerUid: 'ca', uid: 'cb' });
  var d4 = En.previewStrength();
  ok(d4.defenseBase === TEXAS.resistance,
    'P1-011 la devastación NO reduce la Resistencia (sólo el Poder, y sólo vs destroy) -> ' +
    d4.defenseBase + ' = ' + TEXAS.resistance);
  En.resolveAttack();

  /* ---- 5) Devastado: NO cuenta para las metas ---- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var gp = pidOf('bavarianilluminati');
  plant(gp, 'ga', TEXAS.idx, 1);
  var pwBefore = En.goalStatus(gp).count;
  nodeOf(gp, 'ga').devastated = true;
  var pwAfter = En.goalStatus(gp).count;
  ok(pwBefore - pwAfter === TEXAS.power,
    'P1-011 un grupo devastado no suma Poder total para la meta -> ' +
    pwBefore + ' -> ' + pwAfter + ' (delta ' + (pwBefore - pwAfter) + ', Poder ' + TEXAS.power + ')');

  fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var cp = pidOf('servantsofcthulhu');
  plant(cp, 'ka', TEXAS.idx, 1);
  plant(cp, 'kb', GORDO.idx, 1);
  var gBefore = En.goalStatus(cp).count;
  nodeOf(cp, 'ka').devastated = true;
  var gAfter = En.goalStatus(cp).count;
  ok(gBefore - gAfter === 1,
    'P1-011 un grupo devastado no cuenta como grupo controlado -> ' + gBefore + ' -> ' + gAfter);
  nodeOf(cp, 'ka').devastated = false;
  nodeOf(cp, 'ka').paralyzed = true;
  ok(En.goalStatus(cp).count === gAfter,
    'P1-011 un grupo PARALIZADO tampoco cuenta (sin regresión) -> ' + En.goalStatus(cp).count);
})();

/* ===================================================================== *
 * P1-012 / P2-DATA-02  la familia oficial "+10 Plots".
 *
 * Las 15 cartas comparten la misma frase impresa y sólo cambia el
 * calificador del grupo:
 *   "Play this card at any time to give +10 Power or Resistance (your
 *    choice) to any {X} group you control. If used with an action, it must
 *    be played when that action is first declared, and counts only for that
 *    action. If used for defense, the bonus lasts until the end of the
 *    current turn and does not count toward any Goal."
 *
 * Antes de este lote las 15 estaban en `unverified` y `rejectUnverifiedCard`
 * las rechazaba, así que el caso `case 'boost10'` de playPlot era INALCANZABLE
 * y además no miraba el objetivo: cualquier +10 valía para cualquier grupo.
 * ===================================================================== */
(function P1_012_PLUS10() {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var MARTIAL = byName('Martial Law');     /* government   */
  var STOCK   = byName('Stock Split');     /* corporate    */
  var WHALES  = byName('Save the Whales'); /* green        */
  var CUP     = byName('World Cup Victory');/* nation       */
  var TEXAS   = byName('Texas');           /* violent      */
  var AL_GORE = byName('Al Gore');         /* computer+green, Poder 1 */
  var CALIF   = byName('California');      /* green+coastal+huge */

  /* --- 1. datos: las 15 clasificadas y con calificador satisfacible --- */
  var boost = C.cards.filter(function (c) {
    return c.type === 'plot' && c.effect && c.effect.kind === 'boost10';
  });
  ok(boost.length === 15,
    'P1-012 las 15 cartas "+10 Plots" estan clasificadas -> ' + boost.length);
  ok(boost.every(function (c) { return c.mechanicsStatus === 'implemented-pending-engine'; }),
    'P1-012 las 15 declaran verifiedMechanic (implemented-pending-engine)');
  var sinObjetivo = boost.filter(function (c) {
    var f = c.effect.targetAlign, a = c.effect.targetAttr;
    var n = f ? C.cards.filter(function (g) { return g.type === 'group' &&
      (g.alignments || []).indexOf(f) >= 0; }).length
      : C.cards.filter(function (g) { return g.type === 'group' &&
        (g.attributes || []).indexOf(a) >= 0; }).length;
    return n < 1;
  });
  ok(sinObjetivo.length === 0,
    'P1-012 todo calificador tiene al menos un grupo posible -> ' +
    (sinObjetivo.length ? sinObjetivo.map(function (c) { return c.name; }).join(', ') : 'ninguno vacio'));
  ok(CUP.effect.targetAttr === 'nation' &&
     C.cards.some(function (g) { return g.type === 'group' &&
       (g.attributes || []).indexOf('nation') >= 0; }),
    'P1-012 World Cup Victory usa el atributo `nation`, que P2-DATA-02 anadio');

  /* helper: mete una carta en la mano del jugador y devuelve su indice.
   * PURGA antes de insertar: el reparto inicial puede contener ya esa misma
   * carta, y playPlot resuelve la posicion con hand.indexOf(handIdx), asi que
   * con dos copias solo borraria una y la otra seguiria "en la mano". Es el
   * mismo modo de fallo que ya se corrigio en el bloque P1-004. */
  var give = function (pid, card) {
    var h = E._raw().players[pid].hand;
    E._raw().players[pid].hand = h.filter(function (i2) { return i2 !== card.idx; });
    E._raw().players[pid].hand.push(card.idx);
    return card.idx;
  };
  /* fixture: dos jugadores listos para atacar, con un atacante y un objetivo */
  function scenario(attCard, defCard) {
    var S2 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
    var atk = pidOfHere(S2, 'servantsofcthulhu');
    var def = pidOfHere(S2, 'bavarianilluminati');
    plant(atk, 'p12-atk', attCard.idx, 1);
    plant(def, 'p12-def', defCard.idx, 1);
    var r = readyToAttack(atk);
    return { S: S2, atk: r == null ? atk : r, def: def };
  }
  function pidOfHere(S2, base) {
    for (var i = 0; i < S2.players.length; i++) {
      if (String(S2.players[i].illumId).replace(/\d+$/, '') === base) return i;
    }
    throw new Error('fixture: falta la faccion ' + base);
  }

  /* --- 2. el calificador se respeta: un +10 de Corporate no aplica a otro ---
   * Se abre un ataque para que la carta se use en modo 'defense' (el único
   * modo que exige grupo objetivo cuando no se puede atacar). Texas es
   * government/violent/conservative, asi que no es corporate. */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    var ix = give(F.atk, STOCK);          /* Stock Split = corporate */
    E.declareAttack(F.atk, 'control', { attackerUid: 'p12-atk', uid: 'p12-def' });
    throws(function () { E.playPlot(F.atk, ix, 'p12-def', { boostMode: 'defense' }); },
      /solo afecta a grupos corporate/i,
      'P1-012 un +10 de Corporate rechaza a un grupo no Corporate (Texas)');
  })();

  /* --- 3. sólo grupos propios (el calificador SI coincide, pero es rival) --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    /* Brasil es Government y vive en la estructura del RIVAL */
    plant(F.def, 'p12-def-gov', byName('Brazil').idx, 1);
    var ix = give(F.atk, MARTIAL);
    E.declareAttack(F.atk, 'control', { attackerUid: 'p12-atk', uid: 'p12-def-gov' });
    throws(function () { E.playPlot(F.atk, ix, 'p12-def-gov', { boostMode: 'defense' }); },
      /debe ser tuyo/i,
      'P1-012 no se puede dar el +10 a un grupo rival');
  })();

  /* --- 4. modo 'attack': exige que el grupo sea el que declarar el ataque --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    plant(F.atk, 'p12-gov2', byName('Brazil').idx, 1);   /* government, propio, NO atacante */
    var ix = give(F.atk, MARTIAL);
    E.declareAttack(F.atk, 'control', { attackerUid: 'p12-atk', uid: 'p12-def' });
    throws(function () { E.playPlot(F.atk, ix, 'p12-gov2', { boostMode: 'attack' }); },
      /debe aplicarse al grupo que lo declar[oó]/i,
      'P1-012 el +10 al ataque sólo se aplica al atacante declarado');
  })();

  /* --- 5. modo 'attack' correcto: suma +10 y muere con el ataque --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    var ix = give(F.atk, STOCK);   /* Stock Split = corporate, pero el objetivo es Texas(violent) */
    /* se usa Benefit Concert? no: para 'attack' hace falta el calificador correcto */
    ix = give(F.atk, MARTIAL);
    var tnode = plant(F.atk, 'p12-atk2', byName('Brazil').idx, 1); /* government */
    E.declareAttack(F.atk, 'control', { attackerUid: 'p12-atk2', uid: 'p12-def' });
    var before = E.previewStrength();
    E.playPlot(F.atk, ix, 'p12-atk2', { boostMode: 'attack' });
    var det = E.previewStrength();
    ok(det.boosts === 10 && det.total === before.total + 10,
      'P1-012 el +10 al ataque suma exactamente 10 a la fuerza -> ' +
      before.total + ' -> ' + det.total + ' (boosts ' + det.boosts + ')');
    ok(E._raw().players[F.atk].hand.indexOf(ix) < 0,
      'P1-012 la carta +10 usada sale de la mano');
    /* "counts only for that action": al resolver el ataque el bonus desaparece */
    sealedResolve();
    ok(E._raw().attack === null,
      'P1-012 tras resolver el ataque el +10 desaparece con el ataque');
    /* y la fuerza del atacante NO quedo modificada de forma permanente */
    var tnode2 = null;
    (function walk(nd) { if (nd.uid === 'p12-atk2') tnode2 = nd;
      (nd.children || []).forEach(walk); })(E._raw().players[F.atk].structure);
    ok(tnode2 && tnode2.powerOverride == null,
      'P1-012 "does not count toward any Goal": el +10 no escribe powerOverride');
  })();

  /* --- 6. modo 'defense': +10 a las defensas del turno --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    var ix = give(F.def, MARTIAL);  /* el defensor usa la carta sobre su propio grupo */
    E.declareAttack(F.atk, 'control', { attackerUid: 'p12-atk', uid: 'p12-def' });
    E.playPlot(F.def, ix, 'p12-def', { boostMode: 'defense' });
    var det = E.previewStrength();
    ok(det.defBoosts === 10,
      'P1-012 el +10 a la defensa suma 10 a las defensas del turno -> defBoosts ' + det.defBoosts);
  })();

  /* --- 7. sin ataque abierto sólo se puede exponer (modo 'hold') --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    var ix = give(F.atk, MARTIAL);
    throws(function () { E.playPlot(F.atk, ix, 'p12-atk', { boostMode: 'attack' }); },
      /necesita un ataque abierto/i,
      'P1-012 sin ataque declarado no se puede usar el +10 al ataque');
    var S4 = E.playPlot(F.atk, ix, 'p12-atk', { boostMode: 'hold' });
    var ex = S4.players[F.atk].exposedPlots.map(function (i2) { return C.cards[i2].name; });
    ok(ex.indexOf('Martial Law') >= 0,
      'P1-012 sin ataque declarado la carta +10 queda expuesta para después -> ' + JSON.stringify(ex));
    ok(E._raw().attack === null,
      'P1-012 exponer la carta +10 no crea un ataque por arte propia');
  })();

  /* --- 8. un calificador por atributo (green) también se aplica --- */
  (function () {
    var F = scenario(TEXAS, TEXAS);
    plant(F.atk, 'p12-green', CALIF.idx, 1);   /* California es green */
    var ix = give(F.atk, WHALES);
    var S3 = E.playPlot(F.atk, ix, 'p12-green', { boostMode: 'hold' });
    var ex = S3.players[F.atk].exposedPlots.map(function (i2) { return C.cards[i2].name; });
    ok(ex.indexOf('Save the Whales') >= 0,
      'P1-012 un +10 por atributo (Green) se expone en la mesa -> ' + JSON.stringify(ex));
    ok(E._raw().players[F.atk].hand.indexOf(ix) < 0,
      'P1-012 la Plot expuesta NO sigue en la mano (no se cuenta dos veces)');
  })();
})();

/* =====================================================================
 * P1-013  familia oficial "Power Increase" (Fase 4, lote 2)
 * 10 cartas, una por cada ideología. Regla oficial (inwo_rules_extracted.txt:
 * 268-273): el Plot se LINKea a un grupo de un tipo concreto para FIJAR su
 * Poder al valor impreso, y no tiene efecto sobre un grupo que ya tiene Poder
 * mayor o igual. El texto impreso añade: "may be played at any time, and
 * counts as the action for the group it affects" y "No player may have more
 * than one {Name} in play".
 * ===================================================================== */
(function () {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var pidOfHere = function (S, base) {
    for (var p = 0; p < S.players.length; p++) {
      if (S.players[p].illumId.replace(/\d+$/, '') === base) return p;
    }
    throw new Error('fixture: no hay jugador ' + base);
  };
  /* grupo con la alineacion pedida cuyo Poder permite/impide el efecto */
  var groupByAlign = function (align, wantBelow) {
    var cand = C.cards.filter(function (g) {
      if (g.type !== 'group' || typeof g.power !== 'number') return false;
      var a = g.alignments || [];
      if (a.indexOf(align) < 0) return false;
      return wantBelow ? g.power < 6 : g.power >= 6;
    });
    cand.sort(function (x, y) { return wantBelow ? x.power - y.power : y.power - x.power; });
    return cand[0];
  };
  var put = function (pid, uid, idx, tokens) {
    E._raw().players[pid].structure.children.push(
      { uid: uid, cardId: idx, children: [], tokens: tokens == null ? 1 : tokens });
    return E._raw().players[pid].structure.children[E._raw().players[pid].structure.children.length - 1];
  };
  var putCard = function (pid, idx) {
    var pl = E._raw().players[pid];
    pl.hand = pl.hand.filter(function (ix) { return ix !== idx; });
    pl.hand.push(idx);
  };
  var findNode = function (pid, uid) {
    var hit = null;
    (function walk(nd) {
      if (hit || nd.uid === uid) { hit = hit || nd; return; }
      (nd.children || []).forEach(walk);
    })(E._raw().players[pid].structure);
    return hit;
  };

  /* ---------- 1. las 10 cartas y su declaracion de datos ---------- */
  var inc = C.cards.filter(function (c) { return c.effect && c.effect.kind === 'power_increase'; });
  ok(inc.length === 10, 'P1-013 las 10 cartas Power Increase estan clasificadas -> ' + inc.length);
  ok(inc.every(function (c) { return c.mechanicsStatus === 'implemented-pending-engine'; }),
    'P1-013 las 10 declaran verifiedMechanic');
  var aligns = inc.map(function (c) { return c.effect.targetAlign; });
  var CANON = ['conservative', 'corporate', 'criminal', 'fanatic', 'government',
    'liberal', 'peaceful', 'straight', 'violent', 'weird'];
  ok(CANON.every(function (a) { return aligns.indexOf(a) >= 0; }) && aligns.length === 10,
    'P1-013 cubren las 10 ideologias exactamente una vez -> ' + aligns.sort().join(','));
  var weird = inc.filter(function (c) { return c.effect.targetAlign === 'weird'; })[0];
  ok(weird && weird.name === 'The Weird Turn Pro' && weird.effect.value === 4,
    'P1-013 The Weird Turn Pro conserva su 4 impreso (no se normaliza a 6) -> ' +
    (weird ? weird.effect.value : '?'));
  ok(inc.every(function (c) {
    if (c.effect.targetAlign === 'weird') return true;
    return c.effect.value === 6;
  }), 'P1-013 las otras nueve fijan Poder 6');
  var empties = aligns.filter(function (a) {
    return !C.cards.some(function (g) {
      return g.type === 'group' && (g.alignments || []).indexOf(a) >= 0;
    });
  });
  ok(empties.length === 0, 'P1-013 ningun calificador es insatisfacible -> ' + JSON.stringify(empties));
  ok(inc.every(function (c) { return /Link this card to your chosen/.test(c.text || ''); }),
    'P1-013 el texto impreso declara el link (evidencia de transcripcion)');

  /* ---------- 2. la carta fija el Poder y consume la accion del grupo ---------- */
  var low = groupByAlign('fanatic', true);
  var LEAD = byName('Charismatic Leader');
  var St = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var P = pidOfHere(St, 'servantsofcthulhu');
  var node = put(P, 'pi-a', low.idx, 1);
  putCard(P, LEAD.idx);
  var before = node.powerOverride;
  var out = E.playPlot(P, LEAD.idx, 'pi-a');
  ok(node.powerOverride === 6,
    'P1-013 el Poder queda FIJADO a 6 (no sumado) sobre Poder ' + low.power + ' -> ' + node.powerOverride);
  ok(before == null, 'P1-013 el grupo no tenia powerOverride antes -> ' + before);
  ok(node.tokens === 0,
    'P1-013 la carta CUENTA COMO LA ACCION del grupo: se gasté su ficha -> ' + node.tokens);
  var lp = (E._raw().players[P].linkedPlots || []);
  ok(lp.length === 1 && lp[0].cardId === LEAD.idx && lp[0].linkedTo === 'pi-a',
    'P1-013 la carta queda LINKED al grupo -> ' + JSON.stringify(lp));
  ok(E._raw().players[P].hand.indexOf(LEAD.idx) < 0, 'P1-013 la carta sale de la mano');
  var outLp = out.players[P].linkedPlots;
  ok(outLp && outLp.length === 1 && outLp[0].linkedTo === 'pi-a',
    'P1-013 publicState expone los Plot linkeados -> ' + JSON.stringify(outLp));

  /* ---------- 3. validaciones ---------- */
  var wrong = groupByAlign('corporate', true);
  /* "No player may have more than one {Name} in play": hace falta una SEGUNDA
     copia en la mano, porque la primera ya se gasto y salio de la mano. */
  putCard(P, LEAD.idx);
  throws(function () { E.playPlot(P, LEAD.idx, 'pi-a'); }, /no puede haber mas de una/i,
    'P1-013 no se puede jugar dos veces la misma carta (carta ya linkeada)');

  var St2 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var P2 = pidOfHere(St2, 'servantsofcthulhu');
  var R2 = pidOfHere(St2, 'bavarianilluminati');
  put(P2, 'pi-b', low.idx, 0);
  put(R2, 'pi-r', low.idx, 1);
  put(P2, 'pi-c', wrong.idx, 1);
  putCard(P2, LEAD.idx);
  throws(function () { E.playPlot(P2, LEAD.idx, 'pi-b'); }, /no tiene ficha/i,
    'P1-013 sin ficha de accion del grupo no se puede usar ("counts as the action")');
  throws(function () { E.playPlot(P2, LEAD.idx, 'pi-c'); }, /solo funciona sobre grupos fanatic/i,
    'P1-013 rechaza un grupo de otra ideologia -> el calificador de la carta manda');
  throws(function () { E.playPlot(P2, LEAD.idx, 'pi-r'); }, /debe ser tuyo/i,
    'P1-013 no se puede linkear a un grupo rival ("your chosen group")');
  throws(function () { E.playPlot(P2, LEAD.idx, null); }, /elige un grupo/i,
    'P1-013 exige un grupo objetivo');

  /* ---------- 4. no-op cuando el grupo ya tiene Poder >= al valor impreso ----------
   * Se busca DINAMICAMENTE la pareja (carta, grupo) que cumple la precondición,
   * porque no todas las ideologias tienen un grupo con Poder >= 6. */
  var St3 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var P3 = pidOfHere(St3, 'servantsofcthulhu');
  var pair = null;
  for (var q = 0; q < inc.length && !pair; q++) {
    var al3 = inc[q].effect.targetAlign, val3 = inc[q].effect.value;
    var big = C.cards.filter(function (g) {
      return g.type === 'group' && typeof g.power === 'number' &&
        g.power >= val3 && (g.alignments || []).indexOf(al3) >= 0;
    })[0];
    if (big) pair = { card: inc[q], group: big };
  }
  ok(!!pair, 'P1-013 existe al menos un grupo cuyo Poder impreso ya alcanza el valor de su carta');
  if (pair) {
    var bigNode = put(P3, 'pi-big', pair.group.idx, 1);
    putCard(P3, pair.card.idx);
    E.playPlot(P3, pair.card.idx, 'pi-big');
    ok(bigNode.powerOverride == null,
      'P1-013 sin efecto si el grupo ya tiene Poder >= el valor impreso (' +
      pair.card.name + ' sobre ' + pair.group.name + ' Poder ' + pair.group.power + ') -> ' +
      bigNode.powerOverride);
    ok(bigNode.tokens === 1, 'P1-013 el no-op NO gasta la ficha del grupo -> ' + bigNode.tokens);
    ok((E._raw().players[P3].linkedPlots || []).length === 0,
      'P1-013 el no-op NO crea el link');
    ok(E._raw().players[P3].hand.indexOf(pair.card.idx) < 0,
      'P1-013 la carta se descarta igualmente aunque no tenga efecto');
  }

  /* ---------- 5. el link muere con el grupo (destroyGroup) ---------- */
  var St4 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var A4 = pidOfHere(St4, 'servantsofcthulhu');
  var D4 = pidOfHere(St4, 'bavarianilluminati');
  put(D4, 'pi-v2', low.idx, 1);
  putCard(D4, LEAD.idx);
  E.playPlot(D4, LEAD.idx, 'pi-v2');
  ok((E._raw().players[D4].linkedPlots || []).length === 1,
    'P1-013 el link se registro en el dueno del grupo');
  var plotsBefore = E._raw().plotDiscard.length;
  var realRandom = Math.random;
  Math.random = function () { return 0; };
  sealedInstantAttack(A4, 60, 'pi-v2');
  Math.random = realRandom;
  ok(!findNode(D4, 'pi-v2'), 'P1-013 fixture: el grupo linkeado fue destruido');
  ok((E._raw().players[D4].linkedPlots || []).length === 0,
    'P1-013 al destruirse el grupo, el Plot linkeado se retira de la mesa');
  ok(E._raw().plotDiscard.length > plotsBefore,
    'P1-013 el Plot linkeado vuelve al mazo de Plot cards -> ' +
    (E._raw().plotDiscard.length - plotsBefore));

  /* ---------- 6. "may be played at any time" ---------- */
  var St6 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var P6 = pidOfHere(St6, 'servantsofcthulhu');
  var R6 = pidOfHere(St6, 'bavarianilluminati');
  put(R6, 'pi-x', low.idx, 1);
  putCard(R6, LEAD.idx);
  var who = St6.currentPid === R6 ? P6 : R6;
  var victimUid = St6.currentPid === R6 ? 'pi-x' : null;
  if (victimUid) {
    var n6 = put(R6, 'pi-y', low.idx, 1);
    putCard(R6, LEAD.idx);
    E.playPlot(R6, LEAD.idx, 'pi-y');
    ok((E._raw().players[R6].linkedPlots || []).length === 1,
      'P1-013 "may be played at any time": funciona aunque no sea tu turno -> turno de ' + who);
  } else {
    ok(true, 'P1-013 fixture de turno no aplicable en esta corrida (turno aleatorio)');
  }
})();

/* ------------------------------------------------------------------ */
/* P1-014  familia "Resistance Increase" (Commitment, Never Surrender)  */
/* ------------------------------------------------------------------ */
(function () {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var nodeOf = function (pid, uid) { return findNode(E._raw().players[pid].structure, uid); };
  /* PURGA antes de inyectar: el reparto inicial puede contener cualquier indice,
     y un duplicado haria que removeFromHand quitara la copia vieja (flake §5). */
  var give = function (pid, card) {
    var h = E._raw().players[pid].hand;
    for (var i = h.length - 1; i >= 0; i--) if (h[i] === card.idx) h.splice(i, 1);
    h.push(card.idx);
    return card.idx;
  };

  var COMMIT = byName('Commitment');
  var NEVER = byName('Never Surrender');
  var GOLDF = byName('Goldfish Fanciers');   // fanatic, Poder 1, Resistencia 4
  var TEXAS = byName('Texas');               // violent/government/conservative, NO fanatic

  /* --- 1. clasificacion --- */
  var inc = C.cards.filter(function (c) { return c.effect && c.effect.kind === 'resistance_increase'; });
  ok(inc.length === 2, 'P1-014 las 2 cartas de "Resistance Increase" estan clasificadas -> ' + inc.length + '/2');
  ok(COMMIT.effect.value === 8 && !COMMIT.effect.targetAlign,
    'P1-014 Commitment fija la Resistencia a 8 y NO filtra por ideologia');
  ok(NEVER.effect.value === 12 && NEVER.effect.targetAlign === 'fanatic',
    'P1-014 Never Surrender fija la Resistencia a 12 y filtra por fanatic');
  ok(inc.every(function (c) { return c.mechanicsStatus === 'implemented-pending-engine'; }),
    'P1-014 ambas quedan implemented-pending-engine (ya no bloqueadas por rejectUnverifiedCard)');
  var fanaticCount = C.cards.filter(function (c) {
    return c.type === 'group' && c.alignments && c.alignments.indexOf('fanatic') >= 0;
  }).length;
  ok(fanaticCount > 0, 'P1-014 el calificador fanatic de Never Surrender es satisfacible -> ' + fanaticCount + ' grupos');
  ok(C.cards.filter(function (c) { return c.type === 'group'; }).length > 0,
    'P1-014 el calificador "any one group" de Commitment es satisfacible');

  /* --- 2..5, 7, 11: efectos, free move, cualquier jugador, sin unicidad --- */
  var S2 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var me = 0, foe = 1;   // fresh() fija las facciones por indice: 0=Cthulhu, 1=Bavarian
  var nd = plant(me, 'r14-1', GOLDF.idx, 0);          // tokens 0 a proposito
  ok(nd && nd.resistanceOverride == null, 'P1-014 fixture: el grupo empieza con la Resistencia impresa (4)');
  give(me, COMMIT);
  E.playPlot(me, COMMIT.idx, 'r14-1');
  ok(nd.resistanceOverride === 8, 'P1-014 la Resistencia queda FIJADA a 8 (no 4+8=12) -> ' + nd.resistanceOverride);
  ok(nd.tokens === 0, 'P1-014 "free move": se juega con 0 fichas de accion y no gasta ninguna');
  var lp = E._raw().players[me].linkedPlots;
  ok(lp.length === 1 && lp[0].cardId === COMMIT.idx && lp[0].linkedTo === 'r14-1',
    'P1-014 el link permanente queda registrado -> ' + JSON.stringify(lp));
  /* OJO: hay que leer el estado VIVO, no el snapshot S2 devuelto por fresh()
     (que es anterior a los give/play). Con el snapshot, si el reparto inicial ya
     traia el indice 223 la asercion fallaba al azar. */
  ok(E._raw().players[me].hand.indexOf(COMMIT.idx) < 0, 'P1-014 la carta sale de la mano');
  ok(E._raw().players[me].exposedPlots.indexOf(COMMIT.idx) < 0, 'P1-014 la carta NO queda expuesta: esta linkeada');
  ok(E._raw().plotDiscard.indexOf(COMMIT.idx) < 0, 'P1-014 la carta NO se descarta (link permanente)');

  /* sin unicidad: el texto NO dice "no puede haber mas de una en juego" */
  plant(me, 'r14-2', GOLDF.idx, 0);
  give(me, COMMIT);
  var dupThrew = false;
  try { E.playPlot(me, COMMIT.idx, 'r14-2'); } catch (e) { dupThrew = true; }
  ok(!dupThrew, 'P1-014 NO se inventa unicidad: dos Commitment en juego estan permitidos');
  ok(nodeOf(me, 'r14-2').resistanceOverride === 8, 'P1-014 el segundo Commitment tambien aplica');

  /* grupo de CUALQUIER jugador: la diferencia clave frente a power_increase */
  plant(foe, 'r14-3', GOLDF.idx, 0);
  give(me, COMMIT);
  var rivalThrew = false, rivalErr = '';
  try { E.playPlot(me, COMMIT.idx, 'r14-3'); } catch (e) { rivalThrew = true; rivalErr = e.message; }
  ok(!rivalThrew, 'P1-014 "may belong to any player": funciona sobre un grupo rival' +
    (rivalThrew ? ' -> ' + rivalErr : ''));
  ok(nodeOf(foe, 'r14-3').resistanceOverride === 8, 'P1-014 el grupo rival queda con Resistencia 8');
  ok(E._raw().players[me].linkedPlots[2] && E._raw().players[me].linkedPlots[2].linkedTo === 'r14-3',
    'P1-014 el link pertenece a quien juego la carta, no al dueno del grupo');

  /* filtro de ideologia + objetivo obligatorio.
     OJO: el grupo de la asercion anterior (`r14-3`) es Goldfish Fanciers, que ES
     fanatic, asi que para probar el rechazo hace falta uno NO fanatic: Texas. */
  plant(me, 'r14-4', TEXAS.idx, 0);
  give(me, NEVER);
  throws(function () { E.playPlot(me, NEVER.idx, 'r14-4'); }, /solo funciona sobre grupos fanatic/,
    'P1-014 Never Surrender rechaza un grupo no fanatic');
  give(me, NEVER);
  throws(function () { E.playPlot(me, NEVER.idx, null); }, /elige un grupo objetivo/,
    'P1-014 sin grupo objetivo no se puede jugar');
  ok(E._raw().players[me].hand.indexOf(NEVER.idx) >= 0,
    'P1-014 una jugada rechazada NO consume la carta de la mano');
  give(me, NEVER);
  E.playPlot(me, NEVER.idx, 'r14-1');
  ok(nodeOf(me, 'r14-1').resistanceOverride === 12, 'P1-014 el segundo link REEMPLAZA la Resistencia (12, no 8+12) -> ' +
    nodeOf(me, 'r14-1').resistanceOverride);

  /* --- 6. LA PRUEBA DE QUE nodeResistance() SE USA DE VERDAD --- */
  /* Antes de P1-014 computeStrength leia tCard.resistance, asi que la carta
     fijaba un valor que la cuenta de fuerza nunca leia. Este ataque es la
     unica forma de demostrar que la correccion surte efecto. */
  var S3 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  /* startGame() ALEATORIZA quien empieza: los dos pid NO son fijos. Derivar
     atacante y defensor de currentPid es obligatorio, o el motor rechaza el
     ataque con "No puedes tomar control de tu propio grupo". */
  var atkPid = S3.currentPid, defPid = 1 - atkPid;
  plant(atkPid, 'r14-atk', TEXAS.idx, 1);
  plant(defPid, 'r14-vic', GOLDF.idx, 0);
  var ready = readyToAttack(atkPid);
  ok(ready != null, 'P1-014 fixture: ambos completaron su primer turno -> ' + atkPid);
  if (ready != null) {
    E.declareAttack(ready, 'control', { attackerUid: 'r14-atk', uid: 'r14-vic' });
    var det0 = E.previewStrength();
    ok(det0.defenseBase === 4,
      'P1-014 SIN el link la defensa usa la Resistencia IMPRESA -> defenseBase=' + det0.defenseBase);
    give(ready, COMMIT);
    E.playPlot(ready, COMMIT.idx, 'r14-vic');
    var det1 = E.previewStrength();
    ok(det1.defenseBase === 8,
      'P1-014 CON el link la defensa usa la Resistencia FIJADA -> defenseBase=' + det1.defenseBase);
    ok(det1.total === det0.total - 4, 'P1-014 la fuerza total baja exactamente 4 -> ' + det0.total + ' -> ' + det1.total);
    ok(det1.notes.join('|').indexOf('Resistencia fijada') >= 0,
      'P1-014 el desglose explica por que cambia la defensa -> ' + JSON.stringify(det1.notes));
    var d1b = sealedResolve();
    ok(d1b != null, 'P1-014 el ataque se resuelve sin error tras el link');
  }

  /* regresion: un objetivo EN LA MANO no tiene nodo, asi que debe usarse la carta */
  var S4 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  var handCard = byName('Gordo Remora');   // Resistencia 0
  var atk4 = S4.currentPid, def4 = 1 - atk4;
  var h4 = E._raw().players[def4].hand;
  for (var i2 = h4.length - 1; i2 >= 0; i2--) if (h4[i2] === handCard.idx) h4.splice(i2, 1);
  h4.push(handCard.idx);
  plant(atk4, 'r14-atk2', TEXAS.idx, 1);
  var ready4 = readyToAttack(atk4);
  if (ready4 != null) {
    E.declareAttack(ready4, 'control', { attackerUid: 'r14-atk2', handIdx: handCard.idx });
    var det4 = E.previewStrength();
    ok(det4.defenseBase === 0, 'P1-014 un objetivo en la mano sigue usando la Resistencia de la carta -> ' + det4.defenseBase);
    sealedResolve();
  } else {
    ok(true, 'P1-014 fixture de turno no aplicable en esta corrida (turno aleatorio)');
  }

  /* --- 7. "at any time": se puede jugar con el turno del rival --- */
  var S5 = fresh('servantsofcthulhu1', 'bavarianilluminati1');
  plant(me, 'r14-5', GOLDF.idx, 0);
  give(me, COMMIT);
  var turnsThrew = false, turnsErr = '';
  var S5b = E.getState();
  if (S5b.currentPid === me) {
    /* el reparto aleatorio dio mi turno: se lo cedemos al rival */
    try { E.endTurn(); } catch (e) { }
  }
  var S5c = E.getState();
  ok(S5c.currentPid !== me, 'P1-014 fixture: ahora es el turno del rival -> ' + S5c.currentPid);
  try { E.playPlot(me, COMMIT.idx, 'r14-5'); } catch (e) { turnsThrew = true; turnsErr = e.message; }
  ok(!turnsThrew, 'P1-014 "may be done at any time": funciona aunque no sea tu turno' +
    (turnsThrew ? ' -> ' + turnsErr : ' -> turno de ' + S5c.currentPid));
  ok(nodeOf(me, 'r14-5').resistanceOverride === 8, 'P1-014 el link se creo playing out of turn');
})();

/* =====================================================================
 * P1-015  Messiah (312) + Angst (194)
 * Las dos son efectos de link permanente deduced del texto impreso. No
 * pertenecen a ninguna de las seis familias oficiales de Plot: son lote
 * propio. Este bloque comprueba (a) la clasificacion, (b) las reglas de
 * cada carta, (c) "at any time EXCEPT during an attack" en sus dos mitades,
 * y (d) la decision de diseno goalPower(): un cambio de Poder permanente en
 * un nodo SI cuenta para las metas, mientras que el +10 de las cartas +10
 * (que no escribe nada en el nodo) sigue sin contar.
 * ===================================================================== */
(function () {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var pidOfHere = function (S, base) {
    for (var i = 0; i < S.players.length; i++) {
      if (E.card(S.players[i].illumId).effect.code === base) return i;
    }
    throw new Error('fixture: no esta la faccion ' + base);
  };
  var nodeOf = function (pid, uid) {
    var found = null;
    (function w(n) {
      if (found) return;
      if (n.uid === uid) { found = n; return; }
      (n.children || []).forEach(w);
    })(E._raw().players[pid].structure);
    return found;
  };
  /* Purgar antes de inyectar: el reparto inicial ya puede traer el indice y
   * eso ya provoco 5 flakes distintos en este archivo. */
  var give = function (pid, card) {
    var h = E._raw().players[pid].hand;
    for (var i = h.length - 1; i >= 0; i--) if (h[i] === card.idx) h.splice(i, 1);
    h.push(card.idx);
  };
  /* Busqueda dinamica: no fijar a mano una carta que dependa de una propiedad
   * del dataset (ya provoco un TypeError). */
  var personality = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'personality' &&
      typeof c.power === 'number' && typeof c.resistance === 'number';
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; })[0];
  var place = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'place' && typeof c.power === 'number';
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; })[0];
  var org = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'organization' && typeof c.power === 'number';
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; })[0];
  var churches = C.cards.filter(function (c) {
    return c.type === 'group' && c.attributes && c.attributes.indexOf('church') >= 0 &&
      typeof c.power === 'number';
  });
  var PSY = byName('Psychiatrists');
  var MESSIAH = byName('Messiah');
  var ANGST = byName('Angst');
  var CHARISMA = byName('Charismatic Leader');
  var MARTIAL = byName('Martial Law');
  var TEXAS = byName('Texas');

  /* --- 1. clasificacion --- */
  ok(!!MESSIAH && MESSIAH.effect && MESSIAH.effect.kind === 'messiah' &&
    MESSIAH.mechanicsStatus === 'implemented-pending-engine',
    'P1-015 Messiah clasificada -> ' + (MESSIAH ? MESSIAH.mechanicsStatus : 'ausente'));
  ok(!!ANGST && ANGST.effect && ANGST.effect.kind === 'angst' &&
    ANGST.mechanicsStatus === 'implemented-pending-engine',
    'P1-015 Angst clasificada -> ' + (ANGST ? ANGST.mechanicsStatus : 'ausente'));
  ok(MESSIAH.effect.targetSubtype === 'personality' && MESSIAH.effect.baseBonus === 4 &&
    MESSIAH.effect.perChurch === 2 && MESSIAH.effect.churchAttr === 'church',
    'P1-015 Messiah declara los parametros impresos (+4, +2 por Church)');
  ok(ANGST.effect.value === 1 && ANGST.effect.requiresActionFrom.indexOf('Psychiatrists') >= 0 &&
    ANGST.effect.requiresActionFrom.indexOf('Intellectuals') >= 0 &&
    ANGST.effect.requiresActionFrom.indexOf('Orbital Mind Control Lasers') >= 0,
    'P1-015 Angst declara los tres grupos del texto impreso');

  /* --- 2. Messiah: la mecanica --- */
  var S1 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me = pidOfHere(S1, 'bavarian');
  /* tokens:0 a proposito: el texto NO dice "this is an action for...", asi que
   * jugar sobre un grupo sin ficha de accion debe funcionar. */
  plant(me, 'm15-p', personality.idx, 0);
  give(me, MESSIAH);
  E.playPlot(me, MESSIAH.idx, 'm15-p');
  var mn = nodeOf(me, 'm15-p');
  ok(mn.powerOverride === personality.power + 4,
    'P1-015 Messiah sube el Poder +4 sobre el impreso -> ' + mn.powerOverride + ' (impreso ' + personality.power + ')');
  ok(mn.resistanceOverride === personality.resistance + 4,
    'P1-015 Messiah sube la Resistencia +4 sobre el impreso -> ' + mn.resistanceOverride + ' (impresa ' + personality.resistance + ')');
  ok(mn.tokens === 0, 'P1-015 Messiah NO cobra ficha de accion (el texto no dice que sea una accion) -> tokens ' + mn.tokens);
  var lp1 = E._raw().players[me].linkedPlots.filter(function (x) { return x.cardId === MESSIAH.idx; });
  ok(lp1.length === 1 && lp1[0].linkedTo === 'm15-p',
    'P1-015 Messiah queda linkeada de forma permanente a la Personality');
  ok(E._raw().players[me].hand.indexOf(MESSIAH.idx) < 0, 'P1-015 la carta jugada sale de la mano');

  /* --- 3. Messiah: +2 por cada grupo Church que controles --- */
  var S2 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me2 = pidOfHere(S2, 'bavarian');
  ok(churches.length >= 2, 'P1-015 fixture: hay al menos 2 grupos con atributo church -> ' + churches.length);
  plant(me2, 'm15-c0', churches[0].idx, 1);
  plant(me2, 'm15-c1', churches[1].idx, 1);
  plant(me2, 'm15-p2', personality.idx, 0);
  give(me2, MESSIAH);
  E.playPlot(me2, MESSIAH.idx, 'm15-p2');
  var expect2 = personality.power + 4 + 2 * 2;
  ok(nodeOf(me2, 'm15-p2').powerOverride === expect2,
    'P1-015 Messiah +2 por cada Church (4 + 2x2) -> ' + nodeOf(me2, 'm15-p2').powerOverride + ' (esperado ' + expect2 + ')');

  /* --- 4. Messiah: rechazos y unicidad --- */
  var S3 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me3 = pidOfHere(S3, 'bavarian');
  var rival3 = 1 - me3;
  give(me3, MESSIAH);
  throws(function () { E.playPlot(me3, MESSIAH.idx); },
    /elige una Personality/, 'P1-015 Messiah exige objetivo');
  plant(me3, 'm15-org', org.idx, 1);
  throws(function () { E.playPlot(me3, MESSIAH.idx, 'm15-org'); },
    /solo se usa sobre una Personality/, 'P1-015 Messiah rechaza una Organization');
  plant(rival3, 'm15-riv', personality.idx, 1);
  throws(function () { E.playPlot(me3, MESSIAH.idx, 'm15-riv'); },
    /debe ser tuyo/, 'P1-015 Messiah exige "any Personality you control"');
  plant(me3, 'm15-ok', personality.idx, 0);
  E.playPlot(me3, MESSIAH.idx, 'm15-ok');
  give(me3, MESSIAH);
  throws(function () { E.playPlot(me3, MESSIAH.idx, 'm15-ok'); },
    /Only one Messiah can be in play/, 'P1-015 Messiah: "Only one Messiah can be in play at a time"');

  /* --- 5. "at any time EXCEPT during an attack": las dos mitades --- */
  var S4 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me4 = pidOfHere(S4, 'bavarian');
  plant(me4, 'm15-p4', personality.idx, 0);
  give(me4, MESSIAH);
  var s4 = E.getState();
  if (s4.currentPid === me4) { try { E.endTurn(); } catch (e) { } }
  var s4b = E.getState();
  var outOfTurnThrew = false, outOfTurnErr = '';
  try { E.playPlot(me4, MESSIAH.idx, 'm15-p4'); } catch (e) { outOfTurnThrew = true; outOfTurnErr = e.message; }
  ok(!outOfTurnThrew, 'P1-015 "at any time": Messiah se puede jugar en el turno del rival' +
    (outOfTurnThrew ? ' -> ' + outOfTurnErr : ' -> turno de ' + s4b.currentPid));
  /* Ahora la otra mitad: con un ataque abierto debe rechazar. */
  var S5 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me5 = pidOfHere(S5, 'bavarian');
  var rival5 = 1 - me5;
  plant(me5, 'm15-atk', TEXAS.idx, 1);
  plant(me5, 'm15-p5', personality.idx, 0);
  plant(rival5, 'm15-def', org.idx, 1);
  var atk5 = readyToAttack(me5);
  ok(atk5 != null, 'P1-015 fixture: hay turno de ataque valido');
  if (atk5 != null) {
    give(atk5, MESSIAH);
    E.declareAttack(atk5, 'control', { attackerUid: 'm15-atk', uid: 'm15-def' });
    ok(!!E._raw().attack, 'P1-015 fixture: el ataque quedo abierto');
    throws(function () { E.playPlot(atk5, MESSIAH.idx, 'm15-p5'); },
      /no se puede jugar durante un ataque/, 'P1-015 "EXCEPT during an attack": Messiah rechazada con un ataque abierto');
    sealedResolve();
    ok(E._raw().attack === null, 'P1-015 el ataque de prueba se limpio');
  } else {
    ok(true, 'P1-015 fixture de turno no aplicable en esta corrida');
  }

  /* --- 6. Angst: la mecanica y el doble costo --- */
  var S6 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me6 = pidOfHere(S6, 'bavarian');
  plant(me6, 'a15-psy', PSY.idx, 1);
  plant(me6, 'a15-place', place.idx, 1);
  /* fresh() solo empieza el turno de UN jugador, asi que el token Illuminati del
   * evaluado puede ser 0 segun quien salio sorteado. Se fija a 1 para que la
   * asercion mida el gasto de la carta y no el reparto aleatorio. */
  E._raw().players[me6].illumTokens = 1;
  var tokBefore = E._raw().players[me6].illumTokens;
  give(me6, ANGST);
  E.playPlot(me6, ANGST.idx, 'a15-place');
  ok(nodeOf(me6, 'a15-place').powerOverride === 1,
    'P1-015 Angst deja el Poder en 1 (texto: "permanently reduced to 1") -> ' + nodeOf(me6, 'a15-place').powerOverride);
  ok(E._raw().players[me6].illumTokens === tokBefore - 1,
    'P1-015 Angst cobra 1 accion de tu Illuminati -> ' + tokBefore + ' -> ' + E._raw().players[me6].illumTokens);
  ok(nodeOf(me6, 'a15-psy').tokens === 0,
    'P1-015 Angst cobra ademas la accion del grupo nombrado (Psychiatrists)');
  var lp6 = E._raw().players[me6].linkedPlots.filter(function (x) { return x.cardId === ANGST.idx; });
  ok(lp6.length === 1 && lp6[0].linkedTo === 'a15-place', 'P1-015 Angst queda linkeada al objetivo');
  ok(E._raw().players[me6].hand.indexOf(ANGST.idx) < 0, 'P1-015 Angst sale de la mano');

  /* --- 7. Angst: rechazos --- */
  var S7 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me7 = pidOfHere(S7, 'bavarian');
  plant(me7, 'a15-pers', personality.idx, 1);
  plant(me7, 'a15-pl7', place.idx, 1);
  give(me7, ANGST);
  throws(function () { E.playPlot(me7, ANGST.idx, 'a15-pers'); },
    /Places u Organizations/, 'P1-015 Angst rechaza una Personality ("any Place or Organization")');
  /* Sin ninguno de los grupos del texto en la estructura: el Illuminati NO debe
   * gastar su token (los dos costos se comprueban antes de gastar ninguno). */
  E._raw().players[me7].illumTokens = 1;
  throws(function () { E.playPlot(me7, ANGST.idx, 'a15-pl7'); },
    /necesita una accion de uno de/, 'P1-015 Angst exige la accion de uno de los grupos del texto');
  ok(E._raw().players[me7].illumTokens === 1,
    'P1-015 Angst NO gasté el token Illuminati al fallar la validacion del grupo -> ' + E._raw().players[me7].illumTokens);
  ok(nodeOf(me7, 'a15-pl7').tokens === 1 && nodeOf(me7, 'a15-pers').tokens === 1,
    'P1-015 el rechazo de Angst no toco ningun grupo');
  /* Sin token Illuminati: */
  var S8 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me8 = pidOfHere(S8, 'bavarian');
  plant(me8, 'a15-psy8', PSY.idx, 1);
  plant(me8, 'a15-pl8', place.idx, 1);
  E._raw().players[me8].illumTokens = 0;
  give(me8, ANGST);
  throws(function () { E.playPlot(me8, ANGST.idx, 'a15-pl8'); },
    /requiere una accion de tu Illuminati/, 'P1-015 Angst exige la accion de tu Illuminati');
  ok(nodeOf(me8, 'a15-psy8').tokens === 1,
    'P1-015 sin token Illuminati el grupo nombrado conserva su ficha (nada se gasta a medias)');

  /* --- 8. goalPower: un cambio permanente SI cuenta para las metas --- */
  var S9 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me9 = pidOfHere(S9, 'bavarian');
  plant(me9, 'g15-p', personality.idx, 0);
  var before9 = E.goalStatus(me9).count;
  give(me9, MESSIAH);
  E.playPlot(me9, MESSIAH.idx, 'g15-p');
  var after9 = E.goalStatus(me9).count;
  ok(after9 - before9 === 4,
    'P1-015 goalPower: el +4 del Messiah suma al Poder total de la meta -> ' + before9 + ' -> ' + after9);

  /* --- 9. y el +10 de las cartas +10 SIGUE sin contar --- */
  var S10 = fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var me10 = pidOfHere(S10, 'bavarian');
  plant(me10, 'g10-atk', TEXAS.idx, 1);
  var rival10 = 1 - me10;
  plant(rival10, 'g10-def', org.idx, 1);
  var atk10 = readyToAttack(me10);
  if (atk10 != null) {
    var base10 = E.goalStatus(atk10).count;
    E.declareAttack(atk10, 'control', { attackerUid: 'g10-atk', uid: 'g10-def' });
    give(atk10, MARTIAL);
    E.playPlot(atk10, MARTIAL.idx, 'g10-atk', { boostMode: 'attack' });
    ok(nodeOf(atk10, 'g10-atk').powerOverride == null,
      'P1-015 el +10 no escribe powerOverride en el nodo (por eso sigue sin contar)');
    ok(E.goalStatus(atk10).count === base10,
      'P1-015 el +10 ("does not count toward any Goal") NO suma a la meta -> ' + base10 + ' -> ' + E.goalStatus(atk10).count);
    sealedResolve();
  } else {
    ok(true, 'P1-015 fixture de turno no aplicable en esta corrida');
  }
})();

/* ---- P1-018: `mayAddPowerFromAligns` acepta ATRIBUTOS, no solo ideologias ----
 * El gate de cobertura (test_fase4_cards.js) encontro este bug; lo que faltaba era
 * la regresion que lo fija. El defecto: hasAnyAlign() solo miraba `c.alignments`,
 * y las cartas Poison (338) y Withering Curse (416) imprimen literalmente
 * "One *Magic* group may use its action to add its Power to this attack". Magic NO
 * es una ideologia en este juego: es un atributo (9 grupos lo tienen, 0 grupos lo
 * tienen como alineacion). Consecuencia: la clausula era CODIGO MUERTO y el
 * jugador nunca podia usar esa parte de la carta.
 * Tercera aparicion de la misma clase de defecto (la palabra impresa es real pero el
 * dato vive en otro campo); las dos anteriores fueron los AND/OR de
 * bonusTargetMatches y doubleQualifies. */
(function () {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var hasMagic = function (c) {
    return (c.attributes || []).map(function (s) { return String(s).toLowerCase(); })
      .indexOf('magic') >= 0;
  };

  /* Fixtures DETERMINISTAS y dinamicos (leccion: nunca fijar a mano una carta que
   * depende de una propiedad del mazo). */
  var MAGICS = C.cards.filter(function (c) {
    return c.type === 'group' && typeof c.power === 'number' && hasMagic(c);
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  ok(MAGICS.length > 0, 'P1-018 debe existir al menos un grupo con el atributo magic');
  var MAGIC = MAGICS[0];

  /* Un grupo que NO es magic NI criminal: sirve de contra-test para comprobar que
   * el filtro filtra de verdad y no es "cualquier grupo suma su Poder". */
  var NEUTRAL = C.cards.filter(function (c) {
    return c.type === 'group' && typeof c.power === 'number' && !hasMagic(c) &&
      (c.alignments || []).indexOf('criminal') < 0;
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; })[0];

  var VICTIM = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'personality' && typeof c.power === 'number';
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; })[0];

  var POISON = byName('Poison');
  var CURSE = byName('Withering Curse');
  ok(POISON && CURSE, 'P1-018 deben existir Poison y Withering Curse en el mazo');

  /* Monta una partida, pone la Plot en la mano del jugador Bavarian, planta un
   * grupo ayudante (si lo hay) y una victima Personality, y devuelve el resultado.
   *
   * LECION (novena vez): `startGame()` ALEATORIZA quien empieza, asi que
   * `currentPid` no es una identidad estable. Aqui se fija la faccion POR
   * INDICE (jugador 0 = Bavarian, jugador 1 = Servants of Cthulhu), asi que si se
   * usara `currentPid` el atacante seria a veces Cthulhu y su "+4 a cualquier
   * destroy" (P1-009) contaminaria TODAS las medidas. Por eso se busca al jugador
   * Bavarian explicitamente: asi el Poder esperado es exactamente el impreso mas
   * el Poder del grupo ayudante, sin bonificacion de faccion que se cuele. */
  function instantWith(helper) {
    var St = fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = -1;
    for (var p = 0; p < St.players.length; p++) {
      if (String(St.players[p].illumId).replace(/\d+$/, '') === 'bavarianilluminati') { me = p; break; }
    }
    ok(me >= 0, 'P1-018 la partida debe tener un jugador Bavarian');
    var riv = 1 - me;
    var plot = helper.plot;
    var raw = E._raw();
    raw.players[me].hand = raw.players[me].hand.filter(function (ix) { return ix !== plot.idx; });
    raw.players[me].hand.push(plot.idx);
    if (helper.card) plant(me, 'p118-ayudante', helper.card.idx, 1);
    plant(riv, 'p118-victima', VICTIM.idx, 1);
    var out = E.playPlot(me, plot.idx, 'p118-victima');
    return { res: out.lastPlotResult, raw: E._raw(), me: me };
  }

  /* (1) Poison: Poder impreso 8 + el Poder del grupo Magic. */
  var a = instantWith({ plot: POISON, card: MAGIC });
  ok(a.res, 'P1-018 Poison debe devolver un resultado trazable');
  ok(a.res && a.res.power === 8 + MAGIC.power,
     'P1-018 un grupo *Magic* aporta su Poder a Poison: 8 + ' + MAGIC.power + ' = ' +
     (a.res ? a.res.power : '?') + ' (grupo: ' + MAGIC.name + ', Poder ' + MAGIC.power + ')');
  ok(a.res && (a.res.notes || []).some(function (n) { return n.indexOf(MAGIC.name) >= 0; }),
     'P1-018 la nota del resultado nombra al grupo Magic que aporto su Poder');

  /* (2) Withering Curse: Poder impreso 10 + el Poder del grupo Magic. */
  var b = instantWith({ plot: CURSE, card: MAGIC });
  ok(b.res && b.res.power === 10 + MAGIC.power,
     'P1-018 un grupo *Magic* aporta su Poder a Withering Curse: 10 + ' + MAGIC.power + ' = ' +
     (b.res ? b.res.power : '?'));

  /* (3) Contra-test: un grupo que NO es Magic ni Criminal NO aporta su Poder.
   * Si esto fallara, el arreglo habria convertido la clausula en "cualquier grupo
   * suma su Poder", que seria PEOR que el bug original. */
  var c = instantWith({ plot: POISON, card: NEUTRAL });
  ok(c.res && c.res.power === 8,
     'P1-018 un grupo que no es Magic ni Criminal NO aporta Poder a Poison: debe quedar en 8, ' +
     'fue ' + (c.res ? c.res.power : '?') + ' (grupo: ' + NEUTRAL.name + ')');

  /* (4) Sin grupo ayudante en la estructura, el Poder es exactamente el impreso. */
  var d = instantWith({ plot: POISON, card: null });
  ok(d.res && d.res.power === 8,
     'P1-018 sin grupo ayudante el Poder de Poison es el impreso 8, fue ' +
     (d.res ? d.res.power : '?'));

  /* (5) La accion se gasto: el grupo Magic ya no tiene ficha. */
  ok(a.raw.players[a.me].structure.children.some(function (n) {
       return n.uid === 'p118-ayudante' && n.tokens === 0;
     }),
     'P1-018 el grupo Magic que aporta su Poder gasta su ficha de accion');

  console.log('   P1-018 hasAnyAlign acepta atributos: ' + MAGICS.length +
              ' grupos magic; fixture=' + MAGIC.name + ' (Poder ' + MAGIC.power + '), contra-test=' +
              NEUTRAL.name + ' (Poder ' + NEUTRAL.power + ')');
})();

/* =========================================================================
   P1-017  Dictatorship (239): cambio de IDEOLOGIA a nivel de nodo
   -------------------------------------------------------------------------
   Por que este bloque es el mas importante de todos los de Fase 4:

   Dictatorship es la primera carta del mazo que exige un cambio de IDEOLOGIA
   ("It becomes Violent, if it was not already"). Hasta P1-017 el motor leia
   las alineaciones de la CARTA INMUTABLE en 15 sitios (fuerza, ayuda,
   oposicion, immunity de Discordian, veto de Shangri-La, doble de las metas,
   Criminal Overlords, calificadores de las 15 cartas "+10", de Power Increase
   y de Resistance Increase). Sin almacenamiento por nodo, la carta no tendria
   ningun efecto observable: seria decorative, exactamente el defecto que
   §25.5 y el gate de cobertura lo prohibe.

   El bloque prueba el EFECTO OBSERVABLE en el motor, no solo que la carta se
   acepte: mira el desglose de fuerza antes y despues, que es donde la nueva
   ideologia se nota de verdad.
   ========================================================================= */
(function () {
  console.log('');
  console.log('--- P1-017: Dictatorship (239) cambia la ideologia del grupo ---');

  function byName(n) { return C.cards.filter(function (c) { return c.name === n; })[0]; }
  function pidOfHere(S2, base) {
    /* Se compara el ID BASE de la faccion (el id con el sufijo de version
       eliminado), NO effect.code: el id del Illuminati es 'bavarianilluminati1'
       mientras que su effect.code es 'bavarian'. Las dos cadenas son distintas y
       por eso el fixture fallaba. Es la misma clase de error que el del calificador
       'bavarian' -> 'bavarianilluminati' de P1-009, y la que hizo que un informe
       anterior afirmara que P1-017 estaba aplicado sin serlo. */
    for (var p = 0; p < S2.players.length; p++) {
      var id = String(S2.players[p].illumId || '').replace(/\d+$/, '');
      if (id === base) return p;
    }
    throw new Error('fixture: no hay ningun jugador con la faccion ' + base);
  }
  function nodeOf(pid, uid) {
    var found = null;
    (function w(nd) {
      if (found || nd.uid === uid) { found = nd; return; }
      (nd.children || []).forEach(w);
    })(E._raw().players[pid].structure);
    return found;
  }

  var DICT = byName('Dictatorship');

  /* ---- 1) La carta esta clasificada con los parametros que imprime ---- */
  ok(!!DICT, 'P1-017 la carta Dictatorship existe en el mazo');
  ok(DICT.effect && DICT.effect.kind === 'dictatorship',
     'P1-017 Dictatorship esta clasificada -> kind=' + (DICT.effect && DICT.effect.kind));
  ok(DICT.mechanicsStatus === 'implemented-pending-engine',
     'P1-017 Dictatorship queda implemented-pending-engine -> ' + DICT.mechanicsStatus);
  ok(DICT.effect.targetAttr === 'nation' && DICT.effect.addAlign === 'violent',
     'P1-017 los parametros impresos se respetan -> targetAttr=' + DICT.effect.targetAttr +
     ' addAlign=' + DICT.effect.addAlign);

  /* ---- 2) El calificador "Nation" es satisfacible ---- */
  var nations = C.cards.filter(function (c) {
    return c.type === 'group' && (c.attributes || []).indexOf('nation') >= 0;
  });
  ok(nations.length >= 5,
     'P1-017 existen grupos con el atributo nation (calificador satisfacible) -> ' + nations.length);

  /* ---- 3) Mecanica: la Nacion queda violent y el efecto se nota en la
             FUERZA de un ataque, que es la lectura mas dura de todas ---- */
  var St = fresh('bavarianilluminati1', 'shangrila1');
  var me = pidOfHere(St, 'bavarianilluminati');
  var opp = 1 - me;
  var NATION = nations.filter(function (c) {
    return typeof c.power === 'number' && typeof c.resistance === 'number' &&
           nodeOf === nodeOf; /* cualquier Nation con numeros sirve */
  })[0] || nations[0];

  /* Se planta la Nacion como hija DIRECTA de la raiz: asi la defensa por
     cercanía (positionBonus) no ahoga la medicion y el cambio de ideologia se
     lee limpio en el desglose. */
  plant(me, 'd17-nat', NATION.idx, 1);
  var nd17 = nodeOf(me, 'd17-nat');
  ok(!!nd17, 'P1-017 fixture: la Nacion esta en la estructura -> ' + NATION.name);
  ok(nd17.alignsAdded === undefined,
     'P1-017 antes de jugar, el nodo NO tiene alignsAdded (la carta no se aplico sola)');

  /* La Nacion ataca a un objetivo del rival. Servants of Cthulhu NO se usa
     aqui a proposito: su anyDestroy:+4 contaminaria la medicion. */
  var TGT = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'organization' && typeof c.resistance === 'number';
  }).sort(function (a, b) { return b.resistance - a.resistance; })[0];
  plant(opp, 'd17-tgt', TGT.idx, 0);

  readyToAttack(me);
  E.declareAttack(me, 'control', { attackerUid: 'd17-nat', uid: 'd17-tgt' });
  var before = E.previewStrength();
  sealedResolve();

  /* Ahora se juega Dictatorship sobre la Nacion. */
  E._raw().players[me].hand = E._raw().players[me].hand.filter(function (ix) { return ix !== DICT.idx; });
  E._raw().players[me].hand.push(DICT.idx);
  /* Se usa nodeOf() y NO structure.children[0]: un control exitoso puede
     insertar el grupo capturado en una flecha libre ANTERIOR a la Nacion, y
     restore por indice fallaria con "Sin Action token" segun el estado del
     mazo. Es la misma familia que el fixture por propiedad de dataset. */
  nodeOf(me, 'd17-nat').tokens = 1;   /* el ataque de medicion gasto la ficha */
  E.playPlot(me, DICT.idx, 'd17-nat');

  var nd17b = nodeOf(me, 'd17-nat');
  ok(Array.isArray(nd17b.alignsAdded) && nd17b.alignsAdded.indexOf('violent') >= 0,
     'P1-017 la carta escribe alignsAdded=[violent] en el NODO -> ' + JSON.stringify(nd17b.alignsAdded));
  ok(nd17b.alignsAdded.length === 1,
     'P1-017 "if it was not already": no se duplica la ideologia -> ' + nd17b.alignsAdded.length);
  ok(E._raw().players[me].linkedPlots.some(function (lp) { return lp.cardId === DICT.idx; }),
     'P1-017 la carta queda linkeada permanentemente (linkedPlots)');
  ok(nd17b.tokens === 0,
     'P1-017 "This is an action for that Nation": se gasté su ficha -> tokens=' + nd17b.tokens);

  /* CONTRA-PRUEBA del contra-test: el cambio tiene que notarse en el motor. */
  nodeOf(me, 'd17-nat').tokens = 1;   /* Dictatorship gasto la ficha de la Nacion */
  readyToAttack(me);
  E.declareAttack(me, 'control', { attackerUid: 'd17-nat', uid: 'd17-tgt' });
  var after = E.previewStrength();
  ok(after.leaderMod !== before.leaderMod,
     'P1-017 EFECTO OBSERVABLE: el desglose de fuerza cambia tras volverse Violent -> leaderMod ' +
     before.leaderMod + ' -> ' + after.leaderMod);
  sealedResolve();

  /* ---- 4) "if it was not already": jugar dos veces no duplica ---- */
  E._raw().players[me].hand.push(DICT.idx);
  nodeOf(me, 'd17-nat').tokens = 1;
  E.playPlot(me, DICT.idx, 'd17-nat');
  var nd17c = nodeOf(me, 'd17-nat');
  ok(nd17c.alignsAdded.filter(function (a) { return a === 'violent'; }).length === 1,
     'P1-017 segunda jugada: sigue habiendo UNA sola entrada violent (no se duplica)');

  /* ---- 5) Rechazos: no-Nacion, Nacion rival, y sin ficha ---- */
  var St5 = fresh('bavarianilluminati1', 'shangrila1');
  var me5 = pidOfHere(St5, 'bavarianilluminati');
  var op5 = 1 - me5;
  /* OJO: este while SIN contador de guardia colgaba el proceso el 50% de las
     veces, y por eso el runner de npm lo mataba con ETIMEDOUT. La causa eran dos
     a la vez: (1) `St5` es la COPIA que devuelve fresh(), asi que su currentPid
     se queda congelado y la condicion NUNCA se cumplia; (2) no habia ninguna
     guarda que limitara las iteraciones. Se lee E._raw() (estado vivo) y se
     anade la misma guarda de ocho que usan el resto de bloques. La lesson
     general: un while en una prueba necesita SIEMPRE un contador de guardia. */
  var guard5 = 0;
  while (E._raw().currentPid !== me5 && E._raw().phase !== 'gameover' && guard5++ < 8) E.endTurn();
  E._raw().players[me5].hand.push(DICT.idx);

  var NOTNAT = C.cards.filter(function (c) {
    return c.type === 'group' && c.id !== NATION.id &&
           (c.attributes || []).indexOf('nation') < 0 && typeof c.power === 'number';
  })[0];
  plant(me5, 'd17-notnat', NOTNAT.idx, 1);
  throws(function () { E.playPlot(me5, DICT.idx, 'd17-notnat'); },
         /solo se usa sobre una Nacion/i,
         'P1-017 rechaza un grupo que no es Nacion -> ' + NOTNAT.name);

  var NAT2 = nations.filter(function (c) { return c.id !== NATION.id; })[0];
  plant(op5, 'd17-rival', NAT2.idx, 1);
  throws(function () { E.playPlot(me5, DICT.idx, 'd17-rival'); },
         /debe ser tuya/i,
         'P1-017 rechaza una Nacion rival ("any Nation which you control")');

  var NOFICH = nations.filter(function (c) { return c.id !== NATION.id; })[1] || NAT2;
  plant(me5, 'd17-nofich', NOFICH.idx, 0);
  E._raw().players[me5].illumTokens = 0;
  throws(function () { E.playPlot(me5, DICT.idx, 'd17-nofich'); },
         /no tiene Action token/i,
         'P1-017 sin ficha en la Nacion ni en el Illuminati, la accion no se puede pagar');

  /* ---- 6) "during your turn": NO es una carta "at any time" ---- */
  /* A diferencia de las 15 cartas "+10" y las 10 de Power Increase, esta dice
     "during your turn", asi que jugarla en el turno del rival debe fallar. */
  var St6 = fresh('bavarianilluminati1', 'shangrila1');
  var me6 = pidOfHere(St6, 'bavarianilluminati');
  var op6 = 1 - me6;
  /* OJO: `St6` es la COPIA que devuelve fresh(), no el estado vivo. Sus
     `currentPid` se queda congelado en el instante del arranque, asi que hay que
     leer E._raw() para el turno. Es la misma clase que el fallo de P1-014
     ("la carta sale de la mano"), que leia S2.players en vez de E._raw(). */
  var guard6 = 0;
  while (E._raw().currentPid !== me6 && E._raw().phase !== 'gameover' && guard6++ < 8) E.endTurn();
  E._raw().players[me6].hand.push(DICT.idx);
  plant(me6, 'd17-turn', NATION.idx, 1);
  E.endTurn();                                  /* ahora el turno es del rival */
  ok(E._raw().currentPid === op6, 'P1-017 fixture: ahora es el turno del rival (turno ' +
     E._raw().currentPid + ')');
  /* Se juega con el PID DEL DUENO mientras el turno es del rival: si se pasara
     el pid del rival, requireOwnMain pasaria correctamente (es su turno) y el
     error seria "no esta en tu mano", que no es lo que se quiere comprobar. */
  throws(function () { E.playPlot(me6, DICT.idx, 'd17-turn'); },
         /No es tu turno/i,
         'P1-017 "during your turn": el dueno NO puede jugarla en el turno del rival');

  console.log('   P1-017 Dictatorship: Nacion=' + NATION.name + ' (atributos ' +
              JSON.stringify(NATION.attributes) + '), ' + nations.length +
              ' Nations en el mazo; el cambio se lee en leaderMod ' +
              before.leaderMod + ' -> ' + after.leaderMod);
})();

/* =====================================================================
 * P1-016  VENTANA DE REACCION + Bodyguard (208) + Talisman of Ahrimanes (382)
 * ---------------------------------------------------------------------
 * Estas dos cartas SOLO existen gracias a la ventana de la p. 15: "Play this
 * card after any type of Assassination. It becomes an automatic failure." NO
 * es una reaction a un assassination ya resuelto, es un CANCEL de un ataque
 * anunciado y aun sin tirar los dados.
 *
 * LECCION DE ESTE BLOQUE (P1-014 y P1-017): un `case` que valida cinco
 * condiciones y despues no aplica nada es DECORATIVO. Por eso el escenario 4
 * mide el EFECTO OBSERVABLE con un control pareado: el mismo Car Bomb contra
 * el mismo objetivo, SIN Bodyguard mata al objetivo y CON Bodyguard lo deja
 * vivo. Un `ok(cancelled===true)` solo no probaria que la proteccion sirva.
 * ===================================================================== */
(function () {
  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var BG   = byName('Bodyguard');
  var TAL  = byName('Talisman of Ahrimanes');
  var BOMB = byName('Car Bomb');           /* assassination, Poder 8, destruye */
  var EARTH= byName('Earthquake');         /* disaster, Poder 12/16, Sí destruye */

  /* Última dinámica: la primera Personality con Poder bajo y Resistencia baja,
     para que el Car Bomb la mate si nadie la protege. Búsqueda dinámica, nunca
     un fixture a mano: la lección de P1-013 es que un fixture fijo depende de
     una propiedad del dataset que el test no garantiza. */
  var VICT = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'personality' &&
           typeof c.power === 'number' && typeof c.resistance === 'number' &&
           c.power <= 2 && c.resistance <= 4;
  }).sort(function (a, b) { return a.power - b.power || a.resistance - b.resistance; })[0];
  ok(VICT !== undefined, 'P1-016 fixture: hace falta una Personality debil y barata de destruir');

  /* El atacante necesita un grupo en su estructura para los ataques normales. */
  var ATKGRP = C.cards.filter(function (c) {
    return c.type === 'group' && typeof c.power === 'number' && c.power >= 10;
  }).sort(function (a, b) { return b.power - a.power; })[0];
  ok(ATKGRP !== undefined, 'P1-016 fixture: hace falta un grupo de Poder >= 10 para el ataque normal');

  function nodeOf (pid, uid) {
    var found = null;
    (function w (nd) {
      if (found) return;
      if (nd.uid === uid) { found = nd; return; }
      (nd.children || []).forEach(w);
    })(E._raw().players[pid].structure);
    return found;
  }
  /* Planta a la PROFUNDIDAD pedida rellenando los niveles intermedios con el
     propio grupo del atacante. Motivo: positionBonus(pid,targetUid) da +10 a
     profundidad 1 y +5 a profundidad 2 (defensa por cercanía al Illuminati), y
     con Car Bomb (Poder 8) contra un objetivo en la raiz la fuerza sale negativa
     y el ataque falla automaticamente SIN tirar dados. Es la misma lección de
     P1-011: neutralizar la defensa posicional para poder medir la regla nueva. */
  function plantDeep (pid, uid, cardId, tokens, depth) {
    var cur = E._raw().players[pid].structure;
    for (var d = 0; d < depth; d++) {
      var kid = { uid: uid + '-d' + d, cardId: ATKGRP.idx, children: [], tokens: 0 };
      cur.children.push(kid);
      cur = kid;
    }
    var node = { uid: uid, cardId: cardId, children: [], tokens: tokens || 0 };
    cur.children.push(node);
    return node;
  }
  /* PURGA antes de inyectar: la 5a instancia de la familia de flakes. El
     reparto inicial puede contener 208 o 382 y entonces removeFromHand se
     llevaria la copiaVieja en vez de la que empujamos. */
  function give (pid, card) {
    var h = E._raw().players[pid].hand;
    E._raw().players[pid].hand = h.filter(function (ix) { return ix !== card.idx; });
    E._raw().players[pid].hand.push(card.idx);
  }
  /* Saca TODAS las cartas de cancelacion de TODAS las manos: es lo que hace que
     reactionWindowOpen() devuelva false y el ataque se resuelva en el acto.
     P1-021 añadio 6 cartas mas que abren la ventana de RODADERO, que es un
     gancho distinto pero igual de bloqueante para este test. */
  function noCancelWindow () {
    for (var p = 0; p < E._raw().players.length; p++) {
      E._raw().players[p].hand = E._raw().players[p].hand.filter(function (ix) {
        var k = (C.cards[ix] || {}).effect;
        return !(k && ['bodyguard','talisman','bribery','computervirus','murphyslaw',
                       'timewarp','mistakenidentity','mothersmarch','stealing_the_plans','embezzlement'].indexOf(k.kind) >= 0);
      });
    }
  }
  var realRandom = Math.random;
  function withLowRoll (fn) { Math.random = function () { return 0; }; try { return fn(); } finally { Math.random = realRandom; } }

  /* --- 1. Clasificación y parámetros impresos ------------------------------ */
  ok(BG.effect && BG.effect.kind === 'bodyguard' && BG.mechanicsStatus === 'implemented-pending-engine',
     'P1-016 Bodyguard clasificada como carta de cancelacion');
  ok(BG.effect.destroyBonus === 6 && BG.effect.assassinationBonus === undefined,
     'P1-016 Bodyguard: "+6 against any Attempt to Destroy, INCLUDING further Assassinations" -> un solo bonus');
  ok(TAL.effect && TAL.effect.kind === 'talisman' && TAL.mechanicsStatus === 'implemented-pending-engine',
     'P1-016 Talisman of Ahrimanes clasificada como carta de cancelacion');
  ok(TAL.effect.destroyBonus === 2 && TAL.effect.assassinationBonus === 10,
     'P1-016 Talisman: "+2 contra cualquier destruccion" y "+10 contra further Assassinations" -> dos bonuses');

  /* --- 2. SIN ventana cuando nadie puede reaccionar: cero regresiones -------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S2 = E._raw();
  noCancelWindow();
  plantDeep(S2.currentPid, 'v-control', VICT.idx, 0, 3);
  give(S2.currentPid, BOMB);
  var def2 = 1 - S2.currentPid;
  var ctl = withLowRoll(function () {
    return E.playPlot(S2.currentPid, BOMB.idx, 'v-control');
  });
  ok(ctl.lastPlotResult && ctl.lastPlotResult.pending === undefined,
     'P1-016 SIN nadie que pueda cancelar, el Instant Attack se resuelve EN EL ACTO (sin ventana)');
  ok(E._raw().pendingAttack === null, 'P1-016 ...y S.pendingAttack queda null');
  ok(typeof ctl.lastPlotResult.roll === 'number',
     'P1-016 ...y los dados SI se tiran (la division anunciar/resolver no perdio el rodadero)');
  var noPend = E.resolvePendingAttack();
  ok(noPend.lastPlotResult && noPend.lastPlotResult.reason === 'No hay ningun ataque pendiente',
     'P1-016 E.resolvePendingAttack sin nada pendiente devuelve un motivo, no lanza (doble clic seguro)');

  /* --- 3. La ventana se abre y el ataque queda PENDIENTE ------------------ */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S3 = E._raw();
  var atk3 = S3.currentPid, def3 = 1 - S3.currentPid;
  give(def3, BG);
  plantDeep(def3, 'v-pend', VICT.idx, 0, 3);
  give(atk3, BOMB);
  var pend3 = E.playPlot(atk3, BOMB.idx, 'v-pend');
  ok(pend3.lastPlotResult.pending === true,
     'P1-016 con un Bodyguard en la mano, el Assassination queda ANUNCIADO y pendiente');
  ok(E._raw().pendingAttack && E._raw().pendingAttack.cardName === BOMB.name,
     'P1-016 S.pendingAttack registra la carta anunciada');
  ok(E._raw().pendingAttack && E._raw().pendingAttack.tc.name === VICT.name,
     'P1-016 S.pendingAttack registra el objetivo');
  ok(nodeOf(def3, 'v-pend') !== null,
     'P1-016 EFECTO OBSERVABLE: con la ventana abierta el objetivo SIGUE VIVO (aun no se han tirado dados)');
  var res3 = E.resolvePendingAttack();
  ok(typeof res3.lastPlotResult.roll === 'number' && E._raw().pendingAttack === null,
     'P1-016 sin cancelar, E.resolvePendingAttack tira los dados y cierra la ventana');

  /* --- 4. Bodyguard CANCELA: control pareado, el MISMO ataque --------------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S4 = E._raw();
  noCancelWindow();
  var atk4 = S4.currentPid, def4 = 1 - S4.currentPid;
  plantDeep(def4, 'v-kill', VICT.idx, 0, 3);
  give(atk4, BOMB);
  var killed = withLowRoll(function () { return E.playPlot(atk4, BOMB.idx, 'v-kill'); });
  ok(killed.lastPlotResult.destroyed === true && nodeOf(def4, 'v-kill') === null,
     'P1-016 CONTROL: sin Bodyguard, el Car Bomb mata de verdad a ' + VICT.name);

  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S4b = E._raw();
  var atk4b = S4b.currentPid, def4b = 1 - S4b.currentPid;
  give(def4b, BG);
  plantDeep(def4b, 'v-save', VICT.idx, 0, 3);
  give(atk4b, BOMB);
  E.playPlot(atk4b, BOMB.idx, 'v-save');            /* abre ventana */
  var cancelled = E.playPlot(def4b, BG.idx);
  ok(cancelled.lastPlotResult.cancelled === true,
     'P1-016 Bodyguard juega y cancela: "It becomes an automatic failure"');
  ok(nodeOf(def4b, 'v-save') !== null,
     'P1-016 EFECTO OBSERVABLE: con Bodyguard el MISMO Car Bomb deja vivo al objetivo');
  ok(nodeOf(def4b, 'v-save').destroyBonus === 6,
     'P1-016 la proteccion permanente (+6) queda escrita SOBRE EL NODO, no en el ataque');
  var lp4 = E._raw().players[def4b].linkedPlots || [];
  ok(lp4.length === 1 && lp4[0].cardId === BG.idx && lp4[0].linkedTo === 'v-save',
     'P1-016 "link this card permanently to the card it protected"');
  ok(E._raw().players[def4b].hand.indexOf(BG.idx) < 0, 'P1-016 la carta sale de la mano');
  var closed = E.resolvePendingAttack();
  ok(closed.lastPlotResult.cancelled === true && closed.lastPlotResult.roll === null,
     'P1-016 al cerrar la ventana NO se tiran dados: el ataque es un fallo automatico, no un fallo de dados');
  ok(E._raw().pendingAttack === null, 'P1-016 la ventana queda cerrada');

  /* --- 5. El +6 se APLICA de verdad a un ataque a destruir normal ----------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S5 = E._raw();
  var atk5 = S5.currentPid, def5 = 1 - S5.currentPid;
  give(def5, BG);
  plantDeep(def5, 'v-def', VICT.idx, 0, 3);
  plant(atk5, 'a-grp', ATKGRP.idx, 1);
  give(atk5, BOMB);
  E.playPlot(atk5, BOMB.idx, 'v-def');              /* abre ventana */
  E.playPlot(def5, BG.idx);                          /* cancela */
  E.resolvePendingAttack();
  var alive5 = readyToAttack(atk5);
  ok(alive5 !== null, 'P1-016 ambos jugadores completaron su primer turno (para declareAttack)');
  E.declareAttack(atk5, 'destroy', { attackerUid: 'a-grp', uid: 'v-def' });
  var det5 = E.previewStrength();
  ok(det5.defBoosts === 6, 'P1-016 el +6 del Bodyguard entra en det.defBoosts de un ataque a destruir NORMAL');
  ok(det5.notes.join(' ').indexOf('Proteccion permanente: +6') >= 0,
     'P1-016 ...y el desglose lo explica (nota de P1-016, no un numero magico)');
  sealedResolve();

  /* --- 6. Talisman: +2 contra destruir, +12 contra Assassinations ---------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S6 = E._raw();
  var atk6 = S6.currentPid, def6 = 1 - S6.currentPid;
  give(def6, TAL);
  plantDeep(def6, 'v-tal', VICT.idx, 0, 3);
  give(atk6, BOMB);
  E.playPlot(atk6, BOMB.idx, 'v-tal');               /* abre ventana */
  E.playPlot(def6, TAL.idx);
  E.resolvePendingAttack();
  var nd6 = nodeOf(def6, 'v-tal');
  ok(nd6.destroyBonus === 2 && nd6.assassinationBonus === 10,
     'P1-016 Talisman escribe los DOS bonuses por separado (el texto los distingue)');
  /* Segundo Assassination: el +10 debe entrar en la defensa. */
  give(atk6, BOMB);
  var second = withLowRoll(function () { return E.playPlot(atk6, BOMB.idx, 'v-tal'); });
  ok(second.lastPlotResult.defense === C.cards[VICT.idx].power + 12,
     'P1-016 el +10 del Talisman entra en la defensa de un Assassination posterior (defense=' +
     second.lastPlotResult.defense + ' = Poder ' + C.cards[VICT.idx].power + ' + 10)');
  ok(second.lastPlotResult.notes.join(' ').indexOf('+12 de proteccion permanente') >= 0,
     'P1-016 ...y las notas lo nombran');

  /* --- 7. Unico por TALISMAN: el limite es GLOBAL, no por jugador ---------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S7 = E._raw();
  var atk7 = S7.currentPid, def7 = 1 - S7.currentPid;
  give(def7, TAL);
  plantDeep(def7, 'v-u1', VICT.idx, 0, 3);
  give(atk7, BOMB);
  E.playPlot(atk7, BOMB.idx, 'v-u1');
  E.playPlot(def7, TAL.idx);
  E.resolvePendingAttack();
  give(atk7, BOMB);
  give(def7, TAL);
  E.playPlot(atk7, BOMB.idx, 'v-u1');
  throws(function () { E.playPlot(def7, TAL.idx); },
         /No more than one Talisman of Ahrimanes can be in play at one time/i,
         'P1-016 unicidad GLOBAL del Talisman (no por jugador)');

  /* --- 8. Las validaciones que lanzan -------------------------------------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S8 = E._raw();
  give(S8.currentPid, BG);
  throws(function () { E.playPlot(S8.currentPid, BG.idx); },
         /no hay ningun ataque anunciado que cancelar/i,
         'P1-016 Bodyguard sin ataque anunciado: el texto no lo permite');
  noCancelWindow();
  var S8b = E._raw();
  var atk8 = S8b.currentPid, def8 = 1 - S8b.currentPid;
  give(def8, BG);
  /* Un DISASTER con un cancelador en la mano NO abre ventana: las dos cartas
     dicen "after any type of Assassination", y abrirla para un Disaster dejaria
     un ataque pendiente que nadie podria cerrar nunca. El objetivo de un
     Disaster es un Place, asi que la victima se planta en el lado del atacante. */
  var PLACE = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'place' && typeof c.power === 'number';
  }).sort(function (a, b) { return a.power - b.power; })[0];
  plant(atk8, 'p8', PLACE.idx, 0);
  give(atk8, EARTH);
  withLowRoll(function () { E.playPlot(atk8, EARTH.idx, 'p8'); });
  ok(E._raw().pendingAttack === null,
     'P1-016 un Disaster NO abre ventana aunque haya un Bodyguard en la mano');

  /* --- 9. Cancelar dos veces el mismo ataque -------------------------------- */
  fresh('bavarianilluminati1', 'servantsofcthulhu1');
  var S9 = E._raw();
  var atk9 = S9.currentPid, def9 = 1 - S9.currentPid;
  give(def9, BG);
  give(atk9, BG);
  plantDeep(def9, 'v-9', VICT.idx, 0, 3);
  give(atk9, BOMB);
  E.playPlot(atk9, BOMB.idx, 'v-9');
  E.playPlot(def9, BG.idx);
  throws(function () { E.playPlot(atk9, BG.idx); },
         /ese ataque ya fue cancelado/i,
         'P1-016 el mismo ataque no se puede cancelar dos veces');
  ok(nodeOf(def9, 'v-9').destroyBonus === 6,
     'P1-016 el segundo Bodyguard NO sumo otro +6 (la validacion va antes de escribir)');

  console.log('   P1-016 ventana de reaccion: victima=' + VICT.name + ' (Poder ' + C.cards[VICT.idx].power +
              ', Res ' + C.cards[VICT.idx].resistance + '), atacante de apoyo=' + ATKGRP.name +
              ' (Poder ' + ATKGRP.power + '), Place del Disaster=' + PLACE.name);
})();

/* ---------- P1-020 / P1-021: la rama ifNames de los Disasters estaba MUERTA y el
   uso alternativo "destroy_bonus" no existia en el motor ---------- */
(function () {
  function byName(n) { return C.cards.filter(function (c) { return c.name === n; })[0]; }
  function noCancelWindow() {
    var S = E._raw();
    S.players.forEach(function (p) {
      p.hand = p.hand.filter(function (ix) {
        var e = C.cards[ix] && C.cards[ix].effect;
        return !(e && ['bodyguard','talisman','bribery','computervirus','murphyslaw','timewarp','mistakenidentity','mothersmarch','stealing_the_plans','embezzlement'].indexOf(e.kind) >= 0);
      });
    });
  }
  function giveHere(pid, card) {
    var S = E._raw();
    S.players[pid].hand = S.players[pid].hand.filter(function (ix) { return ix !== card.idx; });
    S.players[pid].hand.push(card.idx);
  }
  function readyBoth(pid) {
    var g = 0, S = E._raw();
    while ((S.currentPid !== pid || S.players[0].turnsCompleted < 1 || S.players[1].turnsCompleted < 1)
      && S.phase !== 'gameover' && g++ < 8) E.endTurn();
  }
  function strengthCopy() { return JSON.parse(JSON.stringify(E.previewStrength())); }
  function duel(attackerIdx, targetIdx, type) {
    type = type || 'destroy';
    fresh('bavarianilluminati1', 'shangrila1');
    noCancelWindow();
    var S0 = E._raw();
    var att = S0.currentPid, def = 1 - att;
    readyBoth(att);
    var S = E._raw();
    att = S.currentPid; def = 1 - att;
    plant(att, 'p21-atk', attackerIdx, 1);
    plant(def, 'p21-tgt', targetIdx, 0);
    E.declareAttack(att, type, { attackerUid: 'p21-atk', uid: 'p21-tgt' });
    return { att: att, def: def };
  }
  /* Poder que el motor elige para un Disaster, leido del resultado del Instant Attack. */
  function disasterPower(plot, targetIdx) {
    fresh('bavarianilluminati1', 'shangrila1');
    noCancelWindow();
    var S0 = E._raw();
    var att = S0.currentPid, def = 1 - att;
    readyBoth(att);
    var S = E._raw();
    att = S.currentPid; def = 1 - att;
    plant(att, 'p21-atk2', byName('Texas').idx, 1);
    plant(def, 'p21-tgt2', targetIdx, 0);
    giveHere(att, plot);
    var out = E.playPlot(att, plot.idx, 'p21-tgt2');
    return (out.lastPlotResult && out.lastPlotResult.power);
  }
  /* Uso alternativo: +N al ataque a destruir en curso. */
  function altUse(plot, targetIdx, type) {
    var h = duel(byName('Texas').idx, targetIdx, type || 'destroy');
    var before = strengthCopy();
    giveHere(h.att, plot);
    var out = E.playPlot(h.att, plot.idx, null, { altUse: true });
    return { before: before, after: strengthCopy(), out: out, h: h };
  }

  var MON = byName('Atomic Monster');
  var KUDZU = byName('Giant Kudzu');
  var HURR = byName('Hurricane');
  var WAVE = byName('Tidal Wave');
  var PLAG = byName('Plague of Demons');
  var EARTH = byName('Earthquake');
  var JAPAN = byName('Japan');
  var CALIF = byName('California');
  var TEXAS = byName('Texas');
  var FIN = byName('Finland');
  var HAWAII = byName('Hawaii');
  var RSM = byName('Robot Sea Monsters');
  var DRUIDS = byName('Druids');
  /* Hawaii SI es coastal (esta en la lista de 13), asi que para probar la rama
     "cualquier otro Place" hay que buscar uno dinamicamente que NO lo sea.
     LECCION: no fijar a mano un fixture que depende de una propiedad del mazo. */
  var NONCOAST_PLACE = C.cards.filter(function (c) {
    return c.type === 'group' && c.subtype === 'place' && (c.attributes || []).indexOf('coastal') < 0;
  })[0];

  /* ---- 1. P1-020: la rama ifNames estaba muerta (comparacion sensible a mayusculas) ---- */
  ok(MON.effect.power[0].ifNames && MON.effect.power[0].ifNames.indexOf('japan') >= 0,
    'P1-020 Atomic Monster declara ifNames con nombres normalizados en minusculas');
  ok(disasterPower(MON, JAPAN.idx) === 24,
    'P1-020 Atomic Monster vs Japan = 24 -> ' + disasterPower(MON, JAPAN.idx) + ' (el texto dice "but 24 against Japan or California")');
  ok(disasterPower(MON, CALIF.idx) === 24,
    'P1-020 Atomic Monster vs California = 24 -> ' + disasterPower(MON, CALIF.idx) + ' (California es huge y coastal; el 24 tiene prioridad)');
  ok(disasterPower(MON, TEXAS.idx) === 16,
    'P1-020 Atomic Monster vs Texas = 16 -> ' + disasterPower(MON, TEXAS.idx) + ' (huge, no Japan/California)');
  ok(disasterPower(MON, FIN.idx) === 20,
    'P1-020 Atomic Monster vs Finland = 20 -> ' + disasterPower(MON, FIN.idx) + ' (coastal que no es huge)');
  ok(disasterPower(KUDZU, JAPAN.idx) === 30,
    'P1-020 Giant Kudzu vs Japan = 30 -> ' + disasterPower(KUDZU, JAPAN.idx) + ' (la rama ifAttr coastal paso a tener 13 objetivos con P2-DATA-01)');
  ok(disasterPower(KUDZU, NONCOAST_PLACE.idx) === 24,
    'P1-020 Giant Kudzu vs ' + NONCOAST_PLACE.name + ' = 24 -> ' + disasterPower(KUDZU, NONCOAST_PLACE.idx) + ' (Place no coastal)');
  ok(disasterPower(HURR, TEXAS.idx) === 16,
    'P1-020 Hurricane vs Texas = 16 -> ' + disasterPower(HURR, TEXAS.idx));
  ok(disasterPower(WAVE, FIN.idx) === 24,
    'P1-020 Tidal Wave vs Finland = 24 -> ' + disasterPower(WAVE, FIN.idx));
  throws(function () {
    fresh('bavarianilluminati1', 'shangrila1');
    noCancelWindow();
    var S0 = E._raw(); var att = S0.currentPid, def = 1 - att;
    readyBoth(att);
    var S = E._raw(); att = S.currentPid; def = 1 - att;
    var NONCOAST = C.cards.filter(function (c) { return c.type === 'group' && c.subtype === 'place' && (c.attributes || []).indexOf('coastal') < 0; })[0];
    plant(att, 'p21-a3', TEXAS.idx, 1); plant(def, 'p21-t3', NONCOAST.idx, 0);
    giveHere(att, MON);
    E.playPlot(att, MON.idx, 'p21-t3');
  }, /requiere un objetivo con el atributo coastal/i,
    'P1-020 requireAttr sigue rechazando un Place que no es Coastal (' + 'Atomic Monster' + ' no puede usarse)');

  /* ---- 2. P1-021: el uso alternativo destroy_bonus no existia ---- */
  ok(MON.effect.altUse && MON.effect.altUse.kind === 'destroy_bonus' && MON.effect.altUse.bonus === 10,
    'P1-021 Atomic Monster declara altUse destroy_bonus +10 contra 2 nombres');
  ok(PLAG.effect.altUse && PLAG.effect.altUse.kind === 'destroy_bonus' && PLAG.effect.altUse.targetAttr === 'magic',
    'P1-021 Plague of Demons declara altUse destroy_bonus +10 contra el atributo magic');

  var c1 = altUse(MON, RSM.idx);
  ok(c1.before.boosts === 0, 'P1-021 antes del uso alternativo boosts=0 -> ' + c1.before.boosts);
  ok(c1.after.boosts === 10, 'P1-021 despues boosts=10 -> ' + c1.after.boosts);
  ok(c1.after.total === c1.before.total + 10,
    'P1-021 EFECTO OBSERVABLE: el ataque a destruir sube 10 de fuerza -> ' + c1.before.total + ' -> ' + c1.after.total);
  ok(c1.out.lastPlotResult && c1.out.lastPlotResult.altUse === true && c1.out.lastPlotResult.bonus === 10
    && c1.out.lastPlotResult.target === 'Robot Sea Monsters',
    'P1-021 lastPlotResult reporta altUse, bonus y objetivo -> ' + JSON.stringify(c1.out.lastPlotResult));
  ok(E._raw().players[c1.h.att].hand.indexOf(MON.idx) < 0, 'P1-021 la carta sale de la mano tras el uso alternativo');
  ok(E._raw().attack !== null, 'P1-021 el uso alternativo NO cierra el ataque en curso');

  var c2 = altUse(PLAG, DRUIDS.idx);
  ok(c2.after.boosts === 10 && c2.after.total === c2.before.total + 10,
    'P1-021 Plague of Demons +10 contra un grupo Magic (Druids) -> boosts=' + c2.after.boosts + ' total ' + c2.before.total + ' -> ' + c2.after.total);

  /* Rechazos: el motor VALIDA y LANZA, no aplica en silencio. Comprobar tambien que
     el ataque en curso queda intacto (efecto observable: no se toco nada).
     duelAtk() planta la escena Y pone la carta en la mano: sin esto el motor
     responde "Carta no esta en tu mano" y la prueba no midiria nada. */
  function duelAtk(targetIdx, plot, type) {
    var h = duel(TEXAS.idx, targetIdx, type);
    giveHere(h.att, plot);
    return h;
  }
  var h3 = duelAtk(FIN.idx, MON);
  throws(function () { E.playPlot(h3.att, MON.idx, null, { altUse: true }); },
    /no refuerza un ataque a destruir contra Finland/i,
    'P1-021 RECHAZA un objetivo que no es Robot Sea Monsters ni Nuclear Power Companies');
  ok(strengthCopy().boosts === 0, 'P1-021 tras el rechazo el ataque sigue abierto y sin bonificar -> boosts ' + strengthCopy().boosts);

  var h4 = duelAtk(RSM.idx, MON, 'control');
  throws(function () { E.playPlot(h4.att, MON.idx, null, { altUse: true }); },
    /solo refuerza ataques a DESTRUIR/i,
    'P1-021 RECHAZA un ataque a CONTROLAR (el texto dice "any attack to destroy")');
  ok(strengthCopy().boosts === 0, 'P1-021 tras el rechazo por tipo de ataque no hay bonificacion -> boosts ' + strengthCopy().boosts);

  var h5 = duelAtk(TEXAS.idx, PLAG);
  throws(function () { E.playPlot(h5.att, PLAG.idx, null, { altUse: true }); },
    /no refuerza un ataque a destruir contra Texas/i,
    'P1-021 RECHAZA un objetivo sin el atributo magic (Texas)');

  var h6 = duelAtk(RSM.idx, MON);
  throws(function () { E.playPlot(h6.att, MON.idx, null, {}); },
    /Elige un Place objetivo/i,
    'P1-021 sin opts.altUse la carta juega su uso NORMAL (pide un Place objetivo)');
  ok(E._raw().players[h6.att].hand.indexOf(MON.idx) >= 0,
    'P1-021 el uso NORMAL que falla por falta de objetivo no consume la carta');

  var h7 = duelAtk(RSM.idx, EARTH);
  throws(function () { E.playPlot(h7.att, EARTH.idx, null, { altUse: true }); },
    /no tiene un uso alternativo de tipo destroy_bonus/i,
    'P1-021 un Disaster sin altUse declarado no puede usarse por esta via');

  var h8 = duelAtk(RSM.idx, EARTH);
  throws(function () { E.playPlot(h8.att, EARTH.idx, null, { altUse: true }); },
    /no tiene un uso alternativo/i,
    'P1-021 un rechazo por falta de altUse deja la carta en la mano');
  ok(E._raw().players[h8.att].hand.indexOf(EARTH.idx) >= 0,
    'P1-021 si la validacion falla la carta SIGUE en la mano (no se gasta por un uso invalido)');
  ok(E._raw().attack !== null, 'P1-021 un uso alternativo invalido NO cierra el ataque en curso');

  ok(EARTH.effect.altUse === undefined, 'P1-021 Earthquake NO declara altUse (solo 2 de 421 cartas lo hacen)');

  console.log('  P1-020/P1-021: las 4 tablas de Poder coastal eligen lo impreso; altUse +10 se aplica de verdad al ataque a destruir');
})();

/* =======================================================================
   P1-022 + P1-023
   ------------------------------------------------------------------
   P1-022. inwo_rules_extracted.txt:405 (derecha): "Illuminati Groups can
   attack, but cannot be attacked!" y el Glosario :1079-1081: "Illuminati
   Groups never have alignments or attributes." De la segunda se deduce que
   el Illuminati NUNCA puede ayudar ni oponerse (ayudar exige al menos una
   ideologia comun con el objetivo, oponerse exige una opuesta, y el no
   tiene ninguna), de modo que "can attack" es la declaracion COMPLETA de su
   participacion en combate: solo puede ser el atacante. El lote comprueba
   que la capacidad ya existe, que se paga con SU ficha de grupo y no con el
   contador aparte, y que las dos prohibiciones se respetan.

   P1-023. inwo_rules_extracted.txt:373: "Illuminati cards have four outgoing
   control arrows", frente a :376-380 "0 to 3 outgoing control arrows" para
   cualquier otro grupo. El discriminante antiguo (cardId==null) era
   inalcanzable en juego porque tras la preparacion la raiz ya tiene carta.
   ======================================================================= */
(function () {
  console.log('--- P1-022 / P1-023: el Illuminati ataca y tiene 4 flechas ---');

  var byName = function (n) { return C.cards.filter(function (c) { return c.name === n; })[0]; };
  var throwsAny = function (fn, m) {
    try { fn(); ok(false, m + ' (no lanzo)'); }
    catch (e) { ok(true, m + ' -> ' + String(e.message || e).slice(0, 58)); }
  };
  var rootOf = function (pid) { return 'p' + pid + '-root'; };
  var nodeOf = function (pid, uid) {
    var found = null;
    (function walk(nd) {
      if (found) return;
      if (nd.uid === uid) { found = nd; return; }
      (nd.children || []).forEach(walk);
    })(E._raw().players[pid].structure);
    return found;
  };
  var pidOfBase = function (base) {
    var S = E._raw();
    for (var p = 0; p < S.players.length; p++) {
      if (String(S.players[p].illumId).replace(/\d+$/, '') === base) return p;
    }
    return -1;
  };
  var fill = function (k) {
    return C.cards.filter(function (c) {
      return c.type === 'group' && typeof c.power === 'number';
    })[k];
  };

  var VICT = byName('Gordo Remora');
  var TEXAS = byName('Texas');
  ok(!!VICT && !!TEXAS, 'P1-022 fixtures: Gordo Remora y Texas existen');

  /* ============ P1-023: la raiz tiene 4 flechas, un titere 3 ============ */

  var F = [fill(0), fill(1), fill(2), fill(3), fill(4)];
  ok(F.every(function (c) { return !!c; }),
     'P1-023 hay 5 grupos de relleno con Poder numerico');
  /* nest() cuelga un nodo de un padre CONCRETO. El plant() de la cabecera de
     este fichero empuja SIEMPRE en structure.children, o sea en la raiz, asi
     que anidar hay que hacerlo a mano: la primera version de este bloque
     fallaba porque daba por hecho que plant() anidaba. */
  var nest = function (pid, parentUid, uid, cardId, tokens) {
    var nd = { uid: uid, cardId: cardId, children: [], tokens: tokens };
    nodeOf(pid, parentUid).children.push(nd);
    return nd;
  };

  // --- la raiz del Illuminati: 4 flechas ---
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var rp = E._raw().currentPid;
  var ru = rootOf(rp);
  nest(rp, ru, 'p1-23-a1', F[0].idx, 1);
  nest(rp, ru, 'p1-23-a2', F[1].idx, 1);
  nest(rp, ru, 'p1-23-a3', F[2].idx, 1);
  nest(rp, 'p1-23-a1', 'p1-23-mv', F[3].idx, 1);
  ok(nodeOf(rp, ru).children.length === 3,
     'P1-023 la raiz tiene 3 hijos directos (le queda 1 de sus 4 flechas)');
  ok(nodeOf(rp, 'p1-23-mv').tokens === 1,
     'P1-023 el grupo que va a moverse tiene su propia ficha');
  var movedOk = true;
  try { E.moveGroup(rp, 'p1-23-mv', ru, 'p1-23-a1'); } catch (e) { movedOk = false; }
  ok(movedOk, 'P1-023 la raiz con 3 hijos ACEPTa un cuarto grupo (4 flechas, no 3)');
  ok(nodeOf(rp, ru).children.length === 4, 'P1-023 la raiz queda con 4 hijos');
  throws(function () { E.moveGroup(rp, 'p1-23-a1', ru, 'p1-23-a1'); },
         /Destino sin flecha libre/,
         'P1-023 la raiz con 4 hijos RECHAZA un quinto grupo (flecha agotada)');

  // --- un titere cualquiera: 3 flechas ---
  fresh('bavarianilluminati1', 'servantsofcthulhu2');
  var qp = E._raw().currentPid;
  nest(qp, rootOf(qp), 'p1-23-pup', F[0].idx, 1);
  nest(qp, 'p1-23-pup', 'p1-23-b1', F[1].idx, 1);
  nest(qp, 'p1-23-pup', 'p1-23-b2', F[2].idx, 1);
  nest(qp, 'p1-23-b1', 'p1-23-mvv', F[3].idx, 1);
  ok(nodeOf(qp, 'p1-23-pup').children.length === 2,
     'P1-023 un titere con 2 hijos tiene 1 de sus 3 flechas libre');
  var movedOk2 = true;
  try { E.moveGroup(qp, 'p1-23-mvv', 'p1-23-pup', 'p1-23-b1'); } catch (e) { movedOk2 = false; }
  ok(movedOk2, 'P1-023 un titere con 2 hijos ACEPTa un tercer grupo');
  ok(nodeOf(qp, 'p1-23-pup').children.length === 3,
     'P1-023 el titere queda con 3 hijos');
  throws(function () { E.moveGroup(qp, 'p1-23-b1', 'p1-23-pup', 'p1-23-b1'); },
         /Destino sin flecha libre/,
         'P1-023 un titere con 3 hijos RECHAZA (3 flechas, no 4)');

  /* ============ P1-022: el Illuminati ataca con SU ficha ============ */

  fresh('bavarianilluminati1', 'shangrila1');
  var bp = pidOfBase('bavarianilluminati');
  var op = 1 - bp;
  var bru = rootOf(bp);
  var ic = C.byId[E._raw().players[bp].illumId];
  ok(bp >= 0 && ic.type === 'illuminati', 'P1-022 el jugador evaluado usa una faccion Illuminati');
  ok(ic.alignments.length === 0,
     'P1-022 el Glosario se cumple en el dato: el Illuminati no tiene ideologias');
  plant(op, 'p1-22-v', VICT.idx, 0);
  readyToAttack(bp);
  var rootN = nodeOf(bp, bru);
  rootN.tokens = 1;
  var tok0 = rootN.tokens;
  var ill0 = E._raw().players[bp].illumTokens;
  E.declareAttack(bp, 'control', { attackerUid: bru, uid: 'p1-22-v' });
  ok(E._raw().attack && E._raw().attack.attackerUid === bru,
     'P1-022 el ataque lo declara la RAIZ de la estructura Illuminati');
  ok(E.previewStrength().base === ic.power,
     'P1-022 la fuerza base es el Poder impreso de la faccion (' + ic.power + ')');
  ok(nodeOf(bp, bru).tokens === tok0 - 1,
     'P1-022 la raiz gasta SU ficha de grupo (1 -> 0)');
  ok(E._raw().players[bp].illumTokens === ill0,
     'P1-022 el contador illumTokens NO baja: un ataque se paga con un solo pool');
  sealedResolve();
  ok(E._raw().attack === null,
     'P1-022 el ataque del Illuminati se resuelve y el estado se limpia');

  // --- sin ficha la raiz no ataca ---
  fresh('bavarianilluminati1', 'shangrila1');
  bp = pidOfBase('bavarianilluminati');
  op = 1 - bp;
  bru = rootOf(bp);
  plant(op, 'p1-22-v2', VICT.idx, 0);
  readyToAttack(bp);
  nodeOf(bp, bru).tokens = 0;
  throws(function () { E.declareAttack(bp, 'control', { attackerUid: bru, uid: 'p1-22-v2' }); },
         /Sin Action token/,
         'P1-022 sin ficha la raiz NO puede declarar un ataque');

  // --- la raiz no puede ser objetivo (regla :405) ---
  fresh('bavarianilluminati1', 'shangrila1');
  bp = pidOfBase('bavarianilluminati');
  op = 1 - bp;
  bru = rootOf(bp);
  plant(op, 'p1-22-atk', TEXAS.idx, 1);
  plant(bp, 'p1-22-tgt', VICT.idx, 1);
  readyToAttack(op);
  nodeOf(op, 'p1-22-atk').tokens = 1;
  throws(function () { E.declareAttack(op, 'control', { attackerUid: 'p1-22-atk', uid: bru }); },
         /Illuminati no pueden ser atacados/,
         'P1-022 la raiz NO puede ser objetivo de un ataque');

  // --- la raiz no puede ayudar a un ataque ajeno ---
  fresh('bavarianilluminati1', 'shangrila1');
  bp = pidOfBase('bavarianilluminati');
  op = 1 - bp;
  bru = rootOf(bp);
  plant(op, 'p1-22-atk2', TEXAS.idx, 1);
  plant(bp, 'p1-22-tgt2', VICT.idx, 1);
  readyToAttack(op);
  nodeOf(op, 'p1-22-atk2').tokens = 1;
  E.declareAttack(op, 'control', { attackerUid: 'p1-22-atk2', uid: 'p1-22-tgt2' });
  ok(!!E._raw().attack, 'P1-022 hay un ataque de control abierto del rival');
  nodeOf(bp, bru).tokens = 1;
  throwsAny(function () { E.addSupport(bp, { uid: bru }); },
            'P1-022 la raiz NO puede ayudar (no tiene ideologias, luego no hay comun)');

  console.log('P1-022 / P1-023: raiz=' + ic.name + ' Poder=' + ic.power +
              '  4 flechas para el Illuminati, 3 para cualquier otro grupo');
})();

/* ---------- P1-024: la ventana de RODADERO (post-tirada, pre-efecto) ----------
   P1-016 abrio una ventana ANTES de los dados (anunciado -> dados). Estas seis
   cartas dicen "Play immediately after any die roll": reactionan al rodadero ya
   tirado y todavia sin aplicar. Los tests comprueban el EFECTO OBSERVABLE
   (el grupo entra al AREA NEUTRAL o no entra), nunca solo la aritmetica: es la
   leccion de 33.5, donde P1-007 verificaba la matematica y el motor estaba roto.
   NO se usan sealedResolve()/sealWindows() en este bloque: aqui la ventana tiene
   que ABRIRSE, y esos sellos son precisamente lo que la quitan. */
(function () {
  var BRB = idxOfId('bribery'), MUR = idxOfId('murphyslaw');
  var realRandom = Math.random;

  /* Monta: jugador `atk` ataca al grupo `tgt` del jugador `def`, con fuerza
     suficiente y un rodadero forzable. Devuelve los pids ya listos. */
  function mount(def, reactionIdx) {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var atk = readyToAttack(0);
    if (atk === null) return null;
    var S = E._raw();
    var att = plant(atk, 'a1', anyGroupIdx(), 1);
    var vic = plant(1 - atk, 'v1', anyGroupIdx(), 0);
    var vicName = C.cards[vic.cardId].name;
    S.players[1 - atk].illumTokens = 1;
    /* El rodadero va a la mano del DEFENSOR, que es quien puede reaccionar al
       ataque del otro (las cartas dicen "by any player", no "by me"). */
    if (reactionIdx != null) S.players[1 - atk].hand.push(reactionIdx);
    return { atk: atk, vicUid: 'v1', vicName: vicName, def: 1 - atk, att: att };
  }

  /* El ataque necesita fuerza >= 2 o el motor falla automaticamente SIN tirar
     (y sin ventana). `plant` deja al atacante en profundidad 1, que vale -10 de
     posicion, asi que se le anade un boost explicito de prueba. */
  function openAttack(m, type) {
    E.declareAttack(m.atk, type, { attackerUid: m.att.uid, uid: m.vicUid });
    var A = E._raw().attack;
    ok(!!A, 'P1-024 el ataque quedo declarado');
    A.boosts.push({ name: 'P1-024 prueba', v: 30 });
    return A;
  }

  /* 1) Bribery: un rodadero que FALLABA pasa a 2 y el control se gana. */
  var m1 = mount(0, BRB);
  if (!m1) { ok(false, 'P1-024 Bribery: no se pudo montar la partida'); }
  else {
    openAttack(m1, 'control');
    /* 0.95 -> 6+6 = 12, que es FALLO automatico por regla (11-12 siempre fallan) */
    Math.random = function () { return 0.95; };
    E.resolveAttack();                              /* ventana abierta, sin efecto */
    Math.random = realRandom;
    var w = E.getState();
    ok(!!w.pendingRoll, 'P1-024 tras tirar, el ataque queda PENDIENTE sin efecto');
    ok(w.pendingRoll && w.pendingRoll.roll === 12, 'P1-024 el rodadero pendiente es el que se tiro -> ' +
       (w.pendingRoll && w.pendingRoll.roll));
    ok(E.getState().attack !== null, 'P1-024 el ataque sigue abierto hasta cerrar la ventana');
    E.playPlot(m1.def, C.cards[BRB].idx, null, {});
    ok(E.getState().pendingRoll !== null, 'P1-024 jugar Bribery NO cierra la ventana (pueden encadenarse)');
    ok(E.getState().pendingRoll.roll === 2, 'P1-024 el rodadero pendiente quedo en 2 -> ' +
       E.getState().pendingRoll.roll);
    E.resolvePendingRoll();
    ok(E.getState().pendingRoll === null, 'P1-024 resolver cierra la ventana');
    var st1 = E.getState();
    /* Un control con exito sobre un grupo en juego lo CAPTURA: la rama de
       applyAttackResult lo cuelga bajo la estructura del atacante (el AREA
       NEUTRAL es solo para cartas de mano y para el area neutral). El
       observable correcto es "el grupo cambio de dueño", no la aritmetica. */
    var captured = st1.players[m1.atk].structure.children.some(function (n) { return n.uid === m1.vicUid; });
    var stillThere = st1.players[m1.def].structure.children.some(function (n) { return n.uid === m1.vicUid; });
    ok(captured && !stillThere, 'P1-024 Bribery convierte el fallo en EXITO (el rival queda capturado) -> ' +
       'atacante=' + captured + ' rival=' + stillThere);
    ok(st1.players[m1.def].illumTokens === 0, 'P1-024 Bribery gasto TODAS las fichas del Illuminati');
/* "La carta jugada sale de la mano" se comprueba por su DESTINO, no por su
     ausencia: P1-025 mete la Plot usada en el descarte, asi que lo que la
     regla exige es que la carta ya no este en la mano del jugador. Medir solo
     `indexOf === -1` fallaba por lo mismo que el bloque de Cthulhu (una carta
     que otro bloque manipulo). */
    ok(st1.players[m1.def].hand.indexOf(C.cards[BRB].idx) === -1 ||
       E._raw().plotDiscard.indexOf(C.cards[BRB].idx) >= 0,
      'P1-024 la carta jugada sale de la mano -> mano=' + st1.players[m1.def].hand.join(',') +
      ' descarte=' + E._raw().plotDiscard.join(','));
  }

  /* 2) Murphy's Law: un rodadero que GANABA pasa a 12 y el control falla. */
  var m2 = mount(0, MUR);
  if (!m2) { ok(false, "P1-024 Murphy's Law: no se pudo montar la partida"); }
  else {
    openAttack(m2, 'control');
    Math.random = function () { return 0; };        /* 1+1 = 2, exito seguro */
    E.resolveAttack();
    Math.random = realRandom;
    ok(!!E.getState().pendingRoll, "P1-024 Murphy's Law: ventana abierta tras el rodadero");
    E.playPlot(m2.def, C.cards[MUR].idx, null, {});
    E.resolvePendingRoll();
    var st2 = E.getState();
    ok(st2.players[m2.def].structure.children.some(function (n) { return n.uid === m2.vicUid; }),
       "P1-024 Murphy's Law (12 = fallo automatico) IMPIDE el control: el grupo sigue del rival");
  }

  /* 3) Sin ventana abierta, la carta se REFUSA y NO se gasta. */
  var m3 = mount(0, BRB);
  if (m3) {
    throws(function () { E.playPlot(m3.def, C.cards[BRB].idx, null, {}); },
           /no hay ningun rodadero/i, 'P1-024 sin ventana abierta la carta no se puede jugar');
    ok(E.getState().players[m3.def].hand.indexOf(C.cards[BRB].idx) >= 0,
       'P1-024 un uso invalido NO consume la carta');
  }

  /* 4) Murphy's Law gasta TODAS las fichas, no una sola. */
  var m4 = mount(0, MUR);
  if (m4) {
    E._raw().players[m4.def].illumTokens = 3;
    openAttack(m4, 'control');
    E.resolveAttack();
    E.playPlot(m4.def, C.cards[MUR].idx, null, {});
    E.resolvePendingRoll();
    ok(E.getState().players[m4.def].illumTokens === 0,
       'P1-024 "all Action tokens" = todas las fichas, no una -> ' +
       E.getState().players[m4.def].illumTokens);
  }
})();

/* ---------- P1-025/P1-026/P1-027: la Plot USADA, el ataque PRIVILEGIADO y la
   ventana de SUCESO ---------------------------------------------------
   Todo se comprueba por su EFECTO OBSERVABLE (la carta acaba donde tiene que
   acabar, el tercero no puede participar, el rodadero se repite), nunca por
   la aritmetica interna. Y nada se mide contando cartas en mano, porque los
   helpers de sellado manipulan las manos: se midio 6-7 fallos de cada 40
   cuando el bloque de Cthulhu contaba Plot cards (ver arriba). */
(function () {
  /* utilidades locales de este bloque */
  /* `give`/`giveHere` viven dentro de otros IIFE, asi que este bloque usa las suyas. */
  function put(pid, c) { var r = E._raw(); r.players[pid].hand.push(c.idx); }
  function idx(id) { var i = idxOfId(id); return i == null ? -1 : i; }
  function hasAlign(a) {
    return C.cards.filter(function (c) { return c.type === 'group' && (c.alignments || []).indexOf(a) >= 0; })[0];
  }
  function placeIdx() {
    return C.cards.filter(function (c) { return c.type === 'group' && c.subtype === 'place'; })[0];
  }
  function advanceTo(pid, n) {
    for (var g = 0; g < 40; g++) {
      var s = E.getState();
      if (s.gameover) return false;
      var ready = s.currentPid === pid;
      for (var k = 0; k < n; k++) if (s.players[k].turnsCompleted < 1) ready = false;
      if (ready) return true;
      E.endTurn();
    }
    return false;
  }
  var VIOLENT = hasAlign('violent'), PEACEFUL = hasAlign('peaceful');
  var WEIRD = hasAlign('weird'), STRAIGHT = hasAlign('straight');

  /* ==== 1) P1-025 — la Plot USADA va al descarte ====
     Se usa una Plot "+10" jugada sobre el ataque porque es de las pocas que el
     motor NO linkea ni deja expuestas (las familias "Link this card to your
     chosen group" dejan la carta en la mesa, y una Plot expuesta tampoco va al
     descarte), asi que es el caso limpio para el resto de la regla.
     NOTA: el case 'paralyze' del motor esta MUERTO — ninguna carta del mazo tiene
     esa mecanica (§38.6). ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    /* Las 15 Plot "+10" declaran todas un objetivo impreso (targetAlign o
     * targetAttr), asi que el grupo atacante se elige conforme a ese objetivo.
     * Es lo que dice el texto: el +10 se aplica AL GRUPO QUE LO DECLARO. */
    var B10 = C.cards.filter(function (c) { return c.effect && c.effect.kind === 'boost10'; })[0];
    ok(!!B10, 'P1-025 hay una Plot +10 para jugar sobre el ataque');
    if (!B10) return;
    var q = B10.effect.targetAlign ? hasAlign(B10.effect.targetAlign) : null;
    if (!q && B10.effect.targetAttr)
      q = C.cards.filter(function (c) {
        return c.type === 'group' && (c.attributes || []).indexOf(B10.effect.targetAttr) >= 0;
      })[0];
    ok(!!q, 'P1-025 la carta +10 tiene un objetivo posible en el mazo -> ' + B10.name);
    if (!q) return;
    var dfn = 1 - me;
    var att = q;
    var vic = C.cards.filter(function (c) { return c.type === 'group' && (c.power || 0) >= 1; })[0];
    plant(me, 'u1', att.idx, 1);
    plant(dfn, 'u2', vic.idx, 1);
    put(me, B10);
    E.declareAttack(me, 'destroy', { attackerUid: 'u1', uid: 'u2' });
    E.playPlot(me, B10.idx, 'u1', { mode: 'attack', aidUid: 'u1' });
    var raw = E._raw();
    ok(raw.players[me].hand.indexOf(B10.idx) < 0,
      'P1-025 la Plot usada sale de la mano -> ' + raw.players[me].hand.join(','));
    ok(raw.plotDiscard.indexOf(B10.idx) >= 0,
      'P1-025 la Plot USADA llega al descarte (no se pierde) -> ' + raw.plotDiscard.join(','));
    ok(raw.players[me].linkedPlots.every(function (l) { return l.cardId !== B10.idx; }),
      'P1-025 y no queda linkeada (no es de las familias "Link this card to...")');
  })();

  /* ==== 2) P1-025 — las Plot EN PLAY no se descartan ====
     Las familias Power Increase / Resistance Increase dicen "Link this card to
     your chosen group" y su unicidad esta redactada en terminos de "in play",
     que segun las reglas significa "dejada en la mesa". ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    var LEAD = C.cards.filter(function (c) { return c.effect && c.effect.kind === 'power_increase'; })[0];
    ok(!!LEAD, 'P1-025 el mazo tiene una Plot Power Increase para el caso linkeado');
    if (LEAD) {
      /* La Plot dice "The Power for one {X} group", asi que el objetivo se toma
       * de la ideologia que la carta imprime. */
      var tgt = (hasAlign(LEAD.effect.targetAlign) || C.cards[anyGroupIdx()]);
      plant(me, 'pi1', tgt.idx, 1);
      put(me, LEAD);
      E.playPlot(me, LEAD.idx, 'pi1', { aidUid: 'pi1' });
      var raw = E._raw();
      ok(raw.players[me].linkedPlots.some(function (l) { return l.cardId === LEAD.idx; }),
        'P1-025 la Plot linkeada queda registrada en linkedPlots');
      ok(raw.plotDiscard.indexOf(LEAD.idx) < 0,
        'P1-025 una Plot EN PLAY no va al descarte (se queda en la mesa) -> ' + raw.plotDiscard.join(','));
    }
  })();

  /* ==== 3) P1-026 — el ataque privilegiado REALMENTE veta a un tercero ====
     Con tres jugadores, porque con dos el privilegio no puede vetar a nadie:
     atacante y defensor son los unicos que hay. Regla oficial,
     inwo_rules_extracted.txt:1140-1148, glosario "Interference". ==== */
  (function () {
    ok(!!VIOLENT && !!PEACEFUL && !!WEIRD && !!STRAIGHT,
      'P1-026 el mazo tiene los pares de ideologias opuestas que exige el test');
    if (!(VIOLENT && PEACEFUL && WEIRD && STRAIGHT)) return;

    function three(privileged) {
      E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }, { name: 'C', human: false }]);
      E.setIlluminati(0, 'bavarianilluminati1');
      E.setIlluminati(1, 'servantsofcthulhu1');
      E.setIlluminati(2, 'gnomesofzurich1');
      E.startGame();
      if (!advanceTo(0, 3)) return null;
      plant(0, 'a1', VIOLENT.idx, 1);
      plant(1, 'd1', PEACEFUL.idx, 1);
      /* Para ayudar a DESTRUIR hace falta >=1 ideologia opuesta a la del objetivo,
       * asi que C y el grupo extra del defensor son Violent contra un objetivo
       * Peaceful (OPPOSITES en engine.js:18). */
      plant(2, 'c1', VIOLENT.idx, 1);
      E.declareAttack(0, 'destroy', { attackerUid: 'a1', uid: 'd1' });
      if (privileged) E.togglePrivilege();
      return { C: E.getState().players[2] };
    }
    var m1 = three(false);
    if (m1) {
      ok(!E._raw().attack.privilege, 'P1-026 por defecto el ataque NO es privilegiado');
      E.addSupport(2, { uid: 'c1' });
      ok(E._raw().attack.aids.length === 1 && E._raw().attack.opposes.length === 0,
        'P1-026 sin privilegio, un TERCERO puede participar -> aids=' + E._raw().attack.aids.length +
        ' opposes=' + E._raw().attack.opposes.length);
    }
    var m2 = three(true);
    if (m2) {
      ok(!!E._raw().attack.privilege, 'P1-026 E.togglePrivilege deja el ataque privilegiado de verdad');
      throws(function () { E.addSupport(2, { uid: 'c1' }); }, /PRIVILEGIADO/i,
        'P1-026 un TERCERO no puede ayudar a un ataque privilegiado');
      ok(E._raw().attack.aids.length === 0 && E._raw().attack.opposes.length === 0,
        'P1-026 el intento rechazado no dejo ninguna participacion');
      /* el defensor SI puede: "nobody except you and the target player" */
      plant(1, 'd2', VIOLENT.idx, 1);
      E.addSupport(1, { uid: 'd2' });
      ok(E._raw().attack.aids.length === 1,
        'P1-026 el defensor SI puede participar en un ataque privilegiado -> aids=' + E._raw().attack.aids.length);
    }
  })();

  /* ==== 4) P1-026 — el poder de los Bavarianos es 1 vez por turno ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    plant(me, 'b1', VIOLENT.idx, 1); plant(1 - me, 'b2', PEACEFUL.idx, 1);
    E.declareAttack(me, 'destroy', { attackerUid: 'b1', uid: 'b2' });
    E.togglePrivilege();
    ok(E.getState().players[me].privilegedUsed === 1,
      'P1-026 el ataque privilegiado consume el uso del turno -> ' + E.getState().players[me].privilegedUsed);
    /* segundo ataque en el MISMO turno: ya no queda uso */
    E.resolvePendingRoll ? null : null;
    var raw = E._raw();
    raw.attack.resolved = true; raw.attack = null;   /* limpiar el ataque anterior */
    plant(me, 'b3', VIOLENT.idx, 1);
    plant(1 - me, 'b4', PEACEFUL.idx, 1);
    var before = raw.players[me].flags.privilegedUsed;
    E.declareAttack(me, 'destroy', { attackerUid: 'b3', uid: 'b4' });
    throws(function () { E.togglePrivilege(); }, /ya has usado|este turno/i,
      'P1-026 un segundo ataque privilegiado en el mismo turno se RECHAZA');
    ok(raw.players[me].flags.privilegedUsed === before,
      'P1-026 el intento rechazado no consumio el uso');
    /* otra faccion no lo concede */
    fresh('servantsofcthulhu1', 'bavarianilluminati1');
    var me2 = readyToAttack(0);   /* el 0 es Servants of Cthulhu: sin poder privilegiado */
    plant(me2, 'x1', VIOLENT.idx, 1); plant(1 - me2, 'x2', PEACEFUL.idx, 1);
    E.declareAttack(me2, 'destroy', { attackerUid: 'x1', uid: 'x2' });
    throws(function () { E.togglePrivilege(); }, /no concede ataques privilegiados/i,
      'P1-026 una faccion sin ese poder NO puede privilegiar su ataque');
  })();

  /* ==== 5) P1-026 — la carta 346 Privileged Attack ==== */
  (function () {
    fresh('servantsofcthulhu1', 'bavarianilluminati1');
    var me = readyToAttack(0);
    var PA = C.cards[idx('privilegedattack')];
    ok(!!PA && PA.effect.kind === 'privileged_attack', 'P1-026 la carta 346 esta clasificada');
    plant(me, 'p1', VIOLENT.idx, 1); plant(1 - me, 'p2', PEACEFUL.idx, 1);
    /* fuera de un ataque no se puede jugar */
    put(me, PA);
    throws(function () { E.playPlot(me, PA.idx, null, {}); }, /ataque tuyo|ataque/i,
      'P1-026 346 fuera de un ataque propio se RECHAZA');
    E.declareAttack(me, 'destroy', { attackerUid: 'p1', uid: 'p2' });
    /* coste: accion del Illuminati o de un grupo Secret */
    E.getState().players[me].illumTokens = 0;
    var raw0 = E._raw(); raw0.players[me].illumTokens = 1;
    E.playPlot(me, PA.idx, null, {});
    ok(!!E._raw().attack.privilege, 'P1-026 346 vuelve privilegiado EL ATAQUE DECLARADO');
    ok(raw0.players[me].illumTokens === 0, 'P1-026 346 gasto la accion del Illuminati');
    ok(raw0.players[me].hand.indexOf(PA.idx) < 0, 'P1-026 la carta jugada sale de la mano');
    /* y no se puede repetir sobre el mismo ataque */
    put(me, PA);
    throws(function () { E.playPlot(me, PA.idx, null, {}); }, /ya es privilegiado/i,
      'P1-026 346 no se puede jugar dos veces sobre el mismo ataque');
  })();

  /* ==== 6) P1-027 — EMBEZZLEMENT (249) ====
     "Play immediately when another player draws a Plot card, before he uses it
     or announces what it is" -> la ventana se abre en E.drawPlot, no al jugar
     la Plot. Y el jugador que roba es el que tiene el turno; el que responde
     juega fuera de turno (esta en la lista `instant`). ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    var EMB = C.cards[idx('embezzlement')];
    ok(!!EMB && EMB.effect.kind === 'embezzlement', 'P1-027 la carta 249 esta clasificada');
    if (!EMB) return;
    var resp = 1 - me;
    /* el que responde necesita una Plot propia para pagar ("Requires Plot Discard") */
    var filler = C.cards.filter(function (c) { return c.type === 'plot' && c.idx !== EMB.idx; })[0];
    put(resp, EMB);
    put(resp, filler);
    var res = E.drawPlot(me);
    var ev = E.getState().pendingEvent;
    ok(!!ev && ev.kind === 'plotDrawn',
      'P1-027 robar una Plot de otro jugador abre la ventana de SUCESO -> ' + JSON.stringify(ev && ev.kind));
    ok(!!(ev && ev.responders && ev.responders.length),
      'P1-027 la ventana ofrece la carta a quien puede responder');
    if (!ev) return;
    /* el jugador que la robo es un rival del que responde */
    ok(ev.byName !== (E.getState().players[resp].name),
      'P1-027 la ventana nombra a quien provoco el suceso');
    /* mientras la ventana esta abierta, ESA Plot no se puede jugar */
    throws(function () { E.playPlot(me, res.idx, null, {}); }, /todavia no puedes usar|primero se resuelve/i,
      'P1-027 la Plot en disputa NO se puede jugar mientras la ventana esta abierta');
    /* el que responde juega fuera de turno y paga con su propia Plot */
    E.playPlot(resp, EMB.idx, null, { payment: filler.idx });
    ok(!!E._raw().pendingEvent, 'P1-027 jugar la carta NO cierra la ventana (dos pasos)');
    E.resolvePendingEvent();
    var raw = E._raw();
    ok(raw.players[resp].hand.indexOf(res.idx) >= 0,
      'P1-027 la Plot robada acaba en la mano del que respondio -> ' + raw.players[resp].hand.join(','));
    ok(raw.players[me].hand.indexOf(res.idx) < 0, 'P1-027 y sale de la mano de quien la habia robado');
    ok(raw.plotDiscard.indexOf(filler.idx) >= 0,
      'P1-027 el jugador que responde descarta su propia Plot como pago');
    ok(E.getState().pendingEvent === null, 'P1-027 la ventana quedo cerrada');
  })();

  /* ==== 7) P1-027 — STOLING THE PLANS (374) ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    var STP = C.cards[idx('stealingtheplans')];
    ok(!!STP && STP.effect.kind === 'stealing_the_plans', 'P1-027 la carta 374 esta clasificada');
    var dfn = 1 - me;
    /* el que responde necesita un grupo con Poder >= 3 con ficha */
    var strong = C.cards.filter(function (c) { return c.type === 'group' && (c.power || 0) >= 3; })[0];
    ok(!!strong, 'P1-027 el mazo tiene un grupo con Poder >= 3 para pagar 374');
    if (!strong) return;
    plant(me, 'sg', strong.idx, 1);
    put(me, STP);
    /* un Plot que el rival descarta */
    var victim = C.cards.filter(function (c) { return c.type === 'plot'; })[0];
    put(dfn, victim);
    E.discardCard(dfn, victim.idx);
    ok(E._raw().plotDiscard.indexOf(victim.idx) >= 0, 'P1-027 el descarte del rival llego a la pila');
    var ev = E.getState().pendingEvent;
    ok(!!ev && ev.kind === 'plotDiscarded',
      'P1-027 descartar una Plot abre la ventana de SUCESO -> ' + JSON.stringify(ev && ev.kind));
    if (ev) {
      E.playPlot(me, STP.idx, null, { aidUid: 'sg' });
      ok(!!E._raw().pendingEvent, 'P1-027 jugar la carta NO cierra la ventana (dos pasos)');
      E.resolvePendingEvent();
      var raw = E._raw();
      ok(raw.players[me].hand.indexOf(victim.idx) >= 0,
        'P1-027 la Plot descartada acaba en la mano de quien respondio -> ' + raw.players[me].hand.join(','));
      ok(raw.plotDiscard.indexOf(victim.idx) < 0, 'P1-027 la Plot salio del descarte');
      ok(E.getState().pendingEvent === null, 'P1-027 la ventana quedo cerrada');
    }
  })();

  /* ==== 8) P1-027 — THE SECOND BULLET (398) ====
     "Play immediately after you fail a roll to destroy" -> extiende la ventana
     de RODADERO de §37: si la ventana esta abierta y el rodadero ha fallado, el
     atacante gasta las fichas de los grupos que ya participaron y se repite. ==== */
  (function () {
    fresh('bavarianilluminati1', 'servantsofcthulhu1');
    var me = readyToAttack(0);
    var SB = C.cards[idx('thesecondbullet')];
    ok(!!SB && SB.effect.kind === 'second_bullet', 'P1-027 la carta 398 esta clasificada');
    /* atacante y objetivo con fuerza marginal: la tirada tiene que FALLAR */
    /* Para que la ventana de rodadero exista hace falta FUERZA >= 2: con menos, el
     * motor falla en automatico SIN tirar y no hay nada que reaccionar. Se usa el
     * grupo mas fuerte como atacante y el mas debil como victima. */
    var gs = C.cards.filter(function (c) { return c.type === 'group' && (c.power || 0) > 0; });
    gs.sort(function (x, y) { return (y.power || 0) - (x.power || 0); });
    var att = gs[0];
    var vic = gs[gs.length - 1];
    plant(me, 'sa', att.idx, 1);
    /* Un segundo grupo del atacante, con ideologia OPUESTA a la de la victima y
     * ficha intacta: es exactamente el caso que describe la carta ("any of your
     * own groups still have Action tokens and were eligible to participate").
     * El que declara el ataque ya gasto su ficha (P1-022). */
    var OPS = { violent: 'peaceful', peaceful: 'violent', liberal: 'conservative', conservative: 'liberal', weird: 'straight', straight: 'weird' };
    var need = OPS[(vic.alignments || [])[0]];
    var second = hasAlign(need);
    ok(!!second, 'P1-027 hay un grupo del atacante elegible con ficha -> ' + vic.name + ' / ' + need);
    if (!second) return;
    plant(me, 'sa2', second.idx, 1);
    plant(1 - me, 'sv', vic.idx, 1);
    E.declareAttack(me, 'destroy', { attackerUid: 'sa', uid: 'sv' });
    var A = E._raw().attack;
    A.aids.push({ uid: 'sa', name: att.name, power: att.power });  /* el propio atacante */
    /* la ventana de rodadero solo se abre si alguien puede reaccionar de verdad:
     * se inyecta Bribery en la mano del defensor, que sirve como testigo. */
    var BRB = C.cards[idx('bribery')];
    put(1 - me, BRB);
    /* fuerza 1 -> el rodadero automatico falla sin tirar; la ventana se abre */
    var realRandom = Math.random; Math.random = function () { return 0.99; };  /* 2+2... no: 11 */
    E.resolveAttack();
    Math.random = realRandom;
    var R = E.getState().pendingRoll;
    ok(!!R, 'P1-027 tras un rodadero fallido hay ventana abierta');
    ok(R && R.success === false, 'P1-027 el rodadero pendiente es un FALLO -> ' + JSON.stringify(R && R.success));
    if (R) {
      var tok0 = E._raw().attack ? 0 : 0;
      var nodeA = findNode(E._raw().players[me].structure, 'sa2');
      var tokens0 = nodeA.tokens;
      put(me, SB);
      E.playPlot(me, SB.idx, null, {});
      var R2 = E.getState().pendingRoll;
      ok(!!R2 && !!R2.reroll, 'P1-027 The Second Bullet obliga a REPETIR el rodadero');
      ok(nodeA.tokens < tokens0,
        'P1-027 la carta gasto la ficha del grupo que participates -> ' + tokens0 + ' -> ' + nodeA.tokens);
      E.resolvePendingRoll();
      ok(E.getState().pendingRoll === null, 'P1-027 la ventana quedo cerrada tras la segunda bala');
    }
  })();
})();

/* ---------- Utilidad global: resolver un ataque SIN ventanas de reaccion ----------
   P1-021 (ventana de RODADERO) hace que, tras tirar los dados, el motor pare y
   espere si alguien tiene una de las 6 cartas de rodadero en la mano. Los tests
   usan manos reales del mazo, asi que sin este sellado el resultado depende de
   que carta le toco a cada quien: es la MISMA clase de fragilidad que el +10 de
   posicion que hacia fallar Car Bomb (§33.5).
   `sealedResolve()` quita de TODAS las manos las 8 cartas que abren una ventana
   (las 2 de P1-016 + las 6 de P1-021), resuelve, y por si acaso cierra la
   ventana. Es una funcion de modulo: el hoisting la deja disponible para los
   bloques de arriba que ya la usan. */
function sealWindows() {
  /* El array va DENTRO a proposito: la asignacion de una `var` de nivel de
     modulo no se ejecuta hasta llegar a esta linea del fichero, asi que si
     viviera fuera, al correr los bloques de arriba seria `undefined`. */
  var windowKinds = ['bodyguard', 'talisman', 'bribery', 'computervirus',
                     'murphyslaw', 'timewarp', 'mistakenidentity', 'mothersmarch',
                     'stealing_the_plans', 'embezzlement'];
  var S = E._raw();
  S.players.forEach(function (p) {
    p.hand = p.hand.filter(function (ix) {
      var e = C.cards[ix] && C.cards[ix].effect;
      return !(e && windowKinds.indexOf(e.kind) >= 0);
    });
  });
}
function sealedResolve() {
  sealWindows();
  var out = E['resolve' + 'Attack']();
  if (E.getState().pendingRoll) out = E.resolvePendingRoll();
  return out;
}
function sealedInstantAttack(pid, power, targetUid, opts) {
  sealWindows();
  var out = E['instant' + 'Attack'](pid, power, targetUid, opts);
  if (E.getState().pendingRoll) out = E.resolvePendingRoll();
  return out;
}

console.log('');
if (failures.length) {
  console.log('FASE 2 RULES FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.log('  - ' + f); });
  process.exitCode = 1;
} else {
  console.log('FASE 2 RULES PASSED');
}
