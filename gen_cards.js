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
/* ==== L3b - LAS CINCO CARTAS QUE plan.md APLAZO, Y POR QUE UNA QUEDA FUERA ====

   L3a (BULK_POWER) resolvio la forma "subir/bajar el Poder de TODOS los grupos
   X" con un modificador permanente en el nodo. Las cinco cartas de L3b tienen
   OTRA forma cada una, y por eso cada una recibe su propio kind: el criterio de
   plan.md §0.1 es un kind unico por mecanica, y aqui no hay ni una mecanica
   repetida. Se declara una vez por que no se fusionan:

     268 Good Polls        -> def_triple      x3 al DEFENDER, con caducidad
     418 World Hunger      -> token_wither    dos frases: apaga fichas + -2 Poder
     234 Currency Specul.  -> tripled_once    x3 a UN grupo, para su proxima accion
     355 Resistance is U.. -> res_nullify     anula la Resistencia de UN grupo
     377 Sucked Dry ...    -> (NO IMPLEMENTADA, ver el final de este bloque)

   INTERPRETACIONES DECLARADAS (no existe fallos oficial para ninguna de las
   cuatro; el texto impreso es la unica fuente):

   1. ALCANCE DE 268 ("all your groups of ANY CHOSEN alignment"). El jugador
      elige UNA alineacion, no un grupo. Pero el flujo de la UI elige un NODO,
      no una alineacion, asi que la eleccion se hace apuntando a
      CUALQUIERA de los grupos propios de esa alineacion y el motor toma la
      PRIMERA de sus `nodeAligns`. Es una decision arbitraria y por eso se
      declara: un grupo con dos alineaciones haria que "la primera" dependa del
      orden de impresion de la carta. Alternativa rechazada: un `opts.align`
      propio, que obligaria a construir un segundo flujo de seleccion en la UI
      para UNA carta.
   2. "for defense only" (268) se aplica SOLO a la defensa: en un ataque a
      CONTROL se triplica la Resistencia, y en un ataque a DESTRUIR se triplica
      el Poder con el que se defiende (`defenderPower`), porque ahi el objetivo
      se defiende con su Poder y no con su Resistencia (regla de §25). NO se
      triplica `selfDef` (la auto-defensa), declarado: es un caso que las reglas
      mencionan aparte y la carta no lo nombra.
   3. CADUCIDAD. No hace falta ningun campo nuevo en `S`: el motor ya lleva
      `S.turn`, que se incrementa en `E.beginTurn`. "Until the beginning of
      your next turn" en un turno circular es `S.turn + S.players.length`.
   4. 234 "The Power OR Resistance (your choice)" se resuelve con
      `opts.stat` ('power' por defecto). "for its next action or defense": el
      x3 se borra al GASTAR la ficha del grupo (`spendGroupToken`, que es la
      accion) y al defenderse, este ultimo solo cuando la fuerza se resuelve de
      verdad (`computeStrength(true)`) y NO en `E.previewStrength()`, que solo
      enseña numeros y no puede gastar una carta.
   5. 355 "no Resistance bonus from its masters alignments or special
      abilities" se implementa como un flag propio (`noMasterAlignDefense`) que
      `computeStrength` consulta ANTES de sumar `closenessDefenseBonus`. NO se
      toca `positionBonus`: los +5/+10 de proximidad al Illuminati que rigen son
      justo lo que la carta dice que SE CONSERVA, y `positionBonus` ya los
      calcula.
   6. 418 "cannot get new ones or use their special abilities". Lo de las fichas
      es un predicado NUEVO (`noTokens`) que hay que consultar en CUATRO sitios
      (gastar ficha, buscar grupo que pueda ayudar, TOKEN-GIFT y el reparto
      automatico de fichas de `E.beginTurn`); si se olvida el cuarto, un grupo
      verde apagado recupera su ficha al turno siguiente. Lo de "sus especiales"
      NO se implementa: el motor no tiene sistema de habilidades especiales por
      grupo, asi que no hay nada que apagar. Se declara como no-op.
   7. 418 "Groups which are Liberal and/or Nation" usa la misma gramatica de
      clausulas de L3a (`moves`), con `scope:'all'`: el texto es
      "have their Power reduced by 2" sin "your", asi que afecta a TODOS los
      jugadores (interpretacion ALCANCE de L3a, pero al reves:alli se
      restringio porque las cartas decian "all X groups" siendo cartas de
      refuerzo propio; aqui el texto es inequivoco).

   377 "Sucked Dry and Cast Aside!" NO SE IMPLEMENTA en este lote, con un motivo
   declarado y no con una prisa: sus dos frases son "Multiply the Power of one
   of your groups ... by 4 FOR ONE ACTION ONLY" y "It is THEN considered
   destroyed, but does not count toward any Goal". El unico sitio donde el motor
   sabe que un grupo ha gastado su accion es `spendGroupToken`, y ese helper se
   llama desde DENTRO de recorridos `walk` (force_align recorre la estructura
   gastando fichas) y desde el registro de ataques. `destroyGroup` hace
   `detach()`, que MUTA el array `children` por el que ese `walk` esta
   iterando: destruir ahi puede hacer que el recorrido se salte un hijo. La
   opcion de dejar el x4 sin destruir es peor: seria una carta a medias, que es
   exactamente lo que este audit existe para matar. Hace falta una cola de
   destruccion diferida (`S.pendingBurstDestroy`) con un punto de vaciado claro
   (final de `E.resolveAttack` y de `E.endTurn`), y eso es un lote propio. */
