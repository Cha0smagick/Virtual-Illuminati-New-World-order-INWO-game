const fs = require('fs');
const P = 'game/js/app.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes('onUseGroupAction')) { console.log('ya'); process.exit(0); }
const a = '  onCwsRefuel: function () {';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla no encontrada');
const L = '\n';
const b = '  /* L46 - accion de grupo: el motor aplica los defaults (primer rival / primera Plot expuesta). */' + L +
'  onUseGroupAction: function (uid) {' + L +
'    try {' + L +
'      var stG = E.getState();' + L +
'      E.useGroupAction(stG.currentPid, uid, {});' + L +
"      after('Accion de grupo usada');" + L +
'    } catch (e) { log("! " + e.message); }' + L +
'  },' + L + L;
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('CB ok');
