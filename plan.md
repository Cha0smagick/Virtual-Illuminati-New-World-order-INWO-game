# plan.md - Implementacion de mecanicas e interacciones, carta por carta

Objetivo del plan: cerrar el backlog de **169 Plot/Resource cards** que hoy tienen el texto
impreso transcrito pero ninguna mecanica ejecutable en el motor, sin romper ninguna de las
reglas ya auditadas (P0-001..P0-007, P1-001..P1-027) y sin inventar reglas que el reglamento
no dice.

Referencia de estado: `docs/audit/INWO_SURGICAL_AUDIT.md` (ultima seccion ejecutada: §51).
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
13. **Un fixture no puede depender del reparto aleatorio** (§41 P1-029, §43). Si la carta debe
    estar en la mano porque la regla habla de la mano, **sacala de la baraja al meterla**. Si el
    test afirma "la carta salio de la mano", **compara COPIAS antes y despues**; `indexOf(...) < 0`
    es una asercion invalida en cuanto la fixture uso `put()` para anadir una copia. Y **crecer el
    juego cambia los fixtures**: anadir una ventana o mover una carta de `unverified` puede
    romper una prueba que llevaba meses pasando por casualidad. Toda regresion nueva se prueba
    **30+ corridas consecutivas** antes de darla por buena.
14. **Aserciones sobre el log: nunca `log[length-1]`** (§43). Desde §38/P1-027 jugar una Plot abre a
    menudo `VENTANA DE SUCESO ABIERTA`, asi que el efecto **no** es la ultima linea. Buscar en todo
    el log con `.some(...)` y volcar las ultimas 3 lineas en el mensaje de fallo.

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

## [x] L3 - BULK-POWER: "Increase/Reduce the Power of all X groups by N" — CERRADO en dos partes (auditoria §42)

### L3a — CERRADO (8 cartas; 99->107 clasificadas; 149->141 sin mecanica; 80->88 implemented-pending-engine)

- **Cartas (8)**: 204 Bigger Business · 217 Chicken in Every Pot · 241 Don't Forget to Smash
  the State · 251 Energy Crisis · 271 Gun Control · 296 Law and Order ·
  339 Political Correctness · 344 Principia Discordia.
- **Mecanica**: `bulk_power`. Efecto permanente mientras el grupo siga en juego: una entrada mas
  en `node.powerMods` / `node.resistanceMods` (`{name, v}`), **no** un `powerOverride` (que el
  motor ya usa para ANGST, valor absoluto). Se creo `node.resistanceMods` y se pliego en
  `nodeResistance`, despues de `resistanceOverride` (ASI un Angst que fija Resistencia en 1 no
  borra un +1 de Principia Discordia).
- **Gramatica de clausulas** (datos en `eff.moves`, ejecucion en UN solo case): cada clausula
  admite `align` / `aligns[]` (+`match:'all'|'any'`) / `notAligns[]` (excluye) / `attr` /
  `attrs[]` / `subtype` / `minPower` / `maxPower` / `power` / `resistance` / `become` /
  `scaleBy:{align}` / `scope:'own'|'all'`. Anadir una carta nueva es anadir DATOS.
- **Interpretaciones declaradas** (bloque `BULK_FX` de `gen_cards.js`):
  1. **ALCANCE**: 10 de estas cartas dicen "all X groups" SIN "your": se aplican solo a los grupos
     del controlador. Razon: son Plots jugadas en tu turno para reforzar tu propia estructura, y la
     lectura contraria haria que 251 Energy Crisis fuera estrictamente mejor que un Disaster.
  2. **PERMANENCIA**: el efecto dura mientras el grupo siga en juego; solo salir del juego lo borra.
  3. **ACUMULATIVO**: "Increase the Power of all Conservative Corporate groups by 3" (204, 296) NO
     es una frase que sustituye: un grupo Conservative+Corporate recibe +2 +2 +3 = +7.
  4. `minPower`/`maxPower` miran el Poder **IMPRESO** (`gc.power`), no el actual: 339 dice "groups
     with a Power of only 1" y "su Poder" es el dato de la carta.
  5. El modificador va al **NODO**, no a la carta.
- **Aceptacion cumplida**: con un Nuclear Power Companies (el UNICO grupo del mazo Conservative Y
  Corporate) + un Conservative + un Government/Liberal, 204 sube +7 / +2 / 0 respectivamente,
  `affected=2` y `hits=4`, `scope='own'`, y el homonimo de un rival queda intacto.

### L3b — CERRADO en parte (4 cartas; 107->111 clasificadas; 141->137 sin mecanica; 88->92 implemented-pending-engine; auditoria §44)

Las cuatro son `type=plot`, asi que `E.playPlot` es el punto de entrada correcto en los cuatro casos
(comprobado ANTES de escribir, porque 344 ya demostro que una carta puede ser Resource). Cada una
recibe un **kind propio** porque no comparten mecanica: el criterio de §0.1 es un kind unico por
mecanica, y aqui no hay ni una repetida.

- **268 Good Polls** — kind `def_triple`. Nuevo `node.defTriple={name,untilTurn}`. x3 SOLO a la
  defensa: en un ataque a controlar se triplica la Resistencia, y en uno a destruir se triplica el
  Poder con el que se defiende el objetivo (ahi se defiende con su Poder, no con su Resistencia,
  §25). `selfDef` excluido, declarado. La alineacion se elige apuntando a un grupo propio y tomando
  la PRIMERA de sus `nodeAligns` (la UI elige nodos, no alineaciones; decision arbitraria y
  declarada). `instant`. Sin coste impreso.
- **418 World Hunger** — kind `token_wither`. Dos frases: (a) nuevo `node.noTokens` +
  `noTokensFlag(n)`, un **unico** predicado con **cuatro** consumidores
  (`spendGroupToken`, `firstUsableAid`, `case 'token_gift'` y el reparto automatico de
  `E.beginTurn`; el cuarto es el que hace que la carta dure, porque sin el un verde apagado
  recupera la ficha al turno siguiente); (b) `moves` con `scope:'all'` y −2 de Poder a Liberal
  y/o Nation, reutilizando `bulkClauseHit` y `node.powerMods` de L3a. "or use their special
  abilities" es un **no-op declarado**: el motor no tiene habilidades especiales por grupo.
  NO es `instant` (no imprime "at any time") y no cobra nada.
- **234 Currency Speculation** — kind `tripled_once`. Nuevo `node.tripled={name,stat}`. x3 al Poder
  (`opts.stat='power'`, por defecto) o a la Resistencia (`'resistance'`) de UN grupo tuyo con
  atributo `bank`. Se consume al **gastar la ficha** (su accion) y al defendirse de verdad, este
  ultimo solo con `computeStrength(true)` y NUNCA en `E.previewStrength()` (una vista previa no
  puede gastar una carta). `instant`.
- **355 Resistance is Useless!** — kind `res_nullify`. Nuevos `node.resNullify={name,untilTurn}` y
  `node.noMasterAlignDefense`. La Resistencia a 0 se comprueba en `nodeResistance` **antes** que
  `resistanceOverride`, para que "su Resistencia es 0" gane a un Ango que la fije en 1. El bonus del
  maestro se apaga con el flag; `positionBonus` NO se toca, porque los +5/+10 de proximidad al
  Illuminati riente son justo lo que la carta dice que se CONSERVA. Cuesta la accion de un grupo
  Media (`requiresActionFromAttr:'media'`). NO es `instant`.
- **Caducidad sin campo nuevo**: ni 268 ni 355 anaden nada a `S`. El motor ya lleva `S.turn`, que
  se incrementa en `E.beginTurn`; "mi proximo turno" en un turno circular es
  `S.turn + S.players.length`. Un unico `expireTurnFlags()`, llamado justo despues de `S.turn++`, es
  el punto de vaciado de las dos.

### L3b — PENDIENTE (1 carta, con motivo tecnico declarado)

- **377 Sucked Dry and Cast Aside!** — "x4 por una accion" y "It is THEN considered destroyed, but
  does not count toward any Goal". El unico sitio donde el motor sabe que un grupo ha gastado su
  accion es `spendGroupToken`, y ese helper se llama desde DENTRO de recorridos `walk` y desde el
  registro de ataques; `destroyGroup` hace `detach()`, que muta el array `children` por el que ese
  `walk` itera, asi que destruir ahi puede saltarse un hijo. Dejar el x4 sin destruir seria una
  carta a medias. Hace falta una cola `S.pendingBurstDestroy` con un punto de vaciado claro (fin de
  `E.resolveAttack` y de `E.endTurn`): es un lote propio. `curPower` ya sabe multiplicar por
  `node.burstMul`, asi que la mitad esta hecha. **Declarado, no olvidado.**

### P1-032 (nuevo en §44) — los dieciocho Illuminati tienen `alignments: []`

