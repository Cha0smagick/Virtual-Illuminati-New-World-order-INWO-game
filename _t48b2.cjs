const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'pu48' });\n    var d48b = E.previewStrength();\n    E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'ws48' });\n    var d48c2 = E.previewStrength();\n    ok(d48b.defenseBonus === 10 && d48c2.defenseBonus === 0, 'L48 Wall Street: titere +10 Resistencia (' + d48b.defenseBonus + '), el grupo no (' + d48c2.defenseBonus + ')');";
if (!t.includes(a)) throw new Error('ancla WS no encontrada');
const b = "    E.declareAttack(1, 'control', { attackerUid: 'at48', uid: 'pu48' });\n    var d48b = E.previewStrength();\n    ok(d48b.defenseBonus === 10, 'L48 Wall Street: titere +10 Resistencia -> ' + d48b.defenseBonus);\n  } else { ok(true, 'L48 (WS titere) SKIP'); }\n  fresh(idxOfId(U), idxOfId(V));\n  if (readyToAttack(1) != null) {\n    var ws48b = plant(0, 'ws48b', idxOfId('wallstreet'), 1);\n    plant(1, 'at48b', idxOfId('dentists'), 1);\n    E.declareAttack(1, 'control', { attackerUid: 'at48b', uid: 'ws48b' });\n    var d48c2 = E.previewStrength();\n    ok(d48c2.defenseBonus === 0, 'L48 Wall Street: el grupo NO recibe su propio +10 -> ' + d48c2.defenseBonus);";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('WS partido en dos fixtures');