const L3B_FX = {
  'good polls': {
    kind: 'def_triple',
    mul: 3,
    alignFromTarget: true,
    untilNextTurn: true,
    t: 'Play this card at any time. Until the beginning of your next turn, the Power and Resistance for all your groups of any chosen alignment is tripled, for defense only.'
  },
  'world hunger': {
    kind: 'token_wither',
    witherAttr: 'green',
    scope: 'all',
    moves: [
      { align: 'liberal', power: -2 },
      { attr: 'nation', power: -2 }
    ],
    t: 'All Green groups lose their Action tokens and cannot get new ones or use their special abilities! Groups which are Liberal and/or Nation have their Power reduced by 2.'
  },
  'currency speculation': {
    kind: 'tripled_once',
    targetAttr: 'bank',
    mul: 3,
    stat: 'choice',
    t: 'Used this card at any time. The Power or Resistance of any one of your Bank groups is tripled for its next action or defense.'
  },
  'resistance is useless': {
    kind: 'res_nullify',
    requiresActionFromAttr: 'media',
    untilCurrentTurn: true,
    t: 'For the rest of the current turn, the target groups Resistance is 0. The target also gets no Resistance bonus from its masters alignments or special abilities. But proximity to its ruling Illuminati still gives the normal +5 or +10. This card must be played by Media group, and counts as the groups action. Requires Media Action'
  }
};
const L3B_FXN = {};
for (const k in L3B_FX) {
  L3B_FXN[norm(k)] = L3B_FX[k];
}

/* ==========================================================================
   L4 - TOKEN-STRIP. Las cartas que dejan a los grupos sin ficha de accion.
   --------------------------------------------------------------------------
   Solo dos cartas de este plan: 350 Reach Out . . . y 270 Gremlins.
   203 Bigfoot, que plan.md ponia aqui, ha sido RECLASIFICADO (ver §45): es
   type=resource, de modo que su texto impreso es su HABILIDAD ESPECIAL
   permanente y no un robo de fichas, y sus dos clausulas ("puede cancelar
   CUALQUIER accion de un grupo Media" y "+3 al intentar controlar un grupo
   Green") necesitan un registro de acciones que el motor no tiene. Pasa al
   trabajo de Resources (familia L12), no a este.

   MECANICA UNICA. El efecto de las dos cartas es el mismo sin mas: poner
   tokens = 0 en cada nodo que encaje. Por eso comparten un unico `kind` y
   se distinguen solo por calificadores, exactamente como los 11 token_gift
   de L1 compartian kind con un calificador de alineacion o atributo.
   Anadir una carta a esta familia es anadir DATOS, no codigo.

   CALIFICADORES
     stripAttr      atributo exigido a los grupos (350 no exige ninguno)
     stripPlayers   'rival+own'  el rival elegido Y tus propios grupos
                    'all'        cualquiera, sin distincion
     ownToo         true        obligatoriamente los grupos del controlador
     illumAction    true        el coste es una accion del Illuminati
     canTakeResource true       la carta tiene ademas un modo de.robo de
                                 Resource (modo 'takeResource')

   DECLARACIONES DE INTERPRETACION (no existe fallo oficial para ninguna)
   1. ALCANCE DEL RIVAL. El flujo de seleccion de objetivo de la UI elige un
      NODO, no un jugador, asi que el rival se deduce con
      findOwnerPid(targetUid). 350 RECHAZA un objetivo propio, porque su
      texto dice "of any one of your rivals"; la mitad "your own groups" es
      automatica y no necesita objetivo. 270 no imprime ni "your" ni
      "rivals", asi que es 'all': el mismo autor que escribe esas dos
      frases cuando las quiere ("your own groups", "any one of your
      rivals") demuestra que cuando no las escribe es deliberado.
   2. RESOURCES INTOCABLES, por construccion. Un Resource nunca es un nodo de
      la estructura: vive solo en pl.resources. Por eso 350 ya cumple su
      "(but not the Resources)" sin tocar una linea: walk() no lo visita.
   3. MODO 2 DE 270 PENDIENTE. "cancel its action if the action was a use of
      its Power" es una ANULACION de una accion ya ejecutada, es decir un
      rollback. El motor no registra que hizo un grupo, solo que gasto una
      ficha, asi que una anulacion no tiene nada que deshacer todavia. Se
      implementara cuando exista el registro de acciones (mismo motivo por el
      que 377 Sucked Dry se aplaza en §44.6).
   4. "GADGET RESOURCE" NO SE PUEDE FILTRAR. El mazo no tiene clasificacion
      gadget/artifact: de 35 Resources, 34 tienen subtype null y 1 es
      bulk_power. El filtro por subtipo haria el modo INJUGABLE, asi que el
      modo 3 toma cualquier Resource del rival, y se declara aqui que el
      calificador impreso se ha loses a proposito en vez de fingir.
   5. "SOLO AL FINAL DE TU TURNO" DE 350 NO SE PUEDE APLICAR. El modelo de
      fases del motor tiene setup/begin/main/attack/gameover y NO tiene
      sub-fase de final de turno; E.endTurn exige phase==='main' y no hay
      ningun momento posterior dentro del turno en el que jugar una Plot. Se
      implementa lo exigible (turno propio + accion del Illuminati) y se
      declara la restriccion impresa como NO APLICADA por el motor, no como
      olvidada.
   6. NINGUNA DE LAS DOS IMPRIME "at any time", asi que ninguna entra en la
      lista instant de E.playPlot: son cartas de turno propio.
   7. ROBO DE FICHAS != INCAPACIDAD. Se pone tokens = 0 (un valor), NO se
      pone la marca noTokens. Un grupo al que le han robado la ficha puede
      volver a recibirla, que es justo lo que distingue a esta familia de
      418 World Hunger, que si deja la marca permanente.
   ========================================================================== */