Consecuencia: `closenessDefenseBonus()` sale por `if(!mal.length)return 0`, o sea que **(a)** el +4
de defensa por alineacion compartida con su Illuminati (regla oficial) no puede ocurrir jams, y
**(b)** el componente "cercania" del coste de las nueve cartas de L2 vale siempre 0. Es trabajo de
DATOS: recuperar de una fuente fiable las alineaciones oficiales de las nueve sociedades.

### BLOQUEADAS (2 cartas, motives distintos, congeladas en `test_fase4_cards.js` `BLOCKED_CARDS` = 11)

- **341 Power for its Own Sake** — ILEGIBLE. El OCR solo da "including your llluminati group 3" y
  no aparece en NINGUNA de las dos fuentes secundarias (`scribd_card_text.json` ni
  `scribd_inwo_cards_full.html`), asi que no se puede autorizar el numero que aplica.
- **384 Tax Reform** — NO es `bulk_power`. Su texto impreso es un efecto continuo entre turnos
  ("The IRS can now tax one Plot card from each player, at the beginning of its own turn"), que es
  un subsistema distinto de una modificacion de Poder/Resistencia. **La agrupacion de plan.md era
  incorrecta.**

## [x] L4 - TOKEN-STRIP: "Remove all Action tokens from ..." -- CERRADO en parte (2 cartas; 111->113 clasificadas; 137->135 sin mecanica; 92->94 implemented-pending-engine; auditoria §45)

- **Entregadas (2)**: 350 Reach Out . . . (`stripPlayers:'rival+own'`, `illumAction`) · 270 Gremlins (`stripAttr:'computer'`, `stripPlayers:'all'`, `canTakeResource`). Un unico `kind` `token_strip`: el efecto es identico (`tokens = 0`) y solo cambian los calificadores, igual que los 11 `token_gift` de L1. Metodo nuevo `E.takeResourceToHand(fromPid,resUid,toPid)`.
- **RECLASIFICADA (1)**: **203 Bigfoot** era `type=resource`, asi que `E.playPlot` es el punto de entrada equivocado (leccion de P1-031 con 344) y ademas su texto impreso es su HABILIDAD ESPECIAL PERMANENTE, no una accion de turno. Sus dos clausulas ("can cancel any action taken by any Media group", "+3 al controlar un Green") necesitan un REGISTRO DE ACCIONES que el motor no tiene. Sale de L4 y pasa a la familia de Resources (L12).
- **Interpretaciones declaradas (7, §45.4)**: el rival se deduce con `findOwnerPid(targetUid)` porque la UI elige un nodo; 350 RECHAZA un objetivo propio ("of any one of your rivals"); `stripPlayers:'all'` en 270 se justifica porque el mismo autor escribe "your own groups" y "any one of your rivals" cuando las quiere; los Resources quedan intactos POR CONSTRUCCION (no son nodos); "Gadget Resource" NO se puede filtrar (34 de 35 Resources tienen `subtype:null`) y se declara perdido a proposito; el modo 2 de 270 queda PENDIENTE (rollback); "solo al final de tu turno" de 350 NO se puede aplicar (no hay sub-fase de final de turno) y se declara NO APLICADO; y se pone el VALOR `tokens = 0`, no la marca `noTokens`, que es lo que distingue esta familia de 418 World Hunger.
- **P1-033 (nuevo en §45)**: DOS bugs reales de motor encontrados por la regresion. (1) El coste se pagaba ANTES de validar el objetivo, violando la regla de P1-022 (la ficha se gasta solo si todas las validaciones pasan). (2) `E.takeResourceToHand` devolvia el Resource a la mano de quien lo TENIA en vez de a la del que juegas la carta.
- **Aceptacion**: cumplida. 2 grupos del rival a 0, el resto del rival tambien, los grupos propios tambien, el Resource del rival intacto, la ficha del Illuminati gastada, rechazo de objetivo propio sin coste, y el modo `takeResource` moviendo el Resource a tu mano.

## [x] L5a - BULK BOOST DE ATAQUE: "+N on an Attack to Destroy/Control of X" - CERRADO (3 cartas; 113->116 clasificadas; 135->132 sin mecanica; checkedFields 24->30; auditoria §46)

**RECLASIFICACION (el filtro del `type` reduceria el lote de 10 a 3).** 344 y 203 ya habian demostrado que una carta puede no ser un Plot; aqui sale sixth vez:

| idx | carta | type medido | destino real |
|---|---|---|---|
|311|Mercenaries|**resource**|Cola de Resources - su texto es una habilidad permanente que se usa COMO ACCION mas tarde |
|358|Rogue Boomer|**resource**|Cola de Resources - idem |
|373|Spear of Longinus|**resource**|Cola de Resources - idem |
|419|World War Three|plot `subtype='goal'`, ya `kind='goal'`|lote de Goals |
|189|Albino Alligators|plot|L5c - es un DELTA sobre el grupo (+10 Poder o Resistencia a un Weird propio), no un bonus sobre un ataque |
|255|Fear and Loathing|plot|L5b - cambia la aritmetica GLOBAL de alineaciones de `computeStrength` de forma permanente |
|254|Faction Fight|plot|APLAZADO - exige "played along with a duplicate card" (L11) y su texto esta truncado a mitad de frase |
|205|Bimbo at Eleven|plot|APLAZADO - exige "male Personality" y el campo `gender` no existe en NINGUNA de las 421 cartas: es un hueco de DATOS como el P1-032, y no se inventa el dato |
|377|Sucked Dry and Cast Aside!|plot|aplazado en L3b (cola de destruccion diferida, §44.6) |

**Las 3 entregadas** comparten un unico `kind` `attack_boost` que engancha `A.boosts.push({name,v})`, con el coste pagado DESPUES de toda validacion (P1-022) y el calificador SIEMPRE comprobado o la carta rechazada:

| idx | carta | calificadores |
|---|---|---|
|381|Swiss Bank Account|`boostValue:10`, `illumOnly:true` |
|391|The First Thing We Do, Let's Kill All the Lawyers|`boostValue:20`, `atkType:'destroy'`, `targetCardId:'lawyers'` |
|415|Whispering Campaign|`atkType:'destroy'`, `boostBySubtype:{personality:15, other:10}`, `requiresActionFromAttr:'media'` |

**7 interpretaciones declaradas** (detalle en §46.3). Las dos que mas importan para futuros lotes: (a) **el nombre del calificador lo decide la carta, no el plan** - por eso 391 usa `targetCardId` (una carta CONCRETA, la 79 `lawyers`, organization, Poder nulo, R1, criminal) y no `targetSubtype`; (b) **un campo que nadie lee es un defecto, no una feature** - casi se escriben `noAssassination` (se cumple por construccion: un Assassination o un Disaster nunca crean `S.attack`) y `outOfPlayOnSuccess` (necesita el registro de duplicados de L11) y las dos se RETIRARON por eso, que es exactamente el defecto P1-026.

**UI**: `NO_TARGET_KINDS = ['token_gift','attack_boost']` en `game/js/ui.js:813` - estas cartas apuntan al ATAQUE, no a un grupo.

**Aceptacion cumplida**: con un ataque a destruir declarado, 381 +10 desde la raiz del Illuminati; 391 +20 contra Lawyers y RECHAZADA contra un Place; 415 +15 contra una Personality pagando con la accion de Big Media (su ficha 1->0) y +10 contra un Place; 415 RECHAZADA sin ataque declarado; 381 RECHAZADA con un atacante que no es el Illuminati, sin anadir boost y conservando la carta en la mano. 23 aserciones observables en `test_fase2_rules.js`.

**Herramientas**: dos trampas de anclaje del `instant` documentadas en §46.4 - `token_strip` NO esta en `instant` (L4 lo decidio asi), y `L4_FXN[norm(k)] = L4_FX[k];` es la ultima SENTENCIA del bucle, no su token de cierre (anclar ahi mete el bloque dentro del bucle y produce un `ReferenceError` aunque `node --check` pase). Y la forma CANONICA de la guardia de no-ASCII: permitir todo el ASCII imprimible y despues una lista EXPLICITA de no-ASCII permitidos.

### L5b - CERRADO (1 carta; 116 a 117 clasificadas; 132 a 131 sin mecanica; checkedFields 30 a 31; auditoria seccion 48)

255 Fear and Loathing NO es un bonus: cambia la MAGNITUD con la que las
alineaciones comparadas valen, de 4 a 8, y el cambio dura el resto de la partida.
Kind `align_rule`, unica cualificadora `alignMag`.

- El motor tenia el 4 escrito A MANO en los DOS bucles de alineaciones de
  computeStrength (control L1311-1315, destroy L1352-1355). Una carta que
  cambia la regla obliga a tocar los dos, y ahi se paga la duplicacion: ahora
  se lee `S.alignRule.mag` UNA vez (4 por defecto) y los dos bucles la usan.
- Los SIGNOS no cambian: control identicas +m / opuestas -m; destroy identicas
  -m / opuestas +m. Es lo que dice el texto, y "the reverse is true for opposed
  alignments" cierra la tabla.
- Sin plazo impreso, luego la carta se EXPONE en la mesa (`pl.exposedPlots`),
  regla de inwo_rules_extracted.txt:223; P1-025 ya la saca del descarte.
