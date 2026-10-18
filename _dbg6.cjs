const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (!t.includes('GAB-ANTESWALK')) {
  t = t.replace(
    "  var v=0;\n  walk(st,function(nd){",
    "  var v=0;\n  if(typeof DBG45!=='undefined'&&DBG45)console.log('GAB-ANTESWALK st=',st.uid,'kids=',(st.children||[]).length,'walkType=',typeof walk);\n  walk(st,function(nd){"
  );
  fs.writeFileSync(P, t);
  console.log('ok');
} else console.log('ya');
