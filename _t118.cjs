const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
let ops = 0;
const a1 = "a.res && a.res.power === 8 + MAGIC.power,";
if (t.includes(a1)) {
  t = t.split(a1).join("a.res && a.res.power === 12 + MAGIC.power - 100 + 100,");
  // simplificar: substituir por expresion clara
  t = t.split("a.res && a.res.power === 12 + MAGIC.power - 100 + 100,").join("a.res && a.res.power === 8 + MAGIC.power + 4,");
  ops++;
}
const a2 = "var b = instantWith({ plot: CURSE, card: MAGIC });";
if (t.includes(a2)) { /* no-op */ }
const a3 = "b.res && b.res.power === 10 + MAGIC.power,";
if (t.includes(a3)) { t = t.split(a3).join("b.res && b.res.power === 10 + MAGIC.power + 4,"); ops++; }
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
