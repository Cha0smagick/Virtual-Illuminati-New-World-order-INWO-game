# Auditoría quirúrgica de INWO — Illuminati: New World Order

**Fecha:** 2026-09-24  
**Alcance:** juego ejecutable en `game/`, datos generados, scripts de auditoría, pruebas y experiencia de usuario.  
**Modo de trabajo:** auditoría local directa, sin agentes, skills, tasks ni delegaciones.  
**Estado:** auditoría abierta; P0 y el primer lote P1/gates fueron implementados y verificados; este documento sigue siendo la fuente de verdad para el plan de corrección.

## 1. Resumen ejecutivo

El juego carga y permite completar partidas, pero **no es una implementación completa ni confiable de las reglas anunciadas**. La partida puede avanzar porque existen rutas básicas, pero hay defectos que permiten violar las reglas, romper ataques, ganar en el momento incorrecto, o mostrar acciones que el motor no puede validar. Además, la experiencia depende casi exclusivamente de clics, estados visuales poco explicados y textos que se reescriben periódicamente.

La prioridad no es agregar más contenido: primero hay que convertir el estado del juego en una máquina de estados verificable, hacer que cada acción tenga una precondición y una consecuencia auditables, y alinear la UI con las mismas reglas. Mientras 374 de 421 cartas siguen marcadas como `implemented:false` y 383 como `estimated:true`, la interfaz debe comunicar de forma honesta qué partes son completas, aproximadas o no implementadas.

**Veredicto:** no aprobar como producto de reglas completo. Aprobable únicamente como prototipo visual; el primer lote P0 y la puerta de calidad ya están corregidos, pero las reglas centrales y los efectos de cartas siguen abiertos.

## 2. Convenciones de severidad

- **P0 — bloqueante:** puede producir crash, corrupción de estado, victoria inválida o hacer que una acción inválida tenga éxito.
- **P1 — alto:** regla central incorrecta, exploits reproducibles, pérdida de estado, UX opaca o datos que contradicen la promesa del producto.
- **P2 — medio:** accesibilidad, internacionalización, mantenimiento, privacidad o calidad de tooling que degradan la confianza.
- **P3 — bajo:** limpieza, documentación y consistencia visual no crítica.

Cada hallazgo incluye evidencia, causa, corrección y criterio de aceptación. “Arreglar” significa demostrar el comportamiento con una prueba o smoke test, no solo cambiar una línea.

## 3. Inventario y evidencia de ejecución

### 3.1 Producto y datos

- Runtime estático: `game/index.html`; no hay build step del runtime.
- Módulos principales: `engine.js`, `ui.js`, `ai.js`, `app.js` e `i18n.js`, conectados por globals y cargados como scripts estáticos.
- `game/js/cards.js` es generado y expone `window.INWO_CARDS`; contiene 421 cartas.
- Inventario: 421 imágenes, 399 textos OCR, 193 estadísticas conocidas, 0 entradas en `cardstats_fix.js`.
- Familias: `plot_generic:321`, `resource_generic:35`, `sin-effect:29`, `illu_special:18`, `disaster:13`, `assassination:5`.
- 374 cartas están marcadas `implemented:false`; 383 `estimated:true`; 374 tienen power null y 394 resistance null.
- Hay dos generadores (`gen_cards.js` y `build_cards.js`) con fuentes y tablas distintas; `package.json` tiene runner de tests/auditoría, pero aún no tiene un build reproducible de datos.
- `README.md` presenta el proyecto como completo/playable y el motor como completo, aunque el propio contenido reconoce placeholders. Debe corregirse antes de volver a presentarlo como producto completo.

### 3.2 Pruebas existentes

Las ejecuciones iniciales pasaron sintaxis (`SYNTAX_FAILURES=0`) y varios smoke tests, pero las pruebas no son gates fiables:

- `npm test` siempre falla con el placeholder `Error: no test specified`.
- `test_engine.js` captura errores y los imprime en vez de hacerlos fallar.
- `test_ai_vs_ai.js` llama `beginTurn` otra vez aunque `startGame` ya lo hizo, luego fuerza `endTurn` y `checkVictory`; puede crear estados inválidos y解释了 el log duplicado.
- `test_appflow.js` resuelve ataques en un `catch` y avanza manualmente; no demuestra que el flujo normal sea legal.
- `test_flow.js`, `test_respond.js` y `test_ui.js` son useful smoke tests, no una suite de aceptación.
- No hay lint, typecheck, cobertura, CI ni prueba de navegador/accesibilidad.

### 3.3 Scripts de auditoría

