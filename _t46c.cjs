const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes('L46 Moonies')) { console.log('ya'); process.exit(0); }
const a = '    ok(E._raw().players[0].hand.length === hb46 + 1 && sv46n && sv46n.tokens === 0, "L46 Silicon Valley roba Plot extra y gasta su ficha");';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'at46', anyGroupIdx(), 1);" + L +
"    plant(1, 'tg46', idxOfId('texas'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'at46', uid: 'tg46' });" + L +
'    E.togglePrivilege();' + L +
"    plant(1, 'mn46', idxOfId('moonies'), 1);" + L +
'    var e46m = "";' + L +
"    try { E.addSupport(1, { uid: 'mn46', oppose: true }); } catch (ex46) { e46m = ex46.message; }" + L +
'    ok(e46m === "" && E._raw().attack.opposes.length === 1 && E._raw().attack.privilege === false,' + L +
'      "L46 Moonies interfiere en el privilegiado y lo deshace -> " + (e46m || "priv=" + E._raw().attack.privilege));' + L +
'  } else { ok(true, "L46 (Moonies) SKIP"); }' + L;
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('Moonies ok');
