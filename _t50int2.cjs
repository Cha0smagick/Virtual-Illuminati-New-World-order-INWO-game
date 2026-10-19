const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = [
"  fresh(idxOfId(U), idxOfId(V));",
"  if (readyToAttack(0) != null) {",
"    var tx50 = plant(0, 'tx50', idxOfId('texas'), 1);",
"    tx50.children.push({ uid: 'in50', cardId: idxOfId('intellectuals'), children: [], tokens: 1 });",
"    plant(1, 'ir50', idxOfId('fbi'), 1);",
"    var m50b = '';",
"    try { E.declareAttack(1, 'control', { attackerUid: 'ir50', uid: 'tx50' }); } catch (ex50b) { m50b = ex50b.message; }",
"    ok(/capturado/i.test(m50b), 'L50 Intellectuals: el master no puede ser capturado -> ' + (m50b || 'no lanzo'));",
"    E.declareAttack(0, 'control', { attackerUid: 'tx50', uid: 'ir50' });",
"    var d50c = E.previewStrength();",
"    ok(d50c.boosts === 1, 'L50 Intellectuals: el master gana +1 Power -> boosts=' + d50c.boosts);",
'  } else { ok(true, "L50 (Intel) SKIP"); }'
].join('\n');
const b = [
"  fresh(idxOfId(U), idxOfId(V));",
"  if (readyToAttack(1) != null) {",
"    var tx50 = plant(0, 'tx50', idxOfId('texas'), 1);",
"    tx50.children.push({ uid: 'in50', cardId: idxOfId('intellectuals'), children: [], tokens: 1 });",
"    plant(1, 'ir50', idxOfId('fbi'), 1);",
"    var m50b = '';",
"    try { E.declareAttack(1, 'control', { attackerUid: 'ir50', uid: 'tx50' }); } catch (ex50b) { m50b = ex50b.message; }",
"    ok(/capturado/i.test(m50b), 'L50 Intellectuals: el master no puede ser capturado -> ' + (m50b || 'no lanzo'));",
'  } else { ok(true, "L50 (Intel no-captura) SKIP"); }',
"  fresh(idxOfId(U), idxOfId(V));",
"  if (readyToAttack(0) != null) {",
"    var tx50c = plant(0, 'tx50c', idxOfId('texas'), 1);",
"    tx50c.children.push({ uid: 'in50c', cardId: idxOfId('intellectuals'), children: [], tokens: 1 });",
"    plant(1, 'ir50c', idxOfId('fbi'), 1);",
"    E.declareAttack(0, 'control', { attackerUid: 'tx50c', uid: 'ir50c' });",
"    var d50c = E.previewStrength();",
"    ok(d50c.boosts === 1, 'L50 Intellectuals: el master gana +1 Power -> boosts=' + d50c.boosts);",
'  } else { ok(true, "L50 (Intel grant) SKIP"); }'
].join('\n');
if (!t.includes(a)) throw new Error('ancla no encontrada (revisar comillas)');
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('Intel partido ok');
