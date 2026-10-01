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
/* P1-023 — REGLA OFICIAL, inwo_rules_extracted.txt:373 (seccion "Control Arrows",
   p. 6): "Illuminati cards have four outgoing control arrows." Y :376-380 para
   cualquier otro grupo: "0 to 3 outgoing control arrows".

   DEFECTO: el discriminante era `cardId==null`, pero tras el setup la raiz YA
   TIENE cardId (el id-STRING de la faccion, que se le asigna al elegir el
   Illuminati). Medido sobre el mazo real: `cardId="bavarianilluminati1"` y
   `tokens:1`. Por tanto la rama de 4 flechas era INALCANZABLE en juego y el
   Illuminati tenia 3, una menos de las que manda el reglamento.

   El discriminante correcto es la IDENTIDAD con la raiz de alguna estructura,
   que es exactamente lo que la regla describe. No se anade ningun campo nuevo:
   la identidad ya es la unica fuente de verdad, y anadir `isRoot:true` a la
   raiz obligaria a mantenerlo sincronizado con cada sitio que construye la
   estructura. */
function isStructureRoot(node){
  if(!S||!S.players)return false;
  for(var i=0;i<S.players.length;i++)if(S.players[i].structure===node)return true;
  return false;
}
function maxChildren(node){return isStructureRoot(node)?4:3;}
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
  /* L2 / P1-028 — `powerMods`: modificadores ADITIVOS y apilables, distintos de
     `powerOverride` (que es un valor absoluto y por eso no admite "+2"). Se aplican
     DESPUES del override para que un "+2 de Dictatorship" sobreviva a un Anguish que
     fija el Poder a 1. Lo necesita la familia L2 (Dictatorship) y lo reserva
     plan.md L3 para el poder en masa ("+2 a todos los Corporates"). */
  var pm=(node&&Array.isArray(node.powerMods))?node.powerMods:null;
  if(pm)for(var m=0;m<pm.length;m++){ if(typeof pm[m].v==='number') p+=pm[m].v; }
  if(node.paralyzed)p=c.power||0; /* paralyze freezes abilities/tokens, power unchanged */
  return Math.max(0,p);
}

/* P1-011 — ¿Este nodo cuenta para las metas?
   Reglas oficiales (inwo_rules_extracted.txt):
   - Paralyze: "Control of a paralyzed Group does not count for any Goal."
   - Devastation: un grupo devastado "cannot get Action tokens and DO NOT COUNT
     TOWARD VICTORY" (librarian_result.txt:2151). El texto de règles lo repite:
     "the moved Group will then lose any Action tokens and cease to count toward
     victory" (líneas 681-682, al mover un grupo bajo un Place devastado).
   Antes estas dos comprobaciones vivían sueltas en cada recorrido de meta, y
   ningún recorrido miraba `devastated`: un grupo devastado seguía sumando para
   la victoria. Se centraliza aquí para que la regla exista en un solo sitio. */
function countsForGoals(nd){
  return nd.cardId!=null&&!nd.paralyzed&&!nd.devastated;
}

/* P1-011 — Poder con el que se defiende un objetivo.
   inwo_rules_extracted.txt:683-685: "While a Place is Devastated, its Power is
   halved (ROUND DOWN) against any Attack to Destroy." La reducción aplica SÓLO a
   los ataques de destrucción: un ataque de control sigue restando Resistencia.
   (Un nodo devastado siempre es un Place: sólo los Plots de tipo `disaster`, cuyo
   effect.target es 'place', escriben esa bandera.) */
function defenderPower(node,isDestroy){
  var p=curPower(node);
  if(isDestroy&&node.devastated)p=Math.floor(p/2);
  return Math.max(0,p);
}

/* P1-014 — Resistencia con la que se defiende un objetivo.
   El valor impreso vive en la CARTA, pero las cartas "Resistance Increase"
   (Commitment, Never Surrender) lo FIJAN sobre el grupo concreto mediante un link
   permanente. Antes computeStrength leia siempre `tCard.resistance`, asi que un
   link no podia cambiar la defensa real: la carta era la unica fuente de verdad.
   Ahora la fuente de verdad es el NODO y la carta solo es el valor por defecto.
   `node` puede venir a null (ataque contra una carta en la mano: no hay nodo), y
   en ese caso se cae a la carta. El 5 como ultimo recurso es el mismo valor por
   defecto que ya usaba el motor; no se introduce ninguna regla nueva. */
function nodeResistance(node,cardObj){
  if(node&&node.resistanceOverride!=null)return node.resistanceOverride;
  var c=cardObj||(node?card(node.cardId):null);
  var r=(c&&typeof c.resistance==='number')?c.resistance:5;
  /* L3a — `resistanceMods`: deltas ADITIVOS y apilables, distintos de
     `resistanceOverride` (que es un valor absoluto, y por eso no admite
     un "+1"). Se anaden DESPUES del override para que el "+1 de cada
     Weird" de Principia Discordia sobreviva a un Anguish que fije la
     Resistencia. Mismo criterio que `powerMods` dentro de curPower. */
  var rm=(node&&Array.isArray(node.resistanceMods))?node.resistanceMods:null;
  if(rm)for(var mi=0;mi<rm.length;mi++){ if(typeof rm[mi].v==='number') r+=rm[mi].v; }
  return r;
}
/* P1-015 — ¿Con qué Poder cuenta este nodo para una META?
   Las reglas oficiales son SILENTES sobre si un cambio de Poder hecho por una Plot
   cuenta para la meta. La unica frase explicita de todo el mazo es la de las cartas
   "+10": "does not count toward any Goal". Aqui se aplica el criterio
   "excepcion explicita => NO cuenta; silencio => cuenta", porque el Poder actual de
   un grupo es su Poder.
   Y el criterio no rompe la excepcion "+10": esas cartas NO escriben nada en el
   nodo (su +10 vive solo en A.boosts / A.defBoosts, o la carta queda expuesta), asi
   que seguir leyendo a traves de curPower() las deja excluidas por construccion.
   Lo que si empieza a contar son los cambios PERMANENTES por link (Power Increase,
   Messiah, Angst), que si escriben en el nodo. */
function goalPower(nd){
  return curPower(nd);
}

/* P1-016 — Bonus de defensa PERSISTENTE contra los ataques de destruccion.
   Bodyguard (208) dice: "That Personality now has an extra +6 against any Attempt
   to Destroy, INCLUDING FURTHER ASSASSINATIONS." Su +6 cubre los dos casos, asi que
   va entero a `destroyBonus`.
   Talisman of Ahrimanes (382) dice: "an extra +2 against any further attack to
   destroy OR +10 against any further Assassination". Son DOS cifras distintas para
   dos clases de ataque, asi que NO se puede guardar un solo numero: +2 siempre,
   +10 solo cuando el ataque es un Assassination. De ahi los dos campos.
   El texto de la carta es la autoridad: Bodyguard no distingue, Talisman si.
   Se pliega siempre en det.defBoosts (ataque normal) o en defPower (Instant
   Attack) porque la formula de `total` tiene una invariante verificada por la
   prueba P1-005 y no admite un campo nuevo. */
function destroyDefenseBonus(node,isAssassination){
  if(!node)return 0;
  var b=0;
  if(typeof node.destroyBonus==='number')b+=node.destroyBonus;
  if(isAssassination&&typeof node.assassinationBonus==='number')b+=node.assassinationBonus;
  return b;
}
function illuCard(pid){return card(S.players[pid].illumId);}
function alignsOf(cardObj){return (cardObj&&cardObj.alignments)?cardObj.alignments:[];}
/* L2: los identificadores de alineacion son minusculas ("violent") porque asi los
   indexa la tabla OPPOSITES y asi los imprime el dato. Los mensajes al jugador
   los capitalizan. */
function cap(s){var t=String(s||'');return t.charAt(0).toUpperCase()+t.slice(1);}

/* L2 / P1-028 — BONIFICACION DE DEFENSA POR "CLOSENESS TO THE ILLUMINATI".
 * Las reglas oficiales la nombran por su nombre en dos sitios distintos:
 *   - :563-576, Attack to Destroy, punto 1: "Its closeness to the Illuminati still
 *     counts for defense, unless you're destroying one of your own Groups."
 *   - :572: "The target does not get a defense bonus for closeness to the Illuminati
 *     in this case." (el ataque a un grupo propio)
 * El bloque vivia ENTERRADO dentro de computeStrength, lo que impedia reutilizarlo
 * para el texto de las nueve cartas de L2 ("Add bonuses for its closeness to the
 * Illuminati if it belongs to a rival!"). Se extrae a una funcion: la regla debe
 * existir una sola vez, y ahora mismo existia en un solo sitio por accidente.
 *
 * Son +4 por cada alineacion que el objetivo comparte con su Illuminati, con dos
 * excepciones oficiales ya respetadas desde antes:
 *   - si el Illuminati es el Discordian y TODAS las compartidas son fanatic, no
 *     hay bonificacion (un Discordian no protege a los suyos por fanaticismo);
 *   - si el atacante es fanatic y la compartida es fanatic, tampoco: las reglas
 *     ("any two Fanatic Groups are opposite to each other") hacen que se anulen.
 *     Sin atacante (L2) no hay segundo caso que comprobar.
 * `notes` es opcional: cuando se pasa, la razon de cada +4 queda registrada en el
 * informe de fuerza, igual que antes de la extraccion. */
function closenessDefenseBonus(ownerPid,node,cardObj,attAligns,notes){
  if(ownerPid==null)return 0;
  var mc=illuCard(ownerPid);
  if(!mc)return 0;
  var mal=alignsOf(mc);
  if(!mal.length)return 0;
  var tgt=nodeAligns(node,cardObj||(node?card(node.cardId):null));
  var shared=[];
  for(var i=0;i<tgt.length;i++)if(mal.indexOf(tgt[i])>=0)shared.push(tgt[i]);
  if(!shared.length)return 0;
  if(mc.effect&&mc.effect.code==='discordian'){
    var allFanatic=true;
    for(var f=0;f<shared.length;f++)if(shared[f]!=='fanatic')allFanatic=false;
    if(allFanatic)return 0;
  }
  var b=0;
  for(var s=0;s<shared.length;s++){
    if(attAligns&&shared[s]==='fanatic'&&attAligns.indexOf('fanatic')>=0){
      if(notes)notes.push('Fanático vs Fanático: sin bonus maestro');
      continue;
    }
    b+=4;
    if(notes)notes.push('Cerca de su Illuminati ('+shared[s]+'): +4 de defensa');
  }
  return b;
}

/* P1-017 — Alineaciones y atributos de un NODO, no de su carta.
   Este es el mismo tipo de defecto que corrigieron nodeResistance() (P1-014) y
   goalPower() (P1-015): el motor leia la etiqueta de la CARTA, que es inmutable,
   en mas de 20 sitios, y por eso ninguna carta podia cambiar de verdad la
   ideologia o el atributo de un grupo en juego. El texto impreso de Dictatorship
   es claro: "It becomes Violent, if it was not already" — eso solo es ejecutable
   si el cambio vive en el nodo.
   `node` puede venir a null (ataque a una carta en la mano): entonces se cae a
   la carta, que es el valor por defecto. Igual que nodeResistance().
   SEMANTICA DE `*Added` = ADICION (union), NO reemplazo. Las cartas que
   existen en este mazo solo SUMAN: "becomes Violent, if it was not already",
   "becomes a Media group, if it was not already one". Guardar un array de
   añadidas en vez de una copia completa permite ademas que Backlash (idx 200,
   "Any one change in the target's alignment ... is undone") deshaga el cambio
   sin tener que conocer la carta que lo produjo.
    L2 / P1-028 — `alignsRemoved`: la primera mitad del texto de las nueve cartas
    "The target becomes permanently X. If it was <opposite>, that alignment is lost"
    necesita RESTAR una alineacion, y hasta ahora no habia ninguna mecanica de
    sustraccion en el motor. OJO DECLARADO: esta sola linea cambia el comportamiento
    de TODOS los consumidores de nodeAligns — la bonificacion +/-4 de los ataques,
    `shares`, `isOpposite` y el caso token_gift de §39. Es lo correcto (una
    alineacion que el texto dice que se ha perdido no debe seguir contando para
    nada) pero conviene tenerlo presente antes de tocar nodeAligns otra vez.
    La suma gana a la resta: si una alineacion esta a la vez en ambos arrays (por
    ejemplo una re-alineacion posterior) cuenta como presente. */
function nodeAligns(node,cardObj){
  var base=alignsOf(cardObj||(node?card(node.cardId):null)).slice();
  var add=(node&&Array.isArray(node.alignsAdded))?node.alignsAdded:null;
  if(add)for(var i=0;i<add.length;i++){
    var a=String(add[i]).toLowerCase();
    if(base.indexOf(a)<0)base.push(a);
  }
  var rem=(node&&Array.isArray(node.alignsRemoved))?node.alignsRemoved:null;
  if(rem&&rem.length){
    var kept=[];
    for(var k=0;k<base.length;k++){
      if(rem.indexOf(base[k])>=0&&(add||[]).indexOf(base[k])<0)continue;
      kept.push(base[k]);
    }
    base=kept;
  }
  return base;
}
function nodeAttrs(node,cardObj){
  var c=cardObj||(node?card(node.cardId):null);
  var base=attrList(c).slice();
  var add=(node&&Array.isArray(node.attrsAdded))?node.attrsAdded:null;
  if(add)for(var i=0;i<add.length;i++){
    var a=String(add[i]).toLowerCase();
    var dup=false;
    for(var j=0;j<base.length;j++)if(String(base[j]).toLowerCase()===a){dup=true;break;}
    if(!dup)base.push(a);
  }
  return base;
}
/* Lee un atributo desde el nodo cuando existe. El 3.er parametro es OPCIONAL a
   proposito: las llamadas que solo tienen la carta (comprobaciones sobre cartas
   que aun no estan en juego) siguen siendo validas sin tocar. */
function nodeHasAlign(node,align){return nodeAligns(node).indexOf(align)>=0;}

