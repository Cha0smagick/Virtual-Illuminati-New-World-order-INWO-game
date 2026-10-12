const { execFileSync } = require('child_process');
let fails = 0;
for (let i = 1; i <= 15; i++) {
  for (const t of ['test_engine.js', 'test_respond.js', 'test_flow.js', 'test_ai_vs_ai.js', 'test_appflow.js', 'test_ui.js']) {
    try {
      execFileSync('node', [t], { stdio: 'pipe' });
    } catch (e) {
      fails++;
      console.log('\n===== ROUND ' + i + ': ' + t + ' FAILED =====');
      const out = (e.stdout || '').toString();
      const err = (e.stderr || '').toString();
      console.log('--- stdout tail (12) ---');
      console.log(out.split('\n').slice(-12).join('\n'));
      console.log('--- stderr tail (12) ---');
      console.log(err.split('\n').slice(-12).join('\n'));
    }
  }
  process.stdout.write(i + ' ');
}
console.log('');
console.log(fails === 0 ? '6 SUITES x 15 ROUNDS (90 runs): ALL PASS' : 'FAILURES: ' + fails);
