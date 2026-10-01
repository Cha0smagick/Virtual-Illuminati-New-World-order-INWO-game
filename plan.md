# plan.md - Implementacion de mecanicas e interacciones, carta por carta

Objetivo del plan: cerrar el backlog de **169 Plot/Resource cards** que hoy tienen el texto
impreso transcrito pero ninguna mecanica ejecutable en el motor, sin romper ninguna de las
reglas ya auditadas (P0-001..P0-007, P1-001..P1-027) y sin inventar reglas que el reglamento
no dice.

Referencia de estado: `docs/audit/INWO_SURGICAL_AUDIT.md` (ultima seccion ejecutada: §38).
Referencia de metricas: `node test_fase4_cards.js` imprime
`FASE 4 COVERAGE PASSED (N cartas clasificadas, M Plots/Resources sin mecanica, ... implemented-pending-engine: K)`.

Estado al abrir el plan:
- `npm test` -> ALL TESTS PASSED (10)
- `node test_fase4_cards.js` -> 79 clasificadas, **169 sin mecanica**, `implemented-pending-engine: 60`
- `node gen_cards.js` -> `written 421 {...} verified-groups 33`

---

## 0. Reglas permanentes (aplican a TODOS los lotes)

Estas reglas nacen de los hallazgos de §32-§38. Violarlas es un defecto, no una excepcion.

1. **Nada de `task`, `skill` ni subagentes.** Todo directo con Read/Edit/Write/bash/ctx_*.
2. **Nunca pasar un fichero UTF-8 por las APIs de texto de PowerShell** (`Get-Content -Raw`,
   `Set-Content`) ya destruyo 130 caracteres acentuados una vez. Para ediciones multi-linea usar
   el tool `edit`/`write`, o un script `.cjs` temporal con `fs.writeFileSync(p, s, 'utf8')`.
   `node -e "..."` con comillas anidadas se rompe en PowerShell.
3. **Nunca `git checkout` de un fichero con trabajo sin commitear** (perdio 962 lineas una vez).
4. **Despues de cada escritura con no-ASCII, contar `[\u4e00-\u9fff\ufffd]`.** El mojibake es
   invisible en la consola; el conteo es la unica deteccion fiable.
5. `docs/audit/INWO_SURGICAL_AUDIT.md` es ASCII sin tildes (si usa `§`). Mantenerlo asi elimina
   el riesgo de codificacion. Los lotes se anaden con un script Node temporal
   (`fs.appendFileSync`), que luego se borra.
6. **Un lote = una familia de mecanica.** No se mezclan familias en un lote ni se parte una
   familia en dos lotes. Un lote se cierra entero: codigo + datos + UI + regresion + seccion.
7. **Invariante P1-005:** nunca anadir un campo nuevo a `det`. LosBonus nuevos se pliegan en
   `det.cthulhu` o `det.defBoosts`.
8. **Regla de coste por `case`:** no existe helper de coste compartido salvo el que se cree en el
   lote que lo justifique. Receta: `firstUsableAid(pid, pred)` -> `spendGroupToken(pid, uid)`;
   accion de Illuminati = `if(pl.illumTokens < 1) throw; pl.illumTokens--;`.
9. **En el test se afirma el EFECTO observable** (quien es dueno del nodo, contenido de una
   pila, linea de log), nunca solo la aritmetica. Y **nunca se cuenta cartas en mano**: las
   utilidades de test mutan las manos (`sealWindows`, `noCancelWindow`). Esa clase de bug
   (test verde con el motor roto) aparecio 4 veces.
10. `startGame` **no** es un punto de tirada reactiva: el reglamento prohibe actuar sobre un rival
    que no ha completado su primer turno.
11. Ventanas de reaccion: jugar una carta **no** cierra la ventana. Cerrar es un paso aparte
    (`E.resolvePendingAttack` / `E.resolvePendingRoll` / `E.resolvePendingEvent`). Este contrato
    es de las tres ventanas ya implementadas.
12. Nada se commitea salvo peticion explicita del usuario.

## 0.1 Definicion de Hecho (Definition of Done) de un lote

Un lote esta TERMINADO solo si se cumplen las ocho:

- [ ] `node --check` limpio en cada JS tocado.
- [ ] `npm test` -> ALL TESTS PASSED.
- [ ] `node test_fase4_cards.js` -> FASE 4 COVERAGE PASSED y el numero de "sin mecanica" baja
      exactamente en la cantidad de cartas del lote.
