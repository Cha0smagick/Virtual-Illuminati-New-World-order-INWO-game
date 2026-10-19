const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "      var sc=cl.scope||e.scope||'self';\n      if(sc!=='owner'&&(!defNode||nd.uid!==defNode.uid))return;  /* 'self': solo el defensor */";
if (!t.includes(a)) throw new Error('ancla scope-def no encontrada');
const b = "      var sc=cl.scope||e.scope||'self';\n      /* L48/L51: las clausulas de parentesco (isPuppetOt/masterOf) fijan su destino y NO pasan por el scope. */\n      var kin48=cl.vsDef&&(cl.vsDef.isPuppetOt||cl.vsDef.masterOf===true);\n      if(!kin48&&sc!=='owner'&&(!defNode||nd.uid!==defNode.uid))return;  /* 'self': solo el defensor */";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('scope-def con excepcion de parentesco');
