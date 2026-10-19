const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
const a = "attackerUid: 'ninjas', uid: 'cd52b'";
const b = "    var m52b = '';";
if (t.includes('mj52')) { console.log('ya'); process.exit(0); }
if (t.includes(a)) t = t.split(a).join("attackerUid: 'mj52', uid: 'cd52b'");
if (!t.includes('mj52')) { console.log('cambio principal no aplicado'); process.exit(1); }
t = t.split(b).join("    plant(0, 'mj52', idxOfId('templars'), 1);\n" + b);
fs.writeFileSync(P, t);
console.log('ok');
