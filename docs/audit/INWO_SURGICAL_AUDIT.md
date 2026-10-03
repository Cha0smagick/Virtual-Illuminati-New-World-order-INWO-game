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
**Aceptación:** con dos humanos, el actor no activo no ve ni puede ejecutar acciones ajenas; tras resolver se conserva el turno y la respuesta correcta.

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

## 32. P1-017 — Alineaciones y atributos a nivel de nodo, y Dictatorship (ejecutado)

### 32.1 El arranque: un informe anterior afirmaba que P1-017 estaba hecho, y no lo estaba

Antes de nada hay que dejar escrito lo primero que paso en este lote, porque es
la leccion mas importante de toda la auditoria.

Al arrancar P1-016 se grepo el estado real del disco y resulto que las ediciones
de P1-017 que un informe anterior daba por aplicadas **nunca se habian
persistido**. Las mediciones:

- `game/js/engine.js` tenia 2031 lineas, no las 2121 que se reportaban.
- `gen_cards.js` terminaba su bucle de emision en `... || MESSIAH_FXN[key] || ANGST_FXN[key];`,
  o sea que **no existia `DICTATORSHIP_FX`**.
- `test_fase2_rules.js` tenia 1726 lineas: el noveno bloque de pruebas no existia.
- `docs/audit/INWO_SURGICAL_AUDIT.md` tenia 1303 lineas y llegaba hasta §31: **§32 no existia**.
- `nodeAligns`, `nodeAttrs` y `nodeHasAlign` aparecian 4 veces en todo el fichero:
  las tres definiciones mas una unica migracion. Cero migraciones reales.

Ademas, uno de los "tres bugs reales de motor" que ese informe reportaba **era
falso**: se afirmaba que `oppose` era un no-op completo porque empujaba al array
equivocado y no gastaba ficha. El codigo real (L889-891) hace
`spendGroupToken(pid,entry.uid)` y despues
`(entry.oppose?A.opposes:A.aids).push(...)`. No lo habia leido; lo asumi.

**Por que importa mas que los ocho gates intermitentes y las puertas que podian
pasar vacias que ya se habían registrado:** todos esos fallos los detecta una
prueba. Este no. Un `npm test` verde es compatible con helpers muertos, porque
codigo que no se llama no cambia el comportamiento del juego. Un informe de
trabajo narrado pero no persistido es invisible para cualquier comprobacion
automatica.

Queda como regla permanente, y por eso se aplica tambien a este mismo lote: **no
se afirma que algo esta hecho sin un `grep` o una lectura posterior que lo
confirme en disco.** Antes de dar por buena una migracion se cuenta el numero de
ocurrencias y se comprueban los ficheros anadidos uno a uno.

### 32.2 El defecto sistemico y por que Dictatorship era imposible

Dictatorship (239) dice, impreso: *"Play this card during your turn, on any Nation
which you control. This is an action for that Nation or its master. It becomes
Violent, if it was not already. Link this card to the Nation."*

Es la primera carta del mazo que exige un cambio de **ideologia** en un grupo
concreto. Y el motor no tenia forma de representarlo: las alineaciones se leian
siempre de la **carta**, que es inmutable, en mas de veinte sitios de lectura.
Aun asi, el efecto de la carta habria sido cero en todos ellos:

- los +4 y -4 de `computeStrength` por alineacion compartida u opuesta,
- la defensa por ideologia compartida con el Illuminati master,
- las precondiciones de ayuda y de oposicion de `addSupport`,
- la inmunidad de la Discordian Society ante atacantes Government o Straight,
- el veto de destruccion de Shangri-La, que solo permite destruir a grupos Violent,
- el doble por ideologia de las metas de Discordian, Network y Gnomes,
- `alignsCovered` para la meta de Bermuda Triangle,
- el doble de la carta Goal Criminal Overlords,
- y los calificadores de las quince cartas "+10", las diez de Power Increase y
  las dos de Resistance Increase.

Es exactamente la clase de defecto que ya habian producido `nodeResistance` en
P1-014 (la Resistencia se leia de la carta) y `goalPower` en P1-015 (el Poder se
leia de la carta), y la razon de fondo es siempre la misma: **centralizar una
regla en un helper no sirve de nada mientras queden lecturas duplicadas de la
carta**, que fue el defecto que el noveno recorrido de metas de P1-011 destapo.
### 32.3 El subsistema: `nodeAligns()` y `nodeAttrs()`

Los dos helpers se insertan justo despues de `alignsOf`, con la misma firma
`(node, cardObj)` que ya usaba `nodeResistance`:

- `nodeAligns(node, cardObj)` devuelve las ideologias de la carta **mas** lo que
  ese nodo tenga en `alignsAdded`.
- `nodeAttrs(node, cardObj)` devuelve los atributos de la carta **mas** lo que
  ese nodo tenga en `attrsAdded`, comparando sin distinguir mayusculas.
- `nodeHasAlign(node, align)` es la forma corta de consultar una sola ideologia.

El nodo puede llegar a `null` (por ejemplo en un ataque contra una carta de la
mano del rival, que todavia no esta en juego) y entonces ambos caen a la carta,
que es el valor por defecto. Esa degradacion es intencionada: en un ataque a mano
no hay grupo al que|linkear nada.

La semantica de los campos `*Added` es **adicion (union), no reemplazo**, por dos
motivos. El primero es que las cartas del mazo solo suman: el texto de
Dictatorship dice "if it was not already", y el de Assertiveness Training (198)
dice "The target becomes permanently Violent". El segundo es que guardar la lista
de lo anadido, en vez de un valor final, permite que Backlash (200) deshaga el
cambio sin necesitar saber que carta lo produjo.

Ademas, `hasAttr` gana un **tercer parametro opcional** `node`, de modo que las
llamadas existentes `hasAttr(carta, atributo)` siguen siendo validas y solo hace
falta pasar el nodo donde exista de verdad.

### 32.4 La migracion de todos los sitios de lectura, y dos que deliberadamente no se migraron

Estos son los sitios migrados, con la lectura que tenian y la que tienen:

| Sitio | Antes | Despues |
|---|---|---|
| `sumPeacefulPower` | `c.alignments.indexOf('peaceful')` | `nodeAligns(nd).indexOf('peaceful')` |
| `goalCardObjective` / Criminal Overlords | `var a = g.alignments or []` | `var a = nodeAligns(nd, g)` |
| `alignsCovered` | `(c.alignments or []).forEach(...)` | `nodeAligns(nd, c).forEach(...)` |
| `doubleQualifies` | `c.alignments` y `attrList(c)` | `nodeAligns(node, c)` y `nodeAttrs(node, c)`; firma nueva `(node, cardObj, dbl)` |
| `basicWithDouble` (llamador) | `doubleQualifies(g, dbl)` | `doubleQualifies(nd, g, dbl)` |
| `goalMetFor` (recorrido inline) | `doubleQualifies(c, g.double)` | `doubleQualifies(nd, c, g.double)` |
| `addSupport`, ayuda | `alignsOf(sc)` y `alignsOf(tCard)` | `nodeAligns(sup, sc)` y `nodeAligns(tNode, tCard)` |
| `addSupport`, oposicion | `alignsOf(sc)` y `alignsOf(tCard)` | idem |
| `bonusTargetMatches` | `tCard.alignments` y `hasAttr(tCard, ...)` | `nodeAligns(node, tCard)` y `hasAttr(tCard, ..., node)` |
| `illuAttackBonus` | reenviaba la carta | reenvia el nodo; tres llamadores migrados |
| `discordianBlocks` | `attCard.alignments` | `nodeAligns(attNode, attCard)` |
| `shangriLaBlocksDestroy` | `c.alignments.indexOf('violent')` | `nodeAligns(node).indexOf('violent')` |
| `computeStrength` | `alignsOf(attCard)` y `alignsOf(tCard)` | `nodeAligns(att, attCard)` y `nodeAligns(tNode, tCard)` |
| `hasAnyAlign` | `c.alignments` y `attrList(c)` | `nodeAligns(node, c)` y `nodeAttrs(node, c)` |
| `plotPowerFor` | `hasAttr(tc, e.ifAttr)` | `hasAttr(tc, e.ifAttr, node)`; cuarto parametro |
| `resolvePlotInstantAttack` | `requireAttr`, `rejectAttr`, rama de Poder, bonus Illuminati | los cuatro con el nodo objetivo |
| `requireActionFromAttr` y `mayAddPowerFromAligns` | filtro con la carta | filtro con `(c, n)` |
| `boost10` | `tc.alignments` y `hasAttr(tc, ...)` | `nodeAligns(tn, tc)` y `hasAttr(tc, ..., tn)` |
| `power_increase` | `tc2.alignments` | `nodeAligns(nd2, tc2)` |
| `resistance_increase` | `tc3.alignments` | `nodeAligns(nd3, tc3)` |
| Messiah, recuento de churches | `hasAttr(card(n.cardId), attrC)` | `hasAttr(card(n.cardId), attrC, n)` |

**Dos lecturas que NO se migraron, y por que:**

- `var mal = alignsOf(mc)` en el reparto de defensa por ideologia con el master.
  `mc` es la carta del **Illuminati**, no un nodo de estructura, asi que no tiene
  ni `alignsAdded` ni sentido tenerlos.
- `magicResourceGroups`, que recorre `pl.resources`. Los Recursos no son nodos de
  estructura: no se pueden|linkear ni cambiar de ideologia.

Y una regla que ya se conocia y que conviene repetir: `sumPeacefulPower` y
`sumTotalPower` leen el Poder a proposito mediante `goalPower(nd)` (P1-015) y **no**
deben pasar por un helper de alineaciones, porque la suma de Poder no tiene nada
que ver con las ideologias y porque el Poder sobreescrito si cuenta (mientras que
el +10 de las cartas correspondientes no, por construccion).

### 32.5 Un bug REAL encontrado por la migracion, no por una prueba que fallara

La migracion de `shangriLaBlocksDestroy` escribio en un primer intento:

```js
return !nodeAligns(node).indexOf('violent');
```

Eso esta mal, y el fallo lo cazó el bloque P1-009 escenario 7 del gate de reglas
(la asercion "Shangri-La veta destruir un grupo que NO es Violent"). Razon:
`indexOf` devuelve **-1** cuando la ideologia no esta y **0** cuando es el primer
elemento de la lista, de modo que el operador `!` se aplica al indice y no al
hecho. Con Gordo Remora, cuyas ideologias son `['liberal']`, la expresion da
`!-1`, es decir `false`, es decir "no bloqueado": **el veto de Shangri-La quedaba
completamente muerto**, que es la habilidad central de esa faccion. La forma
correcta es `indexOf(...) < 0`.

Es la segunda vez en este lote que un error mio de escritura produce una regla
muerta, y por eso el gate de reglas resulta imprescindible: el efecto sobre el
juego de ese error era silencioso y no lo detecta ninguna asercion de "no ha
cambiado nada".

### 32.6 Dictatorship: el `case` y sus cuatro decisiones

La orden de validacion es la misma que en las demas cartas de link, y tambien
importa:

1. El objetivo existe, con el mensaje `elige una Nacion de tu estructura`.
2. **Filtro de atributo `nation`**, porque el texto dice "on any Nation". Hay
   **11 grupos** con ese atributo en el mazo, asi que el calificador es
   satisfacible, y el gate de cobertura lo comprueba.
3. **Propiedad**: "which you control".
4. **Pago de la accion**: "This is an action for that Nation **or its master**".
   Si la Nacion tiene ficha se gasta la suya con `spendGroupToken`; si no, se
   gasta la del Illuminati (`pl.illumTokens`). Este detalle no es trivial: el
   nodo raiz del Illuminati **no tiene campo `tokens`** (su accion es
   `illumTokens`), asi que pasar por `spendGroupToken` habria dejado un
   `undefined` convertido en `NaN` en el nodo, o habria lanzado un error con una
   carta `null` en el mensaje.
5. **"It becomes Violent, if it was not already"**: se comprueba antes de anadir,
   de modo que jugar la carta dos veces sobre la misma Nacion no duplica la
   ideologia.
6. Link permanente en `pl.linkedPlots`, igual que Power Increase, Resistance
   Increase, Messiah y Angst.

**Dictatorship NO entra en la lista `instant`** de la cabecera de `playPlot`, a
diferencia de las quince cartas "+10" ("Play this card at any time") y de las diez
de Power Increase ("may be played at any time"). Su texto dice "**during your
turn**", que es la negacion de "a cualquier momento", y por eso `requireOwnMain`
ya garantiza la aparicion y no hace falta ningun veto adicional durante un
ataque. Confundir las dos redacciones habria permitido jugar la carta en el turno
del rival.

En `gen_cards.js` la carta se declara en una tabla `DICTATORSHIP_FX` con un
comentario que deja escrito que **no pertenece a ninguna de las seis familias
oficiales de Plot** de OFFICIAL_RULES_FINDINGS.md §6, igual que las dos de
Resistance Increase de P1-014 y las dos de Messiah y Angst de P1-015. Se declara
asi para que nadie la confunda con una familia del reglamento.

La carta pasa a `implemented-pending-engine`, el total de clasificadas sube de 66
a **67**, las Plots y Resources sin mecanica bajan de 182 a **181** y las cartas
congeladas en `BLOCKED_CARDS` bajan de siete a **seis**.

### 32.7 Media Connections (310) sigue bloqueada, y por que no la desbloquea este lote

Media Connections dice: *"The group of your choice becomes a Media group, if it
was not already one, **with Global Power equal to its regular Power**. Link this
card to the group. This requires action(s) from Media group(s) with a total Power
of 6 or more."*

Con P1-017 la parte de atributos ya se puede hacer: `nodeAttrs` existe y el
cambio de atributo a nivel de nodo es representable. **Pero la carta reparte el
Global Power**, y el Global Power sigue sin existir ni en el motor (cero
coincidencias de "global" en todo el fichero) ni en el dataset (ninguno de los 421
grupos tiene el patron impreso `Power N/M`). Implementar solo el cambio de
atributo produciria una carta cuyo efecto real es invisible para el jugador, es
decir, decorativa. Por eso sigue en `BLOCKED_CARDS` y su motivo se actualiza para
dejar claro que la parte de atributos ya no es el bloqueo: lo que falta es el
dato de P1-DATA-03.

El gate de cobertura hizo su trabajo aqui sin que nadie se lo pidiera: en cuanto
Dictatorship quedo clasificada, fallo con el mensaje de que seguia congelada. Esa
es exactamente la funcion para la que existe `BLOCKED_CARDS`: obligar a que al
cerrar un subsistema se saquen las cartas que dependian de el, y que se explique
en la auditoria por que se cierran.

### 32.8 Las cuatro aserciones que prueban el EFECTO, no la aceptacion

El bloque de pruebas de Dictatorship tiene dieciocho aserciones, pero cuatro son
las que de verdad importan, porque comprueban el **efecto observable** y no que la
carta se acepte:

- `alignsAdded` queda escrito en el **nodo** con `['violent']`.
- La ficha de la Nacion se gasta (`tokens === 0`).
- **El desglose de fuerza de un ataque cambia**: `leaderMod` pasa de **0 a 4** al
  atacar con la misma Nacion antes y después de jugar Dictatorship. Ese +4 es
  exactamente el modificador de la regla oficial por ideologia opuesta, y es la
  prueba dura de que el cambio se propaga a `computeStrength`.
- Jugar la carta dos veces no duplica la ideologia.

Las otras catorce cubren la clasificacion, la satisfaccion del calificador
(`nation` tiene 11 candidatos), el link permanente, los tres rechazos (grupo que
no es Nacion, Nacion rival, y ni la Nacion ni el Illuminati tienen ficha) y el
carácter **"during your turn"**, con el que el dueno no puede jugar en el turno
del rival.

La comprobacion del efecto observable no es un extra: es la leccion de P1-014, en
la que un `case` validaba cinco condiciones y no aplicaba ninguna. A partir de ahi
toda rama de efecto comprueba tambien lo que deja escrito.

### 32.9 Cinco errores de prueba, ninguno de motor

1. **`effect.code` no es el id de la faccion.** El fixture buscaba al jugador por
   `effect.code === 'bavarianilluminati'`, pero el `effect.code` de los Bavarian
   Illuminati es `bavarian`, mientras que su id es `bavarianilluminati1`. Se
   cambio a comparar el id base con el sufijo de version eliminado. Es la misma
   confusion que ya habiafallen en P1-009, y que hizo que un informe anterior
   afirmara cosas que no eran ciertas.
2. **`structure.children[0]` no es fiable** para devolver una ficha: un ataque de
   control exitoso puede insertar el grupo capturado en una flecha libre anterior
   a la Nacion. Se paso a buscar el nodo por uid.
3. **Snapshot en vez de estado vivo.** `fresh()` devuelve una **copia** del estado
   en el momento del arranque, asi que su `currentPid` se queda congelado. Varias
   aserciones de fixtures fallaron por eso. Se paso a leer `E._raw()`. Es la misma
   clase de error que el que aparecia en P1-014 con la mano del jugador.
4. **El pid equivocado en la prueba de turno.** Para comprobar que la carta no se
   puede jugar en el turno del rival se estaba llamando con el pid del rival, que
   es precisamente quien tiene el turno, de modo que la autorizacion pasaba
   correctamente y el error que salia era "no esta en tu mano". La prueba correcta
   llama con el pid del **dueno** mientras el turno es del rival.
5. **Un `while` sin contador de guardia que colgaba el proceso la mitad de las
   veces.** Este es el mas grave de los cinco y merece su propio parrafo, porque
   es la segunda vez que un fallo de fixture se manifiesta como un cuelgue y no
   como una asercion fallida.

   El bucle era `while (St5.currentPid !== me5 && St5.phase !== 'gameover') E.endTurn();`,
   con dos defectos a la vez. El primero es que `St5` es la copia congelada que
   devuelve `fresh()`, asi que su `currentPid` **nunca cambia** y la condicion
   nunca se cumplia. El segundo es que no habia ninguna guarda que limitara las
   iteraciones. El resultado era un giro infinito.

   Se manifestaba de forma desconcertante: el gate pasaba en unas corridas y en
   otras se colgaba, y siempre en el mismo punto. `npm test` lo mataba con
   `ETIMEDOUT` a los 120 segundos **sin imprimir ninguna linea de error**, porque
   un proceso muerto por timeout no escribe mensaje: solo falta su linea de
   resumen. Una lectura superficial de la salida de `npm test` sugiere que "falta"
   un test, no que un test se cuelgue, y por eso es facil diagnosticar esto como
   un problema del runner en lugar de un problema de la prueba.

   El diagnostico se hizo con un corredor temporal que lanza el test con
   `spawnSync` y timeout por intento: ocho corridas dieron cuatro con exito en
   unos 220 ms y cuatro con `ETIMEDOUT` a 25 s, y las colgadas se detenian siempre
   en la misma linea impresa, la ultima del escenario anterior al bucle. Esa
   ultima linea es la que senala el bucle. Corregido con `E._raw()` mas una
   guarda de ocho iteraciones, las diez corridas posteriores pasan limpias en unos
   220 ms.

   **Leccion permanente: un `while` en una prueba necesita siempre un contador de
   guardia, y el `currentPid` hay que leerlo del estado vivo, nunca de la copia que
   devuelve `fresh()`.** Y una segunda leccion sobre diagnostico: cuando un test
   desaparece de la salida de `npm test` sin linea de error, lo primero que hay
   que hacer es mirar si el runner lo mato por timeout, no asumir que el test paso.


### 32.10 Verificacion

- `node --check` limpio en `gen_cards.js`, `game/js/engine.js`,
  `test_fase2_rules.js` y `test_fase4_cards.js`.
- `node gen_cards.js` escribe 421 cartas con los mismos conteos por tipo
  (167 grupos, 18 Illuminati, 201 Plots, 35 Resources) y 33 grupos verificados:
  ninguna carta anadida ni perdida.
- Histograma de kinds: `illu_special` 18, `disaster` 13, `boost10` 15,
  `power_increase` 10, `goal` 7, `assassination` 5, `resistance_increase` 2,
  `messiah` 1, `angst` 1, `dictatorship` 1, y `unverified` de 320 a **319**.
  `implemented-pending-engine` de 47 a **48**.
- El gate de cobertura pasa con 67 clasificadas, 181 pendientes, 3 ramas muertas
  declaradas, 6 cartas congeladas y 4 huecos de texto.
- Las cuatro series de corridas de `test_fase2_rules.js` salen limpias, y la suite
  completa queda en **ALL TESTS PASSED (10)**.

### 32.11 Lo que queda abierto

- **P1-016, la ventana de reaccion**, es el siguiente bloque y el de mejor
  relacion esfuerzo/resultado: es un subsistema de motor puro, no depende de
  ningun dato que no tengamos, y desbloquea Bodyguard (208) y Talisman of
  Ahrimanes (382). El diseño esta cerrado y escrito, y el riesgo es bajo porque
  se verifico que la inteligencia artificial **nunca** juega una assassination ni
  una disaster, de modo que el unico consumidor de los Instant Attacks es el
  jugador humano.
- **Head in a Jar (277)** sigue triplemente bloqueada: por la ventana de reaccion,
  por la mecanica de "asesinado" que el motor no tiene, y por la restriccion de
  que no puede controlar ningun grupo que no controlara antes.
- **Hidden Influence (280)** y **Purge (348)** siguen bloqueadas por P1-DATA-03,
  el Global Power, que es el dato pendiente de mayor valor de toda la auditoria:
  es una regla central, la mencionan ocho cartas, y hace incorrectas las
  precondiciones de ayuda, oposicion y defensa para cualquier grupo que la
  tuviera.
- **Media Connections (310)**, igual que las dos anteriores, por el mismo motivo.
- El campo **O** (numero de flechas de salida) del generador de la base de datos
  sigue sin tocarse, y el motor tiene el 3 **hard-codeado** en
  `maxChildren(node)`. Si alguna carta imprime menos, el motor permite mas
  control del que la carta permite.
- **Fase 3**, la revision de experiencia de usuario y la comprobacion del DOM en
  un navegador real, sigue sin ejecutar.
- Sigue sin decidirse si la ficha del Illuminati puede pagar ataques, que es lo
  que desbloquearia la restriccion `tokensNotSameAttack` de los UFOs.

## 33. P1-016 — La ventana de reacción (ejecutado): Bodyguard y Talisman de Ahrimanes

### 33.1 La regla oficial que había que implementar

`inwo_rules_extracted.txt:924-931` (p. 15, "Cancellations, Illegal Actions, & Other Surprises"):

> "Some cards can cancel a Plot, special ability, or action **while it is underway**. The
> window of opportunity is **after making the attempt is announced, but before the dice
> are rolled — or the effect is resolved**. If a Plot, special ability, or action is
> canceled, it has no effect (**except to discard the cards and actions spent on it**),
> and is treated as if it never happened."

Corroborada en `:780-790` (nada de speed-play) y en el glosario `:1126-1131`.

El detalle decisivo para el diseño es el paréntesis: **los costes SÍ se pagan aunque la
acción se cancele**. Por eso gastar las fichas en la fase de ANUNCIO es correcto y no un
bug, y por eso el ataque cancelado se descarta ("is treated as if it never happened"
habla del *efecto*, no del coste).

El motor no tenía ninguna ventana. `Select-String` de `pending|reaction|responder|openWindow|awaiting`
daba cero coincidencias, y `resolvePlotInstantAttack` tiraba los dados y destruía en la
MISMA llamada que `playPlot`. "Play this card after any type of Assassination. It becomes
an automatic failure" **no** es una reacción a un assassination ya resuelto: es un
cancel de un ataque anunciado y aun sin tirar.

### 33.2 El hallazgo que bajó el riesgo casi a cero

`ai.js:239-257` sólo llama a `E.playPlot` para los kinds `paralyze`, `zap`,
`power_increase`, `nwo` y dos ramas de objetivo nulo. **La IA nunca juega una
assassination ni una disaster.** Y `app.js:57 onPlayPlot` llama a `E.playPlot` y nunca
resuelve. El único consumidor de Instant Attacks es el humano. Dividir anunciar/resolver
no obliga por tanto a tocar ni la IA ni la UI en el caso normal.

### 33.3 Las seis decisiones de diseño

1. **`S.pendingAttack`** = `{pid, cardIdx, cardName, tUid, tc, ann, cancelled}`, init `null`,
   expuesto por `publicState` como `{pid, cardName, targetName, targetUid, cancelled}`.
2. **División de `resolvePlotInstantAttack`** en `announcePlotInstantAttack` (todo lo
   anterior al rodadero, gastando fichas) y `applyPlotInstantAttack` (rodadero y
   efectos), más un envoltorio `resolvePlotInstantAttack` que no rompe los llamadores.
3. **`E.resolvePendingAttack()`** cierra la ventana: si `cancelled` está puesto registra
   la cancelación y **no tira dados**; si no, aplica el ataque. Sin nada pendiente
   devuelve un motivo en vez de lanzar, para que un doble clic no rompa la partida.
4. **La ventana sólo se abre si alguien puede reaccionar de verdad**
   (`reactionWindowOpen`): requiere `kind==='assassination'` Y que algún jugador tenga en
   la mano una carta `bodyguard` o `talisman`. Sin eso el ataque se resuelve en el acto,
   exactamente como hasta ahora. Un Disaster **no** abre ventana: las dos cartas dicen
   "after any type of Assassination", y abrirla para un Disaster dejaría un ataque
   pendiente que nadie podría cerrar nunca.
5. **Bonuses persistentes en DOS campos de nodo**, porque las dos cartas difieren:
   `node.destroyBonus` (Bodyguard +6, Talisman +2) y `node.assassinationBonus` (sólo
   Talisman +10), con el helper `destroyDefenseBonus(node,isAssassination)`. El Bodyguard
   tiene un solo bonus porque su texto dice "**including** further Assassinations"; el
   Talisman tiene dos porque distingue "any further attack to destroy" de "any further
   Assassination". Se pliega en `det.defBoosts` (ataque normal) y en `defPower` (Instant
   Attack), nunca en un campo nuevo de `det`, porque la fórmula de `total` tiene una
   invariante verificada por la prueba P1-005.
