# plan_mano_mtga.md - Rediseño de la mano estilo Magic: The Gathering Arena

> Pedido literal del usuario (tarea raiz):
> "continua con los fixes y demas al juego para dejarlo 100% funcional y  jugable al 100% . cada vez que temrines una fase, haz commit push. ojo, le quitaste el zoom a las cartas de la mano, ademas, la seccion de mano deberia salir como la mano sale en magic the gathering arena, es minimalista, se le puede hacer zoom y se puede observar que hace cada carta y cada efecto de la carta. audita eso y transfgorma, recuerda, todo segun un plan de pasos atomaicos .md que puedas seguir, hazlo."

> Regla 1 de `plan.md`: NADA de `task`, `skill` ni subagentes. Todo directo con Read/Edit/Write/bash/ctx_*.
> Regla de `plan.md`: un lote = una familia. Cada lote se cierra con commit + push.

---

## 0. Que se pide y por que (auditoria hecha, ver seccion 9)

Diagnostico del "zoom que le quitaste":

1. `#handCards .handCard:hover` hace `transform: scale(1.05)`. Sobre una miniatura de
   `width:96px` con `img.thumb{width:88px}` eso son **101px**: un aumento del 5% que
   no permite leer nada. No es un zoom, es un parpadeo de luz.
2. `#handCards` tiene `max-height:240px; overflow-y:auto`. La caja escalada **se recorta**.
   Aunque se subiera el factor, seguiria cortada por arriba.
3. `align-items:flex-start` + `flex-wrap:wrap`: la mano se reparte en varias filas, las
   cartas se reacomodan y el "acomodarse" que se quejaba antes sigue presente.
4. El unico lugar donde se puede LEER una carta de la mano es `#cardInfo`, que tiene
   `height:56px; font-size:12.5px` y esta prohibido por la "REGLA DE ORO" que cambia su
   altura (provoco el bucle infinito de mouseover).
5. `#cardPreview` es un tooltip flotante de 170px que sigue al raton. Es util pero es un
   tooltip, no una vista de carta.

Traduccion a lenguaje MTGA: fila unica, cartas alineadas por el borde inferior, sin
nombre bajo la miniatura, y al pasar el raton la carta **crece hacia arriba** hasta un
tamaño legible, sin salir de la pantalla y sin que el resto de la mano se mueva.

---

## 1. Principios de diseno (inviolables)

- **P1 - Solo `scale`, nunca `translateY`.** Un `translateY` saca la carta del hit-box
  cuando el cursor esta a pocos pixeles del borde inferior: se pierde `:hover`, la
  transicion de 120ms la devuelve, el cursor vuelve a estar encima, bucle de 120ms que
  el ojo lee como parpadeo. `scale()` con `transform-origin: bottom center` **contiene** la
  caja original (crece hacia arriba, el borde inferior no se mueve), asi que ningun punto
  del cursor puede quedar fuera.
- **P2 - La altura de `#handBar` es constante.** Nada dentro de la barra puede depender
  del contenido variable. Por eso `#cardInfo` NO crece; la lectura grande va a una capa
  por encima (`#cardPeek`).
- **P3 - `#cardInfo` mantiene altura fija de 56px.** Se conserva por que la barra no
  parpadee y por que el hint de ayuda sigue visible.
- **P4 - `z-index` en la regla base, no solo en `:hover`.** El flip de stacking context
  fue la segunda fuente de parpadeo historica.
- **P5 - Sin `as any`, sin supresion de tipos, sin catch vacio.**
- **P6 - Los datos de "que hace" se derivan de `c.effect` y `c.goal`** (YA ESTRUCTURADOS
  en el dataset), nunca de parsear `c.text` con regex. `c.text` / `c.textFull` se
  muestran **verbatim** como texto impreso, porque el texto impreso es la ley.
- **P7 - Cero regresiones.** `npm test` y `test_fase4_cards.js` deben seguir en verde
  exactamente igual que antes de empezar (baseline en seccion 8).

---

## 2. Mapa de ficheros a tocar

