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
ins('game/js/engine.js', "    case 'group_action':",
  "    case 'kkk_double':\n      throw new Error(c.name+': habilidad pasiva — su bono de Poder se aplica al resolver ataques a destruir');\n    case 'pollster_shield':\n      throw new Error(c.name+': habilidad pasiva — anula las penalizaciones de alineacion que van contra su dueno');\n    case 'puppet_align':\n      throw new Error(c.name+': habilidad pasiva — sus titeres leen alineaciones modificadas');\n    case 'master_protect':\n      throw new Error(c.name+': habilidad pasiva — su master no puede ser capturado');\n");
ins('game/js/ui.js', "  no_goal_destroy: 'Destruirla no cuenta para ninguna meta de victoria',",
  "  kkk_double: 'Los grupos Violent del ataque doblan su Poder',\n  pollster_shield: 'Anula penalizaciones de alineacion contrarias',\n  puppet_align: 'Modifica las alineaciones de sus titeres',\n  master_protect: 'Protege a su master de la captura',\n  attack_immune: 'Inmune a ataques de ciertos grupos',\n  power_grant: 'Concede Poder a los grupos de tu estructura que califican',\n  power_per_count: 'Poder creciente por cada grupo aliado que cuenta',\n  combo_bonus: 'Bonos de ataque y de defensa (las dos mitades en una carta)',\n  free_interfere: 'Puede participar sin alineacion en los ataques que indica',\n  atk_flip: 'Sustituye penalizaciones de alineacion por bonus',\n  aid_power: 'Bono al Poder aportado al apoyar un ataque',\n");
console.log('ops: ' + ops);
