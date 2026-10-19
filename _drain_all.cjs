const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let n = 0;
t = t.split('E.endTurn();').join('clear24(); E.endTurn();'); n++;
while (t.indexOf('clear24(); clear24();') >= 0) t = t.split('clear24(); clear24();').join('clear24();');
while (t.indexOf('clear24();clear24();') >= 0) t = t.split('clear24();clear24();').join('clear24();');
// no romper los casos que ESPERAN rechazo de endTurn (si los hubiera en fase2)
t = t.replace(/clear24\(\); (\w*[Ee]ndTurn)\([^;]*\)[^;]*;\s*\/\* *rechaz/g, '$1');
fs.writeFileSync(P, t);
console.log('drenaje global aplicado');
