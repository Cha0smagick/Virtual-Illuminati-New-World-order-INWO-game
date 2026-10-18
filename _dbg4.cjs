const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (!t.includes('GAB-WALK')) {
  t = t.replace(
    "function walk(node,fn){fn(node);",
    "function walk(node,fn){if(typeof DBG45!=='undefined'&&DBG45&&node&&node.uid)console.log('GAB-WALK',node.uid);fn(node);"
  );
  fs.writeFileSync(P, t);
  console.log('walk instrumentado');
} else console.log('ya');
