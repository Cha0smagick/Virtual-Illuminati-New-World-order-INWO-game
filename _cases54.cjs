const fs = require('fs');
let ops = 0;
function ins(file, anchor, block) {
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes(block.trim().slice(0, 40))) { console.log('ya: ' + file); return; }
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada en ' + file);
  t = t.slice(0, i) + block + t.slice(i);
  fs.writeFileSync(file, t);
  ops++;
}
ins('game/js/engine.js', "    case 'kkk_double':",
  "    case 'undergroundnewspapers':\n      throw new Error(c.name+': habilidad pasiva — su robo de Plot se aplica al ayudar a destruir');\n");
ins('game/js/ui.js', "  kkk_double: 'Los grupos Violent del ataque doblan su Poder',",
  "  undergroundnewspapers: 'Robas una Plot al ayudar a destruir',\n");
console.log('ops: ' + ops);