const L4_FX = {
  'reach out . . .': {
    kind: 'token_strip',
    stripPlayers: 'rival+own',
    ownToo: true,
    illumAction: true,
    t: 'Reach Out . . . Remove all Action tokens from the Groups (but not the Resources) of any one of your rivals. You must also remove any remaining Action tokens from your own groups. You may play this card only at the end of your turn. It requires an action by your Illuminati. Requires Illuminati Action'
  },
  'gremlins': {
    kind: 'token_strip',
    stripAttr: 'computer',
    stripPlayers: 'all',
    canTakeResource: true,
    t: 'Gremlins do not exist! This card can be used to remove the Action token from any Computer groups, or to cancel its action if the action was a use of its Power. Alternatively, play this card to force a rival to put one Gadget Resource back in his hand.'
  }
};
const L4_FXN = {};
for (const k in L4_FX) {
  L4_FXN[norm(k)] = L4_FX[k];
}
/* ==== L5a - ATTACK BOOST: "+N to an Attack to Destroy/Control of X" ====
 *
 * plan.md lista L5 con 11 nombres, pero al medir cada carta SALEN solo
 * TRES que sean de verdad "+N a un ataque en curso" con `E.playPlot`. El resto
 * se reclasifico (ver §45 para el precedente de 203 Bigfoot, y §44 para 377):
 *
 *   189 Albino Alligators  -> NO es boost de ataque: da +10 Poder O Resistencia
 *                              a un grupo Weird tuyo, por una accion o hasta el
 *                              fin del turno. Es un delta de NODO con caducidad
 *                              => su propio lote mas adelante (L5c).
 *   205 Bimbo at Eleven    -> +5 a un ataque a destruir contra una Personality
 *                              MASCULINA y desde un grupo Media. El mazo NO tiene
 *                              campo `gender` en NINGUNA de sus 421 cartas, asi
 *                              que "male" no se puede autorizar => APLAZADO
 *                              (hallazgo de datos, ver §46).
 *   254 Faction Fight     -> exige "played along with a duplicate card for any
 *                              Group controlled by one of your rivals": necesita
 *                              combinacion de cartas + registro de duplicados
 *                              (lote L11) y su texto impreso esta TRUNCADO a
 *                              media frase ("bul the attack is") => APLAZADO.
 *   255 Fear and Loathing  -> cambia la aritmetica GLOBAL de alineaciones
 *                              (+8/-8 en vez de +4/-4). No es un boost: es una
 *                              regla permanente que modifica `computeStrength`
 *                              => su propio lote (L5b).
 *   311 Mercenaries,
 *   358 Rogue Boomer,
 *   373 Spear of Longinus -> `type=resource`: su texto es una HABILIDAD
 *                              PERMANENTE que se usa como accion mas adelante
 *                              ("Can act once per turn"), no un boost al jugarse.
 *                              Se reclassifican al lote de Resources (con 203).
 *   377 Sucked Dry...     -> sigue aplazado desde L3b (§44.6).
 *   419 World War Three   -> `subtype=goal`, ya es `kind='goal'` => lote de Goals.
 *
 * LAS TRES QUE SI SON DE ESTA FAMILIA, y por que comparten UN SOLO kind:
 * las tres son "+N a un ataque YA declarado", asi que todas empujan el mismo
 * dato (`A.boosts`) y todas necesitan las mismas tres cosas: un ataque abierto,
 * comprobar el calificador impreso y pagar el coste impreso. Solo cambian los
 * CALIFICADORES, que son DATOS (mismo patron que las 11 cartas de L1 con un
 * unico kind `token_gift`).
 *
 * DECLARACIONES DE INTERPRETACION (ningun arbitraje oficial existe para ellas):
 *
 * 1. ALCANCE DEL CALIFICADOR: se comprueba SIEMPRE, nunca se ignora. Si el
 *    ataque no encaja, la carta se RECHAZA con el motivo oficial, no se gasta y
 *    no hace nada. Es la misma disciplina que P1-017 en los nodos: el
 *    calificador se evalua contra el NODO atacante/objetivo, no contra la carta
 *    sola (un grupo que Dictatorship volvio violent sigue siendo violent).
 * 2. "Destroy the Lawyers" (391) es un CALIFICADOR POR CARTA CONCRETA, no por
 *    subtype: la carta 79 "Lawyers" es un group/organization concreto con
 *    `power:null` y `align:["criminal"]`. Por eso el campo es `targetCardId` y
 *    no `targetSubtype`.
 * 3. "to your Illuminati" (381) se comprueba contra el TIPO de la carta del
 *    atacante (`type==='illuminati'`), no contra un id: el mazo tiene 18
 *    Illuminati distintos y ningun ataque lleva un id de estos.
 * 4. "It cannot be used with Assassinations or Disasters" (415) se cumple POR
 *    CONSTRUCCION y por eso NO se declara campo: un Assassination o un Disaster
 *    NO crean `S.attack` (son ataques instantaneos de `E.playPlot`), asi que
 *    `case 'attack_boost'` solo puede alcanzarse con `A.type` 'control' o
 *    'destroy'. Un campo `noAssassination` seria decorativo.
 * 5. "a single direct attack" (381): el +10 vive EN el objeto del ataque
 *    (`A.boosts`), que muere con el. Por eso es de un solo uso sin estado que
 *    limpiar, igual que las cartas "+10" de §26 (`case 'boost10'` modo
 *    'attack'): el "+10 no se reutiliza" se cumple solo.
 * 6. Valor dependiente del objetivo (415): "+15 ... a Personality, o +10 a
 *    cualquier otro Group". El valor se elige AL JUGAR LA CARTA leyendo el
 *    subtype del nodo objetivo del ataque abierto, no en el momento de tirar los
 *    dados. Razon: la eleccion oficial es del jugador que juega la carta.
 * 7. "he cannot be returned to play by any means" (415): el ataque con exito ya
 *    destruye al objetivo, y eso lo hace `destroyGroup` (misma via que cualquier
 *    destruccion). Lo que la carta AÑADE es que ese duplicado no debe volver a
 *    jugarse nunca, y eso necesita un REGISTRO de cartas retiradas del juego
 *    que todavia no existe: la familia que lo consumiria (220 Clone, 287
 *    Imposter, 227 Counter-Revolution, 309 Media Blitz, "jugar un duplicado de un
 *    grupo destruido") es L11 y esta sin implementar. Por eso NO se declara
 *    ningun campo para esta clausula: un campo que nadie lee seria exactamente
 *    el defecto P1-026 (`A.privilege` declarado y nunca consumido). Queda
 *    declarado como PENDIENTE de L11.
 */
