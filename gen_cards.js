// gen_cards.js — Sisyphus self-build. Reads game/js/images.js manifest +
// research/cards_parsed.json (official SJG list) and emits game/js/cards.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = __dirname;
const ctx = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/js/images.js'), 'utf8'), ctx);
const manifest = ctx.window.INWO_IMAGE_FILES;
const ocrContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/js/cardtexts_data.js'), 'utf8'), ocrContext);
const OCR = ocrContext.window.INWO_OCR || {};
const parsedRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/cards_parsed.json'), 'utf8'));
const parsedArr = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw.cards || Object.values(parsedRaw)[0]);
const mergePath = path.join(ROOT, 'research/audit_reports/card_data_merge.json');
const mergeRaw = fs.existsSync(mergePath) ? JSON.parse(fs.readFileSync(mergePath, 'utf8')) : { cards: {} };
// SEGUNDA FUENTE DE ATRIBUTOS (P2-DATA-01): transcripción secundaria del
// documento archivado de Scribd. El OCR local no contiene las palabras de
// atributo en 52 cartas (p.ej. "Coastal" nunca aparece en el texto reconocido
// de Japan), así que el único camino para recuperar el vocabulario oficial es
// fusionar los atributos que sí trae esa fuente. Sigue el mismo patrón que
// card_data_merge.json: índice por nombre normalizado + unión, nunca reemplazo.
const scribdPath = path.join(ROOT, 'research/audit_reports/scribd_card_text.json');
const scribdRaw = fs.existsSync(scribdPath) ? JSON.parse(fs.readFileSync(scribdPath, 'utf8')) : { cards: [] };
const scribdArr = Array.isArray(scribdRaw) ? scribdRaw : (scribdRaw.cards || []);

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const mergeCards = {};
for (const row of Object.values(mergeRaw.cards || {})) {
  if (!row || (!row.id && !row.name)) continue;
  const rowKey = norm(row.id || row.name);
  mergeCards[rowKey] = row;
  if (row.name) mergeCards[norm(row.name)] = row;
}
const scribdCards = {};
for (const row of scribdArr) {
  if (!row || !row.name) continue;
  scribdCards[norm(row.name)] = row;
}
// P1-030 - TERCERA FUENTE DE TEXTO (parche de datos, independiente del motor).
// El OCR local de esta baraja esta TRUNCADO a mitad de frase en 10 cartas, y lo
// que se pierde es justamente el numero: "Increase the Power of all Corporate
// groups by" se corta antes del "3". No es un fallo del OCR sino que la segunda
// fuente (scribd_card_text.json, 323 cartas) se construyo a partir de OTRO
// scraping y no contiene esas 10 cartas, aunque el texto completo si esta en
// disco, en research/scribd_inwo_cards_full.html.
//
// Ese HTML es un volcado del libro de reglas: cada carta es un parrafo
// "<p>NEW WORLD ORDER <Nombre> <sabores> <reglas></p>". Se parsea aqui para
// cerrar el hueco. Reglas de la fusion:
//   1. NUNCA se sobreescribe scribd_card_text.json, que es la fuente curada y
//      mas rica (trae power, resistance, alignments, attributes). Solo se anade
//      lo que falte.
//   2. El emparejamiento es por nombre normalizado (solo alfanumerico, sin
//      distincion de mayusculas ni de apostrofos), de modo que el HTML pueda
//      escribir "Dont Forget" donde la carta se llama "Don't Forget".
//   3. applySecondaryText sigue exigiendo que la fuente sea ESTRICTAMENTE mas
//      larga que el OCR, asi que una coincidencia mas corta no pisa nada.
const scribdHtmlPath = path.join(ROOT, 'research/scribd_inwo_cards_full.html');
if (fs.existsSync(scribdHtmlPath)) {
  const html = fs.readFileSync(scribdHtmlPath, 'utf8');
  // Nombres candidatos: la lista oficial de SJG, mas lo que ya aportan las otras
  // fuentes. Se ordenan por longitud descendente para que "Military Industrial
  // Complex" gane a un nombre mas corto que sea su prefijo.
  const namePool = new Set();
  for (const row of parsedArr) if (row && row.name) namePool.add(row.name);
  for (const row of Object.values(mergeRaw.cards || {})) if (row && row.name) namePool.add(row.name);
  for (const row of scribdArr) if (row && row.name) namePool.add(row.name);
  const cands = Array.from(namePool).filter(Boolean).sort((a, b) => b.length - a.length);
  const plain = h => String(h)
    .replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let recovered = 0;
  for (const block of html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []) {
    if (block.indexOf('NEW WORLD ORDER') < 0) continue;
    let body = plain(block).replace(/^NEW WORLD ORDER\s*/i, '').trim();
    if (!body) continue;
    const nb = norm(body);
    for (const nm of cands) {
      const nn = norm(nm);
      if (!nn || nb.indexOf(nn) !== 0) continue;
      // nn es prefijo de nb: se avanza sobre el texto ORIGINAL mientras se
      // acumule exactamente nn.length caracteres normalizados, para obtener el
      // punto de corte real y no perder acentos ni signos.
      let acc = 0, cut = 0;
      while (cut < body.length && acc < nn.length) {
        if (/[a-z0-9]/i.test(body[cut])) acc++;
        cut++;
      }
      const rest = body.slice(cut).trim();
      if (!rest) continue;
      const key = norm(nm);
      if (scribdCards[key]) continue;   // la fuente JSON gana siempre
      scribdCards[key] = { id: key, name: nm, sourceText: rest, description: '', source: 'scribd_html' };
      recovered++;
      break;
    }
  }
  if (recovered) console.log('texto secundario recuperado del HTML de Scribd: ' + recovered);
}// name-key -> official type from SJG list
const offType = {};
for (const r of parsedArr) {
  if (!r || !r.name || !r.type) continue;
  const t = r.type;
  if (['Type', 't box'].includes(t)) continue;
  offType[norm(r.name.split('(')[0])] = t; // strip "(Limited)" style suffixes
}

// ---- Verified stats (CMU Ralph game log cross-check) ----
const V = {
  'A.M.A.': [3,4,['peaceful','conservative','science']],
  'BATF': [3,2,['violent','government']],
  'Brazil': [5,3,['government','huge']],
  'CIA': [6,5,['government','violent']],
  'Canada': [3,4,['peaceful','liberal','government','huge']],
  'Congressional Wives': [4,4,['conservative','straight']],
  'England': [6,2,['government','huge']],
  'Finland': [6,5,['liberal','government','computer']],
  'France': [3,5,['liberal','government','huge']],
  'Fraternal Orders': [5,5,['conservative']],
  'Fred Birch Society': [4,4,['conservative','straight']],
  'Germany': [4,3,['conservative','government','huge']],
  'Hawaii': [0,2,[]],
  'Japan': [6,4,['peaceful','government','computer']],
  'Libertarians': [4,4,['fanatic']],
  'Local Police': [4,4,['straight','violent','conservative']],
  'Mossad': [2,1,['violent','government']],
  'NSA': [5,2,['government','computer']],
  'Nephews of God': [1,1,['conservative','fanatic']],
  'New York': [7,8,['government','violent','criminal']],
  'Nuclear Power Companies': [4,null,['conservative','corporate','science']],
  'Pentagon': [6,6,['government','violent','straight','conservative']],
  'Russia': [4,4,['violent','government','huge']],
  'Saddam Hussein': [5,4,['government','violent']],
  'Texas': [14,9,['government','violent','conservative','huge']],
  'Vatican City': [4,4,['peaceful','conservative']],
  'W.I.T.C.H.': [3,3,['weird','violent','fanatic','magic']],
  'Clone Arrangers': [6,2,['violent','criminal']],
  'Hackers': [3,2,['weird','fanatic']],
  'Society for Creative Anachronism': [1,null,['weird','liberal','violent','criminal']],
  'Autoduel Association': [1,null,['violent','weird']],
  'Wargamers': [1,null,['weird']],
  'Mafia': [6,null,['criminal','violent']],
};
const VERIFIED = {}; for (const k in V) VERIFIED[norm(k)] = V[k];

