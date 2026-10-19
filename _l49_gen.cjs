const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L49_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k48 in L48_FX) { L48_FXN[norm(k48)] = L48_FX[k48]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L48 no encontrada');
const frag = fs.readFileSync('_l49_fx.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + t.slice(i + anchor.length);
t = t.replace('|| L48_FXN[key];', '|| L48_FXN[key] || L49_FXN[key];');
fs.writeFileSync(P, t);
console.log('L49 insertado');
