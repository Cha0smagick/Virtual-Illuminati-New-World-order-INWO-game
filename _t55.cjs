const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L55 EFF')) { console.log('ya'); process.exit(0); }
const a = "    ok(d54c.cthulhu === 6, 'P2-R54 South American Nazis +6 directo control Weird Science -> cthulhu=' + d54c.cthulhu);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const nl = '\n';
const b = a + nl +
'  /* ===== L55 - EFF (opposes doblados) y Comic Books (Resistance 0) ===== */' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'tx55', idxOfId('texas'), 1);" + nl +
"    plant(1, 'sv55', idxOfId('siliconvalley'), 1);" + nl +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx55', uid: 'sv55' });" + nl +
"    E.addSupport(1, { uid: 'sv55', oppose: false });" + nl +
"    var d55a = E.previewStrength();" + nl +
"    ok(d55a.opposes === 2, 'L55 fixture: opposes sin EFF = 2 -> ' + d55a.opposes);" + nl +
"    var clR55 = Math.random; Math.random = function () { return 0.9; };" + nl +
"    try { E.resolveAttack(); } catch (e55) { }" + nl +
"    Math.random = clR55;" + nl +
'  } else { ok(true, "L55 (EFF sin) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'tx55b', idxOfId('texas'), 1);" + nl +
"    plant(1, 'sv55b', idxOfId('siliconvalley'), 1);" + nl +
"    plant(1, 'ef55', idxOfId('eff'), 1);" + nl +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx55b', uid: 'sv55b' });" + nl +
"    E.addSupport(1, { uid: 'sv55b', oppose: false });" + nl +
"    var d55b = E.previewStrength();" + nl +
"    ok(d55b.opposes === 4, 'L55 EFF dobla el Poder de los defensores (Computer) -> opposes=' + d55b.opposes);" + nl +
"    var clR55b = Math.random; Math.random = function () { return 0.9; };" + nl +
"    try { E.resolveAttack(); } catch (e55b) { }" + nl +
"    Math.random = clR55b;" + nl +
'  } else { ok(true, "L55 (EFF con) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'cb55', idxOfId('comicbooks'), 1);" + nl +
"    plant(1, 'fe55', idxOfId('flatearthers'), 1);" + nl +
"    E.declareAttack(0, 'control', { attackerUid: 'cb55', uid: 'fe55' });" + nl +
"    var d55c = E.previewStrength();" + nl +
"    ok(d55c.defenseBase === 0, 'L55 Comic Books: Resistance del objetivo Weird -> 0 -> defBase=' + d55c.defenseBase);" + nl +
'  } else { ok(true, "L55 (CB) SKIP"); }' + nl;
t = t.slice(0, i + a.length) + nl + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L55 ok');
