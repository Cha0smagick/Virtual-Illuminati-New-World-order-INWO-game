'use strict';
/* test_fase4_cards.js — GATE DE COBERTURA de la Fase 4 (clasificacion de cartas).
 *
 * Que problema resuelve este gate, que ningun otro test cubre:
 *
 * En la Fase 4 hemos ido clasificando cartas desde `unverified` hasta
 * `implemented-pending-engine`. Ese estado dice "el motor SABE hacer esto", y
 * el riesgo real no es que el motor falle, sino que diga que sabe hacer algo que
 * no sabe hacer. Concretamente, tres formas de mentira:
 *
 *   (1) UNA CARTA CLASIFICADA SIN RAMA EN EL MOTOR. `case 'messiah':` existe hoy,
 *       pero si alguien clasifica 30 cartas con un `kind` nuevo y olvida el
 *       `case`, el motor compila igual, el dataset dice "implementada", y el
 *       jugador recibe "tiene una mecanica no implementada" al jugar su carta.
 *       Este fallo ya ocurrio: las familias +10 / Power Increase / Resistance
 *       IncreaseTenian su `case` escrito y CERO cartas (ver §26.1 y §27.1).
 *       El gate lo invierte: no puede haber una carta clasificada cuya rama no
 *       exista.
 *
 *   (2) UNA RAMA SIN CARTAS. El caso inverso: `case 'zap':` y `case 'paralyze':`
 *       existen y son inalcanzables porque no hay ninguna carta de esa familia en
 *       esta transcripcion (§25.5). Eso esta declarado en prosa; aqui se declara
 *       en codigo, en una lista con su justificacion, para que añadir una carta
 *       de esas sin darme cuenta sea visible.
 *
 *   (3) UN CALIFICADOR IMPOSIBLE. Una carta puede estar perfectamente
 *       clasificada y ser injugable: "Charismatic Leader: the Power for one
 *       Fanatic group" es inocua si ningun grupo del mazo fuera fanatic. El
 *       §26.4 ya lo intento para los 15 +10; aqui se generaliza a TODOS los
 *       campos calificadores que usan los efectos implementados, y se comprueba
 *       contra el mazo real en cada ejecucion.
 *
 * Ademas fija dos invariantes de progreso para que "seguir lotes hasta agotar el
 * texto mecanico" sea medible y no una sensacion: el numero de cartas pendientes
 * NUNCA puede subir, y el numero de cartas clasificadas NUNCA puede bajar.
 *
 * Y por ultimo congela los bloqueos documentados (§29.4, §29.5, §30.1): siete
 * cartas NO deben clasificarse hasta que exista el subsistema que falta. Si
 * alguien las clasifica sin cerrar la ventana de reaccion o sin crear
 * `nodeAligns()`, este gate falla. Es la forma de que "bloqueado" sea un
 * invariante ejecutable y no una promesa.
 *
 * CORRECCION DE MEDICION (P1-019, encontrada al escribir este gate): hasta §30 se
 * conto como "pendientes" a los 167 Groups del mazo. Un Group normal NO tiene
 * mecanica alguna: es plenamente jugable. La poblacion pendiente real de la Fase
 * 4 son SOLO las Plots y los Resources, porque `mechanicsStatus()` de
 * `gen_cards.js` devuelve 'unverified' para `plot_generic|resource_generic` y un
 * Group sin efecto cae ahi por el mismo camino. Por eso este gate mide
 * `pendingPlr` (Plots + Resources) y las cifras "324/320 unverified" de §26-§30
 * hay que leerlas como "cartas con el status unverified", no como "cartas sin
 * mecanica".
 */

const fs = require('fs');
const path = require('path');

global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');

const E = window.Engine;
const C = window.INWO_CARDS;

const failures = [];
function ok(cond, msg) {
  if (!cond) failures.push(msg);
}
function section(name) {
  console.log('  -- ' + name);
}

/* ---------------------------------------------------------------------------
 * ALLOWLISTS. Cada entrada lleva la seccion de la auditoria que la justifica.
 * Si algo deixa de ser cierto, se BORRA aqui Y se corrige el codigo, no al reves.
 * ------------------------------------------------------------------------- */

