'use strict';

/* audit_stats.cjs — compara el dataset runtime con OCR y la tabla CMU. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const load = (name) => require(path.join(ROOT, 'game', 'js', name));
global.window = {};
load('images.js');
load('cards.js');
const C = global.window.INWO_CARDS;
if (!C || !Array.isArray(C.cards)) throw new Error('No se pudo cargar cards.js');

const mergePath = path.join(ROOT, 'research', 'audit_reports', 'card_data_merge.json');
const merge = fs.existsSync(mergePath)
  ? JSON.parse(fs.readFileSync(mergePath, 'utf8'))
  : { cards: {}, summary: {} };
const mergeCards = merge.cards || {};

const ocrPath = path.join(ROOT, 'research', 'stats_ocr.json');
const ocr = JSON.parse(fs.readFileSync(ocrPath, 'utf8'));
const CMU = {
  ama: [3, 4], batf: [3, 2], brazil: [5, 3], cia: [6, 5], canada: [3, 4],
  congressionalwives: [4, 4], england: [6, 2], finland: [6, 5], france: [3, 5],
  fraternalorders: [5, 5], freddiebirchsociety: [4, 4], germany: [4, 3], hawaii: [0, 2],
  japan: [6, 4], libertarians: [4, 4], localpolice: [4, 4], mossad: [2, 1], nsa: [5, 2],
  nephewsofgod: [1, 1], newyork: [7, 8], nuclearpowercompanies: [4, null], pentagon: [6, 6],
  russia: [4, 4], saddamhussein: [5, 4], texas: [14, 9], vaticancity: [4, 4], witch: [3, 3],
  clonarrangers: [6, 2], hackers: [3, 2], sca: [1, null], autoduelassociation: [1, null],
  wargamers: [1, null], mafia: [6, null]
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const groups = C.cards.filter((card) => card.type === 'group');
let agreements = 0;
let imageCorrections = 0;
let missingOcr = 0;
let cmuMatches = 0;
const cmuDiscrepancies = [];
const nullPower = [];
const nullResistance = [];
let secondaryPowerFills = 0;
let secondaryResistanceFills = 0;
let secondaryAlignmentFills = 0;
let secondaryConfirmations = 0;
let secondaryConflictCards = 0;
let secondaryConflictFields = 0;

for (const card of groups) {
  const key = normalize(card.name);
  const image = ocr[key];
  const mergeRow = mergeCards[key] || mergeCards[normalize(card.id)] || null;
  const runtime = { power: card.power ?? null, resistance: card.resistance ?? null };
  if (card.power == null) nullPower.push(card.name);
  if (card.resistance == null) nullResistance.push(card.name);

  if (mergeRow) {
    if (mergeRow.power && mergeRow.power.status === 'secondary') secondaryPowerFills++;
    if (mergeRow.resistance && mergeRow.resistance.status === 'secondary') secondaryResistanceFills++;
    if (mergeRow.alignments && mergeRow.alignments.status === 'secondary') secondaryAlignmentFills++;
    if (mergeRow.power && mergeRow.power.status === 'runtime-confirmed-secondary') secondaryConfirmations++;
    if (mergeRow.resistance && mergeRow.resistance.status === 'runtime-confirmed-secondary') secondaryConfirmations++;
    if (mergeRow.conflicts && Object.keys(mergeRow.conflicts).length) {
      secondaryConflictCards++;
      secondaryConflictFields += Object.keys(mergeRow.conflicts).length;
    }
  }

  if (image && typeof image.power === 'number' && typeof image.resistance === 'number') {
    if (image.power === runtime.power && image.resistance === runtime.resistance) agreements++;
    else imageCorrections++;
  } else {
    missingOcr++;
  }

  const expected = CMU[key];
  if (expected) {
    const observed = runtime;
    const expectedResistanceMatches = expected[1] == null || observed.resistance === expected[1];
    if (observed.power === expected[0] && expectedResistanceMatches) cmuMatches++;
    else cmuDiscrepancies.push(`${card.name}: runtime ${observed.power}/${observed.resistance} vs CMU ${expected[0]}/${expected[1] ?? '(resistance unspecified)'}`);
  }
}

const report = [
  '=== ESTADÍSTICAS DE CARTAS ===',
  `runtime groups: ${groups.length}`,
  `runtime power null (after secondary fill): ${nullPower.length}`,
  `runtime resistance null (after secondary fill): ${nullResistance.length}`,
  `secondary Power fills: ${secondaryPowerFills}`,
  `secondary Resistance fills: ${secondaryResistanceFills}`,
  `secondary alignment fills: ${secondaryAlignmentFills}`,
  `secondary runtime confirmations: ${secondaryConfirmations}`,
  `secondary conflict cards: ${secondaryConflictCards}`,
  `secondary conflict fields: ${secondaryConflictFields}`,
  `OCR agree (diagnostic only): ${agreements}`,
  `OCR corrections (diagnostic only): ${imageCorrections}`,
  `OCR missing (diagnostic only): ${missingOcr}`,
  `CMU runtime matches: ${cmuMatches}`,
  `CMU runtime discrepancies: ${cmuDiscrepancies.length}`,
  '',
  'CMU RUNTIME DISCREPANCIES:',
  ...cmuDiscrepancies,
  '',
  'UNRESOLVED POWER NULL:',
  ...nullPower,
  '',
  'UNRESOLVED RESISTANCE NULL:',
  ...nullResistance
].join('\n');

const reportDir = path.join(ROOT, 'research', 'audit_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'stats.txt'), report + '\n', 'utf8');
console.log(report);

// The strict gate covers unresolved canonical/runtime debt. Raw OCR
// discrepancies remain visible diagnostics because the OCR source is noisy;
// secondary conflicts and missing runtime values are never silently ignored.
const reportOnly = process.argv.includes('--report-only');
if (!reportOnly && (cmuDiscrepancies.length || nullPower.length || nullResistance.length || secondaryConflictFields)) {
  process.exitCode = 1;
}
