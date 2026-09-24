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
assert.strictEqual(summary.cardsWithOfficialMentions, 126, 'official mention count must be recorded');
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
  assert.ok(entry.ocr && ['ocr-reference', 'missing'].includes(entry.ocr.status), `${entry.id} must have OCR status`);
  assert.ok(['ocr-only-pending', 'official-mention-review-required', 'no-text-pending'].includes(entry.researchStatus), `${entry.id} must have a pending research status`);
  assert.match(entry.canonicalAction, /Do not implement automatically/);
}

assert.strictEqual(entries.find((entry) => entry.id === 'california').ocr.status, 'missing', 'known California OCR gap must remain explicit');
assert.ok(entries.some((entry) => entry.id === 'algore' && entry.ocr.status === 'ocr-reference'), 'OCR-backed pending cards must be linked');
assert.strictEqual(catalog.summary.mechanicStatus.unverified, 356, 'catalog must expose all 356 unverified cards');
const catalogResearch = catalog.cards.filter((card) => card.research);
assert.strictEqual(catalogResearch.length, 356, 'catalog must link all manifest records');
assert.ok(catalogResearch.every((card) => card.research.id === card.id), 'catalog research links must use matching card ids');

console.log('CARD RESEARCH MANIFEST PASSED (356 pending cards; OCR and provenance linked)');