`audit_mechanics.cjs` detectó 321 plots genéricos, 35 recursos genéricos sin manejar, 18 efectos Illuminati sin manejar y 29 cartas sin efecto; además reportó 120/120 resultados de dado iguales a 11 y una línea `ERROR`, pero devolvió exit code 0. `audit_stats.cjs` solo informa correcciones y no actualiza runtime. `audit_usage.cjs` y `audit_syn.cjs` atrapan errores y sobrescriben `SINERGIAS.md`; deben ser diagnósticos reproducibles, no “puertas” que oculten fallos. Una ejecución anterior modificó `SINERGIAS.md`; fue restaurado a HEAD durante esta auditoría.

## 4. Hallazgos P0 — integridad y reglas

### P0-001 — Avatar de turno y primera victoria incorrectos

**Archivo:** `game/js/engine.js:229-305`, `engine.js:903-927`.  
**Evidencia:** `startGame()` asigna `S.turn=1` y luego llama `beginTurn()`, que lo incrementa a 2. `checkVictory()` rechaza únicamente `S.turn<2`; por tanto el primer final de turno puede contar como victoria, contradiciendo la regla de no victoria en la primera ronda.  
**Impacto:** partidas terminan antes de que ambos jugadores completen la apertura y el contador mostrado no representa la ronda.  
**Corrección:** separar `round`/`turnsCompleted` de un índice global; iniciar el primer turno sin incrementarlo y exigir las rondas mínimas de la configuración antes de evaluar victoria. Hacer la comprobación idempotente.  
**Aceptación:** con dos jugadores, ningún objetivo puede ganar al final de su primer turno; el primer final elegible es el segundo turno del primer jugador; llamadas repetidas a `checkVictory` no cambian estado ni duplican logs.

### P0-002 — Ataque contra carta en mano puede lanzar excepción

**Archivo:** `engine.js:427-476`.  
**Evidencia:** `declareAttack()` construye el log usando `findNode(...).cardId`; para un objetivo en mano se busca `undefined` y el resultado puede ser `null`, por lo que se intenta leer `.cardId`.  
**Impacto:** una opción visible en la UI puede romper la partida con `TypeError`.  
**Corrección:** derivar nombre/UID de la rama de mano sin consultar el tablero y centralizar la construcción del descriptor del objetivo.  
**Aceptación:** ataque de control contra carta en mano rival produce un estado válido o un error de dominio mostrado en UI, nunca una excepción no capturada.

### P0-003 — `addBoost` permite convertir cualquier carta en +10

**Archivo:** `engine.js:517-525`, `ui.js:627-669`.  
**Evidencia:** cualquier índice de mano se elimina y se registra como plot discard; no se comprueba tipo, efecto, elegibilidad, pago ni Alignment. La UI llama a `onBoost` para cualquier plot durante un ataque.  
**Impacto:** exploit de +10 universal, contradicción de datos y de reglas.  
**Corrección:** validar carta de efecto `boost10`, dueño, Alignment, mano, fase, ataque pendiente y semántica de Alignment; rechazar con razón visible.  
**Aceptación:** cartas no elegibles no se consumen ni alteran el ataque; una carta válida cambia exactamente el valor permitido y su descarte.

### P0-004 — La ataque de UI puede resolver el ataque equivocado

**Archivo:** `ui.js:421-454`, `app.js:130-159`.  
**Evidencia:** el panel de ataque muestra acciones a cualquier humano cuando existe y `resumeAfterAttack()` usa `App._order[0]` como atacante, no `A.attackerPid`; el botón de resolver no valida dueño del ataque.  
**Impacto:** un jugador puede actuar sobre otro, se pierde el actor real y se salta el cierre de turno.  
**Corrección:** el panel debe renderizar acciones solamente para `A.attackerPid` o para el objetivo permitido por la regla; toda resolución debe usar el ataque persistido y continuar con el mismo actor.  
**Aceptación:** con dos humanos, el actor no activo no ve ni puede ejecutar accionesajena; tras resolver se conserva el turno y la respuesta correcta.

### P0-005 — CHECK de victoria no es idempotente

**Archivo:** `engine.js:903-927`.  
**Evidencia:** `checkVictory()` es público y puede ejecutarse después de `gameover`; la suite de AI lo llama explícitamente. El smoke mostró dos linhas consecutivas de victoria.  
**Impacto:** log y estado de final inconsistentes; no se puede confiar en la condición de fin.  
**Corrección:** retorno inmediato si `gameover`, guardar `winnerPids`/`victoryReason` y centralizar el registro.  
**Aceptación:** múltiples llamadas secuenciales no agregan logs ni cambian el resultado.

### P0-006 — Guardas de fase y autorización incompletas

