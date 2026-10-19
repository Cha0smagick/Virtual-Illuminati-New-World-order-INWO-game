const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L54 power_if_card')) { console.log('ya'); process.exit(0); }
const a = "  if(node.powerOverride!=null)p=node.powerOverride;";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = a + "\n  /* L54 power_if_card (Church of Elvis): Poder alternativo si otra carta esta\n     en juego (alt) o la controla el dueno (ctrl). Va DESPUES del override para\n     respetar "los cambios especificos primero". */\n  if(c.effect&&c.effect.kind==='power_if_card'&&node.uid){\n    var oP54=findOwnerPid(node.uid),hasP54=false,mineP54=false;\n    if(oP54>=0){\n      for(var s54=0;s54<S.players.length;s54++){\n        walk(S.players[s54].structure,function(x54){\n          if(!hasP54&&x54.cardId!=null&&card(x54.cardId).id===c.effect.cardId){hasP54=true;if(s54===oP54)mineP54=true;}\n        });\n      }\n    }\n    if(mineP54&&typeof c.effect.ctrl==='number')p=c.effect.ctrl;\n    else if(hasP54&&typeof c.effect.alt==='number')p=c.effect.alt;\n  }";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('power_if_card ok');
