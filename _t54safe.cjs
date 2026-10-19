const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// Todos los resolveAttack que agregue deben ir protegidos.
// Forma A: 'try { E.resolveAttack(); } catch (e) { }' (ya seguros)
// Buscamos resolve directos dentro del bloque L54 (los que quedaron sin try)
const lines = t.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const idx = l.indexOf('E.resolveAttack();');
  if (idx < 0) continue;
  const prev = lines[i - 1] || '';
  const prev2 = lines[i - 2] || '';
  if (!(prev.indexOf('try {') >= 0 || prev2.indexOf('try {') >= 0)) {
    // reemplazar la linea por version segura
    const indent = l.slice(0, idx).length;
    const pad = l.match(/^\s*/)[0];
    lines[i] = pad + 'try { E.resolveAttack(); } catch (e54z) { }';
    ops++;
  }
}
t = lines.join('\n');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
