#!/usr/bin/env node
'use strict';

/**
 * Build a compact, auditable secondary-source dataset from the archived
 * Trunks666/Scribd transcription. This is deliberately not a canonical
 * rules source: it is evidence to cross-check against OCR and SJ Games
 * errata. Only exact normalized name-prefix matches are emitted.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'research', 'scribd_inwo_cards_full.html');
const OUTPUT_PATH = path.join(ROOT, 'research', 'audit_reports', 'scribd_card_text.json');
const SOURCE_URL = 'https://web.archive.org/web/20260308020259id_/https://www.scribd.com/doc/106832458/Cards-Illuminati-INWO';

const html = fs.readFileSync(SOURCE_PATH, 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'game', 'js', 'cards.js'), 'utf8'), context);
const runtimeCards = context.window.INWO_CARDS.cards;

const ALIGNMENTS = [
  'peaceful', 'violent', 'government', 'criminal', 'corporate', 'science',
  'liberal', 'conservative', 'weird', 'fanatic', 'computer', 'green',
  'straight', 'muslim', 'socialist', 'communist', 'magical', 'magic',
];
const ATTRIBUTES = [
  'media', 'bank', 'computer', 'green', 'secret', 'magic', 'coastal',
  'huge', 'municipal', 'media', 'military', 'religious', 'political',
];

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
    ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, token) => {
    if (token[0] === '#') {
      const hex = token[1] === 'x' || token[1] === 'X';
      const number = parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return Object.prototype.hasOwnProperty.call(named, token.toLowerCase())
      ? named[token.toLowerCase()]
      : match;
  });
}

function cleanText(value) {
  return decodeEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\|?\s*SSJ Future Trunks666\s*\|?\s*\[Link\]/gi, ' ')
      .replace(/\s+\|\s*SSJ Future Trunks666\s*\|?\s*\[Link\]/gi, ' ')
      .trim(),
  );
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match, index) => ({ index, text: cleanText(match[1]) }))
  .filter((item) => item.text && item.text.length > 1);

const byNormalizedName = new Map();
for (const card of runtimeCards) {
  const key = normalize(card.name);
  if (!key) continue;
  byNormalizedName.set(key, card);
}

function detectType(text, card) {
  const afterName = text.replace(/^[^\p{L}\p{N}.]+/u, '').trimStart();
  const match = afterName.match(/^(Personality|Place|Group|Plot|Resource|Illuminati)\b/i);
  if (!match) return card.type;
  const value = match[1].toLowerCase();
  if (value === 'personality' || value === 'place' || value === 'group') return 'group';
  if (value === 'illuminati') return 'illuminati';
  if (value === 'resource') return 'resource';
  return 'plot';
}

function parseAlignmentAndAttributes(tail) {
  let alignments = [];
  let attributes = [];
  const pipe = tail.lastIndexOf('|');
  const alignmentText = pipe >= 0 ? tail.slice(0, pipe) : tail;
  const attributeText = pipe >= 0 ? tail.slice(pipe + 1) : '';
  for (const term of ALIGNMENTS) {
    const pattern = new RegExp(`\\b${term}\\b`, 'i');
    if (pattern.test(alignmentText)) alignments.push(term);
  }
  for (const term of ATTRIBUTES) {
    const pattern = new RegExp(`\\b${term}\\b`, 'i');
    if (pattern.test(attributeText)) attributes.push(term);
  }
  return { alignments, attributes, alignmentText: alignmentText.trim(), attributeText: attributeText.trim() };
}

function parseCard(paragraph, card) {
  const text = paragraph.text;
  const normalizedText = normalize(text);
  const normalizedName = normalize(card.name);
  if (!normalizedText.startsWith(normalizedName)) return null;

  const fieldStart = text.search(/\bPower\s*:\s*/i);
  const fieldText = fieldStart >= 0 ? text.slice(fieldStart) : '';
  const powerMatch = fieldText.match(/\bPower\s*:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
  const resistanceMatch = fieldText.match(/\bResistance\s*:\s*(\d+)/i);
  const powerValues = powerMatch ? [Number(powerMatch[1]), ...(powerMatch[2] ? [Number(powerMatch[2])] : [])] : [];
  const resistance = resistanceMatch ? Number(resistanceMatch[1]) : null;
  let tail = '';
  if (resistanceMatch) tail = fieldText.slice(resistanceMatch.index + resistanceMatch[0].length);
  const parsed = parseAlignmentAndAttributes(tail);
  const description = (fieldStart >= 0 ? text.slice(0, fieldStart) : text).trim();
  const sourceHash = crypto.createHash('sha256').update(text).digest('hex');
  return {
    id: card.id,
    name: card.name,
    runtimeType: card.type,
    sourceType: detectType(text, card),
    sourceText: text,
    description,
    power: {
      raw: powerMatch ? powerMatch[0] : null,
      values: powerValues,
      status: powerValues.length ? 'secondary' : 'missing',
      confidence: powerValues.length ? 'medium' : 'none',
    },
    resistance: {
      value: resistance,
      raw: resistanceMatch ? resistanceMatch[0] : null,
      status: resistance === null ? 'missing' : 'secondary',
      confidence: resistance === null ? 'none' : 'medium',
    },
    alignments: parsed.alignments,
    alignmentText: parsed.alignmentText || null,
    attributes: parsed.attributes,
    attributeText: parsed.attributeText || null,
    source: {
      url: SOURCE_URL,
      kind: 'secondary-transcription',
      match: 'exact-normalized-prefix',
      paragraphIndex: paragraph.index,
      textSha256: sourceHash,
    },
  };
}

