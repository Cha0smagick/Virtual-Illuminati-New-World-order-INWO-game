const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('isPuppetOt')) { console.log('ya'); process.exit(0); }
let ops = 0;
// 1) reinsertar isPuppetOt (se perdio en una reparacion) + masterOf de L51
const anchor = "    var e=bonusPart(c&&c.effect,'def');\n    if(!e)return;";
if (!t.includes(anchor)) throw new Error('ancla bonusPart-def no encontrada');
const ins = anchor + "\n    /* L48/L51 - def solo a TITERES (Wall Street) o solo al MASTER (Local Police) del grupo con el efecto. */\n    var cl48=(e.clauses||[e])[0];\n    if(cl48.vsDef&&cl48.vsDef.isPuppetOt){var parD48=findNodeThatHas(st,defNode?defNode.uid:null);if(!parD48||parD48.uid!==nd.uid)return;}\n    if(cl48.vsDef&&cl48.vsDef.masterOf===true){var parM48=findNodeThatHas(st,nd.uid);if(!parM48||parM48.uid!==(defNode?defNode.uid:null))return;}";
t = t.split(anchor).join(ins);
ops++;
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
