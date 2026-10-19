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
// 1) quitar el bloque suelto (tras L47_FXN)
const loose = '\n' + block + '\n';
if (!t.includes(loose)) throw new Error('bloque suelto no encontrado');
t = t.replace(loose, '\n');
// 2) insertarlo antes del cierre del objeto L47_FX
const closeAnchor = "    t: 'Phone Company During your turn, you may draw any two hidden Plot cards randomly from the hand of a rival, and look at them. This is a free move. At any time, the Phone Company may use its action to draw any two hidden Plot cards randomly from the hand of a rival and expose them!'\n  };";
if (!t.includes(closeAnchor)) throw new Error('cierre de L47_FX no encontrado');
t = t.replace(closeAnchor, closeAnchor.replace('\n  };', ',\n' + block + '\n  };'));
fs.writeFileSync(P, t);
console.log('L47_FX reparado');
