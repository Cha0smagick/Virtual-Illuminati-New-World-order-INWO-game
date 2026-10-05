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
/* P1-077 - buscador de Resources. Los Resources se guardan en `pl.resources`, un array
 * plano de entradas {uid:'r'+n, cardId, linkedTo, tokens, [drawHook], [stash]}, y NO en
 * el arbol de grupos, asi que findNode()/findOwnerPid() no los ven. Devuelve
 * {pid, entry} o null. Se recorre en el orden de los jugadores para que, si el mismo
 * uid se pidiera en dos mesas, gane la primera: los uid salen de un contador global
 * (S.uidCounter), asi que la colision no deberia ocurrir, pero el comportamiento queda
 * determinado en vez de depender del azar. NO se mete pl.resources dentro de findNode:
 * los nodos de grupo tienen `children`, `tokens` propio de grupo y se consumen en
 * spendGroupToken(), nodeAligns() y noTokensFlag(); una entrada de Resource no cumple
 * esa forma y romperia a todos esos consumidores a la vez. */
function findResourceEntry(uid){
  if(uid==null)return null;
  for(var p=0;p<S.players.length;p++){
    var rs=S.players[p].resources;
    for(var i=0;i<rs.length;i++){ if(rs[i].uid===uid) return {pid:p,entry:rs[i]}; }
  }
  return null;
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
/* L18 - flechas de control salientes LIBRES de un grupo: las que le quedan
 * para controlar a otro grupo. P1-023 ya define la capacidad con maxChildren y
 * isOpenArrow; aqui solo se le da un nombre y se expone el registro de flechas
 * EXTRA que otorgan 298 y 299. El registro es POR JUEGO (S.l18extra, inicializado
 * junto a S.alignRetro) y va indexado por uid, el mismo molde que P1-011: asi
 * mover un grupo (E.moveGroup, E.organize) no pierde sus flechas extra y ningun
 * otro consumidor del motor tiene que enterarse de que existen. */
function extraArrowsOf(node){
  if(!node||!S||!S.l18extra)return 0;
  var v=S.l18extra[node.uid];
  return (typeof v==='number'&&v>0)?v:0;
}
/* {used, cap, free}: free es la magnitud que leen 298 y 299 ("outgoing control
 * arrows" del impreso). Se exporta como E.arrowCount para que la regresion afirme
 * el CONTADOR y no una linea de log. */
function outArrowsOf(node){
  var used=node.children.length, cap=maxChildren(node);
  return {used:used,cap:cap,free:cap-used,extra:extraArrowsOf(node),base:(isStructureRoot(node)?4:3)};
}
/* El "master" de un grupo segun el impreso ("that group or its master") es su
 * PADRE en el arbol de la Power Structure, y si cuelga directamente de la raiz
 * ese padre es la raiz, o sea el Illuminati. findNodeThatHas ya devuelve eso. */
function masterNodeOf(node){
  return findNodeThatHas(S.players[findOwnerPid(node.uid)].structure,node.uid);
}
/* ---------------------------------------------------------------- L21 -------
 * REGLA DE LAS CARTAS NEW WORLD ORDER. La clave de color es el campo `nwoColor`
 * que L16.b anadio al generador (14 cartas: 5 blue, 5 red, 4 yellow).
 *   - "Only one NWO card of each color can be in play" -> S.nwoInForce[color].
 *   - "the earlier one is discarded" -> se deshace su efecto y su carta sale.
 *   - "there can never be more than three NWO cards in effect at once" -> son
 *     tres colores, luego se cumple por construccion si el registro tiene 3.
 * Los modificadores permanentes se localizan por la etiqueta del nombre: */
function modFromCard21(mod, cardName){
  if(!mod||typeof mod.name!=='string'||!cardName)return false;
  /* coincidencia EXACTA o "Nombre (+N)": el nombre pelado lo usa 4540
   * ('Dictatorship') y ninguna NWO se llama asi, pero anteponer el prefijo
   * "Nombre (" evita que una carta captura otra que empiece por su nombre. */
  return mod.name===cardName||mod.name.indexOf(cardName+' (')===0;
}
function undoNwoOfColor21(color, prevRule21){
  if(!S||!S.nwoInForce)return null;
  var prev=S.nwoInForce[color];
  if(!prev)return null;
  var undone={card:prev.name,color:color,powerMods:0,resistanceMods:0,becomes:0,noTokens:0,alignRule:false,discarded:false};
  var prevCard=C.cards[prev.id]||null;
  var prevKind=(prevCard&&prevCard.effect)?prevCard.effect.kind:'';
  for(var qi=0;qi<S.players.length;qi++){
    var qRoot=S.players[qi].structure;
    walk(qRoot,function(n){
      if(n===qRoot)return; /* la raiz es el Illuminati, no es "un grupo" */
      if(Array.isArray(n.powerMods)){
        var b=n.powerMods.length;
        n.powerMods=n.powerMods.filter(function(m){return !modFromCard21(m,prev.name);});
        undone.powerMods+=b-n.powerMods.length;
      }
      if(Array.isArray(n.resistanceMods)){
        var b2=n.resistanceMods.length;
        n.resistanceMods=n.resistanceMods.filter(function(m){return !modFromCard21(m,prev.name);});
        undone.resistanceMods+=b2-n.resistanceMods.length;
      }
    });
  }
  /* La clausula `become` (339 / Political Correctness) ANADE la alineacion a
   * `alignsAdded` como texto pelado, SIN etiqueta de carta, asi que no se puede
   * filtrar por nombre. Por eso `applyBulkPower` registra que nodos toco cada
   * `become` de una carta NWO (ver el parche de abajo). */
  var bl=S.nwoBecome&&S.nwoBecome[prev.name];
  if(Array.isArray(bl))for(var k=0;k<bl.length;k++){
    var n2=findNode(bl[k].uid);
    if(n2&&Array.isArray(n2.alignsAdded)){
      var ix=n2.alignsAdded.indexOf(bl[k].align);
      if(ix>=0){n2.alignsAdded.splice(ix,1);undone.becomes++;}
    }
  }
  /* `noTokens` lo escribe UN solo sitio del motor (World Hunger, engine.js:4809),
   * asi que revertirlo no pisa el flag que otra carta hubiera puesto. */
  if(prevKind==='token_wither'){
    for(var wq=0;wq<S.players.length;wq++){
      var wRoot=S.players[wq].structure;
      walk(wRoot,function(n){
        if(n===wRoot)return;
        if(n.noTokens){n.noTokens=false;undone.noTokens++;}
      });
    }
  }
  if(S.alignRule&&prevRule21&&S.alignRule===prevRule21){
    delete S.alignRule;
    undone.alignRule=true;
  }
  /* "the earlier one is discarded": 255 Fear and Loathing es la unica NWO que se
   * deja expuesta en la mesa (engine.js:5114), asi que su carta se retira de
   * `exposedPlots` y va al descarte. `discardPlot` ademas abre la ventana de
   * suceso de 388 Stealing the Plans (P1-131): efecto colateral declarado. */
  if(prev.pid!=null&&prev.pid>=0&&prev.pid<S.players.length){
    var plPrev=S.players[prev.pid];
    var ex=plPrev.exposedPlots.indexOf(prev.id);
    if(ex>=0){plPrev.exposedPlots.splice(ex,1);discardPlot(prev.id,prev.pid);undone.discarded=true;}
  }
  delete S.nwoInForce[color];
  if(S.nwoBecome)delete S.nwoBecome[prev.name];
  return undone;
}
/* -------------------------------------------------------------------------- */

/* =================================================================== *
 * L22 — VENTANA DE NEGACION DE UN PLOT INMEDIATAMENTE ANTERIOR.
 * =================================================================== *
 * IMPRESO (Hoax y Secrets Man Was Not Meant to Know):
 *   "This card may be played immediately after any other Plot card is played,
 *    for any purpose. That card has no effect. Both cards are discarded."
 * IMPRESO (Computer Security):
 *   "This card completely negates any Plot card that concerns Computers or is
 *    used on a Computer group. It may be played at any time, as long as it used
 *    immediately after the other card is played."
 *
 * HALLAZGO DEL AUDIT: el motor NO tenia ningun registro del ultimo Plot jugado.
 * `lastPlot` solo aparecia como `out.lastPlotResult=`, que es el VALOR DE
 * RETORNO de E.playPlot, no estado; `pendingPlot` no existia. Sin registro no
 * hay forma de responder "inmediatamente despues de", luego L22 anade el
 * subsistema completo en S.pendingNegation.
 *
 * DISENO (por que la ventana se abre ANTES del switch de efectos):
 *   El Plot se ANUNCIA pero su efecto y su coste NO se aplican: se guarda el
 *   pedido en S.pendingNegation y E.playPlot retorna pronto. La carta SE QUEDA
 *   EN LA MANO (P1-126: una carta jugada sale de la mano exactamente UNA vez;
 *   aqui todavia no se ha jugado, luego la cola no debe tocarla, y el re-ingreso
 *   por E.playPlot no revienta con "Carta no esta en tu mano").
 *   - resolucion "pass": se re-invoca E.playPlot con noNegWindow -> el efecto y
 *     el coste se aplican entonces, y la carta sale de la mano por la cola P1-012.
 *   - resolucion "negate": el respondiente paga su coste, AMBAS cartas se
 *     descartan ("Both cards are discarded") y la Plot anulada no ha aplicado
 *     nada ("That card has no effect").
 *
 * POR QUE ES SEGURO PARA LAS SUITES EXISTENTES: si NADIE tiene en la mano una
 * carta de negacion aplicable NO se abre ventana y el Plot se aplica al
 * instante — el mismo criterio que openEventWindow (engine.js:3016), que solo
 * abre si P.responders.length. Con las 2 kinds nuevas solo las 3 cartas de L22
 * pueden responder, luego el comportamiento por defecto no cambia.
 *
 * POR QUE EL RESPONDIENTE JUEGA SU CARTA CON E.resolvePendingNegation Y NO CON
 * E.playPlot: para que la Plot anulada siga en la mano del actor, el respondiente
 * NO debe pasar por E.playPlot (re-entraria en la ventana y, sobre todo, la cola
 * P1-012 lo haria mal). Es la misma razon por la que las ventanas existentes se
 * resuelven con su propia API (E.resolvePendingEvent, E.resolvePendingRoll, ...).
 *
 * AMBITO DEL COSTE: el coste lo paga SIEMPRE el respondiente (quien juega la
 * carta de negacion), nunca el actor de la Plot anulada — el impreso de Hoax dice
 * "You must ALSO discard your OWN top undrawn Plot card", o sea el descarte es
 * del jugador de Hoax.
 */
function isNegationKind(eff){
  return !!(eff&&(eff.kind==='plot_negate_prev'||eff.kind==='plot_negate_computer'));
}
/* DECLARACION DE INTERPRETACION (ya escrita en gen_cards.js, L22_FX): el
 * impreso de Computer Security es "any Plot card that concerns Computers or is
 * used on a Computer group". El reglamento no precisa mas, asi que se aceptan
 * las TRES lecturas y se declaran: (a) la Plot cuyo efecto exige o paga el
 * atributo computer, (b) la Plot cuyo texto impreso menciona "computer", (c) la
 * Plot cuyo objetivo declarado es un Computer group. */
function plotIsComputerPlot(c){
  if(!c)return false;
  var e=c.effect||{};
  if(e.payAttr==='computer')return true;
  if(e.requireAttr==='computer')return true;
  if(e.requireActionFromAttr==='computer')return true;
  if(Array.isArray(e.payAttrAny)&&e.payAttrAny.indexOf('computer')>=0)return true;
  if(Array.isArray(e.requireAttrAny)&&e.requireAttrAny.indexOf('computer')>=0)return true;
  if(Array.isArray(e.targetAttr)&&e.targetAttr.indexOf('computer')>=0)return true;
  if(/computer/i.test(String(c.text||'')))return true;
  return false;
}
/* COSTE "EN SECO" (precedente Embezzlement, engine.js:2964-2966): se comprueba
 * aqui para que la UI pueda razonar y la ventana siga ABIERTA para otro
 * jugador; se PAGA en payNegationCost, nunca antes. */
function negationCostWays(rpid,eff){
  var pl=S.players[rpid];
  var ways=[];
  if(!pl)return {ok:false,why:'ese jugador no existe',ways:ways};
  if(eff.costMode==='power6'){
    var need=eff.payMinPower||6,got=0;
    walk(pl.structure,function(n){
      if(need<=got)return;
      if(n===pl.structure)return;
      if(!n.tokens||n.tokens<1)return;
      if(noTokensFlag(n))return;
      var cc=card(n.cardId);
      if(!cc||cc.type!=='group')return;
      got+=curPower(n);
    });
    if(got>=(eff.payMinPower||6)&&(S.plotDeck.length>=(eff.topDiscard&&!eff.altCost?eff.topDiscard:0)))ways.push({via:'power',need:eff.payMinPower||6,got:got});
  }else if(eff.costMode==='illumAllOrDiscard2'){
    if(pl.illumTokens>=1)ways.push({via:'illumAll'});
    var nTop=eff.topDiscard||2;
    if(S.plotDeck.length>=nTop)ways.push({via:'topDiscard',n:nTop});
  }else if(eff.costMode==='groupOrIllum'){
    var nd=firstUsableAid(rpid,function(cc,nn){return hasAttr(cc,eff.payAttr,nn);});
    if(nd)ways.push({via:'grupo',uid:nd.uid,name:card(nd.cardId).name});
    var mc=illuCard(rpid);
    if(mc&&mc.effect&&mc.effect.code===eff.illumCode&&pl.illumTokens>=1)
      ways.push({via:'illuminati',name:mc.name});
  }else return {ok:false,why:'la carta no declara un coste (eff.costMode)',ways:ways};
  if(!ways.length){
    var why22;
    if(eff.costMode==='power6')why22='"action(s) by group(s) with a total power of at least '+(eff.payMinPower||6)+'" — tus grupos con ficha solo aportan Poder '+got;
    else if(eff.costMode==='illumAllOrDiscard2')why22='"spend all Action tokens on your Illuminati (minimum of 1!), or discard your top two undrawn Plot cards" — ni tienes ficha de accion en tu Illuminati ni te quedan '+nTop+' Plot en el mazo';
    else why22='"costs an action from the Network or any Computer group" — no tienes el Illuminati correcto ni un grupo Computer con ficha';
    return {ok:false,why:why22,ways:ways};
  }
  return {ok:true,ways:ways};
}
function payNegationCost(rpid,eff,via){
  var pl=S.players[rpid];
  var out={via:via.via};
  /* P1-144: Hoax imprime "You must ALSO discard your own top undrawn Plot card".
     Ese descarte NO es una via de coste (no trae eff.altCost), luego es
     OBLIGATORIO y se paga con CUALQUIER via. Secrets Man si trae altCost y su
     descarte lo paga el bloque de abajo, que es su via alternativa. La
     distincion sale del DATO, no del nombre de la carta. */
  if(eff.topDiscard&&!eff.altCost){
    var nxA=topOfDeck(S.plotDeck,eff.topDiscard);
    if(nxA.length<eff.topDiscard)
      throw new Error('"You must also discard your own top undrawn Plot card" — solo te quedan '+nxA.length+' Plot en el mazo');
    for(var mA=0;mA<nxA.length;mA++)S.plotDiscard.push(nxA[mA]);
    out.extraTop=nxA.length;
  }
  if(via.via==='power'){
    var need=eff.payMinPower||6,used=[];
    walk(pl.structure,function(n){
      if(need<=0)return;
      if(n===pl.structure)return;
      if(!n.tokens||n.tokens<1)return;
      if(noTokensFlag(n))return;
      var cc=card(n.cardId);
      if(!cc||cc.type!=='group')return;
      need-=curPower(n);
      used.push(cc.name);
    });
    /* el gasto va DESPUES de recorrer: si algo lanzara, no se ha pagado nada
       (P1-033, el mismo criterio que case 'token_strip' de L4). */
    var gots=used.length;
    for(var i22=0;i22<gots;i22++){/* se re-resuelve con el mismo filtro, en orden */}
    var need2=eff.payMinPower||6;
    var uids=[];
    walk(pl.structure,function(n){
      if(need2<=0)return;
      if(n===pl.structure)return;
      if(!n.tokens||n.tokens<1)return;
      if(noTokensFlag(n))return;
      var cc=card(n.cardId);
      if(!cc||cc.type!=='group')return;
      need2-=curPower(n);
      uids.push(n.uid);
    });
    uids.forEach(function(u){spendGroupToken(rpid,u);});
    out.groups=used;
    return out;
  }
  if(via.via==='illumAll'){
    if(pl.illumTokens<1)throw new Error('ya no tienes fichas de accion en tu Illuminati');
    pl.illumTokens=0;   /* "all Action tokens currently on your Illuminati" */
    return out;
  }
  if(via.via==='topDiscard'){
    var n=via.n||2;
    var ixs=topOfDeck(S.plotDeck,n);
    if(ixs.length<n)throw new Error('no te quedan '+n+' Plot cards en el mazo para descartar');
    /* "without looking at them": van DIRECTAS a S.plotDiscard, sin discardPlot,
       porque discardPlot imprimiria sus nombres y abriria una ventana de suceso
       que el impreso aqui no pide. */
    for(var j22=0;j22<ixs.length;j22++)S.plotDiscard.push(ixs[j22]);
    out.discarded=ixs.length;
    return out;
  }
  if(via.via==='grupo'){
    spendGroupToken(rpid,via.uid);
    out.group=via.name;
    return out;
  }
  if(via.via==='illuminati'){
    if(pl.illumTokens<1)throw new Error('ya no tienes fichas de accion en tu Illuminati');
    pl.illumTokens--;
    out.illuminati=via.name;
    return out;
  }
  throw new Error('via de coste desconocida: '+via.via);
}
function negationAllowed(eff,pid,P){
  if(!isNegationKind(eff))return {ok:false,why:'no es una carta que pueda anular otra Plot'};
  if(pid===P.pid)return {ok:false,why:'la Plot que intentas anular la jugaste tu'};
  if(eff.kind==='plot_negate_computer'&&!plotIsComputerPlot(card(P.handIdx)))
    return {ok:false,why:'"any Plot card that concerns Computers or is used on a Computer group" — esa Plot no concierne a los Computers'};
  var w=negationCostWays(pid,eff);
  if(!w.ok)return {ok:false,why:w.why};
  return {ok:true,via:w.ways[0],ways:w.ways};
}
function negationWayLabel(eff,w){
  if(w.via==='power')return 'acciones de grupos con Poder total '+w.got+' (exige '+(w.need||6)+')';
  if(w.via==='illumAll')return 'todas las fichas de accion de tu Illuminati';
  if(w.via==='topDiscard')return 'descartar '+w.n+' Plot de la cima de tu mazo';
  if(w.via==='grupo')return 'accion de '+w.name;
  if(w.via==='illuminati')return 'accion de '+w.name;
  return w.via;
}
function isStructureRoot(node){
  if(!S||!S.players)return false;
  for(var i=0;i<S.players.length;i++)if(S.players[i].structure===node)return true;
  return false;
}
function maxChildren(node){return (isStructureRoot(node)?4:3)+extraArrowsOf(node);}
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
  /* L3b — 234 Currency Speculation: "The Power ... of any one of your Bank
     groups is tripled for its next action or defense". El x3 va al NODO y se
     borra al gastar la ficha del grupo (su accion) o al defenderse de verdad.
     `stat` distingue si el triple es de Poder o de Resistencia; aqui solo
     aplica cuando es de Poder, y nodeResistance() hace el otro caso. */
  if(node.tripled&&node.tripled.stat==='power')p*=3;
  /* L3b — 377 Sucked Dry and Cast Aside!: "by 4 for one action only". El dato
     queda en el nodo aunque la carta este BLOQUEADA (ver gen_cards.js L3B):
     el motor lo soporta para que la mecanic este lista cuando la cola de
     destruccion diferida exista, y para que el valor sea observable. */
  if(node.burstMul&&typeof node.burstMul.mul==='number')p*=node.burstMul.mul;
  /* L5c — 189 Albino Alligators: "+10 Power or Resistance (your choice) to any
     Weird group you control. If used with an action ... counts only for that
     action. If used for defense, the bonus lasts until the end of the current
     turn". El delta va al NODO (interpretacion 1 de gen_cards.js). En modo
     ACCION suma aqui; en modo DEFENSA lo suma computeStrength, porque defenderse
     con Poder no es atacar con Poder. nodeResistance() cubre los dos modos. */
  var tb=(node&&node.timedBoost)?node.timedBoost:null;
  if(tb&&typeof tb.v==='number'&&tb.stat==='power'&&tb.mode==='action')p+=tb.v;
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
/* P1-067 (L10) — `globalNeutral` es el MISMO tipo de regla, y por eso va AQUI y no
   en cada recorrido. 280 Hidden Influence y 310 Media Connections dicen "now has
   Global Power equal to its regular Power": es decir, el grupo DEJA de tener
   Global Power, y Global Power es exactamente "lo que aporta a las metas". Por eso
   se implementa como un termino mas de este unico gate, y no como un parche en los
   7 consumidores (countControlled, sumPeacefulPower, el goal de Criminal Overlords,
   alignsCovered, sumTotalPower, el recuento de iglesias de messiah y E.goalStatus):
   todos pasan por aqui, luego un termino los cubre a todos y no puede quedar uno
   olvidado. El flag lo escriben las cartas de L10 con kind 'link_effect'. */
function countsForGoals(nd){
  return nd.cardId!=null&&!nd.paralyzed&&!nd.devastated&&!nd.globalNeutral;
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
  /* L3b — 355 Resistance is Useless!: "the target groups Resistance is 0".
     Se comprueba ANTES que `resistanceOverride`, porque ese campo es un valor
     ABSOLUTO (Ango pincha la Resistencia en 1) y "su Resistencia es 0" tiene
     que ganar a un pin: si no, un grupo con Ango seria inmune a esta carta. */
  if(node&&node.resNullify)return 0;
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
  /* L3b — la otra mitad de 234: el triple puede ser de Resistencia. */
  if(node&&node.tripled&&node.tripled.stat==='resistance')r*=3;
  /* L5c — 189 Albino Alligators, rama de RESISTENCIA. Aqui NO se distingue el
     modo: atacar nunca usa la Resistencia, asi que sumarla siempre es correcto
     (interpretacion 2: el modo lo decide el contexto, no el jugador). */
  if(node&&node.timedBoost&&node.timedBoost.stat==='resistance'&&typeof node.timedBoost.v==='number')r+=node.timedBoost.v;
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
  /* L9 / 332 — Orbital Mind Control Lasers: el cambio "dura solo lo que resta
   * del turno del jugador actual". Las ediciones PERMANENTES viven en
   * alignsAdded/alignsRemoved; las TEMPORALES en alignsTmpAdded/alignsTmpRemoved
   * con un SELLO de turno (alignsTmpTurn). Se leen solo mientras el sello coincide
   * con S.turn, asi que caducan solas al empezar el turno siguiente y NO hace
   * falta barrer nada en E.endTurn: la caducidad es una consecuencia de la
   * comparacion, no un estado que haya que limpiar. Se aplican DESPUES de la
   * capa permanente para que un temporal pueda pisar a un permanente, y con la
   * misma regla "la suma gana a la resta" (L317) para que una re-alineacion
   * posterior en el mismo turno no quede anulada por una resta anterior. */
  if(S&&node&&node.alignsTmpTurn===S.turn){
    var tAdd=Array.isArray(node.alignsTmpAdded)?node.alignsTmpAdded:null;
    var tRem=Array.isArray(node.alignsTmpRemoved)?node.alignsTmpRemoved:null;
    if(tAdd)for(var t=0;t<tAdd.length;t++){
      var ta=String(tAdd[t]).toLowerCase();
      if(base.indexOf(ta)<0)base.push(ta);
    }
    if(tRem&&tRem.length){
      var tKept=[];
      for(var m=0;m<base.length;m++){
        if(tRem.indexOf(base[m])>=0&&(tAdd||[]).indexOf(base[m])<0)continue;
        tKept.push(base[m]);
      }
      base=tKept;
    }
  }
  /* L9 / 357 — Rewriting History: "Any one alignment of any DESTROYED group may
   * be retroactively added, removed, or reversed." Un grupo destruido NO tiene
   * nodo, asi que el overlay no puede vivir en el nodo como el de 332: vive a
   * nivel de CARTA en S.alignRetro ({cardId:{added:[],removed:[]}}). Se consulta
   * aqui como ultima capa para que affected a CUALQUIER nodo con ese cardId —
   * incluida una copia re-desplegada de la misma carta, que es justo lo que
   * "retroactively" implica. Se aplica DESPUES de la temporal porque es una
   * verdad permanente del mundo y no debecaducar con el turno; y con la misma
   * regla "la suma gana a la resta" que las otras capas. Los consumidores de
   * nodeAligns (bonificacion +/-4, shares, isOpposite, token_gift) reciben este
   * cambio sin ningun cableado extra. */
  if(S&&S.alignRetro&&node){
    var rt=S.alignRetro[node.cardId];
    if(rt){
      if(Array.isArray(rt.removed)&&rt.removed.length){
        var rKept=[];
        for(var r=0;r<base.length;r++){
          if(rt.removed.indexOf(base[r])>=0&&(rt.added||[]).indexOf(base[r])<0)continue;
          rKept.push(base[r]);
        }
        base=rKept;
      }
      if(Array.isArray(rt.added)){
        for(var r2=0;r2<rt.added.length;r2++){
          var ra=String(rt.added[r2]).toLowerCase();
          if(base.indexOf(ra)<0)base.push(ra);
        }
      }
    }
  }
  return base;
}
/* L9 / 357 — lector de overlays retroactivos para cartas SIN nodo. Un grupo
 * destruido no tiene nodo, asi que nodeAligns no puede responder por el, pero el
 * contador de metas (E.checkVictory / metas de "destruye N grupos de una
 * alineacion") SI necesita conocer la alineacion retroactiva de una carta
 * destruida. Esta funcion es la unica fuente de ese dato. */
function retroAlignsOf(cardId){
  var c=card(cardId);
  var base=alignsOf(c).slice();
  var rt=(S&&S.alignRetro&&S.alignRetro[cardId])||null;
  if(!rt)return base;
  if(Array.isArray(rt.removed)&&rt.removed.length){
    var kept=[];
    for(var k=0;k<base.length;k++){
      if(rt.removed.indexOf(base[k])>=0&&(rt.added||[]).indexOf(base[k])<0)continue;
      kept.push(base[k]);
    }
    base=kept;
  }
  if(Array.isArray(rt.added)){
    for(var i=0;i<rt.added.length;i++){
      var a=String(rt.added[i]).toLowerCase();
      if(base.indexOf(a)<0)base.push(a);
    }
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
  /* P1-127 (L16 / 253 Exposed!): `attrsRemoved` es el ESPEJO de `attrsAdded`.
   * El impreso dice "that group permanently loses its Secret status", o sea que la
   * perdida es del GRUPO, no de la carta: mientras la carta exista, el grupo ya no
   * la tiene. Se filtra aqui (y no solo en hasAttr) para que los 3 consumidores de
   * nodeAttrs lo vean igual: engine.js:1119, 3360 y 3400. Misma regla que el
   * filtro `rt.removed` de nodeAligns: "la suma gana a la resta", de modo que si un
   * atributo esta en attrsAdded y en attrsRemoved, manda attrsAdded. El nodo NO
   * trae el campo inicializado (mismo motivo que P1-068 con attrsAdded), asi que se
   * lee con la guarda Array.isArray. */
  var rem=(node&&Array.isArray(node.attrsRemoved))?node.attrsRemoved:null;
  if(rem&&rem.length){
    var kept=[];
    for(var k=0;k<base.length;k++){
      var bk=String(base[k]).toLowerCase(),drop=false;
      for(var r=0;r<rem.length;r++){
        if(String(rem[r]).toLowerCase()!==bk)continue;
        if(add&&add.some(function(x){return String(x).toLowerCase()===bk;}))continue;
        drop=true;break;
      }
      if(!drop)kept.push(base[k]);
    }
    base=kept;
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
    neutralArea:[],attack:null,pendingAttack:null,pendingRoll:null,pendingEvent:null,pendingPeek:null,pendingDraw:null,pendingTurnStart:null,pendingAlignEdit:null,pendingResDestroy:null,pendingNegation:null,returnTurnTo:null,alignRetro:{},l18extra:{},alignRule:null,log:[],uidCounter:100,winner:null,
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
      /* L11: assassinatedBy es el registro PARALELO de destroyedByMe. destroyedByMe
         guarda SOLO el cardId (L2694) y NO dice COMO se destruyo la carta; 220 Clone
         y 287 Imposter exigen "una Personality que haya sido ASESINADA", no merely
         "destruida". Cambiar la forma de destroyedByMe rompere sus 3 consumidores
         (745 destroy_reduce, 981, 5580-5581) y el overlay retroactivo de 357 (5196),
         asi que se anade un array paralelo en vez de tocar el que ya existe.
         L11: no cambiar la forma de destroyedByMe; assassinados van aparte. */
      resources:[],exposedPlots:[],discards:[],destroyedByMe:[],destroyedIlluminati:[],assassinatedBy:[],
      /* P1-013: los Plots linkeados a un grupo se quedan en la mesa
         indefinidamente (OFFICIAL_RULES_FINDINGS §8: "Linked Plots ... remain
         on the table indefinitely"), a diferencia de un Plot exposure normal.
         Aqui se guarda {uid,cardId,linkedTo} para que el cambio siga visible y
         para poder deshacer el efecto si el grupo linkeado sale de la mesa. */
      linkedPlots:[],
      turnsCompleted:0,immuneFrom:{},pickedSecrets:[],revealedBy:[],
      flags:{autoTakeover:false,autoTakeoverBlocked:false,privilegedUsed:0}
    });
  }
  log('Nueva partida creada ('+S.players.length+' jugadores, meta básica '+S.config.goalCount+' grupos)');
  return clone(publicState());
};

/* ===================== L7 - INTRUSIÓN EN PLOTS OCULTOS =====================
 *
 * 303 Logic Bomb, 322 Mutual Betrayal, 386 The Auditor from Hell y 242
 * Double-Cross: cuatro cartas que giran alrededor de LO QUE HAY EN LA MANO DE
 * UN RIVAL. No son una quinta ventana de dados ni una sexta de sucesos: lo que
 * las distingue es que aquí "mirar" NO ES UN EFECTO, es una DECISIÓN.
 *
 * DECLARACIÓN 2 (la importante): al jugar la carta NO se aplica nada. Se abre
 * la ventana con la LISTA de Plot ocultas del rival y el efecto se aplica al
 * CERRAR, con lo que el jugador haya elegido. Es el mismo contrato de dos pasos
 * que las otras tres ventanas (§33 pendingAttack, §37 pendingRoll, §38
 * pendingEvent): jugar la carta de reacción NO cierra la ventana, el cierre es
 * un paso aparte. El motivo es que en el juego físico el jugador recibe las
 * cartas y las mira, y esa decisión no se puede automatizar; en esta versión web
 * el equivalente funcional es recibir la lista por índice y elegir.
 *
 * DECLARACIÓN 4 - "you must expose that card" (303): "expose" tiene dos
 * sentidos en el juego físico (dejar la carta boca arriba en la mesa / avisar al
 * rival de que la has cogido). Aquí sólo cabe el segundo: una carta no puede
 * estar a la vez en la mano del que roba y boca arriba sobre la mesa, y para el
 * primer sentido ya existe `pl.exposedPlots` (P1-025 saca del descarte las Plot
 * que se dejan sobre la mesa). El motor no inventa un estado imposible: la carta
 * robada va a la mano y la exposición se registra en `pl.revealedBy`, que es
 * información que ya no se puede deshacer y por tanto no es secreta.
 *
 * DECLARACIÓN 6 - 242 dice "Your opponent loses the card which let him spy on
 * you, and actions that powered it". Las dos mitades ya son ciertas sin hacer
 * nada: la ficha se cobra al jugar la carta espía (P1-022) y la carta espía va
 * sola a `S.plotDiscard` (P1-025). Lo único que faltaba -y lo único que esta
 * ventana implementa- es que NO pueda ver nada. */
var PEEK_KINDS=['peek_steal','peek_expose','peek_rob','peek_block'];

/* Una Plot OCULTA es una carta de tipo plot que está en la mano del rival y que
 * no está ya en su `exposedPlots` (es decir, no se ha dejado boca arriba). Esta
 * función es la ÚNICA definición del término en todo el motor: si otra familia
 * necesita "oculta", llama aquí y no reimplementa el filtro. */
function hiddenPlotsOf(pid){
  var pl=S.players[pid];
  if(!pl)return [];
  var out=[];
  for(var i=0;i<pl.hand.length;i++){
    if(pl.exposedPlots.indexOf(pl.hand[i])>=0)continue;
    var cc=C.cards[pl.hand[i]];
    if(cc&&cc.type==='plot')out.push(pl.hand[i]);
  }
  return out;
}

/* El rival se elige con `opts.rivalPid`; si no viene, se toma el primero que
 * tenga al menos una Plot oculta. Es la MISMA técnica que `alignFromTarget` de
 * 268 y que el arreglo de P1-034a para 278 Hex: se elige un objetivo que el
 * jugador puede ver, no un selector de rival nuevo que la UI todavía no tiene. */
function firstRivalWithHidden(pid){
  for(var q=0;q<S.players.length;q++){
    if(q===pid)continue;
    if(hiddenPlotsOf(q).length)return q;
  }
  return -1;
}

