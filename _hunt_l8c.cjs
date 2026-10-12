const { execFileSync } = require('child_process');
let caught = 0;
for (let i = 1; i <= 25 && caught < 3; i++) {
  for (const t of ['test_fase2_rules.js', 'test_p0_invariants.js']) {
    try {
      execFileSync('node', [t], { stdio: 'pipe' });
    } catch (e) {
      caught++;
      console.log('\n===== ' + t + ' FAILED (iteration ' + i + ') =====');
      const out = (e.stdout || '').toString();
      const err = (e.stderr || '').toString();
      const outLines = out.split('\n');
      console.log('--- stdout tail (30) ---');
      console.log(outLines.slice(-30).join('\n'));
      console.log('--- stderr (20) ---');
      console.log(err.split('\n').slice(-20).join('\n'));
    }
  }
}
console.log(caught === 0 ? '\nNO FAILURES IN 25 ROUNDS (50 runs)' : '\ncaught ' + caught + ' failures');
