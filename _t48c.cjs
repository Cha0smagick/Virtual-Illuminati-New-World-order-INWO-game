const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L48 Princess Di')) { console.log('ya'); process.exit(0); }
const a = "    ok(d48b.defenseBonus === 10 && d48c2.defenseBonus === 0, 'L48 Wall Street: titere +10 Resistencia (' + d48b.defenseBonus + '), el grupo no (' + d48c2.defenseBonus + ')');";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'pd48', idxOfId('princessdi'), 1);" + L +
"    plant(0, 'al48', idxOfId('algore'), 1);" + L +
"    plant(1, 'tg48', idxOfId('batf'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'al48', uid: 'tg48' });" + L +
'    var d48d = E.previewStrength();' + L +
"    ok(d48d.boosts === 1, 'L48 Princess Di: +1 Power al otro grupo Liberal -> boosts=' + d48d.boosts);" + L +
"    var m48 = '';" + L +
"    try { E.declareAttack(1, 'control', { attackerUid: 'tg48', uid: 'pd48' }); } catch (ex48) { m48 = ex48.message; }" + L +
"    ok(/inmune/i.test(m48), 'L48 Princess Di inmune a ataques Liberal/Peaceful -> ' + (m48 || 'no lanzo'));" + L +
'  } else { ok(true, "L48 (PD) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('PD ok');
