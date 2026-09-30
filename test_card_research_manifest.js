'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'research', 'audit_reports', 'card_research_manifest.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'research', 'audit_reports', 'card_catalog.json'), 'utf8'));
const entries = manifest.cards || [];
const summary = manifest.summary || {};

assert.strictEqual(entries.length, 356, 'research manifest must cover the 356 pending cards');
assert.strictEqual(summary.total, 356, 'manifest summary total must match entries');
assert.deepStrictEqual(summary.byType, { group: 138, plot: 183, resource: 35 });
assert.strictEqual(summary.ocrPresent, 353, 'manifest OCR coverage must be recorded');
assert.strictEqual(summary.officialMetadataPresent, 326, 'official metadata coverage must be recorded');
const recomputedMentions = entries.filter((entry) => (entry.officialMentions || []).length > 0).length;
assert.strictEqual(
  summary.cardsWithOfficialMentions,
  recomputedMentions,
  'official mention count must be recomputable from the per-card records'
);
assert.ok(summary.cardsWithOfficialMentions > 0, 'official mentions must be present');
const sourceIds = new Set(Object.keys(summary.sources || {}));
const healthy = (status) => ['ok', 'ok-local', 'ok-cache', 'ok-cache-stale'].includes(status);
const unavailableSources = Object.entries(summary.sources || {}).filter(([, source]) => !healthy(source.status));
const degraded = summary.degraded || null;
if (unavailableSources.length > 0) {
  assert.ok(degraded && degraded.degraded, 'an unavailable source must be recorded as explicit degradation');
  const lostIds = new Set((degraded.lostSources || []).map((item) => item.id));
  for (const [id] of unavailableSources) {
    assert.ok(lostIds.has(id), `unavailable source ${id} must be disclosed in summary.degraded.lostSources`);
  }
} else {
  assert.ok(!degraded, 'a fully available build must not be flagged as degraded');
}
assert.ok(summary.cardsWithSecondaryStats > 0, 'secondary numeric fills must be recorded');
assert.ok(summary.secondaryStatFields > 0, 'secondary field provenance must be recorded');
const recomputedSecondaryFields = entries.reduce((total, entry) => total + ((entry.runtime.statEvidence && entry.runtime.statEvidence.filled || []).length), 0);
const recomputedConflictFields = entries.reduce((total, entry) => total + ((entry.runtime.statEvidence && entry.runtime.statEvidence.conflicts || []).length), 0);
assert.strictEqual(summary.secondaryStatFields, recomputedSecondaryFields, 'secondary field provenance must be recomputable');
assert.strictEqual(summary.secondaryConflictFields, recomputedConflictFields, 'secondary conflicts must be recomputable and visible');
assert.strictEqual(summary.pendingCanonical, 356, 'all manifest entries remain pending canonical verification');
for (const [id, source] of Object.entries(summary.sources || {})) {
  assert.ok(source && source.status && source.status !== 'pending', `${id} source must have a final status`);
}

const ids = new Set();
for (const entry of entries) {
  assert.ok(entry.id && !ids.has(entry.id), `duplicate or missing manifest id: ${entry.id}`);
  ids.add(entry.id);
  assert.ok(entry.name && entry.type && entry.image, `${entry.id} must preserve card identity`);
  assert.ok(entry.runtime && entry.runtime.mechanicsStatus === 'unverified', `${entry.id} must remain explicitly unverified`);
  assert.ok(entry.fields && entry.fields.power && entry.fields.resistance && entry.fields.alignments && entry.fields.effect, `${entry.id} must have field evidence`);
  if (entry.runtime.statEvidence) {
    assert.ok(entry.runtime.statProvenance, `${entry.id} must retain field-level provenance with stat evidence`);
    assert.ok(Array.isArray(entry.runtime.statEvidence.filled), `${entry.id} must list filled fields`);
    assert.ok(Array.isArray(entry.runtime.statEvidence.conflicts), `${entry.id} must list conflict fields`);
  }
  assert.ok(entry.ocr && ['ocr-reference', 'missing'].includes(entry.ocr.status), `${entry.id} must have OCR status`);
  assert.ok(['ocr-only-pending', 'official-mention-review-required', 'no-text-pending'].includes(entry.researchStatus), `${entry.id} must have a pending research status`);
  for (const mention of entry.officialMentions || []) {
    assert.ok(sourceIds.has(mention.source), `${entry.id} mention must reference a declared source: ${mention.source}`);
    assert.ok(typeof mention.line === 'number' && typeof mention.snippet === 'string' && mention.snippet.length > 0, `${entry.id} mention must carry line and snippet evidence`);
  }
  assert.match(entry.canonicalAction, /Do not implement automatically/);
}

assert.strictEqual(entries.find((entry) => entry.id === 'california').ocr.status, 'missing', 'known California OCR gap must remain explicit');
assert.ok(entries.some((entry) => entry.id === 'algore' && entry.ocr.status === 'ocr-reference'), 'OCR-backed pending cards must be linked');
assert.strictEqual(catalog.summary.mechanicStatus.unverified, 356, 'catalog must expose all 356 unverified cards');
const catalogResearch = catalog.cards.filter((card) => card.research);
assert.strictEqual(catalogResearch.length, 356, 'catalog must link all manifest records');
assert.ok(catalogResearch.every((card) => card.research.id === card.id), 'catalog research links must use matching card ids');
assert.ok(catalog.summary.secondaryStatFields > 0, 'catalog must expose secondary numeric fills');
assert.ok(catalog.summary.secondaryConflictFields > 0, 'catalog must preserve secondary conflicts');

console.log('CARD RESEARCH MANIFEST PASSED (356 pending cards; OCR and provenance linked)');