/* Kinds que NO se resuelven por `E.playPlot` sino por otro camino del motor.
 * Las cartas Illuminati no se juegan: su `effect` lo leen `illuEff()` /
 * `illuAttackBonus()` / `illuDefenseBonus()` / `plotHandLimitOf()` y su `goal` lo
 * leen `goalMetFor()`. Confundirlas con una rama de Plot seria un falso positivo. */
const NON_PLAYPLOT_KINDS = {
  illu_special: '§21/§29 — leido por illuEff()/goalMetFor(), nunca por playPlot'
};

/* Etiquetas de `case` que pertenecen al `switch` de `goalMetFor()`, no al de
 * `playPlot()`. Son tipos de META, no de carta jugada. */
const GOAL_TYPE_LABELS = new Set([
  'power_total', 'destroy_reduce', 'peaceful_power_in_play', 'goal_cards', 'basic'
]);

/* Ramas que existen en el motor pero que NINGUNA carta puede alcanzar, con el
 * motivo. No es un descuido: §25.5 demostro mediante busqueda exhaustiva que las
 * familias Zap y Paralyze no tienen ninguna carta en esta transcripcion, y `nwo`
 * es una etiqueta historica sin cartas. Si alguien anade una carta de esas, este
 * gate obliga a quitar la entrada de aqui Y a implementar la mecanica. */
const DEAD_BRANCHES = {
  paralyze: '§25.5 — ninguna carta de la familia Paralyze existe en esta transcripcion',
  zap: '§25.5 — ninguna carta de la familia Zap existe en esta transcripcion',
  nwo: 'etiqueta historica New World Order; sin cartas en el mazo'
};

/* Progreso. MAX_PENDING_PLR solo se BAJA a proposito (cuando se clasifican
 * Plots o Resources); MIN_IMPLEMENTED solo se SUBE a proposito. Este archivo es el
 * registro.
 *
 * P1-019: el techo ANTERIOR (MAX_PENDING=348) contado 167 Groups que no tienen
 * mecanica alguna. La cifra honesta son 182 = 147 Plots pendientes + 35 Resources
 * pendientes. Los 167 Groups que siguen con status 'unverified' no son deuda: son
 * grupos normales y jugables, y por eso ya NO entran en este techo. */
const MAX_PENDING_PLR = 182;            // medido: 147 plots + 35 resources sin mecanica
const MIN_IMPLEMENTED = 47;            // medido: implemented-pending-engine

/* Groups sin texto mostrable. Californa, Margaret Thatcher, Ollie North y Vatican
 * City tienen `text`/`ocrText` de 0 caracteres pero `referenceText` de 126-155
 * caracteres, asi que el OCR les fallo pero la fuente de referencia los conserva.
 * La UI no puede mostrar nada para ellas. No se "arregla" aqui a ojo: se declaran
 * para que la lista no crezca sin una decision consciente. */
const KNOWN_TEXT_GAPS = {
  'california': 'text vacio, referenceText de ~155 chars (§31)',
  'margaretthatcher': 'text vacio, referenceText de ~150 chars (§31)',
  'ollienorth': 'text vacio, referenceText de ~130 chars (§31)',
  'vaticancity': 'text vacio, referenceText de ~126 chars (§31)'
};

/* Las cartas bloqueadas, con el subsistema que falta. Congeladas aqui para
 * que "bloqueada" sea ejecutable.
 * P1-016 cerro la ventana de reaccion, asi que Bodyguard y Talisman salieron de
 * esta lista. Head in a Jar SIGUE bloqueada: ademas de la ventana necesita la
 * mecanica de "asesinado"/resurreccion, que el motor no tiene. */
