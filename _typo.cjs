const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
['vsDef.isPuppetOt)', 'vsDef.isPuppetOt){', 'cl.vsDef.isPuppetOt|'].forEach(function (s) {
  if (t.includes(s)) { t = t.split(s).join(s.replace('isPuppetOt)', 'isPuppetOf)').replace('isPuppetOt){', 'isPuppetOf){').replace('isPuppetOt|', 'isPuppetOf|')); ops++; }
});
// barrido general por si acaso
t = t.split('isPuppetOt').join('isPuppetOf');
fs.writeFileSync(P, t);
console.log('typo corregido: ' + ops);
