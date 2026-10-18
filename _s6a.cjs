const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
const a = "    var m6 = tMsg(function () { E.playPlot(pid6, PG, null, { takeoverHandIdx: RS }); });";
if (!t.includes(a)) throw new Error('no encontrado');
t = t.split(a).join("    clear24(); var m6 = tMsg(function () { E.playPlot(pid6, PG, null, { takeoverHandIdx: RS }); });");
fs.writeFileSync(P, t);
console.log('S6a drenado');
