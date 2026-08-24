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
function shareAlign(A,B){if(!A||!B)return false;for(var i=0;i<A.length;i++){if(B.indexOf(A[i])>=0)return true;}return true&&false;}
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
  for(var k=0;k<S.neutralArea.length;k++){if(S.neutralArea[k].uid===uid)return null;/*neutral handled apart*/}
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
    phase:'setup',turn:0,round:1,currentPid:-1,
    players:[],groupDeck:[],plotDeck:[],groupDiscard:[],plotDiscard:[],
    neutralArea:[],attack:null,log:[],uidCounter:100,winner:null,
    config:{goalCount:(configs.goalCount||12),ufoTargets:[]},
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
      resources:[],exposedPlots:[],discards:[],destroyedByMe:[],
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
    log:S.log.slice(-40),
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
    st.progress.groups=countControlled(pl)+'/'+S.config.goalCount;
    if(ic.effect&&ic.effect.code==='cthulhu')st.progress.destroyed=pl.destroyedByMe.length+'/8';
    if(ic.effect&&ic.effect.code==='shangrila')st.progress.peacefulPower=sumPeacefulPower(pl)+'/30';
    if(ic.effect&&ic.effect.code==='ufos'){st.progress.pick3=ufoProgress(p);}
    out.push(st);
  }
  return out;
}
function sumPeacefulPower(pl){
  var tot=0;walk(pl.structure,function(nd){
    if(nd.cardId==null)return;var c=card(nd.cardId);
    if(!nd.paralyzed&&c.alignments&&c.alignments.indexOf('peaceful')>=0&&(typeof c.power==='number'))tot+=c.power;
  });
  return tot;
}
function ufoProgress(pid){
  var tg=S.config.ufoTargets||[];
  var have=tg.filter(function(cid){return controlsGroup(pid,cid);}).length;
  return have+'/'+tg.length;
}
function controlsGroup(pid,cardIdRef){
  var found=false;
  walk(S.players[pid].structure,function(nd){if(nd.cardId===cardIdRef)found=true;});
  return found;
}
function goalText(ic){
  var g=ic.goal;
  if(!g)return 'Meta básica';
  if(g.type==='destroy')return 'Destruir '+g.count+' grupos';
  if(g.type==='peaceful_power')return 'Poder pacífico total '+g.total;
  if(g.type==='pick3')return 'Controlar tus 3 grupos elegidos';
  return 'Meta básica'+(g.doubleAttr?' ('+g.doubleAttr+' cuenta doble)':'');
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
  if(!E.allIlluminatiSet())throw new Error('Faltan Illuminati por elegir');
  /* deal hands: 3 plots + 10 groups (OBD) */
  S.players.forEach(function(pl){
    for(var i=0;i<3;i++)pl.hand.push(S.plotDeck.pop());
    for(var j=0;j<10;j++)pl.hand.push(S.groupDeck.pop());
  });
  var hasUfos=false;
  S.players.forEach(function(pl,q){var c=illuCard(q);if(c&&c.effect&&c.effect.code==='ufos')hasUfos=true;});
  if(hasUfos){
    var pool=C.cards.filter(function(c){return c.type==='group';});
    var picks=[];
    while(picks.length<3){var g=pool[Math.floor(Math.random()*pool.length)];if(picks.indexOf(g.id)<0)picks.push(g.id);}
    S.config.ufoTargets=picks;
  }
  /* high roll starts */
  var rolls=[],best=-1,bestP=0;
  do{
    rolls=[];
    for(var p=0;p<S.players.length;p++){rolls[p]=roll2d6();if(rolls[p]>best){best=rolls[p];bestP=p;}}
  }while(rolls.filter(function(r){return r===best;}).length>1);
  S.lastRoll={rolls:rolls,first:bestP};
  log('Tirada inicial: '+rolls.join(', ')+' — empieza '+S.players[bestP].name);
  S.phase='main';S.currentPid=bestP;S.turn=1;
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
  var pl=S.players[pid];
  if(S.phase==='gameover')return publicState();
  S.phase='begin';
  S.currentPid=pid;
  S.turn++;
  pl.turnsCompleted++;
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
    nd.tokens++;
  });
  /* resources whose text mentions Action get a token */
  pl.resources.forEach(function(r){
    var c=card(r.cardId);
    if(c&&/\baction\b/i.test(c.text||''))r.tokens=(r.tokens||0)+1;
  });
  checkElimination();
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
  pl.flags.plotDrawn=true;
  var ix=drawFrom(S.plotDeck,S.plotDiscard,'plots');
  if(ix==null)throw new Error('No quedan Plot cards');
  S.players[pid].hand.push(ix);
  return {idx:ix,card:C.cards[ix]};
};
E.drawGroup=function(pid){
  requireOwnMain(pid);
  var pl2=S.players[pid];
  if(pl2.flags.groupDrawn)throw new Error('Ya robaste tu carta de Grupo este turno');
  pl2.flags.groupDrawn=true;
  var ix=drawFrom(S.groupDeck,S.groupDiscard,'grupos');
  if(ix==null)throw new Error('No quedan Group cards');
  S.players[pid].hand.push(ix);
  return {idx:ix,card:C.cards[ix]};
};
E.exchangeForPlot=function(pid,payment){
  var pl=S.players[pid];
  if(payment&&payment.illum){
    if(pl.illumTokens<1)throw new Error('Sin acciones Illuminati para intercambiar');
    pl.illumTokens--;
  }else if(payment&&payment.groupUids&&payment.groupUids.length===2){
    payment.groupUids.forEach(function(u){spendGroupToken(pid,u);});
  }else throw new Error('Pago inválido (1 acción Illuminati o 2 tokens de grupo)');
  var ix=drawFrom(S.plotDeck,S.plotDiscard,'plots');
  if(ix==null)throw new Error('No quedan Plot cards');
  pl.hand.push(ix);
  log(pl.name+' intercambia tokens por una carta de Plot');
  return {idx:ix};
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

E.playResource=function(pid,handIdx,linkedToUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.usedResourceThisTurn)throw new Error('Solo 1 Resource por turno mediante acción');
  if(pl.illumTokens<1)throw new Error('Sin acciones Illuminati');
  var c=card(handIdx);
  if(!c||c.type!=='resource')throw new Error('No es un Resource');
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
  pl.illumTokens--;pl.usedExtraDrawThisTurn=true;
  return E.drawGroup(pid);
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
  twoPlayerGuard(pid);
  var pl=S.players[pid];
  var attackerUid=target.attackerUid;
  var att=findNode(attackerUid);
  if(!att)throw new Error('Atacante inexistente');
  if(findOwnerPid(attackerUid)!==pid)throw new Error('El atacante no te pertenece');
  if(att.paralyzed||att.zapped||att.devastated)throw new Error('Atacante no puede actuar');
  var attCard=card(att.cardId);
  /* spend attacker token */
  spendGroupToken(pid,attackerUid);

  var A={id:'a'+(S.uidCounter++),pid:pid,type:type,
    attackerUid:attackerUid,aids:[],opposes:[],privilege:false,
    boosts:[],defBoosts:[],selfDefended:false,resolved:false};

  if(isNeutralUid(target.uid)){
    A.neutralTarget=target.uid;
  }else{
    var tgt=findNode(target.uid);
    var handOwner=-1;
    if(tgt){
      var tCard=card(tgt.cardId);
      if(tCard.type==='illuminati')throw new Error('Los Illuminati no pueden ser atacados');
      var owner=findOwnerPid(target.uid);
      if(type==='control'&&owner===pid)throw new Error('No puedes tomar control de tu propio grupo');
      if(owner!==pid&&pl.immuneFrom[owner]&&(pl.immuneFrom[owner].indexOf?pl.immuneFrom[owner].indexOf(target.uid):-1)>=0)
        throw new Error('Tu ataque anterior contra '+S.players[owner].name+' falló: inmune el resto del turno');
      A.targetPid=owner;A.targetUid=target.uid;
    }else{
      /* attack a card in a rival's HAND (attack-to-control only) */
      if(type!=='control')throw new Error('Solo control se lanza contra cartas de la mano');
      for(var q=0;q<S.players.length;q++){
        if(q!==pid&&S.players[q].hand.indexOf(target.handIdx)>=0){handOwner=q;break;}
      }
      if(handOwner<0)throw new Error('Carta de mano no encontrada');
      A.handTarget={idx:target.handIdx,owner:handOwner};
    }
  }
  if(type==='control'&&!A.handTarget){
    if(openArrows(pid).length<1)throw new Error('Necesitas al menos una flecha libre para atacar a controlar');
  }
  S.attack=A;
  var tn=A.handTarget?C.cards[A.handTarget.idx].name:(card(findNode(A.neutralTarget||A.targetUid).cardId)||{}).name;
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
  if(entry.selfDefend){
    if(pid!==A.targetPid)throw new Error('Solo el defensor se autoprotege');
    var nd=findNode(A.targetUid);
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
  var pl=S.players[pid];var i=pl.hand.indexOf(idx);
  if(i<0)throw new Error('No tienes esa carta');
  pl.hand.splice(i,1);S.plotDiscard.push(idx);
  (toDefense?S.attack.defBoosts:S.attack.boosts).push({name:C.cards[idx].name,v:10});
  log((toDefense?'Defensa +10':'Ataque +10')+' jugada ('+C.cards[idx].name+')');
  return publicState();
};

/* ---------------- strength calc ---------------- */
E.previewStrength=function(){return computeStrength(false);};
function computeStrength(resolveMode){
  var A=S.attack;
  var att=findNode(A.attackerUid);
  var attCard=card(att.cardId);
  var tNode=A.targetUid?findNode(A.targetUid):null;
  var neutralIdx=null;
  if(A.neutralTarget){
    var na=S.neutralArea.filter(function(n){return n.uid===A.neutralTarget;})[0];
    neutralIdx=na.cardId;tNode={cardId:na.cardId,tokens:0};
  }
  var tCard=tNode?card(tNode.cardId):(A.handTarget?C.cards[A.handTarget.idx]:null);
  var det={base:0,leaderMod:0,defenseBase:0,defenseBonus:0,selfDef:0,posBonus:0,aids:0,opposes:0,boosts:0,cthulhu:0,total:0,notes:[]};

  var attAligns=alignsOf(attCard),tgtAligns=alignsOf(tCard);
  if(A.type==='control'){
    det.base=curPower(att);
    for(var i=0;i<attAligns.length;i++){ /* leader ±4 vs target aligns */
      if(tgtAligns.indexOf(attAligns[i])>=0)det.leaderMod+=4;
      else{var isOpp=false;for(var j=0;j<tgtAligns.length;j++)if(isOpposite(attAligns[i],tgtAligns[j]))isOpp=true;
        if(isOpp)det.leaderMod-=4;}
    }
    var R=(typeof tCard.resistance==='number')?tCard.resistance:5;
    det.defenseBase=R;
    /* master-shared alignments +4 each (skip fanatic-vs-fanatic master) */
    if(A.targetPid!=null){
      var mc=illuCard(A.targetPid);
      if(mc){
        var mal=alignsOf(mc),shared=[];
        tgtAligns.forEach(function(a){if(mal.indexOf(a)>=0)shared.push(a);});
        if(!(mc.effect&&mc.effect.code==='discordian'&&shared.length&&shared.every(function(a){return a==='fanatic';}))||true){
          shared.forEach(function(a){
            if(!(a==='fanatic'&&alignsOf(attCard).indexOf('fanatic')>=0))det.defenseBonus+=4;
            else det.notes.push('Fanático vs Fanático: sin bonus maestro');
          });
        }
      }
    }
    det.posBonus=A.neutralTarget?0:positionBonus(A.targetPid,A.targetUid);
    if(A.selfDefended){det.selfDef=2*curPower(tNode);}
    /* Discordian structure immunity vs straight/government attackers */
    if(A.targetPid!=null){
      var mc2=illuCard(A.targetPid);
      if(mc2&&mc2.effect&&mc2.effect.code==='discordian'){
        if(attAligns.indexOf('straight')>=0||attAligns.indexOf('government')>=0)
          det.notes.push('INMUNE: Discordian bloquea atacantes Straight/Government');
      }
    }
  }else{ /* destroy */
    det.base=curPower(att);
    for(var k=0;k<attAligns.length;k++){
      if(tgtAligns.indexOf(attAligns[k])>=0)det.leaderMod-=4;
      else{for(var m=0;m<tgtAligns.length;m++)if(isOpposite(attAligns[k],tgtAligns[m]))det.leaderMod+=4;}
    }
    if(A.targetPid!=null)det.posBonus=positionBonus(A.targetPid,A.targetUid);
    if(A.selfDefended)det.selfDef=2*curPower(tNode);
    var ac=illuCard(A.pid);
    if(ac&&ac.effect&&ac.effect.code==='cthulhu'){det.cthulhu=4;}
    if(neutralIdx!=null){det.posBonus=0;}
  }
  A.aids.forEach(function(a){det.aids+=a.power;});
  A.opposes.forEach(function(o){det.opposes+=o.power;});
  A.boosts.forEach(function(b){det.boosts+=b.v;});
  ['base','leaderMod','defenseBase','defenseBonus','posBonus','selfDef','aids','opposes','boosts','cthulhu'].forEach(function(k){
    if(!isFinite(det[k])){try{console.warn('INWO: campo NaN en fuerza →',k);}catch(e){}det[k]=0;}
  });
  var total=det.base+det.leaderMod-det.defenseBase-det.defenseBonus-det.posBonus-det.selfDef+det.aids-det.opposes+det.boosts+det.cthulhu;
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
  if(!tNode){S.attack=null;return;}
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
  var node=detach(parent,targetUid);
  var c=card(node.cardId);
  S.players[byPid].destroyedByMe.push(node.cardId);
  S.groupDiscard.push(node.cardId);
  /* linked resources destroyed */
  S.players[owner].resources=S.players[owner].resources.filter(function(r){
    if(r.linkedTo===targetUid){S.groupDiscard.push(r.cardId);log('Recurso linkeado destruido');return false;}
    return true;
  });
  /* puppets lose tokens, return to owner's HAND */
  subtreeList(node).forEach(function(nd){
    nd.tokens=0;
    S.players[owner].hand.push(nd.cardId);
  });
  log('DESTRUIDO: '+c.name+' (por '+S.players[byPid].name+'). Títeres vuelven a la mano de '+S.players[owner].name);
}

/* ---------------- move group ---------------- */
E.moveGroup=function(pid,uid,newParentUid,payWith){
  requireOwnMain(pid);
  var node=findNode(uid);
  if(!node)throw new Error('Grupo inexistente');
  if(node.paralyzed)throw new Error('Paralizado no puede moverse');
  var oldOwner=findOwnerPid(uid);
  var oldParent=findNodeThatHas(S.players[oldOwner].structure,uid);
  var np=findNode(newParentUid);
  if(!np||!isOpenArrow(np))throw new Error('Destino sin flecha libre');
  var payers=[uid,oldParent.uid,newParentUid];
  var paid=false;
  if(payers.indexOf(payWith)<0&&payWith!=='illum')throw new Error('Pago inválido (grupo movido/maestro viejo/nuevo o acción Illuminati)');
  if(payWith==='illum'){
    if(S.players[oldOwner].illumTokens<1)throw new Error('Sin acciones Illuminati');
    S.players[oldOwner].illumTokens--;paid=true;
  }else{spendGroupToken(oldOwner===pid?pid:oldOwner,payWith);paid=true;}
  detach(oldParent,uid);
  if(payWith==='illum'&&oldOwner===pid){} else {}
  np.children.push(node);
  log(S.players[pid].name+' mueve '+card(node.cardId).name+' a nueva posición');
  return publicState();
};

/* ================= PLOT CARDS ================= */
E.playPlot=function(pid,handIdx,targetUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  var i=pl.hand.indexOf(handIdx);
  if(i<0)throw new Error('Carta no está en tu mano');
  var c=C.cards[handIdx];
  if(c.type!=='plot')throw new Error('No es una Plot card');
  var eff=c.effect||{kind:'generic'};
  var consumed=true;
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
    case 'assassination':{
      var nd3=findNode(targetUid);
      if(!nd3)throw new Error('Solo se asesina un grupo en juego');
      var tc=card(nd3.cardId);
      if(tc.subtype!=='personality')throw new Error('Asesinato solo contra Personalities');
      destroyGroup(pid,targetUid);
      log('ASESINATO consumado: '+tc.name+' muere permanentemente');break;}
    case 'disaster':{
      var nd4=findNode(targetUid);
      if(!nd4)throw new Error('Objetivo inexistente');
      var dc=card(nd4.cardId);
      nd4.devastated=true;nd4.tokens=0;
      subtreeList(nd4).forEach(function(n){n.devastated=true;n.tokens=0;});
      log('DESASTRE ('+c.name+') devasta '+dc.name+' y su subárbol');break;}
    case 'goal':{
      pl.exposedPlots.push(handIdx);consumed=false;
      log(pl.name+' expone la meta: '+c.name);break;}
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
      log(pl.name+' juega '+c.name+' (efecto genérico, se descarta)');
      S.plotDiscard.push(handIdx);consumed=false;
    }
  }
  if(consumed)pl.hand.splice(i,1);
  else pl.hand.splice(i,1);
  return publicState();
};

