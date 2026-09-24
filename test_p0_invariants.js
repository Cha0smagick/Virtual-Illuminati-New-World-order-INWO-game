'use strict';

/* Focused regression tests for the first P0 safety batch. */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');

const E = window.Engine;
const C = window.INWO_CARDS;
let failures = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(fn, message) {
  let threw = false;
  try { fn(); } catch (_) { threw = true; }
  assert(threw, message);
}

function run(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL - ' + name + ': ' + (error && error.stack ? error.stack : error));
  }
}

function start(goalCount) {
  E.newGame([
    { name: 'Alice', human: false, goalCount: goalCount || 100 },
    { name: 'Bob', human: true, goalCount: goalCount || 100 }
  ]);
  E.setIlluminati(0, 'bavarianilluminati1');
  E.setIlluminati(1, 'servantsofcthulhu2');
  E.startGame();
  return E.getState();
}

function groupIndex(state, pid) {
  return state.players[pid].hand.find(function (idx) {
    return C.cards[idx] && C.cards[idx].type === 'group';
  });
}

function nodesUnder(node, result) {
  result = result || [];
  (node.children || []).forEach(function (child) {
    result.push(child);
    nodesUnder(child, result);
  });
  return result;
}

function ownGroups(state, pid) {
  return nodesUnder(state.players[pid].structure).filter(function (node) {
    return node.cardId !== null;
  });
}

function placeOpeningGroup(state, pid) {
  const idx = groupIndex(state, pid);
  assert(idx >= 0, 'fixture requires a Group in hand for ' + pid);
  E.autoTakeover(pid, idx, state.players[pid].structure.uid);
}

function twoReadyPlayers() {
  let state = start(100);
  const first = state.currentPid;
  placeOpeningGroup(state, first);
  E.endTurn();
  state = E.getState();
  const second = state.currentPid;
  placeOpeningGroup(state, second);
  E.endTurn();
  state = E.getState();
  return { state: state, first: first, second: second };
}

run('first turn is numbered one and completion is deferred', function () {
  const state = start(100);
  const pid = state.currentPid;
  assert(state.turn === 1, 'first active turn must be turn 1');
  assert(state.players[pid].turnsCompleted === 0, 'turn completion must not increment at turn start');
  E.endTurn();
  const next = E.getState();
  assert(next.currentPid !== pid, 'endTurn must advance to the next player');
  assert(next.turn === 2, 'second active turn must be turn 2');
  assert(next.players[pid].turnsCompleted === 1, 'completed player must increment once at endTurn');
  assert(next.phase === 'main', 'next turn must be in main phase');
});

run('beginTurn is idempotent for the active player and rejects stale callers', function () {
  const state = start(100);
  const active = state.currentPid;
  const turn = state.turn;
  E.beginTurn(active);
  const same = E.getState();
  assert(same.turn === turn && same.currentPid === active, 'same-player beginTurn must be a no-op');
  E.endTurn();
  expectThrow(function () { E.beginTurn(active); }, 'stale player must not begin a new turn');
});

run('victory is blocked through the first complete round', function () {
  let state = start(1);
  E._raw().config.goalCount = 1;
  const first = state.currentPid;
  E.endTurn();
  state = E.getState();
  assert(state.phase === 'main', 'first turn completion must not end the game');
  E.endTurn();
  state = E.getState();
  assert(state.phase === 'main', 'first full round must not end the game');
  E.endTurn();
  state = E.getState();
  assert(state.phase === 'gameover', 'victory is allowed after the first player second turn');
  const logCount = state.log.length;
  E.checkVictory();
  assert(E.getState().log.length === logCount, 'repeat victory check must not duplicate logs');
  assert(first !== -1, 'fixture current player must exist');
});

