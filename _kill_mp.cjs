const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    case 'master_protect':\n      throw new Error(c.name+': habilidad pasiva — su master no puede ser capturado');\n";
if (!t.includes(a)) throw new Error('no encontrado');
t = t.split(a).join('');
fs.writeFileSync(P, t);
console.log('case muerto eliminado (master_protect viaja como combo.mitad mp)');
