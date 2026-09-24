# INWO Digital — REGLAS CODIFICADAS v2.0
Fuente: World Domination Handbook v1.2 (PDF oficial local) + digest oficial verificado. Juego para 2 jugadores.

## 1. Setup — VARIANTE OFICIAL "ONE BIG DECK" (OBD), modo por defecto
La colección tiene 1 copia de cada carta => usamos la variante OBD oficial:
1. MAZOS COMPARTIDOS: 1 Plot deck global (plots+assassinations+disasters+NWO+goals) y 1 Group deck global (groups+resources), ambos barajados.
2. Cada jugador elige su Illuminati (sin repetir; las imágenes duplicadas de Illuminati son la MISMA carta).
3. Mano inicial: robar 3 Plot cards + 10 Group cards (OBD).
4. Colocar cada Illuminati en mesa: estructura raíz con 4 flechas de control abiertas.
5. Dado más alto va primero (empates repiten).
6. Regla de 2 jugadores: NADIE ataca antes de que AMBOS hayan completado su primer turno.
7. AREA NEUTRAL: si un ataque a controlar contra una carta de la mano RIVAL falla, esa carta va al área neutral central (no al descarte). No se permite takeover automático desde el área neutral. Cualquier jugador puede atacar grupos del área neutral en su Main Phase.
(Modo clásico alternativo con mazo propio de 45 cartas: NO implementado en v1.)

## 2. Inicio de turno
1. Robar 1 Plot card (opcional).
2. Robar 1 Group card (opcional).
3. UNA toma automática: colocar gratis (sin tirada) 1 Group o Resource de la mano. Group entra en flecha libre; Resource se coloca junto a la estructura (linkeada al Illuminati por defecto). No se pueden duplicar Groups/Resources ya en juego salvo carta lo permita.
4. Colocar 1 Action token en cada Group propio sin token, y en Resources con palabra "Action".

## 3. Fase Principal (acciones ilimitadas)
- Atacar (control/destruir): gasta el token del grupo atacante; el atacante necesita >=1 flecha de control abierta.
- Mover Group a otra flecha propia (cuesta 1 acción) o a estructura ajena si ambos acuerdan y alguien paga el costo en tokens.
- Jugar Plot card según su texto.
- Jugar Resource: cada Resource cuesta UNA acción del Illuminati; máx 1 Resource jugado por turno por esta vía (además del takeover gratuito del paso 3 del inicio).
- Cambiar 1 acción del Illuminati por robar 1 Group card: 1 vez por turno.
- Regalar/intercambiar Resources y cartas de mano.
- Ayudar u oponerse a ataques (en cualquier momento).

## 4. Economía de Action tokens ("Any Time")
- Cambiar 1 token del Illuminati O 2 tokens de otros Groups por robar 1 Plot card. No cuenta como acción; no puede cancelarse.
- Group con Power reducido a 0 NO recibe tokens (Power impreso 0 sí los recibe).
- Un grupo hace UNA cosa por turno con su token (atacar/ayudar/oponerse/habilidad), salvo tokens extra.

## 5. Ataque a Controlar
- Requisitos: token del atacante + >=1 flecha abierta. Los Illuminati no pueden ser atacados. Se puede atacar un Group de la propia mano (si falla, esa carta se descarta y "nunca estuvo en juego"; otra copia podrá jugarse luego).
- Fuerza = Power(atacante) - Resistance(objetivo), más:
  - +4 por cada alineamiento IDÉNTICO entre atacante y objetivo; -4 por cada opuesto (solo aplica al atacante líder).
  - Defensa del objetivo: +4 por cada alineamiento común con su AMO (excepto Fanatic vs Fanatic); bono de cercanía al Illuminati: +10 directamente debajo, +5 a 1 Group, 0 más lejos.
  - Grupos ayudantes suman su Power al ataque; necesitan >=1 alineamiento idéntico al objetivo (o Global Power aplicable). Quien ayuda/opone gasta SU token.
  - El objetivo puede defenderse gastando SU token: su Power cuenta DOBLADO sumándose a la defensa (regla v1.2: acción gastada defendiéndose = Power doblado).
- Resolución: fuerza final < 2 = fallo automático sin dados. Si >=2: tirada de 2d6; éxito si roll <= fuerza.
- Éxito contra rival: objetivo pasa con todos sus títeres a una flecha abierta del atacante (el sistema reubica el subárbol completo). Resources linkeadas al grupo lo siguen.
- Fallo contra group en juego: el objetivo queda inmune a nuevos ataques de ESE atacante por el resto del turno.

