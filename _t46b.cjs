const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes('L46 Silicon Valley')) { console.log('ya'); process.exit(0); }
const a = 'ok(E._raw().players[0].hand.length === 6,';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'sv46', idxOfId('siliconvalley'), 1);" + L +
'    var hb46 = E._raw().players[0].hand.length;' + L +
"    E.useGroupAction(0, 'sv46', {});" + L +
'    var sv46n = null; (function w46(n) { if (n.uid === "sv46") sv46n = n; (n.children || []).forEach(w46); })(E._raw().players[0].structure);' + L +
'    ok(E._raw().players[0].hand.length === hb46 + 1 && sv46n && sv46n.tokens === 0, "L46 Silicon Valley roba Plot extra y gasta su ficha");' + L +
'  } else { ok(true, "L46 (SV) SKIP"); }' + L;
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('SV ok');
