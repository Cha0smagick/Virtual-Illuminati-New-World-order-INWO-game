const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L47_FXN')) { console.log('ya'); process.exit(0); }
const anchor = 'for (const k46 in L46_FX) { L46_FXN[norm(k46)] = L46_FX[k46]; }';
const i = t.indexOf(anchor);
if (i < 0) throw new Error('ancla L46 no encontrada');
const frag = fs.readFileSync('_f6.txt', 'utf8').replace(/\r\n/g, '\n') + fs.readFileSync('_f6b.txt', 'utf8').replace(/\r\n/g, '\n');
t = t.slice(0, i + anchor.length) + '\n' + frag + fs.readFileSync('_f6c.txt','utf8').replace(/\r\n/g,'\n') + t.slice(i + anchor.length);
t = t.replace('|| L46_FXN[key];', '|| L46_FXN[key] || L47_FXN[key];');
fs.writeFileSync(P, t);
console.log('L47 insertado en gen_cards');