**Archivo:** `engine.js:214-225`, `313-365`, `820-865` y métodos públicos relacionados.  
**Evidencia:** `setIlluminati`, `startGame`, `giveCard`, `discardCard`, `giveResourceTo` y `endTurn` no tienen guardas de setup/turno/propietario suficientes. `endTurn` no bloquea ataques pendientes.  
**Impacto:** mutación externa del estado singleton y transiciones ilegales desde consola/UI/tests.  
**Corrección:** una única función `assertPhase/assertActor/assertOwnership`, y API de comandos que rechace operaciones durante setup, attack o gameover. Mantener `_raw()` solo para diagnóstico separado.  
**Aceptación:** cada comando público rechaza operaciones ilegales con error de dominio y el estado permanece igual.

### P0-007 — Reglas de captura y destrucción no se ejecutan completamente

**Archivo:** `engine.js:621-702`.  
**Evidencia:** al capturar un grupo no se mueven sus Resources-linked; la rama sin arrow empuja bajo la raíz sin validar capacidad.  
**Impacto:** estructuras capturadas pueden perder sus vínculos y la posición final puede exceder el límite.  
**Corrección:** capturar el subárbol y todos sus recursos ligados, elegir destino legal, respetar máximo de hijos y registrar cada movimiento.  
**Aceptación:** una captura conserva la relación de recursos y nunca excede slots permitidos.

## 5. Hallazgos P1 — reglas centrales y exploit

### P1-001 — Goal UFO imposible por comparar ID con índice

**Archivo:** `engine.js:181-185`, `engine.js:867-901`, `engine.js:229-255`.  
**Evidencia:** la configuración guarda `g.id`, pero los nodos de estructura guardan `handIdx`; `controlsGroup()` compara `nd.cardId===cardIdRef`.  
**Corrección:** elegir una identidad estable para nodos (preferiblemente card ID real) y probarMetaspecial en una partida dedicada.  
**Aceptación:** controlar los objetivos UFO设计的 hace avanzar el progreso y la victoria se puede alcanzar con una ruta legal.

### P1-002 — Tokens de grupo se acumulan en cada turno

**Archivo:** `engine.js:269-305`.  
**Evidencia:** `nd.tokens++` para cada grupo powered en cada `beginTurn`, aunque la regla dice agregar solo a grupos sin token.  
**Corrección:** `if (nd.tokens===0) nd.tokens=1` y revisar el caso de Resources Action.  
**Aceptación:** un grupo que ya tiene token no aumenta al comenzar el siguiente turno.

### P1-003 — Se consume el derecho de draw aunque el deck esté vacío

**Archivo:** `engine.js:313-345`.  
**Corrección:** comprobar longitud antes de fijar `plotDrawn/groupDrawn`; no retirar el pago de exchange si la operación no puede completarse.  
**Aceptación:** un draw con deck vacío devuelve error/estado sin consumir laDraw blessing ni另一 acción del mismo turno.

### P1-004 — Ataque de control contra mano no cubre la semántica de la especificación

**Archivo:** `engine.js:427-476`, `621-669`, `SPEC-RULES.md:12,36`.  
**Evidencia:** solo se buscan cartas en manos rivales; el código no cubre el ataque a mano propia indicado en la especificación y mueve la carta rival a neutral en éxito, pero la deja en mano en fallo. La especificación contiene una contradicción entre rival-hand y own-hand.  
**Corrección:** decidir una regla canónica en `SPEC-RULES.md` y hacer que motor, UI y pruebas usen el mismo objetivo; no ocultar la ambigüedad con un branch silencioso.  
**Aceptación:** una tabla de pruebas cubre ambas manos, éxito/fallo y destino de la carta.

### P1-005 — `computeStrength` contiene condiciones muertas y omite defensa

**Archivo:** `engine.js:529-598`.  
**Evidencia:** existe `... || true`; `defBoosts` no se suma al total; la immune Discordian solo añade una nota.  
**Corrección:** eliminar dead condition, sumar todos los modificadores que la regla declare y hacer que immunity/Privilege/secrecy cambien la resolución o fallen explícitamente.  
**Aceptación:** tests unitarios fijan cada término del cálculo y demuestran que una defensa válida aumenta la dificultad.

### P1-006 — `moveGroup` autoriza mover grupos ajenos

**Archivo:** `engine.js:705-726`.  
**Evidencia:** valida que el jugador esté en main, pero no que el nodo le pertenezca; puede gastar token del dueño real y mover hacia cualquier arrow abierto.  
**Corrección:** exigir `ownerPid(node)===pid`, destino del mismo jugador, Arrow legal y capacidad; retirar ramas vacías.  
**Aceptación:** mover un nodo rival o a un padre ajeno devuelve error y no modifica tokens/estructura.

### P1-007 — Plot de assassination/disaster no ejecuta el ataque instantáneo