- No es "at any time": exige turno propio y NO entra en `NO_TARGET_KINDS` de la
  UI, porque esa lista es para cartas sin objetivo.
- LIMITACION DECLARADA: los ataques instantaneos (Assassination, Disaster,
  `E.instantAttack`) nunca incorporaron el termino de alineaciones, asi que 255
  no les afecta. No es olvido de esta carta.
- La puerta de FASE 4 comprueba ademas que `alignMag` NO sea 4: un 4 seria una
  carta que ocupa mesa y no cambia nada (defecto P1-026 / P1-031).
- F6: tercera reescritura de la asercion de The Network, y la que sobrevive
  afirma una desigualdad en vez de un numero exacto. Se queda sin afirmar la
  magnitud exacta y el bloque lo dice. Ver seccion 48.6.

### L5c - CERRADO (1 carta; 117 a 118 clasificadas; 131 a 130 sin mecanica; checkedFields 31 a 32; auditoria seccion 49)

- **189 Albino Alligators** - kind `group_boost_timed`, calificadores `align:'weird'` + `value:10`. Un SOLO campo de nodo `node.timedBoost={name,v,stat,mode,untilTurn}` con `mode` en `action|defense`, porque la carta solo puede estar en un modo a la vez (no dos campos casi iguales). Hooks: `curPower` suma el Poder en modo ACCION; `nodeResistance` suma la Resistencia en CUALQUIER modo (atacar nunca usa la Resistencia, asi que sumarla siempre es correcto); `computeStrength` en su rama de DESTRUIR suma el Poder en modo DEFENSA (al defenderse de un ataque a destruir el objetivo usa su Poder); `spendGroupToken` consume el modo ACCION ("counts only for that action"); `expireTurnFlags` caduca el modo DEFENSA. Esta en `instant` (el texto imprime "at any time") y NO entra en `NO_TARGET_KINDS` (apunta a un grupo).
- Interpretaciones clave: "your choice" es `opts.stat` y NO un calificador (un calificador que el motor nunca lee seria el defecto P1-026); **el modo lo decide el CONTEXTO** (hay un ataque abierto contra ese nodo = DEFENSA, si no = ACCION), por eso el dato no declara campo de modo; "must be played when that action is first declared" se exige como "el grupo conserva su ficha" y si no, la carta se rechaza; "does not count toward Goals" NO se implementa y se DECLARA (exige un registro de actuaciones, el mismo hueco que bloquea a 377 y al "out of public life" de 415).
- **CADUCIDAD INCLUSIVA, la leccion de 49.5**: 189 dura "hasta el FINAL del turno actual" => `untilTurn = S.turn` y la comprobacion es `<=`. 268 Good Polls dura "hasta el principio del turno SIGUIENTE" => `untilTurn = S.turn + jugadores` y la comprobacion es `>`. Copiar la comparacion de la otra carta dejo el +10 de Poder muerto sin que NINGUN escenario lo detectara, porque la rama de Resistencia no consulta el turno.
- Puerta: rama nueva para `e.align` a NIVEL SUPERIOR de la carta (las clausulas de `moves[]` ya usan `m.align` en la rama de abajo). Sin ella el calificador se validaba en silencio. `checkedFields` 31 -> 32.
- Regresion: 5 escenarios / 46 aserciones, 30/30 corridas limpias. Incluye la comprobacion de caja negra de que un objetivo mas fuerte hace el ataque MAS debil (`total` -8 a -18) y los tres rechazos del texto impreso.
- Los tres fallos que encontro fueron mios, no del motor: el grupo 60 SI era Weird (5a vez del error 39.4, ahora se busca en el mazo), `E.declareAttack(1,...)` sin turno, y `tbOf()` que devuelve `undefined` donde se esperaba `null`.

### Cola de Resources (4 cartas) - nueva, surgida entre L4 y L5

**203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer, 373 Spear of Longinus.** Las cuatro son `type=resource`, y las cuatro cartas describen una HABILIDAD PERMANENTE que se usa COMO ACCION mas tarde ("Can act once per turn", "can be used as often as you wish", "by using his action"), no un efecto que ocurra al jugarlas. Requieren un subsistema de "acciones de Resource" (`E.useResourceAbility`), que hoy no existe: hoy `E.playResource` solo enlaza el Resource y ejecuta un `kind` de carta (P1-031). Ademas 203 necesita poder CANCELAR una accion ya hecha y 205/415 necesitan un registro de "actuaciones", asi que conviene tratar las cuatro juntas.
## [x] L6 - NEGAR UN EVENTO: "That card has no effect / becomes a failure / he must return it" - CERRADO en parte (5 cartas; 118->123 clasificadas; 130->125 sin mecanica; checkedFields 32->41; auditoria §50)

- **Entregadas (5)**, todas `type=plot` verificado ANTES de elegir el punto de entrada (la
  leccion de 344, que una carta puede ser Resource y entonces `E.playPlot` es el sitio
  equivocado):
  - **210 Botched Contact** y **359 Sabotage** comparten un unico kind, `takeover_return`,
    porque el efecto es identico (el grupo vuelve a la mano del rival) y solo cambian el
    coste y un efecto mas: 210 declara `payAnyGroup`, 359 declara `payPower:6` +
    `payShareAlign` + `alsoBlocks`. Calificadores: `payAnyGroup`, `alsoBlocks`, `payPower`,
    `payShareAlign`.
  - **278 Hex** -> kind `resource_destroy`, con `payAttr:'magic'`, `payMinPower:3` y
    `notDuringPrivileged`.
  - **259 Foiled!** -> kind `force_discard_exposed`, con `requiresActionFromAttr:'media'`.
  - **356 Revolution!** -> **NO es una carta nueva**: se anadio dentro del objeto `L5_FX` ya
    existente, porque su efecto es el mismo `A.boosts.push` de 381/391/415. Calificadores
    nuevos: `boostVsDictatorship:20` y `payNotTheAttackers:true`.
- **Reutiliza la ventana de §38 tal cual**: `S.pendingEvent` gana un tercer `kind`,
  `autoTakeover`, abierto por `E.autoTakeover` DESPUES de que `placeUnder` devuelva el nodo
  (nunca sobre un takeover fallido, que en este motor lanza y deja la carta en la mano del
  rival, igual que motivo el bloqueo de 412 Vultures en §38.5). Para que la rama sea
  alcanzable hubo que **anadir `takeover_return` a `EVENT_KINDS`**, porque
  `eventReactionAllowed` rechaza cualquier kind que no este en esa lista: la clase P1-026 /
  P1-031 de "el dato existe pero vive en otro sitio".