/* Instant attack from plot power (assassinations/disasters use this too when direct) */
E.instantAttack=function(pid,power,targetUid){
  if(S.phase==='gameover')return publicState();
  var nd=findNode(targetUid);
  if(!nd)throw new Error('Objetivo inexistente');
  var owner=findOwnerPid(targetUid);
  var tc=card(nd.cardId);
  var str=power-curPower(nd);
  var pos=(owner>=0)?positionBonus(owner,targetUid):0;
  str-=pos;
  var resTxt;
  if(str<2)resTxt='fallo automático';
  else{var r=roll2d6();resTxt=(r<=str)?'ÉXITO':'fallo';}
  if(resTxt==='ÉXITO'){destroyGroup(pid,targetUid);}
  else log('Ataque instantáneo falló contra '+tc.name);
  return publicState();
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
  var pid=S.currentPid;
  var pl=S.players[pid];
  /* off-turn hand limit: max 5 plots at end of own turn */
  var plotsInHand=pl.hand.filter(function(ix){return C.cards[ix].type==='plot';});
  if(plotsInHand.length>5){
    plotsInHand.slice(5).forEach(function(ix){
      removeFromHand(pl,ix);S.plotDiscard.push(ix);
      log('Límite de mano: '+C.cards[ix].name+' descartada (máx 5 Plots)');
    });
  }
  /* zap removal by spending illum action is manual; clear nothing automatic */
  checkVictory();
  if(S.phase==='gameover')return publicState();
  var next=(pid+1)%S.players.length;
  E.beginTurn(next);
  return publicState();
};

