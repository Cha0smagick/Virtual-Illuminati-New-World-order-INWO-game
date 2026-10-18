const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
const a = "'L43 Big Media free_interfere: se opone sin alineacion comun -> ' + (e43 || 'ok'))";
if (!t.includes(a)) throw new Error('no encontrado');
t = t.split(a).join("'L43 Big Media free_interfere diag: len=' + E._raw().attack.opposes.length + ' err=' + e43 + ' opp=' + JSON.stringify(E._raw().attack.opposes))");
fs.writeFileSync(P, t);
console.log('diag ok');
