const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
const oldHook = "        var aidUN=false;\n        A.aids.forEach(function(a53){\n          if(aidUN)return;\n          var an53=findNode(a53.uid);\n          if(an53&&an53.cardId!=null){var ac53=card(an53.cardId);if(ac53&&ac53.effect&&ac53.effect.kind===\"undergroundnewspapers\")aidUN=true;}\n        });";
const newHook = "        var aidUN=false;\n        var anA53=findNode(A.attackerUid);\n        if(anA53&&anA53.cardId!=null){var acA53=card(anA53.cardId);if(acA53&&acA53.effect&&acA53.effect.kind===\"undergroundnewspapers\")aidUN=true;}\n        if(!aidUN)A.aids.forEach(function(a53){\n          if(aidUN)return;\n          var an53=findNode(a53.uid);\n          if(an53&&an53.cardId!=null){var ac53=card(an53.cardId);if(ac53&&ac53.effect&&ac53.effect.kind===\"undergroundnewspapers\")aidUN=true;}\n        });";
if (t.includes(oldHook)) { t = t.split(oldHook).join(newHook); ops++; }
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
