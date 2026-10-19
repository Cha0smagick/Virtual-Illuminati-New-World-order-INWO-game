const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const block = [
"  'Flat Earthers': {",
"    kind: 'group_action',",
"    act: 'places_roll_draw',",
"    t: 'Flat Earthers For their action, you may roll 2 dice. If your roll is equal to or less than the number of Places you control, the Flat Earthers weird alternate geology has led them to a gold strike, and you may draw as many Plot cards as the number you rolled.'",
"  }"
].join('\n');
const a = "expose them!'\n  }\n};\n\nconst L47_FXN = {};";
const b = "expose them!'\n  },\n" + block + "\n};\n\nconst L47_FXN = {};";
if (!t.includes(a)) throw new Error('patron no encontrado');
t = t.split(a).join(b);
// y quitar el bloque suelto si sigue existiendo tras L47_FXN
t = t.replace('\n' + block + '\n', '\n');
fs.writeFileSync(P, t);
console.log('reparado');
