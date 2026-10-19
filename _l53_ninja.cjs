const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('token_on_fail')) { console.log('ya'); process.exit(0); }
const i = t.indexOf('E.resolveAttack=function');
if (i < 0) throw new Error('resolveAttack no encontrado');
const body = t.slice(i, i + 30000);
const m = body.match(/var result=[\s\S]{0,80}?;?|result\s*=\s*(?:out|[\s\S]{0,40}?)'?FALLO'?/);
if (!m) throw new Error('punto de resultado no localizado');
const seg = m[0];
const ins = seg + "\n  /* L53 - Ninjas: un intento de control/destruir FALLADO contra ellas les devuelve la ficha. */\n  (function(){\n    var rNodeA=S.attack&&S.attack.targetUid?findNode(S.attack.targetUid):null;\n    if(rNodeA&&rNodeA.cardId!=null){var rcA=card(rNodeA.cardId);var reA=rcA&&rcA.effect;\n      if(reA&&reA.tokenOnFail===true&&(rNodeA.tokens==null||rNodeA.tokens<1)){rNodeA.tokens=1;log('Ninjas: recupera su Action token tras el intento fallido');}}\n  })();";
t = t.slice(0, i) + body.replace(seg, ins) + t.slice(i + 30000);
fs.writeFileSync(P, t);
console.log('token_on_fail en: ' + seg.slice(0, 50));
