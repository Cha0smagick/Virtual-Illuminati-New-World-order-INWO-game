const fs = require('fs');
let ops = 0;
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
// 1) roll en computeStrength (rama control)
if (!t.includes('L66 - Imelda Marcos: 1d6')) {
  const a = "    det.base=curPower(att);\n    /* L45: pasivas de poder del atacante (grant + conteo). */";
  if (!t.includes(a)) throw new Error('ancla control no encontrada');
  const f = fs.readFileSync('_f66b.txt', 'utf8').replace(/\r\n/g, '\n');
  const parts = a.split("\n    /* L45");
  t = t.split(a).join(parts[0] + '\n' + f + '\n    /* L45' + parts[1]);
  ops++;
}
// 2) muerte al final de applyAttackResult
if (!t.includes('L66 - Imelda Marcos: si saco 6')) {
  const a2 = "      list.push(A.targetUid);\n    }\n  }\n  S.attack=null;\n}";
  if (!t.includes(a2)) throw new Error('ancla final no encontrada');
  const f2 = fs.readFileSync('_f66c.txt', 'utf8').replace(/\r\n/g, '\n');
  t = t.split(a2).join("      list.push(A.targetUid);\n    }\n  }\n" + f2 + "  S.attack=null;\n}");
  ops++;
}
fs.writeFileSync(P, t);
// 3) gen_cards
const G = 'gen_cards.js';
let g = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n');
if (!g.includes('L66_FXN')) {
  const b = 'for (const k65 in L65_FX) { L65_FXN[norm(k65)] = L65_FX[k65]; }';
  const i = g.indexOf(b);
  if (i < 0) throw new Error('ancla L65 no encontrada');
  const fg = fs.readFileSync('_f66.txt', 'utf8').replace(/\r\n/g, '\n');
  g = g.slice(0, i + b.length) + '\n' + fg + g.slice(i + b.length);
  g = g.replace('|| L65_FXN[key];', '|| L65_FXN[key] || L66_FXN[key];');
  ops++;
}
fs.writeFileSync(G, g);
console.log('ops: ' + ops);
