/* ============================================================
   INWO Engine — One Big Deck variant (official OBD)
   Rules source: World Domination Handbook v1.2 (Jan 2002)
   + project SPEC-RULES.md v2.0 corrections
   Exposes: window.Engine
   ============================================================ */
(function () {
'use strict';
var C = window.INWO_CARDS;
var E = {};
var S = null;

/* ---------------- utils ---------------- */
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function d6(){return 1+Math.floor(Math.random()*6);}
function roll2d6(){return d6()+d6();}
function clone(o){return JSON.parse(JSON.stringify(o));}
var OPPOSITES={'peaceful':'violent','violent':'peaceful','liberal':'conservative','conservative':'liberal','weird':'straight','straight':'weird'};
function isOpposite(a,b){return !!a&&!!b&&OPPOSITES[a]===b;}
function shareAlign(A,B){return shares(A,B);}
function shares(A,B){if(!A||!B)return false;for(var i=0;i<A.length;i++){if(B.indexOf(A[i])>=0)return true;}return false;}
function log(msg){S.log.push({t:S.turn,p:S.currentPid,msg:msg});if(S.log.length>500)S.log.splice(0,S.log.length-500);}

/* ---------------- card lookup ---------------- */
function card(ref){
  if(ref==null)return null;
  if(typeof ref==='number'&&C.cards[ref])return C.cards[ref];
  if(typeof ref==='string'){
    if(C.byId[ref])return C.byId[ref];
    var n=parseInt(ref,10);if(!isNaN(n)&&C.cards[n])return C.cards[n];
  }
  return null;
}

/* ---------------- tree helpers ---------------- */
function walk(node,fn){fn(node);for(var i=0;i<node.children.length;i++)walk(node.children[i],fn);}
function findInTree(node,uid){if(node.uid===uid)return node;for(var i=0;i<node.children.length;i++){var r=findInTree(node.children[i],uid);if(r)return r;}return null;}
function findNodeThatHas(node,uid){for(var i=0;i<node.children.length;i++){if(node.children[i].uid===uid)return node;var r=findNodeThatHas(node.children[i],uid);if(r)return r;}return null;}
function findNode(uid){
  for(var p=0;p<S.players.length;p++){
    var r=findInTree(S.players[p].structure,uid);if(r)return r;
  }
  return null;
}
function findOwnerPid(uid){
  for(var p=0;p<S.players.length;p++){if(findInTree(S.players[p].structure,uid))return p;}
  return -1;
}
function detach(parent,uid){
  for(var i=0;i<parent.children.length;i++){
    if(parent.children[i].uid===uid)return parent.children.splice(i,1)[0];
  }
  return null;
}
function subtreeList(node){var out=[];walk(node,function(n){if(n.cardId!=null)out.push(n);});return out;}
function maxChildren(node){return node.cardId==null?4:3;} /* root=Illuminati arrows */
function isOpenArrow(node){
  /* open arrow = free OUTGOING slot on this group */
  if(node.cardId==null)return false;
  return node.children.length<maxChildren(node);
}
function openArrows(pid){
  var out=[];var pl=S.players[pid];
  walk(pl.structure,function(n){if(isOpenArrow(n))out.push(n.uid);});
  return out;
}
function depthOf(root,uid){
  /* depth 1 = direct puppet of Illuminati */
  function rec(n,d){if(n.uid===uid)return d;for(var i=0;i<n.children.length;i++){var r=rec(n.children[i],d+1);if(r>0)return r;}return 0;}
  return rec(root,0);
}
function positionBonus(pid,targetUid){
  var d=depthOf(S.players[pid].structure,targetUid);
  if(d===1)return 10;if(d===2)return 5;return 0;
}
function isNeutralUid(uid){
  for(var i=0;i<S.neutralArea.length;i++)if(S.neutralArea[i].uid===uid)return true;
  return false;
}
function curPower(node){
  var c=card(node.cardId);if(!c)return 0;
  var p=(typeof c.power==='number')?c.power:0;
  if(node.powerOverride!=null)p=node.powerOverride;
  if(node.paralyzed)p=c.power||0; /* paralyze freezes abilities/tokens, power unchanged */
  return Math.max(0,p);
}
function illuCard(pid){return card(S.players[pid].illumId);}
function alignsOf(cardObj){return (cardObj&&cardObj.alignments)?cardObj.alignments:[];}

/* ---------------- game creation ---------------- */
E.newGame=function(configs){
  configs=configs||[];
  S={
      phase:'setup',turn:0,round:1,currentPid:-1,turnCompleted:false,
    players:[],groupDeck:[],plotDeck:[],groupDiscard:[],plotDiscard:[],
    neutralArea:[],attack:null,log:[],uidCounter:100,winner:null,
    config:{goalCount:(configs.goalCount||12)},
    lastRoll:null
  };
  for(var i=0;i<C.cards.length;i++){
    var t=C.cards[i].type;
    if(t==='group'||t==='resource')S.groupDeck.push(i);
    else if(t==='plot')S.plotDeck.push(i);
  }
  shuffle(S.groupDeck);shuffle(S.plotDeck);
  for(var p=0;p<configs.length;p++){
    S.players.push({
      name:configs[p].name||('Player'+(p+1)),
      human:!!configs[p].human,
      illumId:null,illumTokens:0,
      usedResourceThisTurn:false,usedExtraDrawThisTurn:false,
      hand:[],structure:{uid:'p'+p+'-root',cardId:null,children:[]},
      resources:[],exposedPlots:[],discards:[],destroyedByMe:[],destroyedIlluminati:[],
      turnsCompleted:0,immuneFrom:{},pickedSecrets:[],flags:{autoTakeover:false}
    });
  }
  log('Nueva partida creada ('+S.players.length+' jugadores, meta básica '+S.config.goalCount+' grupos)');
  return clone(publicState());
};

function publicState(){
  return {
    phase:S.phase,turn:S.turn,round:S.round,currentPid:S.currentPid,
    winner:S.winner,config:S.config,lastRoll:S.lastRoll,
    lastResultText:S.lastResultText||null,
    players:S.players.map(function(pl,i){
      return {
        idx:i,name:pl.name,human:pl.human,illumId:pl.illumId,
        illumTokens:pl.illumTokens,hand:pl.hand.slice(),
        autoUsed:!!(pl.flags&&pl.flags.autoTakeover),
        drewPlot:!!(pl.flags&&pl.flags.plotDrawn),
        drewGroup:!!(pl.flags&&pl.flags.groupDrawn),
        handCounts:{plots:pl.hand.filter(function(ix){return card(ix)&&card(ix).type==='plot';}).length,
                    groups:pl.hand.filter(function(ix){return card(ix)&&card(ix).type!=='plot';}).length},
        structure:clone(pl.structure),
        resources:clone(pl.resources),
        exposedPlots:pl.exposedPlots.slice(),
        discards:pl.discards.slice(),
        turnsCompleted:pl.turnsCompleted,
        immuneFrom:clone(pl.immuneFrom),
        controlledCount:countControlled(pl)
      };
    }),
    deckCounts:{group:S.groupDeck.length,plot:S.plotDeck.length,
                groupDiscard:S.groupDiscard.length,plotDiscard:S.plotDiscard.length},
    neutralArea:clone(S.neutralArea),
    attack:S.attack?clone(S.attack):null,
    log:S.log.slice(-400),
    victoryStatus:victoryStatus()
  };
}
function countControlled(pl){
  var n=0;walk(pl.structure,function(nd){if(nd.cardId!=null)n++;});return n;
}
function victoryStatus(){
  var out=[];
  for(var p=0;p<S.players.length;p++){
    var pl=S.players[p];var ic=illuCard(p);if(!ic)continue;
    var st={pid:p,name:pl.name,goal:goalText(ic),progress:{}};
    var g=ic.goal||{type:'basic'};
    st.progress.groups=countControlled(pl)+'/'+effectiveGoalCount(p);
    if(g.type==='destroy_reduce')st.progress.destroyed=pl.destroyedByMe.length+'/'+(g.winAt||8);
    if(g.type==='peaceful_power_in_play')st.progress.peacefulPower=sumPeacefulPower(pl)+'/'+(g.total||30);
    if(g.type==='power_total')st.progress.powerTotal=sumTotalPower(pl)+'/'+(g.total||0);
    if(g.type==='goal_cards')st.progress.pick3=ufoProgress(p);
    if(g.magicResourceCountsAsGroup)st.progress.magicResources=magicResourceGroups(pl);
    out.push(st);
  }
  return out;
}
/* P1-009: la meta de Shangri-La cuenta los grupos pacíficos "in play,
   regardless of who controls them" (texto oficial), así que se suman TODAS las
   estructuras y el área neutral, no sólo la del jugador evaluado. */
function sumPeacefulPower(){
  var tot=0;
  function take(nd){
    if(nd.cardId==null)return;var c=card(nd.cardId);
    if(!nd.paralyzed&&c.alignments&&c.alignments.indexOf('peaceful')>=0&&(typeof c.power==='number'))tot+=c.power;
  }
  for(var i=0;i<S.players.length;i++)walk(S.players[i].structure,take);
  (S.neutralArea||[]).forEach(take);
  return tot;
}
/* ==== P1-010 — CORRECCION DE LA META UFOs (P0: la meta estaba mal transcrita) ====
   La version anterior elegia 3 GRUPOS AL AZAR en startGame() y la meta exigia
   controlarlos. Eso no coincide con ninguna fuente:
     - Carta UFOs: "GOAL: The UFOs can have up to 3 different Goal cards in play,
       and win with any of them."
     - inwo_rules_extracted.txt:979-991 -> "Goal Cards: These are a type of Plot
       card". Las Goal cards son PLOTS, no grupos secretos.
     - inwo_rules_extracted.txt:938-944 -> "No player may have more than one Goal
       card in his hand"; si robas una excedente debes descartar; si un Plot queda
       expuesto y tienes demasiadas Goal cards, se descarta.
     - librarian_result.txt:2186 -> la Goal se REVELA (no se juega) al declarar
       victoria; si el intento falla vuelve a la mano EXPESTA.
   Ademas la meta de los UFOs "no se puede combinar con goal cards" (VFAQ:1354),
   lo que reconcilia las dos frases: la meta de los UFOs ES revelar una Goal card.
   Y el dataset si contiene las Goal cards oficiales (7 cartas effect.kind='goal'). */
function isGoalCardIdx(ix){
  var c=C.cards[ix];
  return !!(c&&c.type==='plot'&&c.effect&&c.effect.kind==='goal');
}
function goalCardsIn(pl){return (pl.hand||[]).filter(isGoalCardIdx);}
/* Limite de Goal cards en mano. El dato oficial es "one", con una excepcion
   explicita: Alternate Goals ("You may possess two Goal cards"). */
function goalHandLimitOf(pl){
  var two=goalCardsIn(pl).some(function(ix){return C.cards[ix].name==='Alternate Goals';});
  return two?2:1;
}
function ufoProgress(pid){
  var pl=S.players[pid];if(!pl)return '0/3';
  var ic=illuCard(pid);
  var max=(ic&&ic.goal&&ic.goal.max)?ic.goal.max:3;
  return goalCardsIn(pl).length+'/'+max;
}
/* P1-010: conteo de grupos con un doble declarado (usado por las Goal cards que
   sustituyen la meta basica). Maximo 3 dobles por carta, igual que las metas. */
function basicWithDouble(pl,dbl,label){
  var n=0,doubled=0,seen={};
  walk(pl.structure,function(nd){
    if(nd.cardId==null||nd.paralyzed)return;var g=card(nd.cardId);n++;
    if(doubleQualifies(g,dbl)&&doubled<3&&!seen[g.id]){seen[g.id]=1;doubled++;n++;}
  });
  var goal=S.config.goalCount;
  return {met:n>=goal,count:n,goal:goal,how:label+': '+n+'/'+goal+' grupos'};
}
/* P1-010: objetivos de las 7 Goal cards del mazo. El texto impreso es la
   autoridad (se cita en cada rama); no se inventa ninguna mecanica. "Alternate
   Goals", "Military-Industrial Complex", "Peace in Our Time" y "World War
   Three" NO son condiciones de victoria sino modificadores permanentes del
   juego en curso: declararlas no puede evaluarse todavia, asi que se declaran
   explicitamente como no implementadas en vez de fingir una victoria. */
function goalCardObjective(ix,pid){
  var c=C.cards[ix];var pl=S.players[pid];var name=c?c.name:'';
  if(name==='Criminal Overlords'){
    /* "Any group that is both Violent and Criminal counts double toward your
       total number of groups" */
    var n=0,dbl=0,seen={};
    walk(pl.structure,function(nd){
      if(nd.cardId==null||nd.paralyzed)return;var g=card(nd.cardId);n++;
      var a=g.alignments||[];
      if(a.indexOf('violent')>=0&&a.indexOf('criminal')>=0&&dbl<3&&!seen[g.id]){seen[g.id]=1;dbl++;n++;}
    });
    var goal=S.config.goalCount;
    return {met:n>=goal,count:n,goal:goal,
            how:'Criminal Overlords: '+n+'/'+goal+' grupos (Violent y Criminal cuentan doble)'};
  }
  if(name==='Hail Eris!'){
    /* "Any Weird group with a power of 3 or more counts double toward your total
       number of groups" */
    return basicWithDouble(pl,{align:'weird',powerAtLeast:3},'Hail Eris!');
  }
  if(name==='Fratricide'){
    /* "Destroy two other Illuminati groups!" — para destruir un Illuminati hay que
       quitarle su ultimo titere (texto impreso). */
    var downed=(pl.destroyedIlluminati||[]).length;
    return {met:downed>=2,count:downed,goal:2,
            how:'Fratricide: '+downed+'/2 Illuminati rivales destruidos'};
  }
  return {implemented:false,
          reason:'"'+name+'" no es una condicion de victoria: es un modificador permanente del juego en curso, todavia no implementado'};
}
/* Las 10 ideologías canónicas del World Domination Handbook. Se declaran de
   forma explícita (no derivadas del dataset) porque una meta que dependa de
   "cubrir todas las alineaciones" debe ser estable aunque una transcripción
   venga incompleta: un objetivo imposible por datos ausentes es peor que un
   objetivo declaradamente no evaluable. */
var CANON_ALIGNMENTS=['conservative','corporate','criminal','fanatic','government','liberal','peaceful','straight','violent','weird'];

/*    P1-008: goalText() solo probaba tipos de meta que NO existen en el dataset
   (destroy / peaceful_power / pick3), por lo que la UI mostraba "Meta básica"
   para los 9 Illuminati. Ahora cada tipo declarado en cards.js tiene texto. */
function goalText(ic){
  var g=ic.goal;
  var baseGoal=(S&&S.config)?S.config.goalCount:12;
  if(!g)return 'Controlar '+baseGoal+' grupos';
  switch(g.type){
    case 'power_total':
      return 'Poder total de tus grupos ≥ '+g.total+(g.needEachAlign?' y al menos un grupo de cada una de las 10 ideologías':'');
    case 'destroy_reduce':
      return 'Meta de '+g.winAt+' grupos; cada grupo que destruyas reduce en '+(g.reducePerDestroy||1)+' la cantidad de grupos que debes controlar (o destruye '+g.winAt+' directamente)';
    case 'peaceful_power_in_play':
      return 'Poder pacífico en juego ≥ '+g.total;
    case 'goal_cards':
      /* P1-010: antes decia "Controlar tus N grupos especiales", que era la meta
         inventada. La carta dice "up to 3 different Goal cards in play". */
      return 'Tener cartas Goal en juego (hasta '+g.max+'); ganas al revelar cualquiera de ellas';
    case 'basic':
    default:
      var t='Controlar '+baseGoal+' grupos';
      if(g.double){
        if(g.double.attr)t+='; un grupo con el atributo '+g.double.attr+' cuenta doble';
        else if(g.double.align)t+='; un grupo '+g.double.align+' cuenta doble';
        if(g.double.powerAtLeast!=null)t+=' (Poder ≥ '+g.double.powerAtLeast+')';
      }
      if(g.magicResourceCountsAsGroup)t+='; tus recursos Mágicos cuentan como grupos';
      return t;
  }
}
function alignsCovered(pl){
  var set={};
  walk(pl.structure,function(nd){
    if(nd.cardId==null)return;var c=card(nd.cardId);
    (c.alignments||[]).forEach(function(a){set[a]=true;});
  });
  return set;
}
function sumTotalPower(pl){
  var tot=0;
  walk(pl.structure,function(nd){
    if(nd.cardId==null||nd.paralyzed)return;var c=card(nd.cardId);
    if(typeof c.power==='number')tot+=c.power;
  });
  return tot;
}
function magicResourceGroups(pl){
  var n=0;
  (pl.resources||[]).forEach(function(r){
    var c=card(r.cardId);if(!c)return;
    var a=attrList(c);
    for(var i=0;i<a.length;i++){
      if(String(a[i]).toLowerCase()==='magic'){n++;return;}
    }
  });
  return n;
}
/* P1-009: misma corrección AND→OR que en bonusTargetMatches. El texto de los
   Gnomes de Zurich dice "Any Corporate group OR Bank with a Power of 4 or more
   counts double" y el dato es {align:'corporate',attr:'bank',powerAtLeast:4}:
   con AND ningún grupo del dataset cumpliría los dos a la vez (nadie tiene
   atributo bank) y el doble quedaría muerto. El texto de la carta manda: si el
   dato declara LAS DOS condiciones se evalúan con OR; powerAtLeast siempre
   además (así lo dicen todas las cartas). */
function doubleQualifies(c,dbl){
  if(!dbl)return false;
  var hasAlign=!!dbl.align,hasAttr=!!dbl.attr;
  if(hasAlign||hasAttr){
    var al=c.alignments||[],byAlign=hasAlign&&al.indexOf(dbl.align)>=0;
    var byAttr=false;
    if(hasAttr){
      var at=attrList(c);
      for(var i=0;i<at.length;i++){
        if(String(at[i]).toLowerCase()===String(dbl.attr).toLowerCase()){byAttr=true;break;}
      }
    }
    var ok=hasAlign&&hasAttr?(byAlign||byAttr):(byAlign||byAttr);
    if(!ok)return false;
  }
  if(dbl.powerAtLeast!=null){if(typeof c.power!=='number'||c.power<dbl.powerAtLeast)return false;}
  return true;
}
function effectiveGoalCount(p){
  var pl=S.players[p];var ic=illuCard(p);
  var g=(ic&&ic.goal&&ic.goal.type==='destroy_reduce')?ic.goal:null;
  if(!g)return S.config.goalCount;
  return Math.max(1,S.config.goalCount-pl.destroyedByMe.length*(g.reducePerDestroy||1));
}

E.getState=function(){return publicState();};
E.card=function(ref){var c=card(ref);return c?clone(c):null;};
E._raw=function(){return S;}; /* debugging */

/* ---------------- setup ---------------- */
function baseIlluId(id){return String(id).replace(/\d+$/,'');}
E.availableIlluminati=function(){
  var used={};
  if(S&&S.players)S.players.forEach(function(pl){if(pl.illumId)used[baseIlluId(pl.illumId)]=true;});
  var seen={},out=[];
  C.cards.forEach(function(c){
    if(c.type!=='illuminati')return;
    var b=baseIlluId(c.id);
    if(seen[b]||used[b])return;
    seen[b]=true;
    out.push({id:c.id,name:c.name,img:c.img,text:c.text,goal:c.goal,effect:c.effect});
  });
  return out;
};
E.setIlluminati=function(pid,cardRef){
  if(S.phase!=='setup')throw new Error('No se puede cambiar el Illuminati con la partida iniciada');
  if(!S.players[pid])throw new Error('Jugador inválido');
  var ic=card(cardRef);
  if(!ic||ic.type!=='illuminati')throw new Error('No es un Illuminati: '+cardRef);
  for(var p=0;p<S.players.length;p++){
    if(p!==pid&&S.players[p].illumId&&baseIlluId(S.players[p].illumId)===baseIlluId(ic.id))
      throw new Error(ic.name+' ya fue elegido por '+S.players[p].name);
  }
  var pl=S.players[pid];
  pl.illumId=ic.id;
  pl.structure.cardId=ic.id;
  log(pl.name+' elige '+ic.name);
  return true;
};
E.allIlluminatiSet=function(){return S.players.every(function(pl){return !!pl.illumId;});};

E.startGame=function(){
  if(S.phase!=='setup')throw new Error('La partida ya está iniciada');
  if(!E.allIlluminatiSet())throw new Error('Faltan Illuminati por elegir');
  /* deal hands: 3 plots + 10 groups (OBD) */
  S.players.forEach(function(pl){
    for(var i=0;i<3;i++)pl.hand.push(S.plotDeck.pop());
    for(var j=0;j<10;j++)pl.hand.push(S.groupDeck.pop());
  });
  /* P1-010: se elimino el sorteo de 3 "grupos especiales" para los UFOs. Las
     Goal cards son un tipo de PLOT (inwo_rules_extracted.txt:979) y se reparten
     del mazo de Plots como cualquier otra carta; su limite (1 por jugador, 2 con
     Alternate Goals) se aplica al final del turno. */
  /* P1-010: el reparto inicial tambien puede entregar 2 Goal cards, lo que
     dejaria un estado ilegal ("No player may have more than one Goal card in his
     hand"). Se descarta el exceso antes de empezar. */
  S.players.forEach(function(pl){
    var lim=goalHandLimitOf(pl);
    var held=goalCardsIn(pl);
    while(held.length>lim){
      var gx=held.shift();
      removeFromHand(pl,gx);S.plotDiscard.push(gx);
      log('Reparto inicial: '+card(gx).name+' descartada (máx '+lim+' Goal cards)');
    }
  });
  /* high roll starts */
  var rolls=[],best=-1,bestP=0,attempts=0;
  do{
    rolls=[];
    for(var p=0;p<S.players.length;p++){rolls[p]=roll2d6();if(rolls[p]>best){best=rolls[p];bestP=p;}}
    attempts++;
  }while(rolls.filter(function(r){return r===best;}).length>1&&attempts<100);
  if(rolls.filter(function(r){return r===best;}).length>1){
    log('Empate repetido al iniciar; se resuelve por orden de jugador');
  }
  S.lastRoll={rolls:rolls,first:bestP};
  log('Tirada inicial: '+rolls.join(', ')+' — empieza '+S.players[bestP].name);
  S.phase='begin';S.currentPid=bestP;S.turn=0;S.turnCompleted=false;
  E.beginTurn(bestP,true);
  return clone(publicState());
};

/* ---------------- turn flow ---------------- */
function checkElimination(){
  for(var p=0;p<S.players.length;p++){
    var pl=S.players[p];
    if(pl.eliminated)continue;
    if(pl.turnsCompleted>=3&&countControlled(pl)<=0){
      pl.eliminated=true;
      log(pl.name+' queda ELIMINADO (sin títeres tras su tercer turno)');
    }
  }
}

E.beginTurn=function(pid,isFirst){
  if(S.phase==='gameover')return publicState();
  if(!S.players[pid])throw new Error('Jugador inválido');
  if(S.phase==='main'&&S.currentPid===pid)return publicState();
  if(S.phase!=='begin')throw new Error('No se puede iniciar un turno fuera de la transición');
  var pl=S.players[pid];
  S.phase='begin';
  S.currentPid=pid;
  S.turn++;
  S.turnCompleted=false;
  pl.flags.autoTakeover=false;
  pl.flags.plotDrawn=false;
  pl.flags.groupDrawn=false;
  pl.usedResourceThisTurn=false;
  pl.usedExtraDrawThisTurn=false;
  /* clear stale immunities granted against this player last turn */
  for(var q=0;q<S.players.length;q++){
    if(q!==pid&&S.players[q].immuneFrom[pid])delete S.players[q].immuneFrom[pid];
  }
  var ic=illuCard(pid);
  var tokGain=(ic&&ic.effect&&ic.effect.code==='ufos')?2:1;
  pl.illumTokens+=tokGain;
  /* action token on every own group lacking one */
  walk(pl.structure,function(nd){
    if(nd.cardId==null)return;
    if(nd.paralyzed||nd.zapped||nd.devastated)return;
    var c=card(nd.cardId);
    if(curPower(nd)===0&&!(c.power===0))return; /* reduced to 0 => no tokens; printed-0 ok */
    if(nd.tokens==null)nd.tokens=0;
    if(nd.tokens<1)nd.tokens=1;
  });
  /* resources whose text mentions Action get a token */
  pl.resources.forEach(function(r){
    var c=card(r.cardId);
    if(c&&/\baction\b/i.test(c.text||'')&&((r.tokens||0)<1))r.tokens=1;
  });
  /* P1-009: The Network — "You start your turn by drawing two Plot cards,
     rather than one." Se hace aquí (no como acción del jugador) porque es
     parte del inicio del turno, y se respeta el límite de Plots en mano de la
     facción (plotHandLimitOf: Gnomes de Zurich admite 6). */
  var autoDraw=illuEff(pid).drawPlotAtStart;
  if(autoDraw){
    var lim=plotHandLimitOf(pid);
    var got=0;
    for(var d=0;d<autoDraw;d++){
      var plotsHeld=pl.hand.filter(function(ix){return C.cards[ix]&&C.cards[ix].type==='plot';}).length
        +pl.exposedPlots.length;
      if(plotsHeld>=lim)break;
      var dix=drawFrom(S.plotDeck,S.plotDiscard,'plots');
      if(dix==null)break;
      pl.hand.push(dix);got++;
    }
    if(got>0)log(pl.name+' roba '+got+' Plot cards al inicio del turno (The Network)');
  }
  log('— Turno de '+pl.name+' (+'+tokGain+' acción Illuminati) —');
  S.phase='main';
  return publicState();
};

function drawFrom(deck,discard,kind){
  if(!deck.length&&!discard.length)return null;
  if(!deck.length){while(discard.length)deck.push(discard.pop());shuffle(deck);log('Mazo de '+kind+' agotado: se rebaraja el descarte');}
  return deck.pop();
}
E.drawPlot=function(pid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.flags.plotDrawn)throw new Error('Ya robaste tu carta de Plot este turno');
  var ix=drawFrom(S.plotDeck,S.plotDiscard,'plots');
  if(ix==null)throw new Error('No quedan Plot cards');
  pl.flags.plotDrawn=true;
  pl.hand.push(ix);
  return {idx:ix,card:C.cards[ix]};
};
E.drawGroup=function(pid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.flags.groupDrawn)throw new Error('Ya robaste tu carta de Grupo este turno');
  var ix=drawFrom(S.groupDeck,S.groupDiscard,'grupos');
  if(ix==null)throw new Error('No quedan Group cards');
  pl.flags.groupDrawn=true;
  pl.hand.push(ix);
  return {idx:ix,card:C.cards[ix]};
};
E.exchangeForPlot=function(pid,payment){
  requireOwnMain(pid);
  var pl=S.players[pid];
  var spentIllum=false;
  var spentGroups=[];
  try{
    if(payment&&payment.illum){
      if(pl.illumTokens<1)throw new Error('Sin acciones Illuminati para intercambiar');
      pl.illumTokens--;
      spentIllum=true;
    }else if(payment&&Array.isArray(payment.groupUids)&&payment.groupUids.length===2){
      payment.groupUids.forEach(function(u){
        spendGroupToken(pid,u);
        spentGroups.push(u);
      });
    }else throw new Error('Pago inválido (1 acción Illuminati o 2 tokens de grupo)');
    var ix=drawFrom(S.plotDeck,S.plotDiscard,'plots');
    if(ix==null)throw new Error('No quedan Plot cards');
    pl.hand.push(ix);
    log(pl.name+' intercambia tokens por una carta de Plot');
    return {idx:ix};
  }catch(err){
    if(spentIllum)pl.illumTokens++;
    spentGroups.forEach(function(uid){
      var node=findNode(uid);
      if(node)node.tokens++;
    });
    throw err;
  }
};
function requireOwnMain(pid){
  if(S.phase!=='main')throw new Error('Fuera de la fase principal');
  if(pid!==S.currentPid)throw new Error('No es tu turno');
}

