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

## 24. P1-010 — La meta de los UFOs estaba mal leida, y el mazo SI tiene cartas Goal

### 24.1 El hallazgo

`S.config.ufoTargets` se llenaba en `E.startGame` con **3 grupos de Grupo cualesquiera, sorteados al azar**, y la condicion de victoria exigia controlar esos 3 grupos. Eso no lo dice ninguna fuente:

- Texto de la carta (`ufos1` / `ufos2`, identico en ambas versiones): *"The UFOs have two actions per turn — they get two tokens! These may not be used in the same attack. **GOAL: The UFOs can have up to 3 different Goal cards in play, and win with any of them.**"*
- `inwo_rules_extracted.txt:979-991`: *"**Goal Cards: These are a type of Plot card**"*.
- `inwo_rules_extracted.txt:938-944`: *"No player may have more than one Goal card in his hand."*
- `librarian_result.txt:2186`: la carta Goal se **revela, no se juega**, durante un intento de victoria; si el intento falla vuelve a la mano **expuesta**.
- VFAQ (`librarian_result.txt:1352-1354`): los UFOs *"special goal cannot be combined"* con cartas Goal, lo que reconcilia el texto de la carta: para los UFOs la carta Goal **es** la meta.

Ademas `BIBLIA.md:28` repetia el error ("UFOs (controlar tus 3 grupos secretos elegidos al inicio)"), de modo que el bug estaba documentado como si fuera una regla.

Los **Grupos Secret** (atributo `secret`) son un concepto de combate completamente distinto (`research/audit_reports/rules_combat_section.txt:189-211`): grupos desconocidos a los que la mayoria de los grupos no puede atacar, ayudar ni oponerse. No tienen relacion con la meta de los UFOs.

### 24.2 El mazo tiene 7 cartas Goal, no cero

`research/audit_reports/OFFICIAL_RULES_FINDINGS.md:225-226` afirmaba que las cartas Goal *"are a real mechanic (currently ZERO in the deck)"*. Es **falso**: hay exactamente 7 cartas con `effect.kind === 'goal'`, y su texto coincide con la lista oficial de `librarian_result.txt:2321`.

| idx | Carta | Condicion | Implementada |
|---|---|---|---|
| 190 | Alternate Goals | puedes tener 2 cartas Goal; no se combinan sus metas | como modificador del limite de mano (2) |
| 231 | Criminal Overlords | un grupo que sea a la vez Violent **y** Criminal cuenta doble | si |
| 261 | Fratricide | destruye 2 Illuminati rivales (para destruir uno hay que quitarle su ultimo titere) | si |
| 272 | Hail Eris! | cualquier grupo Weird con Poder >= 3 cuenta doble | si |
| 315 | Military-Industrial Complex | todos los Corporate pasan a ser Government | no (modificador permanente) |
| 334 | Peace in Our Time | +1 Poder a todos los grupos Peaceful | no (modificador permanente) |
| 419 | World War Three | las Nation que atacan tienen Poder x3 | no (modificador permanente) |

Las 4 no implementadas se declaran `pending-engine` de forma explicita: `E.declareGoalVictory` lanza con el motivo *"no es una condicion de victoria: es un modificador permanente del juego en curso, todavia no implementado"*. No se inventa una regla para rellenar el hueco.

### 24.3 Cambios en el motor

- `config.ufoTargets` **eliminado por completo** (0 referencias). `controlsGroup()` tambien: se quedo sin uso.
- Nuevos helpers: `isGoalCardIdx(ix)`, `goalCardsIn(pl)`, `goalHandLimitOf(pl)` (2 si tienes *Alternate Goals* en mano, si no 1), `ufoProgress(pid)`, `basicWithDouble(pl,dbl,label)`, `goalCardObjective(ix,pid)`.
- `goalText` para `goal_cards` ahora dice *"Tener cartas Goal en juego (hasta 3); ganas al revelar cualquiera de ellas"*.
- `E.playPlot` con `effect.kind === 'goal'` **lanza**: una carta Goal no se juega, se revela. Antes se empujaba a `exposedPlots` en silencio, que no correspondia a ninguna regla.
- **Nuevo `E.declareGoalVictory(pid,handIdx)`**: valida que la carta sea una Goal y este en mano, la saca de la mano y evalua su objetivo. Si se cumple -> victoria, la carta queda expuesta. Si no -> la carta **vuelve a la mano expuesta**, se registra en `pl.goalCardsExposed` y se devuelve `lastGoalAttempt={card,met,count,goal,exposed:true}`. No exige turno: declarar victoria no es jugar una carta.
- Enforcement del limite en dos puntos: `E.startGame` (el reparto inicial de 3 Plots puede dar 2 cartas Goal) y `E.endTurn`, descartando el exceso con mensaje en el log.
- `newGame` inicializa `destroyedIlluminati:[]`; `destroyGroup` empuja alli al owner cuando se queda sin titeres. Asi se cuenta *Fratricide*.
- 4 modificadores declarados, no simulados (ver 24.2).

### 24.4 Dos gates que fallaban al azar

Un gate que sale verde la mitad de las veces no es un gate. Instrumentando una copia del test 25-30 veces:

1. **P1-004 "la carta sale de la mano del rival" (~8%)**: se empujaba el indice 58 en la mano del rival, pero el reparto inicial (10 grupos aleatorios de ~167) ya puede contener el 58, y `removeFromHand` quita una sola copia. Se purga el indice antes de empujarlo.
2. **P1-009 "Shangri-La SI pierde un grupo Violent" (~6%)**: el log mostraba *"Ataque instantáneo falló contra Texas (FALLO automático (11-12 siempre fallan))"*. El Instant Attack tira 2d6 y 11-12 siempre fallan, asi que `instantAttack(atk,40,'s2')` fallaba legitimamente 2 de 36 veces. Se envuelve con `Math.random=()=>0` (fuerza el 2), igual que en P1-004.

Despues: **30/30 ejecuciones limpias**.

### 24.5 Verificacion

`node --check game/js/engine.js` limpio · `test_fase2_rules.js` 30/30 limpias · `npm test` -> **ALL TESTS PASSED (9)**.

El bloque P1-010 comprueba: las 7 cartas Goal existen; el jugador UFOs se localiza barriendo `effect.code==='ufos'` (porque `startGame` sortea quien empieza); `goalStatus` no se cumple sin cartas y tampoco con una; `declareGoalVictory` con *Fratricide* incumplido deja la fase en `main`, la carta de vuelta en la mano y `goalCardsExposed:['fratricide']`; tras 2 Illuminati destruidos la fase pasa a `gameover`; *World War Three* lanza `/modificador permanente/`; *Hail Eris!* no se cumple con 3 grupos Weird (`count:7,goal:12`) y si tras plantar 12 mas; y el limite de mano.
## 25. P1-011 — Destruction, devastacion y los estados de un grupo (ejecutado)

Esta tanda nacio de una pregunta de Fase 4: las cuatro familias de Plot que el motor dice implementar (`boost10`, `paralyze`, `power_increase`, `zap`) **no tenian ni una sola carta clasificada**. Antes de clasificarlas habia que contestar una pregunta mas basica: *que hace el motor con un grupo devastado o paralizado, y que hace con un ataque de destruccion?* Las dos respuestas eran erroneas.

### 25.1 Una hipotesis RETIRADA antes de tocar codigo
La primera hipotesis fue: "el motor nunca limpia `paralyzed` / `zapped` / `devastated`, asi que un grupo queda congelado para siempre". Se **retiro** antes de escribir una sola linea, porque el texto oficial dice lo contrario:

> `inwo_rules_extracted.txt:908-915` — "In general, cards 'remember' any changes in their status, **until something explicitly changes them back**. A Devastated Group does not get Relief just by going back into its owner's hand... **Exception: If a Group is destroyed, the slate is wiped clean.** It will have only its printed values if it somehow..."

Es decir: los estados **persistentes son la regla**, no un bug. Y la excepcion ("si el grupo se destruye, la pizarra se limpia") ya la cumple el motor, porque `destroyGroup` retira el nodo de la estructura. El `OFFICIAL_RULES_FINDINGS.md` seccion 6, que resume "paralyze lasts the rest of the turn", es la fuente secundaria equivocada, no el motor. **No se modifico nada de este punto.**

Lo que si quedo documentado como vacio: la regla "any player may spend an Illuminati action at any time to remove all Zaps from one player" no tiene implementacion, porque no existe ninguna carta de Zap en el dataset (ver 25.7).

### 25.2 DEFECTO C (P0) — un ataque de destruccion ignoraba por completo el Poder del objetivo
Este si es un fallo de calculo, y de los que cambian partidas. La sonda `scripts/_tmp_probe_destroy.js` (creada y luego borrada) lo demostro empiricamente: KKK (Poder 2) contra Texas (Poder 14) devolvia

```
DESTROY det={"base":2,"leaderMod":-8,"defenseBase":0,...,"posBonus":10,"cthulhu":4,"total":-12}
```

`defenseBase: 0`. Los 14 de Poder del defensor no aparecian en ningun termino de la cuenta. El ataque fallaba solo por la penalizacion de alineaciones (-8), el +10 posicional y el +4 de Cthulhu; sin esos tres factores, un grupo de Poder 2 habria destruido a Texas. La causa era que `computeStrength` solo asignaba `det.defenseBase` **en la rama de control**.

La regla oficial es explicita:

> `inwo_rules_extracted.txt:561-580`, "Attack to Destroy", punto (1) — "Instead of rolling 'Power minus Resistance,' roll 'Power minus Power.' That is, **the target defends with its Power rather than its Resistance.** Its closeness to the Illuminati still counts for defense, unless you're destroying one of your own Groups. **The target's common alignments with its master do not help** — those increase Resistance, which is not used in this attack!"

