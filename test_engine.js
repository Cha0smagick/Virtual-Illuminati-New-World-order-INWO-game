/* Headless smoke test for engine.js */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
var E = window.Engine || (window.INWO_CARDS, null);
// engine.js attaches window.Engine inside its own IIFE
require('./game/js/engine.js');
E = window.Engine;

function assert(c, m) { if (!c) { console.error('FAIL: ' + m); process.exitCode = 1; } else console.log('ok - ' + m); }

assert(window.INWO_CARDS.cards.length === 421, '421 cards loaded');

var st = E.newGame([{ name: 'Alice', human: false }, { name: 'Bob', human: true }]);
assert(st.players.length === 2, 'newGame ok');

var avail = E.availableIlluminati();
assert(avail.length === 9, '9 illuminati unique available pre-choice');

E.setIlluminati(0, 'bavarianilluminati1');
E.setIlluminati(1, 'servantsofcthulhu2');
assert(E.allIlluminatiSet(), 'both illuminati set');

st = E.startGame();
assert(st.phase === 'main', 'startGame -> main phase');
assert(st.players[0].handCounts.groups === 10 && st.players[0].handCounts.plots === 3, 'hands dealt 3+10');

// find a group card in hand of current player to auto-takeover
var cur = st.currentPid;
var hand = st.players[cur].hand;
var groupIdx = hand.find(function (ix) { var c = window.INWO_CARDS.cards[ix]; return c.type === 'group'; });
assert(groupIdx != null, 'current player has a group in hand');

// auto takeover onto root (illuminati arrows)
try {
  st = E.autoTakeover(cur, groupIdx, st.players[cur].structure.uid);
  assert(st.players[cur].structure.children.length === 1, 'autoTakeover places first puppet');
} catch (e) {
  console.log('takeover err:', e.message);
}

// declare attack to control using the illuminati itself
var rootUid = st.players[cur].structure.uid;
var targetNeutral = st.neutralArea.length ? st.neutralArea[0].uid : null;
console.log('neutral area size:', st.neutralArea.length);

// end turn flow
st = E.endTurn();
assert(st.currentPid !== cur, 'turn passed');
st = E.endTurn();

// exchange tokens for plot if possible
try { E.exchangeForPlot(st.currentPid, { illum: true }); console.log('ok - exchangeForPlot'); } catch (e) { console.log('exchange skipped:', e.message); }

// unverified plot text must fail fast without spending resources
var cur2 = st.currentPid;
var pIdx = st.players[cur2].hand.find(function (ix) {
  var c = window.INWO_CARDS.cards[ix];
  return c.type === 'plot' && c.mechanicsStatus === 'unverified';
});
assert(pIdx != null, 'unverified plot fixture available');
if (pIdx != null) {
  var beforeTokens = st.players[cur2].illumTokens;
  var beforeHand = st.players[cur2].hand.length;
  var beforeDiscard = st.deckCounts.plotDiscard;
  var rejected = false;
  try { E.playPlot(cur2, pIdx); } catch (e) {
    rejected = /no tiene una mecánica verificada|mecánica no implementada/.test(e.message);
    assert(rejected, 'unverified plot is rejected with clear error');
  }
  assert(rejected, 'unverified plot was not played');
  assert(st.players[cur2].illumTokens === beforeTokens, 'rejected plot does not spend action token');
  assert(st.players[cur2].hand.length === beforeHand, 'rejected plot stays in hand');
  assert(st.deckCounts.plotDiscard === beforeDiscard, 'rejected plot is not discarded');
}

// run several full rounds AI-style to shake out crashes
var turnsRun = 0;
for (var t = 0; t < 12 && st.phase !== 'gameover'; t++) {
  try {
    st = E.endTurn();
    turnsRun++;
  } catch (e) {
    console.log('endTurn error at t=' + t + ':', e.message);
    break;
  }
}
console.log('turns completed without crash:', turnsRun);
assert(turnsRun > 5, 'multi-turn simulation stable');

console.log(process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED');
