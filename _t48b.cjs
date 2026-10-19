const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L48 Wall Street')) { console.log('ya'); process.exit(0); }
const a = "    ok(d48a.cthulhu === 8, 'L48 S.F.F. scope parent + owner: el master ataca Computer -> cthulhu=' + d48a.cthulhu + ' (6+2)');";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(1) != null) {' + L +
"    var ws48 = plant(0, 'ws48', idxOfId('wallstreet'), 1);" + L +
"    hangUnder(ws48, 'pu48', idxOfId('batf'), 1);" + L +
"    plant(1, 'at48', idxOfId('dentists'), 1);" + L +
"    E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'pu48' });" + L +
'    var d48b = E.previewStrength();' + L +
"    E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'ws48' });" + L +
'    var d48c2 = E.previewStrength();' + L +
"    ok(d48b.defenseBonus === 10 && d48c2.defenseBonus === 0, 'L48 Wall Street: titere +10 Resistencia (' + d48b.defenseBonus + '), el grupo no (' + d48c2.defenseBonus + ')');" + L +
'  } else { ok(true, "L48 (WS) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('WS ok');