// ---- Illuminati (official B.4) ----
/* ---------------------------------------------------------------------------
   ILLUMINATI — Poder y metas leídos VERBATIM de las 18 cartas de
   `Illuminati/INWO - <Nombre> 1.png` (ver research/audit_reports/
   illuminati_transcription.json.md). La tabla anterior venía de un placeholder
   p=8 en 5 de 9 y de metas inventadas; las cartas mandan.

   Esquema de `e` (efecto en juego) y `g` (meta especial), que consumirá
   engine.js en la Fase 2:
     e.keepOnFailedControl  — si pierdes un Control contra un Grupo tuyo, no lo
                              pierdes: vuelve a tu mano.
     e.bonus                — {targetAlign|targetAttr|anyDestroy, control, destroy}
                              REGLA OFICIAL: "+N on any attempt" aplica solo a
                              TUS ataques, nunca al ayudar/oponer.
     e.privilegedPerTurn    — nº de ataques *privileged* por turno.
     e.organizeAtEndOfTurn — reorganizar la estructura libremente.
     e.plotHandLimit        — máximo de Plots en mano (5 por defecto).
     e.drawPlotAtStart      — Plots que robas al empezar el turno.
     e.drawPlotOnDestroy    — robar un Plot al destruir.
     e.defenseBonus         — {anyAttack:+N}EXTRA al defender.
     e.destroyOnly          — {aligns:[...], allowRivalIlluminati:bool}
                             NINGÚN otro Grupo puede ser destruido por ti.
     e.immuneToAligns       — estructura inmune a esos alineamientos.
     e.actionTokens         — tokens de acción por turno.
     e.tokensNotSameAttack  — los 2 tokens no pueden usarse en el mismo ataque.
     e.twice                — marca impresa «•TWICE•».
--------------------------------------------------------------------------- */
const ILL = {
  'Adepts of Hermes': {
    p:7, r:null,
    e:{kind:'illu_special',code:'adepts',
       keepOnFailedControl:true,
       bonus:{targetAttr:'magic',control:6,destroy:6}},
    g:{type:'basic',magicResourceCountsAsGroup:true},
    t:'If you fail an Attack to Control against a Group from your own hand, you do not lose the group . . . just return the card to your hand. The Adepts of Hermes have a +6 on any attempt to control or destroy a Magic group. GOAL: Each Magic Resource you control counts as one group toward the Basic Goal.'
  },
  'Bavarian Illuminati': {
    p:10, r:null,
    e:{kind:'illu_special',code:'bavarian',privilegedPerTurn:1},
    g:{type:'power_total',total:50},
    t:'Each turn, you may declare one of your attacks privileged. GOAL: Control a total Power of 50 or more, counting Bavaria\'s own Power.'
  },
  'Bermuda Triangle': {
    p:8, r:null,
    e:{kind:'illu_special',code:'bermuda',organizeAtEndOfTurn:true},
    g:{type:'power_total',total:35,needEachAlign:true},
    t:'You may reorganize your groups freely at the end of your turn. GOAL: Control a total Power of at least 35, counting Bermuda\'s own Power, and at least one group of each alignment. A group with more than one alignment counts for all its alignments.'
  },
  'Discordian Society': {
    p:7, r:null,
    e:{kind:'illu_special',code:'discordian',
       bonus:{targetAlign:'weird',control:4},
       immuneToAligns:['government','straight']},
    g:{type:'basic',double:{align:'weird',powerAtLeast:3}},
    t:'You have a +4 on any attempt to control Weird groups. Your power structure is immune to attacks from Government or Straight groups, and to all special abilities of these groups. GOAL: Any Weird group with a Power of 3 or more counts double toward your total number of groups controlled.'
  },
  'Gnomes of Zurich': {
    p:9, r:null,
    e:{kind:'illu_special',code:'gnomes',plotHandLimit:6,
       bonus:{targetAlign:'corporate',targetAttr:'bank',control:4}},
    g:{type:'basic',double:{align:'corporate',attr:'bank',powerAtLeast:4}},
    t:'You may hold 6 Plot cards in your hand, rather than the usual 5. You have a +4 on any attempt to control Corporate groups or Banks. GOAL: Any Corporate group or Bank with a Power of 4 or more counts double toward your total number of groups controlled.'
  },
  'Servants of Cthulhu': {
    p:9, r:null,
    e:{kind:'illu_special',code:'cthulhu',
       bonus:{anyDestroy:4,includesInstant:true},
       drawPlotOnDestroy:true},
    g:{type:'destroy_reduce',reducePerDestroy:1,winAt:8},
    t:'You have a +4 on any attempt to destroy, even with Disasters and Assassinations. Draw a Plot card whenever you destroy a group! GOAL: For every group you destroy, reduce by 1 the number of groups you need to control in order to win. You may also count rival Illuminati which you destroy by removing their last group. If you destroy 8 groups, you win, regardless of how many you control!'
  },
  'Shangri-La': {
    p:7, r:null,
    e:{kind:'illu_special',code:'shangrila',
       defenseBonus:{anyAttack:5},
       destroyOnly:{aligns:['violent'],allowRivalIlluminati:true}},
    g:{type:'peaceful_power_in_play',total:30,sharedVictory:true},
    t:'Any group in your Power Structure has an extra +5 to defend against any attack. You cannot destroy any groups except Violent ones and rival Illuminati. GOAL: Have Peaceful groups with a total Power of 30 in play, regardless of who controls them! If this happens, all Shangri-La players share the victory.'
  },
  'The Network': {
    p:8, r:null,
    e:{kind:'illu_special',code:'network',drawPlotAtStart:2},
    g:{type:'basic',double:{attr:'computer',powerAtLeast:3}},
    t:'You start your turn by drawing two Plot cards, rather than one. GOAL: Any Computer group with a Power of 3 or more counts double toward your total number of groups controlled.'
  },
  'The UFOs': {
    p:6, r:null,
    e:{kind:'illu_special',code:'ufos',actionTokens:2,tokensNotSameAttack:true,twice:true},
    g:{type:'goal_cards',max:3},
    t:'The UFOs have two actions per turn — they get two tokens! These may not be used in the same attack. GOAL: The UFOs can have up to 3 different Goal cards in play, and win with any of them.'
  },
};
const ILLN = {}; for (const k in ILL) { ILLN[norm(k)] = ILL[k]; } ILLN['ufos'] = ILL['The UFOs'];

/* ------------------------------------------------------------------ *
 * Goal cards (victory-plot family)
 * FIX 2026-09-26: these 4 names never had a PNG, so they were dead
 * entries and research/cards_parsed.json contains no Goal card at all
 * (its type labels are only Plot/Grp./Ill./Per./Res./Dis./Plc./Ass.).
 * That is why every Goal card fell through the switch(off) default
 * branch and was typed subtype:null. Names below are the 7 Goal cards
 * that actually exist as PNGs, verified against window.INWO_IMAGE_FILES
 * (421 entries, 0 missing on disk).  `worldwariii` was a typo.
 * ------------------------------------------------------------------ */
const GOALS = new Set(['criminaloverlords','fratricide','haileris',
  'militaryindustrialcomplex','peaceinourtime','worldwarthree','alternategoals']);

/* ------------------------------------------------------------------ *
 * ALIGNMENTS vs ATTRIBUTES
 * The card face has TWO bottom fields. Alignments sit bottom-left and
 * come from the official TEN (rulebook: "There are ten different
 * alignments. They are shown at the bottom left of Group cards.").
 * Attributes sit bottom-right in italic: "Certain 'attributes,' in
 * italic, may appear at the bottom right of a Group card... For
 * instance, Computer is an attribute. A card that affects 'all Computer
 * Groups' affects only those Groups with Computer in the lower right."
 * cards.js was collapsing both into one c.alignments array, so an
 * "all Computer groups" mechanic would also hit Government groups.
 * Measured over all 421 cards this split partitions perfectly.
 * P2-DATA-01: `green` figuraba aqui como basura de OCR porque solo aparecia en
 * 2 cartas (druids, joggers). La transcripcion secundaria (scribd) demuestra
 * que `green` es un atributo REAL en 6 cartas (Al Gore, Anti-Nuclear
 * Activists, California, Canada, Prince Charles, Underground Newspapers), asi
 * que salio de JUNK_TAGS. El vocabulario oficial completo son 9 terminos:
 * computer, magic, science, coastal, huge, bank, media, secret, green.
 * ------------------------------------------------------------------ */
const ALIGNMENTS10 = new Set(['government','corporate','liberal','conservative',
  'peaceful','violent','straight','weird','criminal','fanatic']);
const ATTRIBUTES = new Set(['computer','magic','science','coastal','huge',
  'bank','media','secret','green','nation','church','communist','space',
  'illusion','outworld']);
// bank/illusion/outworld: printed as attributes on some cards.
// media/secret/green added in P2-DATA-01 from the secondary transcription.
// nation/church/communist/space added in P2-DATA-02: the secondary
// transcription prints them in italics (11 Places are Nations, Vatican City is
// a Church, ...), and the Plot "World Cup Victory" says "+10 to any Nation you
// control", so without `nation` that card had no expressible target. Only the
// qualifier is consumed; no effect data references these four terms.
const JUNK_TAGS = new Set();   // P2-DATA-01: `green` salio de aqui (es atributo real)

/* ------------------------------------------------------------------ *
 * PLOT_FX — the 18 transcribed Disasters/Assassinations, verbatim.
 * Source: research/audit_reports/plot_transcription.md (read off the
 * card faces with look_at, one image per call).
 *
 * Rules shape (identical on all 13 Disasters):
 *   "This is an Instant Attack to Destroy any <selector>. It does not
 *    require an action. Its Power is <p> against <a>, <p> against <b>.
 *    If the attack succeeds, the target is Devastated. If the die roll
 *    succeeds by more than <N>, the target is completely destroyed!"
 *
 * Two independent axes that must NOT be conflated:
 *   - `instant:false` => NOT an Instant Attack: the target player's
 *     groups may interfere or aid the victim. (epidemic, giantkudzu)
 *     This is unrelated to costing an action.
 *   - `destroyMargin:null` => the card "cannot actually destroy"; it can
 *     only leave the target Devastated. (epidemic, hurricane)
 *
 * `power` entries are tried in order and the first match wins, so
 * specific selectors must come before general ones.
 * ------------------------------------------------------------------ */
