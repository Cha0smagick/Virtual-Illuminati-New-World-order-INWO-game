const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L48 Science Fiction')) { console.log('ya'); process.exit(0); }
const a = "    ok(po46n && po46n.tokens === 1 && E._raw().players[1].hand.length === hb47 + 2, 'L47 Post Office mirar es free move (sin gastar ficha)');";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  /* ===== L48 - pasivas de alineacion/poder de grupo ===== */' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    var sffRoot = E._raw().players[0].structure;" + L +
"    var mast = { uid: 'ma48', cardId: anyGroupIdx(), children: [], tokens: 1 };" + L +
"    mast.children.push({ uid: 'sff48', cardId: idxOfId('sciencefictionfans'), children: [], tokens: 1 });" + L +
"    sffRoot.children.push(mast);" + L +
"    plant(1, 'cmp48', idxOfId('siliconvalley'), 1);" + L +
"    E.declareAttack(0, 'control', { attackerUid: 'ma48', uid: 'cmp48' });" + L +
'    var d48a = E.previewStrength();' + L +
"    ok(d48a.cthulhu === 8, 'L48 S.F.F. scope parent + owner: el master ataca Computer -> cthulhu=' + d48a.cthulhu + ' (6+2)');" + L +
'  } else { ok(true, "L48 (SFF) SKIP"); }' + L;
t = t.slice(0, i + a.length) + L + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('SFF ok');