/* ---------------- placement ---------------- */
function placeUnder(pid,handIdx,parentUid){
  var pl=S.players[pid];
  var hi=pl.hand.indexOf(handIdx);
  if(hi<0)throw new Error('Carta no está en tu mano');
  var parentNode=findNode(parentUid)||findInTree(pl.structure,parentUid);
  if(!parentNode||findOwnerPid(parentNode.uid)!==pid)
    throw new Error('El punto de colocación debe ser un grupo propio');
  if(!isOpenArrow(parentNode))throw new Error('Sin flecha de control libre en '+parentNode.uid);
  var nd={uid:'n'+(S.uidCounter++),cardId:handIdx,children:[],tokens:1};
  parentNode.children.push(nd);
  pl.hand.splice(hi,1);
  return nd;
}

E.autoTakeover=function(pid,handIdx,parentUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.flags.autoTakeover)throw new Error('Ya usaste el takeover automático de este turno');
  var c=card(handIdx);
  if(!c)throw new Error('Carta inexistente');
  if(c.type==='resource'){
    pl.flags.autoTakeover=true;
    removeFromHand(pl,handIdx);
    pl.resources.push({uid:'r'+(S.uidCounter++),cardId:handIdx,linkedTo:parentUid||pl.illumId,tokens:0});
    log(pl.name+' coloca el recurso '+c.name+' (takeover automático)');
    return publicState();
  }
  if(c.type!=='group')throw new Error('Solo Groups/Resources en takeover automático');
  var nd=placeUnder(pid,handIdx,parentUid); /* puede lanzar si no hay flecha: NO consume el takeover */
  pl.flags.autoTakeover=true;
  log(pl.name+' toma posesión automática de '+c.name);
  return publicState();
};