- **Aplazadas (5), con dos motivos distintos y declarados**:
  - **224 Computer Security, 230 Cover-Up, 283 Hoax, 363 Secrets Man Was Not Meant to Know**
    dicen todas "that card has no effect" sobre una carta **ya resuelta**. Deshacer un
    efecto aplicado exige volver `E.playPlot` BIFASICO (anunciar y despues aplicar, el
    patron de §33 y §37) repartido por sus 25 ramas, **mas** devolver el coste de la carta
    anulada (`inwo_rules_extracted.txt:924-931`). Es el mismo hueco que bloquea a 276 Hat
    Trick desde §38.5.
  - **222 Combined Disasters** y **372 Spasm of Violence** ("You must play both of the
    Disaster cards, as well") exigen COMBINAR dos cartas en una sola jugada, y el motor juega
    una por llamada. Mismo subsistema que 254 Faction Fight, ya aplazada en §46.
- **P1-034 (nuevo en §50) - cuatro defectos que solo vio la regresion**, con `node --check`
  limpio y las dos puertas en verde:
  - **a** `resource_destroy` tomaba `opts.rivalPid` por defecto igual a `pid`, asi que la
    carta era **INJUGABLE desde la UI** (nadie puede pasar ese parametro). Ahora elige el
    primer rival con Resources si no se pasa `opts.rivalPid`.
  - **b** `atkType:'any'` (que imprime 356) **no lo honraba el motor**: se comparaba
    `A.type!==eff.atkType` sin excepcion, o sea que 356 no se podia jugar en NINGUN ataque.
    Lo primero que se hizo fue arreglar la puerta, y fue el error: mienten los dos. Los dos
    lados quedan corregidos, cada uno con su comentario.
  - **c** 259 no quitaba la carta de `pl.exposedPlots`, asi que la misma carta de Objetivo
    podia forzarse a descartar DOS veces en un turno.
  - **d** 356 **se jugaba gratis**: su bloque de coste solo cobra con `requiresActionFromAttr`
    y 356 no lo declara, asi que "requires an action by a group other than those actually
    attacking" no se cobraba nunca. Segundo camino de coste declarado en el mismo kind.
- **La puerta tambien se equivoco una vez**: `payShareAlign` es un **booleano** (el motor lo
  lee como "comparte AL MENOS UNA alineacion con el grupo tomado", y las alineaciones de
  referencia viajan en `ev.data.aligns`), no el nombre de una alineacion. Su chequeo de
  no-vacuidad busca un **par de grupos del mazo que compartan alineacion**, que es lo unico
  que puede hacer satisfacible la exigencia.
- **Aceptacion cumplida** y afirmada leyendo estado, no cartas: el takeover automatico abre
  ventana, 210 devuelve el grupo a la mano del rival y desaparece de su estructura **sin**
  devolver el takeover, 359 lo devuelve y ademas lo bloquea (un takeover posterior lanza),
  278 saca el Resource del rival al descarte y se rechaza en un ataque privilegiado sin
  destruir nada, 259 saca la carta de Objetivo de las expuestas y la mete en el descarte de
  Plots, y 356 da +10 / +20 segun la marca de Dictatorship pagando con un grupo propio que no
  ataca. 40 aserciones, **30/30 corridas consecutivas** de `test_fase2_rules.js`.
- **UI sin cambios**: 210 y 359 los juega un rival dentro de una ventana ya abierta por el
  motor, y 278 y 259 eligen su objetivo por deduccion (el primer rival con Resources; un
  `opts.rivalPid` explicito lo sobreescribe). Ninguna de las cuatro pide un grupo objetivo,
  asi que **ninguna entra en `NO_TARGET_KINDS`**.


## [x] L7 - INTRUSION EN PLOTS OCULTOS: "look at all his hidden Plot cards" - CERRADO en parte
  (4 cartas; 123->127 clasificadas; 125->121 sin mecanica; 104->108 implemented-pending-engine;
  checkedFields 41->42; auditoria seccion 51; P1-035)

- **Cartas entregadas (4 de las 5 de L7)**: 303 Logic Bomb  -  322 Mutual Betrayal  - 
  386 The Auditor from Hell  -  242 Double-Cross. Las cuatro verificadas `type=plot` PRIMERO
  (la leccion del 344/203: una carta puede ser Resource y entonces `E.playPlot` es el punto
  de entrada equivocado).
- **APLAZADA (1)**: **304 March on Washington** - "Play this card ALONG WITH a Plot card"
  es combinacion de cartas en una sola jugada y el motor juega una carta por llamada. Mismo
  subsistema que ya aplazo a 254 Faction Fight, 222 Combined Disasters y 372 Spasm of
  Violence. Ninguna de las dos mitades se simula.
- **RECLASIFICACION**: las 4 cartas no son un mecanismo unico sino tres efectos distintos mas
  una negacion, asi que **cuatro kinds distintos** y no uno:
  - `peek_steal` (303) - `payMinPower:6`, roba UNA de las Plot ocultas y la mano del rival
    pierde exactamente una carta.
  - `peek_expose` (322) - sin qualifier de coste (cualquier grupo propio paga),
    `exposeEqual` expone el mismo numero de las mias que de las suyas.
  - `peek_rob` (386) - `payAttrAny:['computer','bank']` + `illumCode:'network'` +
    `canExposeAll:true`; tres pagadores comprobados en el orden impreso.
  - `peek_block` (242) - la VICTIMA juega la carta y marca `cancelledBy`; **no cierra la
    ventana** (contrato de dos pasos), asi que "he does not get to look at (or steal) any of
    your cards after all" se cumple sin ninguna otra operacion.
- **La cuarta ventana de reaccion: `S.pendingPeek`** con `PEEK_KINDS`, `hiddenPlotsOf(pid)`
  (definicion unica de Plot oculta: indice del `pl.hand` con `type==='plot'` que NO esta en
  `pl.exposedPlots`), `firstRivalWithHidden(pid)` (tecnica `alignFromTarget`/P1-034a, sin
  selector de jugador nuevo), `openPeekWindow`, `closePendingPeek(act)` y
  `E.resolvePendingPeek(act)`. Proyeccion en `publicState()` con indices y nombres, nunca
  objetos carta. Nuevo `pl.revealedBy` para registrar la exposicion.
  **DECLARACION QUE INVIERTE LA REGLA DE LAS OTRAS TRES VENTANAS**: aqui la ventana se
  abre SIEMPRE, incluso sin respuesta, porque el efecto ES una decision; en §33/§37/§38 no
  abrir sin respuesta era lo correcto.
- **SIN CAMBIOS EN LA UI**: las cuatro apuntan a un JUGADOR rival, no a un grupo, asi que NO
  entran en `NO_TARGET_KINDS`.
- **P1-035**: la rama de gate de `illumCode` escrita antes de probar el dato encontro un bug
  de DATOS - el **id** de la carta es `thenetwork1` pero su **`effect.code` es `network`**.
  Los 18 codigos reales: `adepts, bavarian, bermuda, discordian, gnomes, cthulhu, shangrila,
  network, ufos` (y los dieciocho siguen con `attributes:[]`, P1-032). El motor compara
  `effect.code`, nunca el id.
- **Metodologia de ancla que queda (importante para todo lo que viene)**: `countOf(needle)
  === 1` **NO basta**, porque una unica aparicion DENTRO DE UN COMENTARIO lo supera - asi se
  rompio el primer splice de este lote. La forma segura es `countOf === 1` **Y** que el texto
  previo a la aguja en su linea sea solo espacios. El chequeo `commentDepth === 0` hay que
  descartarlo cuando el ancla es ella misma una apertura de comentario.
- **Regresion**: 49 aserciones / 7 escenarios. 303 roba (conteos de copias, nunca
  `indexOf(...)<0`), 322 expone 2 y 2, 242 anula sin revelar nada, 386 paga con el
  Illuminati y con un grupo Computer, y los rechazos impresos con sus mensajes exactos.
  **30/30** corridas seguidas de FASE 2.
- **Aceptacion cumplida**: rival con 3 Plot ocultas, 303 deja elegir una, termina en mi mano y
  `pl.revealedBy` registra la exposicion.
## [x] L8a - MANIPULACION DE MAZO Y ROBO (361, 388, 411) - CERRADO en §52-§54

> **La agrupacion de este lote era incorrecta y se ha deshecho midiendo carta por
> carta** (2a vez que pasa, ver §51). Queda anotado para que no se repita:
> - **L8a (hecho, §52)**: 361 + 388 + 411. `deck_manip` con `mode:'draw'|'burn'|'sellout'`,
>   `topOfDeck(deck,n)`, y `placeBonusAction` — que creo el subsistema de token de
>   accion EXTRA, que no existia de ninguna forma en el motor (P1-036).
> - **L8b (hecho, §53)**: 233 Crystal Skull + 367 Shroud of Turin. No son `deck_manip`:
>   son ganchos de robo (`draw_hook`) en `drawFrom`, otra superficie. El robo se APLAZA
>   a `S.pendingDraw.pool` (quinta ventana) porque las dos cartas impresas SON una
>   decision y deshacer un robo ya hecho no es una opcion. Hallazgos P1-042 (el canje
>   de estrella no consume el robo normal), P1-043 (validar antes de cerrar la ventana),
>   P1-044 (el robo sincrono no admite decisiones), P1-045 (`E.playResource` con if/else
>   invisible para el gate de FASE 4), P1-046 (la IA no podia cerrar la quinta ventana).
> - **L8c (hecho, §54)**: 405 Unlucky 13. Ventana de reactivo al principio del turno ajeno
>   + bandera auto-limpiante de "no roba Plot cards". `kind` nuevo
>   `turn_start_block`: la ventana `S.pendingTurnStart` la abre `E.endTurn` ANTES de
>   `beginTurn` (blast radius cero: solo se abre si un humano con el 405 en mano
>   No es el siguiente jugador). El bloqueo se pone antes de `beginTurn` a proposito,
>   para cubrir tambien el autoDraw del Network. Hallazgos P1-047 (la fase 'begin'
>   + `requireOwnMain` hacian la carta injugable: tiene que entrar por `instant`;
>   `afterAdvance`/`maybeRunAI` tienen que hacer return temprano), P1-048 (el
>   autoDraw del Network no respetaba el bloqueo), P1-053 (el reparto
>   aleatorio dejaba el 405 en mano de un humano y abria la ventana a mitad de
>   tests automatizados).
> - **P1-050 RETIRADO / P1-054 (55)**: el P1-050 de 54 era una premisa mala, no un
>   hueco real. "Magic" NO es una alineacion, es un ATRIBUTO de carta (glosario
>   Magic; ya lo habia detectado 31.2 con P1-018): hay 0 grupos con 'magic' en
>   `alignments` pero 9 con el ATRIBUTO magic (druids, ninjas,
>   reformedchurchofsatan, rosicrucians, stonehenge, templars, vampires,
>   voudonistas, witch). El coste de 405 se declara con el patron ya existente
>   `requireActionFromAttr:'magic'` y se paga con un grupo real. Ademas las 18
>   Illuminati con alineaciones vacias NO son un hueco de datos (el glosario dice
>   que nunca tienen alineaciones ni atributos), asi que **L9 NO es bloqueante para
>   405**: L9 sigue pendiente solo por su propia aceptacion de `align_edit`. La
>   regresion ya no fabrica data imposible (`alignments=['magic']`); busca un grupo
>   real del catalogo con atributo magic y Poder>=3 y lo juega.
> - **BLOQUEADAS (P1-038)**: 191 y 395. El juego real tiene un mazo de Plot POR JUGADOR
>   y este motor tiene UN `S.plotDeck` compartido. Congeladas en `BLOCKED_CARDS`.
> - **REASIGNADA**: 282 Hitler's Brain NO es de mazo (disparador al destruir + restriccion
>   Peaceful). Va con las de disparo permanente.

