const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('L53 Hooks')) { console.log('ya'); process.exit(0); }
const anchor = '  applyAttackResult(A,det,result);';
if (!t.includes(anchor)) throw new Error('ancla no encontrada');
const hook = [
'  /* L53 Hooks: resultado del ataque. */',
'  (function(){',
'    var tn53=findNode(A.targetUid);',
'    if(!tn53||tn53.cardId==null)return;',
'    var tc53=card(tn53.cardId);',
'    var e53=tc53&&tc53.effect;',
'    var tf53=e53&&e53.tokenOnFail===true;',
'    if(!tf53&&e53&&e53.kind==="combo_bonus"&&e53.ga&&e53.ga.tokenOnFail===true)tf53=true;',
'    if(tf53&&result!=="\u00c9XITO"&&result!=="\u00c9XITO (11-12)"&&(tn53.tokens==null||tn53.tokens<1)){',
'      tn53.tokens=1;log("Ninjas: recupera su Action token tras el intento fallido");',
'    }',
'    if(result==="\u00c9XITO"&&A.type==="destroy"){',
'      var hitU=nodeAligns(tn53,tc53);',
'      if(hitU.indexOf("corporate")>=0||hitU.indexOf("straight")>=0||hitU.indexOf("government")>=0){',
'        var aidUN=false;',
'        A.aids.forEach(function(a53){',
'          if(aidUN)return;',
'          var an53=findNode(a53.uid);',
'          if(an53&&an53.cardId!=null){var ac53=card(an53.cardId);if(ac53&&ac53.effect&&ac53.effect.kind==="undergroundnewspapers")aidUN=true;}',
'        });',
'        if(aidUN){var ix53=drawFrom(S.plotDeck,S.plotDiscard,"plots");if(ix53!=null){S.players[A.pid].hand.push(ix53);log("Underground Newspapers: robas una Plot extra");}}',
'      }',
'    }',
'  })();',
''].join('\n');
t = t.split(anchor).join(hook + anchor);
fs.writeFileSync(P, t);
console.log('hooks L53 ok');