- [ ] Cada carta del lote esta en su familia de datos en `gen_cards.js` con `t:` = texto impreso
      verbatim, y su `kind` es UNICO (una mecanica, un `kind`; si dos cartas comparten `kind`
      es porque comparten el 100% del efecto, nunca "casi").
- [ ] El `case` de dispatch en `engine.js` valida el coste impreso y el objetivo impreso, y lanza
      `throw new Error(c.name + ': ...')` con el motivo oficial cuando no puede.
- [ ] La UI puede ejecutar la carta (accion en `ui.js` + callback en `app.js`); si la carta
      necesita elegir objetivo, el objetivo se elige, no se autoelige.
- [ ] Regresion en `test_fase2_rules.js` que afirme el efecto observable (>= 2 escenarios por lote).
- [ ] Seccion nueva en el doc de auditoria (`§NN`) con Hallazgo / Correcciones / Verificacion /
      Leccion / Backlog, en ASCII.

## 0.2 Identificadores de hallazgo

Los ids son unicos y globales. Tarnto hasta §38 el ultimo id de P1 usado es **P1-027**.
Los nuevos hallazgos empiezan en **P1-028** y suben. Los ids P2-### empiezan donde termino §34
(revisar el doc antes de asignar).

---

# LOTES

## [x] L1 - TOKEN-GIFT: "Place an Action token on each of your X groups" — CERRADO (auditoria §39; 11 cartas; 79->90 clasificadas; 169->158 sin mecanica)

- **Cartas (11)**: 201 Bank Merger (Bank) · 240 Dollars for Decency (Straight) ·
  256 Flower Power (Peaceful) · 262 Freaking the Mundanes (Weird) ·
  263 Full Moon (Fanatic) · 265 Gang War (Criminal) · 327 New Federal Budget (Government) ·
  337 Pledge Drive (Liberal) · 352 Red Scare (Conservative) · 353 Reload! (Violent) ·
  383 Tax Breaks (Corporate).
- **Mecanica**: `token_gift`. Recorre el Power Structure del jugador y pone `tokens = 1` en cada
  nodo cuyo|alignamiento (o subtipo/atributo) coincida con el impreso.
- **Ficheros**: `gen_cards.js` (familia `TOKEN_FX`/`TOKEN_FXN` + cadena de resolucion),
  `game/js/engine.js` (un `case`), `game/js/app.js`, `game/js/ui.js`,
  `test_fase2_rules.js`, `test_fase4_cards.js`, doc de auditoria.
- **Interpretaciones declaradas** (no hay rulings oficiales para estos textos):
  1. "each of your X groups" = nodos de tu Power Structure **recursivamente** (incluye puppetas),
     no solo los directos de la raiz. Es la lectura coherente con el uso de "Power Structure".
  2. 201 Bank Merger dice "even those which already have an Action token" y las otras diez dicen
     "which does not already have one". Se implementa **una sola semantica** (`tokens = 1`, es
     decir,ASEGURO) y se declara que el matiz de 201 es unRemind redundante en el juego real.
  3. 263 Full Moon dice "each of your Fanatic groups, whether it has one or not, **and any other
     Fanatic group in play**": se implementa solo el primer grupo (los otros seria un bonus
     ejercido sobre el enemigo sin coste, que contradice el resto del texto de la carta) y se
     declara la limitacion.
- **Aceptacion**: tras jugar 256 Flower Power, todos los nodos Pacificos del jugador tienen
  `tokens === 1` (afirmado via el efecto observable: la linea de log enumera los grupos, y un
  ataque posterior de esos grupos es valido); un nodo no Pacifico NO cambia.

## [x] L2 - FORCE-ALIGN: "The target group becomes permanently X" — CERRADO (auditoria §40; 9 cartas; 90->99 clasificadas; 158->149 sin mecanica). RECLASIFICADO: plan.md lo llamaba familia de COSTE ("ILLUM-OR-X"), pero el texto impreso dice que el coste es la Resistencia del objetivo (x2 si es opuesto) mas el bonus de cercania: es una familia que FUERZA LA ALINEACION con coste dinamico, kind unico `force_align`. Ademas se introdujo `node.powerMods` (array de {name,v}) en `curPower` para el +2 de la Dictatorship (P1-028); L3 lo reutiliza.

