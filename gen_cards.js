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

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// name-key -> official type from SJG list
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
const ILL = {
  'Bavarian Illuminati': {p:10,r:null,e:{kind:'illu_special',code:'bavarian'},g:{type:'basic'},t:'Once per turn may declare one attack Privileged. Power 10.'},
  'The Network': {p:8,r:null,e:{kind:'illu_special',code:'network'},g:{type:'basic',doubleAttr:'computer'},t:'Draw two Plot cards at start of each turn. Computer groups count double toward your Basic Goal.'},
  'Servants of Cthulhu': {p:9,r:null,e:{kind:'illu_special',code:'cthulhu'},g:{type:'destroy',count:8},t:'+4 on all your attacks to destroy (not instant). GOAL: destroy 8 groups.'},
  'Gnomes of Zurich': {p:8,r:null,e:{kind:'illu_special',code:'gnomes'},g:{type:'basic',doubleAttr:'corporate'},t:'+4 to control any Bank group. Corporate groups count double toward your Basic Goal.'},
  'Discordian Society': {p:8,r:null,e:{kind:'illu_special',code:'discordian'},g:{type:'basic',doubleAttr:'weird'},t:'Your entire power structure is immune to Straight AND Government groups. Weird groups count double toward your Basic Goal.'},
  'Bermuda Triangle': {p:8,r:null,e:{kind:'illu_special',code:'bermuda'},g:{type:'basic'},t:'At end of your turn you may reorganize your power structure freely.'},
  'Shangri-La': {p:8,r:null,e:{kind:'illu_special',code:'shangrila'},g:{type:'peaceful_power',total:30},t:'+5 defense against Instant Attacks on your groups. You may never attack to destroy a non-Violent group. GOAL: control Peaceful groups with total printed Power of 30.'},
  'Adepts of Hermes': {p:8,r:null,e:{kind:'illu_special',code:'adepts'},g:{type:'basic'},t:'When an attempt to control one of your uncontrolled Groups fails, or you fail to control a Group from your hand, you keep it instead of discarding it.'},
  'The UFOs': {p:8,r:null,e:{kind:'illu_special',code:'ufos'},g:{type:'pick3'},t:'You get TWO Illuminati action tokens per turn. GOAL: secretly pick 3 non-Illuminati groups when game starts; control all 3 to win.'},
};
const ILLN = {}; for (const k in ILL) { ILLN[norm(k)] = ILL[k]; } ILLN['ufos'] = ILL['The UFOs'];

// Known Goal card names (victory-plot family)
const GOALS = new Set(['criminaloverlords','fratricide','haileris','thefourthreich','thenewworldorder','militaryindustrialcomplex','peaceinourtime','reconstructionafterrevolution','worldwariii']);

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
function mechanicsStatus(card) {
  const kind = card.effect && card.effect.kind ? card.effect.kind : 'sin-effect';
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
    rec.type = m.folder==='Groups' ? 'group':'plot'; rec.subtype = rec.type==='group'?'organization':plotSub(m.name);
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
