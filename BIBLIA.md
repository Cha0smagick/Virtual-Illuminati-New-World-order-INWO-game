# BIBLIA DEL PROYECTO — INWO: Illuminati New World Order (juego completo)

> Tablero digital funcional del juego **INWO** de Steve Jackson Games, construido sobre las **421 cartas PNG originales** del workspace y las **reglas oficiales del World Domination Handbook v1.2 (enero 2002)** en su variante oficial **One Big Deck**.
> Todo el código es vanilla JS sin dependencias — abre `game/index.html` y juega.

---

## 1. CÓMO JUGAR

1. Abre `D:\Illuminati NWO\game\index.html` (doble clic; funciona por `file://`, no necesita servidor).
2. Elige modo:
   - **vs IA** — tú contra la computadora (la IA juega automáticamente sus turnos).
   - **Hot-seat** — 2 humanos comparten la pantalla (cortina de privacidad entre turnos).
3. Cada jugador elige uno de los 9 Illuminati (no se permiten duplicados).
4. Se reparte mano inicial: **3 Plot cards + 10 Group cards** (mazos compartidos globales).
5. En tu turno (fase Main):
   - **Robar**: botón *Plot* y *Group* (opcional, 1 vez cada uno).
   - **Takeover automático**: 1 vez/turno colocas gratis un grupo/recurso de tu mano en una flecha abierta.
   - **Ataques**: clic en tu grupo atacante → *Controlar* o *Destruir* → clic en objetivo (estructura rival o área neutral).
   - **Apoyos**: durante una ventana de ataque, cualquier jugador puede Ayudar/Oponerse gastando tokens; el defensor puede autoprotegerse (Power ×2 si gasta su token).
   - **Plots**: clic en carta de Plot de tu mano para jugarla (+10, parálisis, zap, asesinato, desastre, metas, NWO…).
   - **Recursos**: máx 1 por turno pagando 1 acción Illuminati (además del gratuito del takeover).
   - **Intercambios**: 1 acción Illuminati **o** 2 tokens de grupo = robar 1 Plot extra (en cualquier momento).
6. **Fin de turno**: límite de 5 Plots en mano fuera de tu turno (el exceso se auto-descarta), luego Knock y chequeo de victoria.

### Cómo ganar
- **Meta básica**: controlar 12 grupos contando tu Illuminati (partida de 2: jamás menos de 12).
- **Metas especiales de Illuminati**: Cthulhu (destruir 8 grupos), Shangri-La (30+ Power Peaceful total), UFOs (controlar tus 3 grupos secretos elegidos al inicio).
- **Eliminación**: tras completar el tercer turno, un Illuminati sin ningún títere queda eliminado; eliminar a todos los rivales = victoria.
- Las metas se comprueban al final de cada turno desde el turno 2 (nadie gana antes); los grupos Computer/Corporate/Weird cuentan doble con Network/Gnomes/Discordian respectivamente (máx 3 grupos dobles).

---

## 2. REGLAS IMPLEMENTADAS (según WDH v1.2 + erratas)

| Sistema | Implementación |
|---|---|
| Setup | Variante **One Big Deck** oficial: mazos compartidos de Plot y Group; 3 plots + 10 groups de mano; tirada alta empieza |
| Turno | begin (tokens) → main (acciones ilimitadas) → end (límite mano, knock, victoria) |
| Tokens | Illuminati +1 acción/turno (**UFOs +2**); grupo gasta su token = 1 cosa por turno; intercambio 1 illum ó 2 grupos → Plot |
| Ataque Control | Fuerza = Power − Resistencia; tiras ≤ fuerza en 2d6; **11-12 siempre fallan**; fuerza <2 fallo automático |
| Modificadores control | ±4 por alineamiento idéntico/opuesto del líder; defensa +4 por cada alineamiento compartido con el maestro (excepto Fanatic-Fanatic); posición +10 directo bajo Illuminati / +5 a un nivel / +0 más lejos |
| Autodefensa | El defensor que gasta SU token suma su **Power ×2** |
| Ayudas | Aider suma Power completo; necesita ≥1 alineamiento común con el objetivo; sin bonos de alineamientos para aiders |
| Ataque Destruir | Power vs Power actual; ±4 opuestos/idénticos; bono de cercanía salvo autodestrucción; títeres NO mueren: vuelven a la mano del dueño sin tokens; resources ligadas se destruyen |
| Fallo vs rival | Ese jugador es inmune a TUS ataques el resto del turno |
| Área neutral | Fallo de control contra carta de la MANO rival → va al área neutral; cualquiera puede atacarla |
| Privilegio | Declarable al anunciar (solo atacante y defensor actúan) |
| Secretos | Solo Illuminati u otros Secret pueden atacar/apoyar/affectar grupos Secret |
| Plots jugables | Solo familias con implementación verificada: +10 (ataque o defensa), Attribute Freeze, Paralyze, Power Increase, Zap estructural, Asesinato (mata Personality permanente), Desastres (devastan Places), Goal cards (máx 1 en mano, se revelan) y NWO (rojo/azul/amarillo, 1 por color, reemplazo descarta el anterior). Las cartas `unverified`/`ability_unverified` se bloquean antes de mutar el estado. |
| Instantáneos | Power instantáneo − Power actual del objetivo, con defensa de cercanía |
| Recursos | Takeover gratis o 1 acción c/u (máx 1/turno); ligadas al Illuminati o a un grupo; captura las mueve, destrucción las destruye |
| Mano | ≤5 Plots fuera de tu turno (ocultas + expuestas); ilimitadas en tu turno |
| Duplicados | Duplicado-Illuminati rival = agente +3 (coste: cima de ambos mazos); duplicado de group rival controlado = Hidden Agent +10 ayuda / −6 oposición |

