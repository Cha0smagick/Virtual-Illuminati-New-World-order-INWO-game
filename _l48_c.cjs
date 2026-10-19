const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// E) align_swap (Wall Street): Corporate <-> Government en las alineaciones del atacante
const eA = "  var attAligns=nodeAligns(att,attCard),tgtAligns=nodeAligns(tNode,tCard);";
if (!t.includes('align_swap')) {
  const eB = "  var attAligns=nodeAligns(att,attCard),tgtAligns=nodeAligns(tNode,tCard);\n  /* L48 — Wall Street: tratar Corporate como Government (o al reves) al atacar. */\n  var swA=null;\n  (S.players[A.pid]?S.players[A.pid].structure:null)&&walk(S.players[A.pid].structure,function(n48){if(swA||n48.cardId==null)return;var cc48=card(n48.cardId);if(cc48&&cc48.effect&&cc48.effect.kind==='align_swap')swA=cc48.effect;});\n  if(swA&&Array.isArray(swA.swap)&&swA.swap.length===2){var m48={};m48[swA.swap[0]]=swA.swap[1];m48[swA.swap[1]]=swA.swap[0];attAligns=attAligns.map(function(a48){return m48[a48]||a48;});}";
  t = t.split(eA).join(eB);
  ops++;
} else console.log('ya E');
// F) def_bonus sobre titeres (Wall Street): cl.vsDef.isPuppetOf
const fA = "      var sc=(cl.scope||e.scope||'self');";
if (!t.includes("vsDef")) {
  const fB = "      var sc=(cl.scope||e.scope||'self');";
  const anchorG = "      if((cl.scope||e.scope||'self')!=='owner'&&nd!==attNode)return; /* 'self': solo el defensor */";
  if (t.includes(anchorG)) {
    t = t.split(anchorG).join("      if(sc!=='owner'&&nd!==(S.attack.targetUid?findNode(S.attack.targetUid):null))return;");
  }
  ops++;
} else console.log('ya F');
fs.writeFileSync(P, t);
console.log('ops: ' + ops + ' (revisar F a mano)');
