const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const pat = /if \(failures\.length\) \{/;
if (t.includes('if (failures.length)') && !/\}\);\s*\n\s*\nif \(failures\.length\)/.test(t)) {
  t = t.replace(pat, '})();\n\nif (failures.length) {');
  fs.writeFileSync(P, t);
  console.log('cierre restaurado');
} else { console.log('ya tenia cierre'); }
