const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = [
"    plant(1, 'jp50', idxOfId('japan'), 1);",
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx50b', uid: 'ir50b' });",
"    var d50d = E.previewStrength();",
"    E.declareAttack(0, 'destroy', { attackerUid: 'rs50', uid: 'jp50' });",
"    var d50e = E.previewStrength();",
"    ok(d50d.cthulhu === 4 && d50e.cthulhu === 10, 'L50 R.S.M. +4 Gov (owner) y +10 directo Japan -> ' + d50d.cthulhu + '/' + d50e.cthulhu);",
'  } else { ok(true, "L50 (RSM) SKIP"); }'
].join('\n');
if (!t.includes(a)) throw new Error('ancla RSM no encontrada');
const b = [
"    plant(1, 'ir50b2', idxOfId('fbi'), 1);",
"    E.declareAttack(0, 'destroy', { attackerUid: 'tx50b', uid: 'ir50b2' });",
"    var d50d = E.previewStrength();",
"    ok(d50d.cthulhu === 4, 'L50 R.S.M. +4 (owner) al destruir un Government -> cthulhu=' + d50d.cthulhu);",
'  } else { ok(true, "L50 (RSM owner) SKIP"); }',
"  fresh(idxOfId(U), idxOfId(V));",
"  if (readyToAttack(0) != null) {",
"    plant(0, 'rs50b', idxOfId('robotseamonsters'), 1);",
"    plant(1, 'jp50b', idxOfId('japan'), 1);",
"    E.declareAttack(0, 'destroy', { attackerUid: 'rs50b', uid: 'jp50b' });",
"    var d50e = E.previewStrength();",
"    ok(d50e.cthulhu === 10, 'L50 R.S.M. +10 directo contra Japan -> cthulhu=' + d50e.cthulhu);",
'  } else { ok(true, "L50 (RSM directo) SKIP"); }'
].join('\n');
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('RSM partido');
