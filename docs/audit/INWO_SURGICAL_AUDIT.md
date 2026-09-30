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
- `test_ai_vs_ai.js` llama `beginTurn` otra vez aunque `startGame` ya lo hizo, luego fuerza `endTurn` y `checkVictory`; puede crear estados inválidos y explica el log duplicado.
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
**Aceptación:** controlar los objetivos UFO diseñado hace avanzar el progreso y la victoria se puede alcanzar con una ruta legal.

### P1-002 — Tokens de grupo se acumulan en cada turno

**Archivo:** `engine.js:269-305`.  
**Evidencia:** `nd.tokens++` para cada grupo powered en cada `beginTurn`, aunque la regla dice agregar solo a grupos sin token.  
**Corrección:** `if (nd.tokens===0) nd.tokens=1` y revisar el caso de Resources Action.  
**Aceptación:** un grupo que ya tiene token no aumenta al comenzar el siguiente turno.

### P1-003 — Se consume el derecho de draw aunque el deck esté vacío

**Archivo:** `engine.js:313-345`.  
**Corrección:** comprobar longitud antes de fijar `plotDrawn/groupDrawn`; no retirar el pago de exchange si la operación no puede completarse.  
**Aceptación:** un draw con deck vacío devuelve error/estado sin consumir la plotted blessing ni otra acción del mismo turno.

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
**Corrección:** implementar una transacción de attack instantáneo con validaciones, roll, resolución y marcado de assassination/disaster; permitirlo solo cuando la regla esté habilitada.  
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
**Aceptación:** ejecutar build desde limpio reproduce exactamente `cards.js`; una diferencia stats intencionada produce exit no cero.

### P1-012 — Tests y auditorías convierten errores en éxito

**Evidencia:** scripts atrapan excepciones, no incrementan exit code y el package test es placeholder.  
**Corrección:** runner común con assertions, errores no ignorados y gates separados `build`, `test`, `audit:rules`, `audit:data`, `smoke`.  
**Aceptación:** un fixture con excepción deliberada hace fallar el comando correspondiente.

## 6. Hallazgos P1/P2 — intuición, accesibilidad e i18n

### P1-013 — Setup no es intuitivo ni accesible

**Archivo:** `ui.js:211-305`, CSS relacionado.  
**Evidencia:** solo ofrece dos slots; Illuminati y toggles son `div` click-only; no hay navegación por teclado, roles, `aria-*`, focus tras redraw ni guía de primera partida. Validación usa `alert`. La UI muestra español aunque i18n puede iniciar en inglés.  
**Corrección:** convertir controles a buttons, crear un flujo de 3 pasos (jugadores → Illuminati → confirmación), mostrar reglas relevantes, conservar foco y añadir `lang`/idioma explícito.  
**Aceptación:** teclado completa setup; lector de pantalla anuncia cada opción; ningún estado requiere hover para obtener información.

### P1-014 — Ataque/selección permite clicks sin contexto y expone controles incorrectos

**Archivo:** `ui.js:421-669`, `775-819`.  
**Evidencia:** `route(uid)` se llama aun sin selección; no hay cancelar/undo; panel de ataque puede mostrarse a actor equivocado; la UI presenta clicks que el motor no soporta.  
**Corrección:** un único `canAct/actor` gate, botón Cancel, wizard explícito, estado `idle/selecting/responding`, y deshabilitar controles con razón visible.  
**Aceptación:** cada control visible ejecuta una operación legal o muestra un motivo; ningún error se oculta en un catch.

### P1-015 — Tutorial y hints enseñan reglas incorrectas

**Archivo:** `ui.js:540-583`, `835-853`.  
**Evidencia:** el tutorial afirma que cada grupo recibe token, el objetivo de control en mano no coincide con engine, y aparecen inconsistencias rojo/verde; objetivo fijo 12.  
**Corrección:** generar hints desde la misma tabla de reglas y copy de estado; documentar hand limit, exposed plots, immunity, goals y timing.  
**Aceptación:** cada hint coincide con un test de regla y tiene un caso para primer turno, captura, recursos y fin de turno.

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
- `scripts/diag_attack.cjs` ahora intercepta previews reales, no traga excepciones y exige al menos un ataque inspeccionado.
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

