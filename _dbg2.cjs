const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8');
if (!t.includes('DBG45CALL')) {
  t = t.replace(
    "var abD41=groupAttackBonus(A.pid,att,attCard,'destroy',tNode,tCard,det.notes);",
    "var abD41=groupAttackBonus(A.pid,att,attCard,'destroy',tNode,tCard,det.notes);if(typeof DBG45!=='undefined'&&DBG45)console.log('DBG45CALL pid=',A.pid,'att=',att&&att.uid,'stKids=',(S.players[A.pid].structure.children||[]).length);"
  );
  fs.writeFileSync(P, t);
  console.log('dbg2 ok');
} else console.log('ya');
