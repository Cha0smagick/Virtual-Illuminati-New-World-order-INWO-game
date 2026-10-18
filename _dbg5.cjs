const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (!t.includes('GAB-DUMP')) {
  t = t.replace(
    "    console.log('GAB-VISITA',nd.uid);",
    "    console.log('GAB-VISITA',JSON.stringify({uid:nd.uid,cardId:nd.cardId,kids:(nd.children||[]).length}));"
  );
  fs.writeFileSync(P, t);
  console.log('dump ok');
} else console.log('ya');
