const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const anchor = "    var e=bonusPart(c&&c.effect,'def');\n    if(!e)return;";
// quitar el insert anterior si existe
const old = "\n      /* L48 - Wall Street: solo los TITERES del grupo con el efecto. */\n      if(cl.vsDef&&cl.vsDef.isPuppetOf){var parD=findNodeThatHas(st,defNode?defNode.uid:null);if(!parD||parD.uid!==nd.uid)return;}";
if (t.includes(old)) t = t.replace(old, '');
// quitar el basura si existe
const junk = "\n    /* L48 - Wall Street: def solo a los TITERES del grupo con el efecto. */\n    var clP=(e.clauses||[e])[0];\n    if(clP.vsDef&&clP.vsDef.isPuppetOf){var parDD=findNodeThatHas(st,(S.attack&&S.attack.targetUid)?findNode(S.attack.targetUid).uid:null);if(!parDD||parDD.uid!==nd.uid)return;}\n    if((e.clauses||[e])[0].vsDef&&(e.clauses||[e])[0].vsDef.isPuppetOt){/*legacy*/}";
if (t.includes(junk)) { t = t.replace(junk, ''); console.log('basura quitada'); }
if (t.includes('isPuppetOf')) { console.log('ya'); process.exit(0); }
if (!t.includes(anchor)) throw new Error('ancla no encontrada');
const ins = anchor + "\n    /* L48 - Wall Street: def solo a los TITERES del grupo con el efecto. */\n    var c48=(e.clauses||[e])[0];\n    if(c48.vsDef&&c48.vsDef.isPuppetOf){var pD48=findNodeThatHas(st,defNode?defNode.uid:null);if(!pD48||pD48.uid!==nd.uid)return;}";
t = t.split(anchor).join(ins);
fs.writeFileSync(P, t);
console.log('isPuppetOf antes del scope');