Correccion: en la rama de destruccion, `det.defenseBase=tNode?defenderPower(tNode,true):0;`. `defenseBase` ya forma parte de los 12 campos de la formula de `total`, asi que **la formula no cambio** y la invariante que comprueba la prueba P1-005 se mantiene intacta. `defenseBonus` **no** se sumo, porque el punto (1) dice exactamente que las alineaciones comunes con el Illuminati no ayudan en este ataque: el motor ya cumplia esa parte. `tNode` es seguro porque `computeStrength` lo sintetiza tambien para objetivos del area neutral, y destruir una carta de la mano ya estaba prohibido.

### 25.3 DEFECTO D (P1) — destruir un grupo propio daba defensa por cercania
> Mismo apartado, punto (2) — "You may try to destroy a Group in your own Power Structure. **The target does not get a defense bonus for closeness to the Illuminati in this case.** However, no Group may attack itself, or aid an attack on itself!"

El motor aplicaba `posBonus` sin distinguir. La guarda de `det.posBonus` en la rama de destruccion ahora exige ademas `A.targetPid!==A.pid`. La prueba confirma que el caso es alcanzable: `E.declareAttack(own,'destroy',{attackerUid:'oa',uid:'ob'})` con dos grupos de la misma estructura se acepta.

Los otros cuatro puntos de la misma lista ya los cumplia el motor: (3) +4 por alineacion opuesta y -4 por identica, (5) "A Group does not need an open control arrow to make an Attack to Destroy", (6) el grupo destruido va al "destroyed pile" del atacante, y (7) los titeres vuelven a la mano de quien controlaba el grupo destruido, no son destruidos.

### 25.4 DEFECTOS A y B (P1) — los estados no contaban para nada que importara
> `inwo_rules_extracted.txt:683-695` — "**While a Place is Devastated, its Power is halved (round down) against any Attack to Destroy.** Being Devastated again, while already Devastated, has no further effect. Relief restores a Devastated Place to normal. **The Place (and its puppets, and their puppets, etc.) will once again count toward victory** and be able to get Action tokens. To give Relief, spend actions with a total Power three times the printed Power of the Devastated Place."
>
> `inwo_rules_extracted.txt:681-682` — "...but the moved Group will then lose any Action tokens and **cease to count toward victory**."

**Defecto B**: la reduccion a la mitad (con redondeo hacia abajo) no existia en ninguna parte. `computeStrength` usaba `curPower(tNode)` tal cual, y tampoco `resolvePlotInstantAttack` ni `E.instantAttack`. Como los 13 Plots de tipo `disaster` dependen de este numero, cualquier Disaster que solo devastaba (Hurricane, `destroyMargin: null`) sobreestimaba al defensor. Correccion: helper `defenderPower(node,isDestroy)` que aplica `Math.floor(curPower(node)/2)` **solo** si `isDestroy` — la regla dice "against any Attack to Destroy", y un ataque de control sigue restando Resistencia.

**Defecto A**: la bandera `devastated` solo se usaba como guarda de fichas y de actuacion (`L477`, `L667`, `L745`, `L1199`); **ningun recorrido de meta la miraba**. Un grupo devastado seguia sumando Poder total, seguia contando como grupo controlado y seguia contando para la victoria. La comprobacion se centralizo en un helper nuevo:

```js
function countsForGoals(nd){
  return nd.cardId!=null&&!nd.paralyzed&&!nd.devastated;
}
```

Se aplico a los seis recorridos: `countControlled`, `sumPeacefulPower`, `basicWithDouble`, `alignsCovered`, `sumTotalPower` y el recorrido inline de `goalMetFor`. Este ultimo es el que de verdad decide la victoria, y casi se escapo: `basicWithDouble` solo lo usan las dos cartas Goal que lo invocan, mientras que `goalMetFor` conservaba su propio `walk` con la comprobacion antigua. La nueva prueba lo detecto (`3 -> 3` en vez de `3 -> 2`) y lo fijo. **Leccion: centralizar una regla en un helper no sirve si no se migra cada copia del recorrido; el gate es lo que encuentra la sexta.**

### 25.5 Familias de Plot irrecuperables en este dataset
La busqueda en las 176 cartas Plot genericas (texto impreso, mediana 280 caracteres) y en las 323 entradas de `research/audit_reports/scribd_card_text.json` no encontro **ninguna** carta de Zap, Paralyze ni Power Increase:

- `/paralyz/i` en textos de Plot: 0 resultados (en la fuente secundaria solo `jimmyhoffa`, que es una Personality).
- `/\bzap\b/i`: 0 resultados en las dos fuentes.
- `/increase ... power to|power to \d+/i`: 0 resultados.
- `/power is now|becomes \d+|is set to \d+/i`: 18 resultados, **todos en cartas ya clasificadas** como `disaster` o `assassination`.

Conclusion honesta: las ramas `case 'zap'`, `case 'paralyze'` y `case 'power_increase'` de `E.playPlot` quedan **inalcanzables con este dataset**. No se inventaron cartas para rellenarlas ni se escribieron reglas de relleno; quedan declaradas como bloqueadas por datos. La mecanica de `Relief` (gastar acciones con Poder total tres veces el Poder impreso del Place devastado) tampoco esta implementada, y sigue sin estarlo porque ninguna carta de Relief esta clasificada.

### 25.6 La familia que si es recuperable: los 15 Plots de +10
Todos comparten casi literalmente el mismo texto ("give +10 Power or Resistance (your choice) to any {X} group you control. If used with an action, it must be played when that action is first declared, and counts only for that action."), y encajan en la rama `boost10` que ya existe:

202 Benefit Concert (liberal) · 221 Cold Fusion (science) · 275 Harmonica Virgins (magic) · 288 Infobahn (computer) · 291 Jihad (fanatic) · 292 Just Say No (straight) · 306 Martial Law (government) · 307 Martyrs (peaceful) · 347 Pulitzer Prize (media) · 360 Save the Whales (green) · 368 Slush Fund (conservative) · 375 Stock Split (corporate) · 385 Terrorist Nuke (violent) · 387 The Big Score (criminal) · 417 World Cup Victory (cualquier Nation que controles).

Cuidado con los falsos positivos que tambien contienen "+10" pero pertenecen a otra familia y **no** deben clasificarse como `boost10`: 199 Atomic Monster y 336 Plague of Demons (ya son `disaster`), 243 Early Warning ("+10 to defend against any Disaster"), 247 Eat the Rich!, 382 Talisman of Ahrimanes (+2 tras un Assassination) y 415 Whispering Campaign (bonos a ataques de destruccion). Se detecto ademas una familia de 21 cartas "Link this card to the target" (194 Angst, 208 Bodyguard, 216 Charismatic Leader, 218 Citizenship Award, 223 Commitment, 239 Dictatorship, 250 Emergency Powers, 269 Grassroots Support, 277 Head in a Jar, 280 Hidden Influence, 310 Media Connections, 312 Messiah, 318 Mob Influence, 319 Monopoly, 325 Never Surrender, 326 New Blood, 329 Nobel Peace Prize, 348 Purge, 365 Self-Esteem, 382 Talisman of Ahrimanes, 401 The Weird Turn Pro), candidata a un lote posterior.

### 25.7 Verificacion
`node --check game/js/engine.js` limpio. `node test_fase2_rules.js` -> **FASE 2 RULES PASSED** con las 10 aserciones nuevas de P1-011 (Poder restado en destroy = 14 y no la Resistencia 9 · un atacante de Poder 2 ya no destruye a uno de 14, `total=-30` · destruccion de grupo propio con `posBonus=0` · Poder devastado 7 = `floor(14/2)` · la devastacion no reduce la Resistencia · Poder total de la meta 24 -> 10 · grupo controlado 3 -> 2 · grupo paralizado 2). Los 13 escenarios de P1-009 siguen verdes, incluido "Shangri-La SI pierde un grupo Violent", que ahora ejercita un `instantAttack` que ve el Poder defends. `npm test` -> **ALL TESTS PASSED (9)**, exit 0.

## 26. P1-012 / P2-DATA-02 — Los 15 «+10 Plots»: clasificacion, ejecucion y vocabulario de atributos completado

### 26.1 El hallazgo de partida: una rama del motor que nadie podia alcanzar

`E.playPlot` tenia un `case 'boost10'` escrito, compilado y con la sintaxis correcta. **Ninguna carta del dataset llegaba a ese `case`.** El censo de `effect.kind` sobre las 421 cartas daba `unverified 334 · ability_unverified 28 · illu_special 18 · disaster 13 · goal 7 · assassination 5`, es decir **cero cartas `boost10`**, cero `zap`, cero `paralyze`, cero `power_increase`. Ademas la rama existente **ignoraba por completo el objetivo**: no leia `targetUid`, no comprobaba la alineacion o el atributo del grupo, y no distinguia entre usarlo para atacar, para defender o para guardarse.

Consecuencia pratica: de las seis familias de Plots que nombra el reglamento oficial (`OFFICIAL_RULES_FINDINGS.md` L123-144), cuatro estaban «implementadas» solo en el papel y tres quedaban permanentemente inalcanzables porque **sus cartas no existen en esta transcripcion** (§25.5). El deficit real era de **clasificacion**, no de transcripcion: el texto impreso de las 176 Plots genericas esta casi completo (mediana 280 caracteres, solo 2 por debajo de 80).

### 26.2 Las 15 cartas de la familia «+10» y su frase impresa

Las quince comparten la misma estructura de texto: *«Play this card at any time to give +10 Power or Resistance (your choice) to any {X} group you control. If used with an action, it must be played when that action is first declared, and counts only for that action.»* y rematan con *«…does not count toward any Goal.»*

| idx | nombre | calificador | forma del dato |
|---|---|---|---|
| 202 | Benefit Concert | liberal | `align` |
| 221 | Cold Fusion | science | `attr` |
| 275 | Harmonica Virgins | magic | `attr` |
| 288 | Infobahn | computer | `attr` |
| 291 | Jihad | fanatic | `align` |
| 292 | Just Say No | straight | `align` |
| 306 | Martial Law | government | `align` |
| 307 | Martyrs | peaceful | `align` |
| 347 | Pulitzer Prize | media | `attr` |
| 360 | Save the Whales | green | `attr` |
| 368 | Slush Fund | conservative | `align` |
| 375 | Stock Split | corporate | `align` |
| 385 | Terrorist Nuke | violent | `align` |
| 387 | The Big Score | criminal | `align` |
| 417 | World Cup Victory | Nation | `attr: nation` |

