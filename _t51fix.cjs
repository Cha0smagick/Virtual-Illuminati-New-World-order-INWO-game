const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) Hillary: 2+6=8 (pick sum)
t = t.split("    ok(d51d.cthulhu === 6, 'L51 Hillary +6 directo control Bill Clinton -> cthulhu=' + d51d.cthulhu);")
  .join("    ok(d51d.cthulhu === 8, 'L51 Hillary: +2 owner +6 directo control Bill Clinton -> cthulhu=' + d51d.cthulhu);");
ops++;
// 2) LPD: quitar el plant suelto (fixture duplicado) y asertar 4+4=8
const a2 = "    plant(0, 'lp51', idxOfId('localpolicedepartments'), 1);\n    var lpM51 = { uid: 'lpM51', cardId: idxOfId('texas'), children: [{ uid: 'lp51', cardId: idxOfId('localpolicedepartments'), children: [], tokens: 1 }], tokens: 1 };\n    E._raw().players[0].structure.children.push(lpM51);";
if (!t.includes(a2)) throw new Error('ancla LPD no encontrada');
const b2 = "    E._raw().players[0].structure.children.push({ uid: 'lpM51', cardId: idxOfId('texas'), children: [{ uid: 'lp51', cardId: idxOfId('localpolicedepartments'), children: [], tokens: 1 }], tokens: 1 });";
t = t.split(a2).join(b2);
ops++;
t = t.split("    ok(d51f.cthulhu === 4 && d51f.boosts === 1, 'L51 LPD +4 (owner) destroy Criminal y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);")
  .join("    ok(d51f.cthulhu === 8 && d51f.boosts === 1, 'L51 LPD +4 owner +4 directo destroy Criminal, y +1 Power a su master -> ' + d51f.cthulhu + '/' + d51f.boosts);");
ops++;
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
