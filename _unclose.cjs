const fs = require('fs');
const P = 'test_fase2_rules.js';
let L = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n').split('\n');
const out = [];
let skipNext = 0;
for (let i = 0; i < L.length; i++) {
  const l = L[i];
  if (l.indexOf('p52close') >= 0) { continue; }
  if (/var (clR|realR|ciR)5[0-9]/.test(l)) { skipNext = 3; continue; }
  if (skipNext > 0) { skipNext--; continue; }
  out.push(l);
}
fs.writeFileSync(P, out.join('\n'));
console.log('limpieza ok');
