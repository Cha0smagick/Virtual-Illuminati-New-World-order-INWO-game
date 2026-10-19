const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) revertir el drenaje masivo
t = t.split('clear24(); E.endTurn();').join('E.endTurn();');
while (t.indexOf('clear24();clear24();') >= 0) t = t.split('clear24();clear24();').join('clear24();');
ops++;
// 2) reinsetar los puntales que YA existian antes (por contexto)
const pillars = [
  ["    E.endTurn();\n  }\n  return null;\n}", "    clear24(); E.endTurn();\n  }\n  return null;\n}"],
  ["      E.endTurn();\n    }\n    clear24();\n    var f = E._raw();", "      clear24(); E.endTurn();\n    }\n    clear24();\n    var f = E._raw();"],
  ["    E._raw().players[0].hand = plots46;\n    E.endTurn();", "    E._raw().players[0].hand = plots46;\n    clear24(); E.endTurn();"],
  ["    E.endTurn(); E.endTurn();\n    var d40 = null;", "    clear24(); E.endTurn(); clear24(); E.endTurn();\n    var d40 = null;"]
];
pillars.forEach(function (p) {
  if (t.includes(p[0]) && t.indexOf(p[0]) !== t.lastIndexOf(p[0])) {
    t = t.split(p[0]).join(p[1]);
    t = t.split(t.slice(0, 0) + p[1] + p[1]).join(p[1]); // colapsar dobles
  } else if (t.includes(p[0])) {
    t = t.split(p[0]).join(p[1]);
  }
});
fs.writeFileSync(P, t);
console.log('reversion + puntales');
