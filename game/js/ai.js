/* ================================================================
   INWO AI v2 â€” Sisyphus self-build.
   IA competitiva: economÃ­a de tokens, colocaciÃ³n por sinergia,
   uso real de Plots, ataques con matemÃ¡tica del motor
   (previewStrength + boosts) y RESPUESTAS defensivas
   (autodefensa, boost de defensa, oposiciÃ³n/ayuda selectiva).
   API: window.AI = { takeTurn(E,pid), respond(E,pid) }
   ================================================================ */
(function () {
'use strict';
var C = window.INWO_CARDS;

/* ---------- utilidades base ---------- */
function card(x) {
  if (typeof x === 'number') return C.cards[x];
  return (C.byId && C.byId[x]) || C.cards.filter(function (c) { return c.id === x; })[0];
}
function aligns(ix) { var c = card(ix); return (c && c.alignments) || []; }
function walkNodes(nd, f) { f(nd); (nd.children || []).forEach(function (ch) { walkNodes(ch, f); }); }
function collectNodes(st, pid) {
  var out = [];
  walkNodes(st.players[pid].structure, function (n) { out.push(n); });
  return out;
}
function controlled(st, pid) {
  return collectNodes(st, pid).filter(function (n) { return n.cardId != null && !/-root$/.test(String(n.uid)); });
}
function findNodeAny(st, uid) {
  for (var i = 0; i < st.players.length; i++) {
    var hit = null;
    walkNodes(st.players[i].structure, function (n) { if (n.uid === uid) hit = n; });
    if (hit) return hit;
  }
  var na = st.neutralArea.filter(function (n) { return n.uid === uid; })[0];
  return na ? { cardId: na.cardId, tokens: 0, children: [], neutral: true } : null;
}
function ownerPid(st, uid) {
  for (var i = 0; i < st.players.length; i++) {
    var found = false;
    walkNodes(st.players[i].structure, function (n) { if (n.uid === uid) found = true; });
    if (found) return i;
  }
  return -1;
}
function parentOf(st, pid, uid) {
  var res = null;
  (function walk(n, par) {
    if (n.uid === uid) { res = par; return; }
    (n.children || []).forEach(function (ch) { walk(ch, n); });
  })(st.players[pid].structure, null);
  return res;
}
function depthOf(st, pid, uid) {
  var d = -1;
  (function walk(n, dep) { if (d >= 0) return; if (String(n.uid) === String(uid)) { d = dep; return; } (n.children || []).forEach(function (ch) { walk(ch, dep + 1); }); })(st.players[pid].structure, 0);
  return d;
}
function posBonus(depth) { return depth === 1 ? 10 : (depth === 2 ? 5 : 0); }
function sharedWithMaster(st, pid, uid) {
  var m = parentOf(st, pid, uid);
  if (!m || m.cardId == null) return 0;
  var ma = aligns(m.cardId), ta = aligns(findNodeAny(st, uid).cardId), n = 0;
  ta.forEach(function (a) { if (ma.indexOf(a) >= 0) n++; });
  return n;
}
var OPP = { peaceful: 'violent', violent: 'peaceful', liberal: 'conservative', conservative: 'liberal', weird: 'straight', straight: 'weird' };
function alignDeltaControl(aA, aT) {
  var d = 0;
  aA.forEach(function (a) {
    if (aT.indexOf(a) >= 0) d += 4;
    else if (OPP[a] && aT.indexOf(OPP[a]) >= 0) d -= 4;
  });
  return d;
}
function alignDeltaDestroy(aA, aT) { /* opuestos suman, idÃ©nticos restan */
  var d = 0;
  aA.forEach(function (a) {
    if (aT.indexOf(a) >= 0) d -= 4;
    else if (OPP[a] && aT.indexOf(OPP[a]) >= 0) d += 4;
  });
  return d;
}
/* P(Ã©xito) tirando â‰¤ fuerza en 2d6 con 11-12 fallo automÃ¡tico */
var W2D6 = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 0, 0]; /* Ã­ndice 2..10 */
var CUM = (function () { var s = 0, o = [0, 0]; for (var i = 2; i <= 10; i++) { s += W2D6[i]; o[i] = s; } o[11] = s; o[12] = s; return o; })();
function winProb(strength) {
  var s = Math.max(0, Math.min(12, Math.floor(strength)));
  return CUM[s] / 36;
}
function subtreeValue(st, uid) {
  var n = findNodeAny(st, uid);
  if (!n) return 0;
  var v = 1, pow = 0, cnt = 0;
  walkNodes(n, function (x) {
    if (x.cardId != null) { cnt++; var c = card(x.cardId); pow += (c && c.power) || 0; }
  });
  v += 0.65 * (cnt - 1) + 0.06 * pow;
  return v;
}
function baseIllum(id) { return String(id || '').replace(/\d+$/, ''); }
function illumCode(st, pid) {
  var p = st.players[pid];
  var c = card(p.illumId);
  return (c && c.effect && c.effect.code) || baseIllum(p.illumId);
}
function leaderPid(st) {
  var best = 0, bv = -1;
  st.victoryStatus.forEach(function (v) {
    var m = String((v.progress || {}).groups || '').match(/(\d+)/);
    var g = m ? parseInt(m[1], 10) : 0;
    if (g > bv) { bv = g; best = v.pid; }
  });
  return best;
}
function isRootNode(n) { return n.cardId == null || /-root$/.test(String(n.uid)); }
function openArrows(st, pid, nd) {
  var cap = isRootNode(nd) ? 4 : 3;
  return cap - (nd.children || []).length;
}
/* Plots "genÃ©ricos" reutilizables como +10 en combate */
function sparePlotIdx(st, pid) {
  var h = st.players[pid].hand;
  for (var i = 0; i < h.length; i++) {
    var c = card(h[i]);
    if (!c || c.type !== 'plot') continue;
    var k = c.effect && c.effect.kind;
    if (!k || k === 'generic' || k === 'boost10' || k === 'plot_generic') return h[i];
  }
  return null;
}

/* ---------- economÃ­a y colocaciÃ³n ---------- */
function bestHandGroup(st, pid) {
  var h = (st.players[pid] || {}).hand || [];
  var best = null, bv = -1;
  for (var i = 0; i < h.length; i++) {
    var c = card(h[i]);
    if (!c || c.type !== 'group') continue;
    var v = cardGoalValue(st, pid, c);
    if (v > bv) { bv = v; best = { idx: h[i], score: v }; }
  }
  return best;
}
function placeUnder(E, st, pid, handIdx) {
  /* deepest-first: los hosts con flecha abierta ya vienen ordenados por profundidad */
  var hosts = [];
  try { hosts = openArrowHosts(st, pid) || []; } catch (h1) {}
  if (hosts.length) {
    try { E.autoTakeover(pid, handIdx, hosts[0]); return true; } catch (eA) {}
  }
  var rootUid = (st.players[pid].structure || {}).uid;
  try { E.autoTakeover(pid, handIdx, rootUid); return true; } catch (eB) { return false; }
}
function playBestResource(E, st, pid) {
  var pl = st.players[pid];
  if (!pl || pl.usedResourceThisTurn || (pl.illumTokens | 0) <= 0) return false;
  var h = pl.hand || [];
  var best = null, bs = -1;
  for (var i = 0; i < h.length; i++) {
    var c = card(h[i]);
    if (!c || c.type !== 'resource') continue;
    var t = tx(h[i]);
    var s = 2;
    if (hasRe(t, /\+\d+\s*(to|on|for)?\s*(any|all)?\s*(control|attack|destroy)/)) s += 5;
    if (hasRe(t, /(draw|take).*extra.*(plot|group)/)) s += 4;
    if (hasRe(t, /(action token|actions?)\s*(each|per|every|instead)/)) s += 3;
    if (hasRe(t, /immune|immunity/)) s += 3;
    if (hasRe(t, /double|twice/)) s += 2;
    if (g_goalHack && hasRe(t, /aid|defen[cs]e/)) s += 1;
    if (s > bs) { bs = s; best = h[i]; }
  }
  if (!best || bs <= 0) return false;
  try { E.playResource(pid, best, null); return true; } catch (e) { return false; }
}
var g_goalHack = false;

/* ---------- uso inteligente de Plots ---------- */
function strongestEnemyNode(st, pid, minPow) {
  var best = null, bp = minPow || 5;
  for (var q = 0; q < st.players.length; q++) {
    if (q === pid) continue;
    controlled(st, q).forEach(function (nd) {
      var c = card(nd.cardId);
      var pw = (c && c.power) || 0;
      if (nd.paralyzed || nd.devastated) pw = 0;
      if (pw >= bp) { bp = pw; best = nd; }
    });
  }
  return best;
}
function richestEnemyPlace(st, pid) {
  var best = null, bv = 0;
  for (var q = 0; q < st.players.length; q++) {
    if (q === pid) continue;
    controlled(st, q).forEach(function (nd) {
      var c = card(nd.cardId);
      if (!c || c.subtype !== 'Place') return;
      var v = (c.power || 0) + (nd.children || []).length;
      if (v > bv) { bv = v; best = nd; }
    });
  }
  return best;
}
function strongestPersonality(st, pid) {
  var best = null, bp = 4;
  for (var q = 0; q < st.players.length; q++) {
    if (q === pid) continue;
    controlled(st, q).forEach(function (nd) {
      var c = card(nd.cardId);
      if (!c || c.subtype !== 'Personality' || nd.paralyzed) return;
      if ((c.power || 0) >= bp) { bp = c.power; best = nd; }
    });
  }
  return best;
}
function playUsefulPlots(E, st, pid) {
  var pl = st.players[pid];
  if (!pl) return;
  var gi = goalInfo(st, pid);
  var lead = leaderPid(st);
  var acted = true, guard = 0;
  while (acted && guard++ < 6) {
    acted = false;
    var s2 = E.getState();
    if (s2.phase !== 'main' || s2.attack) break;
    var p2 = s2.players[pid]; if (!p2) break;
    var h = p2.hand || [];
    for (var i = 0; i < h.length; i++) {
      var c = card(h[i]);
      if (!c || c.type !== 'plot') continue;
      var t = tx(h[i]), k = (c.effect || {}).kind;
      try {
        if (k === 'paralyze' || k === 'freeze' || hasRe(t, /paraly[sz]e|attribute freeze/)) {
          var tn = strongestEnemyNode(s2, pid, 6);
          if (tn) { E.playPlot(pid, h[i], tn.uid); logless('paraliza', c.name); acted = true; break; }
        } else if (k === 'zap' || hasRe(t, /^zap|\bzap\b/)) {
          if (lead != null && lead !== pid) {
            var zn = strongestEnemyNode(s2, lead, 5);
            if (zn) { E.playPlot(pid, h[i], zn.uid); acted = true; break; }
          }
        } else if (k === 'assassination' || hasRe(t, /assassinat/)) {
          var pn = strongestPersonality(s2, pid);
          if (pn) { E.playPlot(pid, h[i], pn.uid); acted = true; break; }
        } else if (k === 'disaster' || hasRe(t, /disaster/)) {
          var dn = richestEnemyPlace(s2, pid);
          if (dn) { E.playPlot(pid, h[i], dn.uid); acted = true; break; }
        } else if (k === 'nwo' || /new world order/.test(String(c.name).toLowerCase())) {
          E.playPlot(pid, h[i], null); acted = true; break;
        } else if ((c.effect || {}).kind === 'goal' || /(^|\W)goal(s)?(\W|$)/.test(t) || /goal/i.test(String(c.name))) {
          if (gi.near || (gi.type === 'destroy' && gi.have >= 6)) { E.playPlot(pid, h[i], null); acted = true; break; }
        } else if (k === 'power_increase' || hasRe(t, /power (is|becomes|increased)/)) {
          var own = strongestOwnNode(s2, pid, 5);
          if (own) { E.playPlot(pid, h[i], own.uid); acted = true; break; }
        }
      } catch (e) {}
    }
  }
}
function strongestOwnNode(st, pid, minPow) {
  var best = null, bp = minPow;
  collectNodes(st, pid).forEach(function (nd) {
    if (isRootNode(nd)) return;
    var c = card(nd.cardId);
    var pw = curPow(st, nd, c);
    if (pw != null && pw > bp) { bp = pw; best = nd; }
  });
  return best;
}
function curPow(st, nd, c) {
  if (!c) return null;
  var base = (c.power == null ? null : c.power);
  if (base == null) return null;
  return base;
}
function logless(k, n) { try { if (window.AI_LOG) window.AI_LOG.push(k + ': ' + n); } catch (e) {} }

/* ---------- evaluaciÃ³n de ataques ---------- */
function candidateAttacks(E, st, pid) {
  var out = [];
  if (st.config && st.config.players && st.config.players.length === 2 && st.turn < 2) return out;
  var me = st.players[pid];
  if (!me) return out;
  var gi = goalInfo(st, pid);
  var lead = leaderPid(st);
  var canBoost = sparePlotIdx(st, pid) != null;
  var floorCtl = canBoost ? (gi.near ? -22 : -8) : (gi.near ? -4 : 3);
  var floorDst = canBoost ? (gi.near ? -18 : -6) : (gi.near ? -2 : 4);
  var attackers = [];
  collectNodes(st, pid).forEach(function (nd) {
    if (isRootNode(nd)) return;
    if ((nd.tokens | 0) > 0) attackers.push(nd);
  });
  attackers.forEach(function (att) {
    var ac = card(att.cardId);
    if (!ac) return;
    var aAl = alignsOf(ac), secretA = aAl.indexOf('secret') >= 0;
    var arrows = openArrows(st, pid, att);
    /* CONTROLAR: neutral + rivales */
    (st.neutralArea || []).forEach(function (nn) {
      var tc = card(nn.cardId); if (!tc) return;
      var est = estimateControl(st, ac, tc, null);
      var ev = winProb(est) * subtreeValCard(tc) * 2.4;
      if (est >= floorCtl) out.push({ type: 'control', att: att.uid, target: nn.uid, est: est, ev: ev, handTarget: false });
    });
    for (var q = 0; q < st.players.length; q++) {
      if (q === pid) continue;
      var enemy = st.players[q];
      if (!enemy) continue;
      var isLeader = (q === lead);
      collectNodes(st, q).forEach(function (tn) {
        if (isRootNode(tn)) return;
        var tc = card(tn.cardId); if (!tc) return;
        var tAl = alignsOf(tc), secretT = tAl.indexOf('secret') >= 0;
        if (secretT && !secretA && !ac._isIllu) return;
        /* controlar rival */
        if (arrows > 0) {
          var estC = estimateControl(st, ac, tc, tn);
          var valC = subtreeValue(st, tn.uid) * (isLeader ? 1.35 : 1) * (gi.doubleAttr && tAl.indexOf(gi.doubleAttr) >= 0 ? 1.6 : 1);
          if (estC >= floorCtl) out.push({ type: 'control', att: att.uid, target: tn.uid, est: estC, ev: winProb(estC) * valC * 2.4, handTarget: false });
        }
        /* destruir: prioridad lider y metas de destruccion */
        var wantDestroy = isLeader || gi.type === 'destroy';
        if (wantDestroy) {
          if (illumCode(st, pid) === 'shangrila' && !(tAl.indexOf('violent') >= 0)) return;
          var estD = estimateDestroy(st, ac, tc, tn);
          if (estD >= floorDst) out.push({ type: 'destroy', att: att.uid, target: tn.uid, est: estD, ev: winProb(estD) * subtreeValCard(tc) * 1.7, handTarget: false });
        }
      });
    }
  });
  out.sort(function (a, b) { return b.ev - a.ev; });
  return out.slice(0, 6);
}
function subtreeValCard(tc) { return 1 + 0.65 * 0 + 0.06 * ((tc && tc.power) || 0); }
function estimateControl(st, ac, tc, tNode) {
  var P = ac.power == null ? 5 : ac.power;
  var R = tc.resistance == null ? 5 : tc.resistance;
  var d = alignDeltaControl(alignsOf(ac), alignsOf(tc));
  var def = R + 4 * sharedWithMasterAligns(st, tc, tNode) + posBonusNode(st, tNode);
  return P + d - def;
}
function estimateDestroy(st, ac, tc, tNode) {
  var P = ac.power == null ? 5 : ac.power;
  var TP = tc.power == null ? 5 : tc.power;
  var d = alignDeltaDestroy(alignsOf(ac), alignsOf(tc));
  var pos = tNode ? posBonusNode(st, tNode) : 0;
  return P + d + pos - TP;
}
function sharedWithMasterAligns(st, tc, tNode) {
  if (!tNode) return 0;
  var par = null;
  for (var q = 0; q < st.players.length; q++) {
    var found = null;
    walkNodes(st.players[q].structure, function (nd) { if (nd.uid === tNode.uid) found = nd; });
    if (found) {
      var rootC = card(st.players[q].structure.cardId);
      var rAl = rootC ? alignsOf(rootC) : [];
      var tAl = alignsOf(tc), sh = 0;
      tAl.forEach(function (a) { if (rAl.indexOf(a) >= 0) sh++; });
      if (sh >= 2 && tAl.indexOf('fanatic') >= 0 && rAl.indexOf('fanatic') >= 0) sh -= 1;
      return Math.min(sh, 9);
    }
  }
  return 0;
}
function posBonusNode(st, tNode) {
  if (!tNode) return 0;
  for (var q = 0; q < st.players.length; q++) {
    var hit = false;
    walkNodes(st.players[q].structure, function (nd) { if (nd.uid === tNode.uid) hit = true; });
    if (hit) return posBonus(depthOf(st, q, tNode.uid));
  }
  return 0;
}
function openArrowHosts(st, pid) {
  var hosts = [];
  collectNodes(st, pid).forEach(function (nd) {
    if (openArrows(st, pid, nd) > 0) hosts.push(nd.uid);
  });
  hosts.sort(function (a, b) { return depthOf(st, pid, b) - depthOf(st, pid, a); });
  return hosts;
}

function runAttack(E, st, pid) {
  var cands = candidateAttacks(E, st, pid);
  if (!cands.length) return 'none';
  for (var ci = 0; ci < cands.length; ci++) {
    var cand = cands[ci];
    try {
      E.declareAttack(pid, cand.type, { attackerUid: cand.att, uid: cand.target });
      var det = E.previewStrength();
      var tries = 0;
      while (det && det.total < 9 && tries < 2) {
        var sp = sparePlotIdx(E.getState(), pid);
        if (sp == null) break;
        try { E.addBoost(pid, sp, false); } catch (e2) { break; }
        det = E.previewStrength(); tries++;
      }
      var humansLeft = 0;
      var s3 = E.getState();
      (s3.players || []).forEach(function (p, qi) { if (p.human && qi !== s3.attack.pid) humansLeft++; });
      if (humansLeft > 0) return 'open';
      var others = [];
      (s3.players || []).forEach(function (p, qi) { if (qi !== pid && !p.human) others.push(qi); });
      for (var oi = 0; oi < others.length; oi++) { try { respondInternal(E, others[oi]); } catch (e4) {} }
      try { E.resolveAttack(); } catch (e3) {}
      return 'done';
    } catch (e) { try { E.resolveAttack(); } catch (e5) {} }
  }
  return 'none';
}

/* ---------- RESPUESTAS (defensa/oposiciÃ³n/ayuda) ---------- */

/* ======== AI v3: meta + playbook ======== */
function victoryRow(st, pid) {
  var vs = st.victoryStatus || [];
  for (var i = 0; i < vs.length; i++) if (vs[i].pid === pid) return vs[i];
  return null;
}
function goalInfo(st, pid) {
  var row = victoryRow(st, pid);
  var g = { type: 'basic', target: 12, have: 12, near: false };
  if (row) {
    var pr = row.progress || {};
    var m = String(pr.groups || '0').split('/');
    g.have = Number(m[0]) || 0;
    g.target = Number(m[1]) || 12;
  }
  var ic = illumCode(st, pid);
  if (ic === 'cthulhu') { g.type = 'destroy'; g.target = Math.max(g.target, 8); }
  else if (ic === 'shangrila') g.type = 'peaceful';
  else if (ic === 'ufos') g.type = 'pick3';
  var da = { network: 'computer', gnomes: 'corporate', discordian: 'weird' }[ic];
  if (da) { g.type = 'basic'; g.doubleAttr = da; }
  g.near = g.have >= g.target - 2;
  return g;
}
function alignsOf(c) { return (c && c.alignments) || []; }
function cardGoalValue(st, pid, c) {
  if (!c) return 0;
  var g = goalInfo(st, pid);
  var v = (c.power == null ? 3 : c.power) * 2 + (c.resistance == null ? 5 : c.resistance);
  if (g.doubleAttr && alignsOf(c).indexOf(g.doubleAttr) >= 0) v *= 1.9;
  if (g.type === 'peaceful' && alignsOf(c).indexOf('peaceful') >= 0) v += 6;
  return v;
}
function tx(ix) {
  var c = card(typeof ix === 'number' ? ix : ix);
  if (!c) return '';
  var ocr = window.INWO_OCR || {};
  return String(c.text || ocr[c.id] || '').toLowerCase();
}
function hasRe(text, re) { try { return re.test(text); } catch (e) { return false; } }

function respondInternal(E, q) {
  var st = E.getState(), A = st.attack;
  if (!A || A.resolved || A.pid === q) return;
  function safe(f) { try { return f(); } catch (e) { return null; } }

  /* 1) autodefensa si el ataque amenaza en serio */
  if (A.targetPid === q && !A.selfDefended) {
    var det0 = safe(function () { return E.previewStrength(); }) || { total: 0 };
    var tv = subtreeValue(st, A.targetUid);
    if (det0.total >= 7 || tv >= 3.2) safe(function () { E.addSupport(q, { selfDefend: true }); });
  }
  var det = safe(function () { return E.previewStrength(); }) || { total: 0 };

  /* 2) boost de defensa si sigue siendo probable que caiga algo valioso */
  if (!A.resolved && det.total >= 8 && A.targetPid === q) {
    var tv2 = subtreeValue(st, A.targetUid);
    if (tv2 >= 2.5) {
      var dp = sparePlotIdx(st, q);
      if (dp != null) safe(function () { E.addBoost(q, dp, true); });
      det = safe(function () { return E.previewStrength(); }) || det;
    }
  }

  /* 3) oposiciÃ³n selectiva: frenar al lÃ­der o protegerme */
  var attIsLeader = leaderPid(st) === A.pid;
  var threatensMe = A.targetPid === q;
  var gain = A.type === 'control' ? subtreeValue(st, A.targetUid)
    : ((card(findNodeAny(st, A.targetUid).cardId) || {}).power || 0) >= 6 ? 1.5 : 0.6;
  if ((det.total >= 9 || (det.total >= 7 && (attIsLeader || threatensMe))) && gain >= 1) {
    var best = null, bp = 1;
    controlled(st, q).forEach(function (nd) {
      if ((nd.tokens == null ? 0 : nd.tokens) < 1 || nd.paralyzed || nd.zapped || nd.devastated) return;
      var pw = (card(nd.cardId).power || 0);
      if (pw > bp) { bp = pw; best = nd; }
    });
    if (best) safe(function () { E.addSupport(q, { uid: best.uid, oppose: true }); });
  }

  /* 4) ayudar a DESTRUIR un grupo del lÃ­der (si el atacante no es Ã©l ni yo) */
  if (A.type === 'destroy' && !A.resolved) {
    var lp = leaderPid(st), tp = A.targetPid;
    if (tp === lp && lp !== A.pid && lp !== q) {
      var g = null, gp = 1;
      controlled(st, q).forEach(function (nd) {
        if ((nd.tokens == null ? 0 : nd.tokens) < 1) return;
        var pw = (card(nd.cardId).power || 0);
        if (pw > gp) { gp = pw; g = nd; }
      });
      if (g) safe(function () { E.addSupport(q, { uid: g.uid, oppose: false }); });
    }
  }
}

/* ---------- TURNO COMPLETO ---------- */
function takeTurn(E, pid) {
  var st = E.getState();
  if (st.phase === 'gameover') return;
  E.drawPlot(pid);
  E.drawGroup(pid);
  st = E.getState();
  /* takeover automatico: mejor grupo por valor de meta */
  var bg = bestHandGroup(st, pid);
  if (bg != null) { try { placeUnder(E, st, pid, bg.idx); } catch (e0) {} }
  st = E.getState();
  var gi = goalInfo(st, pid);
  /* recursos inteligentes */
  try { playBestResource(E, st, pid); } catch (eR) {}
  st = E.getState();
  /* extra group draw del illuminati */
  var pl = st.players[pid];
  if (pl && !pl.usedExtraDrawThisTurn && (pl.illumTokens | 0) > 0) { try { E.illumDrawGroup(pid); } catch (eX) {} }
  /* intercambio tokens -> plots (mantener 1 para emergencias; agresivo en endgame) */
  var exch = 0;
  st = E.getState();
  pl = st.players[pid];
  while (pl && exch < 3 && (pl.illumTokens | 0) > (gi.near ? 1 : 2)) {
    try { E.exchangeForPlot(pid, { illum: true }); exch++; } catch (eE) { break; }
    st = E.getState(); pl = st.players[pid];
  }
  /* plots utiles */
  try { playUsefulPlots(E, st, pid); } catch (eP) {}
  /* ataques hasta 3 rondas */
  var rounds = 0;
  while (rounds++ < 3) {
    st = E.getState();
    if (st.phase === 'gameover') return;
    if (st.attack) { runAttackResume(E, st, pid); }
    else {
      var r = runAttack(E, st, pid);
      if (r === 'open' || r === 'none') break;
    }
    st = E.getState();
    if (st.attack) break;
  }
}
function runAttackResume(E, st, pid) {
  var A = st.attack;
  if (!A) return;
  if (A.pid !== pid) return;
  var humansLeft = 0;
  (st.players || []).forEach(function (p, qi) { if (p.human && qi !== pid) humansLeft++; });
  if (humansLeft > 0) return;
  try { E.resolveAttack(); } catch (e) {}
}

window.AI = {
  takeTurn: function (E, pid) { try { takeTurn(E, pid); } catch (e) {} },
  respond: function (E, pid) { try { respondInternal(E, pid); } catch (e) {} },
  _internal: { respondInternal: respondInternal, takeTurn: takeTurn }
};
})();
