/* test_flow.js — reproduce el flujo real: App.start -> onStart -> refresh/render con stub DOM */
function mkEl(id){
  return {
    _id:id||'(anon)', innerHTML:'', children:[], parentNode:null, style:{}, dataset:{},
    className:'', title:'', value:'', textContent:'',
    appendChild:function(c){ c.parentNode=this; this.children.push(c); return c; },
    removeChild:function(c){ var i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); },
    remove:function(){ if(this.parentNode) this.parentNode.removeChild(this); },
    addEventListener:function(){}, insertAdjacentHTML:function(){},
    querySelectorAll:function(){return [];}, querySelector:function(){return null;},
    classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
    focus:function(){}
  };
}
var REG={};
global.document={
  getElementById:function(id){ if(!REG[id])REG[id]=mkEl(id); return REG[id]; },
  createElement:function(tag){ var e=mkEl(null); e._tag=tag; e._created=true; CREATED.push(e); return e; },
  addEventListener:function(){}, body:mkEl('body')
};
var CREATED=[];
global.window={}; global.alert=function(m){ ALERTS.push(String(m)); };
global.document.querySelector=function(sel){ return REG[String(sel).replace(/^[#.]/,'')]||null; };
global.document.querySelectorAll=function(){ return []; };
var ALERTS=[];

require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
require('./game/js/ui.js');
require('./game/js/app.js');

try {
  console.log('UI existe?', typeof window.UI, '| App?', typeof window.App);
  window.App.start();           // registra CB y llama showSetupScreen
} catch(e){ console.log('THROW en App.start:', e.stack); }
console.log('ALERTS tras setup:', ALERTS.slice());
console.log('overlays children tras setup:', (REG['overlays']||mkEl('x')).children.length);

/* fallback manual si el click-path no disparó render */
if(!(REG['board']&&REG['board'].innerHTML.length)){
  try{
    var chips=CREATED.filter(function(e){return e.className.indexOf('pickCard')===0;});
    console.log('chips:',chips.length,'(grid0: 0-8, grid1: 9-17)');
    chips[0].onclick();   // Jugador 1 elige el primero
    chips[10].onclick();  // IA/Jugador 2 elige el SEGUNDO (distinto)
    console.log('ALERTS tras picks:', ALERTS.slice());
    var sb=REG['startBtn'];
    console.log('startBtn onclick?', typeof (sb&&sb.onclick));
    sb.onclick();
    console.log('ALERTS tras start:', ALERTS.slice());
    if(!(REG['board']&&REG['board'].innerHTML.length)) throw new Error('onStart no llegó a render');
  }catch(e){ console.log('THROW en flujo manual:', e.stack); }
}

/* inventario de elementos creados */
CREATED.forEach(function(e,i){
  if(e.onclick||e.id) console.log('EL'+i,'id='+(e.id||'-'),'cls='+e.className,'txt='+String(e.textContent).slice(0,30),'onclick='+(typeof e.onclick));
});

/* clic en tiles 0 y 1 (elegir Illuminati para ambos lados) y luego botón iniciar */
var tiles=CREATED.filter(function(e){return e.className.indexOf('pickTile')>=0||(e.dataset&&e.dataset.base);});
var startBtn=CREATED.filter(function(e){ return /iniciar|comenzar|start/i.test(String(e.textContent)) || e.id==='startBtn'; })[0];
console.log('tiles:',tiles.length,'startBtn:',!!startBtn);
try{
  if(tiles[0]) tiles[0].onclick();
  if(tiles[1]) tiles[1].onclick();
  if(startBtn) startBtn.onclick(); else console.log('NO HAY BOTON INICIAR — revisar');
}catch(e){ console.log('THROW en flujo de clicks:', e.stack); }

/* simular clic en botón de inicio: buscar elemento creado con onclick que llama onStart */
var starter=CREATED.filter(function(e){return typeof e.onclick==='function';});
console.log('elementos con onclick:', starter.length);
if(starter.length){ try{ starter[starter.length-1].onclick(); }catch(e){ console.log('THROW en click iniciar:', e.stack); } }
else { /* fallback: ejecutar onStart manualmente */
  try{
    var E=window.Engine;
    E.newGame([{name:'Jugador 1',human:true},{name:'IA',human:false}]);
    var avail=E.availableIlluminati();
    E.setIlluminati(0,avail[0].id); E.setIlluminati(1,E.availableIlluminati()[0].id);
    E.startGame();
    window.UI.render(E.getState());
  }catch(e){ console.log('THROW en flujo manual:', e.stack); }
}

console.log('ALERTS:', ALERTS);
['hdrInfo','hdrBtns','board','logLines','actionBtns','handCards','actionHint'].forEach(function(k){
  console.log(k, 'len=', (REG[k]?REG[k].innerHTML.length:'N/A'));
});
var b=(REG['board']&&REG['board'].innerHTML)||'';
console.log('board preview:', b.slice(0,400).replace(/\n/g,' '));
console.log('logLines hijos:', (REG['logLines']?REG['logLines'].children.length:'N/A'),
  '| primer log:', (REG['logLines']&&REG['logLines'].children[0])?REG['logLines'].children[0].textContent:'-');

/* esperar tick de la IA y volver a medir */
setTimeout(function(){
  console.log('--- tras esperar 600ms ---');
  console.log('logLines hijos:', REG['logLines'].children.length);
  console.log('últimos logs:', REG['logLines'].children.slice(-3).map(function(c){return c.textContent;}).join(' || '));
  ['hdrInfo','board','actionBtns','handCards','actionHint'].forEach(function(k){console.log(k,'len=',REG[k].innerHTML.length);});
  var btns=(REG['actionBtns'].innerHTML.match(/<button/g)||[]).length;
  console.log('botones de acción:', btns);
  /* simular clic en Robar Plot si existe botón */
  var ab=CREATED.filter(function(e){return e._tag==='button'&&e.parentNode===REG['actionBtns'];});
  console.log('buttons creados en actionBtns:', ab.length);
  if(ab[0]){ try{ ab[0].onclick(); }catch(e){ console.log('THROW al clicar botón acción:', e.stack);} }
  console.log('ALERTS finales:', ALERTS);
  console.log('board len tras interacción:', REG['board'].innerHTML.length);
}, 600);
