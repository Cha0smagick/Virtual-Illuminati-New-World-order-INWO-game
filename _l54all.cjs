const fs = require('fs');
let ops = 0;
// 1) engine: pieza power_if_card
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (!t.includes('L54 power_if_card')) {
  const a = "  if(node.powerOverride!=null)p=node.powerOverride;";
  if (!t.includes(a)) throw new Error('ancla power no encontrada');
  const b = a + "\n  /* L54 power_if_card (Church of Elvis). */\n  if(c.effect&&c.effect.kind==='power_if_card'&&node.uid){\n    var oP54=findOwnerPid(node.uid),hasP54=false,mineP54=false;\n    for(var s54=0;s54<S.players.length;s54++){\n      walk(S.players[s54].structure,function(x54){\n        if(!hasP54&&x54.cardId!=null&&card(x54.cardId).id===c.effect.cardId){hasP54=true;if(s54===oP54)mineP54=true;}\n      });\n    }\n    if(mineP54&&typeof c.effect.ctrl==='number')p=c.effect.ctrl;\n    else if(hasP54&&typeof c.effect.alt==='number')p=c.effect.alt;\n  }";
  t = t.split(a).join(b);
  fs.writeFileSync(P, t); ops++;
}
// 2) case pasivo + KIND_ES
function ins(file, anchor, block) {
  let f = fs.readFileSync(file, 'utf8');
  if (f.includes(block.trim().slice(0, 40))) { console.log('ya: ' + file); return; }
  const i = f.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada en ' + file);
  f = f.slice(0, i) + block + f.slice(i);
  fs.writeFileSync(file, f);
  ops++;
}
ins(P, "    case 'kkk_double':",
  "    case 'power_if_card':\n      throw new Error(c.name+': habilidad pasiva — su Poder se recalcula al mirar las cartas en juego');\n");
ins('game/js/ui.js', "  kkk_double: 'Los grupos Violent del ataque doblan su Poder',",
  "  power_if_card: 'Poder alternativo segun otra carta en juego',\n");
console.log('ops: ' + ops);
