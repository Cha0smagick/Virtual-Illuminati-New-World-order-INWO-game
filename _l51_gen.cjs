const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L51_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k50 in L50_FX) { L50_FXN[norm(k50)] = L50_FX[k50]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L50 no encontrada');
const frag = fs.readFileSync('_l51_fx.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + t.slice(i + anchor.length);
t = t.replace('|| L50_FXN[key];', '|| L50_FXN[key] || L51_FXN[key];');
fs.writeFileSync(P, t);
console.log('L51 insertado');
