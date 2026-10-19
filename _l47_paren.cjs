const fs = require('fs');
const P = 'game/js/engine.js';
let lines = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n').split('\n');
// quitar el }; duplicado justo tras el cierre de useGroupAction
let fixed = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '  return out===undefined?publicState():out;' && lines[i + 1] === '};' && lines[i + 2] === '};') {
    lines.splice(i + 2, 1);
    fixed++;
    break;
  }
}
if (!fixed) throw new Error('duplicado no encontrado');
fs.writeFileSync(P, lines.join('\n'));
console.log('duplicado eliminado');