run('empty deck does not consume draw privileges or extra-draw payment', function () {
  const state = start(100);
  const pid = state.currentPid;
  const raw = E._raw();
  raw.plotDeck = [];
  raw.plotDiscard = [];
  raw.groupDeck = [];
  raw.groupDiscard = [];
  raw.players[pid].illumTokens = 1;
  const beforeTokens = raw.players[pid].illumTokens;
  expectThrow(function () { E.drawPlot(pid); }, 'empty plot deck must reject draw');
  assert(raw.players[pid].flags.plotDrawn === false, 'failed plot draw must not set plotDrawn');
  expectThrow(function () { E.drawGroup(pid); }, 'empty group deck must reject draw');
  assert(raw.players[pid].flags.groupDrawn === false, 'failed group draw must not set groupDrawn');
  expectThrow(function () { E.extraGroupDraw(pid); }, 'empty group deck must reject extra draw');
  assert(raw.players[pid].illumTokens === beforeTokens, 'failed extra draw must not charge Illuminati token');
  expectThrow(function () { E.exchangeForPlot(pid, { illum: true }); }, 'empty plot exchange must reject');
  assert(raw.players[pid].illumTokens === beforeTokens, 'failed exchange must refund Illuminati token');
});

run('attack validates target before spending token', function () {
  const setup = twoReadyPlayers();
  const state = setup.state;
  const pid = state.currentPid;
  const attacker = ownGroups(state, pid)[0];
  const target = ownGroups(state, setup.second === pid ? setup.first : setup.second)[0];
  assert(attacker && target, 'fixture requires one group per player');
  const raw = E._raw();
  const attackerNode = raw.players[pid].structure.children.find(function (node) { return node.uid === attacker.uid; });
  expectThrow(function () {
    E.declareAttack(pid, 'destroy', { uid: 'missing-node', attackerUid: attacker.uid });
  }, 'missing target must reject attack');
  assert(attackerNode.tokens === 1, 'invalid target must not spend attacker token');
  E.declareAttack(pid, 'destroy', { uid: target.uid, attackerUid: attacker.uid });
  assert(E.getState().attack, 'valid target must create attack');
  assert(attackerNode.tokens === 0, 'valid attack must spend exactly one attacker token');
});

run('moveGroup only moves owned groups and prevents cycles', function () {
  const setup = twoReadyPlayers();
  const state = setup.state;
  const pid = state.currentPid;
  const opponent = setup.second === pid ? setup.first : setup.second;
  const rival = ownGroups(state, opponent)[0];
  const extra = groupIndex(state, pid);
  assert(rival && extra >= 0, 'fixture requires rival and extra own group');
  E.autoTakeover(pid, extra, state.players[pid].structure.uid);
  const ownNodes = ownGroups(E.getState(), pid);
  const mover = ownNodes[0];
  const host = ownNodes[1];
  expectThrow(function () { E.moveGroup(pid, rival.uid, host.uid, 'illum'); }, 'a player cannot move a rival group');
  E.moveGroup(pid, mover.uid, host.uid, mover.uid);
  const after = E.getState();
  const movedHost = ownGroups(after, pid).find(function (node) { return node.uid === host.uid; });
  assert(movedHost && nodesUnder(movedHost).some(function (node) { return node.uid === mover.uid; }), 'owned group must move beneath its new host');
  expectThrow(function () { E.moveGroup(pid, mover.uid, mover.uid, mover.uid); }, 'a group cannot be moved inside itself');
});

run('hand-target strength is finite and defensive boosts reduce total', function () {
  const setup = twoReadyPlayers();
  let state = setup.state;
  const pid = state.currentPid;
  const attacker = ownGroups(state, pid)[0];
  assert(attacker, 'fixture requires attacker');
  const extraGroup = groupIndex(state, pid);
  assert(extraGroup >= 0, 'fixture requires extra group for arrow');
  E.autoTakeover(pid, extraGroup, attacker.uid);
  const opponent = setup.second === pid ? setup.first : setup.second;
  const handGroup = groupIndex(E.getState(), opponent);
  assert(handGroup >= 0, 'fixture requires opponent hand group');
  E.declareAttack(pid, 'control', { attackerUid: attacker.uid, handIdx: handGroup });
  const before = E.previewStrength();
  assert(Number.isFinite(before.total), 'hand-target preview must be finite');
  E._raw().attack.defBoosts = [{ name: 'Regression defense', v: 10 }];
  const after = E.previewStrength();
  assert(Number.isFinite(after.total), 'defensive-boost total must be finite');
  assert(after.total === before.total - 10, 'defensive boost must reduce attack total by ten');
});