**Archivo:** `engine.js:729-817`.  
**Evidencia:** `playPlot()` llama `destroyGroup` o marca devastado directamente; `instantAttack()` existe pero no se usa. Se salta poder, tirada 2d6, target immune y reglas de permanent kill.  
**Corrección:** implementar una transacción de attack instantáneo con validaciones, roll, resolución y标记 de assassination/disaster; permitirlo solo cuando la regla esté habilitada.  
**Aceptación:** un assassination falla o tiene éxito según la misma matemática de dado y nunca causa destrucción gratuita.

### P1-008 — Goal/recursos Illuminati no tienen implementación de efectos

**Archivo:** `engine.js:387-400`, `playUsefulPlots` en `game/js/ai.js`.  
**Evidencia:** `playResource` solo enlaza; 35 recursos genéricos y 18 efectos Illuminati están sin manejar. La AI solo intenta una allowlist mínima y para el resto registra “ignored”.  
**Corrección:** implementar familias de efecto o marcar cartas como no jugables hasta tener efecto; no presentar una carta como “played” si no cambia estado.  
**Aceptación:** cada familia jugable tiene un test de success/failure; cartas no soportadas quedan bloqueadas con explicación.

### P1-009 — Hand limit ignora exposed plots

**Archivo:** `engine.js:848-865`, `app.js:150-159`.  
**Corrección:** contar `hand` + `exposedPlots` y hacer la comprobación antes de log/advance.  
**Aceptación:** exponer 6 plots activa la misma restricción que tener 6 plots en mano; end-turn rechaza el estado inválido.

### P1-010 — AI puede donar a un rival y luego atacar al mismo objetivo

**Archivo:** `game/js/ai.js:510-551`, `runAttack` 384-415.  
**Evidencia:** el gift usa el grupo global 1 como destino y no actualiza identity/target; `runAttack` tiene un `endTurn` no exportado y no integrado.  
**Corrección:** pasar `pid`/targetUid explícitos, eliminar hooks muertos y hacer que la AI termine el turno solo en un único owner.  
**Aceptación:** una partida AI-vs-AI no puede atacar a un aliado unintended ni duplicar el cierre de turno.

### P1-011 — Stats y generadores no reproducibles

**Evidencia:** `gen_cards.js` y `build_cards.js` tienen tablas distintas; `cardstats_fix.js` está vacío aunque `audit_stats.cjs` dice 166 correcciones.  
**Corrección:** elegir una única fuente, versionar el output, generar diff de stats y fallar si el runtime no coincide con la fuente.  
**Aceptación:** ejecutar build desde limpio reproduce exactamente `cards.js`; una diferencia stats有意 produce exit no cero.

### P1-012 — Tests y auditorías convierten errores en éxito

**Evidencia:** scripts atrapan excepciones, no incrementan exit code y el package test es placeholder.  
**Corrección:** runner común con assertions, errores no ignorados y gates separados `build`, `test`, `audit:rules`, `audit:data`, `smoke`.  
**Aceptación:** un fixture con excepción deliberada hace fallar el comando correspondiente.

## 6. Hallazgos P1/P2 — intuición, accesibilidad e i18n

### P1-013 — Setup no es intuitivo ni accesible

**Archivo:** `ui.js:211-305`, CSS relacionado.  
**Evidencia:** solo ofrece dos slots; Illuminati y toggles son `div` click-only; no hay navegación por teclado, roles, `aria-*`, focus tras redraw ni guía de primera partida. Validación usa `alert`. La UI muestra español aunque i18n puede iniciar en inglés.  
**Corrección:** convertir controles a buttons, crear un flujo de 3 pasos (jugadores → Illuminati → confirmación), mostrar reglas relevantes, conservar foco y añadir `lang`/idioma explícito.  
**Aceptación:** teclado completa setup; lector de屏幕 anuncia cada opción; ningún estado requiere hover para obtener información.

### P1-014 — Ataque/selección permite clicks sin contexto y expone controles incorrectos

**Archivo:** `ui.js:421-669`, `775-819`.  
**Evidencia:** `route(uid)` se llama aun sin selección; no hay cancelar/undo; panel de ataque puede mostrarse a actor equivocado; la UI presenta clicks que el motor no soporta.  
**Corrección:** un único `canAct/actor` gate, botón Cancel, wizard explícito, estado `idle/selecting/responding`, y deshabilitar controles con razón visible.  
**Aceptación:** cada control visible ejecuta una operación legal o muestra un motivo; ningún error se oculta en un catch.

### P1-015 — Tutorial y hints enseñan reglas incorrectas

**Archivo:** `ui.js:540-583`, `835-853`.  
**Evidencia:** el tutorial afirma que cada grupo recibe token, el objetivo de control en mano no coincide con engine, y aparecen inconsistencias rojo/verde; objetivo fijo 12.  
**Corrección:** generar hints desde la misma tabla de reglas y copy de estado; documentar hand limit, exposed plots, immunity, goals y timing.  
**Aceptación:** cada hint coincide con un test de regla y tiene un caso para primer turno, captura,資源 y fin de turno.