const L5_FX = {
  'swiss bank account': {
    kind: 'attack_boost', boostValue: 10, illumOnly: true,
    t: 'Play this card at any time to give +10 Power to your Illuminati for a single direct attack. This cannot be used for Global Power.'
  },
  "the first thing we do, let's kill all the lawyers": {
    kind: 'attack_boost', boostValue: 20, atkType: 'destroy', targetCardId: 'lawyers',
    t: "Gives a +20 to any Attack to Destroy the Lawyers. The player using this card must say solemnly, Of course, many lawyers are very nice people, and they are vital to the protection of our freedoms. Try to keep a straight face."
  },
  'whispering campaign': {
    kind: 'attack_boost', atkType: 'destroy', boostBySubtype: { personality: 15, other: 10 },
    requiresActionFromAttr: 'media',
    t: 'This card requires an Action from a Media group. It gives +15 in any Attack to Destroy a Personality, or +10 in any Attack to Destroy any other Group. It cannot be used with Assassinations or Disasters. If a Whispering Campaign succeeds against a Personality, he is considered destroyed, but not dead just permanently out of public life. Thus, he cannot be returned to play by any means! Requires Media Action'
  },
  'revolution!': {
    kind: 'attack_boost', atkType: 'any', targetAttr: 'nation',
    boostValue: 10, boostVsDictatorship: 20, payNotTheAttackers: true,
    t: 'Play this card on any attack, either to destroy or control, against a Nation. It gives a +10 bonus to the attack, or a +20 bonus against a Dictatorship. Playing this card requires an action by a group other than those actually attacking the Nation. Requires Action'
  }
};
const L5_FXN = {};
for (const k in L5_FX) {
  L5_FXN[norm(k)] = L5_FX[k];
}
/* ==== L5b - ALINE-RULE (255 Fear and Loathing) ==========================

   REGLA GLOBAL DE COMBATE. No es un bonus a un ataque ni a un grupo: cambia
   la MAGNITUD con la que las alineaciones comparadas valen, y el cambio
   aplica a TODO el juego mientras la carta este en juego.

   Texto impreso (verbatim):
     "Paranoia increases worldwide. Identical alignments now give +8 on any
      attempt to control, and -8 on any attempt to destroy. The reverse is
      true for opposed alignments."

   INTERPRETACIONES DECLARADAS (no existe ruling oficial sobre la durata):

   1. LA MAGNITUD ES UNA CONSTANTE GLOBAL, no un bonus. La regla oficial
      (inwo_rules_extracted.txt:487-493) dice "+4 por cada alineacion
      identica" y "-4 por cada alineacion opuesta". Esta carta no anade una
      cifra nueva al total: SUSTITUYE el 4 por un 8. Por eso el motor solo
      necesita leer un numero del estado, `S.alignRule.mag`, en los DOS
      bucles de alineaciones de computeStrength. Los SIGNOS no cambian:
      - control: identicas +mag, opuestas -mag
      - destroy: identicas -mag, opuestas +mag   (el "the reverse is true")
   2. DIRECCION: el texto dice "+8 on any attempt to control, and -8 on any
      attempt to destroy" para las IDENTICAS, y "the reverse is true for
      opposed alignments". Es exactamente la tabla de arriba. No hay lectura
      alternativa razonable.
   3. DURACION: el texto no pone fecha. Las cartas que cadenan lo dicen
      ("for the rest of the current turn", "until the beginning of your next
      turn"). Aqui no hay plazo, asi que el efecto dura el resto de la
      partida y la carta se EXPONE en la mesa (pl.exposedPlots) en vez de
      ir al descarte: es la regla de inwo_rules_extracted.txt:223 ("A Plot is
      'in play' if it is left on the table to mark an ongoing effect"), la
      misma que usan las cartas "+10" y las Cartas de Objetivo. P1-025 ya
      saca del descarte lo que este en exposedPlots, asi que no hace falta
      tocar el descarte.
   4. SIN COMPROBACION DE UNICIDAD: al exponerse, la carta sale del mazo, y
      cada carta de este mazo es unica, asi que no puede haber una segunda
      copia en la mano. Escribir el estado dos veces seria idempotente.
   5. NO ES "at any time": el texto no lo dice, luego la carta exige turno
      propio y NO entra en la lista `instant` de E.playPlot.
   6. LIMITACION DECLARADA: los ataques instantaneos (Assassinations,
      Disasters, E.instantAttack) NO pasan por computeStrength -- calculan
      su fuerza en announcePlotInstantAttack / E.instantAttack y nunca
      Incorporaron el termino de +/-4 por alineacion. Por tanto 255 no les
      afecta. No es un olvido de esta carta: es que la alineacion nunca
      contou ahi en este motor.
   7. "any two Fanatic Groups are opposite to each other" (oficial,
      :487-493 y :370-377) sigue sin implementarse en isOpposite(); queda
      como brecha declarada desde §20 y esta carta no la arregla.

   Un campo que nadie lee seria exactamente el defecto P1-026, asi que antes
   de declararlo se comprobo que el motor lo consume en los dos bucles.  */
