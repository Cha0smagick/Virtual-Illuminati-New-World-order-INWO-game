const fs = require('fs');
const P = 'test_fase2_rules.js';
let lines = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n').split('\n');
let i1 = -1, i2 = -1;
for (let i = 0; i < lines.length; i++) {
  if (i1 < 0 && lines[i].indexOf('hand.length === 6,') >= 0) i1 = i;
  if (lines[i].indexOf("L45 (Recording Industry) SKIP") >= 0) i2 = i;
}
if (i1 < 0 || i2 < 0 || i2 <= i1) throw new Error('rango no encontrado: i1=' + i1 + ' i2=' + i2);
console.log('rango:', i1 + 1, 'a', i2 + 1);
const neu = [
'    ok(E._raw().players[0].hand.length === 6, "L46 Conspiracy Theorists: 6 Plots al fin de turno (limite +1) -> " + E._raw().players[0].hand.length);',
'  } else { ok(true, "L46 (CT) SKIP"); }',
'  fresh(idxOfId(U), idxOfId(V));',
'  if (readyToAttack(0) != null) {',
"    plant(0, 'sv46', idxOfId('siliconvalley'), 1);",
'    var hb46 = E._raw().players[0].hand.length;',
"    E.useGroupAction(0, 'sv46', {});",
'    var sv46n = null; (function w46(n) { if (n.uid === "sv46") sv46n = n; (n.children || []).forEach(w46); })(E._raw().players[0].structure);',
'    ok(E._raw().players[0].hand.length === hb46 + 1 && sv46n && sv46n.tokens === 0, "L46 Silicon Valley roba Plot extra y gasta su ficha");',
'  } else { ok(true, "L46 (SV) SKIP"); }',
'  fresh(idxOfId(U), idxOfId(V));',
'  if (readyToAttack(0) != null) {',
"    plant(0, 'at46', anyGroupIdx(), 1);",
"    plant(1, 'tg46', idxOfId('texas'), 1);",
"    E.declareAttack(0, 'control', { attackerUid: 'at46', uid: 'tg46' });",
'    E.togglePrivilege();',
"    plant(1, 'mn46', idxOfId('moonies'), 1);",
'    var e46m = "";',
"    try { E.addSupport(1, { uid: 'mn46', oppose: true }); } catch (ex46) { e46m = ex46.message; }",
'    ok(e46m === "" && E._raw().attack.opposes.length === 1 && E._raw().attack.privilege === false,',
'      "L46 Moonies interfiere en el privilegiado y lo deshace -> " + (e46m || "priv=" + E._raw().attack.privilege));',
'  } else { ok(true, "L46 (Moonies) SKIP"); }',
"  ok(d45d.boosts === 2, 'L45 Recording Industry +2 Power al Media Personality atacante -> boosts=' + d45d.boosts);",
"} else { ok(true, 'L45 (Recording Industry) SKIP'); }"
];
lines = lines.slice(0, i1).concat(neu).concat(lines.slice(i2 + 1));
fs.writeFileSync(P, lines.join('\n'));
console.log('rango reemplazado');
