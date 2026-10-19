# Auditoría quirúrgica atómica — motor INWO

Fecha: 2026-10-15 · Modo: auditoría personal, sin delegación · Fuente de verdad: `inwo_rules_extracted.txt` (reglas oficiales Steve Jackson Games)

## Conclusión

El motor cumple la regla oficial en las áreas estructurales: matemática de ataque completa (alineaciones, posición, master, autodefensa base, 11-12 y <2, multiplicadores), privilegio, instant attacks, límites de mano, economía de tokens, victoria/eliminación, área neutral, captura de subárbol y títeres. La auditoría encontró 11 puntos: **8 corregidos** (2 de arnés/token y 6 de reglas: #3, #4, #5, #6, #7, #9), **2 no corregidos por ser rediseño con test propio** (#8 laguna de ataque a la propia mano, #11 área neutral no oficial) y **1 deuda de datos** (#10 Global Power). `npm test` pasa 13/13 y `diag_attack.cjs` sale en exit 0.

| # | Hallazgo | Archivo:línea | Estado |
|---|----------|---------------|--------|
| 1 | Arnés `test_appflow.js` no conduce ventanas IA → endTurn falla (~25% runs) | test_appflow.js | **FIXED** |
| 2 | `audit_syn.cjs` token obsoleto `r===11` | scripts/audit_syn.cjs | **FIXED** |
| 3 | `pendingNegation` sin conductor en flujos IA → IA-vs-IA se congela | ai.js:751, app.js:638 | **FIXED** |
| 4 | `after()` no reanuda `aiPending` → turno IA congelado tras ventana resuelta por humano | app.js:445 | **FIXED** |
| 5 | `addSupport` sin reglas de oposición (master/puppet) ni Global Power | engine.js:3634-3700 | **FIXED** |
| 6 | Autodefensa gasta 1 solo token; la regla permite gastarlos todos | engine.js:3665-3692, 3903, 3952 | **FIXED** |
| 7 | Sin check "No Duplicates in the Same Attack" (mismo grupo 2 veces) | engine.js:3634-3700 | **FIXED** |
| 8 | No se puede atacar la PROPIA mano (vía oficial de tomar un grupo de la mano) | engine.js:3479-3480 | LAGUNA |
| 9 | Sin check de Plot duplicado en el mismo ataque | engine.js:3701-3740 | **FIXED** |
| 10 | Global Power ausente del dataset | game/js/cards.js | DATOS |
| 11 | "Área neutral" (P1-004): extensión no oficial + resultado de control desde mano rival | engine.js:4537-4553 | DESVIACIÓN |

Fixes aplicados en esta sesión: #3, #4, #5, #6, #7, #9 (más #1 y #2 previos). No corregidos por alcance/riesgo: #8 y #11 (decisiones de diseño del motor, con test propio); #10 es deuda de datos.

## Detalle de hallazgos

### #1 [FIXED] Arnés de `test_appflow.js`
**Síntoma:** exit 1 flaky (~25% de las runs). **Causa:** la IA deja ventanas abiertas a propósito cuando hay respondedor humano (diseño Fase 3); `endTurn` las rechaza correctamente (engine.js:9978-9984, verificado en `test_fase3_windows.js` T6/T7 — la guarda es correcta). El arnés no las conduce como hace `driveWindow` (app.js:549). **Fix aplicado:** bucle de settle (resolvePendingDraw/pendingEvent/pendingRoll = pasar) antes de cada `E.endTurn()` del test. Verificado 0 fallos en 12 repeticiones.

### #2 [FIXED] Token obsoleto en `scripts/audit_syn.cjs`
Buscaba `r===11`; el motor usa `roll===11`. El check "11-12 fallan siempre" salía AUSENTE por token, no por ausencia real. Corregido; ahora sale PRESENTE. El exit 1 restante es deuda de datos (ver abajo).

### #3 [FIXED] `pendingNegation` sin conductor → congela IA-vs-IA
**Repro:** `node scripts/diag_attack.cjs` → crash en E.endTurn (línea 71): "No se puede terminar el turno sin resolver la negacion" (engine.js:9983). **Causa:** `AI.settleWindows` (ai.js:751) conduce `pendingEvent`/`pendingRoll`/`pendingDraw` pero no `pendingNegation`; `runAI`/`finishAITurn` (app.js:638/665) tampoco la tratan como condición de pausa. **Fix aplicado:** `settleNegationWindow` en `settleWindows` (primera posición; si ningún humano está entre `negs[].pid` → `E.resolvePendingNegation('pass')`; va primera porque resolverla re-juega la Plot y puede abrir suceso/rodadero) + pausa con `negHumanPending(st)` en `runAI`/`finishAITurn` (la UI humana ya la resuelve con `onResolveNegation` → `after` → `resumeFromWindow`) + red de seguridad `AI.settleWindows` antes de `E.endTurn`. Verificado: `diag_attack.cjs` en exit 0.

### #4 [FIXED] `after()` no reanuda `aiPending`
**Síntoma:** tras aplicar el humano una ventana de suceso/rodadero abierta por la IA fuera de ataque (p.ej. Embezzlement al robar Plot), `after()` (app.js:433-446) llamaba `maybeRunAI()` → `runAI(pid)` → `AI.takeTurn` de nuevo → `E.drawPlot` lanzaba "Ya robaste tu carta de Plot este turno" (engine.js:2093) → turno de IA congelado. **Fix aplicado:** `after()` termina con `resumeFromWindow()` (app.js:576+), que si hay `aiPending` reentra en `finishAITurn` y si no cae a `maybeRunAI()` (mismo comportamiento previo).

### #5 [FIXED] `addSupport` sin reglas de oposición ni Global Power
`addSupport` (engine.js:3634-3700) valida la participación así:
- Rama control (3683-3689): exige ≥1 alineación común con el objetivo, **indistintamente para ayudar y para oponerse**.
- Rama destroy (3690-3694): exige ≥1 alineación **opuesta** al objetivo, igual para ayudar y oponerse.

Regla oficial:
- **Ayudar a control:** alineación común (rulebook:466-468) ✓ correcto.
- **Oponerse a control:** alineación común **O ser master/puppet del objetivo** (rulebook:469-472: "A Group can oppose an Attack to Control ... if it has at least one alignment identical to the target, or if it is the target's master or puppet"). El motor no contempla master/puppet → un títere sin alineación común no puede defender a su master, cuando la regla se lo permite explícitamente. Ejemplo oficial (rulebook:573-575): los Wargamers, títere de B.A.T.F., se oponen "even though it has no common alignments or Global Power".
- **Ayudar a destroy:** alineación opuesta (rulebook:581-582) ✓ correcto.
- **Oponerse a destroy:** "uses the same rules as opposing an Attack to Control" (rulebook:582-588) → alineación idéntica o master/puppet. El motor exige opuesta → **incorrecto**: excluye a los aliados ideológicos del objetivo y admite a sus enemigos.
- **Global Power:** "If a Group's alignments don't let it use its normal Power to aid or oppose an attack, it can still use its Global Power" (rulebook:502-504; también 350-352 y 589-590). El motor no lee ningún campo de GP y el dataset no lo modela (ver #10). Ejemplo oficial (rulebook:568-570): los Hackers usan su GP 2 para oponerse a un ataque contra B.A.T.F. sin alineación común.

**Fix aplicado:** `addSupport` ahora distingue `entry.oppose`: control-oppose y destroy-oppose aceptan (alineación común con el objetivo | master/puppet del objetivo, vía el nuevo helper `isMasterOrPuppetOf`); destroy-aid mantiene alineación opuesta; y si las alineaciones no encajan, se usa el fallback `globalPower` del registro (limitado por el Poder regular actual, rulebook:513-516). Los Illuminati siguen sin poder participar (no tienen alineaciones ni GP).

### #6 [FIXED] Autodefensa con un solo token
Regla oficial (rulebook:445-451): "The target may spend an Action token to defend itself. The Power of an action spent ... is doubled. If the action's Power is already doubled, it is tripled ... If the target has more than one token, **it can spend them all, and each one gets the bonus!**" (2× → 3× → 4×...). Antes el motor gastaba exactamente 1 token (`nd.tokens--`) y `computeStrength` aplicaba un factor fijo 2×. **Fix aplicado:** `addSupport` acepta `entry.tokens` (n fichas, acumulables en `A.selfDefTokens`) y `computeStrength` aplica el factor `(1+n)×` (engine.js:3691, 3903, 3952); la UI mantiene el botón "🛡 Defiende tu grupo" mientras al defensor le queden fichas (ui.js:1095).

### #7 [FIXED] Sin check de "No Duplicates in the Same Attack" (grupo)
Regla oficial (rulebook:443-446): "A Group that has two or more Action tokens may not use more than one in the same attack unless it's defending itself." `addSupport` no comprobaba si `entry.uid` ya estaba en `A.aids`/`A.opposes` → un grupo con 2 tokens podía añadirse dos veces. **Fix aplicado:** rechaza uid ya presente, rechaza `entry.uid===A.attackerUid` ("no Group may attack itself, or aid an attack on itself", rulebook:576) y rechaza `entry.uid===A.targetUid` sin `selfDefend` (el objetivo defiende con selfDefend, no como apoyo).

### #8 [LAGUNA] No se puede atacar la propia mano
El motor solo permite atacar una carta de la mano **ajena**: `declareAttack` busca el dueño con `q!==pid` (engine.js:3479-3480), y todo el aparato posterior (P1-004, L40, Vultures) asume ese único caso. La regla oficial sí contempla atacar la **propia** mano para poner el grupo en la estructura: "During the Main Phase of your turn, you may attack to control Groups from your hand. If you succeed, you take over the target Group" (rulebook:309-313) y "If you attack a Group from your own hand, you must still roll to control it" (rulebook:472), con reintento y descarte al fin de turno (rulebook:591-597: "you may try again if you have any actions left ... if you have not succeeded by the end of your turn, your agents are revealed and eliminated"). En este motor esa vía no existe: un grupo de tu mano solo entra por el automatic takeover. **No corregido**: implementarlo es funcionalidad nueva (declareAttack + applyAttackResult + endTurn + UI) y contradice el modelo de "área neutral" de #11; merece decisión del usuario. Se probó un descarte diferido (P2-R8) y se revirtió: retorcía la extensión no oficial sin base en el rulebook.

### #9 [FIXED] Sin check de Plot duplicado en el mismo ataque
Regla oficial (rulebook:447-449): "No player may use duplicates of the same Plot card in a single attack, or to defend against a single attack, even if the duplicate Plot cards are used to help two different Groups." `addBoost` (engine.js:3701-3740) no comprobaba nombre duplicado → dos copias del mismo Plot podían inflar el mismo ataque. **Fix aplicado:** rechaza el boost si ya existe otro con el mismo nombre en `A.boosts`/`A.defBoosts`. Se comparan nombres (no instancias), así que el ejemplo oficial (rulebook:525-529, dos +10 **distintos**: Martial Law y Martyrs) sigue permitido.

### #10 [DATOS] Global Power ausente del dataset (bloquea #5c)
Ninguna carta de grupo declara `globalPower`; solo existe `globalPowerDelta` en el efecto del Plot Purge. Las transcripciones "Power: X / Y" son ambiguas: Hackers está modelado `power:3, resistance:2` pero su 3/2 oficial es Power/Global Power (Resistance distinta); igual Clone Arrangers `6/2`, W.I.T.C.H. `3/3`, y un lote de `power:null`. **Acción:** el fix mecánico de #5 lee `globalPower` si existe (compatible hacia atrás), pero rellenar el campo requiere verificar cada carta contra su imagen (se integra en la deuda de datos, no se inventan valores).

### #11 [DESVIACIÓN] "Área neutral" (P1-004)
El motor implementa un `S.neutralArea` que el rulebook INWO no contempla (no existe un "neutral area" en las reglas extraídas), y además invierte el resultado oficial: el control **ganado** desde una mano rival manda la carta al área neutral (engine.js:4537-4540) cuando el rulebook dice "If Your Attack Succeeded: The target is captured! Place it in your Power Structure" (rulebook:598-600). Está bendecido por un test explícito (test_fase2_rules.js:474-475, "P1-004 el control ganado manda la carta al ÁREA NEUTRAL"), así que es diseño deliberado del motor, no un accidente. **No corregido**: es rediseño (afecta a declareAttack, applyAttackResult, la UI y varios tests), fuera del alcance de un fix mínimo. Documentado para decisión del usuario.

## Deuda de datos (exit 1 intencional, no bugs nuevos)

Medido por `scripts/audit_syn.cjs`, `audit_mechanics.cjs`, `audit_stats.cjs`:
- 142 cartas `unverified` (clasificadas pero sin mapeo de habilidad a motor; 252 clasificadas, 233 implemented-pending-engine).
- 27 `source-text-unmapped`, 17 conflictos secundarios (15 conflict cards / 17 fields), CMU discrepancies 0.
- 43 power null / 24 resistance null en crudo (varias por el patrón "Power: X / Y" de #10).
- 4 Plots sin mecánica, 3 cartas congeladas, huecos de texto: california, margaretthatcher, ollienorth, vaticancity.
- Ramas muertas declaradas: paralyze, zap, nwo.

## Verificado OK (sin hallazgos)

- **Matemática de ataque** (`computeStrength`, engine.js:3797-3939): base P−R (control) / P−P (destroy, defenseBase=defenderPower); ±4 por alineación SOLO del líder (los ayudantes no reciben bonus de alineación — rulebook:474-476 ✓); master-alignment +4 excepto Fanatic; posición +10/+5/0; devastado defiende con la mitad de su Power (redondeo abajo, rulebook:683-685); multiplicadores no acumulativos (rulebook:522-523, Necronomicon triplica en autodefensa — ejemplo oficial rulebook:550-556: (3×3)+2=11 ✓).
- **Dados:** fuerza <2 = fallo automático sin rodar (rulebook:516-517); 11-12 fallan siempre (engine.js:4328, 4351, 4453, 5217, 9515, 9832).
- **Privileged attack (P1-026):** única puerta `addSupport` (3659-3664), con excepciones Frog God y Bimbo at Eleven. Interferencia cerrada = no Plots contra el ataque (rulebook:1140-1148).
- **Instant attacks genéricos** (engine.js:9479-9524): dados correctos, devastado, bonus Illu; NO aplica el +10 de Assassination (P1-016).
- **Gastos de ataque:** token del atacante tras validar todo (3547-3556); root Illuminati puede atacar; una ficha, nunca dos pools.
- **Límite de 5 Plots** al fin del turno (+ exposed), Gnomes of Zurich 6 (engine.js:9988-10006; regla rulebook:303-312); Goal hand limit (10007-10011).
- **exchangeForPlot** (2130-2166): 1 acción Illuminati O 2 tokens de grupo (rulebook:231-235), rollback en error, respetando bloqueo Unlucky 13.
- **Victoria/eliminación:** `checkElimination` (1765-1771) — eliminado sin títeres tras su tercer turno; `checkVictory` (10149) — metas, shared victory (salvo mismo Illuminati), elimination win (10093-10095).
- **Área neutral:** ataque/destrucción en neutral (4528-4531); takeover desde mano con éxito → neutral area (4539).
- **Captura:** subárbol completo capturado (4559-4601); títeres de un grupo destruido vuelven a la mano del dueño; Flying Saucer y Celebrity Spokesman viajan/caen con su carta.
- **Control desde mano N veces por turno** (regla rulebook:309-315): `declareAttack` cobra solo el token del grupo atacante (3556), acción Illuminati no requerida para el takeover normal.
- **Flecha abierta** exigida solo para control (3487-3488; destroy no la necesita — rulebook:591-592).
- **Inmunidades:** fallo previo contra el mismo jugador (3466-3467), Discordian vs Straight/Government (3472-3473), Hitler's Brain vs Peaceful (3441), Illuminati no atacables (3462).
- **Bonus específicos:** Russia (3490-3526), Clone Arrangers / Rogue Boomer / Sweepstakes (3527-3546), World War Three (3558-3570), Weather Satellite (3611-3631), Sucked Dry diferido al fin de turno (10012-10019).

## Desarrollo hacia el 100% (estado y ruta)

El "100%" de cobertura se mide con `test_fase4_cards.js` y `scripts/audit_mechanics.cjs`. Estado tras esta sesión:

- **unverified: 142 → 94** (48 cartas implementadas en 9 commits: L41, L41b, L42, L43, L44, L45, L46, L47, L48, L49).
- `implemented-pending-engine`: 233 → 282. Cartas clasificadas: 252 → 277.
- Fuera declarado: Dinosaur Park (su +4 al Disaster es ACCION, no pasiva; mapearla automática rompía la matemática de L13).
- Arnés: drenaje global `clear24()` antes de CADA `endTurn` de `test_fase2_rules.js` (elimina los flakes de ventanas de suceso).
- Familias de motor montadas: `atk_bonus`, `def_bonus`/`combo_bonus`, `free_interfere`, `atk_flip`, `attack_immune`, `power_grant`, `power_per_count`, `aid_power`, `noGoalOnDestroy`, `noDestroy` — añadir cartas de estas familias es puro dato en `gen_cards.js`.
- Arnés: `clear24()` antes de cada `endTurn` de `readyToAttack` y de los endTurn directos de L40 (flakes de ventanas de suceso documentados).
- `implemented-pending-engine`: 233 → 250. Cartas clasificadas: 252 → 265.

Patrones de motor ya montados (añadir cartas de estas familias es ahora puro dato en `gen_cards.js`):
- `atk_bonus` (L41): bonos de ataque de grupo por alineación/atributo/carta del objetivo, scope self/owner, cláusulas múltiples con `pick:'sum'|'best'`.
- `def_bonus` / `combo_bonus` (L42): bonos de defensa filtrados por el bando atacante (atacante o ayudantes), modes resist/power/both, `excludeSelf`.

Familias restantes (la cola, por orden previsto):
1. `free_interfere` — "may aid or oppose any attack made by/against X regardless of alignments" (Big Media, Junk Mail, A.M.A., Druids, Dinosaur Park…). 1 check en `addSupport`.
2. `attack_immune` — inmunidad a ataques de X (Goldfish Fanciers, Empty Vee, Offshore Banks solo-destroy, Stonehenge, Princess Di). 1 check en `declareAttack`.
3. Bonos de apoyo (poder aportado al ayudar/oponerse: A.M.A. "+5 protect").
4. Modificaciones de líder (The Mafia/Tobacco/TV Preachers/ICC: "+N, rather than the normal -4").
5. Acciones activas de grupo (cancelar acciones, robar mano, descartes forzados, draws extra, reorganizar estructura): muchas, una a una.
6. Resistencia condicional por atacante tipo override (Gun Lobby "resistance is 10").
7. Deuda de datos: `globalPower` (#10), 27 `source-text-unmapped` (texto insuficiente en OCR/secundaria), 4 Plots sin mecánica, ramas muertas paralyze/zap/nwo, huecos de texto (california, margaretthatcher, ollienorth, vaticancity).
8. Rediseños pendientes de decisión: #8 (atacar la propia mano) y #11 (área neutral).

## Qué quedó fuera y por qué

- Verificación carta a carta de las 428 cartas contra imágenes (la miden los scripts audit_*; es la deuda de datos documentada).
- Rellenar `globalPower` en el dataset (requiere inspección visual de cada carta; #10).
- Partida E2E completa de meta de 12 grupos y privilege Bavarian (implementados; verificados a nivel de código, no jugados).
- Interacción exacta entre autodefensa multi-ficha y multiplicadores externos de Poder (Necronomicon, etc.): el fix solo cuenta fichas (factor 1+n); la combinación con multiplicadores externos queda como estaba (rulebook:522-523 "single largest multiplier").

## Verificación final

- `npm test` → **ALL TESTS PASSED (13)** con todos los fixes aplicados (dos corridas completas).
- `node scripts/diag_attack.cjs` → `DIAG ATTACK OK · 143 ataques`, exit 0 (antes crasheaba con "sin resolver la negacion").
- Tests de regresión añadidos en `test_fase2_rules.js` (bloque `p2FixesTests`): P2-R5a (oposición master sin alineación), P2-R5b (Global Power), P2-R5c (oposición a destroy con alineación idéntica), P2-R6 (autodefensa 2 fichas → factor 3: 28→42), P2-R7 (no-duplicados del mismo grupo), P2-R9 (Plot duplicado). Todos en verde.
- Informes `research/audit_reports/{mechanics,synergies,usage}.md` regenerados por correr los scripts de auditoría (salida normal, no editada a mano).

## Próximos pasos

1. ~~Corregir #3, #4, #5, #6, #7, #9~~ (hecho, uno a uno).
2. ~~`npm test` completo × N~~ (hecho: 13/13, dos corridas).
3. ~~Tests de regresión #5/#6/#7/#9~~ (hecho, `test_fase2_rules.js` → `p2FixesTests`).
4. **Decisión del usuario**: #8 (implementar el ataque a la propia mano) y #11 (retirar o mantener el área neutral). Ambos son rediseño con test propio; no se tocaron.
5. #10: rellenar `globalPower` carta a carta contra las imágenes (deuda de datos).