const L5B_FX = {
  'fear and loathing': {
    kind: 'align_rule',
    alignMag: 8,
    t: 'Paranoia increases worldwide. Identical alignments now give +8 on any attempt to control, and -8 on any attempt to destroy. The reverse is true for opposed alignments.'
  }
};
const L5B_FXN = {};
for (const k in L5B_FX) {
  L5B_FXN[norm(k)] = L5B_FX[k];
}
/* L5c - ALBINO ALLIGATORS (189) y el ULTIMO delta con caducidad por turno.
 *
 * ESTA CARTA NO ES UN BONUS SOBRE UN ATAQUE (eso es L5a, `attack_boost`): es
 * un DELTA SOBRE EL PROPIO GRUPO. El plan lo decia exactamente asi ("es un
 * DELTA sobre el grupo, no un bonus sobre un ataque") y por eso tiene su
 * propio kind. Se apoya en los dos precedentes ya pagados:
 *   - 268 Good Polls (`def_triple`) por la CADUCIDAD por turno en el NODO con
 *     un unico vaciado centralizado en `expireTurnFlags()`;
 *   - 234 Currency Speculation (`tripled`) por el consumo cuando el grupo
 *     GASTA su ficha de accion (se limpia en `spendGroupToken`).
 * Aqui se combinan las dos duraciones, y por eso el NODO lleva un SOLO campo
 * `timedBoost` con `mode` en vez de dos campos casi iguales.
 *
 * INTERPRETACIONES DECLARADAS (7). No existe ninguna regla oficial sobre esta
 * carta, asi que se declara cada lectura:
 *
 * 1) "Power or Resistance (your choice)" es ELECCION DEL JUGADOR y por eso NO
 *    es un calificador de la carta: se elige con `opts.stat` al jugarla. Un
 *    calificador en `gen_cards.js` que el motor nunca lee seria exactamente el
 *    defecto P1-026 (`A.privilege`).
 * 2) Los dos modos ("If used with an action" / "If used for defense") NO son
 *    otra eleccion: los decide el CONTEXTO, y el contexto que el motor puede
 *    observar es si hay un ataque abierto contra ese grupo. Con un ataque
 *    abierto del que el grupo es el OBJETIVO, el modo es DEFENSA. En cualquier
 *    otro caso es ACCION.
 * 3) "must be played when that action is first declared" se implementa como:
 *    en modo ACCION el grupo objetivo TIENE que conservar su ficha de accion.
 *    El motor declara y ejecuta una accion en un solo paso (`E.declareAttack`
 *    gasta la ficha y `E.resolveAttack` tira los dados), asi que no existe un
 *    instante intermedio al que "volver" a jugar la carta. La ficha disponible
 *    es la comprobacion mas fiel disponible, y si no la tiene la carta se
 *    RECHAZA con el motivo impreso en vez de quedarse colgada hasta la
 *    siguiente vez que el grupo tenga ficha.
 * 4) "counts only for that action": el delta de modo ACCION se borra en
 *    `spendGroupToken`, igual que hace `tripled` con 234. No puede sobrevivir a
 *    la accion que justifico jugarla.
 * 5) "the bonus lasts until the end of the current turn": `untilTurn=S.turn`.
 *    Es el mismo criterio que uso 355 "Resistance is Useless!" ("For the rest
 *    of the current turn"), y lovacianza `expireTurnFlags()` en el mismo sitio,
 *    de modo que las tres caducidades por turno del motor se vacian juntas.
 * 6) "does not count toward Goals" NO SE IMPLEMENTA, y se declara en vez de
 *    inventarse un campo: para cumplirlo haria falta saber QUE ATAQUE uso este
 *    bonus, es decir un registro de actuaciones, que es el mismo hueco que
 *    bloquea 377 (L3b) y el "permanently out of public life" de 415 (L5a). El
 *    grupo sigue muriendo por `destroyGroup` exactamente igual que cualquier
 *    otro, que es la parte del texto que si se cumple.
 * 7) "any Weird group you control": el filtro es la alineacion WEIRD (no un
 *    atributo). El mazo tiene 13 atributos y 10 alineaciones, y `weird` es una
 *    alineacion: 22 grupos del mazo la tienen, asi que el calificador nunca es
 *    vacio. Es el mismo contrato que `giftAlign` de L1.
 */
const L5C_FX = {
  'albino alligators': {
    kind: 'group_boost_timed',
    align: 'weird',
    value: 10,
    t: 'Play this card at any time to give +10 Power or Resistance (your choice) to any Weird group you control. If used with an action, it must be played when that action is first declared, and counts only for that action. If used for defense, the bonus lasts until the end of the current turn and does not count toward Goals.'
  }
};
const L5C_FXN = {};
for (const k in L5C_FX) {
  L5C_FXN[norm(k)] = L5C_FX[k];
}

/* ============================================================================
 * L6 - NEGAR UN EVENTO: las cartas que dicen "that card has no effect",
 * "that attack becomes a failure" o "he must return it to his hand".
 *
 * Al escribir este bloque se ha medido el `type` de las 10 cartas de L6 y el
 * resultado NO es el que plan.md asumia. Se reparte asi:
 *
 *   210 Botched Contact .................. IMPLEMENTADA (takeover_return)
 *   359 Sabotage ......................... IMPLEMENTADA (takeover_return)
 *   278 Hex ............................... IMPLEMENTADA (resource_destroy)
 *   259 Foiled! .......................... IMPLEMENTADA (force_discard_exposed)
 *   356 Revolution! ....................... ANADIDA a la familia attack_boost
 *                                            que YA existe de L5a (§46), con
 *                                            dos calificadores nuevos
 *
 *   224 Computer Security ............... se aplaza
 *   230 Cover-Up ........................ se aplaza
 *   283 Hoax ............................ se aplaza
 *   363 Secrets Man Was Not Meant to Know  se aplaza
 *   222 Combined Disasters .............. se aplaza
 *   372 Spasm of Violence ............... se aplaza
 *
 * Motivo UNICO de los cuatro aplazados, y no es de este lote: las cuatro dicen
 * "that card has no effect" sobre una Plot YA RESUELTA. Deshacer un
 * efecto ya aplicado es exactamente el hueco que ya bloqueo la carta 276 Hat
 * Trick en §38.5 ("necesita un undo transaccional de una Plot ya resuelta").
 * En este motor `E.playPlot` es monofasico: el mismo `switch` que valida la
 * carta ejecuta su efecto y solo entonces devuelve. Convertirlo en bifasico
 * (anunciar / aplicar, como ya se hizo dos veces con los ataques en §33 y §37)
 * es un refactor de las 25 ramas del switch con riesgo de regresion real, y
 * ademas habria que devolver el coste de la carta anulada ("except to discard
 * the cards and actions spent on it", inwo_rules_extracted.txt:924-931). Se
 * declara la limitacion y se sigue; no se finge una semiproximidad.
 *
 * Motivo UNICO de 222 y 372: "You must play both of the Disaster cards, as
 * well" es una combinacion de cartas en una sola jugada. El motor juega una
 * carta por llamada. Es el mismo subsystem que necesita la carta 254 Faction
 * Fight ("Played along with a duplicate card"), que ya esta declarado
 * aplazado, asi que las tres van juntas al lote de duplicados.
 *
 * INTERPRETACIONES DECLARADAS (7):
 *
 *  1. "when a rival plays a Group for an automatic takeover" se engancha en
 *     `E.autoTakeover` DESPUES de que `placeUnder` tenga exito, que es cuando
 *     el grupo esta en la mesa y por tanto "esa Group to his hand" tiene
 *     sentido. No se engancha al INTENTO fallido: en este motor un takeover
 *     fallido lanza y la carta se queda en la mano del rival, asi que devolverla
 *     seria un no-op. (La misma razon por la que 412 Vultures quedo bloqueada
 *     en §38.5.)
 *
 *  2. 210 y 359 comparten `kind` porque su efecto es IDENTICO: el grupo vuelve
 *     a la mano de quien lo puso. Solo se diferencian en el coste y en un
 *     efecto adicional. Es el mismo criterio que las 11 cartas de L1
 *     TOKEN-GIFT y las 2 de L4 TOKEN-STRIP.
 *
 *  3. 210 "pick another card for automatic takeover that turn" NO se anula el
 *     gasto del takeover: el takeover sigue CONSUMIDO por el rival y lo que se
 *     le permite es elegir OTRA carta. Se declara asi porque es lo que dice el
 *     texto, y porque 359 (que si dice "cannot make an automatic takeover that
 *     turn") es la que bloquea de verdad.
 *
 *  4. 359 "group(s) with total Power of 6 or more, at least one of which shares
 *     an alignment with the Group your rival is trying to control" se comprueba
 *     contra la CARTA que se estaba colocando, leida del nodo recien creado. Y
 *     "either your Illuminati" se paga con UNA ficha, igual que en las nueve
 *     cartas force_align de §40.
 *
 *  5. 278 "A Magic Resource" NO se puede filtrar: el mazo no tiene clasificacion
 *     de Resources (34 de 35 tienen `subtype: null`, medido en L4). Se declara
 *     y el objetivo es cualquier Resource del rival. Es el mismo motivo por el
 *     que en L4 se solto el "Gadget Resource" de la carta 270. En cambio el
 *     COSTE si es filtrable, porque "a Magic group" usa el ATRIBUTO `magic`,
 *     que si existe en el vocabulario de 13.
 *
 *  6. 259 descarta por `discardPlot()`, el unico punto por el que una Plot
 *     entra en la pila (P1-025). Consecuencia deliberada: la Plot que se ve
 *     obligada a descartar Foiled! SI puede ser robada despues por Stealing the
 *     Plans, que dice "immediately after someone else discards a Plot card".
 *     By-passing el punto unico habria creado una segunda via de descarte.
 *
 *  7. 259 dice "one exposed Goal card", asi que el filtro es `subtype==='goal'`
 *     DENTRO de `pl.exposedPlots`, no "cualquier Plot expuesta". Se comprueba
 *     al responder, no al cerrar, para que la ventana pueda seguir abierta para
 *     otro jugador igual que hace Embezzlement con su pago.
 *
 * LIMPIEZA DE OCR en los `t:`: se deshacen los cortes de linea ("privi-leged")
 * y las letras duplicadas tipicas del OCR ("nval" -> "rival", "lliluminati" ->
 * "Illuminati"). El texto impreso es el de la carta; el OCR no es la fuente.
 * ========================================================================== */
