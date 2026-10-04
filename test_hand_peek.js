'use strict';
/* =============================================================================
 * test_hand_peek.js - GATE de la REDISEÑ DE LA MANO (M1+M2+M3 de plan_mano_mtga.md)
 * -----------------------------------------------------------------------------
 * Que fija, para que no se pueda volver a romper en silencio:
 *   1) M1  el zoom de la mano existe y NO esta recortado
 *         (#handCards sin max-height/overflow, .handCard con scale >= 1.4,
 *          transform-origin bottom center, y las 18 cartas de Illuminati con el
 *          override de rotacion tambien en el preview de la mano).
 *   2) M2  la capa de lectura #cardPeek existe en el DOM y tiene sus clases CSS,
 *          y la deduplicacion por PEEK_CIX esta cableada.
 *   3) M3  el desglose de mecanica se construye desde los campos ESTRUCTURADOS del
 *          dataset y funciona en las 421 cartas sin lanzar una sola excepcion, y
 *          NINGUNA clave de c.effect / c.goal se pierde en silencio.
 *
 * COMO SE EXTRAE EL CODIGO DE LA UI: ui.js es un IIFE que depende de window y del
 * DOM, asi que no se puede require()ar. Se aisan las tablas y los formatters (todo lo
 * que va desde `var EFF_SEC = {` hasta antes de `var PEEK_CIX = null;`) con un
 * stub minimo de esc(), que es su unica dependencia externa. Si M3 dejara de estar
 * en ese rango, el test falla en vez de dar un falso verde.
 * =========================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname);
const UI = path.join(root, 'game', 'js', 'ui.js');
const CSS = path.join(root, 'game', 'css', 'style.css');
const HTML = path.join(root, 'game', 'index.html');
const CARDS = path.join(root, 'game', 'js', 'cards.js');
const UIJS  = path.join(root, 'game', 'js', 'ui.js');
const APPJS = path.join(root, 'game', 'js', 'app.js');

const failures = [];
function ok(cond, msg) { if (!cond) failures.push(msg); }

/* ---------- 1) M1: el zoom existe y no esta recortado ---------- */
const css = fs.readFileSync(CSS, 'utf8');
const handBlock = (css.match(/#handCards\s*\{[^}]*\}/) || [''])[0];
ok(!/max-height\s*:\s*240px/.test(handBlock),
  'M1: #handCards vuelve a recortar el zoom con max-height:240px');
ok(!/overflow-y\s*:\s*auto/.test(handBlock),
  'M1: #handCards vuelve a recortar el zoom con overflow-y:auto');
ok(/align-items\s*:\s*flex-end/.test(handBlock),
  'M1: #handCards debe usar align-items:flex-end para que la carta crezca hacia arriba');
const scales = [...css.matchAll(/\.handCard[^{]*:hover[^{]*\{[^}]*scale\(([\d.]+)\)/g)].map(m => parseFloat(m[1]));
ok(scales.length > 0 && Math.max.apply(null, scales) >= 1.4,
  'M1: el hover de .handCard debe escalar >= 1.4 (medido: ' + JSON.stringify(scales) + ')');
ok(/transform-origin\s*:\s*bottom\s+center/.test(css),
  'M1: .handCard necesita transform-origin: bottom center (sin eso el hover entra en bucle)');
ok(/#handCards[^{]*\.handCard\s*\{[^}]*z-index\s*:\s*\d+/.test(css),
  'M1: .handCard necesita z-index en la regla base, no solo en :hover');
ok(/#cardPeek\s+img\[src\*="Illuminati\/"\][^{]*\{[^}]*transform\s*:\s*none/.test(css),
  'M1: falta el override de rotacion para los PNG de Illuminati dentro de #cardPeek');

/* ---------- 2) M2: la capa de lectura existe ---------- */
const html = fs.readFileSync(HTML, 'utf8');
ok(/id="cardPeek"/.test(html), 'M2: #cardPeek no existe en index.html');
['cardPeek', 'pk-top', 'pk-img', 'pk-head', 'pk-n', 'pk-meta', 'pk-text', 'pk-eff', 'pk-effline', 'pk-warn', 'pk-none'].forEach(function (cls) {
  ok(css.indexOf('.' + cls) >= 0, 'M2: falta la clase CSS .' + cls);
});
const ui = fs.readFileSync(UI, 'utf8');
['peekEl', 'peekHtml', 'peekShow', 'peekHide', 'peekPlace', 'PEEK_CIX'].forEach(function (fn) {
  ok(new RegExp('\\b' + fn + '\\b').test(ui), 'M2: falta ' + fn + ' en ui.js');
});
ok(/function\s+render\s*\(state\)\s*\{[\s\S]{0,400}?peekHide\(\)/.test(ui),
  'M2: render() debe llamar a peekHide() o la capa describira una carta ya repintada');
ok(/#handCards[\s\S]{0,900}?addEventListener\('mouseover'/.test(ui),
  'M2: falta la delegacion mouseover -> peekShow sobre #handCards');
ok(/#handCards[\s\S]{0,1400}?addEventListener\('mouseout'/.test(ui),
  'M2: falta la delegacion mouseout -> peekHide sobre #handCards');

/* ---------- 3) M3: el desglose se construye desde los datos ---------- */
const start = ui.indexOf('var EFF_SEC = {');
const end = ui.indexOf('var PEEK_CIX = null;');
ok(start >= 0 && end > start, 'M3: no se encuentra el bloque de M3 (de "var EFF_SEC = {" a "var PEEK_CIX = null;")');

let lineas = 0;
if (start >= 0 && end > start) {
  const block = ui.slice(start, end);
  const cardCtx = { console: console };
  cardCtx.window = cardCtx;
  vm.createContext(cardCtx);
  vm.runInContext(fs.readFileSync(CARDS, 'utf8'), cardCtx, { filename: 'cards.js' });
  const C = cardCtx.INWO_CARDS;
  ok(C && Array.isArray(C.cards) && C.cards.length === 421, 'M3: el dataset deberia seguir teniendo 421 cartas');

  const S = { INWO_CARDS: C };
  S.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  };
  S.window = S;
  vm.createContext(S);
  vm.runInContext(block, S, { filename: 'ui-m3-block.js' });

  ok(Object.keys(S.EFF_SEC).join(',') === 'coste,obj,eff,fin,modo',
    'M3: las 5 secciones estructurales deben ser coste,obj,eff,fin,modo');

  /* Cobertura de familias: ningun effect.kind del dataset puede quedarse sin etiqueta. */
  const kinds = {};
  C.cards.forEach(function (c) { if (c.effect && c.effect.kind) kinds[c.effect.kind] = true; });
  Object.keys(kinds).forEach(function (k) {
    ok(S.KIND_ES[k] !== undefined, 'M3: effect.kind "' + k + '" no tiene etiqueta en KIND_ES');
  });

  /* Cobertura de claves: cada clave real de effect/goal o tiene glosa o se imprime cruda. */
  let errores = 0, cartasSinDesglose = [];
  C.cards.forEach(function (c) {
    let h = '', s = '';
    try { h = S.effHtml(c); s = S.statusHtml(c); }
    catch (e) { errores++; if (errores < 4) failures.push('M3: excepcion en ' + c.idx + ' ' + c.name + ': ' + e.message); }
    lineas += (h.match(/pk-effline/g) || []).length;
    if (!h && !s) cartasSinDesglose.push(c.idx + ' ' + c.name);
    const e = c.effect;
    if (e && e.kind) {
      Object.keys(e).forEach(function (k) {
        if (k === 'kind' || k === 't' || k === 'code') return;
        const conGlosa = S.FIELD_MAP[k] === true;
        const impresoCrudo = h.indexOf('<b>' + k + '</b> =') >= 0;
        ok(conGlosa || impresoCrudo,
          'M3: la clave effect.' + k + ' de ' + c.idx + ' ' + c.name + ' se pierde en silencio');
      });
    }
    const g = c.goal;
    if (g && g.type) {
      Object.keys(g).forEach(function (k) {
        if (k === 'type' || k === 'double') return;
        ok(S.GOAL_FIELD[k] !== undefined || h.indexOf('<b>' + k + '</b> =') >= 0,
          'M3: la clave goal.' + k + ' de ' + c.idx + ' ' + c.name + ' se pierde en silencio');
      });
    }
  });
  ok(errores === 0, 'M3: el desglose lanzo excepciones en ' + errores + ' cartas');
  ok(lineas >= 400, 'M3: se esperaban >= 400 lineas de desglose en el dataset, se generaron ' + lineas);
  ok(cartasSinDesglose.length <= 1,
    'M3: ' + cartasSinDesglose.length + ' cartas sin desglose ni aviso: ' + cartasSinDesglose.join(' | '));

  /* El texto impreso sigue siendo VERBATIM y va por delante del desglose. */
  const conTexto = C.cards.filter(function (c) { return c.text && String(c.text).trim(); });
  ok(conTexto.length >= 400, 'M3: el dataset deberia conservar el texto OCR en >= 400 cartas');
  ok(/peekHtml[\s\S]{0,4000}?return head \+ body \+ effHtml\(c\) \+ statusHtml\(c\);/.test(ui),
    'M3: peekHtml debe devolver texto impreso + desglose + aviso');
}

/* ---------------------------------------------------------------------------
 * M5 - P1-075: la mano era INJUGABLE en el navegador y ningun test de Node lo veia.
 * `enablersForL11()` usaba `cards[ix]`, un identificador que no existe en el proyecto
 * (la variable del IIFE es `C`, y el array es `C.cards`). Como `handClick()` la llama en
 * su flujo normal, toda pulsacion de carta que llegase al final del router lanzaba
 * `ReferenceError: cards is not defined` y no hacia nada. Este assert es la red que
 * faltaba: cualquier `cards[` desnudo (sin `C.` ni `window.INWO_CARDS.` delante) vuelve
 * a ser un P0, y aqui se ve en el segundo.
 * ------------------------------------------------------------------------- */
{
  const uiSolo = ui.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const desnudos = [];
  const re = /(^|[^.\w$])(cards)\s*\[/g;
  let m;
  while ((m = re.exec(uiSolo)) !== null) {
    desnudos.push(uiSolo.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\s+/g, ' '));
  }
  ok(desnudos.length === 0,
    'P1-075: ' + desnudos.length + ' usos del identificador inexistente `cards[` en ui.js -> ' +
    desnudos.slice(0, 3).join(' || '));

  /* P1-076: la rama que llama al motor desde handClick debe estar dentro de un try/catch,
   * o un rechazo de regla se pierde en la consola y el jugador no ve nada. */
  const ramaAtaque = /sel\.mode === 'target'[\s\S]{0,900}?CB\.onDeclareAttack/;
  ok(ramaAtaque.test(ui), 'P1-076: no se encuentra la rama sel.mode===target -> onDeclareAttack');
  const trozo = ui.slice(Math.max(0, ui.search(ramaAtaque) - 400), ui.search(ramaAtaque) + 400);
  ok(/try\s*\{/.test(trozo),
    'P1-076: la rama que llama a CB.onDeclareAttack debe ir dentro de un try/catch');
}

/* ---------- 4) L13.f: el cableado de UI de disaster_defence ---------- */
/* Aserciones ESTATICAS del cableado exacto, no una simulacion. Motivo (medido en
 * navegador real con Playwright el 2026-10-04): el estado del motor vive en el closure
 * de app.js, `window.App` solo expone `start` y las llamadas INTERNAS de ui.js a
 * render() van a la funcion local, no a window.UI.render, asi que monkeypatchear
 * window.UI.render NO captura el estado. Intentar renderizar un estado sintetico con
 * UI.render(st) revienta en panelHtml/render por campos que no se pueden adivinar sin
 * inventarlos. Es el mismo limite que ya declaro P1-075 para el test de Node. Lo que
 * SI se puede fijar por asercion estatica es que el camino de la UI existe y llama a la
 * API correcta del motor; que el motor lo ejecute ya lo cubren los 35 asertos de
 * test_fase2_rules.js (L13.e). */
const uiTxt = fs.readFileSync(UIJS, 'utf8');
const appTxt = fs.readFileSync(APPJS, 'utf8');
const nt = (uiTxt.match(/var NO_TARGET_KINDS\s*=\s*\[([^\]]*)\]/) || ['', ''])[1];
ok(nt.indexOf("'disaster_defence'") < 0 && nt.indexOf('"disaster_defence"') < 0,
   'L13.f: disaster_defence esta en NO_TARGET_KINDS -> las 4 Plot de L13 NO piden Place objetivo');
ok(/md === 'boost_attack'\) return 'disasterboost';/.test(uiTxt),
   'L13.f: chipAct() no devuelve disasterboost para 245 Earthquake Projector');
ok(/act === 'disasterboost'/.test(uiTxt) && /CB\.onUseDisasterBoost\(/.test(uiTxt),
   'L13.f: bindEvents no cablea data-act=disasterboost -> CB.onUseDisasterBoost');
ok(/onUseDisasterBoost:\s*function\s*\(resourceUid\)/.test(appTxt)
   && /E\.useDisasterBoost\(/.test(appTxt)
   && /onUseDisasterBoost:[\s\S]{0,400}catch/.test(appTxt),
   'L13.f: app.js no expone onUseDisasterBoost con try/catch sobre E.useDisasterBoost');
ok(/case 'disaster_defence':\{/.test(fs.readFileSync(path.join(root, 'game', 'js', 'engine.js'), 'utf8')),
   'L13.f: el motor no tiene ningun case \'disaster_defence\' (FASE 4 lo habria detectado)');

if (failures.length) {
  console.error('HAND PEEK FAILURES (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
}
console.log('HAND PEEK PASSED (zoom sin recorte, capa #cardPeek, desglose de ' + lineas + ' lineas sobre 421 cartas)');