const candidates = new Map();
const unmatched = [];
for (const paragraph of paragraphs) {
  const normalizedText = normalize(paragraph.text);
  const matches = [...byNormalizedName.values()]
    .filter((card) => {
      const key = normalize(card.name);
      return key && normalizedText.startsWith(key);
    })
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length);
  if (matches.length === 0) {
    unmatched.push({ paragraphIndex: paragraph.index, preview: paragraph.text.slice(0, 160) });
    continue;
  }
  const card = matches[0];
  const parsed = parseCard(paragraph, card);
  if (!parsed) continue;
  const prior = candidates.get(card.id);
  const score = (parsed.power.values.length ? 4 : 0) + (parsed.resistance.value !== null ? 4 : 0) + parsed.alignments.length + parsed.description.length / 1000;
  const priorScore = prior ? (prior.power.values.length ? 4 : 0) + (prior.resistance.value !== null ? 4 : 0) + prior.alignments.length + prior.description.length / 1000 : -1;
  if (!prior || score > priorScore) candidates.set(card.id, parsed);
}

const cards = [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name));
const exactIds = new Set(cards.map((card) => card.id));
const fuzzy = [];
for (const card of runtimeCards) {
  if (exactIds.has(card.id)) continue;
  const key = normalize(card.name);
  const close = paragraphs.filter((paragraph) => {
    const text = normalize(paragraph.text);
    return key.length >= 5 && (text.includes(key.slice(0, Math.max(5, key.length - 2))) || text.includes(key.slice(0, 4)));
  });
  if (close.length) fuzzy.push({ id: card.id, name: card.name, candidates: close.slice(0, 3).map((p) => p.text.slice(0, 180)) });
}

const output = {
  schemaVersion: 1,
  source: {
    url: SOURCE_URL,
    kind: 'secondary-transcription',
    title: 'Cards Illuminati INWO (archived Scribd/Trunks666)',
    warning: 'Secondary transcription; not an official Steve Jackson Games rules source. Cross-check before canonical promotion.',
    sourceSha256: crypto.createHash('sha256').update(html).digest('hex'),
    sourceBytes: Buffer.byteLength(html),
  },
  parser: {
    paragraphCount: paragraphs.length,
    exactMatches: cards.length,
    fuzzyCandidates: fuzzy.length,
    unmatchedParagraphs: unmatched.length,
    algorithm: 'exact normalized card-name prefix; longest name wins; stats remain secondary',
  },
  cards,
  fuzzyCandidates: fuzzy,
  unmatchedParagraphs: unmatched,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT_PATH), ...output.parser, cards: cards.length, fuzzy: fuzzy.length }));
