const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('fi.vsList.some')) { console.log('ya'); process.exit(0); }
const a = "  var vs=fi.vs||{};";
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla no encontrada');
const b = a + "\n  /* L48 - fi.vsList: calificadores alternativos (Dinosaur Park). */\n  if(Array.isArray(fi.vsList)&&fi.vsList.length){\n    var okL=fi.vsList.some(function(vL){return vsMatchQ(vL,findNode(S.attack?S.attack.attackerUid:null),card((S.attack&&findNode(S.attack.attackerUid))?findNode(S.attack.attackerUid).cardId:null))&&vsMatchQ(vL,tNode,tCard);});\n    if(!okL)return false;\n  }";
t = t.slice(0, i + a.length) + b.slice(a.length) + t.slice(i + a.length);
fs.writeFileSync(P, t);
console.log('A ok');