- **Cartas (9)**: 198 Assertiveness Training (Violent) · 264 Fundie Money (Conservative) ·
  290 Jake Day (Weird) · 295 Kinder and Gentler (Peaceful) · 301 Liberal Agenda (Liberal) ·
  323 Nationalization (Government) · 340 Power Corrupts (Criminal) ·
  345 Privatization (Corporate) · 376 Straighten Up (Straight).
- **Mecanica**: `illum_or_align_cost`, un **helper de coste compartido**
  `payIllumOrAligns(pid, eff)` porque nueve cartas lo necesitan y el hallazgo P1 de este lote
  seria "nueve costes duplicados". Admite ambos caminos: 1 ficha de Illuminati, **o** fichas de
  grupos propios del alineamiento indicado con Poder total >= el impreso.
- **Ficheros**: los mismos, mas el helper en `engine.js`.
- **Interpretaciones declaradas**:
  1. "total Power of N" se mide con el Poder **impreso** de las cartas, no con `powerOverride`
     (que es un efecto temporal ya activo). Es el mismo criterio que ya usa `minPower` en §37.
  2. Si se paga con grupos, se gasta **una** ficha de cada grupo hasta completar N (no todas).
  3. "action(s)" en plural no habilita por si solo un segundo turno de accion: la ficha de
     Illuminati es una sola accion.
- **Aceptacion**: con 0 fichas de Illuminati y 2 grupos Liberales de Poder >= N, la carta se
  juega y ambos grupos pierden 1 ficha; con los mismos grupos pero Poder total < N, la carta se
  **rechaza** y NO sale de la mano.

## [ ] L3 - BULK-POWER: "Increase/Reduce the Power of all X groups by N"

- **Cartas (14)**: 204 Bigger Business · 217 Chicken in Every Pot · 241 Don't Forget to Smash
  the State · 251 Energy Crisis · 268 Good Polls (dura hasta tu proximo turno) ·
  271 Gun Control · 296 Law and Order · 339 Political Correctness · 341 Power for its Own Sake ·
  344 Principia Discordia (Resistencia +1 por cada Weird) · 355 Resistance is Useless! ·
  384 Tax Reform · 418 World Hunger · 234 Currency Speculation (triplica para su proxima accion).
- **Mecanica**: `bulk_power`. Efecto permanente mientras el grupo siga en juego (una entrada en
  el nodo: `powerMods: [{name, v}]`), **no** un `powerOverride` (que el motor ya usa para
 ANGST, valor absoluto).
- **Ficheros**: los mismos, mas el campo de nodo `powerMods` pliegado en `curPower`.
- **Interpretaciones declaradas**:
  1. Los efectos son **permanentes hasta que el grupo salga de juego**: asi funciona el Poder en
     este juego y es lo que distingue estos textos de las cartas "por una accion" (que van a L5).
  2. 268 Good Polls dura "until the beginning of your next turn": se implementa como permanente
     con un campo `expiresAtTurn` que el motor limpia al cambiar de turno.
  3. 355 Resistance is Useless! dura "for the rest of the current turn": mismo campo con
     `expiresAtTurn = turno actual`.
  4. 234 Currency Speculation "for its next action": permanente con `expiresOnTokenSpend`.
  5. Las cartas que reimprimen texto de otro jugador (384 Tax Reform es un Atajo) se toman
     literalmente por su texto impreso.
- **Aceptacion**: con dos grupos Corporativos y uno Liberal, 204 sube el Poder de los Corporativos
  y **solo** de los Corporativos (afirmado comparando `curPower` de los tres).

## [ ] L4 - TOKEN-STRIP: "Remove all Action tokens from ..."

- **Cartas (3)**: 350 Reach Out . . . · 270 Gremlins · 203 Bigfoot.
- **Mecanica**: `token_strip`. Pone `tokens = 0` en el objetivo (recursivo, o "any" si es rival).
- **Interpretaciones declaradas**:
  1. 350 excluye explicitamente los Resources ("but not the Resources"): el recorrido es por
     nodos, y los Resources viven en `pl.resources`, asi que quedan fuera por construccion.
  2. 270 Gremlins tiene dos ramas ("remove the Action token **or** cancel its action"); se
     implementa la primera y se declara la segunda pendiente (cancelar una accion ya gastada es
     un rollback, no un token-strip).
  3. 203 Bigfoot "can cancel its action" es un caso distinto: sigue siendo token-strip porque es
     la unica forma de cancelar un Computer group que ya actuo.
