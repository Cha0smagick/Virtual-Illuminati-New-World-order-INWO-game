const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "      if(sc46==='parent'){\n        var oPrt=findOwnerPid(attNode?attNode.uid:null);\n        var par46=(oPrt>=0&&attNode)?findNodeThatHas(S.players[oPrt].structure,attNode.uid):null;\n        if(!par46||par46.uid!==nd.uid)return;\n      }";
const b = "      if(sc46==='parent'){\n        /* L48 - 'parent': el grupo con el efecto es TIete del atacante (su master\n           ataca: 'Gives its master +6 to any such attempt', Science Fiction Fans). */\n        if(!attNode||!(attNode.children||[]).some(function(k48){return k48.uid===nd.uid;}))return;\n      }";
if (!t.includes(a)) throw new Error('ancla parent no encontrada');
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('parent corregido');