function rejectUnverifiedCard(c){
  var kind=c&&c.effect&&c.effect.kind;
  if(!kind||kind==='unverified'||kind==='ability_unverified'||kind==='plot_generic'||kind==='resource_generic'||kind==='generic'){
    throw new Error('La carta "'+(c&&c.name||'desconocida')+'" no tiene una mecánica verificada; no puede jugarse todavía.');
  }
}

E.playResource=function(pid,handIdx,linkedToUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.usedResourceThisTurn)throw new Error('Solo 1 Resource por turno mediante acción');
  if(pl.illumTokens<1)throw new Error('Sin acciones Illuminati');
  var c=card(handIdx);
  if(!c||c.type!=='resource')throw new Error('No es un Resource');
  rejectUnverifiedCard(c);
  pl.illumTokens--;pl.usedResourceThisTurn=true;
  removeFromHand(pl,handIdx);
  var link=linkedToUid||pl.illumId;
  pl.resources.push({uid:'r'+(S.uidCounter++),cardId:handIdx,linkedTo:link,tokens:0});
  log(pl.name+' juega el recurso '+c.name);
  return publicState();
};
E.extraGroupDraw=function(pid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.usedExtraDrawThisTurn)throw new Error('Robo extra de grupo ya usado este turno');
  if(pl.illumTokens<1)throw new Error('Sin acciones Illuminati');
  var drawn=E.drawGroup(pid);
  pl.illumTokens--;
  pl.usedExtraDrawThisTurn=true;
  return drawn;
};
function removeFromHand(pl,idx){
  var i=pl.hand.indexOf(idx);
  if(i>=0)pl.hand.splice(i,1);
}
function spendGroupToken(pid,uid){
  var nd=findNode(uid);
  if(!nd)throw new Error('Grupo inexistente: '+uid);
  if(findOwnerPid(uid)!==pid)throw new Error('El grupo no te pertenece');
  if(!nd.tokens||nd.tokens<1)throw new Error('Sin Action token en '+card(nd.cardId).name);
  nd.tokens--;
}


