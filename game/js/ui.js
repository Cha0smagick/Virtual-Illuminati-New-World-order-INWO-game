/* INWO UI — Sisyphus self-build. Contrato: init/render/log/prompt/showCurtain/showSetupScreen/showGameOver */
(function () {
'use strict';
var C = window.INWO_CARDS;
var CB = null;            /* callbacks de App */
var sel = { mode: null, data: {} };
var curState = null;

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function cardOf(ix) {
  if (typeof ix === 'number') return C.cards[ix];
  return (C.byId && C.byId[ix]) || C.cards.filter(function (c) { return c.id === ix; })[0];
}
function imgTag(c, cls) { return '<img class="' + cls + '" src="../' + c.img + '" alt="' + esc(c.name) + '" data-cix="' + (typeof c.idx === 'number' ? c.idx : esc(c.id)) + '">'; }
var TAGLINES = {
  adepts: 'Conserva intentos fallidos sobre cartas en tu mano',
  bavarian: '1 vez/turno: ataque Privilegiado (nadie interfiere)',
  bermuda: 'Reorganiza tu estructura al final de cada turno',
  discordian: 'Inmune a Straight/Government · Weird ×2 meta',
  gnomes: '+4 contra Bank · Corporate ×2 meta',
  cthulhu: '+4 al destruir · META: destruir 8 grupos',
  shangrila: '+5 defensa vs Instant · META: 30 Power Peaceful',
  network: 'Roba 2 Plots/turno · Computer ×2 meta',
  ufos: '2 acciones Illuminati · META: controlar 3 secretos'
};
/* Documentación completa por Illuminati (claves cortas, matcheadas por substring) */
var ILLUDOC = {
  adepts:   { rol:'Los magos que guardan secretos', poder:'Cuando fallas controlar una carta de tu MANO, no la pierdes: se queda contigo.', meta:'Meta básica: controlar 12 grupos.', pro:'Perdona tus fallos — ideal para aprender y para estrategias de mano.', con:'Sin bonos de combate propios; todo depende de tus dados y robos.' },
  bavarian: { rol:'La sociedad madre, la más poderosa', poder:'1 vez por turno declara un ataque PRIVILEGIADO: nadie más puede ayudar ni oponerse.', meta:'Meta básica: controlar 12 grupos.', pro:'El Power más alto (10). Ataques imposibles de detener 1/turno.', con:'No roba cartas extra; sin bonos contra alineamientos.' },
  bermuda:  { rol:'Los navegantes del caos', poder:'Al final de CADA turno puedes reorganizar libremente tu estructura de poder.', meta:'Meta básica: controlar 12 grupos.', pro:'Defensa posicional perfecta: siempre puedes poner +10 donde duele.', con:'Microgestión constante; sin bonos ofensivos.' },
  discordian:{ rol:'Los adoradores de Eris, diosa del caos', poder:'Tu estructura es INMUNE a grupos Straight y Government. Los Weird cuentan ×2 para metas.', meta:'Meta básica: controlar 12 grupos (Weird ×2).', pro:'Mitad del mazo es Government/Straight: defensa pasiva enorme.', con:'Casi inútil contra rivales Weird/Violent/Liberal.' },
  gnomes:   { rol:'Los banqueros suizos de todas las conspiraciones', poder:'+4 al controlar grupos Bank. Los Corporate cuentan ×2 para metas.', meta:'Meta básica: controlar 12 grupos (Corporate ×2).', pro:'Los bancos caen solos (+4) y los corporativos aceleran la meta.', con:'Dependes de robar Banks/Corporate; sin defensa especial.' },
  cthulhu:  { rol:'Los cultistas del caos primordial', poder:'+4 en TODOS tus ataques para DESTRUIR (no instantáneos).', meta:'META PROPIA: DESTRUIR 8 grupos (¡incluidos los de otros!).', pro:'El mejor destructor del juego; presión constante.', con:'Juego agresivo: todos te temerán y te atacarán antes.' },
  shangrila:{ rol:'Los monjes de la paz absoluta', poder:'+5 defensa contra ataques Instantáneos. NO puedes destruir grupos no-Violent.', meta:'META PROPIA: sumar 30 puntos de Power entre grupos Peaceful.', pro:'Imbatible defendiéndose; el rival no puede provocarte fácil.', con:'Manos atadas para destruir; meta lenta si no salen Peaceful.' },
  network:  { rol:'La red de información global', poder:'Robas 2 Plots por turno en vez de 1. Los Computer cuentan ×2 para metas.', meta:'Meta básica: controlar 12 grupos (Computer ×2).', pro:'Doble de Plots «+10» y opciones: el jugador más informado.', con:'Stats 8/8 mediocres; el límite de 5 Plots fuera de turno aprieta.' },
  ufos:     { rol:'Los infiltrados del espacio exterior', poder:'Recibes 2 acciones Illuminati (★★) por turno en lugar de 1.', meta:'META PROPIA: controlar 3 grupos SECRETOS que eliges en secreto al empezar.', pro:'Doble acción CADA turno: el ritmo más alto del juego.', con:'Tu meta depende de que esos 3 secretos salgan… y sobrevivan.' }
};
function docFor(bid) {
  for (var k in ILLUDOC) if (('' + bid).indexOf(k) >= 0) {
    var d = {}, f;
    for (f in ILLUDOC[k]) d[f] = ILLUDOC[k][f];
    d.tl = TAGLINES[k] || '';
    return d;
  }
  return { rol:'', poder:'', meta:'Meta básica: controlar 12 grupos.', pro:'', con:'', tl:'' };
}
function baseName(s) { return String(s || '').replace(/\d+$/, ''); }
/* ===== ENCICLOPEDIA INWO — glosario con tooltip al pasar el ratón ===== */
var GLOSS = {
  peaceful:'PEACEFUL (Pacífico): grupos que evitan la violencia. Clave en la meta de Shangri-La.',
  violent:'VIOLENT (Violento): militares, terroristas, agresivos. Blanco favorito de Cthulhu.',
  government:'GOVERNMENT (Gobierno): estados y agencias. La Discordian Society es inmune a ellos.',
  liberal:'LIBERAL: progresistas y alternativos. Opuesto directo de Conservative.',
  conservative:'CONSERVATIVE (Conservador): tradicionalistas y derecha. Opuesto de Liberal.',
  weird:'WEIRD (Extraño): ocultistas, ufólogos, caos. Discordian los cuenta ×2 para su meta.',
  straight:'STRAIGHT (Sobrio): convencional, cuadriculado. Discordian es inmune a ellos.',
  fanatic:'FANATIC (Fanático): creyentes ciegos. No reciben bono defensivo entre fanáticos.',
  criminal:'CRIMINAL (Criminal): mafias y corruptos.',
  corporate:'CORPORATE (Corporativo): empresas. Gnomes of Zurich los cuentan ×2.',
  media:'MEDIA (Medios): prensa, TV, cine.',
  huge:'HUGE (Enorme): organizaciones gigantes.',
  computer:'COMPUTER (Informático): redes y tecnología. Network los cuenta ×2.',
  magic:'MAGIC (Mágico): ocultismo ritual real.',
  science:'SCIENCE (Ciencia): laboratorios e investigación.',
  bank:'BANK (Banco): finanzas. Gnomes of Zurich recibe +4 para controlarlos.',
  plot:'PLOT (Trama): carta de un solo uso. Los «+10» refuerzan ataques; Metas/NWO se colocan en mesa.',
  resource:'RESOURCE (Recurso): púrpura pasiva junto a tu estructura; da habilidades permanentes.',
  group:'GROUP (Grupo): unidad básica controlable en tu estructura.',
  illuminati:'ILLUMINATI: tu sociedad secreta. 4 flechas, jamás puede ser atacada, pero SÍ ataca.',
  personality:'PERSONALITY (Personalidad): un individuo concreto. Único objetivo válido de Asesinatos.',
  place:'PLACE (Lugar): una localización. Único objetivo válido de Desastres.',
  token:'ACTION TOKEN (●): ficha de acción por grupo/turno para atacar, mover o defender. Illuminati recibe 1★ (UFOs 2).',
  arrows:'FLECHAS DE CONTROL: entrante = quién te controla; salientes = cuántos títeres controlas (Illuminati 4, resto 3).',
  neutral:'ÁREA NEUTRAL: si fallas controlar una carta de la mano rival, va aquí; cualquiera puede intentar controlarla.',
  takeover:'TAKEOVER AUTOMÁTICO: 1/turno colocas GRATIS un grupo/recurso de tu mano, sin dados.',
  privileged:'PRIVILEGIADO: solo atacante y defensor actúan; nadie ayuda ni se opone. Bavarian lo usa 1/turno.',
  instant:'INSTANTÁNEO: ataque por Plot (Asesinato/Desastre) en cualquier momento.',
  nwo:'NWO: Plot global que cambia reglas para todos. Uno por color en mesa; el nuevo reemplaza al viejo.',
  goal:'META: cómo ganas además de las 12 grupos. Impresa en tu Illuminati o en cartas Meta.',
  dice:'TIRADA 2d6: éxito si ≤ fuerza. Un 11 o 12 SIEMPRE falla. Fuerza <2 = fallo automático.'
};
function gspan(t){ var d=GLOSS[t]; return d?'<span class="gterm" data-tip="'+esc(d)+'">'+esc(t)+'</span>':esc(t); }
/* Icono del takeover según la sociedad del jugador actual */
var TAKEICON = { adepts:'🔮', bavarian:'👁', bermuda:'🔺', discordian:'🍎', gnomes:'💰', cthulhu:'🐙', shangrila:'🧘', network:'🌐', ufos:'🛸' };
function takeIco(pid) {
  if (!curState || !curState.players[pid]) return '🎁';
  var b = baseName(curState.players[pid].illumId);
  for (var k in TAKEICON) if (b.indexOf(k) >= 0) return TAKEICON[k];
  return '🎁';
}
/* Orden de la mano */
var handSort = 'table'; /* table | type | power */
function maxKids(depthFromRoot) { return depthFromRoot === 1 ? 4 : 3; }
function nodeDepth(structure, uid) {
  var d = 0, found = false;
  (function walk(nd, depth) { if (nd.cardId != null && nd.uid === uid) { d = depth; found = true; } if (!found) (nd.children || []).forEach(function (ch) { walk(ch, depth + 1); }); })(structure, 0);
  return d;
}

var LOGARR = [];
var engSeen = 0;
function classFor(msg) {
  var cls = 'logline';
  if (/[??]Error|error|no puedes|No puedes/i.test(msg)) cls += ' ll-warn';
  else if (/atac|destrui|Destru|DESTRUIR|CONTROLAR/i.test(msg)) cls += ' ll-atk';
  else if (/VICTORIA|victoria|cumplida/i.test(msg)) cls += ' ll-good';
  else if (/turno|Turno|mazo|roba|Roba|descart/i.test(msg)) cls += ' ll-sys';
  return cls;
}
function normLog(m) { if (m && typeof m === 'object') return String(m.msg || m.text || ''); return String(m); }
function paintLog() {
  var box = document.getElementById('logLines'); if (!box) return;
  box.innerHTML = LOGARR.slice(-120).map(normLog).filter(Boolean).map(function (s) {
    return '<div class="' + classFor(s) + '">' + esc(s) + '</div>';
  }).join("");
  box.scrollTop = box.scrollHeight;
}
function log(msg) { LOGARR.push(msg); paintLog(); }

function prompt(text, options) {
  return new Promise(function (resolve) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    var b = document.createElement('div');
    b.className = 'box';
    b.innerHTML = '<h3>' + text + '</h3>'; /* texto propio de la UI, permite negritas */
    (options || [{ label: 'OK', value: true }]).forEach(function (o) {
      var btn = document.createElement('button');
      btn.textContent = o.label;
      btn.onclick = function () { ov.remove(); resolve(o.value); };
      b.appendChild(btn);
    });
    ov.appendChild(b);
    $('overlays').appendChild(ov);
  });
}

function showCurtain(text, cb) {
  var ov = document.createElement('div');
  ov.className = 'overlay curtain';
  var b = document.createElement('div');
  b.className = 'box';
  b.innerHTML = '<h2>' + esc(text) + '</h2>';
  var btn = document.createElement('button');
  btn.textContent = 'Continuar';
  btn.onclick = function () { ov.remove(); if (cb) cb(); };
  b.appendChild(btn);
  ov.appendChild(b);
  $('overlays').appendChild(ov);
}

function showGameOver(msg, state) {
  var ov = document.createElement('div');
  ov.className = 'overlay';
  var b = document.createElement('div');
  b.className = 'box wide gameover';
  var st = state || {};
  var w = st.winner || {};
  var pids = w.pids || [];
  var html = '<div class="go-stamp">OPERACI\u00D3N COMPLETADA</div><h2>FIN DEL JUEGO</h2>';
  pids.forEach(function (p) {
    var pl = (st.players || [])[p] || {};
    var ic = null;
    if (pl.illumId != null) ic = C.byId[pl.illumId] || C.cards.filter(function (c) { return c.id === pl.illumId; })[0];
    var vs = (st.victoryStatus || []).filter(function (v) { return v.pid === p; })[0] || {};
    var pr = Object.keys(vs.progress || {}).map(function (k) { return k + ': ' + vs.progress[k]; }).join(' \u00B7 ');
    html += '<div class="go-winner">' +
      (ic ? '<img class="dbig" src="../' + ic.img + '" alt="">' : '') +
      '<div class="dtxt"><h3>\u{1F451} ' + esc(pl.name || w.name || '?') + '</h3>' +
      '<div class="drow win"><i>META CUMPLIDA</i>' + esc(w.how || vs.goal || '') + '</div>' +
      (ic ? '<div class="drow"><i>SOCIEDAD</i>' + esc(ic.name) + '</div>' : '') +
      (pr ? '<div class="drow"><i>PROGRESO</i>' + esc(pr) + '</div>' : '') +
      '<div class="drow"><i>IMPERIO</i>' + (pl.controlledCount != null ? pl.controlledCount : '?') + ' grupos controlados</div>' +
      (vs.goal ? '<div class="drow"><i>OBJETIVO</i>' + esc(vs.goal) + '</div>' : '') +
      '</div></div>';
  });
  if (!pids.length) html += '<p class="big">' + esc(msg || '') + '</p>';
  var rows = (st.players || []).map(function (pl) {
    var vs2 = (st.victoryStatus || []).filter(function (v) { return v.pid === pl.idx; })[0] || {};
    return '<tr><td>' + esc(pl.name) + '</td><td>' + (pl.human ? 'Humano' : 'IA') + '</td><td>' +
      (pl.controlledCount != null ? pl.controlledCount : '?') + '</td><td>' + esc((vs2.progress || {}).groups || '\u2014') + '</td></tr>';
  }).join("");
  html += '<table class="gotable"><thead><tr><th>JUGADOR</th><th>TIPO</th><th>GRUPOS</th><th>META</th></tr></thead><tbody>' + rows + '</tbody></table>';
  b.innerHTML = html;
  var btn = document.createElement('button');
  btn.className = 'primary startBig';
  btn.textContent = 'Nueva partida';
  btn.onclick = function () { location.reload(); };
  b.appendChild(btn);
  ov.appendChild(b);
  $('overlays').appendChild(ov);
}

function uniqueIlluminati() {
  var seen = {}, out = [];
  C.cards.forEach(function (c) {
    if (c.type !== 'illuminati') return;
    var b = baseName(c.id);
    if (!seen[b]) { seen[b] = true; out.push({ id: c.id, name: c.name }); }
  });
  return out;
}

function showSetupScreen(cfg) {
  var illu = uniqueIlluminati();
  var picks = [null, null];
  var kinds = ['human', 'ai'];   // tipo de cada jugador: 'human' | 'ai'
  var ov = document.createElement('div');
  ov.className = 'overlay setup';
  ov.id = 'setupOv';

  function draw() {
    var mode = (kinds[0] === 'ai' && kinds[1] === 'ai') ? 'ai-vs-ai' : (kinds[0] === 'human' && kinds[1] === 'human') ? 'hot-seat' : 'vs-ai';
    var ready = !!(picks[0] && picks[1]);
    var html =
      '<div class="setup-hero">' +
      '<div class="stamp">TOP SECRET<br>EYES ONLY</div>' +
      '<div class="eye">👁</div>' +
      '<button id="langSetup" class="langpill" title="Language / Idioma">🌐 ' + (window.I18N && window.I18N.lang === 'es' ? 'ES' : 'EN') + '</button>' +
      '<h2><span class="t1">ILLUMINATI</span><span class="t2">New World Order</span></h2>' +
      '<p class="setup-sub">Elige vuestras sociedades secretas · One Big Deck · Gana controlando <b>12 grupos</b></p>' +
      '</div>' +
      '<div id="modeRow" class="seg">' +
      '<button id="mVs" class="' + (mode === 'vs-ai' ? 'on' : '') + '">🤖 Humano vs IA</button>' +
      '<button id="mHot" class="' + (mode === 'hot-seat' ? 'on' : '') + '">👥 Hot-seat (2 humanos)</button>' +
      '<button id="mAii" class="' + (mode === 'ai-vs-ai' ? 'on' : '') + '">🤖🤖 IA vs IA</button></div>' +
      '<div class="setup-cols">' +
      '<section class="setup-col"><h3><button id="kind0" class="kindbtn' + (kinds[0] === 'ai' ? ' ai' : '') + '" title="Click: switch HUMAN / AI">' + (kinds[0] === 'ai' ? '🤖 IA' : '👤 JUGADOR') + ' 1 <i>▼</i></button><em>' + (picks[0] ? ' ✓ ' + esc(nameOf(picks[0])) : '') + '</em></h3><div class="pickGrid" id="grid0"></div></section>' +
      '<section class="setup-col"><h3><button id="kind1" class="kindbtn' + (kinds[1] === 'ai' ? ' ai' : '') + '" title="Click: alternar entre HUMANO y IA">' + (kinds[1] === 'ai' ? '🤖 IA' : '👤 JUGADOR') + ' 2 <i>▼</i></button><em>' + (picks[1] ? ' ✓ ' + esc(nameOf(picks[1])) : '') + '</em></h3><div class="pickGrid" id="grid1"></div></section>' +
      '</div>' +
      '<div id="illuDetail"></div>' +
      '<p class="muted setup-tip">💡 Pasa el ratón por una carta para leer su poder especial. Cada sociedad tiene un poder y una meta de victoria distinta.</p>' +
      '<button id="startBtn" class="primary startBig' + (ready ? ' pulse' : '') + '"' + (ready ? '' : ' disabled') + '>' +
      (ready ? '⚔ COMENZAR PARTIDA ▶' : 'Elige un Illuminati para cada jugador…') + '</button>';
    ov.innerHTML = html;
    fillGrid('grid0', 0);
    fillGrid('grid1', 1);
    showDetail(lastBid);
    $('mVs').onclick = function () { kinds = ['human', 'ai']; picks[1] = null; draw(); };
    $('mHot').onclick = function () { kinds = ['human', 'human']; picks[1] = null; draw(); };
    $('mAii').onclick = function () { kinds = ['ai', 'ai']; picks[1] = null; draw(); };
    $('kind0').onclick = function () { kinds[0] = (kinds[0] === 'ai' ? 'human' : 'ai'); draw(); };
    $('kind1').onclick = function () { kinds[1] = (kinds[1] === 'ai' ? 'human' : 'ai'); draw(); };
    $('startBtn').onclick = function () {
      if (!picks[0]) return alert('Jugador 1 debe elegir Illuminati');
      if (!picks[1]) return alert(mode === 'vs-ai' ? 'Elige el Illuminati de la IA' : (mode === 'ai-vs-ai' ? 'Elige el Illuminati de cada IA' : 'Jugador 2 debe elegir Illuminati'));
      ov.remove();
      cfg.onStart(mode, picks.slice());
    };
    var lb = $('langSetup');
    if (lb) lb.onclick = function () {
      if (window.I18N && window.I18N.setLang) window.I18N.setLang(window.I18N.lang === 'en' ? 'es' : 'en');
      draw();
    };
    if (window.I18N) window.I18N.sweep(ov);
  }
  function nameOf(bid) { var c = illu.filter(function (x) { return baseName(x.id) === bid; })[0]; return c ? c.name : bid; }
  var lastBid = null;
  function showDetail(bid) {
    if (bid) lastBid = bid;
    var box = $('illuDetail'); if (!box) return;
    var use = bid || lastBid;
    if (!use) { box.innerHTML = '<span class="dmuted">🖱 Pasa el ratón sobre una carta para ver su PODER especial, su META de victoria, ventajas y desventajas.</span>'; return; }
    var d = docFor(use);
    var it2 = illu.filter(function (x) { return baseName(x.id) === use; })[0];
    var cc = it2 ? (C.byId[it2.id] || C.cards.filter(function (x) { return x.id === it2.id; })[0]) : null;
    box.innerHTML =
      (cc ? '<img class="dbig" src="../' + cc.img + '" alt="">' : '') +
      '<div class="dtxt"><h4>' + esc(it2 ? it2.name : '') + '</h4>' +
      '<div class="drow"><i>ROL</i>' + esc(d.rol) + '</div>' +
      '<div class="drow"><i>PODER</i>' + esc(d.poder) + '</div>' +
      '<div class="drow win"><i>🎯 META</i>' + esc(d.meta) + '</div>' +
      '<div class="drow good"><i>✔ VENTAJA</i>' + esc(d.pro) + '</div>' +
      '<div class="drow bad"><i>✖ DESVENTAJA</i>' + esc(d.con) + '</div></div>';
  }
  function fillGrid(gid, slot) {
    var g = $(gid);
    illu.forEach(function (it) {
      var b = baseName(it.id);
      var chip = document.createElement('div');
      chip.className = 'pickCard' + (picks[slot] === b ? ' picked' : '');
      var cc = C.byId[it.id] || C.cards.filter(function (x) { return x.id === it.id; })[0];
      chip.innerHTML = imgTag(cc, 'thumb') + '<span>' + esc(it.name) + '</span>' +
        '<span class="pst">⚡ Poder ' + (cc && cc.power != null ? cc.power : '?') + '</span>' +
        '<span class="tl">' + esc(docFor(b).tl || '') + '</span>';
      chip.onclick = function () {
        var other = slot === 0 ? 1 : 0;
        if (picks[other] === b) return alert('Ese Illuminati ya está elegido');
        picks[slot] = b; draw();
      };
      chip.onmouseenter = function () { showDetail(b); };
      chip.onmouseleave = function () { showDetail(null); };
      g.appendChild(chip);
    });
  }
  $('overlays').appendChild(ov);
  draw();
}

/* ---------- RENDER ---------- */
function render(state) {
  curState = state;
  var st = state;
  var cur = st.players[st.currentPid];
  $('hdrInfo').innerHTML =
    '<span class="hpill">Turno <b>' + st.turn + '</b></span>' +
    '<span class="hpill p">' + esc(String(st.phase).toUpperCase()) + '</span>' +
    '<span class="hpill w">▶ ' + esc(cur ? cur.name : '?') + '</span>' +
    (st.attack && !st.attack.resolved ? '<span class="atk">⚔ ATAQUE EN CURSO</span>' : '');

  $('hdrBtns').innerHTML = goalBars(st);

  var board = '';
  board += panelHtml(st, 0);
  board += '<div class="neutral"><h4>ÁREA NEUTRAL (' + st.neutralArea.length + ')</h4><div class="resRow">' +
    st.neutralArea.map(function (n) { return chipMini(cardOf(n.cardId), n.uid); }).join('') + '</div></div>';
  board += panelHtml(st, 1);
  $('board').innerHTML = board;

  handBar(st);
  attackPanel(st);
  hint();
  /* sincroniza TODOS los eventos del motor (espectador IA vs IA ve cada jugada) */
  var LG = st.log || [];
  if (LG.length < engSeen) { engSeen = 0; LOGARR.length = 0; }
  while (engSeen < LG.length) { LOGARR.push(LG[engSeen]); engSeen++; }
  paintLog();
}

function goalBars(st) {
  var items = (st.victoryStatus || []).map(function (v) {
    var g = (v.progress || {}).groups || '';
    var cur = 0, max = 12, m = String(g).match(/(\d+)\s*\/\s*(\d+)/);
    if (m) { cur = parseInt(m[1], 10); max = parseInt(m[2], 10) || 12; }
    var pct = Math.max(0, Math.min(100, Math.round(cur / max * 100)));
    var extra = Object.keys(v.progress || {}).filter(function (k) { return k !== 'groups'; })
      .map(function (k) { return k + ' ' + v.progress[k]; }).join(' · ');
    return '<div class="vg" title="' + esc(v.goal) + '">' +
      '<div class="vname">' + esc(v.name) + '</div>' +
      '<div class="vbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="vsub">' + esc(g) + (extra ? ' · ' + esc(extra) : '') + '</div></div>';
  }).join('');
  return '<div class="victoryWrap">' + items + '</div>';
}

function panelHtml(st, pid) {
  var p = st.players[pid];
  var ic = p.illumId != null ? C.byId[p.illumId] || C.cards.filter(function (c) { return c.id === p.illumId; })[0] : null;
  if (!ic) { var b = baseName(p.illumId); ic = C.cards.filter(function (c) { return c.type === 'illuminati' && c.id.indexOf(b) === 0; })[0]; }
  var isCur = st.currentPid === pid;
  var h = '<div class="panel' + (isCur ? ' cur' : '') + '" data-pid="' + pid + '">';
  h += '<div class="phead">' + (ic ? imgTag(ic, 'thumb') : '') +
    '<div><b>' + esc(p.name) + '</b> <span class="muted">' + (p.human ? '' : '(IA)') + '</span><br>' +
    '<small>' + esc(ic ? ic.name : '—') + '</small></div>' +
    '<span class="tok" title="Acciones Illuminati">★ ' + p.illumTokens + '</span>' +
    '<span class="cnt">' + p.controlledCount + ' grupos</span>' +
    '<span class="handbadge">mano: ' + p.handCounts.plots + 'P/' + p.handCounts.groups + 'G</span></div>';
  h += '<div class="tree">' + nodeHtml(p.structure, st, pid, 0) + '</div>';
  if (p.resources.length) {
    h += '<div class="resRow">' + p.resources.map(function (r) { return chipMini(cardOf(r.cardId), r.uid); }).join('') + '</div>';
  }
  if (p.exposedPlots.length) {
    h += '<div class="expRow">' + p.exposedPlots.map(function (ix) { return chipMini(cardOf(ix), null); }).join('') + '</div>';
  }
  h += '</div>';
  return h;
}

function nodeHtml(nd, st, pid, depth) {
  var isRoot = /-root$/.test('' + nd.uid);
  var kids = nd.children || [];
  var open = kids.length < (depth === 0 ? 4 : 3); /* Illuminati 4 flechas, resto 3 */
  var mode = sel.mode || '';
  var own = pid === curState.currentPid;
  var hostMode = (mode === 'takeoverHost' || mode === 'moveTo');
  /* nodo raíz sin carta (pre-setup): solo contenedor */
  if (isRoot && nd.cardId == null) {
    return '<div class="kids root">' + kids.map(function (ch) { return nodeHtml(ch, st, pid, depth + 1); }).join('') + '</div>';
  }
  var c = cardOf(nd.cardId);
  if (!c) return '<div class="kids"></div>';
  var cls = '', legalTxt = '';
  if (hostMode) { if (open) { cls += ' pick'; legalTxt = ' ⬇ SUELTA AQUÍ'; } else cls += ' dim'; }
  else if (mode === 'target') { cls += isRoot ? ' dim' : ' pickT'; }
  else if (mode === 'plotTarget') { if (open) cls += ' pick'; else cls += ' dim'; }
  else if (mode === 'aid' || mode === 'oppose') { if (own && nd.tokens > 0) { cls += ' pickS'; } else cls += ' dim'; }
  else if (mode === 'attacker' || mode === 'pickMover') { if (own && nd.tokens > 0 && !isRoot) { cls += ' pickA'; } else cls += ' dim'; }
  var badges = '';
  if (nd.paralyzed) badges += '<i class="b par">PAR</i>';
  if (nd.zapped) badges += '<i class="b zap">ZAP</i>';
  if (nd.devastated) badges += '<i class="b dev">DEV</i>';
  var tok = (nd.tokens != null && nd.tokens > 0) ? '<span class="tok g">●' + nd.tokens + '</span>' : '';
  var arrows = Math.max(0, (depth === 0 ? 4 : 3) - kids.length);
  var isAtt = mode === 'target' && sel.data.attackerUid === nd.uid;
  var h = '<div class="node' + cls + (isAtt ? ' selatt' : '') + '" data-uid="' + esc(nd.uid) + '">' +
    imgTag(c, 'thumb') + '<span class="nname">' + esc(c.name) + '</span>' +
    '<small>P' + (c.power == null ? '-' : c.power) + '/R' + (c.resistance == null ? '-' : c.resistance) + '</small>' + tok + badges;
  if (legalTxt) h += '<i class="dropTag">' + legalTxt + '</i>';
  h += '<i class="role">' + (isRoot ? 'ILLUMINATI · ' : '') + arrows + ' flecha' + (arrows === 1 ? '' : 's') + ' libre' + (arrows === 1 ? '' : 's') + '</i>';
  if (kids.length) {
    h += '<div class="kids' + (isRoot ? ' root' : '') + '">' + kids.map(function (ch) { return nodeHtml(ch, st, pid, depth + 1); }).join('') + '</div>';
  }
  if (hostMode && open) h += '<div class="slot" data-uid="' + esc(nd.uid) + '">＋ flecha libre — CLIC para colocar aquí</div>';
  h += '</div>';
  return h;
}

function chipMini(c, uid) {
  if (!c) return '';
  return '<span class="cardChip"' + (uid ? ' data-uid="' + esc(uid) + '"' : '') + ' title="' + esc(c.name) + '">' + imgTag(c, 'thumb sm') + '</span>';
}

function attackPanel(st) {
  var A = st.attack;
  if (!A || A.resolved) return;
  var me = st.players[st.currentPid];
  var attCard = null;
  function findC(uid) {
    for (var i = 0; i < st.players.length; i++) {
      var f = null;
      (function walk(n) { if (n.uid === uid) f = n; else (n.children || []).forEach(walk); })(st.players[i].structure);
      if (f) return cardOf(f.cardId);
    }
    return null;
  }
  var ac = findC(A.attackerUid);
  var tc = A.targetUid ? findC(A.targetUid) : (A.handTarget ? cardOf(A.handTarget.idx) : (A.neutralTarget ? neutralCard(st, A.neutralTarget) : null));
  var html = '<div id="atkBar">⚔ <b>' + esc(me ? me.name : '') + '</b>: ' + esc(ac ? ac.name : '?') + ' → <b>' +
    (A.type === 'control' ? 'CONTROLAR' : 'DESTRUIR') + '</b> ' + esc(tc ? tc.name : '?') +
    (A.privilege ? ' <i class="b par">PRIVILEGED</i>' : '');
  if (A.aids.length) html += ' | Ayudan: ' + A.aids.map(function (a) { return esc(a.name) + '+P' + a.power; }).join(', ');
  if (A.opposes.length) html += ' | Se oponen: ' + A.opposes.map(function (a) { return esc(a.name) + '−P' + a.power; }).join(', ');
  html += ' ';
  if (CB) {
    var hp = -1;
    for (var i = 0; i < st.players.length; i++) if (st.players[i].human) { hp = i; break; }
    if (hp >= 0) {
      if (A.targetPid === hp && !A.selfDefended) html += '<button data-act="selfdef" title="Tu grupo defensor gasta su token: su Power cuenta DOBLE para resistir el golpe">🛡 Defiende tu grupo (Power ×2)</button>';
      if (A.pid !== hp && !supportedBy(st, hp)) html += '<button data-act="aid" title="Uno de tus grupos suma su Power al atacante">🤝 Ayudar (+Power)</button>' +
        '<button data-act="oppose" title="Uno de tus grupos resta su Power al atacante">✋ Oponerse (−Power)</button>';
      html += '<button data-act="resolve" class="primary" title="Tira dos dados: si sale ≤ la fuerza del ataque, tiene éxito">🎲 RESOLVER ▶</button>';
    }
  }
  html += '</div>';
  $('actionBtns').insertAdjacentHTML('afterbegin', html);
}
function neutralCard(st, uid) {
  var n = st.neutralArea.filter(function (x) { return x.uid === uid; })[0];
  return n ? cardOf(n.cardId) : null;
}
function supportedBy(st, pid) {
  var A = st.attack;
  return A.aids.concat(A.opposes).some(function (s) {
    for (var i = 0; i < st.players.length; i++) {
      var hit = false;
      (function walk(n) { if (n.uid === s.uid) hit = true; else (n.children || []).forEach(walk); })(st.players[i].structure);
      if (hit) return i === pid;
    }
    return false;
  });
}

/* ---------- HAND + ACTIONS ---------- */
function handBar(st) {
  var cur = st.players[st.currentPid];
  var showHand = cur && cur.human && st.phase === 'main' && (!st.attack || st.attack.pid === st.currentPid);
  var html = '';
  if (!showHand) {
    html = '<span class="muted">' + (cur && !cur.human ? 'Turno de la IA…' : (st.attack ? 'Ataque en curso — resuélvelo' : 'Esperando…')) + '</span>';
    $('handCards').innerHTML = html;
    buildBtns(st, false);
    return;
  }
  var idxs = cur.hand.slice();
  if (handSort === 'type') idxs.sort(function (a, b) {
    var t = function (i) { var k = cardOf(i).type; return k === 'group' ? 0 : k === 'resource' ? 1 : 2; };
    return t(a) - t(b) || a - b;
  });
  else if (handSort === 'power') idxs.sort(function (a, b) {
    var p = function (i) { var c = cardOf(i); return ((c.power != null ? c.power : -1) * 100 + (c.resistance != null ? c.resistance : -1)); };
    return p(b) - p(a) || a - b;
  });
  $('handCards').innerHTML = idxs.map(function (ix) {
    var c = cardOf(ix);
    return '<div class="handCard' + (sel.data.handIdx === ix ? ' picked' : '') + '" data-idx="' + ix + '" title="' + esc(c.name) +
      '\nP:' + c.power + ' R:' + c.resistance + '\n' + esc((c.alignments || []).join(', ')) + '">' +
      imgTag(c, 'thumb') + '<small>' + esc(c.name) + '</small></div>';
  }).join('');
  buildBtns(st, true);
}

function buildBtns(st, myMain) {
  var b = [];
  if (myMain) {
    var me = st.players[st.currentPid];
    b.push('<span class="bgrp"><b class="lbl">1 · ROBAR</b>');
    b.push('<button data-act="drawplot" class="' + (me.drewPlot ? '' : 'pulse') + '"' +
      (me.drewPlot ? ' disabled title="Ya robaste tu Plot de este turno"' : ' title="PASO 1 - Roba tu carta de Plot"') + '>🎴 Robar PLOT</button>');
    b.push('<button data-act="drawgroup"' +
      (me.drewGroup ? ' disabled title="Ya robaste tu Grupo de este turno"' : ' title="PASO 2 - Roba tu carta de Grupo"') + '>🃏 Robar GRUPO</button>');
    b.push('</span><span class="bgrp"><b class="lbl">2 · COLOCAR GRATIS</b>');
    b.push('<button data-act="takeover" class="' + (me.autoUsed ? '' : 'pulse big') + '"' +
      (me.autoUsed ? ' disabled title="Ya usaste el takeover automatico de este turno"' : ' title="PASO CLAVE - coloca un grupo o recurso de tu mano en tu estructura, gratis y sin dados"') + '>' + takeIco(me.idx) + ' Takeover</button>');
    b.push('</span>');
    b.push('<span class="bgrp"><b class="lbl">3 · ACCIONES (gastan ●)</b>');
    b.push('<button data-act="attackctl" title="ROBAR un grupo enemigo para ti con todos sus titeres: atacante cian, objetivo rojo, luego RESOLVER">⚔ CONTROLAR</button>');
    b.push('<button data-act="attackdst" title="ELIMINAR un grupo enemigo para siempre: sus titeres vuelven a la mano del dueno">☠ DESTRUIR</button>');
    b.push('<button data-act="move" title="Mueve un grupo tuyo a otra flecha de tu estructura (cuesta su token)">🔀 Mover</button>');
    b.push('<button data-act="resource" title="Coloca una carta RECURSO junto a tu Illuminati (1 estrella, max 1 por turno)">📦 Recurso</button>');
    b.push('</span>');
    if (me.illumTokens > 0) {
      b.push('<span class="bgrp"><b class="lbl">4 · EXTRAS (★)</b>');
      b.push('<button data-act="exchange" title="Gasta 1 estrella Illuminati: roba 1 Plot extra">★→Plot</button>');
      b.push('<button data-act="extra" title="Gasta 1 estrella: roba 1 Grupo extra (1 por turno)">★→Grupo</button>');
      b.push('</span>');
    }
    var hs = [['table','🗂 Tablero'],['type','🔤 Tipo'],['power','⚡ Poder']];
    b.push('<span class="bgrp hsortbar"><b class="lbl">🗂 MANO</b>' +
      hs.map(function (o) { return '<button data-act="hsort" data-v="' + o[0] + '" class="' + (handSort === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') +
      '</span>');
    b.push('<button data-act="endturn" class="primary endturn' + ((me.drewPlot && me.autoUsed) ? ' pulse' : '') + '" title="PASO FINAL - termina tu turno y pasa al siguiente jugador">5 · Terminar turno ▶</button>');
  } else {
    b.push('<div class="aiwait">⏳ <b>TURNO DE LA IA...</b> esta tramando. Observa el registro</div>');
  }
  if (sel.mode) b.push('<button data-act="cancel" class="danger" title="Cancela la seleccion actual">✕ Cancelar</button>');
  $('actionBtns').innerHTML = b.join('');
}


/* ---------- INIT / EXPORT ---------- */
/* hint + máquina de selección + flujos (reconstrucción) */
function hint() {
  var st = curState; if (!st) return;
  var cur = st.players[st.currentPid];
  var selT = {
    takeoverHost: '🎯 Haz CLIC en un grupo con borde VERDE, en tu ILLUMINATI, o en el recuadro «＋ flecha libre» para colocar tu carta ahí.',
    attacker: '🎯 Haz CLIC en TU grupo atacante resaltado en CIAN (debe tener ● Action token).',
    pickMover: '🎯 Haz CLIC en el grupo tuyo que quieres MOVER (resaltado en cian, necesita ● token).',
    target: (sel.data && sel.data.type === 'destroy')
      ? '🎯 Haz CLIC en el grupo enemigo con borde ROJO que quieres DESTRUIR.'
      : '🎯 Haz CLIC en el grupo a CONTROLAR (borde rojo): rival, área neutral… o elige una carta de TU mano.',
    moveTo: '🎯 Haz CLIC en el nuevo anfitrión dentro de tu estructura.',
    plotTarget: '🎯 Haz CLIC en el grupo objetivo de este Plot.',
    handPick: '👆 Ahora haz CLIC en una carta de GRUPO o RECURSO de tu mano (abajo).',
    aid: '🎯 Haz CLIC en uno de tus grupos con ● para AYUDAR (+su Power al ataque).',
    oppose: '🎯 Haz CLIC en uno de tus grupos con ● para OPONERTE (−su Power al ataque).'
  };
  var msg;
  if (st.attack && !st.attack.resolved) {
    var A = st.attack, hpid = -1;
    for (var q = 0; q < st.players.length; q++) if (st.players[q].human) { hpid = q; break; }
    msg = (A.pid === hpid)
      ? '🎲 Tu ataque está montado y se ve en la barra amarilla. Cuando quieras, pulsa 🎲 RESOLVER para tirar los dados.'
      : '🎲 La IA lanzó un ataque' + (A.targetPid === hpid ? ' CONTRA UN GRUPO TUYO — puedes 🛡 defenderlo' : '') + '. Reacciona con los botones de la barra amarilla… o simplemente pulsa 🎲 RESOLVER.';
  } else if (cur && !cur.human) {
    msg = '⏳ La IA está jugando su turno…';
  } else if (sel.mode) {
    msg = selT[sel.mode] || '';
  } else if (cur && !cur.autoUsed) {
    msg = '🎁 PASO CLAVE del turno: pulsa el botón Takeover (parpadea) → elige carta → colócala en un anillo verde. Es GRATIS y sin dados.';
  } else {
    msg = 'Turno libre: ataca ⚔, juega Plots (clic en tu mano) o pasa turno. GANAS controlando 12 grupos (barras arriba).';
  }
  var legend = '';
  if (sel.mode && sel.mode !== 'handPick') {
    legend = '<div class="legend">' +
      '<span class="lg c">🔵 tu atacante</span><span class="lg r">🔴 objetivo ataque</span>' +
      '<span class="lg g">🟢 colocar/capturar</span><span class="lg a">🟡 ayudar/oponerse</span></div>';
  }
  var paso = '';
  if (sel.mode === 'attacker') paso = '<b class="pstep">PASO 1/3 · </b>';
  else if (sel.mode === 'target') paso = '<b class="pstep">PASO 2/3 · </b>';
  $('actionHint').innerHTML = '<i class="hicon">ℹ</i> ' + paso + esc(msg) +
    (sel.mode ? ' <b class="canc">— ✕ Cancelar</b>' : '') + legend;
}
function clearSel() { sel = { mode: null, data: {} }; }
function startAttackFlow(type) {
  sel = { mode: 'attacker', data: { mode: type, type: type, step: 1 } };
  log((type === 'control' ? '⚔ CONTROLAR' : '☠ DESTRUIR') + ' — PASO 1/3: haz clic en tu grupo ATACANTE (borde CYAN, debe tener ● token).');
  render(curState);
}
function startTakeoverFlow() {
  if (!curState) return;
  var me = curState.players[curState.currentPid];
  var groups = (me.hand || []).filter(function (ix) { return window.INWO_CARDS.cards[ix].type !== 'plot'; });
  if (!groups.length) { log('⚠ No tienes grupos ni recursos en la mano para colocar. Roba una con «🃏 Robar GRUPO».'); return; }
  sel = { mode: 'handPick', data: { for: 'takeover' } };
  log('🎁 PASO 1/2 — Elige un GRUPO o RECURSO de tu mano (colocación GRATIS, sin dados).');
  render(curState);
}
function startResourceFlow() {
  if (!curState) return;
  var me = curState.players[curState.currentPid];
  var rs = (me.hand || []).filter(function (ix) { return window.INWO_CARDS.cards[ix].type === 'resource'; });
  if (!rs.length) { log('⚠ No tienes RECURSOS en la mano. Los recursos llegan robando 🃏 GRUPO (cartas púrpura).'); return; }
  sel = { mode: 'handPick', data: { for: 'resource' } };
  log('📦 Elige un RECURSO de tu mano → se coloca junto a tu Illuminati (cuesta 1★, máx 1/turno).');
  render(curState);
}
function isOwnNode(uid) {
  var pid = curState.currentPid, hit = false;
  (function walk(n) { if (n.uid === uid) hit = true; else (n.children || []).forEach(walk); })(curState.players[pid].structure);
  return hit;
}
function route(uid) {
  var m = sel.mode, d = sel.data;
  try {
    if (m === 'takeoverHost') { clearSel(); CB.onAutoTakeover(d.handIdx, uid); }
    else if (m === 'pickMover') { sel = { mode: 'moveTo', data: { uid: uid } }; log('🔀 PASO 2/2 — clic en el grupo que será su NUEVO master (o tu Illuminati).'); render(curState); }
    else if (m === 'attacker') { sel = { mode: 'target', data: { type: d.type, attackerUid: uid, step: 2 } }; log('PASO 2/3 — ahora haz CLIC en el grupo OBJETIVO (borde ROJO). Luego pulsa 🎲 RESOLVER.'); render(curState); }
    else if (m === 'target') { clearSel(); CB.onDeclareAttack(d.type, d.attackerUid, { uid: uid }); }
    else if (m === 'moveTo') { clearSel(); CB.onMoveGroup(d.uid, uid); }
    else if (m === 'plotTarget') { clearSel(); CB.onPlayPlot(d.handIdx, uid); }
    else if (m === 'aid') { clearSel(); CB.onSupport({ uid: uid, oppose: false }); }
    else if (m === 'oppose') { clearSel(); CB.onSupport({ uid: uid, oppose: true }); }
    else render(curState);
  } catch (e) { log('⚠ ' + e.message); clearSel(); render(curState); }
}
function handClick(ix) {
  var c = cardOf(ix);
  var myMain = curState.phase === 'main' && curState.players[curState.currentPid].human;
  if (!myMain || !CB) return;
  if (curState.attack && !curState.attack.resolved && curState.attack.pid === curState.currentPid && c.type === 'plot') {
    CB.onBoost(ix, false); return;
  }
  if (sel.mode === 'handPick' && sel.data.for === 'resource') {
    clearSel();
    if (c.type !== 'resource') { log('⚠ Eso no es un RECURSO. Este botón es solo para cartas de recurso.'); return; }
    try { CB.onPlayResource(ix); } catch (e) { log('⚠ ' + e.message); }
    return;
  }
  if (sel.mode === 'handPick' && sel.data.for === 'takeover') {
    if (c.type === 'plot') { log('⚠ Ese es un PLOT. Elige una carta de GRUPO o RECURSO para el takeover.'); return; }
    clearSel();
    if (c.type === 'resource') {
      log('📦 ' + c.name + ' es un RECURSO: se coloca junto a tu Illuminati (no ocupa flechas).');
      try { CB.onAutoTakeover(ix, null); } catch (e) { log('⚠ ' + e.message); }
      return;
    }
    sel = { mode: 'takeoverHost', data: { handIdx: ix } }; render(curState); return;
  }
  if (sel.mode === 'target' && c.type !== 'plot') {
    var d = sel.data; clearSel(); CB.onDeclareAttack(d.type, d.attackerUid, { handIdx: ix }); return;
  }
  prompt('<b>' + esc(c.name) + '</b><small class="pm">' + esc(c.type === 'plot' ? 'PLOT' : c.type === 'resource' ? 'RECURSO' : 'GRUPO · P' + c.power + '/R' + c.resistance) + '</small>', [
    { label: c.type === 'resource' ? '📦 Colocar recurso junto a mi Illuminati (1★)' : '🎁 Colocar GRATIS en mi estructura (takeover)', value: 'place' },
    c.type === 'plot' ? { label: '✨ Jugar Plot ahora', value: 'plot' } : null,
    c.type === 'plot' ? { label: 'ℹ ¿Cuándo sirven los Plots?', value: 'info' } : null,
    c.type !== 'illuminati' ? { label: '🗑 Descartar', value: 'discard' } : null,
    { label: 'Cancelar', value: null }
  ].filter(Boolean)).then(function (v) {
    if (v === 'place') {
      clearSel();
      if (c.type === 'resource') { try { CB.onAutoTakeover(ix, null); } catch (e) { log('⚠ ' + e.message); } }
      else { sel = { mode: 'takeoverHost', data: { handIdx: ix } }; render(curState); }
    }
    else if (v === 'plot') { sel = { mode: 'plotTarget', data: { handIdx: ix } }; log('🎯 PASO 2/2 — clic en el grupo OBJETIVO de este Plot.'); render(curState); }
    else if (v === 'discard') CB.onDiscard(ix);
    else if (v === 'info') { log('📜 PLOTS «+10»: NO se juegan solos — durante TU ataque, clic en el Plot de tu mano lo añade como +10.'); log('📜 Plots de META o NWO: se juegan con «✨ Jugar» y quedan colocados a la vista en tu panel.'); }
  });
}


/* preview + info bar + fx + enciclopedia + bindEvents (reconstrucción) */
var PV = null, lastCix = null;
function infoBar() {
  var b = $('cardInfo');
  if (!b) {
    b = document.createElement('div'); b.id = 'cardInfo';
    var hb = $('handBar');
    if (hb) hb.insertBefore(b, hb.firstChild);
  }
  return b;
}
function resetInfoBar() {
  var b = infoBar();
  b.innerHTML = '<i class="ci-tip">🖱 Pasa el ratón por cualquier carta (tablero o mano) y aquí verás exactamente qué hace.</i>';
}
function writeCardInfo(c) {
  var tl = { illuminati: 'ILLUMINATI', group: 'GRUPO', resource: 'RECURSO', plot: 'PLOT' }[c.type] || c.type;
  var bits = [tl];
  if (c.subtype) bits.push(c.subtype);
  if (c.power != null || c.resistance != null) bits.push('Power ' + (c.power == null ? '–' : c.power) + ' · Resistance ' + (c.resistance == null ? '–' : c.resistance));
  if (c.alignments && c.alignments.length) bits.push('Alineamientos: ' + c.alignments.map(gspan).join(', '));
  infoBar().innerHTML = '<b>' + esc(c.name) + '</b> <span class="ci-meta">' + esc(bits.join(' · ')) + '</span>' +
    (c.text && String(c.text).trim()
      ? '<p class="ci-text">' + esc(String(c.text)) + '</p>'
      : '<p class="ci-none">📜 El texto oficial completo está impreso en la imagen de la carta (hover para verla grande).</p>');
}
function pvSet(cix) {
  if (!PV) return;
  var v = String(cix);
  var key = /^[0-9]+$/.test(v) ? parseInt(v, 10) : v;
  var c = cardOf(key);
  if (!c) return;
  writeCardInfo(c);
  if (lastCix === v) { PV.style.display = 'block'; return; }
  lastCix = v;
  var tl2 = { illuminati: 'Illuminati', group: 'Grupo', resource: 'Recurso', plot: 'Plot' }[c.type] || c.type;
  var meta = '<div class="cp-meta">' + esc(tl2) + (c.subtype ? ' · ' + esc(c.subtype) : '') + '</div>';
  if (c.power != null || c.resistance != null) {
    meta += '<div class="cp-meta"><b>P</b> ' + (c.power == null ? '–' : c.power) +
      ' · <b>R</b> ' + (c.resistance == null ? '–' : c.resistance) +
      ((c.alignments && c.alignments.length) ? ' · <b>' + esc(c.alignments.join(', ')) + '</b>' : '') + '</div>';
  }
  PV.innerHTML = '<img src="../' + c.img + '" alt="">' +
    '<div class="cp-n">' + esc(c.name) + '</div>' + meta +
    (c.text ? '<div class="cp-t">' + esc(String(c.text)) + '</div>' : '');
  PV.style.display = 'block';
}
function movePreview(ev) {
  if (!PV || PV.style.display !== 'block') return;
  var x = Math.min(window.innerWidth - 310, ev.clientX + 18);
  var y = Math.min(window.innerHeight - PV.offsetHeight - 12, ev.clientY + 16);
  PV.style.left = Math.max(6, x) + 'px';
  PV.style.top = Math.max(6, y) + 'px';
}
function hidePreview() { if (PV) PV.style.display = 'none'; lastCix = null; resetInfoBar(); }
function fxFlash(ok) {
  var d = document.createElement('div');
  d.className = 'fxflash ' + (ok ? 'ok' : 'miss');
  d.textContent = ok ? '✔ ¡ÉXITO!' : '✖ FALLO';
  document.body.appendChild(d);
  setTimeout(function () { d.remove(); }, 750);
}
function toggleHelp() {
  var ex = $('helpOv');
  if (ex) { ex.remove(); return; }
  var ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'helpOv';
  ov.innerHTML = '<div class="box ency"><h2>👁 ENCICLOPEDIA ILLUMINATI</h2>' +
    '<div class="tabs">' +
    '<button class="tabbtn on" data-tab="how">🎮 Cómo jugar</button>' +
    '<button class="tabbtn" data-tab="glo">🔤 Glosario</button>' +
    '<button class="tabbtn" data-tab="abo">👁 Sobre el juego</button></div>' +
    '<div class="tabpanel" id="tab-how"><table>' +
    '<tr><th>Fase</th><th>Qué puedes hacer</th></tr>' +
    '<tr><td>1 · Robar</td><td>Roba 1 Plot y 1 Grupo (opcional). Todos tus grupos reciben ● Action token.</td></tr>' +
    '<tr><td>2 · Colocar GRATIS</td><td><b>Takeover automático</b>: coloca 1 grupo/recurso de tu mano sin tirar dados. ¡Tu movimiento más importante!</td></tr>' +
    '<tr><td>3 · Acciones</td><td>Ilimitadas: <b>⚔ controlar</b> (robaste el grupo con sus títeres), <b>☠ destruir</b>, mover, recursos (1★). Clic en Plot de tu mano durante tu ataque = '+gspan('+10')+'.</td></tr>' +
    '<tr><td>4 · Extras</td><td>Cambia ★ Illuminati por cartas extra.</td></tr>' +
    '<tr><td>5 · Pasar</td><td>Termina tu turno.</td></tr>' +
    '<tr><td>Ataques</td><td>Fuerza = P − R ±4 alineamientos − defensa (+4 master, +10/+5 posición, ×2 autodefensa). Tira ≤ fuerza en 2d6; <b>11-12 fallan SIEMPRE</b>; fuerza &lt;2 ni tires.</td></tr>' +
    '<tr><td>Victoria</td><td>12 grupos contando el tuyo, o tu meta especial (barras arriba).</td></tr>' +
    '</table></div>' +
    '<div class="tabpanel" id="tab-glo" style="display:none"><div class="ggrid">' +
    ['peaceful','violent','liberal','conservative','weird','straight','government','fanatic','criminal','corporate','media','huge','computer','magic','science','bank','plot','resource','group','personality','place','illuminati'].map(function(t){return '<div class="gitem">'+gspan(t)+'</div>';}).join('') +
    '</div></div>' +
    '<div class="tabpanel" id="tab-abo" style="display:none"><div class="about">' +
    '<p><b>Illuminati: New World Order</b> (INWO) es el juego de cartas coleccionables de <b>Steve Jackson Games</b> (1995), diseñado por Steve Jackson como sucesor del clásico de tablero <i>Illuminati</i> (1982). Eres una sociedad secreta: controlas grupos —gobiernos, medios, mafias— para dominar el mundo.</p>' +
    '<p><b>¿Cómo funciona?</b> Cada grupo controlado suma poder hacia tu meta (normalmente 12 grupos). Atacas con tus grupos usando tokens ●, tiras dados y te apropias de estructuras enemigas completas… o las destruyes.</p>' +
    '<h3>🕵️ LA LEYENDA URBANA</h3>' +
    '<p>Corre la leyenda de que «el gobierno americano prohibió el juego». Lo REAL es más extraño: el <b>1 de marzo de 1990</b> la <b>Secret Service</b> redó las oficinas de Steve Jackson Games («Operación Sundevil»), confiscó ordenadores y el manuscrito de GURPS Cyberpunk. El juego NUNCA fue prohibido — pero la redada, vista como censura, inspiró la fundación de la <b>EFF</b> (Electronic Frontier Foundation). La ironía eterna: la carta de la NSA del juego «predijo» el vigilismo masivo… años antes.</p>' +
    '<p class="muted">Juego original © Steve Jackson Games · sjgames.com/inwo — Esta implementación web: motor propio OBD v1.2, IA heurística, textos verbatim por OCR de las cartas originales.</p>' +
    '</div></div>' +
    '<button id="encyClose" class="primary">Cerrar</button></div>';
  $('overlays').appendChild(ov);
  Array.prototype.forEach.call(ov.querySelectorAll('.tabbtn'), function (t) {
    t.onclick = function () {
      Array.prototype.forEach.call(ov.querySelectorAll('.tabbtn'), function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      ['how', 'glo', 'abo'].forEach(function (k) { $('tab-' + k).style.display = (k === t.getAttribute('data-tab')) ? '' : 'none'; });
    };
  });
  $('encyClose').onclick = function () { ov.remove(); };
}
function bindEvents() {
  $('board').addEventListener('click', function (ev) {
    var nd = ev.target.closest('.node,.slot');
    var chip = ev.target.closest('.cardChip');
    var uid = nd ? nd.getAttribute('data-uid') : (chip ? chip.getAttribute('data-uid') : null);
    if (!uid || !CB || !sel.mode) { if (!uid) return; }
    route(uid);
  });
  $('actionBtns').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn || !CB) return;
    var act = btn.getAttribute('data-act');
    try {
      if (act === 'attackctl') startAttackFlow('control');
      else if (act === 'attackdst') startAttackFlow('destroy');
      else if (act === 'takeover') startTakeoverFlow();
      else if (act === 'move') { sel = { mode: 'pickMover', data: {} }; log('🔀 PASO 1/2 — clic en el grupo tuyo a MOVER (debe tener ● token).'); render(curState); }
      else if (act === 'resource') startResourceFlow();
      else if (act === 'cancel') { clearSel(); render(curState); }
      else if (act === 'resolve') CB.onResolveAttack();
      else if (act === 'aid') { sel = { mode: 'aid', data: {} }; render(curState); }
      else if (act === 'oppose') { sel = { mode: 'oppose', data: {} }; render(curState); }
      else if (act === 'selfdef') CB.onSelfDefend();
      else if (act === 'drawplot') CB.onDrawPlot();
      else if (act === 'drawgroup') CB.onDrawGroup();
      else if (act === 'exchange') CB.onExchangeIllum();
      else if (act === 'extra') CB.onExtraGroupDraw();
      else if (act === 'hsort') { handSort = btn.getAttribute('data-v') || 'table'; render(curState); }
      else if (act === 'endturn') {
        if (curState.attack && !curState.attack.resolved) { log('⚠ Tienes un ataque sin resolver: pulsa 🎲 RESOLVER primero.'); return; }
        clearSel(); CB.onEndTurn();
      }
    } catch (e) { log('⚠ ' + e.message); }
  });
  $('handCards').addEventListener('click', function (ev) {
    var hc = ev.target.closest('.handCard');
    if (!hc || !CB || !curState) return;
    var ix = parseInt(hc.getAttribute('data-idx'), 10);
    handClick(ix);
  });
}

function init(cb) {
  CB = cb;
  bindEvents();
  PV = $('cardPreview');
  var hb = $('helpBtn');
  if (hb) hb.onclick = toggleHelp;
  document.addEventListener('mouseover', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-cix]') : null;
    if (t) pvSet(t.getAttribute('data-cix')); else hidePreview();
  });
  document.addEventListener('mousemove', movePreview);
}