run('generic plot cannot be used as universal attack boost', function () {
  const setup = twoReadyPlayers();
  const state = setup.state;
  const pid = state.currentPid;
  const attacker = ownGroups(state, pid)[0];
  const opponent = setup.second === pid ? setup.first : setup.second;
  const target = ownGroups(state, opponent)[0];
  const plot = state.players[pid].hand.find(function (idx) { return C.cards[idx] && C.cards[idx].type === 'plot'; });
  assert(plot !== undefined, 'fixture requires a Plot');
  E.declareAttack(pid, 'control', { uid: target.uid, attackerUid: attacker.uid });
  const raw = E._raw();
  const boostsBefore = raw.attack.boosts.length + raw.attack.defBoosts.length;
  expectThrow(function () { E.addBoost(pid, plot, false); }, 'generic plot must not become universal boost');
  assert(raw.attack.boosts.length + raw.attack.defBoosts.length === boostsBefore, 'rejected boost must not alter attack');
});

run('exposed plots count toward the five-plot hand limit', function () {
  let state = start(100);
  const pid = state.currentPid;
  const raw = E._raw();
  raw.players[pid].exposedPlots = [0, 1, 2, 3, 4, 5];
  E.endTurn();
  state = E.getState();
  const remaining = state.players[pid].hand.filter(function (idx) { return C.cards[idx] && C.cards[idx].type === 'plot'; }).length;
  assert(remaining + state.players[pid].exposedPlots.length <= 5, 'hand plus exposed plots must be capped at five');
});

run('ending a turn with an unresolved attack is rejected', function () {
  const setup = twoReadyPlayers();
  const state = setup.state;
  const pid = state.currentPid;
  const attacker = ownGroups(state, pid)[0];
  const opponent = setup.second === pid ? setup.first : setup.second;
  const target = ownGroups(state, opponent)[0];
  E.declareAttack(pid, 'destroy', { uid: target.uid, attackerUid: attacker.uid });
  expectThrow(function () { E.endTurn(); }, 'unresolved attack must block endTurn');
});

run('unverified resource play is rejected before mutation', function () {
  const state = start(100);
  const pid = state.currentPid;
  const resourceIndex = C.cards.findIndex(function (card) {
    return card.type === 'resource' && card.mechanicsStatus === 'unverified';
  });
  assert(resourceIndex >= 0, 'unverified resource fixture exists');
  const raw = E._raw();
  const player = raw.players[pid];
  player.hand.push(resourceIndex);
  player.illumTokens = 1;
  player.usedResourceThisTurn = false;
  const before = {
    tokens: player.illumTokens,
    hand: player.hand.length,
    used: player.usedResourceThisTurn,
    resources: player.resources.length
  };
  expectThrow(function () { E.playResource(pid, resourceIndex); }, 'no tiene una mecánica verificada');
  assert(player.illumTokens === before.tokens, 'resource rejection preserves action token');
  assert(player.usedResourceThisTurn === before.used, 'resource rejection preserves used flag');
  assert(player.hand.length === before.hand, 'resource rejection preserves hand');
  assert(player.resources.length === before.resources, 'resource rejection preserves resources');
});
if (failures) {
  console.error('P0 REGRESSION FAILURES: ' + failures);
  process.exitCode = 1;
} else {
  console.log('P0 REGRESSION TESTS PASSED');
}
