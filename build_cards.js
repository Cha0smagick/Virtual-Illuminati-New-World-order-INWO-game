const fs = require('fs');
const path = require('path');

// Load manifest
const manifestContent = fs.readFileSync('D:\\Illuminati NWO\\game\\js\\images.js', 'utf8');
// Strip leading comment and extract JSON array
const jsonMatch = manifestContent.match(/\[[\s\S]*\]/);
if (!jsonMatch) throw new Error('Could not find JSON array in manifest');
const manifest = JSON.parse(jsonMatch[0]);

// Load parsed cards
const parsedCards = JSON.parse(fs.readFileSync('D:\\Illuminati NWO\\research\\cards_parsed.json', 'utf8'));

// Load librarian verified stats (from the research)
const librarianContent = fs.readFileSync('D:\\Illuminati NWO\\librarian_result.txt', 'utf8');

// Build lookup maps - normalize names by removing version suffixes
function normalizeName(name) {
  return name.replace(/\s+\d+$/, '').toLowerCase().trim();
}

const parsedByName = {};
parsedCards.forEach(c => {
  const key = normalizeName(c.name);
  if (!parsedByName[key]) parsedByName[key] = [];
  parsedByName[key].push(c);
});

// Verified stats from librarian research (B.3 table + rules examples)
const verifiedStats = {
  // Illuminati
  "bavarian illuminati": { power: 10, resistance: null, alignments: [], type: "illuminati", globalPower: 10 },
  "servants of cthulhu": { power: 9, resistance: null, alignments: [], type: "illuminati", globalPower: 9 },
  "the network": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8 },
  "adepts of hermes": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },
  "bermuda triangle": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },
  "discordian society": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },
  "gnomes of zurich": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },
  "shangri-la": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },
  "ufos": { power: 8, resistance: null, alignments: [], type: "illuminati", globalPower: 8, estimated: true },

  // Groups - verified from rules examples + game log
  "a.m.a.": { power: 3, resistance: 4, alignments: ["peaceful", "conservative"], attributes: ["science"], type: "group", subtype: "organization" },
  "b.a.t.f.": { power: 3, resistance: 2, alignments: ["violent", "government"], type: "group", subtype: "organization" },
  "brazil": { power: 5, resistance: 3, alignments: ["government"], attributes: ["huge"], type: "group", subtype: "place" },
  "c.i.a.": { power: 6, resistance: 5, alignments: ["government", "violent"], type: "group", subtype: "organization" },
  "canada": { power: 3, resistance: 4, alignments: ["peaceful", "liberal", "government"], attributes: ["huge"], type: "group", subtype: "place" },
  "congressional wives": { power: 4, resistance: 4, alignments: ["conservative", "straight"], type: "group", subtype: "organization" },
  "england": { power: 6, resistance: 6, alignments: ["government"], attributes: ["huge"], globalPower: 2, type: "group", subtype: "place" },
  "fiendish fluoridators": { power: 3, resistance: 5, alignments: ["fanatic"], globalPower: 3, type: "group", subtype: "organization" },
  "finland": { power: 6, resistance: 5, alignments: ["liberal", "government"], attributes: ["computer"], type: "group", subtype: "place" },
  "france": { power: 3, resistance: 5, alignments: ["liberal", "government"], attributes: ["huge"], type: "group", subtype: "place" },
  "fraternal orders": { power: 5, resistance: 5, alignments: ["conservative"], type: "group", subtype: "organization" },
  "fred birch society": { power: 4, resistance: 4, alignments: ["conservative", "straight"], type: "group", subtype: "organization" },
  "germany": { power: 4, resistance: 3, alignments: ["conservative", "government"], attributes: ["huge"], type: "group", subtype: "place" },
  "hawaii": { power: 0, resistance: 2, alignments: [], type: "group", subtype: "place" },
  "japan": { power: 6, resistance: 8, alignments: ["peaceful", "government"], attributes: ["computer"], globalPower: 4, type: "group", subtype: "place" },
  "libertarians": { power: 4, resistance: 4, alignments: ["fanatic"], globalPower: 4, type: "group", subtype: "organization" },
  "local police departments": { power: 4, resistance: 4, alignments: ["straight", "violent", "conservative"], type: "group", subtype: "organization" },
  "mossad": { power: 2, resistance: 7, alignments: ["violent", "government"], globalPower: 1, type: "group", subtype: "organization" },
  "n.s.a.": { power: 5, resistance: 4, alignments: ["government"], attributes: ["computer"], globalPower: 2, type: "group", subtype: "organization" },
  "nephews of god": { power: 1, resistance: 4, alignments: ["conservative", "fanatic"], globalPower: 1, type: "group", subtype: "organization" },
  "new york": { power: 7, resistance: 8, alignments: ["government", "violent", "criminal"], type: "group", subtype: "place" },
  "nuclear power companies": { power: 4, resistance: null, alignments: ["conservative", "corporate"], attributes: ["science"], type: "group", subtype: "organization" },
  "pentagon": { power: 6, resistance: 6, alignments: ["government", "violent", "straight", "conservative"], type: "group", subtype: "place" },
  "robot sea monsters": { power: 1, resistance: 6, alignments: ["violent"], globalPower: 1, type: "group", subtype: "organization" },
  "russia": { power: 4, resistance: 4, alignments: ["violent", "government"], attributes: ["huge"], type: "group", subtype: "place" },
  "saddam hussein": { power: 5, resistance: 4, alignments: ["government", "violent"], type: "group", subtype: "personality" },
  "texas": { power: 14, resistance: 9, alignments: ["government", "violent", "conservative"], attributes: ["huge"], type: "group", subtype: "place" },
  "vatican city": { power: 4, resistance: 6, alignments: ["peaceful", "conservative"], globalPower: 4, type: "group", subtype: "place" },
  "w.i.t.c.h.": { power: 3, resistance: 6, alignments: ["weird", "violent", "fanatic"], attributes: ["magic"], globalPower: 3, type: "group", subtype: "organization" },

  // From rules examples
  "clone arrangers": { power: 6, resistance: null, alignments: ["violent", "criminal"], globalPower: 2, type: "group", subtype: "organization" },
  "hackers": { power: 3, resistance: null, alignments: ["weird", "fanatic"], globalPower: 2, type: "group", subtype: "organization" },
  "semiconscious liberation army": { power: 1, resistance: null, alignments: ["weird", "liberal", "violent", "criminal"], type: "group", subtype: "organization" },
  "american autoduel association": { power: 1, resistance: null, alignments: ["violent", "weird"], type: "group", subtype: "organization" },
  "wargamers": { power: 1, resistance: null, alignments: ["weird"], type: "group", subtype: "organization" },
  "mafia": { power: 6, resistance: null, alignments: ["criminal", "violent"], type: "group", subtype: "organization" },

  // Assassinations (Instant Attacks)
  "car bomb": { power: 8, resistance: null, alignments: [], type: "plot", subtype: "assassination" },
  "hit and run": { power: 6, resistance: null, alignments: [], type: "plot", subtype: "assassination", estimated: true },
  "poison": { power: 5, resistance: null, alignments: [], type: "plot", subtype: "assassination", estimated: true },
  "sniper": { power: 7, resistance: null, alignments: [], type: "plot", subtype: "assassination", estimated: true },
  "withering curse": { power: 6, resistance: null, alignments: [], type: "plot", subtype: "assassination", estimated: true },

  // Disasters
  "volcano": { power: 18, resistance: null, alignments: [], type: "plot", subtype: "disaster" },
  "the oregon crud": { power: 24, resistance: null, alignments: [], type: "plot", subtype: "disaster" },
  "atomic monster": { power: 10, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "earthquake": { power: 8, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "epidemic": { power: 9, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "giant kudzu": { power: 7, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "hurricane": { power: 10, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "meteor strike": { power: 12, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "nuclear accident": { power: 14, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "plague of demons": { power: 11, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "rain of frogs": { power: 8, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "tidal wave": { power: 10, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
  "tornado": { power: 9, resistance: null, alignments: [], type: "plot", subtype: "disaster", estimated: true },
};

// Illuminati special powers/goals (from B.4)
const illuminatiPowers = {
  "bavarian illuminati": {
    powerText: "Once per turn, may declare an attack Privileged (canceled attacks don't use it up).",
    goalText: "Self-contained; cannot be combined with Goal cards."
  },
  "servants of cthulhu": {
    powerText: "+4 to destroy (non-Instant destroy attacks).",
    goalText: "Destroy 8 Groups to win — each destroyed Group reduces the number needed to control by one. If they destroy their own last puppet as the 8th victim, they win instead of being eliminated."
  },
  "the network": {
    powerText: "Draw two Plot cards per turn.",
    goalText: "Computer Groups count double toward Basic Goal."
  },
  "adepts of hermes": {
    powerText: "Failed Attack to Control from hand/uncontrolled area: keep the Group (reroll in OBD).",
    goalText: "Each Magic Resource you own counts as a controlled Group. Cannot be combined with Goal cards."
  },
  "bermuda triangle": {
    powerText: "Reorganize your Power Structure (end-of-turn ability; may reorganize before declaring victory).",
    goalText: "Self-contained; cannot be combined with Goal cards."
  },
  "discordian society": {
    powerText: "Entire Power Structure immune to Straight and Government Groups.",
    goalText: "Weird Groups count double toward Basic Goal. Cannot be combined with Goal cards."
  },
  "gnomes of zurich": {
    powerText: "+4 to control Bank Groups (errata: Bank only, not Bank+Corporate).",
    goalText: "Corporate Groups count double toward Basic Goal. Cannot be combined with Goal cards."
  },
  "shangri-la": {
    powerText: "+5 defensive bonus against Instant Attacks; cannot attack to destroy non-Violent Groups.",
    goalText: "30 Peaceful Power in play (in any Power Structure) — OBD variant reduces to 20. All Shangri-La players share the victory. Cannot be combined with Goal cards."
  },
  "ufos": {
    powerText: "Two Illuminati Action tokens.",
    goalText: "Secretly select the Goal of one other Illuminati and reveal it on declaring victory (OBD; UFOs Classic variant: one secret, protected, changeable Goal card). Cannot be combined with Goal cards."
  }
};

// Alignment mapping from librarian research
const alignmentMap = {
  'G': 'government', 'V': 'violent', 'P': 'peaceful', 'L': 'liberal',
  'S': 'straight', 'W': 'weird', 'F': 'fanatic', 'C': 'conservative',
  'O': 'corporate'
};

// Closed set of valid alignments (lowercase)
const validAlignments = new Set([
  'violent', 'peaceful', 'government', 'corporate', 'criminal',
  'liberal', 'conservative', 'weird', 'straight', 'fanatic',
  'secret', 'green', 'media', 'bank', 'purifier', 'magic', 'huge', 'science'
]);

// Determine card type from parsed data
function getCardType(parsedEntry, manifestEntry) {
  if (!parsedEntry) return 'group';
  const t = parsedEntry.type;
  if (t === 'Ill.') return 'illuminati';
  if (t === 'Plot' || t === 'Ass.' || t === 'Dis.') return 'plot';
  if (t === 'Res.') return 'resource';
  if (t === 'Grp.' || t === 'Plc.' || t === 'Per.') return 'group';
  return 'group';
}

// Determine subtype
function getSubtype(parsedEntry, manifestEntry, cardType) {
  if (cardType === 'illuminati') return null;
  if (cardType === 'resource') return null;
  if (cardType === 'plot') {
    if (parsedEntry) {
      if (parsedEntry.type === 'Ass.') return 'assassination';
      if (parsedEntry.type === 'Dis.') return 'disaster';
      // Check for NWO cards
      if (parsedEntry.name.startsWith('NWO:') || parsedEntry.name.startsWith('Goal:')) {
        if (parsedEntry.name.startsWith('Goal:')) return 'goal';
        return 'nwo';
      }
    }
    return null;
  }
  // Group subtypes
  if (parsedEntry) {
    if (parsedEntry.type === 'Plc.') return 'place';
    if (parsedEntry.type === 'Per.') return 'personality';
    return 'organization';
  }
  // Fallback from name heuristics
  const name = manifestEntry.name;
  if (name.match(/^(Brazil|California|Canada|China|England|Finland|France|Germany|Hawaii|Hollywood|Israel|Italy|Japan|Las Vegas|Moonbase|New York|Orbit One|Pentagon|Russia|Silicon Valley|Stonehenge|Switzerland|Texas|Vatican City|The Great Pyramid|Center for Disease Control|Dinosaur Park)$/i)) {
    return 'place';
  }
  if (name.match(/^(Al Gore|Bill Clinton|Bjorne|Count Dracula|Dan Quayle|Elvis|Fidel Castro|George Bush|Gordo Remora|Hillary Clinton|Imelda Marcos|Jimmy Hoffa|Manuel Noriega|Margaret Thatcher|Media Sensation|Nancy Reagan|Ollie North|Prince Charles|Princess Di|Ronald Reagan|Ross Perot|Saddam Hussein)$/i)) {
    return 'personality';
  }
  return 'organization';
}

// Determine effect.kind
function getEffectKind(cardType, subtype, name, parsedEntry) {
  if (cardType === 'illuminati') return { kind: 'agent_duplicate_illuminati', implemented: true };
  if (cardType === 'resource') return { kind: 'resource_generic', implemented: true };
  if (cardType === 'plot') {
    if (subtype === 'assassination') return { kind: 'assassination', implemented: true };
    if (subtype === 'disaster') return { kind: 'disaster', implemented: true };
    if (subtype === 'nwo') return { kind: 'nwo', implemented: true };
    if (subtype === 'goal') return { kind: 'goal_special', implemented: true };
    // Check for known +10 plots
    const plus10Names = ['martial law', 'martyrs', 'terrorist nuke', 'new blood', 'benefit concert', 'good polls', 'grassroots support', 'commitment'];
    if (plus10Names.some(n => name.toLowerCase().includes(n))) return { kind: 'boost10_attack', implemented: true };
    // Check for freeze/paralyze
    if (name.toLowerCase().includes('freeze') || name.toLowerCase().includes('paralyze')) return { kind: 'freeze', implemented: true };
    // Check for zap
    if (name.toLowerCase().includes('zap')) return { kind: 'zap', implemented: true };
    // Check for power increase
    if (name.toLowerCase().includes('power increase') || name.toLowerCase().includes('emergency powers') || name.toLowerCase().includes('grassroots') || name.toLowerCase().includes('dictatorship')) return { kind: 'power_increase', implemented: true };
    return { kind: 'generic_plot', implemented: false };
  }
  return { kind: null, implemented: false };
}

// Generate text summary
function generateText(cardType, subtype, name, parsedEntry, verified) {
  if (cardType === 'illuminati') {
    const ip = illuminatiPowers[name.toLowerCase()];
    if (ip) return `Special: ${ip.powerText} Goal: ${ip.goalText}`;
    return `Illuminati card.`;
  }
  if (cardType === 'resource') {
    const resourceTypes = ['artifact', 'gadget', 'magic', 'unique'];
    const rt = resourceTypes.find(r => name.toLowerCase().includes(r)) || 'artifact';
    return `${rt.charAt(0).toUpperCase() + rt.slice(1)} Resource.`;
  }
  if (cardType === 'plot') {
    if (subtype === 'assassination') return `Assassination. Instant Attack to Destroy a Personality.`;
    if (subtype === 'disaster') return `Disaster. Attack to Destroy a Place.`;
    if (subtype === 'nwo') return `New World Order card. Played to center, affects all players.`;
    if (subtype === 'goal') return `Goal card. Alternate victory condition.`;
    return `Plot card.`;
  }
  // Group
  let parts = [];
  if (verified && verified.power !== undefined) parts.push(`Power ${verified.power}${verified.globalPower ? '/' + verified.globalPower : ''}`);
  if (verified && verified.resistance !== undefined && verified.resistance !== null) parts.push(`Resistance ${verified.resistance}`);
  if (verified && verified.alignments && verified.alignments.length) parts.push(`Alignments: ${verified.alignments.join(', ')}`);
  if (verified && verified.attributes && verified.attributes.length) parts.push(`Attributes: ${verified.attributes.join(', ')}`);
  if (parsedEntry && parsedEntry.freq) parts.push(`Rarity: ${parsedEntry.freq}`);
  return parts.join('; ') || 'Group card.';
}

// Normalize alignments to lowercase closed set
function normalizeAlignments(alignments) {
  if (!alignments) return [];
  return alignments.map(a => a.toLowerCase()).filter(a => validAlignments.has(a));
}

// Build cards array
const cards = [];
const seenIds = new Set();

manifest.forEach(m => {
  const key = m.name.toLowerCase().trim();
  const parsedEntries = parsedByName[key] || [];
  const parsedEntry = parsedEntries[0]; // Take first match
  const verified = verifiedStats[key] || {};

  const cardType = getCardType(parsedEntry, m);
  const subtype = getSubtype(parsedEntry, m, cardType);
  const effect = getEffectKind(cardType, subtype, m.name, parsedEntry);
  const text = generateText(cardType, subtype, m.name, parsedEntry, verified);
  const alignments = normalizeAlignments(verified.alignments || []);

  // Handle Illuminati version duplicates - only create one card entry per unique id
  const cardId = m.id;
  if (seenIds.has(cardId)) {
    // Skip duplicate version - already added
    return;
  }
  seenIds.add(cardId);

  const card = {
    id: cardId,
    name: m.name.replace(/ \d$/, ''), // Remove version number from name
    type: cardType,
    subtype: subtype,
    img: m.file, // root-relative path from manifest
    power: verified.power ?? (cardType === 'illuminati' ? 8 : (cardType === 'group' ? 3 : null)),
    resistance: verified.resistance ?? (cardType === 'group' ? 3 : null),
    alignments: alignments,
    text: text,
    effect: effect.kind ? { kind: effect.kind, ...(effect.kind === 'boost10_attack' ? { value: 10 } : {}) } : null,
    implemented: effect.implemented,
    estimated: !!verified.estimated
  };

  cards.push(card);
});

console.log(`Total unique cards: ${cards.length}`);
console.log(`Illuminati: ${cards.filter(c => c.type === 'illuminati').length}`);
console.log(`Groups: ${cards.filter(c => c.type === 'group').length}`);
console.log(`Resources: ${cards.filter(c => c.type === 'resource').length}`);
console.log(`Plots: ${cards.filter(c => c.type === 'plot').length}`);

// Build byName index
const byName = {};
cards.forEach(c => {
  byName[c.name.toLowerCase().trim()] = c;
});

// Output
const output = `// AUTO-GENERATED: INWO card database (${cards.length} unique cards from 421 PNGs)
window.INWO_CARDS = {
  cards: ${JSON.stringify(cards, null, 2)},
  byName: ${JSON.stringify(byName, null, 2)}
};`;

fs.writeFileSync('D:\\Illuminati NWO\\game\\js\\cards.js', output);
console.log('Written to D:\\Illuminati NWO\\game\\js\\cards.js');