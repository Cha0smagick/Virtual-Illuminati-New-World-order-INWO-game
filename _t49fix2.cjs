const fs = require('fs');
const P = 'test_fase2_rules.js';
let L = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n').split('\n');
let msgIdx = -1;
for (let i = 0; i < L.length; i++) if (L[i].indexOf('L45 A.M.A. free_interfere') >= 0) msgIdx = i;
if (msgIdx < 0) throw new Error('mensaje no encontrado');
const msg = L[msgIdx];
L.splice(msgIdx, 1);
// tras la linea del ok abierta
let okIdx = -1;
for (let i = 0; i < L.length; i++) if (L[i].indexOf("ok(e45b === '' && o45 && o45.power === 8,") >= 0) { okIdx = i; break; }
if (okIdx < 0) throw new Error('ok abierto no encontrado');
L.splice(okIdx + 1, 0, msg);
fs.writeFileSync(P, L.join('\n'));
console.log('aserto AMA cerrado');
