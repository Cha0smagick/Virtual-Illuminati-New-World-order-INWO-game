const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const oldBlock = [
"  /* L52 - Pollsters: si su dueno es atacante o defensor, las penalizaciones de alineacion que irian CONTRA EL se anulan. */",
"  (function(){",
"    var hasP=false;",
"    [A.pid,A.targetPid].forEach(function(q52){if(hasP||q52==null||q52<0||!S.players[q52])return;walk(S.players[q52].structure,function(n52){if(hasP||n52.cardId==null)return;var pc52=card(n52.cardId);if(pc52&&pc52.effect&&pc52.effect.kind==='pollster_shield')hasP=true;});});",
"    if(hasP&&det.leaderMod<0){det.notes.push('Pollsters: penalizaciones de alineacion anuladas');det.leaderMod=0;}",
"  })();"
].join('\n');
if (!t.includes(oldBlock)) throw new Error('bloque pollster no encontrado');
t = t.split(oldBlock).join('');
const anchor = "  A.aids.forEach(function(a){det.aids+=a.power;});";
if (!t.includes(anchor)) throw new Error('ancla aids no encontrada');
t = t.split(anchor).join(oldBlock + '\n' + anchor);
fs.writeFileSync(P, t);
console.log('pollster movido tras leaderMod');
