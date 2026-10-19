const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes("act==='places_roll_draw'")) { console.log('ya'); process.exit(0); }
const anchorH = "  }else if(act==='discard_exposed'){";
const f5 = fs.readFileSync('_f5.txt', 'utf8').replace(/\r\n/g, '\n');
const i = t.indexOf(anchorH);
if (i < 0) throw new Error('ancla no encontrada');
t = t.slice(0, i) + f5 + t.slice(i);
fs.writeFileSync(P, t);
console.log('places_roll_draw insertado');
