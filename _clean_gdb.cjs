const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
let ops = 0;
const bad = [
"  if(typeof global.GDB_DBG!=='undefined')console.log('GDB-DBG enter A.pid=',A.pid,'targetPid=',A.targetPid,'defNode=',defNode&&defNode.uid);",
"    if(typeof global.GDB_DBG!=='undefined'&&nd.cardId!=null)console.log('GDB-DBG nodo',nd.uid,card(nd.cardId).name);"
];
bad.forEach(function (b) { if (t.includes(b)) { t = t.split(b).join(''); ops++; } });
fs.writeFileSync(P, t);
console.log('debug limpiado: ' + ops);