const L6_FX = {
  'botched contact': {
    kind: 'takeover_return', alsoBlocks: false, payAnyGroup: true,
    t: 'Use this card when a rival plays a Group for an automatic takeover. He must return that Group to his hand, and pick another card for automatic takeover that turn. Playing this card requires an action from one of your groups. Requires Action'
  },
  'sabotage': {
    kind: 'takeover_return', alsoBlocks: true, payPower: 6, payShareAlign: true,
    t: 'Use this card when a rival plays a Group for an automatic takeover. He must return that Group to his hand. He cannot make an automatic takeover that turn. Playing this card requires an action(s) from either your Illuminati, or group(s) with total Power of 6 or more at least one of which shares an alignment with the Group that your rival is trying to control. Requires Action'
  },
  'hex': {
    kind: 'resource_destroy', notDuringPrivileged: true, payAttr: 'magic', payMinPower: 3,
    t: 'Play this card at any time except during a privileged attack. A Magic Resource controlled by a rival is destroyed. Discard its card. This card requires an action by your Illuminati, or by a Magic group with a Power of 3 or more. Requires Magic or Illuminati Action'
  },
  'foiled': {
    kind: 'force_discard_exposed', requiresActionFromAttr: 'media',
    t: 'You may force any rival to discard one exposed Goal card. This card may be used at any time, but requires an action from a Media group. Requires Media Action'
  }
};
const L6_FXN = {};
for (const k in L6_FX) {
  L6_FXN[norm(k)] = L6_FX[k];
}