- **Mecanica**: `deck_manip` + `topOfDeck` + `applyBonusUids`; caducado en `expireTurnFlags`.
- **Interpretaciones declaradas**: el techo de 10 de 388 es la SUMA de mano + cima (P1-039);
  los Resources descartados no bonifican token porque el texto dice "each Group" (P1-040);
  411 QUEMA (fuera de juego, ni al descarte) y 388 DESCARTA (al descarte rebarajable).
- **Leccion de la tanda**: `firstUsableAid` pasa `(carta,nodo)` al predicado, no el nodo
  solo (P1-037) — un filtro de nodo hace que la carta se rechace siempre, en silencio.

> - **§56 (hecho): P1-055 - una sola ortografia del coste de accion por atributo.** Barrido
>   sistematico de atributos. El motor tenia dos campos casi identicos
>   (`requireActionFromAttr` sin s, en el gate generico; `requiresActionFromAttr` con s, en los
>   gates por kind) y nada impedia que una carta declarase uno y su kind no leyese ese
>   (coste de accion GRATIS en silencio, la clase de P1-054). Fix en 3 capas: datos
>   canonicalizados a la ortografia sin s, guard estructural en `gen_cards.js` que LANZA si
>   alguien reintroduce el alias o declara el campo en un kind sin gate, y helper
>   `actionCostAttr(eff)` en el motor para que los 5 gates lean igual. El guard se probo
>   **empiricamente** (reinyectar el alias -> el generador lanza). Dos falsos positivos del
>   barrido descartados por error de medicion (P1-056 `ifAttr`/`attr` SI se leian; P1-057 los
>   ids de `gen_cards.js` pueden llevar espacios normalizados por `norm()`). Resultado
>   positivo: **P1-018 esta estructuralmente CONTAINED** (solo 3 sitios de `engine.js` tocan
>   `.alignments` y dos son comentarios). El protocolo 30x encontro ademas un bug de test
>   (S7 de L8c hardcodeaba 3 Plots) ya corregido, y dejo **ABIERTO** un flake de ~1/100 en
>   S9 (carta 388, de §52) que NO se ha diagnosticado: se documento en §56 en vez de
>   taparlo a ciegas.
>
> - **§57 (hecho): P1-058 + P1-059 - identidad vs posicion al descartar.**
>   El flake de S9 (388 The Big Sell-Out) NO era fragilidad de test: eran dos bugs de motor.
>   `P1-058`: la rama `mode:'sellout'` empujaba identidades de catalogo donde `hand.splice`
>   exige posiciones -> duplicacion de cartas. `P1-059`: la cola de `E.playPlot` descartaba la
>   carta jugada con un indice capturado ANTES del switch de efectos, obsoleto si el efecto
>   mutila la mano -> la carta jugada se quedaba en la mano y entraba al descarte.
>   Cerrado por el HALLAZGO ABIERTO que §56 dejo. Regresion S9b con 2 copias para que el
>   defecto no se esconda en el caso de 1 sola. Verificado con Node real: 10/10 suites y
>   90/90 flake. **Leccion permanente: `ctx_execute(language:"javascript")` corre BUN,
>   no Node — usar `C:/Program Files/nodejs/node.exe`.**
> - **§58 (hecho): barrido del patron inverso de P1-059 + P1-060 (rollback del EMBEZZLEMENT por identidad).**
>   El backlog de §57 se **CIERRA con evidencia**: sobre 26 capturas de posicion en `engine.js` (`var X = <arr>.indexOf(`), los 4 candidatos reales se leyeron uno a uno y **los 4 son seguros** (placeUnder L1387, cierre de EMBEZZLEMENT L2244, `E.addBoost` L1713, STOLING THE PLANS L2212). **0 instancias vivas** del patron fuera de la cola de `playPlot`.
>   **P1-060**: el rollback de la rama `if (at3 < 0)` usaba `hand.pop()` (posicion asumida en vez de identidad, correcto hoy solo por casualidad posicional) — era el **unico `pop()` vivo del motor**. Corregido a `indexOf(ixQ)` + `splice`. Regresion: bloque `6b) P1-060` en `test_fase2_rules.js` (9 aserciones, fichero 5.646 → 5.703 lineas) que fuerza la rama sacando el pago de la mano del reclamante entre los dos pasos de la ventana.
>   **Leccion permanente**: un barrido de texto **genera candidatos, no conclusiones** — 22 de 26 "riesgos" eran falsos positivos por shadowing de ambito y por matching contra los comentarios del propio audit (3a repeticion de la leccion de §54/§56). Y **documentar un defecto crea sus propios falsos positivos**: los comentarios de §57 se emparejaron como codigo.
>   **LECCION PERMANENTE (heredada de §57, aplica a todo lo que viene):** `ctx_execute(language:"javascript")` corre **BUN**, no Node. `process.execPath` NO es node y `bun --check` **no valida sintaxis** (ejecuta el fichero y revienta en `engine.js:9` con `window is not defined`). Usar siempre `C:/Program Files/nodejs/node.exe`.
> - **§59 (hecho): barrido de `pop()` y `shift()` - CIERRE del patron identidad-vs-posicion (P1-061).**
>   Barrido completo de `engine.js` (5.228 lineas): 5 `.pop()` + 3 `.shift()`, **0 instancias vivas**.
>   Los 5 `pop()` son TODOS de mazo (reparto inicial 924-925, rebarajado 1099, draw 1100, drawN 1188).
>   De los 3 `shift()`: 1332 es de mazo; 5054 (`plotsInHand`) es seguro porque 5046 lo construye con
>   `filter` (array NUEVO, no alias de `pl.hand`); 5060 (`exposedPlots.shift()`) es consumo intencional.
>   Confirmado que el `pop()` sobre mano que P1-060 corrigio ya NO existe: el patron cierra sus 3 variantes
>   (`indexOf`->`splice` §58, `pop` §58/P1-060, `shift` §59). Lote de verificacion pura, blast radius CERO.
>   **Leccion permanente (4a repeticion de la de medicion):** un barrido debe clasificar por AMBITO
>   (¿esta variable indexa una mano o un mazo?) antes de contar; el numero bruto de matches es irrelevante.
>   Ademas, un resultado NEGATIVO tambien es resultado: el backlog se cierra con evidencia negativa, no con silencio.
> - **§60 (hecho): L9 EDITAR ALINEACIONES - 332 + 357 (P1-063).** La premisa de este lote
>   era falsa en 3 puntos y se corrigio en el audit: (a) **NO existia `case 'align_edit'`**
>   - L9 era greenfield, no un cableado; (b) **solo 2 de las 4 cartas son `align_edit`**:
>   **310 `mediaconnections` y 280 `hiddeninfluence` son Global Power + LINK (ya en L10)** y
>   vuelven alli intactas; (c) *"por nodo, no por carta"* es cierto para 332 y **FALSO para
>   357**, porque un grupo destruido no tiene nodo (`destroyedByMe` guarda solo `cardId`).
>   **3 mecanismos nuevos**: caducidad por turno (`alignsTmpAdded`/`alignsTmpRemoved` con
>   sello `alignsTmpTurn`, dentro de `nodeAligns`), ventana de Gadget fuera de `playPlot`
>   (`S.pendingAlignEdit` + `E.useGadgetAction`/`E.resolveAlignEdit`, bloqueada durante
>   ataque privilegiado), y overlay retroactivo **por carta** (`S.alignRetro` + `retroAlignsOf`).
>   **Mejora atomica del pago**: 357 paga *"your luminati OR Media groups Power>=8"* en
>   **dos pasadas** (reunir, comprobar, gastar), al contrario que `force_align`, que gasta
>   fichas dentro del walk y luego lanza. **Nuevo accessor `E.alignsOfNode(uid)`**: antes
>   el motor no exponia alineaciones, y el criterio de aceptacion de este lote no se podia
>   afirmar directamente. Gate FASE 4 movido 133/115 -> **135/113** (techo 176 sin tocar).
>   **PENDIENTE CRITICO**: `ai.js` no resuelve `pendingAlignEdit` y `endTurn` la bloquea
>   luego una partida AI-vs-AI con 332 se colgaria. Cerrar con el patron de §53.
>   **3 bugs de motor mas que la regresion de L9 descubrio** (todos en este lote):
>   **P1-064** la marca de temporalidad de 332 iba en el nodo del Gadget (
d) y no en
>   el grupo re-alineado (	), asi que la edit caia en la capa PERMANENTE y **nunca
>   caducaba** (contra el texto: "only for the rest of the current player's turn").
>   **P1-065** 357 dice "Play this card at any time", no es de la ventana de suceso, pero
>   el case 'align_edit' exigia un S.pendingEvent previo y ademas lo leia: **era
>   INJUGABLE**. Ahora crea su propia ventana (rechazando pisar una ya abierta).
>   **P1-066** guarda falsy-cero: if(!pid||...) en E.resolveRewritingHistory hacia que
>   para el **primer** jugador (pid 0) la funcion retornara en silencio: se cobraba el
>   coste y **no se aplicaba nada**. Ahora pid==null. Ademas cierra la ventana.
## [x] L9 - EDITAR ALINEACIONES - CERRADO en §60 (alcance corregido: 332 + 357; 310 y 280 a L10)