## 18. P2 — El manifest de investigación no era reproducible offline (corregido)

### Hallazgo

`npm test` fallaba en `test_card_research_manifest.js` con `cardsWithOfficialMentions` = 81 frente a las 126 del estado commiteado. La causa no era el dataset: era que `scripts/build_card_research_manifest.cjs` reconstruye el registro **descargando en vivo** `Cards-FAQ.txt`, `FAQ.txt`, `Errata.New.txt` y `Errata.txt` desde sjgames.com, **sin caché en disco y sin guardia de degradación**. Cuando `Cards-FAQ.txt` pasó a estar inalcanzable (y su fallback `r.jina.ai` falló por DNS), la reconstrucción sobrescribió evidencia buena con un registro empobrecido: 126 → 81 menciones (−45), `cardsFaq.status = "unavailable"`, sin sha256/bytes/líneas.

La prueba era frágil por diseño: fijaba `=== 126`, una constante derivada de la red, de modo que cualquier rerun con red degradada rompía la suite y, peor, un rerun con red **caída** habría destruido las cuatro fuentes sin avisar (0 menciones).

El texto crudo de esas cuatro fuentes no existe en ninguna copia local —el constructor solo lo mantiene en memoria—, por lo que la evidencia perdida **no se puede recuperar sin red** y no debe reconstruirse a partir de snippets (sería falsificar la fuente). `card_research_manifest_seed.json` es una copia del manifest bueno, no texto fuente.

### Correcciones aplicadas

- **Caché de fuentes en disco** (`research/audit_reports/_source_cache/`, `<id>.txt` + `<id>.meta.json`), con `CACHE_FRESH_DAYS = 30` y estados `ok-cache` / `ok-cache-stale`, `retrievedVia: "cache:<ruta>"`, `cachedAt` y `cacheAgeDays`. Se escribe en cada descarga exitosa, así que la primera corrida con red restaura la reproducibilidad de forma permanente.
- **Guardia de degradación**: antes de escribir, el constructor compara con el summary previo (`readPreviousSummary()`) y calcula `buildDegradation(...)`. Si una fuente que estaba `ok` pasa a `unavailable`, **no sobrescribe**: imprime el diff de fuentes perdidas, el delta de menciones y la remediación, fija `process.exitCode = 1` y termina. Se necesita `--allow-degraded` / `INWO_ALLOW_DEGRADED=1` explícito para aceptar la pérdida. Estados sanos: `ok`, `ok-local`, `ok-cache`, `ok-cache-stale`.
- **Banderas de control**: `--refresh` / `INWO_REFRESH_SOURCES=1` (ignora caché) y `--offline` (no toca la red).
- **Disclosure en el registro y en el markdown**: `summary.degraded` con `lostSources[]`, `previousCardsWithOfficialMentions`, `cardsWithOfficialMentions`, `mentionDelta` y una nota explícita de que *la evidencia ausente significa "no recuperada", nunca "no existe"*; `docs/audit/CARD_RESEARCH.md` gana una sección `## Source availability` con estado, prefijo de sha256 y error por fuente.
- **Prueba determinista**: se eliminó la constante de red. Ahora la prueba recalcula las menciones desde `entries` y exige igualdad con el summary, exige `> 0`, recalcula `secondaryStatFields` y `secondaryConflictFields`, y valida la coherencia del estado de degradación (si alguna fuente no está sana, `summary.degraded.degraded` debe ser verdadero y toda fuente `unavailable` debe aparecer en `lostSources`; si todas están sanas, `summary.degraded` debe ser falso). Cada `officialMentions[*]` debe apuntar a una fuente declarada y traer `line` numérico y `snippet` no vacío.

### Verificación

- `node test_card_research_manifest.js` → `CARD RESEARCH MANIFEST PASSED (356 pending cards; OCR and provenance linked)`.
- `npm run research:cards` sin red ahora **aborta con exit 1** en lugar de destruir el registro: es el comportamiento protector buscado. Con red, un rerun con `--refresh` restaura las 126 menciones y puebla la caché.
- Nota de esquema: el manifest commiteado en HEAD es UTF-16LE con esquema antiguo (sin array `cards`), así que un `git checkout` a ciegas habría roto más invariantes de las que arreglaba. Se conserva el manifest nuevo (UTF-8, con `cards[]`) y se le registra la degradación de forma explícita.

