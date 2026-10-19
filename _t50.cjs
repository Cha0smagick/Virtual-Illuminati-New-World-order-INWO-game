const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L50 KKK')) { console.log('ya'); process.exit(0); }
const a = "    ok(d49c.cthulhu === 6, 'L49 Phone Phreaks +6 (owner) contra Computer -> cthulhu=' + d49c.cthulhu);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  /* ===== L50 - inmunidades condicionales, KKK, Intellectuals, R.S.M. ===== */' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'ev50', idxOfId('emptyvee'), 1);" + L +
"    plant(0, 'gr50', idxOfId('gordoremora'), 1);" + L +
"    plant(1, 'tg50', idxOfId('batf'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'gr50', uid: 'tg50' });" + L +
"    var d50a = E.previewStrength();" + L +
"    ok(d50a.boosts === 1, 'L50 Empty Vee: +1 Power a su Personality atacante -> boosts=' + d50a.boosts);" + L +
'  } else { ok(true, "L50 (EV grant) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(1) != null) {' + L +
"    plant(0, 'ev50b', idxOfId('emptyvee'), 1);" + L +
"    plant(0, 'tb50', idxOfId('tabloids'), 1);" + L +
"    plant(1, 'dt50', idxOfId('dentists'), 1);" + L +
"    var m50 = '';" + L +
"    try { E.declareAttack(1, 'control', { attackerUid: 'dt50', uid: 'tb50' }); } catch (ex50) { m50 = ex50.message; }" + L +
"    ok(/inmune/i.test(m50), 'L50 Empty Vee protege a sus Media de los Straight -> ' + (m50 || 'no lanzo'));" + L +
'  } else { ok(true, "L50 (EV immune) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'kk50', idxOfId('kkk'), 1);" + L +
"    plant(0, 'nj50', idxOfId('ninjas'), 1);" + L +
"    plant(1, 'cn50', idxOfId('canada'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'nj50', uid: 'cn50' });" + L +
"    var d50b = E.previewStrength();" + L +
"    ok(d50b.base === 2, 'L50 KKK: el atacante Violent dobla (base 1 -> ' + d50b.base + ')');" + L +
'  } else { ok(true, "L50 (KKK) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    var tx50 = plant(0, 'tx50', idxOfId('texas'), 1);" + L +
"    tx50.children.push({ uid: 'in50', cardId: idxOfId('intellectuals'), children: [], tokens: 1 });" + L +
"    plant(1, 'ir50', idxOfId('fbi'), 1);" + L +
"    var m50b = '';" + L +
"    try { E.declareAttack(1, 'control', { attackerUid: 'ir50', uid: 'tx50' }); } catch (ex50b) { m50b = ex50b.message; }" + L +
"    ok(/capturado/i.test(m50b), 'L50 Intellectuals: el master no puede ser capturado -> ' + (m50b || 'no lanzo'));" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'tx50', uid: 'ir50' });" + L +
"    var d50c = E.previewStrength();" + L +
"    ok(d50c.boosts === 1, 'L50 Intellectuals: el master gana +1 Power -> boosts=' + d50c.boosts);" + L +
'  } else { ok(true, "L50 (Intel) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'rs50', idxOfId('robotseamonsters'), 1);" + L +
"    plant(0, 'tx50b', idxOfId('texas'), 1);" + L +
"    plant(1, 'ir50b', idxOfId('fbi'), 1);" + L +
"    plant(1, 'jp50', idxOfId('japan'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx50b', uid: 'ir50b' });" + L +
"    var d50d = E.previewStrength();" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'rs50', uid: 'jp50' });" + L +
"    var d50e = E.previewStrength();" + L +
"    ok(d50d.cthulhu === 4 && d50e.cthulhu === 10, 'L50 R.S.M. +4 Gov (owner) y +10 directo Japan -> ' + d50d.cthulhu + '/' + d50e.cthulhu);" + L +
'  } else { ok(true, "L50 (RSM) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L50 ok');