- **Aceptacion**: rival con 2 grupos con 1 ficha cada uno; 350 los deja a 0 y **sus Resources
  intactos**.

## [ ] L5 - BULK BOOST DE ATAQUE: "+N on any Attack to Destroy/Control of X"

- **Cartas (10)**: 189 Albino Alligators (+10 Power/Resistance a un Weird) ·
  205 Bimbo at Eleven (+5 destruir un Personality masculino, desde Media) ·
  254 Faction Fight (+5 con una carta duplicada) · 255 Fear and Loathing (+8 y -8 al rival) ·
  311 Mercenaries (+4 una vez por turno) · 358 Rogue Boomer (+5 controlar cualquier Nation) ·
  373 Spear of Longinus (+1 destruir, sin limite) · 377 Sucked Dry and Cast Aside! (x4 una accion) ·
  381 Swiss Bank Account (+10 a un ataque directo de tu Illuminati, no reutilizable) ·
  391 The First Thing We Do, Let's Kill All the Lawyers (+20 destruir a los Lawyers) ·
  415 Whispering Campaign (+15 destruir un Personality).
- **Mecanica**: `conditional_attack_boost`. Varios siguen el patron ya existente de las cartas
  "+10": se engancha al ataque con `A.boosts.push({name, v})`, pero exigiendo el calificador
  impreso (subtipo / genero / alineacion / atacante).
- **Aceptacion**: con un ataque a destruir announced, el jugador gasta 391 y el ataque sube 20;
  el mismo ataque contra un Place **no** sube.

## [ ] L6 - NEGAR UN EVENTO: "That card has no effect / becomes a failure / he must return it"

- **Cartas (10)**: 210 Botched Contact · 359 Sabotage · 230 Cover-Up · 224 Computer Security ·
  283 Hoax · 363 Secrets Man Was Not Meant to Know · 259 Foiled! · 222 Combined Disasters ·
  372 Spasm of Violence · 356 Revolution!.
- **Mecanica**: `negate_event`, la primera gran reutilizacion de las ventanas ya existentes
  (`S.pendingEvent` de §38, `S.pendingAttack` de §33, `S.pendingRoll` de §37). Casi todas son
  "jugar inmediatamente despues de que otro jugador haga X, y deshacerlo".
- **Interpretaciones declaradas**:
  1. 222 y 372 ("combine two Disasters on the same target") exigen que la ventana de §33 acepte
     dos cartas encadenadas; si el motor solo admite una pendiente, se declara la limitacion y la
     segunda carta se implementa como "solo si la primera sigue abierta".
- **Aceptacion**: un jugador toma un grupo con un takeover automatico; el rival juega
  210 Botched Contact y el grupo **vuelve a la mano** del jugador rival (afirmado leyendo su
  `hand`, no contando cartas).

## [ ] L7 - INTRUSION EN PLOTS OCULTOS

- **Cartas (5)**: 303 Logic Bomb · 322 Mutual Betrayal · 386 The Auditor from Hell ·
  242 Double-Cross · 304 March on Washington.
- **Mecanica**: `peek_hidden_plots`. El motor necesita una vista de los Plots ocultos de un
  rival; hoy `pl.exposedPlots` solo lleva los expuestos, asi que este lote anade la lectura de
  la mano rival (el motor ya es servidor-side: el azar es la UI).
- **Interpretaciones declaradas**: "look at" en el juego fisico significa el jugador la mira; en
  esta version web se implementa como revelacion y eleccion por indice, que es el equivalente
  funcional, y se declara.
- **Aceptacion**: rival con 3 Plots ocultos; 303 permite elegir uno y termina en la mano del
  jugador que la uso, y el rival queda **expuesto** segun el texto impreso.

## [ ] L8 - MANIPULACION DE MAZO Y ROBO

- **Cartas (8)**: 191 An Offer You Can't Refuse (2 Plots extra que no son de tu mazo) ·
  361 Savings & Loan Scam (descarta esta carta y roba 3) · 388 The Big Sellout ·
  395 The Internet Worm (las 3 primeras de su mazo) · 405 Unlucky 13 (no roba Plots) ·
  282 Hitler's Brain · 411 Voodoo Economics (descarta hasta 10 Plots) ·
  233 Crystal Skull / 367 Shroud of Turin (al robar un Plot).