**Fuente**: PDF oficial extraído a `inwo_rules_extracted.txt` + digest verificado en `librarian_result.txt` (sección A) contrastado con sjgames.com (rules v1.2, FAQ, One Big Deck).

---

## 3. ARQUITECTURA

```
D:\Illuminati NWO\
├── game\                      ← EL JUEGO (abrir index.html)
│   ├── index.html             contenedor: header (#hdrInfo #hdrBtns), #board,
│   │                          #logLines, handBar (#actionBtns #handCards #actionHint),
│   │                          #overlays (setup/cortina/gameover)
│   ├── css\style.css          paleta navy #0B1026 · bgLight #131A3A · amber #FFB03A
│   │                          · cyan #35C4D9 · blanco #F5F7FF · muted #8A93B8
│   └── js\
│       ├── images.js          window.INWO_IMAGE_FILES — manifest de 421 PNGs
│       │                      {file,folder,name,id,version} generado del disco
│       ├── cards.js           window.INWO_CARDS {cards[],byId{},byIndex} — 421 cartas
│       ├── engine.js          window.Engine — TODO el motor de reglas (puro, sin DOM)
│       ├── ai.js              window.AI {takeTurn,attackPhase} — oponente heurístico
│       ├── ui.js              window.UI — render del tablero, overlays, prompts
│       └── app.js             window.App {start} — orquestación setup/humano/IA
├── Groups|Illuminati|Plots\   ← assets PNG originales (421 cartas)
├── Cardbacks and Resources\   ← dorsales + INWO Rules.pdf oficial
├── SPEC-RULES.md              reglas codificadas v2.0 (fuente de verdad del motor)
├── SPEC-ARCH.md               contratos de módulos y schemas
├── gen_cards.js               generador que produce game/js/cards.js
├── inwo_rules_extracted.txt   texto íntegro del PDF oficial
├── librarian_result.txt       investigación web: digest A.1–A.15 + stats verificadas
├── research\                  artefactos: cards_parsed.json (412 cartas SJG),
│                              inwo-rules-12.txt/pdf, log CMU, listados
├── research/audit_reports\    manifest y catalogo de investigacion por carta
└── test_*.js                  harness headless Node (engine, AI-vs-AI, UI stub)
```

Orden de scripts (obligatorio): images → cards → engine → ai → ui → app. Sin `fetch()` ni módulos ES — todo por `window.*` (compatible `file://`).

### Esquemas clave

**Card**: `{idx,id,name,type:'illuminati'|'group'|'resource'|'plot',subtype,img,power,resistance,alignments[],text,effect{kind,code?,color?},goal?,implemented,estimated}`
- Los IDs de Illuminati son strings tipo `'bavarianilluminati1'` (base+sufijo de versión 1|2; las imágenes duplicadas son la misma carta). Helper: `baseIlluId(id)=id.replace(/\d+$/,'')`.

**State** (`Engine.getState()`): `{phase:'setup|main|end|gameover',turn,currentPid,players[{name,human,illumId,illumTokens,hand[idx],structure{uid:'pN-root',cardId:idString,children:[node]},resources[{uid,cardId,linkedTo,tokens}],exposedPlots,discards,destroyedByMe,turnsCompleted,immuneFrom,pickedSecrets,flags}],groupDeck,plotDeck,neutralArea[],attack|null,winner,log[]}`.
- Nodo de estructura: `{uid,cardId(idx numérico para títeres / id-string para raíz),children[],tokens,paralyzed,zapped,devastated,frozen}`.

### Engine API (resumen)
`newGame(configs)` · `availableIlluminati()` (llamar DESPUÉS de newGame) · `setIlluminati(pid,cardId)` · `startGame()` · `beginTurn(pid)` · `drawPlot/drawGroup(pid)` · `exchangeForPlot(pid,{illum:true}|{groupUids:[u,u]})` · `autoTakeover(pid,handIdx,parentUid?)` · `playResource(pid,handIdx,linkedToUid?)` · `illumDrawGroup(pid)` (=extraGroupDraw) · `declareAttack(pid,'control'|'destroy',{attackerUid,uid|handIdx})` · `togglePrivilege()` · `addSupport(pid,entry{uid,oppose}|{selfDefend:true})` · `addBoost(+10)` · `previewStrength()` · `resolveAttack()` · `moveGroup(pid,uid,newParentUid,payWith?)` · `playPlot(pid,handIdx,targetUid?)` · `instantAttack(...)` · `giveCard/discardCard/giveResourceTo` · `endTurn()` (sin args) · `checkVictory()` · `goalStatus()` · `card(idxOrId)`.
Convención: los métodos lanzan `Error` con mensajes en español ante jugadas ilegales; la UI los muestra en el log.

