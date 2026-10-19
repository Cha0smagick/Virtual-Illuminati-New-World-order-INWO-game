const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) ignore_discordian (Deprogrammers): eximir al atacante del bloqueo Discordian
const a1 = "      if(discordianBlocks(owner,att,attCard))\n        throw new Error('La estructura Discordian es inmune a atacantes Straight/Government');";
if (!t.includes('ignore_discordian')) {
  if (!t.includes(a1)) throw new Error('ancla discordian no encontrada');
  const ig = "      /* L51 - Deprogrammers: su texto exime el bloqueo Discordian. */\n      var igD51=attCard&&attCard.effect&&attCard.effect.ignoreDiscordian===true;\n      if(!igD51&&discordianBlocks(owner,att,attCard))\n        throw new Error('La estructura Discordian es inmune a atacantes Straight/Government');";
  t = t.split(a1).join(ig);
  ops++;
} else console.log('ya ignoreD');
// 2) def.vsDef.masterOf (Local Police Departments: +3 al master)
const a2 = "    if(c48.vsDef&&c48.vsDef.isPuppetOt){/*legacy*/}";
if (t.includes(a2)) { t = t.replace(a2, ''); }
const anchorDef = "    /* L48 - Wall Street: def solo a los TITERES del grupo con el efecto. */\n    var c48=(e.clauses||[e])[0];\n    if(c48.vsDef&&c48.vsDef.isPuppetOt){var pD48=findNodeThatHas(st,defNode?defNode.uid:null);if(!pD48||pD48.uid!==nd.uid)return;}";
if (!t.includes(anchorDef)) throw new Error('ancla def-puppet no encontrada');
if (!t.includes('masterOfDef')) {
  const ext = anchorDef + "\n    /* L51 - Local Police Departments: +3 Resistance a su MASTER. */\n    if(c48.vsDef&&c48.vsDef.masterOf===true){var parM51=findNodeThatHas(st,nd.uid);if(!parM51||parM51.uid!==(defNode?defNode.uid:null))return;}";
  t = t.split(anchorDef).join(ext);
  ops++;
} else console.log('ya masterOfDef');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
