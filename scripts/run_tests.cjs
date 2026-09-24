'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const tests = [
  'test_p0_invariants.js',
  'test_engine.js',
  'test_ai_vs_ai.js',
  'test_appflow.js',
  'test_flow.js',
  'test_respond.js',
  'test_ui.js',
  'test_card_research_manifest.js'
];
const failed = [];

for (const file of tests) {
  const absolute = path.join(root, file);
  console.log('\n=== ' + file + ' ===');
  const result = spawnSync(process.execPath, [absolute], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    failed.push(file + ': ' + result.error.message);
  } else if (result.status !== 0) {
    failed.push(file + ': exit ' + result.status);
  }
}

if (failed.length) {
  console.error('\nTEST FAILURES:\n- ' + failed.join('\n- '));
  process.exitCode = 1;
} else {
  console.log('\nALL TESTS PASSED (' + tests.length + ')');
}