`gen_cards.js` gana una tabla `BOOST10_FX` (con una fabrica `b10(field,value,name)` y una constante `BOOST10_TAIL` compartida) y el bucle de emision pasa a `const pfx = PLOT_FXN[key] || BOOST10_FXN[key];`, de modo que estas cartas reciben `effect`, `subtype`, `verifiedMechanic=true` y su texto, y quedan en `mechanicsStatus:'implemented-pending-engine'`.

**Advertencia de transcripcion registrada en el codigo:** el OCR corta la frase en *«does not count toward»*; el cierre *«any Goal»* se completa desde la seccion oficial de reglas. Es el **unico** punto de todo el generador donde la transcripcion se completa desde una segunda fuente, y queda anotado como tal.

Cinco cartas que tambien mencionan `+10` pero que **no** deben clasificarse como `boost10` (son de otras familias): 199 Atomic Monster y 336 Plague of Demons (ya son `disaster`), 243 Early Warning (*«+10 to defend against any Disaster»*, accion gratuita), 247 Eat the Rich!, 382 Talisman of Ahrimanes (+2 tras un asesinato) y 415 Whispering Campaign (bonificadores de ataque de destruccion).

### 26.3 Los tres modos de uso y su justificacion textual

El `case 'boost10'` se reescribio con tres modos, seleccionados por `opts.boostMode` (`attack` | `defense` | `hold`), con defecto `attack` si hay un ataque abierto y `hold` si no lo hay:

- **attack** — suma 10 a `A.boosts`. El objetivo **debe** ser `A.attackerUid`, porque el texto dice *«must be played when that action is first declared, and counts only for that action»*. **No se cobra ficha**: la del atacante ya se gasto en `declareAttack`.
- **defense** — suma 10 a `A.defBoosts`. El objetivo **debe** ser `A.targetUid`.
- **hold** — la carta queda expuesta en `pl.exposedPlots` sin necesidad de objetivo, porque el texto dice *«at any time»*.

El orden de validacion es **calificador → propiedad → identidad del atacante/defensor**, lo que hace deterministas los mensajes de error: `«…solo afecta a grupos <X>, no a <target>»`, `«…: el grupo debe ser tuyo»`, `«…: el +10 al ataque debe aplicarse al grupo que lo declaró»`, `«…: el +10 a la defensa debe aplicarse al grupo que se defiende»`, `«… necesita un ataque abierto para usarse asi»`, `«… necesita un grupo objetivo»`, `«Modo de uso no reconocido»`.

**Dos no-modelaciones deliberadas, documentadas en el codigo:**
1. *«your choice»* entre Poder y Resistencia no necesita un modelo propio: en los tres modos el +10 alimenta la misma resolucion de una unica accion.
2. *«does not count toward any Goal»* se cumple **por construccion**: ningun modo escribe `powerOverride`, de modo que los recorridos de meta, que leen el Poder impreso a traves de `curPower`, nunca ven el +10.

### 26.4 P2-DATA-02: `attributes` ∪ `attributeText` y cuatro atributos oficiales recuperados

`World Cup Victory` exigia el atributo `nation`, que el dataset no tenia. Al investigate la causa resulto que **no era un problema de vocabulario sino de precedencia**: el array `attributes` de la fuente secundaria esta filtrado con una lista mas estrecha que su propio campo crudo `attributeText` del mismo registro. Casos reales: Brazil tiene `attributes:["coastal","huge"]` pero `attributeText:"Huge, Coastal, Nation"`; Vatican City `attributes:[]` pero `attributeText:"Church, Nation"`; Switzerland `attributes:[]` frente a `"Nation"`.

La correccion fue hacer que `applySecondaryAttributes` **una** `row.attributes` con `row.attributeText` en vez de elegir una u otra, lo que recupero cuatro terminos oficiales nuevos: `nation` (11 cartas), `church` (5), `communist` (5) y `space` (2). La lista blanca `ATTRIBUTES` de `gen_cards.js` paso a 15 terminos.

Histograma de atributos tras la regeneracion (13 terminos con presencia): `science 14 · computer 16 · green 8 · media 15 · huge 8 · coastal 13 · nation 11 · church 5 · secret 7 · communist 5 · magic 9 · bank 4 · space 2`. Antes de este lote: `science 5 · computer 16 · green 8 · media 15 · huge 8 · coastal 13 · secret 7 · magic 9 · bank 4`.

**Ninguno de los 15 calificadores queda insatisfacible**, y eso se verifica con una asercion del test (conteo de grupos que satisfacen cada calificador: liberal 25, science 14, magic 9, computer 16, fanatic 16, straight 23, government 31, peaceful 13, media 15, green 8, conservative 29, corporate 14, violent 31, criminal 17, nation 11). Asi ninguna clasificacion futura puede publicar una carta con un objetivo imposible.

### 26.5 Dos defectos reales encontrados de paso

1. **Variable muerta `consumed` que contaba Plots dos veces.** `playPlot` terminaba con `if(consumed)pl.hand.splice(i,1); else pl.hand.splice(i,1);` — dos ramas identicas, con `consumed` asignado en tres sitios y leido en ninguno. Como las ramas hacian lo mismo, una Plot expuesta se quedaba **a la vez** en la mano y en `exposedPlots`, y el limite de Plots en mano (`plotsInHand.length + exposed.length - limit`) la contaba **dos veces**. Ahora el `splice` es incondicional, con un comentario que cita `OFFICIAL_RULES_FINDINGS.md` §8: una Plot expuesta se pone boca arriba delante del jugador y permanece expuesta hasta jugarse, descartarse, robarse u ocultarse de nuevo.
2. **`boost10` ahora es jugable fuera de tu turno.** El texto dice *«Play this card at any time»* y sin este cambio el modo `defense` era imposible: la defensa ocurre durante el turno del **atacante**, y `requireOwnMain` la rechazaba con `No es tu turno`. Se descubrió empíricamente cuando el escenario 6 del test lanzó ese error.

### 26.6 Cuatro bugs del propio test (y el cuarto es un flake real de la misma familia)

1. `'bavarian'` no era el id base: es **`bavarianilluminati`** (`baseIlluId` quita los digitos finales y el id completo es `bavarianilluminati1`).
2. Los escenarios 2 y 3 usaban el modo por defecto, que sin ataque abierto es `hold`; y `hold` deliberadamente **no** valida objetivo, asi que no lanzaba nada. Se corrigio declarando primero el ataque y pasando `boostMode:'defense'`.
3. El escenario 2 usaba `Martial Law` (government) sobre **Texas, que si es government** (government/violent/conservative), de modo que el calificador coincidia legitimamente y el error que salia era el de propiedad. Se cambio a `Stock Split` (corporate) sobre Texas.
4. **Flake real:** `P1-012 la Plot expuesta NO sigue en la mano` fallo en la tercera de tres ejecuciones. Causa: el reparto inicial ya puede contener la carta 360, asi que `hand.indexOf(360)` encontraba la copia preexistente y eliminaba esa, dejando «en la mano» la copia que el test habia empujado. Se purga el indice antes de empujar, igual que en el flake de P1-004. Verificado con **6 de 6 ejecuciones limpias consecutivas**.

### 26.7 Verificacion

`node --check` limpio en `gen_cards.js` y `engine.js`. `Select-String consumed` solo devuelve las dos lineas de comentario. `node gen_cards.js` → 421 cartas con conteos identicos (group 167 / illuminati 18 / plot 201 / resource 35). `unverified` baja de 335 a 334; `implemented-pending-engine` pasa a 33 (= 15 boost10 + 13 disaster + 5 assassination). `npm test` → **ALL TESTS PASSED (9)**, salida 0, con `FASE 2 RULES PASSED` y `CARD RESEARCH MANIFEST PASSED (356 pending cards; OCR and provenance linked)`.

### 26.8 Deuda restante de Fase 4

- **321 cartas siguen en `unverified`** y por tanto `rejectUnverifiedCard` las bloquea antes de gastar una ficha. Siguen siendo, con diferencia, el mayor hueco hacia «100% funcional».
- Siguiente familia candidata: las **21 cartas de «Link this card to the target»** (194 Angst, 208 Bodyguard, 216 Charismatic Leader, 218 Citizenship Award, 223 Commitment, 239 Dictatorship, 250 Emergency Powers, 269 Grassroots Support, 277 Head in a Jar, 280 Hidden Influence, 310 Media Connections, 312 Messiah, 318 Mob Influence, 319 Monopoly, 325 Never Surrender, 326 New Blood, 329 Nobel Peace Prize, 348 Purge, 365 Self-Esteem, 382 Talisman of Ahrimanes, 401 The Weird Turn Pro).
- **Zap, Paralyze y Power Increase siguen bloqueadas por datos** (§25.5): una busqueda exhaustiva demostro que esas cartas no existen en esta transcripcion, asi que las tres ramas de `playPlot` quedan inalcanzables. No se inventa nada.
- La mecanica de **Relief** (gastar acciones con Poder total tres veces el Poder impreso del Place devastado) sigue sin implementar; no hay ninguna carta Relief clasificada todavia.
- Fase 3 (UX/onboarding y comprobacion DOM en navegador real) sigue sin ejecutar.
- Queda por decidir si la ficha Illuminati puede pagar ataques, que es lo que desbloquearia `tokensNotSameAttack` de los UFOs.

## 27. P1-013 / Fase 4 lote 2 — la familia oficial "Power Increase" (ejecutado)

### 27.1 El §25.5 estaba equivocado: la familia SÍ era identificable

En §25.5 se declaró **data-blocked** la familia "Power Increase" porque una búsqueda con el patrón `/power to \d+/i` no encontraba ninguna carta. Ese grep fallaba por una razón concreta: el texto impreso de estas cartas dice

> "The Power for one Fanatic group **is increased to 6**."

