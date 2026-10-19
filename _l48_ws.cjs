const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const wrong = "\n      /* L48 - Wall Street: solo los TITERES del grupo con el efecto. */\n      if(cl.vsDef&&cl.vsDef.isPuppetOf){var parD=findNodeThatHas(st,defNode?defNode.uid:null);if(!parD||parD.uid!==nd.uid)return;}";
if (t.includes(wrong)) { t = t.split(wrong).join(''); }
const anchor = "    var e=bonusPart(c&&c.effect,'def');\n    if(!e)return;";
if (!t.includes(anchor)) throw new Error('ancla bonusPart def no encontrada');
const ins = anchor + "\n    /* L48 - Wall Street: def solo a los TITERES del grupo con el efecto. */\n    var clP=(e.clauses||[e])[0];\n    if(clP.vsDef&&clP.vsDef.isPuppetOf){var parDD=findNodeThatHas(st,(S.attack&&S.attack.targetUid)?findNode(S.attack.targetUid).uid:null);if(!parDD||parDD.uid!==nd.uid)return;}\n    if((e.clauses||[e])[0].vsDef&&(e.clauses||[e])[0].vsDef.isPuppetOt){/*legacy*/}";
t = t.split(anchor).join(ins);
fs.writeFileSync(P, t);
console.log('isPuppet reordenado');