- **Cartas (2, alcance corregido)**: 332 Orbital Mind Control Lasers (resource) y
  357 Rewriting History (plot). **310 Media Connections y 280 Hidden Influence NO son
  `align_edit`**: son Global Power + LINK, y siguen intactas en **L10**.
- **Mecanica**: `align_edit`, con **dos modos**: `gadget_action` (332, via la accion del
  Gadget, fuera de `playPlot`, con caducidad por turno) y `destroyed_retro` (357, sobre
  un grupo **destruido**, que no tiene nodo: overlay **por carta** en `S.alignRetro`).
  El texto original de este lote decia *"por nodo, no por carta"*: es cierto para 332
  y **falso para 357**.
- **Aceptacion (cumplida)**: nodo con dos alineaciones; 332 quita una de las dos y
  `E.alignsOfNode` deja de reportarla. Verificado con **14 aserciones** verdes.


> - **§61 (hecho): L10 EFECTOS PERMANENTES LIGADOS - 310 + 280 (P1-067, P1-068, P1-069).**
>   La premisa del lote era mas PEQUEÑA que el trabajo real, al reves que en L9: de los
>   tres mecanismos que `plan.md` pedia, **dos ya existian**. El link permanente ya es
>   `pl.linkedPlots` (engine.js:452, lo escriben 7 cartas desde Power Increase) y
>   anadir atributo a un grupo ya es `node.attrsAdded` + `hasAttr` (P1-017). Lo UNICO
>   que faltaba era Global Power, y se resolvio en el sitio correcto: **un termino mas
>   en `countsForGoals`** (engine.js:144), que es el gate unico de "este grupo cuenta
>   para las metas" y por el que pasan los 7 recorridos de meta. "Global Power igual a
>   su Poder regular" significa que el grupo **deja de contar**, asi que es un flag
>   (`nd.globalNeutral`), no una resta.
>   Kind nuevo `link_effect` con dos modos declarados por carta: `grant_attr` (310 anade
>   `media` al NODO) y `grant_global` (280 solo el link). Costes con precedente: 280 =
>   `illumTokens--`; 310 = **dos pasadas atomicas** (el `walk` REUNE sin gastar y solo
>   se paga al completar), el mismo esquema que 357 en L9 y deliberadamente distinto de
>   `force_align`, que gasta fichas y luego lanza.
>   **3 P1 encontrados por la regresion, no leyendo codigo:**
>   **P1-067** Global Power como termino del gate central y no parche en los 7 consumidores;
>   **P1-068** `node.attrsAdded` **no viene inicializado** (la creacion de nodos del motor
>   en engine.js:1635 solo pone uid/cardId/children/tokens) => `TypeError` al jugar 310;
>   **P1-069** **sobre-restriccion copiada de otra familia**: arrastre el limite "no puede
>   haber mas de una en juego" de Power Increase, que su texto SI imprime pero el de
>   310 y 280 **no** => 280 no se podia jugar dos veces sin motivo oficial. Ahora el
>   limite es opt-in (`eff.onePerPlayer`).
>   **310 y 280 salen de `BLOCKED_CARDS`** (estaban por `P1-DATA-03 Global Power
>   ausente`): el subsistema ya existe. Congeladas 13 -> **11**. **`purge` sigue
>   congelada por el mismo motivo y es ahora desbloqueable** con este mecanismo.
>   Regresion: **22 aserciones** en `test_fase2_rules.js`, con atomicidad del pago de 310
>   (rechaza y NO muta nada), camino feliz completo, y **anti-P1-050 generico**.
>   Gates: **137 clasificadas** (antes 135), **111 sin mecanica** (antes 113), techo 176
>   sin tocar, kinds distintos 48. **10/10 suites + 90/90 flake.**
>   **LECCION PERMANENTE:** copiar una restriccion de una familia de cartas hermana es un
>   DEFECTO, no un atajo - si el limite no esta en el texto de la carta, no existe. Y el
>   prefijo real de una asercion que pasa es `ok   - ` (con relleno): un filtro mal
>   escrito reporta "0 aserciones" y "todo verde" a la vez.
## [x] L10 - EFECTOS PERMANENTES LIGADOS - CERRADO en §61 (310 Media Connections + 280 Hidden Influence) ("Link this card to X")

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

## [x] L11 - JUGAR UN DUPLICADO DESDE LA MANO - CERRADO en §62 (alcance corregido: kind `dup_enabler`)

> - **§62 (hecho): L11 - 220 Clone + 227 Counter-Revolution + 287 Imposter + 309 Media Blitz (P1-070).**
> - **Correccion 1 - la mecanica estaba INVERTIDA.** `plan.md` decia que estas 4 cartas eran "el duplicado" (`play_duplicate`). Los 4 textos dicen *"permits you to play, **from your hand**, a [X] which duplicates one who..."* y *"**Used this card when you play**, from your hand..."*: el duplicado es OTRA carta y la habilitadora se juega EN ESE MOMENTO. El kind real es **`dup_enabler`** y se consume en una API nueva.
> - **Correccion 2 - el registro de destruidos YA existia.** `destroyedByMe` (init 455, se empuja en `destroyGroup` 2694) lo consumen `destroy_reduce` (745), `goalCount` (981), el goal de destruir-N (5580-5581) y el overlay de 357 (5196). Lo que no existia era **COMO** se destruyo: es un array plano de `cardId`. Se anade un array **paralelo** `assassinatedBy`, escrito en el UNICO sitio fiable (3131-3135, donde `eff.kind==='assassination'` es el criterio autoritativo), para no romper los 4 consumidores.
> - **Correccion 3 - NO existe "jugar un Grupo desde la mano".** Barrido de `children.push` en engine.js = 5 sitios; el unico que crea un nodo desde la mano es `placeUnder`, que se llama desde UN solo sitio (`E.autoTakeover`). `E.organize` reorganiza, no juega. L11 es un **punto de entrada nuevo** (`E.playGroupFromHand(pid,dupIdx,enablerIdx,parentUid)`), no un enganche.
> - **Sin ventana de reaccion, DELIBERADAMENTE.** Las dos cartas van en una sola llamada, asi que se eliminan por construccion los 3 riesgos de toda ventana nueva (guarda de `endTurn`, proyeccion de `publicState()`, settler en `ai.js`). `case 'dup_enabler'` en `playPlot` **rechaza** jugar la habilitadora sola, con el motivo oficial.
> - **Coste de 227 con P1-018 invertido**: `government` es una **alineacion**, no un atributo ⇒ filtro por `nodeAligns`, no `hasAttr`. Dos pasadas atomicas (el `walk` reune sin gastar; solo al completar se paga), igual que 357 y 310.
> - **P1-070 - 287 IMPOSTER ERA IMPAGABLE** (3a vez que sale la clase de P1-050, y la 1a que la detecta la regresion): "an action from one group **with an alignment in common with the Personality**", pero las Personalities SON los Illuminati y **nunca** tienen alineaciones (regla oficial; 0 de 18). La clausula no tiene referente en los datos. Se paga con `payAnyGroup` y la limitacion queda **DECLARADA**; 3 aserciones estructurales impiden que el alias muerto vuelva.
> - **Regresion: 36 aserciones** (5983 -> 6246 lineas) con precondicion ausente, **atomicidad**, 227 en sus 2 ramas, 309 con sus 2 excepciones, 220 exigiendo asesinado, 287 con P1-070, alcance cruzado, rechazo de la habilitadora sola, y el **guard estructural** de P1-070.
> - **UI/app**: `enablersForL11` + 3 ramas en `handClick` (`dupEnabler` -> `dupParent`) + `CB.onPlayDuplicate`. Sin proyectar los registros de cada jugador en `publicState()`.
> - **Gate de FASE 4**: **137 -> 141 clasificadas**, 111 -> 107 sin mecanica. Techo 176 y minimo 53 **sin tocar**. Catalogo **421 cartas sin deriva**. **10/10 suites** y **90/90 flake** con Node real.
> - **Limites declarados**: 287 se paga con cualquier grupo (P1-070); el takeover de 220 ("controlar normalmente") y el control automatico de 287 son simplificaciones; 22 Clone Arrangers, 254 Faction Fight y 333 Payoff quedan FUERA (restaurar / reaccion del rival). **P1-071** (nuevo): modelar el "grupo asociado" de las Personalities para poder implementar 287 al pie de la letra.