y no "power to 6". El mismo error de lectura que condujo al §25.5 aparece por tercera vez en esta auditoría (la primera fue la meta de los UFOs, la segunda los atributos). **Lección: una búsqueda negativa sólo prueba que el patrón estaba mal escrito, no que los datos falten.** Antes de declarar algo data-blocked hay que leer el texto completo de una muestra de cartas de esa familia, no confiar en un patrón.

La regla oficial está confirmada en `inwo_rules_extracted.txt:268-273`:

> "**Power Increase**: A Power-increasing Plot is linked to a Group of a certain type to increase its Power to the value stated on the card. They have no effect on a Group that already has Power greater than or equal to the stated value."

Es decir: **fija** el Poder al valor impreso (no lo suma) y es **no-op** si el grupo ya tiene Poder >= ese valor.

### 27.2 Las 10 cartas, una por ideología

Las diez comparten el mismo texto impreso:

> "This card may be played at any time, and counts as the action for the group it affects. The increased Power takes effect immediately. The Power for one {X} group is increased to {N}. Link this card to your chosen {X} group. No player may have more than one {Name} in play."

| idx | Carta | Ideología | Valor impreso |
|---|---|---|---|
| 216 | Charismatic Leader | fanatic | 6 |
| 218 | Citizenship Award | conservative | 6 |
| 250 | Emergency Powers | government | 6 |
| 269 | Grassroots Support | straight | 6 |
| 318 | Mob Influence | criminal | 6 |
| 319 | Monopoly | corporate | 6 |
| 326 | New Blood | violent | 6 |
| 329 | Nobel Peace Prize | peaceful | 6 |
| 365 | Self-Esteem | liberal | 6 |
| 401 | The Weird Turn Pro | weird | **4** |

Cada una de las **10 ideologías canónicas queda cubierta exactamente una vez**. El valor de The Weird Turn Pro se conserva en 4 tal como está impreso: **no se normalizó a 6** porque el texto de la carta es la autoridad y no hay ninguna fuente que diga 6.

`gen_cards.js` (622 → ~658 líneas) incorpora la tabla `POWERINC_FX` justo después de `BOOST10_FXN`, con las constantes `POWERINC_HEAD` / `POWERINC_TAIL` y la fábrica `pinc(align,value,name,card)` que emite `{kind:'power_increase', targetAlign, value, t}`. El bucle de emisión pasa a resolver `const pfx = PLOT_FXN[key] || BOOST10_FXN[key] || POWERINC_FXN[key];`.

### 27.3 El bug de la clave `norm()` — y la sexta lección de la misma clase

La primera versión de la tabla usó la clave `'weirdturnpro'`, creyendo que `norm('The Weird Turn Pro')` la produciría. No es así: el manifiesto de imágenes nombra la carta exactamente **"The Weird Turn Pro"**, y `norm()` da **`theweirdturnpro`**. Resultado: la carta quedaba silenciosamente sin clasificar, con 9 de 10 en vez de un error.

Se detectó porque la verificación **contó** lo esperado (`inc.length === 10`) y obtuvo 9 en lugar de 10. Consecuencia derivada: la verificación de una tabla debe **contar** las filas que casan, no sólo comprobar que no hay excepciones. Un `filter` sobre una tabla con una clave mal escrita devuelve 0 filas y no lanza ningún error. Es exactamente el patrón que hacía que `test_respond.js` pudiera pasar vacío.

### 27.4 Nueva estructura en el motor: `linkedPlots`

`game/js/engine.js` (1743 → ~1806 líneas) no tenía ninguna representación del enlace entre un Plot y un grupo. Cuatro ediciones:

1. **Inicialización del jugador** — `linkedPlots:[]` junto a `resources` / `exposedPlots`. Cada entrada es `{uid:'lp'+(S.uidCounter++), cardId, linkedTo}`. El comentario cita `OFFICIAL_RULES_FINDINGS` §8: "Linked Plots … remain on the table indefinitely", y `inwo_rules_extracted.txt:819-847` ("When a Plot is linked to a Group, the link is **permanent**").
2. **`publicState`** — expone `linkedPlots` mapeado a `{uid, cardId, linkedTo}` para que la UI pueda dibujar el enlace.
3. **`destroyGroup`** — al desaparecer un grupo se retiran sus Plot cards enlazados. El filtro construye `lostUids` con `targetUid` **más todo `subtreeList(node)`**, porque un enlace puede estar en un títere y no en el nodo destruido directamente. Es el mismo criterio que ya usaba el filtro de Resources enlazados, y evita que un cambio de Poder sobreviva a la carta que lo origina. La carta vuelve a `S.plotDiscard`.
4. **Autorización "at any time"** — `'power_increase'` se añadió a la comprobación `instant` de `playPlot` (que estaba en L1368), porque las diez cartas dicen "may be played at any time".

### 27.5 `case 'power_increase'` reescrito

Antes eran cuatro líneas que aceptaban cualquier grupo, no gastaban ficha de acción, no representaban el enlace y caían en el `splice` incondicional del final: es decir, **la carta se descartaba y el cambio de Poder se perdía al terminar la partida**. Ahora el caso valida en este orden (el orden importa porque los tests dependen de él):

1. El objetivo existe — `elige un grupo de tu estructura para linkear la carta`.
2. La ideología coincide con `eff.targetAlign` — `solo funciona sobre grupos <align>, y <X> no lo es`.
3. El grupo es tuyo — `el grupo debe ser tuyo ("your chosen group")`.
4. Unicidad — `no puede haber mas de una en juego por jugador` (recorre `pl.linkedPlots` buscando el mismo `cardId`).
5. Ficha de acción — `cuenta como la accion del grupo y <X> no tiene ficha de accion`. Esto implementa literalmente "counts as the action for the group it affects".
6. **No-op si `curPower(nd2) >= value`**: registra el motivo, no gasta ficha, no enlaza, y la carta se descarta igualmente. Sin este paso, jugar la carta contra un grupo ya fuerte sería una jugada estéril que además consumía la acción.
7. Si procede: `spendGroupToken(pid,targetUid)`, `nd2.powerOverride=want`, se añade a `pl.linkedPlots`.

### 27.6 No modelado deliberado

`inwo_rules_extracted.txt:819-847` dice que el enlace se marca con "identical tokens (ones that look different from your Action tokens)" sobre ambas cartas. El motor registra el enlace lógicamente (`linkedPlots[].linkedTo`) pero **no crea un objeto de ficha de enlace ni lo dibuja en la UI**: es una decisión de presentación, no de reglas, y la UI de enlaces sigue pendiente (Fase 3). Queda anotado para que nadie lo lea como un olvido.

### 27.7 Verificación

- `node --check` limpio en `gen_cards.js`, `engine.js` y `test_fase2_rules.js`.
- `node gen_cards.js` → `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33` — recuentos idénticos.
- 4 corridas consecutivas de `node test_fase2_rules.js` → `FASE 2 RULES PASSED` las cuatro.
- `npm test` → **`ALL TESTS PASSED (9)**`, exit 0.

**Antes / después de la regeneración**

| Métrica | Antes | Ahora |
|---|---|---|
| `kind:'power_increase'` | 0 | 10 |
| `kind:'unverified'` | 334 | 324 |
| `mechanicsStatus:'implemented-pending-engine'` | 33 | 43 |

**Cobertura del nuevo bloque de tests** (27 aserciones, 5.º IIFE de `test_fase2_rules.js`): las 10 cartas clasificadas; las 10 con `implemented-pending-engine`; las 10 ideologías una vez cada una; Weird Turn Pro conserva el 4 y las otras nueve valen 6; ningún calificador insatisfacible; el texto impreso declara el enlace; Poder **fijado** a 6 sobre un grupo de Poder 1; `powerOverride` era `undefined` antes; la ficha del grupo se gastó; `linkedPlots` con `cardId` y `linkedTo` correctos; la carta sale de la mano; `publicState` expone `linkedPlots`; no se puede jugar dos veces la misma carta; sin ficha de acción no se puede usar; rechaza otra ideología; rechaza grupo rival; exige grupo objetivo; el no-op existe dinámicamente (la pareja carta/grupo cuyo Poder impreso ya alcanza el valor sale siendo *Citizenship Award sobre Pentagon, Poder 6*); el no-op no gasta ficha, no crea enlace y descarta la carta igual; al destruir el grupo enlazado el Plot vuelve a `plotDiscard`; "may be played at any time" funciona con el turno del rival.

**Fixture dinámico**: el escenario 4Pedía un grupo fanatic con Poder >= 6 y `groupByAlign('fanatic', false)` devolvía `undefined` (no existe tal grupo), lo que rompía el script con `TypeError` al leer `.idx`. Se reescribió para **buscar dinámicamente** la pareja (carta, grupo) que cumple la precondición, en vez de fijar una ideología a mano. Regla general: **no fijar a mano un fixture que depende de una propiedad del dataset**; pedirle al dataset la instancia que cumple la condición.

### 27.8 Backlog restante de Fase 4

**Quedan 324 cartas sin verificar** — sigue siendo el mayor hueco hacia "100 % funcional". Próximos candidatos, ya identificados por texto:

- **Commitment** (223) y **Never Surrender** (325) — familia "Resistance Increase": fijan la Resistencia a 8 y 12, se juegan como jugada gratuita, pueden jugar sobre **cualquier** jugador e incluso sobre un grupo recién revelado de la mano rival.
- **Bodyguard** (208) y **Talisman of Ahrimanes** (382) — reacción a un Asesinato: "It becomes an automatic failure", y conceden +6 / +2 (o +10 contra otro Asesinato) mientras el Personality siga vivo. Es una interacción de combate de alto valor y merece su propio lote.
- **Dictatorship** (239) — cambio de alineación a Violent sobre una Nación propia, consume la acción.
- Sin clasificar, texto ya leído: Messiah (312), Angst (194), Hidden Influence (280), Media Connections (310), Head in a Jar (277), Purge (348).