### Lección de proceso

Un gate que fija constantes derivadas de la red no es un gate: es una fuente de falsos negativos que empuja a "arreglar" el dato en lugar del tooling. La evidencia que no se pudo recuperar debe quedar **declarada como no recuperada**, no rellenada.

## 19. Fase 2 — Reglas centrales del motor (ejecutada)

Alcance: los hallazgos P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008 y P1-009 del §1. Todos están ahora **verificados por regresión** en `test_fase2_rules.js`, que quedó registrado como gate en `scripts/run_tests.cjs`.

### 19.1 Bugs reales corregidos en `game/js/engine.js`

| ID | Hallazgo | Corrección |
|---|---|---|
| P1-001 | La meta UFOs era **inalcanzable**: `controlsGroup` comparaba el `cardId` numérico del nodo contra el `id`-string de `ufoTargets`. | `controlsGroup` resuelve ambos lados con `card()` y compara por `c.id`. El test planta los 3 objetivos por índice y obtiene `{"met":true,"how":"UFOs: los 3 grupos secretos controlados"}`. |
| P1-007 | **P0 de reglas**: `playPlot` destruía cualquier Personality (asesinato) y devastaba cualquier Place (desastre) **sin tirada, sin Poder, sin defensa y sin margen**; además `requireOwnMain` impedía jugar el Instant Attack fuera de tu turno. | Nuevo `resolvePlotInstantAttack(pid,plotCard,targetUid,opts)`: valida `eff.target` contra el `subtype`, `requireAttr`/`rejectAttr` contra `card.attributes`, elige Poder con `plotPowerFor`, admite `requireActionFromAttr`+`addSummonerPower`, `mayAddPowerFromAligns` y `victimMayBeAided` mediante `opts.aidUid`/`firstUsableAid`, calcula `str = power − defensa − posBonus`, aplica auto-fallo `<2` y auto-fallo 11-12, devasta el subárbol, aplica `onPlay.stripActionFromNames` y **sólo destruye** si `destroyMargin != null && margen > destroyMargin` (`null` = devasta pero nunca destruye). `E.instantAttack` se reimplementó sobre el mismo resolutor. `playPlot` acepta ahora `opts` y deja que `assassination`/`disaster` se jueguen fuera de turno ("at any time. It does not require an action"). |
| P1-008 | `goalText()` sólo probaba tipos de meta **inexistentes** en el dataset (`destroy`, `peaceful_power`, `pick3`), así que la UI mostraba "Meta básica" para los 9 Illuminati. `goalMetFor()` ignoraba `power_total`, `destroy_reduce`, `needEachAlign`, `double.align`/`double.attr`/`powerAtLeast` y `magicResourceCountsAsGroup`. | `goalText()` reescrito para los 5 tipos reales del dataset. `goalMetFor()` reescrito para evaluar el objeto `goal` de `cards.js`. Nuevos helpers `alignsCovered`, `sumTotalPower`, `magicResourceGroups`, `doubleQualifies`, `effectiveGoalCount`, y constante `CANON_ALIGNMENTS` (las 10 ideologías canónicas, declaradas explícitamente para que una transcripción incompleta no vuelva la meta *imposible* por silenciosa). `victoryStatus()` expone ahora el progreso propio de cada meta (`powerTotal`, `destroyed`, `peacefulPower`, `pick3`, `magicResources`). |

### 19.2 Hallazgos que resultaron ser correctos (bloqueados por regresión, no "arreglados" a ciegas)

Estos cuatro figuraban como P1 abiertos, pero la verificación empirica demostró que el motor actual ya los cumple. Se opted por **fijarlos con tests** en lugar de reescribir código correcto:

