const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let n = 0;
function ins(marker, anchor, block) {
  if (t.includes(marker)) { console.log('ya: ' + marker); return; }
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada: ' + anchor.slice(0, 60));
  t = t.slice(0, i) + block + t.slice(i);
  n++;
}
ins('gb45c', "  if(A.type==='control'){\n    det.base=curPower(att);",
  "  if(A.type==='control'){\n    det.base=curPower(att);\n    /* L45: pasivas de poder del atacante (grant + conteo). */\n    var gb45c=grantPowerBonus(att)+ppcSelfBonus(att);\n    if(gb45c){det.boosts+=gb45c;det.notes.push('Pasivas de poder: +'+gb45c);}"
);
ins('gb45d', "  }else{ /* destroy */\n    det.base=curPower(att);",
  "  }else{ /* destroy */\n    det.base=curPower(att);\n    /* L45: pasivas de poder del atacante (grant + conteo). */\n    var gb45d=grantPowerBonus(att)+ppcSelfBonus(att);\n    if(gb45d){det.boosts+=gb45d;det.notes.push('Pasivas de poder: +'+gb45d);}"
);
ins('gd45', "    det.defenseBase=tNode?defenderPower(tNode,true):0;",
  "    det.defenseBase=tNode?defenderPower(tNode,true):0;\n    /* L45: pasivas de poder del OBJETIVO (defiende con su Poder en destroy). */\n    var gd45=grantPowerBonus(tNode)+ppcSelfBonus(tNode);\n    if(gd45)det.defenseBase+=gd45;"
);
ins('gp45', "  var pw=(typeof entry.power==='number')?entry.power:curPower(sup);",
  "  var pw=(typeof entry.power==='number')?entry.power:curPower(sup);\n  if(typeof entry.power!=='number'){var gp45=grantPowerBonus(sup)+ppcSelfBonus(sup);if(gp45)pw+=gp45;}\n  /* L45: aid_power — bono al poder aportado por este apoyo (A.M.A. protect). */\n  var aid45=bonusPart(sc.effect,'aid');\n  if(aid45){\n    var cA45=aid45.clauses||[{vs:aid45.vs,value:aid45.value}];\n    cA45.forEach(function(clA){if(vsMatchQ(clA.vs,tNode,tCard))pw+=(Number(clA.value)||0);});\n  }"
);
fs.writeFileSync(P, t);
console.log('inserciones: ' + n);
