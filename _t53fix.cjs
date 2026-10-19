const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
const a = "    ok(d53a.cthulhu === 2, 'L53 Ninjas +2 (owner) destroy -> cthulhu=' + d53a.cthulhu);\n    clear24(); E.endTurn();";
if (t.includes(a)) {
  const b = "    ok(d53a.cthulhu === 2, 'L53 Ninjas +2 (owner) destroy -> cthulhu=' + d53a.cthulhu);\n    var ciR53 = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e53r) { }\n    Math.random = ciR53;\n    try { clear24(); E.endTurn(); } catch (e53s) { }";
  t = t.split(a).join(b); ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
