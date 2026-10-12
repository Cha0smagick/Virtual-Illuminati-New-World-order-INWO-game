const fs = require('fs');

function show(file, from, to) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log('\n--- ' + file + ' lines ' + (from + 1) + '-' + (to + 1) + ' ---');
  for (let j = from; j <= Math.min(to, lines.length - 1); j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
}
function grab(file, a, b, c) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const hits = [];
  lines.forEach((l, i) => { if (l.indexOf(a) >= 0) hits.push(i); });
  console.log('\n--- ' + file + ' [' + a + '] x' + hits.length + ' ---');
  for (const i of hits.slice(0, 1)) {
    for (let j = Math.max(0, i - b); j <= Math.min(lines.length - 1, i + c); j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
  }
}

show('game/js/app.js', 259, 306);
grab('game/js/app.js', 'function afterAdvance', 0, 16);
show('game/js/engine.js', 1351, 1385);
grab('game/js/engine.js', 'exposedPlots.indexOf(handIdx)<0', 4, 18);

// RUNTIME smoke
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
var C = window.INWO_CARDS, E = window.Engine;
E.newGame([{ name: 'Tu', human: true }, { name: 'R1' }, { name: 'R2' }]);
E.setIlluminati(0, 'ufos1');
E.setIlluminati(1, 'adepts1');
E.setIlluminati(2, 'bavarianilluminati1');
E.startGame();
var st = E.getState();
var raw0 = E._raw();
console.log('\n########## RUNTIME ##########');
console.log('phase=' + st.phase + ' currentPid=' + st.currentPid + ' turn=' + raw0.turn);
console.log('flags0=' + JSON.stringify(raw0.players[0].flags));
console.log('structure0=' + JSON.stringify(raw0.players[0].structure).slice(0, 420));
console.log('hand0 len=' + raw0.players[0].hand.length);
var magicIdx = -1, magicCount = 0;
C.cards.forEach(function (c, i) {
  if (c.type === 'group' && c.alignments && c.alignments.indexOf('magic') >= 0) { magicCount++; if (magicIdx < 0) magicIdx = i; }
});
console.log('magic groups: ' + magicCount + ' first=' + (magicIdx >= 0 ? magicIdx + ' ' + C.cards[magicIdx].name + ' aligns=' + JSON.stringify(C.cards[magicIdx].alignments) : 'none'));
var unlucky = -1;
C.cards.forEach(function (c, i) { if (c.id === 'unlucky13') unlucky = i; });
console.log('unlucky13 idx=' + unlucky + ' type=' + (unlucky >= 0 ? C.cards[unlucky].type : '?'));
// smoke: plantGroup + pull2
raw0.players[0].structure.children.push({ uid: 'nL8cMG', cardId: magicIdx, children: [], tokens: 1 });
var di = raw0.plotDeck.indexOf(unlucky);
console.log('unlucky in plotDeck at ' + di);
raw0.plotDeck.splice(di, 1);
raw0.players[0].hand.push(unlucky);
console.log('smoke ok: magic node planted, unlucky pulled into hand');