| Fichero | Cambio |
|---|---|
| `game/index.html` | Anadir `<div id="cardPeek" class="cardPeek" hidden>`; subir cache-busting `?v=38` -> `?v=39` |
| `game/css/style.css` | L287-309 `#handBar`, L347-355 `#handCards`, L357-397 `.handCard`; nuevas reglas `.cardPeek`, `.peek-*`, `.rowcount` |
| `game/js/ui.js` | `handBar()` L772, `writeCardInfo()` L1262, nuevo bloque `peek` (~L1249), `bindEvents()` L1386, `init()` L1473 |
| `test_ui.js` | Regresiones de la UI (DOM simulado) |
| `docs/audit/INWO_SURGICAL_AUDIT.md` | Seccion `§63` al final |

---

## 3. Pasos atomicos

### [x] M0 - AUDIT (snapshot del antes)
- [x] M0.1 Leer `game/index.html` completo (49 lineas) -> DOM de `#handBar`, `#handCards`, `#cardPreview`.
- [x] M0.2 Leer `game/css/style.css` L287-397 (barra, cardInfo, actionBtns, handCards, handCard, hover, picked).
- [x] M0.3 Leer `game/css/style.css` L274-284 (thumb/sm/dbig + PNG de Illuminati rotados 90°), L693-708 (`#cardPreview`), L732-761 y L803-829 (media queries y `body:not(.ingame)`).
- [x] M0.4 Leer `game/js/ui.js` L1-50 (cabecera, `esc`, `cardOf`, `imgTag`, `docFor`, `GLOSS`).
- [x] M0.5 Leer `game/js/ui.js` `handBar()` L772-798, `buildBtns()` L800-835, `infoBar/writeCardInfo/pvSet/movePreview/hidePreview` L1248-1308, `bindEvents()` L1386-1471, `init()` L1473.
- [x] M0.6 Snapshot del baseline de tests (seccion 8).
- [x] M0.7 Descubrir el shape real de `window.INWO_CARDS` (seccion 9).
- [x] M0.8 Escribir este plan.
- [x] M0.9 Push de los 12 commits que estaban pendientes -> `git push origin main` => `1e27f89..2072538 main -> main`. **HECHO**.

### [ ] M1 - CSS: el pop-up MTGA al pasar el raton
Objetivo: la carta crece hacia arriba hasta ser legible, sin recorte, sin parpadeo, sin mover la mano.
- [x] M1.1 En `#handCards`: quitar `max-height` y `overflow-y:auto` (dejan de recortar), poner `flex-wrap:nowrap`, `align-items:flex-end`, `justify-content:center`, `overflow:visible`, `padding-top:34px` (espacio para que la carta crezca sin chocar con `#cardInfo`).  <!-- hecho: flex-wrap:wrap conservado a proposito; lo que recorta era max-height/overflow -->
- [x] M1.2 En `.handCard`: `transform-origin: bottom center;` + `will-change: transform;` + `transition: transform .14s cubic-bezier(.2,.7,.3,1), border-color .15s, box-shadow .15s;`
- [x] M1.3 Hover de `.handCard`: `transform: scale(1.55)` (96px -> ~149px, con el `img` a `width:100%` la imagen crece con la caja), borde gold, sombra `0 -8px 30px rgba(255,176,58,.28)`, `z-index:30`.
- [x] M1.4 `:active` -> `transform: scale(1.5)` (bajar, no Below 1: si baja de 1 la caja se encoge y el cursor puede salir del hit-box).
- [x] M1.5 `#handCards .handCard:focus-visible` mismo tratamiento que `:hover` (accesibilidad de teclado) + `outline` gold.
- [x] M1.6 Quitar el `<small>` con el nombre de debajo de la miniatura **en CSS primero** (`.handCard small{display:none}`) para ver el efecto minimalista aislado. El nombre real lo pone M4 (`title` + `aria-label` ya existen).
- [x] M1.7 Anadir `.rowcount` (badge contador de cartas de la mano) al lado del titulo de la barra, inicialmente vacio.  <!-- hecho: la clase .rowcount esta en CSS desde M1; el badge se escribe en M4.3 -->
- [x] M1.8 Verificar que no hay `overflow:hidden` ancestral entre `.handCard` y el viewport que recorte la escala. `#app` y `body`: comprobar.
- [x] M1.9 Cache-busting: `style.css?v=38` -> `?v=39` en `game/index.html`.
- [x] M1.10 `node --check` en los JS tocados (ninguno aun, pero se comprueba).
- [x] M1.11 **COMMIT + PUSH**: `fix(hand): M1 pop-up MTGA al pasar el raton (scale 1.55, sin recorte)`.

