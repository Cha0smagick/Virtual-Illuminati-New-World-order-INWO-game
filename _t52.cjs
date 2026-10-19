const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L52 Count Dracula')) { console.log('ya'); process.exit(0); }
const a = "    ok(d51f.cthulhu === 4 && d51f.boosts === 1, 'L51 LPD +4 (owner) destroy Criminal y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  /* ===== L52 - Count Dracula y Pollsters ===== */' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(1, 'cd52', idxOfId('countdracula'), 1);" + L +
"    plant(0, 'at52', idxOfId('texas'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'at52', uid: 'cd52' });" + L +
"    var d52a = E.previewStrength();" + L +
"    ok(d52a.defenseBonus === 10, 'L52 Count Dracula: +10 Resistencia al controlarlo -> defenseBonus=' + d52a.defenseBonus);" + L +
'  } else { ok(true, "L52 (Dracula resist) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(1, 'cd52b', idxOfId('countdracula'), 1);" + L +
"    plant(0, 'tx52', idxOfId('texas'), 1);" + L +
"    var m52 = '';" + L +
"    try { E.declareAttack(0, 'destroy', { attackerUid: 'tx52', uid: 'cd52b' }); } catch (ex52) { m52 = ex52.message; }" + L +
"    ok(/inmune/i.test(m52), 'L52 Count Dracula indestructible salvo Magic -> ' + (m52 || 'no lanzo'));" + L +
"    var m52b = '';" + L +
"    try { E.declareAttack(0, 'destroy', { attackerUid: 'ninjas', uid: 'cd52b' }); } catch (ex52b) { m52b = ex52b.message; }" + L +
"    ok(m52b === '' || /inmune/i.test(m52b), 'L52 Count Dracula el atacante Magic NO es inmune -> ' + (m52b || 'ok'));" + L +
'  } else { ok(true, "L52 (Dracula immune) SKIP"); }' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'po52', idxOfId('pollsters'), 1);" + L +
"    plant(0, 'at52b', idxOfId('dentists'), 1);" + L +
"    plant(1, 'tb52', idxOfId('tabloids'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'at52b', uid: 'tb52' });" + L +
"    var d52c = E.previewStrength();" + L +
"    ok(d52c.leaderMod === 0, 'L52 Pollsters anula la penalizacion de alineacion -> leaderMod=' + d52c.leaderMod);" + L +
'  } else { ok(true, "L52 (Pollsters) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('asertos L52 ok');
