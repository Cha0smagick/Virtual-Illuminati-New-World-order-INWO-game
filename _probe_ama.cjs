global.window = {};
['images.js', 'cards.js', 'engine.js'].forEach(n => require('./game/js/' + n));
const E = global.window.Engine, C = global.window.INWO_CARDS;
function idx(id) { return C.cards.findIndex(c => c.id === id); }
function findN(uid) {
  let out = null;
  E._raw().players.forEach(p => (function go(n) { if (!n || out) return; if (n.uid === uid) { out = n; return; } (n.children || []).forEach(go); })(p.structure));
  return out;
}
E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
E.setIlluminati(0, 'bavarianilluminati1');
E.setIlluminati(1, 'servantsofcthulhu1');
E.startGame();
for (let g = 0; g < 8; g++) {
  const s = E.getState();
  if (s.currentPid === 0 && s.players[0].turnsCompleted >= 1 && s.players[1].turnsCompleted >= 1) break;
  try { E.endTurn(); } catch (e) { const r = E._raw(); if (r.pendingEvent) E.resolvePendingEvent(); else if (r.pendingRoll) E.resolvePendingRoll(); }
}
const root = E._raw().players[0].structure;
root.children.push({ uid: 'amaX', cardId: idx('ama'), children: [], tokens: 1 });
E._raw().players[1].structure.children.push({ uid: 'svY', cardId: idx('siliconvalley'), children: [], tokens: 1 });
global.DBG45=true;E.declareAttack(0, 'destroy', { attackerUid: 'amaX', uid: 'svY' });
const att = findN('amaX');
const st = E._raw().players[0].structure;
let same = false;
(function go(n) { if (n === att) same = true; (n.children || []).forEach(go); })(st);
console.log('att encontrado:', !!att, '| misma referencia en el walk del arbol de 0:', same);
const c = att ? C.cards[att.cardId] : null;
console.log('card del att:', c && c.name, '| effect.kind:', c && c.effect && c.effect.kind);
const det = E.previewStrength();
console.log('cthulhu=' + det.cthulhu);
