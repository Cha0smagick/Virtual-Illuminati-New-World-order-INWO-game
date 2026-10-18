const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes('L46 Conspiracy')) { console.log('ya'); process.exit(0); }
const a = "ok(d45d.boosts === 2,";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const L = '\n';
const b = a + L +
'  /* ===== L46 - acciones de grupo, limite de mano, privilege break ===== */' + L +
'  fresh(idxOfId(U), idxOfId(V));' + L +
'  if (readyToAttack(0) != null) {' + L +
"    plant(0, 'ct46', idxOfId('conspiracytheorists'), 1);" + L +
'    var plots46 = [];' + L +
'    for (var i46 = 0; i46 < C.cards.length && plots46.length < 6; i46++) if (C.cards[i46].type === "plot") plots46.push(i46);' + L +
'    E._raw().players[0].hand = plots46;' + L +
'    clear24(); E.endTurn();' + L +
'ok(E._raw().players[0].hand.length === 6,' + L +
'  } else { ok(true, "L46 (CT) SKIP"); }' + L;
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('CT ok');