**Zap y Paralyze siguen siendo data-blocked** de verdad: ninguna carta de esas familias existe en esta transcripción (§25.5, y el grep de esta vez sí se escribió correctamente: `/\bzap\b/i` y `/paralyz/i` sobre el texto de las 201 Plots dan 0 resultados). La mecánica `Relief` (3 × Poder impreso en acciones) sigue ausente y ninguna carta Relief está clasificada.

Fase 3 (UX/onboarding y comprobación DOM en navegador real) sigue sin ejecutar, y sigue abierta la decisión de si la ficha Illuminati puede pagar ataques, que desbloquearía `tokensNotSameAttack` de los UFOs.

## 28. P1-014 — Familia "Resistance Increase" (Commitment, Never Surrender)

### 28.1 La familia y por que sus dos cartas NO son el mismo efecto

Dos cartas, texto impreso verbatim de la transcripcion local:

- **Commitment** (idx 223): "The Resistance for any one group is increased to 8. Link this card to your chosen group. Playing this card is a free move and may be done at any time, even while its target group is being attacked. The target group may belong to any player, or may be one that has just been played from a rival's hand."
- **Never Surrender** (idx 325): los mismos free-move / at any time / any player, mas "The Resistance for one Fanatic group is increased to 12. Link this card to your chosen Fanatic group."

Se guardan como datos distintos y no como un mismo efecto con un parametro porque difieren en tres puntos que el motor tiene que respetar:

1. Commitment no dice "de una {ideologia}" y por tanto **no lleva `targetAlign`**: vale cualquier grupo. Never Surrender si, `fanatic`.
2. Los valores son distintos (8 y 12) y el verbo es "increased **to**", no "+N": la Resistencia queda **fijada**, igual que hace Power Increase con el Poder.
3. **Ninguna de las dos dice "No player may have more than one X in play"**, al contrario que las diez cartas de Power Increase. Por eso no se modela unicidad. Anadir ese limite seria inventar una regla: la carta es la autoridad.

Nota de honestidad sobre el catalogo: esta familia **no figura** entre las seis familias oficiales de Plots que enumera `OFFICIAL_RULES_FINDINGS.md` §6 (+10 Plots, Attribute Freeze, Paralyze, Power Increase, Zap). Se ha derivado del texto de las cartas, no de la taxonomia oficial, y se documenta como tal para no presentar como oficial lo que solo es una agrupacion nuestra.

### 28.2 El defecto central: la Resistencia se leia de la CARTA, no del NODO

Este era el motivo por el que la familia no podia existir. `computeStrength` calculaba la defensa asi:

```js
var R=(typeof tCard.resistance==='number')?tCard.resistance:5;
det.defenseBase=R;
```

El valor impreso vive en la carta, y las cartas "Resistance Increase" lo **fijan sobre el grupo concreto** mediante un link permanente. Con ese codigo, un link no podia cambiar nunca la defensa real de un ataque: la carta era la unica fuente de verdad. Cualquier implementacion de la familia habria sido decorativa.

Correccion: un helper `nodeResistance(node, cardObj)` colocado junto a `defenderPower`, con la regla en un solo sitio:

```js
function nodeResistance(node,cardObj){
  if(node&&node.resistanceOverride!=null)return node.resistanceOverride;
  var c=cardObj||(node?card(node.cardId):null);
  if(c&&typeof c.resistance==='number')return c.resistance;
  return 5;
}
```

`node` puede llegar a `null` (ataque contra una carta en la mano: no hay nodo) y en ese caso se cae a la carta, que es el comportamiento correcto y queda cubierto por una regresion propia. El 5 como ultimo recurso es el mismo valor por defecto que ya usaba el motor; no se introduce ninguna regla nueva.

`computeStrength` pasa a usar `det.defenseBase=nodeResistance(tNode,tCard)` y, cuando hay override, anade a `det.notes` la explicacion ("Resistencia fijada en N por un link permanente") para que el jugador vea por que cambia el desglose.

**Prueba empirica de que la correccion surte efecto** (la asercion clave del gate nuevo, sin ella la familia seria indetectable):

- Sin link: `defenseBase=4` (la Resistencia impresa de Goldfish Fanciers).
- Tras jugar Commitment sobre ese mismo grupo: `defenseBase=8`, y la fuerza total baja exactamente 4 (`-4` -> `-8`).

### 28.3 El `case 'resistance_increase'`

Cuatro reglas del texto impreso, cada una con su razon:

- **Fija, no suma.** `nd.resistanceOverride=wantR`. Un segundo link REEMPLAZA el valor (12, no 8+12), igual que Power Increase con el Poder.
- **Movimiento gratuito.** No se gasta ninguna ficha, ni de grupo ni Illuminati. La prueba lo demuestra jugando sobre un grupo con `tokens:0` y comprobando que siguen en 0.
- **El objetivo puede ser de CUALQUIER jugador.** El texto es literal: "may belong to any player, or may be one that has just been played from a rival's hand". Aqui esta el contraste mas importante con `power_increase`, que si exige propiedad ("your chosen group"). Por eso este caso NO hace comprobacion de propiedad, y el link se registra en el jugador que **jugo** la carta, no en el dueno del grupo.
- **Link permanente.** La carta va a `pl.linkedPlots` y no al descarte, con la misma justificacion que las 10 de Power Increase (`inwo_rules_extracted.txt:819-847`: "When a Plot is linked to a Group, the link is permanent"; `OFFICIAL_RULES_FINDINGS` §8: "Linked Plots ... remain on the table indefinitely"). Se reutiliza el modelo `linkedPlots` que ya.traia P1-013, incluida su limpieza en `destroyGroup`.
- **"may be done at any time"**: `resistance_increase` se sumo a la lista `instant` de `playPlot`, igual que `boost10` y `power_increase`. Sin eso el texto seria falso, porque la defensa ocurre durante el turno del atacante.

### 28.4 Bug REAL destapado por un flake del gate nuevo: el limite de Goal cards podia dejar un estado imposible

Al correr el gate nuevo ocho veces seguidas aparecio un fallo de un test **anterior** (P1-010), no del nuevo. No era un flake: era un defecto del motor que la asercion antigua ya detectaba pero que solo se manifesto con otra semilla.

El defecto: al descartar el exceso de Goal cards se usaba `held.shift()`, es decir se descartaba **la primera en orden de mano**, que puede ser `Alternate Goals`. Pero `Alternate Goals` es la carta que **autoriza** el segundo hueco (su texto dice "You may possess two Goal cards"); sin ella el limite vuelve a ser 1. El resultado era un estado imposible: **2 cartas Goal en mano sin la carta que justifica tener 2**. Con cuatro cartas repartidas, el limite se evaluaba como 2, se descartaban dos, y podian sobrevivir dos cartas que no eran `Alternate Goals`.

El codigo estaba **duplicado en dos sitios** con el mismo bucle defectuoso: el reparto inicial (L463-471) y `endTurn` (L1715-1724). Se centralizo en un helper, que es la leccion ya registrada en P1-011 (centralizar una regla no sirve si no se migra **todos** los call sites duplicados):

```js
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
  ...
}
```

Cuando el limite es 1 se conserva la primera en orden de mano: cualquier sola carta Goal es legal, asi que **no decide el motor** cual conviene; eso es una eleccion del jugador. Se anadio ademas un `log` con cuantas cartas se descartaron, porque antes solo se registraba cada descarte por separado y no se podia ver el total de un vistazo.

### 28.5 Tres bugs del test (y por que son las tres lecciones ya conocidas)

Ninguno era un defecto del motor, pero los tres son reincidencia de lecciones ya escritas en este documento:

1. **Fixture elegido a mano que dependia de una propiedad del dataset.** Para probar que Never Surrender rechaza un grupo no fanatic se uso `Goldfish Fanciers`, que es fanatic de verdad. El `case` no lanzo, y el fallo en cascada hizo que la siguiente asercion reportara un error enganoso ("Carta no esta en tu mano") porque la primera llamada ya se habia comido la carta. Leccion: buscar dinamicamente la pareja (carta, grupo) que cumple la precondicion.
2. **`currentPid` no es una identidad estable.** `startGame()` sortea quien empieza, asi que el fixture de la asercion central-planto atacante y victima bajo pids fijos 0 y 1, y con semilla contraria ambos cayeron bajo el mismo jugador: `Error: No puedes tomar control de tu propio grupo`. Corregido derivando `atkPid=S.currentPid` y `defPid=1-atkPid`. Es la misma razon por la que existe el helper `pidOf`.
3. **Snapshot en vez de estado vivo.** La asercion "la carta sale de la mano" leia `S2.players[me].hand`, donde `S2` es lo que devolvio `fresh()`, es decir el estado **anterior** a los `give`/`play`. Si el reparto inicial ya traia el indice 223 la asercion fallaba al azar. Corregido a `E._raw().players[me].hand`.

### 28.6 Verificacion

- `node --check` limpio en `game/js/engine.js`, `gen_cards.js` y `test_fase2_rules.js`.
- `node gen_cards.js` -> `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`, identico a los lotes anteriores: ninguna carta anadida, eliminada ni perdida.
- Diez corridas consecutivas de `node test_fase2_rules.js` -> las 10 limpias.
- `npm test` -> `ALL TESTS PASSED (9)`, exit 0.
- Recuento antes/despues: `resistance_increase` 0 -> 2, `unverified` 324 -> 322, `implemented-pending-engine` 43 -> 45.
- Cobertura del gate nuevo (30 aserciones): 2/2 clasificadas · valores y calificadores correctos · ambas `implemented-pending-engine` · ambos calificadores satisfacibles (16 grupos fanatic) · la Resistencia queda fijada y no sumada · movimiento gratuito con 0 fichas · link permanente registrado con `cardId` y `linkedTo` · la carta sale de la mano, no queda expuesta y no se descarta · **no se inventa unicidad** (dos Commitment en juego) · funciona sobre un grupo rival y el link es de quien la juego · filtro de ideologia con su mensaje · objetivo obligatorio · una jugada rechazada no consume la carta · el segundo link reemplaza · **la defensa usa la Resistencia impresa sin link y la fijada con link, y la fuerza total baja exactamente 4** · el desglose explica el cambio · el ataque se resuelve · un objetivo en la mano sigue usando la carta · "at any time" funciona con el turno del rival.

