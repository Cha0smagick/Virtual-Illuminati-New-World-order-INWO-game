const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const start = t.indexOf('  /* ===== L53 - Ninjas');
if (start < 0) { console.log('sin L53'); process.exit(0); }
const end = t.indexOf('\n})();', start);
if (end < 0) throw new Error('sin cierre');
t = t.slice(0, start) + t.slice(end + '\n})();'.length);
fs.writeFileSync(P, t);
console.log('L53-L55 recortado, test como en c655e17');
