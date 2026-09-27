# Transcripcion verbatim de las cartas Illuminati

Fuente: lectura de los PNG originales (`Illuminati/INWO - <nombre> 1.png`, 818x1111, escaneados
girados 90°). Texto copiado exactamente de la imagen; NO es OCR, NO es interpretacion.

Todos los PNG de `Illuminati/` estan girados 90° (verificado: desviacion tipica de la media de
filas vs columnas, r = 0.535–0.980 para los 18; los 167 `Groups/` dan r > 1.05). Por eso la
regla `img[src*="Illuminati/"] { transform: rotate(90deg) scale(.735) }` es necesaria.

Todos son 1 poder + 1 carta; las cartas "2" de cada Illuminati comparten estas reglas.

---

## adeptsofhermes — Adepts of Hermes 1 — POWER 7/7

**Poder especial (verbatim):**
> If you fail an Attack to Control against a Group from your own hand, you do not lose the
> group . . . just return the card to your hand. The Adepts of Hermes have a +6 on any attempt
> to control or destroy a Magic group.

**SPECIAL GOAL (verbatim):**
> Each Magic Resource you control counts as one group toward the Basic Goal.

Tags de alineacion impresos: ninguno visible.

---

## bavarianilluminati — Bavarian Illuminati 1 — POWER 10/10

**Poder especial (verbatim):**
> Each turn, you may declare one of your attacks *privileged*.

**SPECIAL GOAL (verbatim):**
> Control a total Power of 50 or more, counting Bavaria's own Power.

Tags de alineacion impresos: ninguno visible.

---

## bermudatriangle — Bermuda Triangle 1 — POWER 8/8

**Reglas adicionales (verbatim):**
> You may reorganize your groups freely at the end of your turn.

**SPECIAL GOAL (verbatim):**
> Control a total Power of at least 35, counting Bermuda's own Power, and at least one group of
> each alignment. A group with more than one alignment counts for all its alignments.

Tags de alineacion impresos: ninguno visible.

---

## discordiansociety — Discordian Society 1 — POWER 7/7

**Poder especial (verbatim):**
> You have a +4 on any attempt to control Weird groups. Your power structure is *immune* to
> attacks from Government or Straight groups, and to all special abilities of these groups.

**SPECIAL GOAL (verbatim):**
> Any Weird group with a Power of 3 or more counts double toward your total number of groups
> controlled.

Tags de alineacion impresos: ninguno visible.
⚠️ El texto menciona la alineacion **"Straight"**, que NO existe entre las 14 oficiales de
INWO. Probable error de lectura o de la carta; verificar contra las reglas oficiales.

---

## gnomesofzurich — Gnomes of Zurich 1 — POWER 9/9

**Poder especial (verbatim):**
> You may hold 6 Plot cards in your hand, rather than the usual 5. You have a +4 on any attempt
> to control Corporate groups or Banks.

**SPECIAL GOAL (verbatim):**
> Any Corporate group or Bank with a Power of 4 or more counts double toward your total number
> of groups controlled.

Tags de alineacion impresos: ninguno visible.

---

## servantsofcthulhu — Servants of Cthulhu 1 — POWER 9/9

**Poder especial (verbatim):**
> You have a +4 on any attempt to destroy, even with Disasters and Assassinations. Draw a Plot
> card whenever you destroy a group!

**SPECIAL GOAL (verbatim):**
> For every group you destroy, reduce by 1 the number of groups you need to control in order to
> win. You may also count rival Illuminati which you destroy by removing their last group. If
> you destroy 8 groups, you win, regardless of how many you control!

Tags de alineacion impresos: ninguno visible. La imagen esta girada 90° antihorario.

---

## shangrila — Shangri-La 1 — POWER 7/7

**Poder especial (verbatim):**
> Any group in your Power Structure has an extra +5 to defend against any attack. You cannot
> destroy any groups except Violent ones and rival Illuminati.

**SPECIAL GOAL (verbatim):**
> Have Peaceful groups with a total Power of 30 in play, regardless of who controls them! If
> this happens, *all Shangri-La players share the victory.*

Tags de alineacion impresos: ninguna etiqueta visible, aunque el texto referencia grupos
"Peaceful" y "Violent". ⚠️ "Violent" tampoco esta entre las 14 alineaciones oficiales.

---

## thenetwork — The Network 1 — POWER 8/8

**Poder especial (verbatim):**
> You start your turn by drawing two Plot cards, rather than one.

**SPECIAL GOAL (verbatim):**
> Any Computer group with a Power of 3 or more counts double toward your total number of groups
> controlled.

Tags de alineacion impresos: ninguno. La palabra "Computer" aparece dentro del Special Goal.

---

## ufos — UFOs 1 — POWER 6/6, marca "•TWICE•"

**Poder especial (verbatim):**
> The UFOs have two actions per turn — they get two tokens! These may not be used in the same
> attack.

**SPECIAL GOAL (verbatim):**
> The UFOs can have up to 3 different Goal cards in play, and win with any of them.

Tags de alineacion impresos: ninguno.
Nota: la carta imprime la marca **"•TWICE•"** en amarillo, que en INWO significa que el grupo
cuenta como dos grupos hacia la meta. Tambien explica la meta: hasta 3 cartas de meta distintas
en juego. Requiere barajar cartas "Goal" al mazo (hoy hay 0 cartas `goal` en el mazo).

---

## PENDIENTE

- [x] Los 9 Illuminati — TRANSCRITOS (esta seccion)
- [ ] 13 Plots tipo `disaster` (implementados pero SIN parametros)
- [ ] 5 Plots tipo `assassination` (implementados pero SIN parametros)
- [ ] 35 Resources (ninguna implementada)
- [ ] 166 Groups sin pasiva (solo Vatican City tiene efecto)

## Nota operativa

`look_at` (multimodal) SOLO funciona con UNA imagen por llamada via el parametro `file_path`.
Con `file_paths:[...]` (array) siempre agota el tiempo a los 120 s. Es intermitente: puede
fallar y funcionar al reintentar la misma imagen.