---

## 4. DATOS DE CARTAS (procedencia honesta)

- **421 cartas** = 167 Groups + 18 Illuminati (9 × 2 versiones) + 201 Plots + 35 Resources.
- **Verificado (~33 grupos)**: stats y alineamientos exactos del log CMU (Texas 14/9, New York 7/8, CIA 6/5…).
- **9 Illuminati completos**: poderes y metas especiales codificados (`effect.code`: bavarian/network/cthulhu/gnomes/discordian/bermuda/shangrila/adepts/ufos).
- **Resto**: Power/Resistencia/alineamientos estimados o pendientes, marcados en `cards.js`; el texto OCR se conserva como referencia, pero no se convierte en una regla verificada. Las cartas `unverified` o `ability_unverified` se bloquean antes de gastar tokens o modificar la mano. El manifiesto `research/audit_reports/card_research_manifest.json` registra para las 356 cartas pendientes el OCR, los metadatos oficiales, las menciones de FAQ/errata, la fuente y el estado de cada campo; regenéralo con `npm run research:cards`. Para regenerar el dataset usa `npm run build:cards` (canónico: `gen_cards.js`).

## 5. IA OPONENTE

Heurística determinista (`ai.js`): roba → takeover del mejor grupo (score=2×Power+Resistance) al host más profundo → intercambia acciones por Plots si le sobran (>2) → draw extra → juega solo Plot/Resource con `mechanicsStatus` `implemented` o `implemented-special` → fase de ataque: evalúa control (estimado ≥3 neutral / ≥4 estructura con flecha abierta) y destroy (≥5) sobre área neutral y rivales, ataca con el mejor atacante que tenga token, resuelve al instante; hasta 3 rondas de ataque. Las cartas bloqueadas se omiten; el filtro evita intentos inválidos, no reemplaza una implementación completa de reglas. Pares de opuestos canónicos: peaceful-violent, liberal-conservative, weird-straight.

**Resultado del test headless**: partida completa AI-vs-AI termina con victoria legítima ("Meta básica cumplida 12/12") alrededor del turno 20.

## 6. LIMITACIONES CONOCIDAS

1. Many Power/Resistance/alignment values remain estimates or OCR-derived reference data; they are not canonical tabletop values.
2. OCR text is preserved for research, but `unverified`/`ability_unverified` cards are rejected before state mutation; legacy generic effects are blocked.
3. Several canonical rules remain unresolved, including linked-resource capture, hand-target control, instant attacks, privilege, immunity, secrecy and UFO progress.
4. The AI only selects cards whose `mechanicsStatus` is `implemented` or `implemented-special`; this is a safety filter, not a claim of complete AI rules.
5. There is no persistence (save/load) or undo.

## 7. MANTENIMIENTO RÁPIDO

| Quiero… | Haz… |
|---|---|
| Corregir stats de una carta | Editar tablas en `gen_cards.js` → `npm run build:cards` |
| Cambiar una regla | `SPEC-RULES.md` es la fuente → implementar en `engine.js` |
| Probar sin navegador | `node test_ai_vs_ai.js 60` (headless completo) |
| Ver estado interno | `Engine._raw()` devuelve el estado vivo |
| Re-generar manifest de imágenes | `parse_images.ps1` |

## 8. CRÉDITOS

Reglas y juego original: **Steve Jackson Games — INWO** (World Domination Handbook v1.2). Este proyecto es una implementación educativa no comercial sobre las imágenes del propietario del workspace. Stats verificadas cortesía del registro público de partida CMU/Ralph.

*Generado por Sisyphus — proyecto completo: motor, IA, UI, datos y esta biblia.*

---
## CHANGELOG v3 — UX a prueba de todo + fix crítico de IA
- FIX CRÍTICO: app.js hacía beginTurn doble (engine.endTurn ya avanza él mismo) → tras tu turno el control volvía al humano y la IA NUNCA jugaba. Corregido con afterAdvance(); test_appflow.js valida alternancia estricta.
- FIX: si la IA saca tirada más alta en el inicio, ahora SÍ arranca su turno (maybeRunAI tras startGame).
- REGLAS: robo de Plot y de Grupo limitados a 1/turno cada uno (flags plotDrawn/groupDrawn); botones se desactivan al usarlos.
- UX: tutorial automático de 4 pasos al empezar (showHowTo); barra ℹ siempre dice qué hacer AHORA; botón recomendado PARPADEA (.pulse); objetivos válidos con anillo verde animado (.pick); flujo Takeover guiado desde su propio botón (handPick→takeoverHost); durante turno IA se muestra «⏳ TURNO DE LA IA…»; feedback de dados en el log («🎲 CONTROLAR → ÉXITO · tiraste 7 · necesitabas ≤15») vía lastResultText; previewStrength anuncia la fuerza al declarar ataque.
- Tests: node test_appflow.js (nuevo), test_engine.js, test_ai_vs_ai.js, test_flow.js — todos verdes.