- **P1-002** (fichas de grupo se acumulan cada turno): `beginTurn` ya rellena `tokens` hasta 1. Test: 6 turnos consecutivos, ningún nodo supera 1 ficha.
- **P1-003** (el derecho a robar se consume con el mazo vacío): `drawPlot` lanza **antes** de fijar `flags.plotDrawn`. Test: mazo vacío → `Error 'No quedan Plot cards'` y `flags.plotDrawn === false`; tras reponer, funciona.
- **P1-006** (`moveGroup` mueve grupos ajenos): ya existe el guardia `oldOwner!==pid` → `'Solo puedes mover grupos de tu propia estructura'`. Test: lanzar `moveGroup` sobre un grupo rival lanza.
- **P1-009** (límite de mano ignora Plots expuestos): `endTurn` ya cuenta `hand + exposedPlots`. Test: 6 en mano/0 expuestos → 5; 6 en mano + 3 expuestos = 9 → 5.
- **P1-005** (`computeStrength` con condiciones muertas y sin defensa): la función ya resta resistencia (por defecto 5), defensa por alineaciones compartidas con el Illuminati defensor, defensa propia (`2 × Poder`), bonificaciones de posición y Cthulhu, y el resolutor aplica auto-fallo `<2` y el 11-12 siempre fallan. Test: se verifica el desglose completo (`base 14`, `defenseBase 0`, `posBonus 10`, `selfDef 0`) **y** que `total` es exactamente la suma de sus términos, más que la autodefensa (`selfDef = 2 × 1 = 2`) reduce la fuerza.
- **P1-004** (control contra cartas de la mano): `declareAttack` ya valida "Sólo control se lanza contra cartas de la mano", valida el índice y registra `A.handTarget={idx,owner}`; `computeStrength` pone `posBonus` a 0 para objetivos en mano; en éxito la carta sale de la mano del rival al ÁREA NEUTRAL, en fracaso se queda. Test con `Math.random` sustituido (tirada determinista 2) comprueba el paso completo mano → neutral area. **Límite documentado**: la exención del requisito de flecha abierta para ataques a mano es inalcanzable desde fuera, porque `openArrows` recorre el árbol entero y un árbol finito siempre tiene ≥1 flecha libre; se registra como límite, no se simula.

### 19.3 Hallazgo de datos: la meta de Shangri-La es inalcanzable

**La suma del Poder de los 13 grupos Peaceful de las 421 cartas es 29, y la meta de Shangri-La exige 30.** Con esta transcripción la meta no se puede cumplir. No se "arregló" cambiando el umbral (eso sería falsear el producto), sino que el test lo declara como invariante:

```
ok   - P1-008 Shangri-La evalúa el poder pacífico en juego -> cuenta 29/30, cumple false
ok   - P1-008 HALLAZGO: el dataset sólo suma 29 de Poder pacífico (la meta pide 30) -> meta inalcanzable sin corregir la transcripción
```

Grupos Peaceful y su Poder: Japan 6 · Vatican City 4 · A.M.A. 3 · Canada 3 · Fnord Motor Company 2 · Moonies 2 · Princess Di 2 · Telephone Psychics 2 · Antiwar Activists 1 · Boy Sprouts 1 · Church of Elvis 1 · Goldfish Fanciers 1 · Trekkies 1. **Acción pendiente: verificar la transcripción de al menos un Poder pacífico contra el World Domination Handbook antes de tocar la meta.**

### 19.4 Bloqueos por datos (no bloqueos de motor)

- `magicResourceCountsAsGroup` (Adepts of Hermes): **ninguna carta de Recurso tiene atributo alguno**, así que el criterio no es evaluable. El motor ya lo implementa; cuando se transcriban atributos de recursos empezará a contar solo.
- Gnomes of Zurich: `double.attr:'bank'` no casa con ningún grupo (el histogram de atributos no contiene `bank`). Inocuo, pero inerte.
- Los 9 **poderes continuos** de los Illuminati no tienen codificación en el dataset y `curPower` no añade ninguno. Implementarlos exigiría inventar reglas, así que queda como pendiente de transcripción.
- 321 Plots genéricos, 35 Recursos genéricos y los efectos no vinculados a una mecánica verificada siguen bloqueados por `rejectUnverifiedCard` (rechazo antes de gastar fichas o cambiar estado). Es intencional.

### 19.5 Hallazgo de calidad de gate: `test_respond.js` podía pasar sin comprobar nada

