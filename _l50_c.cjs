const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// C + masterOf en grantPowerBonus
const a = "    clauses.forEach(function(cl){\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);\n    });";
if (t.includes('masterOf')) { console.log('ya'); process.exit(0); }
if (!t.includes(a)) throw new Error('ancla grant no encontrada');
const b = "    clauses.forEach(function(cl){\n      if(cl.excludeSelf&&x.uid===nd.uid)return;\n      if(cl.vs&&cl.vs.masterOf===true){var pm50=findNodeThatHas(st,x.uid);if(!pm50||pm50.uid!==nd.uid)return;v+=(Number(cl.value)||0);return;}\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);\n    });";
t = t.split(a).join(b);
ops++;
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
