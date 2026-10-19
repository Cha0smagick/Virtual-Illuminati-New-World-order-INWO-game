const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// limpiar placeholder previo si existe
const startIdx = t.indexOf('  /* ===== L54 - Church of Elvis');
if (startIdx >= 0) {
  const endIdx = t.indexOf("  } else { ok(true, \"P2-R54 (Elvis) SKIP\"); }", startIdx);
  if (endIdx > 0) { t = t.slice(0, startIdx) + t.slice(endIdx + "  } else { ok(true, \"P2-R54 (Elvis) SKIP\"); }".length); ops++; }
}
if (t.indexOf('P2-R54 Church of Elvis poder alternativo') >= 0) { console.log('ya'); process.exit(0); }
const a = "    ok(d53c.defenseBonus === 4, 'L53 Lawyers +4 defensa contra ataque Gov -> defBonus=' + d53c.defenseBonus);";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla');
const nl = '\n';
const b = a + nl +
'  /* ===== L54 - Church of Elvis (power_if_card) y South American Nazis ===== */' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    plant(0, 'ce54', idxOfId('churchofelvis'), 1);" + nl +
"    plant(1, 'ceT54', idxOfId('fbi'), 1);" + nl +
"    E.declareAttack(0, 'control', { attackerUid: 'ce54', uid: 'ceT54' });" + nl +
"    var d54a = E.previewStrength();" + nl +
"    E._raw().players[0].structure.children.push({ uid: 'elv54', cardId: idxOfId('elvis'), children: [], tokens: 0 });" + nl +
"    var d54b = E.previewStrength();" + nl +
"    ok(d54b.base === 8, 'P2-R54 Church of Elvis -> poder 8 cuando el dueno controla a Elvis -> base=' + d54b.base + ' (antes ' + d54a.base + ')');" + nl +
'  } else { ok(true, "P2-R54 (Elvis) SKIP"); }' + nl +
'  fresh(idxOfId(U), idxOfId(V));' + nl +
'  if (readyToAttack(0) != null) {' + nl +
"    var ws54 = -1;" + nl +
"    for (var z54 = 0; z54 < C.cards.length; z54++) { var zc54 = C.cards[z54]; if (zc54.type === 'group' && (zc54.alignments || []).indexOf('weird') >= 0 && (zc54.attributes || []).indexOf('science') >= 0 && z54 !== idxOfId('southamericannazis')) { ws54 = z54; break; } }" + nl +
"    if (ws54 < 0) ws54 = idxOfId('southamericannazis');" + nl +
"    plant(0, 'san54', idxOfId('southamericannazis'), 1);" + nl +
"    plant(1, 'wsT54', ws54, 1);" + nl +
"    E.declareAttack(0, 'control', { attackerUid: 'san54', uid: 'wsT54' });" + nl +
"    var d54c = E.previewStrength();" + nl +
"    ok(d54c.cthulhu === 6, 'P2-R54 South American Nazis +6 directo control Weird Science -> cthulhu=' + d54c.cthulhu);" + nl +
'  } else { ok(true, "P2-R54 (SAN) SKIP"); }' + nl;
t = t.slice(0, i + a.length) + nl + b.slice(a.length + 1) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
