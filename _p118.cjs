const fs = require('fs');
const P = __dirname + '/test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
let ops = 0;
if (t.includes('a.res.power === 8 + MAGIC.power,')) { t = t.replace('a.res.power === 8 + MAGIC.power,', 'a.res.power === 12,'); ops++; }
if (t.includes('b.res.power === 10 + MAGIC.power,')) { t = t.replace('b.res.power === 10 + MAGIC.power,', 'b.res.power === 14,'); ops++; }
fs.writeFileSync(P, t);
console.log('ops', ops);
