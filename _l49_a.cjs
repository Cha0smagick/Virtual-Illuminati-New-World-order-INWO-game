const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) bonusPart acepta 'ga' (combo con accion de grupo)
if (!t.includes("which==='ga'")) {
  t = t.split("  if(which==='aid'&&e.kind==='aid_power')return e;")
    .join("  if(which==='aid'&&e.kind==='aid_power')return e;\n  if(which==='ga'&&e.kind==='group_action')return e;");
  ops++;
} else console.log('ya ga-part');
// 2) useGroupAction lee la mitad ga del combo
const a = "  var c=card(nd.cardId);\n  var e=c&&c.effect;\n  if(!e||e.kind!=='group_action')throw new Error(c.name+': no tiene accion de grupo jugable');";
if (t.includes('bonusPart(c.effect')) { console.log('ya ga-read'); }
else if (!t.includes(a)) throw new Error('ancla ga-read no encontrada');
else {
  t = t.split(a).join("  var c=card(nd.cardId);\n  var e=bonusPart(c&&c.effect,'ga')||c&&c.effect;\n  if(!e||(c.effect.kind!=='group_action'&&!(c.effect.kind==='combo_bonus'&&c.effect.ga)))throw new Error(c.name+': no tiene accion de grupo jugable');");
  ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
