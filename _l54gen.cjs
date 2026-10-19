const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L54_FXN')) { console.log('ya'); process.exit(0); }
const a = 'for (const k53 in L53_FX) { L53_FXN[norm(k53)] = L53_FX[k53]; }';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const f = fs.readFileSync('_f11.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + a.length) + '\n' + f + t.slice(i + a.length);
t = t.replace('|| L53_FXN[key];', '|| L53_FXN[key] || L54_FXN[key];');
fs.writeFileSync(P, t);
console.log('L54 insertado');