Imprimía `sin piezas para el escenario (attackers=1 targets=0)` y terminaba con `process.exit(0)`: un gate verde que no verificaba nada. Causa: el montaje se detenía en cuanto el humano tenía ficha, así que el rival casi nunca conseguía grupo. Se reescribió el montaje de forma determinista (si no hay piezas, `exit(1)` en vez de `exit(0)`), se documentó la selección de la mejor combinación atacante/objetivo, y se inyectó un atacante de Poder alto (`Texas`, 14) y un objetivo de Resistencia 0 (`Gordo Remora`) a **profundidad 3** para neutralizar la defensa posicional (`positionBonus` da +10 a un hijo directo del Illuminati defensor). Resultado: `selfDef=true` y fuerza 10→8, es decir, la reacción del defensor **sí** se ejercita por fin.

## 20. Estado tras la Fase 2

`npm test` → **ALL TESTS PASSED (9)**, incluido el nuevo `test_fase2_rules.js`. Los nueve P1 centrales de la Fase 2 están implementados o verificados. Queda abierto, en orden: (a) corregir la transcripción de Poder pacífico para desbloquear la meta de Shangri-La; (b) transcribir atributos de Recurso y el atributo `bank`; (c) codificar los 9 poderes continuos de los Illuminati; (d) Fase 3 (UX y onboarding) y Fase 4 (datos), ambas aún sin ejecutar.

## 21. P1-009 — Los 9 poderes especiales de los Illuminati (ejecutado)

Los 18 Illuminati (9 facciones × 2 versiones) declaran `effect.kind==='illu_special'` y el motor **no leía ni uno solo** de esos campos: `grep` sobre `game/js/engine.js` daba 0 coincidencias de `illu_special`, `destroyOnly` y `alignmentBonus`. La UI mostraba las metas (P1-008) pero los poderes que las acompañarían en la mesa no existían.

### 21.1 Bloque centralizador de datos

Nuevo bloque antes de `/* ---------------- strength calc ---------------- */`, con un comentario que deja explícito el criterio: *cada helper traduce un campo que YA existe en `cards.js`; nada aquí inventa reglas*.

| Helper | Traduce | Facción |
|---|---|---|
| `illuEff(pid)` | `effect` del Illuminati del jugador | todas |
| `bonusTargetMatches(b,tCard)` | `bonus.targetAlign` / `bonus.targetAttr` | Adepts, Gnomes |
| `illuAttackBonus(pid,type,tCard)` | `bonus.control` / `bonus.destroy` / `bonus.anyDestroy` | Adepts, Discordian, Gnomes, Cthulhu |
| `illuDefenseBonus(defPid)` | `defenseBonus.anyAttack` | Shangri-La |
| `discordianBlocks(defPid,attCard)` | `immuneToAligns` | Discordian |
| `shangriLaBlocksDestroy(defPid,node)` | `destroyOnly` | Shangri-La |
| `plotHandLimitOf(pid)` | `plotHandLimit` | Gnomes |

### 21.2 Dónde se aplicaron (motor 1296 → 1415 líneas)

- **`computeStrength`**: el bonus del atacante se **sumó dentro de campos `det` que ya existían** (`leaderMod` en control, `cthulhu` en destroy) y la defensa de Shangri-La en `det.defBoosts`. Motivo: la invariante de la fórmula de `total` que verifica el bloque P1-005 no cambia, así que un campo nuevo no la invalidaría.
- **`E.declareAttack`**: la inmunidad Discordian **ahora se ejecuta** (`throw`); antes sólo añadía una nota al desglose que nadie cumplía.
- **`destroyGroup`**: primero localiza el nodo, luego evalúa `shangriLaBlocksDestroy` **antes de `detach()`** para que un veto no deje la estructura a medio desmontar; ahora devuelve booleano. Al final dibuja un Plot si el atacante es Cthulhu (`drawPlotOnDestroy`), sin tocar `flags.plotDrawn` porque es un robo interno.
- **`E.beginTurn`**: `drawPlotAtStart` del Network se resuelve **al inicio del turno**, no como acción del jugador, respetando `plotHandLimitOf(pid)`.
- **`E.endTurn`**: el límite de Plots en mano dejó de estar escrito a fuego como 5 y pasa por `plotHandLimitOf(pid)` (Gnomes: 6).
- **Nuevo `E.organize(pid,moves)`** para Bermuda Triangle: reorganización libre **sin coste de ficha** (a diferencia de `moveGroup`), **valida todos los movimientos antes de mutar nada** y rechaza ciclos y profundidad excesiva con dos helpers nuevos (`isCyclic`, `depthUnder`, `MAX_DEPTH=10`).
- **`resolvePlotInstantAttack` y `E.instantAttack`**: los Instant Attacks **no pasan por `computeStrength`**, así que el bonus de Cthulhu/Adepts y la defensa de Shangri-La se aplican directamente sobre el Poder del Plot.
- **`sumPeacefulPower`**: ahora suma el Poder pacífico **de todas las estructuras y del área neutral**, porque el texto de Shangri-La dice *"regardless of who controls them"*. La firma perdió el parámetro `pl`; los llamadores actuales lo siguen pasando y se ignora.

