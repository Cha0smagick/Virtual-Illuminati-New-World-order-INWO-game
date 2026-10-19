const fs = require('fs');
const P = 'test_fase2_rules.js';
let s = fs.readFileSync('_t49.cjs', 'utf8');
s = s.replace("    ok(e48b === '' && o48 && o48.power === 8,", "  ok(e45b === '' && o45 && o45.power === 8,");
s = s.replace("t = t.slice(0, i) + b + t.slice(i);\nfs.writeFileSync(P, t);", "t = t.slice(0, i + a.length) + '\\n' + b.slice(a.length + 1) + t.slice(i + a.length);\nfs.writeFileSync(P, t);");
fs.writeFileSync('_t49.cjs', s);
console.log('corregido');