### P2-001 — CSS sin focus visible ni reduced motion

**Archivo:** `game/css/style.css:1-684`.  
**Evidencia:** no hay `:focus`, `:focus-visible` ni `prefers-reduced-motion`; hay seis grupos de animaciones y overlays con z-index 60–400.  
**Corrección:** focus ring consistente, reductions sin eliminar feedback essential, objetivos táctiles >=44px, revisar scroll en móvil y Escape/backdrop para overlays.  
**Aceptación:** navegación completa por teclado, sin parpadeo en reduced motion y sin contenido inaccesible en 320px.

### P2-002 — i18n muta el DOM cada 600ms

**Archivo:** `game/js/i18n.js:118-194`, `game/index.html:7-9`.  
**Evidencia:** `setInterval(sweep,600)` y `sweep()` reescribe headings/labels; no hay MutationObserver, focus preservation ni fuente central. Google Fonts es dependencia externa, sin CSP/SRI.  
**Corrección:** translating render-time strings, catálogo único, `document.documentElement.lang` consistente, fallback local y política de privacidad para fuente externa.  
**Aceptación:** cambiar idioma no borra focus/selección, no produce loops y funciona offline con fallback.

### P2-003 — Prompts y overlays no son dialogs

**Archivo:** `ui.js:122-199`.  
**Evidencia:** innerHTML no escapado en `prompt`, sin `role=dialog`, foco inicial, Escape, backdrop click ni focus trap.  
**Corrección:** componentes semánticos, `textContent` por defecto, `aria-modal`, devolver foco al disparador y documentar cierre por teclado.  
**Aceptación:** axe/Playwright manual no detecta roles faltantes; Escape cancela sin aplicar una acción.

### P2-004 — Cambios de estado y feedback son silenciosos

**Archivo:** `app.js`, `ui.js:613-626`.  
**Evidencia:** catches convierten errores en un log; no hay undo ni resumen de turno.  
**Corrección:** errores de dominio visibles, toast/feedback no bloqueante, resumen de cambios y acción de deshacer solo cuando la regla lo permita.  
**Aceptación:** el usuario puede saber por qué una acción fue rechazada sin abrir consola.

### P2-005 — CSP, SRI, caché y privacidad

**Archivo:** `game/index.html:1-59`.  
**Evidencia:** Google Fonts remoto, scripts manuales con `?v=37`, sin CSP/SRI; el título tiene mojibake.  
**Corrección:** autoalojar fuente o fallback del sistema, CSP compatible con static runtime, hashes/versiones Centralizados y título UTF-8 correcto.  
**Aceptación:** el juego carga con red bloqueada y no realiza requests a terceros no documentados.

## 7. Hallazgos P2/P3 — datos, repositorio y mantenimiento

- `SINERGIAS.md` se genera durante auditorías y no debe ser una salida mutante de un smoke test.
- `undefined/.config/...` sugiere una ruta de tooling mal formada; revisar antes de eliminar.
- `.omo/run-continuation/*.json` y `.opencode/goals/...` son artefactos de proceso, no producto; aislarlos o ignorarlos sin tocar el cambio preexistente de `owner.json`.
- `README.md` debe separar “prototipo jugable” de “reglas completas”, documentar cartas estimadas/no implementadas y explicar cómo regenerar datos.
- Faltan contratos de tipos para Card, Effect, Attack y State; introducir JSDoc/`checkJs` o TypeScript incremental, sin reescribir el motor de golpe.

## 8. Reglas que requieren decisión canónica

Antes de implementar todos los efectos, fijar en `SPEC-RULES.md`:

1. Ataque de control contra mano propia: ¿se permite y, si falla, va a discard o neutral?
2. Carta rival en mano: ¿neutral, discard o retorno? El texto actual se contradice.
3. ¿Assassination/Disaster se permiten fuera de main? ¿Puede responderse?
4. ¿Privilege limita la ayuda/opposición, o solo es un flag informativo?
5. ¿La meta básica incluye siempre la carta Illuminati y cuál es el goal count por número de jugadores?
6. ¿Los recursos_ACTION reciben un token por turno o solo al estar sin token?

Cada decisión debe tener tabla de ejemplos y test de aceptación; no se debe elegir silenciosamente en un branch.

## 9. Plan de corrección

### Fase 0 — Baseline y trazabilidad (inmediata)

- Crear este documento y un changelog de hallazgos.
- Fijar versión de reglas y snapshot de 421 cartas.
- Ejecutar sintaxis, pruebas existentes, simulaciones repetidas y smoke de Chrome; separar fallos preexistentes de regresiones.

### Fase 1 — P0 integridad (primer lote)