const BLOCKED_CARDS = {
  'headinajar': 'P1-016 cerrada, pero falta la mecanica de "asesinado"/resurreccion (§30.1)',
  'hiddeninfluence': 'P1-DATA-03 Global Power ausente (§30.3)',
  'purge': 'P1-DATA-03 Global Power ausente (§30.3)',
  'mediaconnections': 'P1-DATA-03 Global Power ausente (the node-attr part closed by P1-017, but the Global Power data is not)',
  /* §38 — las 5 de la familia de reaccion inmediata que NO tienen mecanica que las
     sostenga. No es pereza: cada motivo esta comprobado contra el motor. */
  'andstaydead': '§38 sin mecanica de resurreccion en el motor, asi que "gone forever" no seria observable (INJUGABLE)',
  'counterspell': '§38 un Resource no puede atacar ni ayudar a un ataque (esta en pl.resources con tokens:0 y sin nodo), asi que "any Magic Resource used to attack you" nunca ocurre',
  'hattrick': '§38 exigiria deshacer una Plot ya resuelta de forma transaccional',
  'ilied': '§38 el motor no tiene tratos que cumplir, luego el marcador no lo consumiria nadie (INJUGABLE)',
  'vultures': '§38 el motor no tiene el camino "jugar un grupo de la mano, fallar el takeover y descartarlo" (placeUnder lanza y la carta sigue en la mano); las reglas oficiales si (inwo_rules_extracted.txt:226-241)'
};

const IMPLEMENTED_STATUSES = new Set([
  'implemented', 'implemented-pending-engine', 'implemented-special'
]);

const CANON_ALIGNMENTS = [
  'government', 'corporate', 'liberal', 'conservative', 'peaceful',
  'violent', 'straight', 'weird', 'criminal', 'fanatic'
];

const ENGINE_SRC = fs.readFileSync(path.join(__dirname, 'game/js/engine.js'), 'utf8');
const CASE_LABELS = new Set(
  Array.from(ENGINE_SRC.matchAll(/case\s+'([a-z0-9_]+)'\s*:/g)).map(m => m[1])
);

const GROUPS = C.cards.filter(c => c.type === 'group');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const hasAlign = (c, a) => (c.alignments || []).indexOf(a) >= 0;
const hasAttr = (c, a) => (c.attributes || []).map(String).map(s => s.toLowerCase()).indexOf(String(a).toLowerCase()) >= 0;

/* ===========================================================================
 * 1. ALCANCE — toda carta clasificada tiene una rama real en el motor
 * =========================================================================== */
section('1. Alcance: ninguna carta clasificada sin rama en el motor');
/* P1-019, correccion del gate: `KINDS_SEEN` se construye sobre TODAS las cartas,
 * no solo sobre las clasificadas. Antes se armaba dentro del bucle que filtra por
 * `IMPLEMENTED_STATUSES`, y por eso las 7 cartas Goal (status
 * `source-text-unmapped`, kind `goal`) no contaban y `case 'goal':` aparecia como
 * RAMA HUERFANA. El.kind de una carta existe aunque su status todavia no sea de
 * implementado; lo que se mide aqui es "la rama tiene cartas", no "las cartas
 * estan implementadas". */
const KINDS_SEEN = {};
for (const c of C.cards) {
  const k = (c.effect && c.effect.kind) || '';
  if (k) KINDS_SEEN[k] = (KINDS_SEEN[k] || 0) + 1;
}

/* El status `implemented` significa "esta carta se juega tal cual, sin mecanica
 * especial": es el caso de un Group normal con `effect: null` (el unico medido es
 * Vatican City). NO necesita rama en el motor. Los dos status que SI la necesitan
 * son `implemented-pending-engine` (hay un `case` escrito que la ejecuta) e
 * `implemented-special` (los poderes de las Illuminati, exentos por
 * NON_PLAYPLOT_KINDS). */
const NEEDS_BRANCH_STATUSES = new Set(['implemented-pending-engine', 'implemented-special']);
let implementedCount = 0;
for (const c of C.cards) {
  if (!IMPLEMENTED_STATUSES.has(c.mechanicsStatus)) continue;
  implementedCount++;
  if (!NEEDS_BRANCH_STATUSES.has(c.mechanicsStatus)) continue;
  const kind = (c.effect && c.effect.kind) || '';
  ok(
    kind !== '',
    'carta clasificada sin effect.kind: ' + c.idx + ' ' + c.name + ' (' + c.mechanicsStatus + ')'
  );
  ok(
    CASE_LABELS.has(kind) || Object.prototype.hasOwnProperty.call(NON_PLAYPLOT_KINDS, kind),
    'carta clasificada cuya rama NO existe en el motor: "' + c.name + '" kind="' + kind +
    '" (mechanicsStatus=' + c.mechanicsStatus + '). El motor responderia ' +
    '"mecanica no implementada" al jugar una carta que el dataset declara implementada.'
  );
}
console.log('     cartas clasificadas: ' + implementedCount +
            ' · kinds de cartas clasificadas: ' + JSON.stringify(
              C.cards.filter(c => IMPLEMENTED_STATUSES.has(c.mechanicsStatus) && c.effect)
                     .reduce((acc, c) => { acc[c.effect.kind] = (acc[c.effect.kind] || 0) + 1; return acc; }, {})));