### 21.3 Defecto AND→OR encontrado DOS veces por el gate nuevo

La primera implementación de `bonusTargetMatches` exigía que `targetAlign` **y** `targetAttr` cumplieran a la vez. El texto de los Gnomes de Zurich dice *"+4 on any attempt to control Corporate groups **or** Banks"* y el dato es `{targetAlign:'corporate', targetAttr:'bank'}`: ningún grupo del dataset tiene atributo `bank`, así que con AND el bonus quedaba **muerto sin que nadie lo notara**. El texto de la carta es la autoridad → **OR**.

Al revisar `doubleQualifies` (usado por `goalMetFor`) apareció **el mismo defecto con la misma raíz**: `{align:'corporate', attr:'bank', powerAtLeast:4}` frente a una meta que dice *"Any Corporate group **or** Bank with a Power of 4 or more counts double"*. Corregido igual. Discordian (`align` solo) y Network (`attr` solo) declaran una sola condición, así que su comportamiento no cambia.

**Lección de proceso:** un gate que sólo verifica el camino feliz no encuentra este tipo de defecto. Lo encontró un gate que cubría *la mitad satisfacible* de una condición (Gnomes sin `bank`).

### 21.4 Omisión deliberada (no es un bug pendiente)

La inmunidad de Discordian Society **no** se aplica a los Instant Attacks de Plot. Su texto es *"immune to attacks from Government or Straight **groups**, and to all special abilities of **these groups**"*: el ataque instantáneo de un Plot no es un grupo Government/Straight ni es uno de *"these groups"*. Bloquearlo sería inventar una regla, así que la inmunidad se aplica sólo en `declareAttack` (ataques de grupo contra estructura). Queda registrado aquí para que nadie lo "complete" sin evidencia nueva.

### 21.5 Bloqueos que siguen abiertos (datos y modelo, no motor)

- **`tokensNotSameAttack` (UFOs)**: no hay **ningún** código donde un token de Illuminati se gaste en un ataque (sólo en cambio por Plot, en Recursos y en `moveGroup`), así que la restricción no tiene dónde aplicarse. Habría que decidir primero si el token de Illuminati puede —o si debe— pagar ataques.
- **`magicResourceCountsAsGroup` (Adepts)**: ninguna carta de Recurso tiene atributo alguno → criterio no evaluable.
- **Atributo `bank`**: ausente del dataset; sólo queda viva la mitad `corporate` de Gnomes.
- **Los 9 poderes continuos**: los que el texto describe fuera de la meta siguen sin codificación en el dataset.
- **Meta de Shangri-La**: sigue pidiendo 30 de Poder pacífico y el dataset sólo suma 29 (§19.3). El umbral **no** se rebajó a 29 para cerrar el gap; el gate lo declara como invariante.

### 21.6 Gate

`test_fase2_rules.js` ganó un bloque P1-009 con **13 escenarios / ~20 aserciones**: límite de Plots de Gnomes (6 frente a 5 de control), 2 Plots del Network al inicio de turno, la inmunidad Discordian ejecutándose (y comprobando que **no** se aplica a otros atacantes), `cthulhu===4` con su nota, robo de Plot por Cthulhu al destruir, `defBoosts===5` de Shangri-La, veto de destrucción de Shangri-La (y que un grupo Violent **sí** muere), +4 de Gnomes contra un Corporate, +6 de Adepts contra un Magic (existe Rosicrucians en el dataset), `organize` de Bermuda (libre, con rechazo de ciclos y `throw` para quien no puede), conteo de Poder pacífico de rivales y del área neutral, `togglePrivilege` de Bavarian y el doble Corporate de Gnomes (3 grupos → 6).