/* ================= ATTACKS ================= */
function twoPlayerGuard(pid){
  if(S.players.length===2&&S.players.some(function(pl){return pl.turnsCompleted<1;}))
    throw new Error('Nadie ataca antes de que ambos completen su primer turno');
}
E.declareAttack=function(pid,type,target){
  requireOwnMain(pid);
  if(S.attack)throw new Error('Ya hay un ataque en curso');
  if(type!=='control'&&type!=='destroy')throw new Error('Tipo de ataque inválido');
  if(!target||typeof target!=='object')throw new Error('Objetivo de ataque inválido');
  twoPlayerGuard(pid);
  var pl=S.players[pid];
  var attackerUid=target.attackerUid;
  var att=findNode(attackerUid);
  if(!att)throw new Error('Atacante inexistente');
  if(findOwnerPid(attackerUid)!==pid)throw new Error('El atacante no te pertenece');
  if(att.paralyzed||att.zapped||att.devastated)throw new Error('Atacante no puede actuar');
  var attCard=card(att.cardId);
  if(!attCard)throw new Error('Atacante sin carta válida');

  var A={id:'a'+(S.uidCounter++),pid:pid,type:type,
    attackerUid:attackerUid,aids:[],opposes:[],privilege:false,
    boosts:[],defBoosts:[],selfDefended:false,resolved:false};
  var tn='';

  if(isNeutralUid(target.uid)){
    var na=S.neutralArea.filter(function(n){return n.uid===target.uid;})[0];
    if(!na)throw new Error('Objetivo neutral inexistente: '+target.uid);
    var neutralCard=card(na.cardId);
    if(!neutralCard)throw new Error('La carta neutral no tiene datos válidos');
    A.neutralTarget=target.uid;
    tn=neutralCard.name;
  }else{
    var tgt=findNode(target.uid);
    var handOwner=-1;
    if(tgt){
      var tCard=card(tgt.cardId);
      if(!tCard)throw new Error('El grupo objetivo no tiene datos válidos');
      if(tCard.type==='illuminati')throw new Error('Los Illuminati no pueden ser atacados');
      var owner=findOwnerPid(target.uid);
      if(owner<0)throw new Error('El objetivo no tiene propietario');
      if(type==='control'&&owner===pid)throw new Error('No puedes tomar control de tu propio grupo');
      if(owner!==pid&&pl.immuneFrom[owner]&&(pl.immuneFrom[owner].indexOf?pl.immuneFrom[owner].indexOf(target.uid):-1)>=0)
        throw new Error('Tu ataque anterior contra '+S.players[owner].name+' falló: inmune el resto del turno');
      A.targetPid=owner;A.targetUid=target.uid;tn=tCard.name;
      /* P1-009: la Discordian Society es INMUNE a los ataques de grupos Government
         y Straight. Antes sólo se anotaba una nota en el desglose (la inmunidad no
         se ejecutaba). Ahora es una acción ilegal. */
      if(discordianBlocks(owner,attCard))
        throw new Error('La estructura Discordian es inmune a atacantes Straight/Government');
    }else{
      /* attack a card in a rival's HAND (attack-to-control only) */
      if(type!=='control')throw new Error('Solo control se lanza contra cartas de la mano');
      if(typeof target.handIdx!=='number'||target.handIdx<0||!C.cards[target.handIdx])
        throw new Error('Carta de mano no encontrada');
      for(var q=0;q<S.players.length;q++){
        if(q!==pid&&S.players[q].hand.indexOf(target.handIdx)>=0){handOwner=q;break;}
      }
      if(handOwner<0)throw new Error('Carta de mano no encontrada');
      A.handTarget={idx:target.handIdx,owner:handOwner};
      tn=C.cards[target.handIdx].name;
    }
  }
  if(type==='control'&&!A.handTarget&&openArrows(pid).length<1)
    throw new Error('Necesitas al menos una flecha libre para atacar a controlar');

  /* Only spend the attacker token after every target validation has passed. */
  spendGroupToken(pid,attackerUid);
  S.attack=A;
  log(pl.name+' declara ataque a '+type+' con '+attCard.name+' contra '+(tn||'?'));
  return publicState();
};

E.togglePrivilege=function(){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  S.attack.privilege=!S.attack.privilege;
  return publicState();
};

/* aid/oppose entries: {uid,power} — eligibility checked here */
E.addSupport=function(pid,entry){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  var A=S.attack;
  if(!entry||typeof entry!=='object')throw new Error('Apoyo inválido');
  if(entry.selfDefend){
    if(pid!==A.targetPid||!A.targetUid)throw new Error('Solo un defensor de un grupo en juego puede autoprotegerse');
    var nd=findNode(A.targetUid);
    if(!nd)throw new Error('El grupo defensor ya no está en juego');
    if(nd.tokens==null||nd.tokens<1)throw new Error('Defensor sin Action token');
    nd.tokens--;A.selfDefended=true;
    return publicState();
  }
  var sup=findNode(entry.uid);
  if(!sup)throw new Error('Apoyo inexistente');
  if(sup.paralyzed||sup.zapped||sup.devastated)throw new Error('Grupo no puede actuar');
  if(findOwnerPid(entry.uid)!==pid)throw new Error('El grupo no te pertenece');
  if(sup.tokens==null||sup.tokens<1)throw new Error('Sin Action token');
  var sc=card(sup.cardId);
  if(!sc)throw new Error('El grupo de apoyo no tiene datos válidos');
  var tNode=A.targetUid?findNode(A.targetUid):null;
  var tCard=tNode?card(tNode.cardId):(A.handTarget?C.cards[A.handTarget.idx]:null);
  if(!tCard)throw new Error('Objetivo no encontrado');
  if(A.type==='control'){
    if(!shares(alignsOf(sc),alignsOf(tCard)))throw new Error('Para ayudar a controlar necesita ≥1 alineación común con el objetivo');
  }else{
    var opp=false,al=alignsOf(sc),tl=alignsOf(tCard);
    for(var i=0;i<al.length;i++){for(var j=0;j<tl.length;j++){if(isOpposite(al[i],tl[j]))opp=true;}}
    if(!opp)throw new Error('Para ayudar a destruir necesita ≥1 alineación opuesta al objetivo');
  }
  spendGroupToken(pid,entry.uid);
  var pw=(typeof entry.power==='number')?entry.power:curPower(sup);
  (entry.oppose?A.opposes:A.aids).push({uid:entry.uid,name:sc.name,power:pw});
  log((entry.oppose?'Se OPONE ':'Ayuda ')+sc.name+' (+'+pw+')');
  return publicState();
};
E.addBoost=function(pid,idx,toDefense){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  if(pid!==S.attack.pid)throw new Error('Solo el atacante puede usar esta carta');
  var pl=S.players[pid];var i=pl.hand.indexOf(idx);
  if(i<0)throw new Error('No tienes esa carta');
  var c=C.cards[idx];
  if(!c||c.type!=='plot')throw new Error('Solo una carta Plot puede(boost)');
  var kind=c.effect&&c.effect.kind;
  if(kind!=='boost10'&&kind!=='boost10_attack')
    throw new Error('Esta carta no tiene efecto de boost válido');
  if(kind==='boost10_attack'&&toDefense)throw new Error('Este boost solo mejora el ataque');
  pl.hand.splice(i,1);S.plotDiscard.push(idx);
  (toDefense?S.attack.defBoosts:S.attack.boosts).push({name:c.name,v:10});
  log((toDefense?'Defensa +10':'Ataque +10')+' jugada ('+c.name+')');
  return publicState();
};

/* ---------------- P1-009: poderes especiales de las facciones Illuminati -------------
   Los 18 Illuminati declaran `effect.kind==='illu_special'`; el bloque
   siguiente centraliza la lectura de esos campos para que ninguna otra función
   tenga que conocer la forma exacta del dato. Nada aquí inventa reglas: cada
   helper traduce un campo que YA existe en cards.js. */
function illuEff(pid){var ic=illuCard(pid);return (ic&&ic.effect)?ic.effect:{};}
/* ¿El bonus {targetAlign,targetAttr} del Illuminati aplica a este objetivo?
   OJO: cuando el dato declara LAS DOS condiciones hay que aplicar OR, no AND.
   Los Gnomes de Zurich dicen "+4 on any attempt to control Corporate groups
   OR Banks" y su effect trae {targetAlign:'corporate', targetAttr:'bank'}: con
   AND ningún grupo del dataset cumpliría ambos a la vez (nadie tiene atributo
   bank) y el bonus quedaría muerto. El texto de la carta es la autoridad. */
function bonusTargetMatches(b,tCard){
  if(!b||!tCard)return false;
  if(!b.targetAlign&&!b.targetAttr)return false;
  if(b.targetAlign&&tCard.alignments&&tCard.alignments.indexOf(b.targetAlign)>=0)return true;
  if(b.targetAttr&&hasAttr(tCard,b.targetAttr))return true;
  return false;
}
/* Bonus de ataque del Illuminati del atacante: control o destroy. */
function illuAttackBonus(pid,type,tCard){
  var b=illuEff(pid).bonus;if(!b)return 0;
  if(b.anyDestroy)return (type==='destroy')?(b.anyDestroy||0):0;
  if(!bonusTargetMatches(b,tCard))return 0;
  return (type==='destroy')?((b.destroy||b.anyDestroy||0)):(b.control||0);
}
/* Shangri-La: +5 a defender CUALQUIER ataque recibido. */
function illuDefenseBonus(defPid){
  var db=illuEff(defPid).defenseBonus;
  return (db&&typeof db.anyAttack==='number')?db.anyAttack:0;
}
/* Discordian Society: inmune a atacantes Government/Straight. */
function discordianBlocks(defPid,attCard){
  var list=illuEff(defPid).immuneToAligns;
  if(!list||!list.length||!attCard||!attCard.alignments)return false;
  for(var i=0;i<list.length;i++)if(attCard.alignments.indexOf(list[i])>=0)return true;
  return false;
}
/* Shangri-La: sólo se puede destruir a Violence o al Illuminati rival. */
function shangriLaBlocksDestroy(defPid,node){
  var d=illuEff(defPid).destroyOnly;
  if(!d||!node)return false;
  if(node===S.players[defPid].structure)return !d.allowRivalIlluminati;
  var c=card(node.cardId);
  return !(c&&c.alignments&&c.alignments.indexOf('violent')>=0);
}
/* Gnomes of Zurich: 6 Plots en mano en lugar de 5. */
function plotHandLimitOf(pid){
  var e=illuEff(pid);
  return (typeof e.plotHandLimit==='number')?e.plotHandLimit:5;
}

