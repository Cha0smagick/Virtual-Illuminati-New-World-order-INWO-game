const fs = require('fs');
let ops = 0;
// 1) engine: groupAttackBonus acepta flag instant -> salta clausulas nonInstant
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const sigOld = 'function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes){';
if (!t.includes('instant')) {
  const sigNew = 'function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes,instant){';
  t = t.split(sigOld).join(sigNew);
  const skipA = "    clauses.forEach(function(cl){\n      var sc46=cl.scope||e.scope||'self';";
  const skipB = "    clauses.forEach(function(cl){\n      if(instant&&cl.nonInstant===true)return;\n      var sc46=cl.scope||e.scope||'self';";
  if (t.includes(skipA)) t = t.split(skipA).join(skipB); ops++;
}
// 2) las llamadas en announcePlotInstantAttack pasan instant=true
t = t.replace("var gAB44a=groupAttackBonus(pid,null,null,'destroy',nd,tc,notes);",
  "var gAB44a=groupAttackBonus(pid,null,null,'destroy',nd,tc,notes,true);");
t = t.replace("var gAB44b=groupAttackBonus(pid,null,null,eff.kind,nd,tc,notes);",
  "var gAB44b=groupAttackBonus(pid,null,null,eff.kind,nd,tc,notes,true);");
fs.writeFileSync(P, t);
// 3) gen_cards: clausula destroy de Ninjas pasa a nonInstant (regla oficial)
const G = 'gen_cards.js';
let g = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n');
const nOld = "{ scope: 'owner', atkType: 'destroy', vs: {}, value: 2 }";
const nNew = "{ scope: 'owner', atkType: 'destroy', nonInstant: true, vs: {}, value: 2 }";
if (g.includes(nOld)) { g = g.split(nOld).join(nNew); ops++; }
fs.writeFileSync(G, g);
console.log('ops: ' + ops);
