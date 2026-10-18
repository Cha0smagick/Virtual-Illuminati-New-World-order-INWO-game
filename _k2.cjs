const fs = require('fs');
const P = 'game/js/ui.js';
let t = fs.readFileSync(P, 'utf8');
t = t.replace("  group_action: Accion de grupo activa (gasta su ficha),", "  group_action: 'Accion de grupo activa (gasta su ficha)',");
t = t.replace("  hand_limit_bonus: Amplia el limite de Plot en mano,", "  hand_limit_bonus: 'Amplia el limite de Plot en mano mientras se le controle',");
fs.writeFileSync(P, t);
console.log('comillas ok');