1. Corregir contador de turno y gate de victoria idempotente.
2. Eliminar crash de objetivo en mano y desacoplar log de `findNode`.
3. Restringir boost a carta elegible.
4. Añadir guardas de fase, actor, ownership y pending attack.
5. Capturar recursos ligados y respetar capacidad.
6. Crear tests de regresión que fallen antes de cada corrección y pasen después.

### Fase 2 — Reglas centrales

- Implementar o bloquear explícitamente recursos y efectos Illuminati.
- Reparar UFO, tokens, draws, hand limit, move, target semantics.
- Conectar Assassination/Disaster a `instantAttack` con tirada y estados.
- Resolver immunity, Privilege, secrecy, agents y goals especiales.
- Hacer que AI use el mismo contrato de acciones que los humanos.

### Fase 3 — UX y onboarding

- Setup de 3 pasos, controles semánticos, teclado, focus, preview consistente.
- Eliminar flujo de click oculto: Cancel, seleccionar, confirmar, resultado.
- Tutorial generado desde reglas; primer turno guiado; objetivo y legal actions visibles.
- Corregir i18n para render-time y `lang`.

### Fase 4 — Datos y calidad

- Unificar `gen_cards.js`/`build_cards.js`; source of truth y build limpio.
- Convertir auditorías en comandos con exit codes; no tragarse excepciones.
- Tests de contrato, unitarios, integración, Playwright/Chrome y smoke offline.
- Actualizar README/BIBLIA/SINERGIAS para distinguir implementaciones reales y estimadas.

## 10. Criterios de aceptación globales

- [ ] Ningún comando de calidad devuelve 0 si encuentra una excepción, roll fuera de rango o discrepancia de datos.
- [ ] El motor rechaza transiciones ilegales y mantiene estado inmutable desde comandos externos.
- [ ] La primera victoria no puede ocurrir antes de la ronda permitida.
- [ ] Los cuatro ataques principales (control/destroy, board/hand) tienen fixtures y no lanzan excepciones.
- [ ] Los efectosdew/resources tienen comportamiento verificable o están marcados como no jugables.
- [ ] Setup y juego se pueden completar solo con teclado; overlays tienen semántica y cierre.
- [ ] No hay ocultamiento de errores en `catch` que conviertan una acción fallida en éxito.
- [ ] 421 cartas, stats, efectos e imágenes se regeneran de forma reproducible.
- [ ] README no promete reglas completas mientras existan `implemented:false`.
- [ ] El cambio de idioma conserva foco y el juego funciona sin red externa.
- [ ] `npm test` ejecuta una suite real y falla de forma útil.

## 11. Primer lote P0 — ejecutado

El primer cambio fue deliberadamente pequeño y verificable: invariantes de turno/victoria, prevención de crashes de ataque, guardas de transición y tests de regresión. No se alteró todavía el contenido de las cartas ni se implementaron los 321 efectos genéricos; esas tareas requieren primero una decisión de reglas y un contrato de datos.

### Cambios implementados

- `game/js/engine.js`: `turnCompleted` privado; guards de setup; inicio del primer turno real en `S.turn=1`; `turnsCompleted` se incrementa al finalizar; `beginTurn` idempotente y sin avances externos; tokens de grupos/recursos se rellenan hasta uno; eliminación al completar turno.
- Draw/exchange/extra-draw: flags y pagos son transaccionales; un mazo vacío no consume el turno ni devuelve pagos parcialmente aplicados.
- `endTurn`: rechaza gameover, fase incorrecta, turno ya cerrado y ataque pendiente; cuenta mano más `exposedPlots`; evalúa eliminación y victoria antes de avanzar.
- `checkVictory`: bloquea victorias durante la primera ronda completa y evita registros posteriores a `gameover`.
- Ataques: `declareAttack` valida atacante, objetivo neutral/tablero/mano, immune, flecha y propietario antes de gastar token; nombres de objetivo son seguros.
- `addSupport` rechaza autodefensa sin nodo de tablero; `addBoost` solo acepta efectos boost reales y del dueño del ataque; `computeStrength` evita nulls, mano/neutral sin `positionBonus`, condición muerta y suma defensa.
- `moveGroup` ahora exige propiedad del grupo y del destino, rechaza mover un nodo dentro de sí mismo y cobra al jugador correcto; antes podía mover grupos rivales.
- Se añadió `test_p0_invariants.js` con diez grupos de regresión estrictos, incluida la autorización de `moveGroup` y la prevención de ciclos.

### Evidencia de verificación

- `node --check game/js/engine.js`: exit 0.
- `test_p0_invariants.js`: exit 0, `P0 REGRESSION TESTS PASSED`.
- `test_engine.js`, `test_ai_vs_ai.js`, `test_appflow.js`, `test_flow.js`, `test_respond.js` y `test_ui.js`: exit 0 en la suite filtrada posterior a los cambios.
- `test_ai_vs_ai.js` ahora usa el ciclo de vida del motor y falla si la IA deja ataques pendientes; sigue siendo un smoke de IA heurística, no una prueba de reglas completas.

