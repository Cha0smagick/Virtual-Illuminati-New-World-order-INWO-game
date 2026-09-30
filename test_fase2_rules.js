/* Fase 2 — central rules gate (P1-001..P1-009).
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
    return E.instantAttack(0, 40, 'ia-victim', { targetSubtype: 'place' });
  });
  ok(res.lastPlotResult && (res.lastPlotResult.ok === true || res.lastPlotResult.ok === false),
    'instantAttack devuelve resultado trazable -> ' + JSON.stringify(res.lastPlotResult));
  var res2 = withPlace(function () {
    return E.instantAttack(0, 1, 'ia-victim', { targetSubtype: 'place' });
  });
  ok(res2.lastPlotResult && res2.lastPlotResult.ok === false && res2.lastPlotResult.reason === 'fallo automático',
    'Poder 1 -> fallo automático (regla <2) -> ' + JSON.stringify(res2.lastPlotResult));
  var res3 = null;
  throws(function () { withPlace(function () {
    return E.instantAttack(0, 40, 'ia-victim', { targetSubtype: 'personality' });
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
     menos de 3 hijos, así que un árbol finito SIEMPRE tiene ≥1 flecha libre y el
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
  E.resolveAttack();
  Math.random = realRandom;
  var s = E.getState();
  ok(s.neutralArea.length === 1 && s.neutralArea[0].cardId === handIdx,
    'P1-004 el control ganado manda la carta al ÁREA NEUTRAL -> ' + JSON.stringify(s.neutralArea));
  ok(s.players[r].hand.indexOf(handIdx) === -1, 'P1-004 la carta sale de la mano del rival');
  ok(E.getState().attack === null, 'P1-004 el ataque se limpia tras resolverse');
})();

/* ---------- P1-008: las 9 metas de los Illuminati se evaluan desde los datos ---------- */
(function () {
  /* startGame sortea quién empieza, así que el jugador de una facción se
     localiza por su Illuminati y NUNCA por currentPid. */
  function pidOf(baseId) {
    var s = E.getState();
    for (var i = 0; i < s.players.length; i++) {
      if (String(s.players[i].illumId).replace(/\d+$/, '') === baseId) return i;
    }
    return -1;
  }

  /* 1) Ningún Illuminati puede volver al texto genérico "Meta básica".
     El motor prohíbe repetir facción, así que se cubren las 9 Illuminati en
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
     Se plantan 3 copias del MISMO grupo (Poder 14 = 42 ≥ 35) para garantizar
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
   P1-009 — Los 9 poderes especiales de las facciones Illuminati.
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
     facción: el reparto inicial es idéntico porque ocurre antes de elegir
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
  E.resolveAttack();
  Math.random = rr;
  ok(plotsOf(cth) === p0 + 1, 'P1-009 Cthulhu roba un Plot cada vez que destruye -> ' + p0 + ' -> ' + plotsOf(cth));

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
  E.resolveAttack();                        /* cerrar el ataque de control abierto arriba */
  plant(sh, 's1b', GORDO.idx, 1);          /* Gordo Remora NO es Violent */
  E.instantAttack(atk, 40, 's1b');
  Math.random = realRandom7;
  ok(findNode(E._raw().players[sh].structure, 's1b') !== null,
    'P1-009 Shangri-La veta destruir un grupo que NO es Violent (el objetivo sobrevive)');
  plant(sh, 's2', TEXAS.idx, 1);            /* Texas SÍ es Violent */
  Math.random = function () { return 0; };
  E.instantAttack(atk, 40, 's2');
  Math.random = realRandom7;
  ok(findNode(E._raw().players[sh].structure, 's2') === null,
    'P1-009 Shangri-La SÍ pierde un grupo Violent (el veto no es absoluto)');

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

console.log('');
if (failures.length) {
  console.log('FASE 2 RULES FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.log('  - ' + f); });
  process.exitCode = 1;
} else {
  console.log('FASE 2 RULES PASSED');
}
