/* L74 - Moonbase: inmunidad a Disasters (excepto Earthquake/Meteor) y +4 vs Space. */
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

console.log('L74 - Moonbase');
fresh(); turn(0);
plant(0, 'mb74', idxOf('moonbase'), 1);
plant(1, 'sp74', idxOf('nasa'), 1);
plant(0, 'at74', idxOf('texas'), 1);
E.declareAttack(0, 'control', { attackerUid: 'at74', uid: 'sp74' });
const det = E.previewStrength();
ok(det.cthulhu === 4, 'Moonbase da +4 al controlar un grupo Space: ' + det.cthulhu);

console.log('L74 - inmunidad a Disaster');
fresh(); turn(0);
plant(1, 'mb74b', idxOf('moonbase'), 1);
const hur = idxOf('epidemic');
E._raw().players[0].hand.push(hur);
let out = null, err = '';
try { out = E.playPlot(0, hur, 'mb74b', {}); } catch (e) { err = e.message; }
ok(err === '', 'el Disaster no lanza: ' + err);
const still = (function f(n){ if(n.uid==='mb74b')return true; for(const ch of (n.children||[])) if(f(ch)) return true; return false; })(E._raw().players[1].structure);
ok(still, 'Moonbase sobrevive al Epidemic (inmune)');

if (fails) { console.error('\nL74 FAILURES: ' + fails); process.exit(1); }
console.log('\nL74 MOONBASE PASSED');