### [ ] M2 - JS: capa de lectura `#cardPeek` (inspector fijo sobre la mano)
Objetivo: al pasar el raton, ademas de crecer, la carta se lee en grande con su texto impreso completo, en una capa por encima, sin tocar la altura de la barra.
- [x] M2.1 Anadir a `game/index.html` `<div id="cardPeek" class="cardPeek" role="tooltip" hidden>` justo despues de `#cardPreview`.
- [x] M2.2 En `ui.js`: `var PEEK = null, peekCard = null;` junto a `var PV = null, lastCix = null;`.  <!-- hecho: var PEEK_CIX (cache de deduplicacion), no PEEK/peekCard -->
- [x] M2.3 `function peekEl(){ var e=$('cardPeek'); if(!e){ e=document.createElement('div'); e.id='cardPeek'; e.className='cardPeek'; e.hidden=true; (document.body||document.documentElement).appendChild(e);} return e; }`
- [x] M2.4 `function peekShow(cix){ /* resuelve cardOf, si es el mismo carta ya pintada solo reposiciona, si no, pinta: img grande + nombre + tipo + P/R + alineamientos + texto impreso verbatim (c.text, o c.textFull si c.text vacio) + bloque de EFECTOS (M3) */ }`
- [x] M2.5 `function peekHide(){ /* PEEK.hidden = true; peekCard=null; */ }`
- [x] M2.6 `function peekPlace(ix){ /* posiciona la capa centrada sobre la carta, recortada a la ventana; si la carta esta en la parte superior de la mano, la capa va DEBAJO de la carta (MTGA lo hace asi) */ }`  <!-- hecho: mide DESPUES de quitar hidden (offsetHeight es 0 con display:none) -->
- [x] M2.7 Cablear el hover de la mano: en `bindEvents()`, `mouseover`/`focusin` sobre `#handCards` -> `peekShow(ev.target.closest('.handCard').dataset.idx)`, `mouseout`/`focusout` -> `peekHide()`, `mousemove` sobre `.handCard` -> `peekPlace(ix)`. **Delegacion de eventos**: `#handCards` es estatico en `index.html` y `init()` reasigna `CB`, asi que NO se re-registra (ver nota L1374-1381 de `ui.js`).  <!-- hecho: mouseover/mouseout/focusin/focusout por delegacion en #handCards + supresion del tooltip #cardPreview para la mano -->
- [x] M2.8 Mantener el hover por CSS (no cambiarlo a JS) para que la transicion siga siendo GPU-friendly.
- [x] M2.9 `resetInfoBar()` sigue igual: `#cardInfo` NO cambia (P2/P3). `#cardPeek` es la que lee.
- [x] M2.10 Cache-busting: `ui.js?v=38` -> `?v=39`.
- [x] M2.11 `node --check game/js/ui.js`.
- [x] M2.12 **COMMIT + PUSH**: `fix(hand): M2 capa de lectura #cardPeek (texto impreso verbatim)`.

