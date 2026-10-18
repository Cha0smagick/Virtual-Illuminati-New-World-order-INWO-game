const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function rep(a, b) {
  if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 50));
  t = t.split(a).join(b);
  ops++;
}
// el push deshace el privilegio (Moonies, Religious Reich, Israel)
rep("  (entry.oppose?A.opposes:A.aids).push({uid:entry.uid,name:sc.name,power:pw});\n  log((entry.oppose?'Se OPONE ':'Ayuda ')+sc.name+' (+'+pw+')');",
    "  (entry.oppose?A.opposes:A.aids).push({uid:entry.uid,name:sc.name,power:pw});\n  /* L46: el privilegio se deshace para todos. */\n  if(A.privilege&&privilegeBreakBy(entry.uid)){A.privilege=false;log(sc.name+' interfiere y DESHACE el privilegio del ataque');}\n  log((entry.oppose?'Se OPONE ':'Ayuda ')+sc.name+' (+'+pw+')');");
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
