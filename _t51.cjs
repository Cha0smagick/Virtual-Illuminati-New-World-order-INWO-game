const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L51 California')) { console.log('ya'); process.exit(0); }
const a = "    ok(d50e.cthulhu === 10, 'L50 R.S.M. +10 directo contra Japan -> cthulhu=' + d50e.cthulhu);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  /* ===== L51 - masivas con piezas existentes ===== */' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'ca51', idxOfId('california'), 1);" + L +
"    plant(0, 'tb51', idxOfId('tabloids'), 1);" + L +
"    plant(1, 'tg51', idxOfId('batf'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'tb51', uid: 'tg51' });" + L +
"    var d51a = E.previewStrength();" + L +
"    ok(d51a.boosts === 1, 'L51 California +1 Power a sus Media -> boosts=' + d51a.boosts);" + L +
'  } else { ok(true, "L51 (CA) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'cg51', idxOfId('cyclegangs'), 1);" + L +
"    plant(0, 'tx51', idxOfId('texas'), 1);" + L +
"    plant(1, 'tg51b', idxOfId('batf'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx51', uid: 'tg51b' });" + L +
"    var d51b = E.previewStrength();" + L +
"    ok(d51b.cthulhu === 2, 'L51 Cycle Gangs +2 (owner) destroy -> cthulhu=' + d51b.cthulhu);" + L +
'  } else { ok(true, "L51 (CG) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'tp51', idxOfId('telephonepsychics'), 1);" + L +
"    plant(1, 'tb51b', idxOfId('tabloids'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'tp51', uid: 'tb51b' });" + L +
"    var d51c = E.previewStrength();" + L +
"    ok(d51c.cthulhu === 6, 'L51 Telephone Psychics +6 control Tabloids -> cthulhu=' + d51c.cthulhu);" + L +
'  } else { ok(true, "L51 (TP) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'hc51', idxOfId('hillaryclinton'), 1);" + L +
"    plant(1, 'bc51', idxOfId('billclinton'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'hc51', uid: 'bc51' });" + L +
"    var d51d = E.previewStrength();" + L +
"    ok(d51d.cthulhu === 6, 'L51 Hillary +6 directo control Bill Clinton -> cthulhu=' + d51d.cthulhu);" + L +
'  } else { ok(true, "L51 (HC) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'dp51', idxOfId('deprogrammers'), 1);" + L +
"    plant(0, 'tx51c', idxOfId('texas'), 1);" + L +
"    plant(1, 'tk51', idxOfId('trekkies'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx51c', uid: 'tk51' });" + L +
"    var d51e = E.previewStrength();" + L +
"    ok(d51e.cthulhu === 8, 'L51 Deprogrammers +8 Weird+Fanatic (pick best) -> cthulhu=' + d51e.cthulhu);" + L +
'  } else { ok(true, "L51 (DP) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'lp51', idxOfId('localpolicedepartments'), 1);" + L +
"    var lpM51 = { uid: 'lpM51', cardId: idxOfId('texas'), children: [{ uid: 'lp51', cardId: idxOfId('localpolicedepartments'), children: [], tokens: 1 }], tokens: 1 };" + L +
"    E._raw().players[0].structure.children.push(lpM51);" + L +
"    plant(1, 'ir51', idxOfId('irs'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'lpM51', uid: 'ir51' });" + L +
"    var d51f = E.previewStrength();" + L +
"    ok(d51f.cthulhu === 4 && d51f.boosts === 1, 'L51 LPD +4 (owner) destroy Criminal y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);" + L +
'  } else { ok(true, "L51 (LPD) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L51 ok');