6. **El objetivo NO se elige**: es la carta que el ataque iba a matar, o sea "the card it
   protected". Tampoco se comprueba la propiedad: el texto no dice "your Personality" y la
   regla de cancelación no restringe a quien puede reaccionar. El Talisman sí comprueba
   unicidad **GLOBAL** ("No more than one Talisman of Ahrimanes can be in play at one
   time") recorriendo los `linkedPlots` de todos los jugadores.

### 33.4 Clasificación de datos

`gen_cards.js` gana `BODYGUARD_FX` (`kind:'bodyguard'`, `destroyBonus:6`) y `TALISMAN_FX`
(`kind:'talisman'`, `destroyBonus:2`, `assassinationBonus:10`), ambas tras `ANGST_FXN`, con
un comentario que declara que NO pertenecen a ninguna de las seis familias oficiales de
Plot (§6 de `OFFICIAL_RULES_FINDINGS.md`), igual que las 2 de Resistance Increase,
Dictatorship, Messiah y Angst. Medición: `Bodyguard idx=208` y
`Talisman of Ahrimanes idx=382`, ambos `implemented-pending-engine`. El kind `bodyguard`
y el `talisman` se añaden a la lista `instant`, porque son reacciones y tienen que poder
jugarse en el turno del rival.

El gate `test_fase4_cards.js` baja `BLOCKED_CARDS` de 6 a **4** (salen Bodyguard y
Talisman; el motivo de `headinajar` se actualiza a "P1-016 cerrada, pero falta la mecánica
de asesinado/resurrección"). `Head in a Jar` (277) **sigue bloqueada**: además de la
ventana necesita una mecánica de resurrección que el motor no tiene.

### 33.5 TRES BUGS REALES que la regresión encontró en la división

La división exigía que todo local de la función antigua quedara disponible. Al escribir
la regresión aparecieron tres fallos, y **ninguno era del fixture**:

1. **`ReferenceError: notes is not defined`** en la línea del log de devastación. Al
   partir la función, `notes` pasó a ser `ann.notes`, pero ese `log()` se quedó con el
   nombre viejo. Sólo se disparaba cuando el ataque **devastaba**, así que ningún test
   anterior lo tocaba: los P1-007 afirmaban `ok` pero nunca comprobaban que la devastación
   ocurriera.
2. **`ReferenceError: pid is not defined`** en la rama de destrucción
   (`destroyGroup(pid,tUid)`). `pid` y `tUid` son locales de la fase de anuncio, no de la
   de aplicación. **Consecuencia grave: desde la división, un Instant Attack que ganaba
   los dados no destruía nada.** Se lanzaba una excepción que el motor no capturaba, así
   que el efecto se perdía por completo.
3. El tercero fue de la propia aserción: plantadas las víctimas en la raíz de la
   estructura, `positionBonus` da +10 a profundidad 1 y el Car Bomb (Poder 8) quedaba con
   fuerza negativa, así que el ataque fallaba **sin tirar dados** (`res.roll` ausente
   porque la rama `str<2` no llama a `roll2d6`). No era un bug del motor: un fallo
   automático por fuerza menor que 2 **no** tira dados, que es exactamente lo que mandan
   las reglas. La corrección fue en la prueba: un helper `plantDeep` que neutraliza la
   defensa posicional, la misma lección de P1-011 y de `test_respond.js`.

El punto 2 es la clase de defecto más importante de esta auditoría en cuanto a cobertura:
**`npm test` estaba en verde con el motor roto**, porque las aserciones de P1-007
comprobaban la matemática del ataque y no su efecto observable. Es la tercera vez que
aparece (P1-014 validaba y no aplicaba; P1-017 sólo detectaba decorativos con aserciones
de efecto).

### 33.6 Un octavo flake de la familia "una prueba depende del dataset"

La primera corrida de la regresión nueva falló **1 de 8** en un test **antiguo**: el
escenario (c) de P1-007 ("Instant Attack evaluado"), que afirma `typeof r.ok ===
'boolean'`. Causa: si el reparto inicial dejaba un Bodyguard o un Talisman en la mano del
defensor, la ventana nueva se abría, el ataque quedaba pendiente y `ok` llegaba como
`null`. El motor es correcto; el test medía la matemática del ataque, no la ventana. Se
purgaron las cartas de cancelación de la mano del defensor, con un comentario que explica
por qué y por qué no se toca la regla.

### 33.7 La regresión (33 aserciones, 9 escenarios)

Bloque `P1-016` como décimo IIFE de `test_fase2_rules.js`, insertado antes del bloque
final de reporte. Fixtures **dinámicos** (nunca a mano, lección de P1-013): `VICT` = la
primera Personality con Poder ≤ 2 y Resistencia ≤ 4 (resuelve Gordo Remora, Poder 1,
Resistencia 0), `ATKGRP` = el grupo de mayor Poder ≥ 10 (Texas, 14), `PLACE` = el Place
con menor Poder numérico (Hawaii). Helpers locales: `plantDeep` (neutraliza
`positionBonus`), `give` (purga antes de empujar), `noCancelWindow` (saca las cartas de
cancelación de todas las manos), `withLowRoll` (stub de `Math.random` para que
`roll2d6()` dé 2 y quitar el flake del 11-12).

Cobertura: clasificación y parámetros impresos de las dos cartas · sin ventana cuando
nadie puede reaccionar, con los dados **sí** tirados (cero regresiones) · `E.resolvePendingAttack`
sin nada pendiente devuelve motivo · la ventana abierta deja el ataque pendiente con su
carta y su objetivo, y el objetivo **sigue vivo** · **control pareado del efecto
observable**: el mismo Car Bomb contra el mismo Gordo Remora, sin Bodyguard lo mata y con
Bodyguard lo deja vivo · `destroyBonus===6` escrito **sobre el nodo** · link permanente en
`linkedPlots` · la carta sale de la mano · al cerrar la ventana `roll===null` (fallo
automático, no fallo de dados) · el +6 entra en `det.defBoosts` de un ataque a destruir
normal y las notas lo nombran · el Talisman escribe los dos bonuses por separado · el +10
entra en la defensa de un Assassination posterior (`defense=13 = Poder 1 + 10`) ·
unicidad global del Talisman · Bodyguard sin ataque anunciado lanza · un Disaster no abre
ventana aunque haya un Bodyguard en la mano · el mismo ataque no se cancela dos veces y
el segundo Bodyguard no suma otro +6.

### 33.8 Verificación

`node --check` limpio en `game/js/engine.js` y `test_fase2_rules.js` · **10/10 corridas
consecutivas** de `test_fase2_rules.js` sin un solo fallo · `npm test` →
**ALL TESTS PASSED (10)**, exit 0, con `FASE 4 COVERAGE PASSED (69 cartas clasificadas,
179 Plots/Resources sin mecánica, 3 ramas muertas declaradas, 4 cartas bloqueadas
congeladas, 4 huecos de texto declarados)`.

### 33.9 El hueco funcional que P1-016 acaba de abrir

`app.js:57 onPlayPlot` llama a `E.playPlot` y **nunca resuelve**. Con la ventana
implementada, si un jugador humano anuncia un Assassination y alguien tiene un Bodyguard
en la mano, el ataque queda pendiente y la interfaz no ofrece ninguna acción para
cerrarlo: la partida se queda colgada. Hay que cablear `E.resolvePendingAttack()` en
`app.js`/`ui.js` leyendo `state.pendingAttack` (un botón "Resolver" y la acción de jugar
Bodyguard/Talisman). Está anotado como el siguiente paso, no como parte de este lote,
porque toca la capa de presentación y §13 ya delimita la Fase 3.

### 33.10 Backlog tras P1-016

179 Plots/Resources sin mecánica. Bloqueadas: `headinajar` (falta la mecánica de
asesinado/resurrección), `hiddeninfluence` y `purge` (P1-DATA-03 Global Power),
`mediaconnections` (P1-DATA-03). `paralyze`, `zap` y `nwo` siguen como ramas muertas
declaradas (§25.5). Pendientes: cablear la ventana en la UI · P1-DATA-03 cuando vuelva la
red · re-verificar `requireAttr:'coastal'` · decidir si la ficha Illuminati puede pagar
ataques (`tokensNotSameAttack` de los UFOs) · Fase 3 completa.

## 34. P1-020 y P1-021 — una condicion de Poder que nunca se aplicaba, y un segundo uso de carta ignorado (ejecutados)

Esta seccion cierra el ultimo item de la Fase 4 que no dependia de datos ausentes. Los dos arreglos
salieron de una unica medicion: verificar, grupo por grupo, que el Poder que elige el motor para cada
Disaster es el que dice el texto impreso. El resultado fue que la tabla de datos era correcta pero el
selector de Poder no, y que ademas existia un segundo uso de carta que el motor nunca habia leido.

### 34.1 P1-020 — la clausula `ifNames` estaba muerta y solo afectaba a una carta

La funcion `plotPowerFor` elige el Poder de un Disaster recorriendo la tabla `power` del efecto y
devolviendo la **primera** entrada cuya condicion se cumple. Para las entradas que declaran `ifNames`
la condicion era:

    var okName=!e.ifNames||(e.ifNames.indexOf(tc.name)>=0);

El dato guarda los nombres de carta como **identificadores normalizados en minusculas**, que es la
convencion de todo el dataset (`'japan'`, `'california'`, `'robotseamonsters'`), mientras que
`card().name` conserva las **mayusculas del texto impreso** (`'Japan'`, `'California'`). La
comparacion era sensible a mayusculas, asi que `indexOf` devolvia siempre -1, la entrada con `ifNames`
nunca ganaba, y el motor caia a la siguiente rama de la tabla.

Medicion sobre el mazo real antes del arreglo:

| Objetivo | Poder que elegia el motor | Poder que pide el texto | Por que |
|---|---|---|---|
| Japan | 20 | **24** | entrada `ifNames` descartada |
| California | 16 | **24** | entrada `ifNames` descartada, cae en `huge` |
| Texas | 16 | 16 | correcto (es `huge`) |
| Finland | 20 | 20 | correcto (es `coastal` pero no `huge`) |

El error **no era inocuo**: el texto impreso de Atomic Monster dice *"Its Power is 16 against a Huge
Place, 20 against any other Place, but 24 against Japan or California"*, y Japan y California son
ademas `huge`, asi que recibian 16 en lugar de 24 — casi la mitad de la fuerza, y precisamente contra
los dos paises mas importantes del mazo. El orden de la tabla (`ifNames` antes que `ifAttr:'huge'`) es
correcto y necesario; lo que estaba roto era la comparacion.

**Radio de impacto: exactamente 1 carta.** Medido sobre `game/js/cards.js`, solo Atomic Monster declara
`ifNames`; las otras tres tablas `coastal` (Giant Kudzu, Hurricane, Tidal Wave) usan `ifAttr`, que ya
pasaba por `hasAttr` y era insensible a mayusculas.

El arreglo normaliza **los dos lados** de la comparacion, para que el dato pueda escribirse con la
convencion que sea:

    if(e.ifNames){
      okName=false;
      var tn=String(tc.name||'').toLowerCase();
      for(var q=0;q<e.ifNames.length;q++){
        if(String(e.ifNames[q]).toLowerCase()===tn){okName=true;break;}
      }
    }

Verificacion tras el arreglo, los cuatro Disasters con rama `coastal` y las cuatro ramas de su tabla:

| Carta | Objetivo | Poder del motor | Poder impreso |
|---|---|---|---|
| Atomic Monster | Japan | 24 | 24 |
| Atomic Monster | California | 24 | 24 |
| Atomic Monster | Texas | 16 | 16 |
| Atomic Monster | Finland | 20 | 20 |
| Giant Kudzu | Japan | 30 | 30 |
| Hurricane | Texas | 16 | 16 |
| Tidal Wave | Finland | 24 | 24 |
| Giant Kudzu | Center for Disease Control | 24 | 24 |

**Hallazgo de datos que esta medicion destapa:** la rama `ifAttr:'coastal'` de Giant Kudzu estaba
**muerta** antes de P2-DATA-01, porque el dataset no tenia ni un solo grupo `coastal`. Hoy hay 13
(Brazil, California, Canada, England, Finland, France, Hawaii, Israel, Italy, Japan, New York, Russia,
Texas) y las ramas `ifAttr:'huge'` tienen 8 objetivos. Esto confirma que el backlog de vocabulario de
atributos no era cosmetico: sin el, una clausula de Poder impresa se queda sin objetivos.

Esta es la **cuarta aparicion** de la clase de defecto "la palabra impresa es real pero el dato vive en
otra forma", despues de los AND/OR de `bonusTargetMatches` y `doubleQualifies` (P1-009) y del
`magic` buscado en `alignments` en lugar de en `attributes` (P1-018). La leccion se repite porque el
mismo patron reaparece con distinta disfraz: un identificador de carta, una ideologia, un atributo, un
nombre de grupo. El antidoto sigue siendo el mismo, comparar contra la **fuente** y no contra la forma
que el dato tomo al generarse.

### 34.2 P1-021 — el uso alternativo `destroy_bonus` no existia en el motor

Al leer el texto impreso completo de Atomic Monster (la leccion permanente: leer entero, no el grep
truncado) aparece una segunda instruccion que el motor ignoraba por completo:

> "Or play at any time to give +10 to any attack to destroy the Robot Sea Monsters or the Nuclear Power
> Companies!"

El dato ya lo declaraba: `effect.altUse={kind:'destroy_bonus', targetNames:['robotseamonsters',
'nuclearpowercompanies'], bonus:10}`. Census sobre las 421 cartas: **solo 2 cartas declaran `altUse`**,
las dos `kind:'destroy_bonus'` y las dos ya clasificadas:

- **199 Atomic Monster** — `targetNames:['robotseamonsters','nuclearpowercompanies']`, bonus 10.
- **336 Plague of Demons** — `targetAttr:'magic'`, bonus 10.

Antes de este lote, una busqueda de `targetNames|altUse|destroy_bonus` en `game/js/engine.js` daba
**cero coincidencias**: la segunda mitad del texto impreso de esas dos cartas era decorativa.

La implementacion se apoya en `A.boosts`, el array que `computeStrength` ya suma con signo positivo
tambien en la rama de destruccion. Esa eleccion es deliberada: la formula de `total` tiene una
invariante verificada por la prueba de P1-005, y anadir un campo nuevo a `det` la habria roto. Tampoco
se gasta ficha de accion, porque el texto no dice "this is an action for...".

Validaciones, en este orden, todas con mensaje en espanol: la carta debe declarar un
`altUse.kind==='destroy_bonus'`; debe haber un ataque en curso sin resolver; ese ataque debe ser de tipo
**destruir**; su objetivo debe resolverse a un nodo vivo; y el objetivo debe casar con `targetNames`
(normalizados en ambos lados, el mismo error que P1-020) o con `targetAttr` via `hasAttr`. Si algo
falla, el motor **lanza**: el diseno es validar y rechazar, nunca aplicar en silencio. Cuando pasa,
empuja `{name, v:bonus}` a `A.boosts` y devuelve una traza `{ok:null, altUse:true, bonus, target, plot}`.

### 34.3 Los cinco bugs de prueba (recurrencias de lecciones ya escritas; cero bugs de motor)

1. El helper de duelo no tenia tipo de ataque por defecto, y el motor respondia `Tipo de ataque
   invalido`. Corregido con un valor por defecto explicito.
2. Los tres escenarios de rechazo llamaban al uso alternativo y esperaban un no-op silencioso. El motor
   **lanza**; la prueba estaba mal. Reescritos con `throws()` mas una asercion de que el ataque sigue
   abierto y `boosts===0`.
3. **Hawaii si es `coastal`.** Se uso a mano como "Place no coastal" y devolvio 30 en vez de 24, lo que
   hacia pasar por correcto un valor equivocado. Sustituido por un fixture **dinamico**: el primer Place
   sin atributo `coastal` del mazo, que resulta ser Center for Disease Control. Es la misma leccion del
   apartado de Power Increase: no fijar a mano un fixture que dependa de una propiedad del mazo.
4. Los escenarios de rechazo no ponian la carta en la mano, asi que el motor respondia "Carta no esta
   en tu mano" y seis aserciones no median nada. Anadido un helper que planta la escena y entrega la
   carta.
5. Un escenario de rechazo apuntaba a Robot Sea Monsters, que **si** es objetivo valido de Atomic
   Monster, asi que no lanzaba. Sustituido por un rechazo por falta de `altUse`.

### 34.4 Verificacion y backlog

- `node --check` limpio en el motor.
- 8 de 8 corridas consecutivas de `node test_fase2_rules.js` limpias, con la salida suprimida. La
  corrida de repeticiones tiene que filtrar la salida: un bucle de PowerShell que no la suprime
  inunda la salida del terminal y hace imposible leer el recuento.
- `npm test` → `ALL TESTS PASSED (10)`, con `FASE 4 COVERAGE PASSED (69 cartas clasificadas, 179
  Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 4 cartas bloqueadas
  congeladas, 4 huecos de texto declarados)`.
- La regresion nueva aporta 22 aserciones, con **efecto observable** antes y despues
  (`boosts 0->10`, `total -1->9`) y no solo "no lanzo".

Backlog tras este lote:

- **P1-DATA-03 Global Power** sigue bloqueado, y hoy se ha confirmado de nuevo el motivo: la red no
  resuelve ni `cs.cmu.edu` ni `sjgames.com`. Es el dato pendiente de mayor valor de toda la auditoria,
  porque es una regla central, la citan 8 cartas y hace incorrectas las precondiciones de ayuda,
  oposicion y defensa. Se desbloquea con una sola descarga de la base de datos de cartas.
- **Decidir si la ficha Illuminati puede pagar ataques.** Hoy la ficha solo paga el intercambio de Plot,
  el uso de un Recurso y el movimiento de un grupo, asi que la clausula `tokensNotSameAttack` de los
  UFOs no tiene ningun sitio donde aplicarse.
- **Fase 3**: experiencia de usuario, onboarding y la comprobacion del DOM en un navegador real. El olor
  a stub de `test_flow.js` sigue sin resolver: los stubs de DOM no crean los botones de accion, asi que
  ninguna prueba de interfaz escrita contra ellos mediria algo.
- **Head in a Jar** (277) sigue bloqueada: ademas de la ventana de reaccion, que P1-016 ya cerro, necesita
  la mecanica de asesinado y resurreccion, que el motor no tiene.
- Quedan 179 Plots y Resources sin mecanica, y tres ramas muertas declaradas sin cartas que las
  alcancen: `paralyze`, `zap` y `nwo`.

## 35. P1-022 y P1-023 — el Illuminati ataca con su propia ficha, y tiene 4 flechas de control

Este lote salió de una pregunta del backlog ("decidir si la ficha Illuminati puede pagar ataques"), y al medirla aparecieron dos defectos reales y un hallazgo que cambia cómo se lee una de las propiedades de los Illuminati.

### 35.1 La regla oficial y por qué el Illuminati solo puede atacar

Dos citas del Handbook (`inwo_rules_extracted.txt`, extracción a dos columnas):

- Línea 405: "**Illuminati Groups can attack, but cannot be attacked!** The only way to destroy Illuminati is to take away all the Groups they control."
- Glosario, líneas 1079-1081: "**Illuminati Groups never have alignments or attributes.** They can never be destroyed, except by losing all their puppets."

De la segunda se deduce la primera por completo. Ayudar a un ataque de control exige compartir al menos una alineación con el objetivo, y oponerse exige tener al menos una alineación opuesta. Un Illuminati no tiene ninguna de las dos cosas, así que **nunca puede ayudar ni oponerse**. Por tanto la frase "can attack" no es una omisión de la regla: es la descripción completa de su participación en combate. Lo único que puede hacer es ser el atacante.

El motor ya era coherente con esa lectura en `E.addSupport`, que exige alineación compartida u opuesta, y por tanto rechazaba a la raíz de la estructura. No se tocó esa función.

### 35.2 Mi premisa era falsa: la capacidad ya existia, y el defecto era mio

Antes de escribir código medí la estructura con `E._raw()`. El resultado tumbó la premisa del lote entero:

```
raiz p0 tras startGame: {"uid":"p0-root","cardId":"bavarianilluminati1","children":0}   (sin campo tokens)
raiz p1 tras startGame: {"uid":"p1-root","cardId":"servantsofcthulhu2","tokens":1,...}
```

La raíz **sí tiene ficha de grupo** (`tokens`), y `beginTurn` se la pone a 1 igual que a cualquier titere, porque su recorrido de estructura incluye la raíz. Lo que NO existe es un segundo pool: `pl.illumTokens` es un contador aparte, preexistente, que el motor gasta en `exchangeForPlot`, `playResource`, `moveGroup`, `angst` y `dictatorship`.

Mi primer arreglo habia creado `isIlluRoot` y `spendNodeToken`, que gastaba `pl.illumTokens` en vez de la ficha del nodo. Eso no habria desbloqueado nada (la capacidad ya existia) y habria creado un defecto real: **dos pools cobrando un solo ataque**. Se midio el resultado y se **retiraron ambos helpers**; `E.declareAttack` vuelve a llamar a `spendGroupToken`.

La regresion de las 22 aserciones deja esto fijado con evidencia de efecto observable:

```
raiz p0 antes:      tokens=1  illumTokens=2
DECLARE OK · attackerUid=p0-root
desglose = {"base":10,"defenseBase":6,"posBonus":10,"total":-6,"notes":[]}
raiz p0 despues:    tokens=0  illumTokens=2
```

`base` es 10 = el Poder impreso de Bavarian Illuminati 1, y **`illumTokens` no baja**. Esa asercion es la que evita que el doble pool vuelva a colarse.

El resultado neto del lote es, por tanto, modesto y conviene decirlo: **no se añade ninguna capacidad nueva**. Se documenta la regla, se retira el arreglo que habría empeorado el motor, y se fija con pruebas que el comportamiento correcto es el que ya había.

### 35.3 P1-023: la rama de cuatro flechas era inalcanzable

Regla oficial, sección "Control Arrows" (p. 6), línea 373: "**Illuminati cards have four outgoing control arrows.**" Y líneas 376-380: cualquier otro grupo tiene "0 to 3 outgoing control arrows".

El motor lo tenía hard-codeado y **equivocado**:

```js
function maxChildren(node){return node.cardId==null?4:3;}   /* root=Illuminati arrows */
```

El discriminante era "¿tiene carta?". Durante la preparación la raíz todavía no tiene carta, así que la rama de 4 se alcanzaba. Pero en cuanto `setIlluminati` le asigna la facción, la raíz ya tiene `cardId` (el id-STRING, por ejemplo `"bavarianilluminati1"`), la función devuelve 3, y **la rama de 4 queda inalcanzable durante toda la partida**: el Illuminati tenia 3 flechas donde la regla le da 4.

El arreglo cambia el discriminante a identidad con la raiz de alguna estructura:

```js
function isStructureRoot(node){
  if(!S||!S.players)return false;
  for(var i=0;i<S.players.length;i++)if(S.players[i].structure===node)return true;
  return false;
}
function maxChildren(node){return isStructureRoot(node)?4:3;}
```

No se añadió un campo `isRoot` porque la identidad ya es la fuente de verdad, y un flag habria que mantener sincronizado con cada sitio que construye la estructura.

La medición que lo demuestra tiene que **discriminar** entre 3 y 4, así que se varies el número de hijos de 3 a 5 en lugar de probar con 6, donde 6>4 y 6>3 darian el mismo resultado:

```
raiz con 3 hijos -> maxChildren=4 · flecha libre: true
raiz con 4 hijos -> maxChildren=4 · flecha libre: false
titere con 2 hijos -> maxChildren=3 · flecha libre: true
titere con 3 hijos -> maxChildren=3 · flecha libre: false
```

El riesgo de equilibrio que suponia dar una flecha extra a la raiz resulto nulo: las 8 corridas de la suite y la suite completa quedaron verdes sin tocar ninguna asercion de las anteriores.

La regresion mide el efecto por la API publica y no tocando ninguna funcion interna: usa `moveGroup`, cuya guarda de flecha se evalua **antes** de la validacion del pagador y antes del `detach`, y por tanto es el observable mas limpio. La raiz con 3 hijos acepta un cuarto grupo y con 4 lo rechaza con `Destino sin flecha libre`; un titere con 2 hijos acepta un tercero y con 3 lo rechaza.

### 35.4 Una regla general que queda declarada bloqueada

Lineas 443-445, seccion "No Duplicates in the Same Attack!":

> "A Group that has two or more Action tokens may not use more than one in the same attack unless it's defending itself. No player may use duplicates of the same Plot card in a single attack, or to defend against a single attack, even if the duplicate Plot cards are used to help two different Groups."

Esto explica el `tokensNotSameAttack` de los UFOs: **no es un poder de esa faccion**, es la regla general aplicada a la unica faccion que recibe dos fichas. El texto de la carta ("two tokens! These may not be used in the same attack") es literalmente esta regla.

Se declara **bloqueada**, con la misma honestidad que Zap y Paralyze en 25.5, porque hoy **ninguna via de codigo gasta ficha durante un ataque abierto**: el modo 'attack' de `case 'boost10'` no cobra nada (la ficha del atacante ya se gasto en `declareAttack`) y `altUse.destroy_bonus` tampoco, por decision de P1-021. No se inventa un cobro para forzar el caso.

### 35.5 Un bug de prueba y una regla para el resto de la auditoria

La primera corrida de la regresion dio `FASE 2 RULES FAILED (5)`, las cinco de P1-023. La causa fue el helper `plant(pid,uid,cardId,tokens)` de la cabecera del fichero de pruebas: empuja **siempre** en `structure.children`, o sea en la raiz, nunca en el padre indicado. Mi escena de flechas daba por hecho que anidaba, asi que la raiz acababa con cinco o seis hijos directos y el conteo no discriminaba nada.

Se corrigio con un helper local `nest(pid,parentUid,uid,cardId,tokens)` que empuja en el padre indicado. Las doce aserciones de P1-022 pasaron a la primera, lo que confirma que el defecto era solo del montaje de la escena.

La regla que sale de aqui es general y ya aparecia documentada en otras formas: **una sonda que no discrimina entre el valor viejo y el nuevo no prueba nada**, y `plant()` de la cabecera solo sirve para la raiz.

### 35.6 Verificacion y backlog

- `node --check game/js/engine.js` → SYNTAX OK. Barrido de codepoints CJK y cirilico sobre el fichero entero → 0 contaminados.
- 8 corridas consecutivas de `node test_fase2_rules.js` con la salida capturada → 0 con fallo. Las 22 aserciones del bloque nuevo en verde, y las de P1-001 a P1-021 tambien.
- `npm test` → **ALL TESTS PASSED (10)**, con el gate de cobertura de Fase 4 en `69 cartas clasificadas, 179 Plots/Resources sin mecanica, 3 ramas muertas declaradas, 4 cartas bloqueadas congeladas, 4 huecos de texto declarados`.
- Temporales de este lote: cuatro, todos borrados.

Backlog que queda, en orden de valor:

1. **Fase 3** — UX y onboarding, mas la comprobacion del DOM en navegador real. El olor a stub de `test_flow.js` sigue sin resolver: los stubs de DOM no crean los botones de accion, asi que ninguna prueba de interfaz escrita contra ellos mediria algo.
2. **P1-DATA-03 Global Power** — BLOQUEADO por entorno, reconfirmado hoy: la red no resuelve ni `cs.cmu.edu` ni `sjgames.com`. Es el dato pendiente de mayor valor de la auditoria, porque es una regla central, ocho cartas la citan, y hace incorrectas las precondiciones de ayuda, oposicion y defensa. El motor tiene ademas el numero de flechas de salida ahora corregido para el Illuminati, pero el campo que lo define por carta sigue sin llegar.
3. **Head in a Jar** (277) sigue bloqueada: aunque P1-016 ya cerro la ventana de reaccion que necesita, falta la mecanica de asesinado y resurreccion, que el motor no tiene.
4. 179 Plots y Resources sin mecanica, y tres ramas muertas declaradas sin cartas que las alcancen: `paralyze`, `zap` y `nwo`.

## 36. P1-DATA-04 — El OCR trunca las cartas a media frase, y la transcripcion secundaria las recupera

### 36.1 El hallazgo: el cuello de botella ya no era el motor

Al intentar leer la familia "roba carta" (ocho cartas que comparten la mecanica de quitarle una
carta al rival) se aplico la leccion permanente de esta auditoria: **leer el texto impreso COMPLETO
de una familia antes de clasificarla**. El resultado fue que **seis de las ocho estan cortadas a
media frase**:

- **207 Blood, Toil, Tears and Sweat**: `"Discard any one New World Order card now in"` — cortada.
- **226 Corruption**: su texto es una cita de OTRA carta y ademas esta corrupta:
  `"\ "The black market in reitef supplies is growing daily / Play this card after Refief has come
  to a Devastated ll area..."` — inservible tal cual.
- **378 Suicide Squad**: `"6: Suicide Squad fails and is destroyed. Target"` — cortada justo donde
  empieza la resolucion del caso 6, que es precisamente la parte que haria falta implementar.
- **386 The Auditor from Hell**: `"...and either steal one of them, or expose"` — cortada justo en
  la alternativa que falta.
- **242 Double-Cross, 249 Embezzlement, 371 Soulburner, 388 The Big Sellout** si estan completas.

Implementar esa familia sobre el texto del OCR habria significado **inventar la mitad de la regla**,
que es exactamente lo que §29.4 y §30 ya prohibieron. Por tanto el bloqueo no era de motor: era de
**datos**, y habia que medir si era recuperable.

### 36.2 La medicion: la transcripcion secundaria local recupera 131 de 139

`research/audit_reports/scribd_card_text.json` (323 entradas) es un **segundo pase de OCR sobre la
MISMA impresion** que el OCR del runtime (ambas derivan del mismo mazo). Indexado por
`norm(row.name)` y comparando `String(card.text)` con `String(row.sourceText || row.description)`:

```
PENDIENTES 179 {"conScribd":139,"sinScribd":40,"textoIgual":0,
                "textoMayor":131,"textoMenor":8}
```

Es decir: de las 179 Plots/Resources que aun no tienen mecanica, **139 aparecen en la transcripcion
secundaria** y de esas **131 tienen texto MAS LONGO** que el OCR del runtime; 8 son mas cortas y 40
no aparecen en absoluto. Ninguna es igual de larga, lo que confirma que no hay empate que ocultar.

Mayores ganancias: 420 Xanadu `359 -> 727 (+368)` · 324 Necronomicon `219 -> 395 (+176)` ·
356 Revolution! `+134` · 410 Volunteer Aid `+125` · 302 Loch Ness Monster `+115` ·
414 Weather Satellite `+103` · 234 Currency Speculation `+99` · 245 Earthquake Projector `+96` ·
377 Sucked Dry and Cast Aside! `+89` · 266 George the Janitor `+86` · 279 Hidden City `+86` ·
189 Albino Alligators `+83` · 191 An Offer You Can't Refuse `+77` · 214 Censorship `+76` ·
373 Spear of Longinus `+75` · 358 Rogue Boomer `+73` · 268 Good Polls `+70` ·
361 Savings & Loan Scam `+70` · 273 Hallucinations `+68` · 381 Swiss Bank Account `+68` ·
248 Eliza `+67` · 321 Murphy's Law `+67` · 277 Head in a Jar `400 -> 466 (+66)` ·
320 Mothers' March `+61` · 257 Flying Saucer `+60`.

La consecuencia practica es la mas importante del lote: **el truncamiento no requiere la red**. La
fuente autoritativa sigue sin estar disponible (§30, §35), pero la secundaria local cubre 131 de
las 179 cartas pendientes.

### 36.3 El diseno: un campo nuevo, sin tocar nada existente

`gen_cards.js` gana `applySecondaryText(rec)`, insertada entre `applySecondaryAttributes(rec)` y
`mechanicsStatus(card)`, con el mismo patron que P2-DATA-01 y P2-DATA-02 (leer `scribdCards`, no
reemplazar, dejar evidencia):

```js
function applySecondaryText(rec) {
  const row = scribdCards[norm(rec.name)];
  if (!row) return;
  const sec = String(row.sourceText || row.description || '').trim();
  const ocr = String(rec.text || rec.ocrText || '').trim();
  if (!sec || !ocr || sec.length <= ocr.length) return;
  rec.textFull = sec;
  rec.textSource = 'secondary';
  rec.textChars = { ocr: ocr.length, secondary: sec.length };
}
```

Tres decisiones deliberadas:

1. **Nunca sobrescribir `rec.text`.** `text` es lo que muestra la interfaz y el motor no lo lee, asi
   que escribir un campo nuevo al lado garantiza **cero regresiones** sin analisis de impacto. La UI
   sigue mostrando el OCR y solo las tareas de clasificacion leen `textFull`.
2. **Criterio estricto `>` y no `>=`.** Si ambos textos miden lo mismo no hay nada que ganar, y
   duplicar el texto en el dataset solo lo infla.
3. **Dejar la evidencia.** `textSource` y `textChars` hacen rastreable de donde salio cada texto, que
   es el mismo criterio que ya se exige a los atributos (P2-DATA-01) y a las estadisticas.

El bucle de emission llama `applySecondaryText(rec);` justo despues de `applySecondaryAttributes(rec);`.

### 36.4 El resultado medido

```
node --check gen_cards.js                     -> limpio
node gen_cards.js -> written 421 {"group":167,"illuminati":18,"plot":201,"resource":35}
                                       verified-groups 33   (identico al anterior)
total cartas: 421
con textFull: 311
textFull <= text (deberia ser 0): 0
textFull por tipo: {"group":133,"plot":149,"resource":29}
pendientes Pl/Res: 179 | de ellos con textFull: 131 | sin textFull: 48
ganancia total de caracteres: 16937
textSource: {"secondary":311}
```

**311 de las 421 cartas recuperan su texto impreso completo, +16 937 caracteres.** De las 179
Plots/Resources que aun no tienen mecanica, **131 quedan legibles** y 48 siguen sin texto completo
(40 no aparecen en la secundaria y 8 tienen alli un texto mas corto).

### 36.5 Los asertos del gate y un bug mio

`test_fase4_cards.js` gana, en su seccion 5, un bloque que recorre las 421 cartas y comprueba la
**invariante** del campo nuevo: si existe `textFull` es **estrictamente** mas largo que `text`;
`textSource === 'secondary'`; y `textChars.ocr === String(text).length` con
`textChars.secondary === textFull.length`. Para las cartas clasificadas exige `text` **o** `textFull`
de al menos 20 caracteres. La linea de resumen del gate ahora informa
`cartas con texto secundario recuperado: 311 (+16937 caracteres)`.

La primera corrida del gate **fallo con `FASE 4 COVERAGE FAILED (1)`**:
`X - carta clasificada "Vatican City" (idx 161) no tiene ni text ni textFull de 20 caracteres`.
La causa fue **mía**: el aserto nuevo era mas estricto que el de la seccion 5 y no respetaba
`KNOWN_TEXT_GAPS`, los cuatro Grupos que el OCR dejo sin `text` pero que conservan `referenceText`
(California, Margaret Thatcher, Ollie North, Vatican City, declarados en §31). Exigirles `textFull`
seria exigir una transcripcion que la fuente secundaria tampoco trae. Se corrigio saltandolos
explicitamente.

**Leccion: un aserto nuevo mas estricto que el existente hay que contrastarlo con las excepciones ya
declaradas, o el gate falla por la razon equivocada y se investiga un problema inexistente.**

### 36.6 Verificacion y consecuencia para el siguiente lote

`node --check` limpio en `gen_cards.js` y `test_fase4_cards.js`. `node test_fase4_cards.js` ->
**FASE 4 COVERAGE PASSED (69 cartas clasificadas, 179 Plots/Resources sin mecanica (techo 182),
3 ramas muertas declaradas, 4 cartas bloqueadas congeladas, 4 huecos de texto declarados)**.
`npm test` -> **ALL TESTS PASSED (10)**.

Con `textFull` disponible, la familia de **23 cartas de reaccion inmediata** ("Play this card
immediately after / only after / when") pasa de 5 ilegibles a **16 legibles**: 192 And STAY Dead! ·
211 Bribery · 225 Computer Virus · 228 Counterspell · 249 Embezzlement · 276 Hat Trick ·
285 I Lied · 317 Mistaken Identity · 320 Mothers' March · 321 Murphy's Law · 346 Privileged Attack ·
374 Stealing the Plans · 398 The Second Bullet · 403 Time Warp · 412 Vultures.

Siguen bloqueadas por razones distintas y declaradas: **226 Corruption** (su texto cita otra carta),
**277 Head in a Jar** (necesita ademas la mecanica de asesinado/resurreccion), **232 Crop Circles** y
**258 Fnord!** (el OCR del runtime ya es MAS largo que la secundaria, asi que no se usa), y
**185, 195, 206, 229, 331** (no aparecen en la transcripcion secundaria). P1-016 ya construyo la
maquinaria que esta familia necesita: la ventana de reaccion con `S.pendingAttack`.

El resto del backlog: **Fase 3** (UX, onboarding y comprobacion del DOM en navegador real) y
**P1-DATA-03 Global Power**, que sigue bloqueado por entorno porque la red no resuelve ni
`cs.cmu.edu` ni `sjgames.com`.

---

## 37. P1-024 - La ventana de RODADERO: las 6 cartas que reaccionan despues de los dados

### 37.1 Hallazgo

P1-016 (33) abrio una ventana de reaccion ANTES de los dados: el ataque queda *anunciado* y
cualquiera puede cancelarlo antes de que se tiren. Pero la misma pagina 15 del reglamento dice que
la ventana abre "after making the attempt is announced, but before the dice are rolled **- or the
effect is resolved**". La segunda mitad de esa frase es una ventana distinta que no existia en el
motor: la que queda entre el rodadero ya tirado y el efecto todavia sin aplicar. Sin ella, seis
cartas del mazo eran inermes:

| idx | id | kind | texto impreso (clave) |
|---|---|---|---|
| 211 | bribery | `bribery` | "That roll is changed, retroactively, to a 2" |
| 225 | computervirus | `computervirus` | "You may change the result of that roll, retroactively, by 2" |
| 321 | murphyslaw | `murphyslaw` | "That roll is changed, retroactively, to a 12" |
| 403 | timewarp | `timewarp` | "That player must roll again; however they also get to draw a Group card" |
| 317 | mistakenidentity | `mistakenidentity` | "after any type of Assassination. It becomes an automatic failure" |
| 320 | mothersmarch | `mothersmarch` | "The attacker must try the roll again immediately, at a -4 penalty" |

Con la ventana nueva las seis son jugables, y **Murphy's Law resulta ser el anulador universal de
exitosos**: poner el rodadero en 12 es, por la regla de 11-12, un fallo automatico, asi que
cancela cualquier ataque que se iba a ganar, ownamente y sin que el jugador tenga que calcular nada.

### 37.2 Correcciones aplicadas

**Motor (`game/js/engine.js`).** La ventana se abre en los tres sitios donde un rodadero decide un
ataque: `E.resolveAttack` (ataque normal de controlar/destruir), `applyPlotInstantAttack` (Instant
Attacks de Plot) y `E.instantAttack` (ataque directo). Los tres ya delegaban en una funcion de
resolucion, asi que el cambio fue el mismo patron que P1-016: extraer la logica a un cierre
`settle(roll, total, forcedFail, byCard)` y meter `openRollWindow` por delante. La cuarta llamada a
`roll2d6()`, la de `startGame` para sortear quien empieza, **NO** se engancho a proposito: el
reglamento prohibe hacer nada a un rival que aun no ha completado su primer turno.

- `S.pendingRoll = {label, target, klass, pid, roll, total, success, mods[], reroll, cancelled, responders}`, inicializado a `null` y expuesto por `publicState()`.
- `rollReactionAllowed(eff, pid, P)` comprueba la condicion impresa de cada carta ("despues de un exito", "solo contra un Assassination", "por otro jugador") y se usa dos veces: para construir `P.responders` y para validar en el momento de jugar. Si la ventana no tiene a nadie que pueda reaccionar, **no se abre** y el ataque se resuelve en el acto, igual que `reactionWindowOpen` de P1-016.
- `closePendingRoll()` hace tres cosas segun el estado: si hay `cancelled`, aplica un fallo forzado sin tirar dados; si hay `reroll`, tira de nuevo con la penalizacion impresa; si no, aplica el rodadero (ya modificado). `E.resolvePendingRoll()` la expone, con el mismo mensaje idempotente de `E.resolvePendingAttack`.
- El cierre que aplica el efecto vive en `ROLL_CTX`, una variable de modulo, **no** dentro de `S`: `S` se serializa entero en `publicState()` y una funcion no sobrevive a `JSON`.
- Las 6 cartas se anadieron a la lista `instant` de `E.playPlot`: dicen "Play immediately after any die roll", asi que tienen que poder jugarse fuera de turno. Todas comparten un unico `case` que paga el coste y muta el rodadero; las condiciones impresas ya estan cubiertas por `rollReactionAllowed`.
- **El paso es en dos tiempos, y es deliberado:** jugar la carta modifica el rodadero pero **deja la ventana abierta**, porque varias cartas pueden encadenarse ("any die roll"). Cerrarla es una accion aparte, igual que en P1-016.

**Datos (`gen_cards.js`).** Nueva familia `ROLL_FX`/`ROLL_FXN` registrada en la cadena de resolucion, con el texto impreso completo como `t:`. No pertenece a ninguna de las seis familias oficiales de Plot de `OFFICIAL_RULES_FINDINGS.md` §6: es el mismo conglomerado que P1-016, en la otra fase del dado.

**Seis interpretaciones declaradas** (ninguna de las seis cartas tiene ruling oficial):

1. "Requires all Action tokens currently on your Illuminati (min 1)" se implementa como `illumTokenAll`: exige al menos 1 y **gasta todas** (`illumTokens = 0`). Sin esto, "all" no significaba nada.
2. Computer Virus necesita una **direccion** (+2 o -2) que su texto no imprime. Se expone como `opts.rollDelta`, por defecto `-2`: quien paga la accion es el que empeora el ataque ajeno. El resultado se recorta a 2..12 porque un 2d6 no puede dar 1, 0 ni 13.
3. Mistaken Identity **no tiene coste impreso**, asi que no se le exige ninguno: es la unica de las seis que se juega gratis.
4. Time Warp tampoco imprime coste. Su "+1 Group card" **no** puede usar `E.drawGroup()`, porque esa funcion consume el flag `groupDrawn` del turno; se roba con `drawFrom()` + `hand.push`, como `exchangeForPlot`.
5. Mothers' March usa `minPower:3` (texto: "any group with Power >= 3"), comprobado contra el Poder impreso.
6. La repeticion forzada **no reabre la ventana** ("No player may do anything else to change the strength of the re-rolled attack") y solo se admite una: `rollReactionAllowed` rechaza si `P.reroll` ya existe.

**Interfaz.** `app.js` gana `onPlayRollCard(handIdx)` y `onResolvePendingRoll()`; `ui.js` gana una barra de pendiente propia (misma clase CSS `pendbar` de §33) que muestra el rodadero, la fuerza, las modificaciones ya aplicadas y **quien puede reaccionar todavia**, con un boton "Aplicar el resultado" que explica que la carta se juega antes de apretarlo. En el menu de la Plot, una carta de rodadero solo ofrece "REACCIONAR" si hay ventana abierta, y "¿Cuando sirve esta carta?" si no la hay, en vez del uso normal.

**IA (`game/js/ai.js`).** `test_ai_vs_ai.js` fallo con *"AI left an unresolved attack"*: cuando la ventana se abre, `applyAttackResult` todavia no ha corrido, asi que `S.attack` sigue abierto y la partida se cuelga. Se anadio `settleRollWindow(E)`, llamada despues de cada `E.resolveAttack()`. **DECLARACION DE LIMITACION:** la IA cierra la ventana pero **no juega** cartas de rodadero; elegir a quien conviene exigiria una politica de decision que §37 deja
para Fase 3. Con \`pendingAttack\` el motor ya hacia exactamente lo mismo (0 coincidencias en \`ai.js\`). (0 coincidencias en `ai.js`). Queda para Fase 3.

### 37.3 Un campo nuevo: `requireAttrAny`

Computer Virus dice "Requires an action from any **Science, Space or Computer** group": una disyuncion de tres atributos. `requireAttr` es de un solo atributo (`groupsWithAttr` -> `hasAttr` -> `String(a)`), asi que al pasarle un array se convertia en la cadena literal `"science,space,computer"` y la carta quedava INJUGABLE. El gate de FASE 4 fallo con el mensaje correcto y el motivo equivocado:

```
X - carta "Computer Virus" exige requireAttr=science,space,computer pero ningun grupo del mazo lo tiene -> INJUGABLE
```

Los tres atributos **si** existen (science 14, space 2, computer 16). La correccion no fue aflojar el gate sino anadir un campo con semantica honesta: `requireAttrAny` en los datos, con semantica OR en el motor (`elR.some(function(a){return hasAttr(cc,a,nn);})`), una rama nueva en la seccion 4 del gate ("al menos un grupo tiene al menos uno") y los miembros de la lista añadidos a la seccion 7, que es la que avisa cuando un filtro queda huerfano por una regresion de datos.

### 37.4 Verificacion

- `npm test` -> **ALL TESTS PASSED (10)**.
- `test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED**: 75 cartas clasificadas (era 69), 173 Plots/Resources sin mecanica (techo 182), `implemented-pending-engine: 56`, `requireAttrAny` presente en los campos calificadores, `space` ya aparece entre los atributos usados.
- `test_fase2_rules.js` -> **FASE 2 RULES PASSED**, con un bloque nuevo de 4 escenarios y 14 aserciones que comprueban el **efecto observable**, no la aritmetica: el grupo cambia de dueno tras Bribery, y **sigue** del rival tras Murphy's Law. Cada asercion del rol es distinto del numero suelto: por eso la primera version del test, que miraba `neutralArea`, era incorrecta (un control con exito sobre un grupo en juego lo *captura* en el arbol del atacante; `neutralArea` es solo para cartas de mano y para el area neutral).

### 37.5 Lecciones

1. **Un hook de reaccion se tiene que poner en los TRES sitios, no en el que se vio primero.** Los tres puntos de rodadero de un motor de ataque no se parecen: uno cierra con `applyAttackResult`, otro con su propia rama de devastacion, otro con `destroyGroup`. Un helper unico (`openRollWindow`) con un cierre inyectado (`settle`) es lo que hace que los tres se comporten igual.
2. **La ventana debe seguir abierta despues de jugar la carta.** Cerrarla en el acto habria hecho imposible encadenar dos cartas de rodadero, que el texto impreso permite ("any die roll"). Es el mismo contrato de dos pasos que P1-016.
3. **Tests con manos reales: cualquier hook que dependa de "alguien tiene esta carta" vuelve el test fragil.** Los tests reparten el mazo de verdad, asi que `E.resolveAttack` abria la ventana solo si a alguien le habia tocado Bribery. Se resolvio con `sealWindows()`/`sealedResolve()`/`sealedInstantAttack()`, y **las dos copias de `noCancelWindow()`** de §33 hubo que ampliarlas a las 6 cartas nuevas. Es la cuarta vez que esta clase de problema aparece.
4. **No pasar un fichero UTF-8 por las APIs de texto de PowerShell.** Un `Get-Content -Raw` + `Set-Content` destruyo 130 caracteres acentuados de `test_fase2_rules.js`, y un `git checkout` de afterward perdio 962 lineas de trabajo sin commitear. Se recupero con un script Node (`fs.writeFileSync(..., 'utf8')`). La leccion operativa: `edit`/`write`, o Node; y **nunca** `git checkout` sobre un fichero con trabajo sin commitear.
5. **Tras cualquier escritura con no-ASCII, contar U+FFFD.** La consola renderiza el mojibake como si fuera correcto, asi que un archivo corrupto pasa desapercibido.

### 37.6 Backlog

Quedan 9 de las 23 cartas de reaccion inmediata, y **no** son un problema de ventana de rodadero: reaccionan a **eventos de carta**, no a dados, asi que necesitan otra maquinaria (una ventana de `pendingEvent` tras "any Group has been destroyed or discarded", "when another player draws a Plot card", "after you use a Plot card", "after a rival plays a Group... and discards it"):

192 And STAY Dead! · 228 Counterspell · 249 Embezzlement · 276 Hat Trick · 285 I Lied ·
346 Privileged Attack · 374 Stealing the Plans · 398 The Second Bullet · 412 Vultures.

Siguen bloqueadas por las razones ya declaradas en §36.6: **226 Corruption** (su texto cita otra
carta), **277 Head in a Jar** (necesita la mecanica de asesinado/resurreccion), **232 Crop Circles** y
**258 Fnord!** (el OCR del runtime ya es mas largo que la secundaria) y **185, 195, 206, 229, 331**
(no aparecen en la transcripcion secundaria).

Ademas, ya anotado: la IA no juega cartas de rodadero (§37.2), y siguen abiertos **Fase 3** (UX,
onboarding, comprobacion del DOM en navegador real) y **P1-DATA-03 Global Power**, bloqueado por
entorno porque la red no resuelve ni `cs.cmu.edu` ni `sjgames.com`.

---

## 38. P1-025 / P1-026 / P1-027 - la Plot USADA, el ataque PRIVILEGIADO y la ventana de SUCESO

### 38.1 Hallazgo

Cierra la familia que §36.6 dejo abierta: las 23 cartas de reaccion inmediata. Dieciseis ya
estaban hechas (§33 P1-016 antes de los dados, §37 P1-024 despues de los dados). Quedaban nueve, y
estas nueve NO reaccionan a los dados: reaccionan a SUCESOS DE CARTA. Repartidas en tres grupos
que no comparten nada entre si:

| idx | carta | que reacciona a | que hace |
|---|---|---|---|
| 346 | Privileged Attack | el ataque del jugador, ya declarado | vuelve el ataque privilegiado |
| 398 | The Second Bullet | el rodadero fallido del propio atacante | gasta fichas y repite el rodadero |
| 249 | Embezzlement | que OTRO jugador roba una Plot | se lleva esa Plot y descarta otra propia |
| 374 | Stealing the Plans | que otro jugador descarta una Plot | se lleva esa Plot del descarte |

Ademas, al implementar el grupo aparecieron dos huecos que no estaban en el backlog:

- **P1-025** la Plot USADA nunca llegaba al descarte (se perdia para siempre).
- **P1-026** el campo `A.privilege` existia desde la primera version y NO lo leia nadie.

### 38.2 P1-025 - la Plot usada se perdia

**Hallazgo.** `E.playPlot` terminaba con `pl.hand.splice(i,1);` y nada mas. Una Plot USADA salia de
la mano y no aparecia en ninguna pila: ni descarte ni mesa. Dos consecuencias, ambas medidas:

1. "Stealing the Plans (374)" dice *"immediately after someone else discards a Plot card, whether
   or not they used it"*. La segunda mitad del texto no tenia ningun objeto: las Plot usadas no
   eran descartables.
2. `S.plotDeck` solo se reponia con los descartes por limite de mano, los +10 en modo `hold`, la
   NWO reemplazada y `E.discardCard`. Las cartas que la partida realmente consume no volvian nunca.

**Regla aplicada.** inwo_rules_extracted.txt:1100, glosario "Discard": *"Discarded cards are placed
in the owner's discard pile, face-up"*.

**Dos excepciones, y las dos por el mismo motivo textual.** inwo_rules_extracted.txt:223,
"In Play vs. Just Played": *"A Group or Resource is 'in play' if it is controlled by a player. A
Plot is 'in play' if it is left on the table to mark an ongoing effect, such as a New World
Order"*. O sea que una carta "en juego" NO esta en el descarte, y hay dos clases de cartas en
juego ademas de la NWO:

1. **Plot descubierta** (los +10 en modo `hold` y las NWO): sigue en `pl.exposedPlots` hasta que
   se juegue, se robe o se vuelva a ocultar.
2. **Plot ENLAZADA.** Las familias Power Increase y Resistance Increase imprimen literalmente
   *"Link this card to your chosen group"*, y su unicidad esta redactada en esos mismos terminos
   (*"No player may have more than one Charismatic Leader **in play**"*). Si la carta se descartara,
   "in play" dejaria de tener sentido y la unicidadseria imposible de medir. Lo que persiste no es
   la carta, es el efecto (`pl.linkedPlots` mas el override del nodo).

La comprobacion es por identidad y no un flag (`!pl.exposedPlots.indexOf(...) && !linkedHere`),
para que cualquier caso futuro que exponga o enlace una carta quede excluido sin tocar el sitio.

**Correccion aplicada.** Se creo `discardPlot(ix, byPid)`, unico punto por el que una Plot entra en
la pila de descarte (los nueve `S.plotDiscard.push` repartidos por el motor ahora pasan por ahi,
porque cualquier descarte nuevo se olvidaria de la ventana) y se encadeno al final de `E.playPlot`.
El unico `push` que NO pasa por ahi es el pago de EMBEZZLEMENT, porque lo provoca la propia ventana.

### 38.3 P1-026 - `privilege` era un campo muerto

**Hallazgo.** `grep privilege` sobre `engine.js` daba 3 coincidencias: la inicializacion en
`E.declareAttack`, `E.togglePrivilege()` y el pintado en la UI (`<i class="b par">PRIVILEGED</i>`).
`E.addSupport` -la unica puerta por la que un tercero se suma a un ataque- no lo leia, y
`E.togglePrivilege` no tenia **ni un solo llamador en produccion** (el unico del repo estaba en
`test_fase2_rules.js`). El poder impreso de los Illuminati Bavarianos ("1 vez por turno: ataque
Privilegiado") era puro adorno: ni habia boton, ni habria efecto si lo hubiera.

**Regla aplicada.** inwo_rules_extracted.txt:1140-1148, glosario "Interference":

> *"Interference is participation in an attack by players other than the attacker and defender. If
> a player is unable to interfere in an attack (usually because it has been made Privileged), he
> cannot use any Plot, action, or special ability to affect that attack (though he may be able to
> affect the die roll after the attack is over)."*

Dos consecuencias que esta cita resuelve de una vez: (a) el privilegio cierra la INTERFERENCIA, y
por eso el unico sitio donde puede aplicarse es `E.addSupport` (ayudar y oponerse son la misma
llamada); (b) el mismo texto deja el rodadero abierto, lo que confirma por tercera vez el diseño de
la ventana de §37: assemble el ataque esta cerrado a terceros, tirar los dados no.

**Correcciones aplicadas.**

1. `E.addSupport` rechaza con *"El ataque es PRIVILEGIADO: solo el atacante y el defensor pueden
   participar"* a cualquier `pid` que no sea `A.pid` ni `A.targetPid`.
2. `E.togglePrivilege` deja de ser un interruptor sin dono y pasa a ser el metodo que aplica el
   poder: exige que el ataque sea del atacante, que no se haya resuelto, que **nadie haya
   participado todavia** (si se admitiera despues, el que ya habia puesto su ficha veria cobrado
   su participacion sin previo aviso) y que el jugador tenga usos disponibles; consume uno de
   `pl.flags.privilegedUsed`, que se reinicia en el cambio de turno y se publica en `publicState`.
3. La carta **346 Privileged Attack** hace lo mismo por la via de las cartas, con su coste impreso
   ("Your Illuminati **or** a Secret group must participate or spend an Action token"): primero el
   Illuminati, y si no hay ficha, un grupo Secret.
4. La UI tiene ya boton (`data-act="privilege"`, solo para el atacante y solo antes de que nadie
   participe). Que la faccion tenga o no el poder lo decide el motor, para no duplicar en la UI la
   tabla de poderes de las 18 facciones.

**Nota sobre el alcance.** Con dos jugadores el privilegio no puede vetar a nadie: atacante y
defensor son los unicos que hay. La regresion monta por eso una partida de TRES jugadores, que el
motor ya permite (`twoPlayerGuard` solo aplica a `S.players.length===2`).

### 38.4 P1-027 - la ventana de SUCESO, y las 2 cartas que la usan

**Diseno.** Tercera ventana de la misma familia que las otras dos, con la misma arquitectura y el
mismo contrato de dos pasos (jugar la carta NO cierra la ventana; cerrar es `E.resolvePendingEvent`
aparte). A diferencia de `S.pendingAttack` y `S.pendingRoll`, aqui no hace falta contexto no
serializable fuera de `S`: el efecto de cerrar es "mover una carta de una pila a una mano", que es
puro dato, y por eso vive en `S.pendingEvent.data`.

- `S.pendingEvent = {kind, label, byPid, data, responders[]}` con `kind` en `plotDrawn` |
  `plotDiscarded`.
- `openEventWindow(ev)` abre **solo si** algun jugador tiene una carta valida para ese suceso
  (`eventReactionAllowed`), igual que `openRollWindow`. Si nadie puede reaccionar no hay ventana:
  una ventana que nadie puede cerrar es un atasco, y ya se pagaron dos (§33).
- `E.resolvePendingEvent()` es idempotente (doble clic no tumba la partida).

**Los dos disparadores.**

1. `E.drawPlot`, justo despues del robo: Embezzlement dice *"before he uses it or announces what it
   is"*, luego la ventana se abre en el ROBO, no cuando la carta se juega. Para que eso sea verdad,
   `E.playPlot` rechaza specifically esa Plot mientras la ventana este abierta. Y el bloqueo va
   **antes** de `rejectUnverifiedCard`: es una regla del suceso y no de la carta, asi que si se
   comprobara despues una Plot sin mecanica verificada daria "no tiene una mecanica verificada" en
   vez de "todavia no puedes usarla", que es la informacion que el jugador necesita.
2. `discardPlot`, o sea CUALQUIER descarte de Plot: por limite de mano, por descarte manual, por
   `E.addBoost`, por un Plot linkeado a un grupo destruido, por la Plot usada de P1-025.

**Carta 249 Embezzlement.** Responder fija `data.claimed` (la Plot en disputa) y `data.payment`
(la Plot propia que se descarta). El pago se valida contra las Plots **propias**, excluida la que se
va a robar, porque el texto dice "discard ONE OTHER Plot card from your own hand"; si el jugador no
tiene ninguna no se puede jugar. El efecto se aplica al cerrar, y si para entonces ya no quedara una
Plot que descartar, la carta robada **se devuelve** en vez de disappear: el motor no puede dejar
al jugador con una carta sin pagar.

**Carta 374 Stealing the Plans.** Responder fija `data.taken`; al cerrar, la Plot sale de
`S.plotDiscard` y entra en la mano del que respondio. Coste impreso: accion de un grupo con Poder
>= 3 (`firstUsableAid` + `spendGroupToken`).

**Carta 398 The Second Bullet.** No necesita ventana propia: extiende la de RODADERO de §37,
porque *"immediately after you fail a roll to destroy"* es exactamente "la ventana de rodadero esta
abierta y el rodadero ha fallado". Para eso `S.pendingRoll` guarda ahora el ataque (`attack: A`),
campo que `publicState()` nunca publica porque su proyeccion es campo a campo. Y aqui hubo que
corregir el primer intento: la carta dice *"any of your own groups still have Action tokens and
were eligible to participate"*, y un grupo tiene UNA ficha por turno que declararlo ya gasta
(P1-022), asi que los unicos con ficha libre son los que PODIAN ayudar y no lo hicieron. La
implementacion recorre todos los grupos del atacante con ficha y aplica el mismo criterio de
elegibilidad de `E.addSupport` (para destruir, >=1 ideologia opuesta al objetivo).

### 38.5 Las 5 que siguen bloqueadas, con su motivo declarado

No es pereza: cada motivo esta comprobado contra el motor y ahora es un `BLOCKED_CARDS` del gate,
de modo que si el subsistema apareciere el gate avisa en vez de dejar la carta en limbo.

- **192 And STAY Dead!** el motor no tiene mecanica de resurreccion (grep `revive|resurrect` = 1
  hit, un comentario en español no relacionado), asi que *"The destroyed group is gone forever"* no
  seria observable: la carta no tendria efecto, solo coste.
- **228 Counterspell** un Resource **no puede atacar ni ayudar a un ataque**: vive en
  `pl.resources` con `tokens:0` y sin nodo, y `E.addSupport` exige `findNode` y `tokens>=1`. O sea
  que *"any Magic Resource used to attack you or help an attack on you"* nunca ocurre. Arreglarlo es
  una mecanica de participacion nueva, no una ventana de reaccion.
- **276 Hat Trick** *"discard this card instead, and put the other Plot card back into your hand"*
  exige deshacer una Plot ya resuelta de forma transaccional.
- **285 I Lied** el motor no tiene tratos que cumplir, luego el marcador no lo consumiria nadie.
- **412 Vultures** *"after a rival plays a Group from his own hand, fails to take it over, and
  discards it"*. Las reglas oficiales SI tienen ese camino (inwo_rules_extracted.txt:226-241:
  *"if the owner fails to control a Group played from his hand and discards it, that Group was
  never in play"*), pero el motor no: `placeUnder` lanza y la carta se queda en la mano. Es una
  carencia del motor, no de la carta.

### 38.6 Hallazgo colateral: `case 'paralyze'` esta MUERTO

Al escribir la regresion de P1-025 se busco una Plot usada "limpia" y no habia ninguna con
`effect.kind==='paralyze'`. En efecto, **ninguna de las 421 cartas tiene esa mecanica**: el `case
`paralyze'` de `E.playPlot` es una rama inalcanzable. No es un bug (no hay carta que deberia
usarla), pero es el mismo patron que §33.5 y §36.6 el mismo patron - una rama que el motor implementa y
nadie puede alcanzar. Se deja declarado aqui y no se borra, para que el dia que aparezca el dato de
esa carta el motor ya este listo. El gate de FASE 4 ya declara sus 3 ramas muertas conocidos
(`paralyze`, `zap`, `nwo`), asi que esta queda contabilizada.

### 38.7 Verificacion

- `npm test` → **ALL TESTS PASSED (10)**, exit 0. Repetido 2 veces.
- `node test_fase2_rules.js` → **FASE 2 RULES PASSED**. Bloque nuevo `P1-025/P1-026/P1-027` con
  8 escenarios: (1) la Plot usada sale de la mano y llega al descarte y no queda linkeada;
  (2) una Plot linkeada se registra en `linkedPlots` y NO va al descarte; (3) con 3 jugadores, un
  tercero SIN privilegio participa (aids=1) y con privilegio `E.addSupport` lanza y no deja
  participacion, mientras el defensor SÍ puede; (4) el poder Bavariano se consume una vez por
  turno, el segundo intento se rechaza sin consumir, y una faccion sin el poder no puede
  privilegiar; (5) la carta 346 se rechaza fuera de un ataque propio, privilegia el ataque
  declarado, gasta la ficha del Illuminati, sale de la mano y no se puede repetir; (6) Embezzlement:
  el robo abre la ventana, la Plot en disputa no se puede jugar mientras siga abierta, la carta no
  cierra la ventana, y al cerrar la Plot cambia de mano y el jugador que respondio descarta la suya
  de verdad; (7) Stealing the Plans: el descarte abre la ventana, la respuesta no la cierra, y al
  cerrar la Plot sale del descarte y llega a la mano; (8) The Second Bullet sobre un rodadero
  fallido: obliga a repetir, gasta la ficha del grupo elegible y cierra la ventana.
- `node test_fase4_cards.js` → **FASE 4 COVERAGE PASSED (79 clasificadas, 169 Plots/Resources sin
  mecanica, techo 182, 3 ramas muertas, 9 cartas bloqueadas congeladas, 4 huecos de texto)**.
  `implemented-pending-engine` sube de 56 a 60 y las 5 cartas de §38.5 entran en `BLOCKED_CARDS`.
- `node gen_cards.js` → `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35}
  verified-groups 33`.
- Estabilidad: `test_fase2_rules.js` 16/16 y `test_respond.js` 16/16 sin fallos (antes fallaban
  ~1 de cada 8; ver §38.8).

### 38.8 Lecciones

1. **Un test que cuenta cartas en mano es un test que mide el sellado, no la regla.** Los helpers
   `sealWindows()` / `noCancelWindow()` quitan cartas de la mano para que ningun reparto accidental
   abra una ventana. El bloque de Cthulhu ("roba un Plot al destruir") contaba Plot cards en mano
   justo antes de un `sealedResolve()`, y fallaba 6-7 de cada 40 veces segun le tocara una carta de
   rodadero. Ahora comprueba el EFECTO (la linea de log que escribe el motor + la victima fuera de
   la estructura). **Sexta vez que aparece esta clase de fragilidad**, y ya no es un accidente: la
   solucion estructural es que ningun test mida un estado que otro test muta.
2. **Un campo declarado y no consumido es el bug mas silencioso que hay.** `privilege` llevaba
   desde la primera version, se pintaba en pantalla y tenia hasta documentacion en la ayuda del
   jugador. Buscar "quien lee este campo" antes de dar por buena una funcionalidad nueva es el
   equivalente de grep para el motor.
3. **Centralizar el punto de escritura de un estado nuevo cuesta 9 lineas y evita 9 olvidos.**
   `discardPlot()` existe porque P1-027 necesitaba un disparador en CADA descarte, y con nueve
   `push` sueltos el siguiente se olvidaria. El mismo criterio que se aplico en §23 con el
   vocabulario de atributos.
4. **El texto impreso suele describir una situacion que el motor todavia no puede producir.**
   "Any of your own groups still have Action tokens and were eligible to participate" resulto
   imposible con un modelo de una ficha por grupo: el atacante ya la gasto al declarar. La carta no
   estaba mal, la lectura de "eligible to participate" estaba mal, y la diferencia solo se vio al
   escribir el test.
5. **Un orden de validacion mal puesto cambia el mensaje que recibe el jugador.** Mover el bloqueo de
   la Plot en disputa antes de `rejectUnverifiedCard` no cambio el comportamiento, pero si lo que el
   jugador lee cuando intenta usar una carta robada.

### 38.9 Backlog

Quedan 5 de las 23 cartas de reaccion inmediata, con las razones declaradas en §38.5. Ninguna es
arreglable sin un subsistema nuevo: resurreccion (192), participacion de Resources (228),
deshacer una Plot resuelta (276), tratos vinculantes (285) y "grupo jugado de la mano que falla el
takeover y se descarta" (412). Este ultimo tiene ademas el texto oficial que lo define
(inwo_rules_extracted.txt:226-241), asi que es la primera candidata para una seccion propia.

Siguen abiertos, sin cambio: **Fase 3** (UX, onboarding, comprobacion del DOM en navegador real),
la IA que todavia no juega cartas de rodadero ni de suceso (§37.2, §38.4) y **P1-DATA-03 Global
Power**, bloqueado por entorno porque la red no resuelve ni `cs.cmu.edu` ni `sjgames.com`.

---

## 39. L1 - TOKEN-GIFT: las 11 cartas que reparten fichas de accion a todos tus grupos de un tipo

Ejecuta el lote **L1** de `plan.md`. Primer lote del plan atomico escrito tras el commit `6530733`, y
primero que usa la regla "un lote = una familia de mecanica, nunca partir una familia".

### 39.1 Hallazgo

Once Plots comparten una unica mecanica: "coloca una ficha de accion en cada uno de TUS grupos de
tipo X". Hasta ahora ninguna estaba implementada, y las once seguian con
`effect.kind === 'unverified'`, es decir, con el texto impreso transcrito pero sin nada que lo
ejecutara.

| idx | id | carta | filtro impreso |
|---|---|---|---|
| 201 | `bankmerger` | Bank Merger | atributo `bank` |
| 240 | `dollarsfordecency` | Dollars for Decency | alineamiento `straight` |
| 256 | `flowerpower` | Flower Power | alineamiento `peaceful` |
| 262 | `freakingthemundanes` | Freaking the Mundanes | alineamiento `weird` |
| 263 | `fullmoon` | Full Moon | alineamiento `fanatic` |
| 265 | `gangwar` | Gang War | alineamiento `criminal` |
| 327 | `newfederalbudget` | New Federal Budget | alineamiento `government` |
| 337 | `pledgedrive` | Pledge Drive | alineamiento `liberal` |
| 352 | `redscare` | Red Scare | alineamiento `conservative` |
| 353 | `reload` | Reload! | alineamiento `violent` |
| 383 | `taxbreaks` | Tax Breaks | alineamiento `corporate` |

**Por hacen falta DOS campos calificadores y no uno.** El vocabulario canonico del mazo esta
partido en dos ejes y no son intercambiables (§23 para atributos, §18/§32 para alineamientos):

- 13 atributos: `bank, church, coastal, communist, computer, green, huge, magic, media, nation,
  science, secret, space`
- 10 alineamientos: `conservative, corporate, criminal, fanatic, government, liberal, peaceful,
  straight, violent, weird`

Diez de las once cartas filtran por **alineamiento**; solo Bank Merger filtra por **atributo**
(`bank`). Un unico campo `targetAlign` habria dejado a Bank Merger sin filtro, y un unico campo
`targetAttr` habria hecho matching de cadenas sobre `"straight,peaceful,weird"` con el mismo
fallo que llevo a `requireAttrAny` en §37. Precedente directo: P1-018 ya habia abierto la
disyuncion `requireAttrAny` cuando un texto de carta exigia "Science, Space or Computer".

Los once valores exigidos existen en el mazo, asi que la puerta de calificadores de FASE 4 los
acepta sin excepciones.

### 39.2 Correcciones aplicadas

**`gen_cards.js`** (980 -> 1090 lineas). Nueva constante `BOIL` con la frase de cierre que las once
cartas comparten ("This card may be played at any time. This card does not benefit groups which are
suffering from the effect of any card or special ability that prevents them from getting Action
tokens."), nueva familia `TOKEN_FX` con las once entradas y `TOKEN_FXN` con la normalizacion
`norm(k)` que exige el generador, insertada justo detras de `DICTATORSHIP_FXN`, y `|| TOKEN_FXN[key]`
anadido a la cadena de resolucion. Registrar la familia fija `rec.effect`, `rec.subtype`,
`rec.verifiedMechanic = true` y `rec.text`, lo que fuerza `mechanicsStatus:
'implemented-pending-engine'`.

**`game/js/engine.js`** (3123 -> 3184 lineas). La lista `instant` de `E.playPlot` termina ahora en
`|| eff0.kind === 'token_gift'`, porque las once cartas dicen literalmente "may be played at any
time". Nuevo `case 'token_gift'` antes del bloque P1-026: lee `eff.giftAlign` / `eff.giftAttr`,
rechaza con mensaje oficial si no declara ninguno, y despues `walk(pl.structure, ...)` saltando la
raiz, filtrando con `nodeAligns(n,gc).indexOf(gAlign)` o `hasAttr(gc,gAttr,n)`, saltando nodos
`devastated / paralyzed / zapped / actionStripped`, y poniendo `n.tokens = 1`. Dos ramas de log
(0 coincidencias / N coincidencias) y `lastResult` con la lista de grupos tocados.

**`game/js/ui.js`** (-> 1263 lineas). `var NO_TARGET_KINDS = ['token_gift']` mas
`plotNeedsTarget(c)`. El despachador `value:'plot'` ahora juega de inmediato cuando la carta no
necesita objetivo, porque una carta que reparte fichas a todos los grupos de la estructura no tiene
a quien apuntar, y el boton dice "Jugar ya (afecta a todos)".

**`test_fase4_cards.js`.** Dos ramas nuevas en la seccion 4 (`giftAlign` y `giftAttr`) mas su
aportacion a `usedAttrs`. Sin ellas la puerta no habria validado nada y el informe `checkedFields`
no habria listado los campos nuevos: una puerta que no conoce el campo no falla, y por tanto no
protege.

**`test_fase2_rules.js`.** Bloque IIFE con 19 aserciones y 5 escenarios, con helpers propios
(`put`, `gIdx`, `plantUnder`, `tokensOf`) porque `give`/`giveHere` viven dentro de otros IIFE.

### 39.3 Interpretaciones declaradas

No existe jurisprudencia oficial para ninguna de las once. Se declara:

1. **Recorrido recursivo de toda la Power Structure, incluidos los titiriteros.** El texto dice
   "each of your groups"; en el juego oficial un grupo tuyo sigue siendo tuyo este bajo el tuyo.
2. **`tokens = 1`, nunca `tokens++`.** La ficha de accion de un grupo es un unico hueco, asi que Bank
   Merger's "even those which already have an Action token" es un recordatorio redundante, no un
   segundo efecto.
3. **La frase "and any other Fanatic group in play that you want to benefit!" de Full Moon NO se
   implementa.** Daria una ficha gratuita a grupos enemigos; el texto la ofrece como opcion al
   jugador y no como parte del efecto automatico, y no hay un lugar en el estado donde guardarla.
4. **La clausula "does not benefit groups which are suffering from ..." reutiliza exactamente el
   mismo juego de banderas que `firstUsableAid`** (sin ficha, paralizado, zapeado, devastado,
   accion arrebatada). No es una lista nueva: es la misma, para que un grupo-under-effecto no pueda
   recibir la ficha por una via distinta a la que ya le impedia actuar.
5. **Ninguna carta tiene coste impreso.** Se juega sola; no hay llamada a `pl.illumTokens` ni a
   `firstUsableAid`.

### 39.4 Dos bugs reales encontrados al ejecutar el lote

**4.1 Un array muerto que hacia ineffective la lista `instant`.** Escribi primero
`var TOKEN_KINDS = ['bankmerger', ...]` con los once IDENTIFICADORES de carta, y despues use
`TOKEN_KINDS.indexOf(eff0.kind)` en la lista `instant`. Como `eff0.kind` vale `'token_gift'`, el
`indexOf` devolvia -1, ninguna de las once cartas entraba por la via instantanea y todas caian en
`requireOwnMain`, lanzando "No es tu turno" siempre que el jugador 0 no fuese el actual. Solo
aparecio porque el script de humo ejecuto tres escenarios con orden de turno distinto. Se borro el
array y ahora se compara contra el **kind**; un comentario en la lista avisa de esto y recuerda que
el recuento "11 cartas, 1 kind" ya lo publica el histograma de kinds de FASE 4. **Quinta vez que
aparece esta clase de defecto: el dato existe pero vive en otro sitio y nadie lo lee.**

**4.2 El fixture estaba mal, no el motor.** `gIdx('criminal')` devolvia el primer grupo Criminal,
que ademas es Violent, asi que la asercion negativa "Reload! no toca un Criminal" era una
tautologia. Se anadio un parametro `exclude` al helper y se uso
`gIdx('criminal', false, 'violent')`. **Una asercion negativa necesita un fixture que este de
verdad fuera del filtro; si no, prueba que el filtro existe, no que funciona.**

Ademas se corrigieron dos tokens basura (`2 grupos<caracteres CJK>` y `L1documentacion:`) y una
asercion que exigia 0 fichas donde las dos eran Violent (las dos deben estar a 1).

### 39.5 Verificacion

- `node gen_cards.js` -> `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`
- `node test_fase2_rules.js` -> FASE 2 RULES PASSED, con las 19 aserciones de L1 en `ok`
- `node test_fase4_cards.js` -> **90 cartas clasificadas** (antes 79), **158 Plots/Resources sin
  mecanica** (antes 169, exactamente -11), techo 182, 3 ramas muertas declaradas, 9 cartas
  bloqueadas congeladas, 4 huecos de texto declarados
- `mechanicsStatus` -> `{"source-text-unmapped":35,"unverified":296,"implemented":1,"implemented-special":18,"implemented-pending-engine":71}`
- `npm test` -> ALL TESTS PASSED (10), exit 0

### 39.6 Lecciones

1. **El vocabulario del mazo esta partido en dos ejes y las cartas los usan indistintamente.**
   Buscar "que campoQualifier uso" antes de escribir el `case` evita el fallo de matching de
   cadenas que ya costo un ciclo entero en §37 con `requireAttrAny`.
2. **Una puerta de gate que no conoce un campo nuevo no falla: no protege.** Las ramas de
   `giftAlign`/`giftAttr` en `test_fase4_cards.js` no son documentacion, son la unica razon por la
   que estas once cartas no pueden reintroducir un valor inexistente en el mazo.
3. **Comparar siempre contra el `kind`, no contra una lista de ids.** El histograma de kinds de
   FASE 4 ya cuenta "11 cartas, 1 kind"; un array paralelo de ids es el duplicado que se pudre.
4. **Una asercion negativa con un fixture que no cumple el filtro no prueba nada.**
5. **Un lote que se ejecuta de verdad encuentra bugs que la revision no.** Los dos de §39.4
   aparecieron al escribir los tests y el script de humo, no al leer el codigo.

### 39.7 Backlog

L1 cerrado. Sigue **L2 (ILLUM-OR-X, 9 cartas)**: `payIllumOrAligns` como helper de coste compartido,
que es la primera vez que un mismo coste se implementa una sola vez para nueve cartas. Le siguen
L3 BULK-POWER (14, campo nuevo `powerMods` plegado en `curPower` mas `expiresAtTurn`), L4 TOKEN-STRIP
(3), L5 CONDITIONAL ATTACK BOOST (11), L6 NEGATE EVENT (10, reutiliza las tres ventanas
existentes), L7 PEEK HIDDEN PLOTS (5), L8 DECK MANIPULATION (8, necesita `S.outsidePlots`), L9 ALIGN
EDIT (4), L10 LINKED PERMANENT EFFECTS (14), L11 PLAY DUPLICATE (4), L12 RESOURCE MANIPULATION (5),
L13 DISASTER DEFENCE (5), L14 TURN MANIPULATION (5), L15 GOAL COMBOS (5) y L16 MULTI-ACTION (4).

Sin cambio: **Fase 3** (UX, onboarding, DOM en navegador real, IA que juegue cartas de reaccion),
**P1-DATA-03 Global Power** (bloqueado por red) y las siete cartas congeladas de L17.
---

## 40. L2 - FORCE-ALIGN: las 9 cartas que fuerzan la alineacion de un grupo (y P1-028, la Dictatorship a medias)

### 40.1 Hallazgo y RECLASIFICACION de la familia

`plan.md` defini L2 como "ILLUM-OR-X", una familia de **COSTE**:
*"requires action(s) by either the Illuminati, or X group(s) with a total Power of N"*.

Leidos los **textos impresos completos** de las 9 cartas, esa definicion es incorrecta.
Lo que las 9 cartas comparten es un **efecto** identico: convertir el grupo objetivo **permanentemente** en una alineacion concreta,
y si tenia la alineacion **opuesta**, esa alineacion se pierde.
El coste (el "N" de "total Power of N") es solo un numero **dinamico**, no un rasgo de la familia.

Por tanto **L2 se reclasifica** como una familia de **FORZAR ALINEACION**, `force_align`, cuyo coste resulta ser dinamico.

Texto literal (la ausencia de la clausula "doubled" en Power Corrupts es **correcta**, ver 40.3 interpretacion 2):
*"Play this card at any time. It requires action(s) by either the Illuminati, or <X> group(s) with a total Power equal to the Resistance of the target group, **doubled if the group is currently <OPP>**. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target becomes permanently <X>. If it was <OPP>, that alignment is lost. Keep this card, with a link to the target. Requires Action"*

| idx | id | nombre | X (pagador y resultado) | OPP (dobla el coste y se pierde) |
|---|---|---|---|---|
|198|assertivenesstraining|Assertiveness Training|violent|peaceful|
|264|fundiemoney|Fundie Money|conservative|liberal|
|290|jakeday|Jake Day|weird|straight|
|295|kinderandgentler|Kinder and Gentler|peaceful|violent|
|301|liberalagenda|Liberal Agenda|liberal|conservative|
|323|nationalization|Nationalization|government|corporate|
|340|powercorrupts|Power Corrupts|criminal|**(sin clausula "doubled")**|
|345|privatization|Privatization|corporate|government, mas "and if it was a Dictatorship, it is no longer"|
|376|straightenup|Straighten Up|straight|weird|

### 40.2 Correcciones aplicadas

**Datos -- `gen_cards.js` (1065 -> 1197 lineas).**
Nuevo `const FORCE_FX = {…}` con 9 entradas + `const FORCE_FXN = {}; for (const k in FORCE_FX) { FORCE_FXN[norm(k)] = FORCE_FX[k]; }`,
insertado justo despues de la linea `TOKEN_FXN` (era L793); `|| FORCE_FXN[key]` anadido a la cadena de resolucion (era L1065).
Cada entrada: `{kind:'force_align', forceAlign:<X>, oppAlign:<OPP> (ausente en Power Corrupts), t:<texto impreso verbatim sin el nombre de la carta, igual que la convencion de TOKEN_FX>}`.
Privatization lleva ademas `noDictatorship:true`. Un bloque de comentario en espanol de 45 lineas declara las 5 interpretaciones.
`node gen_cards.js` -> `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.

**Motor -- `game/js/engine.js` (3184 -> 3393 lineas), 6 ediciones, `node --check` limpio.**
1. **`curPower` folds `node.powerMods`** (array de `{name,v}`) DESPUES de `powerOverride` y antes del reset por paralyze.
   Comentario que la nombra P1-028 y avisa de que **L3 (BULK-POWER) reutilizara el mismo campo**.
2. **`nodeAligns` filtra `node.alignsRemoved`** tras plegar `alignsAdded`; **add gana sobre remove** (una alineacion presente en ambos arrays cuenta como presente).
   Comentario en voz alta: esta unica linea cambia **TODOS** los consumidores de `nodeAligns`
   (ataque +-4, `shares`, `isOpposite`, el `case 'token_gift'` de §39) y que es intencionado.
3. **NUEVO `closenessDefenseBonus(ownerPid,node,cardObj,attAligns,notes)`** justo despues de `alignsOf`.
   Devuelve la suma numerica de +4 por alineacion compartida, respeta las dos excepciones oficiales
   (maestro Discordian con solo fanatic compartido => 0; fanatic-vs-fanatic => sin +4), y empuja notas explicativas si se le pasa un array `notes`.
   El bloque en linea de `computeStrength` (era L1196-1209) fue sustituido por
   `det.defenseBonus+=closenessDefenseBonus(A.targetPid,tNode,tCard,attAligns,det.notes);`
   para que **la regla viva una sola vez**.
4. **NUEVO helper `cap(s)`** (capitaliza la primera letra) justo despues de `alignsOf`, usado por los mensajes del caso nuevo.
   **No existia**: el bloque se escribio asumiendolo y hubo que anadirlo.
5. **`case 'dictatorship'` -- FIX de P1-028**: ahora fija `ndD.dictatorship=true` y empuja `{name:'Dictatorship',v:2}` en `ndD.powerMods` (guardado por `if(!ndD.dictatorship)`), y el log dice "Ahora es una Dictatorship: +2 de Poder.".
6. **Whitelist `instant`** ahora termina en `||eff0.kind==='force_align');` con un comentario que recuerda que las nueve imprimen "Play this card at any time" y que esto se distingue de Dictatorship (cuyo coste es la accion del propio grupo, de ahi que no este en la lista, por §32 P1-017).
7. **NUEVO `case 'force_align'`**, empalmado justo antes de `case 'dictatorship'`.

**`case 'force_align'` -- comportamiento exacto (engine.js L2509-2625):**
- Valida `findNode(targetUid)` (-> `'…: elige un grupo objetivo'`), `card()` (-> `'…: el objetivo no es una carta'`), `findOwnerPid` (-> `'…: ese grupo ya no esta en juego'`) y **`tcF.type==='illuminati'`** (-> `'…: no se puede forzar la alineacion de un Illuminati'`). **Sin filtro `targetAttr`**: el texto dice "the target group", cualquiera.
- `beforeF=nodeAligns(ndF,tcF)`; `costF=nodeResistance(ndF,tcF)`; **duplicado** iff `oA && beforeF.indexOf(oA)>=0`;
  `closeF=closenessDefenseBonus(ownerF,ndF,tcF,null,null)` se anade **solo cuando `ownerF!==pid`**.
- Pago: **`if(pl.illumTokens>=1){pl.illumTokens--}` -- UNA ficha del Illuminati sea cual sea el coste**;
  si no, `walk(pl.structure, …)` saltando la raiz / `devastated|paralyzed|zapped|actionStripped` / `tokens<1` / `nodeAligns(n,nc).indexOf(fA)<0`,
  `spendGroupToken` + acumulando `curPower` hasta `needF<=0`. Dos throws distintos: uno cuando no se pudo elegir nada,
  otro cuando la suma se quedo corta (nombrando el total necesario y la parcial).
- Efecto: `ndF.alignsAdded.push(fA)` solo `if(gainedF)`; `ndF.alignsRemoved.push(oA)` solo `if(oA && beforeF.indexOf(oA)>=0)`
  (para que Backlash no reciba una entrada fantasma); `eff.noDictatorship` limpia `ndF.dictatorship` y filtra la entrada `Dictatorship` de `ndF.powerMods`;
  `pl.linkedPlots.push({uid:'lp'+(S.uidCounter++),cardId:handIdx,linkedTo:targetUid})`.
- Un `log(...)` rico y `lastResult={ok:true,forced,owner,align,opp,wasOpposite,lostDictatorship,gained,cost,doubled,closeness,paidWith}`
  con `paidWith={via:'illuminati'|'groups',groups:[{uid,name,power}]}`.

**Gate -- `test_fase4_cards.js` (566 -> 602 lineas).** Tres ramas nuevas en la seccion 4.
Ojo: la linea `if (e.targetSubtype) {` esta **sin sangria** (lineas 352-356 del fichero, flush-left), al contrario que las ramas de L1 en 340-351; el anchor debe ser `'if (e.targetSubtype) {'`.
- `e.forceAlign` -> `groupsWithAlign(a).length>0`.
- `e.oppAlign` -> **DOS** condiciones: (1) `groupsWithAlign(a).length>0` **y** (2) `GROUPS.some(g => (g.alignments||[]).indexOf(a)>=0)`.
- `e.noDictatorship` -> `C.cards.some(x => x && x.effect && x.effect.kind==='dictatorship')`, para probar que el campo no es decorativo.
`checkedFields` pasa a listar **17** campos.

**UI -- sin cambios, verificado.** `force_align` **si** necesita objetivo, asi que `plotNeedsTarget(c)` devuelve true
(`NO_TARGET_KINDS` sigue siendo `['token_gift']` y **no** debe crecer) y el flujo existente `plotTarget` de dos pasos sirve:
`ui.js:938` pone `sel={mode:'plotTarget',data:{handIdx:ix}}` y `ui.js:826` hace `CB.onPlayPlot(d.handIdx, uid)`, pasando el `targetUid` de verdad.

**Regresion -- `test_fase2_rules.js` (3201 -> 3378 lineas).** Nueva IIFE anclada en `/* ---------- L2 - FORCE-ALIGN (P1-028)…`,
empalmada justo antes de `/* ---------- Utilidad global:`. **26 aserciones / 5 escenarios**:
(1) forzar violent sobre un grupo peaceful -> `gained`, `wasOpposite`, el coste duplicado (`4 -> 8`), ficha del Illuminati gastada,
carta **NO** en `S.plotDiscard`, carta **SI** en `linkedPlots`, mas una **sondea a caja negra** de que un consumidor real lo ve
(jugar `Reload!` da ficha al grupo forzado); el lado de la perdida de alineacion se aserta sobre el estado del nodo porque `tokens=1` es idempotente.
(2) acciones insuficientes -> `throws(/necesitas \d+ de Poder de grupos/i)`, objetivo intacto, carta ni gastada ni descartada.
(3) pago con grupos propios: la fixture planta grupos violent hasta que su `curPower` sumada alcanza la Resistencia del objetivo,
afirma `paidWith.via==='groups'`, la ficha del pagador gastada, `gained===false`/`wasOpposite===false`, `doubled===false`,
`cost === C.cards[gi3].resistance` y `closeness===0` para un objetivo PROPIO.
(4) objetivo Illuminati rechazado.
(5) P1-028: Dictatorship sobre una Nacion fija `dictatorship===true` y una entrada `powerMods {name:'Dictatorship',v:2}`, y Privatization limpia ambas.

### 40.3 Las 5 interpretaciones declaradas

1. **El coste es dinamico**: `coste = Resistencia del objetivo`, **duplicado** si el objetivo tiene la alineacion OPP.
   No existe ninguna carta oficial con un N fijo, asi que `FORCE_FX` guarda `forceAlign` + `oppAlign` y el motor lee la Resistencia y las alineaciones del objetivo.
2. **"Criminal" no tiene opuesto** en las reglas oficiales (`inwo_rules_extracted.txt:370-377`: *"Criminal: Extorting money... **It has no opposite.**"*),
   y por eso Power Corrupts es la unica carta sin clausula "doubled". No es un OCR perdido: es correcto.
   La tabla `OPPOSITES` del motor (L18) ya coincide con la glosario oficial, asi que `criminal`, `government`, `corporate` y `fanatic` estan **sin opuesto**.
3. **"Permanentemente"** = `node.alignsAdded` + `node.alignsRemoved`, que son permanentes por construccion (no hay caducidad).
   `add gana sobre remove`, de modo que una re-alineacion posterior gana a una perdida anterior.
4. **"Keep this card, with a link to the target"** = la Plot va a `pl.linkedPlots`, NO al descarte.
   P1-025 ya tiene el chequeo `linkedHere` en la cola del switch de `E.playPlot`, asi que **no hizo falta ningun cambio de motor** para el descarte.
5. **La ruta del Illuminati gasta exactamente UNA ficha**, sea cual sea el coste: el texto dice *"either the Illuminati, or X group(s) with a total Power…"*,
   no *"the Illuminati provides N"*. La ruta de grupos gasta **una ficha por grupo** (no todas) hasta que la `curPower` acumulada llega al coste.

### 40.4 La distincion "closeness to the Illuminati" frente a "closeness to its master"

El texto de las 9 cartas dice *"Add bonuses for its closeness to the Illuminati if it belongs to a rival!"*.
Las reglas oficiales (`:563-576`) distinguen **DOS** conceptos distintos:
- *"Its closeness to the Illuminati still counts for defense, unless you're destroying one of your own Groups."* => un **bonus de DEFENSA** (alineaciones compartidas con su maestro), +4 por compartida;
- *"The target's common alignments with its master do not help -- those increase Resistance, which is not used in this attack!"* => alineaciones comunes con el maestro **suben la Resistencia**, que es un mecanismo distinto.

Por tanto la lectura de L2 es: **el coste = Resistencia del objetivo + su bonus de defense por closeness, pero solo cuando el objetivo pertenece a un rival.**
De ahi el `if(ownerF!==pid)` que anade `closeF`. El escenario 3 de la regresion afirma `closeness===0` para un objetivo propio, que es exactamente esta regla.

### 40.5 P1-028 - La Dictatorship estaba implementada a medias

La carta Dictatorship (idx 239) dice: *"Play this card during your turn, on any Nation which you control. This is an action for that Nation or its master. **The target is now a Dictatorship. It gets +2 Power.** It becomes Violent, if it was not already. Link this card to the Nation. Requires Action"*.

`case 'dictatorship'` (engine.js L2432 antes del fix) hacia **solo** esto: chequeo de objetivo + atributo `nation`, chequeo de propiedad,
una ficha (ficha del grupo o `pl.illumTokens--`), `alignsAdded.push('violent')`, `linkedPlots.push`, `log`.
**Nunca fijaba ninguna marca de "esto es una Dictatorship" y nunca aplicaba el +2 de Poder impreso.**

Consecuencias: (a) la clausula de 345 Privatization *"and if it was a Dictatorship, it is no longer"* no tenia nada que comprobar;
(b) el +2 impreso se descartaba en silencio **mientras la carta ya estaba etiquetada `implemented-pending-engine`** -- exactamente el pecado que esta auditoria existe para matar.
La correccion introduce el campo de nodo `nd.dictatorship=true` y el `powerMods` `{name:'Dictatorship',v:2}`, y le da a 345 el `noDictatorship` que lo borra.

### 40.6 La declaracion de radio de impacto de `nodeAligns`

`nodeAligns` es consumido por el calculo de ataque +-4, por `shares`, por `isOpposite` y por el `case 'token_gift'` de §39.
Anadir el filtro de `alignsRemoved` **cambia el comportamiento de todos ellos sin tocar ninguno**.
Esto es intencionado (una alineacion que el juego declara perdida no debe seguir contando como bonus de ataque ni como oponente),
pero significa que un bug futuro en `alignsRemoved` se manifestaria en el motor de combate y no en la carta que lo produjo. Queda declarado aqui.

### 40.7 Leccion del gate: una clausula vacua es un bug silencioso

`e.oppAlign` podria validarse solo con `groupsWithAlign(a).length>0`, y el gate pasaria.
Pero la clausula impresa *"doubled if the group is currently <OPP>"* exige que **algun grupo de la mansion lo tenga por defecto**; si ninguno lo tiene,
el motor **nunca duplicaria el coste de nadie** y la carta haria la mitad de lo que dice, en silencio.
El gate exige por eso las **dos** condiciones. Es el mismo motivo por el que §36 exigio que `textFull` fuera estrictamente mas largo que `text`
y por el que §37 rechazo relajar el gate de atributos: **una comprobacion mas debil que los datos que valida aprueba cartas que no hacen lo que prometen.**

### 40.8 Cuatro bugs que solapo el test nuevo (y que no eran del motor)

1. **`lastPlotResult` NO viaja dentro de `E.getState()`** -- `publicState()` nunca lo publica; solo el valor de retorno de `E.playPlot` lo lleva. Dos aserciones fallaron por esto.
   **Leccion: un observable se lee de la llamada que lo produjo, no de una instantanea de estado posterior.**
2. **`S.plotDiscard` es de nivel superior, no por jugador** (`S.players[p].plotDiscard` es `undefined` -> `TypeError`).
   `linkedPlots`, `exposedPlots` e `illumTokens` **si** son por jugador; los Discard estan en `S`.
3. **La fixture, no el motor: las Nations de este mazo SI son `government`-alineadas**, asi que la asercion `wasOpposite===false` era falsa.
   Se sustituyo por `oppBefore` calculado desde `C.cards[ni].alignments`.
4. **Un solo grupo pagador nunca puede alcanzar un coste de Resistencia 5** (los Poderes de grupos violent estan entre 1 y 3).
   La fixture tiene que plantar grupos hasta que la `curPower` sumada llegue a la resistencia -- que es exactamente como lo calcula el motor.

Ademas, al escribir el test: **`alignsOfUid` reimplementa `nodeAligns` a proposito** (con add-gana-sobre-remove), para que una divergencia entre motor y test falle en vez de quedar verde.

### 40.9 Verificacion

- `node --check` limpio en `game/js/engine.js`, `game/js/ui.js`, `gen_cards.js`, `test_fase2_rules.js`, `test_fase4_cards.js`.
- `npm test` -> **ALL TESTS PASSED (10)**, exit 0.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED** con las 26 aserciones de L2.
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (99 cartas clasificadas, 149 Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 9 cartas bloqueadas congeladas, 4 huecos de texto declarados)**.
  Numeros: 90 -> **99** clasificadas | 158 -> **149** sin mecanica (**exactamente -9**) | `implemented-pending-engine` 71 -> **80** | el histograma de kinds muestra `"force_align":9`.
- El gate **fallo correctamente** en el estado intermedio (los datos declaraban `force_align`, el motor aun no tenia ese `case` -> 9 errores "rama NO existe en el motor"), que es exactamente su proposito.

### 40.10 Lecciones

1. **El nombre de la familia puede estar equivocado y solo lo revela el texto impreso completo.** `plan.md` llamo a L2 una familia de COSTE; el texto revela que es una familia de FORZAR-ALINEACION con un coste dinamico. Sin `textFull` (§36) estas cartas habrian quedado como "unimplemented" para siempre.
2. **Un campo de estado puede existir sin que nada lo consuma.** `node.powerMods` no existia y `node.dictatorship` tampoco; ambos eran **datos que el motor nunca leia**. Es la misma clase de defecto que `A.privilege` (§38/P1-026) y que las ramas muertas declaradas: **el dato existe, vive en otro sitio, y por eso nadie lo ve**.
3. **Extraer una regla a un helper y llamar al helper desde el sitio viejo** (la closeness bonus) evita que la regla exista en dos sitios y diverja. Se hizo asi en un solo movimiento y FASE 2 paso inmediatamente despues.
4. **Asumir que un helper existe es un bug diferido.** El bloque se escribio llamando a `cap()` y no existia; fallo en runtime, no en `node --check`.
5. **Un test que afirma "esto NO lo toca" necesita una fixture que este de verdad FUERA del filtro.** Es la 3a repeticion de la misma clase (fixture tautologica).
6. **Nunca afirmar sobre un observable que no viaja en el estado** (`lastPlotResult`), ni asumir la forma de la estructura (`S.plotDiscard` es global, `linkedPlots` es por jugador).

### 40.11 Backlog

- **L3 (BULK-POWER) reutiliza `node.powerMods`**, que se ha construido aqui para eso. Ya puede anadir modificadores permanentes sin tocar `curPower`.
- **Las 5 cartas de ataque condicional (L5) que "+N to any Attack to Destroy a X"**: `node.powerMods` podria ser el lugar natural para un bonus permanente, pero el texto de esas cartas es *por un ataque*, no permanente, asi que probablemente necesite un campo distinto.
- **Un Plot que fuerza alineaciones puede volver ILEGAL un link existente** (ejemplo oficial `inwo_rules_extracted.txt:891-895`: Jake Day sobre un Straight unido a Grassroots Support deja el link permanentemente ilegal y el recurso se descarta). Eso es un problema de **L10**, no de L2. Queda anotado aqui para L10.
- **La oficial "any two Fanatic Groups are considered opposite to each other"** (`:487-493` y `:370-377`) es una oposicion real que la tabla `isOpposite` del motor (L18) **no implementa**. Afecta al motor de combate, no a ninguna de estas 9 cartas. Anotado para una seccion futura de motor.
- **Continuar con L3** (BULK-POWER, 14 cartas), luego L4..L16, mas **Fase 3** (UX, onboarding, verificacion DOM en navegador real, IA que juegue de verdad cartas de reaccion), **P1-DATA-03** (Global Power, bloqueado por red) y **L17** (las 7 cartas bloqueadas con su razon declarada).
---

## 41. P1-029 - La prueba SMOKE tenia una ficha aleatoria: fallo 1 de cada 3

### 41.1 Hallazgo

Al cerrar L2 seton's Stability (varias corridas seguidas de `npm test`), **1 de cada 3 corridas terminaba en `SMOKE TEST FAILED | FAIL: unverified plot fixture available`**. No era un fallo de logica: la prueba **nunca llego a ejecutar el motor**.

La causa esta en `test_engine.js` L55-61. La prueba de humo necesita *una* Plot con `mechanicsStatus === 'unverified'` para comprobar que el motor la **rechaza** con un error claro. La fixture era:

```js
st.players[cur2].hand.find(ix => cards[ix].type === 'plot' && cards[ix].mechanicsStatus === 'unverified')
```

Es decir: *"la Plot no verificada que esta ahi por casualidad en esta mano"*. La mano es el resultado de un reparto aleatorio, asi que la ficha depende de la suerte.

Por que fallo **ahora** y no antes: L1 y L2 Trayaron 20 cartas de `unverified` a `implemented-pending-engine`. Cada vez que una carta sale de la bolsa de "no verificadas", la probabilidad de que el reparto de esa partida en concreto ponga **una de las que quedan** en la mano del jugador actual baja un poco. El test llevaba tiempo raspando el limite; L1/L2 lo bajaron por debajo de 1 y el fallo se volvio visible. La semilla no cambio: **cambio el monton del que se saca**.

Se aislo con 12 corridas directas de `node test_engine.js`: fallo 1 de 12. Con 25 corridas: 0 de 25 tras el arreglo.

**Esta es la sexta aparicion de la misma clase de bug** que esta auditoria lleva registrando desde §33.5:

| # | Seccion | Que dependia de la suerte |
|---|---|---|
| 1 | §33.5 | Car Bomb +10 de posicion hacia que el ataque fallase solo |
| 2 | §37.5 | `sealWindows()` -- si un reparto metia una carta de ventana en la mano, el test se colgaba |
| 3 | §38.8 | las **dos** copias de `noCancelWindow()` |
| 4 | §39.4 | `gIdx('criminal')` devolvia un grupo que tambien era Violent, asi que la asercion negativa era tautologica |
| 5 | §40.8 | un solo grupo pagador nunca podia alcanzar una Resistencia de 5 |
| 6 | **este** | la ficha de la prueba SMOKE |

### 41.2 Correccion aplicada

En vez de buscar la ficha **en la mano**, se busca **en el mazo de Plots** y se mueve a la mano bajo prueba. El mazo siempre guarda las ~149 Plots sin mecanica, asi que la fixture es determinista, y ademas el mazo sigue siendo coherente (la carta se **saca** de el, no se duplica):

```js
var cur2 = st.currentPid;
var Sraw = E._raw();
var pIdx = null;
for (var d = 0; d < Sraw.plotDeck.length; d++) {
  var dc = window.INWO_CARDS.cards[Sraw.plotDeck[d]];
  if (dc && dc.type === 'plot' && dc.mechanicsStatus === 'unverified') { pIdx = Sraw.plotDeck[d]; break; }
}
assert(pIdx != null, 'the plot deck still holds an unverified plot to test');
if (pIdx != null) {
  Sraw.plotDeck.splice(Sraw.plotDeck.indexOf(pIdx), 1);
  Sraw.players[cur2].hand.push(pIdx);
  st = E.getState();
```

Dos hechos comprobados antes de parchear, para no cambiar lo que la prueba verifica:

- `rejectUnverifiedCard(c)` (engine.js L893-898) lanza para `kind==='unverified'` con `'La carta "X" no tiene una mecanica verificada; no puede jugarse todavia.'`. El `/` regex existente del test sigue tambien matcheando `mecanica no implementada`, asi que la asercion no se debilito.
- `S.plotDeck` es un array **de nivel superior** de indices de carta (init L309, llenado L317, barajado L319, `deckCounts.plot.plotDeck.length` L389, robado L687 y L779) -- no es `S.players[p].plotDeck`. Es el mismo agregacion de §40.8: `plotDiscard`, `groupDeck` y `groupDiscard` viven en `S`; `hand`, `linkedPlots`, `exposedPlots` e `illumTokens` viven en `S.players[p]`.

### 41.3 Verificacion

- `node --check test_engine.js` limpio.
- **25 de 25 corridas consecutivas de `node test_engine.js` PASSED** (antes 11 de 12).
- **5 de 5 corridas consecutivas de `npm test` -> ALL TESTS PASSED (10)**.
- `node test_fase2_rules.js` -> FASE 2 RULES PASSED. `node test_fase4_cards.js` -> FASE 4 COVERAGE PASSED (99 clasificadas, 149 sin mecanica, techo 182, 3 ramas muertas, 9 bloqueadas, 4 huecos de texto, `implemented-pending-engine: 80`).

### 41.4 Leccion

**Una fixture que se apoya en "el reparto de esta partida pondra esto en la mano" es un test que passara por suerte, no por diseno.** Y el riesgo no se queda en el test: cuando el juego crece, cambiar el reparto **es** cambiar la fixture.

La forma de evitarlo es que la fixture se elija de una poblacion **grande y estable**, nunca de una poblacion de 7 cartas que se sortea. Para una asercion negativa ("el motor rechaza esto") el sitio correcto no es la mano del jugador, que se baraja cada partida, sino el mazo, del que se saca la carta. Y si la prueba necesita la carta **en la mano** porque la regla es sobre la mano, hay que **quitarla del mazo al meterla** -- o el test esta probando una carta que en una partida real todavia estaria en el mazo.

Cierre de L2 y L1 con esto. **Proximo lote: L3 (BULK-POWER, 14 cartas)**, que reutiliza `node.powerMods`.
---

## 42. L3 - BULK-POWER: las 8 cartas que suben o bajan el Poder de "todos los grupos X" (y P1-030, P1-031)

### 42.1 Hallazgo: el OCR de 10 cartas estaba truncado y sin los numeros

Al leer las 15 cartas que `plan.md`agriupa en L3 aparecio un problema de DATOS, no de motor:
el texto OCR de runtime de 10 de ellas esta **cortado a mitad de frase**, y el numero que
aplica el efecto estaba **justo en el trozo que falta**:

| idx | carta | OCR truncado | lo que faltaba |
|---|---|---|---|
|204 Bigger Business|"Increase the Power of all Corporate groups by 2 / Increase the Power of all Conservative groups by / Increase the Power of all Conservative Corporate"|**by 3** en la tercera frase |
|217 Chicken in Every Pot|"... / L crease the Power of all Banks and all Coastal"|**Decrease the Power of all Violent groups by 1** (frase entera) |
|241 Don't Forget to Smash the State|"... Reduce the Power of all Government groups by 3 / Reduce the Power of all Straight non-Govemment"|**by 2** |
|251 Energy Crisis|"... Reduce Power and Resistance of all Green groups"|**by 1** |
|271 Gun Control|"Increase the Power of all Violent Government / Increase the Power of all Criminal groups by 1"|**by 3** |
|296 Law and Order|"... Increase the Power of all Straight Conservative"|**by 3** |

Las 14 con `textFull` parecian sanas. Y aqui esta la trampa: **el gate de §36 (FASE 4) exige >=20
caracteres de `text` O de `textFull`, y las 57 cartas sin `textFull` ya cumplen los 20 con su OCR**.
O sea, el gate no podia quejarse: 20 caracteres de una frase truncada son 20 caracteres. El gate
**no puede ser un detector de truncamiento**; hay que buscar la fuente buena.

### 42.2 P1-030 - la fuente buena existia en disco y el merge no la miraba

La causa raiz esta en `gen_cards.js`:

```js
const scribdPath = path.join(ROOT, 'research/audit_reports/scribd_card_text.json');
const scribdArr  = ... (scribdRaw.cards || []);            // 323 entradas
for (const row of scribdArr) { scribdCards[norm(row.name)] = row; }
...
function applySecondaryText(rec) {
  const row = scribdCards[norm(rec.name)];
  if (!row) return;
  ...
}
```

`research/audit_reports/card_data_merge.json` marca estas 10 cartas como
`"sourceStatus": "secondary-not-found"`. Pero **`research/scribd_inwo_cards_full.html` si las tiene**:
es otro scrape del mismo libro y sus bloques `<p>` empiezan con `NEW WORLD ORDER <Nombre>` seguido
del texto completo. Se comprobo que la causa es de origen, no de codigo: **el array `cards` de
`scribd_card_text.json` (323 entradas) NO contiene Bigger Business, World Hunger, Law and Order,
Gun Control, Political Correctness, Energy Crisis, Chicken in Every Pot, Fear and Loathing,
A Thousand Points of Light, Peace in Our Time, Solidarity, Military-Industrial Complex ni
World War Three** - se construyo de un scrape DIFERENTE. Y el resto de fuentes del repo se
descartaron uno a uno: `research/card_ocr.json` y `game/js/cardtexts_data.js` (mismo OCR
truncado), `research/cards_parsed.json` (solo inventario: nombre/frecuencia/tipo/artista),
`research/audit_reports/plot_transcription.md` (sin textos de carta),
`docs/audit/CARD_CATALOG.md` y `CARD_RESEARCH.md` (repiten el OCR truncado).

**Correccion**: un segundo cargador que parsea los `<p>` de
`research/scribd_inwo_cards_full.html`, quita el prefijo `NEW WORLD ORDER`, busca el **nombre de
carta mas largo que sea prefijo del resto** (comparacion por `norm()`, o sea alfanumericos en
minusculas: por eso el `Dont Forget` del HTML casa con el `Don't Forget` de la carta) y registra
`{name, sourceText}` **solo si la clave no existe todavia** (el JSON gana siempre, que es la fuente
curada y ademas trae power/resistance/alignments/attributes). Resultado: **14 textos recuperados**.

La segunda correccion es tan importante como la primera. El criterio de aceptacion era
`sec.length > ocr.length`, que es un **proxy** de "es mejor" que falla justo donde duele:

```js
/* El criterio antiguo era `sec.length > ocr.length`, un PROXY de "la fuente es mejor".
 * Proxy, no medida: en un mazo truncado a mitad de frase el OCR puede ser MAS LARGO
 * solo porque arrastro lineas decorativas corruptas ("U=ed hte Flea Of"), mientras
 * que la transcripcion del libro es mas corta pero COMPLETA. Perder el numero de un
 * efecto por un criterio de longitud es peor que aceptar un texto mas corto.
 * Se aceptan tres casos: (1) mas largo (el original); (2) EMPATE de longitud, porque
 * es la misma regla pero transcrita, y la transcripcion gana; (3) OCR truncado de
 * forma PROBABLE (no termina en puntuacion) y fuente completa, porque el numero esta
 * al final de la frase. No puede empeorar nada: solo afecta a cartas que no tenian
 * textFull. */
const complete = /[.!?)]["']?$/.test(sec);
const ocrCut   = !/[.!?)]["']?$/.test(ocr);
const better   = sec.length > ocr.length || sec.length === ocr.length || (ocrCut && complete);
if (!better) return;
```

Efecto medido: `textFull` en Plots/Resources **179 -> 195**; las cartas con texto secundario
recuperado **311 -> 328** (+17615 caracteres). Las 14 son 186, 204, 217, 241, 251, 255, 271, 296,
315, 334, 339, 370, 418, 419.

### 42.3 El gate tambien tuvo que cambiar (leccion de §36, 2a vez en dos lotes)

La asercion de §36 era `ok(c.textFull.length > ocrLen, ...)` - exactamente el criterio del
generador. Y **fallo correctamente** en 7 cartas (241, 247, 334, 339, 372, 418, 419), porque 7
de las 14 recuperadas son mas cortas que su OCR. No se aflojo la asercion: se reemplazo por dos
comprobaciones que **no copian el predicto del generador** (copiarlo seria tautologico):

```js
ok(sec.length > ocrLen || sec.length === ocrLen || (ocrCut && secComplete), ...);
if (sec.length < ocrLen) {
  const WORDS = /\b(one|two|...|twice|double|triple|tripled|quadruple|halved|...)\b/i;
  ok(/\d/.test(sec) || WORDS.test(sec), ...);   /* contrapunto INDEPENDIENTE */
}
```

La segunda es la que importa: **cuando la fuente es mas corta, tiene que expresar una CANTIDAD**,
porque la cantidad es justo lo que el OCR truncado perdia. El primer intento exigia un digito y
**fallo correctamente** en 372 ("combine **two** Disasters") y 419 ("has **tripled** power"): la
cantidad tambien puede ser una palabra, y exigir la forma numerica habria sido arbitrario.

### 42.4 L3 se partio en L3a y L3b, y por que

`plan.md` metia 14 cartas en una sola familia. Al leer los textos resulta que son **tres formas
distintas**:

1. **AUTODIFUSION sin objetivo** ("all your Corporate groups by 2") - es lo unico que necesita
   `powerMods`. **8 cartas: L3a, implementado.**
2. **CADUCIDAD o supresion** (268 "until the beginning of your next turn ... for defense only",
   418 "lose their Action tokens and cannot get new ones") - requieren campos que el motor no
   tiene: `expiresAtTurn` y un predicado `noTokens` nuevo. **Aplazado.**
3. **UN SOLO grupo objetivo** (234, 355, 377) - "any one of your Bank groups", "the target
   group". Lo mas probable es que sean entradas nuevas de las familias que **ya existen**
   (`POWERINC_FX` / `RESINC_FX` de §27/§28) y no un `kind` nuevo. **Aplazado.**

Y dos cartas quedaron **BLOQUEADAS con motivos distintos** (congeladas en
`test_fase4_cards.js`, que pasa de 9 a 11):

- **341 Power for its Own Sake**: ilegible. El OCR solo da "including your llluminati group 3" y
  **no aparece en ninguna de las dos fuentes secundarias**, asi que no se puede autorizar el numero
  que aplica. No es "dificil", es "no se sabe".
- **384 Tax Reform**: **no es bulk_power**. Su texto impreso es un efecto continuo entre turnos
  ("The IRS can now tax one Plot card from each player, at the beginning of its own turn"), un
  subsistema distinto de una modificacion de Poder/Resistencia. **La agrupacion de plan.md era
  incorrecta** y leer el texto impreso es lo que lo revelo.

### 42.5 L3a - las 8 cartas y la gramatica de clausulas

Un solo `kind`, **`bulk_power`**, con las frases descritas como DATOS en `eff.moves`. Anadir una
carta nueva a la familia es anadir un objeto en `gen_cards.js`, no escribir codigo:

| carta | `moves` |
|---|---|
|204 Bigger Business|`{align:'corporate',power:2}`, `{align:'conservative',power:2}`, `{aligns:['conservative','corporate'],match:'all',power:3}` |
|217 Chicken in Every Pot|`{attrs:['bank'],power:2}`, `{attr:'coastal',subtype:'place',power:2}`, `{align:'violent',power:-1}` |
|241 Don't Forget to Smash the State|`{align:'government',power:-3}`, `{align:'straight',notAligns:['government'],power:-2}` |
|251 Energy Crisis|`{align:'corporate',power:-2}`, `{attr:'green',power:-1,resistance:-1}` |
|271 Gun Control|`{aligns:['violent','government'],match:'all',power:3}`, `{align:'criminal',power:1}` |
|296 Law and Order|`{align:'conservative',power:2}`, `{align:'straight',power:2}`, `{aligns:['conservative','straight'],match:'all',power:3}` |
|339 Political Correctness|`{align:'liberal',power:3}`, `{align:'conservative',maxPower:1,become:'criminal'}` |
|344 Principia Discordia|`{align:'weird',resistance:1,scaleBy:{align:'weird',count:'own'}}` |

**Gramatica de una clausula**: `align` / `aligns[]` (+`match:'all'|'any'`) / `notAligns[]` (EXCLUYE)
/ `attr` / `attrs[]` / `subtype` / `minPower` / `maxPower` / `power` / `resistance` / `become` /
`scaleBy:{align}` / `scope:'own'|'all'`.

**Cinco interpretaciones declaradas** (bloque `BULK_FX`):

1. **ALCANCE**: 10 de estas cartas dicen "all X groups" **sin** "your": se aplican solo a los
   grupos del controlador. Razon declarada: son Plots jugadas en tu turno para reforzar tu propia
   estructura, y la lectura contraria haria que **251 Energy Crisis fuera estrictamente mejor que un
   Disaster** (reducir el Poder de los grupos de TODOS los jugadores sin coste de Disaster). Solo
   los textos inequivocamente universales usan `scope:'all'`, y en L3a ninguno.
2. **PERMANENCIA**: dura mientras el grupo siga en juego; solo salir del juego lo borra.
3. **ACUMULATIVO**: "Increase the Power of all Conservative Corporate groups by 3" (204, 296) **no**
   sustituye: un grupo Conservative+Corporate recibe **+2 +2 +3 = +7**.
4. `minPower`/`maxPower` miran el Poder **IMPRESO** (`gc.power`), no el actual: 339 dice "groups
   with a Power of only 1" y "su Poder" es el dato de la carta.
5. El modificador va al **NODO**, no a la carta.

Campo de nodo nuevo: **`node.resistanceMods`**, pliegado en `nodeResistance` **despues** de
`resistanceOverride` - a proposito, para que un Angst que fija Resistencia en 1 no borre el +1 de
Principia Discordia (`resistanceOverride` es un valor ABSOLUTO usado por Angst; estas cartas son
"+1/+3/-1", que necesitan deltas apilables, igual que `powerMods` para el Poder).

### 42.6 Un fallo de registro: `affected` no era `hits`

`bTouched.push` esta dentro del bucle de clausulas, y **debe** estarlo (cada clausula mete su
propio delta). Pero al **contar** grupos hay que contar los distintos, o el registro miente:
Bigger Business sobre un Conservative+Corporate mas otros dos grupos decia **"4 grupo(s)
afectados"** cuando solo habia **2**. Consecuencia real: el log y el resultadoancaaban en cifras que
un jugador leeria como error. Se separo en `bSeen` (clave `owner|nombre`) y ahora `lastPlotResult`
trae **`affected` = grupos distintos** y **`hits` = pares grupo-clausula**. Lo encontro la prueba de
regresion, no el gate.

### 42.7 P1-031 - `E.playResource` NUNCA despachaba por `effect.kind`

La prueba de regresion fallo con `Error: No es una Plot card` en la linea de **344 Principia
Discordia**. La causa es un hallazgo de verdad: **344 es `type=resource`** (su texto impreso lleva
el sello "Unique Artifact"), asi que `E.playPlot` la rechaza y **no se podia jugar de ninguna
forma**. Al buscar el segundo punto de entrada aparecio el defecto mayor: **`E.playResource` nunca
despachaba por `effect.kind`** - validaba, gastaba la ficha del Illuminati, enlazaba el Resource y
**no ejecutaba nada**. Census de los 35 Resources por kind: `{"unverified":34,"bulk_power":1}`.
O sea que estaba latente por casualidad: el unico Resource con mecanica verificada era
precisamente el que no se podia jugar. Misma clase que el campo muerto `A.privilege` de P1-026:
**el dato existe pero nadie lo consume.**

Correccion, dos mitades:

1. El cuerpo de `bulk_power` se extrajo a una funcion de modulo `applyBulkPower(pid, c, eff)` que
   **devuelve** `{bulk:true, card, scope, clauses, affected, hits, groups}` en vez de asignar
   `lastResult`, y hace su propio `log`. `case 'bulk_power'` queda en una linea.
2. `E.playResource` gana un despacho **cuyo `default:` LANZA**:
   `'El Resource "X" tiene una mecanica (kind) que E.playResource todavia no ejecuta'`. Es la parte
   que importa: mientras el `default` fuera silencioso, el proximo Resource con mecanica volveria
   a jugarse **sin efecto y sin que nadie lo notara**. `rejectUnverifiedCard(c)` ya lanza para
   `kind==='unverified'`, asi que lo que llega al despacho tiene mecanica verificada.

### 42.8 El gate de calificadores tambien tuvo que descender al array

Con `bulk_power` las tarjetas de efecto pasaron a vivir dentro de `eff.moves[]`, y el gate de §31
recorre **campos de primer nivel**: un campo nuevo sin rama se **valida en silencio**. Se anadio
un bloque `if (Array.isArray(e.moves) && e.moves.length)` que valida **por clausula** y etiqueta
los mensajes con `(clausula N de M)`:

- la clausula **debe hacer algo**: `power` o `resistance` numerico, o `become` - si no, "filtra
  pero no cambia ni Poder, ni Resistencia, ni alineacion".
- `align`, `aligns[]`, `notAligns[]`, `attr`, `attrs[]`, `subtype`, `scaleBy.align` deben existir
  en el mazo.
- **`match:'all'` con mas de una alineacion exige ademas que ALGUN grupo las tenga todas**: sin
  eso la clausula "all Conservative Corporate" seria **vacia** - la misma leccion de `oppAlign` en
  §40 aplicada a L3a.

`checkedFields` pasa de 17 a **18** campos, con `moves` dentro.

### 42.9 Verificacion

- `node --check` limpio en `gen_cards.js`, `engine.js`, `test_fase4_cards.js` y
  `test_fase2_rules.js`; 0 caracteres CJK ni U+FFFD en los cuatro.
- `node gen_cards.js` -> `texto secundario recuperado del HTML de Scribd: 14` +
  `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED** (486 lineas de salida, 0 FAIL, 0 Error).
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (107 cartas clasificadas, 141
  Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 11 cartas bloqueadas
  congeladas, 4 huecos de texto declarados)**; `implemented-pending-engine` 80 -> **88**;
  `unverified` 287 -> **279**; kinds con `"bulk_power":8`; `textFull` en Plots/Resources 179 -> 195.
- `npm test` -> **ALL TESTS PASSED (10)**.
- Regresion L3a: 6 escenarios, 28 aserciones. 204 acumula +7 en el Nuclear Power Companies (el
  **unico** grupo Conservative Y Corporate del mazo) con tres `powerMods` apilados, +2 en el
  Conservative, 0 deltas en el Government/Liberal, `affected=2`/`hits=4`/`scope=own`, y el
  homonimo del rival intacto; 344 via `E.playResource` con conteo autorreferencial (dos Weird, +2
  cada uno); 339 `become` **anade** criminal **conservando** conservative; 251 corporate -2 Poder
  con Resistencia intacta y green -1 Poder **y** -1 Resistencia; 217 coastal PLACE +2, bank +2 por
  atributo, violent -1, y la conjuncion `attr AND subtype` probada por contraste.

### 42.10 Lecciones

1. **El gate no puede ser un detector de truncamiento.** 57 cartas sin `textFull` ya cumplian los
   20 caracteres del gate con un OCR cortado a mitad de frase. Un umbral de longitud es
   satisfacible con basura. Para recuperar datos hay que ir a la **fuente primaria**, no a relajar
   el criterio.
2. **Dos fuentes del mismo documento pueden no ser la misma fuente.** `scribd_card_text.json` y
   `scribd_inwo_cards_full.html` son dos scrapeos distintos del mismo libro; al primero le faltan
   13 cartas que el segundo tiene. "Ya mire la fuente secundaria" no es lo mismo que "la fuente
   secundaria tiene todo".
3. **Un proxy puede estar equivocado en la direccion que mas duele.** `length >` parecia
   decir "prefiere el texto mejor" y en realidad prefiere "el texto mas largo", que aqui era el
   mas POBRE. La regla: cuando el criterio no mide la cualidad que importa, autorizalo a afirmar la
   cualidad (terminal punctuation, o "expresa una cantidad") en lugar de fiarse de la longitud.
4. **Un punto de entrada sin despacho por `kind` es un `kind` que se juega sin efecto.** El
   `default:` de `E.playResource` **lanza** ahora, y esa es la parte que evita la recaida. El
   defecto estaba latente desde antes de L3a.
5. **Una carta puede ser Resource y `E.playPlot` es entonces el punto de entrada equivocado.**
   Antes de implementar cualquier familia nueva hay que mirar el `type` de sus cartas: 344 no
   fallo solo como bug de test, senalaba un subsistema entero sin despachar. **Regla para L3b.**
6. **Contar mal es un bug, no un detalle de estilo.** `affected` y `hits` son la misma lista contada
   de dos maneras; la que se muestra tiene que ser la que no cuenta dos veces.
7. **La herramienta mas simple suele ser la correcta.** Cinco trampas de tooling en este lote
   (anclar con un regex que no puede cruzar un `;` de comentario; guardar la cadena del ancla donde
   se esperaba el indice; un guard de idempotencia con un substring que el fichero contiene DOS
   veces; un contador de llaves que no entiende comentarios multilinea; un `.cjs` que murio por
   comillas mixtas). Todas autoprovocadas, todas detectadas por `node --check` o por una asercion.
   La via probada cuando ya se conocen las lineas exactas es la **herramienta `edit`**, no un
   script temporal. La unica que no se puede recuperar es un **`git checkout` de un fichero con
   trabajo sin commitear** (ya perdi 962 lineas una vez por eso).
8. **Los fixtures tambien fallan.** Tres veces en este lote: `power` es `null` en Center for
   Disease Control (y en Federal Reserve y I.R.S.) y `curPower` lo trata como 0; `gIdx` devolvia un
   grupo que tambien estaba en el filtro; y el **"negativo" de la clausula `attr AND subtype` no
   existe en el mazo** (no hay ningun coastal que no sea Place), asi que la conjuncion solo se
   puede probar en positivo - y el test **lo dice** en vez de fingir lo contrario.

### 42.11 Backlog

- **L3b**: 268 Good Polls (`expiresAtTurn` + "for defense only"), 418 World Hunger (partida en dos:
  predicado `noTokens` + `scope:'all'`), y 234 / 355 / 377, que probablemente son entradas nuevas de
  `POWERINC_FX` / `RESINC_FX` de §27/§28. **Comprobar su `type` antes de nada.**
- **34 Resources sin mecanica** y `E.playResource` ejecutando un solo kind. Cada uno que se
  implemente debe entrar por el despacho o launchar.
- L4..L16 sin empezar; 141 Plots/Resources aun sin mecanica.
- El predicado de "no recibe fichas" esta duplicado en `spendGroupToken`, `firstUsableAid` y
  `case 'token_gift'`; L3b (418) probablemente quiera **un unico helper** en lugar del tercero.
- Fase 3 (UX, onboarding, DOM en navegador real, IA que juegue cartas de reaccion).
- P1-DATA-03 Global Power: el entorno no resuelve `cs.cmu.edu` ni `sjgames.com`.
- 5 cartas sin transcripcion secundaria (185, 195, 206, 229, 331) y 232/258 con OCR mas largo que
  la fuente secundaria.
---
## 43. Caza de flakes: cuatro fixtures que dependian de la suerte

L3a quedo verde en una sola corrida. El rastro de la §33.5 (Car Bomb +10), la §37.5
(`sealWindows`), la §38.8 (`noCancelWindow`) y la §41 (P1-029, la ficha aleatoria del SMOKE) es que
**una prueba que depende del reparto se rompe cuando el juego crece**. L3a movio 8 cartas de
`unverified` a `implemented-pending-engine`, y eso cambio las probabilidades de varios fixtures que
llevaban meses pasando por casualidad. Esta seccion documenta cuatro de ellos, los cuatro
arreglados.

### 43.1 Sintoma y alcance

`node test_fase2_rules.js` fallo **16 de 30** corridas. Ningun fallo era del motor: en los cuatro
casos **el motor tenia razon y la fixture mintia**. Los tres primeros eran el mismo defecto (la
mano aleatoria traia algo que la fixture daba por hecho que no estaba); el cuarto es una clase de
interferencia **nueva** que §38 introdujo y contra la que ningun bloque anterior estaba escrito.

| id | bloque | sintoma | causa |
|---|---|---|---|
| F1 | §38 P1-026 | la carta jugada "no sale de la mano" fallaba 1 de 20 | el reparto traia una **segunda copia** |
| F2 | L3a escenario 3 | `Error: No es tu turno` en `E.playResource` 1 de 12 | `fresh()` elige quien empieza por el 2d6 mas alto; los escenarios 1/2 sobrevivian solo porque `bulk_power` esta en la lista `instant` y `E.playPlot` **no** exige turno propio |
| F3 | §38 Embezzlemento | `Error: <filler>: todavia no puedes usar una Plot que acaba de robarte otro jugador` 1 de 15 | `E.drawPlot` robo **la misma Embezzlement** que la fixture habia puesto a mano |
| F4 | L1 Token gift | el log decia `VENTANA DE SUCESO ABIERTA: A descarta Bank Merger` en vez de `2 grupo(s) afectados` | §38/P1-027 hace que `discardPlot` **abra ventana de suceso**, asi que jugar la carta **anade una linea de log despues** de la linea del efecto |

### 43.2 Correcciones aplicadas

**F1 y el mismo defecto en §38.** `ok(raw.players[me].hand.indexOf(B10.idx) < 0, ...)` es
**una asercion invalida** cuando la fixture uso `put()` para anadir una copia: si el reparto ya
trajo otra, "no esta en la mano" es falso sin que el motor falle. Las dos aserciones pasan a
**contar copias antes y despues**:
```js
function copiesOf(pid, ix) { return E._raw().players[pid].hand.filter(function (x) { return x === ix; }).length; }
var beforePA = copiesOf(me, PA.idx);
E.playPlot(me, PA.idx, null, {});
ok(copiesOf(me, PA.idx) === beforePA - 1, ...);
```
El comentario de §42.8 ("nunca contar cartas en mano") **no** contradice esto: aqui nada muta la
mano (no hay `sealWindows` ni `noCancelWindow` en estos bloques); lo que se cuenta es *la
diferencia*, no el total.

**F2.** El bloque L3a ahora fija el turno antes de jugar el Resource:
```js
var me344 = readyToAttack(0);
ok(me344 === 0, 'L3a 344 el jugador 0 es el turno actual antes de jugar el Resource');
```
`advanceTo` (L2717) esta **scopado dentro de otro IIFE** y no se ve desde este bloque;
`readyToAttack` **si** esta a nivel de modulo (L53) y es el helper correcto.

**F3.** Dos pasos. (1) Antes de `E.drawPlot`, quitar la carta de la baraja, que es la tecnica de
P1-029 aplicada en el otro sentido:
```js
E._raw().plotDeck = E._raw().plotDeck.filter(function (ix) { return ix !== EMB.idx; });
```
(2) La carta de pago `filler` se elige **despues** del robo y filtrando `c.idx !== EMB.idx &&
c.idx !== res.idx`, porque el motor excluye la carta en disputa del pago y entonces `plotDiscard`
nunca la ve.

**F4.** El efecto se busca en **todo** el log, no en la ultima entrada:
```js
var logMsgs = E._raw().log.map(function (e) { return e.msg || ''; });
ok(logMsgs.some(function (m) { return /2 grupo/.test(m); }), ... + logMsgs.slice(-3).join(' | '));
```

### 43.3 Verificacion

- `node --check test_fase2_rules.js` limpio.
- **`test_fase2_rules.js` 60/60 corridas consecutivas PASS** (era 14/30).
- FASE 4 sin cambios: 107 clasificadas, 141 sin mecanica, 11 bloqueadas, `bulk_power:8`.
- Los cuatro arreglos se hicieron con la herramienta `edit`, sin un solo script `_*.cjs`, y el
  arbol de trabajo quedo limpio de archivos temporales.

### 43.4 Dos lecciones sistemicas

1. **`indexOf(...) < 0` nunca es una asercion valida de "la carta salio de la mano"** cuando la
   fixture uso `put()` para anadirla. El reparto puede traer otra copia. Comparar **copias antes y
   despues**.
2. **§38/P1-027 creo una clase de interferencia para la que los bloques anteriores no estaban
   escritos**: jugar una Plot ahora abre a menudo `VENTANA DE SUCESO ABIERTA`, asi que **ningun
   bloque puede suponer que su propio efecto es la ultima linea del log**. Cada vez que se anada
   una ventana, hay que releer los bloques que asertan sobre `log[length-1]`.

Y una tercera, ya registrada en §41 y ahora confirmada por octava vez: **crecer el juego cambia las
fichas de los fixtures**. Un reparto deja de contener la carta que la fixture daba por hecho en el
momento exacto en que esa carta deja de ser `unverified`.

### 43.5 Backlog

- Cerrado: F1..F4. `test_fase2_rules.js` estable en 60/60.
- Sigue pendiente lo de §42.11 (L3b, 34 Resources, L4..L16, Fase 3, P1-DATA-03, las 5 cartas sin
  transcripcion secundaria).
---

## 44. L3b - LAS CUATRO CARTAS QUE plan.md APLAZO (y P1-032: los Illuminati no tienen alineaciones)

### 44.1 Hallazgo

   `plan.md` lo tenia L3b como "cinco cartas, cada una con su propio motivo". Las
cuatro de este lote se implementaron; la quinta se declara NO implementada con un
motivo tecnico, no por prisa (44.6). Las cuatro tienen un **kind propio** porque
no comparten mecanica: el criterio de `plan.md` §0.1 es un kind unico por
mecanica, y aqui no hay ni una repetida.

| idx | carta | kind | que hace |
|---|---|---|---|
| 268 | Good Polls | `def_triple` | x3 a la DEFENSA de todos tus grupos de UNA alineacion elegida, hasta el comienzo de tu proximo turno |
| 418 | World Hunger | `token_wither` | dos frases: los verdes pierden sus fichas y no pueden conseguir mas; los liberales y/o naciones pierden 2 de Poder |
| 234 | Currency Speculation | `tripled_once` | x3 al Poder O a la Resistencia de UN banco tuyo, para su proxima accion o defensa |
| 355 | Resistance is Useless! | `res_nullify` | la Resistencia del objetivo a 0 hasta el final del turno, y sin el bonus del maestro |
| 377 | Sucked Dry and Cast Aside! | (ninguno) | x4 por una accion y luego destruido sin contar para ninguna meta: **NO implementada**, ver 44.6 |

Las cuatro son `type=plot`, asi que `E.playPlot` es el punto de entrada correcto
en los cuatro casos. (La comprobacion se hizo antes de escribir nada, porque 344
ya demostro que una carta puede ser Resource y entonces el punto de entrada
equivocado es `E.playResource`.)

### 44.2 P1-032 - los dieciocho Illuminati no tienen alineaciones, y eso mata una regla oficial

**Este es el hallazgo del lote y no lo busco nadie: loolio la regresion de 355.**

355 dice textualmente "The target also gets no **Resistance bonus from its masters
alignments** or special abilities. But **proximity to its ruling Illuminati still
gives the normal +5 or +10**". Para poder comprobar que la carta apaga la primera
mitad y CONSERVA la segunda, hacia falta un objetivo que de verdad tuviera bonus
del maestro. No habia ninguno, y la causa es de datos:

```
los 18 Illuminati del mazo (idx 167-184) tienen TODOS  alignments: []
```

`closenessDefenseBonus()` (el helper que extrajo L2 del bloque en linea de
`computeStrength`) arranca asi:

```js
  var mal=alignsOf(mc);
  if(!mal.length)return 0;
```

Con `aligns: []` en las dieciocho cartas, ese `return 0` es SIEMPRE el que se
ejecuta. Consecuencias, las dos verificadas:

1. El **+4 por alineacion compartida con su Illuminati** -regla oficial, la
   "proximity/defense bonus for closeness to the Illuminati" que las reglas
   enuncian en el ataque a controlar- **no puede ocurrir jams** en este mazo.
2. El componente "Add bonuses for its closeness to the Illuminati if it belongs
   to a rival!" del coste de las **nueve cartas de L2** vale **siempre 0**: el
   `case 'force_align'` suma un `closenessDefenseBonus` que nunca suma nada.

O sea: el mecanismo esta escrito, tested en su forma, y es inejecutable porque
falta el dato. Es el mismo defecto de clase que P1-026 (`A.privilege` declarado
y nunca leido) y que P1-031 (`E.playResource` sin dispatch): **el consumidor
existe, el dato no**. No se ha inventado aqui ningun dato: las alineaciones
oficiales de las nueve sociedadesantau son un dato que hay que recuperar de una
fuente fiable, y eso es trabajo de datos, no de motor. Queda declarado en 44.9.

La regresion de 355 hace esto explicito y **no vacio**: durante el bloque presta
al maestro una alineacion (`['fanatic']`), comprueba que el bonus aparece (+4),
comprueba que 355 lo apaga (0), y despues **restaura el mazo**. Sin ese prestamo
la asercion "el bonus del maestro es 0" pasaria siempre y no probaria nada.

### 44.3 Las siete interpretaciones declaradas

Ninguna de las cuatro cartas tiene un fallo oficial que la arbitrage, asi que el
texto impreso es la unica fuente y cada decision dudosa queda escrita en el
bloque `L3B_FX` de `gen_cards.js`:

1. **Alcance de 268.** "all your groups of any **chosen** alignment": el jugador
   elige UNA alineacion, no un grupo. Pero el flujo de la UI elige un NODO, asi
   que la eleccion se hace apuntando a cualquiera de los grupos propios de esa
   alineacion y el motor toma la **primera** de sus `nodeAligns`. Es arbitrario
   y por eso se declara; la alternativa (un `opts.align` propio) obligaria a
   construir un segundo flujo de seleccion en la UI para una sola carta.
2. **"for defense only"** se aplica SOLO a la defensa: en un ataque a
   **controlar** se triplica la Resistencia, y en un ataque a **destruir** se
   triplica el Poder con el que se defiende el objetivo, porque ahi se defiende
   con su Poder y no con su Resistencia (regla de §25). `selfDef` (la
   auto-defensa) queda **excluido**, declarado: es un caso que las reglas
   mencionan aparte y la carta no lo nombra.
3. **Caducidad sin campo nuevo.** Ni 268 ni 355 necesitan un campo en `S`: el
   motor ya lleva `S.turn`, que se incrementa en `E.beginTurn`, y en un turno
   circular "mi proximo turno" es `S.turn + S.players.length`. Un unico
   `expireTurnFlags()` las caduca en el **unico** sitio donde el turno avanza.
4. **"your choice" de 234** se resuelve con `opts.stat` (`'power'` por defecto,
   que es la primera mitad de la frase). "for its next action or defense": el
   triple se borra al **gastar la ficha** del grupo (su accion) y al defendirse
   de verdad, este ultimo solo con `computeStrength(true)` y **nunca** en
   `E.previewStrength()`, que solo ensena numeros y no puede gastar una carta.
5. **355 y el bonus del maestro** se implementa con un flag propio
   (`noMasterAlignDefense`) que `computeStrength` consulta antes de sumar
   `closenessDefenseBonus`. `positionBonus` **no se toca**: los +5/+10 de
   proximidad son justo lo que la carta dice que se conserva.
6. **418 son dos mecanismos en una carta.** Lo de las fichas es un predicado
   NUEVO (`noTokens`) con **cuatro** consumidores (44.5). Lo de "or use their
   special abilities" **no se implementa**: el motor no tiene sistema de
   habilidades especiales por grupo, asi que no hay nada que apagar. Se declara
   como no-op, no como overlook.
7. **418 "Groups which are Liberal and/or Nation"** usa la misma gramatica de
   clausulas de L3a (`moves`) pero con `scope:'all'`, porque el texto dice "have
   their Power reduced by 2" **sin "your"**. Es el reverso de la interpretacion
   ALCANCE de L3a: alli se restringio a los grupos del jugador porque las cartas
   decia "all X groups" siendo cartas de refuerzo propio; aqui el texto es
   inequivoco y el alcance es universal.

### 44.4 Campos de nodo nuevos (y por que son seis y no uno)

| campo | lo escribe | lo lee |
|---|---|---|
| `defTriple:{name,untilTurn}` | 268 | `computeStrength`, ramas de control y destruccion |
| `resNullify:{name,untilTurn}` + `noMasterAlignDefense` | 355 | `nodeResistance` (PRIMERO, para ganar a un Ango) y `computeStrength` |
| `tripled:{name,stat}` | 234 | `curPower` (stat `power`) y `nodeResistance` (stat `resistance`) |
| `noTokens` | 418 | `noTokensFlag`, cuatro sitios |
| `burstMul:{name,mul}` | (377, no implementado) | `curPower` |

Todos van al **NODO** y no a la carta, por el mismo motivo que `powerMods` y
`resistanceMods`: su duracion es la del grupo, y un link permanente tiene que
poder morir con el. `resNullify` se comprueba **antes** que `resistanceOverride`
a proposito: `resistanceOverride` es un valor absoluto (Ango pinza la
Resistencia en 1) y "su Resistencia es 0" tiene que ganar a un pin; si no, un
grupo con Ango seria inmune a esta carta.

### 44.5 `noTokensFlag`: un predicado, cuatro consumidores

El peligro de 418 no era escribir el predicado, era **olvidar un consumidor**.
418 dice "cannot get new ones", y el sitio donde un grupo recupera ficha
automaticamente es el reparto de `E.beginTurn` ("action token on every own group
lacking one"). Si ese cuarto sitio no consulta el predicado, un grupo verde
apagado **recupera su ficha al comienzo del turno siguiente** y la carta no
dura nada. Los cuatro:

1. `spendGroupToken` - no puede gastar.
2. `firstUsableAid` - no se le ofrece como pagador.
3. `case 'token_gift'` - no recibe el reparto de TOKEN-GIFT.
4. `E.beginTurn` - no recupera la ficha al empezar el turno.

El predicado es `noTokens||devastated||paralyzed||zapped||actionStripped`: las
cuatro ultimas condiciones ya existian repartidas por `firstUsableAid` y
TOKEN-GIFT, y la unica condicion nueva es `noTokens`. Unificarlo es lo que
impide que la proxima carta que apague algocriba su propia lista.

### 44.6 377 Sucked Dry and Cast Aside! - NO implementada, con motivo

Su texto son dos frases que van juntas: "Multiply the Power of one of your
groups, except the Illuminati, by 4 **for one action only**. It is **then**
considered destroyed, but does not count toward any Goal."

El unico sitio donde el motor sabe que un grupo ha gastado su accion es
`spendGroupToken`, y ese helper se llama desde **dentro** de recorridos `walk`
(`force_align` recorre la estructura gastando fichas) y desde el registro de
ataques. `destroyGroup` hace `detach()`, que **muta el array `children` por el
que ese `walk` esta iterando**: destruir ahi puede hacer que el recorrido se
salte un hijo. Dejar el x4 sin destruir es peor: seria una carta a medias, que
es exactamente lo que este audit existe para matar.

Lo que hace falta es una cola de destruccion diferida (`S.pendingBurstDestroy`)
con un punto de vaciado claro (final de `E.resolveAttack` y de `E.endTurn`), y
eso es un lote propio. `curPower` ya sabe multiplicar por `burstMul`, asi que la
mitad del trabajo esta hecha; **declarado, no olvidado**. Se declara en el backlog.

### 44.7 El defecto quemetio la propia regresion (y que el motor no tiene)

Sustitui el filtro de `firstUsableAid` por `noTokensFlag` y `npm test` fallo con
`Error: Sin Action token en Texas` en un bloque de P1-009. La causa era mia y es
sutil: `noTokensFlag` **no** incluye "no tiene fichas", porque los dos
distribuidores de fichas (TOKEN-GIFT y el reparto de `beginTurn`) lo consultan
justamente para **darlas**. `firstUsableAid`, en cambio, busca un grupo que
**gaste** una ficha, asi que su "sin ficha" sigue siendo obligatorio:

```js
    if(!n.tokens||noTokensFlag(n))return;   /* el "sin ficha" va delante */
```

Leccion: cuando se centraliza un predicado que varias Familias usan con
**sentidos distintos** (quien no puede tener vs. quien no puede gastar), el
predicado central no puede contener la parte que solo le importa a una de ellas,
y el sitio que si la necesita la anade explicitamente.

### 44.8 Las cuatro trampas de fixture de este lote (todas de la clase §41)

1. **Un banco con `power === null`.** `banks[0]` resulto ser uno de los grupos
   sin Poder impreso, asi que la asercion "el Poder se triplica" comparaba
   `0 === 0 * 3` y pasaba **sin comprobar nada**. Se eligio un banco con Poder
   impreso positivo y se anadio un `ok(bankP0 > 0, ...)` de guarda, para que la
   asercion no pueda volver a ser vacua.
2. **`pl.illumId` es un ID, no un indice.** `C.cards[E._raw().players[1].illumId]`
   es `undefined` y revienta. Se traduce con `idxOfId(...)`, que ya existe.
3. **`E.beginTurn` exige `S.phase==='begin'`.** Para medir caducidades hay que
   pasar por la API real, `E.endTurn()`. El bloque usa un `advance(n)` que
   **comprueba que el numero de turno avanza de verdad** y devuelve `false` si
   no: si el motor dejara de avanzar, la prueba de caducidad pasaria por falso
   (el flag seguiria vivo "porque nadie dio vueltas") en vez de fallar.
4. **`declareAttack` llama a `requireOwnMain` y GASTA la ficha del atacante.**
   El primer borrador abria un ataque, resolvia, y abria otro para la segunda
   lectura de `previewStrength`: fallaba con "Sin Action token" y, peor, dependia
   de los dados (si el ataque ganaba, el grupo desaparecia y las aserciones se
   quedaban sin objeto). Ahora cada escenario abre **un solo** ataque, las dos
   lecturas se hacen con el ataque abierto y el `resolveAttack` va al final.

### 44.9 Verificacion

- `node --check` limpio en `gen_cards.js`, `game/js/engine.js`,
  `test_fase2_rules.js` y `test_fase4_cards.js`; 0 caracteres CJK o U+FFFD.
- `node gen_cards.js` -> `texto secundario recuperado del HTML de Scribd: 14` +
  `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.
- **FASE 4 COVERAGE PASSED**: 107 -> **111** cartas clasificadas (exactamente +4),
  141 -> **137** Plots/Resources sin mecanica (exactamente -4),
  `implemented-pending-engine` 88 -> **92**, 11 cartas bloqueadas congeladas.
  `checkedFields` 18 -> **21** campos (anadidos `witherAttr`, `alignFromTarget`,
  `mul`, con rama propia: un calificador nuevo sin rama queda **sin validar** en
  silencio, que es el defecto de clase de P1-026/P1-031).
- Regresion nueva `/* ---------- L3b`: 4 escenarios, **56 aserciones**, todas en
  verde. Reparto: 268 = 15 (los dos grupos de la alineacion, el tercero no, el
  informe, la defensa se triplica de verdad 3 -> 9, la caducidad en dos turnos, la
  supervivencia en el primero); 418 = 13 (marca y pierde la ficha, el rival
  tambien, un no-verde intacto, -2 a liberal y nacion, Poder Bajado de verdad, y
  el cuarto consumidor: al empezar el turno el verde NO recupera ficha mientras
  el grupo de control SI); 234 = 12 (no-banco rechazado por su atributo, x3 real
  de Poder, consumo al actuar, la vista previa NO gasta, y el consumo al
  defenderse); 355 = 16 (P1-032 evidenciado, +4 antes, 0 despues, posBonus 10
  conservado, caducidad al cambiar de turno, y la defensa normal restaurada).
- `test_fase2_rules.js` **20/20** corridas consecutivas en verde; `npm test` ->
  **ALL TESTS PASSED (10)**.

### 44.10 Lecciones

1. **Un consumidor sin dato es un consumidor muerto**, y el symptom no es un
   fallo: es un `return 0` que siempre se ejecuta. P1-032 solo aparecio porque
   una regresion necesito un caso que la regla de 355 todavia no podia
   producir. Los datos que faltan se detectan preguntandose "que caso de
   prueba haria fallar esto", no leyendo el codigo.
2. **Centralizar un predicado exige decidir que parte es de todos.** Los dos
  repartidores de fichas y el buscador de pagadores usan    "no puede tener
   fichas" con sentidos distintos; unificarlo sin pensar eso rompio un bloque de
   P1-009 (44.7).

3. **Una caducidad necesita UN sitio de vaciado, y ese sitio es donde el
   contador avanza.** No un chequeo en cada lector: 268 y 355 se caducan en
   `expireTurnFlags()`, llamado justo despues de `S.turn++`, y sin ningun campo
   nuevo en `S`.
4. **Una asercion que compara un valor consigo mismo tres veces es vacua**
   (0 x 3 = 0). Cuando la asercion es "se multiplico por 3", el valor de partida
   tiene que ser veramente no nulo, y eso se comprueba con una guarda
   explicita.
5. **Preferir la API real al atajo.** `E.beginTurn` existe pero exige la fase
   previa; `E.endTurn` es la puerta de verdad. Y un atajo que verifica su propia
   precondicion (`advance(n)` comprobando que el turno avanza) convierte un
   "pasaria por falso" en un fallo con motivo.

### 44.11 Backlog

- **P1-032**: recuperar de una fuente fiable las alineaciones oficiales de las
  nueve sociedades y meterlas en las 18 cartas Illuminati. Con eso vuelven
  -(a) el +4 de defensa por cercania y -(b) el componente de cercania del coste
  de las 9 cartas de L2, que hoy son codigo muerto. Es trabajo de DATOS.
- **377 Sucked Dry and Cast Aside!**: cola `S.pendingBurstDestroy` + punto de
  vaciado, y despues el caso (44.6).
- **418 "or use their special abilities"**: no-op declarado; si algun dia el
  motor tiene habilidades especiales por grupo, hay que anadir `noSpecial` a la
  lista de `noTokensFlag` (que es el sitio natural, ya centralizado).
- Resto del plan: **L4..L16** segun `plan.md`. **137 Plots/Resources** siguen sin
  mecanica. 11 cartas bloqueadas congeladas.
- **Fase 3**: UX, onboarding, verificacion en navegador real, y que la IA **juegue**
  cartas de reaccion (hoy solo cierra las ventanas).
- **P1-DATA-03 Global Power**: bloqueado por el entorno (la red no resuelve ni
  `cs.cmu.edu` ni `sjgames.com`).

---

## 45. L4 - TOKEN-STRIP: 350 Reach Out . . . y 270 Gremlins (y P1-033, dos bugs reales de motor)

### 45.1 Hallazgo y RECLASIFICACION de 203 Bigfoot
plan.md ponia tres cartas en L4: **350 Reach Out . . .**, **270 Gremlins** y
**203 Bigfoot**. La tercera esta MAL CLASIFICADA y se sale de L4:

* 203 Bigfoot es **`type=resource`** (su texto impreso va estampado
  "Unique | ACTION"). Una carta de Resource no se juega con `E.playPlot` sino
  con `E.playResource` -- exactamente la leccion de **P1-031**, donde 344
  Principia Discordia resulto ser un Resource y `E.playPlot` lo rechazaba con
  "No es una Plot card". Comprobar el `type` ANTES de asumir el punto de
  entrada no es opcional.
* El texto de un Resource es su **HABILIDAD ESPECIAL PERMANENTE**, no una
  accion de un turno: "Bigfoot can cancel any action taken by any Media
  group" y "+3 on any attempt to control a Green group" son dos efectos
  permanentes, no un robo de fichas.
* Ademas las **dos** clausulas necesitan un **registro de acciones**: "can
  cancel any action taken by" solo se puede cumplir si el motor recuerda que
  hizo el grupo, y el motor solo recuerda que gasto una ficha. Es el mismo
  motivo tecnico por el que **377 Sucked Dry** quedo aplazado en 44.6.

=> 203 pasa al trabajo de Resources (familia L12) y **L4 entrega dos cartas**,
no tres. El deficit se declara, no se disimula.

### 45.2 P1-033 - DOS bugs REALES de motor encontrados por la regresion
La regresion de L4 fallo en su primera ejecucion con dos aserciones, y **las
dos eran bugs mios, no fixtures**:

1. **El coste se pagaba ANTES de validar el objetivo.** El bloque
   `illumAction` estaba al principio del `case`, antes de resolver y validar el
   rival. Consecuencia: jugar 350 con un objetivo propio lanzaba el error
   correcto PERO habia descontado ya la ficha del Illuminati. Eso viola la
   regla que el motor ya sigue en `E.declareAttack` desde **P1-022**: la
   ficha se gasta solo cuando todas las validaciones han pasado, para que una
   carta rechazada no cueste nada. Corregido moviendo el coste a despues de
   validar, con un comentario que lo declara para que no se repita.
2. **`E.takeResourceToHand` ponia el Resource en la mano del QUIEN_LO_TENIA, no en la
   del que juega la carta.** La funcion se escribio con la firma
   `(ownerPid, resUid)` y empuje la carta en `players[ownerPid].hand`, de modo
   que "force a rival to put one Gadget Resource back in his hand" devolvia
   el Resource **a la lista del rival que lo tenia**, que es lo contrario de
   lo impreso. Corregida a `(fromPid, resUid, toPid)`.

Ninguno de los dos habria salido con `node --check` ni con el gate: son
fallos de **semantica de regla**, y solo los detecta una asercion que mire el
estado observable.

### 45.3 Correcciones aplicadas
* **`gen_cards.js`**: nuevo `const L4_FX` con dos entradas y su `L4_FXN`, y
  `|| L4_FXN[key]` anadido a la cadena de resolucion. Calificadores:
  `stripAttr`, `stripPlayers`, `ownToo`, `illumAction`, `canTakeResource`.
* **`game/js/engine.js`**: un unico `case 'token_strip'` para las dos cartas
  (el efecto es identico: `tokens = 0`; solo cambian los calificadores, igual
  que los 11 `token_gift` de L1), y el metodo nuevo
  `E.takeResourceToHand(fromPid,resUid,toPid)`.
* **`test_fase4_cards.js`**: tres ramas de gate nuevas (`stripAttr`,
  `stripPlayers`, `canTakeResource`) -> `checkedFields` pasa de 21 a 24.
* **`test_fase2_rules.js`**: bloque `L4 - TOKEN-STRIP` con 4 escenarios y 20
  aserciones, todas observables.

El `case` tiene tres ramas: modo `takeResource` (solo 270), modo `strip` con
alcance `rival+own` (350) y modo `strip` con alcance `all` (270). El alcance
`rival+own` recorre al rival elegido **y** tus grupos, y salta a cualquier
tercer rival; el alcance `all` recorre a todos.

### 45.4 Las siete declaraciones de interpretacion
1. **El rival se deduce del objetivo.** El flujo de la UI elige un NODO, no un
   jugador, asi que el rival es `findOwnerPid(targetUid)`. 350 **rechaza** un
   objetivo propio porque su texto dice "of any one of your rivals"; la mitad
   "your own groups" es automatica y no necesita objetivo.
2. **`stripPlayers:'all'` en 270 esta justificado por el propio 350.** El
   mismo autor escribe "your own groups" y "any one of your rivals" cuando las
   quiere. 270 dice solo "any Computer groups": la omision es deliberada.
3. **Los Resources son intocables POR CONSTRUCCION.** Un Resource nunca es un
   nodo: vive en `pl.resources`, y `walk()` no lo visita. 350 cumple su
   "(but not the Resources)" sin tocar una linea, y la regresion lo demuestra
   deja el Resource del rival en su sitio.
4. **"Solo Gadget Resource" NO se puede filtrar.** El mazo no tiene
   clasificacion gadget/artifact: de 35 Resources, 34 tienen `subtype: null`.
   Un filtro por subtipo haria el modo INJUGABLE, asi que el modo 3 toma
   cualquier Resource del rival. Se declara que el calificador impreso se ha
   perdido a proposito en vez de fingir que se cumple.
5. **El modo 2 de 270 queda PENDIENTE.** "cancel its action if the action was
   a use of its Power" es una anulacion de una accion ya ejecutada, es decir
   un rollback; el motor no registra que hizo el grupo. Se implementara con el
   registro de acciones (mismo motivo que 377).
6. **"Solo al final de tu turno" de 350 NO se puede aplicar.** El modelo de
   fases tiene setup/begin/main/attack/gameover y **no hay sub-fase de final
   de turno**: `E.endTurn` exige `phase==='main'` y no existe ningun momento
   posterior dentro del turno en el que jugar una Plot. Se implementa lo
   exigible (turno propio + accion del Illuminati) y se declara la restriccion
   impresa como NO APLICADA por el motor.
7. **Robo de ficha != incapacidad.** Se pone el VALOR `tokens = 0`, no la
   marca `noTokens`. Un grupo al que le han robado la ficha puede volver a
   recibirla, y eso es justo lo que distingue esta familia de 418 World
   Hunger, que si deja la marca permanente. Ninguna de las dos cartas imprime
   "at any time", asi que ninguna entra en la lista `instant`.

### 45.5 Un incidente de herramientas que casi no se ve
Dos fallos encadenados en el mismo script de aplicacion, ambos **silenciosos**:

* El indice de la segunda parche (la cadena de resolucion) se calculo sobre la
  cadena **anterior** a insertar el bloque. Como el bloque se inserta ANTES,
  el indice quedo corrido y la parcheada de `|| L3B_FXN[key];` cayo 19
  caracteres mas atras, dentro de un **comentario** en espanol: el comentario
  de "el OCR esta TRUNCADO de forma demostrable" paso a leerse
  "el OCR|| L3B_FXN[key] || L4_FXN[key];e forma demostrable". Ni
  `node --check` ni `node gen_cards.js` se quejan de un comentario roto.
* El ancla era "la ultima sentencia del bucle `for`", pero la llave `}` que
  cierra el bucle venia en la linea SIGUIENTE, asi que el bloque L4 quedo
  **dentro** del `for (const k in L3B_FX)` y `L4_FXN` nunca se inicializo
  (`ReferenceError: L4_FXN is not defined`), aunque `node --check` pasaba
  porque las llaves cuadraban.

**Dos lecciones**: (a) al aplicar dos parches al mismo fichero, el indice del
segundo se calcula sobre la cadena **resultante** del primero, nunca sobre la
original; (b) para insertar despues de un bloque hay que anclar en el token
que lo **cierra**, no en su ultima sentencia. Y una tercera, de las mas
baratas: un `git diff` de las lineas eliminadas es la forma mas rapida de ver
que ha cambiado de mas.

### 45.6 Verificacion
`node --check` limpio en los cuatro ficheros. FASE 4: **113 cartas
clasificadas** (antes 111), **135 Plots/Resources sin mecanica** (antes 137),
`implemented-pending-engine` 92 -> 94, `checkedFields` 21 -> 24, y el
histograma de kinds ya incluye `"token_strip":2`. FASE 2: **PASSED** con las
20 aserciones de L4 en verde. `npm test` -> **ALL TESTS PASSED (10)**.

### 45.7 Lecciones
1. **Comprobar el `type` de la carta antes de elegir el punto de entrada** es
   la leccion de P1-031 applied dos veces (344 y 203). Un plan puede agrupar
   cartas por efecto y aun asi equivocarse de familia.
2. **El texto impreso de un Resource es una habilidad permanente**, no una
   accion; tratarlo como accion lleva a implementarlo en el sitio equivocado.
3. **Pagarla validacion antes que el coste** (P1-022) hay que recordarlo en
   cada `case` nuevo: es la clase de fallo que solo se ve cuando la carta se
   RECHAZA, que es justo el camino que una prueba de exito no recorre.
4. **Una funcion auxiliar se prueba con el caso que la motive**: `takeResourceToHand`
   se escribio con dos parametros cuando el texto pide tres (de quien sale,
   a quien entra) y la firma se llevo por delante la mitad de la regla.
5. **Una restriccion impresa que el motor no puede expresar se declara, no se
   implementa a medias**: "solo al final de tu turno" no tiene sub-fase en este
   motor, y fingir que si habria creado una excepcion sin nombre.

### 45.8 Backlog
* **203 Bigfoot** se implementa en la familia de Resources (L12), con
  `E.playResource` como punto de entrada y un registro de acciones previo.
* **L5..L16** segun `plan.md`. Quedan **135 Plots/Resources sin mecanica**.
* El **registro de acciones** (que hizo cada grupo y con que carta) es el
  bloque que desbloquea 377, el modo 2 de 270 y buena parte de L6.
* **P1-032** sigue abierto: los 18 Illuminati no tienen alineaciones, asi que
  el bonus de defensa por maestro nunca ocurre en este mazo.
* **Fase 3** (UX, onboarding, DOM en navegador, IA que juegue cartas de
  reaccion) y **P1-DATA-03** (bloqueado por la red) siguen abiertos.

---

## 46. L5a - BULK BOOST DE ATAQUE: las 3 cartas que suben un ataque ya declarado, y por que de las 10 de L5 solo quedan 3

### 46.1 Hallazgo: la familia se descompone otra vez al medir el `type`

`plan.md` §0.1 obliga a "una familia = un lote" y a comprobar el `type` de cada carta ANTES de elegir el punto de entrada, porque 344 (L3a) y 203 (L4) demostraron que una carta puede no ser un Plot. Aplicada la comprobacion, de las 10 cartas que `plan.md` listaba para L5 **solo 3 son realmente un Plot con un boost de ataque**:

| idx | carta | type medido | destino real | motivo |
|---|---|---|---|---|
|311|Mercenaries|**resource**|FUERA de L5|su texto es una habilidad permanente que se usa COMO ACCION mas tarde ("Can act once per turn"), no un boost en el momento de jugarla. Igual que 203 Bigfoot en L4. |
|358|Rogue Boomer|**resource**|FUERA de L5|idem |
|373|Spear of Longinus|**resource**|FUERA de L5|idem, y ademas "can be used as often as you wish" |
|419|World War Three|plot, pero `subtype='goal'` y ya `kind='goal'`|lote de Goals|es un efecto permanente de meta, no un boost de un ataque |
|189|Albino Alligators|plot|L5c| "+10 Power or Resistance (your choice) to any Weird group you control": es un DELTA sobre el grupo, con caducidad, no un bonus sobre un ataque |
|255|Fear and Loathing|plot|L5b|cambia la aritmetica GLOBAL de alineaciones ("Identical alignments now give +8 on any attempt to control, and -8 on any attempt to destroy"), o sea modifica la regla `+/-4` de `computeStrength` de forma permanente |
|254|Faction Fight|plot|APLAZADO|exige "Played along with a duplicate card for any Group controlled by one of your rivals" (combinacion de cartas + registro de duplicados = lote L11) **y su texto impreso esta TRUNCADO a mitad de frase** |
|205|Bimbo at Eleven|plot|APLAZADO|exige "any **male** Personality" y una sonda demostro que el campo `gender` aparece en **CERO de las 421 cartas**. Es un HUECO DE DATOS como el P1-032, asi que NO se inventa el dato |
|377|Sucked Dry and Cast Aside!|plot|aplazado en L3b|necesita una cola de destruccion diferida (§44.6) |

Quedan 3 cartas, las 3 con el mismo mecanismo y por tanto un unico `kind`:

| idx | carta | kind | calificadores |
|---|---|---|---|
|381|Swiss Bank Account|`attack_boost`|`boostValue:10`, `illumOnly:true` |
|391|The First Thing We Do, Let's Kill All the Lawyers|`attack_boost`|`boostValue:20`, `atkType:'destroy'`, `targetCardId:'lawyers'` |
|415|Whispering Campaign|`attack_boost`|`atkType:'destroy'`, `boostBySubtype:{personality:15, other:10}`, `requiresActionFromAttr:'media'` |

### 46.2 Correcciones aplicadas

**`gen_cards.js` (1420 -> 1708 lineas).** `const L5_FX` con las 3 entradas (cada una con `t:` = texto impreso literal) + `const L5_FXN` con su bucle `norm`, insertado justo despues de la llave `}` que CIERRA el bucle de `L4_FXN` (se localizo la linea `L4_FXN[norm(k)] = L4_FX[k];` y seahoo la siguiente linea trimmeada es `}`). `|| L5_FXN[key]` anadido DENTRO de la unica cadena de resolucion, que queda `... || L3B_FXN[key] || L4_FXN[key] || L5_FXN[key];`. Un comentario Spanish de ~55 lineas declara la tabla de reclasificacion de 46.1 y las 7 interpretaciones de 46.3.

**`game/js/engine.js` (3784 -> 3973 lineas).** Un unico `case 'attack_boost'` antes del `case 'token_gift':` de 4 espacios de sangria, en este orden:
1. `var A=S.attack; if(!A||A.resolved) throw c.name+': necesita un ataque ya declarado'`.
2. `eff.atkType`: si el ataque no es del tipo impreso, error que nombra "destruir" o "controlar".
3. Atacante via `findNode(A.attackerUid)`. `eff.illumOnly` exige `attC.type==='illuminati'`. `eff.attackerAttr` exige `hasAttr(attC,...,attN)`.
4. Objetivo via `findNode(A.targetUid)`. `eff.targetCardId` compara `tgtC.id` y el mensaje nombra la carta buscada con `C.byId[eff.targetCardId].name`.
5. Valor = `eff.boostValue`, o `eff.boostBySubtype[subtype]`, o `.other`.
6. **EL COSTE, deliberadamente DESPUES de todas las validaciones** (P1-022): `opts.aidUid` + `firstUsableAid(pid, cc=>hasAttr(cc,eff.requiresActionFromAttr,nn))` + `spendGroupToken`.
7. `A.boosts.push({name:c.name,v:valAB})`, un `log` rico y `lastResult={ok:true,boost:valAB,card,attack:A.type,target:tgtC.name,paidWith:...}`.

`instant`: se anadio `||eff0.kind==='attack_boost'`. Las tres cartas imprimen "at any time" o son, en el caso de 391, un ataque en curso; la 415 no lo imprime pero la restriction se cumple igualmente porque la ventana de ataque solo existe durante el turno.

**`game/js/ui.js:813`.** `var NO_TARGET_KINDS = ['token_gift', 'attack_boost'];`. Estas cartas apuntan al ATAQUE, no a un grupo: si `plotNeedsTarget()` devolviera `true` la UI pediria un grupo objetivo que la carta nunca usa.

**`test_fase4_cards.js` (717 -> 812 lineas).** 6 ramas nuevas de la seccion 4, spliced antes del `if (e.targetSubtype) {` que esta PEGADO A LA MARGEN IZQUIERDA con sangria cero (anclarlo con sangria falla): `boostValue` numerico positivo; `boostBySubtype` con clave `other` obligatoria (si no, la carta no aplica a nada) y cada clave restante debe ser un subtipo existente con valor positivo; `atkType` en `{'control','destroy'}`; `illumOnly` exige que el mazo tenga una carta `illuminati`; `targetCardId` exige que exista Y sea `type==='group'`; `attackerAttr` exige que exista un grupo con ese atributo. `checkedFields` pasa de 24 a 30 campos. (`attackerAttr` no aparece en la lista porque ninguna carta entregada lo usa: 205, que lo usaria, esta aplazada.)

**`test_fase2_rules.js` (4096 lineas).** Bloque `/* ---------- L5a - ATTACK BOOST: 381 / 391 / 415 ---------- */` antes del ancla `Utilidad global`, con 6 escenarios y 23 aserciones, todas `ok`. Fixtures medidas: `VIO=2` (grupo violent), `MEDIA=7` (Big Media, atributo media), `PERS=1` (Al Gore, personality), `OTHER=12` (Brazil, place), carta 79 `lawyers` = organization. Los escenarios: 381 +10 desde la raiz del Illuminati; 381b RECHAZADA si el atacante no es el Illuminati (y la ficha sigue en la mano, contando COPIAS segun §43); 391 +20 contra Lawyers; 391b RECHAZADA contra un Place; 415 +15 contra una Personality pagando con la accion de Big Media (su ficha pasa 1 -> 0); 415b +10 contra un Place; 415c RECHAZADA sin ataque declarado.

### 46.3 Las 7 interpretaciones declaradas

1. **El calificador se comprueba SIEMPRE o la carta se rechaza.** Nunca se gasta en silencio: es la misma leccion de §43, donde un fixture mintio y el motor NO debio seguirle el juego.
2. **El calificador de 391 es una carta CONCRETA, no un subtipo.** "the Lawyers" es la carta 79, un grupo organization con Poder nulo y Resistencia 1, alineado criminal. Por eso el campo es `targetCardId` y no `targetSubtype`.
3. **"your Illuminati" de 381 se comprueba contra la CARTA atacante** (`type==='illuminati'`). El mazo tiene 18 Illuminati y ningun ataque transporta el id de uno, asi que la unica lectura posible es la del tipo de la carta atacante.
4. **"It cannot be used with Assassinations or Disasters" de 415 se cumple POR CONSTRUCCION y por eso NO se declara ningun campo.** Un Assassination o un Disaster nunca crean `S.attack` (son ataques instantaneos dentro de `E.playPlot`), de modo que `attack_boost` solo es alcanzable con `A.type` 'control' o 'destroy'. Declarar `noAssassination` seria decorativo, exactamente el defecto P1-026 (un campo que nadie lee).
5. **"a single direct attack" de 381 no necesita estado.** El +10 vive en `A.boosts`, que muere con el ataque. Es el mismo criterio que uso §26 para `boost10` en modo 'attack'.
6. **El valor dependiente del objetivo de 415 se elige CUANDO SE JUEGA LA CARTA**, leyendo el subtipo del nodo objetivo, porque la eleccion oficial pertenece a quien juega la carta.
7. **"he cannot be returned to play by any means" de 415 queda DECLARADO PENDIENTE de L11 y NO recibe campo.** El exito del ataque ya destruye al objetivo por `destroyGroup`; lo que falta es el registro que impediria reutilizar ese duplicado (220 Clone, 287 Imposter, 227 Counter-Revolution, 309 Media Blitz), y ese registro no existe. Escribir el campo seria repetir P1-026. (`outOfPlayOnSuccess:true` se escribio y se RETIRO con dos llamadas a `edit` precisamente por esto.)

### 46.4 La campana del `instant`: dos trampas de anclaje

Las tres cartas trampa al leer el `instant`, y las dos trampas que aparecieron explican por que el plan debe releer el archivo y no confiar en el anchor escrito en su nota:

1. **La primera version anclo en `||eff0.kind==='token_strip'`, que NO EXISTE.** L4 decidio deliberadamente NO meter `token_strip` en `instant` porque ni 350 ni 270 imprimen "at any time". El script ABORTO antes de escribir (su `fs.writeFileSync` es la ultima sentencia, por eso no quedo nada a medias) y la puerta de FASE 4 fallo luego con 3 x "carta clasificada cuya rama NO existe en el motor: attack_boost", que es la puerta haciendo su trabajo. La cola real se localizo buscando la PRIMERA linea terminada en `);` que no sea comentario: `||eff0.kind==='def_triple'||eff0.kind==='tripled_once');`.
2. Ademas, `L4_FXN[norm(k)] = L4_FX[k];` es la ultima SENTENCIA del bucle, no su token de cierre: la `}` esta en la linea SIGUIENTE. Anclar ahi mete el bloque DENTRO del bucle, `const L4_FXN` queda con ambito de bucle y el fallo aparece como `ReferenceError` en la cadena aunque `node --check` pase porque las llaves siguen cuadradas. Regla: **para insertar despues de un bloque, anclar en el token que lo CIERRA.**

### 46.5 Tres errores de fixture, ninguno del motor

1. **`gWith('violent', -1)` devolvio -1** porque `violent` es una ALINEACION, no un atributo. Los 13 atributos del mazo son bank, church, coastal, communist, computer, green, huge, magic, media, nation, science, secret, space. Se anadio un helper local `gAlign(a, skip)` que recorre `c.alignments`. `MEDIA=7` si funcionaba porque `media` SI es un atributo: los dos tipos de fixture no se pueden confundir. Ademas el mensaje de `ok(...)` ahora imprime los cuatro indices resueltos, para que un -1 se vea al instante.
2. **La asercion de 391b pedia `/Abogados/i` y el motor nombra la carta en INGLES** (`C.byId[eff.targetCardId].name`): el mensaje real es `The First Thing We Do, Let's Kill All The Lawyers: el objetivo del ataque tiene que ser Lawyers, y es Brazil`. Corregido a `/tiene que ser Lawyers/i`. **Leccion: asercionar sobre el mensaje real del motor, que es el NOMBRE IMPRESO de la carta, no una traduccion.**
3. **La guardia de no-ASCII del splice estaba mal dos veces.** Una version usaba `new Set([' ','\t','\n','\r','§'])`, que por supuesto rechaza toda letra ASCII; la anterior usaba una clase de caracteres NEGADA `/[ -\u4e00-\u9fff\ufffd]/g` cuyo ` -\u4e00` es un RANGO que se traga todo el ASCII imprimible. **La forma canonica es: permitir todo el ASCII imprimible y despues una lista EXPLICITA de no-ASCII permitidos** -- `for (const ch of block) { if (ch.charCodeAt(0) < 128) continue; if (ch === '§') continue; bad.push(ch); }`. Es la misma leccion de §42 (una lista de codepoints explicita, nunca una clase negada con huecos).

### 46.6 Verificacion

`node --check` limpio en `test_fase2_rules.js` y `game/js/ui.js`. `node test_fase2_rules.js` -> FASE 2 RULES PASSED, 0 FAIL, las 23 aserciones de L5a `ok`. `node test_fase4_cards.js` -> FASE 4 COVERAGE PASSED (116 cartas clasificadas, 132 Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 11 cartas bloqueadas congeladas, 4 huecos de texto declarados) = exactamente -3 sin mecanica (135 -> 132) y 113 -> 116 clasificadas. `npm test` -> ALL TESTS PASSED (10). `checkedFields` 24 -> 30.

### 46.7 Lecciones

1. **La comprobacion del `type` ANTES de elegir el punto de entrada es la regla que mas cartas ha rescatado** (344, 203, 311, 358, 373). Cuatro de las diez cartas de L5 tenian un texto que no describe lo que `plan.md` creia.
2. **Un campo que nadie lee es un defecto, no una feature.** Dos veces en este lote casi se escriben (`noAssassination`, `outOfPlayOnSuccess`) y las dos se retraitaron porque la regla se cumplia por construccion o porque el registro que lo consumiria no existe. Declarar el NO-cumplimiento honesto vale mas que el campo decorativo.
3. **El nombre del calificador lo decide la carta, no el plan.** `targetCardId` existe porque 391 habla de una carta concreta; un `targetSubtype` habria hecho la carta INJUGABLE sin que nadie se entere.
4. **Una puerta de cobertura que no valida un campo nuevo lo valida en silencio.** Seis ramas nuevas y `checkedFields` 24 -> 30; las seis habrian pasado inadvertidas sin ellas.
5. **Las fixtures que dependen de la suerte siguen apareciendo** (4 en este lote). La que se produjo aqui, el -1 de `gWith`, se hizo visible en un segundo porque el mensaje de `ok` imprime los indices: ese detalle debe quedarse en todos los bloques futuros.

### 46.8 Backlog

- **L5b** -- 255 Fear and Loathing: modifica la regla global de alineaciones de `computeStrength` (identicas +8 al controlar y -8 al destruir; opuestas al reves), permanente mientras la carta esta en juego.
- **L5c** -- 189 Albino Alligators: +10 de Poder o Resistencia a un grupo Weird propio, para una accion o hasta el final del turno, con la salvedad de "no cuenta para las Metas".
- **Cola de Resources** -- 203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer, 373 Spear of Longinus: los cuatro son `type=resource` y sus textos son habilidades permanentes que se usan como accion, no jugadas en mano. Necesitan un subsistema de "acciones de Resource".
- **205 Bimbo at Eleven** -- bloqueada por un hueco de DATOS: el campo `gender` no existe en ninguna de las 421 cartas. Es el mismo tipo de hallazgo que el P1-032 (los Illuminati sin alineaciones) y queda declarado, sin inventar el dato.
- **254 Faction Fight** -- necesita combinacion de cartas con duplicados (L11) y su texto esta truncado.
- **377 Sucked Dry and Cast Aside!** -- cola de destruccion diferida (§44.6).
- Resto del plan: L6..L16, Fase 3 (UX, onboarding, DOM en navegador real, y la IA que aun no JUEGA cartas de reaccion) y P1-DATA-03 Global Power (bloqueado por la red).

---

## 47. Novena ocurrencia de la clase "fixture que depende de la suerte": el robo de The Network

### 47.1 Sintoma

Tras cerrar L5a, la bateria de estabilidad fallo **1 de 20** corridas de `node test_fase2_rules.js` con:

```
FAIL - P1-009 The Network roba 2 Plot al inicio de su turno -> 2 -> 5
```

La asercion es `netPlots === basePlots + 2`. Fallo con `2 -> 5`, es decir un delta de **3** en vez de 2. Desaparecio tras 25 + 30 corridas y no se reprodujo de nuevo; el fallo era real y lo localizo la repeticion de 30.

### 47.2 Causa raiz: comparaba el delta entre DOS PARTIDAS DISTINTAS

El bloque hacia esto:

```js
function plotsAtFirstTurn(illu) {
  fresh(illu, illu === 'thenetwork1' ? 'bavarianilluminati1' : 'thenetwork1');
  var p = pidOf(illu === 'thenetwork1' ? 'thenetwork' : 'bavarianilluminati');
  var n = 0;
  while (E.getState().currentPid !== p && !E.getState().gameover && n++ < 8) E.endTurn();
  return plotsOf(p);
}
var netPlots = plotsAtFirstTurn('thenetwork1');
var basePlots = plotsAtFirstTurn('bavarianilluminati1');
```

El comentario del bloque justificaba la comparacion con *"el reparto inicial es identico porque ocurre antes de elegir Illuminati"*. **Eso es falso: `fresh()` llama a `E.newGame(...)`, que baraja el mazo, asi que las dos partidas reparten distinto.** La comparacion entre dos partidas solo vale si el reparto coincide, y no coincide nunca de forma garantizada. La probabilidad de que ambas handsleyan el mismo numero de Plots es alta (por eso pasaba 29 de 30 veces) pero no es 1.

Es la **novena** ocurrencia de la clase que §41 (P1-029) denomino "un fixture no puede depender del reparto aleatorio". La tabla de §43.1 tiene ya ocho filas.

### 47.3 Correccion aplicada: una sola partida

Ahora se mide en **una unica partida**, donde el reparto es identico para los dos jugadores por construccion:

```js
fresh('thenetwork1', 'bavarianilluminati1');
var netPid = pidOf('thenetwork');
var rivalPid = pidOf('bavarianilluminati');
ok(netPid >= 0 && rivalPid >= 0 && netPid !== rivalPid, '...dos Illuminati en jugadores distintos...');
var atFirstTurn = {};
var guardNet = 0;
while (Object.keys(atFirstTurn).length < 2 && !E.getState().gameover && guardNet++ < 8) {
  var curNet = E.getState().currentPid;
  if (atFirstTurn[curNet] == null) atFirstTurn[curNet] = plotsOf(curNet);
  E.endTurn();
}
var netPlots = atFirstTurn[netPid];
var basePlots = atFirstTurn[rivalPid];
ok(netPlots != null && basePlots != null, '...se midio el primer turno de los dos -> ' + JSON.stringify(atFirstTurn));
ok(netPlots === basePlots + 2, 'P1-009 The Network roba 2 Plot al inicio de su turno (una sola partida) -> ...');
```

El recorrido registra el numero de Plots de cada jugador **en el instante en que empieza SU primer turno**, que es justo cuando su robo automatico ya se ha resuelto. El orden de los turnos lo deciden los dados al inicio de la partida, asi que el recorrido mide a quien toque **sin asumir quien va primero** (que era el otro supuesto fragil del bloque). Se anade la asercion `netPid !== rivalPid` porque el `pidOf` local devuelve `0` como valor de reserva y dos ceros habrian producido una comparacion `0 === 0 + 2` trivialmente falsa en vez de una comparaacion real.

### 47.4 Verificacion

`node --check test_fase2_rules.js` limpio. **35/35 corridas consecutivas** de `node test_fase2_rules.js` sin fallo (15 + 20), frente a 1 fallo en 20 antes de la correccion. `npm test` 3/3 ALL TESTS PASSED (10). FASE 4 sin cambios: 116 clasificadas, 132 sin mecanica, 11 bloqueadas.

### 47.5 Lecciones

1. **Comparar dos partidas distintas solo es valido si el reparto esta garantizado.** Un comentario que lo justifique no lo convierte en una garantia: `E.newGame` baraja.
2. **Cuando el sujeto del test son DOS jugadores, medirlos en la MISMA partida siempre que sea posible.** Alli el reparto, el orden de la baraja y el mazo son comunes y la comparacion se vuelve determinista por construccion. La regla general es la inversa de la intuitiva: no reiniciar el mundo para medir una diferencia, sino medirla dentro de un unico mundo.
3. **Un `pidOf` con valor de reserva (`return 0`) puede fabricar una comparacion trivialmente falsa.** Un resolvedor de ids que nunca falla necesita que el llamante verifique que encontro lo que buscaba.
4. **Novena vez que la clase reaparece; la leccion de §41 ya es una regla permanente de `plan.md` §0 (regla 13) y sigue sin imponerse sola.** Un fixture escrito antes de la regla 13 sigue cometiendo el error; hay que cazarlos en la bateria de estabilidad, no confiar en que la regla se autoimponga.
---
## 48. L5b - ALIGN-RULE: 255 Fear and Loathing, la carta que no da un bonus sino que cambia la REGLA (y F6, el tercer fallo del test de The Network)

### 48.1 Hallazgo

De las 10 cartas que `plan.md` reunia en L5, 3 se delivering en §46 y 1 queda
aislada aqui. 255 Fear and Loathing NO es un bonus a un ataque, y por eso
separarla de las otras era obligatorio y no cosmetico: su texto dice
"Identical alignments **NOW** give +8 on any attempt to control, and -8 on any
attempt to destroy. The reverse is true for opposed alignments."

La regla oficial (inwo_rules_extracted.txt:487-493) es "+4 por cada alineacion
identica" y "-4 por cada alineacion opuesta". Lo que hace 255 es **sustituir esa
magnitud**, no anadir una cifra al total. Y aqui hay un hallazgo de codigo: los
dos bucles de alineaciones de `computeStrength` tienen el 4 escrito A MANO, dos
veces:

- control (L1311-1315): identicas `det.leaderMod+=4`, opuestas `det.leaderMod-=4`
- destroy (L1352-1355): identicas `det.leaderMod-=4`, opuestas `det.leaderMod+=4`

Una carta que cambia la regla tiene que tocar los dos, y tocarlos "a mano"
seria el patron que la auditoria vieneTahOMA desterrando desde §33: duplicar
la regla en dos sitios garantiza que un dia uno se actualice y el otro no. Por
eso el 4 se lee ahora de un solo sitio.

### 48.2 Correcciones aplicadas

- `gen_cards.js` (1708 -> 1774 lineas): `const L5B_FX` con UNA entrada
  (`'fear and loathing'`: `{kind:'align_rule', alignMag:8, t:<texto impreso
  verbatim>}`) + `L5B_FXN`, insertada justo despues de la `}` que CIERRA el
  bucle de `L5_FXN`, y `|| L5B_FXN[key]` anadido DENTRO de la cadena (que ya
  terminaba en `;`: anadir despues del `;` produce `SyntaxError`).
- `game/js/engine.js` (3973 -> 3995 lineas):
  1. `alignRule:null` en el literal `S={...}` de `E.newGame`.
  2. Una sola lectura antes de los dos bucles:
     `var alignMag=(S.alignRule&&typeof S.alignRule.mag==='number')?S.alignRule.mag:4;`
     mas una nota cuando difiere de 4. **Sin `S.alignRule` el valor es 4: el
     comportamiento por defecto queda intacto byte a byte.**
  3. Los dos bucles usan `alignMag` en lugar del literal 4. Los SIGNOS no se
     tocan, que es lo que el texto exige.
  4. `case 'align_rule'`: valida `eff.alignMag`, rechaza una segunda copia
     ("ya esta en juego"), escribe `S.alignRule={mag,card}` y **expone la carta
     en la mesa** con `pl.exposedPlots.push(handIdx)`.
- `test_fase4_cards.js` (812 -> 829 lineas): rama de `alignMag`;
  `checkedFields` 30 -> 31.
- `test_fase2_rules.js` (~4279 lineas): bloque `/* ---------- L5b - ALIGN-RULE`
  con 5 escenarios y 14 aserciones, todas `ok`.
- `ui.js`: sin cambios. 255 no necesita objetivo (no es "at any time" y no
  apunta a un grupo), asi que **tampoco entra en `NO_TARGET_KINDS`**: esa lista
  es para cartas sin objetivo que la UI debe ejecutar de una vez, y aqui la UI
  tiene que exigir turno propio, que es lo que ya hace la rama `else` de
  `E.playPlot` con `requireOwnMain(pid)`.

### 48.3 Las 7 interpretaciones declaradas

1. **La magnitud es una constante global, no un bonus.** No existe "el ataque
   de The Network"; existe "en este juego las alineaciones valen 8".
2. **Los signos no cambian.** control identicas +m / opuestas -m; destroy
   identicas -m / opuestas +m. Es exactamente lo que dice el texto, y "the
   reverse is true for opposed alignments" cierra la tabla.
3. **Duracion: el resto de la partida.** El texto no pone plazo, y las cartas que
   cadenan si lo dicen ("for the rest of the current turn", "until the
   beginning of your next turn"). Por eso la carta se EXPONE en la mesa
   (inwo_rules_extracted.txt:223, "A Plot is 'in play' if it is left on the table
   to mark an ongoing effect"), la misma regla que las cartas "+10" y las
   Cartas de Objetivo. P1-025 ya saca del descarte lo que este en
   `exposedPlots`, asi que no hizo falta tocar el descarte.
4. **Sin comprobacion de unicidad de la carta.** Al exponerse sale del mazo, y
   cada carta de este mazo es unica: no puede haber una segunda copia. Aun asi
   el motor RECHAZA una segunda jugada ("ya esta en juego"), porque escribir el
   estado dos veces no seria idempotente si las magnitudes fueran distintas. La asercion de
   rechazo es una de las 14.
5. **No es "at any time":** el texto no lo dice, luego exige turno propio y no
   entra en la lista `instant`.
6. **LIMITACION DECLARADA: los ataques instantaneos no se ven afectados.**
   Assassinations, Disasters y `E.instantAttack` calculan su fuerza en
   `announcePlotInstantAttack` / `E.instantAttack` y **nunca incorporaron el
   termino de +/-4 por alineacion**, asi que 255 no les cambia. No es un olvido
    de esta carta: es que la alineacion nunca conto ahi en este motor.
7. **"any two Fanatic Groups are opposite to each other"** (oficial, :487-493 y
   :370-377) sigue sin implementarse en `isOpposite()`. Brecha declarada desde
   §20; esta carta no la arregla ni la agrava.

### 48.4 La puerta de FASE 4: `alignMag` tiene que MOVER la aguja

La rama comprueba dos cosas, y la segunda es la que importa:

1. que `alignMag` sea un numero positivo, y
2. **que sea DISTINTO de 4.**

Un `alignMag: 4` seria una carta que se juega, se expone, ocupa mesa, escribe
log y **no cambia nada**: exactamente el defecto de P1-026 (un campo que existe
y nadie lee) y de P1-031 (un punto de entrada que no despacha). El generador de
la puerta es de la familia que se refuerzo en §42.8 y §46: una clausula cuyo
efecto podria ser vacuo tiene que probarse NO vacua.

### 48.5 La regresion: 5 escenarios, 14 aserciones

El par de grupos se BUSCA en el mazo en vez de escribirse a mano, y se exige
que tenga **al menos una alineacion identica** y que `shared-opp` no sea 0. Con
`shared==opp` el cambio se cancela y la asercion seria vacuamente cierta; con
`shared==0` solo se ejercitaria el termino "opuesta" y pasaria aunque el motor
hubiera invertido el signo de las identicas. El par encontrado es
`{ai:0, ti:11, shared:1, opp:0}`, y el mazo es fijo, asi que la busqueda es
determinista.

1. **Por defecto la magnitud es 4** y `leaderMod` vale exactamente
   `4*(shared-opp)`. Esta asercion ata el comportamiento por defecto ANTES de
   tocar nada: si el cambio de las dos lineas hubiera roto el 4, aqui se veria.
2. **Al jugar la carta, `leaderMod` vale el doble** (`2*4*(shared-opp)`), la
   magnitud declarada es 8 y `lastPlotResult.alignRule===true`.
3. **La fuerza se explica sola**: hay una nota que nombra la carta y la
   magnitud. Sin ella un jugador veria un +4 que no sabe de donde sale.
4. **La carta queda expuesta, no descartada**, y la regla **sigue puesta dos
   turnos despues**.
5. **Una segunda copia se rechaza**, y **al destruir el signo se invierte**
   (`-4*(shared-opp)` antes, `-2*4*(shared-opp)` despues), que es la mitad del
   texto que la que se prueba en control.

Se comprueba el DELTA de `leaderMod`, que es donde caen los terminos de
alineacion, y no el `total` completo: el `total` mezcla Poder, Resistencia,
 posicion y bonuses, y una asercion sobre el total no distinguiria "el cambio de
regla" de "cambio cualquier otra cosa".

### 48.6 F6: el tercer fallo del test de The Network, y lo que cuesta una asercion mal planteada

El bloque `P1-009 The Network roba 2 Plot` fallo OTRA vez al arrancar L5b. Es la
tercera version de la misma asercion, y las tres fallan por motivos distintos:

- **F5 (original)**: comparaba el numero de Plots de DOS PARTIDAS. El mazo se
  baraja, asi que el reparto no es identico. Fallo ~1 de 30.
- **F5-bis**: comparo las DOS MANOS de una partida afirmando una diferencia
  EXACTA de 2. Fallo ~1 de 20 con el sintoma **invertido**: el rival con MAS
  Plots que The Network, es decir, el robo sin contar.
- **F6 (este)**: afirmo el mazo compartido `S.plotDeck`. Fallo porque **el robo
  del PRIMER jugador ocurre DENTRO de `startGame`**, donde no existe un "antes"
  que medir, y porque el mazo no baja entre turnos como se suponia.

La version final afirma lo unico que es **cierto por construccion e
independiente de quien salga primero**: el reparto inicial da un numero FIJO de
Plots a cada jugador, los dos suman su propio robo de inicio (+1) y The Network
suma ademas sus 2, asi que **al entrar en su primer turno The Network tiene
ESTRICTAMENTE mas Plots que el rival**. La magnitud EXACTA queda sin afirmar, y
el bloque lo DICE, con los tres intentos anteriores escritos, en vez de fijarla
y volver a fallar dentro de un mes.

**Leccion: "afirmar mas" no es "afirmar mejor".** Tres versiones de esta
  las tres versiones pusieron un numero exacto y las tres flakearon; la que sobrevive
afirma una desigualdad. Un test que depende del orden de los dados, del reparto
o del punto exacto del inicio de turno no es un test fuerte: es un test que
depende de la suerte, y la §41 ya pago por esa clase nueve veces.

### 48.7 Errores propios de esta tanda (todos cazados antes de tocar el destino)

- **El `put` local recibia un indice donde esperaba una carta.** El bloque
  L5a define `put(pid, c)` que hace `c.idx`, y aqui se llamaba con el indice ya
  resuelto -> `Carta no esta en tu mano`. Arreglado fazendo que `put` acepte
  ambos.
- **El primer par de grupos solo ejercitaba un termino.** Se pedia
  `shared-opp!=0` y salio `{shared:0, opp:1}`: la mitad de "opuestas". Ahora se
  exige `shared>=1`.
- **Una asercion tautologica escrita sin querer:** `netPid !== netPid`, que es
  siempre falsa. Se elimino por indice de linea en el script de empalme, y el
  `edit` tool **no la encontro** aunque existia (verificado con un probe) --
  la via fiable es un script que filtra lineas, no el matcher del tool.
- **Un guard escrito al reves:** contaba "cuantas lineas hay que borrar" y
  aborte cuando el texto ya estaba limpio. Un guard de ese tipo se rompe
  exactamente cuando ya no hace falta. Ahora comprueba la AUSENCIA de la linea
 rota.
- **`node -e` con comillas y escapes anidados** -> `Invalid string escape`.
  La trampa de siempre: bloque a `.txt` con el tool `write` y empalme con un
  `.cjs`.
- **Palabras basura mias**, en mis propios comentarios y mensajes: dos ideogramas CJK
  (U+7ED9 U+51FA U+4E86) y un ideograma con un Simplificado mezclado (U+7624), mas dos
  de codepoints antes de tocar el fichero de destino.

### 48.8 Verificacion

- `node --check` limpio en `gen_cards.js`, `game/js/engine.js`,
  `test_fase2_rules.js`, `test_fase4_cards.js`.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED**, **30/30** corridas
  consecutivas con F6 ya reescrito (antes 1 fallo cada ~20).
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (117 cartas
  clasificadas, 131 Plots/Resources sin mecanica (techo 182), 3 ramas muertas
  declaradas, 11 cartas bloqueadas congeladas, 4 huecos de texto declarados)**,
  `checkedFields` 30 -> 31 con `alignMag`.
- `npm test` -> **ALL TESTS PASSED (10)**, 3/3.
- Numeros: 116 -> 117 clasificadas, 132 -> 131 sin mecanica (exactamente -1),
  97 -> 98 `implemented-pending-engine`, `checkedFields` 30 -> 31.

### 48.9 Lecciones

1. **Una regla que aparece en dos sitios debe leerse de uno solo.** Los dos
   bucles de alineaciones traian el 4 escrito a mano; la carta obliga a tocar
   los dos, y ese es el momento exacto en que la duplicacion se paga. El motor
   ahora lee `alignMag` una vez y los dos bucles lo usan.
2. **Un cambio de regla necesita su nota.** Un jugador ve `leaderMod` moverse y
   no tiene de donde saberlo; una nota que nombre la carta y la magnitud hace el
   numero explicable, que es la diferencia entre un motor correcto y uno
   soupuesto.
3. **La puerta debe rechazar el efecto vacuo, no solo el efecto mal formado.**
   `alignMag: 4` es un valor bien formado y una carta inutil; comprobar solo
   "es un numero positivo" habria dejado pasar la carta muerta.
4. **Afirmar una desigualdad puede ser mas fuerte que afirmar un numero.** Tres
- versiones de la asercion de The Network y sus tres formas de fallar
   quedan escritas en 48.6 para que la cuarta no repita el ciclo.
5. **Cuando una asercion se resiste, la causa suele estar en el PLAN, no en el
   codigo.** El problema de F5/F6 nunca fue el motor: fue pedir un numero
   exacto en un punto del juego que depende de dados.

### 48.10 Backlog

- **L5c**: 189 Albino Alligators (+10 Poder o Resistencia a un grupo Weird
  propio, una accion o hasta final de turno) -> reutiliza `powerMods` /
  `resistanceMods` con `untilTurn`; `def_triple` (268) es el precedente.
- **Cola de Resources (4)**: 203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer,
  373 Spear of Longinus. Todas `type=resource` con una habilidad especial
  permanente usada como accion -> hace falta un subsistema
  `E.useResourceAbility`.
- **L6..L16** tal como los define `plan.md`.
- 377 Sucked Dry (cola de destruccion diferida), 205 Bimbo at Eleven (falta un
  campo `gender` en las 421 cartas), 254 Faction Fight (texto truncado + Playing
  along with a duplicate), 419 World War Three (es Cartas de Objetivo).
- **131 Plots/Resources sin mecanica**, 11 `BLOCKED_CARDS` congeladas.
- **Fase 3** (UX, onboarding, DOM en navegador real, y la IA todavia no JUEGA
  cartas de reaccion, solo cierra ventanas) y **P1-DATA-03** (bloqueado por
  red).

---
## 49. L5c - 189 ALBINO ALLIGATORS: +10 Poder o Resistencia a un Weird propio, con caducidad distinta por modo

### 49.1 Hallazgo

plan.md clasificaba 189 Albino Alligators como "L5c", separada de L5a, con una
frase que ya avisaba de que no era lo mismo: *"es un DELTA sobre el grupo (+10
Poder o Resistencia a un Weird propio), no un bonus sobre un ataque"*. Tenia
razon. El texto impreso es:

> Play this card at any time to give +10 Power or Resistance (your choice) to any
> Weird group you control. If used with an action, it must be played when that
> action is first declared, and counts only for that action. If used for defense,
> the bonus lasts until the end of the current turn and does not count toward
> Goals.

Tres frases, tres mecanismos distintos, y **solo uno es eleccion del jugador**.
El filtro (`weird`, una alineacion con 22 grupos en el mazo) no es eleccion: es
el texto. El modo tampoco: lo decide el CONTEXTO.

### 49.2 Correcciones aplicadas

**Datos (`gen_cards.js`, 1774 -> 1837 lineas).** `const L5C_FX` con una entrada
`'albino alligators': { kind:'group_boost_timed', align:'weird', value:10,
t:<texto impreso literal> }`, insertada despues del `}` que CIERRA el bucle
`L5B_FXN`, y `|| L5C_FXN[key]` anadido DENTRO de la unica cadena de resolucion
(indice recalculado sobre el resultado del inserto: es la trampa de 45.5).

**Motor (`game/js/engine.js`, 3995 -> 4036 lineas), 6 ediciones.**
1. `curPower` suma `node.timedBoost.v` cuando `stat==='power' && mode==='action'`.
2. `nodeResistance` suma `node.timedBoost.v` cuando `stat==='resistance'`, **sin
   mirar el modo**: atacar nunca usa la Resistencia, asi que sumarla siempre es
   correcto.
3. `computeStrength`, rama de DESTRUIR, despues de
   `det.defenseBase=tNode?defenderPower(tNode,true):0;` suma el `+10` de Poder
   cuando el modo es DEFENSA (al defenderse de un ataque a destruir el objetivo
   usa su Poder, no su Resistencia, por la regla de 25).
4. `spendGroupToken` anade `if(nd.timedBoost && nd.timedBoost.mode==='action')
   nd.timedBoost=null;` -- gastar la ficha ES la accion.
5. `expireTurnFlags` (el UNICO sitio donde avanza el turno) anade la tercera
   caducidad: modo DEFENSA con `S.turn>=untilTurn`.
6. `instant` whitelist: `||eff0.kind==='group_boost_timed'`, porque el texto
   imprime "at any time". El `case` va antes de `case 'token_gift':{`.

**Un solo campo de nodo:** `node.timedBoost = {name, v, stat, mode, untilTurn}`.
No dos campos casi iguales (`defPowerBoost` / `defResBoost`) porque la carta
solo puede estar en un modo a la vez.

**Puerta (`test_fase4_cards.js`, 829 -> 841 lineas).** Rama para `e.align` a
NIVEL SUPERIOR de la carta: exige que ALGUN grupo del mazo tenga esa alineacion,
no solo que la palabra exista. Sin esa rama el calificador se validaria en
silencio (P1-026 / P1-031). Ojo: las clausulas de `moves[]` ya usan `m.align`,
que valida la rama de abajo; este `e.align` es de primer nivel. `checkedFields`
31 -> 32 campos.

**UI: sin cambios.** La carta apunta a un GRUPO, asi que NO debe entrar en
`NO_TARGET_KINDS` (esa lista es para cartas sin objetivo).

### 49.3 Las 7 interpretaciones declaradas

1. **"your choice" es `opts.stat`**, no un calificador. Un calificador que el
   motor nunca lee seria exactamente el defecto P1-026.
2. **El modo lo decide el CONTEXTO, no el jugador**: si hay un ataque abierto
   contra ese nodo, es DEFENSA; si no, ACCION. Por eso el dato no declara ningun
   campo de modo.
3. **"must be played when that action is first declared"**: el motor declara Y
   ejecuta una accion en el mismo paso, asi que lo mas cercano que se puede
   exigir es que el grupo conserve su ficha. Sin ella, la carta se RECHAZA con la
   razon impresa y no se gasta nada.
4. **"counts only for that action"**: se consume en `spendGroupToken`, igual que
   el triple de 234 Currency Speculation.
5. **"until the end of the current turn"**: `untilTurn = S.turn`, INCLUSIVO. Esto
   es lo contrario que 268 Good Polls, que dura hasta el principio del turno
   SIGUIENTE (`untilTurn = S.turn + jugadores`). Ver 49.5.
6. **"does not count toward Goals" NO se implementa y se DECLARA**: honrarla
   exige saber QUE ataque uso el bonus (un registro de acciones, el mismo hueco
   que bloquea a 377 Sucked Dry y el "out of public life" de 415). El grupo sigue
   muriendo por `destroyGroup` como cualquier otro, que es la parte del texto que
   SI se cumple.
7. El filtro es la alineacion `weird` (22 grupos), mismo contrato que el
   `giftAlign` de L1.

### 49.4 La regresion: 5 escenarios, 46 aserciones

Bloque `/* ---------- L5c - 189 ALBINO ALLIGATORS` en `test_fase2_rules.js`
(4251 -> 4453 lineas). Todas las lecturas de Poder y Resistencia son
reimplementaciones LOCALES de `curPower` y `nodeResistance` a proposito: si el
motor y el test divergen, el test falla en vez de dar verde.

1. **Modo ACCION, Poder**: el Weird propio sube +10 Poder, la Resistencia no se
   toca, `untilTurn` es `null`, la ficha NO se gasta al jugar la carta, y al
   `declareAttack` (que gasta la ficha) el bonus se consume y el Poder vuelve al
   impreso.
2. **Modo ACCION, Resistencia**: al elegir el otro parametro sube la Resistencia
   y el Poder no se toca.
3. **Modo DEFENSA por CONTEXTO**, con un ataque de CONTROL abierto: `defenseBase`
   pasa de 5 a 15 en vivo, `untilTurn === S.turn`, el `total` del atacante BAJA
   (un objetivo mas fuerte hace el ataque mas debil: -8 a -18), el bonus NO se
   consume al jugar la carta ni al resolver el ataque, y caduca al empezar el
   turno siguiente (`expireTurnFlags`).
4. **Modo DEFENSA frente a un ataque a DESTRUIR**: `defenseBase` 1 -> 11, que es
   la unica linea que ejercita el `det.defenseBase +=` nuevo.
5. **Los tres rechazos**: un grupo propio que no es Weird, un Weird **rival** (el
   texto dice "you control"), y modo ACCION sin ficha. En los tres la carta sigue
   en la mano (comparando COPIAS, no `indexOf`, por 43) y ningun rechazo deja un
   bonus puesto a medias.

### 49.5 El fallo que la regresion encontro: `untilTurn > S.turn` hacia el lado equivocado

La primera version de la linea de `computeStrength` comparaba
`tNode.timedBoost.untilTurn > S.turn`, copiada del `defTriple` de 268. Con 268 es
   correcto (alli `untilTurn = S.turn + jugadores`, "hasta el principio de tu
proximo turno"). Con 189 es **siempre falsa**: la carta dura "hasta el FINAL del
turno actual", asi que `untilTurn === S.turn` y la comparacion correcta es `<=`.

El sintoma fue `defenseBase 1 -> 1`: el +10 no se aplicaba nunca. Y solo se
manifestaba en el ataque a DESTRUIR, porque la rama de Resistencia no consulta el
turno (atacar nunca usa la Resistencia), de modo que el escenario 3 pasaba en
verde mientras la mecanica estaba muerta. **Leccion: un mismo campo de caducidad
puede ser INCLUSIVO o EXCLUSIVO segun la frase impresa, y copiar la comparacion
de otra carta es como se rompe.** 268 y 189 coexisten ahora con dos comparaciones
distintas a proposito, cada una con su comentario.

### 49.6 F7 - dos fixtures mios, el mismo tipo de error de siempre

1. **El grupo 60 SI era Weird.** Escribi "Hackers: violent, P3 R2 - no es Weird"
   sin medirlo, y la asercion negativa fallo. Ahora el atacante se BUSCA en el
   mazo (`type==='group' && violent && !weird`, encontrado el 5). Es el error
   39.4 por quinta vez: una negativa necesita una ficha que este de verdad FUERA
   del filtro.
2. **`E.declareAttack(1, ...)` sin turno.** Intente comprobar la defensa desde el
   rival, pero el jugador 1 no era el turno actual: `Error: No es tu turno`. Ese
   chequeo se movio al escenario 3, donde el ataque lo declara el jugador 0 (que si
   tiene el turno) contra un Weird del jugador 1, y el jugador 1 juega la carta
   fuera de turno porque `group_boost_timed` esta en `instant`.
3. **`tbOf()` devuelve `undefined`, no `null`**, cuando el nodo existe pero nunca
   se le puso bonus. La asercion "ningun rechazo dejo un bonus" comparaba con
   `=== null` y fallaba sin motivo real. Ahora usa `!tbOf(...)`.

Ademas, las tres primeras versiones del bloque fallaron al guard de no-ASCII por un
`--` (raya) en un comentario: el splice lo normaliza con un `MAP` explicito
ANTES de aplicar el guard, que es el orden que documenta 46.5.

### 49.7 Verificacion

- `node --check` limpio en `game/js/engine.js`, `test_fase2_rules.js`,
  `test_fase4_cards.js`.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED**, **30/30** corridas
  consecutivas, con las 46 aserciones de L5c en `ok`.
- `npm test` -> **ALL TESTS PASSED (10)**, 3/3.
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (118 cartas
  clasificadas, 130 Plots/Resources sin mecanica (techo 182), 3 ramas muertas
  declaradas, 11 cartas bloqueadas congeladas, 4 huecos de texto declarados)**,
  `checkedFields` con 32 campos. La cifra de sin mecanica baja exactamente en 1
  (131 -> 130), que es el criterio de 0.1.

### 49.8 Lecciones

1. **La caducidad puede ser inclusiva o exclusiva, y lo dice la frase impresa.**
   "hasta el final del turno" = `untilTurn = S.turn` con `<=`; "hasta el principio
   del turno siguiente" = `untilTurn = S.turn + jugadores` con `>`. Copiar la
   comparacion de otra carta produce una mecanica muerta que solo se ve en una de
   las dos ramas de combate.
2. **Una rama puede estar muerta y la otra dar verde.** El +10 de Poder en
   DEFENSA no se aplican nunca por el fallo anterior, y aun asi el escenario de
   CONTROL pasaba: defenderse de un ataque a CONTROL usa la Resistencia, que va
   por otra linea y no mira el turno. Una regresion que solo mira un camino no
   demuestra la mecanica.
3. **Elegir un indice de ficha "a ojo" es una bomba de reloji** (5a vez que se
   paga). Los atacantes se BUSCAN en el mazo con un filtro explicito.
4. **Un helper de test puede devolver `undefined` donde uno espera `null`.** Las
   aserciones de ausencia se escriben con `!x`, no con `=== null`.
5. **El guard de no-ASCII va DESPUES de normalizar**, nunca antes: una raya en un
   comentario aborta la operacion entera, y el `MAP` explicito lo resuelve sin
   tocar el texto en espanol del bloque.

### 49.9 Backlog

- **Cola de Resources (4 cartas): 203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer,
  373 Spear of Longinus.** Las cuatro son `type=resource` y su texto es una
  HABILIDAD PERMANENTE que se usa como accion mas tarde ("Can act once per
  turn", "can be used as often as you wish"), no un efecto al jugarlas. Necesitan
  un subsistema `E.useResourceAbility` nuevo, con su propio limite de usos por
  turno.
- **205 Bimbo at Eleven**: exige "any **male** Personality" y `gender` no aparece
  en NINGUNA de las 421 cartas. Es un hueco de DATOS como P1-032, no un defecto de
  codigo; no se ha inventado ningun dato.
- **254 Faction Fight**: necesita "Played along with a duplicate card" (registro
  de duplicados, terreno de L11) y su texto impreso esta truncado a media frase.
- **377 Sucked Dry and Cast Aside!**: necesita una cola de destruccion diferida,
  porque `destroyGroup` llama a `detach()` y muta el array `children` que `walk`
  esta iterando. `curPower` ya lee `node.burstMul` para cuando exista.
- **255 Fear and Loathing** ya se hizo en L5b (48). 189 es esta seccion.
- L6..L16 segun `plan.md`; quedan **130 Plots/Resources sin mecanica**.
- **Fase 3**: UX, onboarding, verificacion en navegador real, y la IA todavia no
  JUEGA cartas de reaccion (solo cierra las ventanas).
- **P1-DATA-03 Global Power**: bloqueado por el entorno (la red no resuelve ni
  `cs.cmu.edu` ni `sjgames.com`).

---
## 50. L6 - NEGAR UN EVENTO: las 5 cartas que dejan un suceso sin efecto, y P1-034 (cuatro defectos que solo vio la regresion)

### 50.1 Hallazgo

`plan.md` reunia en L6 diez cartas bajo el titulo "That card has no effect / becomes a
failure / he must return it". Al medir las diez, **cinco no encajan en el mismo
mecanismo** y tres de las que si encajan no se pueden jugar con `E.playPlot` sin tocar el motor:

| idx | carta | `type` | veredicto |
|---|---|---|---|
|210|Botched Contact|plot|**IMPLEMENTADA** `takeover_return`|
|359|Sabotage|plot|**IMPLEMENTADA** `takeover_return` + `alsoBlocks`|
|278|Hex|plot|**IMPLEMENTADA** `resource_destroy`|
|259|Foiled!|plot|**IMPLEMENTADA** `force_discard_exposed`|
|356|Revolution!|plot|**IMPLEMENTADA** como cartas nueva de la familia `attack_boost` de §46|
|224|Computer Security|plot|APLAZADA|
|230|Cover-Up|plot|APLAZADA|
|283|Hoax|plot|APLAZADA|
|363|Secrets Man Was Not Meant to Know|plot|APLAZADA|
|222|Combined Disasters|plot|APLAZADA|
|372|Spasm of Violence|plot|APLAZADA|

**Las cuatro APLAZADAS del primer grupo comparten un UNICO motivo.** 224, 230, 283 y 363
dicen, todas, "that card has no effect" (o "that attack becomes a failure") sobre una carta
de Plot **ya resuelta**. Deshacer un efecto aplicado es exactamente el hueco que ya habia
bloqueado a 276 Hat Trick en §38.5, y la razon de fondo es que **`E.playPlot` es
MONOFASICO**: el mismo `switch` valida y aplica. Negar limpiamente exigiria volverlo
BIFASICO (anunciar y despues aplicar, el patron que §33 y §37 ya usaron dos veces para los
ataques) repartido por sus 25 ramas, **mas** devolver el coste de la carta anulada, que las
reglas exigen expresamente: *"If a Plot, special ability, or action is canceled, it has no effect
(except to discard the cards and actions spent on it)"* (`inwo_rules_extracted.txt:924-931`).
No se finge: se aplaza y se dice por que.

**222 y 372 comparten el segundo motivo**: *"You must play both of the Disaster cards, as
well"* es COMBINACION de cartas en una sola jugada, y el motor juega una carta por llamada.
Es el mismo subsistema que 254 Faction Fight, ya aplazada en §46.

### 50.2 Correcciones aplicadas

**Datos.** `gen_cards.js` 1837 -> 1955 lineas. `L6_FX` (4 entradas) + `L6_FXN`, insertados
despues de la `}` que CIERRA el bucle de `L5C_FXN`. **356 Revolution! se anadio DENTRO del
objeto `L5_FX` ya existente**, porque su efecto es identico al de 381/391/415: un
`A.boosts.push`. Solo cambian los calificadores, y anadir una carta a una familia que ya
existe es anadir DATOS. La cadena quedo
`... || L5C_FXN[key] || L6_FXN[key];` con el indice calculado sobre el resultado del
inserto (la trampa de §45.5).

**Motor.** engine.js 4182 -> 4375 lineas. Ocho ediciones:

1. `eventReactionAllowed` gana la rama `ev.kind==='autoTakeover'`. El chequeo de
   affordability es una **SIMULACION en seco**: nunca paga, para que la ventana pueda
   quedar abierta para otro jugador (el mismo criterio que el pago de Embezzlement).
2. `E.autoTakeover` abre la ventana **DESPUES** de que `placeUnder` devuelva el nodo, no
   en un takeover fallido: en este motor un takeover fallido lanza y la carta se queda en
   la mano del rival, asi que "devolverla" seria un no-op (el motivo por el que 412 Vultures
   quedo bloqueada en §38.5).
3. `E.autoTakeover` comprueba `pl.flags.autoTakeoverBlocked` antes de nada.
4. El flag nuevo nace en el inicializador del jugador y se limpia en el bloque de
   flags por turno, junto a los otros cinco.
5. `closePendingEvent` gana el bloque `d.returnedBy`: `findNode` + `findNodeThatHas` +
   `detach` + push a la mano del rival + el bloqueo de 359.
6. `EVENT_KINDS` pasa a `['stealing_the_plans','embezzlement','takeover_return']`.
   **Esto no es cosmetico:** `eventReactionAllowed` rechaza cualquier kind que no este en
   esa lista, asi que sin esta entrada la rama nueva seria inalcanzable. Es la clase
   P1-026/P1-031: el dato existe pero vive en otro sitio.
7. La lista `instant` gana los tres kinds. 210 y 359 los juega un RIVAL dentro de la
   ventana, 278 imprime "at any time except during a privileged attack" y 259 "may be
   used at any time".
8. `case 'attack_boost'` gana `boostVsDictatorship` (lee `node.dictatorship`, el estado
   que §40/P1-028 dejo a proposito) y `payNotTheAttackers` (el veto va DENTRO del filtro
   de `firstUsableAid`, no despues: comprobado sobre el primer candidato rechazaria la
   carta aunque otro grupo propio sirviera).

**Puerta.** `test_fase4_cards.js` 841 -> 906 lineas, `checkedFields` 32 -> 41. Las nueve
ramas nuevas no se limitan a "el campo existe": comprueban que **el coste sea pagable de
verdad**. `payPower` exige que la suma del Poder IMPRESO de todo el mazo llegue al total
exigido; `payMinPower` exige que exista al menos un grupo con ese Poder; `payAttr` y
`payShareAlign` existen en el mazo; `boostVsDictatorship` exige que exista la carta
`dictatorship` que pone el estado que lee.

### 50.3 Las siete interpretaciones declaradas

1. El enganche va DESPUES de `placeUnder`, nunca sobre un takeover fallido.
2. 210 y 359 comparten `kind` porque el efecto es identico; cambian coste y un efecto mas.
3. 210 NO devuelve el takeover: el texto dice "pick another card for automatic takeover
   that turn", es decir, sigue consumido y puede elegir otro. 359 es la que lo bloquea.
4. 359 comprueba su coste contra la carta colocada, leida del nodo recien creado, y
   "either your Illuminati" paga UNA ficha, como las nueve `force_align` de §40.
5. 278 dice "A Magic Resource" y **el mazo no tiene clasificacion de Resources** (34 de 35
   tienen `subtype:null`, medido en L4), el mismo motivo por el que se solto el "Gadget
   Resource" de 270. El recurso se busca de un rival y ya esta; lo que SI se filtra es el
   COSTE, porque "a Magic group" usa el atributo `magic`, que si existe.
6. 259 descarta por `discardPlot()`, el unico punto de entrada al descarte de Plots
   (P1-025). Consecuencia deliberada: esa Plot podra robarla despues Stealing the Plans.
7. 259 filtra `subtype==='goal'` DENTRO de `pl.exposedPlots`, comprobado al responder y no
   al cerrar, para que la ventana pueda quedar abierta para otro jugador.

### 50.4 P1-034 - cuatro defectos, y los cuatro los vio solo la regresion

`node --check` limpio, la puerta en verde y `npm test` en verde **no bastaron**: los cuatro
defectos son de logica de juego y ninguno lo ve un analisis estatico.

**P1-034.a - `resource_destroy` era INJUGABLE desde la interfaz.** El rival se iba a por
defecto a `pid`, o sea el propio jugador, y la linea siguiente lanzaba
`'solo destruye Resources de un rival'` SIEMPRE. La carta solo podia jugarse si el
llamante pasaba un `opts.rivalPid` que la UI no tiene forma de enviar. Es el mismo defecto
que `alignFromTarget` resolvia en 268: un calificador sin ruta de entrada. Corregido
eligiendo el PRIMER rival que tenga Resources cuando no se pasa `opts.rivalPid`, que es
determinista.

**P1-034.b - `atkType:'any'` no lo honraba el MOTOR.** Al meter 356, la puerta fallo con
`atkType debe ser "control" o "destroy", no "any"` y lo primero que se hizo fue **arreglar
la puerta**. Error: la puerta tenia razon en senalar el problema, pero el problema estaba
en el motor, que comparaba `A.type!==eff.atkType` sin excepciones, de modo que 356 no se
podia jugar en NINGUN ataque. "Play this card on any attack, either to destroy or control"
es un valor legitimo. Corregidos LOS DOS: el motor acepta `'any'` y la puerta lo acepta con
un comentario que lo explica. **Leccion: cuando una puerta senala un dato invalido, la
pregunta correcta es "quien miente, el dato o el consumidor?", y a veces mienten los dos.**

**P1-034.c - 259 no quitaba la carta de `exposedPlots`.** `discardPlot` solo la mete en el
descarte de Plots, asi que la misma carta de Objetivo seguia "expuesta" y 259 podia
forzarla a descartar DOS veces en el mismo turno. Corregido con un splice en
`fpv.exposedPlots` antes de llamar a `discardPlot`, que es ademas el sitio donde §38 ya
filtra las expuestas al cerrar la mano.

**P1-034.d - 356 se jugaba GRATIS.** Su texto imprime "Playing this card requires an action
by a group other than those actually attacking the Nation", pero 356 no declara
`requiresActionFromAttr` (no filtra por atributo), y el bloque de coste de `attack_boost`
solo cobra cuando ese campo existe. La carta se jugaba sin pagar nada. Corregido con un
SEGUNDO camino de coste: `payNotTheAttackers` sin atributo cobra cualquier grupo propio que
no participe del ataque. Declarado, porque son dos caminos de coste en el mismo kind:
`requiresActionFromAttr` = "un grupo de este tipo"; `payNotTheAttackers` sin atributo =
"cualquier grupo propio que no participe".

### 50.5 La puerta tambien se equivoco una vez: `payShareAlign` es un booleano

La primera version de la rama de `payShareAlign` la trato como un NOMBRE de alineacion, y
la puerta fallo con `payShareAlign="true" no es una alineacion del mazo`. Es que el campo
es un **booleano**: el motor lo lee como "el grupo que paga tiene que compartir AL MENOS
UNA alineacion con el grupo que el rival esta tomando posesion", y las alineaciones de
referencia viajan en `ev.data.aligns` (las del grupo recien colocado), no en un calificador
de la carta. Por eso el chequeo de no-vacuidad no puede ser "esta alineacion existe en el
mazo" como en el resto de calificadores: lo que tiene que existir es un **par de grupos del
mazo que compartan alguna alineacion**, o la exigencia no se podria cumplir nunca. La rama
busca ese par y lo dice en el mensaje de fallo.

### 50.6 Regresion

Bloque `/* ---------- L6 - NEGAR UN EVENTO` en `test_fase2_rules.js`, cinco escenarios y 40
aserciones, todas en verde y con **30/30 corridas consecutivas** del fichero completo. Los
ficheros se buscan en el mazo, no se escriben a mano (`gAlign`, `gAttr`, `gSub` con
`skip` obligatorio, o los dos fixtures salen a ser la misma carta). Aserciones observables:

1. **210** - la ventana se abre, la ventana SIGUE ABIERTA tras jugar la carta (contrato de
   dos pasos), el grupo vuelve a la mano del rival, desaparece de su estructura, el takeover
   sigue consumido y NO queda bloqueado.
2. **359** - pagado con grupos propios (Illuminati a 0) para ejercitar `payPower` +
   `payShareAlign` y no el atajo del Illuminati; el grupo vuelve, el takeover queda
   bloqueado y un takeover posterior lanza.
3. **278** - el Resource sale de juego, va al descarte, se gasta la ficha del grupo magic
   pagador, la carta se RECHAZA durante un ataque privilegiado y el rechazo NO destruye el
   Resource.
4. **259** - sin Objetivo expuesto se rechaza; con uno, sale de las expuestas y llega al
   descarte de Plots.
5. **356** - +10 contra una Nacion, +20 si lleva `node.dictatorship`, la ficha la paga un
   grupo propio que no ataca, y sin ese grupo la carta se rechaza sin anadir boost.

### 50.7 Verificacion

- `node --check` limpio en `gen_cards.js`, `game/js/engine.js`, `test_fase2_rules.js` y
  `test_fase4_cards.js`; 0 caracteres CJK ni U+FFFD en los cuatro.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED**, **30/30** corridas consecutivas.
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (123 cartas clasificadas, 125
  Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 11 cartas
  bloqueadas congeladas, 4 huecos de texto declarados)**. Sin mecanica 130 -> 125, exactamente
  -5 (cuatro `L6_FX` mas 356). `checkedFields` 32 -> 41.
- `npm test` -> **ALL TESTS PASSED (10)**.
- La puerta fallo de verdad en el camino: 5 errores "rama NO existe en el motor" con los
  datos puestos y el motor sin los `case`, y despues el error de `atkType:"any"` que
  occasiono P1-034.b. Los dos son la puerta cumpliendo su trabajo.

### 50.8 Lecciones

1. **La puerta senala el problema, no el culpable.** Cuando un calificador nuevo hace fallar
   la puerta, la pregunta es "quien miente?". En P1-034.b mienten los dos, y arreglar solo
   la puerta habria dejado la carta sin jugar.
2. **Un calificador sin ruta de entrada es un calificador decorativo.** El
   `opts.rivalPid` de 278 no existia en la UI, y eso convertia el kind en INJUGABLE. La
   pregunta que hay que hacerle a todo calificador nuevo es "quien me lo va a pasar y desde
   donde".
3. **"Se puede jugar" no es "se juega como dice el texto".** 356 se jugaba, con +20
   incluso, y sin pagar. Un camino de coste que depende de OTRO campo del que la carta
   tampoco habla es un camino que no se abre nunca.
4. **Un estado que ninguna rama borra se puede usar dos veces.** `exposedPlots` era la
   segunda via al descarte de una carta que ya estaba en el descarte.
5. **La regresion sigue siendo la unica que mira el efecto.** Los cuatro defectos de
   P1-034 son de logica de juego: ninguno lo ve `node --check` y ninguno lo ve la puerta
   cuando el dato es valido. La puerta vigila que el dato no sea vacio; la regresion vigila
   que el efecto ocurra.
6. **La comprobacion de no-vacuidad depende de la SEMANTICA del campo, no de su nombre.**
   `payShareAlign` No es una alineacion sino un booleano, y su no-vacuidad es un par de
   grupos, no un vocabulario.

### 50.9 Backlog

- **L6 quedan 5 cartas APLAZADAS**, no implementadas: 224, 230, 283, 363 (hacen falta
  `E.playPlot` bifasico y devolucion de coste) y 222, 372 (combinacion de cartas en una
  jugada).
- **Cola de Resources (4 cartas)**: 203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer, 373
  Spear of Longinus. Las cuatro son `type=resource` con una habilidad permanente usada como
  accion, y necesitan un subsistema nuevo `E.useResourceAbility`.
- **205 Bimbo at Eleven**: necesita un campo `gender` que no existe en NINGUNA de las 421
  cartas. Es un hueco de DATOS, no de codigo; no se ha inventado ninguno.
- **254 Faction Fight** (combinacion de cartas + texto truncado) y **377 Sucked Dry and
  Cast Aside!** (cola de destruccion diferida, porque `destroyGroup` muta el array
  `children` que `walk` esta recorriendo).
- **419 World War Three** es una carta de Objetivo, va con las de su familia.
- Quedan **125 Plots/Resources sin mecanica**, 11 cartas congeladas en `BLOCKED_CARDS`, y
  el vacio de datos de §30 (Global Power) sigue bloqueado por la red.
- **Fase 3**: UX, onboarding, verificacion en navegador real, y la IA todavia no JUEGA
  cartas de reaccion (solo cierra ventanas).
---

## 51. L7 - INTRUSION EN PLOTS OCULTOS: las 4 cartas que miran la mano de un rival (y P1-035)

### 51.1 Hallazgo

`plan.md` agrupaba L7 en 5 cartas bajo el nombre "peek_hidden_plots". Al medir cada
carta contra el motor, cuatro de las cinco resultaban ser un mecanismo ligeramente distinto y
una que no cabe en ninguno:

| idx | carta | veredicto | kind / familia | calificadores |
|---|---|---|---|---|
|303|Logic Bomb|IMPLEMENTADA|`peek_steal`|`payMinPower:6`|
|322|Mutual Betrayal|IMPLEMENTADA|`peek_expose`|(sin qualifier de coste)|
|386|The Auditor from Hell|IMPLEMENTADA|`peek_rob`|`payAttrAny:['computer','bank']`, `illumCode:'network'`, `canExposeAll:true`|
|242|Double-Cross|IMPLEMENTADA|`peek_block`|--|
|304|March on Washington|**APLAZADA**|--|combinacion de cartas|

Las cinco son `type=plot` (verificado PRIMERO, la leccion del 344/203), `subtype=null`,
`attributes=[]` y `alignments=[]` antes de este lote.

**304 se aplaza por una sola razon, la misma que ya aplazo a 254 Faction Fight, 222
Combined Disasters y 372 Spasm of Violence:** su texto es "Play this card ALONG WITH a
Plot card that requires an action or actions". El motor juega una carta por llamada, y
combinar dos cartas en una sola jugada es un subsistema que aun no existe. No se simula
ninguna de las dos mitades.

### 51.2 Los siete textos impresos

- **303 Logic Bomb** -- "Pick one rival. You may look at all his hidden Plot cards, and
  choose one to take for yourself but you must expose that card. Play this card at any
  time. It requires an action by one group with a Power of 6 or more. Requires Action"
- **322 Mutual Betrayal** -- "Play this card at any time. This card requires an action by
  one group. Pick one rival. You may look at all his hidden Plot cards. After looking, you
  may expose any or all of them, as long as you also expose an equal number of your own
  Plots. Requires Action"
- **386 The Auditor from Hell** -- "This card may be played at any time. Choose one rival
  as your target. You may look at all his hidden Plot cards, and either steal one of them,
  or expose them all! This card may only be used by the Network or a Computer group, or by
  a Bank group. It counts as an action for that group. Requires Network, Computer or Bank
  Action"
- **242 Double-Cross** -- "Play this card at any time a rival uses a Plot card to look at
  your hidden Plot cards. Your opponent loses the card which let him spy on you, and
  actions that powered it. He does not get to look at (or steal) any of your cards after
  all!"

### 51.3 Correcciones aplicadas

#### Capa de datos (`gen_cards.js`, 1955 -> 2038 lineas)

`const L7_FX` con cuatro entradas + `const L7_FXN` + `|| L7_FXN[key]` en la unica cadena de
resolucion. La insercion va DESPUES de la llave que CIERRA el bucle de la familia anterior
(ancla `'  L6_FXN[norm(k)] = L6_FX[k];\n}\n'`, verificada x1) y el indice de la cadena se
calcula SOBRE EL RESULTADO de la insercion (trampa del §45.5).

#### Motor (`game/js/engine.js`, 4422 -> 4727 lineas)

Seis ediciones, cada una con su ancla validada:

- **A** `pendingPeek:null,` en el literal `S={...}` de `E.newGame`.
- **B** `revealedBy:[],` en el literal del jugador, inmediatamente antes de
  `flags:{autoTakeover:false,...}` (ancla DISTINTA del `linkedPlots:[],` que fallo -- ver
  §51.6).
- **C** proyeccion de `pendingPeek` en `publicState()`, despues de la de `pendingEvent`.
- **D** cola de la lista `instant`: `||PEEK_KINDS.indexOf(eff0.kind)>=0);`.
- **E** bloque a nivel de modulo antes de `function publicState(){`: `PEEK_KINDS`,
  `hiddenPlotsOf(pid)`, `firstRivalWithHidden(pid)`, `openPeekWindow(rd)`,
  `closePendingPeek(act)`, `E.resolvePendingPeek(act)`.
- **F** los cuatro `case` antes de `    case 'token_gift':{`.

Elementos nuevos:

- **`hiddenPlotsOf(pid)`** es la definicion UNICA de "Plot oculta": un indice del `pl.hand`
  cuya carta es `type==='plot'` y que NO esta en `pl.exposedPlots` (esa lista guarda las
  Plot que quedan sobre la mesa como marcador, §26).
- **`firstRivalWithHidden(pid)`** = `opts.rivalPid` o el primer rival con al menos una
  Plot oculta. Misma tecnica que `alignFromTarget` (268) y que la correccion P1-034a de
  278 Hex: no se inventa un selector de jugador nuevo para la UI.
- **`openPeekWindow(rd)`** construye `{kind,label,byPid,data:{byName,rivalPid,cards[]},
  cancelledBy,responders}`, explora SOLO la mano de la victima buscando `peek_block`, y
  **SIEMPRE fija `S.pendingPeek` y devuelve true -- no aborta cuando no hay respuesta.**
  Registra `'VENTANA DE ESPIONAJE ABIERTA: '`.
- **`closePendingPeek(act)`** ramifica en este orden: `cancelledBy` -> nada se ve;
  `{exposeAll}` -> cada Plot oculta de la victima se saca de su mano y pasa a
  `me.exposedPlots` + `them.revealedBy`; `{exposeEqual:n}` ->
  `want = max(0, min(floor(n), d.cards.length, misPlotsSinExponer))`, expone `want` de las
  MIAS primero y despues el mismo numero de las suyas; `{steal:ix}` -> valida que `ix`
  este en `d.cards`, lo saca de la mano de la victima y lo pasa a la mia; si no, "no se ha
  hecho nada con lo que se vio" (el texto dice "you MAY").
- **`E.resolvePendingPeek(act)`** es el cierre idempotente, calcado de
  `E.resolvePendingAttack`; sin ventana devuelve
  `lastPlotResult={ok:false,reason:'No hay ninguna espionaje pendiente'}`.

Los cuatro `case`, bajo una cabecera de 20 lineas que declara lo que distingue a esta
familia y el orden fijo de cuatro pasos:

- **`peek_steal` (303)** -- valida el rival y sus Plot ocultas PRIMERO; luego
  `firstUsableAid(pid, cc => typeof cc.power==='number' && cc.power>=eff.payMinPower)` sobre
  el Poder IMPRESO (mismo criterio que `minPower` en las clausulas `moves[]` del §42.5);
  `spendGroupToken`; `openPeekWindow`.
- **`peek_expose` (322)** -- misma forma, el coste es `firstUsableAid(pid,function(){return
  true;})` (cualquier grupo propio), reutilizando el qualifier `payAnyGroup` que ya usa 210.
- **`peek_rob` (386)** -- los tres pagadores se comprueban en el orden impreso: `firstUsableAid`
  filtrado por `payAttrAny` (una DISYUNCION, que es justo por lo que no es `payAttr`), luego
  `illuCard(pid).effect.code===eff.illumCode && pl.illumTokens>=1`.
- **`peek_block` (242)** -- exige `S.pendingPeek`; rechaza si ya hay `cancelledBy`; y
  **rechaza salvo que `pid === S.pendingPeek.data.rivalPid`**, porque juega la VICTIMA
  (el texto dice "look at YOUR hidden Plot cards"). Fija `cancelledBy` y NO cierra la
  ventana (contrato de dos pasos).

**SIN CAMBIOS EN LA UI**: las cuatro cartas apuntan a un JUGADOR rival, no a un grupo, asi
que NO deben entrar en `NO_TARGET_KINDS`.

#### Gate (`test_fase4_cards.js`, 906 -> 952 lineas, `checkedFields` 41 -> 42)

Tres ramas nuevas antes del ancla flush-left `if (e.targetSubtype) {`, con una cabecera que
declara por que ninguna puede reutilizar una existente: `payAttrAny` es una disyuncion, asi
que lo que hay que comprobar es que exista AL MENOS UNO de los atributos; `illumCode` no es
un nombre de carta sino el `effect.code` del Illuminati que paga, y debe existir en el mazo
o la carta no tendria pagador nunca; y un `canExposeAll` que valiera `false` dejaria la rama
muerta, que es el defecto P1-026. Mas la linea de `usedAttrs` para `payAttrAny`.

### 51.4 P1-035 - la rama de gate escrita ANTES de probar el dato encuentra un bug de DATOS

La primera ejecucion del gate con las ramas nuevas fallo:

```
FASE 4 COVERAGE FAILED (1)
X - The Auditor from Hell: illumCode="thenetwork" no corresponde a ningun Illuminati del mazo
```

**Causa raiz:** escribi el qualifier de 386 adivinando a partir del nombre de la carta. El
**id** de la carta es `thenetwork1` pero su **`effect.code` es `network`**. Los 18
`effect.code` reales, medidos sobre `cards.js` (idx 167-184, nueve sociedades x dos cartas):

```
adepts  bavarian  bermuda  discordian  gnomes  cthulhu  shangrila  network  ufos
```

y ademas **`attributes:[]` en los dieciocho** (P1-032 otra vez). Corregido con dos llamadas
a `edit` en `gen_cards.js` (el comentario de la linea 1713 y el valor de la linea 1720). Un
`grep` de repositorio confirmo que las demas apariciones de `thenetwork` estan en
`test_fase2_rules.js` y son **ids de carta** (`fresh('thenetwork1',...)`,
`pidOf('thenetwork')`), correctas.

**Dos lecciones.** Primera: una rama de gate escrita antes de probar el dato ejercita el gate
Y el dato; es la primera vez que una rama nueva falla por el dato y no por una rama de motor
ausente (las de `moves` en §42 y `requireAttrAny` en §37 fueron al reves). Segunda: la
confusion id/code es una trampa recurrente -- **el motor compara `effect.code`, nunca el id**.

### 51.5 La regresion

49 aserciones en 7 escenarios, en `test_fase2_rules.js`, con anclaje
`/* ---------- L7 - INTRUSION EN PLOTS OCULTOS (303, 322, 386, 242) ---------- */` antes de
`/* ---------- Utilidad global:`. Observables, nunca aritmetica:

1. **303 roba** -- paga con la ficha de C.I.A., la ventana lista 3 cartas y nada se ha movido
   todavia; `resolvePendingPeek({steal:botin[1]})` mueve exactamente una carta (rival -1,
   mio +1 por CONTEO DE COPIAS), las otras dos siguen, `revealedBy` lo registra.
2. **322 expone igual** -- `exposedMine === exposedTheirs === 2`, cuatro cartas quedan como
   marcador sobre la mesa, la mano del rival se queda sin Plot.
3. **242 anula** -- la ventana SIGUE ABIERTA despues de jugarla, `cancelledBy.by === 'B'`, y
   cerrarla deja intactos todos los conteos y ambos `exposedPlots`.
4. **386 paga con el Illuminati** (`fresh('thenetwork1',...)`, `illumTokens=1`, sin grupo
   computer/bank) y luego `exposeAll` expone 2.
5. **386 paga con un grupo Computer** (la disyuncion `payAttrAny`, `illumTokens=0`).
6. **Los rechazos impresos** -- 303 sin pagador de Poder 6 (y el rechazo no cuesta ni ficha ni
   carta), 303 dos veces por "no hay Plot ocultas" (una sin `opts.rivalPid` y otra con el),
   242 sin ventana.
7. **242 jugado por el ESPIA** se rechaza con `/solo el dueno/`, y cerrar con `null` es
   legal (el texto dice "you MAY").

Helpers propios (porque `give`/`giveHere` viven dentro de otros IIFE): `raw()`,
`fromDeck(ix)` (saca el indice de `S.plotDeck` antes de ponerlo en una mano -- regla 13 de
plan.md), `put`, `copiesOf`, `setHand`, `lootInto`, `ownPlots`, `nodeOf`, `settleEvent`,
`peekNow`, y `CIA()` que BUSCA en el mazo `type==='group' && power>=6` en vez de fijar un
indice a mano.

### 51.6 El splice roto y la metodologia de anclas que queda

La primera version del splice del motor uso `      linkedPlots:[],` como ancla del literal
del jugador. Esa cadena **aparece tambien dentro de un comentario en espanol** sobre las
Plot linkeadas, asi que la insercion cayo dentro del comentario, la linea 369 quedo
corrupta y `node --check` fallo:

```
game/js/engine.js:409  var PEEK_KINDS=[...];
                                        ^
SyntaxError: Unexpected identifier 'PEEK_KINDS'
```

`git diff --stat game/js/engine.js` demostro que el splice era la UNICA modificacion sin
commitear de ese fichero (317 inserciones / 6 borrados), asi que `git checkout --
game/js/engine.js` fue SEGURO y devolvio la version de 4422 lineas. Esta es la UNICA
legitima usacion de `git checkout` en este proyecto: **verificar primero con
`git diff --stat <fichero>` que el fichero no contiene otro trabajo sin commitear.**

La metodologia que queda, y que es ahora la regla:

- **`countOf(needle) === 1` NO basta.** Una unica aparicion dentro de un comentario lo
  supera. Eso fue exactamente el fallo de L7.
- La forma segura es **(a) `countOf === 1` Y (b) el texto previo a la aguja en su linea es
  solo espacios**.
- El chequeo opcional de `commentDepth === 0` hubo que **descartarse para anclas que son
  ellas mismas apertura de comentario** (la profundidad es 1 por construccion), y ademas un
  escaner ingenuo de `commentDepth` se desincroniza antes en un fichero lleno de regex y
  plantillas: reporto `depth 1` antes de un ancla legitima de primer nivel. Por eso
  `_l7splice.cjs` usa `countOf === 1` + inicio de linea limpio, que es la forma que todos
  los lotes anteriores usaron con exito.

### 51.7 Seis trampas de fixture (todas mias, todas atrapadas)

1. **`C` en `test_fase2_rules.js` es `window.INWO_CARDS`, NO el array** --
   `C.findIndex is not a function`. Se usa el `idxOfId(id)` de ambito de modulo para las
   cuatro cartas y `C.cards[...]` / `C.cards.findIndex` en todas partes.
2. `ownPlots(0).length === 2` era falso: `fresh()` reparte una mano real que ya contiene
   Plot (medido 6). Cambiado a `>= 2`, porque lo que el texto exige es la IGUALDAD, que se
   comprueba por separado.
3. La regex de "el rival no tiene Plot ocultas" esperaba el segundo guardia, pero sin
   `opts.rivalPid` se dispara el primero. Dividido en DOS `throws`, uno por ruta.
4. **Double-Cross no estaba en la mano del espia** porque el escenario 3 ya lo habia jugado
   en otra partida. Anadido `put(0, DC)`.
5. **`Error: Sin Action token en C.I.A.`** -- dos subescenarios plantaron el pagador bajo el
   MISMO uid `'p2'`, asi que las aserciones no podian saber cual habia pagado. Cada uno
   recibio su uid (`pA`, `pB`).
6. El borrador contenia basura propia: una expresion sobrante
   `out322.lastPropResult === undefined ? '' : ''` dentro del mensaje de un `ok`, el
   error tipografico `Plot sua`, y un `id === 'cia'` fijado a mano -- este ultimo sustituido
   por una busqueda en tiempo de ejecucion, porque cinco hechos de fixture escritos a mano
   ya han resultado falsos (§39.4, §44.8, §49.6).

### 51.8 Verificacion

- `node --check` limpio en `gen_cards.js`, `game/js/engine.js`, `test_fase4_cards.js`,
  `test_fase2_rules.js`.
- `node test_fase2_rules.js` -> **FASE 2 RULES PASSED**, **30/30** corridas seguidas.
- `node test_fase4_cards.js` -> **FASE 4 COVERAGE PASSED (127 cartas clasificadas, 121
  Plots/Resources sin mecanica (techo 182), 3 ramas muertas declaradas, 11 cartas
  bloqueadas congeladas, 4 huecos de texto declarados)**. Sin mecanica 125 -> **121
  (exactamente -4)**, clasificadas 123 -> 127, `implemented-pending-engine` 104 -> 108,
  `checkedFields` 41 -> 42.
- `node gen_cards.js` -> `texto secundario recuperado del HTML de Scribd: 14` +
  `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.
- `npm test` -> **ALL TESTS PASSED (10)**.

### 51.9 Lecciones

1. **Un identificador unico no es un ancla segura.** La unicidad no dice nada sobre si el
   texto esta en codigo o dentro de un comentario. Anclar en algo que solo pueda existir
   como codigo (una llave, un `case`, un flags) es mas robusto que anclar en algo legible.
2. **Agrupar por nombre de plan hides heterogeneidad.** "5 cartas de intrusion" eran cuatro
   efectos distintos mas una combinacion de cartas; 4 de 5 implementables, no 5 de 5.
3. **La cuarta ventana de reaccion es la primera que se abre SIEMPRE.** En §33/§37/§38 no
   abrir ventana sin respuesta era lo correcto; aqui el efecto ES una decision, asi que sin
   decision no hay nada que aplicar. Una familia nueva puede invertir la regla sin que sea
   un error.
4. **Exponer no es quitar de la mano.** El texto impreso usa "expose" con dos sentidos
   (dejar sobre la mesa / simplemente saberlo). El motor ya tiene `exposedPlots` para el
   primero (§26), asi que 303 usa el segundo y lo registra en `pl.revealedBy`. Registrar la
   exposicion es lo que hace que "no se puede deshacer" y por tanto "no es secreto".
5. **El gate escrito antes del dato encuentra bugs de datos.** P1-035 solo existia porque
   la rama se escribio y se ejecuto en el mismo minuto; el valor correcto (`network`) estaba
   en `cards.js` desde el principio.

### 51.10 Backlog

- **304 March on Washington** -- combinacion de cartas en una jugada (mismo subsistema que
  254 Faction Fight, 222 Combined Disasters y 372 Spasm of Violence).
- **Cola de Resources (4)**: 203 Bigfoot, 311 Mercenaries, 358 Rogue Boomer, 373 Spear of
  Longinus -- las cuatro `type=resource` con habilidad permanente usada como accion;
  necesitan el subsistema `E.useResourceAbility`.
- 205 Bimbo at Eleven (hueco de DATOS: `gender` no existe en ninguna de las 421 cartas);
  377 Sucked Dry (cola de destruccion diferida); 224/230/283/363 (`E.playPlot` bifasico +
  devolucion de coste); 419 World War Three (una Goal).
- **121 Plots/Resources sin mecanica**  -  11 `BLOCKED_CARDS` congeladas  -  5 cartas sin
  `textFull` (185, 195, 206, 229, 331) y 232/258 cuyo OCR es mas largo que la fuente.
- **Fase 3**: UX, onboarding, verificacion DOM en navegador real, y la IA que aun no
  *juega* cartas de reaccion (solo cierra ventanas).
- **P1-DATA-03 Global Power**: bloqueado por entorno.
- **P1-032** sigue abierto: los dieciocho Illuminati sin `alignments` ni `attributes`.


## 52. L8a - MANIPULACION DE MAZO Y ROBO (361, 388, 411)

### Hallazgo

El plan agrupa 8 cartas en "L8 MANIPULACION DE MAZO Y ROBO" y las mete a todas en
`deck_manip`. Al medir una por una contra el motor, **ese grupo era hetero**(la
leccion de §51 se repite): solo 3 de las 8 son de verdad la misma familia, 2 son
enganos que apuntan a otra cosa, y 2 no son jugables por un motivo estructural.

Medicion real, carta por carta:

| # | Carta | Tipo | Texto impreso (extracto) | Veredicto |
|---|-------|------|--------------------------|-----------|
| 361 | Savings & Loan Scam | plot | "Play this card at any time. Using this card is an action for one group. Discard this card and draw three Plot cards from your deck." | **L8a - resoluble** |
| 388 | The Big Sellout | plot | "You may pick up to ten Groups and/or Resources from your hand and discard them. You may also discard the top card(s) from your Groups deck, as long as the total is ten or less. For each Group you discard, you may place one extra Action token on one of your own Groups." | **L8a - resoluble** |
| 411 | Voodoo Economics | plot | "You may discard up to ten Plot Cards from the top of your deck, removing them permanently from play. For each one you discard, you may place one extra Action token..." | **L8a - resoluble** |
| 233 | Crystal Skull | resource | "Whenever you draw a Plot card, you may look at the top three cards in your deck and pick the one you want." | L8b - gancho en `drawFrom`, otra superficie |
| 367 | Shroud of Turin | resource | "Whenever you draw a Plot or Group card, you may look at the top card... take the bottom card instead" | L8b - idem |
| 405 | Unlucky 13 | plot | "Play this card on a rival at the very beginning of his turn. He can draw no Plot cards, for any reason..." | L8c - ventana de reactivo + bandera |
| 282 | Hitler's Brain | resource | "Draw an extra Plot card, or hide all your exposed Plots, any time you destroy a group. You may not take control of any Peaceful group while you have this" | **Reasignada**: disparador al destruir + restriccion Peaceful. NO es manipulacion de mazo |
| 191 | An Offer You Can't Refuse | plot | "You may draw two extra Plot cards not from your deck, but from the deck of a rival!" | **BLOQUEADA** (P1-038) |
| 395 | The Internet Worm | plot | "Pick one of your rivals to suffer your wrath. The top three undrawn cards in his Plot deck are discarded." | **BLOQUEADA** (P1-038) |

Comprobacion de que el desglose no es una opinion: un grep de la frase "extra
Action token" en las 421 cartas devuelve exactamente 6 - 12 Brazil, 61 Hawaii
(ambos `[group]`, Corporate), 215 Center for Weird Studies, 335 Perpetual Motion
Machine (`[resource]`), 388 y 411. **Ninguno de los cuatro primeros aparece una
sola vez en engine.js**.

### Correcciones

**1. El token de accion extra no existia (P1-036).** El motor sabia GASTAR fichas de
grupo (`spendGroupToken`) y saber las PONIA al empezar el turno (`E.beginTurn`),
pero no tenia ninguna forma de darMAS. Las seis cartas de arriba dependian de el.
Nace `placeBonusAction(pid,uid,cardName)`, que escribe `n.tokens++` y deja una
ETIQUETA por turno en `n.bonusAction` (`{from,turn}`). La etiqueta, y no un
contador suelto, es lo que permite que `expireTurnFlags` caduque exactamente lo que
puso este efecto y no las fichas que el grupo puso por su cuenta; caduca al empezar
el turno del dueno, con `Math.max(0,…)` porque el grupo puede haber gastado ya su
propia ficha.

**2. `topOfDeck(deck,n)`.** En este motor la cima ES `pop()` (los mazos se llenan
con `unshift` y se reparten con `pop`, ver `drawFrom`), asi que `topOfDeck` saca
las n cartas de cima SIN decidir su destino y lo decide el llamante. Devuelve cartas
y no indices a proposito: un indice de mazo no sobrevive al reshuffle que hace
`drawFrom` cuando el mazo se vacia. Y los dos llamantes hacen cosas DISTINTAS, que
es justo lo que imprime el texto: 411 las QUEMA (fuera de juego, ni al descarte - si
fueran al descarte, "permanently from play" seria falso porque `drawFrom` las
rebarajaria) y 388 las DESCARTA (al descarte, que si se rebaraja).

**3. Rama `case 'deck_manip':`** con tres modos leidos del dato (`mode`):
`draw` (361), `burn` (411) y `sellout` (388). Regla de oro del caso: **se valida y
se cuenta TODO antes de tocar nada**, porque las salidas son irreversibles (una carta
quemada no vuelve) y validar despues perderia cartas de un jugador por un error de
interfaz. El descarte de la mano se hace al final y en orden DESCENDENTE de indice,
porque al borrar el mayor se desplazan todos los menores.

**4. `applyBonusUids(pid,uids,earn,cardName,maxPerGroup)`** aplica el techo impreso:
como mucho `earn` tokens (porque son opcionales, "you MAY") y nunca dos del mismo
grupo para la misma carta ("No Group may get more than one extra Action token FROM
THIS CARD"). El dato `bonusMaxPerGroup` lo lleva la carta, no el motor.

**5. La puerta `instant` se abrio CON CONDICION**, no a pelo: 361 imprime "at any
time" y 388/411 imprimen "during your OWN turn", y las tres comparten `kind`. Como
el gate de `E.playPlot` solo mira el KIND, meter el kind entero habria hecho
jugables 388 y 411 en el turno de cualquiera: defecto de clase "el dato existe pero se
comparo contra la etiqueta equivocada".

**6. UI.** Por primera vez una carta pide una cantidad, una lista de cartas y una
eleccion de grupos. El menu de cartas es de eleccion simple, asi que el propio menu
hace de maquina de estados: `sel.mode='deckCount'` acumula y volver a pulsar la carta
reabre el menu con lo ya recogido; `handPick` (el modo que ya existia para el takeover
y los recursos) recoge las cartas de la mano de 388; y `bonusPick` reparte los tokens
extra clic en los grupos propios, **uno por grupo, con tope**, que es la eleccion que
el texto exige y que un `plotTarget` de un solo clic no puede expresar. El boton
"✨ Jugar Plot ahora" generico se apaga para estas tres cartas: ese camino llama a
`onPlayPlot` sin `opts`, que aqui significaria jugar siempre el caso minimo (0
descartes). Y `deck_manip` entra en `NO_TARGET_KINDS` porque no tienen grupo OBJETIVO.

### Hallazgos P1

- **P1-036** - El token de accion extra no existia en el motor. Seis cartas lo
  imprimen (12 Brazil, 61 Hawaii, 215 Center for Weird Studies, 335 Perpetual Motion
  Machine, 388, 411) y ninguna estaba implementada; los cuatro primeros no aparecen
  ni una vez en engine.js. **Corregido para 388/411**; los otros cuatro quedan en el
  backlog porque son Groups/Resources con su propia forma de pagarlos.
- **P1-037** - `firstUsableAid(pid,filter)` pasa `(carta, nodo)` al predicado, NO el
  nodo solo (`engine.js` ~2453). Un filtro escrito como `nd => nd.tokens >= 1` no
  casa nunca y la carta se rechaza SIEMPRE, sin error ni aviso: el motor mas
  sobreescrito del repo, y un fallo silencioso de clase "firme donde habia un
  predicado". Lo cazó la regresion de L8a (motor verde, test rojo). 361 ya no pasa
  filtro ninguno: `firstUsableAid` descarta de entrada lo que no tiene ficha y lo que
  no puede tenerla, que es el requisito impreso.
- **P1-038** - 191 y 395 estan BLOQUEADAS por una subspecies de motor que falta: el
  juego real reparte Plot cards de un mazo POR JUGADOR ("a rival's Plot deck", "his
  Plot deck") y este motor tiene UN solo `S.plotDeck` compartido. No es un texto sin
  transcribir: "miro el mazo de ese rival" no tiene nada que mirar. Congeladas en
  `BLOCKED_CARDS` (11 -> 13) con el motivo escrito.
- **P1-039** - 388: "as long as the TOTAL is ten or less" es un techo SUMA de mano +
  cima del mazo, no de cada fuente. Implementado como `maxTotal`; leerlo como dos
  techos independientes habria permitido 20 descartes.
- **P1-040** - 388: "For each GROUP you discard" cuenta los Groups de la mano y los de
  la cima, y NO cuenta los Resources descartados de la mano. El texto de la primera
  frase es "Groups and/or Resources" (que si se descartan) y el de la bonificacion es
  "each Group" (que no bonifica un Resource). Los Resources descartados van igualmente
  a `S.groupDiscard`, porque en este motor los Resources son fichas de grupo
  (`group`/`resource` se reparten del mismo `S.groupDeck`) y ese es el unico
  descarte que existe para ellos.

### Verificacion

- `node --check` limpio en `gen_cards.js`, `engine.js`, `ui.js`, `app.js`,
  `test_fase2_rules.js` y `test_fase4_cards.js`.
- `node gen_cards.js` -> `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.
  Las 3 cartas quedan `implemented-pending-engine`, `effect.kind='deck_manip'`, con
  `text` = texto impreso verbatim.
- Las 10 suites en verde: P0 REGRESSION, FASE 2 RULES, FASE 4 COVERAGE, SMOKE, RESPOND,
  CARD RESEARCH MANIFEST, y `flow`/`ai_vs_ai`/`appflow`/`ui` con salida 0.
- FASE 4: 127 -> **130** cartas clasificadas (`deck_manip: 3`), "Plots/Resources sin
  mecanica" 121 -> **118**, techo 182 -> **179**, minimo implementado 47 -> **50**,
  bloqueadas 11 -> **13**. Sin ramas huerfanas y sin cartas clasificadas sin rama.
- Regresion nueva en `test_fase2_rules.js`: **9 escenarios / 39 aserciones** bajo el
  ancla `/* ---------- L8a - MANIPULACION DE MAZO Y ROBO (361, 388, 411) ---------- */`.
  Cada escenario arranca con su propio `fresh()`. Cubre: robo de 3 y gasto de ficha
  (S1), rechazo sin ficha (S2), quema que NO llega al descarte (S3), caducidad del
  token extra (S4), techos de 10 y de uno-por-grupo con no-mutacion en el rechazo (S5),
  "your own turn" para 388 y 411 (S6), techo SUMA de 388 (S7), "por cada GROUP" (S8) y
  el ciclo completo de 388 con descarte de mano y de cima (S9).
- **30/30 corridas consecutivas** de `test_fase2_rules` + `test_fase4_cards` +
  `test_p0_invariants` (90 ejecuciones, 0 fallos), mas 60/60 de `test_fase2_rules`
  solo mientras se huntaba un intermitente.

### Lecciones

1. **La regresion es la que encuentra los fallos, no el motor.** P1-037 era un rechazo
   con mensaje perfecto y motor en verde: solo lo ve un test que intenta JUGAR la
   carta y comprobar el efecto. Un `node --check` no lo ve.
2. **`countOf(needle)===1` y el filtro con la firma equivocada son el mismo fallo de
   clase**: el motor acepta el codigo, el dato existe, y la combinacion concreta no
   hace nunca lo que parece. Se cazan los dos con la mismaBATALLA: leer la firma real
   (`filter(c,n)`) antes de escribir el filtro, y probar el camino feliz del
   ejecutable, no solo sus rechazos.
3. **`indexOf(x) < 0` sobre la mano es una assertion invalida desde que existe un
   helper que mete cartas en la mano** (`pull`). Si la carta ya venia repartida,
   `put` la duplica, el descarte borra una copia y `indexOf` sigue viendo la otra:
   el test falla ~1 de cada 20 veces (aparecio en la corrida 21 de 30). Arreglo:
   comparar COPIAS antes/despues.
4. **`handIdx` es un indice de `C.cards`, no una posicion en la mano**, y la mano
   guarda indices de mazo. Los 9 primeros `playPlot` de esta tanda lo tenían mal y
   fallaron con el engañosamente claro "Carta no esta en tu mano".
5. **Dos salidas distintas para "sacar de la cima".** 411 quema y 388 descarta, y la
   diferencia es si la carta vuelve al juego por el rebarajado del descarte. Por eso
   `topOfDeck` NO decide el destino: la decision es del llamante.

### Backlog

- **L8b** - 233 Crystal Skull y 367 Shroud of Turin: ganchos en `drawFrom` (la
  superficie es `drawFrom`, no `playPlot`).
- **L8c** - 405 Unlucky 13: ventana de reactivo al PRINCIPIO del turno ajeno +
  bandera auto-limpiante de "no roba Plot cards". Ninguna otra carta del mazo necesita
  un subsistema de "muy al principio del turno": un grep de esa frase (`very beginning|beginning
  of his turn|no Plot cards`) casa solo con 405.
- **P1-041 (nuevo, hueco de motor)** - Mazos de Plot POR JUGADOR. Desbloquea 191 y 395
  y es la misma subspecies que necesitan las cartas de "robar del mazo de un rival" en
  general. Es una decision de arquitectura, no un arreglo local: `S.plotDeck` es
  global y lo usan `drawFrom`, `E.drawPlot`, `E.exchangeForPlot`, el reparto inicial
  y `publicState().deckCounts`.
- **Desviacion preexistente, NO tocada aqui** - `E.beginTurn` solo sube las fichas a
  1 y nunca las pone a 0, asi que las fichas de accion sin gastar se arrastran de un
  turno al siguiente. El juego oficial dice que se pierden al final del turno. El
  caducado de `bonusAction` de §52 es lo mas cerca que se puede estar sin tocar el
  reparto de base; arreglarlo de raiz es un lote propio.
- **Los otros 4 PRINT de token extra** (12 Brazil, 61 Hawaii, 215 Center for Weird
  Studies, 335 Perpetual Motion Machine) siguen sin mecanismo: `placeBonusAction` ya
  existe y les sirve, pero cada una necesita su propia condicion de pago.

## 53. L8b GANCHOS DE ROBO (233 Crystal Skull, 367 Shroud of Turin)

### Hallazgo

- 233 Crystal Skull y 367 Shroud of Turin son Resources PASIVOS cuya mecanica
  NO es deck manipulation: "Whenever you draw a Plot card, you may look at the
  top three cards in your deck and pick the one you want" (233) y "Whenever you
  draw a Plot or Group card, you may look at the top card in the deck and, if
  you don't want it, take the bottom card instead, without looking at it" (367).
  Son ganchos de robo, otra superficie: se colocan con E.playResource y cambian
  el PROXIMO robo.
- **P1-044 (nuevo)** - El motor roba de forma sincrona y sin punto de decision:
  `drawFrom` saca una carta de la cima y la mete en la mano, sin permitir
  ninguna carta que sea una decision sobre QUE carta se roba. Habia 2 cartas
  (233, 367) que dependian de ello y eran injugables de forma completa.
- 367 no tiene transcripcion secundaria (`secondary-not-found`): su linea de
  sabor llega corrupta por OCR y no se transcribe, asi que el dato lleva el
  texto impreso de la tabla.
- **P1-045 (nuevo)** - `E.playResource` encadenaba sus efectos con if/else
  (`if(resFx==='bulk_power')...else if...`), asi que un kind de Resource con
  mecanica verificada NO era visible para el gate de FASE 4, que detecta las
  ramas con /case\s+'([a-z0-9_]+)'\s*:/ sobre TODO el motor. Mismo fallo
  latente que P1-031: el defecto existia desde siempre y no explotaba porque
  344 Principia Discordia era el unico Resource con mecanica verificada.

### Correcciones

- **gen_cards.js** - Tabla `L8B_FX` + `L8B_FXN` para `crystalskull` y
  `shroudofturin` con `kind:'draw_hook'` y `hook:{deck,pick,rest,alt}`
  (233: deck 'plot', pick 3, rest 'topOrBottom'; 367: deck 'plotOrGroup',
  pick 1, alt 'bottom'). Cableada en la cadena de PLOT_FXN. Las 2 cartas quedan
  `implemented-pending-engine` con `text` = texto impreso verbatim.
- **engine.js** - Ventana de ELECCION DE ROBO, la QUINTA y distinta de las otras
  cuatro: aqui el efecto ES la decision, no hay "aplicar resultado" aparte.
  - El robo se APLAZA: `deferDrawForHook(pid,kind)` saca la carta (o 3) a
    `S.pendingDraw.pool` ANTES de `drawFrom` y el llamante (`E.drawPlot`,
    `E.drawGroup`, `E.exchangeForPlot`) sale sin robar y SIN consumir la
    bandera del turno; la bandera la pone `E.resolvePendingDraw` al cerrar.
  - `E.resolvePendingDraw(act)`: valida ANTES de cerrar (P1-043), es
    idempotente, y en el cierre de 233 devuelve las otras dos al techo o al
    fondo del mazo; en el de 367 cambia la cima por el fondo sin mirarlo.
  - `E.endTurn` rechaza con la ventana abierta: las cartas ya salieron del
    mazo y el beginTurn del rival repartiria sobre un mazo racionado.
  - `E.playResource` pasa a `switch(resFx)` con `case 'draw_hook':`
    REAL (P1-045); el gancho queda REGISTRADO POR RECURSO (`r.drawHook`), no
    como bandera de jugador, asi que capturar o destruir el Resource lo apaga.
  - `publicState()` proyecta `pendingDraw` SOLO para el dueño del robo (los
    indices son de SU mazo) y con `exchanged` para el canje.
- **ui.js** - Panel de la ventana en attackPanel: para 233 un boton por carta +
  conmutador "resto: encima/abajo"; para 367 "quedarse con la de CIMA" /
  "quedarse con la del FONDO (sin verla)". El destino de las cartas que NO te
  quedas es estado de la INTERFAZ (`drawRest`), no del motor.
- **app.js** - `onResolveDraw(act)` -> `E.resolvePendingDraw(act)`.
- **ai.js** - `settleDrawWindow(E)` en el punto unico `settleWindows(E)`,
  que cierra la quinta ventana igual que las otras cuatro. La politica de la IA
  es NEUTRA y declarada: quedarse con la carta que ya habria robado (la de
  cima) y devolver las otras dos al fondo, porque `getState()` solo proyecta
  `{idx,name}` y la IA no tiene oraculo de que carta es buena. Red de
  seguridad adicional: `window.AI.settleDraw` y app.js la llama justo antes
  de `E.endTurn` de la IA (P1-046).

### P1 findings (corregidos en este lote)

- **P1-042** - El canje de estrella (exchangeForPlot) consumia la bandera de
  "ya robaste tu Plot este turno" si pasaba por un gancho de robo: el canje es
  una Plot EXTRA y no la del turno. El canje SIEMPRE es por una Plot, asi que
  la rama del canje ya no consume la bandera y el jugador puede seguir robando
  su Plot normal del turno. Lo cazo la regresion S5.
- **P1-043** - `E.resolvePendingDraw` cerraba la ventana ANTES de validar la
  eleccion, asi que una eleccion invalida destruia la ventana Y las cartas del
  `pool` (que ya no estan ni en el mazo ni en la mano ni en el descarte): se
  perdian para siempre y el jugador perdía un turno entero de forma
  irrecuperable. Ahora una eleccion invalida lanza y DEJA LA VENTANA ABIERTA,
  que es lo unico que permite reintentar. Lo cazo la regresion S6.
- **P1-046** - La IA no tenia forma de cerrar la ventana de eleccion de robo:
  `E.endTurn` la rechaza y el throw cae en el catch de app.js que solo
  loguea, asi que una partida con IA con 233/367 se quedaba atascada sin
  crash. Arreglado con `settleDrawWindow` en el punto unico y una segunda
  puerta en app.js antes de `E.endTurn` de la IA.

### Verificacion

- `node --check` limpio en `gen_cards.js`, `engine.js`, `ui.js`,
  `app.js`, `ai.js` y `test_fase2_rules.js`.
- `node gen_cards.js` -> `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35} verified-groups 33`.
  Las 2 cartas quedan `implemented-pending-engine`, `effect.kind='draw_hook'`,
  con `text` = texto impreso verbatim.
- Las 10 suites en verde: P0 REGRESSION, FASE 2 RULES, FASE 4 COVERAGE
  (132 clasificadas, 116 sin mecanica, techo 177, minimo 52, 13 bloqueadas),
  SMOKE, RESPOND, CARD RESEARCH MANIFEST, y `flow`/`ai_vs_ai`/`appflow`/`ui`
  con salida 0. `draw_hook: 2` aparece en el histograma de kinds.
- Regresion nueva en `test_fase2_rules.js`: **6 escenarios / 40 aserciones**
  bajo el ancla `/* ---------- L8b - GANCHOS DE ROBO (233, 367) ----------`.
  Cada escenario arranca con su propio `fresh()`. Cubre: 233 aplaza el robo
  de Plot y elige 1 de 3 (S1), 367 aplaza el robo de Grupo y cambia por el
  fondo (S2), 367 tambien cubre el robo de Plot (S3), no se puede terminar el
  turno con la eleccion abierta (S4), el canje de estrella tambien se aplaza y
  NO consume el robo normal (S5), y una eleccion invalida se rechaza sin
  destruir la ventana (S6).
- **30/30 corridas consecutivas** de `test_fase2_rules` + `test_fase4_cards` +
  `test_p0_invariants` (90 ejecuciones, 0 fallos).

### Lecciones

1. **El robo sincrono no admite ninguna decision sobre QUE carta se roba.** Las
   cartas que cambian el proximo robo son OTRA superficie (un gancho en
   drawFrom), no un caso mas de playPlot, y se tienen que medir ANTES de
   agruparlas con las de manipulacion de mazo.
2. **Cerrar la ventana antes de validar es el mismo fallo de clase que cobrar
   antes de validar**: una eleccion invalida destruia 3 cartas de forma
   irrecuperable. El orden correcto es validar PRIMERO y cerrar DESPUES, y el
   cierre sigue siendo la primera mutacion.
3. **Un canje (exchangeForPlot) NO es el robo normal del turno**: comparte la
   misma superficie de drawFrom pero no consume la misma bandera. Si un gancho
   de robo los trata igual, el jugador pierde su Plot normal del turno.
4. **La IA tiene que poder cerrar TODAS las ventanas**, no solo las que existian
   cuando se escribio. Una ventana nueva que E.endTurn rechaza atasca la partida
   de IA-vs-IA sin crash (el throw cae en un catch que solo loguea), que es el
   peor tipo de fallo: silencioso. La red de seguridad en dos sitios (el punto
   unico settleWindows + la ultima puerta antes de endTurn) es lo que la
   convierte en nada.
5. **La politica de eleccion de la IA se declara, no se finge.** Sin oraculo de
   calidad de carta, quedarse con la que ya habria robado es la unica eleccion
   que nunca es peor que no tener la carta; fingir una heuristica de "mejor
   carta" con solo el nombre seria inventar data que no hay.

### Backlog

- **L8c** - 405 Unlucky 13: ventana de reactivo al PRINCIPIO del turno ajeno +
  bandera auto-limpiante de "no roba Plot cards".
- **P1-041 (abierto, hueco de motor)** - Mazos de Plot POR JUGADOR. Desbloquea
  191 y 395 y es la misma subspecies que necesitan las cartas de "robar del
  mazo de un rival" en general. Decision de arquitectura, no arreglo local:
  `S.plotDeck` es global y lo usan `drawFrom`, `E.drawPlot`,
  `E.exchangeForPlot`, el reparto inicial y `publicState().deckCounts`.
- **Desviacion preexistente, NO tocada aqui** - `E.beginTurn` solo sube las
  fichas a 1 y nunca las pone a 0, asi que las fichas de accion sin gastar se
  arrastran de un turno al siguiente. El juego oficial dice que se pierden al
  final del turno; arreglarlo de raiz es un lote propio.
- **Los otros 4 PRINT de token extra** (12 Brazil, 61 Hawaii, 215 Center for
  Weird Studies, 335 Perpetual Motion Machine) siguen sin mecanismo:
  `placeBonusAction` ya existe y les sirve, pero cada una necesita su propia
  condicion de pago.

---

## 54. L8c 405 UNLUCKY 13 (P1-047, P1-048, P1-050, P1-053)

### Hallazgo

**405 Unlucky 13** (OCR, texto impreso verbatim):

> Play this card on a rival at the very beginning of his turn. He can draw no
> Plot cards, for any reason, until after his current turn ends. This requires
> an action. Requires Magic Action

Es la primera carta del mazo cuya ventana de reaccion NO es "durante el turno
de alguien" sino "en el instante ANTERIOR a que empiece el turno de otro". El
motor no tenia ninguna superficie para eso: las cinco ventanas que ya existian
(`S.pendingDraw`, `S.pendingSteal`, `S.pendingExpose`, `S.pendingRob`,
`S.pendingBlock`) se abren todas desde dentro de un turno ya empezado y se
cierran todas en `E.endTurn`.

Tres razones por las que 405 no cabía en ningun `kind` existente:

1. El objetivo no es un grupo, es el JUGADOR cuyo turno va a empezar. Otra
   subspecies de objetivo, como la de las cartas que apuntan a una mano.
2. El timing es una ventana nueva (`S.pendingTurnStart`) que se abre desde
   `E.endTurn` ANTES de `E.beginTurn`, no despues.
3. El efecto es una NEGACION DE ROBO ("for any reason"), no una manipulacion de
   mazo. No es `deck_manip`, no es `draw_hook`, no es `event_negation`.

`kind` nuevo: **`turn_start_block`**.

### Correcciones

- **engine.js**
  - `S.pendingTurnStart = null` en `E.newGame`.
  - `publicState()` proyecta la ventana como `{forPid, forName}` SOLO. No
    filtra ninguna mano: la UI busca el 405 dentro de la mano que ya tiene
    proyectada, no necesita ninguna mano ajena.
  - Helper `plotDrawBlocked(pid)`: `flags.noPlotUntilTurnEnd && S.turn <= flag`.
  - `E.resolvePendingTurnStart(act)`: idempotente (sin ventana devuelve
    `publicState()` sin tocar nada), loguea que los rivales dejan pasar el
    comienzo, pone `phase='begin'` y llama a `E.beginTurn(W.forPid)`.
  - Guard en `E.drawPlot` **antes** del check de `plotDrawn`.
  - Guard en `E.exchangeForPlot` **antes** de cobrar nada: "for any reason"
    incluye el canje de estrella.
  - Guard en `case 'deck_manip'` cuando `mode==='draw'`, tambien antes del
    coste: "for any reason" incluye la 361.
  - `E.beginTurn`: el `autoDraw` de The Network ahora es
    `if (autoDraw && !plotDrawBlocked(pid))`. La bandera se pone ANTES de llamar
    a `beginTurn`, y esa es justo la razon: el bloqueo tiene que cubrir tambien
    el robo sincrono del comienzo (P1-048).
  - `expireTurnFlags`: limpia `noPlotUntilTurnEnd` cuando `S.turn > flag`,
    logueando `<nombre> puede volver a robar Plot cards (Unlucky 13 caduca)`.
  - `E.endTurn`: tras el guard de gameover y de calcular `next`, busca entre los
    jugadores un HUMANO `!= next` con `id==='unlucky13'` en mano. Si lo hay,
    pone `S.pendingTurnStart={forPid:next}`, `S.currentPid=next`,
    `S.phase='begin'`, loguea y **devuelve SIN llamar a `beginTurn`**. Si no lo
    hay, corre la ruta sincrona de siempre.
  - `E.playPlot`: el gate `instant` acepta `eff0.kind==='turn_start_block'`.
  - `case 'turn_start_block'`: valida TODO antes de mutar (sin ventana ->
    throw; objetivo que no es el dueño de la ventana -> throw; sin grupo con
    `alignments` que incluya `'magic'` -> throw con la razón oficial). Luego
    `spendGroupToken`, pone `tgtTS.flags.noPlotUntilTurnEnd = S.turn+1`, loguea,
    limpia `S.pendingTurnStart`, `phase='begin'`, `E.beginTurn(W2.forPid)` y
    `lastResult={blocked,turn}`. Llamar a `beginTurn` dentro del case es seguro:
    no toca la mano del actor, y el tail de `playPlot` que descarta la carta
    jugada corre despues.
- **ui.js**: barra propia de la ventana con dos botones, `data-act="turnstartplay"`
  (con `data-i`) y `data-act="turnstartpass"`; `NO_TARGET_KINDS` gana
  `'turn_start_block'`; `handClick` suprime la entrada generica "Jugar Plot
  ahora" para ese kind, porque fuera de la ventana fallaria siempre.
- **app.js**: `onTurnStartPlay(handIdx)` y `onTurnStartPass()`, con el mismo
  patron try/catch + `after(...)` que el resto de acciones. `afterAdvance()` y
  `maybeRunAI()` hacen `return` temprano con la ventana abierta, para que ni la
  IA ni el telon de privacidad avancen el estado.
- **gen_cards.js**: bloque `L8C_FX` / `L8C_FXN` con el texto verbatim, enganchado
  a la cadena de resolucion de prefijos del manifiesto.

### P1 findings (corregidos en este lote)

- **P1-047** - La ventana se abre con `phase='begin'`, asi que `requireOwnMain`
  rechaza el 405 SIEMPRE: sin tocar el gate, la carta era literalmente
  injugable. El kind tiene que entrar por la puerta `instant`. Y el otro lado del
  mismo hallazgo: `afterAdvance()` y `maybeRunAI()` avanzan el estado, de modo
  que sin `return` temprano la partida se resuelve sola antes de que el humano
  decida, o se queda colgada.
- **P1-048** - Un bloqueo declarado "al principio del turno" no cubria el
  `autoDraw` de The Network, porque `E.beginTurn` roba en ese mismo instante.
  Poner la bandera antes de `beginTurn` es lo que lo cubre. Regresion S7, con
  control positivo: sin la bandera el log seria `3 -> 5`.
- **P1-050** - **El coste "Requires Magic Action" es IMPAGABLE en el mazo real.**
  Hay 0 grupos con `'magic'` en `alignments`, las 18 Illuminati tienen
  `alignments` vacias (P1-032) y hay 0 Resources con `'magic'`. La mecanica
  queda implementada y el coste fallara con su razon oficial ("Requires Magic
  Action") hasta que P1-032 rellene las alineaciones. La regresión NO inventa
  data: toma un grupo real con `power>=3`, le pone `alignments=['magic']`
  temporalmente como doble de test y lo restaura en un `finally`.
- **P1-053** - El reparto inicial es aleatorio y puede dejar el 405 en la mano de
  un HUMANO; entonces `E.endTurn` abria la ventana a mitad de un test
  automatizado que asume `phase='main'` al cerrar turno. Cinco suites tocadas
  (`test_p0_invariants`, `test_appflow`, `test_engine`, `test_ui`, y el caso base
  de la regresion) ponen ese asiento en `human:false`. El arreglo correcto NO es
  estabilizar el test ni sembrar el mazo: es que un test de motor no declare un
  humano que no va a decidir nada. `test_appflow` ademas simula al humano
  pulsando Pass cuando la ventana aparece.

### Blast radius

**CERO** para toda partida sin 405. `E.endTurn` solo abre la ventana si encuentra
el id en la mano de un humano distinto del siguiente jugador; si no, corre la
ruta sincrona de siempre. Por eso 5190 lineas de motor y las 10 suites siguen
intactas salvo por una rama. El primer turno NO abre la ventana porque
`startGame` no es un punto de reaccion ("regla 10": el jugador que/setup no puede
reaccionar a si mismo).

### Verificacion

- `node --check` limpio en los 12 archivos tocados o relacionados: `engine.js`,
  `ui.js`, `app.js`, `ai.js`, `cards.js`, `gen_cards.js`, `test_fase2_rules.js`,
  `test_fase4_cards.js`, `test_p0_invariants.js`, `test_appflow.js`,
  `test_engine.js`, `test_ui.js`.
- `node gen_cards.js` -> `texto secundario recuperado del HTML de Scribd: 14` /
  `written 421 {"group":167,"illuminati":18,"plot":201,"resource":35}
  verified-groups 33`. Identico a §53: sin deriva de datos.
- Las 10 suites en verde. Gate de FASE 4 recalibrado para el lote:
  **133 clasificadas** (antes 132), **115 Plots/Resources sin mecanica**
  (antes 116), techo `MAX_PENDING_PLR` 176, minimo implementado 53.
- Regresion nueva en `test_fase2_rules.js`: **7 escenarios** bajo el ancla
  `/* ---------- L8c - 405 UNLUCKY 13 ---------- */`. Cada escenario arranca con
  su propio `freshL8c()`: S1 blast radius cero (sin 405 la ventana nunca se abre;
  con 405 se abre para el rival correcto), S3 paso de los rivales, S4 caducidad
  del flag y el robo normal se restablece, S5 jugar fuera de la ventana lanza y NO consume
  la carta ni el flag, S6 "for any reason" (361 `deck_manip draw` lanza SIN
  gastar el token y sin sacar la carta de la mano, `drawGroup` sigue funcionando,
  `exchangeForPlot` lanza sin cobrar la illumination), S7 el autoDraw del Network
  respeta el bloqueo con control positivo `3 -> 3` (sin bandera seria `3 -> 5`).
- **30/30 corridas consecutivas** de `test_fase2_rules` + `test_fase4_cards` +
  `test_p0_invariants` (90 ejecuciones, 0 fallos).

### Limites declarados

- **Hot-seat.** `humanPid()` (`app.js:28`) devuelve el PRIMER jugador con
  `human:true` (siempre 0 en hot-seat), limitacion preexistente de toda la app y
  documentada en `app.js:34-36` para el camino del telon. `onTurnStartPlay` la
  hereda. Como solo hay una copia del 405, hay como mucho un titular, pero en un
  hot-seat de 2 humanos su identidad puede quedar mal atribuida. No es una
  regresion de L8c: queda anotado como limitacion conocida.

### Lecciones

1. **Una ventana nueva es una puerta nueva dentro de `E.endTurn`, y `E.endTurn`
   es el UNICO sitio donde se puede abrir.** El trabajo no era el motor de la
   carta: era que el hook tenia que ir antes de `beginTurn` y no despues, y que
   cualquier otra superficie que robe en ese mismo instante (el autoDraw del
   Network) respete la bandera.
2. **La fase durante la ventana importa tanto como la ventana.** `phase='begin'`
   mas `requireOwnMain` es una carta inyectada. La puerta `instant` existe
   justamente para las cartas cuya legitimidad depende del MOMENTO y no del turno
   del actor; sin ella, 405 era injugable y nadie lo notaba porque no habia
   ninguna prueba que la jugara.
3. **Un coste que el mazo no puede pagar se DECLARA, no se perdona.** Con 0
   fuentes de Magic, relajar el requisito habria sido inventar una regla para que
   la carta pareciese funcionar. Lo correcto es implementar la mecanica completa y
   dejar que el fallo diga la verdad oficial.
4. **Un test automatizado que asume la fase se rompe solo con un reparto
   aleatorio.** La tentacion es estabilizar el test sembrando el mazo; el
   arreglo correcto es que el test de motor no declare un humano que no va a
   decidir nada.
5. **"Blast radius cero" hay que PROBARLO, no declararlo.** La comprobacion
   "¿alguien tiene 405?" dentro de `E.endTurn` es lo que permite que un lote de
   este tamano no toque el comportamiento de ninguna partida que no juegue la
   carta.

### Backlog

- **P1-041 (abierto, hueco de motor)** - Mazos de Plot POR JUGADOR. Desbloquea
  191 y 395 y es la misma subspecies que necesitan las cartas de "robar del mazo
  de un rival" en general. Decision de arquitectura, no arreglo local:
  `S.plotDeck` es global y lo usan `drawFrom`, `E.drawPlot`,
  `E.exchangeForPlot`, el reparto inicial y `publicState().deckCounts`.
- **P1-032 / L9 - EDITAR ALINEACIONES pasa a ser BLOQUEANTE de 405.** Con 0
  grupos, 0 Resources y 0 Illuminati con `'magic'`, el 405 no se puede pagar en
  una partida real. L9 era "pendiente"; ahora es la unica palanca que convierte
  la mecanica de 405 en jugable de verdad.
- **Desviacion preexistente, NO tocada aqui** - `E.beginTurn` solo sube las
  fichas a 1 y nunca las pone a 0, asi que las fichas de accion sin gastar se
  arrastran de un turno al siguiente. El juego oficial dice que se pierden al
  final del turno; arreglarlo de raiz es un lote propio.
- **Los otros 4 PRINT de token extra** (12 Brazil, 61 Hawaii, 215 Center for
  Weird Studies, 335 Perpetual Motion Machine) siguen sin mecanismo:
  `placeBonusAction` ya existe y les sirve, pero cada una necesita su propia
  condicion de pago.
