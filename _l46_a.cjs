const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function rep(a, b) {
  if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 50));
  t = t.split(a).join(b);
  ops++;
}
// 1) el privilegio ya no cierra la entrada a los grupos con breakPrivilege
rep("    throw new Error('El ataque es PRIVILEGIADO: solo el atacante y el defensor pueden participar');",
    "     &&!privilegeBreakBy(entry.uid))\n    throw new Error('El ataque es PRIVILEGIADO: solo el atacante y el defensor pueden participar');");
// 2) fiMatch43: onlyPrivileged
rep("function fiMatch43(fi,tNode,tCard,selfUid){\n  if(!fi)return false;\n  var vs=fi.vs||{};",
    "function fiMatch43(fi,tNode,tCard,selfUid){\n  if(!fi)return false;\n  /* L46: fi.onlyPrivileged — solo habilita la entrada en ataques PRIVILEGIADOS. */\n  if(fi.onlyPrivileged&&!(S.attack&&S.attack.privilege))return false;\n  var vs=fi.vs||{};");
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
