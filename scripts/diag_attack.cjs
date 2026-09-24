'use strict';

/* diag_attack.cjs — imprime previews de ataques sin tragarse excepciones. */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const load = (name) => require(path.join(ROOT, 'game', 'js', name));

global.window = {};
['images.js', 'cards.js', 'cardtexts_data.js', 'statsfix.js', 'texts.js', 'engine.js', 'ai.js'].forEach(load);
const C = global.window.INWO_CARDS;
const E = global.window.Engine;
const AI = global.window.AI;
if (!C || !E || !AI) throw new Error('No se pudieron cargar cards, engine o ai');

function cardName(state, uid) {
  if (!uid) return '?';
  for (const player of state.players) {
    let hit = null;
    (function walk(node) {
      if (hit) return;
      if (node.uid === uid) hit = node.cardId;
      (node.children || []).forEach(walk);
    }(player.structure));
    if (hit != null) return (C.cards[hit] || C.byId[hit] || {}).name || String(hit);
  }
  const neutral = (state.neutralArea || []).find((entry) => entry.uid === uid);
  if (neutral) return 'NEUTRAL:' + ((C.cards[neutral.cardId] || {}).name || neutral.cardId);
  if (state.attack && state.attack.handTarget) return 'HAND:' + ((C.cards[state.attack.handTarget.idx] || {}).name || state.attack.handTarget.idx);
  return '?';
}

let dumped = 0;
const originalResolve = E.resolveAttack;
E.resolveAttack = function (...args) {
  const state = E.getState();
  if (state.attack && !state.attack.resolved) {
    const detail = E.previewStrength();
    console.log(`--- ATAQUE ${++dumped} tipo=${state.attack.type} atacante=${cardName(state, state.attack.attackerUid)} objetivo=${cardName(state, state.attack.targetUid)}`);
    console.log(JSON.stringify({
      base: detail.base,
      leaderMod: detail.leaderMod,
      defenseBase: detail.defenseBase,
      defenseBonus: detail.defenseBonus,
      posBonus: detail.posBonus,
      selfDef: detail.selfDef,
      aids: detail.aids,
      opposes: detail.opposes,
      boosts: detail.boosts,
      defBoosts: detail.defBoosts,
      total: detail.total
    }));
    console.log('notes:', (detail.notes || []).join(' | '));
  }
  return originalResolve.apply(E, args);
};

const GAMES = 6;
for (let game = 0; game < GAMES; game++) {
  E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
  const available = E.availableIlluminati();
  E.setIlluminati(0, available[(game * 2) % available.length].id);
  E.setIlluminati(1, available[(game * 2 + 1) % available.length].id);
  E.startGame();
  let turns = 0;
  while (E.getState().phase !== 'gameover' && turns++ < 80) {
    const state = E.getState();
    if (state.phase !== 'main') throw new Error('fase inesperada: ' + state.phase);
    AI.takeTurn(E, state.currentPid);
    const afterAi = E.getState();
    if (afterAi.attack && !afterAi.attack.resolved) E.resolveAttack();
    if (E.getState().phase !== 'gameover') E.endTurn();
  }
}

console.log('DIAG ATTACK OK · ataques inspeccionados:', dumped);
if (!dumped) process.exitCode = 1;