function openPeekWindow(rd){
  var P={kind:rd.kind,label:rd.label,byPid:rd.byPid,
    data:{byName:S.players[rd.byPid].name,rivalPid:rd.rivalPid,
          cards:hiddenPlotsOf(rd.rivalPid).slice()},
    cancelledBy:null,responders:[]};
  /* Sólo responde 242 (peek_block) y sólo el dueño de las Plot espiadas: es el
     que el texto llama "your hidden Plot cards". Se recorre TODAS las manos,
     igual que las otras ventanas, para que la ventana pueda seguir abierta. */
  for(var q=0;q<S.players.length;q++){
    if(q!==rd.rivalPid)continue;
    var h=S.players[q].hand;
    for(var i=0;i<h.length;i++){
      var k=(C.cards[h[i]]||{}).effect;
      if(k&&k.kind==='peek_block'){
        P.responders.push({pid:q,name:S.players[q].name,cardIdx:h[i],cardName:C.cards[h[i]].name});
        break;
      }
    }
  }
  S.pendingPeek=P;
  log('VENTANA DE ESPIONAJE ABIERTA: '+P.label);
  return true;
}

/* Cierra la ventana y aplica la decisión. `act` es lo que elige el jugador:
 *   {steal:<indice>}       303 y 386, "choose one to take for yourself"
 *   {exposeAll:true}       386, "or expose them all!"
 *   {exposeEqual:<n>}      322, "expose any or all of them, as long as you also
 *                          expose an equal number of your own Plots"
 *   null / {}              no hacer nada: el texto dice "you MAY", y el motor no
 *                          puede obligar a decidir (DECLARACIÓN 5).
 * La verdad de lo que se ha gastado y de la carta que se ha perdido es
 * responsabilidad de quien la jugó (P1-022 / P1-025); aquí sólo se resuelve la
 * decisión. */
function closePendingPeek(act){
  var P=S.pendingPeek;
  if(!P)return null;
  S.pendingPeek=null;
  var d=P.data,res=null,me=S.players[P.byPid],them=S.players[d.rivalPid];
  if(P.cancelledBy){
    log('DOUBLE-CROSS: '+P.cancelledBy.cardName+' de '+P.cancelledBy.name+
        ' anula a '+me.name+': no ve ninguna de las Plot de '+them.name);
    res={ok:false,cancelled:true,reason:'anulado por '+P.cancelledBy.cardName,by:me.name};
  }else if(act&&act.exposeAll){
    var nAll=0;
    for(var i=0;i<d.cards.length;i++){
      var ixA=d.cards[i];
      var aA=them.hand.indexOf(ixA);
      if(aA>=0)them.hand.splice(aA,1);
      me.exposedPlots.push(ixA);
      them.revealedBy.push(ixA);
      nAll++;
    }
    log(me.name+' expone las '+nAll+' Plot ocultas de '+them.name);
    res={ok:true,exposed:nAll,of:them.name};
  }else if(act&&act.exposeEqual!=null){
    /* DECLARACIÓN 5: se acota el número pedido al máximo que el texto permite,
       que es `min(ocultas del rival, Plot propias sin exponer)`, y se admite el
       cero porque el texto dice "you MAY". */
    var mineLeft=0,jK=0;
    for(jK=0;jK<me.hand.length;jK++){
      if(C.cards[me.hand[jK]]&&C.cards[me.hand[jK]].type==='plot'&&
         me.exposedPlots.indexOf(me.hand[jK])<0)mineLeft++;
    }
    var want=Math.max(0,Math.min(Math.floor(act.exposeEqual),d.cards.length,mineLeft));
    var mine=0,took=0;
    for(var j=0;j<me.hand.length&&mine<want;j++){
      var mx=me.hand[j];
      var mc=C.cards[mx];
      if(mc&&mc.type==='plot'&&me.exposedPlots.indexOf(mx)<0){
        me.exposedPlots.push(mx);
        me.revealedBy.push(mx);
        mine++;
      }
    }
    for(var k=0;k<d.cards.length&&took<mine;k++){
      var tx=d.cards[k];
      var b=them.hand.indexOf(tx);
      if(b>=0)them.hand.splice(b,1);
      me.exposedPlots.push(tx);
      them.revealedBy.push(tx);
      took++;
    }
    log(me.name+' expone '+took+' Plot de '+them.name+' y '+mine+' propias, en número igual');
    res={ok:true,exposedTheirs:took,exposedMine:mine,of:them.name};
  }else if(act&&act.steal!=null){
    var si=act.steal;
    if(d.cards.indexOf(si)<0){
      res={ok:false,reason:'esa Plot no estaba entre las que viste'};
    }else{
      var sa=them.hand.indexOf(si);
      if(sa>=0)them.hand.splice(sa,1);
      me.hand.push(si);
      them.revealedBy.push(si);
      log(me.name+' roba '+card(si).name+' de las Plot ocultas de '+them.name+' (queda expuesta)');
      res={ok:true,stolen:card(si).name,from:them.name,to:me.name};
    }
  }else{
    res={ok:true,reason:'no se ha hecho nada con lo que se vio'};
  }
  var outP=publicState();
  outP.lastPlotResult=res;
  return outP;
}

/* Cierre de la ventana desde fuera del motor (la UI y la IA). Es idempotente:
 * llamarlo dos veces con la ventana ya cerrada no rompe nada. */