### 28.7 Backlog restante de Fase 4

**322 cartas siguen `unverified`**, que es la mayor deuda hacia el objetivo de un juego 100% funcional. Son Rechazadas por `rejectUnverifiedCard`, que es lo correcto: no se inventa una regla.

Siguientes candidatos ya identificados por su texto:

1. **Bodyguard (208) + Talisman of Ahrimanes (382)** — "It becomes an automatic failure" mas +6 / +2 contra destrucciones futuras. Reaccion de combate de alto valor, merece su propio lote.
2. **Dictatorship (239)** — cambio de alineacion a Violent sobre una Nation propia, cuesta la accion.
3. Messiah (312) — Poder y Resistencia +4, mas +2 por cada Church que controles.
4. Angst (194) — Poder permanentemente reducido a 1.
5. Hidden Influence (280), Media Connections (310), Head in a Jar (277), Purge (348).

Zap y Paralyze siguen genuinamente data-blocked (los greps esta vez bien escritos, `/\bzap\b/i` y `/paralyz/i` sobre los 201 textos de Plot dan 0). `Relief` (3 veces el Poder impreso en acciones) sigue ausente y sin ninguna carta Relief clasificada. Fase 3 (UX/onboarding y comprobacion DOM en navegador real) sin ejecutar. Sigue abierta la decision de si la ficha Illuminati puede pagar ataques, que desbloquearia el `tokensNotSameAttack` de los UFOs.

## 29. Fase 4 lote 3 — Messiah y Angst, y la pregunta que ningún texto responde

### 29.1 ¿Un cambio de Poder provocado por una Plot cuenta para una meta?

Las reglas oficiales nunca responden a esta pregunta. Se revisó el fichero de reglas completo y la respuesta es silencio. Lo único que dice el conjunto de cartas de forma explícita es la frase de las "+10 Plot cards", "does not count toward any Goal", que ya se documentó en 26.3. Esa frase existe precisamente porque las +10 no cuentan; las demás cartas que cambian el Poder no la repiten.

El criterio aplicado queda escrito en el código, junto al helper `goalPower`: **excepción explícita, no cuenta; silencio, cuenta**. El Poder actual de un grupo es su Poder, así que un cambio permanente debe contar.

Antes de aplicar el criterio había que garantizar que no rompía la excepción de las +10. Se garantiza por construcción: `case 'boost10'` no escribe nada en ningún nodo. Su +10 vive sólo en `A.boosts`, en `A.defBoosts`, o la carta se queda descubierta en la mesa. Por eso leer el Poder a través de `curPower` la excluye sin ningún caso especial. Lo que ahora sí cuenta son las escrituras permanentes sobre el nodo: Power Increase, Messiah y Angst.

La migración son dos únicos puntos de lectura: el `take` interno de `sumPeacefulPower` y el cuerpo de `sumTotalPower`. Las dos aserciones existentes siguen verdes: el delta de 14 del caso P1-011 se mantiene porque el Poder actual de un Texas devastado sigue siendo 14, y el 67/50 de Bavarian del caso P1-008 no tiene ningún override presente.

Medido en la prueba: una Messiah sube el total de Poder de 11 a 15, exactamente el +4 de la carta. Y el contra-test: después de jugar Martial Law en modo ataque, el `powerOverride` del nodo sigue siendo `null` y el total no se mueve de 24 a 24.

### 29.2 Los dos efectos implementados

**Messiah (312)** es un efecto de enlace permanente. Su texto dice "at any time except during an attack", que son dos reglas a la vez: permiso fuera de tu turno y veto mientras hay un ataque abierto. En el motor un ataque está abierto desde `declareAttack` hasta `resolveAttack`, que es exactamente la ventana oficial de reacción del apartado de cancelaciones. Las dos mitades tienen prueba.

El objetivo debe ser una Personality y debe ser tuya. El texto no dice "this is an action for", a diferencia de las Power Increase, así que **no se cobra ficha de grupo**: la prueba lo juega sobre un grupo con 0 fichas, y por eso importa. El bonus es "increased by 4, plus 2 more for every Church you control": el motor cuenta los grupos con atributo `church` que controla el jugador y aplica `4 + 2*Iglesias` tanto al Poder como a la Resistencia. El texto cierra con "Only one Messiah can be in play at a time", que se implementa con la misma comprobación de unicidad de Power Increase.

**Angst (194)** reduce el Poder a 1 de forma permanente sobre un Place o una Organization, nunca sobre un Illuminati. Cuesta dos cosas: una acción de tu Illuminati y una acción de uno de los grupos que la carta nombra. Las dos se validan antes de gastar ninguna, para que un rechazo no deje fichas a medio gastar; la prueba lo comprueba en las dos direcciones.

Igual que Messiah, "at any time except during an attack" se implementa con las dos mitades.

Ninguna de las dos cartas pertenece a ninguna de las seis familias de Plot de `OFFICIAL_RULES_FINDINGS.md` apartado 6. Igual que la familia Resistance Increase del lote anterior, son efectos de enlace deducidos del texto impreso, que es la autoridad. Se deja escrito para que nadie los confunda con una familia del reglamento.

### 29.3 Pregunta abierta de datos: Orbital Mind Control Lasers

Angst nombra tres grupos: Psychiatrists, Intellectuals y Orbital Mind Control Lasers. Los tres nombres se dejaron tal cual en el dato. Pero **Orbital Mind Control Lasers (idx 332) está transcrito como `type=resource`**, no como grupo, así que nunca puede gastar una acción de grupo: es un recurso. Sólo Psychiatrists (idx 115) e Intellectuals (idx 66) pueden cumplir ese papel.

El motor busca la acción dentro de la estructura del jugador, de modo que el tercer nombre simplemente nunca coincide. **No se corrige a ojo**: si la transcripción está equivocada, el arreglo correcto es en el generador y con una fuente, no en una constante del motor. Queda como pregunta abierta de datos.

### 29.4 Bodyguard y Talisman: bloqueados por una ventana que no existe

Bodyguard (208) y Talisman of Ahrimanes (382) dicen "Play this card after any type of Assassination. It becomes an automatic failure". No son una reacción a una Assassination ya resuelta: son la **cancelación de una Assassination anunciada y todavía sin resolver**, exactamente la ventana del apartado "Cancellations, Illegal Actions, & Other Surprises" (`inwo_rules_extracted.txt:924-931`): la ventana es "after making the attempt is announced, but before the dice are rolled", y una acción cancelada "is treated as if it never happened" conservando el coste. El apartado de tiempos confirma que un jugador no puede hacer speed-play para adelantarse a la reacción de los demás (`inwo_rules_extracted.txt:780-790`).

**El motor no tiene ninguna ventana de reacción.** Las búsquedas de `pending`, `reaction`, `responder`, `openWindow` y `awaiting` no dan nada: `resolvePlotInstantAttack` tira los dados y destruye dentro de la misma llamada que `playPlot`, así que no hay costura donde un rival pueda reaccionar.

Implementarlas sin esa costura habría producido exactamente el defecto decorativo que se registró en P1-014: un efecto que se puede activar pero que nunca cambia el resultado. Por eso quedan **declaradas bloqueadas**, no decoradas. La ventana de reacción es su propia tarea pendiente.

### 29.5 Dictatorship: bloqueado por un defecto sistémico

Dictatorship (239) dice "It becomes Violent, if it was not already". Hoy es **imposible de implementar**: no existe almacenamiento de alineaciones a nivel de nodo. Todas las lecturas van contra `c.alignments`, que es dato inmutable de la carta.

La lista de puntos de lectura es larga y atraviesa casi todos los sistemas: `alignsOf`, que alimenta el cálculo de fuerza y las precondiciones de ayuda y oposición; `sumPeacefulPower`; `doubleQualifies`; `alignsCovered`; `bonusTargetMatches`; `hasAnyAlign`; `shangriLaBlocksDestroy`; y los filtros de `power_increase`, `boost10` y `resistance_increase`. Son más de veinte sitios.

La corrección necesita un helper del tipo `nodeAligns(node, cardObj)` más un campo de override en el nodo, migrados a **todos** los puntos de lectura. Esta es la segunda vez que aparece esta clase de defecto: centralizar una regla en un helper no sirve si no se migra cada copia del sitio de llamada. La primera fue el recorrido de metas de P1-011, y lo detectó la prueba nueva, no la revisión. Backlash (idx 200) tampoco se puede implementar hasta entonces, porque "any change in the target's alignment ... returns to its original value" necesita un valor original guardado.

Nota importante: `sumPeacefulPower` y `sumTotalPower` leen el Poder del nodo desde la migración de P1-015, y para las alineaciones se decidirá lo equivalente en su momento. Lo que §29.5 deja claro es que la regla de "leer el estado del nodo, no el dato de la carta" ya está aceptada para el Poder y la Resistencia, y las alineaciones son el tercer caso pendiente.

### 29.6 Tres errores de prueba

Ninguno fue un defecto del motor; los tres son reincidencias de lecciones ya escritas.

El primero: la expresión regular de la unicidad. La prueba buscaba "no puede haber mas de una en juego", pero el motor cita el texto de la carta tal cual, "Only one Messiah can be in play at a time". Cuando el motor cita el texto impreso a propósito, la prueba debe buscar el texto impreso.

El segundo: `fresh()` no garantiza ficha de Illuminati. `startGame()` sólo llama a `beginTurn` para un jugador, así que el otro arranca con 0 fichas según quién empiece al azar. El escenario se rompió con un error de ficha. Se fija la ficha a 1 de forma explícita antes de medir el gasto de la carta. Es la séptima vez que una prueba depende de una propiedad que el fixture no garantiza.

El tercero: el fixture contradecía la aserción. El escenario plantaba Psychiatrists y después afirmaba que no había ningún grupo con ese nombre, así que la jugada tenía éxito y no había excepción; la aserción siguiente fallaba en cascada. Se eliminó el plant.

