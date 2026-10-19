const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    var mast = { uid: 'ma48', cardId: anyGroupIdx(), children: [], tokens: 1 };";
if (!t.includes(a)) throw new Error('ancla no encontrada');
t = t.split(a).join("    var mast = { uid: 'ma48', cardId: idxOfId('texas'), children: [], tokens: 1 };");
fs.writeFileSync(P, t);
console.log('atacante SFF -> texas');
