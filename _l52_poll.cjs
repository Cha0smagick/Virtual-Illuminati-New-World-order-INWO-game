const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('pollster_shield')) { console.log('ya'); process.exit(0); }
const a = "  if(alignMag!==4)det.notes.push('Regla de alineaciones alterada por '+S.alignRule.card+': +/-'+alignMag+' por alineacion');";
if (!t.includes(a)) throw new Error('ancla alignMag no encontrada');
const L = '\n';
const b = a + L +
"  /* L52 - Pollsters: si su dueno es atacante o defensor, las penalizaciones de alineacion que irian CONTRA EL se anulan. */" + L +
"  (function(){" + L +
"    var hasP=false;" + L +
"    [A.pid,A.targetPid].forEach(function(q52){if(hasP||q52==null||q52<0||!S.players[q52])return;walk(S.players[q52].structure,function(n52){if(hasP||n52.cardId==null)return;var pc52=card(n52.cardId);if(pc52&&pc52.effect&&pc52.effect.kind==='pollster_shield')hasP=true;});});" + L +
"    if(hasP&&det.leaderMod<0){det.notes.push('Pollsters: penalizaciones de alineacion anuladas');det.leaderMod=0;}" + L +
"  })();";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('pollsters ok');
