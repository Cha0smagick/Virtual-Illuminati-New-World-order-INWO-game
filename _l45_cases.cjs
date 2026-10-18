const fs = require('fs');
let ops = 0;
function ins(file, anchor, block) {
  let t = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (t.includes(block.trim().slice(0, 60))) { console.log('ya: ' + file); return; }
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada en ' + file + ': ' + anchor.slice(0, 50));
  t = t.slice(0, i) + block + t.slice(i);
  fs.writeFileSync(file, t);
  ops++;
}
// cases pasivos en engine.js
ins('game/js/engine.js',
  "    case 'no_goal_destroy':",
  "    case 'attack_immune':\n      throw new Error(c.name+': habilidad pasiva — su inmunidad se aplica al declarar el ataque enemigo');\n    case 'power_grant':\n      throw new Error(c.name+': habilidad pasiva — su bonus de Poder se aplica a los grupos que protege');\n    case 'power_per_count':\n      throw new Error(c.name+': habilidad pasiva — su Poder se recalcula por cada grupo que cuenta');\n"
);
// etiquetas KIND_ES en ui.js
ins('game/js/ui.js',
  "  no_goal_destroy: 'Destruirla no cuenta para ninguna meta de victoria',",
  "  attack_immune: 'Inmune a ataques de ciertos grupos (o protege a quienes indica)',\n  power_grant: 'Concede Poder a los grupos de tu estructura que califican',\n  power_per_count: 'Poder creciente por cada grupo aliado que cuenta',\n"
);
console.log('ops: ' + ops);
