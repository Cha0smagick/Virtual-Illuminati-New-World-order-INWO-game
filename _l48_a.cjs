const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
function rep(a, b) {
  if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 60));
  if (t.includes(b.slice(0, 50))) { console.log('ya: ' + a.slice(0, 30)); return; }
  t = t.split(a).join(b);
  ops++;
}
// A) fi.vsList: calificadores alternativos (Dinosaur Park: Corporate O Science)
rep("  if(fi.onlyPrivileged&&!(S.attack&&S.attack.privilege))return false;\n  var vs=fi.vs||{};",
    "  if(fi.onlyPrivileged&&!(S.attack&&S.attack.privilege))return false;\n  var vs=fi.vs||{};\n  if(Array.isArray(fi.vsList)&&fi.vsList.length){\n    var okList=fi.vsList.some(function(vL){return vsMatchQ(vL,findNode(S.attack?S.attack.attackerUid:null),null)&&vsMatchQ(vL,tNode,tCard);});\n    if(!okList)return false;\n  }");
// B) scope 'parent' en groupAttackBonus (S.F.F.: el MASTER ataca con el bono)
rep("      if((cl.scope||e.scope||'self')!=='owner'&&nd!==attNode)return; /* 'self': solo el atacante */",
    "      var sc46=cl.scope||e.scope||'self';\n      if(sc46==='parent'&&nd!==attNode){/* verificado abajo */}\n      if(sc46==='parent'){\n        var oPrt=findOwnerPid(attNode?attNode.uid:null);\n        var par46=(oPrt>=0&&attNode)?findNodeThatHas(S.players[oPrt].structure,attNode.uid):null;\n        if(!par46||par46.uid!==nd.uid)return;\n      }else if(sc46!=='owner'&&nd!==attNode)return; /* 'self': solo el atacante */");
console.log('ops: ' + ops);
fs.writeFileSync(P, t);
