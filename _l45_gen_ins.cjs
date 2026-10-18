const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (!t.includes('L45_FXN')) {
  const anchor = "for (const k44 in L44_FX) { L44_FXN[norm(k44)] = L44_FX[k44]; }";
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla L44 no encontrada');
  const frag = fs.readFileSync('_l45_gencards.txt', 'utf8').replace(/\r\n/g, '\n');
  t = t.slice(0, i + anchor.length) + '\n' + frag + t.slice(i + anchor.length);
  t = t.replace('|| L44_FXN[key];', '|| L44_FXN[key] || L45_FXN[key];');
  fs.writeFileSync(P, t);
  console.log('gen_cards: L45 insertado');
} else console.log('gen_cards: ya estaba');
