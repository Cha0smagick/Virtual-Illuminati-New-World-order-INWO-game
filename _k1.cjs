const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes("case 'group_action':")) { console.log('ya'); process.exit(0); }
const a = "    case 'no_goal_destroy':";
const b = "    case 'group_action':\n      throw new Error(c.name+': habilidad activa: se usa con su accion, no jugandola');\n    case 'hand_limit_bonus':\n      throw new Error(c.name+': habilidad pasiva: su bonus de limite se aplica mientras se le controle');\n";
t = t.split(a).join(b + a);
fs.writeFileSync(P, t);
console.log('cases ok');
