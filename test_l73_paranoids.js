/* L73 - Paranoids: +2 defensa de estructura y no destruible sin Poder. */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
const E = window.Engine, C = window.INWO_CARDS;
let fails = 0;
function ok(c, m) { if (c) console.log('  \u2714 ' + m); else { fails++; console.log('  \u2718 FALLO: ' + m); } }
function idxOf(id) { for (let i = 0; i < C.cards.length; i++) if (C.cards[i].id === id) return i; return -1; }
function fresh() { E.newGame([{ name: 'A', human: true }, { name: 'B', human: false }]); E.setIlluminati(0, 'bavarianilluminati1'); E.setIlluminati(1, 'servantsofcthulhu1'); E.startGame(); }
function plant(pid, uid, cardIx, tokens) { const n = { uid, cardId: cardIx, tokens, children: [] }; E._raw().players[pid].structure.children.push(n); return n; }
function turn(pid) { const R = E._raw(); R.currentPid = pid; R.phase = 'main'; if (R.players[pid].illumTokens < 1) R.players[pid].illumTokens = 1; R.players[0].turnsCompleted = 1; R.players[1].turnsCompleted = 1; }

console.log('L73 - Paranoids');
fresh(); turn(1);
plant(0, 'pn73', idxOf('paranoids'), 0);
plant(0, 'tg73', idxOf('bigmedia'), 1);
plant(1, 'at73', idxOf('texas'), 1);
E.declareAttack(1, 'control', { attackerUid: 'at73', uid: 'tg73' });
const det = E.previewStrength();
ok(det.defenseBonus === 2, 'la estructura recibe +2 de defensa: ' + det.defenseBonus);




console.log('L73 - no destruible sin Poder');
fresh(); turn(1);
plant(0, 'pn73b', idxOf('paranoids'), 0);
plant(1, 'at73b', idxOf('texas'), 1);
const atk = E._raw().players[1].structure.children[0];
atk.powerOverride = 60;
E.declareAttack(1, 'destroy', { attackerUid: 'at73b', uid: 'pn73b' });
const rr = Math.random; Math.random = function () { return 0.01; };
try { E.resolveAttack(); } catch (e) { }
Math.random = rr;
for (let w = 0; w < 6; w++) {
  const R = E._raw();
  if (R.pendingRoll) { try { E.resolvePendingRoll(); } catch (e) { } continue; }
  if (R.pendingEvent) { try { E.resolvePendingEvent(); } catch (e) { } continue; }
  break;
}
const stillThere = (function f(n){ if(n.uid==='pn73b')return true; for(const ch of (n.children||[])) if(f(ch)) return true; return false; })(E._raw().players[0].structure);
ok(stillThere, 'Paranoids con Poder 0 sobrevive a un ataque a destruir');
if (fails) { console.error('\nL73 FAILURES: ' + fails); process.exit(1); }
console.log('\nL73 PARANOIDS PASSED');