/* ===========================================================================
 * 2. RAMAS HUERFANAS — ninguna rama del motor sin cartas, salvo las declaradas
 * =========================================================================== */
section('2. Ramas huerfanas: ningun case del motor queda inalcanzable en silencio');
for (const label of CASE_LABELS) {
  if (GOAL_TYPE_LABELS.has(label)) continue;
  if (KINDS_SEEN[label]) continue;
  ok(
    Object.prototype.hasOwnProperty.call(DEAD_BRANCHES, label),
    'el motor tiene case \'' + label + '\': pero ninguna carta tiene ese kind, y no esta ' +
    'declarado en DEAD_BRANCHES. O la rama es codigo muerto, o hay cartas sin clasificar ' +
    'que deberian entrar. Si es lo primero, declaralo en DEAD_BRANCHES con su motivo.'
  );
}
const declaredDead = Object.keys(DEAD_BRANCHES).filter(k => !KINDS_SEEN[k]);
console.log('     ramas muertas declaradas y aun sin cartas: ' + JSON.stringify(declaredDead));

/* ===========================================================================
 * 3. PROGRESO — lo pendiente no sube, lo clasificado no baja
 * =========================================================================== */
section('3. Progreso: las Plots y Resources sin mecanica son monotono no creciente');
/* P1-019: `pending` cuenta SOLO Plots y Resources. Un Group con status
 * 'unverified' no es deuda — no tiene mecanica que implementar, se juega tal cual.
 * Contarlo inflaba el numero en 167 y hacia que "seguir lotes hasta agotar el
 * texto mecanico" no fuese medible. */
let pending = 0;
let pendingByType = {};
let statusOnlyCount = 0;
let byStatus = {};
for (const c of C.cards) {
  byStatus[c.mechanicsStatus] = (byStatus[c.mechanicsStatus] || 0) + 1;
  const k = (c.effect && c.effect.kind) || '';
  const unmechanised = k === 'unverified' || k === 'ability_unverified' || k === '';
  if (!unmechanised) continue;
  if (c.type === 'plot' || c.type === 'resource') {
    pending++;
    pendingByType[c.type] = (pendingByType[c.type] || 0) + 1;
  } else {
    statusOnlyCount++;
  }
}
ok(
  pending <= MAX_PENDING_PLR,
  'REGRESION: hay ' + pending + ' Plots/Resources sin mecanica y el techo registrado es ' +
  MAX_PENDING_PLR + '. Si es intencionado (nuevas cartas transcritas), sube MAX_PENDING_PLR ' +
  'con el motivo; si no lo es, alguien ha clasificado una carta sin implementar su mecanica.'
);
const implPendingEngine = byStatus['implemented-pending-engine'] || 0;
ok(
  implPendingEngine >= MIN_IMPLEMENTED,
  'REGRESION: solo ' + implPendingEngine + ' cartas con implemented-pending-engine y el ' +
  'registro exige al menos ' + MIN_IMPLEMENTED + '. Alguien ha retrocedido una clasificacion.'
);
console.log('     Plots/Resources sin mecanica: ' + pending + ' (techo ' + MAX_PENDING_PLR +
            ') ' + JSON.stringify(pendingByType) +
            ' · Groups con status unverified que NO son deuda: ' + statusOnlyCount);
console.log('     implemented-pending-engine: ' + implPendingEngine + ' (minimo ' + MIN_IMPLEMENTED + ')');
console.log('     mechanicsStatus: ' + JSON.stringify(byStatus));

/* ===========================================================================
 * 4. CALIFICADORES — ninguna carta clasificada puede ser injugable
 * =========================================================================== */
section('4. Calificadores: cada carta clasificada tiene al menos un objetivo posible');
function groupsWithAlign(a) { return GROUPS.filter(g => hasAlign(g, a)); }
function groupsWithAttr(a) { return GROUPS.filter(g => hasAttr(g, a)); }
function groupsOfSubtype(s) { return GROUPS.filter(g => g.subtype === s); }

