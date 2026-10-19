const fs = require('fs');
const src = 'test_fase2_rules.js';
let t = fs.readFileSync(src, 'utf8');
if (!t.includes('global.GDB_DBG=true;')) {
  t = t.replace('global.window = {};', 'global.GDB_DBG=true;\nglobal.window = {};');
  fs.writeFileSync('_f2dbg.js', t);
  console.log('_f2dbg.js creado');
} else console.log('ya');
