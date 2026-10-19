const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function closeAfter(marker) {
  if (!t.includes(marker)) return;
  if (t.slice(0, t.indexOf(marker) + marker.length).indexOf('X54CLOSE') >= 0) return;
}
// Cerrar ataques: insertar resolve+mock tras cada ok(...) que termine bloque con ataque abierto
const fixes = [
  ["    ok(d53a.cthulhu === 2, 'L53 Ninjas +2 (owner) destroy -> cthulhu=' + d53a.cthulhu);",
   "    ok(d53a.cthulhu === 2, 'L53 Ninjas +2 (owner) destroy -> cthulhu=' + d53a.cthulhu);\n    var clR53 = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e53x) { }\n    Math.random = clR53;"],
  ["    ok(njT53 && njT53.tokens === 2, 'L53 Ninjas recupera su ficha tras el intento fallido -> tokens=' + (njT53 && njT53.tokens));",
   "    ok(njT53 && njT53.tokens === 2, 'L53 Ninjas recupera su ficha tras el intento fallido -> tokens=' + (njT53 && njT53.tokens));\n    var clR53b = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e53y) { }\n    Math.random = clR53b;"],
  ["    ok(E._raw().players[0].hand.length === hb53 + 1, 'L53 Underground Newspapers roba una Plot al ayudar a destruir Gov');",
   "    ok(E._raw().players[0].hand.length === hb53 + 1, 'L53 Underground Newspapers roba una Plot al ayudar a destruir Gov');\n    var clR53c = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e53z) { }\n    Math.random = clR53c;"],
  ["    ok(d53c.defenseBonus === 4, 'L53 Lawyers +4 defensa contra ataque Gov -> defBonus=' + d53c.defenseBonus);",
   "    ok(d53c.defenseBonus === 4, 'L53 Lawyers +4 defensa contra ataque Gov -> defBonus=' + d53c.defenseBonus);\n    var clR53d = Math.random; Math.random = function () { return 0.5; };\n    try { E.resolveAttack(); } catch (e53w) { }\n    Math.random = clR53d;"]
];
fixes.forEach(function (f) {
  if (t.includes(f[0]) && !t.includes(f[1])) { t = t.split(f[0]).join(f[1]); ops++; }
});
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
