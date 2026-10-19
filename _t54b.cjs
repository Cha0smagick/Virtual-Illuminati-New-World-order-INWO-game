const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// cerrar ataques abiertos por el bloque L54
const a1 = "    E._raw().players[0].structure.children.push({ uid: 'elv54', cardId: idxOfId('elvis'), children: [], tokens: 0 });";
if (t.includes(a1) && !t.includes('var clR54')) {
  const b1 = a1 + "\n    var clR54 = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e54) { }\n    Math.random = clR54;";
  t = t.split(a1).join(b1); ops++;
}
const a2 = "    ok(d54c.cthulhu === 6, 'P2-R54 South American Nazis +6 directo control Weird Science -> cthulhu=' + d54c.cthulhu);";
if (t.includes(a2) && !t.includes('var clR54b')) {
  const b2 = a2 + "\n    var clR54b = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e54x) { }\n    Math.random = clR54b;";
  t = t.split(a2).join(b2); ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
