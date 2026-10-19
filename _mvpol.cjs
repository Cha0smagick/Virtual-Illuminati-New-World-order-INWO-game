const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const L = t.split('\n');
// bloque actual: desde 'L52 - Pollsters' hasta el cierre '  })();' inclusive
let i0 = -1;
for (let i = 0; i < L.length; i++) if (L[i].indexOf('L52 - Pollsters') >= 0) { i0 = i; break; }
if (i0 < 0) throw new Error('no encontrado');
let i1 = -1;
for (let i = i0; i < L.length; i++) if (L[i].trim() === '})();') { i1 = i; break; }
if (i1 < 0) throw new Error('cierre no encontrado');
const bloque = L.slice(i0, i1 + 1).join('\n');
// lo quitamos del sitio actual
L.splice(i0, i1 - i0 + 1);
// lo insertamos tras el 'A.aids.forEach' de computeStrength (primera aparicion tras el bloque de det)
let anchors = [];
for (let i = 0; i < L.length; i++) if (L[i].indexOf('A.aids.forEach(function(a){det.aids+=a.power;});') >= 0) anchors.push(i);
if (!anchors.length) throw new Error('ancla aids no encontrada');
const ai = anchors[0];
L.splice(ai + 1, 0, bloque);
fs.writeFileSync(P, L.join('\n'));
console.log('movido a linea', ai + 2);