/* ---------------- strength calc ---------------- */
E.previewStrength=function(){return computeStrength(false);};
function computeStrength(resolveMode){
  var A=S.attack;
  if(!A)throw new Error('Sin ataque activo');
  var att=findNode(A.attackerUid);
  if(!att)throw new Error('Atacante inexistente');
  var attCard=card(att.cardId);
  if(!attCard)throw new Error('Carta del atacante inexistente');
  var tNode=A.targetUid?findNode(A.targetUid):null;
  var neutralIdx=null;
  if(A.neutralTarget){
    var na=S.neutralArea.filter(function(n){return n.uid===A.neutralTarget;})[0];
    if(!na)throw new Error('Objetivo neutral inexistente');
    neutralIdx=na.cardId;tNode={cardId:na.cardId,tokens:0};
  }
  if(A.targetUid&&!tNode)throw new Error('Objetivo inexistente');
  var tCard=tNode?card(tNode.cardId):(A.handTarget?C.cards[A.handTarget.idx]:null);
  if(!tCard)throw new Error('Carta objetivo inexistente');
  var det={base:0,leaderMod:0,defenseBase:0,defenseBonus:0,defBoosts:0,selfDef:0,posBonus:0,aids:0,opposes:0,boosts:0,cthulhu:0,total:0,notes:[]};

  var attAligns=alignsOf(attCard),tgtAligns=alignsOf(tCard);
  if(A.type==='control'){
    det.base=curPower(att);
    for(var i=0;i<attAligns.length;i++){ /* leader ±4 vs target aligns */
      if(tgtAligns.indexOf(attAligns[i])>=0)det.leaderMod+=4;
      else{var isOpp=false;for(var j=0;j<tgtAligns.length;j++)if(isOpposite(attAligns[i],tgtAligns[j]))isOpp=true;
        if(isOpp)det.leaderMod-=4;}
    }
    /* P1-009: bonus del Illuminati atacante (Discordian +4 a Weird, Gnomes +4 a
       Corporate/Bank, Adepts +6 a Magic). Se suma en leaderMod para no alterar la
       fórmula de total que las pruebas verifican. */
    var ibCtl=illuAttackBonus(A.pid,'control',tCard);
    if(ibCtl){det.leaderMod+=ibCtl;det.notes.push('Bonus del Illuminati atacante: +'+ibCtl);}
    var R=(typeof tCard.resistance==='number')?tCard.resistance:5;
    det.defenseBase=R;
    /* master-shared alignments +4 each (skip fanatic-vs-fanatic master) */
    if(A.targetPid!=null){
      var mc=illuCard(A.targetPid);
      if(mc){
        var mal=alignsOf(mc),shared=[];
        tgtAligns.forEach(function(a){if(mal.indexOf(a)>=0)shared.push(a);});
        if(!(mc.effect&&mc.effect.code==='discordian'&&shared.length&&shared.every(function(a){return a==='fanatic';}))){
          shared.forEach(function(a){
            if(!(a==='fanatic'&&attAligns.indexOf('fanatic')>=0))det.defenseBonus+=4;
            else det.notes.push('Fanático vs Fanático: sin bonus maestro');
          });
        }
      }
    }
    det.posBonus=(!A.neutralTarget&&!A.handTarget&&A.targetPid!=null&&A.targetUid)?positionBonus(A.targetPid,A.targetUid):0;
    if(A.selfDefended&&tNode)det.selfDef=2*curPower(tNode);
    /* P1-009: la inmunidad Discordian ya NO se reporta aquí como nota; se hace
       cumplir en declareAttack (ataque normal) y en resolvePlotInstantAttack /
       instantAttack (ataques instantáneos), que no pasan por esta función. */
  }else{ /* destroy */
    det.base=curPower(att);
    for(var k=0;k<attAligns.length;k++){
      if(tgtAligns.indexOf(attAligns[k])>=0)det.leaderMod-=4;
      else{for(var m=0;m<tgtAligns.length;m++)if(isOpposite(attAligns[k],tgtAligns[m]))det.leaderMod+=4;}
    }
    if(!A.neutralTarget&&!A.handTarget&&A.targetPid!=null&&A.targetUid)det.posBonus=positionBonus(A.targetPid,A.targetUid);
    if(A.selfDefended&&tNode)det.selfDef=2*curPower(tNode);
    /* P1-009: Servants of Cthulhu +4 a cualquier destroy (el campo cthulhu ya
       participa en la fórmula de total). Se generaliza el antiguo caso
       hard-coded 'cthulhu' para que el bonus llegue por el dato, no por el id. */
    var ibDst=illuAttackBonus(A.pid,'destroy',tCard);
    if(ibDst){det.cthulhu+=ibDst;det.notes.push('Bonus del Illuminati atacante (destroy): +'+ibDst);}
    if(neutralIdx!=null){det.posBonus=0;}
  }
  /* P1-009: Shangri-La concede +5 a defender CUALQUIER ataque (texto oficial). */
  if(A.targetPid!=null){
    var db=illuDefenseBonus(A.targetPid);
    if(db){det.defBoosts+=db;det.notes.push('Defensa del Illuminati (Shangri-La): +'+db);}
  }
  A.aids.forEach(function(a){det.aids+=a.power;});
  A.opposes.forEach(function(o){det.opposes+=o.power;});
  A.boosts.forEach(function(b){det.boosts+=b.v;});
  A.defBoosts.forEach(function(b){det.defBoosts+=b.v;});
  ['base','leaderMod','defenseBase','defenseBonus','defBoosts','posBonus','selfDef','aids','opposes','boosts','cthulhu'].forEach(function(k){
    if(!isFinite(det[k])){try{console.warn('INWO: campo NaN en fuerza →',k);}catch(e){}det[k]=0;}
  });
  var total=det.base+det.leaderMod-det.defenseBase-det.defenseBonus-det.defBoosts-det.posBonus-det.selfDef+det.aids-det.opposes+det.boosts+det.cthulhu;
  if(!isFinite(total)){try{console.warn('INWO: fuerza total NaN → forzada a 0',det);}catch(e){}total=0;}
  det.total=total;
  return det;
}

E.resolveAttack=function(){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  var A=S.attack;
  var det=computeStrength(true);
  var immuneNote=det.notes.some(function(n){return n.indexOf('INMUNE')===0;});
  var result;
  if(det.total<2){result='auto-fail (fuerza '+det.total+' < 2)';}
  else{
    var r=roll2d6();S.lastRoll={d:r};
    if(r===11||r===12)result='FALLO automático (11-12 siempre fallan)';
    else if(r<=det.total)result='ÉXITO';
    else result='fallo';
    det.roll=r;
  }
  A.det=det;A.resultText=result;
  S.lastResultText=(A.type==='control'?'CONTROLAR':'DESTRUIR')+' → '+result+
    (det.roll!=null?(' · tiraste '+det.roll+' · necesitabas ≤'+det.total):(' · fuerza '+det.total));
  applyAttackResult(A,det,result);
  return publicState();
};

function applyAttackResult(A,det,resultText){
  var success=resultText.indexOf('ÉXITO')===0;
  var pid=A.pid;
  if(A.neutralTarget){
    var naI=S.neutralArea.findIndex(function(n){return n.uid===A.neutralTarget;});
    if(naI<0){S.attack=null;log('El objetivo en el ÁREA NEUTRAL ya no está disponible — ataque cancelado');return;}
    var na=S.neutralArea[naI];
    if(success&&A.type==='control'){
      S.neutralArea.splice(naI,1);
      placeCapturedSubtree(pid,{uid:'ghost',cardId:na.cardId,children:[]});
      log(card(na.cardId).name+' capturado desde el ÁREA NEUTRAL por '+S.players[pid].name);
    }else if(success&&A.type==='destroy'){
      S.neutralArea.splice(naI,1);S.groupDiscard.push(na.cardId);
      S.players[pid].destroyedByMe.push(na.cardId);
      log('Destruído en área neutral: '+card(na.cardId).name);
    }else{log(resultText+' — '+card(na.cardId).name+' permanece neutral');}
    S.attack=null;return;
  }
  if(A.handTarget){
    var ht=A.handTarget;
    var hc=C.cards[ht.idx];
    if(success){
      removeFromHand(S.players[ht.owner],ht.idx);
      S.neutralArea.push({uid:'n'+(S.uidCounter++),cardId:ht.idx});
      log(hc.name+' falló el control desde la mano → va al ÁREA NEUTRAL');
    }else{
      log(resultText+' — '+hc.name+' permanece en la mano rival');
    }
    S.attack=null;return;
  }
  var tNode=findNode(A.targetUid);
  if(!tNode){S.attack=null;log('El grupo objetivo ya no existe (fue movido o destruido) — ataque cancelado');return;}
  var owner=A.targetPid;
  if(success&&A.type==='control'){
    var parent=findNodeThatHas(S.players[owner].structure,A.targetUid);
    detach(parent,A.targetUid);
    tNode.tokens=1;
    placeCapturedSubtree(pid,tNode);
    log('¡'+S.players[pid].name+' toma CONTROL de '+card(tNode.cardId).name+' y todo su títere!');
  }else if(success&&A.type==='destroy'){
    destroyGroup(A.pid,A.targetUid);
  }else{
    log(resultText+' — ataque de '+S.players[pid].name+' falló');
    if(A.type==='control'){
      var list=S.players[owner].immuneFrom[pid]||(S.players[owner].immuneFrom[pid]=[]);
      list.push(A.targetUid);
    }
  }
  S.attack=null;
}