### 29.7 Verificación

`node --check` limpio en los tres ficheros. `node gen_cards.js` escribe 421 cartas con los mismos conteos. Ocho corridas consecutivas de `test_fase2_rules.js` en verde. `npm test` da ALL TESTS PASSED (9). Los 33 controles nuevos cubren: la clasificación de las dos cartas y sus parámetros impresos; objetivo, propiedad, unicidad y ausencia de ficha en Messiah; el bonus por cada Iglesia; las dos mitades de "at any time except during an attack"; el filtro de subtipo, el doble coste y la validación previa al gasto en Angst; la migración de `goalPower`; y el contra-test que demuestra que la excepción de las +10 sobrevive.

Pendiente: Hidden Influence (280), Media Connections (310), Head in a Jar (277) y Purge (348); la ventana de reacción; el almacenamiento de alineaciones en el nodo; y **322 cartas siguen `unverified`**.
## 30. Fase 4 lote 4 — Global Power: una regla central ausente del motor Y de los datos (P1-DATA-03)

Este lote cierra con **cero cartas clasificadas**. No es un lote vacío: es el hallazgo más importante que ha producido la auditoría de cartas desde P2-DATA-01, porque afecta a una regla central del juego y no a una carta concreta.

### 30.1 Las cuatro cartas del lote y por qué ninguna es implementable

Las cuatro son `type=plot`, `effect.kind=unverified`, `mechanicsStatus=unverified`. Se leyó el texto IMPRESO completo de cada una (lección permanente: el texto truncado por el OCR esconde la regla operativa).

- **277 Head in a Jar** — "Play this card when one of your Personalities is killed. It takes precedence over any enemy attempt to capture or permanently eliminate the destroyed group. Link this card to the Personality. It remains in play, but can never control any group that it didn't control before. It can't be defended against any further Assassinations. It can Attack to Destroy, or aid attacks with its Power, but it's doing all its business by telephone". Necesita tres cosas que el motor no tiene: (a) la ventana de reacción (§29.4, P1-016); (b) una mecánica de "asesinado" y resurrección; (c) un modelo de la restricción "no puede controlar ningún grupo que no controlara antes". **Triplemente bloqueada.**
- **280 Hidden Influence** — "The group of your choice now has Global Power equal to its regular Power. Link this card to the group. This requires an action from your Illuminati. It may be played at any time."
- **310 Media Connections** — "The group of your choice becomes a Media group, if it was not already one, with Global Power equal to its regular Power. Link this card to the group. This requires action(s) from Media group(s) with a total Power of 6 or more. It may be played at any time."
- **348 Purge** — "This card may be played at any time during your turn, as an action for the group that uses it. It can be used in two ways: Used by your Illuminati, it destroys all Agent cards currently in play which duplicate your own. Used by another group, it reduces the group's Power and Global Power by 1, but makes it permanently immune to duplicate Group cards played by rivals. Link this card to the group."

**Hidden Influence, Media Connections y Purge** están bloqueadas por **P1-DATA-03** (Global Power). **Head in a Jar** por **P1-016** más dos mecánicas ausentes.

### 30.2 Global Power es una regla central, y el motor no la tiene

`Select-String -Pattern 'global' game/js/engine.js` → **cero coincidencias**. La regla oficial está en la página 8 del World Domination Handbook, verbatim:

- "Some Groups have a second Power number — Global Power. For instance, if a Group's power is 5/3, the 3 is its Global Power. This represents power that crosses all ideological boundaries."
- "If a Group's alignments don't let it use its normal Power to aid or oppose an attack, it can still use its Global Power. Thus, Groups with Global Power are more flexible."
- "The Clone Arrangers are a Violent Criminal Group with Power 6/2. It can aid or oppose an attack to control another Violent or Criminal Group with its 6 Power. It can aid or oppose an attack to control any other Group with its 2 Global Power."
- "Plots and special abilities that change a Group's Power do not affect its Global Power unless they specifically say so. A Group can never have Global Power higher than its regular Power — if its regular Power is decreased below its Global Power, its Global Power is temporarily decreased to equal its regular Power."
- Ejemplo trabajado, `inwo_rules_extracted.txt:567-569`: "defense, and opposes the attack with an action from the Hackers (Power 3/2, Weird, Fanatic). Since the Hackers don't have any alignments in common with the B.A.T.F., they use their Global Power. The attack strength is now 9 – 2, or 7."
- `librarian_result.txt:416` sobre la defensa: "Master can defend. Other groups can defend only if they share an alignment with the target **or have Global Power**."

**Consecuencia sobre el motor ya escrito:** las precondiciones de `addSupport` (alineación compartida para ayudar, alineación opuesta para oponerse) y la precondición de defensa son **incorrectas para cualquier grupo con Global Power**, y `computeStrength` nunca la usa. Es la misma clase de hueco central que P1-011 ("Destroy = Poder contra Poder"), pero encontrado leyendo una familia de cartas y no con una prueba que fallara.

### 30.3 La medición que demuestra que es un hueco de transcripción, no de reglas

- Grupos cuyo texto impreso contiene el patrón `Power N/M`: **0 de 421**.
- El segundo número impreso sencillamente no está en el corpus de OCR.
- Comprobaciones directas, dato del dataset frente al valor impreso en las reglas:
  - **Hackers** (idx 60): dataset `power=3, resistance=2, alignments=[weird, fanatic]`, `attributes=[computer]`. Las reglas imprimen "Power 3/2, Weird, Fanatic" y explican que ese `2` es su **Global Power**. El OCR de esa carta termina en un `3` pelado.
  - **B.A.T.F.** (idx 5): dataset `power=3, resistance=2, alignments=[violent, government]`; el ejemplo trabajado de las reglas lo usa como objetivo de un ataque de fuerza 9.
  - **Wargamers** (idx 166): dataset `power=1, resistance=5, alignments=[weird]`; las reglas imprimen "Power 1, Weird".
  - **Pentagon** (idx 107): `power=6, resistance=6`. Este es el caso normal de dos números y está bien.

**Ningún grupo del dataset tiene valor de Global Power y no se puede derivar.** Inventar uno sería fabricar un dato de regla, exactamente lo que §25.5 dejó demostrado con Zap y Paralyze, y lo que este lote evita con las tres cartas de arriba.

### 30.4 La fuente autoritativa existe y está identificada, pero no es alcanzable

`librarian_result.txt:767` documenta el generador de listas de cartas de INWO de Wendell Hicken, en `https://www.cs.cmu.edu/~ralph/inwo/new.fnord.html`, con la base de datos completa y campos separados: N (nombre), T (tipo), P (Poder), R (Resistencia), L (alineación), S (atributos), O (número de flechas de salida), **G (Global Power)**, D (descripción), E (expansión), C (frecuencia), A (artista).

**Se tiene localmente la LEYENDA de ese generador, guardada como `research/cardgen.html`** (2636 bytes, 89 líneas), pero **sólo la leyenda**: no hay ni un `<script>` ni una estructura de datos embebida. La lista de campos que documenta incluye, además de `G`, dos que el motor y el dataset tampoco tienen:

- **`Q` = requisitos** ("requirements"). Relevante de inmediato para Fase 4, porque las líneas "Requires …" del OCR son ruidosas y este sería el campo estructurado que las reemplaza.
- **`O` = número de flechas de salida**. El motor **lo tiene hard-codeado**: `game/js/engine.js:56` `function maxChildren(node){return node.cardId==null?4:3;}` — la raíz Illuminati recibe 4 flechas y **cualquier otro nodo recibe exactamente 3**, sin mirar el dato. Si alguna carta imprime menos de 3, el motor permite más control de grupo del que la carta permite.

Red caída: `Invoke-WebRequest https://www.cs.cmu.edu/~ralph/inwo/new.fnord.html` → `No se puede resolver el nombre remoto: 'www.cs.cmu.edu'`. El entorno sigue **OFFLINE**.

### 30.5 Alcance del daño: ocho cartas del dataset hablan de Global Power

`Cable TV` (14, con `power=null`) · `Subliminals` (141) · `Hidden City` (279, Resource) · `Hidden Influence` (280) · `Media Connections` (310) · `Midas Mill` (314, Resource) · `Purge` (348) · `Swiss Bank Account` (381). Textos: Cable TV, "Add 1 to this group's regular and global Power for each Personality in your Power Structure". Subliminals, "The number of Media groups you control is added to the Power and Global Power of the Subliminals". Hidden City, "Control of the Hidden City gives your Illuminati +2 to their Power and Global Power". Midas Mill, "The Power and Global Power of your Illuminati are both increased by 2. Or link the Mili to any Coastal group, and give it Global Power equal to its regular Power". Swiss Bank Account, "This cannot be used for Global Power".

### 30.6 Un segundo defecto sistémico, de la misma clase que §29.5

**Media Connections** dice "The group of your choice **becomes a Media group**". Eso es un cambio de atributo a nivel de nodo, y los atributos se leen de la **carta** inmutable en más de 20 sitios, igual que las alineaciones. Es la **segunda instancia de la misma clase de defecto**: el motor no tiene ni `nodeAligns()` ni `nodeAttrs()`, y ambos hacen falta para cerrar Dictatorship 239 y Media Connections 310. La corrección es un par de helpers más la migración de los sitios duplicados; es trabajo de arquitectura del motor, no de clasificación.

### 30.7 Recomendación y backlog

**Global Power es el dato pendiente de mayor valor de toda la auditoría**, por tres motivos que se pueden medir: es una regla central del manual; la referencian **ocho** cartas del mazo; y su ausencia hace que las precondiciones de ayuda, oposición y defensa del motor sean **incorrectas** para los grupos que la tengan. Le sigue en valor el campo **`O` (flechas de salida)**, porque el motor tiene un 3 hard-codeado. Ambos se resuelven con una sola descarga de la base de datos de Hicken cuando vuelva la red, y ambos se pueden **bloquear con pruebas hoy** para que ningún lote futuro clasifique contra un dato inexistente.

