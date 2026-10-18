global.window = {};
['images.js', 'cards.js', 'engine.js'].forEach(n => require('./game/js/' + n));
const E = global.window.Engine, C = global.window.INWO_CARDS;
function idx(id) { return C.cards.findIndex(c => c.id === id); }
E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
E.setIlluminati(0, 'bavarianilluminati1');
E.setIlluminati(1, 'servantsofcthulhu1');
E.startGame();
for (let g = 0; g < 8; g++) {
  const s = E.getState();
  if (s.currentPid === 0 && s.players[0].turnsCompleted >= 1 && s.players[1].turnsCompleted >= 1) break;
  try { E.endTurn(); } catch (e) { const r = E._raw(); if (r.pendingEvent) E.resolvePendingEvent(); else if (r.pendingRoll) E.resolvePendingRoll(); }
}
const r0 = E._raw().players[0].structure;
r0.children.push({ uid: 'am43', cardId: idx('ama'), children: [], tokens: 1 });
const r1 = E._raw().players[1].structure;
r1.children.push({ uid: 'bm43', cardId: idx('bigmedia'), children: [], tokens: 1 });
r1.children.push({ uid: 'tb43', cardId: idx('tabloids'), children: [], tokens: 1 });
E.declareAttack(0, 'control', { attackerUid: 'am43', uid: 'tb43' });
console.log('attack?', !!E._raw().attack, '| type=', E._raw().attack && E._raw().attack.type);
let err = '';
try { E.addSupport(1, { uid: 'bm43', oppose: true }); } catch (e) { err = e.message; }
console.log('err=', err, '| opposes=', JSON.stringify(E._raw().attack && E._raw().attack.opposes));