## [x] L12 - MANIPULACION DE RESOURCES  <!-- P1-077..P1-086. Cerrada el 2026-10. 5 cartas (236/348/378/400/413) con la mecanica `resource_effect` (kind UNICO). Reglas permanentes tocadas: la busqueda de un uid que el motor emite tiene que ser alcanzable por el mismo buscador que valida las cartas que lo usan (P1-077, con findResourceEntry, NO metiendo pl.resources dentro de findNode); todo fixture que inserte en la mano purga antes, porque el reparto es aleatorio (P1-078, el mismo motivo habia dejado 2/80 corridas en rojo); Global Power ya existe como globalNeutral, asi que 348 sale de BLOCKED_CARDS con el precedente de 310/280 (P1-079); objetivo SIEMPRE elegido por el jugador, nunca autoelegido; si un Resource imprime "at any time" pero no dice "Requires Action", USARLO no gasta ficha de grupo (P1-083, 378); y el registro de una entrada en pl.resources va DESPUES del push (patron draw_hook). Desviaciones declaradas: NO se filtra por Gadget/Artifact/Agent porque el mazo no tiene clasificacion de Resources (lo declara el propio motor en resource_destroy L4794-4800) y esa palabra queda como printedRestrict, que es solo declaracion textual; 348 modo A se declara imposible (una sola copia de cada Illuminati) sin simularlo; 413 solo registra el stash y el payout, exponer/esconder queda en backlog; 38.5-B sigue cerrado por decision de alcance. Resultado: FASE 4 de 141/107 a 146/102 (+5 clasificadas, -5 sin mecanica, resource_effect:5, 10 bloqueadas), npm test ALL TESTS PASSED (11), 30/30 de test_fase2_rules.js. Evidencia y limites en docs/audit/INWO_SURGICAL_AUDIT.md 64. -->

- **Cartas (5)**: 236 Deasil Engine · 348 Purge · 378 Suicide Squad · 400 The Weak Link ·
  413 Warehouse 23.
- **Mecanica**: `resource_effect`. `pl.resources` ya existe (`{uid,cardId,linkedTo,tokens:0}`).
- **NOTA de §38.5-B**: los Resources hoy **no pueden atacar ni ayudar** (`E.addSupport` exige
  `findNode` y `tokens>=1`). 236, 378 y 400 no dependen de eso, asi que este lote es posible.
- **Aceptacion**: 378 destruye un Resource rival y desaparece de `pl.resources` del rival
  (afirmado por la ausencia del `uid` concreto, no contando recursos).
  **CORREGIDO como causa raiz en P1-077 (L12.a)**: no era una decision de diseno, era un agujero
  de `findNode`, que solo recorre el arbol de grupos y nunca `pl.resources`.

### [x] L12.a - HECHO (P1-077): los Resources eran inalcanzables para el buscador de nodos

- **Commit `8a0ac35`** (engine.js + test_fase2_rules.js + index.html).
- **Hallazgo**: `findNode(uid)` y `findOwnerPid(uid)` recorren solo `S.players[p].structure`.
  Los Resources viven en `pl.resources`, un array plano de entradas `{uid:'r'+n, cardId,
  linkedTo, tokens, [drawHook], [stash]}` que **no** forma parte del arbol de grupos. Por tanto
  `findNode('r12')` devolvia siempre `null` y `findOwnerPid('r12')` siempre `-1`.
- **Tres consumidores rotos**: `E.useGadgetAction` y `E.resolveAlignEdit` (332 Orbital Mind
  Control Lasers **INJUGABLE**: cualquier uid de Resource caia en el `throw` "Los Lasers no
  estan en tu mesa") y `E.addSupport` (`throw 'Apoyo inexistente'`, que es la causa raiz de
  §38.5-B: los Resources no pueden atacar ni ayudar).
- **Por que la regresion L9 de 332 pasaba sin tocar el bug**: su helper `plant()` mete el nodo en
  `structure.children`, o sea **como si el Resource fuera un grupo**. El test nunca pasaba por el
  camino de juego real.
- **Correccion**: helper nuevo `findResourceEntry(uid)` que devuelve `{pid, entry}` recorriendo
  `pl.resources` de todos los jugadores, mas el helper de test `plantRes(pid, uid, cardId)` que
  planta el Resource donde lo planta el motor de verdad. **NO** se metio `pl.resources` dentro de
  `findNode`: los nodos de grupo tienen `children` y `tokens` propios y se consumen en
  `spendGroupToken()`, `nodeAligns()` y `noTokensFlag()`; una entrada de Resource no cumple esa
  forma y romperia a todos esos consumidores a la vez.
- **Leccion**: un identificador que el motor genera (`r+n`) tiene que ser alcanzable por el mismo
  buscador que valida las cartas que lo usan. Un `throw` de "no esta en tu mesa" sobre un uid
  que el buscador no puede resolver es una carta muerta en silencio.

### [x] L12.b - HECHO (P1-078): el fixture de L10 no era determinista (test flaky)

- **Commit `e4132f0`** (test_fase2_rules.js).
- **Sintoma medido**: `test_fase2_rules.js` fallaba ~3-4% de las corridas con exactamente 2
  fallos, siempre los mismos y siempre juntos, los dos de L10 (310 Media Connections).
- **Causa**: el reparto inicial es aleatorio y a veces deja ya una copia de `mediaconnections` en
  la mano de P0. `toHandL10()` quita la del `plotDeck` y empuja UNA, pero **no purga las que ya
  venian**; y las aserciones de L10 cuentan copias de forma **absoluta** (`=== 1` antes del
  rechazo, `=== 0` tras el camino feliz) mientras el resto del fichero cuenta por delta. Los
  otros terminos de ambas condiciones se cumplian siempre, asi que caian exactamente esas dos y
  solo esas dos.
- **Correccion**: `toHandL10` purga con splice inverso las copias previas antes de insertar
  (splice inverso y no `filter`+reasignar para no cambiar la identidad del array de mano, que
  otros bloques del test ya tienen capturada). **60/60 corridas en verde** tras el fix.
- **Leccion**: todo fixture que inserte una carta en la mano debe ser determinista en el numero
  de copias. O cuenta por delta, o purga antes de insertar. Lo que no vale es empujar sin purgar
  y luego asertar un numero absoluto.

### [ ] L12.c - DATOS: familia `resource_effect` en `gen_cards.js`

- [x] L12.c.1 Anadir la familia `resource_effect` con las 5 cartas y `kind` UNICO (ninguna de  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  las 5 lo usa hoy: 233/367 son `draw_hook`, 332 `align_edit`, 344 `bulk_power`).
  **Proximo ID libre al abrir este paso: P1-079.**
- [x] L12.c.2 `t:` = texto impreso **verbatim** de la carta. Ojo: `textFull` es la  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  transcripcion limpia; `text` es el OCR y a veces esta corrupto (236 dice "Gudget" donde el
  impreso dice "Gadget").
- [x] L12.c.3 `400 The Weak Link` tiene `textFull` nulo (hueco de OCR ya declarado en el audit).  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  Se conserva el hueco y se documenta; NO se inventa el texto que no se ha leido de la fuente.
- [x] L12.c.4 **NO anadir `subtype` ni `attributes` a los Resources.** El motor ya lo declara  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  escrito en `case 'resource_destroy'` (L4794-4800): *"el mazo NO tiene clasificacion de
  Resources: 34 de los 35 tienen `subtype:null` ... el mismo motivo por el que se solto el
  'Gadget Resource' de 270. No se inventa ninguna categoria."* El mismo criterio se aplica a
  236/378/400/413 y la diferencia se documenta como **limite declarado + backlog**.
- [x] L12.c.5 `400` lleva el coste combinado: `payIllum` + `payAttrAny:['science','magic',  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  'computer']` + `payMinPower:6` (patron exacto de `case 'align_edit'`, 357 Rewriting History).
- [x] L12.c.6 `378` lleva el 1d6 (`roll:'d6'`) y las tres ramas: 1 / 2-5 / 6.  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
- [x] L12.c.7 `413` lleva `stash:true` (lista de Resources escondidos) y `firstPlay:true` (el  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  "when you first play this card" del impreso).
- [x] L12.c.8 Correr `node test_fase4_cards.js`: **clasificadas 141 -> 146** y **sin mecanica  <!-- datos: familia resource_effect en gen_cards.js + KIND_ES/FIELD_ES + purge fuera de BLOCKED_CARDS (c3a6968) -->
  107 -> 102** (exactamente 5). Cualquier otro numero es un fallo, no una mejora.

### [ ] L12.d - MOTOR: `case 'resource_effect'` en `engine.js`

- [x] L12.d.1 El `case` debe existir de forma REAL (`case 'resource_effect':`), nunca `else  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  if`: el gate de FASE 4 detecta las ramas con `/case\s+'([a-z0-9_]+)'\s*:/` sobre todo el
  motor, asi que un kind clasificado cuya rama "no existe" hace fallar la suite.
