const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "return !!(cM38&&hasAttr(cM38,'media',sM38));})()))\n     &&!privilegeBreakBy(entry.uid))";
const b = "return !!(cM38&&hasAttr(cM38,'media',sM38));})())\n     &&!privilegeBreakBy(entry.uid))";
if (!t.includes(a)) throw new Error('no encontrado');
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('parentesis reparado');