/* ---------------- game creation ---------------- */
E.newGame=function(configs){
  configs=configs||[];
  S={
      phase:'setup',turn:0,round:1,currentPid:-1,turnCompleted:false,
    players:[],groupDeck:[],plotDeck:[],groupDiscard:[],plotDiscard:[],
    neutralArea:[],attack:null,pendingAttack:null,pendingRoll:null,pendingEvent:null,log:[],uidCounter:100,winner:null,
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
      /* P1-013: los Plots linkeados a un grupo se quedan en la mesa
         indefinidamente (OFFICIAL_RULES_FINDINGS §8: "Linked Plots ... remain
         on the table indefinitely"), a diferencia de un Plot exposure normal.
         Aqui se guarda {uid,cardId,linkedTo} para que el cambio siga visible y
         para poder deshacer el efecto si el grupo linkeado sale de la mesa. */
      linkedPlots:[],
      turnsCompleted:0,immuneFrom:{},pickedSecrets:[],flags:{autoTakeover:false,privilegedUsed:0}
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
    /* P1-016: se expone el ataque pendiente para que la UI pueda ofrecer la
       ventana de reaccion. Es null en el 99% de las partidas, porque la ventana
       solo se abre si alguien tiene en la mano una carta de cancelacion. */
    pendingAttack:S.pendingAttack?{pid:S.pendingAttack.pid,cardName:S.pendingAttack.cardName,targetName:S.pendingAttack.tc.name,targetUid:S.pendingAttack.tUid,cancelled:S.pendingAttack.cancelled||null}:null,
    /* P1-024: idem para la ventana de RODADERO (post-tirada, pre-efecto). */
    pendingRoll:S.pendingRoll?{label:S.pendingRoll.label,target:S.pendingRoll.target,klass:S.pendingRoll.klass,
      attackerPid:S.pendingRoll.pid,roll:S.pendingRoll.roll,total:S.pendingRoll.total,
      success:!!S.pendingRoll.success,mods:S.pendingRoll.mods.slice(),
      reroll:S.pendingRoll.reroll?{card:S.pendingRoll.reroll.cardName,penalty:S.pendingRoll.reroll.penalty||0}:null,
      cancelled:S.pendingRoll.cancelled?{card:S.pendingRoll.cancelled.cardName,by:S.pendingRoll.cancelled.name}:null,
      responders:S.pendingRoll.responders?S.pendingRoll.responders.slice():[]}:null,
    /* P1-027: la ventana de SUCESO de carta (no de dados). Se proyecta campo a
     * campo como las otras dos: `data` lleva inside el indice de la Plot en
     * disputa y las fichas internas de la respuesta, y nada de eso debe salir
     * al cliente tal cual. */
    pendingEvent:S.pendingEvent?{kind:S.pendingEvent.kind,label:S.pendingEvent.label,
      byPid:S.pendingEvent.byPid,
      byName:S.pendingEvent.data?S.pendingEvent.data.byName:'',
      cardName:S.pendingEvent.data&&S.pendingEvent.data.cardIdx!=null?card(S.pendingEvent.data.cardIdx).name:'',
      claimed:!!(S.pendingEvent.data&&S.pendingEvent.data.claimed),
      taken:!!(S.pendingEvent.data&&S.pendingEvent.data.taken),
      responders:S.pendingEvent.responders?S.pendingEvent.responders.slice():[]}:null,
    players:S.players.map(function(pl,i){
      return {
        idx:i,name:pl.name,human:pl.human,illumId:pl.illumId,
        illumTokens:pl.illumTokens,hand:pl.hand.slice(),
        autoUsed:!!(pl.flags&&pl.flags.autoTakeover),
        drewPlot:!!(pl.flags&&pl.flags.plotDrawn),
        drewGroup:!!(pl.flags&&pl.flags.groupDrawn),
        /* P1-026: la UI necesita saber si el ataque privilegiado ya se gasto. */
        privilegedUsed:(pl.flags&&pl.flags.privilegedUsed)||0,
        handCounts:{plots:pl.hand.filter(function(ix){return card(ix)&&card(ix).type==='plot';}).length,
                    groups:pl.hand.filter(function(ix){return card(ix)&&card(ix).type!=='plot';}).length},
        structure:clone(pl.structure),
        resources:clone(pl.resources),
        exposedPlots:pl.exposedPlots.slice(),
    linkedPlots:(pl.linkedPlots||[]).map(function(lp){return {uid:lp.uid,cardId:lp.cardId,linkedTo:lp.linkedTo};}),
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
  var n=0;walk(pl.structure,function(nd){if(countsForGoals(nd))n++;});return n;
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
    /* P1-010: la clave se llama `goalCards` y no `pick3`. `pick3` era el
       residuo de la lectura equivocada ("3 grupos especiales") y la UI lo
       imprimia tal cual, de modo que el jugador leia "pick3 0/3" y creia
       que tenia que controlar 3 grupos. */
    if(g.type==='goal_cards')st.progress.goalCards=ufoProgress(p);
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
    /* P1-017: se lee la IDEOLOGIA del nodo, no la de la carta. */
    if(countsForGoals(nd)&&nodeAligns(nd).indexOf('peaceful')>=0&&(typeof c.power==='number'))tot+=goalPower(nd);
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
/* P1-014 — correccion de un bug de P1-010: al descartar el exceso de Goal
   cards NO se puede descartar `Alternate Goals` mientras queden otras. Esa carta
   es la que AUTORIZA el segundo hueco ("You may possess two Goal cards"); si se
   va primero, el motor se queda con 2 Goal cards sin la carta que justifica
   tener 2, o sea un estado imposible (sin ella el limite es 1).
   El bug estaba en DOS sitios con codigo duplicado (reparto inicial y endTurn);
   se centraliza aqui para que no vuelvan a divergir. Se detectó porque el test
   de P1-010 encontro 2 cartas Goal supervivientes y ninguna era Alternate Goals.
   Cuando el limite es 1 se conserva la primera en orden de mano: cualquier
   sola carta Goal es legal, asi que NO se decide por el motor cual conviene. */
function enforceGoalHandLimit(pl,prefix){
  var lim=goalHandLimitOf(pl);
  var held=goalCardsIn(pl);
  if(held.length<=lim)return 0;
  var ALT='Alternate Goals';
  var drop;
  if(lim===2){
    var keep=held.filter(function(ix){return C.cards[ix].name===ALT;});
    var others=held.filter(function(ix){return C.cards[ix].name!==ALT;});
    keep=keep.concat(others.slice(0,1));
    drop=held.filter(function(ix){return keep.indexOf(ix)<0;});
  }else{
    drop=held.slice(lim);
  }
  drop.forEach(function(gx){
    /* P1-027: el que descarta es el dueno de `pl`. Se busca por indice para no
       cambiar la firma de enforceGoalHandLimit (la llaman dos sitios). */
    removeFromHand(pl,gx);discardPlot(gx,S.players.indexOf(pl));
    log(prefix+card(gx).name+' descartada (máx '+lim+' Goal cards)');
  });
  return drop.length;
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
    if(doubleQualifies(nd,g,dbl)&&doubled<3&&!seen[g.id]){seen[g.id]=1;doubled++;n++;}
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
    if(!countsForGoals(nd))return;var g=card(nd.cardId);n++;
      var a=nodeAligns(nd,g);
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
    if(!countsForGoals(nd))return;var c=card(nd.cardId);
    nodeAligns(nd,c).forEach(function(a){set[a]=true;});
  });
  return set;
}
function sumTotalPower(pl){
  var tot=0;
  walk(pl.structure,function(nd){
    if(!countsForGoals(nd))return;
    tot+=goalPower(nd); /* P1-015: ver goalPower() — el Poder actual del nodo */
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
/* P1-017: la firma pasa a (node, cardObj, dbl) para que las condiciones se
   evaluen contra el grupo CONCRETO. Antes se leia la carta inmutable, asi que un
   grupo al que Dictatorship (239) le anadio 'violent' no podia contar doble pese a
   ser violent de verdad. `c` puede ser null si se llama sin nodo, y entonces se
   cae a la carta, que es el valor por defecto. */
function doubleQualifies(node,c,dbl){
  if(!dbl)return false;
  var hasAlign=!!dbl.align,hasAttrF=!!dbl.attr;
  if(hasAlign||hasAttrF){
    var al=nodeAligns(node,c),byAlign=hasAlign&&al.indexOf(dbl.align)>=0;
    var byAttr=false;
    if(hasAttrF){
      var at=nodeAttrs(node,c);
      for(var i=0;i<at.length;i++){
        if(String(at[i]).toLowerCase()===String(dbl.attr).toLowerCase()){byAttr=true;break;}
      }
    }
    var ok=byAlign||byAttr;
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
    enforceGoalHandLimit(pl,'Reparto inicial: ');
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
  /* P1-026: el ataque privilegiado de los Bavarianos es "1 vez por turno". */
  pl.flags.privilegedUsed=0;
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
  /* P1-027 — EMBEZZLEMENT (249): "Play immediately when another player draws a
   * Plot card, before he uses it or announces what it is." El suceso es el ROBO,
   * asi que la ventana se abre aqui y no cuando la carta se juega: mientras
   * `S.pendingEvent` este abierto, `E.playPlot` rechaza specifically esa carta.
   * La ventana solo se abre si alguien tiene Embezzlement (eventReactionAllowed),
   * asi que nunca se bloquea una partida por un suceso sin respuesta posible. */
  openEventWindow({kind:'plotDrawn',byPid:pid,label:pl.name+' roba una Plot card ('+card(ix).name+')',
                   data:{cardIdx:ix,byName:pl.name}});
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
  /* P1-031 - E.playResource NUNCA despachaba por effect.kind: enlazaba el
   * Resource y no ejecutaba nada. Hoy solo hay un Resource con mecanica
   * verificada (344 Principia Discordia, kind bulk_power) y por eso 344 no se
   * podia jugar en absoluto; el defecto estaba latente. Se ejecuta el mismo
   * cuerpo que E.playPlot, y el default LANZA para que ningun Resource con
   * mecanica pueda volver a jugarse en silencio. rejectUnverifiedCard ya ha
   * descartado los kind === "unverified", asi que lo que llega aqui tiene
   * mecanica verificada y por tanto merece un error explicito. */
  var resFx = (c.effect || {}).kind;
  if (resFx === 'bulk_power') applyBulkPower(pid, c, c.effect);
  else throw new Error('El Resource "' + c.name + '" tiene una mecanica (' + resFx + ') que E.playResource todavia no ejecuta');
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

/* P1-022 — REGLA OFICIAL, inwo_rules_extracted.txt:405 (columna derecha):
   "Illuminati Groups can attack, but cannot be attacked! The only way to
   destroy Illuminati is to take away all the Groups they control."
   Y el Glosario (:1079-1081): "Illuminati Groups never have alignments or
   attributes. They can never be destroyed, except by losing all their puppets."

   De la segunda cita se deduce que el Illuminati NO puede ayudar ni oponerse
   nunca (ayudar exige una alineacion comun con el objetivo y oponerse una
   opuesta, y el no tiene ninguna), y por eso la primera frase es la declaracion
   COMPLETA de su participacion en combate: solo puede ser el atacante. Por eso
   addSupport() se deja intacto a proposito: su exclusion por alineaciones ya es
   la regla correcta, y no hace falta ningun codigo extra para el Illuminati.

   Y para ATACAR no hace falta ningun helper: el Illuminati es un grupo mas y
   gasta su propia ficha de grupo con spendGroupToken(), igual que cualquier
   titere. Se intento primero un helper que gastara `pl.illumTokens` (el contador
   de accion Illuminati que usan exchangeForPlot / playResource / moveGroup /
   angst / dictatorship)    y se retiro al MEDIR: beginTurn() ya pone `tokens:1`
   en la raiz porque su walk() incluye la raiz, asi que el Illuminati tiene ficha
   propia y el helper habia hecho gastar DOS pools distintos (illumTokens 2->1
   y tokens intacto) por un solo ataque. Un ataque se paga con una sola ficha. */

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
      if(discordianBlocks(owner,att,attCard))
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
  /* P1-022: la raiz Illuminati SI puede atacar (regla oficial
     inwo_rules_extracted.txt:405, "Illuminati Groups can attack, but cannot be
     attacked!") y lo hace como cualquier grupo: gasta SU ficha de grupo con
     spendGroupToken(). Se midio que antes ya funcionaba (declareAttack con
     attackerUid='p0-root' abria el ataque y la ficha de la raiz bajaba), asi que
     este lote NO anade ninguna capacidad: solo deja constancia de la regla y
     evita el error de modelar una capacidad que ya existia. Un ataque se paga
     con UNA ficha, nunca con dos pools a la vez. */
  spendGroupToken(pid,attackerUid);
  S.attack=A;
  log(pl.name+' declara ataque a '+type+' con '+attCard.name+' contra '+(tn||'?'));
  return publicState();
};

/* P1-026 — el ataque PRIVILEGIADO. Este metodo no estaba cableado en ningun
 * sitio de produccion (0 llamadores) y su campo no lo leia nadie: el poder
 * "1 vez por turno" de los Bavarianos era decorativo. Ahora se usa y se
 * controla. Quien lo llama tiene que ser el atacante, porque el privilegio lo
 * concede el atacante sobre SU ataque. */
E.togglePrivilege=function(){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  var A=S.attack;
  /* El privilegio se concede al declarar el ataque, antes de que nadie pueda
     ayudar: si se admitiera despues, el que ya habia aportado su ficha se
     veria cobrado su participacion sin previo aviso. */
  if(A.aids.length||A.opposes.length)
    throw new Error('El ataque debe volverse privilegiado ANTES de que nadie participe');
  if(A.privilege){A.privilege=false;return publicState();}
  var per=illuEff(A.pid).privilegedPerTurn;
  if(!per)
    throw new Error('Tu facción Illuminati no concede ataques privilegiados');
  var pl=S.players[A.pid];
  if((pl.flags.privilegedUsed||0)>=per)
    throw new Error('Ya has usado tu ataque privilegiado este turno');
  pl.flags.privilegedUsed=(pl.flags.privilegedUsed||0)+1;
  A.privilege=true;
  log(S.players[A.pid].name+' declara el ataque PRIVILEGIADO: nadie más que atacante y defensor puede participar');
  return publicState();
};

/* aid/oppose entries: {uid,power} — eligibility checked here */
E.addSupport=function(pid,entry){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  var A=S.attack;
  if(!entry||typeof entry!=='object')throw new Error('Apoyo inválido');
  /* P1-026 — `privilege` existia desde la primera version pero NO lo leia nadie:
   * se inicializaba en `E.declareAttack`, se pintaba en la UI ("PRIVILEGED") y
   * `E.togglePrivilege` no tenia ni un solo llamador en produccion. O sea, el
   * ataque privilegiado de los Illuminati Bavarianos ("1 vez por turno") era
   * puro adorno. Ahora SI se aplica, y este es el UNICO punto donde puede
   * aplicarse: `E.addSupport` es la unica puerta por la que un tercero se suma
   * a un ataque (ayudar u oponerse son la misma llamada).
   *
   * Regla oficial, inwo_rules_extracted.txt:1140-1148, glosario "Interference":
   * "Interference is participation in an attack by players other than the
   *  attacker and defender. If a player is unable to interfere in an attack
   *  (usually because it has been made Privileged), he cannot use any Plot,
   *  action, or special ability to affect that attack (though he may be able to
   *  affect the die roll after the attack is over)."
   * Es decir: el privilegio cierra la INTERFERENCIA (ayudar/oponerse), y el
   * mismo texto deja el rodadero abierto — por eso la ventana de P1-024 no se
   * mira para nada aqui. Solo quedan dentro atacante y defensor. */
  if(A.privilege&&pid!==A.pid&&pid!==A.targetPid)
    throw new Error('El ataque es PRIVILEGIADO: solo el atacante y el defensor pueden participar');
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
    /* P1-017: se comparan las alineaciones de los NODOS, no de las cartas: un
       grupo al que Dictatorship (239) le anadio 'violent' puede ayudar a controlar
       a otro violent aunque su carta impresa no lo fuera. tNode es null en un
       ataque a una carta de la mano (aun no esta en juego): entonces nodeAligns
       cae a la carta, que es el comportamiento correcto. */
    if(!shares(nodeAligns(sup,sc),nodeAligns(tNode,tCard)))throw new Error('Para ayudar a controlar necesita ≥1 alineación común con el objetivo');
  }else{
    var opp=false,al=nodeAligns(sup,sc),tl=nodeAligns(tNode,tCard);
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
  pl.hand.splice(i,1);discardPlot(idx,pid);
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
function bonusTargetMatches(b,node,tCard){
  if(!b||!tCard)return false;
  if(!b.targetAlign&&!b.targetAttr)return false;
  if(b.targetAlign&&nodeAligns(node,tCard).indexOf(b.targetAlign)>=0)return true;
  if(b.targetAttr&&hasAttr(tCard,b.targetAttr,node))return true;
  return false;
}
/* Bonus de ataque del Illuminati del atacante: control o destroy.
   P1-017: `node` se propaga para que el bonus se evalue contra el grupo concreto. */
function illuAttackBonus(pid,type,node,tCard){
  var b=illuEff(pid).bonus;if(!b)return 0;
  if(b.anyDestroy)return (type==='destroy')?(b.anyDestroy||0):0;
  if(!bonusTargetMatches(b,node,tCard))return 0;
  return (type==='destroy')?((b.destroy||b.anyDestroy||0)):(b.control||0);
}
/* Shangri-La: +5 a defender CUALQUIER ataque recibido. */
function illuDefenseBonus(defPid){
  var db=illuEff(defPid).defenseBonus;
  return (db&&typeof db.anyAttack==='number')?db.anyAttack:0;
}
/* Discordian Society: inmune a atacantes Government/Straight.
   P1-017: se miran las alineaciones del NODO atacante: si Dictatorship lo volvio
   violent, deja de estar government aunque su carta impresa lo siga estando. */
function discordianBlocks(defPid,attNode,attCard){
  var list=illuEff(defPid).immuneToAligns;
  if(!list||!list.length||!attCard)return false;
  var al=nodeAligns(attNode,attCard);
  for(var i=0;i<list.length;i++)if(al.indexOf(list[i])>=0)return true;
  return false;
}
/* Shangri-La: sólo se puede destruir a Violence o al Illuminati rival. */
function shangriLaBlocksDestroy(defPid,node){
  var d=illuEff(defPid).destroyOnly;
  if(!d||!node)return false;
  if(node===S.players[defPid].structure)return !d.allowRivalIlluminati;
  /* OJO: `indexOf` devuelve -1 cuando NO esta, y 0 cuando es el primer elemento.
     Por eso el test es `<0` y NO `!indexOf(...)`: con `!` el veto quedaria muerto
     (Gordo Remora = ['liberal'] -> -1 -> truthy -> `!-1` = false = "no bloqueado",
     y Texas, que si es violent, tambien pasaria). El gate P1-009scenario 7 caza
     exactamente este error, asi que no se puede volver a escribir con `!`. */
  return nodeAligns(node).indexOf('violent')<0;
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

  /* P1-017: las alineaciones se leen del NODO, no de la carta. Una banda con
     'violent' anadido por Dictatorship (239) cuenta como violent para los +4/-4
     de esta funcion, para la defensa del master y para la ayuda/oposicion. */
  var attAligns=nodeAligns(att,attCard),tgtAligns=nodeAligns(tNode,tCard);
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
    var ibCtl=illuAttackBonus(A.pid,'control',tNode,tCard);
    if(ibCtl){det.leaderMod+=ibCtl;det.notes.push('Bonus del Illuminati atacante: +'+ibCtl);}
    /* P1-014: la Resistencia se lee del NODO, no de la carta. Sin esto, las
       cartas "Resistance Increase" fijarian un valor que la cuenta de fuerza
       nunca leeria. Para un objetivo en la mano no hay nodo y se usa la carta. */
    var R=nodeResistance(tNode,tCard);
    det.defenseBase=R;
    if(tNode&&tNode.resistanceOverride!=null)
      det.notes.push('Resistencia fijada en '+R+' por un link permanente');
    /* master-shared alignments +4 each (skip fanatic-vs-fanatic master).
       L2 / P1-028: la regla vive ahora en closenessDefenseBonus(), que ademas la
       reutilizan las nueve cartas de "force_align". Solo se aplica a ataques
      contra un objetivo de OTRO jugador (A.targetPid!=null ya lo garantiza). */
    if(A.targetPid!=null){
      det.defenseBonus+=closenessDefenseBonus(A.targetPid,tNode,tCard,attAligns,det.notes);
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
    /* P1-011 (P0) — REGLA OFICIAL, inwo_rules_extracted.txt:561-580, "Attack to
       Destroy", punto (1): "Instead of rolling 'Power minus Resistance,' roll
       'Power minus Power.' That is, the target defends with its Power rather
       than its Resistance." Antes el motor NUNCA restaba el Poder del objetivo en
       una destrucción (defenseBase se quedaba en 0), de modo que un grupo con
       Poder 2 podía destruir a un grupo con Poder 14 si las alineaciones y la
       posición no lo impedían. La comprobación es empírica: la sonda
       scripts/_tmp_probe_destroy.js+KKK(2) contra Texas(14) devolvía
       defenseBase:0, total:-12 (fallaba sólo por la penalización de
       alineaciones y el +10 posicional, no por el Poder del defensor).
       NO se resta defenseBonus: el punto (1) sigue diciendo "The target's common
       alignments with its master do not help — those increase Resistance, which
       is not used in this attack".
       defenseBase ya forma parte de los 12 campos de la fórmula de total, así
       que la fórmula NO cambia y la invariante que verifica la prueba P1-005 se
       mantiene intacta. */
    det.defenseBase=tNode?defenderPower(tNode,true):0;
    /* P1-011 — REGLA OFICIAL, mismo apartado, punto (2): "You may try to destroy
       a Group in your own Power Structure. The target does not get a defense
       bonus for closeness to the Illuminati in this case." Se compara el
       objetivo con el atacante para NO conceder la defensa posicional cuando la
       víctima es un grupo propio. */
    if(!A.neutralTarget&&!A.handTarget&&A.targetPid!=null&&A.targetUid&&A.targetPid!==A.pid)det.posBonus=positionBonus(A.targetPid,A.targetUid);
    if(A.selfDefended&&tNode)det.selfDef=2*curPower(tNode);
    /* P1-009: Servants of Cthulhu +4 a cualquier destroy (el campo cthulhu ya
       participa en la fórmula de total). Se generaliza el antiguo caso
       hard-coded 'cthulhu' para que el bonus llegue por el dato, no por el id. */
    var ibDst=illuAttackBonus(A.pid,'destroy',tNode,tCard);
    if(ibDst){det.cthulhu+=ibDst;det.notes.push('Bonus del Illuminati atacante (destroy): +'+ibDst);}
    /* P1-016: Bodyguard (+6 "against any Attempt to Destroy, including further
       Assassinations") y Talisman of Ahrimanes (+2 contra cualquier destruccion).
       Se pliega en det.defBoosts, que YA participa en la formula de total, en vez
       de inventar un campo nuevo: la formula tiene una invariante verificada por
       la prueba P1-005 y no admite campos añadidos. Ojo: esto va DESPUES de
       defenseBase, que es el Poder del objetivo, y no lo sustituye. */
    var pgB=destroyDefenseBonus(tNode,false);
    if(pgB){det.defBoosts+=pgB;det.notes.push('Proteccion permanente: +'+pgB+' contra el ataque a destruir');}
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

/* ==========================================================================
   P1-024 — VENTANA DE RODADERO (post-tirada, pre-efecto).

   P1-016 resolvio la ventana de la pagina 15 para el ataque instantaneo: el
   ataque se ANUNCIA, se gastan los costes, y todavia asi otro jugador puede
   cancelarlo porque los dados no estan tirados. Las seis cartas de este bloque
   (Bribery, Computer Virus, Murphy's Law, Time Warp, Mistaken Identity,
   Mothers' March) no atacan: EDITAN un rodadero ya tirado. Les hace falta la
   ventana complementaria, exactamente en el otro extremo de la secuencia: la
   tirada ya esta hecha y el efecto todavia no se ha comparado ni aplicado.

   El mecanismo es el mismo que P1-016, no uno nuevo: se comprueba si alguien
   puede responder de verdad, y si puede la resolucion se APLAZA en
   S.pendingRoll en vez de ejecutarse. El contexto no serializable (la funcion
   que sabe aplicar el efecto) vive en ROLL_CTX, fuera de S, porque S se
   serializa entero en publicState y no admite funciones.

   Decision de diseno, no de regla: la ventana se abre DESPUES de tirar y
   ANTES de comparar. Quien juegue una de estas cartas puede (a) cancelar el
   resultado, (b) cambiar el numero, o (c) obligar a repetir la tirada. Como
   maximo se honra UNA repeticion, y la repeticion no reabre la ventana: por
   eso rd.reroll se consulta en rollReactionAllowed(). Mothers' March dice
   literalmente "No player may do anything else to change the strength of the
   re-rolled attack", asi que durante la repeticion no se admite nada mas.
   ========================================================================== */
var ROLL_CTX=null;
var ROLL_KINDS=['bribery','computervirus','murphyslaw','timewarp','mistakenidentity','mothersmarch'];

/* Que etiqueta tiene el rodadero pendiente. Para la UI. */
function attackTargetName(A){
  if(A.neutralTarget){
    var nn=S.neutralArea.find(function(x){return x.uid===A.neutralTarget;});
    return nn?card(nn.cardId).name:'el ÁREA NEUTRAL';
  }
  if(A.handTarget){
    var hc=C.cards[A.handTarget.idx];
    return hc?('la mano de '+S.players[A.handTarget.owner].name):'la mano rival';
  }
  var tn=findNode(A.targetUid);
  return tn?card(tn.cardId).name:'el objetivo';
}

/* ¿Esta carta puede reaccionar a este rodadero concreto? Devuelve {ok} o {why},
   y el motor usa ese why como texto de rechazo. Las condiciones que dependen del
   texto impreso son TODAS las de "Play this card when/immediately after ...". */
function rollReactionAllowed(eff,pid,P){
  if(ROLL_KINDS.indexOf(eff.kind)<0)return{ok:false,why:'esta carta no responde a rodaderos'};
  if(P.reroll)return{ok:false,why:'la tirada ya se esta repitiendo'};
  if(eff.kind==='mistakenidentity'&&P.klass!=='assassination')
    return{ok:false,why:'solo se juega despues de un Assassination, y este rodadero no lo es'};
  if(eff.kind==='timewarp'&&!(P.success&&pid!==P.pid))
    return{ok:false,why:'solo tras una tirada exitosa de otro jugador'};
  if(eff.kind==='mothersmarch'&&!(P.success&&P.klass==='destroy'))
    return{ok:false,why:'solo tras un ataque a destruir exitoso'};
  return{ok:true};
}

/* Abre la ventana. Devuelve true si la resolucion queda aplazada. */
function openRollWindow(rd){
  if(S.pendingRoll)return false;
  var P={label:rd.label,target:rd.target,klass:rd.klass,pid:rd.pid,
         roll:rd.roll,total:rd.total,success:!!rd.wasSuccess,
         mods:[],reroll:null,cancelled:null,responders:[],
         /* P1-027: THE SECOND BULLET (398) necesita saber de que ataque es este
          * rodadero para poder gastar las fichas de los grupos que YA Harran
          * participaron (`A.aids`). No sale en publicState(): la proyeccion es
          * campo a campo y lo ignora. */
         attack:rd.attack||null};
  /* Se listan los autores posibles (para que la UI sepa a quien preguntar), pero
     la ventana solo se abre si hay al menos uno. */
  for(var p=0;p<S.players.length;p++){
    var h=S.players[p].hand;
    for(var i=0;i<h.length;i++){
      var k=(C.cards[h[i]]||{}).effect;
      if(k&&ROLL_KINDS.indexOf(k.kind)>=0&&rollReactionAllowed(k,p,P).ok)
        P.responders.push({pid:p,name:S.players[p].name,cardIdx:h[i],cardName:C.cards[h[i]].name});
    }
  }
  if(!P.responders.length)return false;
  S.pendingRoll=P;
  ROLL_CTX={finish:rd.finish};
  log(rd.label+': rodadero '+rd.roll+' sobre una fuerza de '+rd.total+
      (rd.wasSuccess?' (éxito)':' (fallo)')+' — VENTANA DE REACCION ABIERTA');
  return true;
}

/* P1-024 — Cierra la ventana: aplica, cancela o repite. */
function closePendingRoll(){
  var P=S.pendingRoll;
  if(!P)return null;
  S.pendingRoll=null;
  var ctx=ROLL_CTX;ROLL_CTX=null;
  var res;
  if(P.cancelled){
    log('CANCELADO: '+P.cancelled.cardName+' de '+P.cancelled.name+' — '+P.label+' falla automaticamente');
    res=ctx.finish(null,P.total,true,P.cancelled.cardName);
  }else if(P.reroll){
    var nt=P.total+(P.reroll.penalty||0);
    var r2=(nt<2)?null:roll2d6();
    log(P.reroll.cardName+' obliga a repetir la tirada'+
        (P.reroll.penalty?(' con penalizacion '+P.reroll.penalty):'')+': nueva fuerza ≤'+nt);
    res=ctx.finish(r2,nt,false,null);
    P.mods.push({card:P.reroll.cardName,kind:'reroll',penalty:P.reroll.penalty||0});
  }else{
    res=ctx.finish(P.roll,P.total,false,null);
  }
  if(res&&typeof res==='object'&&res.plot)S.lastResult=res;
  var outR=publicState();
  if(res&&typeof res==='object'&&res.plot)outR.lastPlotResult=res;
  return outR;
}

/* Cierre de la ventana desde fuera del motor (la UI y la IA). Igual que
   E.resolvePendingAttack: si no hay nada pendiente NO es un error. */
E.resolvePendingRoll=function(){
  if(!S.pendingRoll){
    var out0=publicState();
    out0.lastPlotResult={ok:false,reason:'No hay ningun rodadero pendiente'};
    return out0;
  }
  return closePendingRoll();
};

/* ================= P1-025/P1-026/P1-027 — la ventana de SUCESO =================
   Tercera familia de ventanas, y la que cierra el circulo de §38. Las otras dos
   ya existen: P1-016 (`S.pendingAttack`, el ataque esta declarado y los dados
   todavia no) y P1-024 (`S.pendingRoll`, los dados ya estan tirados). Esta
   tercera no mira dados ni ataques: mira SUCESOS DE CARTA — alguien robo una
   Plot, alguien descarto una Plot.

   Misma arquitectura, por el mismo motivo: `S` se serializa entero dentro de
   `publicState()`, asi que la parte no serializable (si la hubiera) va en una
   variable de modulo. Aqui no hace falta: el efecto de cerrar la ventana es
   "mover una carta del descarte a una mano", que es puro dato. Por eso esta
   ventana SI lleva su efecto dentro de `S.pendingEvent.data`.

   Y misma regla de apertura: la ventana solo se abre si ALGUIEN tiene una carta
   valida para ese suceso. Si nadie puede reaccionar, no hay ventana — porque una
   ventana que nadie puede cerrar es un atasco, y ya se pagaron dos de esos en
   §33 (por eso los Disasters no abren ventana de ataque). */
var EVENT_CTX=null;
var EVENT_KINDS=['stealing_the_plans','embezzlement'];

/* ¿Esta carta sirve para este suceso, y la puede jugar este jugador? */
function eventReactionAllowed(eff,pid,ev){
  if(!eff||EVENT_KINDS.indexOf(eff.kind)<0)return {ok:false,why:'no es una carta de reaccion a un suceso'};
  /* Ni el que provoked el suceso ni ... nadie mas se auto-reacciona: "another
     player" en Embezzlement y "someone else" en Stealing the Plans. */
  if(pid===ev.byPid)return {ok:false,why:'el suceso lo provocaste tu'};
  if(ev.kind==='plotDrawn'){
    if(eff.kind!=='embezzlement')return {ok:false,why:'solo reacciona a que otro jugador robe una Plot'};
    if(ev.data&&ev.data.claimed)
      return {ok:false,why:'esa Plot ya fue reclamada'};
    /* "you must discard one other Plot card from your own hand": sin Plot que
       descartar no se puede jugar. Se comprueba AQUI y no al aplicar para que la
       UI pueda razonar y la ventana pueda seguir abierta para otro jugador. */
    var own=S.players[pid].hand.filter(function(ix){
      return C.cards[ix].type==='plot'&&ix!==(ev.data&&ev.data.cardIdx);});
    if(own.length<1)return {ok:false,why:'necesitas al menos una Plot en tu mano para descartar'};
    return {ok:true};
  }
  if(ev.kind==='plotDiscarded'){
    if(eff.kind!=='stealing_the_plans')return {ok:false,why:'solo reacciona a que otro jugador descarte una Plot'};
    if(ev.data&&ev.data.taken)return {ok:false,why:'ese descarte ya fue reclamado'};
    if(ev.data&&ev.data.cardIdx==null)return {ok:false,why:'no hay ninguna Plot que robar'};
    return {ok:true};
  }
  return {ok:false,why:'suceso desconocido'};
}

/* Abre la ventana si — y solo si — alguien puede reaccionar de verdad. */
function openEventWindow(ev){
  if(!ev||!ev.kind)return false;
  if(S.pendingEvent)return false;
  var P={
    kind:ev.kind,label:ev.label||'',byPid:ev.byPid,
    data:ev.data||{},
    responders:[]
  };
  for(var p=0;p<S.players.length;p++){
    var h=S.players[p].hand;
    for(var i=0;i<h.length;i++){
      var e=(C.cards[h[i]]||{}).effect;
      if(!e)continue;
      if(!eventReactionAllowed(e,p,P).ok)continue;
      P.responders.push({pid:p,name:S.players[p].name,cardIdx:h[i],cardName:C.cards[h[i]].name});
    }
  }
  if(!P.responders.length)return false;
  S.pendingEvent=P;
  log('VENTANA DE SUCESO ABIERTA: '+P.label);
  return true;
}

/* Unico punto por el que una Plot entra en la pila de descarte. Centralizarlo no
 * es estetica: STOLING THE PLANS (374) dice "immediately after someone else
 * discards a Plot card, whether or not they used it", y "whether or not they
 * used it" es justamente el segundo caso que antes no existia (P1-025: la Plot
 * USADA no llegaba nunca aqui). Con nueve `S.plotDiscard.push` distintos
 * repartidos por el motor, cualquier descarte nuevo se olvidaria de la ventana. */
function discardPlot(ix,byPid){
  S.plotDiscard.push(ix);
  var nm=(byPid>=0&&S.players[byPid])?S.players[byPid].name:'la mesa';
  openEventWindow({kind:'plotDiscarded',byPid:(byPid<0?-1:byPid),
    label:nm+' descarta '+card(ix).name,
    data:{cardIdx:ix,byName:nm}});
  return ix;
}
/* Cierra la ventana. A diferencia de las otras dos, aqui el efecto se aplica al
   RESPONDER y no al cerrar: cuando se cierra, la carta ya esta jugada y solo
   queda ejecutar lo que dijo. */
function closePendingEvent(){
  var P=S.pendingEvent;
  if(!P)return null;
  S.pendingEvent=null;
  var d=P.data,res=null;
  /* STOLING THE PLANS: la Plot ya esta en el descarte (la pusimos al
     descartarla), asi que el robo es un traslado de una pila a una mano. */
  if(d.taken!=null){
    var at=S.plotDiscard.indexOf(d.taken);
    if(at<0){
      log('La Plot que se iba a robar ya no esta en el descarte');
      res={ok:false,reason:'la Plot ya no estaba en el descarte'};
    }else{
      S.plotDiscard.splice(at,1);
      S.players[P.takenBy].hand.push(d.taken);
      log('STOLING THE PLANS: '+card(d.taken).name+' pasa del descarte a la mano de '+
          S.players[P.takenBy].name);
      res={ok:true,stolen:card(d.taken).name,by:S.players[P.takenBy].name};
    }
  }
  /* EMBEZZLEMENT: la Plot sigue en la mano de quien la robo; el efecto la saca
     de ahi y la pasa al jugador que respondio, que ademas descarta OTRA Plot
     suya. El nombre de quien la robaba se guardo al abrir la ventana, porque
     para cuando se cierra ya no la tiene y el indice ya no cuenta nada. */
  if(d.claimed!=null){
    var ixQ=d.claimed;
    /* `P.byPid` y no `data.byPid`: el indice de quien provoco el suceso vive en el
       pendingEvent, no en `data`, porque `data` es lo que se describe al cliente. */
    var hd=S.players[P.byPid].hand;
    var at2=hd.indexOf(ixQ);
    if(at2<0){
      log('EMBEZZLEMENT: la Plot ya no esta en la mano de '+d.byName);
      res={ok:false,reason:'la Plot ya no estaba en su mano'};
    }else{
      hd.splice(at2,1);
      S.players[P.claimedTo].hand.push(ixQ);
      log('EMBEZZLEMENT: '+card(ixQ).name+' deja de ser de '+d.byName+
          ' y pasa a '+S.players[P.claimedTo].name);
      var pay=d.payment!=null?d.payment:-1;
      var hp=S.players[P.claimedTo].hand;
      var at3=hp.indexOf(pay);
      if(at3<0){
        log('EMBEZZLEMENT: ya no hay Plot que descartar; la carta robada se devuelve');
        S.players[P.byPid].hand.push(ixQ);
        S.players[P.claimedTo].hand.pop();
        res={ok:false,reason:'no quedo una Plot propia para descartar'};
      }else{
        hp.splice(at3,1);
        S.plotDiscard.push(pay);
        log(card(pay).name+' se descarta como pago de EMBEZZLEMENT');
        res={ok:true,stolen:card(ixQ).name,paid:card(pay).name};
      }
    }
  }
  var outE=publicState();
  outE.lastPlotResult=res||{ok:true,reason:'Suceso resuelto'};
  return outE;
}
/* Cierre desde fuera del motor (UI e IA). Igual que sus hermanas: si no hay nada
   pendiente NO es un error, para que un doble clic no tumbe la partida. */
E.resolvePendingEvent=function(){
  if(!S.pendingEvent){
    var outE0=publicState();
    outE0.lastPlotResult={ok:false,reason:'No hay ningun suceso pendiente'};
    return outE0;
  }
  return closePendingEvent();
};

E.resolveAttack=function(){
  if(!S.attack||S.attack.resolved)throw new Error('Sin ataque activo');
  var A=S.attack;
  var det=computeStrength(true);
  var immuneNote=det.notes.some(function(n){return n.indexOf('INMUNE')===0;});
  /* P1-024: la resolucion se parte en dos. settle() es el codigo de antes
     parametriado por (tirada, fuerza, cancelado) para que la ventana pueda
     invocarlo mas tarde sin duplicar la logica de exito/fracaso. */
  var settle=function(roll,total,forcedFail,byCard){
    det.total=total;
    det.roll=(roll==null?null:roll);
    var result;
    if(forcedFail)result='FALLO automático (cancelado por '+byCard+')';
    else if(total<2)result='auto-fail (fuerza '+total+' < 2)';
    else if(roll==null||roll===11||roll===12)result='FALLO automático (11-12 siempre fallan)';
    else if(roll<=total)result='ÉXITO';
    else result='fallo';
    A.det=det;A.resultText=result;
    S.lastResultText=(A.type==='control'?'CONTROLAR':'DESTRUIR')+' → '+result+
      (det.roll!=null?(' · tiraste '+det.roll+' · necesitabas ≤'+det.total):(' · fuerza '+det.total));
    applyAttackResult(A,det,result);
    return publicState();
  };
  if(det.total<2)return settle(null,det.total,false,null);
  var r=roll2d6();S.lastRoll={d:r};
  var lbl=(A.type==='control'?'Control':'Destrucción')+' de '+S.players[A.pid].name;
  if(openRollWindow({klass:A.type,label:lbl,target:attackTargetName(A),pid:A.pid,
                     roll:r,total:det.total,wasSuccess:(r!==11&&r!==12&&r<=det.total),
                     attack:A,
                     finish:function(rr,tt,ff,bc){return settle(rr,tt,ff,bc);}})){
    S.lastResultText=lbl+' → rodadero '+r+' sobre una fuerza de '+det.total+
                     ' · VENTANA DE REACCIÓN ABIERTA';
    return publicState();
  }
  return settle(r,det.total,false,null);
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
  /* P1-013: un Plot linkeado a un grupo que sale de la mesa tambien se va, y
     el cambio que aplicaba desaparece con el grupo. Se recorre TODO el subarbol
     porque un link puede estar en un titer, no solo en el nodo destruido (igual
     que el filtro de recursos de arriba). */
  var lostUids={};lostUids[targetUid]=1;subtreeList(node).forEach(function(nd){lostUids[nd.uid]=1;});
  S.players[owner].linkedPlots=(S.players[owner].linkedPlots||[]).filter(function(lp){
    if(lostUids[lp.linkedTo]){
      discardPlot(lp.cardId,owner);
      log('Plot linkeado a un grupo destruido: '+card(lp.cardId).name+' vuelve al mazo de Plot cards');
      return false;
    }
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
/* P1-017: 3er parametro opcional `node`. Cuando se pasa, se consultan los
   atributos AÑADIDOS a ese grupo concreto (nodeAttrs) y no solo los impresos en
   la carta. Existe porque "Media Connections" (310) dice literalmente "The group
   of your choice BECOMES a Media group": sin almacenamiento a nivel de nodo ese
   cambio seria invisible. Se mantiene opcional para no romper las llamadas
   existentes hasAttr(carta, attr) donde no hay nodo (p.ej. un objetivo en la mano
   del rival, que todavia no esta en juego). */
function hasAttr(c,attr,node){
  if(!attr)return false;
  var t=String(attr).toLowerCase();
  if(node&&nodeAttrs(node,c).some(function(a){return String(a).toLowerCase()===t;}))return true;
  return attrList(c).some(function(a){return String(a).toLowerCase()===t;});
}
/* P1-018 (encontrado por el gate test_fase4_cards.js, no por una prueba que
   fallara) — el campo `mayAddPowerFromAligns` miente en dos cartas.
   "Poison" (338) declara ['criminal','magic'] y "Withering Curse" (416) declara
   ['magic']. Sus textos impresos dicen, literalmente: "One *Magic* group may use
   its action to add its Power to this attack". En este juego `magic` NO es una
   ideologia: es un ATRIBUTO (§26.4). Hay 9 grupos con el atributo magic (Druids,
   Ninjas, Reformed Church of Satan, Rosicrucians, Stonehenge, Templars, Vampires,
   Voudonistas, W.I.T.C.H.) y CERO grupos con la alineacion magic. Como esta
   funcion solo miraba `c.alignments`, la clausula "un grupo *Magic* puede sumar su
   Poder" era CODIGO MUERTO en esas dos cartas: el jugador nunca podia usarla.
   Es la tercera aparicion de la misma clase de defecto (la palabra impresa es
   real, pero el dato vive en otro campo): las dos anteriores fueron los AND/OR de
   bonusTargetMatches y doubleQualifies.
   El texto de la carta es la autoridad y dice "Magic group", asi que aqui se
   comprueban LAS DOS listas: las 10 ideologias y los atributos del vocabulario
   oficial. Un nombre que no sea ninguna de las dos sigue sin coincidencia, que es
   el comportamiento correcto. */
function hasAnyAlign(c,list,node){
  if(!Array.isArray(list)||!list.length)return false;
  var al=nodeAligns(node,c);
  for(var i=0;i<al.length;i++)if(list.indexOf(al[i])>=0)return true;
  var at=nodeAttrs(node,c);
  for(var j=0;j<at.length;j++)if(list.indexOf(at[j])>=0)return true;
  return false;
}
/* El array `power` del Plot ordena entradas; la última sin condición es el default. */
function plotPowerFor(eff,tc,fallback,node){
  var list=(eff&&Array.isArray(eff.power)&&eff.power.length)?eff.power:null;
  if(!list)return fallback;
  for(var i=0;i<list.length;i++){
    var e=list[i]||{};
    var okAttr=!e.ifAttr||hasAttr(tc,e.ifAttr,node);
    /* P1-020: la comparación por NOMBRE era sensible a mayúsculas y estaba
       MUERTA. El dato guarda los nombres como identificadores normalizados en
       minúsculas (la convención de todo el dataset: 'japan', 'california',
       'robotseamonsters'), mientras que card().name conserva las mayúsculas del
       impreso ('Japan', 'California'). `ifNames.indexOf('Japan')` sobre
       ['japan','california'] devuelve siempre -1, así que la entrada nunca
       ganaba y el motor caía a la siguiente rama.
       MEDIDO con una sonda sobre el mazo real: 'Atomic Monster' devolvía
       power=20 contra Japan y power=16 contra California, cuando su texto
       impreso dice "Its Power is 16 against a Huge Place, 20 against any other
       Place, BUT 24 AGAINST JAPAN OR CALIFORNIA". Es decir, la única carta del
       mazo con ifNames perdía su cláusula más fuerte — y Japan y California
       son además 'huge', así que el error no era inocuo: recibían 16 en lugar
       de 24, la mitad.
       La comparación se normaliza en ambos lados para que sea indifferent a la
       convención que se use al escribir el dato. Es la 4a aparición de la
       clase "la palabra impresa es real pero el dato vive en otra forma"
       (tras los AND/OR de bonusTargetMatches y doubleQualifies, y el magic-vs-
       alignments de hasAnyAlign). */
    var okName=true;
    if(e.ifNames){
      okName=false;
      var tn=String(tc.name||'').toLowerCase();
      for(var q=0;q<e.ifNames.length;q++){
        if(String(e.ifNames[q]).toLowerCase()===tn){okName=true;break;}
      }
    }
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
/* P1-016 — VENTANA DE REACCION, fase 1: ANUNCIAR.
   REGLA OFICIAL, inwo_rules_extracted.txt:924-931 (p. 15): "The window of
   opportunity is AFTER MAKING THE ATTEMPT IS ANNOUNCED, BUT BEFORE THE DICE ARE
   ROLLED - or the effect is resolved." Antes esta funcion hacia TODO en una sola
   llamada: validaba, gastaba los costes, tiraba los dados y destruia, sin dejar
   ningun momento en el que otro jugador pudiera reaccionar. Por eso las cartas de
   cancelacion (Bodyguard, Talisman) no tenian donde encajar.
   Aqui se hace todo lo que ocurre ANTES del rodadero, y se devuelve un objeto de
   anuncio. Las fichas se gastan AQUI a proposito: la misma regla dice que lo
   cancelado "has no effect (except to discard the cards and actions spent on it)",
   es decir, el coste se paga aunque la accion se cancele. Gastarlas despues
   permitiria que un jugador cancelara y conservase su ficha, lo cual seria
   inventarse una regla. */
function announcePlotInstantAttack(pid,pc,tUid,opts){
  opts=opts||{};
  var eff=pc.effect||{};
  var nd=findNode(tUid);
  if(!nd)throw new Error('Objetivo inexistente');
  var tc=card(nd.cardId);
  if(eff.target&&tc.subtype!==eff.target)
    throw new Error(pc.name+' solo se usa sobre '+(eff.target==='place'?'Lugares (Place)':'Personalities (Personality)'));
  if(eff.requireAttr&&!hasAttr(tc,eff.requireAttr,nd))
    throw new Error(pc.name+' requiere un objetivo con el atributo '+eff.requireAttr);
  if(eff.rejectAttr&&hasAttr(tc,eff.rejectAttr,nd))
    throw new Error(pc.name+' no afecta objetivos con el atributo '+eff.rejectAttr);

  /* P1-017: `nd` (el nodo objetivo) se propaga para que eligen la rama de Poder
     y el bonus del Illuminati se evaluen contra el grupo concreto. */
  var power=plotPowerFor(eff,tc,10,nd);
  var notes=[];
  /* P1-009: Servants of Cthulhu — "+4 on any attempt to destroy, EVEN WITH
     DISASTERS AND ASSASSINATIONS" (efecto.anyDestroy, incluye instant:true), y
     Adepts of Hermes — "+6 on any attempt to control or destroy a Magic group".
     Los Instant Attacks NO pasan por computeStrength(), así que el bonus se
     aplica aquí directamente sobre el Poder del Plot. */
  var ibPlot=illuAttackBonus(pid,'destroy',nd,tc);
  if(ibPlot){power+=ibPlot;notes.push('+'+ibPlot+' por '+illuCard(pid).name);}

  if(eff.requireActionFromAttr){
    var an=opts.aidUid?findNode(opts.aidUid):null;
    if(opts.aidUid&&(!an||findOwnerPid(opts.aidUid)!==pid))
      throw new Error('El grupo que aporta la acción debe ser tuyo');
    if(!an)an=firstUsableAid(pid,function(c,n){return hasAttr(c,eff.requireActionFromAttr,n);});
    if(!an)throw new Error(pc.name+' necesita un grupo tuyo con acción de tipo '+eff.requireActionFromAttr);
    var ac=card(an.cardId);
    spendGroupToken(pid,an.uid);
    if(eff.addSummonerPower){var ap=curPower(an);power+=ap;notes.push('+'+ap+' de '+ac.name);}
    else notes.push('acción de '+ac.name+' usada');
  }else if(eff.mayAddPowerFromAligns){
    var mn=opts.aidUid?findNode(opts.aidUid):null;
    if(opts.aidUid&&(!mn||findOwnerPid(opts.aidUid)!==pid))
      throw new Error('El grupo que aporta la acción debe ser tuyo');
    if(!mn)mn=firstUsableAid(pid,function(c,n){return hasAnyAlign(c,eff.mayAddPowerFromAligns,n);});
    if(mn){spendGroupToken(pid,mn.uid);var mp=curPower(mn);power+=mp;notes.push('+'+mp+' de '+card(mn.cardId).name);}
  }

  var victim=findOwnerPid(tUid);
  /* P1-011 — REGLA OFICIAL, inwo_rules_extracted.txt:683-685: "While a Place is
     Devastated, its Power is halved (round down) against any Attack to Destroy."
     Los Plots `disaster` y `assassination` son Instant Attacks to Destroy, así que
     el objetivo devastado defiende con la mitad de su Poder (redondeada hacia
     abajo). defenderPower() centraliza la regla y no la aplica a los ataques de
     control, que siguen restando Resistencia. */
  var defPower=defenderPower(nd,true);
  /* P1-016: la proteccion permanente de Bodyguard/Talisman. Un Assassination ES
     un "Attempt to Destroy", asi que entra el +6 del Bodyguard; y el Talisman
     añade su +10 SOLO aqui, porque su texto distingue "any further attack to
     destroy" (+2) de "any further Assassination" (+10). */
  var pgI=destroyDefenseBonus(nd,eff.kind==='assassination');
  if(pgI){defPower+=pgI;notes.push('+'+pgI+' de proteccion permanente ('+pc.name+')');}
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
  return {pid:pid,cardIdx:pc.idx,cardName:pc.name,tUid:tUid,nd:nd,tc:tc,eff:eff,
          victim:victim,power:power,defPower:defPower,pos:pos,str:str,
          notes:notes.slice()};
}

/* P1-024 — VENTANA DE RODADERO, fase 1: tirar y comprobar si alguien responde.
   Antes esta funcion rollaba y resolvia en el mismo acto. Ahora tira, y si hay
   una carta de rodadero que de verdad pueda usarse, deja la resolucion aplazada
   en S.pendingRoll y devuelve un resultado "pendiente". El cuerpo de reglas no
   cambia: solo se separa en dos mitades, igual que P1-016 separo el anuncio. */
function applyPlotInstantAttack(ann){
  var pc=card(ann.cardIdx),eff=ann.eff,tc=ann.tc;
  var str=ann.str;
  var res={strength:str,power:ann.power,defense:ann.defPower,target:tc.name,plot:pc.name};
  res.notes=ann.notes.slice();
  if(str<2){
    res.ok=false;res.reason='fallo automático';
    log(pc.name+': ataque instantáneo contra '+tc.name+' falla automáticamente ('+str+')');
    return res;
  }
  var r=roll2d6();
  if(openRollWindow({klass:'instant:'+eff.kind,label:pc.name+' contra '+tc.name,target:tc.name,
                     pid:ann.pid,roll:r,total:str,wasSuccess:(r!==11&&r!==12&&r<=str),
                     finish:function(rr,tt,ff,bc){return applyPlotInstantAttackRoll(ann,rr,tt,ff,bc);}})){
    res.ok=null;res.roll=r;res.pending=true;res.reason='ventana de reacción abierta';
    return res;
  }
  return applyPlotInstantAttackRoll(ann,r,str,false,null);
}

/* P1-024 — VENTANA DE RODADERO, fase 2: comparar y aplicar.
   Se separa de la fase 1 para que la ventana pueda invocarla con otra tirada,
   con una repeticion, o con el resultado cancelado. Debajo, cuerpo de reglas
   IDENTICO al que habia antes de P1-024 (incluido el arreglo de P1-018). */
function applyPlotInstantAttackRoll(ann,roll,total,forcedFail,byCard){
  var pc=card(ann.cardIdx),eff=ann.eff,nd=ann.nd,tc=ann.tc,victim=ann.victim;
  var str=total;
  var res={strength:str,power:ann.power,defense:ann.defPower,target:tc.name,plot:pc.name};
  /* P1-018: `notes` explicaba cada modificador ("+1 de Rosicrucians", "+5 de
    * defensa de Shangri-La") pero SOLO se escribia en el log cuando el ataque
    * devastaba. En todos los caminos de fallo — que son la mayoria, porque los
    * Instant Attacks se tiran contra objetivos defendidos — se perdian. El
    * comentario de la funcion promete "un resultado trazable": sin esto no lo es.
    * Se adjunta al resultado para que la UI pueda explicar de donde sale la fuerza
    * y para que las regresiones puedan comprobarlo. */
  res.notes=ann.notes.slice();
  if(forcedFail){
    res.ok=false;res.roll=null;res.margin=null;res.destroyed=false;
    res.reason='fallo automático (cancelado por '+byCard+')';
    log(pc.name+' falla automáticamente contra '+tc.name+' (cancelado por '+byCard+')');
    return res;
  }
  if(roll==null||str<2){
    res.ok=false;res.reason='fallo automático';
    log(pc.name+': ataque instantáneo contra '+tc.name+' falla automáticamente ('+str+')');
    return res;
  }
  res.roll=roll;
  if(roll===11||roll===12){res.ok=false;res.reason='FALLO automático (11-12 siempre fallan)';}
  else if(roll<=str){res.ok=true;res.margin=str-roll;}
  else{res.ok=false;res.reason='fallo';}
  if(!res.ok){log(pc.name+' falla contra '+tc.name+' ('+res.reason+')');return res;}

  nd.devastated=true;nd.tokens=0;
  subtreeList(nd).forEach(function(n){n.devastated=true;n.tokens=0;});
  log(pc.name+' devasta '+tc.name+(ann.notes.length?' ('+ann.notes.join(', ')+')':''));

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
    destroyGroup(ann.pid,ann.tUid);
    log((eff.kind==='assassination'?'ASESINATO: ':'DESTRUCCIÓN: ')+tc.name+' (margen '+res.margin+'>'+need+')');
  }else{
    res.destroyed=false;
    if(need!=null)log('Margen '+res.margin+' ≤ '+need+': solo devastado, no destruido');
    else log(pc.name+' devasta pero nunca destruye (destroyMargin nulo)');
  }
  return res;
}

/* P1-016 — Envoltorio de una sola llamada. Se conserva para no romper a los
   llamadores existentes (E.instantAttack lo delega, y cualquier consumidor
   futuro que quiera un ataque inmediato sin ventana sigue obteniendo el
   comportamiento de siempre: anunciar y resolver seguido, sin dar tiempo a
   nadie a reaccionar). */
function resolvePlotInstantAttack(pid,pc,tUid,opts){
  return applyPlotInstantAttack(announcePlotInstantAttack(pid,pc,tUid,opts));
}

/* P1-016 — ¿Alguien puede reacts de verdad a este ataque anunciado?
   La ventana de reaccion SOLO se abre si hay un jugador que tenga en la mano una
   carta capaz de cancelar ESTE ataque. Motivo de esa decision, y no de la regla:
   la regla permite reaccionar siempre, pero abrir la ventana cuando nadie puede
   usarla obligaria a tocar el flujo de la UI y de la IA en el caso normal, que es
   el 99% de las partidas. Ademas asi se cumple la regla de "no speed-play"
   (inwo_rules_extracted.txt:780-790) de forma estricta: si nadie puede cancelar,
   no hay a quien darle la oportunidad, y resolver en el acto no es antihumanidad,
   es que no hay nadie a quien attente.
   Quien puede reaccionar es cualquier jugador con una carta de cancelacion en la
   mano; el texto de esas cartas ("link this card to the card it protected") no
   dice "your Personality", asi que no se restringe por propietario. */
function reactionWindowOpen(ann){
  if(!ann)return false;
  /* Solo un ASSASSINATION abre ventana: las dos cartas de cancelacion que
     tenemos dicen literalmente "after any type of Assassination". Abrirla para un
     Disaster dejaria un ataque pendiente que nadie puede cerrar nunca, lo que
     bloquearia la partida. Cuando se clasifique una carta de cancelacion para
     Disaster, este filtro es el unico sitio que hay que tocar. */
  if(ann.eff.kind!=='assassination')return false;
  for(var p=0;p<S.players.length;p++){
    var h=S.players[p].hand;
    for(var i=0;i<h.length;i++){
      var k=(C.cards[h[i]]||{}).effect;
      if(k&&(k.kind==='bodyguard'||k.kind==='talisman'))return true;
    }
  }
  return false;
}

/* P1-016 — Cierra la ventana: aplica el efecto o registra la cancelacion.
   Nunca tira dados si el ataque quedo cancelado, que es exactamente lo que
   significa "it becomes an automatic failure" en el texto de ambas cartas. */
function closePendingAttack(){
  var P=S.pendingAttack;
  if(!P)return null;
  S.pendingAttack=null;
  if(P.cancelled){
    log('CANCELADO: '+P.cancelled.name+' de '+S.players[P.cancelled.pid].name+
        ' ('+P.cancelled.cardName+') — '+P.cardName+' falla automaticamente contra '+P.tc.name);
    return {ok:false,cancelled:true,reason:'cancelado por '+P.cancelled.cardName,
            target:P.tc.name,plot:P.cardName,roll:null,margin:null,destroyed:false,
            notes:['Cancelado: '+P.cancelled.cardName]};
  }
  return applyPlotInstantAttack(P.ann);
}

/* P1-016 — Cierre de la ventana desde fuera del motor (la UI y la IA).
   Si no hay nada pendiente devuelve un resultado explicito en vez de lanzar, para
   que un doble clic o una llamada de mas no rompa la partida. */
E.resolvePendingAttack=function(){
  if(!S.pendingAttack){
    var out0=publicState();
    out0.lastPlotResult={ok:false,reason:'No hay ningun ataque pendiente'};
    return out0;
  }
  var resC=closePendingAttack();
  var out=publicState();
  out.lastPlotResult=resC;
  return out;
};

/* ================= PLOT CARDS ================= */
/* P1-031 - L3a: el cuerpo de "bulk_power" vive aqui, no dentro del switch de
 * E.playPlot, porque 344 Principia Discordia es un RESOURCE ("Unique Artifact")
 * y se juega con E.playResource, que hasta ahora no despachaba por effect.kind:
 * enlazaba el Resource y no ejecutaba nada. Con un unico cuerpo las dos
 * entradas ejecutan exactamente el mismo efecto. La declaracion es doble:
 * E.playResource llama a esta funcion Y su default lanza, de modo que ningun
 * Resource con mecanica verificada vuelva a jugarse en silencio. */
function bulkClauseHit(m, n, gc) {
  if (m.align) {
    if (nodeAligns(n, gc).indexOf(String(m.align).toLowerCase()) < 0) return false;
  }
  if (Array.isArray(m.aligns) && m.aligns.length) {
    var al = nodeAligns(n, gc);
    var want = m.aligns.map(function (a) { return String(a).toLowerCase(); });
    var hit = (m.match === 'any')
      ? want.some(function (a) { return al.indexOf(a) >= 0; })
      : want.every(function (a) { return al.indexOf(a) >= 0; });
    if (!hit) return false;
  }
  if (Array.isArray(m.notAligns) && m.notAligns.length) {
    var al2 = nodeAligns(n, gc);
    if (m.notAligns.some(function (a) { return al2.indexOf(String(a).toLowerCase()) >= 0; })) return false;
  }
  if (m.attr) {
    if (!hasAttr(gc, String(m.attr).toLowerCase(), n)) return false;
  }
  if (Array.isArray(m.attrs) && m.attrs.length) {
    var anyAttr = (m.match === 'any');
    var okAttr = anyAttr
      ? m.attrs.some(function (a) { return hasAttr(gc, String(a).toLowerCase(), n); })
      : m.attrs.every(function (a) { return hasAttr(gc, String(a).toLowerCase(), n); });
    if (!okAttr) return false;
  }
  if (m.subtype && gc.subtype !== m.subtype) return false;
  /* minPower/maxPower miran el Poder IMPRESO (gc.power), no el actual: 339 dice
     "groups with a Power of only 1" y "su Poder" es el dato de la carta. */
  if (typeof m.minPower === 'number' && !(gc.power >= m.minPower)) return false;
  if (typeof m.maxPower === 'number' && !(gc.power <= m.maxPower)) return false;
  return true;
}
function applyBulkPower(pid, c, eff) {
  /* L3a — "Increase/Reduce the Power of all X groups by N".
   * Las 8 cartas de esta familia describen sus frases en `eff.moves` y este
   * unico case las ejecuta: anadir una carta nueva es anadir DATOS.
   * Gramatica y declaraciones de interpretacion: bloque BULK_FX de
   * gen_cards.js. Lo que se recuerda aqui:
   *   - el modificador va al NODO, no a la carta (interpretacion 5);
   *   - las frases son ACUMULATIVAS (interpretacion 3): un grupo
   *     Conservative+Corporate recibe los +2 +2 +3 de Bigger Business;
   *   - no se filtra por `devastated`: el Poder sigue siendo su Poder. El
   *     Poder de un grupo devastado importa igual (sigue siendo un objetivo
   *     valido), y las cartas que si necesitantokens comprobaran su propia
   *     condicion. Lo que se filtra aqui es lo que el texto dice. */
  if (!Array.isArray(eff.moves) || !eff.moves.length)
    throw new Error(c.name + ': la carta no declara ninguna clausula (eff.moves vacio)');
  var bAll = (eff.scope === 'all');
  var bTouched = [];
  for (var qi = 0; qi < S.players.length; qi++) {
    if (!bAll && qi !== pid) continue;
    var qRoot = S.players[qi].structure;
    walk(qRoot, function (n) {
      if (n === qRoot) return; /* la raiz es el Illuminati, no es "un grupo" */
      var gc = card(n.cardId);
      if (!gc) return;
      for (var mi = 0; mi < eff.moves.length; mi++) {
        var mv = eff.moves[mi];
        if (!bulkClauseHit(mv, n, gc)) continue;
        var vP = mv.power, vR = mv.resistance;
        /* scaleBy: 344 dice "for every Weird group you control", que es
         * AUTOREFERENCIAL (cada Weird se cuenta a si mismo). Se cuenta
         * deliberadamente la estructura ENTERA del dueno. */
        if (mv.scaleBy) {
          var sbAl = String(mv.scaleBy.align).toLowerCase();
          var cnt = 0;
          walk(qRoot, function (m2) {
            if (m2 === qRoot) return;
            var c2 = card(m2.cardId);
            if (c2 && nodeAligns(m2, c2).indexOf(sbAl) >= 0) cnt++;
          });
          if (typeof vP === 'number') vP *= cnt;
          if (typeof vR === 'number') vR *= cnt;
          if (!cnt) continue; /* sin grupos de esa alineacion, nada que escalonar */
        }
        if (typeof vP === 'number') {
          if (!Array.isArray(n.powerMods)) n.powerMods = [];
          n.powerMods.push({ name: c.name + ' (' + (vP > 0 ? '+' : '') + vP + ')', v: vP });
        }
        if (typeof vR === 'number') {
          if (!Array.isArray(n.resistanceMods)) n.resistanceMods = [];
          n.resistanceMods.push({ name: c.name + ' (' + (vR > 0 ? '+' : '') + vR + ')', v: vR });
        }
        if (mv.become) {
          /* 339: "become Criminal as well" — ANADE, no sustituye: el grupo
           * sigue siendo Conservative y ademas es Criminal. */
          var bAl = String(mv.become).toLowerCase();
          if (!Array.isArray(n.alignsAdded)) n.alignsAdded = [];
          if (nodeAligns(n, gc).indexOf(bAl) < 0) n.alignsAdded.push(bAl);
        }
        bTouched.push({
          name: gc.name,
          owner: S.players[qi].name,
          power: (typeof vP === 'number') ? vP : null,
          resistance: (typeof vR === 'number') ? vR : null,
          become: mv.become || null
        });
      }
    });
  }
  /* Un grupo que encaja en TRES clausulas aparece TRES veces en `bTouched`,
   * porque el empuje esta dentro del bucle de clausulas (y debe estar: cada
   * clausula mete su propio delta en powerMods/resistanceMods). Pero al
   * CONTAR grupos hay que contar los distintos, o el registro mentiria:
   * Bigger Business sobre un Conservative+Corporate + sus otros dos grupos
   * daria "4 grupo(s) afectados" cuando solo hay 2. `bSeen` separa las dos
   * cifras: `affected` = grupos distintos, `hits` = pares grupo-clausula. */
  var bSeen = {}, bDistinct = 0;
  for (var bz = 0; bz < bTouched.length; bz++) {
    var bk = bTouched[bz].owner + '|' + bTouched[bz].name;
    if (!bSeen[bk]) { bSeen[bk] = 1; bDistinct++; }
  }
  if (!bTouched.length) {
    log(c.name + ': ningun grupo coincide con sus clausulas; se gasta sin efecto');
  } else {
    log(c.name + ': ' + bDistinct + ' grupo(s) afectados — ' + bTouched.map(function (t) {
      return t.name + ' (P' + (t.power === null ? '0' : (t.power > 0 ? '+' : '') + t.power) +
        (t.resistance === null ? '' : ' R' + (t.resistance > 0 ? '+' : '') + t.resistance) +
        (t.become ? ' ->' + t.become : '') + ')';
    }).join(', '));
  }
  return { ok: true, bulk: true, card: c.name, scope: bAll ? 'all' : 'own',
                 clauses: eff.moves.length, affected: bDistinct, hits: bTouched.length,
                 groups: bTouched };
}
E.playPlot=function(pid,handIdx,targetUid,opts){
  opts=opts||{};
  var c0=C.cards[handIdx];
  var eff0=(c0&&c0.effect)||{kind:'generic'};
  /* P1-012: las cartas "+10" dicen literalmente "Play this card at any time",
   * y sin esa libertad el modo 'defense' es imposible: la defensa ocurre
   * durante el turno del atacante, y una Plot normal exige el turno propio. Se
   * permite, igual que a los Instant Attacks, que se jueguen fuera de tu turno
   * (siguen exigiendo que la partida no esté en setup ni en gameover). */
  /* P1-015: Messiah y Angst dicen "Play this card at any time EXCEPT during an
    * attack". Eso son dos cosas a la vez: fuera de turno (permiso `instant`) y
    * prohibido con un ataque abierto. El ataque esta abierto desde declareAttack
    * hasta resolveAttack, que es exactamente la ventana oficial de reaccion
    * (inwo_rules_extracted.txt:924-931). El veto se comprueba dentro de cada case. */
  /* P1-024: las 6 cartas de la ventana de RODADERO dicen "Play immediately after
   any die roll" / "Play this card when…": solo tienen sentido fuera de turno. */
var instant=(eff0.kind==='assassination'||eff0.kind==='disaster'||eff0.kind==='boost10'||eff0.kind==='power_increase'||eff0.kind==='resistance_increase'||eff0.kind==='messiah'||eff0.kind==='angst'||eff0.kind==='bodyguard'||eff0.kind==='talisman'||ROLL_KINDS.indexOf(eff0.kind)>=0
  /* P1-026: Privileged Attack (346) dice "when you make any attack", o sea justo
     DENTRO de un ataque ajeno. P1-024/§37 lo veto por su cuenta el caso 'boost10'
     cuando la partida ya no es de nadie; aqui hace falta lo mismo pero el motor
     lo comprueba dentro del case (que exige S.attack del propio jugador). */
  ||eff0.kind==='privileged_attack'
  /* P1-027: las de la ventana de SUCESO ("Play immediately when/after") y la
     segunda bala ("immediately after you fail a roll to destroy"). */
  ||EVENT_KINDS.indexOf(eff0.kind)>=0||eff0.kind==='second_bullet'
  /* L1: las 11 de TOKEN-GIFT dicen "This card may be played at any time", sin
     excepcion. A diferencia de Messiah/Angst (P1-015, que dicen "EXCEPT during an
     attack") estas no traen veto: se pueden jugar en cualquier momento, tambien
     con un ataque abierto. Y no cobran nada: su texto no imprime coste.
     OJO: se compara contra el KIND, no contra una lista de ids de carta. Un
     array de ids aqui daria -1 en indexOf y las 11 cartas caerian en
     `requireOwnMain` sin decir nada (defecto de clase "el dato existe pero vive
en otro sitio"); que sean 11 cartas con un kind es exactamente lo que el
      histograma de kinds del gate de FASE 4 ya cuenta y publica. */
  ||eff0.kind==='token_gift'
  /* L2: las 9 de FORCE-ALIGN dicen "Play this card at any time" en su primera
     frase, sin excepcion, asi que van por la misma puerta que L1. Ojo: su texto
     TAMBIEN dice "This is an action for that Nation or its master" en Dictatorship,
     pero ahi la ficha la gasta el grupo o el Illuminati, no el jugador que la juega,
     y por eso esa carta NO esta en la lista instant (P1-017, §32). Aqui el gasto de
     fichas es de quien juega la carta, asi que la lista es la correcta. */
  ||eff0.kind==='force_align'||eff0.kind==='bulk_power');
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
  /* P1-027 — EMBEZZLEMENT (249): "before he uses it or announces what it is".
   * Mientras su suceso este abierto, esa Plot concreta esta "bajo custodia": se
   * puede mirar, pero no usar. Va ANTES de rejectUnverifiedCard porque es una regla
   * del SUCESO y no de la carta: si se comprobara despues, una Plot sin mecanica
   * verificada daria "no tiene una mecanica verificada" en vez de "aun no puedes
   * usarla", que es la informacion que el jugador necesita. */
  if (S.pendingEvent && S.pendingEvent.kind === 'plotDrawn' && S.pendingEvent.data
     && S.pendingEvent.data.claimed == null && S.pendingEvent.data.cardIdx === handIdx)
    throw new Error(c0.name + ': todavia no puedes usar una Plot que acaba de robarte otro jugador — primero se resuelve el suceso abierto');
  rejectUnverifiedCard(c);
  var eff=c.effect||{kind:'generic'};
  var lastResult=null;
  switch(eff.kind){
    case 'boost10':{
      /* P1-012 / P2-DATA-02 — la familia oficial "+10 Plots".
         Texto de las 15 cartas: "Play this card at any time to give +10 Power
         or Resistance (your choice) to any {X} group you control. If used with
         an action, it must be played when that action is first declared, and
         counts only for that action. If used for defense, the bonus lasts
         until the end of the current turn and does not count toward any Goal."
         El caso anterior IGNORABA el objetivo: cualquier carta +10 valía para
         cualquier grupo. Ahora el calificador se comprueba siempre.

         Los tres modos que el texto permite:
           'attack'  -> +10 a la fuerza del ataque en curso. El objetivo debe
                        ser A.attackerUid porque el texto exige "played when
                        that action is first declared, and counts only for that
                        action". El +10 vive en el objeto del ataque, asi que
                        muere con el: es exactamente "counts only for that
                        action". La ficha del atacante ya se gastó al declarar
                        el ataque, por eso NO se cobra otra aqui.
           'defense' -> +10 a las defensas del turno. El objetivo debe ser
                        A.targetUid. "the bonus lasts until the end of the
                        current turn".
           'hold'    -> la carta queda descubierta en la mano para usarla más
                        tarde. Es lo que corresponde cuando todavía no hay un
                        ataque declarado, porque el texto dice "at any time".
         "your choice" entre Power y Resistencia no necesita un modelo aparte:
         en los tres modos el +10 suma a la misma resolución de esa única acción.
         "does not count toward any Goal" se cumple por construcción: ningún
         modo escribe powerOverride, asi que los recorridos de meta, que leen
         el Poder impreso via curPower, nunca llegan a ver el +10. */
      var A=S.attack;
      var open=!!(A&&!A.resolved);
      var mode=(opts&&opts.boostMode)||(open?'attack':'hold');
      if(mode!=='attack'&&mode!=='defense'&&mode!=='hold')
        throw new Error(c.name+': modo de uso no reconocido');
      if((mode==='attack'||mode==='defense')&&!open)
        throw new Error(c.name+' necesita un ataque abierto para usarse asi');
      if(mode!=='hold'){
        if(!targetUid)throw new Error(c.name+' necesita un grupo objetivo');
        var tn=findNode(targetUid);
        if(!tn)throw new Error('Objetivo inexistente');
        var tc=card(tn.cardId);
        if(!tc)throw new Error('El objetivo no es una carta');
        /* P1-017: el calificador se evalua contra el NODO (tn), no contra la
           carta: un grupo que Dictatorship volvio violent puede recibir un
           +10 de una carta "+10 a grupos violent". */
        var okQ=eff.targetAlign?nodeAligns(tn,tc).indexOf(eff.targetAlign)>=0:false;
        if(eff.targetAttr)okQ=okQ||hasAttr(tc,eff.targetAttr,tn);
        if(!okQ)throw new Error(c.name+' solo afecta a grupos '+
          (eff.targetAlign||eff.targetAttr)+', no a '+tc.name);
        if(findOwnerPid(targetUid)!==pid)
          throw new Error(c.name+': el grupo debe ser tuyo');
        if(mode==='attack'&&A.attackerUid!==targetUid)
          throw new Error(c.name+': el +10 al ataque debe aplicarse al grupo que lo declaró');
        if(mode==='defense'&&A.targetUid!==targetUid)
          throw new Error(c.name+': el +10 a la defensa debe aplicarse al grupo que se defiende');
      }
      if(mode==='attack'){A.boosts.push({name:c.name,v:10});
        log(pl.name+' juega +10 al ataque ('+c.name+')');}
      else if(mode==='defense'){A.defBoosts.push({name:c.name,v:10});
        log(pl.name+' juega +10 a la defensa ('+c.name+')');}
      else{pl.exposedPlots.push(handIdx);
        log(c.name+' queda descubierta en la mesa para usarla más tarde');}
      break;}
    case 'paralyze':{
      var nd=findNode(targetUid);
      if(!nd)throw new Error('Objetivo inexistente');
      nd.paralyzed=true;nd.tokens=0;
      log('PARALIZADO: '+card(nd.cardId).name);break;}
    case 'power_increase':{
      /* P1-013 — familia oficial "Power Increase" (10 cartas, una por
       * ideologia). Texto impreso verbatim, comun a las 10:
       *   "This card may be played at any time, and counts as the action for
       *    the group it affects. The increased Power takes effect immediately.
       *    The Power for one {X} group is increased to {N}. Link this card to
       *    your chosen {X} group. No player may have more than one {Name} in
       *    play."
       * inwo_rules_extracted.txt:268-273 (familia oficial):
       *   "A Power-increasing Plot is linked to a Group of a certain type to
       *    increase its Power to the value stated on the card. They have no
       *    effect on a Group that already has Power greater than or equal to
       *    the stated value."
       * => (a) FIJA el Poder al valor impreso, no lo suma; (b) es un no-op si
       *    el grupo ya tiene Poder >= ese valor; (c) la carta CUENTA COMO LA
       *    ACCION del grupo afectado, asi que se gasta su ficha (no la
       *    Illuminati); (d) la carta queda LINKED al grupo de forma permanente
       *    (inwo_rules_extracted.txt:819-847) y por eso va a linkedPlots, no al
       *    descarte; (e) una sola por jugador.
       * Antes este case era 4 lineas que aceptaba CUALQUIER grupo, no gastaba
       * ninguna ficha, no representaba el link y caia en el splice incondicional
       * del final (o sea, la carta se descartaba y el cambio se perdia al
       * reiniciar la partida). */
      var nd2=targetUid?findNode(targetUid):null;
      if(!nd2)throw new Error(c.name+': elige un grupo de tu estructura para linkear la carta');
      var tc2=card(nd2.cardId);
      if(eff.targetAlign&&nodeAligns(nd2,tc2).indexOf(eff.targetAlign)<0)
        throw new Error(c.name+' solo funciona sobre grupos '+eff.targetAlign+', y '+tc2.name+' no lo es');
      if(findOwnerPid(targetUid)!==pid)
        throw new Error(c.name+': el grupo debe ser tuyo ("your chosen group")');
      if(pl.linkedPlots.some(function(lp){return lp.cardId===handIdx;}))
        throw new Error(c.name+': no puede haber mas de una en juego por jugador');
      if(nd2.tokens<1)
        throw new Error(c.name+' cuenta como la accion del grupo y '+tc2.name+' no tiene ficha de accion');
      var want=(typeof eff.value==='number')?eff.value:6;
      if(curPower(nd2)>=want){
        /* La regla oficial dice "no effect on a Group that already has Power
           greater than or equal to the stated value": no se gasta ficha, no se
           linkea, y la carta se descarta normalmente. */
        log(c.name+': '+tc2.name+' ya tiene Poder '+curPower(nd2)+' (>= '+want+'), la carta no tiene efecto');
        break;
      }
      spendGroupToken(pid,targetUid);
      nd2.powerOverride=want;
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log(c.name+': Poder de '+tc2.name+' fijado a '+want+' (linkeado)');
      break;}
    case 'resistance_increase':{
      /* P1-014 — familia "Resistance Increase" (2 cartas: Commitment, Never
       * Surrender). Texto impreso verbatim:
       *   Commitment: "The Resistance for any one group is increased to 8. Link
       *     this card to your chosen group. Playing this card is a FREE MOVE and
       *     may be done at any time, even while its target group is being
       *     attacked. The target group may belong to ANY player, or may be one
       *     that has just been played from a rival's hand."
       *   Never Surrender: mismo free-move / at any time / any player, mas "The
       *     Resistance for one Fanatic group is increased to 12. Link this card
       *     to your chosen Fanatic group."
       * => (a) FIJA la Resistencia al valor impreso (no la suma); (b) es FREE:
       *     NO se gasta ninguna ficha, ni de grupo ni Illuminati; (c) se puede
       *     jugar "at any time", asi que esta en la lista `instant` de playPlot
       *     (tambien durante el ataque, que es lo que el texto pide); (d) el
       *     objetivo puede ser de CUALQUIER jugador, asi que a diferencia de
       *     power_increase NO se exige propiedad; (e) el link es permanente
       *     (inwo_rules_extracted.txt:819-847) asi que la carta va a linkedPlots
       *     y no al descarte, y la Resistencia queda fijada en el NODO (asi la
       *     lee nodeResistance() al calcular la fuerza de un ataque futuro).
       * NO se modela unicidad: ninguna de las 2 cartas dice "no puede haber mas de
       * una en juego", a diferencia de las 10 de Power Increase. */
      var nd3=targetUid?findNode(targetUid):null;
      if(!nd3)throw new Error(c.name+': elige un grupo objetivo');
      var tc3=card(nd3.cardId);
      if(eff.targetAlign&&nodeAligns(nd3,tc3).indexOf(eff.targetAlign)<0)
        throw new Error(c.name+' solo funciona sobre grupos '+eff.targetAlign+', y '+tc3.name+' no lo es');
      var wantR=(typeof eff.value==='number')?eff.value:8;
      /* Sin unique check y sin spendGroupToken: el texto dice "free move". La
       * unica validacion que queda es que el objetivo exista y sea del tipo
       * declarado, porque "may belong to any player" es literal. */
      nd3.resistanceOverride=wantR;
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log(c.name+': Resistencia de '+tc3.name+' fijada a '+wantR+' (linkeado, movimiento gratuito)');
      break;}
    /* P1-015 — Messiah (312). Texto impreso: "Play this card at any time except
       during an attack. Link it to any Personality you control. That person is
       hailed as the Messiah by millions worldwide! The new Messiah's Power and
       Resistance are both increased by 4, plus 2 more for every Church you control
       at any given time. Only one Messiah can be in play at a time."
       +4 (y +2 por cada grupo Church) es un AUMENTO del Poder, no un valor fijo,
       asi que se calcula sobre curPower() del nodo. No hay frase "this is an action
       for...", a diferencia de power_increase: NO se cobra ficha de grupo. */
    case 'messiah':{
      if(S.attack)throw new Error(c.name+' no se puede jugar durante un ataque');
      var ndM=findNode(targetUid);
      if(!ndM)throw new Error(c.name+': elige una Personality de tu estructura');
      var mcM=card(ndM.cardId);
      if((eff.targetSubtype||'personality')!==mcM.subtype)
        throw new Error(c.name+' solo se usa sobre una Personality, y '+mcM.name+' no lo es');
      if(findOwnerPid(targetUid)!==pid)
        throw new Error(c.name+': "any Personality you control" — el grupo debe ser tuyo');
      if(pl.linkedPlots.some(function(lp){return lp.cardId===handIdx;}))
        throw new Error(c.name+': "Only one Messiah can be in play at a time"');
      var attrC=eff.churchAttr||'church';
      var churches=0;
      walk(pl.structure,function(n){
        if(n.cardId==null||!countsForGoals(n))return;
        if(hasAttr(card(n.cardId),attrC,n))churches++; /* P1-017: nodo, no carta */
      });
      var mBonus=(typeof eff.baseBonus==='number'?eff.baseBonus:4)
        +(typeof eff.perChurch==='number'?eff.perChurch:2)*churches;
      ndM.powerOverride=curPower(ndM)+mBonus;
      ndM.resistanceOverride=nodeResistance(ndM)+mBonus;
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log('MESSIAH: '+mcM.name+' recibe +'+mBonus+' de Poder y de Resistencia ('+churches+' grupo(s) '+attrC+')');
      break;}
    /* P1-015 — Angst (194). Texto impreso: "The leaders of your target group (any
       Place or Organization except the Illuminati) find it boring and meaningless.
       Their power is permanently reduced to 1. Link this card to the target. Play
       this card at any time except during an attack. It requires an action from
       your Illuminati and either the Psychiatrists, the Intellectuals, or the
       Orbital Mind Control Lasers."
       El coste es DOBLE: una accion Illuminati + una accion de grupo de la lista.
       Las dos se COMPRUEBAN antes de gastar ninguna, para no dejar tokens a medias. */
    case 'angst':{
      if(S.attack)throw new Error(c.name+' no se puede jugar durante un ataque');
      var ndA=findNode(targetUid);
      if(!ndA)throw new Error(c.name+': elige un grupo objetivo');
      var mcA=card(ndA.cardId);
      var subs=eff.targetSubtypes||['place','organization'];
      if(subs.indexOf(mcA.subtype)<0||mcA.type==='illuminati')
        throw new Error(c.name+' solo se usa sobre Places u Organizations, y '+mcA.name+' no lo es');
      var wantN=eff.requiresActionFrom||[];
      if(pl.illumTokens<1)throw new Error(c.name+' requiere una accion de tu Illuminati');
      var anA=opts.aidUid?findNode(opts.aidUid):null;
      if(opts.aidUid&&(!anA||findOwnerPid(opts.aidUid)!==pid))
        throw new Error('El grupo que aporta la accion debe ser tuyo');
      if(!anA)anA=firstUsableAid(pid,function(cc){return wantN.indexOf(cc.name)>=0;});
      if(!anA)throw new Error(c.name+' necesita una accion de uno de: '+wantN.join(', '));
      pl.illumTokens--;
      spendGroupToken(pid,anA.uid);
      var wantV=(typeof eff.value==='number')?eff.value:1;
      ndA.powerOverride=wantV;
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log('ANGST: Poder de '+mcA.name+' reducido permanentemente a '+wantV+' (accion de '+card(anA.cardId).name+')');
      break;}
    /* P1-017 — DICTATORSHIP (239). "Play this card during your turn, on any Nation
       which you control. This is an action for that Nation or its master. It
       becomes Violent, if it was not already. Link this card to the Nation."
       Es la primera carta del mazo que exige un cambio de IDEOLOGIA a nivel de
       nodo. Antes era IMPOSIBLE: el motor no tenia almacenamiento de alineaciones
       por grupo y las leia de la carta inmutable en mas de 20 sitios, asi que
       "it becomes Violent" no tendria efecto en ningun calculo posterior
       (fuerza, ayuda, oposicion, doble de las metas, veto de Shangri-La).
       P1-017 creo nodeAligns()/nodeAttrs() y migro los 15 sitios de lectura.
       OJO: esta carta NO esta en la lista `instant` de la cabecera de playPlot
       porque el texto dice "during your turn", no "at any time": asi que el veto
       `if(S.attack)` no hace falta y requireOwnMain ya garantiza el turno.
       El texto dice "if it was not already", asi que se comprueba antes de anadir
       y no se duplica la ideologia. `alignsAdded` es ADICION (union), no reemplazo,
       lo que ademas permite que Backlash (200) deshaga el cambio sin saber que
       carta lo produjo. */
case 'force_align':{
      /* L2 / P1-028 — LAS NUEVE CARTAS DE "FORZAR UNA ALINEACION".
         Assertiveness Training (198), Fundie Money (264), Jake Day (290), Kinder and
         Gentler (295), Liberal Agenda (301), Nationalization (323), Power Corrupts
         (340), Privatization (345) y Straighten Up (376).

         El texto impreso es identico en las nueve salvo los dos alineamientos:
           "It requires action(s) by either the Illuminati, or <X> group(s) with a
            total Power equal to the Resistance of the target group, doubled if the
            group is currently <opposite>. Add bonuses for its closeness to the
            Illuminati if it belongs to a rival! The target becomes permanently <X>.
            If it was <opposite>, that alignment is lost. Keep this card, with a link
            to the target."
         Ver las 5 DECLARACIONES en el comentario de FORCE_FX (gen_cards.js). */
      var ndF=findNode(targetUid);
      if(!ndF)throw new Error(c.name+': elige un grupo objetivo');
      var tcF=card(ndF.cardId);
      if(!tcF)throw new Error(c.name+': el objetivo no es una carta');
      var ownerF=findOwnerPid(targetUid);
      if(ownerF==null)throw new Error(c.name+': ese grupo ya no esta en juego');
      /* El Illuminati es la raiz de la estructura y no es un grupo con ideologia
         propia que forzar: su poder se trata aparte (llamadas de Illustrate). */
      if(tcF.type==='illuminati')throw new Error(c.name+': no se puede forzar la alineacion de un Illuminati');
      /* El texto no dice "una Nacion" ni ningun otro filtro de tipo: el objetivo es
         "the target group", cualquiera. Por eso esta carta no lleva targetAttr. */
      var fA=eff.forceAlign;
      var oA=eff.oppAlign||null;
      var beforeF=nodeAligns(ndF,tcF);

      /* --- COSTE DINAMICO (declaracion 1) -------------------------------
         resistance del objetivo, DOBLE si tiene la alineacion opuesta. No hay
         numero fijo que leer de la carta porque el texto lo define en funcion del
         objetivo; por eso esta carta no usa minPower. */
      var costF=nodeResistance(ndF,tcF);
      var doubledF=false;
      if(oA&&beforeF.indexOf(oA)>=0){costF=costF*2;doubledF=true;}
      /* --- "Add bonuses for its closeness to the Illuminati if it belongs to a
             rival!" (declaracion 2) ---------------------------------------
         Las reglas oficiales distinguir "closeness to the Illuminati" (bonificacion
         de DEFENSA) de "common alignments with its master" (aumentan la
         Resistencia). Se suma el bloque de defensa, y SOLO si el objetivo es de un
         rival: sobre un grupo propio no hay "cercania a un rival". */
      var closeF=0;
      if(ownerF!==pid)closeF=closenessDefenseBonus(ownerF,ndF,tcF,null,null);
      costF=costF+closeF;

      /* --- PAGO: "either the Illuminati, or <X> group(s) with a total Power" ---
         El Illuminati es la via rapida (UNA ficha, sea cual sea el coste: asi lo
         dicen las nueve cartas, "by EITHER the Illuminati, or ..."). La via de los
         grupos es la que tiene el matiz de plan.md: se gasta UNA ficha por grupo
         hasta que la SUMA de poderes alcanza el coste, no todas las fichas de
         todos los grupos. Un grupo ya no puede repetir porque su ficha por turno
         es una sola y declararla la gasta. */
      var paidF=null;
      if(pl.illumTokens>=1){pl.illumTokens--;paidF={via:'illuminati',groups:[]};}
      else{
        var needF=costF;
        var pickedF=[];
        walk(pl.structure,function(n){
          if(needF<=0)return;
          if(n===pl.structure)return;
          if(n.devastated||n.paralyzed||n.zapped||n.actionStripped)return;
          if(!n.tokens||n.tokens<1)return;
          var nc=card(n.cardId);
          if(!nc)return;
          if(nodeAligns(n,nc).indexOf(fA)<0)return;
          spendGroupToken(pid,n.uid);
          pickedF.push({uid:n.uid,name:nc.name,power:curPower(n)});
          needF-=curPower(n);
        });
        if(needF>0){
          if(!pickedF.length)
            throw new Error(c.name+': necesitas '+costF+' de Poder de grupos '+cap(fA)+' o una accion de tu Illuminati, y no tienes ninguna de las dos');
          throw new Error(c.name+': necesitas '+costF+' de Poder de grupos '+cap(fA)+'; tus grupos sin ficha solo aportan '+((costF-needF))+' (accion del Illuminati: sin fichas)');
        }
        paidF={via:'groups',groups:pickedF};
      }

      /* --- EFECTO (declaracion 3) -----------------------------------------
         "The target becomes permanently <X>" -> alignsAdded (ya existe desde
         P1-017 y es la semantica de union).
         "If it was <opposite>, that alignment is lost" -> alignsRemoved, el filtro
         nuevo de nodeAligns. Si el objetivo no tenia la opuesta, no se registra
         nada: registrar una resta que no aplica dejaria rastro para Backlash (200)
         sin motivo. */
      if(!Array.isArray(ndF.alignsAdded))ndF.alignsAdded=[];
      var gainedF=beforeF.indexOf(fA)<0;
      if(gainedF)ndF.alignsAdded.push(fA);
      var lostF=false;
      if(oA&&beforeF.indexOf(oA)>=0){
        if(!Array.isArray(ndF.alignsRemoved))ndF.alignsRemoved=[];
        ndF.alignsRemoved.push(oA);
        lostF=true;
      }
      /* --- Privatization (345): "and if it was a Dictatorship, it is no longer".
             Requiere la marca que P1-028 le puso a la carta Dictatorship. */
      var lostDictF=false;
      if(eff.noDictatorship&&ndF.dictatorship){
        ndF.dictatorship=false;
        ndF.powerMods=(ndF.powerMods||[]).filter(function(m){return m.name!=='Dictatorship';});
        lostDictF=true;
      }
      /* --- "Keep this card, with a link to the target" (declaracion 4).
             No hace falta tocar la pila de descarte: el chequeo linkedHere que
             introdujo P1-025 al final de E.playPlot ya deja fuera de ella una Plot
             linkeada, que es exactamente lo que pide el texto. */
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});

      log(c.name+': '+tcF.name+' ('+S.players[ownerF].name+') se convierte permanentemente en '+cap(fA)
        +(lostF?(' y pierde '+cap(oA)):'')+(lostDictF?' y deja de ser Dictatorship (y pierde el +2 de Poder)':'')
        +' · coste '+costF+(doubledF?' (doblado: era '+cap(oA)+')':'')+(closeF?(' +'+closeF+' de cercania'):'')
        +' · pagado con '+(paidF.via==='illuminati'?'una accion del Illuminati'
            :(paidF.groups.map(function(g){return g.name;}).join(' + '))));
      lastResult={ok:true,forced:tcF.name,owner:S.players[ownerF].name,
        align:fA,opp:oA,wasOpposite:lostF,lostDictatorship:lostDictF,gained:gainedF,
        cost:costF,doubled:doubledF,closeness:closeF,paidWith:paidF};
      break;}
    case 'dictatorship':{
      var ndD=findNode(targetUid);
      if(!ndD)throw new Error(c.name+': elige una Nacion de tu estructura');
      var mcD=card(ndD.cardId);
      if(!mcD)throw new Error('El objetivo no es una carta');
      /* 1) el texto dice "on any Nation": filtro de atributo nation */
      if(eff.targetAttr&&!hasAttr(mcD,eff.targetAttr,ndD))
        throw new Error(c.name+' solo se usa sobre una Nacion, y '+mcD.name+' no lo es');
      /* 2) "which you control" */
      if(findOwnerPid(targetUid)!==pid)
        throw new Error(c.name+': la Nacion debe ser tuya ("any Nation which you control")');
      /* 3) "This is an action for that Nation or its master": la ficha la gasta
            la Nacion si la tiene; si no, la gasta su master (el Illuminati), que
            es literalmente lo que dice el texto. El master NO es un nodo con
            `tokens` (su accion es pl.illumTokens), asi que no se puede pasar por
            spendGroupToken: se descuenta de ahi directamente. */
      var usedMaster=false;
      if(ndD.tokens!=null&&ndD.tokens>=1)spendGroupToken(pid,targetUid);
      else if(pl.illumTokens>=1){pl.illumTokens--;usedMaster=true;}
      else throw new Error(c.name+': la Nacion no tiene Action token y tu Illuminati tampoco');
      /* 4) "It becomes Violent, if it was not already" */
      var addD=eff.addAlign||'violent';
      var alreadyD=nodeAligns(ndD,mcD).indexOf(addD)>=0;
      if(!alreadyD){
        if(!Array.isArray(ndD.alignsAdded))ndD.alignsAdded=[];
        ndD.alignsAdded.push(addD);
      }
      /* P1-028 — "The target is now a Dictatorship. It gets +2 Power."
         Esta carta estaba implementada a MEDIAS: guardaba el link y el +0 del
         "becomes Violent", pero NO ponia ninguna marca de Dictatorship ni aplicaba
         el +2 de Poder impreso. Dos consecuencias reales: (a) la clausula de
         Privatization (345) "and if it was a Dictatorship, it is no longer" no
         tenia nada contra lo que comprobar, y (b) el +2 se perdia en silencio
         mientras la carta figuraba como implementada. Ahora: marca `dictatorship`
         para que la compruebe 345, y `powerMods` para el +2 (aditivo y apilable,
         a diferencia de powerOverride que es un valor absoluto). */
      if(!ndD.dictatorship){
        ndD.dictatorship=true;
        if(!Array.isArray(ndD.powerMods))ndD.powerMods=[];
        ndD.powerMods.push({name:'Dictatorship',v:2});
      }
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log('DICTATORSHIP: '+mcD.name+(alreadyD?' ya era Violent. ':' se vuelve Violent. ')
        +'Ahora es una Dictatorship: +2 de Poder. '
        +'Carta linkeada (accion de '+(usedMaster?illuCard(pid).name:mcD.name)+')');
      break;}
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
      /* P1-021 — USO ALTERNATIVO. El texto impreso de dos Disaster trae una
         SEGUNDA forma de usarse que no es el ataque instantáneo:
           Atomic Monster (199): "Or play at any time to give +10 to any attack
             to destroy the Robot Sea Monsters or the Nuclear Power Companies!"
           Plague of Demons (336): la misma forma contra grupos Magic.
         El dato ya lo declaraba en effect.altUse={kind:'destroy_bonus',
         targetNames|targetAttr, bonus} y el motor lo IGNORABA por completo (0
         coincidencias de 'altUse' en todo el fichero antes de este lote), así que
         esa segunda mitad de la carta era decorativa.
         Es mecánica identica a la familia +10 (P1-012) pero filtrando por NOMBRE
         o ATRIBUTO en vez de ideología, y sólo contra ataques a DESTRUIR, nunca a
         controlar. Se apoya en A.boosts, que computeStrength ya suma en la rama
         de destruccion: det.boosts entra con signo + en la formula de total, y la
         invariante de esa formula (ver prueba P1-005) no se toca. No se gasta
         ficha: el texto no dice "this is an action for...", igual que las +10. */
      if(opts.altUse){
        if(!eff.altUse||eff.altUse.kind!=='destroy_bonus')
          throw new Error(c.name+' no tiene un uso alternativo de tipo destroy_bonus');
        var A2=S.attack;
        if(!A2||A2.resolved)
          throw new Error(c.name+': el uso alternativo solo funciona durante un ataque en curso');
        if(A2.type!=='destroy')
          throw new Error(c.name+': el uso alternativo solo refuerza ataques a DESTRUIR');
        var n2=A2.targetUid?findNode(A2.targetUid):null;
        if(!n2)throw new Error('El ataque en curso no tiene un objetivo en juego');
        var tc2=card(n2.cardId);
        if(!tc2)throw new Error('El objetivo del ataque no se puede resolver');
        var okAlt=false;
        if(eff.altUse.targetNames){
          /* El dato guarda identificadores normalizados en minusculas ('japan',
             'robotseamonsters') mientras card().name conserva las mayusculas del
             impreso. Se normalizan LOS DOS LADOS: comparar en crudo es
             exactamente el bug P1-020 que acaba de corregir plotPowerFor. */
          var want2=String(tc2.name).toLowerCase().replace(/[^a-z0-9]/g,'');
          for(var w2=0;w2<eff.altUse.targetNames.length;w2++){
            if(String(eff.altUse.targetNames[w2]).toLowerCase().replace(/[^a-z0-9]/g,'')===want2){okAlt=true;break;}
          }
        }else if(eff.altUse.targetAttr){
          okAlt=hasAttr(tc2,eff.altUse.targetAttr,n2);
        }
        if(!okAlt)throw new Error(c.name+': el uso alternativo no refuerza un ataque a destruir contra '+tc2.name);
        var b2=(typeof eff.altUse.bonus==='number')?eff.altUse.bonus:10;
        A2.boosts.push({name:c.name,v:b2});
        log(pl.name+' usa '+c.name+' como alternativa: +'+b2+' a un ataque a destruir contra '+tc2.name);
        lastResult={ok:null,altUse:true,bonus:b2,target:tc2.name,plot:c.name};
        break;
      }
      if(!targetUid)throw new Error(eff.kind==='assassination'?'Elige una Personality objetivo':'Elige un Place objetivo');
      /* P1-016: VENTANA DE REACCION. Antes esta linea anunciaba, gastaba los
         costes, tiraba los dados y destruia, todo seguido y sin salida. Ahora se
         ANUNCIA primero; si hay alguien que pueda cancelar de verdad se deja el
         ataque pendiente en S.pendingAttack, y si no, se resuelve en el acto
         exactamente igual que hasta ahora. Ver reactionWindowOpen() para el
         porque de esa decision, que es de diseño y no de regla. */
      var annI=announcePlotInstantAttack(pid,c,targetUid,opts);
      if(reactionWindowOpen(annI)){
        S.pendingAttack={pid:pid,cardIdx:c.idx,cardName:c.name,tUid:targetUid,
                         tc:annI.tc,ann:annI,cancelled:null};
        log(c.name+' se anuncia contra '+annI.tc.name+': ventana de reaccion abierta (fuerza '+annI.str+')');
        lastResult={ok:null,pending:true,strength:annI.str,power:annI.power,
                    defense:annI.defPower,target:annI.tc.name,plot:c.name,notes:annI.notes};
      }else{
        lastResult=applyPlotInstantAttack(annI);
      }
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
          discardPlot(ix,pid);log('NWO reemplazada: '+oc.name);return false;
        }
        return true;
      });
      pl.exposedPlots.push(handIdx);
      log('NWO en juego: '+c.name+' ('+(eff.color||'?')+')');break;}
    case 'bribery':
    case 'computervirus':
    case 'murphyslaw':
    case 'timewarp':
    case 'mistakenidentity':
    case 'mothersmarch':{
      /* P1-024 — CARTAS DE RODADERO. A diferencia de P1-016 (que reaccionan a un
         ataque ANUNCIADO, antes de los dados), estas seis reaccionan a un
         RODADERO ya tirado y todavia sin aplicar: "Play immediately after any
         die roll". Por eso exigen S.pendingRoll abierto. La condicion impresa
         ("despues de un exito", "solo contra un Assassination", "por otro
         jugador") YA esta comprobada en rollReactionAllowed(), que openRollWindow
         usaba para construir P.responders; aqui solo corresponde el COSTE y la
         MUTACION del rodadero. El objetivo no se elige: es la carta la que
         modifica el numero, no a quien se ataca. */
      if(!S.pendingRoll)
        throw new Error(c.name+': no hay ningun rodadero que reaccionar');
      var pR=S.pendingRoll;
      var allR=rollReactionAllowed(eff,pid,pR);
      if(!allR.ok)throw new Error(c.name+': '+allR.why);
      var elR=eff.requireAttrAny||[];
      if(eff.illumTokenAll){
        if(pl.illumTokens<1)throw new Error(c.name+' requiere al menos 1 ficha de accion de tu Illuminati');
        pl.illumTokens=0;   /* "all Action tokens currently on your Illuminati" */
      }else if(elR.length){
        /* "any Science, Space or Computer group" = disyuncion de atributos:
           basta con que el grupo tenga UNO de los tres. */
        var aR=opts.aidUid?findNode(opts.aidUid):null;
        if(opts.aidUid&&(!aR||findOwnerPid(opts.aidUid)!==pid))
          throw new Error('El grupo que aporta la accion debe ser tuyo');
        if(!aR)aR=firstUsableAid(pid,function(cc,nn){
          return elR.some(function(a){return hasAttr(cc,a,nn);});
        });
        if(!aR)throw new Error(c.name+' necesita una accion de un grupo con algun atributo de: '+elR.join(', '));
        spendGroupToken(pid,aR.uid);
      }else if(eff.minPower){
        var aP=opts.aidUid?findNode(opts.aidUid):null;
        if(opts.aidUid&&(!aP||findOwnerPid(opts.aidUid)!==pid))
          throw new Error('El grupo que aporta la accion debe ser tuyo');
        if(!aP)aP=firstUsableAid(pid,function(cc){return (cc.power||0)>=eff.minPower;});
        if(!aP)throw new Error(c.name+' necesita una accion de un grupo con Poder >= '+eff.minPower);
        spendGroupToken(pid,aP.uid);
      }
      if(eff.kind==='mistakenidentity'){
        pR.cancelled={pid:pid,name:S.players[pid].name,cardName:c.name};
        log(c.name+': el '+pR.klass+' de '+S.players[pR.pid].name+' contra '+pR.target+' pasa a ser fallo automatico');
        lastResult={ok:false,cancelled:true,reason:'cancelado por '+c.name,plot:c.name,
                    target:pR.target,roll:null,margin:null,destroyed:false,
                    notes:['Automatic failure por '+c.name]};
      }else if(eff.kind==='timewarp'||eff.kind==='mothersmarch'){
        pR.reroll={pid:pid,cardName:c.name,penalty:(eff.kind==='mothersmarch'?-4:0)};
        log(c.name+': '+S.players[pR.pid].name+' debe repetir el rodadero'+
            (eff.kind==='mothersmarch'?' con una penalizacion de -4':'')+
            (eff.kind==='timewarp'?(' y roba una carta de Grupo '+S.players[pid].name):''));
        lastResult={ok:null,reroll:true,plot:c.name,target:pR.target,roll:pR.roll,
                    reason:'rodadero repetido'+(eff.kind==='mothersmarch'?' a -4':'')};
      }else{
        var oldR=pR.roll,newR=pR.roll;
        if(eff.kind==='bribery')newR=2;
        else if(eff.kind==='murphyslaw')newR=12;
        else{var d=Number(opts.rollDelta);if(!(d===1||d===2))d=-2;newR=pR.roll+d;}
        if(newR<2)newR=2;if(newR>12)newR=12;
        pR.roll=newR;
        pR.mods.push({card:c.name,from:oldR,to:newR});
        log(c.name+': el rodadero de '+pR.label+' cambia de '+oldR+' a '+newR);
        lastResult={ok:null,mod:true,plot:c.name,target:pR.target,roll:newR,from:oldR,
                    reason:'rodadero modificado a '+newR};
      }
      break;}
/* ===== L1 — TOKEN-GIFT (11 cartas) =====
     * "Place an Action token on each of your <X> groups."
     *
     * Es la primera familia del plan.md con UN efecto y VARIOS filtros, asi que
     * el filtro va en los datos (`eff.giftAlign` / `eff.giftAttr`) y el motor es
     * uno solo. Dos planos, dos campos, porque el mazo los usa de verdad: diez de
     * las once filtran por IDEOLOGIA y Bank Merger (201) filtra por el atributo
     * `bank`, que no es ninguna de las diez ideologias (§23). Habria sido un
     * error de P1-018 otra vez mirar `c.alignments` para todo.
     *
     * ALCANCE: toda la estructura de Poder, recursivamente, titeres incluidos —
     * el texto dice "your groups" y nada mas. Se recorre con `walk`, igual que
     * `firstUsableAid` y que el `case 'zap'`.
     *
     * `tokens = 1` y NO `tokens++`: la carta PONE la ficha de accion, no multiplica
     * fichas. Asi el "which does not already have one" de las diez cartas normales
     * se cumple solo, y el "even those which already have an Action token" de Bank
     * Merger queda como el recordatorio redundante que el texto impreso es.
     *
     * "does not benefit groups which are suffering from the effect of any card or
     * special ability that prevents them from getting Action tokens" se implementa
     * con el mismo conjunto de banderas que `firstUsableAid` usa para "puede
     * actuar" (devastated/paralyzed/zapped/actionStripped). Es el unico predicado
     * de "no puede recibir fichas" que existe, y no se inventa un segundo.
     *
     * SIN COSTE: su texto no imprime ninguno. No es un descuido. */
    /* ==========================================================================
   L3a - BULK-POWER (datos en gen_cards.js; aqui solo se ejecuta)
   --------------------------------------------------------------------------
   Ver el bloque BULK_FX de gen_cards.js para la gramatica de clausulas y las
   CINCO declaraciones de interpretacion. Aqui solo hay codigo.

   POR QUE `resistanceMods` Y NO `resistanceOverride`
   `nodeResistance` ya tenia `resistanceOverride`, pero ese campo es un VALOR
   ABSOLUTO (lo usa Anguish para fijar la Resistencia a 1). Estas cartas dicen
   "+1", "+3", "-1": hacen falta deltas apilables, igual que `powerMods` para el
   Poder. Por eso se anaden los dos campos y no se reutiliza el existente.

   ========================================================================== */
case 'bulk_power':{
      lastResult = applyBulkPower(pid, c, eff); break;}
    case 'token_gift':{
      var gAlign=(typeof eff.giftAlign==='string')?eff.giftAlign.toLowerCase():null;
      var gAttr=(typeof eff.giftAttr==='string')?eff.giftAttr.toLowerCase():null;
      if(!gAlign&&!gAttr)
        throw new Error(c.name+': la carta no declara ningun filtro (ni giftAlign ni giftAttr)');
      var gifted=[];
      walk(pl.structure,function(n){
        if(n===pl.structure)return; /* la raiz es el Illuminati, no es "un grupo tuyo" */
        var gc=card(n.cardId);
        if(!gc)return;
        if(gAlign&&nodeAligns(n,gc).indexOf(gAlign)<0)return;
        if(gAttr&&!hasAttr(gc,gAttr,n))return;
        if(n.devastated||n.paralyzed||n.zapped||n.actionStripped)return;
        n.tokens=1;
        gifted.push(gc.name);
      });
      if(!gifted.length){
        log(c.name+': no tiene ningun grupo tuyo que coincida, se gasta sin efecto');
      }else{
        log(c.name+': 1 ficha de accion para '+gifted.length+' grupo(s) tuyo(s) — '+gifted.join(', '));
      }
      lastResult={ok:true,gift:true,card:c.name,align:gAlign,attr:gAttr,
                  granted:gifted.length,groups:gifted.slice()};
      break;}
    /* ===== P1-026 — PRIVILEGED ATTACK (346) =====
       * "Play this card when you make any attack. That attack is now privileged:
       *  nobody except you and the target player may aid either side. Your
       *  Illuminati or a Secret group must participate or spend an Action token."
       *
       * No necesita ventana propia: el suceso que reacciona es "tu ataque ya
       * esta declarado", y eso lo fija `S.attack`. Lo que SI hace falta es que
       * el privilegio se conceda aqui y no antes — ver el guard de
       * `E.addSupport`, que es donde por fin se lee `A.privilege`. */
    case 'privileged_attack':{
      if(!S.attack||S.attack.resolved)
        throw new Error(c.name+': solo se juega sobre un ataque tuyo que aun no se resuelve');
      var Ap=S.attack;
      if(Ap.pid!==pid)
        throw new Error(c.name+': el ataque que quieres privilegiar no es tuyo');
      if(Ap.privilege)
        throw new Error(c.name+': ese ataque ya es privilegiado');
      if(Ap.aids.length||Ap.opposes.length)
        throw new Error(c.name+': hay que hacer el ataque privilegiado ANTES de que nadie participe');
      /* "Your Illuminati OR a Secret group": primero el Illuminati (es lo mas
         barato y el texto lo nombra primero), si no, un grupo Secret con ficha. */
      var usedPriv=(illuCard(pid)?illuCard(pid).name:'tu Illuminati');
      if(pl.illumTokens>=1){pl.illumTokens--;}
      else{
        var secA=firstUsableAid(pid,function(cc,nn){
          return !!eff.illumOrSecretAlign&&nodeAligns(nn,cc).indexOf(eff.illumOrSecretAlign)>=0;});
        if(!secA)
          throw new Error(c.name+': necesitas una accion de tu Illuminati o de un grupo Secret');
        spendGroupToken(pid,secA.uid);usedPriv=card(secA.cardId).name;
      }
      Ap.privilege=true;
      log(pl.name+' juega '+c.name+' (accion de '+usedPriv+'): el ataque de '+
          Ap.attackerUid+' queda PRIVILEGIADO, nadie mas puede participar');
      lastResult={ok:true,plot:c.name,privileged:true,
                  reason:'ataque privilegiado (accion de '+usedPriv+')'};
      break;}
    /* ===== P1-027 — THE SECOND BULLUS (398) =====
     * "Play immediately after you fail a roll to destroy. If any of your own
     *  groups still have Action tokens and were eligible to participate in the
     *  attack, you may spend their action(s) to add enough Power to make the
     *  attack succeed."
     *
     * No necesita ventana propia: extiende la ventana de RODADERO de P1-024. La
     * condicion "fail a roll to destroy" es exactamente "la ventana de rodadero
     * esta abierta y el rodadero ha fallado", asi que en vez de inventar un
     * cuarto mecanismo se comprueba el estado que ya existe. Y "add enough Power"
     * se resuelve SOLO con las fichas que el propio atacante ya habia puesto
     * en el ataque (`A.aids`), porque son las unicas que el texto autoriza:
     * "were eligible to participate". */
    case 'second_bullet':{
      if(!S.pendingRoll)
        throw new Error(c.name+': no hay ningun rodadero pendiente');
      var pB=S.pendingRoll;
      if(pB.cancelled)throw new Error(c.name+': ese ataque ya fue cancelado');
      if(pB.reroll)throw new Error(c.name+': el rodadero ya se va a repetir');
      var kB=(pB.klass==='destroy')?'destroy':(String(pB.klass||'').indexOf('destroy')>=0?'destroy':null);
      if(kB!=='destroy')
        throw new Error(c.name+': solo se juega tras fallar una destruccion, y esto es un '+(pB.klass||'ataque'));
      if(pB.pid!==pid)
        throw new Error(c.name+': solo puede jugarla quien atacó');
      if(pB.success)
        throw new Error(c.name+': solo se juega tras FALLAR el rodadero, y ese fue un exito');
      var Atk=pB.attack;
      if(!Atk)throw new Error(c.name+': este rodadero no pertenece a un ataque declarado');
      /* "If any of your own groups still have Action tokens and were ELIGIBLE to
         participate in the attack" -> no solo cuentan los que ya participaron en el
         ataque (Atk.aids): un grupo tiene UNA ficha por turno y declararlo ya la
         gasta (P1-022), asi que los unicos con ficha libre son los que PODRIAN
         haber ayudado y no lo hicieron. Aqui se recorren todos los grupos del
         atacante con ficha y se aplica el MISMO criterio de elegibilidad que
         E.addSupport: para destruir, >=1 ideologia opuesta al objetivo. */
      var tNodeB=Atk.targetUid?findNode(Atk.targetUid):null;
      var tCardB=tNodeB?card(tNodeB.cardId):(Atk.handTarget?C.cards[Atk.handTarget.idx]:null);
      var alB=tCardB?nodeAligns(tNodeB,tCardB):[];
      var extra=0,spent=[];
      walk(S.players[pid].structure,function(nn){
        if(nn===S.players[pid].structure)return;
        if(nn.tokens==null||nn.tokens<1)return;
        if(nn.paralyzed||nn.zapped||nn.devastated||nn.actionStripped)return;
        var cc=card(nn.cardId);
        if(!cc||!tCardB)return;
        var own=nodeAligns(nn,cc);
        var elig=(kB==='destroy')?false:true;
        for(var i=0;i<own.length;i++)
          for(var j=0;j<alB.length;j++)
            if(isOpposite(own[i],alB[j]))elig=true;
        if(!elig)return;
        while(nn.tokens>=1){nn.tokens--;extra+=curPower(nn);spent.push(cc.name);}
      });
      if(extra<=0)
        throw new Error(c.name+': ningun grupo tuyo con ficha puede participar en este ataque');
      var newTotal=pB.total+extra;
      log(c.name+': '+S.players[pid].name+' gasta la accion de '+spent.join(', ')+
          ' y suma +'+extra+' Poder ('+pB.total+' -> '+newTotal+')');
      if(newTotal<2)
        throw new Error(c.name+': con la(s) accion(es) que te quedan la fuerza sigue por debajo de 2 (quedaria en '+newTotal+')');
      pB.total=newTotal;
      pB.reroll={pid:pid,cardName:c.name,penalty:0};
      lastResult={ok:null,reroll:true,plot:c.name,target:pB.target,roll:pB.roll,
                  reason:'+'+extra+' Poder (accion de '+spent.join(', ')+'), rodadero repetido'};
      break;}
    /* ===== P1-027 — LAS DOS CARTAS DE LA VENTANA DE SUCESO =====
     * Ninguna de las dos necesitamecanismo propio: el suceso (un robo de Plot,
     * un descarte de Plot) ya abrio `S.pendingEvent`, y responder es solo tomar
     * la decision que la carta pide y dejar el resto para el cierre. Es el mismo
     * contrato de dos pasos que P1-016 y P1-024 — jugar la carta NO cierra. */
    case 'stealing_the_plans':{
      if(!S.pendingEvent)
        throw new Error(c.name+': no hay ningun suceso pendiente');
      var pE=S.pendingEvent;
      var okE=eventReactionAllowed(eff,pid,pE);
      if(!okE.ok)throw new Error(c.name+': '+okE.why);
      var mp=eff.minPower||3;
      var spA=firstUsableAid(pid,function(cc){return cc.power>=mp;});
      if(!spA)
        throw new Error(c.name+': necesita una accion de un grupo con Poder ≥ '+mp);
      spendGroupToken(pid,spA.uid);
      pE.data.taken=pE.data.cardIdx;
      pE.takenBy=pid;
      /* Al jugar la carta, su ventana ya no puede volver a abrirse para esta
         misma Plot: `responders` se recalcula para que la UI deje de ofrecerla. */
      pE.responders=[];
      log(c.name+': '+pl.name+' (accion de '+card(spA.cardId).name+') se queda con '+
          card(pE.data.cardIdx).name+', que '+pE.data.byName+' acaba de descartar');
      lastResult={ok:true,plot:c.name,pending:true,
                  reason:'roba '+card(pE.data.cardIdx).name+' del descarte al cerrar la ventana'};
      break;}
    case 'embezzlement':{
      if(!S.pendingEvent)
        throw new Error(c.name+': no hay ningun suceso pendiente');
      var pM=S.pendingEvent;
      var okM=eventReactionAllowed(eff,pid,pM);
      if(!okM.ok)throw new Error(c.name+': '+okM.why);
      /* "Requires Plot Discard" y "you must discard one other Plot card from
         your own hand": se elige el pago aqui y se entrega en el cierre, para
         que la UI pueda ofrecer WHICH card (no hay una unica respuesta). */
      /* Se valida el pago pedido contra las Plots PROPIAS, excluida la que se
         va a robar: "you must discard ONE OTHER Plot card from your own hand".
         Ojo al orden: la lista de candidatos se construye SIN el pago pedido,
         asi que comprobar si el pedido esta en ella siempre daria falso y se
         acabaria pagando la primera por orden de mano. */
      var plotsOwn=S.players[pid].hand.filter(function(ix){
        return C.cards[ix].type==='plot'&&ix!==pM.data.cardIdx;});
      var pay=(opts.payment!=null)?opts.payment:-1;
      if(plotsOwn.indexOf(pay)<0)pay=plotsOwn.length?plotsOwn[0]:-1;
      if(pay<0)
        throw new Error(c.name+': no tienes ninguna Plot propia que descartar como pago');
      pM.data.claimed=pM.data.cardIdx;
      pM.data.payment=pay;
      pM.claimedTo=pid;
      pM.responders=[];
      log(c.name+': '+pl.name+' reclama '+card(pM.data.cardIdx).name+
          ' (de '+pM.data.byName+') y paga con '+card(pay).name);
      lastResult={ok:true,plot:c.name,pending:true,
                  reason:'roba '+card(pM.data.cardIdx).name+', paga con '+card(pay).name};
      break;}
    case 'bodyguard':
    case 'talisman':{
      /* P1-016 — CARTAS DE CANCELACION. Estas dos cartas solo existen gracias a la
         ventana de reaccion: "Play this card after any type of Assassination. It
         becomes an automatic failure." NO es una reaction a un assassination ya
         resuelto, es exactamente la ventana de la p. 15: el ataque esta anunciado,
         los dados aun no estan tirados, y la carta lo convierte en fallo
         automatico. Por eso se exige S.pendingAttack abierto y de clase
         assassination: jugar la carta sin un ataque anunciado no tendria a que
         cancelar, y el texto no lo permite.
         El objetivo NO se elige: es la carta que el ataque iba a matar, o sea
         "the card it protected". Tampoco se comprueba la propiedad: el texto dice
         "the card it protected", no "your Personality", y la regla de cancelacion
         no restringe a quien puede reaccionar. */
      if(!S.pendingAttack)
        throw new Error(c.name+': no hay ningun ataque anunciado que cancelar');
      var pend=S.pendingAttack;
      if(pend.ann.eff.kind!=='assassination')
        throw new Error(c.name+': solo se juega despues de un Assassination, y lo anunciado es un Disaster');
      if(pend.cancelled)
        throw new Error(c.name+': ese ataque ya fue cancelado');
      if(eff.kind==='talisman'){
        /* "No more than one Talisman of Ahrimanes can be in play at one time":
           el limite es GLOBAL, no por jugador, asi que se comprueba en el
           linkedPlots de todos. */
        for(var q=0;q<S.players.length;q++){
          var lps=S.players[q].linkedPlots||[];
          for(var z=0;z<lps.length;z++){
            if(card(lps[z].cardId).name===c.name)
              throw new Error(c.name+': "No more than one Talisman of Ahrimanes can be in play at one time"');
          }
        }
      }
      var ndR=findNode(pend.tUid);
      if(!ndR)throw new Error(c.name+': el grupo que se iba a proteger ya no esta en juego');
      /* Se escribe el bonus SOBRE EL NODO, no sobre un campo del ataque: el
         texto dice que la proteccion es permanente y sobrevive al ataque
         cancelado ("That Personality NOW HAS an extra +6..."). */
      if(typeof eff.destroyBonus==='number')ndR.destroyBonus=(ndR.destroyBonus||0)+eff.destroyBonus;
      if(typeof eff.assassinationBonus==='number')ndR.assassinationBonus=(ndR.assassinationBonus||0)+eff.assassinationBonus;
      pend.cancelled={pid:pid,cardIdx:handIdx,name:S.players[pid].name,cardName:c.name};
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:pend.tUid});
      log(c.name+' protege a '+card(ndR.cardId).name+': +'+(eff.destroyBonus||0)+
          ' contra cualquier destruccion'+(eff.assassinationBonus?' y +'+eff.assassinationBonus+' contra Assassinations':''));
      log(c.name+' CANCELA el '+pend.cardName+' de '+S.players[pend.pid].name+': fallo automatico');
      lastResult={ok:false,cancelled:true,reason:'cancelado por '+c.name,plot:c.name,
                  target:card(ndR.cardId).name,roll:null,margin:null,destroyed:false,
                  notes:['Cancelado por '+c.name]};
      break;}
    default:{
      throw new Error('La carta "'+c.name+'" tiene una mecánica no implementada.');
    }
  }
  /* P1-012: una carta jugada SIEMPRE sale de la mano. Antes había
   * `if(consumed)pl.hand.splice(i,1); else pl.hand.splice(i,1);` — dos ramas
   * idénticas, así que la variable `consumed` era letra muerta y las cartas que
   * se exponen (la carta +10 en modo 'hold' y las cartas NWO) se quedaban a la
   * vez en la mano y en `exposedPlots`, con lo que el límite de Plots las
   * contaba dos veces. Las reglas dicen que una Plot expuesta se pone boca
   * arriba EN LA MESA y se queda ahí hasta que se juega, se descarta, se roba o
   * se vuelve a ocultar; y una carta NWO "remains on the table indefinitely".
   * En ambos casos la carta no debe seguir ocultada en la mano. */
  pl.hand.splice(i,1);
  /* P1-025 — la Plot USADA tiene que ir al descarte. Antes la carta salia de la
   * mano y se perdia para siempre: las reglas dicen que una Plot usada se
   * descarta (inwo_rules_extracted.txt:1100, glosario "Discard": "Discarded
   * cards are placed in the owner's discard pile, face-up"), y sin esto (a)
   * "Stealing the Plans" (374) no tendria nada que robar cuando la carta se USO,
   * y (b) la pila de Plot cards nunca se reponia por las cartas que la partida
   * realmente consume, solo por las que se descartan por limite de mano, +10 en
   * modo 'hold', NWO reemplazada o `E.discardCard`.
   *
   * DOS EXCEPCIONES, y las dos por el mismo motivo textual: "in play" significa
   * "dejada en la mesa marcando un efecto continuo"
   * (inwo_rules_extracted.txt:223, "In Play vs. Just Played": "A Plot is 'in
   * play' if it is left on the table to mark an ongoing effect, such as a New
   * World Order"), o sea que una carta "en juego" NO esta en el descarte.
   *   1) Plot DESCUBIERTA (boost10 en modo 'hold', NWO): sigue en
   *      `exposedPlots` hasta que se juegue, se robe o se vuelva a ocultar.
   *   2) Plot ENLAZADA ("Link this card to your chosen group"): las familias
   *      Power Increase / Resistance Increase dicen literalmente eso, y su
   *      unicidad esta redactada en esos mismos terminos ("No player may have
   *      more than one Charismatic Leader IN PLAY"), o sea que la carta tiene
   *      que seguir fuera de la pila mientras el grupo viva. Lo que persiste no
   *      es la carta, es el efecto (`linkedPlots` + el override del nodo).
   * La comprobacion es por identidad y no un flag, para que cualquier caso
   * futuro que exponga o enlace una carta quede excluido sin tocar este sitio. */
  var linkedHere=pl.linkedPlots.some(function(lp){return lp.cardId===handIdx;});
  if(pl.exposedPlots.indexOf(handIdx)<0&&!linkedHere)discardPlot(handIdx,pid);
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
  var iaB=illuAttackBonus(pid,'destroy',nd,tc);
  var idB=owner>=0?illuDefenseBonus(owner):0;
  /* P1-011 — misma regla oficial: un objetivo devastado defiende con la mitad de
     su Poder contra cualquier ataque de destrucción (inwo_rules_extracted.txt:
     683-685, "round down"). E.instantAttack ES un ataque de destrucción. */
  var defP=defenderPower(nd,true)+(Number(opts.extraDefense)||0)+idB;
  /* P1-016: E.instantAttack es un ataque a destruir generico, no un
     Assassination, asi que solo cuenta el bonus "contra cualquier destruccion"
     (Bodyguard +6, Talisman +2) y NO el +10 reservado al Assassination. */
  var pgG=destroyDefenseBonus(nd,false);
  if(pgG)defP+=pgG;
  var pos=(owner>=0)?positionBonus(owner,targetUid):0;
  var str=(Number(power)||0)+(Number(opts.extraPower)||0)+iaB-defP-pos;
  /* P1-024: mismo punto de corte que en los otros dos ataques: si hay una carta
     de rodadero utilizable, la destruccion se aplaza hasta que se responda. */
  var settleIA=function(roll,total,forcedFail,byCard){
    var r2={strength:total,target:tc.name,plot:'(ataque directo)'};
    if(iaB)r2.illuBonus=iaB;
    if(forcedFail){
      r2.ok=false;r2.roll=null;r2.margin=null;
      r2.reason='fallo automático (cancelado por '+byCard+')';
    }else if(roll==null||total<2){
      r2.ok=false;r2.reason='fallo automático';
    }else{
      r2.roll=roll;
      if(roll===11||roll===12){r2.ok=false;r2.reason='FALLO automático (11-12 siempre fallan)';}
      else if(roll<=total){r2.ok=true;r2.margin=total-roll;}
      else{r2.ok=false;r2.reason='fallo';}
    }
    if(r2.ok){destroyGroup(pid,targetUid);log('ATAQUE INSTANTÁNEO: '+tc.name+' destruido (margen '+r2.margin+')');}
    else log('Ataque instantáneo falló contra '+tc.name+' ('+r2.reason+')');
    S.lastResult=r2;
    var o2=publicState();
    o2.lastPlotResult=r2;
    return o2;
  };
  if(str<2)return settleIA(null,str,false,null);
  var r0=roll2d6();
  if(openRollWindow({klass:'destroy',label:'Ataque instantáneo de '+S.players[pid].name,
                     target:tc.name,pid:pid,roll:r0,total:str,
                     wasSuccess:(r0!==11&&r0!==12&&r0<=str),finish:settleIA})){
    var outP=publicState();
    outP.lastPlotResult={ok:null,pending:true,strength:str,target:tc.name,
                         plot:'(ataque directo)',roll:r0,
                         reason:'ventana de reacción abierta'};
    return outP;
  }
  return settleIA(r0,str,false,null);
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
  if(c.type==='plot')discardPlot(handIdx,pid);
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
    removeFromHand(pl,handIx);discardPlot(handIx,pid);
    log('Límite de mano: '+C.cards[handIx].name+' descartada (máx '+plotLimit+' Plots)');
    excess--;
  }
  while(excess>0&&pl.exposedPlots.length){
    var exposedIx=pl.exposedPlots.shift();
    discardPlot(exposedIx,pid);
    log('Límite de mano: '+C.cards[exposedIx].name+' descartada (máx '+plotLimit+' Plots)');
    excess--;
  }
  /* P1-010: "No player may have more than one Goal card in his hand" — 2 si
     Alternate Goals esta en mano. Se descarta el exceso antes de terminar el
     turno para que nunca exista un estado imposible al empezar el siguiente. */
  var gDropped=enforceGoalHandLimit(pl,'Límite de Goal cards: ');
  if(gDropped>0)log(pl.name+' tenía '+gDropped+' Goal cards de más al final de su turno');
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
    /* P1-011: ESTE recorrido es el que decide de verdad la victoria (basicWithDouble
       sólo lo usan las 2 cartas Goal que lo invocan). Estaba duplicando la regla a
       mano y por eso se le escapó el `devastated`: un grupo devastado seguía
       contando para la meta. Se usa countsForGoals() para que la regla viva en un
       solo sitio. */
    if(!countsForGoals(nd))return;
    var c=card(nd.cardId);count++;
    if(doubleQualifies(nd,c,g.double)&&Object.keys(doubles).length<3&&!doubles[c.id]){
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
