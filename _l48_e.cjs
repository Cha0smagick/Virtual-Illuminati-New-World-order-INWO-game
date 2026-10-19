const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('align_swap')) { console.log('ya'); process.exit(0); }
const a = "  var attAligns=nodeAligns(att,attCard),tgtAligns=nodeAligns(tNode,tCard);";
if (!t.includes(a)) throw new Error('ancla attAligns no encontrada');
const b = a + "\n  /* L48 - Wall Street: tratar Corporate como Government (o al reves) al atacar. */\n  var swA=null;\n  walk(S.players[A.pid].structure,function(n48){if(swA||n48.cardId==null)return;var cc48=card(n48.cardId);if(cc48&&cc48.effect&&cc48.effect.kind==='align_swap')swA=cc48.effect;});\n  if(swA&&Array.isArray(swA.swap)&&swA.swap.length===2){var mp48={};mp48[swA.swap[0]]=swA.swap[1];mp48[swA.swap[1]]=swA.swap[0];attAligns=attAligns.map(function(ax48){return mp48[ax48]||ax48;});}";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('E ok');
