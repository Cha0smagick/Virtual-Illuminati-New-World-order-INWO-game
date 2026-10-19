const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
const a = "    ok(d52c.leaderMod === 0, 'L52 Pollsters anula la penalizacion de alineacion -> leaderMod=' + d52c.leaderMod);";
const i = t.indexOf(a);
if (i < 0) throw new Error('no ancla');
if (t.slice(i + a.length, i + a.length + 40).indexOf('L52 (Pollsters) SKIP') >= 0) {
  console.log('ya tenia else'); process.exit(0);
}
t = t.slice(0, i + a.length) + '\n  } else { ok(true, "L52 (Pollsters) SKIP"); }' + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('pollsters else ok');