const checkedFields = {};
for (const c of C.cards) {
  if (!IMPLEMENTED_STATUSES.has(c.mechanicsStatus)) continue;
  const e = c.effect || {};

  // Alineaciones exigidas: `targetAlign` (boost10, power_increase, resistance_increase,
  // illu_special.bonus.targetAlign). Un filtro de REJECT no necesita satisfacerse
  // para ser jugable, asi que se comprueba aparte con un criterio mas blando.
  if (e.targetAlign) {
    checkedFields.targetAlign = true;
    const n = groupsWithAlign(e.targetAlign).length;
    ok(n > 0, 'carta "' + c.name + '" exige targetAlign=' + e.targetAlign +
               ' pero ningun grupo del mazo lo tiene -> INJUGABLE');
  }
  if (e.targetAttr) {
    checkedFields.targetAttr = true;
    const n = groupsWithAttr(e.targetAttr).length;
    ok(n > 0, 'carta "' + c.name + '" exige targetAttr=' + e.targetAttr +
               ' pero ningun grupo del mazo lo tiene -> INJUGABLE');
  }
  if (e.requireAttr) {
    checkedFields.requireAttr = true;
    const n = groupsWithAttr(e.requireAttr).length;
    ok(n > 0, 'carta "' + c.name + '" exige requireAttr=' + e.requireAttr +
               ' pero ningun grupo del mazo lo tiene -> INJUGABLE');
  }
  /* `requireAttrAny` es la DISYUNCION ("any Science, Space or Computer group"):
     basta con que un unico grupo del mazo tenga UNO de los atributos. Sin esta
     rama, un array en `requireAttr` se convertia en la cadena "science,space,
     computer" y la carta se declaraba INJUGABLE siendo perfectamente jugable. */
  if (e.requireAttrAny) {
    checkedFields.requireAttrAny = true;
    const n = e.requireAttrAny.filter(a => groupsWithAttr(a).length > 0).length;
    ok(n > 0, 'carta "' + c.name + '" exige requireAttrAny=' + JSON.stringify(e.requireAttrAny) +
               ' pero ningun grupo del mazo tiene ninguno de esos atributos -> INJUGABLE');
  }
  if (e.rejectAttr) {
    checkedFields.rejectAttr = true;
    const n = groupsWithAttr(e.rejectAttr).length;
    ok(n > 0, 'carta "' + c.name + '" declara rejectAttr=' + e.rejectAttr +
               ' pero ningun grupo lo tiene: el rechazo es inerte y la carta es mas fuerte de lo que el ' +
               'texto dice. Puede ser correcto, pero debe ser una decision consciente.');
  }
  if (e.churchAttr) {
    checkedFields.churchAttr = true;
    const n = groupsWithAttr(e.churchAttr).length;
    ok(n > 0, 'carta "' + c.name + '" suma Poder por cada grupo con ' + e.churchAttr +
               ' pero no existe ninguno -> la parte principal de la carta es INJUGABLE');
  }
  if (e.requireActionFromAttr) {
    checkedFields.requireActionFromAttr = true;
    const n = groupsWithAttr(e.requireActionFromAttr).length;
    ok(n > 0, 'carta "' + c.name + '" exige una accion de un grupo con ' + e.requireActionFromAttr +
               ' pero ningun grupo lo tiene -> INJUGABLE');
  }
  if (e.targetSubtype) {
    checkedFields.targetSubtype = true;
    ok(groupsOfSubtype(e.targetSubtype).length > 0,
       'carta "' + c.name + '" exige targetSubtype=' + e.targetSubtype + ' y no hay ningun grupo de ese subtipo');
  }
  if (Array.isArray(e.targetSubtypes)) {
    checkedFields.targetSubtypes = true;
    const any = e.targetSubtypes.some(s => groupsOfSubtype(s).length > 0);
    ok(any, 'carta "' + c.name + '" exige targetSubtypes=' + JSON.stringify(e.targetSubtypes) +
            ' y no hay ningun grupo de ninguno de esos subtipos -> INJUGABLE');
  }
  if (Array.isArray(e.requiresActionFrom)) {
    checkedFields.requiresActionFrom = true;
    const names = e.requiresActionFrom;
    const usable = names.filter(n => GROUPS.some(g => g.name === n));
    ok(usable.length > 0, 'carta "' + c.name + '" exige una accion de uno de ' + JSON.stringify(names) +
       ' y NINGUNO de esos nombres es un grupo del mazo -> INJUGABLE');
    if (usable.length < names.length) {
      const missing = names.filter(n => usable.indexOf(n) < 0);
      console.log('     AVISO (dato, no fallo): "' + c.name + '" lista ' + JSON.stringify(missing) +
                  ' que en el mazo no es un Group. Se deja tal cual esta impreso (§29.3); ' +
                  'las opciones utilizables son ' + JSON.stringify(usable) + '.');
    }
  }
  if (Array.isArray(e.mayAddPowerFromAligns)) {
    checkedFields.mayAddPowerFromAligns = true;
    /* P1-018: el nombre de la lista dice "Aligns" pero el texto impreso puede pedir
     * un ATRIBUTO. "One *Magic* group may use its action to add its Power to this
     * attack" usa Magic, que en este juego es atributo (9 grupos) y no ideologia
     * (0 grupos). `hasAnyAlign()` ya mira las dos listas; este gate debe comprobar
     * las dos tambien, o declararia INJUGABLE una carta perfectamente jugable. */
    const named = e.mayAddPowerFromAligns;
    const okByAlign = named.filter(a => groupsWithAlign(a).length > 0);
    const okByAttr = named.filter(a => groupsWithAttr(a).length > 0);
    ok(okByAlign.length + okByAttr.length > 0,
       'carta "' + c.name + '" admite refuerzo de ' + JSON.stringify(named) +
       ' y ninguno de esos nombres existe ni como ideologia ni como atributo');
    const inert = named.filter(a => groupsWithAlign(a).length === 0 && groupsWithAttr(a).length === 0);
    if (inert.length) {
      console.log('     AVISO (dato, no fallo): "' + c.name + '" menciona ' + JSON.stringify(inert) +
                  ' que no es ni ideologia ni atributo del mazo; la parte utilizable de la ' +
                  'lista es ' + JSON.stringify(okByAlign.concat(okByAttr)) + '.');
    }
  }
  if (typeof e.value === 'number') {
    checkedFields.value = true;
    ok(isFinite(e.value) && e.value > 0,
       'carta "' + c.name + '" declara value=' + e.value + ', que no es un Poder valido');
  }
}
console.log('     campos calificadores verificados: ' + JSON.stringify(Object.keys(checkedFields).sort()));

