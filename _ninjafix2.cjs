const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
if (!t.includes('notes,instant){')) {
  t = t.split('notes,instant){').join('XX'); // no-op guard
}
const sigOld = 'function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes){';
if (t.includes(sigOld)) { t = t.split(sigOld).join('function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes,instant){'); ops++; }
const skipA = "    clauses.forEach(function(cl){\n      var sc46=cl.scope||e.scope||'self';";
if (t.includes(skipA)) {
  const skipB = "    clauses.forEach(function(cl){\n      if(instant && cl.nonInstant === true) return;\n      var sc46 = cl.scope || e.scope || 'self';";
  t = t.split(skipA).join(skipB); ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