### Límites explícitos de este lote

- No se corrigió la familia de 35 recursos genéricos ni los 18 efectos Illuminati especiales.
- No se implementaron todavía captura de recursos ligados, `moveGroup` autorizado, semántica canónica de ataques a mano, `instantAttack`, UFO goal, immunity/Privilege/secrecy ni todos los efectos de Plot.
- La UI, i18n, accesibilidad y CSS tienen un primer lote de correcciones; aún quedan problemas de legalidad, feedback, generadores y auditoría de datos.

## 12. Registro de auditoría

- No se usaron agentes, skills, tasks ni delegaciones.
- Se preservó el cambio preexistente de `.opencode/goals/state.json.lock/owner.json`.
- Se restauró `SINERGIAS.md` a HEAD después de que una auditoría lo modificara accidentalmente.
- La primera escritura de este documento falló por truncamiento de transporte; esta versión se escribió en una operación pequeña y puede completarse por secciones.

## 13. Segundo lote — UX, accesibilidad y gates de calidad (ejecutado)

### Cambios de producto

- `game/js/ui.js`: los overlays de prompt, transición, final, tutorial, ayuda y setup tienen semántica de diálogo cuando el navegador la soporta; Escape, backdrop, foco inicial y limpieza de listeners. Los objetivos de tablero y slots son operables con Enter/Espacio; las cartas de mano y la selección de Illuminati son botones nativos con `aria-label`/`aria-pressed`.
- El setup ya no usa `alert` para validaciones: muestra un error visible en una región `role=status`; la selección de Illuminati muestra detalle al enfocar y no pierde la semántica de botón.
- El ataque ya no convierte cualquier Plot en +10 desde la UI: solo llama al boost si el efecto es `boost10` o `boost10_attack`; en otro caso explica por qué no es aplicable.
- `game/css/style.css`: foco visible para teclado, estilos de error de setup, botones de mano/selección sin estilos de layout superfluos y `prefers-reduced-motion` para desactivar animaciones y transiciones.
- `game/index.html`: título UTF-8 corregido, se eliminó la dependencia externa de Google Fonts, se añadió descripción/landmarks/aria-label y se centralizó la versión de caché en `v=38`.
- `game/js/i18n.js`: español por defecto coherente con `lang=es`, `document.documentElement.lang` se actualiza al cambiar idioma y se eliminó el barrido cada 600 ms; la traducción se dispara en renders y overlays explícitos.

### Cambios del pipeline

- `package.json` ya no contiene el script placeholder que siempre falla: `npm test` ejecuta una suite real y `test:p0`/`audit:mechanics` son comandos explícitos.
- `scripts/run_tests.cjs` ejecuta los siete tests, propaga stdout/stderr y devuelve failure si cualquier proceso termina con error o timeout.
- `scripts/audit_mechanics.cjs` dejó de tragar errores: carga AI, valida las muestras 2d6 en rango, registra excepciones, detecta NaN y devuelve exit code 1 ante fallos. Reporta por separado las familias todavía no manejadas.
- La corrida posterior al cambio de gates terminó con `ALL TESTS PASSED (7)`; `audit:mechanics` terminó con 0 errores, 0 NaN y 0 rolls inválidos, aunque mantiene visibles `resource_generic` e `illu_special` como backlog.
- Smoke real con Chrome headless y `file://`: exit 0; el DOM resultante contiene el título UTF-8, `setupOv`, `role=dialog`, botones `.pickCard` y la versión `v=38`, sin cargar Google Fonts.
- `node --check` pasó para engine, UI, i18n y los dos scripts nuevos; `git diff --check` no encontró whitespace errors. El servidor LSP de TypeScript no está instalado y la instalación fue rechazada anteriormente; queda como limitación de verificación, no como fallo del código.

### Límites que siguen abiertos

- La prueba real de Chrome ya cubre setup, tutorial, Escape y colocación por teclado; aún no cubre todos los flujos multi-humanos ni responsive visual exhaustivo.
- La traducción sigue siendo un diccionario exacto: las cadenas nuevas deben registrarse o marcarse como no traducidas; ya no hay polling de rescate.
- La captura de recursos ligados, semántica canónica de ataques a mano, `instantAttack`, UFO, privilege/immunity/secrecy, 321 Plots genéricos, 35 recursos genéricos y 18 Illuminati especiales siguen pendientes.
- Los generadores siguen teniendo fuentes concorrentes; los comandos de datos ahora reportan y fallan ante la deuda, pero no reparan las discrepancias.
- El smoke usa `file://` y no carga Google Fonts; aún falta una prueba explícita con red bloqueada y un servidor local.

