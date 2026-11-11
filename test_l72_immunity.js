/* L72 - Stonehenge: inmunidad a ataques de grupos Magic. */
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

console.log('L72 - Stonehenge');
fresh(); turn(1);
plant(0, 'st72', idxOf('stonehenge'), 1);
plant(0, 'tg72', idxOf('bigmedia'), 1);
plant(1, 'mg72', idxOf('druids'), 1);
const msg = (() => { try { E.declareAttack(1, 'control', { attackerUid: 'mg72', uid: 'tg72' }); return ''; } catch (e) { return e.message; } })();
ok(/inmune/i.test(msg), 'un grupo Magic no puede atacar la estructura con Stonehenge: ' + msg);

fresh(); turn(1);
plant(0, 'st72b', idxOf('stonehenge'), 1);
plant(0, 'tg72b', idxOf('bigmedia'), 1);
plant(1, 'mg72b', idxOf('texas'), 1);
const msg2 = (() => { try { E.declareAttack(1, 'control', { attackerUid: 'mg72b', uid: 'tg72b' }); return ''; } catch (e) { return e.message; } })();
ok(msg2 === '', 'un atacante NO Magic si puede atacar: ' + msg2);

if (fails) { console.error('\nL72 FAILURES: ' + fails); process.exit(1); }
console.log('\nL72 STONEHENGE PASSED');