const fs = require('fs');
const NL = String.fromCharCode(10);
let ops = 0;
function ins(file, anchor, lines) {
  let f = fs.readFileSync(file, 'utf8');
  if (f.includes(lines[0])) { console.log('ya: ' + file); return; }
  const i = f.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada en ' + file);
  f = f.slice(0, i) + lines.join(NL) + NL + f.slice(i);
  fs.writeFileSync(file, f);
  ops++;
}
ins('game/js/engine.js', "    case 'opec_roll':", [
  "    case 'punk_ban_aids':",
  "      throw new Error(c.name+': habilidad pasiva — ningun Weird o Liberal ayuda al objetivo cuando participa');"
]);
ins('game/js/ui.js', "  opec_roll: 'Fija su Poder con 2d6-2 al empezar el turno',", [
  "  punk_ban_aids: 'Veta las ayudas Weird/Liberal al objetivo',"
]);
console.log('ops: ' + ops);
