const fs = require('fs');
let s = fs.readFileSync('_l45_insert.cjs', 'utf8');
s = s.replace(
  "let t = fs.readFileSync(P, 'utf8');",
  "let t = fs.readFileSync(P, 'utf8').replace(/\\r\\n/g, '\\n');"
);
fs.writeFileSync('_l45_insert.cjs', s);
console.log('patched');
