const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) KKK doble poder violento (tras aids/opposes)
const anchor = "  A.aids.forEach(function(a){det.aids+=a.power;});\n  A.opposes.forEach(function(o){det.opposes+=o.power;});";
if (!t.includes('kkk_double')) {
  if (!t.includes(anchor)) throw new Error('ancla aids/opposes no encontrada');
  const ins = anchor + "\n  /* L50 - KKK: si su dueno intenta destruir un Peaceful, TODOS los grupos Violent del ataque (ambos bandos) doblan su Poder. */\n  var kkk50=null;\n  walk(S.players[A.pid].structure,function(n50){if(kkk50||n50.cardId==null)return;var kc50=card(n50.cardId);if(kc50&&kc50.effect&&kc50.effect.kind==='kkk_double')kkk50=kc50.effect;});\n  if(kkk50&&A.type==='destroy'&&tNode&&nodeAligns(tNode,tCard).indexOf('peaceful')>=0){\n    if(nodeAligns(att,attCard).indexOf('violent')>=0)det.base*=2;\n    if(nodeAligns(tNode,tCard).indexOf('violent')>=0)det.defenseBase*=2;\n    A.aids.forEach(function(a50){var an50=findNode(a50.uid);var ac50=an50?card(an50.cardId):null;if(ac50&&nodeAligns(an50,ac50).indexOf('violent')>=0)det.aids+=a50.power;});\n    A.opposes.forEach(function(o50){var on50=findNode(o50.uid);var oc50=on50?card(on50.cardId):null;if(oc50&&nodeAligns(on50,oc50).indexOf('violent')>=0)det.opposes+=o50.power;});\n    det.notes.push('KKK: los grupos Violent del ataque doblan su Poder');\n  }";
  t = t.split(anchor).join(ins);
  ops++;
} else console.log('ya KKK');
// 2) bonusPart 'mp' (master_protect)
if (!t.includes("which==='mp'")) {
  t = t.split("  if(which==='ga'&&e.kind==='group_action')return e;")
    .join("  if(which==='ga'&&e.kind==='group_action')return e;\n  if(which==='mp'&&e.kind==='master_protect')return e;");
  ops++;
} else console.log('ya mp-part');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
