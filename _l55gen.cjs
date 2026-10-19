const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L55_FXN')) { console.log('ya'); process.exit(0); }
const a = 'for (const k54 in L54_FX) { L54_FXN[norm(k54)] = L54_FX[k54]; }';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const f = fs.readFileSync('_f13.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + a.length) + '\n' + f + t.slice(i + a.length);
t = t.replace('|| L54_FXN[key];', '|| L54_FXN[key] || L55_FXN[key];');
fs.writeFileSync(P, t);
console.log('L55 insertado');