function placeCapturedSubtree(pid,node){
  var arrows=openArrows(pid);
  if(!arrows.length){/* dump children to hand later */ }
  var targetUid=arrows[0]||null;
  node.tokens=1;
  if(targetUid){
    var pn=findInTree(S.players[pid].structure,targetUid);
    pn.children.push(node);
  }else{
    S.players[pid].structure.children.push(node);
  }
}
function destroyGroup(byPid,targetUid){
  var owner=findOwnerPid(targetUid);
  var root=S.players[owner].structure;
  var parent=findNodeThatHas(root,targetUid);
  var node=findNode(targetUid);
  /* P1-009: Shangri-La — "You cannot destroy any groups except Violent ones and
     rival Illuminati." El bloqueo se evalúa ANTES de detach() para que un veto no
     deje la estructura a medio desmontar. */
  if(shangriLaBlocksDestroy(owner,node)){
    log('BLOQUEO Shangri-La: '+S.players[owner].name+' no puede destruir '+card(node.cardId).name+' (sólo grupos Violent y Illuminati rivales)');
    return false;
  }
  node=detach(parent,targetUid);
  var c=card(node.cardId);
  S.players[byPid].destroyedByMe.push(node.cardId);
  S.groupDiscard.push(node.cardId);
  /* linked resources destroyed */
  S.players[owner].resources=S.players[owner].resources.filter(function(r){
    if(r.linkedTo===targetUid){S.groupDiscard.push(r.cardId);log('Recurso linkeado destruido');return false;}
    return true;
  });
  /* puppets lose tokens, return to owner's HAND.
     subtreeList() includes the node itself (walk visits the root first), so the
     destroyed group must be skipped here: it already went to groupDiscard above
     and re-adding it to the hand would duplicate the card. */
  subtreeList(node).forEach(function(nd){
    if(nd===node)return;
    nd.tokens=0;
    S.players[owner].hand.push(nd.cardId);
  });
  /* P1-010: "To destroy an Illuminati, you must remove its last puppet" — asi se
     contabiliza la meta Fratricide, que exige destruir dos Illuminati rivales. */
  if(S.players[owner].structure.children.length===0){
    var rec=S.players[byPid].destroyedIlluminati;
    if(rec.indexOf(owner)<0){
      rec.push(owner);
      log('Illuminati de '+S.players[owner].name+' destruido (ya no tiene títeres)');
    }
  }
  log('DESTRUIDO: '+c.name+' (por '+S.players[byPid].name+'). Títeres vuelven a la mano de '+S.players[owner].name);
  /* P1-009: Servants of Cthulhu — "Draw a Plot card whenever you destroy a
     group!" El robo de Plot es interno (no consume la acción del turno), así que
     se replica el mismo drawFrom() que usa drawPlot() sin tocar flags.plotDrawn. */
  if(illuEff(byPid).drawPlotOnDestroy){
    var px=drawFrom(S.plotDeck,S.plotDiscard,'plots');
    if(px!=null){
      S.players[byPid].hand.push(px);
      log(card(px).name+' robada por Cthulhu al destruir '+c.name);
    }
  }
  return true;
}

/* ---------------- move group ---------------- */
E.moveGroup=function(pid,uid,newParentUid,payWith){
  requireOwnMain(pid);
  var node=findNode(uid);
  if(!node)throw new Error('Grupo inexistente');
  if(node.paralyzed)throw new Error('Paralizado no puede moverse');
  var oldOwner=findOwnerPid(uid);
  if(oldOwner!==pid)throw new Error('Solo puedes mover grupos de tu propia estructura');
  var oldParent=findNodeThatHas(S.players[oldOwner].structure,uid);
  var np=findNode(newParentUid);
  if(!np||findOwnerPid(newParentUid)!==pid)throw new Error('El destino debe pertenecer a tu estructura');
  if(findInTree(node,newParentUid))throw new Error('No puedes mover un grupo dentro de sí mismo');
  if(!isOpenArrow(np))throw new Error('Destino sin flecha libre');
  var payers=[uid,oldParent.uid,newParentUid];
  /* payWith is optional. When omitted (which is what the UI does) resolve a legal
     payer automatically instead of throwing: SPEC-RULES says moving a Group "cuesta
     1 acción" (an Illuminati action), so Illuminati tokens win; otherwise fall back
     to a group Action token, preferring the moved group itself. An explicit
     payWith is still validated strictly. */
  if(payWith===undefined||payWith===null){
    if(S.players[pid].illumTokens>=1)payWith='illum';
    else{
      /* pick a payer that ACTUALLY holds a token, in preference order */
      var cand=[uid,newParentUid,oldParent.uid], found=null;
      for(var ci=0;ci<cand.length;ci++){
        if(cand.indexOf(cand[ci])!==ci)continue;
        var cn=findNode(cand[ci]);
        if(cn&&cn.tokens>=1){found=cand[ci];break;}
      }
      if(found)payWith=found;
      else throw new Error('Mover un grupo cuesta 1 acción Illuminati o 1 Action token: no tienes ninguna disponible');
    }
  }
  if(payers.indexOf(payWith)<0&&payWith!=='illum')throw new Error('Pago inválido (grupo movido/maestro viejo/nuevo o acción Illuminati)');
  if(payWith==='illum'){
    if(S.players[pid].illumTokens<1)throw new Error('Sin acciones Illuminati');
    S.players[pid].illumTokens--;
  }else{
    spendGroupToken(pid,payWith);
  }
  detach(oldParent,uid);
  np.children.push(node);
  log(S.players[pid].name+' mueve '+card(node.cardId).name+' a nueva posición');
  return publicState();
};

/* P1-009: Bermuda Triangle — "You may reorganize your groups freely at the end
   of your turn." Es una reorganization GRATUITA: reutiliza detach()+push() de
   moveGroup pero sin exigir acción (no hay token que gastar) y sin exigir que el
   destino conserve una flecha libre más allá de lo razonable. Se modela como una
   lista de movimientos atómicos: si uno falla, los anteriores ya aplicados se
   conservan (el estado nunca queda a medio desmontar porque detach() se llama
   sólo tras validar TODOS los movimientos). */
E.organize=function(pid,moves){
  requireOwnMain(pid);
  if(!illuEff(pid).organizeAtEndOfTurn)
    throw new Error('Tu facción no puede reorganizar la estructura');
  if(!Array.isArray(moves)||!moves.length)throw new Error('Indica al menos un movimiento');
  /* validar TODO antes de tocar nada */
  moves.forEach(function(mv){
    var node=findNode(mv.uid);
    if(!node)throw new Error('Grupo inexistente: '+mv.uid);
    if(findOwnerPid(mv.uid)!==pid)throw new Error('Sólo puedes reorganizar tus propios grupos');
    if(node.paralyzed)throw new Error('Un grupo paralizado no puede moverse');
    var np=findNode(mv.newParentUid);
    if(!np)throw new Error('Destino inexistente');
    if(findOwnerPid(mv.newParentUid)!==pid)throw new Error('El destino debe estar en tu estructura');
    if(isCyclic(mv.uid,mv.newParentUid))throw new Error('No puedes mover un grupo dentro de sí mismo');
    if(depthUnder(mv.newParentUid)+subtreeList(node).length>MAX_DEPTH)throw new Error('La reorganización excede la profundidad máxima');
  });
  moves.forEach(function(mv){
    var node=findNode(mv.uid);
    var oldParent=findNodeThatHas(S.players[pid].structure,mv.uid);
    var np=findNode(mv.newParentUid);
    detach(oldParent,mv.uid);
    np.children.push(node);
  });
  log(S.players[pid].name+' reorganiza su estructura ('+moves.length+' movimiento/s)');
  return publicState();
};
/* Un movimiento es cíclico si el destino está dentro del subárbol que se mueve. */
function isCyclic(uid,newParentUid){
  if(uid===newParentUid)return true;
  var found=false;
  var node=findNode(uid);
  if(node)subtreeList(node).forEach(function(nd){if(nd.uid===newParentUid)found=true;});
  return found;
}
/* Profundidad disponible por debajo de un nodo (0 = el propio nodo). */
function depthUnder(uid){
  var best=0;
  walk(findNode(uid),function(nd){var d=depthOf(findNode(uid),nd.uid);if(d>best)best=d;});
  return best;
}
var MAX_DEPTH=10;

/* ================= PLOT INSTANT ATTACKS (P1-007) =================
   Assassination y Disaster NO son efectos automáticos: el texto dice
   "This is an Instant Attack to Destroy any Personality/Place ... Its Power is N".
   Se tiran 2d6, se compara el Poder del Plot contra el Poder actual del objetivo
   (más defensa, posición y apoyos) y sólo devasta/destruye si el ataque tiene éxito. */
