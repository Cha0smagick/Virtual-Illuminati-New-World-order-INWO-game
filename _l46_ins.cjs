const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function ins(marker, anchor, block) {
  if (t.includes(marker)) { console.log('ya: ' + marker); return; }
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('ancla no encontrada: ' + anchor.slice(0, 60));
  t = t.slice(0, i) + block + t.slice(i);
  ops++;
}
const fr = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
// 1) hand limit
ins('handLimitBonusOf', 'function plotHandLimitOf(pid){', fr('_f1.txt'));
// 2) useGroupAction (dos mitades)
ins('E.useGroupAction', '/* aid/oppose entries: {uid,power} — eligibility checked here */', fr('_f2a.txt') + fr('_f2b.txt') + fr('_f3.txt'));
// 3) el cuerpo de plotHandLimitOf original: sumar el bonus
if (!t.includes('return base+handLimitBonusOf(pid);')) {
  const a = "  var e=illuEff(pid);\n  return (typeof e.plotHandLimit==='number')?e.plotHandLimit:5;\n}";
  if (!t.includes(a)) throw new Error('ancla plotHandLimit cuerpo no encontrada');
  t = t.replace(a, "  var e=illuEff(pid);\n  var base=(typeof e.plotHandLimit==='number')?e.plotHandLimit:5;\n  return base+handLimitBonusOf(pid);\n}");
  ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
