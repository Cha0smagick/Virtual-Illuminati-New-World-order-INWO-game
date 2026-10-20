/* i18n.js — INWO bilingüe: ENGLISH default / Español secundario.
   Estrategia no-invasiva: barrido periódico que traduce textos exactos del HUD.
   Los registros del motor (narrativa) quedan en español en v1. */
(function () {
  'use strict';
  var D = {
"🤖🤖 IA vs IA": "🤖🤖 AI vs AI",
"👤 JUGADOR 1 ▼": "👤 PLAYER 1 ▼",
"🤖 IA 1 ▼": "🤖 AI 1 ▼",
"👤 JUGADOR 2 ▼": "👤 PLAYER 2 ▼",
"🤖 IA 2 ▼": "🤖 AI 2 ▼",
"🤖 IA": "🤖 AI",
"Elige un Illuminati para cada jugador…": "Pick an Illuminati for each player…",
"ROL": "ROLE",
"PODER": "POWER",
"🎯 META": "🎯 GOAL",
"✔ VENTAJA": "✔ STRENGTH",
"✖ DESVENTAJA": "✖ WEAKNESS",
"🎯 Haz CLIC en un grupo con borde VERDE, en tu ILLUMINATI, o en el recuadro «＋ flecha libre» para colocar tu carta ahí.": "🎯 Click a GREEN-bordered group, your ILLUMINATI, or the ＋ free-arrow slot to place your card there.",
"🎯 Haz CLIC en TU grupo atacante resaltado en CIAN (debe tener ● Action token).": "🎯 Click YOUR attacker highlighted in CYAN (it must have a ● Action token).",
"🎯 Haz CLIC en el grupo a CONTROLAR (borde rojo): rival, área neutral… o elige una carta de TU mano.": "🎯 Click the group to CONTROL (red border): rival, neutral area… or pick a card from YOUR hand.",
"🎯 Haz CLIC en el grupo enemigo con borde ROJO que quieres DESTRUIR.": "🎯 Click the RED-bordered enemy group you want to DESTROY.",
"🎯 Haz CLIC en el nuevo anfitrión dentro de tu estructura.": "🎯 Click the NEW HOST inside your structure.",
"🎯 Haz CLIC en el grupo objetivo de este Plot.": "🎯 Click the TARGET group for this Plot.",
"👆 Ahora haz CLIC en una carta de GRUPO o RECURSO de tu mano (abajo).": "👆 Now click a GROUP or RESOURCE card in your hand (below).",
"🎯 Haz CLIC en uno de tus grupos con ● para AYUDAR (+su Power al ataque).": "🎯 Click one of your groups with ● to AID (+its Power to the attack).",
"🎯 Haz CLIC en uno de tus grupos con ● para OPONERTE (−su Power al ataque).": "🎯 Click one of your groups with ● to OPPOSE (−its Power from the attack).",
"🎯 Haz CLIC en el grupo tuyo que quieres MOVER (resaltado en cian, necesita ● token).": "🎯 Click YOUR group to MOVE (cyan highlight, needs a ● token).",
"🎲 Tu ataque está montado y se ve en la barra amarilla de arriba. Cuando quieras, pulsa 🎲 RESOLVER para tirar los dados.": "🎲 Your attack is ready in the yellow bar above. When ready press 🎲 RESOLVE to roll the dice.",
"🎲 La IA lanzó un ataque CONTRA UN GRUPO TUYO — puedes 🛡 defenderlo. Reacciona con los botones de la barra amarilla… o simplemente pulsa 🎲 RESOLVER.": "🎲 The AI launched an attack AGAINST ONE OF YOUR GROUPS — you may 🛡 Defend. React with the yellow-bar buttons… or simply press 🎲 RESOLVE.",
"🎲 La IA lanzó un ataque. Reacciona con los botones de la barra amarilla… o simplemente pulsa 🎲 RESOLVER.": "🎲 The AI launched an attack. React with the yellow-bar buttons… or simply press 🎲 RESOLVE.",
"⏳ TURNO DE LA IA… está tramando. Observa el registro →": "⏳ AI TURN… scheming. Watch the feed →",
"Elige vuestras sociedades secretas · One Big Deck · Gana controlando 12 grupos": "Pick your secret societies · One Big Deck · Win by controlling 12 groups",
"🤖 Humano vs IA": "🤖 Human vs AI",
"👥 Hot-seat (2 humanos)": "👥 Hot-seat (2 humans)",
"Elige un Illuminati para cada jugador…": "Pick an Illuminati for each player…",
"⚔ COMENZAR PARTIDA ▶": "⚔ START GAME ▶",
"💡 Pasa el ratón por una carta para leer su poder especial. Cada sociedad tiene su poder y meta.": "💡 Hover any card to read its special power. Each society has its own power and goal.",
"🖱 Pasa el ratón sobre una carta para ver su PODER especial, su META de victoria, ventajas y desventajas.": "🖱 Hover a card to see its special POWER, victory GOAL, strengths and weaknesses.",
"🎮Cómo jugar": "🎮How to play",
"🔤Glosario": "🔤Glossary",
"👁Sobre el juego": "👁About",
"🎁 Colocar GRATIS en mi estructura (takeover)": "🎁 Place FREE into my structure (takeover)",
"📦 Colocar recurso junto a mi Illuminati (1★)": "📦 Place resource beside my Illuminati (1★)",
"✨ Jugar Plot ahora": "✨ Play Plot now",
"ℹ ¿Cuándo sirven los Plots?": "ℹ When do Plots matter?",
"🗑 Descartar": "🗑 Discard",
"Cancelar": "Cancel",
"Entendido": "Got it",
"Continuar": "Continue",
"Nueva partida": "New game",
"¡ENTENDIDO, A JUGAR! ▶": "GOT IT, LET’S PLAY! ▶",
"🏆 GANAS controlando 12 grupos (la tuya cuenta). Mira tu barra de progreso arriba en todo momento.": "🏆 WIN by controlling 12 groups (yours counts). Watch your progress bar up top.",
"✕ Cancelar": "✕ Cancel",
    /* ---- botones de acción ---- */
    '🎴 Robar PLOT': { en: '🎴 Draw PLOT' },
    '🃏 Robar GRUPO': { en: '🃏 Draw GROUP' },
    ' Takeover': { en: ' Takeover' },
    '⚔ CONTROLAR enemigo': { en: '⚔ CONTROL enemy group' },
    '☠ DESTRUIR enemigo': { en: '☠ DESTROY enemy group' },
    '🔀 Mover grupo': { en: '🔀 Move group' },
    '📦 Jugar Recurso (★)': { en: '📦 Play Resource (★)' },
    '★→Plot': { en: '★→Plot' },
    '★→Grupo': { en: '★→Group' },
    '5 · Terminar turno ▶': { en: '5 · End turn ▶' },
    '✕ Cancelar': { en: '✕ Cancel' },
    '🗂 MANO': { en: '🗂 HAND' },
    '1 · ROBAR': { en: '1 · DRAW' },
    '2 · COLOCAR GRATIS': { en: '2 · PLACE FREE' },
    '3 · ACCIONES (gastan ●)': { en: '3 · ACTIONS (spend ●)' },
    '4 · EXTRAS (★)': { en: '4 · EXTRAS (★)' },
    /* ---- barra de ataque ---- */
    '🛡 Defiende tu grupo (Power ×2)': { en: '🛡 Defend your group (Power ×2)' },
    '🤝 Ayudar (+Power)': { en: '🤝 Aid (+Power)' },
    '✋ Oponerse (−Power)': { en: '✋ Oppose (−Power)' },
    '🎲 RESOLVER ▶': { en: '🎲 RESOLVE ▶' },
    /* ---- estados ---- */
    '⏳ TURNO DE LA IA… está tramando. Observa el registro →': { en: "⏳ AI'S TURN… it is scheming. Watch the log →" },
    'Turno de la IA…': { en: "AI's turn…" },
    'Ataque en curso — resuélvelo': { en: 'Attack in progress — resolve it' },
    'Esperando…': { en: 'Waiting…' },
    /* ---- hints frecuentes ---- */
    '🎁 PASO CLAVE del turno: pulsa «Takeover automático» → elige carta → colócala en un anillo verde. Es GRATIS y sin dados.':
      { en: '🎁 KEY MOVE of the turn: press the Takeover button → pick a card → drop it on a green slot. FREE, no dice.' },
    '🎯 Haz CLIC en un grupo con borde VERDE, en tu ILLUMINATI, o en el recuadro «＋ flecha libre» para colocar tu carta ahí.':
      { en: '🎯 CLICK any group with a GREEN outline, your ILLUMINATI, or the “＋ free arrow” box to place your card there.' },
    '🎯 Haz CLIC en TU grupo atacante resaltado en CIAN (debe tener ● Action token).':
      { en: '🎯 CLICK YOUR attacker highlighted in CYAN (it must hold an ● Action token).' },
    '🎯 Haz CLIC en el grupo a CONTROLAR (borde rojo): rival, área neutral… o elige una carta de TU mano.':
      { en: '🎯 CLICK the group to CONTROL (red outline): rival or neutral… or choose a card from YOUR hand.' },
    '🎯 Haz CLIC en el grupo enemigo con borde ROJO que quieres DESTRUIR.':
      { en: '🎯 CLICK the enemy group with the RED outline you want to DESTROY.' },
    '🎲 Tu ataque está listo. Revisa los modificadores y pulsa 🎲 RESOLVER cuando quieras tirar los dados.':
      { en: '🎲 Your attack is staged. Check modifiers and press 🎲 RESOLVE whenever ready to roll.' },
    '🎲 La IA lanzó un ataque CONTRA UN GRUPO TUYO — puedes 🛡 defenderlo. Reacciona con los botones de la barra amarilla… o simplemente pulsa 🎲 RESOLVER.':
      { en: '🎲 The AI launched an attack AGAINST ONE OF YOUR GROUPS — you may 🛡 defend. React with the yellow-bar buttons… or simply press 🎲 RESOLVE.' },
    'Turno libre: ataca ⚔, juega Plots (clic en tu mano) o pasa turno. GANAS controlando 12 grupos (mira las barras arriba).':
      { en: 'Free turn: attack ⚔, play Plots (click your hand) or end turn. WIN by controlling 12 groups (see bars above).' },
"FIN DEL JUEGO":{en:"END OF GAME"},
"Nueva partida":{en:"New game"},
"OPERACI\u00F3N COMPLETADA":{en:"OPERATION COMPLETE"},
"META CUMPLIDA":{en:"GOAL MET"},
"SOCIEDAD":{en:"SOCIETY"},
"PROGRESO":{en:"PROGRESS"},
"IMPERIO":{en:"EMPIRE"},
"OBJETIVO":{en:"OBJECTIVE"},
"JUGADOR":{en:"PLAYER"},
"TIPO":{en:"TYPE"},
"GRUPOS":{en:"GROUPS"},
"META":{en:"GOAL"},
"Humano":{en:"Human"},
"IA":{en:"AI"},
"Registro":{en:"LOG"},
"\u2694 COMENZAR PARTIDA \u25B6":{en:"\u2694 START GAME \u25B6"},
  "⟳ NUEVO JUEGO":{en:"⟳ NEW GAME"}
  };
  var REV = {};
  function build() {
    for (var es in D) REV[es] = D[es].en;
  }
  var lang = localStorage.getItem('inwo_lang') || 'es';

  /* reglas para mensajes del motor (fuente ES -> EN por patrones) */
  var LOG_RULES = [
    [/^(.{1,28}): saco 6 y queda destruida \(cuenta para (.+)\)$/, function (m) { return m[1] + ': rolled 6 and is destroyed (counts for ' + m[2] + ')'; }],

    [/^(.{1,28}): liga una Plot oculta \((.+)\)$/, function (m) { return m[1] + ': links a hidden Plot card (' + m[2] + ')'; }],

    [/^(.{1,28}): recupera su Action token tras el intento fallido$/, function (m) { return m[1] + ' recovers its Action token after the failed attempt'; }],
    [/^(.{1,28}): robas una Plot extra$/, function (m) { return m[1] + ': you draw an extra Plot card'; }],
    [/^(.{1,28}): robas una Plot por destruir (.+)$/, function (m) { return m[1] + ': you draw a Plot card for destroying ' + m[2]; }],
    [/^(.{1,28}): robas una Plot por el ataque a (.+)$/, function (m) { return m[1] + ': you draw a Plot card for the attack on ' + m[2]; }],
    [/^Contra-ataque de (.{1,28}): \+(\d+)$/, function (m) { return 'Counter-attack by ' + m[1] + ': +' + m[2]; }],
    [/^(.{1,28}): esconde (\d+) Plot\(s\) expuesta\(s\)$/, function (m) { return m[1] + ': hides ' + m[2] + ' exposed Plot card(s)'; }],
    [/^(.{1,28}): da su ficha de acción a (.+)$/, function (m) { return m[1] + ': gives its Action token to ' + m[2]; }],
        /* L69 - el motor emite "accion" sin tilde (engine.js, addSupport de Italy); la regla
       pedia la forma con tilde, asi que NUNCA casaba y el gate de i18n se ponia rojo en
       cuanto la IA usaba la defensa gratis de Italy. Leccion de §90: la regla debe casar
       con lo EMITIDO, no con lo correcto. */
    [/^(.{1,28}): defiende como accion gratis \(Italy\)$/, function (m) { return m[1] + ': defends as a free action (Italy)'; }],
    [/^(.{1,28}): su Poder se fija en (\d+) para este turno$/, function (m) { return m[1] + ': its Power is set to ' + m[2] + ' for this turn'; }],
    [/^Comic Books: la Resistance del objetivo es 0$/, function () { return 'Comic Books: the target\'s Resistance becomes 0'; }],
    [/^EFF: el Poder de los defensores se dobla$/, function () { return 'EFF: the defenders\' Power is doubled'; }],
    [/^KKK: los grupos Violent del ataque doblan su Poder$/, function () { return 'KKK: Violent groups in the attack have doubled Power'; }],
    [/^Pollsters: penalizaciones de alineación anuladas$/, function () { return 'Pollsters: alignment penalties nullified'; }],

    [/^\u2014 Turno de (.+) \(\+(\d+) acci\u00F3n Illuminati\) \u2014$/, function (m) { return '\u2014 Turn of ' + m[1] + ' (+' + m[2] + ' Illuminati action) \u2014'; }],
    [/^(.{1,28}) toma posesi\u00F3n autom\u00E1tica de (.+)$/, function (m) { return m[1] + ' takes automatic control of ' + m[2]; }],
    [/^(.{1,28}) declara ataque a destroy con (.+) contra (.+)$/, function (m) { return m[1] + ' declares ATTACK TO DESTROY with ' + m[2] + ' against ' + m[3]; }],
    [/^(.{1,28}) declara ataque a control con (.+) contra (.+)$/, function (m) { return m[1] + ' declares ATTACK TO CONTROL with ' + m[2] + ' against ' + m[3]; }],
    [/^Ataque \+10 jugada \((.+)\)$/, function (m) { return '+10 plot played (' + m[1] + ')'; }],
    [/^auto-fail \(fuerza (.+?) < 2\) \u2014 ataque de (.+) fall\u00F3$/, function (m) { return 'AUTO-FAIL (strength ' + m[1] + ' < 2) \u2014 ' + m[2] + "'s attack failed"; }],
    [/^Fin de turno\. Nadie cumple meta a\u00FAn\.$/, function () { return 'End of turn. No goal met yet.'; }],
    [/^\u00A1(.+) toma CONTROL de (.+) y todo su t\u00EDtere!$/, function (m) { return m[1] + ' takes CONTROL of ' + m[2] + ' and its whole puppet!'; }],
    [/^\u00A1VICTORIA de (.+)! (.+)$/, function (m) { return m[1] + ' WINS! ' + m[2]; }],
    [/^Meta b\u00E1sica cumplida \((.+)\)$/, function (m) { return 'Basic Goal met (' + m[1] + ')'; }],
    [/^(.{1,28}) intercambia tokens por una carta de Plot$/, function (m) { return m[1] + ' exchanges action tokens for a Plot card'; }],
    [/^fallo \u2014 ataque de (.+) fall\u00F3$/, function (m) { return 'MISS \u2014 ' + m[1] + "'s attack failed"; }],
    [/^\u00E9xito \u2014 (.+)$/, function (m) { return 'SUCCESS \u2014 ' + m[1]; }],
    [/^(.{1,28}) roba su Plot$/, function (m) { return m[1] + ' draws a Plot'; }],
    [/^(.{1,28}) roba un Grupo$/, function (m) { return m[1] + ' draws a Group'; }],
    [/^DESTRUIDO: (.+) \(por (.+)\)\. T\u00EDteres vuelven a la mano de (.+)$/, function (m) { return 'DESTROYED: ' + m[1] + ' (by ' + m[2] + '). Puppets return to ' + m[3] + "'s hand"; }],
    [/^Partida iniciada: modo (.+)$/, function (m) { return 'Game started: ' + m[1] + ' mode'; }],
    /* --- Lote D: familias del corpus IA-vs-IA (audit ## 90.) --- */
    [/^(L\u00EDmite de mano|L\u00EDmite de Goal cards|Reparto inicial): (.+) descartada \(m\u00E1x (\d+) (Plots|Goal cards)\)$/, function (m) { return (m[1] === 'L\u00EDmite de mano' ? 'Hand limit' : m[1] === 'L\u00EDmite de Goal cards' ? 'Goal card limit' : 'Initial deal') + ': ' + m[2] + ' discarded (max ' + m[3] + ' ' + m[4] + ')'; }],
    [/^(Control|Destrucci\u00F3n) de (.+?): rodadero (\d+) sobre una fuerza de (-?\d+) \((fallo|\u00E9xito)\)( \u2014 VENTANA DE REACCION ABIERTA)?$/, function (m) { return (m[1] === 'Control' ? 'Control' : 'Destroy') + ' attack of ' + m[2] + ': roll ' + m[3] + ' vs strength ' + m[4] + ' (' + (m[5] === 'fallo' ? 'fail' : 'success') + ')' + (m[6] ? ' \u2014 REACTION WINDOW OPEN' : ''); }],
    [/^(Control|Destrucci\u00F3n) de (.+) \u2192 rodadero (\d+) sobre una fuerza de (\d+) \u00B7 VENTANA DE REACCI\u00D3N ABIERTA$/, function (m) { return (m[1] === 'Control' ? 'Control' : 'Destroy') + ' attack of ' + m[2] + ' \u2192 roll ' + m[3] + ' vs strength ' + m[4] + ' \u00B7 REACTION WINDOW OPEN'; }],
    [/^FALLO autom\u00E1tico \(11-12 siempre fallan\) \u2014 ataque de (.+) fall\u00F3$/, function (m) { return 'AUTOMATIC MISS (11-12 always fail) \u2014 ' + m[1] + "'s attack failed"; }],
    [/^Se OPONE (.+) \(\+(\d+)\)$/, function (m) { return 'OPPOSED by ' + m[1] + ' (+' + m[2] + ')'; }],
    [/^(.+?): el rodadero de (Control|Destrucci\u00F3n) de (.+?) cambia de (\d+) a (\d+)$/, function (m) { return m[1] + ': the roll of ' + m[3] + "'s " + (m[2] === 'Control' ? 'control' : 'destroy') + ' attack changes from ' + m[4] + ' to ' + m[5]; }],
    [/^(.+?) obliga a repetir la tirada: nueva fuerza \u2264(-?\d+)$/, function (m) { return m[1] + ' forces a reroll: new strength \u2264' + m[2]; }],
    [/^(.+?): (.+?) debe repetir el rodadero con una penalizacion de (-?\d+)$/, function (m) { return m[1] + ': ' + m[2] + ' must reroll with a ' + m[3] + ' penalty'; }],
    [/^(.+?) obliga a repetir la tirada con penalizacion (-?\d+): nueva fuerza \u2264(-?\d+)$/, function (m) { return m[1] + ' forces a reroll with penalty ' + m[2] + ': new strength \u2264' + m[3]; }],
    [/^Time Warp: (.+?) debe repetir el rodadero y roba una carta de Grupo (.+)$/, function (m) { return 'Time Warp: ' + m[1] + ' must reroll and draws a Group card from ' + m[2]; }],
    [/^Tirada inicial: (\d+), (\d+) \u2014 empieza (.+)$/, function (m) { return 'Initial roll: ' + m[1] + ', ' + m[2] + ' \u2014 ' + m[3] + ' starts'; }],
    [/^Empate repetido al iniciar; se resuelve por orden de jugador$/, function () { return 'Tied initial roll again; resolved by player order'; }],
    [/^Nueva partida creada \((\d+) jugadores, meta b\u00E1sica (\d+) grupos\)$/, function (m) { return 'New game created (' + m[1] + ' players, basic goal of ' + m[2] + ' groups)'; }],
    [/^Comienzo del turno de (.+): los rivales pueden reaccionar$/, function (m) { return 'Start of ' + m[1] + "'s turn: rivals may react"; }],
    [/^Los rivales dejan pasar el comienzo del turno de (.+)$/, function (m) { return 'Rivals let ' + m[1] + "'s turn start pass"; }],
    [/^Seize the Time! ha pasado: vuelve el turno de (.+)$/, function (m) { return 'Seize the Time! is over: ' + m[1] + "'s turn resumes"; }],
    [/^(.+?) actua con dos fichas de accion este turno$/, function (m) { return m[1] + ' acts with two action tokens this turn'; }],
    [/^Mazo de (.+) agotado: se rebaraja el descarte$/, function (m) { return 'The ' + m[1] + ' deck is exhausted: the discard pile is reshuffled'; }],
    [/^VENTANA DE SUCESO ABIERTA: takeover automatico \(Power Grab\) de (.+)$/, function (m) { return 'EVENT WINDOW OPEN: automatic takeover (Power Grab) of ' + m[1]; }],
    [/^VENTANA DE SUCESO ABIERTA: takeover automatico de (.+)$/, function (m) { return 'EVENT WINDOW OPEN: automatic takeover of ' + m[1]; }],
    [/^VENTANA DE SUCESO ABIERTA: (.+?) roba una Plot card \((.+)\)$/, function (m) { return 'EVENT WINDOW OPEN: ' + m[1] + ' draws a Plot card (' + m[2] + ')'; }],
    [/^VENTANA DE SUCESO ABIERTA: (.+?) descarta (.+)$/, function (m) { return 'EVENT WINDOW OPEN: ' + m[1] + ' discards ' + m[2]; }],
    [/^VENTANA DE SUCESO ABIERTA: (.+?) juega el duplicado (.+)$/, function (m) { return 'EVENT WINDOW OPEN: ' + m[1] + ' plays the duplicate ' + m[2]; }],
    [/^VENTANA DE ESPIONAJE ABIERTA: (.+?) sobre las Plot de (.+)$/, function (m) { return 'ESPIONAGE WINDOW OPEN: ' + m[1] + ' over ' + m[2] + "'s Plots"; }],
    [/^VENTANA DE NEGACION ABIERTA: (.+?) \(de (.+?)\) puede ser anulada por: (.+)$/, function (m) { return 'NEGATION WINDOW OPEN: ' + m[1] + ' (from ' + m[2] + ') can be cancelled by: ' + m[3]; }],
    [/^VENTANA SIN CONTEXTO: (.+) se aplica en seco \(sin efecto\)$/, function (m) { return 'WINDOW WITHOUT CONTEXT: ' + m[1] + ' applies dry (no effect)'; }],
    [/^CANCELADO: (.+?) de (.+?)(?: \((.+?)\))? \u2014 (.+) falla automaticamente(?: contra (.+))?$/, function (m) { return 'CANCELLED: ' + m[1] + ' from ' + m[2] + (m[3] ? ' (' + m[3] + ')' : '') + ' \u2014 ' + m[4] + ' fails automatically' + (m[5] ? ' against ' + m[5] : ''); }],
    [/^Read My Lips: (.+?) puede anular el ataque exitoso \((.+)\)$/, function (m) { return 'Read My Lips: ' + m[1] + ' may cancel the successful attack (' + m[2] + ')'; }],
    [/^Read My Lips: (.+?) deja pasar el ataque$/, function (m) { return 'Read My Lips: ' + m[1] + ' lets the attack pass'; }],
    [/^Cover-Up: ventana abierta para (.+?) \((.+)\)$/, function (m) { return 'Cover-Up: window open for ' + m[1] + ' (' + m[2] + ')'; }],
    [/^(.+?) juega Botched Contact: El takeover queda devuelto a la mano de (.+?) \(accion de (.+?)\)$/, function (m) { return m[1] + ' plays Botched Contact: The takeover is returned to ' + m[2] + "'s hand (action of " + m[3] + ')'; }],
    [/^BOTCHED CONTACT: (.+?) vuelve a la mano de (.+?) \(puede elegir otra carta\)$/, function (m) { return 'BOTCHED CONTACT: ' + m[1] + ' returns to ' + m[2] + "'s hand (another card may be chosen)"; }],
    [/^(.+?) juega Sabotage: El takeover queda devuelto a la mano de (.+?) y no podra repetir el takeover este turno \(accion de (.+?)\)$/, function (m) { return m[1] + ' plays Sabotage: The takeover is returned to ' + m[2] + "'s hand and cannot repeat the takeover this turn (action of " + m[3] + ')'; }],
    [/^SABOTAGE: (.+?) vuelve a la mano de (.+?) y no podra hacer otro takeover automatico este turno$/, function (m) { return 'SABOTAGE: ' + m[1] + ' returns to ' + m[2] + "'s hand and cannot make another automatic takeover this turn"; }],
    [/^Stealing the Plans: (.+?) \(accion de (.+?)\) se queda con (.+?), que (.+?) acaba de descartar$/, function (m) { return 'Stealing the Plans: ' + m[1] + ' (action of ' + m[2] + ') keeps ' + m[3] + ', which ' + m[4] + ' just discarded'; }],
    [/^STOLING THE PLANS: (.+?) pasa del descarte a la mano de (.+)$/, function (m) { return 'STEALING THE PLANS: ' + m[1] + ' moves from the discard pile to ' + m[2] + "'s hand"; }],
    [/^Embezzlement: (.+?) reclama (.+?) \(de (.+?)\) y paga con (.+)$/, function (m) { return 'Embezzlement: ' + m[1] + ' claims ' + m[2] + ' (from ' + m[3] + ') and pays with ' + m[4]; }],
    [/^EMBEZZLEMENT: (.+?) deja de ser de (.+?) y pasa a (.+)$/, function (m) { return 'EMBEZZLEMENT: ' + m[1] + ' is no longer ' + m[2] + "'s and goes to " + m[3]; }],
    [/^(.+?) se descarta como pago de EMBEZZLEMENT$/, function (m) { return m[1] + ' is discarded as payment for EMBEZZLEMENT'; }],
    [/^EMBEZZLEMENT: ya no hay Plot que descartar; la carta robada se devuelve$/, function () { return 'EMBEZZLEMENT: no Plot left to discard; the stolen card is returned'; }],
    [/^El objetivo en el \u00C1REA NEUTRAL ya no est\u00E1 disponible \u2014 ataque cancelado$/, function () { return 'The target in the NEUTRAL AREA is no longer available \u2014 attack cancelled'; }],
    [/^(.+?) capturado desde el \u00C1REA NEUTRAL por (.+)$/, function (m) { return m[1] + ' captured from the NEUTRAL AREA by ' + m[2]; }],
    [/^Destru\u00EDdo en \u00E1rea neutral: (.+)$/, function (m) { return 'Destroyed in the neutral area: ' + m[1]; }],
    [/^(fallo|\u00E9xito) \u2014 (.+?) permanece neutral$/, function (m) { return (m[1] === 'fallo' ? 'MISS' : 'SUCCESS') + ' \u2014 ' + m[2] + ' remains neutral'; }],
    [/^(.+?) fall\u00F3 el control desde la mano \u2192 va al \u00C1REA NEUTRAL$/, function (m) { return m[1] + ' failed the control attempt from the hand \u2192 goes to the NEUTRAL AREA'; }],
    [/^(.+?) robada por (.+?) al destruir (.+)$/, function (m) { return m[1] + ' stolen by ' + m[2] + ' when destroying ' + m[3]; }],
    [/^(.+?): \+(\d+) al intento contra un grupo (.+)$/, function (m) { return m[1] + ': +' + m[2] + ' to the attempt against a ' + m[3] + ' group'; }],
    [/^(.+?): \+(\d+) para el grupo (.+?) que la controla directamente$/, function (m) { return m[1] + ': +' + m[2] + ' for the ' + m[3] + ' group that controls it directly'; }],
    [/^(.+?): \+(\d+) al control de la Personality \(reemplazo con clon\)$/, function (m) { return m[1] + ': +' + m[2] + ' to control of the Personality (clone replacement)'; }],
    [/^(.+?): \+(\d+) al control de una Nation \(intimidacion\)$/, function (m) { return m[1] + ': +' + m[2] + ' to control of a Nation (intimidation)'; }],
    [/^(.+?): \+(\d+) permanente de la Personality rica$/, function (m) { return m[1] + ': +' + m[2] + ' permanent for the rich Personality'; }],
    [/^(.+?) recibe una ficha de accion extra por controlar (.+)$/, function (m) { return m[1] + ' receives an extra action token for controlling ' + m[2]; }],
    [/^(.+?) roba (\d+) Plot cards al inicio del turno \((.+)\)$/, function (m) { return m[1] + ' draws ' + m[2] + ' Plot cards at the start of the turn (' + m[3] + ')'; }],
    [/^(.+?) ten\u00EDa (\d+) Goal cards de m\u00E1s al final de su turno$/, function (m) { return m[1] + ' had ' + m[2] + ' extra Goal cards at the end of their turn'; }],
    [/^(.+?) elige (.+)$/, function (m) { return m[1] + ' picks ' + m[2]; }],
    [/^BLOQUEO (.+?): (.+?) no puede destruir (.+?) \(s\u00F3lo grupos (.+?) y Illuminati rivales\)$/, function (m) { return 'BLOCKED by ' + m[1] + ': ' + m[2] + ' cannot destroy ' + m[3] + ' (only ' + m[4] + ' groups and rival Illuminati)'; }],
    [/^(.+?) ha crasheado \(11\/12 en la accion extra\): se descarta y se exponen los Plots ocultos de (.+)$/, function (m) { return m[1] + ' has crashed (11/12 on the extra action): discarded and ' + m[2] + "'s hidden Plots are exposed"; }],
    [/^Ataque instant\u00E1neo de (.+)$/, function (m) { return 'Instant attack of ' + m[1]; }],
    [/^Illuminati de (.+) destruido \(ya no tiene t\u00EDteres\)$/, function (m) { return 'Illuminati of ' + m[1] + ' destroyed (no puppets left)'; }],
    [/^(.+?): \+(\d+) por el control directo de un grupo (.+)$/, function (m) { return m[1] + ': +' + m[2] + ' for directly controlling a ' + m[3] + ' group'; }],
    /* L69 - FAMILIA RELIEF (Red Cross, CDC, Boy Sprouts). Los cuatro mensajes
       nuevos del motor; sin regla, el gate de i18n (test_i18n_logrules.js) los
       detecta como pass-through en cuanto la IA usa una de estas cartas. */
    [/^Relief a (.+) con (.+?) — (\d+) de Poder( \(la accion de la carta cubre el coste\))?$/,
      function (m) { return 'Relief to ' + m[1] + ' using ' + m[2] + ' — ' + m[3] + ' Power' + (m[4] ? ' (the card\'s action covers the cost)' : ''); }],
    [/^Boy Sprouts: robas una Plot por ayudar a traer Relief a (.+)$/, function (m) { return 'Boy Sprouts: you draw a Plot card for helping bring Relief to ' + m[1]; }],
    [/^(.+?): (.+?), su controlador directo, recibe Relief al acabar el turno$/, function (m) { return m[1] + ': ' + m[2] + ', its direct controller, gets Relief at the end of the turn'; }],
    [/^(.+?): la guerra biologica falla y (.+?) \(dueno del Place\) la destruye$/, function (m) { return m[1] + ': biological warfare fails and ' + m[2] + ' (owner of the Place) destroys it'; }],
    [/^Sin robo de Plot: el Relief no puede robar este turno$/, function () { return 'No Plot draw: Relief cannot draw this turn'; }],
    [/^No quedan Plot cards que robar por el Relief$/, function () { return 'No Plot cards left to draw for Relief'; }]
  ];
  function tr(text) {
    if (!text) return text;
    if (lang === 'en') {
      if (REV[text]) return REV[text];
      for (var ri = 0; ri < LOG_RULES.length; ri++) {
        var rm = LOG_RULES[ri][0].exec(text);
        if (rm) return LOG_RULES[ri][1](rm);
      }
      var m = /^\u26a1 Poder (\d+)$/.exec(text);
      if (m) return '\u26a1 Power ' + m[1];
      return text;
    }
    for (var es in D) if (D[es].en === text) return es;
    var m2 = /^\u26a1 Power (\d+)$/.exec(text);
    if (m2) return '\u26a1 Poder ' + m2[1];
    return text;
  }
  function sweep(root) {
    root = root || document;
    var els = root.querySelectorAll('button,.lbl,h2,h3,h4,.hpill,.aiwait,.vname,.vsub,li,.tabbtn,.setup-tip,.startBig,.pm,.dmuted,.setup-sub,.drow i,.go-stamp,.gotable th,.gotable td');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], t = el.childNodes && el.textContent ? el.textContent.trim() : '';
      if (!t || t.length > 220) continue;
      var n = tr(t);
      if (n !== t) el.textContent = n;
    }
  }
  function setLang(l) {
    if (l !== 'en' && l !== 'es') return;
    lang = l;
    try { localStorage.setItem('inwo_lang', l); } catch (e) {}
    if (document.documentElement) document.documentElement.lang = l;
    var button = document.getElementById('langBtn');
    if (button) button.textContent = l === 'en' ? '🌐 EN' : '🌐 ES';
    sweep(document);
  }
  function toggleBtn() {
    var row = document.getElementById('hdrBtns');
    if (!row || document.getElementById('langBtn')) return;
    var b = document.createElement('button');
    b.id = 'langBtn';
    b.title = 'Language / Idioma';
    b.textContent = lang === 'en' ? '🌐 EN' : '🌐 ES';
    b.onclick = function () {
      setLang(lang === 'en' ? 'es' : 'en');
      b.textContent = lang === 'en' ? '🌐 EN' : '🌐 ES';
    };
    row.insertBefore(b, row.firstChild);
  }
  function boot() {
    build();
    if (document.documentElement) document.documentElement.lang = lang;
    toggleBtn();
    sweep(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.I18N = { get lang() { return lang; }, setLang: setLang, sweep: sweep, tr: tr };
})();