- **Mecanica**: `deck_manip`, sobre `drawFrom` y un nuevo helper `topOfDeck`.
- **Interpretaciones declaradas**: 405 requiere un flag de jugador (`noPlotUntilTurnEnd`) que se
  limpia solo; 191 requiere un mazo virtual aparte ("not from your deck"), que se implementa con
  `S.outsidePlots`.
- **Aceptacion**: rival sin Plots y con `405` activo; el robo de Plot de su turno falla con
  mensaje y **no** le roba nada.

## [ ] L9 - EDITAR ALINEACIONES

- **Cartas (4)**: 332 Orbital Mind Control Lasers (anade / quita / invierte un alineamiento) ·
  357 Rewriting History (lo mismo, sobre un grupo destruido) · 310 Media Connections ·
  280 Hidden Influence.
- **Mecanica**: `align_edit`. El motor ya tiene alineaciones **a nivel de nodo** desde §32
  (P1-017), asi que esta edicion es por nodo, no por carta.
- **Aceptacion**: nodo con dos alineaciones; 332 quita una de las dos y `nodeAligns` deja de
  reportarla.

## [ ] L10 - EFECTOS PERMANENTES LIGADOS ("Link this card to X")

- **Cartas (12)**: 197 Ark of the Covenant · 209 Book of Kells · 235 Cyborg Soldiers ·
  237 Death Mask · 248 Eliza · 286 Immortality Serum · 280 Hidden Influence ·
  310 Media Connections · 324 Necronomicon · 367 Shroud of Turin · 373 Spear of Longinus ·
  380 Sweepstakes Prize · 394 The Holy Grail · 193 Angel's Feather.
- **Mecanica**: `link_effect`. Usa `pl.linkedPlots` (que ya existe desde §33) y pone un efecto
  permanente en el nodo ligado. `destroyGroup` ya sabe quitar los ligados (§38).
- **Interpretaciones declaradas**: "Write down the name of one of your groups and put it under
  this card" (197, 394) se implementa eligiendo el grupo en la UI y guardando el `uid` en
  `linkedPlots.linkedTo`, que es exactamente lo que ya hace `destroyGroup` al limpiar.
- **Aceptacion**: 235 sobre un grupo Violento duplica su Poder; al destruir ese grupo, la carta
  ligada desaparece (afirmado en el mazo de Plots, no contando cartas).

## [ ] L11 - JUGAR UN DUPLICADO DESDE LA MANO

- **Cartas (4)**: 220 Clone · 287 Imposter (una Personality assassinated) ·
  227 Counter-Revolution / 309 Media Blitz (una Nation ya destruida).
- **Mecanica**: `play_duplicate`. Requiere un registro de "groups ya destruidos" (P1 nuevo) y un
  registro de "Personalities ya assassinated" (idem). Los dos son datos nuevos minimos.
- **Aceptacion**: tras un grupillo destruido, 227 permite jugarlo desde la mano bajo su control.

## [ ] L12 - MANIPULACION DE RESOURCES

- **Cartas (5)**: 236 Deasil Engine · 348 Purge · 378 Suicide Squad · 400 The Weak Link ·
  413 Warehouse 23.
- **Mecanica**: `resource_effect`. `pl.resources` ya existe (`{uid,cardId,linkedTo,tokens:0}`).
- **NOTA de §38.5-B**: los Resources hoy **no pueden atacar ni ayudar** (`E.addSupport` exige
  `findNode` y `tokens>=1`). 236, 378 y 400 no dependen de eso, asi que este lote es posible.
- **Aceptacion**: 378 destruye un Resource rival y desaparece de `pl.resources` del rival
  (afirmado por la ausencia del `uid` concreto, no contando recursos).

## [ ] L13 - DEFENSA CONTRA DISASTERS

- **Cartas (5)**: 243 Early Warning (+10, accion gratis) · 410 Volunteer Aid (+6 y relief
  automatico) · 188 Air Magic · 244 Earth Magic · 245 Earthquake Projector.
- **Mecanica**: `disaster_defence`, el mismo camino que ya usan `node.destroyBonus` y
  `node.assassinationBonus` (§33). Regla oficial: **no** afecta al Poder del Place, solo a su
  defensa.