/* ===========================================================================
 * 5. TEXTO — una carta clasificada sin texto impreso es una regla inventada
 * =========================================================================== */
section('5. Texto: ninguna carta clasificada sin el texto impreso que la autoriza');
/* P1-019: KNOWN_TEXT_GAPS son 4 Groups que el OCR dejo sin `text` pero que conservan
 * `referenceText`. No son cartas clasificadas, asi que no entran en este bucle; se
 * declaran aparte y se avisa si aparece alguna otra sin texto. */
for (const id of Object.keys(KNOWN_TEXT_GAPS)) {
  const c = C.byId[id];
  if (!c) { ok(false, 'KNOWN_TEXT_GAPS declara "' + id + '" pero el mazo no tiene esa carta'); continue; }
  ok(String(c.referenceText || '').length >= 20,
     'KNOWN_TEXT_GAPS declara "' + c.name + '" como hueco de texto, pero su referenceText esta ' +
     'vacio: entonces no es un hueco de OCR sino un hueco real de fuente.');
}
for (const c of C.cards) {
  const t = String(c.text || '');
  if (t.length === 0) {
    ok(Object.prototype.hasOwnProperty.call(KNOWN_TEXT_GAPS, c.id),
       'carta "' + c.name + '" (idx ' + c.idx + ') se queda sin texto y no esta declarada en ' +
       'KNOWN_TEXT_GAPS. La UI no podra mostrarla; declarala con el motivo o transcribe su texto.');
    continue;
  }
  if (!IMPLEMENTED_STATUSES.has(c.mechanicsStatus)) continue;
  ok(t.length >= 20,
     'carta clasificada "' + c.name + '" tiene un texto de ' + t.length +
     ' caracteres. Sin el texto impreso no se puede defender la mecanica.');
  if (c.effect && typeof c.effect.t === 'string') {
    ok(c.effect.t.length >= 20,
       'carta clasificada "' + c.name + '" tiene effect.t de ' + c.effect.t.length +
       ' caracteres; la tabla de clasificacion debe llevar el texto impreso.');
  }
}
console.log('     huecos de texto declarados: ' + JSON.stringify(Object.keys(KNOWN_TEXT_GAPS)));

