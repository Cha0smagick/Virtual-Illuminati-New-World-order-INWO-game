#!/usr/bin/env node
'use strict';

/**
 * Build an auditable per-card Internet/OCR research manifest.
 *
 * This script never promotes OCR or a name mention to a verified mechanic.
 * It records evidence and confidence so the catalog can distinguish runtime
 * data from canonical source data.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'research', 'audit_reports', 'card_research_manifest.json');
const OUT_MD = path.join(ROOT, 'docs', 'audit', 'CARD_RESEARCH.md');

const SOURCES = {
  officialList: {
    id: 'officialList',
    url: 'https://www.sjgames.com/inwo/lists/ill.html',
    local: 'research/cards_parsed.json',
    kind: 'official-metadata'
  },
  cardsFaq: {
    id: 'cardsFaq',
    url: 'https://www.sjgames.com/inwo/art/Cards-FAQ.txt',
    fallbackUrl: 'https://r.jina.ai/http://www.sjgames.com/inwo/art/Cards-FAQ.txt',
    kind: 'official-faq'
  },
  faq: {
    id: 'faq',
    url: 'https://www.sjgames.com/inwo/art/FAQ.txt',
    kind: 'official-faq'
  },
  errataNew: {
    id: 'errataNew',
    url: 'https://www.sjgames.com/inwo/art/Errata.New.txt',
    kind: 'official-errata'
  },
  errata: {
    id: 'errata',
    url: 'https://www.sjgames.com/inwo/art/Errata.txt',
    kind: 'official-errata'
  }
};

function loadWindowFile(file, globalName) {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.window[globalName];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCards() {
  const cards = loadWindowFile(path.join(ROOT, 'game', 'js', 'cards.js'), 'INWO_CARDS').cards;
  const ocr = loadWindowFile(path.join(ROOT, 'game', 'js', 'cardtexts_data.js'), 'INWO_OCR') || {};
  return { cards, ocr };
}

function readOfficialList() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'cards_parsed.json'), 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.cards || Object.values(raw)[0] || []);
  const byName = {};
  for (const row of list) {
    if (!row || !row.name) continue;
    byName[norm(row.name.split('(')[0])] = row;
  }
  return byName;
}

function getText(url, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.get(url, {
      headers: {
        'User-Agent': 'INWO-card-research/1.0',
        Accept: 'text/plain,text/html;q=0.9,*/*;q=0.1'
      }
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          resolve({ ok: false, status: response.statusCode, error: `HTTP ${response.statusCode}` });
          return;
        }
        resolve({ ok: true, text: body, status: response.statusCode });
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout after ${timeoutMs}ms`)));
    request.on('error', (error) => resolve({ ok: false, status: 0, error: error.message }));
  });
}

function sourceResult(definition, fetchedAt) {
  return {
    id: definition.id,
    url: definition.url,
    kind: definition.kind,
    local: definition.local || null,
    fetchedAt,
    sha256: null,
    bytes: null,
    lines: null,
    status: 'pending'
  };
}

function findMentions(cardName, text) {
  if (!text || !cardName) return [];
  const lines = text.split(/\r?\n/);
  const escaped = cardName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i');
  const mentions = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!pattern.test(lines[i])) continue;
    const snippet = lines
      .slice(Math.max(0, i - 1), Math.min(lines.length, i + 3))
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 600);
    mentions.push({ line: i + 1, snippet });
    if (mentions.length === 5) break;
  }
  return mentions;
}

function fieldValue(card, field) {
  if (field === 'power') return card.power ?? null;
  if (field === 'resistance') return card.resistance ?? null;
  if (field === 'alignments') return Array.isArray(card.alignments) ? card.alignments : [];
  if (field === 'effect') return card.effect || null;
  return null;
}

function fieldStatus(card, field) {
  if (field === 'power' || field === 'resistance') {
    if (card[field] == null) return 'missing';
    return card.estimated ? 'runtime-estimate' : 'runtime-value';
  }
  if (field === 'alignments') {
    return Array.isArray(card.alignments) && card.alignments.length ? 'runtime-value' : 'missing';
  }
  if (field === 'effect') {
    if (card.mechanicsStatus === 'implemented' || card.mechanicsStatus === 'implemented-special') return 'implemented';
    return card.mechanicsStatus || 'unverified';
  }
  return 'unknown';
}

function makeMarkdown(summary, entries) {
  const lines = [
    '# Card Research Manifest',
    '',
    'Generated by `scripts/build_card_research_manifest.cjs`. This is an evidence register, not a claim that every card is fully verified.',
    '',
    `- Cards researched: **${summary.total}**`,
    `- OCR-backed text: **${summary.ocrPresent}**`,
    `- Official metadata: **${summary.officialMetadataPresent}**`,
    `- Official FAQ/errata name mentions: **${summary.cardsWithOfficialMentions}**`,
    `- Cards with all runtime numeric fields: **${summary.cardsWithRuntimeStats}**`,
    `- Cards still needing canonical field/effect verification: **${summary.pendingCanonical}**`,
    '',
    '## Interpretation',
    '',
    '- `runtime-value` means the current local dataset has a value; it is not automatically canonical.',
    '- `runtime-estimate` means the value is explicitly marked estimated and must not be treated as exact.',
    '- `ocr-reference` means OCR text is preserved for research/display only; it is not proof of a parsed mechanic.',
    '- `official-mention` is a source excerpt containing the card name. It is evidence for review, not an automatic mechanic implementation.',
    '- `unverified` cards remain blocked by the engine until a source-backed mechanic is implemented.',
    '',
    '## Sources',
    '',
    ...Object.values(SOURCES).map((source) => `- ${source.id}: ${source.url}${source.local ? ` (local mirror: \`${source.local}\`)` : ''}`),
    '',
    '## Per-card records',
    ''
  ];
  for (const entry of entries) {
    lines.push(`### ${entry.name}`);
    lines.push('');
    lines.push(`- ID/type: \`${entry.id}\` / ${entry.type}`);
    lines.push(`- Runtime status: \`${entry.runtime.mechanicsStatus}\`; OCR: ${entry.ocr.status}; official mentions: ${entry.researchStatus}`);
    lines.push(`- Runtime fields: power \`${JSON.stringify(entry.runtime.power)}\`, resistance \`${JSON.stringify(entry.runtime.resistance)}\`, alignments \`${JSON.stringify(entry.runtime.alignments)}\``);
    if (entry.ocr.text) {
      lines.push(`- OCR text: ${entry.ocr.text.replace(/\r?\n/g, ' ').slice(0, 500)}`);
    }
    for (const mention of entry.officialMentions) {
      lines.push(`- ${mention.source} line ${mention.line}: ${mention.snippet}`);
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const { cards, ocr } = parseCards();
  const officialByName = readOfficialList();
  const pending = cards.filter((card) => card.mechanicsStatus === 'unverified');
  const fetchedAt = new Date().toISOString();
  const sourceResults = {};
  const sourceTexts = {};

  for (const definition of Object.values(SOURCES)) {
    if (definition.id === 'officialList') {
      const local = path.join(ROOT, definition.local);
      const text = fs.readFileSync(local, 'utf8');
      sourceResults[definition.id] = {
        ...sourceResult(definition, fetchedAt),
        status: 'ok-local',
        sha256: crypto.createHash('sha256').update(text).digest('hex'),
        bytes: Buffer.byteLength(text),
        lines: text.split(/\r?\n/).length
      };
      sourceTexts[definition.id] = text;
      continue;
    }
    let result = await getText(definition.url);
    let retrievedVia = definition.url;
    if (!result.ok && definition.fallbackUrl) {
      result = await getText(definition.fallbackUrl);
      retrievedVia = definition.fallbackUrl;
    }
    const record = sourceResult(definition, fetchedAt);
    record.retrievedVia = retrievedVia;
    if (result.ok) {
      record.status = 'ok';
      record.sha256 = crypto.createHash('sha256').update(result.text).digest('hex');
      record.bytes = Buffer.byteLength(result.text);
      record.lines = result.text.split(/\r?\n/).length;
      sourceTexts[definition.id] = result.text;
    } else {
      record.status = 'unavailable';
      record.error = result.error;
    }
    sourceResults[definition.id] = record;
  }

  const entries = pending.map((card) => {
    const official = officialByName[norm(card.name)] || null;
    const ocrText = card.ocrText || card.text || ocr[norm(card.name)] || ocr[norm(card.id)] || null;
    const mentions = [];
    for (const sourceId of ['cardsFaq', 'faq', 'errataNew', 'errata']) {
      const text = sourceTexts[sourceId];
      for (const mention of findMentions(card.name, text)) {
        mentions.push({ source: sourceId, url: SOURCES[sourceId].url, ...mention });
      }
    }
    const runtime = {
      power: card.power ?? null,
      resistance: card.resistance ?? null,
      alignments: card.alignments || [],
      estimated: Boolean(card.estimated),
      effect: card.effect || null,
      mechanicsStatus: card.mechanicsStatus || 'unverified',
      source: 'game/js/cards.js'
    };
    const ocrRecord = {
      status: ocrText ? 'ocr-reference' : 'missing',
      text: ocrText ? String(ocrText).trim() : null,
      source: 'game/js/cardtexts_data.js'
    };
    const officialRecord = {
      status: official ? 'official-metadata' : 'missing',
      type: official ? official.type || null : null,
      frequency: official ? official.frequency || null : null,
      artist: official ? official.artist || null : null,
      source: official ? SOURCES.officialList.url : SOURCES.officialList.url
    };
    const fields = {};
    for (const field of ['power', 'resistance', 'alignments', 'effect']) {
      fields[field] = { value: fieldValue(card, field), status: fieldStatus(card, field), source: 'game/js/cards.js' };
    }
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      subtype: card.subtype || null,
      image: card.img || null,
      official: officialRecord,
      ocr: ocrRecord,
      runtime,
      fields,
      officialMentions: mentions,
      researchStatus: mentions.length ? 'official-mention-review-required' : (ocrText ? 'ocr-only-pending' : 'no-text-pending'),
      canonicalAction: 'Do not implement automatically; verify field/effect against a canonical card image or rules source.'
    };
  });

  const summary = {
    generatedAt: fetchedAt,
    target: 'Steve Jackson Games World Domination Handbook v1.2 / One Big Deck',
    total: entries.length,
    byType: entries.reduce((acc, entry) => { acc[entry.type] = (acc[entry.type] || 0) + 1; return acc; }, {}),
    ocrPresent: entries.filter((entry) => entry.ocr.status === 'ocr-reference').length,
    officialMetadataPresent: entries.filter((entry) => entry.official.status === 'official-metadata').length,
    cardsWithOfficialMentions: entries.filter((entry) => entry.officialMentions.length > 0).length,
    cardsWithRuntimeStats: entries.filter((entry) => entry.runtime.power != null && entry.runtime.resistance != null).length,
    pendingCanonical: entries.filter((entry) => entry.researchStatus !== 'implemented').length,
    sources: sourceResults
  };
  const manifest = { summary, cards: entries };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, makeMarkdown(summary, entries), 'utf8');
  console.log(JSON.stringify({
    outputJson: path.relative(ROOT, OUT_JSON),
    outputMarkdown: path.relative(ROOT, OUT_MD),
    total: summary.total,
    byType: summary.byType,
    ocrPresent: summary.ocrPresent,
    officialMetadataPresent: summary.officialMetadataPresent,
    cardsWithOfficialMentions: summary.cardsWithOfficialMentions,
    sourceStatuses: Object.fromEntries(Object.entries(sourceResults).map(([id, record]) => [id, record.status]))
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
