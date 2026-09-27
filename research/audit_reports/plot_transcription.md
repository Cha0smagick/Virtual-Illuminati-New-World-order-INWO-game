# Transcripcion verbatim de los Plots disaster / assassination

Mismo metodo que `illuminati_transcription.json.md`: lectura directa de los PNG, texto copiado
exactamente. Los PNG de `Plots/` NO estan girados (r = 0.82–1.26, distribucion continua, sin
corte bimodal) — la rotacion solo aplica a `Illuminati/`.

## CONCEPTOS NUEVOS QUE EL MOTOR NO IMPLEMENTA (aparecen en estas cartas)

El juego real de INWO tiene una **capa de "Places"** que `engine.js` no existe en absoluto:

- **Place** — un tipo de objetivo mas alla de los Groups (p.ej. Japan, California, Robot Sea
  Monsters, Nuclear Power Companies).
- **Atributos de Place**: *Coastal*, *Huge* (y otros). Los Plots seleccionan objetivo por
  atributo, no solo por alineacion.
- **Devastated** — estado intermedio en un ataque a Destroy. En `engine.js` hoy un ataque
  successful a Destroy destruye directamente; no existe el estado intermedio "Devastated".
- **Instant Attack** — un ataque que no consume accion.
- **Disasters vs Assassinations** son subtipos distintos con reglas propias, no solo
  `kind: 'disaster'`.

`engine.js` solo tiene `case 'disaster'` y `case 'assassination'` con implementacion generica y
SIN parametros, asi que las 18 cartas se comportan todas igual. Estas son las reglas reales.
| giantkudzu | cualquier Place | **30 *Coastal* / 24** otro | **NO** (cualquier grupo puede ayudar a la victima, no al Kudzu) | si | 6 | |
| rainoffrogs | cualquier Place | 10 **+4 por cada Frog God** del jugador objetivo | si | si | 6 | |
| theoregoncrud | Place **excepto *Huge*** | 10 | si | si | 5 | |
| tidalwave | Place *Coastal* | 20 *Huge* / 24 otro | si | si | **10** | |
| tornado | Place **excepto *Huge*** | 12 | si | si | 4 | |
| volcano | Place **excepto *Huge*** | 14 | si | si | **3** | |

---

## atomicmonster — Atomic Monster — DISASTER

Impreso: *Disaster!*

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any *Coastal* Place. It does not require an
> action. Its Power is 16 against a *Huge* Place, 20 against any other Place, but 24 against
> Japan or California.
>
> If the attack succeeds, the target is *Devastated*. If it succeeds by more than 6, the target
> is destroyed.
>
> Or play at any time to give +10 to any attack to destroy the Robot Sea Monsters or the
> Nuclear Power Companies!

Parametros: objetivo = Place *Coastal*. Poder 16 vs *Huge*, 20 vs otro, 24 vs Japan/California.
Instant Attack (sin accion). Devastated; destroyed si el exito es > 6.
Uso alterno: +10 a cualquier ataque a Destroy contra Robot Sea Monsters o Nuclear Power Companies.

---

## earthquake — Earthquake — DISASTER

Impreso: *Disaster!*

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its
> Power is 12 against a *Huge* Place, 16 against any other Place.
>
> If the attack succeeds, the target is *Devostated*. If the die roll succeeds by more than 5,
> the target is destroyed!

Parametros: objetivo = cualquier Place. Poder 12 vs *Huge*, 16 vs otro. Instant Attack.
Devastated; destroyed si el exito es > 5.

⚠️ La carta imprime **"Devostated"** (con "o"), errata del editor. El termino estandar es
*Devastated*.


## epidemic — Epidemic — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Attack to Destroy any Place. It does not require an action. Its Power is 14.
>
> This is *not* an Instant attack; other groups can interfere normally.
>
> If the attack succeeds, the target is *Devastated*. This attack cannot actually destroy the target.

## hurricane — Hurricane — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Coastal Place. It does not require an action. Its Power is 16 against a *Huge* Place, 20 against any other Place.
>
> If the **attack** succeeds, the target is *Devastated*. This attack cannot actually destroy the target.

## meteorstrike — Meteor Strike — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its Power is 16. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is completely destroyed!

## nuclearaccident — Nuclear Accident — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its Power is 14 against a *Huge* Place, 18 against any other Place.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is completely destroyed!
>
> The Nuclear Power Companies lose their action token when this card is played on any Place.

## plagueofdemons — Plague of Demons — DISASTER

Borde inferior impreso: `Disaster!` | `May Require Magic Action`

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place except a *Huge* one. You must spend an action from a *Magic* group. The Power of the attack is 10, plus the Power of the group summoning the demons.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 5, the target is completely destroyed!
>
> Alternatively, spend this card for +10 to destroy any *Magic* group.


## giantkudzu — Giant Kudzu — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Attack to Destroy any Place. It does not require an action. Its Power is 30 against a *Coastal* Place, 24 against any other Place.
>
> This is *not* an Instant attack; *any* group can use its action to aid the victim (but not the Kudzu).
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 6, the target Place is completely destroyed!

## rainoffrogs — Rain of Frogs — DISASTER

