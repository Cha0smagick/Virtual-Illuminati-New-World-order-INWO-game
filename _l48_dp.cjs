const fs = require('fs');
const P = 'gen_cards.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
// 1) quitar Dinosaur Park del L48 (su +4 es ACCION al jugar el Disaster, no pasiva)
const start = t.indexOf("  'Dinosaur Park': {");
if (start < 0) throw new Error('DP no encontrado');
const end = t.indexOf("  'Science Fiction Fans': {");
if (end < 0 || end <= start) throw new Error('cierre DP no encontrado');
t = t.slice(0, start) + t.slice(end);
// marca la interpretacion en el comentario del bloque
t = t.replace(' *   grant.excludeSelf / attack_immune.notAttr - Princess Di. */',
  ' *   grant.excludeSelf / attack_immune.notAttr - Princess Di.\n * FUERA (pieza pendiente): Dinosaur Park (+4 a un Disaster) es ACCION al jugar el\n * Disaster, como disaster_mod de Weather Satellite: mapearla como pasiva\n * automatica rompia la matematica de los Desasters (regresion L13). */');
fs.writeFileSync(P, t);
console.log('DP fuera');
