global.GDB_DBG = true;
global.window = {};
['images.js', 'cards.js', 'engine.js'].forEach(n => require('./game/js/' + n));
const E = global.window.Engine, C = global.window.INWO_CARDS;
function idx(id) { return C.cards.findIndex(c => c.id === id); }
E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
const av = E.availableIlluminati();
E.setIlluminati(0, av[0].id);
E.setIlluminati(1, av[1].id);
E.startGame();
for (let g = 0; g < 40; g++) {
  const s = E.getState();
  if (s.currentPid === 1 && s.players[0].turnsCompleted >= 1 && s.players[1].turnsCompleted >= 1) break;
  try { E.endTurn(); } catch (e) { const r = E._raw(); if (r.pendingEvent) E.resolvePendingEvent(); else if (r.pendingRoll) E.resolvePendingRoll(); else break; }
}
const r0 = E._raw().players[0].structure;
r0.children.push({ uid: 'ws48', cardId: idx('wallstreet'), children: [{ uid: 'pu48', cardId: idx('batf'), children: [], tokens: 1 }], tokens: 1 });
E._raw().players[1].structure.children.push({ uid: 'at48', cardId: idx('dentists'), children: [], tokens: 1 });
E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'pu48' });
const det = E.previewStrength();
console.log('defenseBonus=', det.defenseBonus, '| notes=', JSON.stringify(det.notes));
