// Headless AI-vs-AI smoke test for INWO engine
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
const E = window.Engine;
require('./game/js/ai.js');

const MAX_TURNS = parseInt(process.argv[2] || '40', 10);
try {
  E.newGame([{name:'AI-1',human:false},{name:'AI-2',human:false}]);
  const avail = E.availableIlluminati();
  E.setIlluminati(0, avail[0].id);
  const base0 = String(avail[0].id).replace(/\d+$/, '');
  const avail2 = E.availableIlluminati().filter(c => String(c.id).replace(/\d+$/, '') !== base0);
  E.setIlluminati(1, avail2[0].id);
  E.startGame();
  console.log('startGame OK. currentPid=', E.getState().currentPid, 'phase=', E.getState().phase);

  let turns = 0;
  while (turns < MAX_TURNS) {
    const st = E.getState();
    if (st.phase === 'gameover') { console.log('GAMEOVER at turn', turns, 'winner=', st.winner); break; }
    if (st.phase !== 'main') throw new Error('AI smoke reached an unexpected phase: ' + st.phase);
    const pid = st.currentPid;
    window.AI.takeTurn(E, pid);
    const afterAi = E.getState();
    if (afterAi.attack && !afterAi.attack.resolved) {
      throw new Error('AI left an unresolved attack in an AI-vs-AI game');
    }
    if (afterAi.phase !== 'gameover') E.endTurn();
    turns++;
    if (turns % 10 === 0) {
      const s2 = E.getState();
      console.log(`turn ${turns}: p0 groups=${countGroups(s2.players[0])} hand=${s2.players[0].hand.length} | p1 groups=${countGroups(s2.players[1])} hand=${s2.players[1].hand.length}`);
    }
  }
  const fin = E.getState();
  console.log('DONE turns=', turns, 'phase=', fin.phase);
  console.log('p0:', JSON.stringify({illum:fin.players[0].illumId, tokens:fin.players[0].illumTokens, groups:countGroups(fin.players[0]), res:fin.players[0].resources.length}));
  console.log('p1:', JSON.stringify({illum:fin.players[1].illumId, tokens:fin.players[1].illumTokens, groups:countGroups(fin.players[1]), res:fin.players[1].resources.length}));
  console.log('log tail:', fin.log.slice(-5));
} catch (e) {
  console.error('FAIL:', e && e.stack || e);
  process.exitCode = 1;
}

function countGroups(p) {
  let n = 0;
  (function walk(nd){ if (nd.cardId != null) n++; (nd.children||[]).forEach(walk); })(p.structure);
  return n;
}