### [ ] M3 - JS: desglose de QUE HACE CADA CARTA Y CADA EFECTO
Objetivo: al inspeccionar una carta, el jugador ve coste / objetivo / efecto / fin, derivado de `c.effect` y `c.goal`, no adivinado por regex.
- [x] M3.1 Levantar el **catalogo de `effect.kind`**: script Node temporal que recorra `game/js/cards.js` y liste `{kind -> n, ejemplos:[ids]}`.  <!-- hecho: 48 kinds y 103 claves levantados del dataset (ver seccion 9) -->
- [x] M3.2 Definir `EFFECT_LABEL` en `ui.js`: mapa `kind -> etiqueta corta en espanol` (p.ej. `illu_special -> 'Habilidad especial de Illuminati'`, `resource_effect -> 'Modifica recursos'`, `dup_enabler -> 'Permite jugar un duplicado'`, `force_align -> 'Fuerza alineamientos'`, `goal_combo -> 'Combo de meta'`).  <!-- hecho: se llamo KIND_ES (48 entradas) + FIELD_ES (100 claves) + GOAL_ES/GOAL_FIELD -->
- [x] M3.3 Definir `effectLines(c)` que devuelve `[{etiqueta, valor}]` segun `c.effect.kind`, leyendo **solo claves existentes** (nunca inventar). Fallback honesto: si el `kind` no esta en el mapa, imprimir `Mecanica: <kind>` y la lista de claves del objeto, sin mentir.  <!-- hecho: se llamo effHtml(c) con las 5 secciones coste/obj/eff/fin/modo -->
- [x] M3.4 Anadir `goalLines(c)` desde `c.goal` (p.ej. `{type:'basic',magicResourceCountsAsGroup:true}` -> "Meta basica: cada Recurso Magico cuenta como un grupo").
- [x] M3.5 Pintar el desglose en `#cardPeek` con clases `.pk-eff` / `.pk-effb`.  <!-- hecho: .pk-eff (encabezado de mecanica y de meta) + .pk-effline por dato -->
- [ ] M3.6 Anadir la **explicacion de la diferencia de texto**: si `c.text` esta corrupto (heuristica: muchos digitos sueltos, palabras pegadas, longitud < 12 con `type != 'illuminati'`), avisar `"Texto OCR dudoso: el texto impreso en la imagen es el que manda"` y mostrar `c.textFull` si existe. Nunca se oculta el texto impreso.  <!-- NO hecho: no se avisa de que el texto es OCR. Se decide en M5 (queda como P2) -->
- [x] M3.7 Regresion en `test_ui.js`: para 6 cartas representativas (una de cada `kind`), `effectLines(c)` devuelve al menos una linea y ninguna con `undefined` en el texto.  <!-- hecho: el gate esta en test_hand_peek.js (fichero nuevo, registrado en scripts/run_tests.cjs), no en test_ui.js: cubre las 421 cartas, 0 excepciones, 594 lineas, y que ninguna clave de effect/goal se pierda en silencio -->
- [x] M3.8 `node --check game/js/ui.js`; `npm test`.
- [x] M3.9 **COMMIT + PUSH**: `fix(hand): M3 desglose de efectos desde effect.kind y goal`.  <!-- hecho: commit + push -->

### [ ] M4 - JS/CSS: minimalismo MTGA de la mano
Objetivo: que la barra parezca MTGA, no un panel de herramientas.
- [ ] M4.1 Quitar de verdad el `<small>` con el nombre del `innerHTML` de `handBar()` (M1.6 solo lo ocultaba por CSS): la miniatura queda limpia.
- [ ] M4.2 El nombre sigue disponible por `title` y `aria-label` (ya estan) + ahora tambien en `#cardPeek`.
- [ ] M4.3 Badge `.rowcount` con el numero de cartas: "🂠 7". Se escribe desde `handBar()`.
- [ ] M4.4 Botones de orden `🗂/🔤/⚡`: reducidos a iconos pequenos con `title` explicito, en una sola linea, alineados a la derecha.
- [ ] M4.5 Afinar el tamano de la miniatura: `width:112px` (de 96px) para que el nombre dentro de la imagen sea legible sin zoom. Recalcular el factor de hover a `1.42` para que 112*1.42 ~ 159px.
- [ ] M4.6 Separar visualmente mano y acciones: la `#actionBtns` de 330px pasa a columna estrecha con borde izquierdo tenue; el borde por defecto de las cartas se hace casi invisible (`border-color: rgba(255,255,255,.06)`) y solo se enciende en hover/picked. Eso es el "minimalista" de MTGA.
- [ ] M4.7 `body.spectate` y `body:not(.ingame)` siguen ocultando la barra (L761, L803-804). No tocar.
- [ ] M4.8 Media query de <=1024px: mantener la adaptacion pero permitir scroll horizontal de la fila (`overflow-x:auto`) en vez de `wrap`, para no perder la fila unica.
- [ ] M4.9 `prefers-reduced-motion` (L842-849) ya pone `transition-duration:.01ms`: se respeta automaticamente.
- [ ] M4.10 Cache-busting si se toca `ui.js` (ya en M2) o `style.css` (ya en M1).
- [ ] M4.11 **COMMIT + PUSH**: `fix(hand): M4 minimalismo MTGA (fila unica, sin nombre bajo miniatura, badge contador)`.

