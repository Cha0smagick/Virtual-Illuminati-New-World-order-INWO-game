const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
const a = "    if(!e)return;\n    /* Compatibilidad";
if (t.includes('DBG45')) { console.log('ya'); process.exit(0); }
const b = "    if(!e)return;\n    if(typeof DBG45!=='undefined'&&DBG45)console.log('GAB nodo',c.name,'kind',c.effect.kind,'clauses',JSON.stringify(e.clauses||null));\n    /* Compatibilidad";
t = t.replace(a, b);
fs.writeFileSync(P, t);
console.log('instrumentado');