- [x] L12.d.2 `E.playResource`: su `switch(resFx)` necesita su `case 'resource_effect'`; hoy el  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  `default` LANZA con *"El Resource X tiene una mecanica (resource_effect) que E.playResource
  todavia no ejecuta"*. 413 registra `entry.stash = []` **despues** del `push` (patron
  `draw_hook`, cuyo comentario lo pide explicitamente en el codigo).
- [x] L12.d.3 Todo rechazo de coste u objetivo lanza `throw new Error(c.name + ': ...')` con el  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  **motivo oficial** en texto llano (DoD #5). Formato de referencia:
  `c.name+' necesita la accion de tu Illuminati o de un grupo '+eff.payAttr+...`.
- [x] L12.d.4 **Objetivo elegido, nunca autoelegido** (DoD #6): 378/236/400 reciben  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  `opts.rivalPid` + `opts.resUid` desde la UI, como hace `case 'resource_destroy'`. **NO**
  replicar el default actual de `resource_destroy` (`splice(-1,1)` borra el ULTIMO Resource en
  silencio cuando no hay `resUid`): si la UI no paso objetivo, se elige de forma explicita o se
  falla.
- [x] L12.d.5 378 tira `d6()` una sola vez (unico generador de dado del motor, engine.js L15) y  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  aplica las tres ramas; el Resource destruido se descarta con `S.groupDiscard.push(cardId)` como
  hace `resource_destroy`.
- [x] L12.d.6 400 usa el patron de coste combinado de `align_edit` (357): primero  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  `pl.illumTokens--`; si no hay, `walk(pl.structure, ...)` **reuniendo** Poder hasta `payMinPower`
  y **gastando despues**. No gastar dentro del walk como hace `force_align`, que gasta fichas y
  luego lanza.
- [x] L12.d.7 Un uso = una sola ficha (leccion de engine.js L1938-1957: un intento de gastar  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  `pl.illumTokens` en vez de la ficha del nodo raiz se retiro al MEDIR porque hacia gastar dos
  pools distintos por una sola accion).
- [x] L12.d.8 `lastResult` es el canal de resultado (`{ok, negated, card, kind, target,  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->
  targetPid, owner, paidWith}`): las regresiones deben mirar ahi para afirmar el efecto observable.
- [x] L12.d.9 `node --check game/js/engine.js` limpio + `npm test` en verde + FASE 4 con 146/102.  <!-- motor: cases en playPlot y playResource, lista instant, registro tras el push (f30e1a3) -->

### [ ] L12.e - UI: las 5 cartas ejecutables y con objetivo elegido por el jugador

- [x] L12.e.1 `app.js`: los callbacks con la misma red `try { ... } catch (e) { log('! ' +  <!-- UI: callbacks en app.js, chipMini/panelHtml, ventana pendingResDestroy, 6 data-act (148d140) -->
  e.message); }` que usan `onUseGadgetAction` / `onResolveAlignEdit` (L195-202), para que un
  rechazo del motor llegue al registro y no solo a la consola (leccion de P1-076).
- [x] L12.e.2 `ui.js`: accion en el menu de la mano que abre la ventana de objetivo del rival y  <!-- UI: callbacks en app.js, chipMini/panelHtml, ventana pendingResDestroy, 6 data-act (148d140) -->
  lista SUS Resources uno por uno (nunca el primero). Reutilizar el patron de `pendbar` que ya
  existe para `pendingAlignEdit` (ui.js L664-705).
- [x] L12.e.3 **Anadir el boton que falta para "usar Gadget"**: `onUseGadgetAction` existe en  <!-- UI: callbacks en app.js, chipMini/panelHtml, ventana pendingResDestroy, 6 data-act (148d140) -->
  app.js L195-198 pero `useGadgetAction` tiene **0 ocurrencias en ui.js** => no hay ningun boton
  que abra la ventana y el sub-menu de `pendingAlignEdit` es codigo muerto para el jugador. Es
  DoD #6 incumplido hoy para 332.
- [x] L12.e.4 `?v=44` -> `?v=45` en las 13 referencias de `game/index.html` (cache-busting).  <!-- UI: callbacks en app.js, chipMini/panelHtml, ventana pendingResDestroy, 6 data-act (148d140) -->
- [x] L12.e.5 **Verificar en navegador real** (leccion de P1-075: un test de Node no pasa por el  <!-- UI: callbacks en app.js, chipMini/panelHtml, ventana pendingResDestroy, 6 data-act (148d140) -->
  camino pulsacion -> callback). Servidor estatico temporal, arrancar partida, pulsar cada una de
  las 5 cartas; comprobar que el rechazo llega al registro y que no hay errores en consola.

### [ ] L12.f - REGRESION en `test_fase2_rules.js` (>=2 escenarios)

- [x] L12.f.1 Escenario 1: **378 destruye un Resource rival** afirmado por la AUSENCIA del `uid`  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->
  concreto en `pl.resources` del rival (no contando recursos, como exige la aceptacion del lote).
- [x] L12.f.2 Escenario 2: **348 Purge modo B** (usado por otro grupo) baja Poder y Global Power  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->
  en 1, o **236 Deasil Engine** destruye un Resource de cualquier bando sin gastar accion.
- [x] L12.f.3 Rechazo por regla: 400 con Poder combinado insuficiente **NO MUTA NADA** (mismo  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->
  patron que L10: sin link, ficha intacta, carta en la mano) y el mensaje cita el motivo oficial.
- [x] L12.f.4 **Determinismo (leccion de P1-078)**: los helpers que insertan en la mano purgan  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->
  copias previas, o los asserts cuentan por delta. La partida del fixture se construye con
  `plant`/`plantRes`, no con el reparto aleatorio.
- [x] L12.f.5 Aserciones sobre el log con `.some(...)`, **nunca `log[length-1]`** (regla 14):  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->
  jugar un Plot abre VENTANA DE SUCESO ABIERTA, asi que el efecto no es la ultima linea.
- [x] L12.f.6 **30+ corridas consecutivas en verde** (regla 13) antes de dar el lote por bueno.  <!-- regresiones L12 en test_fase2_rules.js, 30/30 verde, 3 bugs del test corregidos (08e02f0) -->

### [ ] L12.g - CIERRE: `§64` en el audit, cerrar el lote, commit + push

- [x] L12.g.1 Seccion `§64` en `docs/audit/INWO_SURGICAL_AUDIT.md` con Hallazgo / Correcciones /  <!-- seccion 64 del auditor + este cierre; la verificacion en navegador real del flujo de Resource queda declarada pendiente, no certificada -->
  Verificacion / Lecciones / Backlog, **ASCII sin tildes**, escrita con script Node temporal
  (`fs.appendFileSync`, que aborte si `## 64.` ya existe) y luego borrado.
- [x] L12.g.2 IDs de la seccion: **P1-079..P1-083** (uno por carta de L12), mas recordatorio de  <!-- seccion 64 del auditor + este cierre; la verificacion en navegador real del flujo de Resource queda declarada pendiente, no certificada -->
  P1-077 y P1-078, que ya tienen su propia seccion.
- [x] L12.g.3 Marcar `## [x] L12` en este fichero y anotar el resultado real (clasificadas  <!-- seccion 64 del auditor + este cierre; la verificacion en navegador real del flujo de Resource queda declarada pendiente, no certificada -->
  141 -> 146, sin mecanica 107 -> 102, suites 11/11, 30+ corridas).
- [x] L12.g.4 Backlog que queda declarado: (a) el "Gadget / Artifact / Agent" del impreso no es  <!-- seccion 64 del auditor + este cierre; la verificacion en navegador real del flujo de Resource queda declarada pendiente, no certificada -->
  verificable por maquina (34 de 35 Resources sin `subtype`); (b) §38.5-B sigue cerrado: los
  Resources no pueden atacar ni ayudar porque `E.addSupport` sigue usando `findNode`; (c) la
  "reaccion del rival" de 22/254/333, ya fuera de L11.

## [ ] L13 - DEFENSA CONTRA DISASTERS

- **Cartas (5)**: 243 Early Warning (+10, accion gratis) · 410 Volunteer Aid (+6 y relief
  automatico) · 188 Air Magic · 244 Earth Magic · 245 Earthquake Projector.
- **Mecanica**: `disaster_defence`, el mismo camino que ya usan `node.destroyBonus` y
  `node.assassinationBonus` (§33). Regla oficial: **no** afecta al Poder del Place, solo a su
  defensa.
- **Aceptacion**: un Place con 243 tiene `destroyBonus >= 10`; un Disaster fallido por 1 con
  margen real, no solo por aritmetica.

## [ ] L14 - MANIPULACION DE TURNO

- **Cartas (5)**: 364 Seize the Time! (roba el turno de otro) · 405 Unlucky 13 (ENTREGADA
  entera en L8c/§54, no queda nada de bloqueo de turno pendiente aqui) ·
  408 Upheaval! · 354 Reorganization · 298 / 299 Let's Get Organized (flechas de control).
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
