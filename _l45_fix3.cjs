const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "}  var pw=(typeof entry.power==='number')?entry.power:curPower(sup);\n  if(!eligible){";
const b = "}\n  if(!eligible){";
if (!t.includes(a)) throw new Error('patron no encontrado');
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('duplicado eliminado');
