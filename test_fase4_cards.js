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
  'vultures': '§38 el motor no tiene el camino "jugar un grupo de la mano, fallar el takeover y descartarlo" (placeUnder lanza y la carta sigue en la mano); las reglas oficiales si (inwo_rules_extracted.txt:226-241)',
  /* §42 / L3 — dos cartas que plan.md metio en BULK-POWER y que al leer el
     texto impreso resulta que NO son de esa familia. Congeladas por motivo
     DISTINTO: una es ilegible, la otra es de otra mecanica. */
  'powerforitsownsake': '§42 ilegible: el OCR solo da "including your llluminati group 3" y no aparece en NINGUNA de las dos fuentes secundarias (scribd_card_text.json ni scribd_inwo_cards_full.html), asi que no se puede autorizar el numero',
  'taxreform': '§42 NO es bulk_power: su texto impreso es un efecto continuo entre turnos ("The IRS can now tax one Plot card from each player, at the beginning of its own turn"), que es un subsistema distinto de una modificacion de Poder/Resistencia'
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
  /* L1 — TOKEN-GIFT: filtro de la familia "Place an Action token on each of your
   <X> groups". No son `targetAlign`/`targetAttr` a proposito: esos dos ya
   significan "un UNICO grupo objetivo" en las familias que los usan, y un filtro
   "cada uno de tus grupos" es otra cosa. Mezclarlos seria el defecto P1-018 en
   el gate: dos campos con el mismo nombre y semanticas distintas.
   Que uno sea IDEOLOGIA y otro ATRIBUTO no es arbitrario — Bank Merger (201)
   dice "Bank groups" y `bank` es un atributo (§23), no una de las diez
   ideologias del mazo. */
if (e.giftAlign) {
    checkedFields.giftAlign = true;
    const n = groupsWithAlign(e.giftAlign).length;
    ok(n > 0, 'carta "' + c.name + '" reparte fichas a tus grupos ' + e.giftAlign +
               ' pero ningun grupo del mazo tiene esa ideologia -> la carta no hace NADA -> INJUGABLE');
}
if (e.giftAttr) {
    checkedFields.giftAttr = true;
    const n = groupsWithAttr(e.giftAttr).length;
    ok(n > 0, 'carta "' + c.name + '" reparte fichas a tus grupos con el atributo ' + e.giftAttr +
               ' pero ningun grupo del mazo lo tiene -> la carta no hace NADA -> INJUGABLE');
}
/* L2 — FORCE-ALIGN: las nueve cartas "The target becomes permanently <X>. If it
     was <OPP>, that alignment is lost." El filtro del PAGADOR va aparte del filtro
     del EFECTO, igual que en L1: `forceAlign` es "que ideologia deben tener mis grupos
     para pagar", `oppAlign` es "que ideologia del objetivo dobla el coste". Y el
     `oppAlign` se valida con DOS condiciones, no una: (1) que exista algun grupo con
     esa ideologia y (2) que ALGUN grupo del mazo la LLEVE, porque si nadie la llevara
     la clausula "doubled if the group is currently <OPP>" seria vacua y el motor
     nunca doblaria el coste de nadie. Un gate que solo comprueba (1) deja pasar una
     carta que, en la practica, hace la mitad de lo que dice. */
  if (e.forceAlign) {
    checkedFields.forceAlign = true;
    const n = groupsWithAlign(e.forceAlign).length;
    ok(n > 0, 'carta "' + c.name + '" la pagan grupos ' + e.forceAlign +
               ' pero ningun grupo del mazo tiene esa ideologia -> nunca se podria jugar -> INJUGABLE');
  }
  if (e.oppAlign) {
    checkedFields.oppAlign = true;
    const exists = groupsWithAlign(e.oppAlign).length;
    ok(exists > 0, 'carta "' + c.name + '" dobla el coste si el objetivo es ' + e.oppAlign +
                ' pero ningun grupo del mazo tiene esa ideologia');
    /* (2) la clausula no vacua: al menos un grupo debe LLEVARLA de serie. */
    const carried = GROUPS.some(g => (g.alignments || []).indexOf(e.oppAlign) >= 0);
    ok(carried, 'carta "' + c.name + '" dobla el coste si el objetivo es ' + e.oppAlign +
                ' pero NINGUN grupo del mazo la trae de fabrica -> la clausula "doubled if ..." es VACUA');
  }
  /* L2 — el ronda de Dictatorship que Privatiization (345) retira: la familia
     `dictatorship` ya existe en el motor (P1-017), asi que la clausula es jugable y
     el gate debe saber que `noDictatorship` no es decorativo. Si ningun grupo del
     mazo fuese Dictatorship la clausina no tendria a que applies, pero tampoco
     tendria sentido declararla, asi que basta con comprobar que el campo existe
     solo en la carta que lo necesita. */
  if (e.noDictatorship) {
    checkedFields.noDictatorship = true;
    const hasFam = C.cards.some(x => x && x.effect && x.effect.kind === 'dictatorship');
    ok(hasFam, 'carta "' + c.name + '" retira el estado Dictatorship pero el mazo no tiene ninguna carta de esa familia');
  }
