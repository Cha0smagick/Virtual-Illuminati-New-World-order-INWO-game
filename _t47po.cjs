const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L47 Post Office')) { console.log('ya'); process.exit(0); }
const a = '    ok(E._raw().players[0].hand.length === 6, "L46 Conspiracy Theorists: 6 Plots al fin de turno (limite +1) -> " + E._raw().players[0].hand.length);';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const frag = fs.readFileSync('_t47po.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + a.length) + '\n' + frag + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('PO insertado');
