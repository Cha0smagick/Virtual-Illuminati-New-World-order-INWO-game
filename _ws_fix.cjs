const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    hangUnder(ws48, 'pu48', idxOfId('batf'), 1);";
if (!t.includes(a)) { console.log('ya o no encontrado'); process.exit(0); }
const b = "    ws48.children.push({ uid: 'pu48', cardId: idxOfId('batf'), children: [], tokens: 1 });";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('ws48 títere corregido');