/* P1-DATA-04: la transcripcion OCR del runtime trunca a media frase un porcentaje
 * sustancial de las Plots/Resources. `applySecondaryText()` en gen_cards.js anade
 * `textFull` con el texto de un SEGUNDO pase de OCR sobre la misma impresion
 * (research/audit_reports/scribd_card_text.json) cuando ese texto es mas largo,
 * y NUNCA sobrescribe `text` (la UI lo muestra y el motor no lo lee).
 *
 * Estos asertos comprueban la INVARIANTE que hace seguro ese campo:
 *   1. si existe `textFull`, es estrictamente mas largo que `text` (criterio `>`);
 *   2. `textSource` dice de donde salio;
 *   3. `textChars` es consistente con las longitudes reales, para que el dato de
 *      evidencia no pueda mentir sobre cuanto se recupero.
 * Y que ninguna carta clasificada se quede sin texto utilizable entre los dos. */
let withFull = 0;
let fullChars = 0;
for (const c of C.cards) {
  if (typeof c.textFull === 'string') {
    withFull++;
    fullChars += c.textFull.length - String(c.text || '').length;
    const ocrLen = String(c.text || '').length;
    ok(c.textFull.length > ocrLen,
       'carta "' + c.name + '" tiene textFull de ' + c.textFull.length +
       ' caracteres y text de ' + ocrLen + '. applySecondaryText solo debe escribir ' +
       'textFull cuando la fuente secundaria es ESTRICTAMENTE mas larga; si son iguales, ' +
       'no hay nada que ganar y duplicar el texto solo infla el dataset.');
    ok(c.textSource === 'secondary',
       'carta "' + c.name + '" tiene textFull pero textSource=' + JSON.stringify(c.textSource) +
       '. Sin la fuente declarada, la evidencia no es rastreable.');
    ok(c.textChars && c.textChars.ocr === ocrLen && c.textChars.secondary === c.textFull.length,
       'carta "' + c.name + '" tiene textChars=' + JSON.stringify(c.textChars) +
       ' incoherente con text(' + ocrLen + ') y textFull(' + c.textFull.length + ').');
  }
  if (!IMPLEMENTED_STATUSES.has(c.mechanicsStatus)) continue;
  /* Los 4 KNOWN_TEXT_GAPS ya se declaran y se verifican mas arriba: son Grupos que el
   * OCR dejo sin `text` pero conservan `referenceText`. Exigirles tambien `textFull`
   * seria exigirles una transcripcion que la fuente secundaria tampoco trae. */
  if (Object.prototype.hasOwnProperty.call(KNOWN_TEXT_GAPS, c.id)) continue;
  const usable = String(c.text || '').length >= 20 || String(c.textFull || '').length >= 20;
  ok(usable,
     'carta clasificada "' + c.name + '" (idx ' + c.idx + ') no tiene ni text ni textFull de 20 ' +
     'caracteres: no hay texto impreso que autorice su mecanica.');
}
console.log('     cartas con texto secundario recuperado: ' + withFull +
            ' (+' + fullChars + ' caracteres)');

/* ===========================================================================
 * 6. SIN MEDIO ESTADO — `unverified` no puede esconder un kind ya implementado
 * =========================================================================== */