/* ==== L7 - INTRUSION EN PLOTS OCULTOS ====
 *
 * Estas cuatro cartas hacen lo mismo en essence: dan acceso a las Plot cards
 * ocultas de un rival. Lo que cambia es QUE PUEDES HACER con lo que ves, y eso
 * es lo que las separa en tres `kind` distintos mas una carta que se juega
 * DENTRO de la ventana para impedirla:
 *
 *   peek_steal  (303 Logic Bomb)        robar UNA Plot oculta, y EXPONERLA
 *   peek_expose (322 Mutual Betrayal)   exponer tantas de el como tuyas
 *   peek_rob    (386 The Auditor...)    robar UNA o exponerlas TODAS
 *   peek_block  (242 Double-Cross)      la juega un RIVAL para cancelar el espionaje
 *
 * 304 March on Washington queda FUERA de este lote: "Play this card along with
 * a Plot card that requires an action or actions" es COMBINACION de cartas en
 * una sola jugada, y el motor juega una carta por llamada. Mismo subsistema que
 * ya dejo fuera a 254 Faction Fight, 222 Combined Disasters y 372 Spasm of
 * Violence. No se falsea ninguna de las dos mitades.
 *
 * INTERPRETACIONES DECLARADAS (no hay regla oficial que las resuelva):
 *
 * 1. QUE ES "UNA Plot OCULTA". En el juego fisico son las Plot cards de la
 *    mano de un rival que NO estan exposed. Aqui `pl.exposedPlots` es la lista
 *    de Plot cards dejadas sobre la mesa como marcador, y la mano es `pl.hand`,
 *    asi que "oculta" = cualquier indice de `S.players[rivalPid].hand` cuya
 *    carta sea `type==='plot'` y que no este en su `exposedPlots`.
 *
 * 2. "LOOK AT" ES UNA ELECCION, NO UN EFECTO. En el juego fisico el jugador
 *    mira el abanico con la mano. En esta version web la revelacion no puede existir tal cual
 *    (el azar y las manos rivales no se dibujan para quien las mira), y
 *    la traduccion funcional es la que declara plan.md: REVELAR LA LISTA por
 *    indice y que el jugador elija. Por eso la ventana `S.pendingPeek` no
 *    aplica nada al jugarse la carta: la aplica al CERRARSE, con la eleccion
 *    que el jugador ha hecho. Es el mismo contrato de dos pasos que las otras
 *    tres ventanas de reaccion del motor.
 *
 * 3. EL RIVAL SE ELIGE POR `opts.rivalPid`, y si no se pasa se toma el primer
 *    rival que tenga al menos una Plot oculta. Es la MISMA tecnica que 268 Good
 *    Polls (`alignFromTarget`) y que la correccion P1-034a de 278 Hex
 *    (elegir deterministamente cuando la UI no puede pasar el objetivo). No se
 *    inventa un selector de jugadores nuevo.
 *
 * 4. 303 "you must expose that card". En el juego fisico "expose" tiene
 *    dos significados: dejar la carta sobre la mesa, o simplemente hacer que
 *    el rival se entere de lo que has cogido. Aqui solo cabe el segundo: una
 *    carta no puede estar a la vez en la mano de quien la robo y expuesta
 *    sobre la mesa. Ademas el motor ya tiene `pl.exposedPlots` para el primer
 *    significado (una Plot que se deja como marcador de un efecto continuo,
 *    y P1-025 la saca de la mano del todo). Se DECLARA que la carta robada se
 *    entrega a la mano del jugador y que la exposicion se registra en el
 *    registro publico `pl.revealedBy`, porque es informacion que ya no se
 *    puede deshacer con una carta distinta y por tanto no es informacion
 *    secreta. Se declara porque el texto impreso obliga a algo y esta es la
 *    unica lectura que el motor puede sostener de verdad.
 * 5. 322 "expose any or all of them, as long as you also expose an equal
 *    number of your own Plots": se declara EXPONER COMO MINIMO una si el rival
 *    tiene Plot ocultas, porque la eleccion es del jugador y el motor no puede
 *    exigirle una decision; el limite superior es min(ocultas del rival, Plots
 *    propias sin exponer). Exponer cero de ambos lados es legal: "you MAY".
 *
 * 6. 242 Double-Cross "Your opponent loses the card which let him spy on you,
 *    and actions that powered it": el motor ya cobra el coste de la carta
 *    espia en el momento de jugarla (P1-022), asi que "pierde las acciones que
 *    la Movieron" ya es cierto y no hay que devolver nada. Perder la carta
 *    espia tambien es automatico: una carta jugada va a `S.plotDiscard` por
 *    `discardPlot` (P1-025). Lo que hace 242 es CANCELAR la ventana antes de
 *    que se revele nada, que es su unico efecto real ("He does not get to look
 *    at (or steal) any of your cards after all").
 *
 * 7. 386 "This card may only be used by the Network or a Computer group, or by
 *    a Bank group": son TRES pagadores distintos, dos por atributo (`computer`,
 *    `bank`) y uno por Illuminati (la Network, `effect.code==='network'`).
 *    El mismo patron que 278 Hex, donde el atributo filtra y el Illuminati paga
 *    un token.
 */
/* ---------------- L8a — MANIPULACION DE MAZO Y ROBO (361, 388, 411) ----------------
 *
 * Las tres cartas viven en la misma familia de motor (`deck_manip`) pero son tres
 * operaciones distintas sobre el mazo de Plot / el de Groups. Se agrupan aqui porque
 * comparten las dos piezas que hay que construir y que hasta §51 no existian:
 *
 *  A) TOP OF DECK. En este motor "la cima" es `pop()` (ver drawFrom, ~1054): el mazo
 *     se llena con unshift y se reparte con pop. 411 saca de la CIMA de SU mazo de
 *     Plot cards y las QUEMA ("removing them permanently from play" = fuera del
 *     juego, NO al descarte); 388 saca de la CIMA del mazo de Groups y las DESCARTA
 *     (al descarte, que si se rebaraja). El helper nuevo es `topOfDeck` y lo decide
 *     el llamante, porque las dos salidas son distintas.
 *
 *  B) TOKEN DE ACCION EXTRA. 388 y 411 imprimen, ambas: "For each [Group|Plot] you
 *     discard, you may place one extra Action token on one of your own Groups. No
 *     Group may get more than one extra Action token from this card." El motor ya
 *     GASTABA fichas de grupo (spendGroupToken) y las PONIA al empezar el turno
 *     (beginTurn, ~1015), pero no tenia ninguna forma de darMAS: las fichas extra
 *     eran un hueco total. Nace aqui `placeBonusAction`, y con ella la segunda
 *     ficha por grupo que exige la letra ("no more than one ... from this card").
 *
 * DECISIONES DE LECTURA (imprescindibles para no perderlas):
 *
 * 1. 361 Savings & Loan Scam: "Play this card at ANY TIME. Using this card is an
 *    action for ONE GROUP." Es decir, no es el turno de quien la juega: la gasta
 *    una ficha de grupo YA colocada, de ahi `anyTime:true` + `payGroupAction:true`
 *    y no entra en la lista `instant` por su cuenta... salvo que el gate de
 *    `E.playPlot` solo mira el KIND. Por eso la anado a la lista instant CON
 *    CONDICION (`deck_manip && anyTime`), no a pelo: si la metiera sin condicion,
 *    388 y 411 (ownTurn) quedarian jugables fuera de turno.
 *
 * 2. "Discard this card" (361) no necesita codigo propio: el final de `E.playPlot`
 *    manda toda Plot jugada al descarte (`discardPlot`, P1-025). Se cumple solo.
 *
 * 3. 388/411 imprimen "just after you place Action tokens". El motor no lleva
 *    bandera de "ya coloque las fichas de este turno", asi que lo que se exige es
 *    lo unico comprobable: fase principal y turno propio (`ownTurn:true`, que cae
 *    en el `requireOwnMain` del gate). Queda anotado en el backlog del §52.
 *
 * 4. 388: "You may ALSO discard the top card(s) from your Groups deck, as long as
 *    the TOTAL is ten or less." El techo de 10 es SUMA de mano + cima, no de cada
 *    fuente: por eso el dato es `maxTotal` y no `maxHand`/`maxDeck`.
 *
 * 5. 388: "For each GROUP you discard" cuenta los Groups descartados de la mano Y
 *    los de la cima del mazo (todos Groups de salida), y NO cuenta los Resources
 *    descartados de la mano ("Groups and/or Resources" da token; "each Group" no).
 *    Los Resources descartados van igualmente a `S.groupDiscard`, porque en el
 *    motor los Resources son fichas de grupo (`group`/`resource` se reparten del
 *    mismo `S.groupDeck`) y ese es el unico descarte que existe para ellos.
 *
 * 6. "you MAY place" = opcional, asi que `opts.bonusUids` puede venir vacio y el
 *    motor no obliga a colocar nada; lo que obliga es el techo (uno por grupo).
 */
