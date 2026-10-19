const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('mp50')) { console.log('ya'); process.exit(0); }
const a = "      if(type==='control'&&owner===pid)throw new Error('No puedes tomar control de tu propio grupo');";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = a + "\n      /* L50 - Intellectuals: el master no puede ser CAPTURADO (solo Disaster/Assassination). */\n      (function(){\n        var mp50=false;\n        (tgt.children||[]).forEach(function(k50){if(mp50||k50.cardId==null)return;var kc50=card(k50.cardId);if(kc50&&bonusPart(kc50.effect,'mp'))mp50=true;});\n        if(mp50&&type==='control')throw new Error('Ese grupo controla a los Intellectuals: no puede ser capturado (solo Disaster o Assassination)');\n      })();";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('mp-check ok');
