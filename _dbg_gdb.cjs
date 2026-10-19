const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('GDB-DBG')) { console.log('ya'); process.exit(0); }
const a = "  var v=0;\n  walk(st,function(nd){\n    if(nd.cardId==null)return;";
if (!t.includes(a)) throw new Error('ancla gdb no encontrada');
const b = "  var v=0;\n  if(typeof global.GDB_DBG!=='undefined')console.log('GDB-DBG enter A.pid=',A.pid,'targetPid=',A.targetPid,'defNode=',defNode&&defNode.uid);\n  walk(st,function(nd){\n    if(typeof global.GDB_DBG!=='undefined'&&nd.cardId!=null)console.log('GDB-DBG nodo',nd.uid,card(nd.cardId).name);\n    if(nd.cardId==null)return;";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('gdb instrumentado');