E.resolvePendingPeek=function(act){
  if(!S.pendingPeek){
    var out0=publicState();
    out0.lastPlotResult={ok:false,reason:'No hay ninguna espionaje pendiente'};
    return out0;
  }
  return closePendingPeek(act||null);
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
    /* L22: la ventana de NEGACION. Se proyecta sin los indices internos de Se proyecta sin los indices internos de
     * carta del respondiente (cada uno lleva ya su nombre), igual que la
     * ventana de suceso de arriba. */
    pendingNegation:S.pendingNegation?{cardName:S.pendingNegation.cardName,
      cardKind:S.pendingNegation.cardKind,byPid:S.pendingNegation.pid,
      byName:S.players[S.pendingNegation.pid]?S.players[S.pendingNegation.pid].name:'',
      negators:S.pendingNegation.negs.map(function(x){return {pid:x.pid,name:x.name,cardName:x.cardName,via:x.via};}),negKind:null}:null,
    /* L7: la ventana de ESPIONAJE. Se proyecta la lista como indices y nombres,
     * nunca como objetos carta, y `cancelledBy` es publico porque 242 lo
     * anula desde fuera. */
    pendingPeek:S.pendingPeek?{kind:S.pendingPeek.kind,label:S.pendingPeek.label,
      byPid:S.pendingPeek.byPid,byName:S.pendingPeek.data.byName,
      rivalPid:S.pendingPeek.data.rivalPid,
      rivalName:S.players[S.pendingPeek.data.rivalPid]?S.players[S.pendingPeek.data.rivalPid].name:'',
      cards:S.pendingPeek.data.cards.map(function(ix){return {idx:ix,name:card(ix).name};}),
      cancelledBy:S.pendingPeek.cancelledBy?{card:S.pendingPeek.cancelledBy.cardName,by:S.pendingPeek.cancelledBy.name}:null,
      responders:S.pendingPeek.responders?S.pendingPeek.responders.slice():[]}:null,
 /* L8b: la ventana de robo es INTIMA del jugador que roba (233/367 eligen entre sus
  * propias cartas), al reves que pendingPeek que es de un rival. Se proyecta
  * entero solo para el dueno: los indices de carta son de SU mazo y ningun otro
  * jugador debe verlos. El hook ya sabe que las cartas son las que el mira. */
 pendingDraw:S.pendingDraw?(S.pendingDraw.byPid===S.currentPid?{
   kind:S.pendingDraw.kind,hook:S.pendingDraw.hookCard,hookUid:S.pendingDraw.hookUid,
   mode:S.pendingDraw.pick>1?'choose3':'choose1',exchanged:!!S.pendingDraw.exchanged,
   cards:S.pendingDraw.pool.map(function(ix){return {idx:ix,name:card(ix).name};})
 }:null):null,
    /* L8c — 405: la ventana de comienzo de turno se proyecta SIN la mano de nadie:
     * el UI decide su boton desde SU propia mano (que ya esta proyectada). */
    pendingTurnStart:S.pendingTurnStart?{forPid:S.pendingTurnStart.forPid,
      forName:S.players[S.pendingTurnStart.forPid]?S.players[S.pendingTurnStart.forPid].name:'?'}:null,
    /* L9 / 332 — solo se proyecta QUIEN tiene la ventana abierta. El objetivo, la
     * operacion y la alineacion elegidas los elige el jugador dueño; no hacen falta
     * para que la UI ofrezca los controles, y no se filtra ninguna mano. */
    pendingAlignEdit:S.pendingAlignEdit?{byPid:S.pendingAlignEdit.byPid,
      byName:S.players[S.pendingAlignEdit.byPid]?S.players[S.pendingAlignEdit.byPid].name:'?'}:null,
    /* L9 — la MISMA lista de 10 alineaciones oficiales que valida applyAlignEdit.
     * Se proyecta para que la UI ofrezca el desplegable SIN duplicar la constante:
     * si las dos copias divergieran, el motor rechazaria la eleccion y el jugador
     * veria una opcion que nunca funciona. */
    canonAlignments:CANON_ALIGNMENTS.slice(),
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
    pendingResDestroy:S.pendingResDestroy?{byPid:S.pendingResDestroy.byPid,
      byName:S.players[S.pendingResDestroy.byPid]?S.players[S.pendingResDestroy.byPid].name:'?'}:null,
     returnTurnTo:S.returnTurnTo==null?null:S.returnTurnTo,
     seizeUsed:S.players.map(function(p14){return!!(p14.flags&&p14.flags.seizeTimeUsed);}),
    extraArrows:clone(S.l18extra),
  /* L21: que carta New World Order esta en vigor por color (hasta 3). */
  nwoInForce:clone(S.nwoInForce||{}),
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
  var held=goalCardsIn(pl);
  var two=held.some(function(ix){return C.cards[ix].name==='Alternate Goals';});
  if(!two)return 1;
  /* L15 — "This Goal cannot be combined with other Goals in any way." (294 Kill
   * for Peace, 297 Let Them Eat Cake!, 343 Power to the People, 393 The Hand of
   * Madness, 407 Up Against the Wall).
   * `Alternate Goals` ("You may possess two Goal cards") es la UNICA carta que
   * autoriza un segundo hueco, asi que la clausula se implementa aqui y no en el
   * evaluador del objetivo: basta con que una de esas 5 este en mano para que el
   * limite siga siendo 1. Se aplica sobre la REGLA (limite) y no sobre el
   * contenido de la mano: el jugador puede tener las dos cartas, y es el propio
   * motor el que descarta el exceso al final del turno (enforceGoalHandLimit,
   * P1-014), que ya sabe que con limite 1 "cualquier sola carta Goal es legal" y
   * por eso no decide cual conviene. Asi no se introduce ningun caso especial
   * nuevo de descarte. */
  for(var i=0;i<held.length;i++){
    var ef=C.cards[held[i]].effect;
    if(ef&&ef.goalCombo)return 1;
  }
  return 2;
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
/* L15 (2026-10) — LAS 5 "GOAL CARDS DE COMBINACION" (294, 297, 343, 393, 407).
 * IMPRESO (294 Kill for Peace, literal):
 *   "Destroy Violent groups, and control Peaceful groups, in any of the
 *    following combinations: Destroy 2 Violent, control 6 Peaceful /
 *    Destroy 3 Violent, control 5 Peaceful / Destroy 4 Violent, control 4
 *    Peaceful / Destroy 5 Violent, control 3 Peaceful / Destroy 6 Violent,
 *    control 1 Peaceful. This Goal cannot be combined with other Goals in any way."
 * Las 5 impresionan la MISMA tabla de 5 filas (2+6, 3+5, 4+4, 5+3, 6+1 —
 * siempre 8) y solo cambian el par de alineaciones, que viaja en
 * effect.goalCombo. "in any of the following combinations" = basta UNA fila.
 *
 * POR QUE DATA-DRIVEN Y NO 5 RAMAS POR NOMBRE: Criminal Overlords, Hail Eris! y
 * Fratricide SI son 3 efectos distintos y por eso tienen 3 ramas. Estas 5 tienen
 * un unico efecto parametrizado, asi que el par de alineaciones se lee del
 * dataset. Si una 6a Goal card de combinacion apareciese, no necesitaria codigo.
 *
 * LA CLAUSULA "cannot be combined" NO SE EVALUA AQUI: es una restriccion de mazo y
 * vive en goalHandLimitOf (arriba). El objetivo es independiente de ella. */
var GOAL_COMBO_ROWS=[[2,6],[3,5],[4,4],[5,3],[6,1]];
/* Grupos de una alineacion que el jugador ha DESTRUIDO, contados desde
 * destroyedByMe. P1-011/L11 fijo que destroyedByMe guarda SOLO el cardId (sin
 * decir como murio la carta y sin nodo), asi que la unica fuente posible de la
 * alineacion de una carta destruida es retroAlignsOf(), que ademas ya aplica el
 * overlay retroactivo de 357 Rewriting History (L9). No hace falta ningun caso
 * especial para 220 Clone / 227 Counter-Revolution / 287 Impostor / 309: su
 * "The original X no longer counts as destroyed for the goals of whoever destroyed
 * it" ya esta implementado BORRANDO el original de destroyedByMe, asi que este
 * contador los respeta por construccion. Se deduplica por cardId porque nada lo
 * garantiza y un doble conteo haria cumplir una fila antes de tiempo. */
function destroyedAlignCount(pl,align){
  var list=pl.destroyedByMe||[],seen={},n=0;
  for(var i=0;i<list.length;i++){
    var id=list[i],k='c'+id;
    if(seen[k])continue;
    seen[k]=1;
    if(retroAlignsOf(id).indexOf(align)>=0)n++;
  }
  return n;
}
/* Grupos de una alineacion que el jugador CONTROLA ahora mismo. countsForGoals es
 * la unica puerta de "cuenta para una meta" (engine.js:171, 7 consumidores) y
 * nodeAligns aplica los overlays de alineacion VIVOS (L9) — exactamente el mismo
 * par de filtros que usa la rama de Criminal Overlords, para que un grupo al que
 * L9 le quito Violent no cuente como Violent destruido ni como controlado. */
function controlledAlignCount(pl,align){
  var n=0;
  walk(pl.structure,function(nd){
    if(!countsForGoals(nd))return;
    if(nodeAligns(nd,card(nd.cardId)).indexOf(align)>=0)n++;
  });
  return n;
}
function goalComboObjective(combo,pl,cname){
  var d=destroyedAlignCount(pl,combo.destroy);
  var k=controlledAlignCount(pl,combo.control);
  var best=null,i,r;
  /* Las filas estan en orden descendente de "destruidas"; la primera que se
   * cumple es la que se anuncia. El criterio es >= en AMBOS lados ("Destroy 2
   * Violent, control 6 Peaceful" se cumple con 3 y 6 tambien), y "any of" hace
   * legitimo parar en la primera. */
  for(i=0;i<GOAL_COMBO_ROWS.length;i++){
    r=GOAL_COMBO_ROWS[i];
    if(d>=r[0]&&k>=r[1]){best=r;break;}
  }
  var cells=GOAL_COMBO_ROWS.map(function(row){
    return 'D'+row[0]+'/C'+row[1]+((d>=row[0]&&k>=row[1])?'*':'');
  }).join(' ');
  return {met:!!best,count:d,goal:best?best[0]:8,
          destroyedAlign:d,controlledAlign:k,comboRows:cells,
          how:cname+': '+cells+' ['+d+' '+combo.destroy+' destruidos, '+k+' '+
              combo.control+' controlados]'+
              (best?' - COMBINACION CUMPLIDA (Destroy '+best[0]+' '+combo.destroy+
                    ', control '+best[1]+' '+combo.control+')'
                   :' - ninguna combinacion cumplida')};
}
/* P1-010: objetivos de las 7 Goal cards del mazo. El texto impreso es la
   autoridad (se cita en cada rama); no se inventa ninguna mecanica. "Alternate
   Goals", "Military-Industrial Complex", "Peace in Our Time" y "World War
   Three" NO son condiciones de victoria sino modificadores permanentes del
   juego en curso: declararlas no puede evaluarse todavia, asi que se declaran
   explicitamente como no implementadas en vez de fingir una victoria. */
function goalCardObjective(ix,pid){
  var c=C.cards[ix];var pl=S.players[pid];var name=c?c.name:'';
  /* L15: la rama data-driven de las 5 metas de combinacion va PRIMERO porque su
   * disparador es un campo del dataset (`effect.goalCombo`), no el nombre. Asi
   * anadir una 6a carta de este tipo no requiere tocar este switch, y ninguna de
   * las 5 puede caer por su nombre en una rama fija. */
  if(c&&c.effect&&c.effect.goalCombo)return goalComboObjective(c.effect.goalCombo,pl,c.name);
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

/* L3b — CADUCIDADES POR TURNO. 268 dice "Until the beginning of your next
   turn" y 355 "For the rest of the current turn". Ninguna de las dos necesita un
   campo nuevo en `S`: el motor ya lleva `S.turn`, que se incrementa aqui, y en
   un turno circular "mi proximo turno" es `S.turn + S.players.length`. Se caduca
   en el UNICO sitio donde el numero de turno avanza, para que ninguna otra ruta
   pueda dejar un caducado vivo. Los dos campos viven en el NODO porque su
   duracion es la del grupo. */
function expireTurnFlags(){
  for(var q=0;q<S.players.length;q++){
    walk(S.players[q].structure,function(n){
      if(n.defTriple&&n.defTriple.untilTurn!=null&&S.turn>=n.defTriple.untilTurn){
        n.defTriple=null;
        log('El triple defensivo de '+card(n.cardId).name+' caduca (turno '+S.turn+')');
      }
      /* L13 - 410 Volunteer Aid: "If the Place is still devastated by the Disaster, it
       * automatically gets Relief at the beginning of its owners next turn." Se engancha
       * AQUI y no en endTurn porque expireTurnFlags() es lo que E.beginTurn llama PRIMERO
       * (L1164) con S.turn ya incrementado; por eso el flag se creo con untilTurn=S.turn+1
       * al jugarse la carta. Precedente exacto: n.defTriple.untilTurn (L1104), que ya es
       * "un bonus defensivo de una carta que caduca por turno". Se filtra por dueno con
       * findOwnerPid porque el walk recorre los grupos de TODOS los jugadores.
       * Relief = deja de estar devastado y recupera su ficha de accion: es lo que dicen
       * las reglas oficiales citadas en P1-011 (un grupo devastado no recibe fichas ni
       * cuenta para las metas). El subarbol entero se limpia porque devastar marca el
       * subarbol entero (L3372). */
      if(n.reliefPending&&n.reliefPending.untilTurn!=null&&S.turn>=n.reliefPending.untilTurn
         &&findOwnerPid(n.uid)===n.reliefPending.byPid){
        var rlC=n.reliefPending.byCard!=null?card(n.reliefPending.byCard).name:'la carta de Relief';
        if(n.devastated){
          walk(n,function(x){x.devastated=false;if(x.tokens!=null&&x.tokens<1)x.tokens=1;});
          log(card(n.cardId).name+' recibe Relief automatico de '+rlC+': ya no esta devastado y recupera su accion');
        }else{
          log(card(n.cardId).name+' no necesitaba Relief: '+rlC+' caduca igualmente');
        }
        n.reliefPending=null;
      }
      if(n.resNullify&&n.resNullify.untilTurn!=null&&S.turn>=n.resNullify.untilTurn){
        n.resNullify=null;
        n.noMasterAlignDefense=false;
        log(card(n.cardId).name+' recupera su Resistencia: la carta que se la anulaba caduca');
      }
      /* L5c — 189 Albino Alligators en modo DEFENSA: "the bonus lasts until the
         end of the current turn". Solo el modo defensa caduca aqui; el modo
         accion caduca al gastar la ficha (en spendGroupToken). */
      if(n.timedBoost&&n.timedBoost.mode==='defense'&&n.timedBoost.untilTurn!=null&&S.turn>=n.timedBoost.untilTurn){
        var tbG=card(n.cardId).name, tbC=n.timedBoost.name;
        n.timedBoost=null;
        log(tbG+' pierde el bonus defensivo de '+tbC+' (caduca en el turno '+S.turn+')');
      }
      /* L8a — los tokens EXTRA de accion de 388/411 ("one extra Action token ... from
       * this card") caducan cuando empieza el turno del dueno: son fichas de este
       * turno, no un poder permanente del grupo. Se guardan en `n.bonusAction` (una
       * entrada por token) precisamente para poder caducar SOLO esos y no contar
       * como caducado el resto de las fichas del grupo, que las pone beginTurn y que
       * en este motor arrastran entre turnos (desviacion preexistente, anotada en el
       * backlog del §52). El `Math.max(0,…)` es a proposito: si el grupo ya gasto la
       * ficha de su cuenta, `nd.tokens` puede ser menor que las etiquetas que quedan,
       * y caducar nunca debe dejar un contador negativo. */
      if(n.bonusAction&&n.bonusAction.length){
        var bk=0;
        while(bk<n.bonusAction.length&&S.turn>n.bonusAction[bk].turn)bk++;
        if(bk>0){
          n.bonusAction=n.bonusAction.slice(bk);
          if(n.tokens!=null)n.tokens=Math.max(0,n.tokens-bk);
          log(card(n.cardId).name+' pierde '+bk+' token(s) extra(s) de accion (caducan en el turno '+S.turn+')');
        }
      }
    });
    /* L8c — 405 Unlucky 13: la bandera de bloqueo de robo de Plots es a nivel de
     * JUGADOR (no de nodo) y caduca cuando empieza un turno POSTERIOR al bloqueado:
     * "He can draw no Plot cards ... until after his current turn ends". El chequeo
     * doble (S.turn <= flag) en los puntos de robo hace el resto (plotDrawBlocked). */
    var qpL8c=S.players[q];
    if(qpL8c.flags&&qpL8c.flags.noPlotUntilTurnEnd&&S.turn>qpL8c.flags.noPlotUntilTurnEnd){
      qpL8c.flags.noPlotUntilTurnEnd=0;
      log(qpL8c.name+' puede volver a robar Plot cards (Unlucky 13 caduca)');
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
  /* L3b — caducar los efectos de 268 y 355 ANTES de nada de este turno, para
     que "until the beginning of your next turn"caduque en la frontera
     correcta y no un turno tarde. */
  expireTurnFlags();
  pl.flags.autoTakeover=false;
  /* L6 — 359 Sabotage: "He cannot make an automatic takeover that turn" es de
     ESE turno, asi que caduca con el resto de flags por turno. */
  pl.flags.autoTakeoverBlocked=false;
  pl.flags.plotDrawn=false;
  pl.flags.groupDrawn=false;
  /* P1-026: el ataque privilegiado de los Bavarianos es "1 vez por turno". */
  pl.flags.privilegedUsed=0;
  pl.usedResourceThisTurn=false;
  /* L13 - 245: "This device can act once per turn". El flag usedThisTurn va en la
   * ENTRADA del Resource y no en pl.usedResourceThisTurn porque el alcance del +2 es
   * GLOBAL (el impreso no dice "your Disasters"): si viviera en el jugador, solo
   * caducaria al empezar el turno de su dueno. Se resetea al empezar CUALQUIER turno,
   * que es lo que "once per turn" significa para un efecto que no tiene dueno. */
  for(var qL13=0;qL13<S.players.length;qL13++){
    var rsL13=S.players[qL13].resources||[];
    for(var rL13=0;rL13<rsL13.length;rL13++)rsL13[rL13].usedThisTurn=false;
  }
  /* L14 — 364: el bloqueo de robo era SOLO del turno especial, asi que caduca aqui (es
   * lo que el propio `case` quiere: el turno especial termina con el turno). */
  pl.flags.noDrawTurn=false;
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
    /* L3b — cuarto consumidor de noTokensFlag(): este reparto automatico es el
       que hace DURAR la carta de 418. Sin esta linea, un grupo verde apagado
       recuperaba su ficha aqui al comienzo de cada turno. */
    if(noTokensFlag(nd))return;
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
  /* L8c — 405: el autoDraw de The Network TAMBIEN respeta el bloqueo. La ventana se
   * abre ANTES de beginTurn, asi que la bandera ya esta puesta cuando llega aqui:
   * un bloqueo a mitad de turno no cubriria este camino (P1-048). */
  /* L14 - 364: el autoDraw de The Network tambien lo respeta. Va en la misma condicion
   * que el bloqueo de 405 porque los dos son "no puede robar en este turno", y el robo
   * automatico del comienzo de turno es un robo mas. */
  if(autoDraw&&!plotDrawBlocked(pid)&&!pl.flags.noDrawTurn){
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
  /* L8c — 405 Unlucky 13: "He can draw no Plot cards, for any reason, until after
   * his current turn ends". Va delante del chequeo de plotDrawn: bloquear no es lo
   * mismo que haber robado, y el mensaje debe decirlo. */
  if(plotDrawBlocked(pid))throw new Error('Unlucky 13: no puedes robar Plot cards este turno');
  /* L14 — 364: "you may not draw Plot or Group cards for any reason". El flag lo pone
   * el propio `case 'turn_control'` DESPUES de `E.beginTurn` (que resetea los flags por
   * turno), asi que aqui ya esta puesto. Va antes del chequeo de plotDrawn: "no puedes
   * robar" y "ya robaste" son cosas distintas y el mensaje debe decirlo. */
  if(pl.flags.noDrawTurn)throw new Error('Seize the Time!: no puedes robar Plot cards durante el turno especial');
  if(pl.flags.plotDrawn)throw new Error('Ya robaste tu carta de Plot este turno');
  if(S.pendingDraw)throw new Error('Primero resuelve la eleccion de robo pendiente');
  /* L8b: 233/367. El robo se APLAZA (las cartas ya estan en S.pendingDraw.pool) y el
   * turno NO consume la bandera: la consumira resolvePendingDraw al cerrar. */
  if(deferDrawForHook(pid,'plot'))return {deferred:true,hook:S.pendingDraw.hookCard};
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
  /* L14 — 364: mismo bloqueo para el robo de Grupo ("Plot or Group cards"). 405
   * (Unlucky 13) solo imprimia "no Plot cards", asi que este camino no lo tenia. */
  if(pl.flags.noDrawTurn)throw new Error('Seize the Time!: no puedes robar Group cards durante el turno especial');
  if(pl.flags.groupDrawn)throw new Error('Ya robaste tu carta de Grupo este turno');
  if(S.pendingDraw)throw new Error('Primero resuelve la eleccion de robo pendiente');
  /* L8b: 367 imprime "a Plot or Group card". */
  if(deferDrawForHook(pid,'group'))return {deferred:true,hook:S.pendingDraw.hookCard};
  var ix=drawFrom(S.groupDeck,S.groupDiscard,'grupos');
  if(ix==null)throw new Error('No quedan Group cards');
  pl.flags.groupDrawn=true;
  pl.hand.push(ix);
  return {idx:ix,card:C.cards[ix]};
};
E.exchangeForPlot=function(pid,payment){
  requireOwnMain(pid);
  var pl=S.players[pid];
  /* L8c — 405: "for any reason" incluye el canje. Va antes del pago: si el robo
   * va a estar bloqueado, nada se gasta y no hay nada que devolver. */
  if(plotDrawBlocked(pid))throw new Error('Unlucky 13: no puedes robar Plot cards este turno');
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
    if(S.pendingDraw)throw new Error('Primero resuelve la eleccion de robo pendiente');
    /* L8b: el pago YA esta aplicado y el `return` de aqui sale del `try`, asi que el
     * `catch` no lo devuelve. El canje se completa al cerrar la eleccion de robo. */
    if(deferDrawForHook(pid,'plot')){S.pendingDraw.exchanged=true;return {deferred:true,hook:S.pendingDraw.hookCard};}
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
/* ---------------- L8a: manipulacion de mazo y robo (361, 388, 411) ----------------
 * TOP OF DECK. En este motor "la cima" es `pop()` (ver drawFrom, ~1054): los mazos
 * se llenan con unshift y se reparten con pop. Por eso topOfDeck devuelve las n
 * cartas de cima SIN decidir su destino, y lo decide el llamante: 411 las QUEMA
 * ("removing them permanently from play" = fuera del juego, ni al descarte) y 388
 * las manda a `S.groupDiscard`, que si se rebaraja. Se devuelven cartas y no
 * indices a proposito: un indice de mazo no sobrevive a un reshuffle, que es lo que
 * hace drawFrom cuando el mazo se vacia. */
function topOfDeck(deck,n){
  var out=[];
  for(var i=0;i<n&&deck.length>0;i++)out.push(deck.pop());
  return out;
}
/* TOKEN DE ACCION EXTRA (388/411). El motor ya sabia GASTAR fichas de grupo
 * (spendGroupToken) y ya las PONIA al empezar el turno (beginTurn, ~1015), pero no
 * tenia ninguna forma de darMAS: las fichas extra eran un hueco total de motor.
 * Se guarda como ETIQUETA por turno (`n.bonusAction`, una entrada por token) y no
 * como un contador suelto, para que expireTurnFlags pueda caducar exactamente lo que
 * puso este efecto y no las fichas que el grupo puso por su cuenta. El gasto de esas
 * fichas en particular lo hace spendGroupToken, que ya respeta `nd.tokens`. */
function placeBonusAction(pid,uid,cardName){
  var pl=S.players[pid];
  if(!pl)throw new Error(cardName+': jugador desconocido');
  var nd=findNode(uid)||findInTree(pl.structure,uid);
  if(!nd||findOwnerPid(nd.uid)!==pid)
    throw new Error(cardName+': los tokens extra de accion deben ir a uno de TUS grupos');
  if(nd.tokens==null)nd.tokens=0;
  nd.tokens++;
  if(!nd.bonusAction)nd.bonusAction=[];
  nd.bonusAction.push({from:cardName,turn:S.turn});
  return nd;
}
/* Coloca los tokens extra de una sola vez aplicando el techo impreso: "For each
 * [Group|Plot] you discard, you MAY place one extra Action token on one of your own
 * Groups. No Group may get more than one extra Action token FROM THIS CARD." O sea:
 * como mucho `earn` tokens en total (porque son opcionales, 0 es legal) y nunca dos
 * del mismo grupo para la misma carta. `maxPerGroup` se pasa porque las dos cartas
 * que lo usan imprimen 1, pero el dato lo lleva la carta y no el motor. */
function applyBonusUids(pid,uids,earn,cardName,maxPerGroup){
  if(!Array.isArray(uids))uids=[];
  if(uids.length>earn)
    throw new Error(cardName+': cada carta descartada da como maximo un token extra de accion, y solo has descartado '+earn);
  var seen={},placed=[];
  for(var i=0;i<uids.length;i++){
    var u=uids[i];
    seen[u]=(seen[u]||0)+1;
    if(seen[u]>maxPerGroup)
      throw new Error(cardName+': esta carta no da mas de '+maxPerGroup+' token extra de accion al mismo grupo ('+u+')');
    placed.push(placeBonusAction(pid,u,cardName).uid);
  }
  return placed;
}
/* ---------------- L8b: ganchos de robo (233 Crystal Skull, 367 Shroud of Turin) ----------------
 * Resources PASIVOS que cambian el PROXIMO robo. El problema de fondo es que este
 * motor roba de forma sincrona: `drawFrom` saca una carta y la mete en la mano, sin
 * punto de decision. Las dos cartas impresas son una decision ("pick the one you
 * want", "if you don't want it, take the bottom card instead"), asi que no se pueden
 * resolver despues del robo: habria que deshacerlo. Por eso el robo se APLAZA.
 *
 * CONVENCION DE MAZO (ya existe, ver topOfDeck en L8a y drawFrom): el mazo es un
 * array donde la ULTIMA posicion es la cima (`pop()` = cima, `push()` = nueva cima,
 * indice 0 = FONDO). Todo el reparto de este bloque depende de eso.
 *
 * El hook NO se consume: las dos cartas dicen "Whenever you draw ...", o sea que
 * dura mientras el Resource siga enlazado. Se guarda POR RECURSO (`r.drawHook`),
 * no como una bandera de jugador, para que capturar o destruir el Resource lo apague
 * sin tocar nada mas, y para que dos Resources distintos no se pisen.
 */
function drawHookOf(pid,kind){
  var pl=S.players[pid];
  if(!pl)return null;
  for(var i=0;i<pl.resources.length;i++){
    var r=pl.resources[i];
    if(!r||!r.drawHook)continue;
    var c=card(r.cardId);
    var h=(c&&c.effect&&c.effect.hook)||null;
    if(!h)continue;
    if(h.deck===kind||h.deck==='plotOrGroup')return {res:r,card:c,hook:h};
  }
  return null;
}
/* ¿Se puede aplazar este robo? Devuelve true si abrio la ventana. Se llama ANTES de
 * `drawFrom`, y el llamante DEBE salir sin robar y sin consumir la bandera del turno:
 * las cartas ya estan en `pool`, asi que la bandera se pone al resolver. */
function deferDrawForHook(pid,kind){
  var h=drawHookOf(pid,kind);
  if(!h)return false;
  var deck=kind==='plot'?S.plotDeck:S.groupDeck;
  var want=Math.max(1,h.hook.pick||1);
  var pool=topOfDeck(deck,Math.min(want,deck.length));
  if(!pool.length)return false;
  S.pendingDraw={byPid:pid,kind:kind,hookUid:h.res.uid,hookCard:h.card.name,
                 pick:h.hook.pick||1,rest:h.hook.rest||null,alt:h.hook.alt||null,
                 pool:pool,exchanged:false};
  log(h.card.name+': '+S.players[pid].name+' mira '+pool.length+' carta(s) de la cima de su mazo de '+kind);
  return true;
}
/* Cierre idempotente: se vacia `S.pendingDraw` ANTES de mutar nada, igual que
 * resolvePendingPeek / resolvePendingAttack, para que un segundo click no pueda
 * cobrar dos veces. */
E.resolvePendingDraw=function(act){
  if(!S.pendingDraw)throw new Error('No hay ninguna eleccion de robo pendiente');
  var P=S.pendingDraw;
  var pl=S.players[P.byPid];
  if(!pl)throw new Error('Jugador desconocido');
  var pool=P.pool.slice();
  var deck=P.kind==='plot'?S.plotDeck:S.groupDeck;
  var chosen=null;
  act=act||{};
  /* L8b — VALIDAR ANTES de cerrar. Cerrar primero era un fallo real: una eleccion
     invalida destruia la ventana Y las cartas del `pool`, que ya no estan ni en el
     mazo ni en la mano ni en el descarte, asi que se perdian para siempre y el
     jugador perdia un turno entero de forma irrecuperable. Ahora una eleccion
     invalida lanza y DEJA LA VENTANA ABIERTA, que es lo unico que permite
     reintentar. La idempotencia no se pierde por esto: el cierre sigue siendo la
     primera mutacion, solo despues de validar. */
  var k=-1, where=null, take=null;
  if(P.pick>1){
    /* 233: elige UNA de las que miro y devuelve las otras dos donde diga. */
    k=act.pick;
    if(typeof k!=='number'||!(k>=0&&k<pool.length))
      throw new Error(P.hookCard+': elige una de las '+pool.length+' cartas que has mirado');
    where=act.rest||'top';
    if(where!=='top'&&where!=='bottom')
      throw new Error(P.hookCard+': las otras dos cartas van arriba o abajo del mazo');
  }else{
    /* 367: mira la cima y, si no la quiere, se lleva el FONDO sin mirarlo. */
    take=act.take||'top';
    if(take!=='top'&&take!=='bottom')
      throw new Error(P.hookCard+': quedate con la carta de cima o con la del fondo');
  }
  S.pendingDraw=null;
  if(P.pick>1){
    chosen=pool[k];
    var rest=pool.filter(function(_,i){return i!==k;});
    if(where==='top'){
      /* Arriba del mazo = final del array. Se empujan en orden de lectura para que
       * la que estaba mas abajo entre las dos quede la primera que se robara. */
      deck.push(rest[0]);
      deck.push(rest[1]);
    }else{
      /* Abajo del mazo = indice 0. `unshift` mete al principio, asi que se hace al
       * reves para que rest[0] quede encima de rest[1] (orden de lectura). */
      deck.unshift(rest[0]);
      deck.unshift(rest[1]);
    }
    log(P.hookCard+': '+pl.name+' se queda '+card(chosen).name+' y devuelve las otras dos '+
        (where==='top'?'encima':'debajo')+' de su mazo');
  }else{
    /* 367: `take` ya quedo validado arriba. */
    if(take==='top'){
      chosen=pool[0];
      log(P.hookCard+': '+pl.name+' se queda '+card(chosen).name);
    }else if(deck.length){
      chosen=deck.shift();
      deck.push(pool[0]);
      log(P.hookCard+': '+pl.name+' rechaza la cima y se lleva '+card(chosen).name+' del fondo');
    }else{
      /* El mazo solo tenia esa carta: no hay fondo al que agarrarse. */
      chosen=pool[0];
      log(P.hookCard+': '+pl.name+' se queda '+card(chosen).name+' (su mazo ya no tenia fondo)');
    }
  }
  pl.hand.push(chosen);
  if(P.kind==='plot'&&!P.exchanged){
    pl.flags.plotDrawn=true;
    openEventWindow({kind:'plotDrawn',byPid:P.byPid,label:pl.name+' roba una Plot card ('+card(chosen).name+')',
                     data:{cardIdx:chosen,byName:pl.name}});
  }else if(P.kind==='group'&&!P.exchanged){
    /* El canje de estrella es SIEMPRE por una Plot, asi que `P.kind` ya es 'plot'
     * en ese caso; la rama de abajo solo se da con `E.drawGroup`, que si consume
     * la bandera. Se deja explicita la negacion para que anadir un canje de
     * grupo en el futuro no tenga que recordar esta excepcion. */
    pl.flags.groupDrawn=true;
  }
  return publicState();
};
/* ---------------- L8c: ventana de comienzo de turno (405 Unlucky 13) ---------------- */
/* El bloqueo de robo de Plots: la bandera vale el NUMERO DE TURNO bloqueado; el
 * chequeo doble (S.turn <= flag) es semantica precisa + higiene de expiracion:
 * expireTurnFlags la limpia al empezar un turno posterior. Cuatro consumidores:
 * E.drawPlot, E.exchangeForPlot, el modo draw de deck_manip y el autoDraw de
 * The Network (P1-048). */
function plotDrawBlocked(pid){
  var plq=S.players[pid];
  return !!(plq.flags&&plq.flags.noPlotUntilTurnEnd&&S.turn<=plq.flags.noPlotUntilTurnEnd);
}
/* PASS del comienzo de turno: nadie reacciona y el turno del proximo jugador corre.
 * El PLAY de 405 NO va por aqui: va por E.playPlot (case 'turn_start_block'), que
 * paga la accion Magic, pone la bandera y despues llama beginTurn. */
E.resolvePendingTurnStart=function(act){
  act=act||{};
  var W=S.pendingTurnStart;
  if(!W)return publicState(); /* idempotente: sin ventana no hay nada que hacer */
  S.pendingTurnStart=null;
  log('Los rivales dejan pasar el comienzo del turno de '+S.players[W.forPid].name);
  S.phase='begin';
  E.beginTurn(W.forPid);
  return publicState();
};

/* ================= L9 - EDITAR ALINEACIONES (332, 357) =================
 *
 * Las dos cartas de L9 comparten el verbo pero no el soporte:
 *   332 Orbital Mind Control Lasers -> edicion TEMPORARIA de un nodo EN JUEGO,
 *     disparada por la ACCION del Gadget ("at any time except during a
 *     privileged attack", "lasts only for the rest of the current turn").
 *   357 Rewriting History            -> edicion RETROACTIVA y PERMANENTE de un
 *     grupo YA DESTRUIDIDO, que no tiene nodo, y que puede cambiar el conteo de
 *     una meta de "destruye N grupos de una alineacion".
 * Por eso 332 escribe en el NODO (alignsTmp*, con sello de turno) y 357 escribe
 * en S.alignRetro, un overlay por CARDId que nodeAligns consulta como ultima capa.
 */

/* Aplica una edicion de alineacion. `op` es 'add' | 'remove' | 'invert'.
 * - Si hay `node`, la alineacion se anade o se resta de alignsAdded /
 *   alignsRemoved (permanente) o de alignsTmpAdded / alignsTmpRemoved (temporal,
 *   sellada con el turno actual).
 * - Si hay `retroCardId`, se escribe en S.alignRetro (357).
 * Devuelve true si la alineacion cambio de verdad. Registrar una resta que no
 * aplica dejaria rastro para Backlash (200) sin motivo: es la misma regla que
 * respeta force_align. */
function applyAlignEdit(op,align,node,retroCardId){
  if(CANON_ALIGNMENTS.indexOf(align)<0)
    throw new Error('"'+align+'" no es una alineacion oficial');
  var changed=false;
  if(node){
    var cur=nodeAligns(node).map(function(x){return String(x).toLowerCase();});
    var isAdd=op==='add',want;
    if(op==='invert'){isAdd=cur.indexOf(align)<0;want=isAdd;}
    else want=isAdd;
    if(want){
      /* SOLO se registra si de verdad se gana: si ya estaba, no se anade un
       * duplicado que el consumidor tendria que filtrar. */
      if(cur.indexOf(align)<0){
        var fld=node.temporary?'alignsTmpAdded':'alignsAdded';
        if(!Array.isArray(node[fld]))node[fld]=[];
        node[fld].push(align);
        if(node.temporary)node.alignsTmpTurn=S.turn;
        changed=true;
      }
    }else{
      if(cur.indexOf(align)>=0){
        var fld2=node.temporary?'alignsTmpRemoved':'alignsRemoved';
        if(!Array.isArray(node[fld2]))node[fld2]=[];
        node[fld2].push(align);
        if(node.temporary)node.alignsTmpTurn=S.turn;
        changed=true;
      }
    }
  }
  if(retroCardId!==undefined&&retroCardId!==null){
    var r=S.alignRetro[retroCardId];
    if(!r){r={added:[],removed:[]};S.alignRetro[retroCardId]=r;}
    var base=retroAlignsOf(retroCardId);
    var wantR=(op==='add')?true:((op==='remove')?false:(base.indexOf(align)<0));
    if(wantR){
      if(base.indexOf(align)<0){
        /* quitar de removed si estaba, para que "la suma gana a la resta" */
        r.removed=r.removed.filter(function(x){return x!==align;});
        if(r.added.indexOf(align)<0)r.added.push(align);
        changed=true;
      }
    }else{
      if(base.indexOf(align)>=0){
        r.added=r.added.filter(function(x){return x!==align;});
        if(r.removed.indexOf(align)<0)r.removed.push(align);
        changed=true;
      }
    }
  }
  return changed;
}
/* L9 — costura de LECTURA para pruebas y para la UI: devuelve las alineaciones
 * EFECTIVAS de un nodo, es decir exactamente lo que nodeAligns() reporta DESPUES
 * de aplicar sus TRES capas (permanente + temporal-de-turno + retroactiva-por-
 * carta), porque las tres viven dentro de nodeAligns(). No muta nada y el motor no
 * la usa: es una ventana de observacion, para que el criterio de aceptacion de L9
 * ("332 quita una alineacion y nodeAligns deja de reportarla") se compruebe de
 * forma DIRECTA en vez de deducirse de un efecto secundario. La caducidad por turno
 * se observa sola: en el turno siguiente `alignsTmpTurn` ya no coincide con S.turn
 * y la capa temporal desaparece sin que nadie la limpie. */
E.alignsOfNode=function(uid){
  var nd=findNode(uid);
  if(!nd)return null;
  return nodeAligns(nd,card(nd.cardId)).slice();
};


/* 332 — la ACCION del Gadget. Se usa en cualquier momento del turno propio
 * ("at any time"), y el texto prohibe expresamente usarla durante un ataque
 * privilegiado, asi que se rechaza si hay un ataque vivo. Abre una ventana
 * (S.pendingAlignEdit) para que la UI pueda pedir grupo + operacion + alineacion
 * sin ensuciar la firma de la llamada. */
/* ---------- L12.d-2 - ACCION DE UN RESOURCE EN JUEGO (378 Suicide Squad) ----------
 * Por que NO se reusa E.useGadgetAction de 332: la ventana pendingAlignEdit esta
 * cableada en la UI (app.js onUseGadgetAction / onResolveAlignEdit, ui.js L664-705) con
 * los controles de alineacion, y meterle una destruccion de Resource por el mismo
 * hueco obligaria a la UI a distinguir dos familias de mechanics en el mismo menu. La
 * ventana va en su propio campo, en paralelo (regla 6 de plan.md: un lote = una
 * familia de mechanics, no se mezclan).
 *
 * 378 impreso: "Can be used to destroy any Resource belonging to a rival. May be used
 * at any time except during a privileged attack. Roll one die: 1: Target is destroyed.
 * Suicide Squad survives and may be again. 2-5: Target and Suicide Squad are both
 * destroyed. 6: Suicide Squad fails and is destroyed. Target survives. Discard any card
 * that is destroyed."
 * Traduccion mecanica: se elige un Resource de un rival (OBJETIVO ELEGIDO por el
 * jugador, nunca automatico) y se tira UN solo d6. 1 => solo cae el objetivo y 378
 * sobrevive para volver a usarse. 2-5 => caen los dos. 6 => cae 378 y el objetivo
 * sobrevive. Cada carta destruida va a S.groupDiscard ("Discard any card that is
 * destroyed").
 *
 * LIMITE DECLARADO: 332 dice "at any time" y aun asi exige turno propio, porque
 * useGadgetAction llama a requireOwnMain (comentario en app.js L179-183). 378 dice
 * "at any time except during a privileged attack", o sea que su texto es MAS
 * permisivo, pero se aplica el mismo criterio que 332 para no abrir una segunda via
 * de accion fuera de turno sin ventana que la UI sepa cerrar. El veto del ataque
 * privilegiado SI se comprueba, porque el impreso lo prohibe expresamente. Queda
 * anotado en el backlog de la seccion 64 del auditor.
 *
 * El objetivo nunca se autoelige: si act.resUid no llega, la ventana se cierra sin
 * hacer nada. Es a proposito; el mismo defecto estaba en case resource_destroy
 * (278 Hex), donde sin resUid el splice(-1,1) borra el ULTIMO Resource en silencio.
 */
/* L13 - 245 Earthquake Projector. "This device can act once per turn. It can increase
 * the Power of any Attack to Destroy a Place, or of any Disaster card, by 2."
 * NO HAY VENTANA: la accion no elige objetivo - el objetivo es "cualquier ataque" y
 * el jugador decide CUANDO usarla. Por eso no hace falta un S.pending* ni un veto en
 * endTurn, al contrario que 378 Suicide Squad, que si tiene que elegir un Resource
 * rival concreto. Lo que se guarda es un flag usedThisTurn en la ENTRADA (no en el
 * jugador), y announcePlotInstantAttack suma el +2 al Poder del ataque de cualquiera
 * que se anuncie mientras siga activo. */
/* L23 / P1-146 - uso de la ACCION de un Resource que da un bono a un ataque ya
 * declarado. Precedente EXACTO: E.useDisasterBoost (L13 Earthquake Projector), con
 * dos anadidos medidos: (a) el objetivo del ataque es un NODO y se califica con
 * hasAttr, igual que hace el case attack_boost de L5a; (b) hay que empujar a
 * A.boosts ANTES de que corra computeStrength(true) (engine.js:3363), o sea con el
 * ataque ABIERTO y sin resolver, que es exactamente lo que valida el guard.
 * Todo se valida ANTES de mutar (P1-033): si la carta no encaja, no se gasta la
 * accion ni se toca el ataque. */
E.useAttackBonus=function(pid,opts){
  opts=opts||{};
  requireOwnMain(pid);
  var R=findResourceEntry(opts.resourceUid);
  if(!R)throw new Error('Ese Resource no esta en juego');
  if(R.pid!==pid)throw new Error('Ese Resource no es tuyo');
  var rc=card(R.entry.cardId), rEff=(rc.effect||{}), act=R.entry.action;
  if(!act||act.kind!=='res_attack_bonus')
    throw new Error(rc.name+': su accion todavia no esta implementada');
  if(rEff.oncePerTurn&&R.entry.usedThisTurn)
    throw new Error(rc.name+': "Can act once per turn" y ya ha actuado este turno');
  var A=S.attack;
  if(!A||A.resolved)
    throw new Error(rc.name+': "its action can be used" necesita un ataque ya declarado: usa su ACCION con el ataque abierto, ANTES de la tirada');
  var aType23=String(A.type||'').toLowerCase();
  if(rEff.atkType&&aType23!==rEff.atkType)
    throw new Error(rc.name+': solo se usa en un ataque a '+rEff.atkType+' (este ataque es a "'+String(A.type)+'")');
  if(rEff.anyAttacker===false&&A.attackerUid&&findOwnerPid(A.attackerUid)!==pid)
    throw new Error(rc.name+': solo puede ayudar a un ataque tuyo');
  var tgtN23=A.targetUid?findNode(A.targetUid):null;
  var tgtC23=tgtN23?card(tgtN23.cardId):null;
  if(Array.isArray(rEff.targetAttrsAny)&&rEff.targetAttrsAny.length){
    var ok23=false;
    for(var q23=0;q23<rEff.targetAttrsAny.length;q23++)
      if(tgtC23&&hasAttr(tgtC23,rEff.targetAttrsAny[q23],tgtN23))ok23=true;
    if(!ok23)
      throw new Error(rc.name+': "any attempt to control any '+rEff.targetAttrsAny.join(', ')+' group" — el objetivo del ataque no tiene ninguno de esos atributos');
  }
  var v23=rEff.boostValue;
  if(rEff.boostByAtkType){
    v23=(typeof rEff.boostByAtkType[aType23]==='number')?rEff.boostByAtkType[aType23]:null;
    if(v23==null)throw new Error(rc.name+': su bonus no encaja en un ataque a "'+String(A.type)+'"');
  }
  if(typeof v23!=='number'||!v23)
    throw new Error(rc.name+': el ataque no encaja en ningun valor de bonus');
  if(rEff.oncePerTurn)R.entry.usedThisTurn=true;
  A.boosts.push({name:rc.name,v:v23});
  log(rc.name+' se usa: '+v23+' al Poder de este ataque a '+aType23);
  return publicState();
};
E.useDisasterBoost=function(pid,opts){
  opts=opts||{};
  requireOwnMain(pid);
  var R=findResourceEntry(opts.resourceUid);
  if(!R)throw new Error('Ese Resource no esta en juego');
  if(R.pid!==pid)throw new Error('Ese Resource no es tuyo');
  var rc=card(R.entry.cardId), rEff=(rc.effect||{}), act=R.entry.action;
  if(!act||act.kind!=='disaster_defence'||act.mode!=='boost_attack')
    throw new Error(rc.name+': su accion todavia no esta implementada');
  if(R.entry.usedThisTurn)
    throw new Error(rc.name+': "This device can act once per turn" y ya ha actuado este turno');
  R.entry.usedThisTurn=true;
  log(rc.name+' se usa: +'+(rEff.boostValue||0)+' al Poder de cualquier ataque a destruir o Disaster de este turno');
  return publicState();
};
E.useResDestroy=function(pid,opts){
  opts=opts||{};
  requireOwnMain(pid);
  if(S.pendingResDestroy)throw new Error('Ya hay una accion de Resource esperando resolucion');
  var R=findResourceEntry(opts.resourceUid);
  if(!R)throw new Error('Ese Resource no esta en juego');
  if(R.pid!==pid)throw new Error('Ese Resource no es tuyo');
  var rc=card(R.entry.cardId), rEff=(rc.effect||{}), act=R.entry.action;
  if(!act||act.kind!=='resource_effect'||act.mode!=='suicide_squad')
    throw new Error(rc.name+': su accion todavia no esta implementada');
  if(rEff.notDuringPrivileged&&S.attack&&S.attack.privilege)
    throw new Error(rc.name+': no se puede usar durante un ataque privilegiado');
  S.pendingResDestroy={byPid:pid,resourceUid:R.entry.uid,mode:act.mode};
  return publicState();
};
E.resolveResDestroy=function(act){
  act=act||{};
  var W=S.pendingResDestroy;
  if(!W)return publicState();
  S.pendingResDestroy=null;
  if(act.pass)return publicState();
  if(act.resUid==null)return publicState();
  var T=findResourceEntry(W.resourceUid);
  if(!T)throw new Error('El Resource que iba a actuar ya no esta en juego');
  var SS=card(T.entry.cardId);
  var V=findResourceEntry(act.resUid);
  if(!V)throw new Error(SS.name+': ese Resource ya no esta en juego');
  if(V.pid===T.pid)throw new Error(SS.name+': solo puede destruir Resources de un rival');
  var targetName=card(V.entry.cardId).name;
  var roll=d6(), killedT=false, killedS=false, msg='';
  if(roll===1)killedT=true; else if(roll<=5){killedT=true;killedS=true;} else killedS=true;
  if(killedT){var arrT=S.players[V.pid].resources;arrT.splice(arrT.indexOf(V.entry),1);S.groupDiscard.push(V.entry.cardId);}
  if(killedS){var arrS=S.players[T.pid].resources;arrS.splice(arrS.indexOf(T.entry),1);S.groupDiscard.push(T.entry.cardId);}
  if(roll===1)msg=SS.name+' sale bien: '+targetName+' se destruye y '+SS.name+' sobrevive y puede usarse otra vez';
  else if(roll<=5)msg=SS.name+' sacrifica la carta: '+targetName+' y '+SS.name+' quedan destruidas y se descartan';
  else msg=SS.name+' falla y se destruye; '+targetName+' sobrevive';
  log(msg+' (dado '+roll+')');
  return publicState();
};

E.useGadgetAction=function(pid,opts){
  opts=opts||{};
  requireOwnMain(pid);
  if(S.attack||S.pendingAttack)
    throw new Error('No puedes usar la accion de tu Gadget durante un ataque privilegiado');
  if(S.pendingAlignEdit)throw new Error('Ya hay una accion de Gadget esperando resolucion');
  /* P1-077 - los Resources NO viven en el arbol de grupos: estan en el array plano
   * `pl.resources` con uid 'r'+n. findNode() solo recorre `S.players[p].structure`, asi
   * que findNode('r12') devolvia SIEMPRE null y E.useGadgetAction SIEMPRE lanzaba
   * "Los Lasers no estan en tu mesa": 332 Orbital Mind Control Lasers era INJUGABLE.
   * No se arregla metiendo pl.resources dentro de findNode: los nodos de grupo tienen
   * `children`, `tokens` de grupo y se usan en spendGroupToken/nodeAligns/noTokensFlag, y
   * una entrada de Resource no tiene esa forma. Por eso existe findResourceEntry(). */
  var ownR=findResourceEntry(opts.resourceUid);
  if(!ownR)throw new Error('Los Lasers no estan en tu mesa');
  S.pendingAlignEdit={byPid:pid,resourceUid:opts.resourceUid,mode:'gadget_action'};
  return publicState();
};

/* Cierra la ventana de 332 y aplica la edicion. Idempotente sin ventana, como
 * resolvePendingTurnStart. Valida TODO antes de mutar: si la alineacion no
 * cambia, no se cobra nada. */
E.resolveAlignEdit=function(act){
  act=act||{};
  var W=S.pendingAlignEdit;
  if(!W)return publicState();
  S.pendingAlignEdit=null;
  var pid=W.byPid;
  if(act.pass)return publicState();
  var ndR=findResourceEntry(W.resourceUid); /* P1-077: ver nota en E.useGadgetAction */
  if(!ndR)throw new Error('Los Lasers ya no estan en tu mesa');
  var t=findNode(act.targetUid);
  if(!t)throw new Error('Ese grupo no esta en tu mesa');
  var owner=findOwnerPid(act.targetUid);
  if(owner==null)throw new Error('Ese grupo ya no esta en juego');
  if(card(t.cardId).type!=='group')throw new Error('Solo puedes re-alinear un Group');
  var op=String(act.op||'invert');
  if(['add','remove','invert'].indexOf(op)<0)throw new Error('Operacion de alineacion desconocida');
  var al=String(act.align||'').toLowerCase();
  if(CANON_ALIGNMENTS.indexOf(al)<0)throw new Error('"'+al+'" no es una alineacion oficial');
  var before=nodeAligns(t).slice();
  /* P1-064 — la marca de temporalidad va en `t` (el nodo que se EDITA), no en
   * `nd` (el nodo del Gadget que paga). applyAlignEdit elige capa con
   * `node.temporary` sobre el nodo que recibe, asi que marcandolo en `nd` la
   * edit caia en la capa PERMANENTE (alignsRemoved) y no caducaba nunca: el
   * texto de 332 dice "the change lasts only for the rest of the current
   * player's turn". La regresion L9 lo cazo (332 quita 'violent' y al turno
   * siguiente seguia sin 'violent'). */
  t.temporary=true; /* 332: la edit dura solo este turno */
  var changed=applyAlignEdit(op,al,t,null);
  delete t.temporary;
  var after=nodeAligns(t);
  if(!changed){
    log(card(t.cardId).name+' ya era '+(op==='add'?'+':(op==='remove'?'-':''))+al+': la accion no cambia nada');
  }else{
    log('Los Lasers hacen que '+card(t.cardId).name+' pase a '+after.join(', ')+' (dura este turno)');
  }
  return publicState();
};

/* 357 — Rewriting History se juega como Plot: el coste es DISYUNTIVO (una accion
 * de tu Illuminati, O grupos Media con Poder total >= 8) y el efecto es
 * retroactivo sobre un grupo ya destruido. Se expone aparte porque su objetivo
 * no es un nodo: es un cardId de destroyedByMe. */
E.resolveRewritingHistory=function(act){
  act=act||{};
  var d=S.pendingEvent;
  if(!d)return publicState();
  var P=d.owner||{};
  var pid=P.byPid;
  /* P1-066 - `!pid` es TRUE para el jugador 0 (0 es falsy), asi que 357 se
   * resolvia en silencio para el PRIMER jugador y no hacia nada: el overlay
   * retro nunca se aplicaba y no se logueaba nada. Misma clase que el
   * `owner<0` de findOwnerPid (P1-063). La ausencia se comprueba con ==null. */
  if(pid==null||pid===undefined||!S.players[pid])return publicState();
  var ixD=d.data||{};
  var cd=act.retroCardId!=null?act.retroCardId:ixD.retroCardId;
  if(cd===undefined||cd===null)throw new Error('No hay ningun grupo destruido que reescribir');
  var op=String(act.op||'invert');
  if(['add','remove','invert'].indexOf(op)<0)throw new Error('Operacion de alineacion desconocida');
  var al=String(act.align||'').toLowerCase();
  if(CANON_ALIGNMENTS.indexOf(al)<0)throw new Error('"'+al+'" no es una alineacion oficial');
  var before=retroAlignsOf(cd).slice();
  var changed=applyAlignEdit(op,al,null,cd);
  var after=retroAlignsOf(cd);
  /* La ventana se cierra SIEMPRE, incluso si la eleccion no cambia nada: si
   * quedara abierta, endTurn la rechazaria y la partida se quedaria bloqueada. */
  S.pendingEvent=null;
  if(changed)log('Reescriben la historia: '+card(cd).name+' ahora es '+after.join(', '));
  else log(card(cd).name+' ya era '+al+': reescribir la historia no cambia nada');
  return publicState();
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

/* ================= L11 - JUGAR UN DUPLICADO DESDE LA MANO (220, 227, 287, 309) =================
 * HALLAZGO DE ALCANCE que obliga a este diseno: barrido de `children.push` en todo
 * engine.js = 5 sitios, y el UNICO que crea un nodo desde la mano es `placeUnder`
 * (L1680), que a su vez se llama desde UN solo sitio: `E.autoTakeover`. Es decir,
 * **NO existe ninguna API para jugar un Grupo desde la mano a mitad de partida**.
 * Por eso estas 4 cartas no son "un enganche" sino un PUNTO DE ENTRADA NUEVO.
 *
 * Y la mecanica real es la INVERSA de lo que decia el plan: la habilitadora (220/
 * 227/287/309) NO es el duplicado. El duplicado es OTRA carta que el jugador juega
 * desde la mano, y la habilitadora se juega EN ESE MOMENTO ("Used this card when
 * you play..."). Por eso aqui NO hay ventana de reaccion: se juegan LAS DOS cartas
 * en una sola llamada. Eso elimina por construccion los 4 riesgos que las ventanas
 * nuevas traen (guarda de endTurn, proyeccion en publicState, settler en ai.js) y
 * por eso una partida AI-vs-AI con estas cartas no puede colgarse.
 *
 * Efecto comun a las 4: "The original X no longer counts as destroyed for the goals
 * of whoever destroyed it" => des-contar el original del contador de quien lo destruyo.
 * 309 anade su propia excepcion ("cannot help a Personality who was Assassinated")
 * y por eso declara `dupOf:'group'` y NO `needsAssassination`.
 */
/* Localiza el ORIGINAL que esta habilitadora libera y devuelve el plan de
 * des-conteo. Falla con el motivo oficial si el original no existe, y lo hace
 * ANTES de que la funcion llamante haya tocado nada (atomicidad). */
function dupOriginalPlanL11(cardId,needAss){
  for(var q=0;q<S.players.length;q++){
    var oq=S.players[q];
    var inAss=(oq.assassinatedBy||[]).indexOf(cardId)>=0;
    var inDes=oq.destroyedByMe.indexOf(cardId)>=0;
    if(needAss?!inAss:!inDes)continue;
    return {ownerPid:q,ownerName:oq.name,assassinated:inAss,wasInDestroyed:inDes};
  }
  return null;
}
E.playGroupFromHand=function(pid,dupIdx,enablerIdx,parentUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  /* --- 1. las DOS cartas en la mano --- */
  if(pl.hand.indexOf(enablerIdx)<0)throw new Error('La carta habilitadora no esta en tu mano');
  if(pl.hand.indexOf(dupIdx)<0)throw new Error('El duplicado no esta en tu mano');
  if(dupIdx===enablerIdx)throw new Error('La habilitadora y el duplicado no pueden ser la misma carta');
  var ec=card(enablerIdx),dc=card(dupIdx);
  if(!ec||!dc)throw new Error('Carta inexistente');
  if(!ec.effect||ec.effect.kind!=='dup_enabler')
    throw new Error(ec.name+' no es una carta habilitadora de duplicados');
  var eff=ec.effect;
  /* --- 2. ALCANCE: la habilitadora tiene que encajar con el duplicado --- */
  var needAss=!!eff.needsAssassination;
  var wantType=(eff.dupOf==='personality')?'illuminati':'group';
  if(dc.type!==wantType)
    throw new Error(ec.name+' solo habilita duplicar '+(eff.dupOf==='personality'?'una Personality':'un Group')+' y '+dc.name+' es '+dc.type);
  var plan=dupOriginalPlanL11(dupIdx,needAss);
  if(plan==null)
    throw new Error(ec.name+': no hay ningun '+(needAss?'asesinado':'destruido')+' al que '+dc.name+' pueda duplicar');
  /* --- 3. COSTE: validado ENTERO antes de mutar nada (dos pasadas, atomicidad) --- */
  var spendL11=[],costL11={via:null,groups:[]};
  if(eff.payIllum&&eff.payMinPower){
    /* 227 Counter-Revolution: "an action by your Illuminati, OR by Government group
       with a combined Power of at least 10". P1-018: `government` es una ALINEACION,
       no un atributo (los 14 atributos del glosario no lo incluyen), asi que el
       filtro es nodeAligns y NO hasAttr. Leerlo como atributo seria clausula muerta. */
    if(pl.illumTokens>=1)costL11={via:'illuminati',groups:[]};
    else{
      var needL11=eff.payMinPower,pickedL11=[];
      walk(pl.structure,function(n){
        if(needL11<=0)return;
        if(!(n.tokens>=1)||noTokensFlag(n))return;
        var nc=card(n.cardId);
        if(!nc||nc.type!=='group')return;
        if(nodeAligns(n,nc).indexOf(eff.payAlign)<0)return;
        var pw=curPower(n);
        if(pw>0){pickedL11.push({uid:n.uid,name:nc.name,power:pw});needL11-=pw;}
      });
      if(needL11>0)throw new Error(ec.name+': tus grupos '+eff.payAlign+' sin ficha solo aportan Poder '+(eff.payMinPower-needL11)+' de los '+eff.payMinPower);
      costL11={via:eff.payAttr2||eff.payAlign,power:eff.payMinPower,groups:pickedL11.map(function(g){return g.name;})};
      pickedL11.forEach(function(g){spendL11.push(g.uid);});
    }
  }else if(eff.payAttr){
    /* 309 Media Blitz: "must spend an action by a Media group". */
    var anL11=firstUsableAid(pid,function(cL11,nL11){return hasAttr(cL11,eff.payAttr,nL11);});
    if(!anL11)throw new Error(ec.name+': necesitas la accion de un grupo tuyo con el atributo '+eff.payAttr);
    costL11={via:eff.payAttr,groups:[anL11.name]};
    spendL11.push(anL11.uid);
  }else if(eff.payAnyGroup){
    /* 287 Imposter. P1-070: el texto dice "an action from one group with an
     * alignment IN COMMON with the Personality", pero las Personalities SON los
     * Illuminati y el reglamento oficial dice que NUNCA tienen alineaciones ni
     * atributos (glosario; mismo sitio que P1-032). La clausula "en comun" se
     * queda pues SIN REFERENTE en el modelo de datos: implementarla literalmente
     * la dejaria IMPAGABLE (la clase exacta de P1-050, pero detectada por la
     * regresion y no leyendo el codigo). Se paga con la accion de cualquier grupo
     * propio y la limitacion queda DECLARADA en el audit en vez de dejar una
     * clausula muerta. Si algun dia el catalogo modela las alineaciones de las
     * Personalities, este gate puede volverse estricto sin cambiar la carta. */
    var anG=null;
    walk(pl.structure,function(n){
      if(anG||!(n.tokens>=1)||noTokensFlag(n))return;
      var nc=card(n.cardId);
      if(nc&&nc.type==='group')anG={uid:n.uid,name:nc.name,align:null};
    });
    if(!anG)throw new Error(ec.name+': necesitas la accion de un grupo tuyo');
    costL11={via:'any-group',groups:[anG.name]};
    spendL11.push(anG.uid);
  }
  /* --- 4. MUTAR (todo validado): primero el coste --- */
  spendL11.forEach(function(uL11){spendGroupToken(pid,uL11);});
  if(costL11.via==='illuminati')pl.illumTokens--;
  /* --- 5. el duplicado entra en juego (placeUnder ya lo quita de la mano) --- */
  var nd=placeUnder(pid,dupIdx,parentUid);
  nd.isDuplicate=true;
  nd.dupOfCardId=dupIdx;
  /* --- 6. la habilitadora es un Plot jugado: al descarte --- */
  removeFromHand(pl,enablerIdx);
  S.plotDiscard.push(enablerIdx);
  /* --- 7. DES-CONTAR el original de quien lo destruyo (el efecto comun a las 4) --- */
  var oq=S.players[plan.ownerPid];
  var kd=oq.destroyedByMe.indexOf(dupIdx);
  if(kd>=0)oq.destroyedByMe.splice(kd,1);
  if(plan.assassinated){
    var ka=(oq.assassinatedBy||[]).indexOf(dupIdx);
    if(ka>=0)oq.assassinatedBy.splice(ka,1);
  }
  log(pl.name+' juega '+dc.name+' como DUPLICADO con '+ec.name+
      ' ('+(needAss?'asesinado':'destruido')+' por '+plan.ownerName+'): ya no cuenta como destruido');
  var out=publicState();
  out.lastPlotResult={ok:true,plot:ec.name,duplicate:dc.name,cost:costL11,
    releasedFrom:plan.ownerName,releasedFromPid:plan.ownerPid,assassinated:plan.assassinated};
  return out;
};

E.autoTakeover=function(pid,handIdx,parentUid){
  requireOwnMain(pid);
  var pl=S.players[pid];
  if(pl.flags.autoTakeoverBlocked)throw new Error('No puedes hacer un takeover automático: un rival lo ha anulado este turno');
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
  /* L6 — 210 Botched Contact / 359 Sabotage. El grupo YA esta en la mesa, asi que
     "He must return that Group to his hand" tiene sentido. NO se engancha en un
     takeover fallido: en este motor un takeover fallido lanza y la carta se queda
     en la mano del rival, de modo que devolverla seria un no-op (el mismo motivo
     por el que 412 Vultures quedo bloqueada en §38.5). `aligns` viaja en `data`
     porque 359 exige que el grupo que paga COMPARTA alineacion con este grupo, y
     el nodo puede desaparecer antes de que la ventana se cierre. */
  openEventWindow({kind:'autoTakeover',byPid:pid,label:'takeover automatico de '+c.name,
    data:{nodeUid:nd.uid,cardIdx:handIdx,aligns:nodeAligns(nd,c).slice(),
          returnedBy:null,blocked:null}});
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
  /* L8b — 233/367 pasan a ser `case` REALES (antes esta cadena era if/else): el gate
   * de FASE 4 detecta las ramas con /case\s+'([a-z0-9_]+)'\s*:/ sobre TODO el motor,
   * asi que un `else if` para un Resource con mecanica verificada haria que el gate
   * viera una carta clasificada cuya rama "no existe" y tirara la suite.
   * Kind `draw_hook`: colocar el Resource NO hace nada visible; lo que hace es
   * REGISTRAR el gancho en la entrada que se va a enlazar. El efecto se vera en el
   * proximo robo (ver deferDrawForHook). El registro va despues del `push` para
   * poder dejar la referencia en la MISMA entrada. */
  switch(resFx){
    case 'bulk_power': applyBulkPower(pid, c, c.effect); break;
    case 'draw_hook': break;
    case 'resource_effect':{
      /* L12 - 378 Suicide Squad y 413 Warehouse 23 son Resource cards: colocar la carta NO
       * ejecuta su efecto. 378 dice 'Can be used to...', o sea que se USA despues, y 413
       * solo acumula. Aqui solo se VALIDA el modo y nada mas; el registro de la capacidad
       * va DESPUES del push, en la misma entrada, igual que hace draw_hook con su gancho.
       * 236/348/400 son Plot cards y NO pasan por aqui. */
      if(c.effect.mode!=='warehouse'&&c.effect.mode!=='suicide_squad')
        throw new Error(c.name+': un Resource no puede llevar el modo '+String(c.effect.mode)+' (esa mecanica es de una Plot card)');
      break;
    }
    case 'disaster_defence':{
      /* L13 - 245 Earthquake Projector es la UNICA de las 5 que es Resource card.
       * Colocarla NO ejecuta nada: su "+2 al Poder" se activa cuando el jugador USA
       * el device (una vez por turno, segun el impreso), asi que aqui solo se VALIDA
       * el modo y el registro de la capacidad va DESPUES del push, igual que 378/413. */
      if(c.effect.mode!=='boost_attack')
        throw new Error(c.name+': un Resource no puede llevar el modo '+String(c.effect.mode)+' (esa mecanica es de una Plot card)');
      break;
    }
    case 'res_attack_bonus':{
      /* L23 - las 3 cartas de esta familia (Mercenaries, Spear of Longinus, The
       * Library at Alexandria). Colocar el Resource NO ejecuta nada: su capacidad
       * se activa cuando el jugador USA su ACCION mientras un ataque ya esta
       * declarado, asi que aqui solo se VALIDA el modo (misma leccion que L13
       * Earthquake Projector y que el draw_hook de L12/L13). */
      var md23=String(c.effect.mode||'');
      if(md23!=='atk_type_bonus'&&md23!=='any_destroy'&&md23!=='target_attrs')
        throw new Error(c.name+': un Resource no puede llevar el modo '+md23+' (esa mecanica es de una Plot card)');
      break;
    }
    default: throw new Error('El Resource "' + c.name + '" tiene una mecanica (' + resFx + ') que E.playResource todavia no ejecuta');
  }
  pl.illumTokens--;pl.usedResourceThisTurn=true;
  removeFromHand(pl,handIdx);
  var link=linkedToUid||pl.illumId;
  var entry={uid:'r'+(S.uidCounter++),cardId:handIdx,linkedTo:link,tokens:0};
  if(resFx==='draw_hook')entry.drawHook={deck:c.effect.hook.deck,pick:c.effect.hook.pick||1,
                                          rest:c.effect.hook.rest||null,alt:c.effect.hook.alt||null};
  /* L12 - registro de la capacidad del Resource en la MISMA entrada recien empujada.
   * 413: stash es la lista de Resources escondidos bajo ella. 378: action es el gancho de
   * su ACCION (Can be used to destroy any Resource belonging to a rival), que consumira
   * E.useResDestroy con el mismo uid. Se declara DESPUES del push para poder dejar la
   * referencia en la MISMA entrada: es la leccion del propio draw_hook. */
  if (resFx==='resource_effect' && c.effect.mode==='warehouse'){
    entry.stash=[];
    log(c.name+' queda enlazada: puedes esconderle Resources nuevos bajo ella y exponerlos cuando quieras');
  }
  if (resFx==='resource_effect' && c.effect.mode==='suicide_squad'){
    entry.action={kind:'resource_effect',mode:'suicide_squad'};
    log(c.name+' queda enlazada: tiene una ACCION para destruir un Resource de un rival (tira 1d6)');
  }
  pl.resources.push(entry);
  /* L13 - 245 Earthquake Projector. Misma leccion del draw_hook y de L12: la
   * capacidad se registra DESPUES del push para poder dejar la referencia en la MISMA
   * entrada. Colocarla no ejecuta nada; su ACCION (+2 al Poder de cualquier ataque a
   * destruir o Disaster, una vez por turno) la consume E.useDisasterBoost. */
  if (resFx==='disaster_defence' && c.effect.mode==='boost_attack'){
    entry.action={kind:'disaster_defence',mode:'boost_attack'};
    log(c.name+' queda enlazada: usa su ACCION (una vez por turno) para +'+(c.effect.boostValue||0)+' al Poder de cualquier ataque a destruir o Disaster');
  }
  /* L23 - registro de la capacidad, DESPUES del push (misma leccion que L13 y que
   * el draw_hook de L12/L13: hay que poder dejar la referencia en la MISMA
   * entrada). Colocarlo no ejecuta nada; su ACCION la consume E.useAttackBonus. */
  if (resFx==='res_attack_bonus'){
    entry.action={kind:'res_attack_bonus',mode:c.effect.mode};
    log(c.name+' queda enlazada: usa su ACCION para dar un bonus al Poder de un ataque ya declarado');
  }
  log(pl.name+' juega el recurso '+c.name);
  if(resFx==='draw_hook')log(c.name+' queda enlazado: cambiara los proximos robos de '+pl.name);
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
/* L3b — UN SOLO predicado "este grupo no puede tener fichas de accion".
   418 World Hunger: "All Green groups lose their Action tokens and cannot get
   new ones". El predicado NO es una lista nueva: es la MISMA condicion que ya
   usaban `firstUsableAid` y TOKEN-GIFT, mas `noTokens`, que es lo unico que
   anade esta carta. Se centraliza aqui porque sus consumidores son cuatro y
   porque el cuarto (el reparto automatico de fichas de E.beginTurn) es facil de
   olvidar: si se olvidara, un grupo verde apagado recuperaria su ficha al
   comienzo del turno siguiente y la carta no duraria NADA. */
function noTokensFlag(n){
  return !!(n&&n.noTokens)||!!(n&&n.devastated)||!!(n&&n.paralyzed)||!!(n&&n.zapped)||!!(n&&n.actionStripped);
}
function spendGroupToken(pid,uid){
  var nd=findNode(uid);
  if(!nd)throw new Error('Grupo inexistente: '+uid);
  if(findOwnerPid(uid)!==pid)throw new Error('El grupo no te pertenece');
  if(noTokensFlag(nd))throw new Error(card(nd.cardId).name+' no puede gastar su Action token ahora mismo');
  if(!nd.tokens||nd.tokens<1)throw new Error('Sin Action token en '+card(nd.cardId).name);
  nd.tokens--;
  /* L3b — 234: "tripled for its NEXT ACTION". Gastar la ficha ES la accion, asi
     que aqui se consume el triple. Si no se hiciera, el x4/x3 de una carta de
     este tipo seria permanente, que es justo lo contrario de lo que dice. */
  if(nd.tripled)nd.tripled=null;
  /* L5c — 189 Albino Alligators, modo ACCION: "If used with an action, it must
     be played when that action is first declared, and counts only for that
     action". Gastar la ficha ES la accion, asi que aqui se consume, igual que
     el triple de 234. El modo DEFENSA no se toca: caduca por turno. */
  if(nd.timedBoost&&nd.timedBoost.mode==='action')nd.timedBoost=null;
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
  /* L5b — 255 Fear and Loathing: "Identical alignments NOW give +8 on any
     attempt to control, and -8 on any attempt to destroy. The reverse is true
     for opposed alignments." La regla oficial (inwo_rules_extracted.txt:487-493)
     es "+4 por identica / -4 por opuesta"; esta carta SUSTITUYE la magnitud 4
     por la que declare el estado, sin cambiar los signos. Por eso una sola
     variable leida del estado sirve para los DOS bucles, y el 4 deja de estar
     escrito a mano en ninguno. Sin S.alignRule el valor es 4: el comportamiento
     por defecto queda intacto. */
  var alignMag=(S.alignRule&&typeof S.alignRule.mag==='number')?S.alignRule.mag:4;
  if(alignMag!==4)det.notes.push('Regla de alineaciones alterada por '+S.alignRule.card+': +/-'+alignMag+' por alineacion');
  if(A.type==='control'){
    det.base=curPower(att);
    for(var i=0;i<attAligns.length;i++){ /* leader ±alignMag vs target aligns */
      if(tgtAligns.indexOf(attAligns[i])>=0)det.leaderMod+=alignMag;
      else{var isOpp=false;for(var j=0;j<tgtAligns.length;j++)if(isOpposite(attAligns[i],tgtAligns[j]))isOpp=true;
        if(isOpp)det.leaderMod-=alignMag;}
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
    /* L3b — 268 Good Polls: "the Power and Resistance ... is tripled, FOR
       DEFENSE ONLY". Aqui, en un ataque a CONTROL, la defensa es la
       Resistencia, asi que se triplica defenseBase. El flag se lee del NODO
       (n.defTriple), no de la carta, porque su duracion es la del grupo. */
    if(tNode&&tNode.defTriple&&tNode.defTriple.untilTurn>S.turn)det.defenseBase*=3;
    /* master-shared alignments +4 each (skip fanatic-vs-fanatic master).
       L2 / P1-028: la regla vive ahora en closenessDefenseBonus(), que ademas la
       reutilizan las nueve cartas de "force_align". Solo se aplica a ataques
       contra un objetivo de OTRO jugador (A.targetPid!=null ya lo garantiza).
       L3b — 355 Resistance is Useless!: "The target also gets no Resistance
       bonus from its masters alignments or special abilities", asi que este
       bloque se salta ENTERO. Lo que la carta CONSERVA son los +5/+10 de
       proximidad al Illuminati que rigen, que son `det.posBonus` de la linea
       siguiente (positionBonus) y no tocan nada aqui. */
    if(A.targetPid!=null&&!(tNode&&tNode.noMasterAlignDefense)){
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
      if(tgtAligns.indexOf(attAligns[k])>=0)det.leaderMod-=alignMag;
      else{for(var m=0;m<tgtAligns.length;m++)if(isOpposite(attAligns[k],tgtAligns[m]))det.leaderMod+=alignMag;}
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
    /* L3b — 268 Good Polls, segunda mitad: en un ataque a DESTRUIR el objetivo
       se defiende con su PODER (regla de §25, por eso `defenderPower` y no
       `nodeResistance`), asi que "el Poder y la Resistencia se triplican" se
       aplica aqui multiplicando defenseBase. Mismo flag, misma caducidad. */
    if(tNode&&tNode.defTriple&&tNode.defTriple.untilTurn>S.turn)det.defenseBase*=3;
    /* L5c — 189 Albino Alligators en modo DEFENSA: al defenderse de un ataque a
       DESTRUIR el objetivo usa su PODER, asi que aqui (y no en nodeResistance) es
       donde suma el "+10 Power". La rama de Resistencia ya la cubre
       nodeResistance(), que no necesita modo.
       OJO con la caducidad: "the bonus lasts UNTIL THE END of the current turn"
       deja `untilTurn = S.turn` (inclusivo), al contrario que 268 que dura hasta
       el principio del turno SIGUIENTE (`untilTurn = S.turn + jugadores`). Por eso
       la comprobacion es `<=`, no `>`: con `>` el bonus no se aplicaria nunca. */
    if(tNode&&tNode.timedBoost&&tNode.timedBoost.mode==='defense'&&tNode.timedBoost.stat==='power'&&typeof tNode.timedBoost.v==='number'&&tNode.timedBoost.untilTurn!=null&&S.turn<=tNode.timedBoost.untilTurn)det.defenseBase+=tNode.timedBoost.v;
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
  /* L3b — 234 Currency Speculation, cierre: "tripled for its next action OR
     DEFENSE". La defensa ya ha usado el triple en las lineas de arriba, asi que
     aqui se consume. Y SOLO cuando `resolveMode` es cierto: `E.previewStrength`
     llama a esta misma funcion para ENSEÑAR numeros, y una vista previa no
     puede gastar el efecto de una carta. Es el mismo motivo por el que el
     triple se apaga en spendGroupToken y no en el sitio donde se calcula. */
  if(resolveMode&&A&&!A.neutralTarget&&!A.handTarget&&tNode&&tNode.tripled){
    det.notes.push('El triple de '+card(tNode.cardId).name+' se consume al defenderse');
    tNode.tripled=null;
  }
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
/* L6 anade un tercer tipo de suceso: `autoTakeover` (210 Botched Contact y 359
   Sabotage). `eventReactionAllowed` RECHAZA por defecto todo kind que no este en
   esta lista, asi que un kind nuevo que responda a un suceso tiene que registrarse
   aqui o su rama nunca se alcanzaria (el mismo defecto de clase "el dato existe
   pero vive en otro sitio" que P1-026 y P1-031). 278 Hex y 259 Foiled! NO entran:
   no responden a un suceso abierto, se juegan directamente. */
var EVENT_KINDS=['stealing_the_plans','embezzlement','takeover_return'];

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
  if(ev.kind==='autoTakeover'){
    if(eff.kind!=='takeover_return')return {ok:false,why:'solo reacciona a que otro jugador haga un takeover automatico'};
    if(ev.data&&ev.data.returnedBy)return {ok:false,why:'ese takeover ya fue anulado'};
    /* L6 — el COSTE se comprueba AQUI, en seco, y se PAGA en el case: asi la
       ventana puede seguir abierta para otro jugador que si pueda pagarlo. Es el
       mismo criterio que el pago de Embezzlement ("necesitas al menos una Plot
       en tu mano"), y la razon de no cobrar aqui es la misma: comprobar NO es
       gastar, y si se gastara al abrir la ventana el primer jugador que pudiera
       responder se quedaria sinResources ajenos. */
    var plR=S.players[pid];
    if(eff.payAnyGroup){
      if(!firstUsableAid(pid,function(){return true;}))
        return {ok:false,why:'necesitas la accion de uno de tus grupos'};
      return {ok:true};
    }
    if(typeof eff.payPower==='number'){
      if(plR.illumTokens<1){
        var needR=eff.payPower,gotR=0,shR=false,okR=false;
        var alR=(ev.data&&ev.data.aligns)||[];
        walk(plR.structure,function(n){
          if(okR||n===plR.structure)return;
          if(!n.tokens||noTokensFlag(n))return;
          var ccR=card(n.cardId);if(!ccR)return;
          if(eff.payShareAlign){
            var naR=nodeAligns(n,ccR);
            for(var aiR=0;aiR<naR.length;aiR++)if(alR.indexOf(naR[aiR])>=0)shR=true;
          }
          gotR+=curPower(n);
          if(gotR>=needR)okR=true;
        });
        if(!okR||(eff.payShareAlign&&!shR))
          return {ok:false,why:'necesitas tu Illuminati o '+needR+' de Poder de grupos, uno de los cuales comparta alineacion con el grupo del takeover'};
      }
      return {ok:true};
    }
    return {ok:false,why:'el coste de esta carta no esta declarado'};
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
      /* P1-060 — rollback del EMBEZZLEMENT. `pop()` quitaba "la ultima carta de la
       * mano", que hoy ES `ixQ` solo por casualidad posicional: lo unico que se
       * empujo a esa mano fue la linea 2239. Es la MISMA clase que P1-059 (un
       * indice de mano asumido en lugar de la identidad) y el barrido §58 lo
       * dejo como la ultima fragilidad viva del patron. Si alguna vez se abre
       * una ventana de reaccion entre el push y el pop, `pop()` se llevaria una
       * carta DISTINTA y `ixQ` quedaria duplicada en dos manos. Por identidad. */
      var ixBack=S.players[P.claimedTo].hand.indexOf(ixQ);
      if(ixBack>=0)S.players[P.claimedTo].hand.splice(ixBack,1);
      res={ok:false,reason:'no quedo una Plot propia para descartar'};
      }else{
        hp.splice(at3,1);
        S.plotDiscard.push(pay);
        log(card(pay).name+' se descarta como pago de EMBEZZLEMENT');
        res={ok:true,stolen:card(ixQ).name,paid:card(pay).name};
      }
    }
  }
  /* L6 — 210 BOTCHED CONTACT / 359 SABOTAGE: el grupo vuelve a la mano de quien lo
     puso. Se busca el NODO (no el indice) porque `d.nodeUid` es lo unico que sigue
     siendo valido aunque el jugador haya movido cosas entre.medias; y se busca al
     CERRAR la ventana, que es cuando el grupo ya esta en la mesa. */
  if(d.returnedBy!=null){
    var ndR=findNode(d.nodeUid);
    if(!ndR){
      log('L6: el grupo del takeover ya no esta en la mesa');
      res={ok:false,reason:'el grupo ya no esta en juego'};
    }else{
      var pcR=card(ndR.cardId);
      var parR=findNodeThatHas(S.players[P.byPid].structure,d.nodeUid);
      detach(parR,d.nodeUid);
      S.players[P.byPid].hand.push(ndR.cardId);
      if(d.blocked)S.players[P.byPid].flags.autoTakeoverBlocked=true;
      log((d.blocked?'SABOTAGE: ':'BOTCHED CONTACT: ')+pcR.name+' vuelve a la mano de '+
          S.players[P.byPid].name+(d.blocked?' y no podra hacer otro takeover automatico este turno':' (puede elegir otra carta)'));
      res={ok:true,returned:pcR.name,to:S.players[P.byPid].name,blocked:!!d.blocked};
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
/* L20 (P1-120) - `opts.noCountAsDestroyed`. 408 Upheaval! imprime "These do not
   * count as destroyed for anyones victory conditions", asi que el grupo sale de la
   * mesa por la MISMA via que un destruido (tirteres a la mano, Plots linkeados al
   * mazo, Resources linkeados descartados, carta al descarte de Groups) pero SIN
   * escribir en los tres sitios donde vive la contabilidad de destruccion:
   *   (1) `byPid.destroyedByMe` - la cuenta de quien lo destruyo (la leen las metas
   *       de L15 `Destroy N <alineacion>`, el `destroy_reduce` de Servants of
   *       Cthulhu y el overlay retroactivo de 357);
   *   (2) `byPid.destroyedIlluminati` - la meta Fratricide;
   *   (3) el robo de Plot de Servants of Cthulhu ("whenever you DESTROY a group").
   * Se mete como opcion y no como funcion aparte para que retirar un grupo de la mesa
   * siga teniendo UN solo sitio: dos copias divergen (precedente P1-014 / P1-115).
   * Con `noCountAsDestroyed` los 3 caminos quedan intactos. */
function destroyGroup(byPid,targetUid,opts){
  var noCount=!!(opts&&opts.noCountAsDestroyed);
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
  if(!noCount)S.players[byPid].destroyedByMe.push(node.cardId);
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
  if(!noCount&&S.players[owner].structure.children.length===0){
    var rec=S.players[byPid].destroyedIlluminati;
    if(rec.indexOf(owner)<0){
      rec.push(owner);
      log('Illuminati de '+S.players[owner].name+' destruido (ya no tiene títeres)');
    }
  }
  log(noCount?('DESCARTADO (no cuenta como destruido): '+c.name+'. Títeres vuelven a la mano de '+S.players[owner].name)
            :('DESTRUIDO: '+c.name+' (por '+S.players[byPid].name+'). Títeres vuelven a la mano de '+S.players[owner].name));
  /* P1-009: Servants of Cthulhu — "Draw a Plot card whenever you destroy a
     group!" El robo de Plot es interno (no consume la acción del turno), así que
     se replica el mismo drawFrom() que usa drawPlot() sin tocar flags.plotDrawn. */
  if(!noCount&&illuEff(byPid).drawPlotOnDestroy){
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
   sólo tras validar TODOS los movimientos).
   L19 (P1-115): el CUERPO de esta función se extrajo a applyStructureMoves() para
   que 354 Reorganization (kind 'structure_reorg') use EXACTAMENTE la misma
   validación y el mismo desmontaje, en vez de una segunda copia que pueda
   divergir. Precedente: P1-014 centralizó enforceGoalHandLimit exactamente por
   esto (dos copias del mismo código divergieron y el bug se coló). El
   comportamiento de E.organize NO cambia: mismo orden de validación, mismos
   mensajes de error, mismos cortes.
   El único parámetro nuevo es `prefix`, que es el nombre de la carta en el mensaje
   de "indica al menos un movimiento": E.organize no tiene carta (es un poder de
   facción) y 354 sí, así que el mensaje tiene que nombrar la carta. */
function applyStructureMoves(pid,moves,prefix){
  if(!Array.isArray(moves)||!moves.length)throw new Error(prefix+': indica al menos un movimiento');
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
}
E.organize=function(pid,moves){
  requireOwnMain(pid);
  if(!illuEff(pid).organizeAtEndOfTurn)
    throw new Error('Tu facción no puede reorganizar la estructura');
  applyStructureMoves(pid,moves,'Reorganización');
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
  /* P1-127: sin este return false TEMPRANO la perdida de atributo no tendria efecto:
   * la carta sigue IMPRIMIENDO el atributo, asi que el fallback de abajo (la lista
   * impresa de la carta) lo devolveria como presente y 253 Exposed! no haria nada.
   * El nodo manda sobre la carta. */
  if(node&&Array.isArray(node.attrsRemoved)){
    for(var rm=0;rm<node.attrsRemoved.length;rm++){
      if(String(node.attrsRemoved[rm]).toLowerCase()!==t)continue;
      var readd=false;
      if(node&&Array.isArray(node.attrsAdded))
        for(var ra=0;ra<node.attrsAdded.length;ra++)
          if(String(node.attrsAdded[ra]).toLowerCase()===t){readd=true;break;}
      if(!readd)return false;
    }
  }
  if(node&&nodeAttrs(node,c).some(function(a){return String(a).toLowerCase()===t;}))return true;
  return attrList(c).some(function(a){return String(a).toLowerCase()===t;});
}
/* P1-055 — unica lectura del atributo que backs "debes gastar la acción de un grupo
 * tuyo con el atributo X". Existian DOS campos casi identicos con consumidores
 * separados: `requireActionFromAttr` (gate generico en computeStrength y
 * turn_start_block) y `requiresActionFromAttr` (res_nullify, attack_boost,
 * force_discard_exposed). Cinco cartas declaraban uno y su kind leia el otro sin
 * que nada lo comprobara: el coste se volvia gratis EN SILENCIO, que es la clase
 * exacta de P1-054. Ahora los datos declaran solo la forma canonica
 * (`requireActionFromAttr`, que es la que usa gen_cards.js y su guard
 * ACTION_COST_KINDS) y TODOS los gates leen por aqui. El alias se acepta a proposito:
 * si alguien reintroduce la ortografia retirada, el coste se cobra igual de duro y
 * el generador se niega a emitir el catálogo, en vez de dejar pasar una carta gratis.
 * El atributo se lee SIEMPRE en el plano de ATRIBUTOS via hasAttr — nunca en
 * `.alignments` (P1-018). */
function actionCostAttr(eff){
  return (eff&&(eff.requireActionFromAttr||eff.requiresActionFromAttr))||null;
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
    /* `noTokensFlag` NO incluye "no tiene fichas": los dos repartidores de
       fichas (TOKEN-GIFT y el de E.beginTurn) lo consultan justamente para
       DARLAS, asi que el predicado es solo "no puede tenerlas". Aqui, que se
       busca un grupo que GASTE una ficha, el "sin ficha" sigue siendo
       obligatorio y va delante. */
    if(!n.tokens||noTokensFlag(n))return;
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

  var needActAttr=actionCostAttr(eff);
  if(needActAttr){
    var an=opts.aidUid?findNode(opts.aidUid):null;
    if(opts.aidUid&&(!an||findOwnerPid(opts.aidUid)!==pid))
      throw new Error('El grupo que aporta la acción debe ser tuyo');
    if(!an)an=firstUsableAid(pid,function(c,n){return hasAttr(c,needActAttr,n);});
    if(!an)throw new Error(pc.name+' necesita un grupo tuyo con acción de tipo '+needActAttr);
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
  /* L13 - 244 Earth Magic deja constancia en el registro de que la restriccion esta
   * activa, para que el jugador vea POR QUE un grupo no se opuso al Disaster. */
  if(nd.magicMayOppose&&eff.victimMayBeAided&&victim>=0)
    notes.push('solo los grupos '+nd.magicMayOppose.attr+' pueden oponerse ('+(nd.magicMayOppose.byCard!=null?card(nd.magicMayOppose.byCard).name:'la carta que lo restringe')+')');
  if(eff.victimMayBeAided&&victim>=0){
    var vn=firstUsableAid(victim,nd.magicMayOppose?function(cc,nn){return hasAttr(cc,nd.magicMayOppose.attr,nn);}:null);
    if(vn){spendGroupToken(victim,vn.uid);var vp=curPower(vn);defPower+=vp;notes.push(card(vn.cardId).name+' se defiende (+'+vp+')');}
  }
  /* P1-009: Shangri-La — "+5 to defend against ANY attack". Los Instant Attacks
     también cuentan como ataque. */
  var sdb=victim>=0?illuDefenseBonus(victim):0;
  if(sdb){defPower+=sdb;notes.push('+'+sdb+' de defensa de '+illuCard(victim).name);}

  var pos=(victim>=0)?positionBonus(victim,tUid):0;
  /* L13 - 188 Air Magic: "The Power of the Place is tripled for this one defense".
   * El x3 se aplica a defPower, NO a curPower: por eso no afecta ni a las metas
   * (countsForGoals) ni al Poder del grupo para nada que no sea esta defensa, que es
   * exactamente lo que dice el impreso. Las excepciones se comparan contra el NOMBRE
   * del Disaster normalizado (misma forma que el filtro de altUse.targetNames,
   * L4252-4254, y por el mismo motivo P1-020: el dataset no guarda nombres legibles
   * para esas dos cartas, solo su clave). Si el Place tiene el flag pero el Disaster
   * es de la lista, NO se multiplica y se dice por que en el registro. */
  if(nd.defenseTripled){
    var tpk=String(pc.name).toLowerCase().replace(/[^a-z0-9]/g,'');
    var tex=nd.defenseTripled.except||[];
    var tnm=nd.defenseTripled.byCard!=null?card(nd.defenseTripled.byCard).name:'Air Magic';
    if(tex.indexOf(tpk)>=0){
      notes.push(tnm+' NO protege de '+pc.name+': el impreso excluye ese Disaster');
    }else{
      defPower=defPower*3;
      notes.push('defensa x3 por '+tnm+' (Poder de defensa de '+tc.name+': '+defPower+')');
    }
  }
  /* L13 - 245 Earthquake Projector: "increase the Power of any Attack to Destroy a
   * Place, or of any Disaster card, by 2". Se suma al PODER DEL ATAQUE (power), no a la
   * defensa, y solo si el device se ha USADO este turno (usedThisTurn, que lo
   * resetea E.beginTurn). El alcance es GLOBAL mientras el device este en juego porque
   * el impreso no dice "your": por eso recorre los Resources de TODOS los jugadores y
   * no solo los del que anuncia el ataque. */
  for(var qB=0;qB<S.players.length;qB++){
    var rsB=S.players[qB].resources||[];
    for(var rB=0;rB<rsB.length;rB++){
      var eB=rsB[rB];
      if(!eB.usedThisTurn||!eB.action||eB.action.kind!=='disaster_defence'||eB.action.mode!=='boost_attack')continue;
      var bE=card(eB.cardId).effect||{};
      var bv=typeof bE.boostValue==='number'?bE.boostValue:2;
      power+=bv;
      notes.push('+'+bv+' de '+card(eB.cardId).name+' (usado este turno)');
    }
  }
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
    /* L11: aqui `eff.kind==='assassination'` es el CRITERIO AUTORITATIVO de que la
     * destruccion fue un asesinato (no el nombre del grupo destino, ni el tipo de
     * ataque). destroyGroup(2681) empuja a destroyedByMe sin decir como; este es el
     * UNICO sitio fiable para marcar el registro paralelo. */
    var ndAssaL11=findNode(ann.tUid);
    destroyGroup(ann.pid,ann.tUid);
    if(eff.kind==='assassination'&&ndAssaL11&&ndAssaL11.cardId!=null)
      S.players[ann.pid].assassinatedBy.push(ndAssaL11.cardId);
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
          if (nodeAligns(n, gc).indexOf(bAl) < 0) {
            n.alignsAdded.push(bAl);
            /* L21: una alineacion anadida va como texto pelado, sin etiqueta de
             * carta, asi que `undoNwoOfColor21` no la podria filtrar por nombre.
             * Para las NWO se registra aqui que nodos toco esta clausula. */
            if (c.nwoColor) {
              if (!S.nwoBecome) S.nwoBecome = {};
              if (!S.nwoBecome[c.name]) S.nwoBecome[c.name] = [];
              S.nwoBecome[c.name].push({ pid: qi, uid: n.uid, align: bAl });
            }
          }        }
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
  ||eff0.kind==='force_align'||eff0.kind==='bulk_power'
  /* L3b — 268 y 234 imprimen "Play this card at any time" / "Use this card at
     any time", asi que se pueden jugar fuera de turno. 418 y 355 NO se anaden:
     355 cobra la accion de un grupo Media (es el turno de quien lo juega) y 418
     no imprime "at any time" en ningun sitio. */
  ||eff0.kind==='def_triple'||eff0.kind==='tripled_once'||eff0.kind==='attack_boost'||eff0.kind==='group_boost_timed'
  /* L6: las tres cartas nuevas de "negar un suceso" se juegan FUERA del turno de
     quien las juega, y las tres lo dicen o lo implican:
       - 210 Botched Contact y 359 Sabotage las juega un RIVAL en la ventana que
         abre el takeover automatico, asi que su jugador no es el del turno;
       - 278 Hex imprime "Play this card at any time except during a privileged
         attack" (el veto se comprueba DENTRO de su case, igual que el de 346);
       - 259 Foiled! imprime "This card may be used at any time".
     Nota: `takeover_return` va ademas dentro de EVENT_KINDS (mas abajo), porque
     `eventReactionAllowed` empieza rechazando todo kind que no este en esa lista;
     sin anadirlo aqui la rama nueva que ya existe nunca se alcanzaria. Es el mismo
     motivo por el que se comparan KINDS y no listas de ids de carta. */
  ||eff0.kind==='takeover_return'||eff0.kind==='resource_destroy'||eff0.kind==='force_discard_exposed'||PEEK_KINDS.indexOf(eff0.kind)>=0
  /* L8a: 361 (deck_manip) imprime "Play this card at any time", asi que se juega
     fuera de turno gastando una ficha de grupo YA colocada ("using this card is an
     action for one group"). 388 y 411 tienen el MISMO kind pero imprimen "during
     your OWN turn", asi que NO pueden entrar a pelo en esta lista: por eso la
     condicion mira `eff0.anyTime` y no el kind. Sin ese matiz las dos ownTurn
     quedarian jugables en el turno de cualquiera (defecto de clase "el dato existe
     pero se comparo contra la etiqueta equivocada"). */
  ||(eff0.kind==='deck_manip'&&!!eff0.anyTime)
  /* L8c — 405 Unlucky 13: "Play this card on a rival at the very beginning of his
   * turn". El timing ES la ventana (S.pendingTurnStart) y lo valida su case. Sin
   * esta puerta requireOwnMain la rechazaria SIEMPRE: durante la ventana la fase
   * es 'begin', no 'main' (P1-047). */
  /* L12: 236 Deasil Engine, 348 Purge y 400 The Weak Link imprimen 'Play this card at
   * any time' (400 anade 'except during a privileged attack', cuyo veto se comprueba
   * DENTRO de su case, igual que el de 278 Hex). Se comparan contra el KIND, no contra
   * ids de carta, por el criterio que ya explican los comentarios de L1/L2/L8a.
   * 413 Warehouse 23 es un Resource y no pasa por aqui. */
  ||eff0.kind==='resource_effect'
  /* P1-101 (L14.e): 364 Seize the Time! comparte ventana con 405 Unlucky 13 y por eso
     * tiene que estar aqui igual que el. `instant` en esta lista NO significa "se puede
     * jugar a cualquier hora": significa "esta carta NO requiere turno propio". Durante
     * la ventana pendingTurnStart, E.endTurn ya ha movido currentPid al rival que va a
     * empezar, asi que requireOwnMain(actor) lanzaria "No es tu turno" y la carta seria
     * INJUGABLE. El timing real lo valida su case (ventana abierta + forPid distinto del
     * actor), no esta lista. L14.c razono al reves y por eso el bug solo se vio al medir. */
  ||eff0.kind==='turn_control'||eff0.kind==='turn_start_block'
  /* L20: 408 Upheaval! imprime "This card may be played at any time" - un "at any
   * time" DE VERDAD, sin "during your own turn". Entra en `instant` y por eso se
   * juega tambien en el turno del rival: el veto de turno propio NO se aplica. */
  ||eff0.kind==='global_discard'||eff0.kind==='nwo_discard_one'||eff0.kind==='nwo_discard_all'||eff0.kind==='secret_expose'
  /* L21: las cartas New World Order "can be played at any time except during an
   * Instant or Privileged Attack" (inwo_rules_extracted.txt:767-769). Las 7 de
   * `bulk_power` ya estaban en `instant` desde L2 (engine.js:3970), pero 255 Fear and
   * Loathing (`align_rule`) y 288 World Hunger (`token_wither`) NO, asi que solo se
   * podian jugar en el turno de su dueno: el mazo permittingia 2 de sus 9 NWO fuera
   * de la regla. El veto de "except during an Instant or Privileged Attack" NO se anade
   * aqui a proposito: `instant` en este motor significa "se puede jugar con un ataque
   * abierto", que es justo lo que el reglamento permite para el resto de las cartas
   * que dicen "at any time" (P1-015 distingue las que dicen EXCEPT during an attack,
   * como 362 Scandal, que brings su propio veto). */
  ||eff0.kind==='align_rule'||eff0.kind==='token_wither');
  if(instant){
    if(S.phase==='setup')throw new Error('No se pueden jugar Plot cards durante la preparación');
    if(S.phase==='gameover')throw new Error('La partida ha terminado');
  }else{
    requireOwnMain(pid);
  }
  var pl=S.players[pid];
  var i=pl.hand.indexOf(handIdx);
  /* P1-126 (L18): `handIdx` es un indice de CATALOGO, asi que 2 copias de la MISMA
   * carta comparten valor. Antes del switch se cuenta cuantas hay en mano; la cola
   * P1-012 de abajo solo borra si el efecto NO se llevo ya una copia (si se la
   * llevo, el conteo baja y no hay que compensar a mano el borrado de otro). Sin
   * esto, jugar una carta teniendo 2 copias gastaba LAS DOS (lo detecto el veto de
   * duplicados de 298/299, y el impreso de esas cartas presupone duplicados). */
  var handCountP1=0;
  for(var qP1=0;qP1<pl.hand.length;qP1++){ if(pl.hand[qP1]===handIdx)handCountP1++; }
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
  /* L21 — REGLA DE LAS NWO, PRE-HOOK. Va DESPUES de toda la validacion de la
   * cabecera y ANTES del switch de efectos, por el mismo motivo que P1-033: si la
   * carta se rechaza, no se ha deshecho nada. Las Goal cards quedan fuera porque
   * `case 'goal'` las rechaza ("no se juega, se revela al declarar victoria"): no
   * son un "Esquema Malvado en vigor" sino una condicion de victoria, asi que la
   * regla por color no les aplica (declarado en el audit, seccion 72). */
  var nwoMark21=null,nwoUndone21=null,nwoPrevRule21=null;
  if(c.nwoColor&&eff0.kind!=='goal'){
    if(!S.nwoInForce)S.nwoInForce={};
    nwoPrevRule21=S.alignRule||null;
    nwoMark21={color:c.nwoColor};
  }

  /* ------------------------------------------------------------------ *
   * L22 — la ventana de NEGACION se abre aqui, ANTES del switch de efectos.
   * Motivo: el Plot se anuncia pero su efecto y su coste NO se aplican hasta
   * que la ventana se resuelve. Si se abriera despues, el coste ya estaria
   * pagado y "That card has no effect" seria falsa.
   * Condiciones de apertura: la Plot NO es ella misma una carta de negacion
   * (el impreso dice "any OTHER Plot card"), NO es una Goal card (que no se
   * juega, se revela), no hay ya una negacion pendiente, y NADIE tiene en la
   * mano una carta de negacion aplicable (mismo criterio que openEventWindow). */
  if(!opts.noNegWindow&&!isNegationKind(eff)&&eff.kind!=='goal'&&S.pendingNegation)
    throw new Error('Hay una Plot esperando posible negacion ('+S.pendingNegation.cardName+' de '+S.players[S.pendingNegation.pid].name+
      '): primero hay que resolver esa ventana. "That card has no effect" significa que la Plot anulada no se juega nunca.');
  if(!opts.noNegWindow&&!isNegationKind(eff)&&eff.kind!=='goal'){
    var negs22=[];
    for(var p22=0;p22<S.players.length;p22++){
      var h22=S.players[p22].hand;
      for(var j22=0;j22<h22.length;j22++){
        var e22=(C.cards[h22[j22]]||{}).effect;
        if(!isNegationKind(e22))continue;
        var ok22=negationAllowed(e22,p22,{pid:pid,handIdx:handIdx});
        if(!ok22.ok)continue;
        negs22.push({pid:p22,name:S.players[p22].name,cardIdx:h22[j22],cardName:C.cards[h22[j22]].name,
          via:negationWayLabel(e22,ok22.via)});
      }
    }
    if(negs22.length){
      S.pendingNegation={pid:pid,handIdx:handIdx,
        targetUid:targetUid!=null?targetUid:(opts&&opts.targetUid),
        opts:opts||{},cardName:c.name,cardKind:eff.kind,negs:negs22};
      log('VENTANA DE NEGACION ABIERTA: '+c.name+' (de '+S.players[pid].name+') puede ser anulada por: '
        +negs22.map(function(x){return x.cardName+' ('+x.name+')';}).join(', '));
      var outN22=publicState();
      outN22.lastPlotResult={ok:null,pending:true,negatable:true,card:c.name,kind:eff.kind,
        negators:negs22.map(function(x){return x.cardName;})};
      return outN22;
    }
  }
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
    case 'link_effect':{
      /* P1-067 (L10) — 310 Media Connections y 280 Hidden Influence. Los dos
       * mecanismos que "inventaba" el lote YA EXISTEN y por eso este case es
       * corto: (a) el link ya es `linkedPlots` (L452, proyeccion L711, y lo
       * escriben 7 cartas permanentes desde Power Increase); (b) anadir atributo
       * a un nodo ya es `node.attrsAdded` (engine.js:406-417, se lee con
       * `hasAttr(card,attr,node)`). LO UNICO que no existia es "Global Power
       * igual a su Poder regular", y se resolvio en el sitio correcto: un
       * termino mas en `countsForGoals` (engine.js:144), que es el gate unico de
       * "este grupo cuenta para las metas" — los 7 consumidores pasan por ahi.
       *
       * Textos verbatim:
       *   310 "The group of your choice becomes a Media group, if it was not
       *        already one, with Global Power equal to its regular Power. Link
       *        this card to the [X]. This requires action(s) from Media group(s)
       *        with a total Power of 6 or more. It may be played at any time.
       *        Requires Media Action"
       *   280 "The group of your choice now has Global Power equal to its
       *        regular Power, Link this card to the [X]. This requires an action
       *        from your Illuminati. It may be played at any time. Requires
       *        Illuminati Action"
       * => (a) el objetivo es TU grupo ("your chosen group"); (b) el link es
       * PERMANENTE, asi que la carta va a linkedPlots y no al descarte
       * (inwo_rules_extracted.txt:819-847); (c) 310 es idempotente respecto al
       * atributo ("if it was not already one"), pero el link NO: aunque el
       * atributo ya estuviera, la carta se linkea y el grupo pierde Global Power
       * — por eso el no-op oficial de Power Increase ("no effect on a Group that
       * already has...") NO se aplica aqui, porque su precondicion es sobre el
       * Poder, no sobre el atributo; (d) "at any time" => las dos se declaran
       * `instant` en gen_cards.js y NO pasan por requireOwnMain.
       * Los costes son disjuntivos/asimetricos y cada uno con su precedente:
       * 280 = `illumTokens--` (mismo patron que 386 The Auditor from Hell), y
       * 310 = "action(s) from Media group(s) with a total Power of 6 or more"
       * => el mismo esquema de DOS PASADAS que se escribio para 357 en L9: el
       * walk REUNE sin gastar y solo se paga al completar, porque si gather y
       * pay se mezclan se gastan fichas y luego se lanza (es exactamente el
       * defecto que `force_align` todavia tiene). */
      var ndL10=targetUid?findNode(targetUid):null;
      if(!ndL10)throw new Error(c.name+': elige un grupo de tu estructura para linkear la carta');
      var tcL10=card(ndL10.cardId);
      if(tcL10.type!=='group')
        throw new Error(c.name+': el objetivo debe ser un Group, y '+tcL10.name+' es '+tcL10.type);
      if(findOwnerPid(targetUid)!==pid)
        throw new Error(c.name+': el grupo debe ser tuyo ("your chosen group")');
      /* P1-069 — el "no puede haber mas de una en juego" de `power_increase`
       * NO se copia aqui. Ese limite viene de una frase que la familia Power
       * Increase si imprime ("No player may have more than one {Name} in
       * play.") y que 310 y 280 NO tienen: sus textos verbatim no la contienen.
       * Copiarla dejaba 280 y 310 imposibles de jugar dos veces sin que su texto
       * lo dijera. Pasa a ser opt-in por declaracion (`onePerPlayer`) para que
       * el dato que decide el limite este en la carta y no en el kind. */
      if(eff.onePerPlayer&&pl.linkedPlots.some(function(lp){return lp.cardId===handIdx;}))
        throw new Error(c.name+': no puede haber mas de una en juego por jugador');
      /* --- COSTE, validado ANTES de mutar nada (leccion §54) --- */
      var paidL10=null;
      if(eff.payIllum){
        if(pl.illumTokens<1)
          throw new Error(c.name+': requiere la accion de tu Illuminati y no tienes ninguna ficha');
        paidL10={via:'illuminati'};
      }else if(eff.payAttr){
        var needL10=eff.payMinPower||6;
        var pickedL10=[];
        walk(pl.structure,function(nL10){
          if(needL10<=0)return;
          if(nL10.tokens<1)return;
          if(noTokensFlag(nL10))return;
          var cL10=card(nL10.cardId);
          if(!cL10||cL10.type!=='group')return;
          if(!hasAttr(cL10,eff.payAttr,nL10))return;
          pickedL10.push({uid:nL10.uid,name:cL10.name,power:curPower(nL10)});
          needL10-=curPower(nL10);
        });
        if(needL10>0)
          throw new Error(c.name+': tus grupos '+eff.payAttr+' sin ficha solo aportan Poder '+
            ((eff.payMinPower||6)-needL10)+' de los '+(eff.payMinPower||6)+' que exige la carta');
        paidL10={via:eff.payAttr,power:(eff.payMinPower||6),groups:pickedL10.map(function(g){return g.name;})};
      }
      /* --- MUTACION (todo ya validado) --- */
      if(eff.payIllum)pl.illumTokens--;
      else pickedL10.forEach(function(g){spendGroupToken(pid,g.uid);});
      if(eff.mode==='grant_attr'&&eff.grantAttr){
        /* P1-068 — `attrsAdded` NO viene inicializado en el nodo: la creacion de
         * nodos del propio motor (engine.js:1635) solo pone uid/cardId/children/
         * tokens, igual que mi fixture de test. Asumirlo array es lo mismo que
         * asumir que existe: TypeError al jugar la carta. Se inicializa aqui
         * (defensivo en la escritura), que es el patron que ya usan
         * `alignsAdded`/`alignsRemoved` en 3031-3032, 3478-3484 y 3534-3535.
         * Lo ha encontrado la sonda de L10 jugando 310 de verdad, no leyendo el
         * codigo: las 15 cartas que ya escriben attrsAdded lo hacen porque sus
         * kinds las declaraban y por eso inicializan, y 310 es la primera que lo
         * hace sin que nada lo inicializara antes. */
        if(!ndL10.attrsAdded)ndL10.attrsAdded=[];
        if(ndL10.attrsAdded.indexOf(eff.grantAttr)<0)ndL10.attrsAdded.push(eff.grantAttr);
        log(c.name+': '+tcL10.name+' ahora es un grupo '+eff.grantAttr);
      }
      if(eff.mode==='grant_attr'||eff.mode==='grant_global'){
        /* Global Power igual a su Poder regular = el grupo deja de contar para
         * las metas. NO se borra nada mas: es un flag, no una resta. */
        ndL10.globalNeutral=true;
        log(c.name+': '+tcL10.name+' pierde su Global Power (deja de contar para las metas)');
      }
      pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid});
      log(c.name+': la carta queda linkeada a '+tcL10.name+' de forma permanente');
      lastResult={ok:true,plot:c.name,linked:tcL10.name,targetUid:targetUid,
        grantAttr:(eff.grantAttr||null),globalNeutral:!!ndL10.globalNeutral,cost:paidL10};
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
        if(noTokensFlag(n))return;
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
    /* ===== L3b - LAS CUATRO CARTAS DE plan.md "L3b — APLAZADO" =====
       Cada una tiene su propio kind porque no comparten mecanica (criterio de
       plan.md §0.1). Las siete interpretaciones declaradas estan en el bloque
       L3B_FX de gen_cards.js; aqui solo se recuerda la que mas afecta al
       comportamiento: la caducidad NO se comprueba con un flag propio en cada
       caso, sino con `untilTurn` en el NODO y un unico vaciado en
       E.beginTurn (expireTurnFlags). */
    case 'def_triple':{
      /* 268 Good Polls — "Until the beginning of your next turn, the Power and
         Resistance for all your groups of ANY CHOSEN alignment is tripled, for
         defense only".
         La UI elige un NODO, no una alineacion (interpretacion 1): se apunta a
         cualquiera de los grupos propios de esa alineacion y se toma la PRIMERA
         de sus `nodeAligns`. El triple NO se aplica aqui: se escribe en el nodo
         de cada grupo de esa alineacion y lo consumen computeStrength (control
         -> Resistencia) y computeStrength (destroy -> Poder). */
      var ndT=findNode(targetUid);
      if(!ndT)throw new Error(c.name+': elige un grupo propio de la alineacion que quieres triplicar');
      if(findOwnerPid(targetUid)!==pid)throw new Error(c.name+': "all YOUR groups" — el grupo que eliges debe ser tuyo');
      var tcT=card(ndT.cardId);
      if(!tcT)throw new Error(c.name+': el objetivo no es una carta');
      var alT=nodeAligns(ndT,tcT)[0];
      if(!alT)throw new Error(c.name+': '+tcT.name+' no tiene ninguna alineacion con la que trabajar');
      var untilT=S.turn+S.players.length;
      var hitT=[];
      walk(pl.structure,function(n){
        if(n===pl.structure)return;
        var ncT=card(n.cardId);
        if(!ncT)return;
        if(nodeAligns(n,ncT).indexOf(alT)<0)return;
        n.defTriple={name:c.name,untilTurn:untilT};
        hitT.push(ncT.name);
      });
      if(!hitT.length)throw new Error(c.name+': no tienes ningun grupo '+alT);
      log(c.name+': la defensa de tus '+hitT.length+' grupo(s) '+alT+' se triplica hasta el comienzo de tu proximo turno');
      lastResult={ok:true,defTriple:true,card:c.name,align:alT,mul:eff.mul||3,
                  untilTurn:untilT,groups:hitT};
      break;}
    case 'token_wither':{
      /* 418 World Hunger — DOS frases en una carta (interpretacion 6/7):
         (a) "All Green groups lose their Action tokens and cannot get new ones"
             -> `noTokens` en el nodo + las fichas a cero. El predicado
             noTokensFlag() lo consultan CUATRO sitios (gastar ficha, buscar
             grupo que pueda ayudar, TOKEN-GIFT y el reparto de E.beginTurn), y
             el cuarto es el que hace que la carta dure algo.
         (b) "Groups which are Liberal and/or Nation have their Power reduced by
             2" -> clausulas `moves` + `scope:'all'`, porque el texto NO dice
             "your". Reutiliza bulkClauseHit() y powerMods de L3a.
         "or use their special abilities" NO se implementa: el motor no tiene
         sistema de habilidades especiales por grupo (declarado, no-op). */
      var wA=String(eff.witherAttr||'').toLowerCase();
      if(!wA)throw new Error(c.name+': la carta no declara que atributo apaga (eff.witherAttr vacio)');
      if(!Array.isArray(eff.moves)||!eff.moves.length)throw new Error(c.name+': la carta no declara ninguna clausula (eff.moves vacio)');
      var withered=[],weakened=[];
      for(var wq=0;wq<S.players.length;wq++){
        var wRoot=S.players[wq].structure;
        walk(wRoot,function(n){
          if(n===wRoot)return;
          var wc=card(n.cardId);
          if(!wc)return;
          if(hasAttr(wc,wA,n)){
            n.noTokens=true;
            n.tokens=0;
            withered.push(S.players[wq].name+': '+wc.name);
          }
          for(var wm=0;wm<eff.moves.length;wm++){
            if(!bulkClauseHit(eff.moves[wm],n,wc))continue;
            var wv=eff.moves[wm].power;
            if(typeof wv!=='number')continue;
            if(!Array.isArray(n.powerMods))n.powerMods=[];
            n.powerMods.push({name:c.name+' ('+(wv>0?'+':'')+wv+')',v:wv});
            weakened.push(S.players[wq].name+': '+wc.name);
          }
        });
      }
      if(!withered.length&&!weakened.length){
        log(c.name+': ningun grupo coincide; se gasta sin efecto');
      }else{
        if(withered.length)log(c.name+': '+withered.length+' grupo(s) pierden sus fichas y no pueden conseguir mas — '+withered.join(', '));
        if(weakened.length)log(c.name+': Poder reducido en '+weakened.length+' grupo(s) — '+weakened.join(', '));
      }
      lastResult={ok:true,wither:true,card:c.name,attr:wA,
                  withered:withered.length,weakened:weakened.length,
                  witheredGroups:withered,weakenedGroups:weakened};
      break;}
    case 'tripled_once':{
      /* 234 Currency Speculation — "The Power or Resistance of any one of your
         Bank groups is tripled for its next action or defense".
         "your choice" se resuelve con opts.stat (interpretacion 4); por defecto
         Poder, que es lo que dice la primera mitad de la frase. El triple se
         CONSUME en spendGroupToken (su accion) y en computeStrength cuando la
         defensa se resuelve de verdad, nunca en la vista previa. */
      var ndX=findNode(targetUid);
      if(!ndX)throw new Error(c.name+': elige un grupo tuyo');
      if(findOwnerPid(targetUid)!==pid)throw new Error(c.name+': "any ONE of your Bank groups" — el grupo debe ser tuyo');
      var tcX=card(ndX.cardId);
      if(!tcX)throw new Error(c.name+': el objetivo no es una carta');
      if(eff.targetAttr&&!hasAttr(tcX,eff.targetAttr,ndX))
        throw new Error(c.name+' solo se usa sobre grupos con el atributo '+eff.targetAttr+', y '+tcX.name+' no lo tiene');
      var statX=(opts&&opts.stat==='resistance')?'resistance':'power';
      ndX.tripled={name:c.name,stat:statX,mul:eff.mul||3};
      log(c.name+': '+(statX==='resistance'?'Resistencia':'Poder')+' de '+tcX.name+' x'+(eff.mul||3)+' hasta su proxima accion o defensa');
      lastResult={ok:true,tripled:true,card:c.name,target:tcX.name,stat:statX,mul:eff.mul||3};
      break;}
    case 'res_nullify':{
      /* 355 Resistance is Useless! — "For the rest of the current turn, the
         target groups Resistance is 0 ... no Resistance bonus from its masters
         alignments ... But proximity to its ruling Illuminati still gives the
         normal +5 or +10. This card must be played by a Media group, and counts
         as the groups action."
         LaResistance a 0 vive en nodeResistance() (primero, para ganar a un
         Ango que la fije en 1); el bonus del maestro se apaga con
         noMasterAlignDefense, que computeStrength consulta; y los +5/+10 de
         proximidad NO se tocan porque son det.posBonus. */
      var ndR0=findNode(targetUid);
      if(!ndR0)throw new Error(c.name+': elige el grupo cuya Resistencia quieres anular');
      if(findOwnerPid(targetUid)===pid)throw new Error(c.name+': no tiene sentido anular la Resistencia de un grupo tuyo');
      var wantR0=String(actionCostAttr(eff)||'').toLowerCase();
      if(!wantR0)throw new Error(c.name+': la carta no declara de que grupo saca la accion (requireActionFromAttr vacio)');
      var anR0=opts.aidUid?findNode(opts.aidUid):null;
      if(opts.aidUid&&(!anR0||findOwnerPid(opts.aidUid)!==pid))
        throw new Error('El grupo que aporta la accion debe ser tuyo');
      if(!anR0)anR0=firstUsableAid(pid,function(cc,nn){return hasAttr(cc,wantR0,nn);});
      if(!anR0)throw new Error(c.name+' necesita la accion de un grupo con el atributo '+wantR0);
      spendGroupToken(pid,anR0.uid);
      var tcR0=card(ndR0.cardId);
      ndR0.resNullify={name:c.name,untilTurn:S.turn};
      ndR0.noMasterAlignDefense=true;
      log(c.name+': '+tcR0.name+' se queda sin Resistencia hasta el final del turno (accion de '+card(anR0.cardId).name+')');
      lastResult={ok:true,resNullify:true,card:c.name,target:tcR0.name,
                  untilTurn:S.turn,paidWith:card(anR0.cardId).name};
      break;}
          /* ================= L4 - TOKEN-STRIP =================
       * 350 Reach Out . . . y 270 Gremlins: el mismo efecto (tokens = 0) con
       * distintos calificadores, asi que comparten un unico case. Gramatica,
       * alcance y las 7 declaraciones de interpretacion: bloque L4_FX de
       * gen_cards.js. Lo que se recuerda aqui:
       *   - se pone el VALOR tokens = 0, NO la marca `noTokens`: un grupo al
       *     que le roban la ficha puede volver a recibirla, y eso es
       *     justamente lo que distingue esta familia de 418 World Hunger;
       *   - los Resources no se tocan nunca: no son nodos, viven en
       *     pl.resources, y walk() no los visita;
       *   - 350 rechaza un objetivo propio (su texto dice "of any one of
       *     your rivals") y su mitad "your own groups" es automatica;
       *   - el modo 'takeResource' de 270 sustituye a su modo 2 impreso
       *     ("cancel its action"), que queda declarado PENDIENTE. */
  case 'token_strip':{
    if (eff.stripPlayers === 'rival+own' || eff.stripPlayers === 'all') {
        /* nada: se validan los dos valores abajo */
      } else {
        throw new Error(c.name + ': la carta no declara alcance (stripPlayers debe ser rival+own o all)');
      }
      /* P1-033: el coste se paga DESPUES de validar el objetivo, nunca antes.
       * E.declareAttack paga su ficha solo cuando todas las validaciones han
       * pasado (P1-022) y esa es la regla de todo el motor: si la carta se
       * rechaza, el jugador no ha pagado nada. Por eso no hay un bloque de
       * coste aqui, sino dos mas abajo, uno por rama. */
      /* --- MODO takeResource de 270: un Resource rival vuelve a la mano --- */
      if (eff.canTakeResource && opts.mode === 'takeResource') {
        if (!opts.resUid) throw new Error(c.name + ': elige el Resource que el rival devuelve a tu mano');
        var rIdx = -1;
        for (var rz = 0; rz < S.players.length; rz++) {
          for (var rj = 0; rj < S.players[rz].resources.length; rj++) {
            if (S.players[rz].resources[rj].uid === opts.resUid) { rIdx = rz; }
          }
        }
        if (rIdx < 0) throw new Error(c.name + ': ese Resource no esta en juego');
        if (rIdx === pid) throw new Error(c.name + ': tu propio Resource no puede "devolverse" a tu mano');
        if (eff.illumAction) {
          if (pl.illumTokens < 1) throw new Error(c.name + ' requiere una accion de tu Illuminati');
          pl.illumTokens--;
        }
        E.takeResourceToHand(rIdx, opts.resUid, pid);
        log(c.name + ': ' + S.players[pid].name + ' obliga a ' + S.players[rIdx].name +
            ' a devolver un Resource a su mano');
        lastResult = { ok: true, strip: true, mode: 'takeResource', card: c.name,
                      from: S.players[rIdx].name, resUid: opts.resUid };
        break;
      }
      /* --- MODO strip: tokens = 0 en cada nodo que encaje --- */
      var tOwner = -1;
      if (eff.stripPlayers === 'rival+own') {
        if (!targetUid) throw new Error(c.name + ': elige un grupo del rival al que robarle las fichas');
        var ndT = findNode(targetUid);
        if (!ndT) throw new Error(c.name + ': ese grupo ya no esta en juego');
        tOwner = findOwnerPid(targetUid);
        if (tOwner == null) throw new Error(c.name + ': ese grupo ya no esta en juego');
        if (tOwner === pid) {
          throw new Error(c.name + ': su texto dice "of any one of your rivals"; tus grupos se limpian igualmente, no necesitas elegirlos');
        }
      }
      if (eff.illumAction) {
        if (pl.illumTokens < 1) throw new Error(c.name + ' requiere una accion de tu Illuminati');
        pl.illumTokens--;
      }
      var stAll = [];
      for (var qi4 = 0; qi4 < S.players.length; qi4++) {
        var skipQ = false;
        if (eff.stripPlayers === 'rival+own') {
          if (qi4 === pid) skipQ = false;             /* "your own groups" */
          else if (qi4 === tOwner) skipQ = false;    /* el rival elegido */
          else skipQ = true;                          /* ni unthird rival */
        }
        if (skipQ) continue;
        var root4 = S.players[qi4].structure;
        walk(root4, function (n) {
          if (n === root4) return;
          var gc4 = card(n.cardId);
          if (!gc4) return;
          if (eff.stripAttr && !hasAttr(gc4, eff.stripAttr, n)) return;
          if (!n.tokens) return;                        /* ya estaba sin ficha */
          n.tokens = 0;
          stAll.push(gc4.name + ' (' + S.players[qi4].name + ')');
        });
      }
      if (!stAll.length) {
        log(c.name + ': ningun grupo coincidente tenia ficha de accion; se gasta sin efecto');
      } else {
        log(c.name + ': ' + stAll.length + ' grupo(s) se quedan sin ficha de accion -- ' + stAll.join(', '));
      }
      lastResult = { ok: true, strip: true, mode: 'strip', card: c.name,
                     attr: eff.stripAttr || null, scope: eff.stripPlayers,
                     rival: (tOwner >= 0 ? S.players[tOwner].name : null),
                     stripped: stAll.length, groups: stAll };
      break;}
    case 'attack_boost':{
      /* ==== L5a - ATTACK BOOST: "+N a un ataque a Destroy/Control de X" ====
       *
       * Las TRES cartas de esta familia empujan el MISMO dato (`A.boosts`, que
       * `computeStrength` suma en `det.boosts`) y las tres son "+N a un ataque
       * YA declarado", asi que comparten un unico kind. Solo cambian los
       * CALIFICADORES, que son datos. Gramatica y declaraciones de
       * interpretacion: bloque L5_FX de gen_cards.js. Lo que se recuerda aqui:
       *
       *   - el ataque debe estar ABIERTO. Las tres cartas son boosts de un
       *     ataque, no efectos por se. Sin `S.attack` no hay nada que
       *     solucionar y la carta se RECHAZA (no se gasta, no hace nada).
       *   - "no se puede usar con Assassinations ni Disasters" se cumple por
       *     construccion: un Assassination o un Disaster NO crean `S.attack`
       *     (son ataques instantaneos de E.playPlot), de modo que aqui solo se
       *     puede llegar con `A.type` 'control' o 'destroy'.
       *   - "a single direct attack" (381) es de un solo uso SIN estado: el +10
       *     vive EN el objeto del ataque, que muere con el. Mismo criterio que
       *     el modo 'attack' de las cartas "+10" de §26.
       *   - el valor dependiente del objetivo (415) se elige AL JUGAR LA CARTA,
       *     leyendo el subtype del nodo objetivo, porque la eleccion oficial es
       *     del jugador que la juega. */
      var A=S.attack;
      if(!A||A.resolved)throw new Error(c.name+': necesita un ataque ya declarado');
      /* `atkType` admite 'control', 'destroy' y 'any'. El 'any' lo imprime 356
       * Revolution! ("on any attack, either to destroy or control") y sin esta
       * excepcion la comprobacion de abajo lo rechazaria siempre: el caso es un
       *ico, pero el valor es un dato. La puerta (FASE 4) tambien lo admite. */
      if(eff.atkType&&eff.atkType!=='any'&&A.type!==eff.atkType)
        throw new Error(c.name+': solo se juega en un ataque a '+
          (eff.atkType==='destroy'?'destruir':'controlar'));
      /* --- calificador del ATACANTE: "from a Media group", "to your Illuminati" --- */
      var attN=findNode(A.attackerUid);
      var attC=attN?card(attN.cardId):null;
      if(eff.illumOnly&&(!attC||attC.type!=='illuminati'))
        throw new Error(c.name+': el ataque tiene que salir de tu Illuminati, y el atacante actual no lo es');
      if(eff.attackerAttr&&(!attC||!hasAttr(attC,eff.attackerAttr,attN)))
        throw new Error(c.name+': el ataque tiene que salir de un grupo '+eff.attackerAttr);
      /* --- calificador del OBJETIVO: "any male Personality", "the Lawyers" --- */
      var tgtN=A.targetUid?findNode(A.targetUid):null;
      var tgtC=tgtN?card(tgtN.cardId):null;
      if(eff.targetCardId){
        var wantC=C.byId?C.byId[eff.targetCardId]:null;
        var wantName=wantC?wantC.name:eff.targetCardId;
        if(!tgtC||tgtC.id!==eff.targetCardId)
          throw new Error(c.name+': el objetivo del ataque tiene que ser '+wantName+
            (tgtC?', y es '+tgtC.name:''));
      }
      if(eff.targetSubtype&&(!tgtC||tgtC.subtype!==eff.targetSubtype))
        throw new Error(c.name+': el objetivo del ataque tiene que ser '+cap(eff.targetSubtype));
      /* --- el VALOR: fijo, o dependiente del subtype del objetivo --- */
      var valAB=eff.boostValue;
      if(eff.boostBySubtype){
        var stAB=tgtC?String(tgtC.subtype||'').toLowerCase():'';
        valAB=(stAB&&typeof eff.boostBySubtype[stAB]==='number')?eff.boostBySubtype[stAB]:eff.boostBySubtype.other;
      }
      /* L6 — 356 Revolution!: "+10 al ataque, o +20 contra una Dictatorship".
       * Se lee el estado que §40 (P1-028) dejo puesto en el nodo, no el texto de
       * la carta: la Dictatorship es un ESTADO del grupo, y §40 lo puso aqui a
       * proposito. Si el objetivo no lleva la marca, gana el +10 normal. */
      if(eff.boostVsDictatorship&&tgtN&&tgtN.dictatorship)valAB=eff.boostVsDictatorship;
      if(typeof valAB!=='number'||!valAB)
        throw new Error(c.name+': el ataque no encaja en ningun valor de bonus');
      /* --- COSTE, siempre DESPUES de validar (P1-022: la ficha se gasta solo
             cuando todas las comprobaciones han pasado) --- */
      var aidAB=null;
      var needActAB=actionCostAttr(eff);
      if(needActAB){
        var anAB=opts.aidUid?findNode(opts.aidUid):null;
        if(opts.aidUid&&(!anAB||findOwnerPid(opts.aidUid)!==pid))
          throw new Error('El grupo que aporta la accion debe ser tuyo');
        /* L6 — 356 Revolution!: "an action by a group OTHER THAN those actually
         * attacking the Nation". Los que atacan son el atacante principal y los
         * que ya estan en `A.aids`/`A.opposes` (los anoto E.addSupport). El veto
         * va DENTRO del filtro de `firstUsableAid` y no despues: si se comprobara
         * sobre el primer candidato y este fuese el atacante, la carta se
         * rechazaria aunque otro grupo propio sirviera. */
        var isAttackingAB=function(u){
          if(A.attackerUid===u)return true;
          var f=false;
          A.aids.forEach(function(x){if(x.uid===u)f=true;});
          A.opposes.forEach(function(x){if(x.uid===u)f=true;});
          return f;
        };
        if(!anAB)anAB=firstUsableAid(pid,function(cc,nn){
          if(eff.payNotTheAttackers&&isAttackingAB(nn.uid))return false;
          return hasAttr(cc,needActAB,nn);
        });
        if(!anAB)throw new Error(c.name+' necesita una accion de un grupo '+
          needActAB+
          (eff.payNotTheAttackers?' que no este ya atacando':''));
        aidAB=anAB;
      }
      /* L6 — 356 Revolution! NO filtra por atributo ("an action by a group other
       * than those actually attacking the Nation"), asi que el bloque anterior no
       * le cobra nada y la carta se jugaria gratis. Aqui se le cobra con la
       * MISMA regla que el veto: cualquier grupo propio que no este atacando.
       * Declarado, porque es un segundo camino de coste dentro del mismo kind:
       * `requireActionFromAttr` = "un grupo de este tipo"; `payNotTheAttackers`
       * sin atributo = "cualquier grupo propio que no participe". */
      if(!aidAB&&eff.payNotTheAttackers&&!needActAB){
        var isAtt2=function(u){
          if(A.attackerUid===u)return true;
          var f=false;
          A.aids.forEach(function(x){if(x.uid===u)f=true;});
          A.opposes.forEach(function(x){if(x.uid===u)f=true;});
          return f;
        };
        var anAB2=opts.aidUid?findNode(opts.aidUid):null;
        if(opts.aidUid&&(!anAB2||findOwnerPid(opts.aidUid)!==pid))
          throw new Error('El grupo que aporta la accion debe ser tuyo');
        if(anAB2&&isAtt2(anAB2.uid))
          throw new Error(c.name+': el grupo que aporta la accion no puede ser uno de los que ya atacan');
        if(!anAB2)anAB2=firstUsableAid(pid,function(cc,nn){return !isAtt2(nn.uid);});
        if(!anAB2)throw new Error(c.name+' necesita la accion de un grupo tuyo que no este ya atacando');
        aidAB=anAB2;
      }
      if(aidAB)spendGroupToken(pid,aidAB.uid);
      A.boosts.push({name:c.name,v:valAB});
      log(pl.name+' juega '+c.name+': +'+valAB+
        (aidAB?(' (accion de '+card(aidAB.cardId).name+')'):'')+
        ' al '+cap(A.type)+' de '+tgtC.name);
      lastResult={ok:true,boost:valAB,card:c.name,attack:A.type,target:tgtC.name,
        paidWith:aidAB?{uid:aidAB.uid,name:card(aidAB.cardId).name}:null};
      break;}
    case 'align_rule':{
      /* L5b — 255 Fear and Loathing. No es un bonus: es una REGLA GLOBAL. La
       * carta cambia la magnitud con la que las alineaciones comparadas valen
       * (4 -> 8) y el cambio dura el resto de la partida, porque su texto no
       * pone plazo. computeStrength lee el numero de S.alignRule, asi que aqui
       * solo hay que dejar el estado escrito y EXPONER la carta en la mesa: un
       * efecto en curso se queda "in play" (inwo_rules_extracted.txt:223), que
       * es la regla de las cartas "+10" y de las Cartas de Objetivo, y P1-025
       * saca del descarte lo que este en exposedPlots. Sin exposedPlots la
       * carta se descartaria al jugarse, el estado seguiria puesto y el motor
       * seria incoherente con la mesa. */
      if(typeof eff.alignMag!=='number'||eff.alignMag<=0)
        throw new Error(c.name+': la carta no declara la magnitud de la regla (eff.alignMag)');
      /* L21 / P1-138: el reemplazo por color lo hace undoNwoOfColor21, en el
       * POST-hook de E.playPlot (P1-137 lo movio alla para no alterar el estado si
       * el efecto lanzaba). Por eso aqui la regla del MISMO color sigue puesta, y
       * el unico caso que este throw debe cubrir es el de OTRO color, que la carta
       * no puede deshacer. La comparacion es por COLOR, no por existencia. Antes
       * L21 este throw saltaba para cualquier segunda carta, es decir rechazaba
       * justo el caso que el reglamento SI permite ("the earlier one is discarded"). */
      if (S.alignRule && S.alignRule.color !== c.nwoColor)
        throw new Error(c.name + ' no se puede jugar: la regla de alineaciones ya fue alterada por '
          + S.alignRule.card + ', una carta New World Order de otro color, y solo se sustituye jugando otra NWO de su color');
      S.alignRule={mag:eff.alignMag,card:c.name,color:c.nwoColor||null};
      pl.exposedPlots.push(handIdx);
      log(c.name+': las alineaciones identicas valen ahora +'+eff.alignMag+' al controlar y -'+eff.alignMag+
          ' al destruir, y las opuestas al reves (regla alterada para el resto de la partida)');
      lastResult={ok:true,alignRule:true,card:c.name,mag:eff.alignMag,exposed:pl.exposedPlots.length};
      break;}
    /* L5c — 189 Albino Alligators: "+10 Power or Resistance (your choice) to any
       Weird group you control. If used with an action, it must be played when
       that action is first declared, and counts only for that action. If used for
       defense, the bonus lasts until the end of the current turn and does not
       count toward Goals."

       El texto pide tres cosas y solo UNA es eleccion del jugador: cual de los dos
       parametros sube. El modo NO se elige, lo decide el CONTEXTO (interpretacion 2
       de gen_cards.js): si hay un ataque abierto contra ese nodo es DEFENSA, si no
       es ACCION. Por eso el dato no declara ningun campo de modo.

       Interpretaciones y su por que, todas en el bloque L5C_FX de gen_cards.js:
       1. "your choice" = `opts.stat` (power por defecto), NO un calificador: un
          calificador que el motor nunca lee seria exactamente el defecto P1-026.
       3. "must be played when that action is first declared": el motor declara Y
          ejecuta una accion en el mismo paso, asi que lo mas cercano que se puede
          exigir es que el grupo conserve su ficha. Si no la tiene, la carta se
          RECHAZA con la razon impresa y no se gasta nada.
       6. "does not count toward Goals" NO se implementa y se DECLARA: honrarla
          exige saber QUE ataque uso el bonus (un registro de acciones, el mismo
          hueco que bloquea a 377 y al "out of public life" de 415). El grupo sigue
          muriendo por destroyGroup como cualquier otro, que es la parte del texto
          que SI se cumple. */
    case 'group_boost_timed':{
      if(typeof eff.value!=='number'||!(eff.value>0))
        throw new Error(c.name+': la carta no declara el valor del bonus (eff.value)');
      if(typeof eff.align!=='string')
        throw new Error(c.name+': la carta no declara el filtro de alineacion (eff.align)');
      var tbN=findNode(targetUid);
      if(!tbN)throw new Error(c.name+': elige un grupo objetivo');
      var tbC=card(tbN.cardId);
      if(!tbC)throw new Error(c.name+': el objetivo no es una carta');
      /* "any Weird group you control" — el texto dice expressly "you control",
         a diferencia de las cartas de L3a que dicen "all X groups". */
      if(findOwnerPid(targetUid)!==pid)
        throw new Error(c.name+': el texto dice "any Weird group you control", y '+tbC.name+' no es tuyo');
      var tbA=eff.align.toLowerCase();
      if(nodeAligns(tbN,tbC).indexOf(tbA)<0)
        throw new Error(c.name+' solo afecta a grupos '+cap(tbA)+', y '+tbC.name+' no lo es');
      var tbStat=(opts.stat==='resistance')?'resistance':'power';
      /* Modo por CONTEXTO, no por eleccion del jugador. */
      var tbMode=(S.attack&&!S.attack.resolved&&S.attack.targetUid===targetUid)?'defense':'action';
      if(tbMode==='action'&&(!tbN.tokens||tbN.tokens<1))
        throw new Error(c.name+': "it must be played when that action is first declared", y '+
            tbC.name+' ya ha gastado su Action token');
      /* La caducidad SOLO existe en modo defensa ("until the end of the current
         turn"). En modo accion la dura "that action" y la consume
         spendGroupToken, igual que el triple de 234. */
      tbN.timedBoost={name:c.name,v:eff.value,stat:tbStat,mode:tbMode,
                      untilTurn:(tbMode==='defense')?S.turn:null};
      log(c.name+': '+tbC.name+' gana +'+eff.value+' de '+
          (tbStat==='resistance'?'Resistencia':'Poder')+' ('+
          (tbMode==='defense'?('hasta el final del turno '+S.turn):'solo para su proxima accion')+')');
      lastResult={ok:true,boost:true,card:c.name,target:tbC.name,align:tbA,
                  value:eff.value,stat:tbStat,mode:tbMode,untilTurn:tbN.timedBoost.untilTurn};
      break;}
    /* ================= L6 -- NEGAR UN SUCESO =================
     * Tres cartas del mismo lote hacen tres cosas parecidas y distintas. Las dos
     * primeras (210 Botched Contact y 359 Sabotage) comparten kind porque el
     * EFECTO es identico -- el grupo que un rival acaba de tomar posesion
     * automatica vuelve a su mano -- y solo cambian el coste y un efecto extra;
     * es el mismo criterio que las 11 de TOKEN-GIFT (L1) y las 2 de L4. La
     * tercera (259 Foiled!) es otra cosa: no responde a un suceso, obliga a un
     * rival a descartar, asi que tiene su propio case aunque viva en el mismo
     * lote. 278 Hex (resource_destroy) va con ellas.
     *
     * La ventana de SUCESO es la de §38 (P1-027). Todo lo que ya habia --abrir,
     * `responders`, cerrar, `E.resolvePendingEvent`-- es generico; lo que faltaba
     * era un tercer tipo de suceso (`autoTakeover`) y las ramas de abajo. */
    case 'takeover_return':{
      /* 210 / 359 -- "He must return that Group to his hand" (210) y "He cannot
       * make an automatic takeover that turn" (359). Se juega DENTRO de la
       * ventana que abre `E.autoTakeover`, y por eso el caso NO comprueba que la
       * ventana sea del tipo correcto si no para no dejar un `S.pendingEvent`
       * colgado: si no es el suyo, lo rechaza. */
      var evR=S.pendingEvent;
      if(!evR||evR.kind!=='autoTakeover')
        throw new Error(c.name+': no hay ningun takeover automatico que anular');
      if(evR.data.returnedBy!=null)
        throw new Error(c.name+': ese takeover ya fue devuelto por '+evR.data.returnedBy.cardName);
      var chkR=eventReactionAllowed(eff,pid,evR);
      if(!chkR.ok)throw new Error(c.name+': '+chkR.why);
      var dR=evR.data;
      /* --- COSTE, DESPUES de validar (P1-022). 210: "an action from one of your
       * groups", cualquiera. 359: "either your Illuminati, or group(s) with total
       * Power of 6 or more, at least one of which shares an alignment with the
       * Group that your rival is trying to control" -- y esa ultima parte se
       * comprueba contra `dR.aligns`, que viaja en `data` justamente porque el
       * nodo puede ya no existir cuando la ventana se cierra. --- */
      var paidR=null;
      if(eff.payAnyGroup){
        var anR=opts.aidUid?findNode(opts.aidUid):null;
        if(opts.aidUid&&(!anR||findOwnerPid(opts.aidUid)!==pid))
          throw new Error('El grupo que aporta la accion debe ser tuyo');
        if(!anR)anR=firstUsableAid(pid,function(){return true;});
        if(!anR)throw new Error(c.name+' necesita la accion de uno de tus grupos');
        paidR={uid:anR.uid,name:card(anR.cardId).name};
        spendGroupToken(pid,anR.uid);
      }else if(typeof eff.payPower==='number'){
        if(pl.illumTokens>=1){
          pl.illumTokens--;
          paidR={uid:pl.illumId,name:'Illuminati'};
        }else{
          var accR=0;
          var anR2=opts.aidUid?findNode(opts.aidUid):null;
          if(opts.aidUid&&(!anR2||findOwnerPid(opts.aidUid)!==pid))
            throw new Error('El grupo que aporta la accion debe ser tuyo');
          if(!anR2)anR2=firstUsableAid(pid,function(cc,nn){
            if(eff.payShareAlign){
              var sa=nodeAligns(nn,cc);
              var okA=false;
              (dR.aligns||[]).forEach(function(a){if(sa.indexOf(a)>=0)okA=true;});
              if(!okA)return false;
            }
            return accR<eff.payPower;
          });
          if(!anR2||accR>=eff.payPower)
            throw new Error(c.name+' necesita '+eff.payPower+' de Poder de grupos'+
              (eff.payShareAlign?' que compartan una alineacion con el grupo tomado':'')+
              ', o una accion de tu Illuminati');
          accR+=curPower(anR2);
          paidR={uid:anR2.uid,name:card(anR2.cardId).name,power:accR};
          spendGroupToken(pid,anR2.uid);
        }
      }else{
        throw new Error(c.name+': el coste de esta carta no esta declarado');
      }
      dR.returnedBy={pid:pid,name:pl.name,cardName:c.name};
      dR.blocked=!!eff.alsoBlocks;
      log(pl.name+' juega '+c.name+': '+cap(dR.label||'el takeover')+
        ' queda devuelto a la mano de '+S.players[evR.byPid].name+
        (dR.blocked?' y no podra repetir el takeover este turno':'')+
        ' (accion de '+paidR.name+')');
      lastResult={ok:true,negated:true,card:c.name,kind:'autoTakeover',
        by:S.players[evR.byPid].name,returnedLabel:dR.label,blocked:!!dR.blocked,paidWith:paidR};
      break;}
    case 'resource_destroy':{
      /* 278 Hex -- "A Magic Resource controlled by a rival is destroyed. Discard
       * its card." + "requires an action by your Illuminati, or by a Magic group
       * with a Power of 3 or more" + "at any time EXCEPT during a privileged
       * attack".
       *
       * DECLARACION (interpretacion 5 de L6): el texto dice "A Magic Resource",
       * pero el mazo NO tiene clasificacion de Resources: 34 de los 35 tienen
       * `subtype:null` (medido en L4, el mismo motivo por el que se solto el
       * "Gadget Resource" de 270). El Resources se busca de un rival y ya esta;
       * lo que SI se filtra es el COSTE, porque "a Magic group" usa el atributo
       * `magic`, que si existe en el mazo. No se inventa ninguna categoria. */
      if(eff.notDuringPrivileged&&S.attack&&S.attack.privilege)
        throw new Error(c.name+': no se puede jugar durante un ataque privilegiado');
      if(typeof eff.payAttr!=='string')
        throw new Error(c.name+': el coste de esta carta no esta declarado (eff.payAttr)');
      /* 278 no tiene objetivo que elegir: el texto dice "A Magic Resource
       * controlled by a RIVAL", y el mazo no tiene clasificacion de Resources
       * (interpretacion 5), asi que el rival se deduce. Sin `opts.rivalPid` se
       * elige el PRIMER rival que tenga Resources, que es determinista; con el
       * se respeta el que pase la UI. Antes el valor por defecto era `pid`, lo
       * que hacia que la carta fuera INJUGABLE salvo que el llamante conociera un
       * parametro que la UI no tiene forma de enviar: el mismo defecto que
       * `alignFromTarget` resolvia en 268. */
      var rpid=opts.rivalPid;
      if(rpid==null){
        for(var rq=0;rq<S.players.length;rq++){
          if(rq!==pid&&S.players[rq].resources.length){rpid=rq;break;}
        }
      }
      var rpv=S.players[rpid];
      if(rpid==null||rpid===pid)throw new Error(c.name+': solo destruye Resources de un rival');
      if(!rpv||!rpv.resources.length)
        throw new Error(c.name+': '+cap(S.players[pid].name)+' no tiene ningun Resource en juego');
      var rx=opts.resUid;
      if(rx){
        var hitR=false;
        rpv.resources.forEach(function(r){if(r.uid===rx)hitR=true;});
        if(!hitR)throw new Error(c.name+': ese Resource ya no esta en juego');
      }
      var anX=opts.aidUid?findNode(opts.aidUid):null;
      if(opts.aidUid&&(!anX||findOwnerPid(opts.aidUid)!==pid))
        throw new Error('El grupo que aporta la accion debe ser tuyo');
      if(!anX)anX=firstUsableAid(pid,function(cc,nn){
        if(!hasAttr(cc,eff.payAttr,nn))return false;
        if(typeof eff.payMinPower==='number'&&curPower(nn)<eff.payMinPower)return false;
        return true;
      });
      if(!anX)throw new Error(c.name+' necesita la accion de tu Illuminati o de un grupo '+
        eff.payAttr+(typeof eff.payMinPower==='number'?(' con Poder '+eff.payMinPower+' o mas'):''));
      spendGroupToken(pid,anX.uid);
      var atX=-1;
      rpv.resources.forEach(function(r,i){
        if(atX<0&&(rx?r.uid===rx:rx==null))atX=i;
      });
      var entX=rpv.resources.splice(atX,1)[0];
      S.groupDiscard.push(entX.cardId);
      log(pl.name+' juega '+c.name+': el Resource '+card(entX.cardId).name+
        ' de '+rpv.name+' se destruye y se descarta (accion de '+card(anX.cardId).name+')');
      lastResult={ok:true,negated:true,card:c.name,kind:'resource_destroy',
        target:card(entX.cardId).name,targetPid:rpid,owner:rpv.name,
        paidWith:{uid:anX.uid,name:card(anX.cardId).name}};
      break;}
    case 'force_discard_exposed':{
      /* 259 Foiled! -- "You may force any rival to discard one exposed Goal card."
       * + "may be used at any time, but requires an action a Media group".
       *
       * DECLARACION (interpretacion 6 de L6): el descarte pasa por
       * `discardPlot()`, el unico punto de entrada al descarte de Plots (P1-025).
       * Es una consecuencia deliberada: la Plot forzadamente descartada PODRA
       * ser robada despues por Stealing the Plans (374), que reacciona al mismo
       * suceso `plotDiscarded`. Forzarla por el motor seria mas simple pero
       * abriria una segunda ruta al descarte y la dejaria fuera de la ventana. */
      var needActF=actionCostAttr(eff);
      if(typeof needActF!=='string')
        throw new Error(c.name+': el coste de esta carta no esta declarado');
      var fpid=opts.rivalPid!=null?opts.rivalPid:(pid===0?1:0);
      var fpv=S.players[fpid];
      if(!fpv)throw new Error(c.name+': ese rival no existe');
      var exposedF=fpv.exposedPlots.filter(function(ix){
        var cc=card(ix);
        return cc&&cc.subtype==='goal';
      });
      if(!exposedF.length)
        throw new Error(c.name+': '+cap(fpv.name)+' no tiene ninguna carta de Objetivo expuesta');
      var fx=opts.exposedIdx;
      if(fx!=null&&exposedF.indexOf(fx)<0)
        throw new Error(c.name+': esa carta de Objetivo ya no esta expuesta');
      if(fx==null)fx=exposedF[0];
      var anF=opts.aidUid?findNode(opts.aidUid):null;
      if(opts.aidUid&&(!anF||findOwnerPid(opts.aidUid)!==pid))
        throw new Error('El grupo que aporta la accion debe ser tuyo');
      if(!anF)anF=firstUsableAid(pid,function(cc,nn){
        return hasAttr(cc,needActF,nn);
      });
      if(!anF)throw new Error(c.name+' necesita la accion de un grupo '+needActF);
      spendGroupToken(pid,anF.uid);
      var nameF=card(fx).name;
      /* La carta sale TAMBIEN de `exposedPlots`: `discardPlot` solo la mete en el
       * descarte de Plots, asi que sin esta linea la misma carta de Objetivo
       * seguiria "expuesta" y 259 podria forzarla a descartar dos veces. Es el
       * mismo motivo por el que §38 filtra `exposedPlots` al cerrar la mano. */
      var exAt=fpv.exposedPlots.indexOf(fx);
      if(exAt>=0)fpv.exposedPlots.splice(exAt,1);
      discardPlot(fx,fpid);
      log(pl.name+' juega '+c.name+': '+fpv.name+' descarta su '+nameF+
        ' (accion de '+card(anF.cardId).name+')');
      lastResult={ok:true,negated:true,card:c.name,kind:'force_discard_exposed',
        target:nameF,targetPid:fpid,owner:fpv.name,
        paidWith:{uid:anF.uid,name:card(anF.cardId).name}};
      break;}
    /* ================= L7 - INTRUSIÓN EN PLOTS OCULTOS (4 cartas) =================
     * DECLARACIÓN que hace a esta familia distinta de las otras tres ventanas:
     * aquí la ventana se abre SIEMPRE, tenga o no alguien una carta para
     * responder. En §33/§37/§38, si nadie puede reaccionar, la ventana no se
     * abre y el efecto se aplica en el acto; pero en L7 el efecto ES la decisión
     * ("mira y elige"), así que no hay nada que aplicar sin ella. Que 242 esté o
     * no en la mano del rival sólo cambia si puede anularse, no si la ventana
     * existe. Abrir siempre es lo que hace falta para que la UI pueda listar.
     *
     * En los cuatro casos el orden es el mismo y por los mismos motivos:
     *   1. el rival y sus Plot ocultas existen            (si no, la carta no hace
     *      nada: EN 303, 322 y 386 eso es un fallo de quien la juega, no un
     *      silencio del motor);
     *   2. quién puede pagar el coste impreso           (se localiza, NO se paga);
     *   3. SE PAGA, aquí y sólo aquí                    (P1-022: el coste se cobra
     *      después de todas las validaciones, porque si se cobraría antes el
     *      rechazo dejaría al jugador sin ficha - P1-033);
     *   4. se abre la ventana, que aplica al cerrarse.
     */
    case 'turn_start_block':{
      /* L8c — 405 Unlucky 13. El timing ES la ventana: solo es jugable cuando
       * S.pendingTurnStart esta abierto (lo abre E.endTurn, entre turnos), y el
       * objetivo es el jugador cuyo turno va a empezar. REGLA DEL CASO: se valida
       * TODO antes de tocar nada; beginTurn dentro del case es seguro porque nada
       * toca la mano del actor y el tail de playPlot (descartar la carta jugada)
       * corre despues.
       *
       * P1-054 (corrige P1-050): "Requires Magic Action" NO es un tipo de accion con
       * nombre — los Action Tokens son genericos (glass pebbles). El glosario define
       * Magic como ATRIBUTO de carta, asi que el pagador se busca en el plano de
       * ATRIBUTOS con hasAttr, el MISMO helper del patron requireActionFromAttr
       * (ver engine.js:2707). Leerlo como `alignments.indexOf('magic')` era
       * reincidencia exacta de P1-018: 0 grupos tienen la alineacion magic y 9 la
       * tienen como atributo, luego la validacion era CODIGO MUERTO y la carta
       * era literalmente injugable. firstUsableAid ya excluye la root Illuminati. */
      var plTS=S.players[pid];
      var W2=S.pendingTurnStart;
      if(!W2)throw new Error(c.name+': solo es jugable al comienzo del turno de un rival (no hay ventana de reaccion abierta)');
      if(W2.forPid===pid)throw new Error(c.name+': no puedes bloquear el comienzo de tu propio turno');
      var needActTS=actionCostAttr(eff);
      var aidTS=firstUsableAid(pid,function(cTS,nTS){return hasAttr(cTS,needActTS,nTS);});
      if(!aidTS)throw new Error(c.name+': Requires Magic Action — se necesita la acción de un grupo tuyo con el atributo magic');
      spendGroupToken(pid,aidTS.uid);
      var tgtTS=S.players[W2.forPid];
      tgtTS.flags.noPlotUntilTurnEnd=S.turn+1;
      log(c.name+': '+plTS.name+' bloquea el robo de Plot cards de '+tgtTS.name+' hasta el final de su turno');
      S.pendingTurnStart=null;
      S.phase='begin';
      E.beginTurn(W2.forPid);
      lastResult={blocked:tgtTS.name,turn:tgtTS.flags.noPlotUntilTurnEnd};
      break;
    }
    case 'deck_manip':{
      /* L8a — 361 Savings & Loan Scam / 388 The Big Sellout / 411 Voodoo Economics.
       * Las tres son una sola rama porque las tres manipulan MAZOS, pero cada una
       * hace una operacion distinta, y el dato `mode` es lo que decide cual.
       * `ownTurn` NO se revalida aqui: el gate `instant` de E.playPlot ya aplico
       * `requireOwnMain` porque solo 361 trae `anyTime`.
       *
       * REGLA DE ORO DEL CASO: todo se VALIDA y se cuenta ANTES de tocar nada, y las
       * salidas son irreversibles (411 QUEMA cartas). Validar despues de quitar seria
       * perder cartas de un jugador por un error de interfaz. */
      var plD=S.players[pid], dm=eff;
      /* L8c — 405: "He can draw no Plot cards, for any reason": "any reason"
       * incluye 361. El chequeo va ANTES del coste (regla de oro del caso: validar
       * antes de mutar) — si el robo va a estar bloqueado, la ficha no se gasta. */
      if(dm.mode==='draw'&&plotDrawBlocked(pid))
        throw new Error(c.name+': Unlucky 13 bloquea el robo de Plot cards este turno');
      /* 361 "Using this card is an action for one group": gasta una ficha de grupo ya
       * puesta. No es lo mismo que una accion de grupo nueva (que pondria beginTurn),
       * asi que se busca un grupo con ficha DISPONIBLE, no cualquiera. */
      if(dm.payGroupAction){
        /* OJO: el predicado de firstUsableAid recibe (carta, nodo), NO el nodo solo
         * (engine ~2453), asi que un filtro que mire `nd.tokens` nunca casa y la carta
         * se rechazaria siempre. Aqui no hace falta filtro ninguno: firstUsableAid ya
         * descarta lo que no tiene ficha y lo que no puede tenerla (noTokensFlag), que
         * es exactamente el requisito impreso de 361. */
        var payerD=firstUsableAid(pid);
        if(!payerD)throw new Error(c.name+': no tienes ningun grupo con una ficha de accion disponible para "using this card is an action for one group"');
        spendGroupToken(pid,payerD.uid);
      }
      var outD={mode:dm.mode,discarded:[],burned:[],drawn:[],bonus:[]};
      if(dm.mode==='draw'){
        var nD=dm.drawPlot|0,got=0;
        for(var qD=0;qD<nD;qD++){var dcD=drawFrom(S.plotDeck,S.plotDiscard,'plot');if(!dcD)break;plD.hand.push(dcD);got++;}
        if(got===0)throw new Error(c.name+': tu mazo de Plot cards esta vacio: no hay nada que robar');
        outD.drawn=got;
        log('— '+plD.name+': '+c.name+' roba '+got+' Plot card(s) de su mazo');
      }else if(dm.mode==='burn'){
        /* 411: "discard up to ten Plot Cards from the top of your deck, REMOVING THEM
         * PERMANENTLY FROM PLAY". Quemar = sacar sin mandar al descarte: si fuera al
         * descarte, drawFrom lo rebarajaria y el "permanently" seria falso. */
        var wantD=(opts.n==null?0:opts.n)|0;
        if(wantD<0)throw new Error(c.name+': el numero de Plot cards a descartar no puede ser negativo');
        var maxD=Math.min(dm.burnMax|0,S.plotDeck.length);
        if(wantD>maxD)throw new Error(c.name+': no puedes descartar mas de '+dm.burnMax+' Plot cards, y ahora mismo tu mazo solo tiene '+S.plotDeck.length);
        var burnD=topOfDeck(S.plotDeck,wantD);
        if(burnD.length!==wantD)throw new Error(c.name+': tu mazo de Plot cards esta vacio');
        for(var bD=0;bD<burnD.length;bD++){/* las quemadas salen de circulacion, no al descarte */}
        outD.burned=burnD;
        log('— '+plD.name+': '+c.name+' saca '+burnD.length+' Plot card(s) de su mazo permanentemente');
        outD.bonus=applyBonusUids(pid,opts.bonusUids,burnD.length,c.name,dm.bonusMaxPerGroup|0||1);
        if(outD.bonus.length)log('— tokens extra de accion en '+outD.bonus.join(', '));
      }else if(dm.mode==='sellout'){
        /* 388: "pick up to ten Groups and/or Resources from your hand ... You may also
         * discard the top card(s) from your Groups deck, as long as the TOTAL is ten or
         * less." El techo es SUMA, no de cada fuente. Y "For each GROUP you discard"
         * cuenta los Groups de la mano y los de la cima, pero NO los Resources. */
        var selD=Array.isArray(opts.handIx)?opts.handIx:[];
        /* P1-058: `selD` (y `opts.handIx`) son IDENTIDADES de carta (indices de
         * catalogo), pero `plD.hand.splice` exige una POSICION dentro de la mano.
         * Antes se empujaba la identidad a `idxD` y se perdia `ciD`, de modo que el
         * splice borraba la carta que OCUPARA esa posicion (que solo coincide por
         * casualidad cuando el indice de catalogo cae en una mano corta) mientras
         * `card(idxD[dD])` anadia al descarte la carta elegida. Medido en 600
         * repartos: 600/600 con posicion != indice y 8/600 (1.3%, el ~1/100 que
         * hacia flaquear S9) con la mano INTACTA y una copia nueva en el descarte,
         * o sea duplicacion de carta. Ahora `idxD` guarda POSICIONES y `disD` las
         * IDENTIDADES para `lastResult`, que es lo que la UI debe ver. */
        var seenD={},earD=0,idxD=[],disD=[];
        for(var sD=0;sD<selD.length;sD++){
          var hD=selD[sD];
          if(seenD[hD])throw new Error(c.name+': la misma carta de tu mano no se puede descartar dos veces');
          seenD[hD]=1;
          var ciD=plD.hand.indexOf(hD);
          if(ciD<0)throw new Error(c.name+': esa carta ya no esta en tu mano');
          var hcD=card(hD);
          if(dm.handTypes.indexOf(hcD.type)<0)throw new Error(c.name+': solo puedes descartar Groups y/o Resources de tu mano (esa carta es de tipo "'+hcD.type+'")');
          idxD.push(ciD);
          disD.push(hD);
          if(hcD.type==='group')earD++;
        }
        var dWantD=(opts.n==null?0:opts.n)|0;
        if(dWantD<0)throw new Error(c.name+': el numero de cartas a descartar de la cima de tu mazo no puede ser negativo');
        if(idxD.length+dWantD>dm.maxTotal)
          throw new Error(c.name+': puedes descartar como maximo '+dm.maxTotal+' cartas entre la mano y la cima de tu mazo (has pedido '+(idxD.length+dWantD)+')');
        var deckD=topOfDeck(S.groupDeck,dWantD);
        if(deckD.length!==dWantD)throw new Error(c.name+': tu mazo de Groups esta vacio');
        for(var gD=0;gD<deckD.length;gD++){
          /* Resources y Groups comparten mazo en este motor (ambos salen de
           * S.groupDeck), asi que `S.groupDiscard` es el unico descarte que existe
           * para los dos, y el rebarajado de drawFrom tambien los devuelve. */
          S.groupDiscard.push(deckD[gD]);
          if(card(deckD[gD]).type==='group')earD++;
        }
        outD.discarded=disD;outD.deckTop=deckD;
        log('— '+plD.name+': '+c.name+' descarta '+idxD.length+' carta(s) de su mano y '+deckD.length+' de la cima de su mazo');
        outD.bonus=applyBonusUids(pid,opts.bonusUids,earD,c.name,dm.bonusMaxPerGroup|0||1);
        if(outD.bonus.length)log('— tokens extra de accion en '+outD.bonus.join(', '));
        /* Los indices de mano dejan de ser validos en cuanto se borran, asi que el
         * descarte se hace al final y en orden DESCENDENTE: si no, al borrar el mayor
         * se desplazan todos los menores y elucle se vuelve a borrar. Y se empuja lo
         * que `splice` devuelve (la identidad real que estaba en esa posicion), no
         * `card(idxD[dD])`: con el P1-058 eso metia en el descarte una carta que el
         * jugador no habia elegido. */
        idxD.sort(function(a,b){return b-a;});
        for(var dD=0;dD<idxD.length;dD++){S.groupDiscard.push(plD.hand.splice(idxD[dD],1)[0]);}
      }else{
        throw new Error(c.name+': modo de manipulacion de mazo desconocido ("'+dm.mode+'")');
      }
      lastResult=outD;
      break;
    }
    case 'peek_steal':{
      /* 303 Logic Bomb: "one group with a Power of 6 or more". Se mira el Poder
       * IMPRESO de la carta, no el actual: es el mismo criterio que `minPower` en
       * las clausulas de L3a (§42.5), porque el texto habla de "un grupo con un
       * Poder de 6 o más", que es un dato de la carta, y así el coste no cambia
       * cuando otra carta suba el Poder del grupo. */
      if(eff.payMinPower==null)throw new Error(c.name+': la carta no declara el Poder minimo que exige');
      var rS1=opts.rivalPid!=null?opts.rivalPid:firstRivalWithHidden(pid);
      if(rS1==null||rS1<0||rS1===pid)throw new Error(c.name+': elige un rival que tenga alguna Plot oculta');
      var hidS=hiddenPlotsOf(rS1);
      if(!hidS.length)throw new Error(c.name+': '+S.players[rS1].name+' no tiene ninguna Plot oculta');
      var ndS=firstUsableAid(pid,function(cc){return typeof cc.power==='number'&&cc.power>=eff.payMinPower;});
      if(!ndS)throw new Error(c.name+': necesitas la accion de un grupo con un Poder de '+eff.payMinPower+' o mas');
      spendGroupToken(pid,ndS.uid);
      openPeekWindow({kind:eff.kind,label:c.name+' sobre las Plot de '+S.players[rS1].name,byPid:pid,rivalPid:rS1});
      log(c.name+': '+pl.name+' mira '+hidS.length+' Plot oculta(s) de '+S.players[rS1].name+
          ' (accion de '+card(ndS.cardId).name+')');
      lastResult={ok:null,pending:true,peek:true,card:c.name,rival:S.players[rS1].name,
        hidden:hidS.length,paidWith:{uid:ndS.uid,name:card(ndS.cardId).name},
        reason:'ventana de espionaje abierta'};
      break;}
    case 'peek_expose':{
      /* 322 Mutual Betrayal: "This card requires an action by one group" - sin
       * mas filtro, cualquier grupo propio sirve. Reutiliza `payAnyGroup`, el
       * mismo calificador que 210 Botched Contact ya usa en §50. */
      var rS2=opts.rivalPid!=null?opts.rivalPid:firstRivalWithHidden(pid);
      if(rS2==null||rS2<0||rS2===pid)throw new Error(c.name+': elige un rival que tenga alguna Plot oculta');
      var hidE=hiddenPlotsOf(rS2);
      if(!hidE.length)throw new Error(c.name+': '+S.players[rS2].name+' no tiene ninguna Plot oculta');
      var ndE=firstUsableAid(pid,function(){return true;});
      if(!ndE)throw new Error(c.name+': necesita la accion de uno de tus grupos');
      spendGroupToken(pid,ndE.uid);
      openPeekWindow({kind:eff.kind,label:c.name+' sobre las Plot de '+S.players[rS2].name,byPid:pid,rivalPid:rS2});
      log(c.name+': '+pl.name+' mira '+hidE.length+' Plot oculta(s) de '+S.players[rS2].name+
          ' (accion de '+card(ndE.cardId).name+')');
      lastResult={ok:null,pending:true,peek:true,card:c.name,rival:S.players[rS2].name,
        hidden:hidE.length,exposeEqual:hidE.length,
        paidWith:{uid:ndE.uid,name:card(ndE.cardId).name},
        reason:'ventana de espionaje abierta'};
      break;}
    case 'peek_rob':{
      /* 386 The Auditor from Hell: "This card may only be used by the Network or a
       * Computer group, or by a Bank group. It counts as an action for that
       * group." Son TRES pagadores y el texto los enumera, asi que se comprueban
       * en ese orden: primero los grupos por atributo, despues el Illuminati por
       * `effect.code`. Es exactamente el patron que ya uso 278 Hex en §50
       * ("your Illuminati, or by a Magic group with a Power of 3 or more"), y por
       * eso el calificador de atributo es `payAttrAny` (una disyuncion) y no
       * `payAttr` (un solo atributo): "Computer group, or a Bank group" son dos. */
      var rR1=opts.rivalPid!=null?opts.rivalPid:firstRivalWithHidden(pid);
      if(rR1==null||rR1<0||rR1===pid)throw new Error(c.name+': elige un rival que tenga alguna Plot oculta');
      var hidR=hiddenPlotsOf(rR1);
      if(!hidR.length)throw new Error(c.name+': '+S.players[rR1].name+' no tiene ninguna Plot oculta');
      var ndR=null,viaR=null;
      if(Array.isArray(eff.payAttrAny)&&eff.payAttrAny.length){
        ndR=firstUsableAid(pid,function(cc,nn){
          for(var q=0;q<eff.payAttrAny.length;q++){if(hasAttr(cc,eff.payAttrAny[q],nn))return true;}
          return false;
        });
        if(ndR)viaR={uid:ndR.uid,name:card(ndR.cardId).name,via:'grupo'};
      }
      if(!viaR&&eff.illumCode){
        var mcR=illuCard(pid);
        if(mcR&&mcR.effect&&mcR.effect.code===eff.illumCode&&pl.illumTokens>=1)viaR={name:mcR.name,via:'illuminati'};
      }
      if(!viaR)throw new Error(c.name+': solo puede usarla un grupo '+(eff.payAttrAny||[]).join(' o ')+
          ', o tu Illuminati si es '+cap(eff.illumCode));
      if(viaR.via==='grupo')spendGroupToken(pid,ndR.uid);else pl.illumTokens--;
      openPeekWindow({kind:eff.kind,label:c.name+' sobre las Plot de '+S.players[rR1].name,byPid:pid,rivalPid:rR1});
      log(c.name+': '+pl.name+' mira '+hidR.length+' Plot oculta(s) de '+S.players[rR1].name+
          ' (accion de '+viaR.name+')');
      lastResult={ok:null,pending:true,peek:true,card:c.name,rival:S.players[rR1].name,
        hidden:hidR.length,canExposeAll:!!eff.canExposeAll,paidWith:viaR,
        reason:'ventana de espionaje abierta'};
      break;}
    case 'peek_block':{
      /* 242 Double-Cross: "Play this card at any time a rival uses a Plot card to
       * look at YOUR hidden Plot cards". Quien lo juega es la VICTIMA, no un
       * tercero: el propio texto dice "your". Por eso se exige que `pid` sea el
       * rival espiado y no uno cualquiera.
       *
       * DECLARACIÓN 6: las otras dos mitades del texto ("Your opponent loses the
       * card which let him spy on you, and actions that powered it") ya son
       * ciertas sin hacer nada: la ficha se cobró al jugarse la carta espía
       * (P1-022) y la carta espía va sola a `S.plotDiscard` (P1-025). Aquí NO se
       * cierra la ventana: la cierra quien espía, y al hacerlo se encuentra con
       * `cancelledBy` y no ve nada. Es el mismo contrato de dos pasos de §33/§37/§38,
       * y es lo que hace que el texto "He does not get to look at (or steal) any
       * of your cards after all" sea cierto sin ninguna otra operacion. */
      if(!S.pendingPeek)throw new Error(c.name+': no hay ninguna espionaje anunciado que anular');
      var pBk=S.pendingPeek;
      if(pBk.cancelledBy)throw new Error(c.name+': esa espionaje ya fue anulada');
      if(pid!==pBk.data.rivalPid)
        throw new Error(c.name+': solo el dueno de las Plot espiadas puede anular la espionaje');
      pBk.cancelledBy={pid:pid,name:pl.name,cardName:c.name};
      log(c.name+' de '+pl.name+': '+S.players[pBk.byPid].name+' no podra ver ninguna de las Plot de '+pl.name);
      lastResult={ok:false,cancelled:true,card:c.name,blocked:S.players[pBk.byPid].name,
                  reason:'anulado por '+c.name};
      break;}
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
    case 'align_edit':{
      /* L9 — 357 Rewriting History. NO es un align_edit de nodo: el grupo ya esta
       * DESTRUIDO, asi que no tiene nodo — destroyedByMe guarda solo cardId (sin
       * snapshot de alineaciones), luego el overlay vive en S.alignRetro, a nivel
       * de CARTA, y lo consultan tanto nodeAligns (copia re-desplegada) como
       * retroAlignsOf (contador de metas). Ver applyAlignEdit.
       * 332 Orbital Mind Control Lasers NO pasa por aqui: es una accion de Gadget
       * usable "at any time except during a privileged attack" y va por
       * E.useGadgetAction / E.resolveAlignEdit. */
      if(eff.mode!=='destroyed_retro')
        throw new Error(c.name+': este align_edit no se juega con la carta (modo '+eff.mode+')');
      /* P1-065 - 357 dice "Play this card at any time": NO es una carta de la
       * ventana de SUCESO (a diferencia de 249 EMBEZZLEMENT, que si lo es y por
       * eso exige pendingEvent). Este case ABRIA su propia ventana y ademas la
       * exigia previa, con lo que 357 era INJUGABLE: la regresion L9 lo cazo con
       * el error "Rewriting History: no hay ningun suceso pendiente". Ahora se
       * comprueba que no haya YA una ventana abierta (no se pisa una decision
       * ajena) y se crea la propia mas abajo. */
      /* Candidatos: TODOS los grupos destruidos por cualquier jugador, deduplicados
       * por carta. El texto dice "any destroyed group", sin posesivo. */
      var destrR=[];
      for(var qR=0;qR<S.players.length;qR++)
        (S.players[qR].destroyedByMe||[]).forEach(function(cdR){
          if(destrR.indexOf(cdR)<0)destrR.push(cdR);});
      if(!destrR.length)
        throw new Error(c.name+': no hay ningun grupo destruido al que reescribir su historia');
      /* COSTE DISYUNTIVO — "It requires an action by your luminati, OR actions by
       * Media Groups with a total Power of at least 8." Es el mismo patron que
       * force_align (el comentario de 386 dice que es el patron de 278 Hex, §50):
       * primero el Illuminati y, si no hay fichas, acumular Poder de grupos con el
       * atributo hasta el minimo.
       * DIFERENCIA CON force_align, y es deliberada: aqui se REUNE primero y se
       * GASTA despues. force_align llama a spendGroupToken DENTRO del walk y
       * despues lanza si no llega — es decir, gasta fichas y luego falla. Aqui no:
       * si el pago no se completa, no se ha gastado nada. */
      var costR=eff.payMinPower||8,paidR=null;
      if(pl.illumTokens>=1){pl.illumTokens--;paidR={via:'illuminati',groups:[]};}
      if(!paidR){
        var needR=costR,pickedR=[];
        walk(pl.structure,function(nR){
          if(needR<=0)return;
          if(nR===pl.structure)return;
          if(noTokensFlag(nR))return;
          if(!nR.tokens||nR.tokens<1)return;
          var ncR=card(nR.cardId);
          if(!ncR)return;
          if(!hasAttr(ncR,eff.payAttr||'media',nR))return;
          pickedR.push({uid:nR.uid,name:ncR.name,power:curPower(nR)});
          needR-=curPower(nR);
        });
        if(needR>0){
          if(!pickedR.length)
            throw new Error(c.name+': necesitas una accion de tu Illuminati, o grupos Media con Poder total '+costR+', y no tienes ninguna de las dos');
          throw new Error(c.name+': necesitas '+costR+' de Poder de grupos Media; los tuyos sin ficha solo aportan '+(costR-needR)+' (accion del Illuminati: sin fichas)');
        }
        pickedR.forEach(function(gR){spendGroupToken(pid,gR.uid);});
        paidR={via:'groups',groups:pickedR};
      }
      if(S.pendingEvent)
        throw new Error(c.name+': ya hay un suceso pendiente de resolucion');
      /* P1-065 - la ventana la ABRIMOS aqui (ver comentario arriba). */
      var pR={owner:{byPid:pid,byName:pl.name},
              data:{cardIdx:handIdx,retroCandidates:destrR,retroCardId:null},
              responders:[]};
      S.pendingEvent=pR;
      pR.data.retroCandidates=destrR;
      pR.data.retroCardId=null;
      pR.responders=[];
      log(c.name+': '+pl.name+' va a reescribir la historia de uno de '+destrR.length+' grupo(s) destruido(s) · coste '+costR+' pagado con '+(paidR.via==='illuminati'?'una accion del Illuminati':paidR.groups.map(function(g){return g.name;}).join(' + ')));
      lastResult={ok:true,plot:c.name,pending:true,reason:'reescribe la historia de un grupo destruido',
        retroCandidates:destrR.length,cost:costR,paidWith:paidR};
      break;}
    case 'dup_enabler':{
      /* L11 - 220/227/287/309 NO son jugables por su cuenta: su texto dice "Used this
       * card WHEN YOU PLAY, from your hand, ... which duplicates a Group/Personality
       * that has already been destroyed/Assassinated". Sin el duplicado no hay nada
       * que liberar, asi que jugar la habilitadora sola dejaria la carta sin efecto
       * (el "no-op silencioso" que la familia de power_increase ya hace explicito con
       * su "la carta no tiene efecto"). Se rechaza con el motivo oficial para que el
       * jugador sepa que tiene que ir por E.playGroupFromHand, que juega LAS DOS
       * cartas en una sola llamada. */
      throw new Error(c.name+' no se juega sola: usala al mismo tiempo que el duplicado '+
        (eff.dupOf==='personality'?'de una Personality asesinada':'de un Group ya destruido')+
        ', que debes jugar desde tu mano');
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
    case 'resource_effect':{
      /* L12 - MANIPULACION DE RESOURCES. 236/348/400 son Plot cards y llegan aqui por
       * E.playPlot; 378/413 son Resource cards y llegan por E.playResource (su case esta
       * al lado de bulk_power/draw_hook).
       * LIMITE DECLARADO, escrito en el propio motor desde case resource_destroy: el mazo
       * NO tiene clasificacion de Resources, 34 de los 35 tienen subtype:null, el mismo
       * motivo por el que se solto el Gadget Resource de 270. No se inventa ninguna
       * categoria. Por eso las tres cartas que el impreso limita a Gadget (236),
       * Artifact o Gadget (400) o Agent (348) NO filtran por eso: la palabra impresa
       * viaja en printedRestrict como declaracion, y el objetivo es cualquier Resource de
       * un rival. Es el mismo criterio que aplico 278 Hex a su 'A Magic Resource'.
       * ORDEN DE VALIDACION: primero el OBJETIVO impreso y despues el COSTE impreso, para
       * que una carta rechazada no deje fichas gastadas ni estado a medias. */
      var rFx=eff.mode;
      /* --- 236 Deasil Engine --- */
      if(rFx==='reverse'){
        /* El parentesis del impreso: si se juega otro Deasil Engine inmediatamente, los
         * dos se cancelan. */
        if(eff.cancelsPair&&S.pendingResDestroy&&S.pendingResDestroy.mode==='reverse'){
          S.pendingResDestroy=null;
          log(c.name+' se cancela con otro '+c.name+' inmediato: no ocurre nada');
          lastResult={ok:true,cancelledPair:true,card:c.name,kind:'resource_effect'};
          break;}
        var revR=findResourceEntry(opts.resUid);
        if(!revR)throw new Error(c.name+': elige el Resource que va a correr hacia atras (el motor no lo elige por ti)');
        var arrR=S.players[revR.pid].resources;
        var deadR=arrR.splice(arrR.indexOf(revR.entry),1)[0];
        /* 'destroying itself. Its owner must discard it.' */
        S.groupDiscard.push(deadR.cardId);
        log(c.name+': el Resource '+card(deadR.cardId).name+' de '+S.players[revR.pid].name+
            ' corre hacia atras y se autodestruye; '+S.players[revR.pid].name+' lo descarta');
        lastResult={ok:true,negated:true,card:c.name,kind:'resource_effect',mode:'reverse',
          target:card(deadR.cardId).name,targetPid:revR.pid,owner:S.players[revR.pid].name,paidWith:null};
        break;}
      /* --- 348 Purge --- */
      if(rFx==='purge'){
        var tP=findNode(opts.targetUid);
        if(!tP)throw new Error(c.name+': elige el grupo que la va a usar (el motor no lo elige por ti)');
        var ownP=findOwnerPid(opts.targetUid);
        if(ownP==null)throw new Error(c.name+': ese grupo ya no esta en juego');
        /* 'as an action for the group that uses it': la ficha la gasta ESE grupo y no el
         * jugador que la juega (mismo criterio que P1-017). */
        if(noTokensFlag(tP))throw new Error(c.name+': '+card(tP.cardId).name+' no puede actuar ahora');
        if(typeof tP.tokens!=='number'||tP.tokens<1)
          throw new Error(c.name+': '+card(tP.cardId).name+' no tiene fichas de accion para usar '+c.name);
        var isIlluP=(tP.uid===S.players[ownP].illumId);
        if(isIlluP){
          /* 'Used by your Illuminati, it destroys all Agent cards currently in play which
           * duplicate your own Illuminati group.' LIMITE DEL MAZO: el deck lleva una sola
           * copia de cada Illuminati, asi que no puede existir una carta que lo duplique.
           * Se DECLARA, no se simula, y no queda como carta decorativa a medias. */
          log(c.name+': tu Illuminati purga, pero el mazo no tiene copias de tu Illuminati que purgar (limite del mazo, no de la carta)');
          lastResult={ok:true,card:c.name,kind:'resource_effect',mode:'purge',byIlluminati:true,
            target:card(tP.cardId).name,owner:S.players[ownP].name,paidWith:{uid:tP.uid,name:card(tP.cardId).name},
            notes:['Ningun Agent puede duplicar a tu Illuminati: el mazo tiene una sola copia']};
          break;}
        /* 'Used by another group, it reduces the groups Power and Global Power by 1, but
         * makes it permanently immune to duplicate Group cards played by rivals.' En este
         * motor Global Power es exactamente lo que aporta a las metas y globalNeutral es
         * su interruptor (L162-L172, P1-067), asi que globalNeutral=true ES el -1 Global
         * Power. El -1 Power no dice permanently en el impreso: se pliega en powerTax, que
         * el nodo resta mientras la carta siga enlazada. dupImmune SI es permanente. */
        tP.tokens--;
        tP.powerTax=(tP.powerTax||0)+1;
        tP.globalNeutral=true;
        tP.dupImmune=true;
        pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:tP.uid});
        log(c.name+' usada por '+card(tP.cardId).name+': -1 Poder, deja de aportar a las '+
            'metas (-1 Global Power) y queda inmune de forma permanente a Group duplicadas de rivales');
        lastResult={ok:true,card:c.name,kind:'resource_effect',mode:'purge',byIlluminati:false,
          target:card(tP.cardId).name,owner:S.players[ownP].name,paidWith:{uid:tP.uid,name:card(tP.cardId).name},
          globalNeutral:true,dupImmune:true,linked:true};
        break;}
      /* --- 400 The Weak Link --- */
      if(rFx==='weak_link'){
        if(eff.notDuringPrivileged&&S.attack&&S.attack.privilege)
          throw new Error(c.name+': no se puede jugar durante un ataque privilegiado');
        var wlR=findResourceEntry(opts.resUid);
        if(!wlR)throw new Error(c.name+': elige el Resource de un rival que vas a destruir (el motor no lo elige por ti)');
        if(wlR.pid===pid)
          throw new Error(c.name+': solo destruye Resources de un rival (el impreso dice owned by a rival)');
        /* COSTE DISYUNTIVO, reunir antes de gastar (patron de 357 Rewriting History,
         * seccion 50): primero tu Illuminati y, si no hay ficha, Poder COMBINADO de grupos
         * con uno de los atributos impresos hasta el minimo. Si el pago no se completa, no
         * se ha gastado nada. El objetivo ya esta validado. */
        var costW=eff.payMinPower,paidW=null,attrsW=(eff.payAttrAny||[]);
        if(eff.payIllum&&pl.illumTokens>=1){pl.illumTokens--;paidW={via:'illuminati',groups:[]};}
        if(!paidW){
          var needW=(typeof costW==='number'?costW:0),pickedW=[];
          walk(pl.structure,function(nW){
            if(needW<=0)return;
            if(nW.cardId==null||noTokensFlag(nW))return;
            if(typeof nW.tokens!=='number'||nW.tokens<1)return;
            for(var aW=0;aW<attrsW.length;aW++)if(hasAttr(card(nW.cardId),attrsW[aW],nW)){needW-=(curPower(nW)||0);pickedW.push(nW.uid);return;}
          });
          if(needW>0)throw new Error(c.name+' necesita la accion de tu Illuminati o de grupos '+
            (attrsW.length?attrsW.join(', '):'con atributo')+' con un Poder combinado de al menos '+
            (typeof costW==='number'?costW:0)+' (te faltan '+needW+' de Poder)');
          for(var gW=0;gW<pickedW.length;gW++)spendGroupToken(pid,pickedW[gW]);
          paidW={via:'groups',groups:pickedW.slice()};
        }
        var arrW=S.players[wlR.pid].resources;
        var deadW=arrW.splice(arrW.indexOf(wlR.entry),1)[0];
        S.groupDiscard.push(deadW.cardId);
        log(c.name+': el Resource '+card(deadW.cardId).name+' de '+S.players[wlR.pid].name+' se destruye (accion pagada con '+
            (paidW.via==='illuminati'?'tu Illuminati':paidW.groups.length+' grupo(s) con Poder combinado')+')');
        lastResult={ok:true,negated:true,card:c.name,kind:'resource_effect',mode:'weak_link',
          target:card(deadW.cardId).name,targetPid:wlR.pid,owner:S.players[wlR.pid].name,
          paidWith:paidW.via==='illuminati'?{via:'illuminati'}:{via:'groups',groups:paidW.groups.length}};
        break;}
      throw new Error(c.name+': modo de resource_effect desconocido ('+String(rFx)+')');
    }
    case 'disaster_defence':{
      /* L13 - DEFENSA CONTRA DISASTERS. 243/410/188/244 son Plot cards y llegan aqui por
       * E.playPlot; 245 Earthquake Projector es la unica de las 5 que es Resource card y
       * llega por E.playResource (su case esta al lado de bulk_power/draw_hook).
       * REGLA DE DISENO DEL LOTE: el bonus se escribe SOBRE EL NODO del Place
       * (nd.destroyBonus / nd.defenseTripled / nd.magicMayOppose), nunca sobre un campo
       * del ataque. Motivo, el mismo que P1-016 ya explico para 208 Bodyguard y 382
       * Talisman: la proteccion es permanente y sobrevive al ataque que la puso a prueba.
       * Y destroyBonus lo lee destroyDefenseBonus() en el calculo de defPower, o sea
       * que suma SOLO a la defensa y NO toca curPower(): por eso el lote cumple la
       * regla oficial de plan.md de que no afecta al Poder del Place. */
      var dd=eff;
      var ndD=findNode(targetUid);
      /* 243 y 244 imprimen "Gives one Place" / "protect a Place", sin decir "your".
       * No se inventa la restriccion de propiedad: el objetivo es CUALQUIER Place en
       * juego, propio o rival, y lo elige el jugador (DoD 6), nunca el motor. */
      if(!ndD)throw new Error(c.name+': elige un Place objetivo');
      var tcD=card(ndD.cardId);
      if(tcD.subtype!=='place')
        throw new Error(c.name+': solo se juega sobre un Place (Lugares), y '+tcD.name+' es '+String(tcD.subtype||'grupo'));
      var ownD=findOwnerPid(targetUid);
      var modeD=dd.mode;
      if(modeD==='static_defence'){
        /* 243 Early Warning +10 y 410 Volunteer Aid +6: "Gives one Place a +N to
         * defend against any Disaster". SUMA, no pisa: dos 243 seguidas dan +20, que es
         * lo que dicen las reglas cuando varios efectos se acumulan. "Playing this card
         * is a free action" significa que no cuesta la accion de un grupo, NO que se
         * pueda jugar fuera de turno: por eso estas cartas NO estan en la lista instant
         * de E.playPlot y siguen exigiendo requireOwnMain. */
        if(typeof dd.defenseBonus!=='number')
          throw new Error(c.name+': el bonus de defensa de esta carta no esta declarado (defenseBonus)');
        ndD.destroyBonus=(ndD.destroyBonus||0)+dd.defenseBonus;
        if(dd.reliefPending){
          /* 410: el Relief es AUTOMATICO y llega al principio del turno del dueno del
           * Place. Se ancla con untilTurn=S.turn+1 y lo consume expireTurnFlags(), que
           * E.beginTurn llama PRIMERO (L1164) con S.turn ya incrementado: precedente
           * exacto de n.defTriple.untilTurn (L1104). Se guarda byPid para filtrar por
           * dueno, porque el walk de expireTurnFlags recorre los grupos de TODOS. */
          ndD.reliefPending={untilTurn:S.turn+1,byPid:ownD,byCard:handIdx};
        }
        log(c.name+' protege a '+tcD.name+' con +'+dd.defenseBonus+' contra cualquier Disaster'+(dd.reliefPending?' y con Relief automatico al empezar el proximo turno de '+S.players[ownD].name:''));
        lastResult={ok:true,negated:true,card:c.name,kind:'disaster_defence',mode:modeD,
          target:tcD.name,defense:dd.defenseBonus,relief:!!dd.reliefPending,
          notes:[c.name+' da +'+dd.defenseBonus+' de defensa a '+tcD.name+(dd.reliefPending?' y Relief automatico':'')]};
        break;
      }
      if(modeD==='triple_defence'){
        /* 188 Air Magic: "Playing this card is an action for a Magic group. Alternatively,
         * you may sacrifice the top Plot card from your deck, to power this card. Discard
         * it without looking at it." El texto pone "Requires Magic Action or Discard", o
         * sea que la accion del grupo Magic y el sacrificio son ALTERNATIVAS, no
         * acumulativas. El sacrificio es shift() sobre el mazo de Plots, que es
         * literalmente "la carta superior, sin mirarla", y va al descarte de Plots. */
        var aaD=null;
        if(dd.requireActionFromAttr){
          aaD=opts.aidUid?findNode(opts.aidUid):null;
          if(opts.aidUid&&(!aaD||findOwnerPid(opts.aidUid)!==pid))
            throw new Error('El grupo que aporta la accion debe ser tuyo');
          if(!aaD)aaD=firstUsableAid(pid,function(cq,nq){return hasAttr(cq,dd.requireActionFromAttr,nq);});
        }
        if(aaD){
          spendGroupToken(pid,aaD.uid);
          log(c.name+' se paga con la accion de '+card(aaD.cardId).name);
        }else if(dd.orSacrificeTopPlot){
          if(!pl.plotDeck||!pl.plotDeck.length)
            throw new Error(c.name+': no tienes cartas en tu mazo de Plots que sacrificar');
          var sacD=pl.plotDeck.shift();
          S.plotDiscard.push(sacD);
          log(c.name+' se paga sacrificando '+card(sacD).name+' (la carta superior de tu mazo de Plots, descartada sin mirarla)');
        }else{
          throw new Error(c.name+' necesita la accion de un grupo tuyo '+String(dd.requireActionFromAttr)+' o sacrificar la carta superior de tu mazo de Plots');
        }
        /* El flag va en el nodo del Place y guarda la lista de excepciones tal cual la
         * imprime la carta. announcePlotInstantAttack la lee al calcular defPower. */
        ndD.defenseTripled={byCard:handIdx,except:Array.isArray(dd.exceptDisasters)?dd.exceptDisasters.slice():[]};
        pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:ndD.uid});
        log(c.name+' protege a '+tcD.name+': su Poder de defensa se triplica para esta defensa (excepto los Disaster de la lista impresa)');
        lastResult={ok:true,negated:true,card:c.name,kind:'disaster_defence',mode:modeD,
          target:tcD.name,tripled:3,except:ndD.defenseTripled.except.slice(),
          notes:[c.name+' triplica la defensa de '+tcD.name+' salvo '+(ndD.defenseTripled.except.join(', ')||'ningun Disaster')]};
        break;
      }
      if(modeD==='aid_restriction'){
        /* 244 Earth Magic: "Using this card any Magic group in play use their Action
         * tokens to oppose the attack." NO hay linea de coste en el impreso: no se
         * inventa ninguna accion que cobrar, asi que jugar la carta es la unica accion y
         * el efecto es la restriccion. El flag lo lee announcePlotInstantAttack para
         * cambiar el filtro de firstUsableAid(victim, null), que HOY acepta CUALQUIER
         * grupo del defensor (P1-016: solo giantkudzu declara victimMayBeAided). */
        if(!dd.aidAttr)
          throw new Error(c.name+': el atributo que restringe a los grupos no esta declarado (aidAttr)');
        ndD.magicMayOppose={attr:dd.aidAttr,byCard:handIdx};
        pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:ndD.uid});
        log(c.name+' protege a '+tcD.name+': solo los grupos '+dd.aidAttr+' en juego pueden oponerse al Disaster con su ficha de accion'+(dd.printedCostAbsent?' (el impreso no declara coste para esta carta)':''));
        lastResult={ok:true,negated:true,card:c.name,kind:'disaster_defence',mode:modeD,
          target:tcD.name,aidAttr:dd.aidAttr,printedCostAbsent:!!dd.printedCostAbsent,
          notes:['Solo los grupos '+dd.aidAttr+' pueden oponerse al Disaster de '+tcD.name].concat(dd.printedCostAbsent?['El impreso de esta carta no declara coste: no se inventa ninguno']:[])};
        break;
      }
      throw new Error(c.name+': modo de disaster_defence desconocido ('+String(modeD)+')');
    }
    case 'turn_control':{
      /* L14 — 364 Seize the Time! (unica carta de este lote).
       * IMPRESO: "Play this card at the beginning of any other player's turn. It
       * becomes your turn instead. After your turn is over, the turn passes back to
       * the player whose turn you interrupted (unless someone won). During your special
       * turn, all your groups get Action tokens, but you may not draw Plot or Group
       * cards for any reason. No player may use this card more than once in a game!"
       *
       * PRECEDENTE EXACTO: `case 'turn_start_block'` (405 Unlucky 13, L8c) comparte
       * las tres primeras lineas: el TIMING es la ventana `S.pendingTurnStart`, que
       * abre `E.endTurn` entre turnos, y el objetivo es el jugador cuyo turno iba a
       * empezar. La diferencia es que 405 CONSUME la ventana para BLOQUEAR el robo y
       * arranca el turno del rival; 364 la consume para ROBARSE el turno.
       *
       * POR QUE ES `instant` (P1-101, corregido al medir). En esta lista `instant` NO
       * significa "se puede jugar a cualquier hora": significa "esta carta NO requiere
       * turno propio". Al abrirse la ventana pendingTurnStart, E.endTurn YA ha movido
       * currentPid al rival que va a empezar, asi que requireOwnMain(actor) lanzaria
       * "No es tu turno" y la carta seria INJUGABLE. El timing real lo valida ESTE
       * case (ventana abierta + forPid distinto del actor), igual que en 405, que esta
       * en la misma lista. L14.c razono al reves y por eso el bug solo aparecio al medir.
       *
       * EL COSTE ES GRATIS: el impreso no pide ninguna accion ("No player may use this
       * card more than once in a game" es la unica restriccion). Por eso esta carta NO
       * declara `requireActionFromAttr` y no toca el gate P1-055.
       *
       * REGLA DEL CASO (la de 405): se valida TODO antes de tocar nada. */
      var plTC=S.players[pid];
      var WTC=S.pendingTurnStart;
      if(!WTC)
        throw new Error(c.name+': solo es jugable al comienzo del turno de un rival (no hay ventana de reaccion abierta)');
      if(WTC.forPid===pid)
        throw new Error(c.name+': no puedes robarte tu propio turno');
      if(eff.oncePerGamePerPlayer&&plTC.flags&&plTC.flags.seizeTimeUsed)
        throw new Error(c.name+': "No player may use this card more than once in a game" — '+plTC.name+' ya la ha usado');
      if(eff.returnTurnAfter&&S.returnTurnTo!=null)
        throw new Error(c.name+': ya hay un turno especial pendiente de devolver');
      if(eff.allGroupsGetTokens&&!subtreeList(plTC.structure).length)
        throw new Error(c.name+': no tienes grupos en tu Power Structure a los que dar ficha de accion');
      /* --- EFECTO, en este orden y por estos motivos --- */
      var backTC=WTC.forPid;
      /* 1) Guardar a quien hay que devolverle el turno ANTES de limpiar la ventana:
       * `E.beginTurn` y el tail de `playPlot` (que descarta la carta jugada) corren
       * despues, y la ventana es el unico sitio donde vive el jugador interrumpido. */
      if(eff.returnTurnAfter)S.returnTurnTo=backTC;
      S.pendingTurnStart=null;
      /* 2) Robarse el turno. `beginTurn` resetea los flags por turno y reparte ficha
       * de accion a los grupos que no tengan: es exactamente el arranque normal. */
      S.phase='begin';
      E.beginTurn(pid);
      /* 3) "all your groups get Action tokens": el impreso dice TODOS, no "los que no
       * tengan ficha", asi que se ponen a 1 DESPUES de beginTurn (que solo repone a
       * los que faltan). El flag noDrawTurn va DESPUES tambien: beginTurn lo resetea,
       * asi que ponerlo antes seria codigo muerto. */
      if(eff.allGroupsGetTokens){
        walk(plTC.structure,function(ndTC){
          if(ndTC.cardId==null)return;
          ndTC.tokens=1;
        });
      }
      if(eff.noDrawForAnyReason)plTC.flags.noDrawTurn=true;
      if(eff.oncePerGamePerPlayer)plTC.flags.seizeTimeUsed=true;
      log(c.name+': el turno pasa a '+plTC.name+' (le habia interrumpido el de '+S.players[backTC].name+')');
      lastResult={ok:true,negated:true,card:c.name,kind:'turn_control',mode:eff.mode,
        specialTurn:true,returnTo:backTC,allTokens:!!eff.allGroupsGetTokens,
        noDraw:!!eff.noDrawForAnyReason,notes:['El turno de '+S.players[backTC].name+' vuelve cuando este termine']};
      break;
    }
    /* L19 (2026-10) — 354 Reorganization.
       IMPRESO VERBATIM: "Reorganization You may completely reorganize your entire
       Power Structure. You may play this card at any time during your own turn. It
       requires an action from your Illuminati. Requires Illuminati Action"

       TIMING: "at any time DURING YOUR OWN turn", no "at any time". Por eso 354 NO
       esta en la lista `instant` de la cabecera de E.playPlot: requireOwnMain ya
       garantiza turno propio y main phase, y no hace falta veto de S.attack. Es el
       criterio que P1-017 aplico a 239 Dictatorship ("Play this card during your
       turn"), otra carta con el mismo tipo de timing.

       COSTE: "an action from your Illuminati" -> 1 de pl.illumTokens.

       EFECTO: "completely reorganize your entire Power Structure". NO es automatico:
       el jugador elige, grupo por grupo, su nuevo maeastre. Por eso el case exige
       opts.moves y la UI ofrece el selector (DoD#6). La validacion y el desmontaje
       son los de applyStructureMoves(), los mismos que usa E.organize (Bermuda
       Triangle), extraidos en este lote para que no haya dos copias que diverjan.

       ORDEN DE VALIDACION (todo ANTES de mutar nada):
       (1) turnos y acciones; (2) que la lista de movimientos exista y no sea vacia.
       applyStructureMoves valida TODOS los movimientos antes de aplicar el primero,
       asi que un lista con un movimiento invalido no deja la estructura a medio
       desmontar. */
    case 'structure_reorg':{
      requireOwnMain(pid);
      if(eff.payIllum&&pl.illumTokens<1)
        throw new Error(c.name+' requiere una accion de tu Illuminati: "'+c.name+
                        '" dice "It requires an action from your Illuminati"');
      if(eff.movesRequired&&(!opts.moves||!opts.moves.length))
        throw new Error(c.name+': elige al menos un grupo al que cambiar de maeastre ('+
                        '"You may completely reorganize your entire Power Structure" no reorganiza nada si no mueves nada)');
      applyStructureMoves(pid,opts.moves,c.name);
      if(eff.payIllum)pl.illumTokens--;
      log(S.players[pid].name+' juega '+c.name+' ('+opts.moves.length+' movimiento/s de estructura)');
      lastResult={ok:true,negated:false,card:c.name,kind:'structure_reorg',
        moves:opts.moves.length,freeMoving:!!eff.freeMoving,
        notes:['Power Structure reorganizada: mismo control, mismo Poder total']};
      break;
    }
    /* L20 (2026-10) - 408 Upheaval!
       IMPRESO VERBATIM: "Upheaval! Worldwide riots continue for a third week, with no
       sign of abatement Each player must choose one group from their Power Structure
       and discard it. These do not count as destroyed for anyones victory conditions.
       This card may be played at any time. It requires an action by your Illuminati.
       Requires Illuminati Action"

       TIMING: "This card may be played at any time" es un "at any time" DE VERDAD (a
       diferencia de 354, que decia "at any time DURING YOUR OWN turn"), asi que 408
       entra en la lista `instant` de la cabecera de E.playPlot y NO llama a
       requireOwnMain: se puede jugar en el turno del rival. El veto de `S.attack` no
       hace falta porque el impreso no lo prohibe.

       COSTE: "an action by your Illuminati" -> 1 de pl.illumTokens.

       EFECTO: "EACH player must CHOOSE one group from their Power Structure and
       discard it". Dos consecuencias que se implementan de forma explicita:
         (1) LA ELECCION ES DEL JUGADOR, y es de CADA jugador. Por eso el case exige
             `opts.choices`, un uid por jugador en orden de pid, y valida que cada uid
             sea un grupo de ESE jugador. Un `null` es legal solo para quien no tenga
             grupos. Nunca se elige solo (DoD#6).
         (2) "These do not count as destroyed for ANYONE'S victory conditions": cada
             retiro pasa por destroyGroup con `noCountAsDestroyed:true`, asi que no
             escribe en destroyedByMe, ni en destroyedIlluminati, ni dispara el robo de
             Plot de Servants of Cthulhu (P1-120).

       ATOMICIDAD: se valida la lista COMPLETA de los dos jugadores antes de retirar
       nada, igual que hace applyStructureMoves (P1-115). Si un solo grupo no es legal,
       no se retira ninguno y no se gasta la accion.

       NO se llama a checkElimination ni a checkVictory al terminar: el impreso dice que
       no cuentan como destruidos, asi que perder el ultimo grupo por 408 no es una
       eliminacion. */
    /* L20 (P1-122) - los GRUPOS de un jugador, sin su nodo raiz.
     * `subtreeList(pl.structure)` incluye el propio nodo raiz, y en este motor el
     * raiz ES el Illuminati (node.cardId = id del Illuminati, no null). Para 408 eso
     * importa: "one group from their Power Structure" no puede ser el Illuminati,
     * porque el Illuminati no se descarta, es la faccion. Por eso esta funcion
     * recorre `structure.children` y no `structure`. Es la MISMA distincion que ya
     * hacen `walk` + `nd.cardId!=null` en L15 para contar grupos por alineacion, y la
     * que hace `placeUnder` al exigir un maeastre real. */
    function playerGroupsExIllum(pl20){
      var out20=[];
      (function rec20(n20){(n20.children||[]).forEach(function(ch20){if(ch20.cardId!=null)out20.push(ch20);rec20(ch20);});})(pl20.structure);
      return out20;
    }
    case 'global_discard':{
      if(eff.payIllum&&pl.illumTokens<1)
        throw new Error(c.name+' requiere una accion de tu Illuminati: "'+c.name+
                        '" dice "It requires an action by your Illuminati"');
      var ch20=opts.choices;
      if(!Array.isArray(ch20)||ch20.length!==S.players.length)
        throw new Error(c.name+': "Each player must choose one group" - hay que elegir un grupo para CADA jugador ('+S.players.length+' elecciones)');
      /* VALIDACION COMPLETA de los dos jugadores antes de retirar nada. */
      for(var q20=0;q20<S.players.length;q20++){
        var uid20=ch20[q20];
        var own20=playerGroupsExIllum(S.players[q20]);
        if(uid20==null){
          if(own20.length)
            throw new Error(c.name+': '+S.players[q20].name+' tiene '+own20.length+
                            ' grupo(s) y su eleccion va vacia - "Each player must choose one group"');
          continue;
        }
        /* La eleccion tiene que estar en la lista de GRUPOS del jugador, no solo ser suya:
         * findOwnerPid() daria por bueno el nodo RAIZ, que es el Illuminati (tiene
         * cardId), y descartar el Illuminati no es una jugada del juego. */
        var ownList20=own20.map(function(x){return x.uid;});
        if(ownList20.indexOf(uid20)<0)
          throw new Error(c.name+': el grupo elegido para '+S.players[q20].name+' no es suyo (o es su Illuminati, que no se descarta)');
        var nd20=findNode(uid20);
        if(!nd20||nd20.cardId==null)
          throw new Error(c.name+': el grupo elegido para '+S.players[q20].name+' no existe o no es un grupo');
        if(subtreeList(nd20).length!==1)
          throw new Error(c.name+': el grupo elegido para '+S.players[q20].name+' tiene títeres; el impreso dice "one group from their Power Structure", no "uno y sus títeres"');
      }
      /* RETIRO. byPid = -1 porque aqui NADIE es el que destruye: la contabilidad de
         destruccion esta desactivada por `noCountAsDestroyed`, y asi el log no
         atribuye la accion a ningun jugador. */
      var out20=[];
      for(var r20=0;r20<S.players.length;r20++){
        if(ch20[r20]==null)continue;
        var ndR20=findNode(ch20[r20]);
        var nm20=card(ndR20.cardId).name;
        destroyGroup(-1,ch20[r20],{noCountAsDestroyed:true});
        out20.push(S.players[r20].name+' descarta '+nm20+' (no cuenta como destruido)');
        log('408 Upheaval!: '+S.players[r20].name+' descarta '+nm20+' - estos grupos no cuentan como destruidos para ninguna condicion de victoria');
      }
      if(eff.payIllum)pl.illumTokens--;
      lastResult={ok:true,negated:false,card:c.name,kind:'global_discard',
        discarded:out20.length,noDestroyCount:true,notes:['Ninguno de los grupos descartados cuenta como destruido']};
      break;
    }
    case 'control_arrows':{
      /* L18 - 298 Lets Get Organized / 299 Let's Get REALLY Organized.
       * IMPRESO 298: "Play this card during your turn, on any Group card that has
       * fewer than three outgoing control arrows. This is an action for that group
       * or its master. You must control the target. The target group gains an extra
       * control arrow, ... Place this card underneath it, with an arrow showing, to
       * provide the new arrow. Duplicates of this card may not be used on the same
       * group."
       * IMPRESO 299: "Play this card during your turn, on any Group card that has one
       * or two outgoing control arrows. ... The target group now has three outgoing
       * control arrows. Place this card underneath it to provide the new arrows, or
       * link this card to it to indicate that there are now three arrows."
       *
       * PRECEDENTE EXACTO: L11 (E.playGroupFromHand) coloca una carta de la mano
       * DEBAJO de un grupo propio con placeUnder(), que es literalmente lo que
       * imprimen estas dos cartas; y P1-023 (maxChildren/isOpenArrow) es el
       * contador de flechas. La unica novedad es el registro S.l18extra de flechas
       * extra, cuya escritura es lo unico no trivial:
       *   - 298 sube la capacidad ANTES de colocar. Si se colocara antes, un grupo
       *     con 0 flechas libres pasaria el filtro "fewer than three" y despues
       *     placeUnder lanzaria "Sin flecha de control libre", o sea la carta seria
       *     INJUGABLE justo en el caso que el impreso describe.
       *   - 299 coloca PRIMERO y luego fija la capacidad al valor que deja 3 libres:
       *     extra = hijos tras la colocacion, y LIBRE = (3 + n) - n = 3 exacto. Con
       *     1 o 2 libres antes de jugar, tras colocar hay 2 o 3 hijos.
       * REGLA DEL CASO: se valida TODO antes de mutar (P1-011/L11). */
      var eff18=eff||{};
      requireOwnMain(pid);
      var uid18=targetUid!=null?targetUid:(opts&&opts.targetUid);
      var t18=uid18?findNode(uid18):null;
      if(!t18)throw new Error(c.name+': elige un Group card de tu Power Structure como objetivo ("on any Group card")');
      if(t18.cardId==null)throw new Error(c.name+': el objetivo no es un Group card ("on any Group card")');
      if(card(t18.cardId).type!=='group')throw new Error(c.name+': '+card(t18.cardId).name+' no es un Group card ("on any Group card")');
      if(findOwnerPid(t18.uid)!==pid)throw new Error(c.name+': "You must control the target" - no controlas '+card(t18.cardId).name);
      /* Duplicados: solo 298 lo imprime. Se aplica a las dos porque 299 es
       * idempotente y sin veto una carta idempotente es un agujero. */
      if(eff18.noDuplicates){
        for(var q18=0;q18<t18.children.length;q18++){
          var ch18=C.cards[t18.children[q18].cardId];
          if(ch18&&ch18.effect&&ch18.effect.kind==='control_arrows')
            throw new Error(c.name+': "Duplicates of this card may not be used on the same group" - '+card(t18.cardId).name+' ya tiene una carta de flechas debajo');
        }
      }
      var ar18=outArrowsOf(t18);
      if(eff18.mode==='gain_one'&&ar18.free>=3)
        throw new Error(c.name+': "any Group card that has fewer than three outgoing control arrows" - '+card(t18.cardId).name+' ya tiene 3 libres');
      if(eff18.mode==='reach_three'&&ar18.free!==1&&ar18.free!==2)
        throw new Error(c.name+': "any Group card that has one or two outgoing control arrows" - '+card(t18.cardId).name+' tiene '+ar18.free+' libres');
      /* COSTE: "This is an action for that group or its master." El objetivo o su
       * padre en el arbol (que si cuelga de la raiz es el Illuminati). Se busca un
       * DONANTE real antes de mutar nada; si no hay, no se gasta nada. */
      var m18=masterNodeOf(t18);
      var donor18=null;
      if(t18.tokens>=1&&!noTokensFlag(t18))donor18=t18;
      else if(m18&&m18.cardId!=null&&m18.tokens>=1&&!noTokensFlag(m18))donor18=m18;
      if(!donor18)
        throw new Error(c.name+': "This is an action for that group or its master" - ni '+card(t18.cardId).name+' ni su master tienen Action token');
      /* EFECTO */
      spendGroupToken(pid,donor18.uid);
      if(eff18.mode==='gain_one'){
        S.l18extra[t18.uid]=extraArrowsOf(t18)+1;
        placeUnder(pid,handIdx,t18.uid);
      }else{
        placeUnder(pid,handIdx,t18.uid);
        var after18=findNode(t18.uid);
        S.l18extra[after18.uid]=after18.children.length;
      }
      var fin18=outArrowsOf(findNode(t18.uid));
      lastResult={ok:true,negated:false,card:c.name,kind:'control_arrows',
        mode:eff18.mode,targetUid:t18.uid,paidBy:donor18.uid,
        used:fin18.used,cap:fin18.cap,free:fin18.free,
        notes:['Flechas salientes de '+card(t18.cardId).name+': '+ar18.free+' -> '+fin18.free+' libres']};
      break;
    }
    /* ==================================================================== *
     * L16 (2026-10) — CARTAS DE ACCION MULTIPLE. 4 cartas, 4 kinds distintos
     * porque sus efectos no tienen NADA en comun (DoD#4). Lo que comparten es la
     * FAMILIA DE COSTE: la accion de grupos Media.
     *   207 Blood, Toil, Tears and Sweat -> 'nwo_discard_one'
     *   379 Sweeping Reforms               -> 'nwo_discard_all'
     *   253 Exposed!                      -> 'secret_expose'
     *   362 Scandal                       -> 'token_strip_aligned'
     * El bloque de coste combinado se COPIA del de 'force_align' (L10, engine.js
     * ~4181) en vez de extraerse a un helper compartido: la regla del proyecto es
     * no crear un helper de coste en un lote que no lo justifica, y aqui lo
     * justifican DOS cartas (207 y 379) con el mismo calculo.
     * ==================================================================== */
    case 'nwo_discard_one':
    case 'nwo_discard_all':{
      /* --- COSTE: accion de grupos Media con Poder COMBINADO >= payMinPower ---
       * IMPRESO 207: "This requires the action(s) of Media groups with a combined
       * Power of at least 4."
       * IMPRESO 379: "This requires the action(s) of Media groups with a combined
       * Power of at least 6. These groups may belong to more than one player!"
       * De ahi el `payAnyPlayer`: es el UNICO sitio del mazo donde el coste se
       * paga con grupos de un RIVAL, asi que sin ese flag 379 seria strictly
       * mas restrictivo que su texto. */
      var all16=eff.kind==='nwo_discard_all';
      var needL16=eff.payMinPower;
      var pickedL16=[];
      var payersL16=[];
      if(eff.payAnyPlayer){for(var ap=0;ap<S.players.length;ap++)payersL16.push(ap);}
      else payersL16.push(pid);
      for(var ap2=0;ap2<payersL16.length;ap2++){
        var rootL16=S.players[payersL16[ap2]].structure;
        (function(root){
          walk(root,function(n){
            if(needL16<=0)return;
            if(n===root)return;
            if(n.tokens<1)return;
            if(noTokensFlag(n))return;
            var cc=card(n.cardId);
            if(!cc||cc.type!=='group')return;
            if(!hasAttr(cc,eff.payAttr,n))return;
            pickedL16.push({pid:payersL16[ap2],uid:n.uid,name:cc.name,power:curPower(n)});
            needL16-=curPower(n);
          });
        })(rootL16);
      }
      /* --- OBJETIVO: las NWO EN JUEGO. No hay campo `nwo` en el dataset; se
       * detecta con effect.kind==='nwo'. Viven en dos sitios: exposedPlots
       * (array plano de cardids, junto a las demas Plots) y linkedPlots
       * (objetos {cardId:...}). Por eso el filtro por kind es OBLIGATORIO:
       * exposedPlots tambien contiene Plots normales y las Goal cards. --- */
      var nwosL16=[];
      for(var pL16=0;pL16<S.players.length;pL16++){
        var ppL16=S.players[pL16];
        (ppL16.exposedPlots||[]).forEach(function(ix){
          var cc2=C.cards[ix];
          if(cc2&&cc2.nwoColor)
            nwosL16.push({pid:pL16,ix:ix,where:'exposed',name:cc2.name});
        });
        (ppL16.linkedPlots||[]).forEach(function(lp){
          var ix2=lp&&lp.cardId;
          var cc3=C.cards[ix2];
          if(cc3&&cc3.nwoColor)
            nwosL16.push({pid:pL16,ix:ix2,where:'linked',name:cc3.name});
        });
      }
      /* --- TODO VALIDADO ANTES DE MUTAR (P1-033: si la carta se rechaza, el
       * jugador no ha pagado nada) --- */
      if(!nwosL16.length)
        throw new Error(c.name+': no hay ninguna carta New World Order ahora en juego');
      var doomedL16=nwosL16;
      if(!all16){
        var pickL16=opts&&opts.nwoCardId;
        var foundL16=null;
        for(var q=0;q<nwosL16.length;q++)if(nwosL16[q].ix===pickL16){foundL16=nwosL16[q];break;}
        if(!foundL16)
          throw new Error(c.name+': "Discard any one New World Order card now in play" — elige una de las '+
            nwosL16.length+' que hay en juego: '+nwosL16.map(function(x){return x.name;}).join(', '));
        doomedL16=[foundL16];
      }
      if(needL16>0)
        throw new Error(c.name+': los grupos '+(eff.payAttr||'media')+' con ficha'+
          (eff.payAnyPlayer?' de cualquier jugador':' tuyos')+' solo aportan Poder '+
          (eff.payMinPower-needL16)+' de los '+eff.payMinPower+' combinados que exige la carta');
      /* --- MUTACION: primero el coste, despues el efecto --- */
      pickedL16.forEach(function(g){spendGroupToken(g.pid!=null?g.pid:pid,g.uid);});
      doomedL16.forEach(function(x){
        var plx=S.players[x.pid];
        if(x.where==='exposed'){
          var i=plx.exposedPlots.indexOf(x.ix);
          if(i>=0)plx.exposedPlots.splice(i,1);
        }else{
          for(var j=(plx.linkedPlots||[]).length-1;j>=0;j--)
            if(plx.linkedPlots[j]&&plx.linkedPlots[j].cardId===x.ix)plx.linkedPlots.splice(j,1);
        }
        discardPlot(x.ix,x.pid);
        log(c.name+': la New World Order '+x.name+' sale de la mesa (descartada)');
      });
      lastResult={ok:true,nwo:true,card:c.name,kind:eff.kind,all:all16,
        discarded:doomedL16.map(function(x){return x.name;}),
        paid:{via:eff.payAttr,power:eff.payMinPower,groups:pickedL16.map(function(g){return g.name;})},
        notes:[all16?'descarta TODAS las NWO en juego':'descarta UNA NWO elegida',
               'coste: Poder combinado '+eff.payMinPower+' de grupos '+(eff.payAttr||'media')]};
      break;}
    case 'secret_expose':{
      /* IMPRESO 253: "Play this card at any time. It requires the action of any Media
       * group with a Power of 4 or more. One Secret group is now exposed. Unless this
       * card is immediately countered, that group permanently loses its Secret status!" */
      var tuL16=targetUid!=null?targetUid:(opts&&opts.targetUid); /* P1-128: el objetivo llega por el 3er parametro POSICIONAL de E.playPlot */
      var ndL16=tuL16?findNode(tuL16):null;
      if(!ndL16||ndL16.cardId==null)
        throw new Error(c.name+': "One Secret group is now exposed" — elige el grupo secreto que expones');
      var ccL16=card(ndL16.cardId);
      if(!ccL16||ccL16.type!=='group')
        throw new Error(c.name+': el objetivo debe ser un Group card, no "'+(ccL16?ccL16.name:'?')+'"');
      if(!hasAttr(ccL16,'secret',ndL16))
        throw new Error(c.name+': "'+ccL16.name+'" no es un grupo Secret — el impreso exige "One Secret group"');
      /* COSTE: UN (no combinado) grupo Media con Poder >= payMinPower. Se usa el
       * mismo criterio que el precedente de engine.js ~5498 (`cc.power` impreso,
       * no curPower) para que 253 y las demas cartas con payMinPower juzguen igual. */
      var payerL16=null;
      walk(pl.structure,function(n){
        if(payerL16)return;
        if(n===pl.structure)return;
        if(n.tokens<1)return;
        if(noTokensFlag(n))return;
        var cc=card(n.cardId);
        if(!cc||cc.type!=='group')return;
        if(!hasAttr(cc,eff.payAttr,n))return;
        if(typeof cc.power!=='number'||cc.power<eff.payMinPower)return;
        payerL16={uid:n.uid,name:cc.name};
      });
      if(!payerL16)
        throw new Error(c.name+': "It requires the action of any Media group with a Power of '+
          eff.payMinPower+' or more" — no tienes ningun grupo Media con esa ficha');
      /* --- MUTACION --- */
      spendGroupToken(pid,payerL16.uid);
      if(!ndL16.attrsRemoved)ndL16.attrsRemoved=[];
      if(ndL16.attrsRemoved.indexOf('secret')<0)ndL16.attrsRemoved.push('secret');
      log(c.name+': '+ccL16.name+' queda expuesto y pierde su Secret status para siempre ('+
        payerL16.name+'+gasto la accion)');
      lastResult={ok:true,exposed:true,card:c.name,kind:eff.kind,targetUid:ndL16.uid,
        attr:'secret',paidBy:payerL16.uid,
        notes:['el grupo pierde el atributo secret de forma permanente (P1-127 attrsRemoved)',
               'la clausula "Unless this card is immediately countered" queda DECLARADA sin implementar: ver audit L16']};
      break;}
    case 'token_strip_aligned':{
      /* IMPRESO 362: "You may play this card at any time except during an attack. It
       * requires an action by a Media group which Power of 2 or more. Choose a rival,
       * and remove all Action tokens from his Groups of any one alignment. The
       * alignment must be shared by the Media group that uses the card." */
      if(S.attack)
        throw new Error(c.name+': "You may play this card at any time except during an attack" — hay un ataque abierto');
      var rpL16=opts&&opts.rivalPid;
      if(rpL16==null||rpL16===pid||!S.players[rpL16])
        throw new Error(c.name+': "Choose a rival" — elige que rival le quitas las fichas');
      var alL16=String((opts&&opts.align)||'').toLowerCase();
      if(!alL16)
        throw new Error(c.name+': elige una alineacion — "remove all Action tokens from his Groups of any one alignment"');
      var payerL16b=null;
      walk(pl.structure,function(n){
        if(payerL16b)return;
        if(n===pl.structure)return;
        if(n.tokens<1)return;
        if(noTokensFlag(n))return;
        var cc=card(n.cardId);
        if(!cc||cc.type!=='group')return;
        if(!hasAttr(cc,eff.payAttr,n))return;
        if(typeof cc.power!=='number'||cc.power<eff.payMinPower)return;
        payerL16b={uid:n.uid,name:cc.name,c:cc,node:n};
      });
      if(!payerL16b)
        throw new Error(c.name+': "It requires an action by a Media group which Power of '+
          eff.payMinPower+' or more" — no tienes ningun grupo Media con esa ficha');
      /* "The alignment must be shared by the Media group that uses the card" */
      var payerAl=nodeAligns(payerL16b.node,payerL16b.c);
      if(payerAl.indexOf(alL16)<0)
        throw new Error(c.name+': "The alignment must be shared by the Media group that uses the card" — '+
          payerL16b.name+' no es '+alL16+' ('+payerAl.join('/')+')');
      /* --- OBJETIVO: los grupos del rival de esa alineacion. Se recorre
       * S.players[rp].structure SIN la raiz: la raiz es el Illuminati, no un
       * "Group of his", y el precedente de L4 (case 'token_strip', engine.js
       * ~4880) ya excluye la raiz con `if(n===root4)return;`. --- */
      var victimsL16=[];
      var rootV=S.players[rpL16].structure;
      walk(rootV,function(n){
        if(n===rootV)return;
        var gc=card(n.cardId);
        if(!gc)return;
        if(nodeAligns(n,gc).indexOf(alL16)<0)return;
        if(!n.tokens)return;
        victimsL16.push(gc.name);
        n.tokens=0;
      });
      /* --- MUTACION: el coste se paga DESPUES de validar (P1-033) --- */
      spendGroupToken(pid,payerL16b.uid);
      if(!victimsL16.length)
        log(c.name+': ningun grupo '+alL16+' de '+S.players[rpL16].name+' tenia ficha de accion; se gasta sin efecto');
      else
        log(c.name+': '+victimsL16.length+' grupo(s) '+alL16+' de '+S.players[rpL16].name+
            ' se quedan sin ficha de accion -- '+victimsL16.join(', '));
      lastResult={ok:true,strip:true,card:c.name,kind:eff.kind,align:alL16,
        rival:S.players[rpL16].name,stripped:victimsL16.length,groups:victimsL16,
        paidBy:payerL16b.uid,notes:['el Media que paga tiene que ser '+alL16,'el Illuminati rival no se toca (precedente L4)']};
      break;}
    case 'plot_negate_prev':{
      /* Hoax y Secrets Man Was Not Meant to Know son cartas de REACCION:
         "This card may be played immediately after any other Plot card is
         played". No se juegan desde la mano con E.playPlot; se juegan con
         E.resolvePendingNegation('negate', ...), que ademas les cobra el coste
         y descarta AMBAS cartas ("Both cards are discarded"). */
      throw new Error(c.name+': "'+'"This card may be played immediately after any other Plot card is played, for any purpose."'+'" — no se juega desde la mano: solo como respuesta a una Plot recien jugada');
    }
    case 'plot_negate_computer':{
      /* Computer Security: "It may be played at any time, as long as it used
         immediately after the other card is played". Misma via de reaccion. */
      throw new Error(c.name+': "'+'"It may be played at any time, as long as it used immediately after the other card is played."'+'" — no se juega desde la mano: solo como respuesta a una Plot recien jugada');
    }

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
  /* P1-059 — `i` (engine.js:3140, `pl.hand.indexOf(handIdx)`) se captura ANTES
   * del switch de efectos, asi que en cuanto un efecto mutila la mano del actor
   * el array se desplaza y `i` pasa a apuntar a OTRA carta. El sintoma medido
   * fue la regresion S9 de 388 The Big Sell-Out: su rama `mode:'sellout'` hace
   * `plD.hand.splice(ciD,1)` sobre la copia elegida y, al volver aqui, el
   * `splice(i,1)` borraba la carta vecina mientras la Plot jugada se quedaba en
   * la mano Y entraba al descarte (duplicacion). Con la mano [.., GI9@p, BS@b,
   * GI9@b+1] el resultado era 'copias 2 -> 0' en vez de '2 -> 1'.
   * El arreglo es por IDENTIDAD, no por posicion: `handIdx` es el indice de
   * catalogo de la carta jugada y las dos lineas siguientes (exposedPlots /
   * linkedPlots, 4896-4897) ya lo usan asi. Si el efecto ya se llevo la carta,
   * `iNow` vale -1 y no se borra nada, que es lo correcto: nunca hay que
   * compensar a mano un borrado que otro ya hizo. */
  /* P1-126: solo borramos si el efecto NO quito ya una copia (ver la cuenta capturada
   * antes del switch). Una carta jugada sale de la mano exactamente UNA vez. */
  var nowCountP1=0;
  for(var wP1=0;wP1<pl.hand.length;wP1++){ if(pl.hand[wP1]===handIdx)nowCountP1++; }
  if(nowCountP1>=handCountP1){
    var iNowP1=pl.hand.indexOf(handIdx);
    if(iNowP1>=0)pl.hand.splice(iNowP1,1);
  }

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
  /* L21 — REGLA DE LAS NWO, POST-HOOK. Aqui el switch YA aplico el efecto, asi
   * que registrar la NWO en vigor es seguro: si el case hubiera lanzado, esta
   * linea no se ejecutaria. Va antes del `discardPlot` de P1-025 porque la carta
   * que entra se descarta igual (su efecto vive en los nodos). */
  if(nwoMark21){
    nwoUndone21=undoNwoOfColor21(nwoMark21.color,nwoPrevRule21);
    S.nwoInForce[nwoMark21.color]={name:c.name,id:handIdx,pid:pid};
    if(nwoUndone21)
      log(c.name+' ('+nwoMark21.color+'): sustituye a '+nwoUndone21.card
        +' del mismo color, que queda descartada. Deshechos '+nwoUndone21.powerMods
        +' modificadores de Poder, '+nwoUndone21.resistanceMods+' de Resistencia, '
        +nwoUndone21.becomes+' alineacion(es) y '+nwoUndone21.noTokens+' grupo(s) sin ficha');
  }
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

/* P1-033 (L4) - El inverso de giveResourceTo: un Resource vuelve a la MANO
 * del rival que lo entrega, no a su lista de Resources. Lo necesita el modo
 * "put one Gadget Resource back in his hand" de 270 Gremlins. No existe el
 * filtro por subtipo porque el mazo no clasifica los Resources: 34 de 35
 * tienen subtype null, asi que un filtro gadget haria el modo INJUGABLE. */
E.takeResourceToHand=function(fromPid,resUid,toPid){
  var fp=S.players[fromPid]; if(!fp)throw new Error('Ese jugador no existe');
  var k=-1;
  for(var i=0;i<fp.resources.length;i++){ if(fp.resources[i].uid===resUid){ k=i; break; } }
  if(k<0)throw new Error('Ese Resource no pertenece a ese jugador');
  var res=fp.resources.splice(k,1)[0];
  S.players[toPid].hand.push(res.cardId);
  log(card(res.cardId).name+' vuelve a la mano de '+S.players[toPid].name);
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
  /* L8b: una eleccion de robo pendiente (233/367) tiene las cartas YA SACADAS del
   * mazo. Si el turno terminara con la ventana abierta, el beginTurn del rival
   * repartiria sobre un mazo racionado y la eleccion se resolveria contra un mazo
   * que ya no es el que se miro. Se cierra antes que nada. */
  if(S.pendingDraw)throw new Error('No se puede terminar el turno sin resolver tu eleccion de robo');
  /* L9 / 332 — la accion del Gadget sigue ABIERTA y su token de accion NO se ha
   * gastado todavia. Terminar el turno aqui dejaria la ventana colgada para el
   * rival, que no es el dueno. Se cierra antes que nada. */
  if(S.pendingAlignEdit)throw new Error('No se puede terminar el turno sin resolver la accion de tu Gadget');
  if(S.pendingResDestroy)throw new Error('No se puede terminar el turno sin resolver la accion de tu Resource');
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
  /* L14 — 364: "After your turn is over, the turn passes back to the player whose turn
   * you interrupted (unless someone won)". Este bloque corre CUANDO el actor del turno
   * especial termina. Va DESPUES de checkVictory(), asi que "unless someone won" sale
   * gratis: si la partida termino, la linea de gameover ya ha vuelto con publicState().
   * El jugador interrumpido NO pasa por este endTurn (el que lo ejecuto fue el actor
   * del turno especial), asi que su contador NO se incrementa otra vez: su turno ya se
   * contabilizo cuando lo termino, antes de que se lo robaran. Y NO se abre ventana de
   * reaccion para el jugador siguiente, porque el turno no le toca todavia. */
  if(S.returnTurnTo!=null){
    var backToTC=S.returnTurnTo;
    S.returnTurnTo=null;
    if(!S.players[backToTC])return publicState();
    log('Seize the Time! ha pasado: vuelve el turno de '+S.players[backToTC].name);
    S.phase='begin';
    E.beginTurn(backToTC);
    return publicState();
  }
  var next=(pid+1)%S.players.length;
  /* L8c — 405 Unlucky 13: "Play this card on a rival at the very beginning of his
   * turn." La ventana se abre AQUI, entre endTurn y beginTurn: es el unico punto
   * donde "muy al principio del turno" es observable ANTES de que el autoDraw de
   * Network corra (un bloqueo dentro de beginTurn llegaria tarde: P1-048). Solo se
   * abre si un HUMANO distinto del jugador del turno tiene 405 en mano; si nadie
   * puede reaccionar, beginTurn corre sincrono como siempre (blast radius cero:
   * las partidas sin 405 nunca ven la ventana). El primer turno del juego no abre
   * ventana (startGame no es punto de reaccion, regla 10). */
  /* L8c/L14 — 405 Unlucky 13 y 364 Seize the Time!: las dos se juegan "al
   * comienzo del turno de un rival", o sea en ESTE punto exacto, entre endTurn y
   * beginTurn: es el unico sitio donde "muy al principio del turno" es observable
   * ANTES de que corra el autoDraw de Network (un bloqueo dentro de beginTurn
   * llegaria tarde: P1-048). Solo se abre si un HUMANO distinto del jugador del
   * turno tiene UNA DE LAS DOS en mano; si nadie puede reaccionar, beginTurn corre
   * sincrono como siempre (blast radius cero: las partidas sin esas cartas nunca
   * ven la ventana). El primer turno del juego no abre ventana (startGame no es
   * punto de reaccion, regla 10).
   *
   * P1-098: antes solo se miraba 'unlucky13'. Con solo 364 en mano la ventana NO
   * se abria, y como su timing ES la ventana, la carta era literalmente
   * INJUGABLE — el mismo genero de fallo que P1-075 (ruta que el jugador no puede
   * alcanzar) y que P1-085. Por eso el mismo bucle mira las dos. */
  var tsHolder=-1;
  for(var tsq=0;tsq<S.players.length;tsq++){
    var tsp=S.players[tsq];
    if(!tsp.human||tsq===next)continue;
    if(tsp.hand.some(function(tshx){var tsc=C.cards[tshx];return tsc&&(tsc.id==='unlucky13'||tsc.id==='seizethetime');})){tsHolder=tsq;break;}
  }
  if(tsHolder>=0){
    S.pendingTurnStart={forPid:next};
    S.currentPid=next;
    S.phase='begin';
    log('Comienzo del turno de '+S.players[next].name+': los rivales pueden reaccionar');
    return publicState();
  }
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
/* L18: sonda del CONTADOR de flechas de control. La regresion de 298/299 afirma
 * esto y no una linea de log: el plan del lote exige probar por contador. */

/* ------------------------------------------------------------------ *
 * L22 — resolucion de la ventana de NEGACION.
 *   action 'pass'   : nadie la niega -> la Plot se juega de verdad (se re-invoca
 *                     E.playPlot con noNegWindow, asi que su efecto y su coste
 *                     se aplican ahora y la cola P1-012 le saca la carta de la mano).
 *   action 'negate' : un rival la niega -> paga su coste, AMBAS cartas se
 *                     descartan y la Plot anulada no ha aplicado nada.
 * Devuelve publicState() con lastPlotResult, igual que el resto de las APIs.
 * ------------------------------------------------------------------ */
E.resolvePendingNegation=function(action,rpid,cardIdx){
  var P=S.pendingNegation;
  if(!P)throw new Error('No hay ninguna Plot esperando posible negacion');
  if(action==='pass'){
    S.pendingNegation=null;
    var o2={};
    for(var k2 in P.opts)o2[k2]=P.opts[k2];
    o2.noNegWindow=true;
    return E.playPlot(P.pid,P.handIdx,P.targetUid,o2);
  }
  if(action!=='negate')throw new Error('accion desconocida para resolver la negacion: '+action);
  if(rpid==null||rpid<0||!S.players[rpid])throw new Error('responding player invalido');
  if(rpid===P.pid)
    throw new Error('"'+card(cardIdx||P.handIdx).name+'": "immediately after any OTHER Plot card is played" — no puedes anular tu propia Plot');
  if(cardIdx==null)throw new Error('elige que carta de negacion juegas');
  var rP=S.players[rpid];
  if(rP.hand.indexOf(cardIdx)<0)throw new Error('La carta de negacion no esta en tu mano');
  var cN=card(cardIdx);
  if(!cN)throw new Error('Carta de negacion desconocida');
  var eN=cN.effect||{};
  var okN=negationAllowed(eN,rpid,P);
  if(!okN.ok)throw new Error(cN.name+': '+okN.why);
  /* COSTE: se paga DESPUES de validar todo (P1-033) y por el RESPONDIENTE. */
  var paidN=payNegationCost(rpid,eN,okN.via);
  /* "Both cards are discarded": la Plot anulada sale de la mano del actor
     (estaba todavia ahi: la ventana se abrio ANTES de la cola P1-012) y la
     carta de negacion de la mano del respondiente. Cada una, UNA vez. */
  var plP=S.players[P.pid];
  var hxP=plP.hand.indexOf(P.handIdx);
  if(hxP>=0)plP.hand.splice(hxP,1);
  var hxR=rP.hand.indexOf(cardIdx);
  if(hxR>=0)rP.hand.splice(hxR,1);
  S.pendingNegation=null;
  discardPlot(P.handIdx,P.pid);
  discardPlot(cardIdx,rpid);
  log(cN.name+' de '+rP.name+' anula '+P.cardName+' de '+plP.name+': "'+'"That card has no effect. Both cards are discarded."'+'"');
  var out=publicState();
  out.lastPlotResult={ok:true,negated:true,card:cN.name,kind:eN.kind,negatedCard:P.cardName,
    negator:rP.name,paid:paidN};
  return out;
};
/* Sonda para la regresion y para la UI: el estado de la ventana de negacion. */
E.negationStatus=function(){
  var P=S.pendingNegation;
  if(!P)return null;
  return {cardName:P.cardName,cardKind:P.cardKind,byPid:P.pid,negators:P.negs.map(function(x){
    return {pid:x.pid,cardIdx:x.cardIdx,cardName:x.cardName,via:x.via};})};
};
E.arrowCount=function(uid){var n=findNode(uid);return n?outArrowsOf(n):null;};
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
