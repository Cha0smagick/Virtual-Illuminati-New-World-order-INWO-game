const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "    plant(0, 'un53', idxOfId('undergroundnewspapers'), 1);\n    plant(0, 'ci53u', idxOfId('cia'), 1);\n    plant(1, 'tx53u', idxOfId('texas'), 1);\n    E.declareAttack(0, 'destroy', { attackerUid: 'ci53u', uid: 'tx53u' });\n    E.addSupport(0, { uid: 'un53', oppose: false });";
const b = "    plant(0, 'un53', idxOfId('undergroundnewspapers'), 1);\n    plant(1, 'fn53', idxOfId('fbi'), 1);\n    E.declareAttack(0, 'destroy', { attackerUid: 'un53', uid: 'fn53' });";
if (!t.includes(a)) throw new Error('ancla no encontrada');
t = t.split(a).join(b);
const c = "    var hb53 = E._raw().players[0].hand.length;";
if (t.includes(c) && !t.includes('var pwU53')) {
  t = t.split(c).join("    var pwU53 = findN53(E._raw().players[0].structure, 'un53');\n    if (pwU53) pwU53.powerOverride = 15;\n" + c);
}
// helper findN53 si falta
if (!t.includes('function findN53')) {
  t = t.split("  /* ===== L53 - Ninjas / Underground Newspapers / Lawyers ===== */").join(
    "  /* ===== L53 - Ninjas / Underground Newspapers / Lawyers ===== */\n  function findN53(root, uid) { if (!root) return null; if (root.uid === uid) return root; for (var k53 = 0; k53 < (root.children || []).length; k53++) { var r53 = findN53(root.children[k53], uid); if (r53) return r53; } return null; }");
}
fs.writeFileSync(P, t);
console.log('UN como atacante ok');