Backlog tras este lote: **324 cartas siguen `unverified`**; Bodyguard 208 y Talisman 382 bloqueadas por P1-016 (ventana de reacción); Dictatorship 239 bloqueada por el defecto de alineaciones; Hidden Influence 280, Media Connections 310 y Purge 348 bloqueadas por P1-DATA-03; Head in a Jar 277 bloqueada por P1-016 más dos mecánicas ausentes. Siguen pendientes la decisión de si la ficha Illuminati puede pagar ataques, la re-verificación de las ramas `requireAttr:'coastal'`, un gate de cobertura que verifique que `unverified` decrece monótonamente, y Fase 3 (UX, onboarding y comprobación del DOM en navegador real).
## 31. P1-018 / P1-019 — El gate de cobertura de la Fase 4, y dos defectos que encontro

### 31.1 Que problema resuelve `test_fase4_cards.js`

Clasificar cartas tiene un riesgo que ninguna otra prueba cubria: que el dataset diga "el motor sabe hacer esto" cuando no. El motor sigue compilando, el jugador recibe "tiene una mecanica no implementada", y nada falla hasta que alguien juega esa carta. Las tres formas de mentira que el gate convierte en invariantes ejecutables:

1. **Una carta clasificada sin rama en el motor.** Las familias +10, Power Increase y Resistance Increase tenian su `case` escrito y CERO cartas (§26.1, §27.1). El caso inverso tambien importa: si alguien clasifica 30 cartas con un `kind` nuevo y olvida el `case`, el dataset miente.
2. **Una rama sin cartas.** `case 'zap':` y `case 'paralyze':` son inalcanzables porque no hay ninguna carta de esas familias (§25.5). Eso estaba declarado en prosa; ahora esta en una lista con su justificacion, `DEAD_BRANCHES`, mas `nwo` como etiqueta historica.
3. **Un calificador imposible.** Una carta puede estar perfectamente clasificada y ser injugable si el mazo no tiene ningun objetivo que cumpla su filtro. La seccion 4 verifica `targetAlign, targetAttr, requireAttr, rejectAttr, churchAttr, requireActionFromAttr, targetSubtype, targetSubtypes, requiresActionFrom, mayAddPowerFromAligns, value` contra el mazo real en cada ejecucion.

Ademas fija dos invariantes de progreso, declara los siete bloqueos documentados como lista congelada (`BLOCKED_CARDS`), y declara los cuatro Groups sin texto. Medida final: **66 cartas clasificadas, 182 Plots y Resources sin mecanica, 3 ramas muertas declaradas, 7 cartas bloqueadas, 4 huecos de texto.**

### 31.2 P1-018 — BUG REAL DE MOTOR: `hasAnyAlign` solo miraba `c.alignments`

Encontrado por el gate en su primera corrida, no por una prueba que fallara. `Poison` (338) declara `mayAddPowerFromAligns: ['criminal','magic']` y `Withering Curse` (416) declara `['magic']`. Sus textos impresos dicen literalmente:

> "One *Magic* group may use its action to add its Power to this attack"

En este juego **`magic` NO es una ideologia: es un ATRIBUTO**. Hay **9 grupos** con el atributo `magic` (Druids, Ninjas, Reformed Church of Satan, Rosicrucians, Stonehenge, Templars, Vampires, Voudonistas, W.I.T.C.H.) y **CERO grupos** con la alineacion `magic`. Como `hasAnyAlign()` solo recorria `c.alignments`, esa clausula era **codigo muerto** en ambas cartas: el jugador nunca podia usar esa parte de la carta.

Es la **tercera aparicion de la misma clase de defecto**: la palabra impresa es real, pero el dato vive en otro campo. Las dos anteriores fueron los AND/OR de `bonusTargetMatches` y de `doubleQualifies`. El arreglo comprueba las dos listas —las 10 ideologias y el vocabulario oficial de atributos— y un nombre que no sea ninguna de las dos sigue sin coincidencia, que es el comportamiento correcto.

Verificacion empirica con una sonda: jugador Bavarian, un grupo Magic con ficha plantado, victima Al Gore. `Poison` → Poder **9** = 8 impreso + 1 del grupo Magic. `Withering Curse` → Poder **11** = 10 impreso + 1.

### 31.3 P1-018 (segunda parte) — `res.notes` nunca se adjuntaba al resultado

Al escribir la regresion anterior aparecio un segundo defecto, de observabilidad. `resolvePlotInstantAttack()` calcula un array `notes` que explica cada modificador ("+1 de Rosicrucians", "+5 de defensa de Shangri-La"), pero **solo lo escribia en el log cuando el ataque devastaba**. En todos los caminos de fallo —que son la mayoria, porque los Instant Attacks se lanzan contra objetivos defendidos— las notas se perdian. El comentario de la funcion promete "un resultado trazable": sin esto no lo es. Ahora `res.notes` se adjunta al resultado.

### 31.4 P1-019 — La metrica de "pendientes" estaba mal desde el principio

La primera version del gate media `pending` como "toda carta cuyo kind es `unverified`, `ability_unverified` o vacio". Eso contaba los **167 Groups del mazo**, pero **un Group normal no tiene mecanica alguna: es plenamente jugable**. El numero real de cartas a la espera de mecanica son **182 de 236**: 147 Plots y 35 Resources. Motivo mecanico: `mechanicsStatus()` de `gen_cards.js` devuelve `'unverified'` para los kinds `plot_generic|resource_generic|unverified`, y un Group sin efecto cae por el mismo camino.

Consecuencia documental: **todas las cifras "324/320/321 unverified" de §26 a §30 hay que leerlas como "cartas con el status unverified", no como "cartas sin mecanica"**. El gate mide ahora `pendingPlr` con su propio techo, `MAX_PENDING_PLR = 182`.

### 31.5 Cinco defectos del PROPIO gate, ninguno de motor

1. `KINDS_SEEN` se construia solo desde las cartas clasificadas, asi que las 7 cartas Goal (status `source-text-unmapped`, kind `goal`) no contaban y `case 'goal':` aparecia como **rama huerfana**. El kind de una carta existe aunque su status no sea de implementado.
2. Las secciones 1 y 5 trataban el status `implemented` como "carta clasificada que necesita rama". La unica carta con ese status es **Vatican City (161)**, un Group normal con `effect: null` — correcto. Solo `implemented-pending-engine` e `implemented-special` necesitan rama.
3. La seccion 6 marcaba las 7 cartas Goal. `source-text-unmapped` + `kind: 'goal'` describe exactamente el estado mixto de §24.2 (3 condiciones de victoria implementadas, 4 modificadores pendientes), asi que la seccion admite `goal` con esa justificacion.
4. `pending` incluía el kind vacio de Vatican City.
5. La seccion 4 comprobaba `mayAddPowerFromAligns` solo contra ideologias — la misma suposicion equivocada que P1-018, esta vez **en el gate**. Habria declarado INJUGABLE una carta perfectamente jugable. Ahora comprueba las dos listas y avisa de los nombres que no son ni ideologia ni atributo.

### 31.6 Cuatro Groups sin texto mostrable (nuevo hallazgo de datos)

California (15), Margaret Thatcher (86), Ollie North (103) y Vatican City (161) tienen `text` y `ocrText` de **0 caracteres**, pero conservan `referenceText` de 126 a 155 caracteres: el OCR les fallo y la fuente de referencia los conserva. La UI no puede mostrar nada para ellas. Se declaran en `KNOWN_TEXT_GAPS` con su motivo para que la lista no crezca sin una decision consciente.

### 31.7 Novena recurrencia: `startGame()` aleatoriza quien empieza

La regresion de P1-018 fallo **7 de 8 corridas** en su primer intento, con numeros que no cuadtaban por +4 y por +5. Causa: mi fixture fijaba las facciones por indice (jugador 0 Bavarian, jugador 1 Servants of Cthulhu) y luego usaba `currentPid` como "el jugador evaluado". Cuando el jugador activo-resultaba ser el de Cthulhu, su "+4 a cualquier destroy" de P1-009 contaminaba todas las medidas. El arreglo es buscar al jugador Bavarian **explicitamente por faccion**, igual que hacen los bloques P1-013 y P1-014. 8 de 8 limpias tras el arreglo.

### 31.8 Verificacion

`node --check` limpio en `test_fase4_cards.js` y `game/js/engine.js`. Barrido CJK y cirilico del propio gate: **0 caracteres sospechosos**; se corrigieron tres Tokens de basura que el propio archivo arrastraba ("repeatedly classrooms ... racted", "hadesklasificado", "Guidretrocedido"), undécima ocurrencia de la clase de contaminación del generador. El gate se registró en `scripts/run_tests.cjs`, con lo que la suite pasa de 9 a **10**. `npm test` → **ALL TESTS PASSED (10)**.

### 31.9 Que queda, y por donde seguir

Con este gate, "seguir lotes hasta agotar el texto mecanico" deja de ser una sensacion y es una cifra medible. La situacion real: **182 Plots y Resources sin mecanica**, de los cuales una parte grande NO esta bloqueada por falta de texto, sino por los tres subsistemas que ya estan documentados:

- **P1-017 `nodeAligns()` / `nodeAttrs()`** — desbloquea Dictatorship 239 y Media Connections 310, y es el unico camino para cualquier carta que cambie alineaciones o atributos.
- **P1-016 ventana de reaccion** — desbloquea Bodyguard 208, Talisman 382 y Head in a Jar 277.
- **P1-DATA-03 Global Power** — desbloquea Hidden Influence 280 y Purge 348, y es el dato pendiente de mayor valor de toda la auditoria porque es una regla central que hace incorrectas las precondiciones de ayuda, oposicion y defensa.

Recomendacion: **P1-017 es el siguiente paso**, porque es subsistema de motor puro (no depende de datos que no tenemos) y por cada helper que se migre se desbloquean cartas Y se elimina una lectura de la carta inmutable, que es la raiz comun de la clase de defecto mas repetida de esta auditoria.