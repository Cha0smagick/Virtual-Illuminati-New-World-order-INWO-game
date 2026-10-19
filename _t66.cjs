const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L66 Imelda')) { console.log('ya'); process.exit(0); }
const a = "    ok(m65b === '', 'L65 sin Punk Rockers el Weird SI puede ayudar -> ' + (m65b || 'ok'));";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const nl = '\n';
const b = a + nl +
'  /* ===== L66 - Imelda Marcos (1d6 contra Gov/Bank) ===== */' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'im66', idxOfId('imeldamarcos'), 1);" + nl +
"    plant(1, 'fb66', idxOfId('fbi'), 1);" + nl +
"    E.declareAttack(0, 'control', { attackerUid: 'im66', uid: 'fb66' });" + nl +
"    var r66 = Math.random; Math.random = function () { return 0.5; };" + nl +
"    var d66 = E.previewStrength();" + nl +
"    Math.random = r66;" + nl +
"    ok(d66.base === 5, 'L66 Imelda 1d6=4 contra Gov -> Poder 5 -> base=' + d66.base);" + nl +
'  } else { ok(true, "L66 (Imelda 5) SKIP\"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'im66b', idxOfId('imeldamarcos'), 1);" + nl +
"    plant(1, 'fb66b', idxOfId('fbi'), 1);" + nl +
"    E.declareAttack(0, 'control', { attackerUid: 'im66b', uid: 'fb66b' });" + nl +
"    var r66b = Math.random; Math.random = function () { return 0.999; };" + nl +
"    try { E.resolveAttack(); } catch (e66) { }" + nl +
"    Math.random = r66b;" + nl +
"    var raw66 = E._raw();" + nl +
"    ok(raw66.groupDiscard.indexOf(idxOfId('imeldamarcos')) >= 0, 'L66 Imelda 1d6=6 -> queda destruida');" + nl +
"    ok(raw66.players[0].destroyedByMe.indexOf(idxOfId('imeldamarcos')) >= 0, 'L66 Imelda destruida cuenta para el objetivo');" + nl +
'    var alive66 = false; (function w66(root) { if (alive66 || !root) return; if (root.cardId === idxOfId(\'imeldamarcos\')) { alive66 = true; return; } (root.children || []).forEach(w66); })(raw66.players[0].structure);' + nl +
"    ok(!alive66, 'L66 Imelda ya no esta en la estructura');" + nl +
'  } else { ok(true, "L66 (Imelda 6) SKIP\"); }' + nl;
t = t.slice(0, i + a.length) + nl + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L66 ok');