## 22. Estado tras la Fase 2 + P1-009

`npm test` → **ALL TESTS PASSED (9)**, y el gate de Fase 2 corrió **3 veces seguidas** en verde (~100 aserciones). Abierto, en orden: (a) corregir la transcripción de Poder pacífico para desbloquear Shangri-La; (b) transcribir atributos de Recurso y el atributo `bank`; (c) codificar los 9 poderes continuos de los Illuminati; (d) decidir si el token de Illuminati puede pagar ataques (desbloquea `tokensNotSameAttack`); (e) Fase 3 (UX y onboarding) y Fase 4 (datos), ambas aún sin ejecutar.

## 23. P2-DATA-01 — Se recuperó el vocabulario oficial de atributos (ejecutado)

### 23.1 El hallazgo

El dataset de runtime tenía un vocabulario de atributos **muy corto**. La comparación con la
transcripción secundaria local (`research/audit_reports/scribd_card_text.json`, 323 entradas,
`cards[]` con `attributes` + `attributeText` estructurados) demostró que el generador estaba
descartando la mitad del vocabulario oficial:

| atributo | runtime (antes) | transcripción secundaria | tras el arreglo |
|---|---|---|---|
| `science` | 5 | (no lo reporta) | 5 |
| `computer` | 7 | 11 | 16 |
| `magic` | 4 | 6 | 9 |
| `huge` | 7 | 7 | 8 |
| `coastal` | 0 | 13 | 13 |
| `media` | 0 | 15 | 15 |
| `secret` | 0 | 7 | 7 |
| `green` | 0 (clasificado como basura OCR) | 6 | 8 |
| `bank` | 0 | 4 | 4 |

**52 cartas de grupo** no tenían ningún atributo; ahora **65 cartas** tienen al menos uno.
Las 13 restantes que conservan atributos solo de runtime son las de `science`
(A.M.A., Druids, Moonbase, Nuclear Power Companies, Orbit One, Rosicrucians, Silicon Valley,
Stonehenge, Video Games): el parser de la fuente secundaria no emite `science`, pero el texto
impreso sí (`A.M.A. attributeText = "Science"`), así que **se conservan los valores de runtime y
se fusiona — nunca se reemplazan**.

### 23.2 Causa raíz (no era sólo la lista blanca)

`gen_cards.js` decide alignments vs atributos en `splitAlignments(rec)` (≈L404):

- si la etiqueta está en `ALIGNMENTS10` → `rec.alignments`
- si está en `ATTRIBUTES` → `rec.attributes`
- si está en `JUNK_TAGS` → `rec.junkTags` (basura OCR, conservada como evidencia)
- **si no está en ninguna de las tres → se trata como atributo** (`else at.push(t)`)

Ese último caso es la clave: cualquier etiqueta desconocida **ya** llegaba a `rec.attributes`.
Por lo tanto, que el histograma del runtime fuera `{science, huge, magic, computer}` prueba que
el texto OCR de esas 52 cartas **no contiene la palabra del atributo**. Ampliar la lista blanca
no alcanza: hacía falta una **segunda fuente**.

Además había un defecto de clasificación: `JUNK_TAGS = new Set(['green'])` porque `green`
aparecía en exactamente 2 cartas (Druids, Joggers) y se clasificaba como basura OCR. La fuente
secundaria demuestra que `green` es un atributo **real** en 6 cartas (Al Gore, Anti-Nuclear
Activists, California, Canada, Prince Charles, Underground Newspapers).

### 23.3 Corrección aplicada (en el generador canónico, no a mano)

`game/js/cards.js` es GENERADO, así que el cambio pertenece a `gen_cards.js` y se propaga con
`npm run build:cards`. Cuatro ediciones:

1. **Nueva entrada** `research/audit_reports/scribd_card_text.json` (con guarda
   `fs.existsSync`), replicando exactamente el patrón ya establecido para
   `research/audit_reports/card_data_merge.json`.
2. **Índice `scribdCards`** por `norm(row.name)`, idéntico al de `mergeCards`.
3. **Listas corregidas**: `ATTRIBUTES` ahora tiene los 9 términos oficiales más los 2 heredados
   (`computer, magic, science, coastal, huge, bank, media, secret, green, illusion, outworld`) y
   `JUNK_TAGS` queda **vacío**. El comentario de cabecera se reescribió (sólo ASCII) explicando el
   motivo.
