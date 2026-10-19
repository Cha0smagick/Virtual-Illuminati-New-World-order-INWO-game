const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    var m52b = '';\n    try { E.declareAttack(0, 'destroy', { attackerUid: 'ninjas', uid: 'cd52b' }); } catch (ex52b) { m52b = ex52b.message; }\n    ok(m52b === '' || /inmune/i.test(m52b), 'L52 Count Dracula el atacante Magic NO es inmune -> ' + (m52b || 'ok'));";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = "    plant(0, 'nj52', idxOfId('ninjas'), 1);\n    var m52b = '';\n    try { E.declareAttack(0, 'destroy', { attackerUid: 'nj52', uid: 'cd52b' }); } catch (ex52b) { m52b = ex52b.message; }\n    ok(m52b === '' || /inmune/i.test(m52b), 'L52 Count Dracula el atacante Magic NO es inmune -> ' + (m52b || 'ok'));";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('ninjas plantado');
