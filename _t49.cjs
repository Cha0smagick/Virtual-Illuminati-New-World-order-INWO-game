const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const junk = [
"  /* ===== L49 - acciones de mover/quitar ficha, inmunidades ===== */",
"  fresh(idxOfId(U), idxOfId(V));",
'  if (readyToAttack(0) != null) {',
"    plant(0, 'sm49', idxOfId('smof'), 1);",
"    plant(1, 'tg49', idxOfId('california'), 1);",
'    var d49 = plantAtk(0, "x49", "ama", 1, "t49", "california", "control");',
"    ok(d49 && d49.cthulhu === 0, 'fixture');",
'  }',
''].join('\n');
if (t.includes(junk)) t = t.replace(junk, '');
if (t.includes('L49 S.M.O.F.:')) { console.log('ya'); process.exit(0); }
const a = "  ok(e45b === '' && o45 && o45.power === 8,";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'sm49', idxOfId('smof'), 1);" + L +
"    plant(0, 'at49', idxOfId('texas'), 1);" + L +
"    plant(1, 'wz49', idxOfId('flatearthers'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'at49', uid: 'wz49' });" + L +
"    var d49a = E.previewStrength();" + L +
"    ok(d49a.cthulhu === 2, 'L49 S.M.O.F. +2 (owner) control Weird -> cthulhu=' + d49a.cthulhu);" + L +
'  } else { ok(true, "L49 (SMOF) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'sm49b', idxOfId('smof'), 1);" + L +
"    plant(1, 'tk49', idxOfId('trekkies'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'sm49b', uid: 'tk49' });" + L +
"    var d49b = E.previewStrength();" + L +
"    ok(d49b.cthulhu === 6, 'L49 S.M.O.F. directo Trekkies: +2 owner +4 directo -> cthulhu=' + d49b.cthulhu);" + L +
'  } else { ok(true, "L49 (SMOF directo) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(1) != null) {' + L +
"    plant(0, 'ob49', idxOfId('offshorebanks'), 1);" + L +
"    plant(1, 'gf49', idxOfId('batf'), 1);" + L +
"    var m49 = '';" + L +
"    try { E.declareAttack(1, 'destroy', { attackerUid: 'gf49', uid: 'ob49' }); } catch (ex49) { m49 = ex49.message; }" + L +
"    ok(/inmune/i.test(m49), 'L49 Offshore Banks inmune a destroy Gov/Corp/Criminal -> ' + (m49 || 'no lanzo'));" + L +
"    var m49b = '';" + L +
"    try { E.declareAttack(1, 'control', { attackerUid: 'gf49', uid: 'ob49' }); } catch (ex49b) { m49b = ex49b.message; }" + L +
"    ok(m49b === '', 'L49 Offshore Banks NO es inmune a controlar -> ' + (m49b || 'ok'));" + L +
'  } else { ok(true, "L49 (Offshore) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'pp49', idxOfId('phonephreaks'), 1);" + L +
"    plant(0, 'at49b', idxOfId('texas'), 1);" + L +
"    plant(1, 'cs49', idxOfId('siliconvalley'), 1);" + L +
"    E.declareAttack(0, 'destroy', { attackerUid: 'at49b', uid: 'cs49' });" + L +
"    var d49c = E.previewStrength();" + L +
"    ok(d49c.cthulhu === 6, 'L49 Phone Phreaks +6 (owner) contra Computer -> cthulhu=' + d49c.cthulhu);" + L +
'  } else { ok(true, "L49 (Phreaks) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L49 ok');
