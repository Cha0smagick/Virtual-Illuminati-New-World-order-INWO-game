const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    ok(d51f.cthulhu === 8 && d51f.boosts === 1, 'L51 LPD +4 owner +4 directo destroy Criminal, y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = "    ok(d51f.cthulhu === 4 && d51f.boosts === 1, 'L51 LPD +4 (owner) destroy Criminal y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('LPD 4 ok');
