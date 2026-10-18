const fs = require('fs');
const P = 'game/js/ui.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes("act === 'ga'")) { console.log('ya'); process.exit(0); }
const a = "    else if (act === 'gadgetuse')";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla no encontrada');
const b = "    else if (act === 'ga') { var gaUid = btn.getAttribute('data-uid'); if (!gaUid) return; CB.onUseGroupAction(gaUid); }\n";
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('delegador ok');
