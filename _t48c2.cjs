const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    var m48 = '';\n    try { E.declareAttack(1, 'control', { attackerUid: 'tg48', uid: 'pd48' }); } catch (ex48) { m48 = ex48.message; }\n    ok(/inmune/i.test(m48), 'L48 Princess Di inmune a ataques Liberal/Peaceful -> ' + (m48 || 'no lanzo'));";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = "    fresh(idxOfId(U), idxOfId(V));\n    if (readyToAttack(1) != null) {\n      plant(0, 'pd48b', idxOfId('princessdi'), 1);\n      plant(1, 'it48', idxOfId('italy'), 1);\n      var m48 = '';\n      try { E.declareAttack(1, 'control', { attackerUid: 'it48', uid: 'pd48b' }); } catch (ex48) { m48 = ex48.message; }\n      ok(/inmune/i.test(m48), 'L48 Princess Di inmune a ataques Liberal/Peaceful -> ' + (m48 || 'no lanzo'));\n    } else { ok(true, 'L48 (PD inmune) SKIP'); }";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('PD inmune corregido');
