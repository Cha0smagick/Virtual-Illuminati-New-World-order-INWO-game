'use strict';

/* build_card_catalog.cjs — normaliza las 421 cartas y deja explícita la verificación. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function loadGlobal(file, variable) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  return context.window[variable];
}

const images = loadGlobal('game/js/images.js', 'INWO_IMAGE_FILES');
const cards = loadGlobal('game/js/cards.js', 'INWO_CARDS').cards;
const ocr = loadGlobal('game/js/cardtexts_data.js', 'INWO_OCR') || {};
const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'cards_parsed.json'), 'utf8'));
const parsedRecords = Array.isArray(parsed) ? parsed : (parsed.cards || Object.values(parsed)[0]);

const normalize = (value) => String(value || '')
  .replace(/\([^)]*\)/g, '')
  .replace(/\s+\d+$/, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const officialByName = new Map();
for (const record of parsedRecords || []) {
  if (!record || !record.name) continue;
  officialByName.set(normalize(record.name), record);
}

const imageByName = new Map();
for (const image of images || []) {
  if (image && image.name) imageByName.set(normalize(image.name), image);
}

function findOcr(card) {
  const candidates = [card.id, card.name, normalize(card.name), normalize(card.id)];
  for (const candidate of candidates) {
    if (candidate && Object.prototype.hasOwnProperty.call(ocr, candidate)) return String(ocr[candidate]);
  }
  return null;
}

function officialRecord(card) {
  const candidates = [card.name, normalize(card.name), normalize(card.id)];
  for (const candidate of candidates) {
    const key = typeof candidate === 'string' ? normalize(candidate) : '';
    if (key && officialByName.has(key)) return officialByName.get(key);
  }
  return null;
}

function effectStatus(card) {
  if (card.mechanicsStatus) return card.mechanicsStatus;
  const kind = card.effect && card.effect.kind ? card.effect.kind : 'sin-effect';
  if (kind === 'plot_generic' || kind === 'resource_generic' || kind === 'unverified') return 'unverified';
  if (kind === 'ability_unverified') return 'source-text-unmapped';
  if (kind === 'illu_special' || kind === 'assassination' || kind === 'disaster') {
    return card.implemented ? 'implemented-special' : 'source-mapped-pending-engine';
  }
  if (card.implemented) return 'implemented';
  return 'source-text-unmapped';
}

const catalog = cards.map((card) => {
  const official = officialRecord(card);
  const sourceText = findOcr(card) || (card.text ? String(card.text) : null);
  const kind = card.effect && card.effect.kind ? card.effect.kind : 'sin-effect';
  const image = imageByName.get(normalize(card.name)) || null;
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    subtype: card.subtype || null,
    officialType: official ? official.type : null,
    frequency: official ? official.freq || null : null,
    artist: official ? official.artist || null : null,
    image: card.img || (image && image.file) || null,
    stats: {
      power: card.power ?? null,
      resistance: card.resistance ?? null,
      alignments: card.alignments || [],
      estimated: Boolean(card.estimated)
    },
    mechanics: {
      kind,
      status: effectStatus(card),
      implemented: Boolean(card.implemented),
      sourceText,
      effect: card.effect || null
    },
    sources: {
      runtime: 'game/js/cards.js',
      ocr: sourceText ? 'game/js/cardtexts_data.js' : null,
      officialList: 'research/cards_parsed.json (SJG official list mirror)',
      rules: 'game/SPEC-RULES.md'
    }
  };
});

const counts = (values) => values.reduce((map, value) => {
  map[value] = (map[value] || 0) + 1;
  return map;
}, {});
const summary = {
  total: catalog.length,
  types: counts(catalog.map((card) => card.type)),
  officialTypeCoverage: catalog.filter((card) => card.officialType).length,
  ocrCoverage: catalog.filter((card) => card.mechanics.sourceText).length,
  mechanicStatus: counts(catalog.map((card) => card.mechanics.status)),
  estimatedStats: catalog.filter((card) => card.stats.estimated).length,
  nullPower: catalog.filter((card) => card.stats.power == null).length,
  nullResistance: catalog.filter((card) => card.stats.resistance == null).length
};

const jsonPath = path.join(ROOT, 'research', 'audit_reports', 'card_catalog.json');
const mdPath = path.join(ROOT, 'docs', 'audit', 'CARD_CATALOG.md');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify({ summary, cards: catalog }, null, 2) + '\n', 'utf8');

const escapeCell = (value) => String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const lines = [
  '# Catálogo de cartas — INWO OBD / WDH v1.2',
  '',
  '> Catálogo generado por `scripts/build_card_catalog.cjs`. No es una aprobación canónica automática: cada fila conserva su fuente y estado.',
  '',
  '## Fuentes',
  '',
  '- [Lista oficial de Steve Jackson Games](https://www.sjgames.com/inwo/lists/ill.html): nombres, tipos, frecuencia y artista; no contiene Power/Resistance/efectos completos.',
  '- [Reglas del proyecto](game/SPEC-RULES.md): reglas OBD/WDH v1.2 usadas por el motor.',
  '- `game/js/cardtexts_data.js`: OCR local de los textos impresos; puede contener errores de lectura.',
  '- `game/js/cards.js`: datos runtime actuales; los campos estimados no se convierten en canónicos automáticamente.',
  '',
  '## Regla de verificación',
  '',
  'Una carta con estado `blocked-unverified-family` o `source-text-unmapped` no debe recibir una mecánica genérica. Su texto se conserva como evidencia y queda bloqueada para uso exacto hasta mapearla a una regla probada.',
  '',
  '## Resumen',
  '',
  `- Total: **${summary.total}**`,
  `- Tipos runtime: ${Object.entries(summary.types).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  `- Tipo oficial encontrado: **${summary.officialTypeCoverage}/${summary.total}**`,
  `- Texto OCR disponible: **${summary.ocrCoverage}/${summary.total}**`,
  `- Stats estimadas: **${summary.estimatedStats}**`,
  `- Power null: **${summary.nullPower}**`,
  `- Resistance null: **${summary.nullResistance}**`,
  '',
  '| Estado mecánico | Cartas |',
  '|---|---:|',
  ...Object.entries(summary.mechanicStatus).sort().map(([key, value]) => `| ${key} | ${value} |`),
  '',
  '## Inventario completo',
  ''
];

for (const card of catalog) {
  const stats = card.stats;
  const source = card.mechanics.sourceText ? card.mechanics.sourceText.replace(/\r?\n/g, '\n> ') : 'Sin texto OCR disponible.';
  lines.push(
    `### ${escapeCell(card.name)}`,
    '',
    `- ID: \`${card.id}\` · runtime: \`${card.type}\` · oficial: \`${card.officialType || 'no encontrado'}\``,
    `- Power: ${stats.power == null ? 'null' : stats.power} · Resistance: ${stats.resistance == null ? 'null' : stats.resistance} · alineamientos: ${stats.alignments.length ? stats.alignments.join(', ') : '—'} · estimado: ${stats.estimated ? 'sí' : 'no'}`,
    `- Mecánica: \`${card.mechanics.kind}\` · estado: **${card.mechanics.status}** · implementada: ${card.mechanics.implemented ? 'sí' : 'no'}`,
    `- Imagen: ${card.image ? `\`${card.image}\`` : '—'}`,
    '',
    '> Texto fuente:',
    '> ' + source,
    ''
  );
}

fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(mdPath, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ json: path.relative(ROOT, jsonPath), markdown: path.relative(ROOT, mdPath), summary }, null, 2));

const strict = process.argv.includes('--strict');
if (strict && (catalog.length !== 421 || summary.officialTypeCoverage !== catalog.length || summary.ocrCoverage !== catalog.length)) {
  process.exitCode = 1;
}