function attrList(c){
  var a=c&&c.attributes;
  if(!a)return [];
  if(Array.isArray(a))return a;
  return String(a).split(/[,;/|]/).map(function(s){return s.trim();}).filter(Boolean);
}
function hasAttr(c,attr){
  if(!attr)return false;
  var t=String(attr).toLowerCase();
  return attrList(c).some(function(a){return String(a).toLowerCase()===t;});
}
function hasAnyAlign(c,list){
  if(!Array.isArray(list)||!list.length)return false;
  var al=c&&c.alignments||[];
  return al.some(function(a){return list.indexOf(a)>=0;});
}
/* El array `power` del Plot ordena entradas; la última sin condición es el default. */
function plotPowerFor(eff,tc,fallback){
  var list=(eff&&Array.isArray(eff.power)&&eff.power.length)?eff.power:null;
  if(!list)return fallback;
  for(var i=0;i<list.length;i++){
    var e=list[i]||{};
    var okAttr=!e.ifAttr||hasAttr(tc,e.ifAttr);
    var okName=!e.ifNames||(e.ifNames.indexOf(tc.name)>=0);
    if(okAttr&&okName&&typeof e.value==='number')return e.value;
  }
  for(var j=list.length-1;j>=0;j--){
    if(typeof (list[j]||{}).value==='number')return list[j].value;
  }
  return fallback;
}
/* Primer grupo jugable de una estructura (tokens > 0, no paralizado/zapeado/devastado). */
function firstUsableAid(pid,filter){
  if(pid<0||pid>=S.players.length)return null;
  var root=S.players[pid].structure;
  var found=null;
  walk(root,function(n){
    if(found||n===root)return;
    if(!n.tokens||n.paralyzed||n.zapped||n.devastated||n.actionStripped)return;
    var c=card(n.cardId);
    if(!c)return;
    if(!filter||filter(c,n))found=n;
  });
  return found;
}
/* Resuelve un Instant Attack de Plot. Devuelve un resultado trazable. */
function resolvePlotInstantAttack(pid,pc,tUid,opts){
  opts=opts||{};
  var eff=pc.effect||{};
  var nd=findNode(tUid);
  if(!nd)throw new Error('Objetivo inexistente');
  var tc=card(nd.cardId);
  if(eff.target&&tc.subtype!==eff.target)
    throw new Error(pc.name+' solo se usa sobre '+(eff.target==='place'?'Lugares (Place)':'Personalities (Personality)'));
  if(eff.requireAttr&&!hasAttr(tc,eff.requireAttr))
    throw new Error(pc.name+' requiere un objetivo con el atributo '+eff.requireAttr);
  if(eff.rejectAttr&&hasAttr(tc,eff.rejectAttr))
    throw new Error(pc.name+' no afecta objetivos con el atributo '+eff.rejectAttr);

  var power=plotPowerFor(eff,tc,10);
  var notes=[];
  /* P1-009: Servants of Cthulhu — "+4 on any attempt to destroy, EVEN WITH
     DISASTERS AND ASSASSINATIONS" (efecto.anyDestroy, incluye instant:true), y
     Adepts of Hermes — "+6 on any attempt to control or destroy a Magic group".
     Los Instant Attacks NO pasan por computeStrength(), así que el bonus se
     aplica aquí directamente sobre el Poder del Plot. */
  var ibPlot=illuAttackBonus(pid,'destroy',tc);
  if(ibPlot){power+=ibPlot;notes.push('+'+ibPlot+' por '+illuCard(pid).name);}

  if(eff.requireActionFromAttr){
    var an=opts.aidUid?findNode(opts.aidUid):null;
    if(opts.aidUid&&(!an||findOwnerPid(opts.aidUid)!==pid))
      throw new Error('El grupo que aporta la acción debe ser tuyo');
    if(!an)an=firstUsableAid(pid,function(c){return hasAttr(c,eff.requireActionFromAttr);});
    if(!an)throw new Error(pc.name+' necesita un grupo tuyo con acción de tipo '+eff.requireActionFromAttr);
    var ac=card(an.cardId);
    spendGroupToken(pid,an.uid);
    if(eff.addSummonerPower){var ap=curPower(an);power+=ap;notes.push('+'+ap+' de '+ac.name);}
    else notes.push('acción de '+ac.name+' usada');
  }else if(eff.mayAddPowerFromAligns){
    var mn=opts.aidUid?findNode(opts.aidUid):null;
    if(opts.aidUid&&(!mn||findOwnerPid(opts.aidUid)!==pid))
      throw new Error('El grupo que aporta la acción debe ser tuyo');
    if(!mn)mn=firstUsableAid(pid,function(c){return hasAnyAlign(c,eff.mayAddPowerFromAligns);});
    if(mn){spendGroupToken(pid,mn.uid);var mp=curPower(mn);power+=mp;notes.push('+'+mp+' de '+card(mn.cardId).name);}
  }

  var victim=findOwnerPid(tUid);
  var defPower=curPower(nd);
  if(eff.victimMayBeAided&&victim>=0){
    var vn=firstUsableAid(victim,null);
    if(vn){spendGroupToken(victim,vn.uid);var vp=curPower(vn);defPower+=vp;notes.push(card(vn.cardId).name+' se defiende (+'+vp+')');}
  }
  /* P1-009: Shangri-La — "+5 to defend against ANY attack". Los Instant Attacks
     también cuentan como ataque. */
  var sdb=victim>=0?illuDefenseBonus(victim):0;
  if(sdb){defPower+=sdb;notes.push('+'+sdb+' de defensa de '+illuCard(victim).name);}

  var pos=(victim>=0)?positionBonus(victim,tUid):0;
  var str=power-defPower-pos;
  var res={strength:str,power:power,defense:defPower,target:tc.name,plot:pc.name};
  if(str<2){
    res.ok=false;res.reason='fallo automático';
    log(pc.name+': ataque instantáneo contra '+tc.name+' falla automáticamente ('+str+')');
    return res;
  }
  var r=roll2d6();
  res.roll=r;
  if(r===11||r===12){res.ok=false;res.reason='FALLO automático (11-12 siempre fallan)';}
  else if(r<=str){res.ok=true;res.margin=str-r;}
  else{res.ok=false;res.reason='fallo';}
  if(!res.ok){log(pc.name+' falla contra '+tc.name+' ('+res.reason+')');return res;}

  nd.devastated=true;nd.tokens=0;
  subtreeList(nd).forEach(function(n){n.devastated=true;n.tokens=0;});
  log(pc.name+' devasta '+tc.name+(notes.length?' ('+notes.join(', ')+')':''));

  if(eff.onPlay&&Array.isArray(eff.onPlay.stripActionFromNames)&&victim>=0){
    var vroot=S.players[victim].structure;
    walk(vroot,function(n){
      if(n===vroot)return;
      var nc=card(n.cardId);
      if(!nc)return;
      if(eff.onPlay.stripActionFromNames.indexOf(nc.name)>=0){
        n.actionStripped=true;n.tokens=0;
        log(nc.name+' pierde su acción para el resto del turno');
      }
    });
  }

  var need=(eff.destroyMargin==null)?(eff.kind==='assassination'?0:null):eff.destroyMargin;
  if(need!=null&&res.margin>need){
    res.destroyed=true;
    destroyGroup(pid,tUid);
    log((eff.kind==='assassination'?'ASESINATO: ':'DESTRUCCIÓN: ')+tc.name+' (margen '+res.margin+'>'+need+')');
  }else{
    res.destroyed=false;
    if(need!=null)log('Margen '+res.margin+' ≤ '+need+': solo devastado, no destruido');
    else log(pc.name+' devasta pero nunca destruye (destroyMargin nulo)');
  }
  return res;
}

/* ================= PLOT CARDS ================= */
E.playPlot=function(pid,handIdx,targetUid,opts){
  opts=opts||{};
  var c0=C.cards[handIdx];
  var eff0=(c0&&c0.effect)||{kind:'generic'};
  var instant=(eff0.kind==='assassination'||eff0.kind==='disaster');
  if(instant){
    if(S.phase==='setup')throw new Error('No se pueden jugar Plot cards durante la preparación');
    if(S.phase==='gameover')throw new Error('La partida ha terminado');
  }else{
    requireOwnMain(pid);
  }
  var pl=S.players[pid];
  var i=pl.hand.indexOf(handIdx);
  if(i<0)throw new Error('Carta no está en tu mano');
  var c=c0;
  if(c.type!=='plot')throw new Error('No es una Plot card');
  rejectUnverifiedCard(c);
  var eff=c.effect||{kind:'generic'};
  var consumed=true;
  var lastResult=null;
  switch(eff.kind){
    case 'boost10':{
      var A=S.attack;
      if(!A||A.resolved){pl.exposedPlots.push(handIdx);consumed=false;
        log(c.name+' guardada como defensa +10 para este turno');}
      else{A.boosts.push({name:c.name,v:10});log(pl.name+' juega +10 al ataque ('+c.name+')');}
      break;}
    case 'paralyze':{
      var nd=findNode(targetUid);
      if(!nd)throw new Error('Objetivo inexistente');
      nd.paralyzed=true;nd.tokens=0;
      log('PARALIZADO: '+card(nd.cardId).name);break;}
    case 'power_increase':{
      var nd2=findNode(targetUid);
      if(!nd2)throw new Error('Objetivo inexistente');
      if(curPower(nd2)<(eff.value||8))nd2.powerOverride=eff.value||8;
      log('Poder aumentado a '+(eff.value||8)+' en '+card(nd2.cardId).name);break;}
    case 'zap':{
      for(var q=0;q<S.players.length;q++){
        if(q===pid)continue;
        var hit=findInTree(S.players[q].structure,targetUid);
        if(hit){walk(S.players[q].structure,function(n){n.zapped=true;});
          log('ZAP sobre toda la estructura de '+S.players[q].name);break;}
      }
      break;}
    case 'assassination':
    case 'disaster':{
      if(!targetUid)throw new Error(eff.kind==='assassination'?'Elige una Personality objetivo':'Elige un Place objetivo');
      lastResult=resolvePlotInstantAttack(pid,c,targetUid,opts);
      break;}
    case 'goal':{
      /* P1-010: una Goal card NO se juega. Las reglas dicen que se REVELA al
         declarar victoria (inwo_rules_extracted.txt:979-991 y
         librarian_result.txt:2186). El camino correcto es declareGoalVictory. */
      throw new Error('"'+c.name+'" es una Goal card: no se juega, se revela al declarar victoria');}
    case 'nwo':{
      /* one per color max — replace old same-color */
      pl.exposedPlots=pl.exposedPlots.filter(function(ix){
        var oc=C.cards[ix];
        if(oc.effect&&oc.effect.kind==='nwo'&&oc.effect.color&&eff.color&&oc.effect.color===eff.color){
          S.plotDiscard.push(ix);log('NWO reemplazada: '+oc.name);return false;
        }
        return true;
      });
      pl.exposedPlots.push(handIdx);consumed=false;
      log('NWO en juego: '+c.name+' ('+(eff.color||'?')+')');break;}
    default:{
      throw new Error('La carta "'+c.name+'" tiene una mecánica no implementada.');
    }
  }
  if(consumed)pl.hand.splice(i,1);
  else pl.hand.splice(i,1);
  var out=publicState();
  if(lastResult)out.lastPlotResult=lastResult;
  return out;
};

/* Instant attack de Potencia genérica. Comparte la semántica de dados con los
   Instant Attacks de Plot: <2 falla siempre y 11-12 siempre fallan. */
E.instantAttack=function(pid,power,targetUid,opts){
  if(S.phase==='gameover')return publicState();
  opts=opts||{};
  var nd=findNode(targetUid);
  if(!nd)throw new Error('Objetivo inexistente');
  var tc=card(nd.cardId);
  if(opts.targetSubtype&&tc.subtype!==opts.targetSubtype)
    throw new Error('Este ataque solo alcanza a '+opts.targetSubtype);
  var owner=findOwnerPid(targetUid);
  /* P1-009: los poderes especiales de la facción atacante/defensa también aplican
     a los Instant Attacks genéricos (no pasan por computeStrength). */
  var iaB=illuAttackBonus(pid,'destroy',tc);
  var idB=owner>=0?illuDefenseBonus(owner):0;
  var defP=curPower(nd)+(Number(opts.extraDefense)||0)+idB;
  var pos=(owner>=0)?positionBonus(owner,targetUid):0;
  var str=(Number(power)||0)+(Number(opts.extraPower)||0)+iaB-defP-pos;
  var res={strength:str,target:tc.name};
  if(iaB)res.illuBonus=iaB;
  if(str<2){
    res.ok=false;res.reason='fallo automático';
  }else{
    var r=roll2d6();
    res.roll=r;
    if(r===11||r===12){res.ok=false;res.reason='FALLO automático (11-12 siempre fallan)';}
    else if(r<=str){res.ok=true;res.margin=str-r;}
    else{res.ok=false;res.reason='fallo';}
  }
  if(res.ok){destroyGroup(pid,targetUid);log('ATAQUE INSTANTÁNEO: '+tc.name+' destruido (margen '+res.margin+')');}
  else log('Ataque instantáneo falló contra '+tc.name+' ('+res.reason+')');
  var out=publicState();
  out.lastPlotResult=res;
  return out;
};