/* ---------- TUTORIAL A PRUEBA DE TODO ---------- */
function showHowTo(cb) {
  var ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'howToOv';
  ov.innerHTML = '<div class="box howto">' +
    '<h2>🎮 CÓMO JUGAR — 4 PASOS y ya sabes jugar</h2>' +
    '<ol>' +
    '<li><b>🎴 ROBAR</b> — Pulsa «Robar PLOT» y «Robar GRUPO». Son tus cartas nuevas.</li>' +
    '<li><b>🎁 TAKEOVER AUTOMÁTICO</b> — El botón verde que PARPADEA. Coloca un grupo de tu mano en tu estructura <u>gratis y sin dados</u>. Es tu movimiento más importante.</li>' +
    '<li><b>⚔ ATACAR (opcional)</b> — «Controlar» roba el grupo enemigo con todos sus títeres. «Destruir» lo elimina. El juego te guía: clic en tu atacante → clic en el objetivo verde → RESOLVER ▶ tira los dados.</li>' +
    '<li><b>✔ TERMINAR TURNO</b> — Cuando no quieras hacer más, pulsa el botón azul.</li>' +
    '</ol>' +
    '<p class="goal">🏆 <b>GANAS controlando 12 grupos</b> (la tuya cuenta). Mira tu barra de progreso arriba en todo momento.</p>' +
    '<p class="muted">💡 Pasa el ratón por CUALQUIER carta para verla grande. El texto ℹ de abajo SIEMPRE te dice qué hacer ahora. La ? del menú tiene todas las reglas.</p>' +
    '<button id="howToBtn" class="primary bigbtn">¡ENTENDIDO, A JUGAR! ▶</button>' +
    '</div>';
  $('overlays').appendChild(ov);
  $('howToBtn').onclick = function () { ov.remove(); if (cb) cb(); };
}

window.UI = {
  init: init,
  render: render,
  log: log,
  prompt: prompt,
  showCurtain: showCurtain,
  showSetupScreen: showSetupScreen,
  showGameOver: showGameOver,
  showHowTo: showHowTo,
  fxFlash: fxFlash,
};
})();
