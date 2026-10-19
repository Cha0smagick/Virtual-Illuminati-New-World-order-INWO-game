const fs = require('fs');
const L = fs.readFileSync('test_fase2_rules.js', 'utf8').split('\n');
let start = -1;
for (let i = 0; i < L.length; i++) if (L[i].indexOf('(function l41Tests') >= 0) { start = i; break; }
console.log('l41Tests empieza en', start + 1);
let bal = 0;
for (let i = start; i < L.length; i++) {
  const l = L[i];
  // ignorar llaves dentro de strings/cadenas de forma grosera
  const stripped = l.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
  for (const ch of stripped) { if (ch === '{') bal++; if (ch === '}') bal--; }
  if (bal === 0 && i > start && l.indexOf('})();') >= 0) { console.log('cierre IIFE en', i + 1); break; }
  if (bal < 0) { console.log('DESBALANCE en linea', i + 1, '->', l.slice(0, 90)); break; }
}
console.log('balance final', bal);
