const fs = require('fs');
function show(file, from, to) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log('\n--- ' + file + ' ' + (from + 1) + '-' + (to + 1) + ' ---');
  for (let j = from; j <= Math.min(to, lines.length - 1); j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
}
function grab(file, re, b, c) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rx = new RegExp(re);
  const hits = [];
  lines.forEach((l, i) => { if (rx.test(l)) hits.push(i); });
  console.log('\n--- ' + file + ' [/' + re + '/] x' + hits.length + ' ---');
  for (const i of hits.slice(0, 2)) {
    for (let j = Math.max(0, i - b); j <= Math.min(lines.length - 1, i + c); j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
  }
}
show('test_p0_invariants.js', 0, 30);
show('test_p0_invariants.js', 100, 170);
grab('game/js/engine.js', 'startGame\\s*[:=]\\s*function|function startGame', 0, 48);
