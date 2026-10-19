const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) EFF: opposes doblados si el dueno del defensor controla EFF y el objetivo es Computer
const aEff = "  A.opposes.forEach(function(o){det.opposes+=o.power;});";
if (t.includes(aEff) && !t.includes('L55 EFF')) {
  const bEff = aEff + "\n  /* L55 EFF: si el dueno del defensor controla EFF y el objetivo es Computer,\n     el Poder total gastado por los defensores se dobla. */\n  if(A.targetPid!=null&&A.targetUid&&tNode&&tCard&&hasAttr(tCard,'computer',tNode)){\n    var hasE55=false;\n    walk(S.players[A.targetPid].structure,function(n55){if(hasE55||n55.cardId==null)return;var cc55=card(n55.cardId);if(cc55&&cc55.effect&&cc55.effect.kind==='eff_shield')hasE55=true;});\n    if(hasE55&&det.opposes>0){det.opposes*=2;det.notes.push('EFF: el Poder de los defensores se dobla');}\n  }";
  t = t.split(aEff).join(bEff); ops++;
}
// 2) Comic Books: Resistance 0
const aCb = "    if(tNode&&tNode.resistanceOverride!=null)";
if (t.includes(aCb) && !t.includes('L55 ComicBooks')) {
  const bCb = "    /* L55 Comic Books: ataque de control sobre Weird -> Resistance 0. */\n    if(A.type==='control'&&tNode&&tCard&&nodeAligns(tNode,tCard).indexOf('weird')>=0){\n      var hasCB55=attCard&&attCard.effect&&attCard.effect.kind==='comics_zero';\n      if(!hasCB55){A.aids.forEach(function(aCB){if(hasCB55)return;var nCB=findNode(aCB.uid);if(nCB&&nCB.cardId!=null){var cCB=card(nCB.cardId);if(cCB&&cCB.effect&&cCB.effect.kind==='comics_zero')hasCB55=true;}});}\n      if(hasCB55){det.defenseBase=0;det.notes.push('Comic Books: la Resistance del objetivo es 0');}\n    }\n" + aCb;
  t = t.split(aCb).join(bCb); ops++;
}
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