- **Aceptacion**: un Place con 243 tiene `destroyBonus >= 10`; un Disaster fallido por 1 con
  margen real, no solo por aritmetica.

## [ ] L14 - MANIPULACION DE TURNO

- **Cartas (5)**: 364 Seize the Time! (roba el turno de otro) · 405 Unlucky 13 (ya en L8, aqui
  solo el efecto de bloqueo de turno) · 408 Upheaval! · 354 Reorganization ·
  298 / 299 Let's Get Organized (flechas de control).
- **Mecanica**: `turn_control`.
- **Interpretaciones declaradas**: 364 "becomes your turn instead" se implementa como
  `S.currentPid = rival` + avanzar su contador de turno, que es el unico sentido literal posible;
  se declara.
- **Aceptacion**: en un turno del jugador B, 364 de A deja `currentPid === A` y B conserva sus
  fichas ya gastadas (afirmado en los tokens, no en el log).

## [ ] L15 - COMBOS DE GOAL

- **Cartas (5)**: 294 Kill for Peace · 297 Let Them Eat Cake! · 343 Power to the People ·
  393 The Hand of Madness · 407 Up Against the Wall.
- **Mecanica**: `goal_combo`. Depende del subsistema de victoria (`case 'goal'` ya existe) y del
  criterio de "grupo controlado al final".
- **Aceptacion**: la combinacion impresa se cumple y la partida termina por meta, no por Rules.

## [ ] L16 - CARTAS DE ACCION MULTIPLE

- **Cartas (4)**: 207 Blood, Toil, Tears and Sweat (descarta un NWO en juego) ·
  379 Sweeping Reforms (descarta **todos** los NWO en juego) · 253 Exposed! · 362 Scandal.
- **Mecanica**: coste `combined_power` (Poder combinado >= N de varios grupos) + efecto global.
  Es el hermano grande de L2 y reutiliza `payIllumOrAligns`.
- **Aceptacion**: 379 con dos cartas NWO en juego (una expuesta y una ligada) las descarta
  **ambas** (afirmado por la ausencia de sus ids concretos en `exposedPlots` y `linkedPlots`).

---

## L17 - Cartas que quedan BLOQUEADAS con motivo declarado

No son un fallo pendiente: son cartas cuyo texto impreso exige una mecanica que el motor no
tiene, y el gate de FASE 4 las congela con `BLOCKED_CARDS` para que no se declaren jugables.
Si un lote anterior construye la mecanica que necesitan, se desbloquean y se implementan.

| idx | card | Motivo declarado |
|---|---|---|
| 192 | And STAY Dead! | No existe mecanica de resurreccion, asi que "no card or special ability can revive it" no tendria efecto observable. |
| 228 | Counterspell | Un Resource no puede atacar ni ayudar (§38.5-B), asi que "any Magic Resource used to attack you" nunca ocurre. |
| 276 | Hat Trick | Exige deshacer transaccionalmente una Plot ya resuelta. |
| 285 | I Lied | No existen obligaciones de trato vinculantes en el motor, asi que el marcador no lo consumiria nada. |
| 412 | Vultures | No existe el camino "un grupo jugado de la mano que falla el takeover y se descarta" (el motor lanza y la carta sigue en mano). El reglamento oficial si lo tiene. |
| 226 | Corruption | Depende del relief entre turnos y de la carta Relief. |
| 277 | Head in a Jar | Depende de resurreccion de Personalities. |

---

## Backlog final (lo que NO entra en ningun lote)

- `test_fase4_cards.js`: los huecos de texto declarados `california`, `margaretthatcher`,
  `ollienorth`, `vaticancity` (sin transcripcion posible con las fuentes del repo).
- 232 Crop Circles y 258 Fnord!: su OCR en runtime ya es mas largo que la transcripcion
  secundaria, hay que leer el OCR directamente antes de decidir.
- P1-DATA-03 Global Power: el entorno de red no resuelve ni `cs.cmu.edu` ni `sjgames.com`.
- 185, 195, 206, 229, 331: ausentes de la transcripcion secundaria (`textFull` nulo); hay que
  leer el OCR de la carta antes de disenar su mecanica.
- **Fase 3** (fuera de este plan, ya declarada en §37/§38): UX, onboarding, verificacion en
  navegador real, y una IA que **juegue** las cartas de reaccion (hoy solo cierra las ventanas).
