'use strict';
/* runner L50: asertos + fase2 + suite */
const { execFileSync } = require('child_process');
const fs = require('fs');
console.log('--- t50 ---');
try { execFileSync(process.execPath, ['_t50.cjs'], { cwd: __dirname, stdio: 'inherit' }); } catch (e) { console.log('t50 fallo'); }
console.log('--- fase2 ---');
try {
  execFileSync(process.execPath, ['test_fase2_rules.js'], { cwd: __dirname, stdio: 'inherit', timeout: 480000 });
  console.log('FASE2 OK');
} catch (e) { console.log('FASE2 FALLO'); }
