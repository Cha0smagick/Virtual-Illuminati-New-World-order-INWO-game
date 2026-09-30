// Build a deterministic, field-level merge manifest from the secondary card transcription.
// Secondary values fill only missing runtime fields; conflicts are recorded and never overwritten.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = __dirname.replace(/scripts$/, '');
const runtimeContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/js/cards.js'), 'utf8'), runtimeContext);
const runtimeCards = runtimeContext.window.INWO_CARDS.cards;
const secondaryPath = path.join(ROOT, 'research/audit_reports/scribd_card_text.json');
const secondary = JSON.parse(fs.readFileSync(secondaryPath, 'utf8'));

const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byKey = new Map();
for (const entry of secondary.cards || []) {
  const keys = [entry.id, entry.name].filter(Boolean).map(norm);
  for (const key of keys) if (!byKey.has(key)) byKey.set(key, entry);
}
const powerValue = (entry) => {
  const values = Array.isArray(entry?.power?.values) ? entry.power.values : [];
  const unique = [...new Set(values.filter((value) => Number.isInteger(value)))];
  return unique.length === 1 ? { value: unique[0], values: unique, raw: entry.power.raw } : null;
};
const resistanceValue = (entry) => {
  const value = entry?.resistance?.value;
  return Number.isInteger(value) ? { value, raw: entry.resistance.raw } : null;
};
const sourceRef = (entry) => entry ? {
  url: entry.source?.url || secondary.source?.url,
  kind: 'secondary-transcription',
  match: entry.source?.match || null,
  paragraphIndex: entry.source?.paragraphIndex ?? null,
  textSha256: entry.source?.textSha256 || null,
  warning: secondary.source?.warning || 'Secondary transcription; cross-check before canonical promotion.'
} : null;

const merged = {};
const summary = {
  runtimeCards: runtimeCards.length,
  secondaryCards: secondary.cards?.length || 0,
  exactMatches: 0,
  missingPower: 0,
  missingResistance: 0,
  filledPower: 0,
  filledResistance: 0,
  filledAlignments: 0,
  filledReferenceText: 0,
  conflicts: 0,
  multiplePowerValues: 0
};

for (const card of runtimeCards) {
  const entry = byKey.get(norm(card.name)) || byKey.get(norm(card.id));
  const record = { name: card.name, id: card.id, type: card.type, runtime: {
    power: card.power ?? null,
    resistance: card.resistance ?? null,
    alignments: Array.isArray(card.alignments) ? card.alignments.slice() : []
  }};
  if (!entry) {
    record.sourceStatus = 'secondary-not-found';
    record.action = 'retain-runtime-and-block-unverified';
    merged[card.id] = record;
    continue;
  }
  summary.exactMatches += 1;
  record.sourceStatus = 'secondary-exact';
  record.source = sourceRef(entry);
  record.referenceText = entry.sourceText || null;
  if (record.referenceText) summary.filledReferenceText += 1;

  const p = powerValue(entry);
  const r = resistanceValue(entry);
  if (!p && Array.isArray(entry.power?.values) && new Set(entry.power.values).size > 1) summary.multiplePowerValues += 1;
  if (record.runtime.power == null) {
    if (p) {
      record.power = { value: p.value, raw: p.raw, status: 'secondary', confidence: 'medium' };
      summary.filledPower += 1;
    }
  } else if (p && record.runtime.power !== p.value) {
    record.conflicts = record.conflicts || {};
    record.conflicts.power = { runtime: record.runtime.power, secondary: p.value, raw: p.raw, reason: 'secondary-conflict-not-overwritten' };
    summary.conflicts += 1;
  } else if (p) {
    record.power = { value: record.runtime.power, raw: p.raw, status: 'runtime-confirmed-secondary', confidence: 'medium' };
  }

  if (record.runtime.resistance == null) {
    if (r) {
      record.resistance = { value: r.value, raw: r.raw, status: 'secondary', confidence: 'medium' };
      summary.filledResistance += 1;
    }
  } else if (r && record.runtime.resistance !== r.value) {
    record.conflicts = record.conflicts || {};
    record.conflicts.resistance = { runtime: record.runtime.resistance, secondary: r.value, raw: r.raw, reason: 'secondary-conflict-not-overwritten' };
    summary.conflicts += 1;
  } else if (r) {
    record.resistance = { value: record.runtime.resistance, raw: r.raw, status: 'runtime-confirmed-secondary', confidence: 'medium' };
  }

  if (record.runtime.alignments.length === 0 && Array.isArray(entry.alignments) && entry.alignments.length) {
    record.alignments = { values: entry.alignments.slice(), status: 'secondary', confidence: 'medium' };
    summary.filledAlignments += 1;
  } else if (record.runtime.alignments.length && Array.isArray(entry.alignments) && entry.alignments.length) {
    const missing = entry.alignments.filter((value) => !record.runtime.alignments.includes(value));
    if (missing.length) {
      record.alignments = { runtime: record.runtime.alignments.slice(), secondary: entry.alignments.slice(), missing, status: 'secondary-conflict-not-overwritten' };
    }
  }
  record.action = record.conflicts ? 'retain-runtime-record-secondary-conflict' : 'fill-missing-secondary-fields';
  merged[card.id] = record;
}

const output = {
  schemaVersion: 1,
  generatedBy: 'scripts/merge_secondary_card_data.cjs',
  source: {
    kind: 'secondary-transcription',
    url: secondary.source?.url || null,
    title: secondary.source?.title || null,
    warning: secondary.source?.warning || null,
    sourceSha256: secondary.source?.sourceSha256 || null,
    sourceBytes: secondary.source?.sourceBytes || null
  },
  policy: {
    canonicalValues: 'runtime/CMU values win',
    missingValues: 'secondary values may fill only null runtime fields',
    conflicts: 'recorded, never overwritten',
    mechanics: 'text alone does not promote mechanics to implemented'
  },
  summary,
  cards: merged
};
const outputPath = path.join(ROOT, 'research/audit_reports/card_data_merge.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath), ...summary }, null, 2));