**Texto verbatim:**
> *Disaster!* This is as an Instant Attack to Destroy any Place. It does not require an action. Its Power is 10 against a Place of any size, *plus* 4 for each Frog God the target player has in play.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 6, the target is completely destroyed!

⚠️ errata: "This is as an Instant Attack" (sobra el "as").

## theoregoncrud — The Oregon Crud — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place except a *Huge* one. It does not require an action. Its Power is 10.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 5, the target is completely destroyed!

## tidalwave — Tidal Wave — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Coastal Place. It does not require an action. Its Power is 20 against a *Huge* Place, 24 against any other Place.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 10, the target is destroyed!

## tornado — Tornado — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place except a *Huge* one. It does not require an action. Its Power is 12.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is completely destroyed!

## volcano — Volcano — DISASTER

**Texto verbatim:**
> *Disaster!* This is an Instant Attack to Destroy any Place except a *Huge* one. It does not require an action. Its Power is 14.
>
> If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 3, the target is completely destroyed!

---

# ASSASSINATIONS (5/5) — todos apuntan a **Personalities**

Regla comun a las 5: *"This is an Instant Attack to Destroy any Personality, at any time. It does
not require an action."* — o sea el ataque base es gratis y puede lanzarse en cualquier momento.
La diferencia entre las 5 es (a) el Poder base y (b) **que alineacion puede gastar su accion para
sumar su propio Poder** (opcional, "may", y solo UNA).

| id | Poder base | Alineacion que puede sumar su Poder | Otros |
|---|---|---|---|
| carbomb | 8 | Violent or Criminal | |
| hitandrun | 10 | Fanatic | ⚠️ "Fanatic" NO es una de las 14 alineaciones oficiales |
| poison | 8 | Criminal or Magic | "This card is only *Magic* if used by a *Magic* group." |
| sniper | 10 | Government | |
| witheringcurse | 10 | Magic | "This attack is *Magic*." |

⚠️ "Fanatic" en Hit and Run es otra etiqueta que no existe entre las 14 alineaciones oficiales —
mismo problema que "Straight" (Discordian Society) y "Violent" (Shangri-La). Hay que verificar
contra las reglas oficiales antes de implementar: puede ser un termino legitimo del juego o un OCR
malo.

## carbomb — Car Bomb — ASSASSINATION

**Texto verbatim:**
> *Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 8.
>
> A single Violent or Criminal group *may* use its action for this attack, and add its own Power.

## hitandrun — Hit and Run — ASSASSINATION

**Texto verbatim:**
> *Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10.
> A single Fanatic group *may* use its action for this attack, and add its own Power.

## poison — Poison — ASSASSINATION

**Texto verbatim:**
> *Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 8.
>
> A single *Criminal* or *Magic* group *may* use its action for this attack, and add its own Power. This card is only *Magic* if used by a *Magic* group.

## sniper — Sniper — ASSASSINATION

**Texto verbatim:**
> *Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10.
>
> A single Government group *may* use its action for this attack, and add its own Power.

## witheringcurse — Withering Curse — ASSASSINATION

**Texto verbatim:**
> *Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10.
>
> A single Magic group *may* use its action for this attack, and add its own Power. This attack is *Magic*.

---

# RESUMEN EJECUTIVO — los 18 Plots ya NO son la misma carta

Estado de la transcripcion: **18/18 Plots + 9/9 Illuminati = 27 cartas con reglas reales.**

Lo que `engine.js` hace hoy: `case 'disaster'` y `case 'assassination'` genericos y SIN
parametros, asi que las 18 cartas se comportan identicamente. Lo que el juego real hace:

1. **Tres tipos de objetivo**, no uno: **Groups** (ya existe), **Places** (no existe en el motor) y
   **Personalities** (no existe en el motor). Los 13 Disaster apuntan a Places, los 5
   Assassination a Personalities.
2. **Selectores por atributo**: *Coastal*, *Huge* — los Places tienen atributos y se eligen por
   ellos, no por alineacion.
3. **Devastated** como estado intermedio: 11 de 13 Disaster solo Devastan; solo 8 pueden
   destruir de verdad, y cada una con su propio margen (de >3 a >10).
4. **Instant ≠ gratis**: son dos ejes separados. Epidemic y Giant Kudzu NO son Instant (los
   grupos pueden interferir / ayudar a la victima) aunque no cuesten accion.
5. **Poder variable por objetivo**: 8 Disaster tienen dos o tres valores segun el atributo del
   objetivo; Plague of Demons suma el Poder del grupo *Magic* que invoca; Rain of Frogs suma
   +4 por cada Frog God del rival.
6. **Desviaciones de la familia oficial**: Shangri-La, Discordian Society y (probablemente) el
   "Fanatic" de Hit and Run usan alineaciones que no estan entre las 14 oficiales.
7. **Marcadores de borde** que el motor no lee: "•TWICE•" (UFOs) y "May Require Magic Action"
   (Plague of Demons).

⚠️ **Los 35 Resources y los 166 Groups con pasiva siguen SIN transcribir** — ese es el siguiente
bloque de trabajo, y son 201 cartas mas.
