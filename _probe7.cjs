const fs = require('fs');
function show(file, from, to) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log('\n--- ' + file + ' ' + (from + 1) + '-' + (to + 1) + ' ---');
  for (let j = from; j <= Math.min(to, lines.length - 1); j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
}
show('test_ui.js', 18, 62);
show('test_engine.js', 1, 60);