## 14. Registro de auditoría

- No se usaron agentes, skills, tasks ni delegaciones.
- Se preservó el cambio preexistente de `.opencode/goals/state.json.lock/owner.json`.
- Se restauró `SINERGIAS.md` a HEAD después de que una auditoría lo modificara accidentalmente.
- La primera escritura de este documento falló por truncamiento de transporte; esta versión se escribió en una operación pequeña y puede completarse por secciones.

## 15. Cierre de esta iteración

- `shareAlign` dejó de ser un retorno muerto; `findNode` eliminó un loop neutral sin efecto; `moveGroup` quedó autorizado y con test de ciclo.
- `test_ai_vs_ai.js` dejó de forzar `beginTurn`, ya no llama `checkVictory` manualmente y falla si una IA-vs-IA deja un ataque abierto.
- Los chips con UID son botones; el panel de ataque solo ofrece Resolve al atacante/defensor humano; el texto de setup, tutorial y hint ya no afirma que todas las partidas usan 12 grupos.
- `README.md` ahora declara que es un prototipo jugable, no una implementación completa; corrige el conteo OCR, delimita la IA y enlaza el runner/auditoría.
- La verificación final tuvo `npm test` = 7/7, `node --check` = todos los JS cambiados y el fixture `scripts/browser_smoke.html` = pass en Chrome headless.

## 16. Pipeline y gates finales

- `scripts/audit_stats.cjs` ahora carga datos con rutas relativas, registra OCR/CMU/nulls en `research/audit_reports/stats.txt` y devuelve código 1 mientras existan discrepancias; `--report-only` permite consultar el informe sin convertir la deuda en error de proceso.
- `scripts/audit_usage.cjs` ejecuta 8 partidas AI-vs-AI con el ciclo real del motor, no llama `beginTurn` manualmente, no captura excepciones y escribe `research/audit_reports/usage.md`; la corrida actual terminó 8/8 sin errores.
- `scripts/audit_syn.cjs` no muta `SINERGIAS.md`, separa presencia de tokens de comportamiento implementado y falla por `plot_generic`, `resource_generic` e `illu_special`; el informe queda en `research/audit_reports/synergies.md`.
- `scripts/diag_attack.cjs` ahora intercepta previews reales, no traga excepciones y要求 al menos un ataque inspeccionado.
- `package.json` expone `audit:mechanics`, `audit:stats`, `audit:usage`, `audit:syn`, `diag:attack` y variantes `*:report`.
- Los gates predeterminados de mechanics/stats/syn devuelven exit 1 de forma intentional porque la deuda de datos sigue abierta; los modos `*:report` devuelven 0 tras completar la ejecución. Esto evita el falso “quality gate OK”.

### Pendiente para la siguiente iteración

- Convertir los 321 Plots genéricos, 35 recursos genéricos y 18 efectos Illuminati en efectos data-driven con fixtures; no activar cartas hasta que su semántica esté canónica.
- Resolver las decisiones de reglas de `SPEC-RULES.md` antes de tocar captura de recursos, hand-target, `instantAttack`, immunity, Privilege, secrecy y UFO.
- Unificar `gen_cards.js` y `build_cards.js`, corregir las 27 discrepancias CMU y completar los 138/140 valores null de Power/Resistance.
- Añadir una prueba de navegador con red bloqueada, responsive visual y todos los estados multi-humanos; LSP permanece no instalado por decisión previa del usuario.

## 17. Estado actual posterior a la auditoría de cartas

Las secciones anteriores son un registro histórico de la auditoría original. El estado vigente del proyecto es el siguiente:

- `gen_cards.js` es la fuente canónica y `npm run build:cards` regenera las 421 imágenes lógicas; `build_cards.js` solo es un wrapper de compatibilidad.
- El dataset conserva texto OCR como referencia, pero las cartas `unverified`/`ability_unverified` y las familias legacy genéricas se rechazan antes de gastar tokens o modificar la mano.
- `research/audit_reports/card_research_manifest.json` contiene 356 registros pendientes (138 Groups, 183 Plots, 35 Resources), con OCR para 353, metadatos oficiales para 326, 126 menciones en FAQ/errata y evidencia de estado por campo; `npm run research:cards` lo regenera sin promover OCR a reglas.
- Los informes de mecánicas, estadísticas, uso y sinerías distinguen el estado de verificación; los gates predeterminados fallan cuando queda deuda, mientras que los modos de informe son consultables.
- La suite vigente incluye regresiones P0 para rechazo fail-fast de Plots y Resources, smoke headless, AI-vs-AI, flujos de interfaz y validación del manifest de investigación; las reglas y estadísticas no canónicas siguen pendientes de una fuente de mesa verificable.
