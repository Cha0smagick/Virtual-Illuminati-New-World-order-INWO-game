# INWO Digital — ARQUITECTURA Y CONTRATOS v1.0

App estática vanilla (HTML/CSS/JS), sin build, corre abriendo game/index.html via file://.
Los datos van en archivos .js (window globals), NUNCA fetch() (file:// lo bloquea).

## Estructura
```
game/
  index.html          entrada unica
  css/style.css       tema oscuro: navy #0B1026, bgLight #131A3A, ambar #FFB03A, cian #35C4D9
  js/cards.js         window.INWO_CARDS = { cards:[...], byName:{...} }
  js/engine.js        window.Engine
  js/ai.js            window.AI
  js/ui.js            window.UI
  js/app.js           arranque + orquestacion de turnos
```

## Esquema de carta (cards.js)
```js
{
  id:"bavarian-illuminati", name:"The Bavarian Illuminati",
  type:"illuminati|group|resource|plot", subtype:"personality|place|nation|organisation|violent|assassination|disaster|nwo|goal|boost10...",
  img:"Illuminati/Bavarian Illuminati 1.png",   // ruta relativa desde game/
  power:10, resistance:10,                       // illuminati/group; plot: power si instant attack
  alignments:["Government"],                     // lista canonica en minusculas internas
  text:"...",                                    // texto impreso resumido ES/EN
  effect:{kind:"...", ...},                      // maquina de efectos data-driven
  implemented:true
}
```

## Estado del juego (Engine.getState() devuelve deep clone JSON-safe)
```js
state = {
  turnCount, activePlayer:0|1, phase:"setup|begin|main|end|attackWindow|gameover",
  players:[ {
    id, name, isAI,
    illuminatiId, plotDeck:[], groupDeck:[], handPlots:[], handGroups:[],
    structure:{ id:"root", cardId:<iluminati>, children:[{cardId, children:[...] }] }, // arbol
    resources:[{cardId, linkedTo:null|"root"|groupUid}],
    tokens:{ <uid>: n },           // uid = cardId+"#"+instancia
    exposedPlots:[{cardId,...}],
    discards:{plots:[],groups:[]},
    resourceActionUsed:false, illumGroupDrawUsed:false,
    eliminated:false
  } ],
  neutralArea:[{uid,cardId}],      // grupos liberados sin dueno
  log:[...], rngSeed, victory:null
}
```

## API Engine (todas validan reglas y devuelven {ok, error?, result?})
```js
newGame(cfg)                      cfg={players:[{name,isAI}], goalOverride}
getState()
roll2d6()                         interno con seed
drawPlot(pid,n) drawGroup(pid,n)
exchangeForPlot(pid,{type:"illum"} | {type:"groups", uids:[..]})
autoTakeover(pid,{handIndex, targetUid|null})   // null => resource al lado
playResource(pid,handIndex,linkedToUid|null)
illumDrawGroup(pid)
declareAttack({attackerUid, kind:"control"|"destroy"|"instant", plotCardId?, targetRef:{pid,uid}|{fromHand:true}, privileged:false})
attackStrength(attackState)       calculo transparente para UI/AI
addAid(attackId,pid,uid,side)     side="attack"|"defense"
resolveAttack(attackId)           tirada + consecuencias + inmunidad por fallo
moveGroup(pid,uid,newParentUid)
discardCard(pid,zone,index)
checkVictory()                    llamado al final de cada turno
```

Reglas transversales dentro del Engine:
- alignmentOpposites mapa oficial: Government-Liberal? NO. Pares oficiales INWO:
  Peaceful<->Violent, Conservative<->Liberal(?), Straight<->Weird, Communist<->Capitalist(?),
  Criminal no tiene opuesto directo, Fanatic opuesto a Fanatic (unico).
  TABLA OFICIAL USADA: [Peaceful,Violent],[Conservative,Liber(al)],... ver abajo "ALINEAMIENTOS".
- Fanatic vs Fanatic: cuenta como OPUESTO entre jugadores distintos (+4 defensa excluido en amo).

## ALINEAMIENTOS CANONICOS (INWO OWE)
Government, Liberal, Conservative, Peaceful, Violent, Criminal, Communist, Capitalist(?),
Weird, Straight, Fanatic, Secret, Green, Media(?), ...
OPUESTOS: Peaceful-Violent, Liberal-Conservative, Weird-Straight, Communist-"Non-communist"(no existe como carta) =>
pares usados: [peaceful,violent],[liberal,conservative],[weird,straight],[green,"anti-green"(no)]. Solo los 3 primeros pares aplican.

## API AI (ai.js) - decide SOLO acciones legales usando getState()+API Engine
```js
AI.takeTurn(pid, engine)          async: ejecuta su turno completo paso a paso con delays UI
AI.respondToAttack(engine,attack) decide ayudar/oponerse/cancelar
```
Heuristicas: valor objetivo = f(power, income de estructura, cercania victoria rival); ataca si fuerza esperada >= umbral;
defiende si amenaza a grupos clave; usa boost10 cuando convierte fallo en exito probable; juega assassinations sobre Personalities rivales clave.

## API UI (ui.js)
```js
UI.render(state)                  re-render completo desde snapshot (simple y robusto)
UI.prompt(msg, options[])         promesa para decisiones humanas (modal)
UI.log(msg)
```
Flujo humano: click grupo propio con token => modo ataque => elegir tipo => elegir objetivo valido (resaltado) =>
ventana de ayuda/oposicion (rival IA responde automatico) => resolver con animacion de dados.

## app.js - orquestacion
Menu inicial: Humano vs IA / Humano vs Humano / eleccion de Illuminati (9 disponibles) / meta rapida(8) u oficial(12).
Loop: beginTurn(auto) -> main (humano interactivo o AI.takeTurn) -> end -> checkVictory -> siguiente.
Hot-seat: pantalla de cortina "Pasa el dispositivo a JUGADOR X" antes de mostrar su mano.