### [ ] M5 - VERIFICACION
- [ ] M5.1 `node --check` en `game/js/ui.js`, `game/js/app.js` y los JS tocados.
- [ ] M5.2 `npm test` -> `ALL TESTS PASSED (10)`.
- [ ] M5.3 `node test_fase4_cards.js` -> `FASE 4 COVERAGE PASSED` con los **mismos numeros** del baseline (este lote no toca el motor, asi que la cobertura debe ser identica; cualquier delta es un fallo, no una mejora).
- [ ] M5.4 Regresiones nuevas de `test_ui.js` probadas **30+ corridas consecutivas** (regla 13 de `plan.md`).
- [ ] M5.5 Anti-flicker: test headless que simula 60 mousemove alternos sobre una `.handCard` y comprueba que `:hover` no se pierde (se comprueba por invariante geometrica: el rect del hit-box escalado contiene el punto del cursor). Alternativa sin navegador: assert estatico de que la regla CSS no contiene `translateY` en el hover de `.handCard`.
- [ ] M5.6 Verificacion en navegador real (Playwright) de: hover escala, `#cardPeek` aparece con texto y efectos, mover el raton fuera la oculta, `picked` funciona, la partida se juega igual.
- [ ] M5.7 **COMMIT + PUSH** de lo que salga de la verificacion.

### [ ] M6 - DOCUMENTACION Y CIERRE
- [ ] M6.1 Seccion `§63` en `docs/audit/INWO_SURGICAL_AUDIT.md` con Hallazgo / Correcciones / Verificacion / Leccion / Backlog. **ASCII sin tildes** (regla 5 de `plan.md`). IDs nuevos: `P1-071` (zoom ilegible + recorte), `P1-072` (mano no minimalista), `P1-073` (no se observaba que hace cada carta), `P1-074` (efectos no desglosados).
- [ ] M6.2 Escribir la seccion con un script Node temporal (`fs.appendFileSync`) y borrar el script.
- [ ] M6.3 Marcar M0..M6 como `[x]` en este plan y anotar el resultado real de cada paso.
- [ ] M6.4 Anadir la nota de que Fase 3 (`§37`/`§38` del audit) queda **parcialmente cerrada**: la parte de mano/inspeccion esta hecha; faltan onboarding e IA que juegue cartas de reaccion.
- [ ] M6.5 **COMMIT + PUSH**: `docs(hand): §63 mano MTGA - zoom, inspeccion y desglose de efectos (P1-071..P1-074)`.
- [ ] M6.6 Volver a `plan.md` y retomar el primer lote de motor abierto: **L12 - MANIPULACION DE RESOURCES**.

---

## 4. Criterios de aceptacion del lote (Definition of Done local)

1. `node --check game/js/ui.js` limpio.
2. `npm test` -> `ALL TESTS PASSED (10)`.
3. `node test_fase4_cards.js` -> `FASE 4 COVERAGE PASSED` con los mismos numeros que el baseline.
4. Ninguna regla CSS de hover de `.handCard` contiene `translateY` ni `translate` (verificable con grep).
5. Ninguna caja con `overflow:hidden` entre `.handCard` y `body`.
6. `#handBar` mantiene la altura constante con la mano vacia, con 1 carta y con 30 cartas.
7. Pasar el raton por cualquier carta de la mano produce una lectura legible: nombre, tipo, Poder, Resistencia, alineamientos, texto impreso verbatim y desglose de efectos.
8. Ningun texto de la UI dice `undefined`, `null`, `[object Object]` ni `NaN`.
9. Ficheros con no-ASCII: 0 ocurrencias de `[\u4e00-\u9fff\ufffd]` (mojibake).
10. `game/index.html` con `?v=39` en los assets tocados.

---

## 5. Riesgos y como se neutralizan

| Riesgo | Neutralizacion |
|---|---|
| Volver al parpadeo infinite | P1 (solo `scale`) + `transform-origin:bottom center` + test estatico M5.5 |
| La carta escalada tapa los botones de accion | `z-index` en la carta por encima, pero los botones quedan a la derecha (`330px` de columna) y la mano crece hacia arriba, no hacia la derecha |
| La capa `#cardPeek` tapa la carta que se esta inspeccionando | `peekPlace` la coloca encima; si no cabe arriba, debajo. Nunca encima del raton |
| Con 30 cartas la fila unica desborda | `flex-wrap:nowrap` + `overflow-x:auto` con scroll discreto; el zoom sigue funcionando en el overflow |
| Romper el flujo de juego al tocar `handBar()` | `handBar()` solo cambia laPresentacion; el click sigue en `handClick(ix)` via `data-idx` intacto. Test M5.2 lo cubre |
| Romper la cobertura de FASE 4 | Este lote no toca `engine.js` ni `cards.js`; M5.3 exige numero identico |

