/* diag_attack.cjs — declara los ataques que elegiría la IA y vuelca previewStrength() */
const path = require('path');
global.window = {};
const R = p => require(path.join('D:/Illuminati NWO/game/js', p));
R('images.js'); R('cards.js'); R('cardtexts_data.js'); R('statsfix.js'); R('texts.js');
R('engine.js'); R('ai.js');
const C = global.window.INWO_CARDS, E = global.window.Engine;
E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
const av = E.availableIlluminati();
E.setIlluminati(0, av[0].id); E.setIlluminati(1, av[1].id);
E.startGame();
let dumped = 0;
for (let t = 0; t < 30 && dumped < 5; t++) {
  const st = E.getState(); if (st.phase === 'gameover') break;
  const pid = st.currentPid;
  try { global.window.AI.takeTurn(E, pid); } catch (e) { console.log('AI ERR', e.message); }
  let s2 = E.getState();
  if (s2.attack && !s2.attack.resolved) {
    const d = E.previewStrength();
    function nm(uid) { let r = null; s2.players.forEach(p => (function w(n) { if (n.uid === uid) r = n.cardId; else (n.children || []).forEach(w); })(p.structure)); return r ? (C.cards[r] || C.byId[r] || {}).name : (s2.neutralArea.filter(n => n.uid === uid)[0] ? 'NEUTRAL:' + (C.cards[s2.neutralArea.filter(n => n.uid === uid)[0].cardId] || {}).name : '?'); }
    console.log(`--- ATAQUE ${++dumped} (t${t}) ${d.total !== undefined ? '' : ''}`);
    console.log(' atacante:', nm(s2.attack.attackerUid), '· objetivo:', s2.attack.neutralTarget ? nm(s2.attack.neutralTarget) : nm(s2.attack.targetUid), '· tipo:', s2.attack.type);
    console.log(' det:', JSON.stringify({ base: d.base, leaderMod: d.leaderMod, defenseBase: d.defenseBase, defenseBonus: d.defenseBonus, posBonus: d.posBonus, selfDef: d.selfDef, aids: d.aids, opposes: d.opposes, boosts: d.boosts, total: d.total }));
    console.log(' notes:', (d.notes || []).join(' | '));
  }
  try { E.resolveAttack(); } catch (e) {}
  try { E.endTurn(); } catch (e) {}
}