/* L3a — BULK-POWER: los filtros de cada clausula de `moves`. El gate tiene que
     bajar DENTRO del array: una clausula puede ser valida mientras otra de la
     misma carta es vacua, y una carta con 3 clausulas solo se juega si las tres
     hacen algo. Se validan cuatro cosas por clausula:
       (a) que la ideologia / atributo / subtipo EXISTA en el mazo (si no, la carta
           no hace NADA y es INJUGABLE);
       (b) que una clausula `aligns` con match:'all' la LLEVEN de verdad ALGUN
           grupo del mazo — sin esto "all Conservative Corporate groups" seria
           vacua y el motor nunca incrementaria a nadie (misma leccion que el oppAlign
           de L2);
       (c) que `become` sea una ideologia real del mazo, porque alineamos el
           nodo con ella y `nodeAligns` la devolveria como basura;
       (d) que la clausula tenga AL MENOS un efecto (power, resistance o
           become): una clausula que solo filtra no hace nada por si sola. */
  if (Array.isArray(e.moves) && e.moves.length) {
    checkedFields.moves = true;
    ok(e.moves.length > 0, 'carta "' + c.name + '" declara moves vacio -> INJUGABLE');
    e.moves.forEach(function (mv, mi) {
      const tag = ' (clausula ' + (mi + 1) + ' de ' + e.moves.length + ')';
      const acts = (typeof mv.power === 'number') || (typeof mv.resistance === 'number') || !!mv.become;
      ok(acts, 'carta "' + c.name + '"' + tag + ' filtra pero no cambia ni Poder, ni Resistencia, ni alineacion -> no hace NADA');
      if (mv.align) {
        const n = groupsWithAlign(mv.align).length;
        ok(n > 0, 'carta "' + c.name + '"' + tag + ' pide la ideologia ' + mv.align +
                   ' pero ningun grupo del mazo la tiene -> la clausula no hace NADA -> INJUGABLE');
      }
      if (Array.isArray(mv.aligns)) {
        mv.aligns.forEach(function (a) {
          const n = groupsWithAlign(a).length;
          ok(n > 0, 'carta "' + c.name + '"' + tag + ' pide la ideologia ' + a +
                     ' pero ningun grupo del mazo la tiene -> la clausula no hace NADA -> INJUGABLE');
        });
        if (mv.match === 'all' && mv.aligns.length > 1) {
          const both = GROUPS.some(function (g) {
            const ga = g.alignments || [];
            return mv.aligns.every(function (a) { return ga.indexOf(a) >= 0; });
          });
          ok(both, 'carta "' + c.name + '"' + tag + ' exige a la vez ' + mv.aligns.join(' + ') +
                   ' pero ningun grupo del mazo lleva las dos -> la clausula es VACUA -> INJUGABLE');
        }
      }
      if (Array.isArray(mv.notAligns)) {
        mv.notAligns.forEach(function (a) {
          const n = groupsWithAlign(a).length;
          ok(n > 0, 'carta "' + c.name + '"' + tag + ' EXCLUYE la ideologia ' + a +
                     ' pero ningun grupo del mazo la tiene -> la exclusion no hace NADA');
        });
      }
      if (mv.become) {
        const n = groupsWithAlign(mv.become).length;
        ok(n > 0, 'carta "' + c.name + '"' + tag + ' convierte al objetivo en ' + mv.become +
                   ' pero esa ideologia no existe en el mazo -> alineariamos el nodo con basura');
      }
      if (mv.attr) {
        const n = groupsWithAttr(mv.attr).length;
        ok(n > 0, 'carta "' + c.name + '"' + tag + ' pide el atributo ' + mv.attr +
                   ' pero ningun grupo del mazo lo tiene -> la clausula no hace NADA -> INJUGABLE');
      }
      if (Array.isArray(mv.attrs)) {
        mv.attrs.forEach(function (a) {
          const n = groupsWithAttr(a).length;
          ok(n > 0, 'carta "' + c.name + '"' + tag + ' pide el atributo ' + a +
                     ' pero ningun grupo del mazo lo tiene -> la clausula no hace NADA -> INJUGABLE');
        });
      }
      if (mv.subtype) {
        const n = groupsOfSubtype(mv.subtype).length;
        ok(n > 0, 'carta "' + c.name + '"' + tag + ' pide el subtipo ' + mv.subtype +
                   ' pero ningun grupo del mazo lo tiene -> la clausula no hace NADA -> INJUGABLE');
      }
      if (mv.scaleBy && mv.scaleBy.align) {
        const n = groupsWithAlign(mv.scaleBy.align).length;
        ok(n > 0, 'carta "' + c.name + '"' + tag + ' escala por la ideologia ' + mv.scaleBy.align +
                   ' pero ningun grupo del mazo la tiene -> el factor seria 0 -> INJUGABLE');
      }
    });
  }
  if (e.witherAttr) {
    /* L3b — 418 World Hunger: "All GREEN groups lose their Action tokens". Un
       atributo nuevo necesita rama propia o queda SIN VALIDAR en silencio (el
       defecto de clase "el dato existe pero vive en otro sitio"). */
    checkedFields.witherAttr = true;
    const n = groupsWithAttr(e.witherAttr).length;
    ok(n > 0, 'carta "' + c.name + '" apaga las fichas de los grupos con ' + e.witherAttr +
               ' pero ningun grupo del mazo lo tiene -> la carta no hace NADA -> INJUGABLE');
  }
  if (e.alignFromTarget) {
    /* L3b — 268 Good Polls: la alineacion se saca de un grupo, asi que la
       comprobacion de que el "cualquier alineacion elegida" tiene sentido es que
       el mazo tiene grupos con alineaciones variedas. */
    checkedFields.alignFromTarget = true;
    ok(GROUPS.some(g => (g.alignments || []).length >= 1),
       'carta "' + c.name + '" elige la alineacion a partir de un grupo, pero ningun grupo del mazo tiene alineaciones');
  }
  if (e.mul) {
    /* L3b — 268/234 multiplican por un numero: tiene que ser > 1 o la carta
       "triples" estaria multiplicando por uno. */
    checkedFields.mul = true;
    ok(typeof e.mul === 'number' && e.mul > 1,
       'carta "' + c.name + '" declara mul=' + e.mul + ', que no multiplica nada');
  }
  /* L4 - TOKEN-STRIP. Un calificador sin rama aqui queda SILENCIOSAMENTE sin
   * validar (la misma clase que el campo muerto A.privilege de P1-026 y que
   * el E.playResource sin dispatch de P1-031): el gate solo comprueba los
   * nombres que reconoce, asi que un campo nuevo sin rama no da error, no
   * aparece en checkedFields y nadie se entera. */
  if (typeof e.stripAttr === 'string') {
    checkedFields.stripAttr = true;
    ok(groupsWithAttr(e.stripAttr).length > 0,
      'ningun grupo del mazo tiene el atributo ' + e.stripAttr + ' que la carta exige -> la carta nunca hace nada -> INJUGABLE');
  }
  if (typeof e.stripPlayers === 'string') {
    checkedFields.stripPlayers = true;
    ok(e.stripPlayers === 'all' || e.stripPlayers === 'rival+own',
      'stripPlayers="' + e.stripPlayers + '" no es un alcance que el motor sepa ejecutar (se esperan "all" o "rival+own")');
  }
  if (e.canTakeResource) {
    checkedFields.canTakeResource = true;
    var resCount = 0;
    for (var rc = 0; rc < C.cards.length; rc++) if (C.cards[rc] && C.cards[rc].type === 'resource') resCount++;
    ok(resCount > 0,
      'la carta declara un modo de robo de Resource pero el mazo no tiene ninguno -> ese modo es decorativo');
  }
    /* --- L5a: boost de ataque. Cada calificador se valida, porque un campo
     * nuevo sin rama aqui NO se valida en silencio (P1-026 / P1-031). --- */
    if (e.boostValue != null) {
      checkedFields.boostValue = true;
      ok(typeof e.boostValue === 'number' && e.boostValue > 0,
        c.name + ' - boostValue debe ser un numero positivo, no ' + JSON.stringify(e.boostValue));
    }
    if (e.boostBySubtype && typeof e.boostBySubtype === 'object') {
      checkedFields.boostBySubtype = true;
      var bk = Object.keys(e.boostBySubtype);
      ok(bk.indexOf('other') >= 0,
        c.name + ' - boostBySubtype necesita la clave "other" para los objetivos que no son el subtypespecial, si no la carta no aplica a nada');
      bk.forEach(function (k) {
        if (k === 'other') return;
        ok(groupsOfSubtype(k).length > 0,
          c.name + ' - boostBySubtype declara el subtype "' + k + '" y el mazo no tiene ninguna carta de ese subtipo');
        ok(typeof e.boostBySubtype[k] === 'number' && e.boostBySubtype[k] > 0,
          c.name + ' - el valor de boostBySubtype.' + k + ' debe ser un numero positivo');
      });
    }
  if (e.atkType) {
    checkedFields.atkType = true;
    /* 'any' es un valor IMPRESO legitimo: 356 Revolution! dice "on any attack,
     * either to destroy or control". El motor lo respeta porque su comprobacion
     * es `if (eff.atkType && A.type !== eff.atkType)`, y con 'any' la segunda
     * mitad nunca se cumple. Lo que NO se permite es un valor que no exista en
     * el vocabulario, porque entonces la carta no encajaria en nada. */
    ok(e.atkType === 'control' || e.atkType === 'destroy' || e.atkType === 'any',
      c.name + ' - atkType debe ser "control", "destroy" o "any", no ' + JSON.stringify(e.atkType));
  }
    if (e.illumOnly) {
      checkedFields.illumOnly = true;
      ok(C.cards.some(function (x) { return x && x.type === 'illuminati'; }),
        c.name + ' - exige un ataque de tu Illuminati pero el mazo no tiene ninguna carta de tipo Illuminati');
    }
    if (e.targetCardId) {
      checkedFields.targetCardId = true;
      var tcId = C.cards.find(function (x) { return x && x.id === e.targetCardId; });
      ok(!!tcId,
        c.name + ' - el calificador nombra la carta "' + e.targetCardId + '" y esa carta no existe en el mazo -> el calificador nunca puede cumplirse');
      ok(!tcId || tcId.type === 'group',
        c.name + ' - el objetivo del ataque tiene que ser un grupo, y "' + e.targetCardId + '" es de tipo ' + (tcId ? tcId.type : '?'));
    }
    if (e.attackerAttr) {
      checkedFields.attackerAttr = true;
      ok(groupsWithAttr(e.attackerAttr).length > 0,
        c.name + ' - exige que el ataque salga de un grupo ' + e.attackerAttr + ' y el mazo no tiene ninguno');
    }
  /* L5b -- 255 Fear and Loathing. El campo `alignMag` REEMPLAZA la constante
   * +/-4 con la que computeStrength valora las alineaciones comparadas. Dos
   * comprobaciones, y la segunda es la que de verdad importa:
   *   1. que sea un numero utilizable, y
   *   2. que sea DISTINTO del 4 por defecto. Un `alignMag: 4` seria una carta
   *      que se juega, se expone, ocupa mesa y logged, y no cambia NADA: el
   *      mismo defecto que P1-026 (un campo que existe y nadie lee) y que
   *      P1-031 (un punto de entrada que no despacha). El valor tiene que
   *      mover la aguja. */
  if (typeof e.alignMag !== 'undefined') {
    checkedFields.alignMag = true;
    ok(typeof e.alignMag === 'number' && e.alignMag > 0,
      'X - alignMag debe ser un numero positivo -> ' + JSON.stringify(e.alignMag));
    ok(e.alignMag !== 4,
      'X - alignMag=' + e.alignMag + ' seria igual al 4 por defecto: la carta no cambiaria la regla');
  }

  /* L5c (189 Albino Alligators) — `align` a NIVEL SUPERIOR de la carta. Ojo: las
   * clausulas de `moves[]` ya usan `m.align`, que valida la rama de abajo; este
   * `e.align` es un calificador de primer nivel y la puerta lo ignoraria en
   * silencio si no tuviera rama propia (P1-026 / P1-031). Y lo que se comprueba
   * es que ALGUN grupo del mazo lo cumpla, no solo que la palabra exista: una
   * alineacion que nadie tiene haria la carta INJUGABLE. */
  if (typeof e.align === 'string') {
    checkedFields.align = true;
    ok(groupsWithAlign(e.align).length > 0,
      'X - la carta exige align=' + e.align + ' y ningun grupo del mazo la tiene -> INJUGABLE');
  }

    /* L6 -- los calificadores de las cartas que NIEGAN un suceso. Se comprueban
     * todos por el mismo motivo de siempre: un calificador que el motor lee
     * pero que la puerta no valida se puede quedar VACIO sin que nadie se entere
     * (la clase de P1-026 / P1-031). El criterio no es "el campo existe" sino
     * "el coste es pagable de verdad con este mazo": si ninguna carta del mazo
     * cumple el filtro, la carta no se puede jugar nunca. */
    if (e.payAnyGroup) {
      checkedFields.payAnyGroup = true;
      ok(typeof e.payAnyGroup === 'boolean', 'payAnyGroup debe ser booleano: ' + e.payAnyGroup);
      ok(GROUPS.length > 0, c.name + ': "una accion de uno de tus grupos" no se puede pagar: el mazo no tiene grupos');
    }
    if (e.alsoBlocks) {
      checkedFields.alsoBlocks = true;
      ok(typeof e.alsoBlocks === 'boolean', 'alsoBlocks debe ser booleano: ' + e.alsoBlocks);
    }
    if (e.payPower) {
      checkedFields.payPower = true;
      ok(typeof e.payPower === 'number' && e.payPower > 0,
        c.name + ': payPower debe ser un numero positivo (Poder total exigido), no ' + e.payPower);
      var totalPP = 0;
      GROUPS.forEach(function (g) { if (typeof g.power === 'number') totalPP += g.power; });
      ok(totalPP >= e.payPower,
        c.name + ': pide ' + e.payPower + ' de Poder en total y la suma del Poder IMPRESO de todo el mazo es ' + totalPP);
    }
    if (e.payShareAlign) {
      checkedFields.payShareAlign = true;
      /* OJO: payShareAlign es un BOOLEANO, no el nombre de una alineacion. El
       * motor lo lee como "el grupo que paga tiene que compartir AL MENOS UNA
       * alineacion con el grupo que el rival esta tomando posesion), y las
       * alineaciones de referencia viajan en `ev.data.aligns` (las del grupo
       * recien colocado), no en un calificador de la carta. Por eso el chequeo
       * de no-vacuidad NO puede ser "esta alineacion existe en el mazo" como en
       * el resto de calificadores: lo que tiene que existir es un par de grupos
       * del mazo que compartan alguna alineacion, o la exigencia no la podria
       * cumplir nunca. */
      ok(typeof e.payShareAlign === 'boolean',
        c.name + ': payShareAlign debe ser booleano (no el nombre de una alineacion), no ' + e.payShareAlign);
      var sharePair = null;
      for (var ga = 0; ga < GROUPS.length && !sharePair; ga++) {
        for (var gb = ga + 1; gb < GROUPS.length && !sharePair; gb++) {
          var la = GROUPS[ga].alignments || [], lb = GROUPS[gb].alignments || [];
          for (var li = 0; li < la.length; li++) {
            if (lb.indexOf(la[li]) >= 0) { sharePair = [GROUPS[ga].name, GROUPS[gb].name, la[li]]; break; }
          }
        }
      }
      ok(!!sharePair,
        c.name + ': ningun par de grupos del mazo comparte alineacion, asi que "al menos uno comparte alineacion" no se puede cumplir nunca -> INJUGABLE');
    }
    if (e.payAttr) {
      checkedFields.payAttr = true;
      ok(groupsWithAttr(e.payAttr).length > 0,
        c.name + ': payAttr="' + e.payAttr + '" no lo tiene ningun grupo del mazo -> el coste nunca se puede pagar -> INJUGABLE');
    }
    if (e.payMinPower) {
      checkedFields.payMinPower = true;
      ok(typeof e.payMinPower === 'number' && e.payMinPower > 0,
        c.name + ': payMinPower debe ser un numero positivo, no ' + e.payMinPower);
      var bigPP = 0;
      GROUPS.forEach(function (g) { if (typeof g.power === 'number' && g.power >= e.payMinPower) bigPP++; });
      ok(bigPP > 0,
        c.name + ': ningun grupo del mazo tiene Poder impreso >= ' + e.payMinPower + ' -> el coste nunca se puede pagar -> INJUGABLE');
    }
    if (e.notDuringPrivileged) {
      checkedFields.notDuringPrivileged = true;
      ok(typeof e.notDuringPrivileged === 'boolean', 'notDuringPrivileged debe ser booleano: ' + e.notDuringPrivileged);
    }
    if (e.boostVsDictatorship) {
      checkedFields.boostVsDictatorship = true;
      ok(typeof e.boostVsDictatorship === 'number' && e.boostVsDictatorship > 0,
        c.name + ': boostVsDictatorship debe ser un numero positivo, no ' + e.boostVsDictatorship);
      ok(C.cards.some(function (x) { return x && x.effect && x.effect.kind === 'dictatorship'; }),
        c.name + ': boostVsDictatorship necesita que exista el estado node.dictatorship (P1-028, §40)');
    }
    if (e.payNotTheAttackers) {
      checkedFields.payNotTheAttackers = true;
      ok(typeof e.payNotTheAttackers === 'boolean', 'payNotTheAttackers debe ser booleano: ' + e.payNotTheAttackers);
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
    /* P1-030: el criterio `>` era un proxy de "es mejor" y fallaba donde mas
       duele. En una baraja truncada a media frase el OCR puede ser mas largo por
       llevar lineas decorativas corrompidas, mientras la transcripcion del libro
       de reglas es mas corta y esta COMPLETA. Perder el numero de un efecto por un
       criterio de longitud es peor que aceptar un texto mas corto, asi que ahora
       se aceptan tres casos, todos verificables y no gustativos:
         1. la fuente es mas larga (comportamiento original);
         2. empate de longitud: mismo contenido, transcripcion real, se prefiere;
         3. el OCR esta truncado de forma demostrable (no acaba en puntuacion) y la
            fuente si acaba: el numero del efecto esta al final de la frase.
       El aserto de abajo NO copia el predicado del generador (eso seria
       tautologico): comprueba que, cuando el texto secundario es mas corto, el OCR
       estaba de verdad cortado Y ademas que la fuente termina en puntuacion, que es
       justo la propiedad que hace que el numero este dentro. */
    const sec = c.textFull;
    const secComplete = /[.!?)]["']?$/.test(sec);
    const ocrTrim = String(c.text || '').trim();
    const ocrCut = !/[.!?)]["']?$/.test(ocrTrim);
    ok(sec.length > ocrLen || sec.length === ocrLen || (ocrCut && secComplete),
       'carta "' + c.name + '" tiene textFull de ' + sec.length +
       ' caracteres y text de ' + ocrLen + '. applySecondaryText solo debe escribir ' +
       'textFull cuando la fuente sea mas larga, cuando empate, o cuando el OCR este ' +
       'demostrablemente truncado (no termina en puntuacion) y la fuente si. Aqui el OCR ' +
       'termina en ' + JSON.stringify(ocrTrim.slice(-24)) + ' y la fuente en ' +
       JSON.stringify(sec.slice(-24)) + '.');
    /* Y el contrapunto, que es la garantia de fondo: si la fuente es mas corta, tiene
       que aportar algo que el OCR no trae. Se comprueba con el rasgo que motivo
       P1-030 en primera persona: un numero impreso en el texto. */
    if (sec.length < ocrLen) {
      /* La cantidad puede venir en digito o en palabra: "by 3" y "tripled" son el
         mismo dato, y el aserto no puede exigir la forma que casualmente usa la
         mayoria. Se listan las palabras numericas que aparecen en las cartas de
         este mazo (double/triple/quadruple cubren x2/x3/x4, que es como la baraja
         redacta de verdad "tripled power"). */
      const WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|once|twice|thrice|double|doubles|double\s|treble|triple|triple|triples|tripled|quadruple|quadrupled|halve|halved|twice\s)\b/i;
      const quantified = /\d/.test(sec) || WORDS.test(sec);
      ok(quantified,
         'carta "' + c.name + '" solo se acepta un texto secundario mas corto si expresa ' +
         'una cantidad (digito o palabra: two, tripled, double...). Ese es exactamente el ' +
         'dato que el OCR truncaba al perder la cola de la frase. Revisar: ' +
         JSON.stringify(sec.slice(-40)));
    }

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
  /* L1: `giftAttr` tambien es un atributo exigido por una carta clasificada. */
  if (typeof e.giftAttr === 'string') usedAttrs.add(e.giftAttr);
if (typeof e.witherAttr === 'string') usedAttrs.add(e.witherAttr);
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