/* ================= hand management ================= */
E.giveCard=function(fromPid,toPid,handIdx){
  var a=S.players[fromPid],b=S.players[toPid];
  var i=a.hand.indexOf(handIdx);
  if(i<0)throw new Error('No tienes esa carta');
  a.hand.splice(i,1);b.hand.push(handIdx);
  log(a.name+' da una carta a '+b.name);
  return publicState();
};
E.discardCard=function(pid,handIdx){
  var pl=S.players[pid];
  removeFromHand(pl,handIdx);
  var c=C.cards[handIdx];
  if(c.type==='plot')S.plotDiscard.push(handIdx);
  else S.groupDiscard.push(handIdx);
  log(pl.name+' descarta '+c.name);
  return publicState();
};
E.giveResourceTo=function(ownerPid,toPid,resUid){
  var pl=S.players[ownerPid];
  var r=pl.resources.filter(function(x){return x.uid===resUid;})[0];
  if(!r)throw new Error('Recurso inexistente');
  pl.resources.splice(pl.resources.indexOf(r),1);
  S.players[toPid].resources.push({uid:r.uid,cardId:r.cardId,linkedTo:S.players[toPid].illumId,tokens:r.tokens});
  log(S.players[ownerPid].name+' regala un recurso a '+S.players[toPid].name);
  return publicState();
};

/* ================= end of turn & victory ================= */
E.endTurn=function(){
  if(S.phase==='gameover')return publicState();
  if(S.phase!=='main')throw new Error('No se puede terminar un turno fuera de la fase principal');
  if(S.turnCompleted)throw new Error('Este turno ya fue terminado');
  if(S.attack)throw new Error('No se puede terminar el turno con un ataque sin resolver');
  var pid=S.currentPid;
  var pl=S.players[pid];
  if(!pl)throw new Error('No hay jugador activo');
  var plotsInHand=pl.hand.filter(function(ix){return C.cards[ix].type==='plot';});
  var exposed=pl.exposedPlots||[];
  /* P1-009: el límite de Plots en mano depende de la facción — Gnomes of Zurich
     declara plotHandLimit:6 ("You may hold 6 Plot cards in your hand, rather
     than the usual 5"). */
  var plotLimit=plotHandLimitOf(pid);
  var excess=plotsInHand.length+exposed.length-plotLimit;
  while(excess>0&&plotsInHand.length){
    var handIx=plotsInHand.shift();
    removeFromHand(pl,handIx);S.plotDiscard.push(handIx);
    log('Límite de mano: '+C.cards[handIx].name+' descartada (máx '+plotLimit+' Plots)');
    excess--;
  }
  while(excess>0&&pl.exposedPlots.length){
    var exposedIx=pl.exposedPlots.shift();
    S.plotDiscard.push(exposedIx);
    log('Límite de mano: '+C.cards[exposedIx].name+' descartada (máx '+plotLimit+' Plots)');
    excess--;
  }
  /* P1-010: "No player may have more than one Goal card in his hand" — 2 si
     Alternate Goals esta en mano. Se descarta el exceso antes de terminar el
     turno para que nunca exista un estado imposible al empezar el siguiente. */
  var gLimit=goalHandLimitOf(pl);
  var gHeld=goalCardsIn(pl);
  while(gHeld.length>gLimit){
    var gx=gHeld.shift();
    removeFromHand(pl,gx);S.plotDiscard.push(gx);
    log('Límite de Goal cards: '+C.cards[gx].name+' descartada (máx '+gLimit+')');
  }
  S.turnCompleted=true;
  pl.turnsCompleted++;
  checkElimination();
  checkVictory();
  if(S.phase==='gameover')return publicState();
  var next=(pid+1)%S.players.length;
  S.phase='begin';
  E.beginTurn(next);
  return publicState();
};

/* P1-008: goalMetFor() evaluaba los goals contra el `effect.code` y con umbrales
   escritos a mano (8, 30), ignorando por completo el objeto `goal` que trae cada
   carta en cards.js. Ahora la evaluación se deduce del dato: power_total,
   destroy_reduce, peaceful_power_in_play, goal_cards y basic con double
   (align/attr/powerAtLeast) + magicResourceCountsAsGroup. */
function goalMetFor(p){
  var pl=S.players[p];var ic=illuCard(p);
  if(!ic)return {met:false};
  var g=ic.goal||{type:'basic'};
  /* elimination win */
  var rivalsAlive=S.players.some(function(o,i){return i!==p&&!o.eliminated;});
  if(!rivalsAlive)return {met:true,how:'Todos los rivales eliminados'};

  /* --- metas especializadas declaradas en el dato --- */
  if(g.type==='destroy_reduce'){
    var needD=g.winAt||8;
    if(pl.destroyedByMe.length>=needD)
      return {met:true,how:ic.name+': '+pl.destroyedByMe.length+' grupos destruidos (meta '+needD+')'};
    /* si no, cae a la meta básica con meta reducida por cada destrucción */
  }else
  if(g.type==='peaceful_power_in_play'){
    var pp=sumPeacefulPower(pl),needP=g.total||30;
    if(pp>=needP)return {met:true,how:ic.name+': poder pacífico en juego '+pp+'/'+needP};
    return {met:false,count:pp,goal:needP};
  }else
  if(g.type==='goal_cards'){
    /* P1-010: la meta ya NO se cumple solo por tener cartas Goal en mano. Las
       reglas dicen que la Goal card se REVELA al declarar victoria y que el
       intento puede fallar (si falla vuelve a la mano, expuesta). Ganar exige
       E.declareGoalVictory(pid,handIdx), que valida el objetivo de la carta. */
    var held=goalCardsIn(pl).length;
    var ufoMax=g.max||3;
    return {met:false,count:held,goal:ufoMax,countLabel:held+'/'+ufoMax,
            howToWin:'Revela una carta Goal con E.declareGoalVictory'};
  }else
  if(g.type==='power_total'){
    var tot=sumTotalPower(pl),needT=g.total||0,missing=[];
    if(g.needEachAlign){var set=alignsCovered(pl);missing=CANON_ALIGNMENTS.filter(function(a){return !set[a];});}
    if(tot>=needT&&missing.length===0)
      return {met:true,how:ic.name+': poder total '+tot+'/'+needT+(g.needEachAlign?' con todas las ideologías cubiertas':'')};
    return {met:false,count:tot,goal:needT,missingAlignments:missing};
  }

  /* --- meta básica (12 grupos) con el doble declarado en el dato --- */
  var doubles={},doubledNames=[],count=0;
  walk(pl.structure,function(nd){
    if(nd.cardId==null||nd.paralyzed)return;
    var c=card(nd.cardId);count++;
    if(doubleQualifies(c,g.double)&&Object.keys(doubles).length<3&&!doubles[c.id]){
      doubles[c.id]=true;count++;doubledNames.push(c.name);
    }
  });
  var magicGroups=g.magicResourceCountsAsGroup?magicResourceGroups(pl):0;
  count+=magicGroups;
  var goal=effectiveGoalCount(p);
  if(count>=goal)
    return {met:true,how:ic.name+': meta cumplida ('+count+'/'+goal+(doubledNames.length?' con dobles: '+doubledNames.join(', '):'')+(magicGroups?' + '+magicGroups+' recurso(s) Mágico(s)':'')+')'};
  return {met:false,count:count,goal:goal};
}

function checkVictory(){
  if(S.phase==='gameover')return;
  if(S.turn<S.players.length+1)return; /* no wins during the first round */
  var met=[];
  for(var p=0;p<S.players.length;p++){
    if(S.players[p].eliminated)continue;
    var g=goalMetFor(p);
    if(g.met)met.push({pid:p,name:S.players[p].name,how:g.how});
  }
  if(met.length===1){
    S.winner={pids:[met[0].pid],how:met[0].how,name:met[0].name};
    S.phase='gameover';
    log('¡VICTORIA de '+met[0].name+'! '+met[0].how);
  }else if(met.length>1){
    /* shared victory unless same Illuminati */
    var illSet={};met.forEach(function(m){var c=illuCard(m.pid);illSet[c.id]=1;});
    var shared=Object.keys(illSet).length>1;
    S.winner={pids:shared?met.map(function(m){return m.pid;}):null,
              how:'Victoria compartida: '+met.map(function(m){return m.name;}).join(' + ')};
    if(shared){S.phase='gameover';log('¡'+S.winner.how+'!');}
    else{log('Mismas facciones Illuminati anulan victoria compartida — sigue el juego');}
  }else{
    log('Fin de turno. Nadie cumple meta aún.');
  }
}
E.checkVictory=function(){checkVictory();return publicState();};
E.goalStatus=function(p){return goalMetFor(p);};
/* P1-010: revelar una Goal card para declarar victoria. Las reglas la describen
   como REVELADA, no jugada: si el intento falla la carta vuelve a la mano y queda
   EXPUESTA (librarian_result.txt:2186). No consume la accion del turno porque es
   una declaracion de victoria, no un uso de carta. */
E.declareGoalVictory=function(pid,handIdx){
  if(S.phase==='gameover')return publicState();
  var pl=S.players[pid];if(!pl)throw new Error('No hay jugador');
  if(pl.hand.indexOf(handIdx)<0)throw new Error('No tienes esa carta en la mano');
  var c=C.cards[handIdx];
  if(!isGoalCardIdx(handIdx))
    throw new Error('"'+c.name+'" no es una Goal card (una Goal card es un Plot con efecto "goal")');
  var res=goalCardObjective(handIdx,pid);
  if(res.implemented===false)throw new Error(res.reason);
  removeFromHand(pl,handIdx);
  if(res.met){
    pl.exposedPlots.push(handIdx);
    S.winner={pids:[pid],how:'Goal card '+c.name+': '+(res.how||'objetivo cumplido'),name:pl.name};
    S.phase='gameover';
    log('¡VICTORIA de '+pl.name+'! Goal card revelada: '+c.name+' — '+(res.how||'objetivo cumplido'));
    return publicState();
  }
  pl.hand.push(handIdx);
  pl.goalCardsExposed=pl.goalCardsExposed||[];
  if(pl.goalCardsExposed.indexOf(c.id)<0)pl.goalCardsExposed.push(c.id);
  log(pl.name+' revela '+c.name+' pero el objetivo NO se cumple ('+(res.count||0)+'/'+(res.goal||0)+'); la carta vuelve a la mano expuesta');
  var out=publicState();
  out.lastGoalAttempt={card:c.name,met:false,count:res.count||0,goal:res.goal||0,exposed:true};
  return out;
};
E.illumDrawGroup=E.extraGroupDraw;
E.addAid=E.addSupport;

window.Engine=E;
})();
