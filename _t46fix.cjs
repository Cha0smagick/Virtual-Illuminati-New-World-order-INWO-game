const fs = require('fs');
['a', 'b', 'c'].forEach(function (k) {
  const f = '_t46' + k + '.cjs';
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace("    ok(d45d.boosts === 2, 'L45 Recording Industry +2 Power al Media Personality atacante -> boosts=' + d45d.boosts);",
    "ok(d45d.boosts === 2,");
  s = s.replace('    ok(E._raw().players[0].hand.length === 6, "L46 Conspiracy Theorists: 6 Plots al fin de turno (limite +1) -> " + E._raw().players[0].hand.length);',
    'ok(E._raw().players[0].hand.length === 6,');
  fs.writeFileSync(f, s);
});
console.log('anclas corregidas');
