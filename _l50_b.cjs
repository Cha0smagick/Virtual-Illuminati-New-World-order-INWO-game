const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) declareAttack: el MASTER de un master_protect no puede ser capturado
const a1 = "      if(type==='control'&&owner===pid)throw new Error('No puedes tomar control de tu propio grupo');";
if (!t.includes('mp50')) {
  if (!t.includes(a1)) throw new Error('ancla declareAttack no encontrada');
  const b1 = a1 + "\n      /* L50 - Intellectuals: el master no puede ser CAPTURADO. */\n      (function(){\n        var mp50=false;\n        (tgt.children||[]).forEach(function(k50){if(mp50||k50.cardId==null)return;var kc50=card(k50.cardId);if(kc50&&bonusPart(kc50.effect,'mp'))mp50=true;});\n        if(mp50&&type==='control')throw new Error('Ese grupo controla a los Intellectuals: no puede ser capturado (solo Disaster o Assassination)');\n      })();";
  t = t.split(a1).join(b1);
  ops++;
} else console.log('ya mp-check');
// 2) grant con vs.masterOf (aplica solo si el grupo con efecto es TIETE de nd)
const a2 = "      if(cl.excludeSelf&&x.uid===nd.uid)return;\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);";
if (!t.includes('masterOf')) {
  if (!t.includes(a2)) throw new Error('ancla grant no encontrada');
  const b2 = "      if(cl.excludeSelf&&x.uid===nd.uid)return;\n      if(cl.vs&&cl.vs.masterOf===true){var pm50=findNodeThatHas(st,x.uid);if(!pm50||pm50.uid!==nd.uid)return;v+=(Number(cl.value)||0);return;}\n      if(vsMatchQ(cl.vs,nd,card(nd.cardId)))v+=(Number(cl.value)||0);";
  t = t.split(a2).join(b2);
  ops++;
} else console.log('ya masterOf');
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
