const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L50_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k49 in L49_FX) { L49_FXN[norm(k49)] = L49_FX[k49]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L49 no encontrada');
const frag = fs.readFileSync('_l50_fx.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + t.slice(i + anchor.length);
t = t.replace('|| L49_FXN[key];', '|| L49_FXN[key] || L50_FXN[key];');
fs.writeFileSync(P, t);
console.log('L50 insertado');