const PLOT_FX = {
  /* --- 13 DISASTERS: every one targets a Place --- */
  'atomicmonster': { kind:'disaster', target:'place', requireAttr:'coastal', instant:true, destroyMargin:6,
    power:[
      { ifNames:['japan','california'], value:24 },
      { ifAttr:'huge', value:16 },
      { value:20 } ],
    altUse:{ kind:'destroy_bonus', targetNames:['robotseamonsters','nuclearpowercompanies'], bonus:10 },
    t:'*Disaster!* This is an Instant Attack to Destroy any *Coastal* Place. It does not require an action. Its Power is 16 against a *Huge* Place, 20 against any other Place, but 24 against Japan or California. If the attack succeeds, the target is *Devastated*. If it succeeds by more than 6, the target is destroyed. Or play at any time to give +10 to any attack to destroy the Robot Sea Monsters or the Nuclear Power Companies!' },
  'earthquake': { kind:'disaster', target:'place', instant:true, destroyMargin:5,
    power:[{ ifAttr:'huge', value:12 }, { value:16 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its Power is 12 against a *Huge* Place, 16 against any other Place. If the attack succeeds, the target is *Devostated*. If the die roll succeeds by more than 5, the target is destroyed!' },
  'epidemic': { kind:'disaster', target:'place', instant:false, destroyMargin:null, power:[{ value:14 }],
    t:'*Disaster!* This is an Attack to Destroy any Place. It does not require an action. Its Power is 14. Groups may interfere to aid the victim. It cannot actually destroy the Place.' },
  'hurricane': { kind:'disaster', target:'place', requireAttr:'coastal', instant:true, destroyMargin:null,
    power:[{ ifAttr:'huge', value:16 }, { value:20 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any *Coastal* Place. It does not require an action. Its Power is 16 against a *Huge* Place, 20 against any other Place. If the attack succeeds, the target is *Devastated*. It cannot actually destroy it.' },
  'meteorstrike': { kind:'disaster', target:'place', instant:true, destroyMargin:4, power:[{ value:16 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its Power is 16. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is destroyed!' },
  'nuclearaccident': { kind:'disaster', target:'place', instant:true, destroyMargin:4,
    power:[{ ifAttr:'huge', value:14 }, { value:18 }],
    onPlay:{ stripActionFromNames:['nuclearpowercompanies'] },
    t:'*Disaster!* This is an Instant Attack to Destroy any Place. It does not require an action. Its Power is 14 against a *Huge* Place, 18 against any other Place. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is destroyed. The Nuclear Power Companies lose their action token when this card is played on any Place.' },
  'plagueofdemons': { kind:'disaster', target:'place', rejectAttr:'huge', instant:true, destroyMargin:5,
    requireActionFromAttr:'magic', addSummonerPower:true, power:[{ value:10 }],
    altUse:{ kind:'destroy_bonus', targetAttr:'magic', bonus:10 },
    border:'May Require Magic Action',
    t:'*Disaster!* This is an Instant Attack to Destroy any Place that is not *Huge*. It does not require an action. You must spend an action from a *Magic* group. Its Power is 10, plus the Power of the *Magic* group whose action you spend. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 5, the target is destroyed. Or play at any time to give +10 to any attack to destroy a *Magic* group.' },
  'giantkudzu': { kind:'disaster', target:'place', instant:false, destroyMargin:6, victimMayBeAided:true,
    power:[{ ifAttr:'coastal', value:30 }, { value:24 }],
    t:'*Disaster!* This is an Attack to Destroy any Place. Its Power is 30 against a *Coastal* Place, 24 against any other Place. *Any* group can use its action to aid the victim, but not the Giant Kudzu. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 6, the target is destroyed.' },
  'rainoffrogs': { kind:'disaster', target:'place', instant:true, destroyMargin:6,
    addPerRivalNamed:['froggod'], per:4, power:[{ value:10 }],
    t:'*Disaster!* This is as an Instant Attack to Destroy any Place. It does not require an action. Its Power is 10, plus 4 for each Frog God the target player has in play. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 6, the target is destroyed.' },
  'theoregoncrud': { kind:'disaster', target:'place', rejectAttr:'huge', instant:true, destroyMargin:5, power:[{ value:10 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any Place that is not *Huge*. It does not require an action. Its Power is 10. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 5, the target is destroyed!' },
  'tidalwave': { kind:'disaster', target:'place', requireAttr:'coastal', instant:true, destroyMargin:10,
    power:[{ ifAttr:'huge', value:20 }, { value:24 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any *Coastal* Place. It does not require an action. Its Power is 20 against a *Huge* Place, 24 against any other Place. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 10, the target is destroyed!' },
  'tornado': { kind:'disaster', target:'place', rejectAttr:'huge', instant:true, destroyMargin:4, power:[{ value:12 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any Place that is not *Huge*. It does not require an action. Its Power is 12. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 4, the target is destroyed!' },
  'volcano': { kind:'disaster', target:'place', rejectAttr:'huge', instant:true, destroyMargin:3, power:[{ value:14 }],
    t:'*Disaster!* This is an Instant Attack to Destroy any Place that is not *Huge*. It does not require an action. Its Power is 14. If the attack succeeds, the target is *Devastated*. If the die roll succeeds by more than 3, the target is destroyed!' },

  /* --- 5 ASSASSINATIONS: every one targets a Personality --- */
  'carbomb': { kind:'assassination', target:'personality', instant:true, power:[{ value:8 }],
    mayAddPowerFromAligns:['violent','criminal'],
    t:'*Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 8. One *Violent* or *Criminal* group may use its action to add its Power to this attack.' },
  'hitandrun': { kind:'assassination', target:'personality', instant:true, power:[{ value:10 }],
    mayAddPowerFromAligns:['fanatic'],
    t:'*Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10. One *Fanatic* group may use its action to add its Power to this attack.' },
  'poison': { kind:'assassination', target:'personality', instant:true, power:[{ value:8 }],
    mayAddPowerFromAligns:['criminal','magic'], magicOnlyIfCasterHasMagic:true,
    t:'*Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 8. One *Criminal* or *Magic* group may use its action to add its Power to this attack. This card is only *Magic* if used by a *Magic* group.' },
  'sniper': { kind:'assassination', target:'personality', instant:true, power:[{ value:10 }],
    mayAddPowerFromAligns:['government'],
    t:'*Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10. One *Government* group may use its action to add its Power to this attack.' },
  'witheringcurse': { kind:'assassination', target:'personality', instant:true, power:[{ value:10 }],
    mayAddPowerFromAligns:['magic'], attackIsMagic:true,
    t:'*Assassination!* This is an Instant Attack to Destroy any Personality, at any time. It does not require an action. Its Power is 10. One *Magic* group may use its action to add its Power to this attack. This attack is *Magic*.' },
};
const PLOT_FXN = {}; for (const k in PLOT_FX) { PLOT_FXN[norm(k)] = PLOT_FX[k]; }

/* ------------------------------------------------------------------ *
 * BOOST10_FX — the 15 "+10 Plots", verbatim.
 *
 * Source: the printed face of each card, read off the PNGs; the shared
 * sentence is identical on all 15, only the group qualifier changes. That
 * regularity was verified card by card (see docs/audit/INWO_SURGICAL_AUDIT.md
 * section 25.6): "Play this card at any time to give +10 Power or Resistance
 * (your choice) to any {X} group you control. If used with an action, it must
 * be played when that action is first declared, and counts only for that
 * action. If used for defense, the bonus lasts until the end of the current
 * turn and does not count toward <any Goal>."
 *
 * The OCR corpus truncates the sentence at "does not count toward", so the
 * final words are completed from the official rules, which describe the
 * family as "+10 Plots ... Does not count for any Goal." That is the only
 * place where the transcription is completed from a second source, and it is
 * recorded here rather than left silent.
 *
 * `targetAlign` is used for the nine ideologies and `targetAttr` for the six
 * official attributes; the engine matches EITHER, never both, because a card
 * names exactly one qualifier. Exactly the same AND->OR lesson as the Gnomes
 * of Zurich bonus in P1-009, inverted: here there is only one condition per
 * card, so the fields are mutually exclusive by construction.
 * ------------------------------------------------------------------ */
const BOOST10_TAIL = ' If used with an action, it must be played when that action is first declared, and counts only for that action. If used for defense, the bonus lasts until the end of the current turn and does not count toward any Goal.';
function b10(field, value, name) {
  var o = { kind:'boost10' };
  o[field] = value;
  o.t = 'Play this card at any time to give +10 Power or Resistance (your choice) to any ' +
        name + ' group you control.' + BOOST10_TAIL;
  return o;
}
const BOOST10_FX = {
  'benefitconcert':     b10('targetAlign','liberal',     'Liberal'),
  'coldfusion':         b10('targetAttr', 'science',     'Science'),
  'harmonicavirgins':   b10('targetAttr', 'magic',       'Magic'),
  'infobahn':           b10('targetAttr', 'computer',    'Computer'),
  'jihad':              b10('targetAlign','fanatic',     'Fanatic'),
  'justsayno':          b10('targetAlign','straight',    'Straight'),
  'martiallaw':         b10('targetAlign','government',  'Government'),
  'martyrs':            b10('targetAlign','peaceful',    'Peaceful'),
  'pulitzerprize':      b10('targetAttr', 'media',       'Media'),
  'savethewhales':      b10('targetAttr', 'green',       'Green'),
  'slushfund':          b10('targetAlign','conservative','Conservative'),
  'stocksplit':         b10('targetAlign','corporate',   'Corporate'),
  'terroristnuke':      b10('targetAlign','violent',     'Violent'),
  'thebigscore':        b10('targetAlign','criminal',    'Criminal'),
  'worldcupvictory':    b10('targetAttr', 'nation',      'Nation'),
};
const BOOST10_FXN = {}; for (const k in BOOST10_FX) { BOOST10_FXN[norm(k)] = BOOST10_FX[k]; }

/* ---- P1-013 / Fase 4 lote 2: familia "Power Increase" (10 cartas) ----
 * inwo_rules_extracted.txt:268-273, verbatim:
 *   "Power Increase: A Power-increasing Plot is linked to a Group of a certain
 *    type to increase its Power to the value stated on the card. They have no
 *    effect on a Group that already has Power greater than or equal to the
 *    stated value."
 * => FIJA el Poder al valor impreso (no lo suma) y es un no-op si el grupo ya
 *    tiene Poder >= ese valor. Las 10 cartas del mazo dicen, literalmente:
 *    "This card may be played at any time, and counts as the action for the
 *     group it affects. The increased Power takes effect immediately. The Power
 *     for one {X} group is increased to {N}. Link this card to your chosen {X}
 *     group. No player may have more than one {Name} in play."
 * Son las 10 ideologías, una carta cada una. The Weird Turn Pro dice 4 y las
 * otras nueve 6: NO se normaliza a 6 porque la carta impresa es la autoridad.
 * `t` es el texto impreso verbatim; `pow` es el valor que fija la regla. */
const POWERINC_HEAD = 'This card may be played at any time, and counts as the action for the group it affects. The increased Power takes effect immediately.';
const POWERINC_TAIL = ' Link this card to your chosen ';
function pinc(align, value, name, card) {
  var o = { kind: 'power_increase' };
  o.targetAlign = align;
  o.value = value;
  o.t = POWERINC_HEAD + ' The Power for one ' + name +
        ' group is increased to ' + value + '.' + POWERINC_TAIL + name +
        ' group. No player may have more than one ' + card + ' in play.';
  return o;
}
const POWERINC_FX = {
  'charismaticleader': pinc('fanatic',     6, 'Fanatic',     'Charismatic Leader'),
  'citizenshipaward': pinc('conservative', 6, 'Conservative', 'Citizenship Award'),
  'emergencypowers':   pinc('government',  6, 'Government',  'Emergency Powers'),
  'grassrootssupport': pinc('straight',    6, 'Straight',    'Grassroots Support'),
  'mobinfluence':     pinc('criminal',    6, 'Criminal',    'Mob Influence'),
  'monopoly':         pinc('corporate',   6, 'Corporate',   'Monopoly'),
  'newblood':         pinc('violent',     6, 'Violent',     'New Blood'),
  'nobelpeaceprize':  pinc('peaceful',    6, 'Peaceful',    'Nobel Peace Prize'),
  'selfesteem':       pinc('liberal',     6, 'Liberal',     'Self-Esteem'),
  'theweirdturnpro':  pinc('weird',       4, 'Weird',       'The Weird Turn Pro'),
};
const POWERINC_FXN = {}; for (const k in POWERINC_FX) { POWERINC_FXN[norm(k)] = POWERINC_FX[k]; }

/* RESISTANCE INCREASE — familia de 2 cartas (Fase 4, lote 3).
   Texto impreso verbatim (transcripcion OCR local):

   Commitment (idx 223): "The Resistance for any one group is increased to 8. Link
   this card to your chosen group. Playing this card is a free move and may be done
   at any time, even while its target group is being attacked. The target group may
   belong to any player, or may be one that has just been played from a rival's
   hand."

   Never Surrender (idx 325): mismos free-move / at any time / any player, mas
   "The Resistance for one Fanatic group is increased to 12. Link this card to your
   chosen Fanatic group."

   Las dos cartas se distinguen en TRES puntos, y por eso se guardan como datos
   distintos y no como el mismo efecto con un parametro:
   1. Commitment no dice "de una {ideologia}" => NO lleva targetAlign (vale
      cualquier grupo). Never Surrender si: targetAlign 'fanatic'.
   2. Los valores son distintos (8 y 12) y es un "increased to", no un "+N": al
      igual que Power Increase, el valor queda FIJADO, no sumado.
   3. NO se dice "No player may have more than one X in play" (a diferencia de las
      10 cartas de Power Increase), asi que no se modela unicidad. Anadir ese
      limite seria inventar una regla: la carta es la autoridad. */
function resinc(phrase, align, value, name) {
  var o = { kind: 'resistance_increase' };
  if (align) o.targetAlign = align;
  o.value = value;
  o.t = 'The Resistance for ' + phrase + ' group is increased to ' + value + '. ' +
    'Playing this card is a free move and may be done at any time, even while its ' +
    'target group is being attacked. The target group may belong to any player, or ' +
    'may be one that has just been played from a rival\'s hand. ' +
    'Link this card to your chosen ' + name + ' group.';
  return o;
}
const RESINC_FX = {
  'commitment':     resinc('any one',    null,     8, 'group'),
  'neversurrender': resinc('one Fanatic', 'fanatic', 12, 'Fanatic'),
};
const RESINC_FXN = {}; for (const k in RESINC_FX) { RESINC_FXN[norm(k)] = RESINC_FX[k]; }

/* ==== P1-015: Messiah (312) y Angst (194) ====
 * Estas dos cartas NO pertenecen a ninguna de las seis familias oficiales de Plot
 * que lista OFFICIAL_RULES_FINDINGS.md §6 (lo mismo que las "Resistance Increase"
 * del lote P1-014): son efectos de link permanente propios, deducidos del texto
 * impreso de cada carta, que es la autoridad. Se declaran aparte precisamente
 * para que quede escrito que son una lectura nuestra y no una familia del
 * reglamento.
 *
 * MESSIAH — "The new Messiah's Power and Resistance are BOTH INCREASED BY 4, plus
 * 2 more for every Church you control": por eso el efecto guarda `baseBonus` y
 * `perChurch` en vez de un valor único. El texto no dice "this is an action for...",
 * asi que el motor NO cobra ficha de grupo (a diferencia de Power Increase).
 *
 * ANGST — el coste es doble: una acción Illuminati (`illumToken:1`) y una acción de
 * grupo de la lista `requiresActionFrom`. OJO con el tercer nombre impreso: en este
 * dataset "Orbital Mind Control Lasers" está transcrito como type=resource (idx
 * 332), no como grupo, así que nunca podrá aportar una acción de grupo. Se deja el
 * nombre tal cual aparece en la carta y es el motor el que, al buscar la acción
 * dentro de la estructura del jugador, simplemente no lo encuentra. La pregunta de
 * si la transcripción es correcta queda abierta; NO se "corrige" a ojo. */
const MESSIAH_FX = {
  'messiah': {
    kind: 'messiah',
    targetSubtype: 'personality',
    baseBonus: 4,
    perChurch: 2,
    churchAttr: 'church',
    t: 'Play this card at any time except during an attack. Link it to any Personality you control. That person is hailed as the Messiah by millions worldwide! The new Messiah\'s Power and Resistance are both increased by 4, plus 2 more for every Church you control at any given time. Only one Messiah can be in play at a time.'
  }
};
const MESSIAH_FXN = {}; for (const k in MESSIAH_FX) { MESSIAH_FXN[norm(k)] = MESSIAH_FX[k]; }

const ANGST_FX = {
  'angst': {
    kind: 'angst',
    targetSubtypes: ['place', 'organization'],
    value: 1,
    illumToken: 1,
    requiresActionFrom: ['Psychiatrists', 'Intellectuals', 'Orbital Mind Control Lasers'],
    t: 'The leaders of your target group (any Place or Organization except the Illuminati) find it boring and meaningless. Their power is permanently reduced to 1. Link this card to the target. Play this card at any time except during an attack. It requires an action from your Illuminati and either the Psychiatrists, the Intellectuals, or the Orbital Mind Control Lasers.'
  }
};
const ANGST_FXN = {}; for (const k in ANGST_FX) { ANGST_FXN[norm(k)] = ANGST_FX[k]; }

/* P1-016 — CARTAS DE CANCELACION: Bodyguard (208) y Talisman of Ahrimanes (382).
   Las dos son la MISMA mecanica: "Play this card after any type of Assassination.
   It becomes an automatic failure." No reaccionan a un assassination ya
   resuelto; reactionan al QUE ESTA ANUNCIADO y AUN SIN RODAR, que es
   exactamente la ventana de la pagina 15 del manual (inwo_rules_extracted.txt:
   924-931). Hasta que esa ventana existio en el motor (P1-016) no tenian a donde
   encajar, y por eso estaban declaradas bloqueadas en el gate de cobertura.
   NO pertenecen a ninguna de las seis familias oficiales de Plot de
   OFFICIAL_RULES_FINDINGS.md seccion 6; son cartas de reaction, una categoria
   que el motor no tenia. Se declara aqui para que nadie las busque en la
   taxonomia oficial.
   La diferencia entre las dos esta en sus dos cifras y NO es un detalle: Bodyguard
   dice "+6 against any Attempt to Destroy, INCLUDING FURTHER ASSASSINATIONS"
   (una sola cifra para los dos casos), y Talisman dice "+2 against any further
   attack to destroy OR +10 against any further Assassination" (dos cifras para
   dos clases de ataque). Por eso el efecto lleva destroyBonus y
   assassinationBonus como campos separados, y el motor NO los puede sumar. */
const BODYGUARD_FX = {
  'bodyguard': {
    kind: 'bodyguard',
    destroyBonus: 6,
    t: 'Play this card after any type of Assassination. It becomes an automatic failure. ' +
       'Then link this card permanently to the card it protected. That Personality now has ' +
       'an extra +6 against any Attempt to Destroy, including further Assassinations. ' +
       'If the Personality is killed or destroyed, the Bodyguard is lost.'
  }
};
const TALISMAN_FX = {
  'talismanofahrimanes': {
    kind: 'talisman',
    destroyBonus: 2,
    assassinationBonus: 10,
    t: 'This card may be played only after any type of Assassination. It becomes an automatic ' +
       'failure. Then link this card permanently to the card it protected. That Personality ' +
       'now has an extra +2 against any further attack to destroy or +10 against any further ' +
       'Assassination. If the Personality is Killed anyway, the Talisman is lost. No more than ' +
       'one Talisman of Ahrimanes can be in play at one time'
  }
};
const BODYGUARD_FXN = {}; for (const k in BODYGUARD_FX) { BODYGUARD_FXN[norm(k)] = BODYGUARD_FX[k]; }
const TALISMAN_FXN = {}; for (const k in TALISMAN_FX) { TALISMAN_FXN[norm(k)] = TALISMAN_FX[k]; }

/* P1-024 — LAS SEIS CARTAS DE RODADERO (211, 225, 321, 403, 317, 320).
   Hermanas de P1-016 pero al otro lado del dado: las seis dicen "Play immediately
   after any die roll" / "Play this card when any Attack to Destroy succeeds",
   es decir reaccionan a un rodadero YA TIRADO y todavia sin aplicar. El motor
   (engine.js) abre S.pendingRoll justo despues de tirar y antes de comparar,
   asi que quien juegue una de estas cambia el numero o fuerza una repeticion.
   NO pertenecen a ninguna de las seis familias oficiales de Plot de
   OFFICIAL_RULES_FINDINGS.md §6: son "reacciones al rodadero", el mismoConglomerado
   que P1-016 pero en fase posterior.
   DECLARACIONES DE INTERPRETACION (no hay ruling oficial para ninguna):
   1. "Requires all Action tokens currently on your Illuminati (min 1)" se
      implementa como `illumTokenAll`: exige >=1 y GASTA TODAS
      (pl.illumTokens = 0). Es lo unico que hace que "all" signifique algo.
   2. Computer Virus necesita una DIRECCION (+2 o -2) que su texto no imprime:
      se expone como opts.rollDelta y por defecto es -2 (el jugador que gasta su
      accion es el que empeora el ataque ajeno). El resultado se recorta a 2..12
      porque un 2d6 no puede dar 1, 0 ni 13.
   3. Mistaken Identity NO tiene coste impreso, asi que no se le exige accion
      alguna: es la unica de las seis que se juega gratis.
   4. Time Warp tampoco imprime coste. El "+1 Group card" NO usa E.drawGroup()
      porque esa funcion consume el flag groupDrawn del turno; se roba con
      drawFrom() + hand.push, como exchangeForPlot().
   5. Mothers' March usa `minPower:3` (texto: "an action by any group with Power
      >= 3"), comprobado contra el Poder IMPRESO de la carta.
   6. La repeticion que fuerzan Time Warp / Mothers' March NO reabre la ventana
      ("No player may do anything else to change the strength of the re-rolled
      attack"), y solo se admite una: rollReactionAllowed() rechaza si P.reroll. */
const ROLL_FX = {
  'bribery': {
    kind: 'bribery',
    illumTokenAll: true,
    t: 'Play immediately after any die roll (by any player). That roll is changed, ' +
       'retroactively, to a 2. If it was an attack it succeeds only if the attack ' +
       'had net Power ≥ 2. Requires all Action tokens currently on your Illuminati (min 1).'
  },
  'computervirus': {
    kind: 'computervirus',
    /* "an action from any Science, Space or Computer group" es una DISYUNCION de
       tres atributos, y `requireAttr` es de un solo atributo (si se le pasa un
       array, el motor y el gate lo convierten en la cadena "science,space,computer"
       y la carta queda INJUGABLE). Por eso existe `requireAttrAny`: semantica OR. */
    requireAttrAny: ['science', 'space', 'computer'],
    t: 'Play immediately after any die roll (by any player). You may change the ' +
       'result of that roll, retroactively, by ±2. Requires an action from any ' +
       'Science, Space or Computer group.'
  },
  'murphyslaw': {
    kind: 'murphyslaw',
    illumTokenAll: true,
    t: 'Play immediately after any die roll (by any player). That roll is changed, ' +
       'retroactively, to a 12. Requires all Action tokens on your Illuminati (min 1).'
  },
  'timewarp': {
    kind: 'timewarp',
    t: 'Play immediately after any successful die roll by any other player. That ' +
       'player must roll again; however they also get to draw a Group card.'
  },
  'mistakenidentity': {
    kind: 'mistakenidentity',
    t: 'Play this card after any type of Assassination. It becomes an automatic failure.'
  },
  'mothersmarch': {
    kind: 'mothersmarch',
    minPower: 3,
    t: 'Play this card when any Attack to Destroy succeeds. The attacker must try ' +
       'the roll again immediately, at a −4 penalty. No player may do anything else ' +
       'to change the strength of the re-rolled attack. Requires an action by any ' +
       'group with Power ≥ 3.'
  }
};
const ROLL_FXN = {}; for (const k in ROLL_FX) { ROLL_FXN[norm(k)] = ROLL_FX[k]; }

/* P1-025 / P1-026 / P1-027 — la TERCERA familia de cartas de reaccion inmediata,
   la que NO reacciona a los dados sino a SUCESOS DE CARTA: un descarte, un robo
   de Plot, el momento de declarar un ataque. Es hermana de BODYGUARD/TALISMAN
   (P1-016, antes de los dados) y de ROLL_FX (P1-024, despues de los dados), y
   por eso se implementa con la misma maquinaria: una ventana `S.pendingEvent`
   que se abre SOLO si alguien tiene una carta valida para ese suceso.

   De las nueve cartas de §38 se implementan cuatro. Las otras cinco quedan
   BLOQUEADAS con motivo declarado, no por pereza:
     - 192 And STAY Dead!  : el motor no tiene mecanica de resurreccion, asi que
       "the destroyed group is gone forever" no seria observable (INJUGABLE).
     - 228 Counterspell    : un Resource no puede atacar ni ayudar a un ataque
       (esta en `pl.resources` con tokens:0 y sin nodo, y `E.addSupport` exige
       `findNode` + `tokens>=1`), asi que "any Magic Resource used to attack you"
       nunca ocurre.
     - 276 Hat Trick       : "discard this card instead, and put the other Plot
       card back into your hand" exige deshacer una Plot ya resuelta.
     - 285 I Lied          : no existen tratos que cumplir en el motor, luego el
       marcador no lo consumiria nadie.
     - 412 Vultures        : el motor no tiene el camino "jugar un grupo de la
       mano, fallar el takeover y descartarlo" (`placeUnder` lanza y la carta
       sigue en la mano). Las reglas oficiais SI tienen ese camino
       (inwo_rules_extracted.txt:226-241), asi que esto es una carencia del
       motor, no de la carta. */
const EVENT_FX = {
  'privilegedattack': {
    kind: 'privileged_attack',
    /* "Your Illuminati or a Secret group must participate or spend an Action
       token." → O el Illuminati paga una accion, O un grupo Secret la paga. */
    illumOrSecretAlign: 'secret',
    t: 'Play this card when you make any attack. That attack is now privileged: ' +
       'nobody except you and the target player may aid either side. Your ' +
       'Illuminati or a Secret group must participate or spend an Action token.'
  },
  'thesecondbullet': {
    kind: 'second_bullet',
    /* Sin coste impreso propio: el texto dice "spend THEIR action(s)", o sea las
       fichas que ya participaban en el ataque. El motor las gasta al aplicar. */
    t: 'Play immediately after you fail a roll to destroy. If any of your own ' +
       'groups still have Action tokens and were eligible to participate in the ' +
       'attack, you may spend their action(s) to add enough Power to make the ' +
       'attack succeed.'
  },
  'stealingtheplans': {
    kind: 'stealing_the_plans',
    minPower: 3,
    t: 'Play immediately after someone else discards a Plot card, whether or not ' +
       'they used it. Take the discarded Plot card and add it to your hand. ' +
       'Requires an action from a group with Power ≥ 3.'
  },
  'embezzlement': {
    kind: 'embezzlement',
    /* "Requires Plot Discard": la carta de EXIGENCIA es la que se descarta, no la
       Plot que se roba. El motor lo comprueba antes de entregar la carta. */
    requiresPlotDiscard: true,
    t: 'Play immediately when another player draws a Plot card, before he uses it ' +
       'or announces what it is. That Plot card becomes yours, but you must ' +
       'discard one other Plot card from your own hand. Requires Plot Discard.'
  }
};
const EVENT_FXN = {}; for (const k in EVENT_FX) { EVENT_FXN[norm(k)] = EVENT_FX[k]; }

/* P1-017 — DICTATORSHIP (239). Cambio de IDEOLOGIA a nivel de nodo, la primera
   carta del mazo que lo exige. Hasta ahora el motor leia las alineaciones de la
   CARTA inmutable en mas de 20 sitios, asi que "It becomes Violent, if it was not
   already" no tenia ninguna representacion posible: no existia almacenamiento de
   alineaciones por grupo. P1-017 creo nodeAligns()/nodeAttrs() y migro los 15
   sitios de lectura, y ahora la carta es ejecutable.
   NO pertenece a ninguna de las seis familias oficiales de Plot de
   OFFICIAL_RULES_FINDINGS.md §6 (como las 2 de Resistance Increase de P1-014 y
   las 2 de Messiah/Angst de P1-015): es un efecto de link deducido del texto
   impreso, que es la autoridad. Se deja escrito para que nadie lo confunda con
   una familia del reglamento.
   `addAlign` es ADICION (union), no reemplazo, porque el texto dice "if it was
   not already" y porque guardar la lista de anadidas permite que Backlash (200)
   deshaga el cambio sin conocer la carta que lo produjo.
   OJO con 'during your turn': la carta NO entra en la lista `instant` del motor,
   a diferencia de las 15 cartas "+10" y las 10 de Power Increase, que si dicen
   "may be played at any time". */
const DICTATORSHIP_FX = {
  'dictatorship': {
    kind: 'dictatorship',
    targetAttr: 'nation',
    addAlign: 'violent',
    t: 'Play this card during your turn, on any Nation which you control. This is an action for that Nation or its master. It becomes Violent, if it was not already. Link this card to the Nation.'
  }
};
const DICTATORSHIP_FXN = {}; for (const k in DICTATORSHIP_FX) { DICTATORSHIP_FXN[norm(k)] = DICTATORSHIP_FX[k]; }

const BOIL = ' This card may be played at any time. This card does not benefit groups which are suffering from the effect of any card or special ability that prevents them from getting Action tokens.';

/* L1 — TOKEN-GIFT: las 11 cartas que dicen, literalmente, "Place an Action token
 * on each of your <X> groups". Son la primera familia MASIVA del plan.md: mismo
 * efecto, distinto filtro. Por eso comparten UN solo `kind` y se distinguen solo
 * por el calificador (`giftAlign` / `giftAttr`).
 *
 * POR QUE 2 CAMPOS Y NO SOLO UNO. De las 11 cartas, DIEZ filtran por IDEOLOGIA
 * (alineacion) y UNA sola —Bank Merger (201), "your Bank groups"— por ATRIBUTO.
 * El vocabulario del mazo lo confirma: las 10 ideologias son conservative,
 * corporate, criminal, fanatic, government, liberal, peaceful, straight,
 * violent, weird; y `bank` NO es ninguna de ellas, es un atributo (§23).
 * Confundir los dos planos fue exactamente el defecto P1-018 (dos cartas decian
 * "Magic group" y el motor solo miraba c.alignments, dejando la clausula como
 * codigo muerto). Aqui los dos planos se nombran por separado.
 *
 * INTERPRETACIONES DECLARADAS (no hay ruling oficial para ninguna):
 *
 * 1) ALCANCE = la estructura de Poder COMPLETA, recursivamente, titeres
 *    incluidos. Las 11 cartas dicen "your ... groups" sin restringir; el unico
 *    alcance que el texto sostiene es "todos los grupos tuyos", y un titere bajo
 *    tu propio grupo sigue siendo tuyo. Se recorre con `walk`, la misma
 *    idoneidad que usa `firstUsableAid` y que usa el `case 'zap'`.
 *
 * 2) `tokens = 1`, no `tokens++`. Un grupo tiene UNA ficha de accion por turno y
 *    la gasta al actuar; "Place an Action token on each of your X groups" pone
 *    LA FICHA, no la multiplica. Asi se cumple de forma natural el "which does
 *    not already have one" de las 10 cartas normales, y el "even those which
 *    already have an Action token" de Bank Merger (201) queda como el
 *    recordatorio redundante que el texto impreso es: con `tokens = 1` un grupo
 *    que ya tenia ficha conserva exactamente una.
 *
 * 3) EL SUFIJO "and any other Fanatic group in play that you want to benefit!"
 *    de Full Moon (263) NO se implementa. Republicar una carta de Fanatic ajena
 *    seria un regalo gratis al enemigo con la misma ficha de este mazo; el motor
 *    solo reparte fichas a grupos propios. Queda declarado, no implementado.
 *
 * 4) "This card does not benefit groups which are suffering from the effect of
 *    any card or special ability that prevents them from getting Action tokens"
 *    se implementa con el MISMO conjunto de banderas que ya usa
 *    `firstUsableAid` para "puede actuar": devastated, paralyzed, zapped,
 *    actionStripped. Es el unico predicado de "no puede recibir fichas" que
 *    existe en el motor, y por coherencia no se inventa un segundo.
 *
 * 5) SIN COSTE IMPRESO y "may be played at any time" literal: por eso las 11 van
 *    a la lista `instant` del motor (pueden jugarse fuera de turno) y su `case`
 *    no cobra nada. No es un descuido: no hay nada que cobrar. */
const TOKEN_FX = {
  'bank merger': {
    kind: 'token_gift',
    /* "each of your Bank groups" — ATRIBUTO, no ideologia (§23). */
    giftAttr: 'bank',
    t: 'Place an Action token on each of your Bank groups, even those which already have an Action token.' + BOIL
  },
  'dollars for decency': {
    kind: 'token_gift',
    giftAlign: 'straight',
    t: 'Place an Action token on each of your Straight groups which does not already have one.' + BOIL
  },
  'flower power': {
    kind: 'token_gift',
    giftAlign: 'peaceful',
    t: 'Place an Action token on each of your Peaceful groups which does not already have one.' + BOIL
  },
  'freaking the mundanes': {
    kind: 'token_gift',
    giftAlign: 'weird',
    t: 'Place an Action token on each of your Weird groups which does not already have one.' + BOIL
  },
  'full moon': {
    kind: 'token_gift',
    /* La segunda mitad ("and any other Fanatic group in play") NO se implementa:
       ver interpretacion 3 del comentario de la familia. */
    giftAlign: 'fanatic',
    t: 'Place an Action token on each of your Fanatic groups, whether it has one or not, and any other Fanatic group in play that you want to benefit!' + BOIL
  },
  'gang war': {
    kind: 'token_gift',
    giftAlign: 'criminal',
    t: 'Place an Action token on each of your Criminal groups which does not already have one.' + BOIL
  },
  'new federal budget': {
    kind: 'token_gift',
    giftAlign: 'government',
    t: 'Place an Action token on each of your Government groups which does not already have one.' + BOIL
  },
  'pledge drive': {
    kind: 'token_gift',
    giftAlign: 'liberal',
    t: 'Place an Action token on each of your Liberal groups which does not already have one.' + BOIL
  },
  'red scare': {
    kind: 'token_gift',
    giftAlign: 'conservative',
    t: 'Place an Action token on each of your Conservative groups which does not already have one.' + BOIL
  },
  'reload': {
    kind: 'token_gift',
    giftAlign: 'violent',
    t: 'Place an Action token on each of your Violent groups which does not already have one.' + BOIL
  },
  'tax breaks': {
    kind: 'token_gift',
    giftAlign: 'corporate',
    t: 'Place an Action token on each of your Corporate groups which does not already have one.' + BOIL
  }
};
const TOKEN_FXN = {}; for (const k in TOKEN_FX) { TOKEN_FXN[norm(k)] = TOKEN_FX[k]; }

/* L2 - ILLUM-OR-X (198, 264, 290, 295, 301, 323, 340, 345, 376).
 *
 * Nueve cartas que plan.md agrupo como "L2 ILLUM-OR-X" por compartir la formula
 * del coste. Al leer el texto impreso completo resulto que NO son una familia de
 * coste: son la familia "forzar una alineacion de forma permanente", y el coste
 * es DINAMICO (la Resistencia del objetivo), no un numero fijo. Se conservan aqui
 * las 5 DECLARACIONES que fija la auditoria (§40).
 *
 * 1) COSTE DINAMICO. El texto dice "with a total Power equal to the Resistance of
 *    the target group", no un numero. El motor calcula el coste con
 *    nodeResistance(objetivo) y lo DUPLICA si el objetivo tiene la alineacion
 *    opuesta (oppAlign). Power Corrupts (340) es la unica sin clausula "doubled",
 *    y el motivo es oficial: el glosario de reglas dice de Criminal "It has no
 *    opposite". Que la tabla OPPOSITES del motor no incluya criminal, government,
 *    corporate ni fanatic coincide con el glosario impreso, asi que la ausencia de
 *    la clausula NO es un olvido de transcripcion sino la lectura correcta.
 *
 * 2) "Add bonuses for its closeness to the Illuminati if it belongs to a rival!".
 *    Las reglas oficiales (inwo_rules_extracted.txt :563-576) distinguen DOS
 *    conceptos: "closeness to the Illuminati" da una bonificacion de DEFENSA
 *    (alineaciones compartidas con su amo, +4 cada una) y "common alignments with
 *    its master" aumentan la RESISTENCIA. El coste se calcula con la Resistencia
 *    y, SOLO si el objetivo es de un rival, se le suma su bonificacion de
 *    cercanía. Se extrajo el bloque que ya vivia dentro de computeStrength a una
 *    funcion reutilizable closenessDefenseBonus() para que la regla exista una sola
 *    vez.
 *
 * 3) "The target becomes permanently X. If it was <opposite>, that alignment is
 *    lost." Se implementa con los dos campos de nodo que ya existen/aregables:
 *    alignsAdded (sumar) y el nuevo alignsRemoved (restar) que nodeAligns filtra.
 *    OJO: tocar nodeAligns cambia el comportamiento de TODOS sus consumidores
 *    (bonificacion +/-4 de los ataques, shares, isOpposite y el caso token_gift de
 *    §39). Es deliberado y se declara.
 *
 * 4) "Keep this card, with a link to the target." La Plot NO se descarta: se
 *    guarda en pl.linkedPlots. El chequeo linkedHere que introducio P1-025 en
 *    E.playPlot ya la mantiene fuera de la pila de descarte, asi que no hace falta
 *    tocar el motor para eso.
 *
 * 5) Las nueve son "Play this card at any time", luego las nueve entran en la
 *    lista instant del motor.
 *
 * Privatization anade "and if it was a Dictatorship, it is no longer": por eso
 * lleva noDictatorship:true. Para que eso sea comprobable el motor tuvo que
 * arreglar la carta Dictatorship (239), que declaraba "The target is now a
 * Dictatorship. It gets +2 Power" pero solo guardaba el link y el +0: no ponia
 * ninguna marca de Dictatorship ni aplicaba el +2 de Poder. Auditoria §40.
 */
const FORCE_FX = {
  'assertiveness training': {
    kind: 'force_align',
    forceAlign: 'violent',
    oppAlign: 'peaceful',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Violent group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Peaceful. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target becomes permanently Violent. If it was Peaceful, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'fundie money': {
    kind: 'force_align',
    forceAlign: 'conservative',
    oppAlign: 'liberal',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Conservative group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Liberal. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Conservative. If it was Liberal, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'jake day': {
    kind: 'force_align',
    forceAlign: 'weird',
    oppAlign: 'straight',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Weird group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Straight. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Weird. If it was Straight, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'kinder and gentler': {
    kind: 'force_align',
    forceAlign: 'peaceful',
    oppAlign: 'violent',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Peaceful group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Violent. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Peaceful. If it was Violent, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'liberal agenda': {
    kind: 'force_align',
    forceAlign: 'liberal',
    oppAlign: 'conservative',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Liberal group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Conservative. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Liberal. If it was Conservative, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'nationalization': {
    kind: 'force_align',
    forceAlign: 'government',
    oppAlign: 'corporate',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Government group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Corporate. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Government. If it was Corporate, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  },
  'power corrupts': {
    kind: 'force_align',
    forceAlign: 'criminal',
    /* SIN oppAlign: el glosario oficial dice que Criminal no tiene opuesta. */
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Criminal group(s) with a total Power equal to the Resistance of the target group. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Criminal. Keep this card, with a link to the target. Requires Action'
  },
  'privatization': {
    kind: 'force_align',
    forceAlign: 'corporate',
    oppAlign: 'government',
    noDictatorship: true,
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Corporate group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Government. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Corporate. If it was Government, that alignment is lost (and if it was a Dictatorship, it is no longer). Keep this card, with a link to the target. Requires Action'
  },
  'straighten up': {
    kind: 'force_align',
    forceAlign: 'straight',
    oppAlign: 'weird',
    t: 'Play this card at any time. It requires action(s) by either the Illuminati, or Straight group(s) with a total Power equal to the Resistance of the target group, doubled if the group is currently Weird. Add bonuses for its closeness to the Illuminati if it belongs to a rival! The target group becomes permanently Straight. If it was Weird, that alignment is lost. Keep this card, with a link to the target. Requires Action'
  }
};
const FORCE_FXN = {}; for (const k in FORCE_FX) { FORCE_FXN[norm(k)] = FORCE_FX[k]; }

/* ==========================================================================
   L3a - BULK-POWER: "Increase/Reduce the Power of all X groups by N"
   --------------------------------------------------------------------------
   La familia se llama asi porque TODAS estas cartas hacen lo mismo: reparten
   un modificador (de Poder o de Resistencia) a un conjunto de grupos que
  Matches un filtro, sin elegir objetivo una por una. Es la unica diferencia
   real entre "Power Increase" (que elige UN grupo, §27) y esta familia: aqui el
   filtro lo decide la carta, no el jugador.

   POR QUE UNA GRAMATICA DE CLAUSULAS Y NO DOCEN `case`
   Las 8 cartas de este bloque son 17 frases del tipo "sube +2 a esto, +3 a
   aquello que cumple dos cosas a la vez". Escribirlas como `case` produciria
   8 copias de un mismo bucle con los numeros cambiados: exactamente el tipo de
   duplicacion que este motor ya sufrio con los costes. En vez de eso la carta
   DECLARA sus frases y un unico `case 'bulk_power'` las ejecuta. Anadir una
   carta nueva es anadir una entrada de datos, no tocar el motor.

   CAMPOS DE UNA CLAUSULA
     align / aligns     filtro de alineacion (una, o varias)
     match              'all' (tiene TODAS las de `aligns`, por defecto) o
                        'any' (tiene al menos una)
     attr / attrs       filtro de atributo, igual que `match` para `attrs`
     subtype            'place', 'organization'...
     notAligns          EXCLUYE si tiene cualquiera de estas (241: "Straight
                        NO Government")
     minPower/maxPower  filtro por Poder IMPRESO de la carta (339: "los
                        Conservatives con Poder de SOLO 1")
     power              delta de Poder (se negativo para "Reduce")
     resistance         delta de Resistencia
     become             alineacion que se anade (339: "become Criminal as well")
     scaleBy            {align, count:'own'} — el delta se multiplica por
                        cuantos grupos de esa alineacion controlas. Existe
                        porque 344 dice "for every Weird group you control"
                        y eso es AUTOREFERENCIAL: cada Weird se cuenta a si
                        mismo. DECLARADO ASI a proposito: el texto es explicito
                        ("si hay 5 Weird, cada uno recibe +5") y una lectura
                        que se excluyera a si mismo daria +4 y no +5.
     scope              'own' (por defecto) o 'all' (todos los jugadores)

   DECLARACIONES DE INTERPRETACION (ninguna regla oficial las resuelve)
   1) ALCANCE. Diez de estas cartas dicen "all X groups" SIN la palabra "your".
      Se aplican SOLO a los grupos del jugador que las juega. Motivo declarado:
      son Plot que se juegan en tu turno para reforzar tu propia estructura, y
      la lectura alternativa (un arma que golpea tambien a los rivales) haria
      que 251 Energy Crisis fuese objetivamente mejor que un Disaster. La
      excepcion se marca explicitamente con `scope:'all'`, y solo la usan las
      cartas cuyo texto nombra a los grupos de forma inequivocamente universal.
   2) PERMANENCIA. El efecto dura mientras el grupo siga en juego. Es lo que
      distingue estas cartas de las que dicen "for one action only", que son
      otra familia (L5). El unico mecanismo que borra un modificador es que el
      grupo salga del juego: `destroyGroup` descarta el nodo entero.
   3) "Increase the Power of all Conservative Corporate groups by 3" (204 y
      296) NO es una tercera frase que sustituya a las otras dos: es ACUMULATIVA.
      Un grupo que sea Conservative Y Corporate recibe +2 +2 +3. El texto
      apila las tres frases y el mazo las juega juntas.
   4) `maxPower` mira el Poder IMPRESO de la carta, no el actual. 339 dice
      "groups with a Power of only 1", y "su Poder" en este juego es el dato
      impreso de la carta; si miraras el actual, una carta que ya recibio un +2
      dejaria de-qualificar y el efecto seria inestable.
   5) El modificador se guarda en el NODO (`powerMods` / `resistanceMods`), no
      en la carta. Es lo que permite que dos grupos identicos se comporten
      distinto, que es exactamente como funciona el Poder en este juego: depende
      de quien lo controla y de que le han hecho.
   ========================================================================== */
const BULK_FX = {
  'Bigger Business': {
    kind: 'bulk_power',
    moves: [
      { align: 'corporate', power: 2 },
      { align: 'conservative', power: 2 },
      { aligns: ['conservative', 'corporate'], match: 'all', power: 3 }
    ],
    t: 'Increase the Power of all Corporate groups by 2. Increase the Power of all Conservative groups by 2. Increase the Power of all Conservative Corporate groups by 3.'
  },
  'Chicken in Every Pot': {
    kind: 'bulk_power',
    moves: [
      { attrs: ['bank'], power: 2 },
      { attr: 'coastal', subtype: 'place', power: 2 },
      { align: 'violent', power: -1 }
    ],
    t: 'Increase the Power of all Banks and all Coastal Places by 2. Decrease the Power of all Violent groups by 1.'
  },
  "Don't Forget to Smash the State": {
    kind: 'bulk_power',
    moves: [
      { align: 'government', power: -3 },
      { align: 'straight', notAligns: ['government'], power: -2 }
    ],
    t: 'Reduce the Power of all Government groups by 3. Reduce the Power of all Straight non-Government groups by 2.'
  },
  'Energy Crisis': {
    kind: 'bulk_power',
    moves: [
      { align: 'corporate', power: -2 },
      { attr: 'green', power: -1, resistance: -1 }
    ],
    t: 'Reduce the Power of all Corporate groups by 2. Reduce Power and Resistance of all Green groups by 1.'
  },
  'Gun Control': {
    kind: 'bulk_power',
    moves: [
      { aligns: ['violent', 'government'], match: 'all', power: 3 },
      { align: 'criminal', power: 1 }
    ],
    t: 'Increase the Power of all Violent Government groups by 3. Increase the Power of all Criminal groups by 1.'
  },
  'Law and Order': {
    kind: 'bulk_power',
    moves: [
      { align: 'conservative', power: 2 },
      { align: 'straight', power: 2 },
      { aligns: ['conservative', 'straight'], match: 'all', power: 3 }
    ],
    t: 'Increase the Power of all Conservative groups by 2. Increase the Power of all Straight groups by 2. Increase the Power of all Straight Conservative groups by 3.'
  },
  'Political Correctness': {
    kind: 'bulk_power',
    moves: [
      { align: 'liberal', power: 3 },
      { align: 'conservative', maxPower: 1, become: 'criminal' }
    ],
    t: 'Increase the Power of all Liberal groups by 3. All Conservative groups with a Power of only 1 become Criminal as well.'
  },
  'Principia Discordia': {
    kind: 'bulk_power',
    moves: [
      { align: 'weird', resistance: 1, scaleBy: { align: 'weird', count: 'own' } }
    ],
    t: 'Each Weird group in your Power Structure increases its Resistance by 1 for every Weird group you control. So, if there are a total of 5 Weird groups in your Power Structure, each one gets +5 to its Resistance.'
  }
};
const BULK_FXN = {};
for (const k in BULK_FX) { BULK_FXN[norm(k)] = BULK_FX[k]; }

function baseFromFolder(m) {
  if (m.folder === 'Illuminati') return { type: 'illuminati', subtype: null };
  return { type: 'group', subtype: 'organization' }; // Groups folder
}
function plotSub(name) {
  const n = norm(name);
  if (n.startsWith('newworldorder') || /(^| )nwo( |$)/.test(n)) return 'nwo';
  return null;
}
function ocrFor(name, id) {
  return OCR[norm(name)] || OCR[norm(id)] || null;
}
function mergeFor(name, id) {
  return mergeCards[norm(name)] || mergeCards[norm(id)] || null;
}
function mergeValue(row, field) {
  const entry = row && row[field];
  if (!entry || typeof entry !== 'object') return undefined;
  if (field === 'alignments') return Array.isArray(entry.values) ? entry.values : undefined;
  return Number.isInteger(entry.value) ? entry.value : undefined;
}
function statProvenance(row, field, currentValue) {
  if (!row) return null;
  const conflict = row.conflicts && row.conflicts[field];
  if (conflict) {
    return {
      status: 'secondary-conflict-not-overwritten',
      confidence: 'medium',
      source: row.source || null,
      raw: conflict.raw || null,
      value: currentValue === undefined ? null : currentValue,
      conflict: {
        runtime: conflict.runtime === undefined ? null : conflict.runtime,
        secondary: conflict.secondary === undefined ? null : conflict.secondary,
        reason: conflict.reason || 'secondary-conflict-not-overwritten'
      }
    };
  }
  const entry = row[field];
  if (!entry || typeof entry !== 'object') return null;
  const result = {
    status: entry.status || 'secondary',
    confidence: entry.confidence || 'medium',
    source: row.source || null,
    raw: entry.raw === undefined ? null : entry.raw,
    value: currentValue === undefined ? null : currentValue
  };
  if (Array.isArray(entry.values)) result.values = entry.values.slice();
  return result;
}
function applySecondaryStats(rec) {
  const row = mergeFor(rec.name, rec.id);
  if (!row) return;
  const filled = [];
  if (rec.power == null) {
    const value = mergeValue(row, 'power');
    if (value !== undefined) { rec.power = value; filled.push('power'); }
  }
  if (rec.resistance == null) {
    const value = mergeValue(row, 'resistance');
    if (value !== undefined) { rec.resistance = value; filled.push('resistance'); }
  }
  if (!rec.alignments || rec.alignments.length === 0) {
    const value = mergeValue(row, 'alignments');
    if (value !== undefined) { rec.alignments = value; filled.push('alignments'); }
  }
  rec.source.secondary = { status: row.sourceStatus || 'secondary', action: row.action || null, source: row.source || null };
  if (row.referenceText) rec.referenceText = row.referenceText;
  const provenance = {};
  for (const field of ['power', 'resistance', 'alignments']) {
    const entry = statProvenance(row, field, rec[field]);
    if (entry) provenance[field] = entry;
  }
  if (Object.keys(provenance).length) {
    rec.statProvenance = provenance;
    const conflictFields = Object.entries(provenance)
      .filter(([, entry]) => entry.status === 'secondary-conflict-not-overwritten')
      .map(([field]) => field);
    const confirmedFields = Object.entries(provenance)
      .filter(([, entry]) => entry.status === 'runtime-confirmed-secondary')
      .map(([field]) => field);
    rec.statEvidence = {
      fields: Object.keys(provenance),
      filled,
      confirmed: confirmedFields,
      conflicts: conflictFields,
      source: row.source || null,
      action: row.action || null
    };
    rec.statConfidence = 'medium';
    if (filled.length) {
      rec.estimated = true;
      rec.statSource = 'secondary';
    } else if (conflictFields.length) {
      rec.statSource = 'secondary-conflict';
    } else if (confirmedFields.length) {
      rec.statSource = 'runtime-confirmed-secondary';
    }
  }
  if (row.conflicts) rec.statConflicts = row.conflicts;
}
/* Split the merged tag list into the two distinct card-face fields:
 *   rec.alignments -> the official TEN (bottom-left)
 *   rec.attributes -> the italic attributes (bottom-right)
 *   rec.junkTags    -> OCR garbage, kept for evidence but not a tag
 * Anything reading "all Computer groups" or "all Coastal places" must
 * consult rec.attributes, never rec.alignments. Before this split the
 * two were merged, so such a mechanic would also hit Government groups.
 * See the ALIGNMENTS10/ATTRIBUTES comment above for the rulebook quote. */
function splitAlignments(rec) {
  const src = Array.isArray(rec.alignments) ? rec.alignments : [];
  const al = [], at = [], junk = [];
  for (const raw of src) {
    const t = String(raw).toLowerCase();
    if (ALIGNMENTS10.has(t)) { if (al.indexOf(t) < 0) al.push(t); }
    else if (ATTRIBUTES.has(t)) { if (at.indexOf(t) < 0) at.push(t); }
    else if (JUNK_TAGS.has(t)) junk.push(t);
    else at.push(t);           // unknown tag: treat as attribute, not alignment
  }
  rec.alignments = al;
  rec.attributes = at;
  if (junk.length) rec.junkTags = junk;
}

/* P2-DATA-01: union de los atributos de la transcripcion secundaria.
 * El OCR local no trae la palabra del atributo en 52 cartas (p.ej. Japan
 * menciona "Coastal" en la carta impresa pero el OCR no lo capta), y ampliar
 * la lista blanca no alcanza: el dato no esta en el texto de entrada. Se
 * fusiona por UNION (nunca reemplazo) porque la fuente secundaria tiene menos
 * entradas que el dataset (137 grupos) y además duplica valores ("media"
 * aparece como ["media","media"]). Solo se aceptan los 9 terminos oficiales;
 * cualquier otra cosa se descarta para no inventar vocabulario. */
function applySecondaryAttributes(rec) {
  const row = scribdCards[norm(rec.name)];
  if (!row) return;
  /* P2-DATA-02: hay que unir LAS DOS representationes de la fuente secundaria.
   * row.attributes es la lista ya parseada, pero su lista blanca era mas
   * estrecha que la de la fuente: Brasil trae attributes=["coastal","huge"]
   * mientras que su attributeText es "Huge, Coastal, Nation". Al usar
   * attributes como unica fuente, `nation` se perdia para siempre. row
   * .attributeText es el texto crudo de la misma impresion y si contiene el
   * termino, asi que se une (nunca se reemplaza). El vocabulario completo que
   * aparece en attributeText es: science computer green media huge coastal
   * nation church communist secret bank space magic. */
  const src = [];
  if (Array.isArray(row.attributes)) src.push.apply(src, row.attributes);
  const rawText = String(row.attributeText || '');
  if (rawText) src.push.apply(src, rawText.split(/[,;/|]/));
  const added = [];
  for (const raw of src) {
    const t = String(raw).trim().toLowerCase();
    if (!t || !ATTRIBUTES.has(t)) continue;
    if (rec.attributes.indexOf(t) < 0) { rec.attributes.push(t); added.push(t); }
  }
  if (added.length) rec.attributesSource = 'secondary';
  // El texto secundario tambien conserva la etiqueta cruda como evidencia.
  if (row.attributeText && !rec.attributeText) rec.attributeText = row.attributeText;
}

/* P1-DATA-04 -- el OCR del runtime trunca muchas cartas a media frase.
 *
 * MEDICION (179 Plots/Resources pendientes, sandbox vm sobre cards.js):
 * de las 139 que aparecen en scribd_card_text.json, 131 tienen un texto
 * fuente MAS LARGO que el OCR del runtime, 8 son mas cortas y 40 no
 * aparecen. Ejemplos: 420 Xanadu 359 -> 727, 324 Necronomicon 219 -> 395,
 * 277 Head in a Jar 400 -> 466, 321 Murphy's Law 212 -> 279.
 *
 * scribd_card_text.json es un SEGUNDO pase de OCR sobre la MISMA impresion
 * (web archive del documento "Cards Illuminati INWO"). Donde es mas largo,
 * es muy probablemente donde el primer pase se corto a media frase.
 *
 * Regla dura: NUNCA se sobrescribe rec.text. La UI lo muestra y el motor
 * no lo lee, asi que tocarlo solo podria introducir regresiones sin
 * ganancia. Este lote solo ANADE un campo nuevo (textFull) para que las
 * decisiones de clasificacion se tomen leyendo el texto completo, y se
 * guardan ambos longitudes como evidencia para que la comparacion sea
 * auditable. El criterio es ">", no ">=": si son igual de largos no hay
 * nada que ganar y se evita duplicar texto en el dataset.
 */
function applySecondaryText(rec) {
  const row = scribdCards[norm(rec.name)];
  if (!row) return;
  const sec = String(row.sourceText || row.description || '').trim();
  const ocr = String(rec.text || rec.ocrText || '').trim();
/* P1-030 (segunda parte): la regla "la fuente secundaria debe ser MAS LARGA"
   era un proxy de "es mejor", y el proxy falla justo donde mas duele: en una
   baraja truncada a mitad de frase el OCR puede ser mas largo por llevar
   lineas decorativas corrompidas ("U=ed hte Flea Of") mientras la
   transcripcion del libro de reglas es mas corta y esta COMPLETA. Perder el
   numero de un efecto por un criterio de longitud es peor que aceptar un texto
   mas corto.

   Se aceptan, por tanto, tres casos, todos verificables y no gustativos:
     1. la fuente es mas larga que el OCR (comportamiento original);
     2. empate de longitud: el contenido es el mismo y la fuente es una
        transcripcion real, asi que se prefiere;
     3. el OCR esta TRUNCADO de forma demostrable (no termina en puntuacion
        final) y la fuente si termina: un texto corto que acaba en punto es
        mejor que uno largo cortado a la mitad, porque el numero del efecto
        esta al final de la frase.
   No se degrada nada: solo afecta a las cartas que aun NO tienen textFull. */
  if (!sec || !ocr) return;
  const complete = /[.!?)]["']?$/.test(sec);
  const ocrCut = !/[.!?)]["']?$/.test(ocr);
  const better = sec.length > ocr.length || sec.length === ocr.length || (ocrCut && complete);
  if (!better) return;
  rec.textFull = sec;
  rec.textSource = 'secondary';
  rec.textChars = { ocr: ocr.length, secondary: sec.length };}
function mechanicsStatus(card) {
  const kind = card.effect && card.effect.kind ? card.effect.kind : 'sin-effect';
  /* Transcribed off the card face: the printed rules are captured
   * verbatim, but engine.js does not consume these parameters yet.
   * Deliberately a distinct status so "data complete" is never
   * mistaken for "implemented in the engine". */
  if (card.verifiedMechanic) return 'implemented-pending-engine';
  if (kind === 'plot_generic' || kind === 'resource_generic' || kind === 'unverified') return 'unverified';
  if (kind === 'ability_unverified') return 'source-text-unmapped';
  if (kind === 'illu_special') return card.implemented ? 'implemented-special' : 'pending-engine';
  if (kind === 'assassination' || kind === 'disaster') return card.text ? 'source-text-unmapped' : 'pending-engine';
  if (card.implemented) return 'implemented';
  return card.text ? 'source-text-unmapped' : 'unverified';
}
const cards = [], seenIll = {};
for (const m of manifest) {
  const mkey = norm(m.name);
  const key = mkey.replace(/12$/, '').replace(/[12]$/, ''); // strip version suffix for lookups
  let rec = { id: mkey, name: m.name, img: m.file };
  const off = offType[key];
  const ocrText = ocrFor(m.name, mkey);
  if (ocrText) {
    rec.ocrText = String(ocrText).trim();
    rec.text = rec.ocrText;
  } else {
    rec.ocrText = null;
  }
  rec.source = { image: m.file || null, officialType: off || null, ocr: !!ocrText };
  let estimated = true;
  if (off) {
    switch (off) {
      case 'Grp.': rec.type='group'; rec.subtype='organization'; break;
      case 'Plc.': rec.type='group'; rec.subtype='place'; break;
      case 'Per.': rec.type='group'; rec.subtype='personality'; break;
      case 'Res.': rec.type='resource'; rec.subtype=null; break;
      case 'Ass.': rec.type='plot'; rec.subtype='assassination'; break;
      case 'Dis.': rec.type='plot'; rec.subtype='disaster'; break;
      case 'Ill.': rec.type='illuminati'; rec.subtype=null; break;
      default:
        rec.type='plot'; rec.subtype=plotSub(m.name);
        if (GOALS.has(key)) rec.subtype='goal';
    }
  } else if (m.folder === 'Illuminati') {
    rec.type='illuminati'; rec.subtype=null;
  } else {
    rec.type = m.folder==='Groups' ? 'group':'plot';
    if (rec.type==='group') rec.subtype='organization';
    else rec.subtype = GOALS.has(key) ? 'goal' : plotSub(m.name);
  }
  // stats
  const v = VERIFIED[key], il = ILLN[key];
  if (rec.type === 'illuminati') {
    const src = il || { p:8, r:null, e:{kind:'illu_special',code:'generic'}, g:{type:'basic'}, t:'' };
    rec.power = src.p; rec.resistance = null; rec.alignments = [];
    rec.effect = src.e; rec.goal = src.g; rec.text = src.t || rec.text || null;
    rec.implemented = !!il; rec.estimated = !il || seenIll[key] ? true : false;
    seenIll[key] = (seenIll[key]||0)+1;
  } else if (v) {
    rec.power=v[0]; rec.resistance=v[1]; rec.alignments=v[2];
    rec.effect = rec.type==='resource'
      ? {kind:'unverified', reason:'resource-text-pending-mapping'}
      : (rec.text ? {kind:'ability_unverified', reason:'ability-pending-mapping'} : null);
    rec.implemented = rec.type !== 'resource' && !rec.text;
    rec.estimated = false;
  } else {
    rec.power=null; rec.resistance=null; rec.alignments=[];
    rec.effect =
      rec.subtype==='assassination'?{kind:'assassination'}:
      rec.subtype==='disaster'?{kind:'disaster'}:
      rec.subtype==='goal'?{kind:'goal'}:
      rec.subtype==='nwo'?{kind:'nwo',color:'yellow'}:
      rec.type==='resource'?{kind:'unverified', reason:'resource-text-pending-mapping'}:
      {kind:'unverified', reason:'plot-text-pending-mapping'};
    rec.implemented=false; rec.estimated=true;
  }
  /* Transcribed Plot mechanics override the generic placeholders above.
   * Source of truth: research/audit_reports/plot_transcription.md, read
   * verbatim off the card faces. These 18 cards are the only ones whose
   * printed rules have been confirmed word-for-word, so they are the only
   * ones that may claim implemented:true. P2-DATA-02 adds the 15 "+10 Plots"
   * in BOOST10_FX, transcribed the same way off the same card faces. */
    const pfx = PLOT_FXN[key] || BOOST10_FXN[key] || POWERINC_FXN[key] || RESINC_FXN[key] || MESSIAH_FXN[key] || ANGST_FXN[key] || DICTATORSHIP_FXN[key] || BODYGUARD_FXN[key] || TALISMAN_FXN[key] || ROLL_FXN[key] || EVENT_FXN[key] || TOKEN_FXN[key] || FORCE_FXN[key] || BULK_FXN[key];
  if (pfx) {
    rec.effect = pfx;
    rec.subtype = pfx.kind;
    rec.verifiedMechanic = true;
    if (pfx.t) rec.text = pfx.t;
  }
  applySecondaryStats(rec);
  splitAlignments(rec);
  applySecondaryAttributes(rec);
  applySecondaryText(rec);
  rec.mechanicsStatus = mechanicsStatus(rec);
  // dedupe ids for duplicate image copies
  const dup = cards.find(c=>c.id===rec.id);
  if (dup) { rec.id = mkey+'-b'; }
  cards.push(rec);
}
const byName = {}; for (const c of cards) byName[c.id] = c;
const out = '// AUTO-GENERATED by gen_cards.js (Sisyphus). 421 physical PNGs -> logical cards.\n'+
  '// Stats verified where possible; estimated:true otherwise. Do not hand-edit.\n'+
  'window.INWO_CARDS={cards:'+JSON.stringify(cards)+' ,byIndex:function(i){return this.cards[i];}};\n'+
  '(function(){var b={};window.INWO_CARDS.cards.forEach(function(c,i){b[c.id]=c;c.idx=i;});window.INWO_CARDS.byId=b;})();\n';
fs.writeFileSync(path.join(ROOT,'game/js/cards.js'), out);
const tally={}; cards.forEach(c=>tally[c.type]=(tally[c.type]||0)+1);
console.log('written', cards.length, JSON.stringify(tally), 'verified-groups', Object.keys(VERIFIED).length);