section('6. Sin medio estado: ninguna carta queda con kind implementado y status unverified');
for (const c of C.cards) {
  const k = (c.effect && c.effect.kind) || '';
  if (c.mechanicsStatus === 'unverified' || c.mechanicsStatus === 'source-text-unmapped') {
    /* P1-019, correccion del gate: se admiten los kinds que tienen un modelo propio
     * documentado y NO son "mecanica a medio hacer":
     *  - '' / 'unverified' / 'ability_unverified': la carta sigue sin clasificar.
     *  - 'illu_special': los poderes de las Illuminati los leen illuEff() y compañía.
     *  - 'goal': §24.2. De las 7 cartas Goal, 3 son condiciones de victoria ya
     *    implementadas (Criminal Overlords, Fratricide, Hail Eris!, que
     *    goalMetFor() resuelve vía goalCardObjective) y 4 son modificadores
     *    declarados pendientes de motor. El status `source-text-unmapped` con kind
     *    `goal` describe EXACTAMENTE ese estado mixto y es coherente. */
    const ALLOWED = k === 'unverified' || k === 'ability_unverified' || k === '' ||
                    k === 'illu_special' || k === 'goal';
    ok(ALLOWED,
       'carta "' + c.name + '" tiene status=' + c.mechanicsStatus + ' pero kind=' + k +
       '. O el status esta equivocado, o el kind declara una mecanica que el motor no ejecuta. ' +
       ' rejectUnverifiedCard la bloquearia en tiempo de juego: estado incoherente.');
  }
}

/* ===========================================================================
 * 7. VOCABULARIO — los 10 alineamientos y los atributos usados siguen existiendo
 * =========================================================================== */
section('7. Vocabulario: ningun filtro puede quedar huerfano por una regresion de datos');
for (const a of CANON_ALIGNMENTS) {
  const n = groupsWithAlign(a).length;
  ok(n > 0, 'ningun grupo del mazo tiene la alineacion ' + a +
             '. Toda carta clasificada que la exija seria injugable y ' +
             'la meta de Discordian ("un grupo weird cuenta doble") seria inalcanzable.');
}
const usedAttrs = new Set();
for (const c of C.cards) {
  if (!IMPLEMENTED_STATUSES.has(c.mechanicsStatus)) continue;
  const e = c.effect || {};
  [e.targetAttr, e.requireAttr, e.rejectAttr, e.churchAttr, e.requireActionFromAttr]
    .forEach(v => { if (typeof v === 'string') usedAttrs.add(v); });
  (e.requireAttrAny || []).forEach(v => { if (typeof v === 'string') usedAttrs.add(v); });
}
for (const a of Array.from(usedAttrs).sort()) {
  const n = groupsWithAttr(a).length;
  ok(n > 0, 'ningun grupo del mazo tiene el atributo ' + a +
             ', pero hay cartas implementadas que lo exigen o lo rechazan');
}
console.log('     alineaciones canonicas: ' + CANON_ALIGNMENTS.length +
            ' · atributos usados por cartas clasificadas: ' + JSON.stringify(Array.from(usedAttrs).sort()));

/* ===========================================================================
 * 8. BLOQUEOS CONGELADOS — las seis cartas bloqueadas siguen sin clasificar
 * =========================================================================== */
section('8. Bloqueos congelados: las cartas bloqueadas NO pueden clasificarse sin su subsistema');
for (const id of Object.keys(BLOCKED_CARDS)) {
  const c = C.byId[id];
  if (!c) {
    ok(false, 'BLOCKED_CARDS declara "' + id + '" pero el mazo no tiene esa carta');
    continue;
  }
  ok(
    !IMPLEMENTED_STATUSES.has(c.mechanicsStatus),
    'carta "' + c.name + '" esta clasificada (' + c.mechanicsStatus + '), pero sigue bloqueada: ' +
    BLOCKED_CARDS[id] + '. Si el subsistema ya existe, BORRALA de BLOCKED_CARDS y explica en la ' +
    'auditoria que se cerro. Clasificarla sin el subsistema produce una carta decorativa.'
  );
}
console.log('     cartas congeladas: ' + Object.keys(BLOCKED_CARDS).length);

/* =========================================================================== */
console.log('');
if (failures.length) {
  console.log('FASE 4 COVERAGE FAILED (' + failures.length + ')');
  failures.forEach(f => console.log('  X - ' + f));
  process.exitCode = 1;
} else {
  console.log('FASE 4 COVERAGE PASSED (' + implementedCount + ' cartas clasificadas, ' +
              pending + ' Plots/Resources sin mecanica (techo ' + MAX_PENDING_PLR + '), ' +
              declaredDead.length + ' ramas muertas declaradas, ' +
              Object.keys(BLOCKED_CARDS).length + ' cartas bloqueadas congeladas, ' +
              Object.keys(KNOWN_TEXT_GAPS).length + ' huecos de texto declarados)');
}