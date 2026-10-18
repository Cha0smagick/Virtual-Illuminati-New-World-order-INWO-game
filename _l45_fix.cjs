const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function rep(a, b) {
  if (!t.includes(a)) { console.log('no esta: ' + a.slice(0, 40)); return; }
  t = t.split(a).join(b);
  ops++;
}
// A: rama control — quitar el if duplicado
rep(
  "if(gb45c){det.boosts+=gb45c;det.notes.push('Pasivas de poder: +'+gb45c);}  if(A.type==='control'){\n    det.base=curPower(att);\n    for(var i=0",
  "if(gb45c){det.boosts+=gb45c;det.notes.push('Pasivas de poder: +'+gb45c);}\n    for(var i=0"
);
// B: rama destroy — quitar el else duplicado
rep(
  "if(gb45d){det.boosts+=gb45d;det.notes.push('Pasivas de poder: +'+gb45d);}  }else{ /* destroy */\n    det.base=curPower(att);\n    for(var k=0",
  "if(gb45d){det.boosts+=gb45d;det.notes.push('Pasivas de poder: +'+gb45d);}\n    for(var k=0"
);
// C: defenseBase — quitar la reasignacion posterior
rep(
  "if(gd45)det.defenseBase+=gd45;    det.defenseBase=tNode?defenderPower(tNode,true):0;",
  "if(gd45)det.defenseBase+=gd45;"
);
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
