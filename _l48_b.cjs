const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// C) grant excludeSelf (Princess Di: "all your OTHER Liberal groups")
const cA = "    clauses.forEach(function(cl){\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);\n    });";
const cB = "    clauses.forEach(function(cl){\n      if(cl.excludeSelf&&x.uid===nd.uid)return;\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);\n    });";
if (!t.includes('cl.excludeSelf')) { t = t.split(cA).join(cB); ops++; } else console.log('ya C');
// D) puppet_align dentro de nodeAligns
const dA = "  /* L9 / 332 — Orbital Mind Control Lasers:";
if (!t.includes('puppet_align del MASTER')) {
  const frag = fs.readFileSync('_l48_d.txt', 'utf8').replace(/\r\n/g, '\n');
  t = t.split(dA).join(frag + dA);
  ops++;
} else console.log('ya D');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
