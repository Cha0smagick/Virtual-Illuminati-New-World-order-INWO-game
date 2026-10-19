const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L48_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k47 in L47_FX) { L47_FXN[norm(k47)] = L47_FX[k47]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L47 no encontrada');
const frag = fs.readFileSync('_l48_fx.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + 'const L48_FXN = {};\nfor (const k48 in L48_FX) { L48_FXN[norm(k48)] = L48_FX[k48]; }\n' + t.slice(i + anchor.length);
t = t.replace('|| L47_FXN[key];', '|| L47_FXN[key] || L48_FXN[key];');
fs.writeFileSync(P, t);
console.log('L48 insertado');
