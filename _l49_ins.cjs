const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
const anchor = "  }else if(act==='discard_exposed'){";
if (!t.includes("act==='strip_token'")) {
  const f7 = fs.readFileSync('_f7.txt', 'utf8').replace(/\r\n/g, '\n');
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla discard_exposed no encontrada');
  t = t.slice(0, i) + f7 + t.slice(i);
  ops++;
} else console.log('ya L49 handlers');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