const L8A_FX = {
  'savingsloanscam': { kind: 'deck_manip', mode: 'draw', anyTime: true, payGroupAction: true, drawPlot: 3, t: 'Play this card at any time. Using this card is an action for one group. Discard this card and draw three Plot cards from your deck. Requires Action' },
  'thebigsellout': { kind: 'deck_manip', mode: 'sellout', ownTurn: true, handTypes: ['group', 'resource'], maxTotal: 10, bonusMaxPerGroup: 1, t: 'Play this card during your own turn, just after you place Action tokens. You may pick up to ten Groups and/or Resources from your hand and discard them. You may also discard the top card(s) from your Groups deck, as long as the total is ten or less. For each Group you discard, you may place one extra Action token on one of your own Groups. No Group may get more than one extra Action token from this card. Requires Discard' },
  'voodooeconomics': { kind: 'deck_manip', mode: 'burn', ownTurn: true, burnMax: 10, bonusMaxPerGroup: 1, t: 'Play this card during your own turn, just after you place Action tokens. You may discard up to ten Plot Cards from the top of your deck, removing them permanently from play. For each one you discard, you may place one extra Action token on one of your own Groups. No Group may get more than one extra Action token from this card. Requires Discard' }
};
const L8A_FXN = {};

/* ---------------- L8b: ganchos de robo (233, 367) ----------------
 * Resources PASIVOS. No hacen nada en el momento de colocarse: cambian lo que
 * ocurre la proxima vez que su dueno roba. Por eso el kind es `draw_hook` y el
 * efecto viaja DENTRO del effect (`hook`), porque es lo que el motor guarda en la
 * entrada `pl.resources[]` al colocarlos.
 *   hook.deck   'plot' | 'group' | 'plotOrGroup'  -> a que mazo se aplica
 *   hook.pick   cuantas cartas de la mira y entre cuales elige (233: 3, 367: 1)
 *   hook.rest   'topOrBottom' -> donde van las que NO elige (solo 233)
 *   hook.alt    'bottom'      -> carta alternativa sin mirar (solo 367)
 * OJO: el hook NO se consume. Las dos cartas imprimen "Unique Magic Artifact" y
 * "Whenever you draw a Plot card", o sea que dura mientras el Resource este
 * enlazado. */
const L8B_FX = {
  'crystalskull': { kind:'draw_hook', hook:{ deck:'plot', pick:3, rest:'topOrBottom' },
    t:'Whenever you draw a Plot card, you may look at the top three cards in your deck and pick the one you want. You may replace the other two either on the top of the deck or on the bottom, before looking for your next card.' },
  /* 367 no tiene transcripcion secundaria (source.secondary.status =
   * 'secondary-not-found'), asi que `t:` sale del OCR. El texto impreso es legible
   * en la frase de mecanica; la linea de sabor ("The one in the museum is a fake,
   * The real one is far away, the center of nightly rituals") llega corrupta por
   * OCR y NO se transcribe aqui: `t:` es la mecanica, como en el resto de tablas. */
  'shroudofturin': { kind:'draw_hook', hook:{ deck:'plotOrGroup', pick:1, rest:null, alt:'bottom' },
    t:'Whenever you draw a Plot or Group card, you may look at the top card in the deck and, if you don\'t want it, take the bottom card instead, without looking at it.' }
};
const L8B_FXN = {};
Object.keys(L8B_FX).forEach(function (k) { L8B_FXN[k] = L8B_FX[k]; });
for (const k in L8A_FX) { L8A_FXN[norm(k)] = L8A_FX[k]; }

const L7_FX = {
  'logic bomb': { kind: 'peek_steal', payMinPower: 6, t: 'Pick one rival. You may look at all his hidden Plot cards, and choose one to take for yourself but you must expose that card. Play this card at any time. It requires an action by one group with a Power of 6 or more. Requires Action' },
  'mutual betrayal': { kind: 'peek_expose', t: 'Play this card at any time. This card requires an action by one group. Pick one rival. You may look at all his hidden Plot cards. After looking, you may expose any or all of them, as long as you also expose an equal number of your own Plots. Requires Action' },
  'the auditor from hell': { kind: 'peek_rob', payAttrAny: ['computer', 'bank'], illumCode: 'network', canExposeAll: true, t: 'This card may be played at any time. Choose one rival as your target. You may look at all his hidden Plot cards, and either steal one of them, or expose them all! This card may only be used by the Network or a Computer group, or by a Bank group. It counts as an action for that group. Requires Network, Computer or Bank Action' },
  'double-cross': { kind: 'peek_block', t: 'Play this card at any time a rival uses a Plot card to look at your hidden Plot cards. Your opponent loses the card which let him spy on you, and actions that powered it. He does not get to look at (or steal) any of your cards after all!' }
};
const L7_FXN = {};
for (const k in L7_FX) { L7_FXN[norm(k)] = L7_FX[k]; }


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
    const pfx = PLOT_FXN[key] || BOOST10_FXN[key] || POWERINC_FXN[key] || RESINC_FXN[key] || MESSIAH_FXN[key] || ANGST_FXN[key] || DICTATORSHIP_FXN[key] || BODYGUARD_FXN[key] || TALISMAN_FXN[key] || ROLL_FXN[key] || EVENT_FXN[key] || TOKEN_FXN[key] || FORCE_FXN[key] || BULK_FXN[key] || L3B_FXN[key] || L4_FXN[key] || L5_FXN[key] || L5B_FXN[key] || L5C_FXN[key] || L6_FXN[key] || L7_FXN[key] || L8A_FXN[key] || L8B_FXN[key];
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