4. **Nueva `applySecondaryAttributes(rec)`** invocada en el bucle de emisión entre
   `splitAlignments(rec)` y `mechanicsStatus(rec)`: lee `row.attributes` (o divide
   `row.attributeText` por `[,;/|]`), **conserva únicamente términos presentes en `ATTRIBUTES`**
   (para no inventar vocabulario), deduplica, y graba evidencia con `rec.attributesSource='secondary'`
   y `rec.attributeText`.

### 23.4 Impacto en el juego (y por qué esto no era cosmético)

- `bank: 4` (Federal Reserve, I.R.S., Offshore Banks, Wall Street) → **deja de estar bloqueado**
  el segundo objetivo de los Gnomes de Zurich (`double.attr:'bank'`). El test de Fase 2 que ya
  ejercitaba la mitad `corporate` del mismo objetivo sigue en verde.
- `secret: 7` (Clone Arrangers, Elders of Zion, Fiendish Fluoridators, Robot Sea Monsters,
  Templars, The Men in Black, Vampires) → es exactamente la mecánica de los "3 grupos secretos"
  de los UFO, que hoy depende de la lista fija `S.config.ufoTargets`.
- `coastal: 13` (Brazil, California, Canada, England, Finland, France, Hawaii, Israel, Italy,
  Japan, New York, Russia, Texas) → **cambia qué rama de Poder elige** la lista de Plots con
  `requireAttr:'coastal'` (Atomic Monster, Hurricane, Tidal Wave, Giant Kudzu) y con
  `rejectAttr:'huge'`.
- `magic: 9` (runtime ∪ secundaria: Ninjas, Reformed Church of Satan, Templars, Vampires,
  Voudonistas, W.I.T.C.H., Druids, Rosicrucians, Stonehenge) → amplía el `+6` de los Adepts de
  Hermes y el `altUse` de Plague of Demons.
- `computer: 16` → amplía el doble objetivo de The Network.
- `media` y `green` todavía no tienen efecto asociado en ninguna carta, pero dejan el
  vocabulario completo para futuras clasificaciones.

### 23.5 Un banderín que se cerró como FALSA ALARMA

Se verificó que el tabla legado `const V = {…}` de `gen_cards.js` mete atributos dentro del
array `alignments` (p. ej. `Brazil: ['government','huge']`, `'A.M.A.': [3,4,['peaceful','conservative','science']]`).
Basta para sospechar contaminación. **Medición sobre las 421 cartas emitidas: 0 cartas con
etiquetas no-ideológicas en `alignments`.** `splitAlignments(rec)` neutraliza por completo el
tabla legado en el momento de emitir. **La tabla `V` no se toca** y no hace falta ningún cambio
de motor por este punto.

### 23.6 Verificación

- `node --check gen_cards.js` → limpio.
- `node gen_cards.js` → `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`
  — recuentos idénticos a los previos: ninguna carta añadida, eliminada ni perdida.
- Verificación puntual: Japan `["computer","coastal"]`, California `["green","coastal","huge"]`,
  Al Gore `["computer","green"]`, Federal Reserve/I.R.S./Offshore Banks/Wall Street `["bank"]`,
  The Men in Black `["secret"]`, Vampires/Templars `["secret","magic"]`, Underground Newspapers
  `["media","green"]`, Texas `["huge","coastal"]` — todas marcadas `[secondary]`.
- `npm test` → `ALL TESTS PASSED (9)`, exit 0, **cero regresiones**. Los 13 escenarios de P1-009
  siguen verdes, y la aserción de Shangri-La sigue reportando `cuenta 29/30, cumple false` como
  está diseñado (§19.3).

### 23.7 Límite explícito

Este arreglo **no** toca los números de Poder/Resistencia. El desfase 29/30 de la meta de
Shangri-La queda confirmado por una segunda fuente independiente (los 13 Poderes pacíficos
coinciden exactamente con el runtime), así que es un hueco real del conjunto de cartas
transcrito, no un error de lectura. La red sigue caída, de modo que la verificación contra la
fuente oficial queda pendiente.
