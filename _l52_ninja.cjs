const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// token_on_fail: tras un intento FALLADO contra el grupo, recupera su ficha (Ninjas)
if (!t.includes('token_on_fail')) {
  const a = "E.resolveAttack=function(resolveOptions){";
  /* buscamos el punto del resultado dentro de resolveAttack */
  const i = t.indexOf(a);
  if (i < 0) throw new Error('resolveAttack no encontrado');
  const body = t.slice(i, i + 20000);
  const m = body.match(/if\(\s*roll!=null[\s\S]{0,200}?result\s*=\s*'FALLO'[^;]*;/);
  if (!m) throw new Error('punto de FALLO no encontrado en resolveAttack');
  const seg = m[0];
  const ins = seg + "\n  /* L52 - Ninjas: un intento de control/destruir FALLADO contra ellas les devuelve la ficha. */\n  (function(){\n    var rNodeA=S.attack&&S.attack.targetUid?findNode(S.attack.targetUid):null;\n    if(rNodeA&&rNodeA.cardId!=null){var rcA=card(rNodeA.cardId);var reA=rcA&&rcA.effect;\n      if(reA&&reA.tokenOnFail===true&&(rNodeA.tokens==null||rNodeA.tokens<1)){rNodeA.tokens=1;log(rcA.name+': recupera su Action token tras el intento fallido');}}\n  })();";
  t = t.slice(0, i) + body.replace(seg, ins) + t.slice(i + 20000);
  ops++;
} else console.log('ya token_on_fail');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
