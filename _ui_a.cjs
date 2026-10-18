const fs = require('fs');
const P = 'game/js/ui.js';
let t = fs.readFileSync(P, 'utf8');
if (t.includes('acciones de GRUPO del humano')) { console.log('ya'); process.exit(0); }
const a = '  /* L12 / P1-083 - 378 Suicide Squad.';
const i = t.indexOf(a);
if (i < 0) throw new Error('ancla no encontrada');
const L = '\n';
const b = '  /* L46 - acciones de GRUPO del humano: un boton por grupo con group_action y ficha. */' + L +
'  (function () {' + L +
'    var curH = st.players[st.currentPid];' + L +
'    if (!curH || !curH.human) return;' + L +
'    (function gaW(gn) {' + L +
'      if (gn.cardId != null) {' + L +
"        var gc = C.cards[gn.cardId];" + L +
"        if (gc && gc.effect && gc.effect.kind === 'group_action' && (gn.tokens || 0) >= 1) {" + L +
"          $('actionBtns').insertAdjacentHTML('afterbegin', '<div class=\"pendbar\"><button data-act=\"ga\" data-uid=\"' + gn.uid + '\">' + esc(gc.name) + ': usar accion</button></div>');" + L +
'        }' + L +
'      }' + L +
'      (gn.children || []).forEach(gaW);' + L +
'    })(curH.structure);' + L +
'  })();' + L + L;
t = t.slice(0, i) + b + t.slice(i);
fs.writeFileSync(P, t);
console.log('botones ok');
