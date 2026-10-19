const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L52_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k51 in L51_FX) { L51_FXN[norm(k51)] = L51_FX[k51]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L51 no encontrada');
const frag = fs.readFileSync('_l52_fx.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + t.slice(i + anchor.length);
t = t.replace('|| L51_FXN[key];', '|| L51_FXN[key] || L52_FXN[key];');
fs.writeFileSync(P, t);
console.log('L52 insertado');
