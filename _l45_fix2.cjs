const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) guardas falsy -> ==null (A.M.A. es el indice 0 del dataset: cardId=0 es legitimo)
const reps = [
  ["    if(!nd.cardId)return;\n    console.log('GAB-VISITA',JSON.stringify({uid:nd.uid,cardId:nd.cardId,kids:(nd.children||[]).length}));",
   "    if(nd.cardId==null)return;"],
  ["    if(blocked||!nd.cardId)return;", "    if(blocked||nd.cardId==null)return;"],
  ["    if(!x.cardId)return;", "    if(x.cardId==null)return;"]
];
reps.forEach(([a, b]) => { if (t.includes(a)) { t = t.split(a).join(b); ops++; } });
// 2) limpiar TODOS los DBG temporales
const kills = [
  /if\(typeof DBG45!=='undefined'&&DBG45\)console\.log\('GAB-ENTRA'[^;]*;\n?/g,
  /if\(typeof DBG45!=='undefined'&&DBG45\)console\.log\('GAB-ANTESWALK'[^;]*;\n?/g,
  /if\(typeof DBG45!=='undefined'&&DBG45\)console\.log\('GAB nodo'[^;]*;\n?/g,
  /if\(typeof DBG45!=='undefined'&&DBG45\)console\.log\('DBG45CALL'[^;]*;\n?/g,
  /if\(typeof DBG45!=='undefined'&&DBG45&&node&&node\.uid\)console\.log\('GAB-WALK'[^;]*;\n?/g,
  /    console\.log\('GAB-VISITA',nd\.uid\);\n/g
];
kills.forEach(rx => { t = t.replace(rx, ''); ops++; });
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
