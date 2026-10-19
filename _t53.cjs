const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L53 Ninjas')) { console.log('ya'); process.exit(0); }
const a = "    ok(d52c.leaderMod === 0, 'L52 Pollsters anula la penalizacion de alineacion -> leaderMod=' + d52c.leaderMod);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const nl = '\n';
const b = a + nl +
'  /* ===== L53 - Ninjas / Underground Newspapers / Lawyers ===== */' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'nj53', idxOfId('ninjas'), 1);" + nl +
"    plant(0, 'tx53', idxOfId('texas'), 1);" + nl +
"    plant(1, 'tg53', idxOfId('fbi'), 1);" + nl +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx53', uid: 'tg53' });" + nl +
"    var d53a = E.previewStrength();" + nl +
"    ok(d53a.cthulhu === 2, 'L53 Ninjas +2 (owner) destroy -> cthulhu=' + d53a.cthulhu);" + nl +
'    clear24(); E.endTurn();' + nl +
'  } else { ok(true, "L53 (Ninjas atk) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(1, 'nj53b', idxOfId('ninjas'), 2);" + nl +
"    plant(0, 'tx53b', idxOfId('texas'), 1);" + nl +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx53b', uid: 'nj53b' });" + nl +
"    var d53b = E.previewStrength();" + nl +
"    ok(d53b.defenseBonus === 10, 'L53 Ninjas -10 al destruirlas -> defBonus=' + d53b.defenseBonus);" + nl +
"    var njT53 = null; (function w53(n) { if (njT53) return; if (n.uid === 'nj53b') njT53 = n; (n.children || []).forEach(w53); })(E._raw().players[1].structure);" + nl +
"    var realR53 = Math.random; Math.random = function () { return 0.99; };" + nl +
"    try { E.resolveAttack(); } catch (e53) { }" + nl +
"    Math.random = realR53;" + nl +
"    ok(njT53 && njT53.tokens === 2, 'L53 Ninjas recupera su ficha tras el intento fallido -> tokens=' + (njT53 && njT53.tokens));" + nl +
'  } else { ok(true, "L53 (Ninjas def) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'un53', idxOfId('undergroundnewspapers'), 1);" + nl +
"    plant(0, 'tx53c', idxOfId('texas'), 1);" + nl +
"    plant(1, 'fn53', idxOfId('fbi'), 1);" + nl +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx53c', uid: 'fn53' });" + nl +
"    E.addSupport(0, { uid: 'un53', oppose: false });" + nl +
"    var hb53 = E._raw().players[0].hand.length;" + nl +
"    var realR53b = Math.random; Math.random = function () { return 0.01; };" + nl +
"    try { E.resolveAttack(); } catch (e53x) { }" + nl +
"    Math.random = realR53b;" + nl +
"    ok(E._raw().players[0].hand.length === hb53 + 1, 'L53 Underground Newspapers roba una Plot al ayudar a destruir Gov');" + nl +
'  } else { ok(true, "L53 (UN) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(1) != null) {' + nl +
"    plant(0, 'lw53', idxOfId('lawyers'), 1);" + nl +
"    plant(0, 'ag53', idxOfId('algore'), 1);" + nl +
"    plant(1, 'ci53', idxOfId('cia'), 1);" + nl +
"    E.declareAttack(1, 'control', { attackerUid: 'ci53', uid: 'ag53' });" + nl +
"    var d53c = E.previewStrength();" + nl +
"    ok(d53c.defenseBonus === 4, 'L53 Lawyers +4 defensa contra ataque Gov -> defBonus=' + d53c.defenseBonus);" + nl +
'  } else { ok(true, "L53 (Lawyers) SKIP"); }' + nl;
t = t.slice(0, i + a.length) + nl + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L53 ok');
