const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (!t.includes('GAB-ENTRA')) {
  t = t.replace("function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes){",
    "function groupAttackBonus(pid,attNode,attCard,type,tNode,tCard,notes){if(typeof DBG45!=='undefined'&&DBG45)console.log('GAB-ENTRA',pid,attNode&&attNode.uid,tNode&&tNode.uid);");
}
if (!t.includes('GAB-VISITA')) {
  t = t.replace("    var c=card(nd.cardId);\n    var e=bonusPart(c&&c.effect,'atk');",
    "    console.log('GAB-VISITA',nd.uid);\n    var c=card(nd.cardId);\n    var e=bonusPart(c&&c.effect,'atk');");
}
fs.writeFileSync(P, t);
console.log('dbg3 ok');
