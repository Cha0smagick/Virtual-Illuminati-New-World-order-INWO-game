const { execFileSync } = require('child_process');
let caught = 0;
for (let i = 1; i <= 45 && caught < 2; i++) {
  try {
    execFileSync('node', ['test_p0_invariants.js'], { stdio: 'pipe' });
  } catch (e) {
    caught++;
    console.log('\n===== test_p0_invariants.js FAILED (iteration ' + i + ') =====');
    const out = (e.stdout || '').toString();
    const err = (e.stderr || '').toString();
    console.log('--- stdout FAIL lines ---');
    console.log(out.split('\n').filter(l => /FAIL|ok   -/.test(l)).slice(-12).join('\n'));
    console.log('--- stderr tail (25) ---');
    console.log(err.split('\n').slice(-25).join('\n'));
  }
}
console.log(caught === 0 ? '\nNO P0 FAILURES IN 45 RUNS' : '\ncaught ' + caught + ' p0 failures');
