/* L71 - Dan Quayle / Elvis / Dentists: cancelar una accion ya tomada. */
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
function turn(pid) { const R = E._raw(); R.currentPid = pid; R.phase = 'main'; if (R.players[pid].illumTokens < 1) R.players[pid].illumTokens = 1; }

console.log('L71 - cartas y acciones');
ok(idxOf('danquayle') >= 0, 'Dan Quayle esta en el catalogo');
ok(idxOf('elvis') >= 0, 'Elvis esta en el catalogo');
ok(idxOf('dentists') >= 0, 'Dentists esta en el catalogo');
ok(C.cards[idxOf('danquayle')].effect.act === 'cancel_media_action', 'Dan Quayle cancela Media');
ok(C.cards[idxOf('elvis')].effect.act === 'cancel_media_action', 'Elvis cancela Media');
ok(C.cards[idxOf('dentists')].effect.act === 'cancel_personality_action', 'Dentists cancela Personality');

console.log('L71 - cancelar la accion de un Media');
fresh(); turn(0);
plant(0, 'g71', idxOf('danquayle'), 1);
plant(1, 'm71', idxOf('bigmedia'), 0);
plant(1, 'm71b', idxOf('bigmedia'), 2);
E._raw().players[1].structure.children[0].tokensAtTurnStart = 1;
const before = E._raw().players[0].structure.children[0].tokens;
const out = E.useGroupAction(0, 'g71', { targetUid: 'm71' });
ok(out && out.cancelled === 'm71', 'devuelve la ficha al Media objetivo');
ok(E._raw().players[1].structure.children[0].tokens === 1, 'la ficha del Media vuelve a 1');
ok(E._raw().players[0].structure.children[0].tokens === before - 1, 'Dan Quayle gasta su ficha');

console.log('L71 - rechazos');
fresh(); turn(0);
plant(0, 'd71', idxOf('dentists'), 1);
plant(1, 'm72', idxOf('bigmedia'), 2);
const m = (() => { try { E.useGroupAction(0, 'd71', { targetUid: 'm72' }); return ''; } catch (e) { return e.message; } })();
ok(/Personality/.test(m), 'Dentists rechaza un grupo que no es Personality: ' + m);
ok(E._raw().players[1].structure.children[0].tokens === 2, 'el rechazo no toca la ficha del objetivo');

console.log('L71 - MI-5 vuelve a ocultar tus Plots expuestas');
fresh(); turn(0);
plant(0, 'mi71', idxOf('mi5'), 1);
E._raw().players[0].exposedPlots = [idxOf('redscare'), idxOf('taxbreaks')];
const beforeExp = E._raw().players[0].exposedPlots.length;
E.useGroupAction(0, 'mi71', {});
ok(E._raw().players[0].exposedPlots.length === 0, 'MI-5 oculta todas las Plots expuestas (' + beforeExp + ' -> 0)');
ok(E._raw().players[0].structure.children[0].tokens === 0, 'MI-5 gasta su ficha');

console.log('L71 - Supreme Court cancela un Government');
fresh(); turn(0);
plant(0, 'sc71', idxOf('supremecourt'), 1);
plant(1, 'gov71', idxOf('algore'), 0);
E._raw().players[1].structure.children[0].tokensAtTurnStart = 1;
const scOut = E.useGroupAction(0, 'sc71', { targetUid: 'gov71' });
ok(scOut && scOut.cancelled === 'gov71', 'Supreme Court devuelve la ficha al Government');
ok(E._raw().players[1].structure.children[0].tokens === 1, 'la ficha del Government vuelve a 1');
ok(E._raw().players[0].structure.children[0].tokens === 0, 'Supreme Court gasta su ficha');

if (fails) { console.error('\nL71 FAILURES: ' + fails); process.exit(1); }
console.log('\nL71 CANCEL ACTIONS PASSED');

