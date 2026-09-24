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
    [/^Partida iniciada: modo (.+)$/, function (m) { return 'Game started: ' + m[1] + ' mode'; }]
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
