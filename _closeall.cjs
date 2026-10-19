const fs = require('fs');
const P = 'test_fase2_rules.js';
let L = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n').split('\n');
let ops = 0;
let start = -1;
for (let i = 0; i < L.length; i++) if (L[i].indexOf('/* ===== L48') >= 0) { start = i; break; }
if (start < 0) throw new Error('bloque L48 no encontrado');
// 1) definir helper al inicio del rango
if (L[start].indexOf('p52close') < 0) {
  L[start] = L[start] + "\n  function p52close() { try { var a52 = E._raw().attack; if (a52 && !a52.resolved) { var r52 = Math.random; Math.random = function () { return 0.99; }; try { E.resolveAttack(); } catch (e52) { } Math.random = r52; E._raw().attack = null; } } catch (e52x) { } }";
  ops++;
}
// 2) insertar p52close() tras cada "} else { ok(true, ..." dentro del rango
let added = 0;
for (let i = start + 1; i < L.length; i++) {
  const l = L[i];
  if (l.indexOf("} else { ok(true,") >= 0 && l.indexOf("SKIP") >= 0) {
    if ((L[i - 1] || '').indexOf('p52close()') < 0) {
      L.splice(i + 1, 0, "  p52close();");
      added++; ops++;
      i++;
    }
  }
}
fs.writeFileSync(P, L.join('\n'));
console.log('ops: ' + ops);