---

## 6. Definition of Done (copia de `plan.md` §0.1, se aplica igual)

- [ ] `node --check` limpio en cada JS tocado.
- [ ] `npm test` -> `ALL TESTS PASSED`.
- [ ] `node test_fase4_cards.js` -> `FASE 4 COVERAGE PASSED` y el numero de "sin mecanica" baja exactamente en la cantidad de cartas del lote (aquela baja en cero).
- [ ] Cada carta tocada en su familia de datos con `t:` = texto impreso verbatim y `kind` UNICO (aquella no aplica: no hay cartas nuevas; el `kind` de cada carta es `c.effect.kind` y se documenta en §63).
- [ ] El dispatch valida coste y objetivo impresos y lanza `throw new Error(c.name + ': ...')` (no aplica: no hay motor nuevo).
- [ ] La UI puede ejecutar la carta; si necesita objetivo, el objetivo se elige.
- [ ] Regresion en tests que afirme el efecto observable (>=2 escenarios).
- [ ] Seccion nueva en el audit en ASCII.

---

## 7. Traza de commits

| Paso | Commit | Estado |
|---|---|---|
| M0 | `git push` de los 12 pendientes | HECHO (`1e27f89..2072538`) |
| M1 | `fix(hand): M1 pop-up MTGA al pasar el raton` | PENDIENTE |
| M2 | `fix(hand): M2 capa de lectura #cardPeek` | PENDIENTE |
| M3 | `fix(hand): M3 desglose de efectos desde effect.kind y goal` | PENDIENTE |
| M4 | `fix(hand): M4 minimalismo MTGA` | PENDIENTE |
| M5 | `test(hand): M5 regresiones UI de la mano` | PENDIENTE |
| M6 | `docs(hand): §63 mano MTGA` | PENDIENTE |

---

## 8. Baseline congelado (verificado antes de tocar nada)

```
npm test                 -> ALL TESTS PASSED (10)
node test_fase4_cards.js -> FASE 4 COVERAGE PASSED
   141 cartas clasificadas
   107 Plots/Resources sin mecanica (techo 176)
   3 ramas muertas declaradas
   11 cartas bloqueadas congeladas
   4 huecos de texto declarados
   41 campos calificadores verificados
   10 alineaciones canonicas
   11 atributos usados
```

---

## 9. AUDIT: shape real del dataset (para M3)

`window.INWO_CARDS` = `{ cards: <421>, byIndex: {...}, byId: {...} }`

- `cards.length = 421`; `byType = { group: 167, illuminati: 18, plot: 201, resource: 35 }`.
- 43 campos por carta: `id name img ocrText text source type subtype power resistance alignments
  effect implemented estimated referenceText statProvenance statEvidence statConfidence statSource
  attributes attributeText textFull textSource textChars mechanicsStatus idx attributesSource
  statConflicts goal verifiedMechanic`
- `text` con contenido: 417/421. `textFull`: 327/421. `effect`: ~417. `goal`: presente.
- **El `kind` NO es un campo de la carta**: vive en `c.effect.kind`.
  Ejemplo real: `adeptsofhermes1.effect = { kind:'illu_special', code:'adepts',
  keepOnFailedControl:true, bonus:{ targetAttr:'magic', control:6, destroy:6 } }`
- `window.INWO_OCR` (en `cardtexts_data.js`, 103390 bytes) = mapa `baseName -> texto OCR verbatim`.
- Los 18 PNG de `Illuminati/` estan escaneados **girados 90°**: hay que mantener el
  override `#cardPeek img[src*="Illuminati/"]{transform:none}` igual que ya existe para
  `#cardPreview` y `img.dbig` (si no, las 18 cartas de Illuminati salen tumbadas en el
  inspector). **Este es el fallo mas facil de cometer en M2.**

---

## 10. Backlog que este plan NO cubre

- Onboarding / tutorial interactivo (`§37`/`§38`).
- IA que juegue las cartas de reaccion (hoy solo cierra las ventanas).
- Dispositivos tactiles: el pop-up de hover no existe en movil; hay que decidir
  tap-para-inspeccionar. Decision pendiente para otra fase.
- Los 5 lotes de motor abiertos en `plan.md`: L12 Resources, L13 Defensa Disasters,
  L14 Manipulacion Turno, L15 Combos Goal, L16 Accion Multiple.