## 6. Ataque a Destruir
- Como Control pero: el objetivo defiende con su POWER (no Resistance); NO aplican bonos por alineamientos con su amo; SÍ aplica bono de cercanía (10/5/0) salvo al destruir grupo propio.
- +4 por cada alineamiento OPUESTO entre atacante y objetivo; -4 por cada idéntico.
- Ayudar una destrucción requiere tener >=1 alineamiento opuesto al objetivo. Oponerse usa las reglas de Control (alineamiento idéntico, o ser amo/títere del objetivo).
- Nadie ataca/ayuda contra sí mismo. Destruir grupo propio: sin bono de cercanía.
- Al destruirse: el Group va al descarte (se registra quién lo destruyó para metas); sus Resources linkeadas se destruyen también; sus TÍTERES NO se destruyen — pierden sus tokens y vuelven a la MANO de su dueño.
- Eliminación: un jugador es eliminado si en CUALQUIER momento tras su TERCER TURNO COMPLETO su Illuminati no tiene ningún títere. Eliminar a todos los rivales = victoria inmediata.

## 7. Instant Attacks (Asesinatos, Desastres)
- Jugables en CUALQUIER momento (salvo texto contrario).
- Fuerza = Power de la carta instant - Power ACTUAL del objetivo. El objetivo conserva su bono normal de cercanía (salvo que su dueño lance el ataque). Otros modificadores NO aplican salvo que la carta lo diga.
- Éxito (roll <= fuerza): Asesinato mata al Personality PERMANENTEMENTE (va al descarte marcado "killed"; solo cartas específicas pueden salvarlo); Desastre destruye/devasta el Place objetivo (devastación: el lugar pierde tokens propios y del subárbol; subárbol no actúa ni cuenta para metas hasta Relief).

## 8. Privilege / Immunity / Secret
- Privilege: se anuncia AL DECLARAR el ataque; solo atacante y defensor pueden actuar en él. Contra carta de mano propia, NADIE interfiere.
- Immunity: los grupos inmunes no pueden ser atacados, ayudados-en-contra ni afectados por habilidades de la fuente de inmunidad.
- Secret groups: la mayoría no puede atacarlos, ayudarlos/oponerse a ellos ni afectarlos con habilidades. Excepciones: Illuminatis, otros Secret, Resources no linkeadas a grupos no-Secret.

## 9. Manos y límites
- Fuera de tu turno: máximo 5 Plot cards en mano (las expuestas cuentan). En tu turno: ilimitado. Exceso => jugar/regalar/descartar/devolver al mazo inmediatamente.
- Group/Resource cards: sin límite en mano. Devolver Plots al mazo (arriba/abajo/medio) permitido fuera de robos múltiples.
- Descartes boca arriba. Sin penalización por quedarte sin cartas en el mazo (no robas).

## 10. Victoria
- Meta Básica: controlar X Groups incluido tu Illuminati, verificable al final de cualquier turno: X = 12 (2-3 jugadores), 11 (4), 10 (5+). Con 2 jugadores JAMÁS por debajo de 12 (la opción rápida 8 queda desactivada por defecto).
- Ganar eliminando a todos los rivales.
- Nadie gana en la primera ronda; primera victoria posible: fin del segundo turno del primer jugador.
- Metas alternativas (Illuminati especiales, p.ej. Shangri-La: 30 de Power Peaceful total en estructuras propias) soportadas via campo specialGoal.

## 11. Duplicados y agentes
- Duplicado de un Illuminati rival (jugado desde la mano como Plot): agente +3 ataque/defensa contra TODA su estructura (coste: descartar la carta superior no robada del Plot deck Y del Group deck). Un agente por tipo de Illuminati; nunca contra el propio tipo.
- Duplicado de un Group ya controlado por el rival = Hidden Agent: desde la mano da +10 para ayudar o -6 para oponer ataques contra ese grupo exacto (máx 1 carta-agente por ataque). No se puede jugar tu propia copia mientras el original esté en juego.

## 12. Alcance de efectos de cartas
Efectos data-driven por familias implementadas: boost10 (ataque/defensa), attribute_freeze, paralyze, power_increase, zap, NWO globales, assassination, disaster, goal y mecánicas específicas verificadas. El texto OCR o una fuente no canónica se conserva como referencia, pero no se convierte en una regla: las cartas con `mechanicsStatus` `unverified` o `ability_unverified` se rechazan antes de gastar tokens o modificar la mano, y las familias legacy `plot_generic`/`resource_generic` quedan bloqueadas. `implemented:true/false` y `mechanicsStatus` documentan el estado de cada carta; no se afirma una cobertura completa del tabletop.
