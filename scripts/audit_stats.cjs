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

for (const card of groups) {
  const key = normalize(card.name);
  const image = ocr[key];
  const runtime = { power: card.power ?? null, resistance: card.resistance ?? null };
  if (card.power == null) nullPower.push(card.name);
  if (card.resistance == null) nullResistance.push(card.name);

  if (image && typeof image.power === 'number' && typeof image.resistance === 'number') {
    if (image.power === runtime.power && image.resistance === runtime.resistance) agreements++;
    else imageCorrections++;
  } else {
    missingOcr++;
  }

  const expected = CMU[key];
  if (expected) {
    const observed = image && typeof image.power === 'number'
      ? { power: image.power, resistance: image.resistance ?? null }
      : runtime;
    if (observed.power === expected[0] && observed.resistance === (expected[1] ?? null)) cmuMatches++;
    else cmuDiscrepancies.push(`${card.name}: runtime/OCR ${observed.power}/${observed.resistance} vs CMU ${expected[0]}/${expected[1]}`);
  }
}

const report = [
  '=== ESTADÍSTICAS DE CARTAS ===',
  `runtime groups: ${groups.length}`,
  `OCR agree: ${agreements}`,
  `OCR corrections: ${imageCorrections}`,
  `OCR missing: ${missingOcr}`,
  `CMU verified matches: ${cmuMatches}`,
  `CMU discrepancies: ${cmuDiscrepancies.length}`,
  `runtime power null: ${nullPower.length}`,
  `runtime resistance null: ${nullResistance.length}`,
  '',
  'CMU DISCREPANCIES:',
  ...cmuDiscrepancies,
  '',
  'POWER NULL:',
  ...nullPower,
  '',
  'RESISTANCE NULL:',
  ...nullResistance
].join('\n');

const reportDir = path.join(ROOT, 'research', 'audit_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'stats.txt'), report + '\n', 'utf8');
console.log(report);

// A data-quality gate must be explicit: default mode reports known debt;
// --strict turns discrepancies/missing values into a failing command.
const reportOnly = process.argv.includes('--report-only');
if (!reportOnly && (missingOcr || cmuDiscrepancies.length || nullPower.length || nullResistance.length)) {
  process.exitCode = 1;
}
