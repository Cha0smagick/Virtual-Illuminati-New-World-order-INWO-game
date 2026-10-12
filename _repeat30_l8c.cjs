const { execFileSync } = require('child_process');
let fails = 0;
for (let i = 1; i <= 30; i++) {
  for (const t of ['test_fase2_rules.js', 'test_fase4_cards.js', 'test_p0_invariants.js']) {
    try {
      execFileSync('node', [t], { stdio: 'pipe' });
    } catch (e) {
      fails++;
      console.log('ROUND ' + i + ' FAIL: ' + t);
      const out = (e.stdout || '').toString();
      console.log(out.split('\n').filter(l => /FAIL/.test(l)).slice(0, 6).join('\n'));
    }
  }
  process.stdout.write(i + ' ');
}
console.log('');
console.log(fails === 0 ? '30/30 CONSECUTIVE RUNS: ALL PASS (90 executions, 0 failures)' : 'FAILURES: ' + fails);
process.exit(fails === 0 ? 0 : 1);