function goalMetFor(p){
  var pl=S.players[p];var ic=illuCard(p);
  if(!ic)return {met:false};
  var eff=ic.effect||{};
  /* elimination win */
  var rivalsAlive=S.players.some(function(o,i){return i!==p&&!o.eliminated;});
  if(!rivalsAlive)return {met:true,how:'Todos los rivales eliminados'};
  if(eff.code==='cthulhu'&&pl.destroyedByMe.length>=8)
    return {met:true,how:'Servants of Cthulhu: 8 grupos destruidos'};
  if(eff.code==='shangrila'&&sumPeacefulPower(pl)>=30)
    return {met:true,how:'Shangri-La: poder pacífico ≥30'};
  if(eff.code==='ufos'){
    var tg=S.config.ufoTargets||[];
    if(tg.length===3&&tg.every(function(cid){return controlsGroup(p,cid);}))
      return {met:true,how:'UFOs: los 3 grupos secretos controlados'};
  }
  /* basic goal with doubling */
  var doubles={};var icEff=ic.goal||{};
  var attr=null;
  if(ic.goal&&ic.goal.doubleAttr)attr=ic.goal.doubleAttr;
  else if(eff.code==='network')attr='computer';
  else if(eff.code==='gnomes')attr='corporate';
  else if(eff.code==='discordian')attr='weird';
  var count=0,doubledNames=[];
  walk(pl.structure,function(nd){
    if(nd.cardId==null||nd.paralyzed)return;
    var c=card(nd.cardId);count++;
    if(attr&&c.alignments&&(c.alignments.indexOf(attr)>=0)&&Object.keys(doubles).length<3&&!doubles[c.id]){
      doubles[c.id]=true;count++;doubledNames.push(c.name);
    }
  });
  var goal=S.config.goalCount;
  if(count>=goal)return {met:true,how:'Meta básica cumplida ('+count+'/'+goal+(doubledNames.length?' con dobles: '+doubledNames.join(', '):'')+')'};
  return {met:false,count:count,goal:goal};
}

function checkVictory(){
  if(S.turn<2)return; /* no wins round 1 */
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
E.illumDrawGroup=E.extraGroupDraw;
E.addAid=E.addSupport;

window.Engine=E;
})();
