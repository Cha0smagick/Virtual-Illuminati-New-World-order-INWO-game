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
const CACHE_DIR = path.join(ROOT, 'research', 'audit_reports', '_source_cache');
const CACHE_FRESH_DAYS = 30;

const ARGV = process.argv.slice(2);
const hasFlag = (name) => ARGV.includes(name);
const REFRESH_SOURCES = hasFlag('--refresh') || process.env.INWO_REFRESH_SOURCES === '1';
const ALLOW_DEGRADED = hasFlag('--allow-degraded') || process.env.INWO_ALLOW_DEGRADED === '1';
const OFFLINE = hasFlag('--offline');

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
    fallbackUrl: 'https://r.jina.ai/http://www.sjgames.com/inwo/art/FAQ.txt',
    kind: 'official-faq'
  },
  errataNew: {
    id: 'errataNew',
    url: 'https://www.sjgames.com/inwo/art/Errata.New.txt',
    fallbackUrl: 'https://r.jina.ai/http://www.sjgames.com/inwo/art/Errata.New.txt',
    kind: 'official-errata'
  },
  errata: {
    id: 'errata',
    url: 'https://www.sjgames.com/inwo/art/Errata.txt',
    fallbackUrl: 'https://r.jina.ai/http://www.sjgames.com/inwo/art/Errata.txt',
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

function sha256Of(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readSourceCache(id) {
  const textFile = path.join(CACHE_DIR, `${id}.txt`);
  const metaFile = path.join(CACHE_DIR, `${id}.meta.json`);
  try {
    if (!fs.existsSync(textFile) || !fs.existsSync(metaFile)) return null;
    const text = fs.readFileSync(textFile, 'utf8');
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    if (sha256Of(text) !== meta.sha256) return null;
    return { text, meta };
  } catch (error) {
    return null;
  }
}

function writeSourceCache(id, text, meta) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${id}.txt`), text, 'utf8');
  fs.writeFileSync(path.join(CACHE_DIR, `${id}.meta.json`), JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

function readPreviousSummary() {
  try {
    const previous = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    return previous && previous.summary ? previous.summary : null;
  } catch (error) {
    return null;
  }
}

const HEALTHY_STATUS = new Set(['ok', 'ok-local', 'ok-cache', 'ok-cache-stale']);

function buildDegradation(previousSummary, summary) {
  const report = {
    degraded: false,
    lostSources: [],
    previousCardsWithOfficialMentions: null,
    cardsWithOfficialMentions: summary.cardsWithOfficialMentions,
    mentionDelta: null,
    note: null
  };
  if (!previousSummary) {
    report.note = 'No previous manifest to compare against; nothing to degrade.';
    return report;
  }
  const previousSources = previousSummary.sources || {};
  for (const [id, previous] of Object.entries(previousSources)) {
    const current = summary.sources[id] || {};
    const wasHealthy = HEALTHY_STATUS.has(previous.status);
    const isHealthy = HEALTHY_STATUS.has(current.status);
    if (wasHealthy && !isHealthy) {
      report.lostSources.push({
        id,
        previousStatus: previous.status,
        status: current.status || 'missing',
        error: current.error || null
      });
    }
  }
  const previousMentions = Number.isFinite(previousSummary.cardsWithOfficialMentions)
    ? previousSummary.cardsWithOfficialMentions
    : null;
  report.previousCardsWithOfficialMentions = previousMentions;
  if (previousMentions !== null) {
    report.mentionDelta = summary.cardsWithOfficialMentions - previousMentions;
  }
  report.degraded = report.lostSources.length > 0 || (report.mentionDelta !== null && report.mentionDelta < 0);
  report.note = report.degraded
    ? 'This register was rebuilt without at least one previously available source. Treat the missing evidence as unverified, not as absent.'
    : 'No previously available source was lost in this build.';
  return report;
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
  const provenance = card.statProvenance && card.statProvenance[field];
  if (provenance && provenance.status) return provenance.status;
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
    `- Cards with secondary numeric fields: **${summary.cardsWithSecondaryStats}** (${summary.secondaryStatFields} fields)`,
    `- Secondary conflict fields preserved: **${summary.secondaryConflictFields}**`,
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
    '## Source availability',
    '',
    ...Object.values(summary.sources).map((source) => `- ${source.id}: **${source.status}**${source.sha256 ? ` (sha256 \`${source.sha256.slice(0, 16)}…\`)` : ''}${source.error ? ` — ${source.error}` : ''}`),
    ...(summary.degraded
      ? [
          '',
          '> **Degraded evidence register.** This file was rebuilt without at least one source that a previous build had.',
          `> Lost sources: ${summary.degraded.lostSources.map((item) => `\`${item.id}\` (was \`${item.previousStatus}\`)`).join(', ') || 'none recorded'}.`,
          `> Official mention count moved from ${summary.degraded.previousCardsWithOfficialMentions} to ${summary.degraded.cardsWithOfficialMentions} (delta ${summary.degraded.mentionDelta}).`,
          '> Missing evidence means "not retrieved", never "does not exist".',
          ''
        ]
      : ['']),
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
     if (entry.runtime.statEvidence) {
       lines.push(`- Numeric provenance: source \`${entry.runtime.statSource || 'none'}\`; filled \`${JSON.stringify(entry.runtime.statEvidence.filled || [])}\`; conflicts \`${JSON.stringify(entry.runtime.statEvidence.conflicts || [])}\``);
     }
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
    let fetched = null;
    let lastError = OFFLINE ? 'offline mode requested (--offline)' : null;
    let lastHttpStatus = null;
    if (!OFFLINE) {
      fetched = await getText(definition.url);
      lastError = fetched.error || lastError;
      lastHttpStatus = fetched.ok ? fetched.status : fetched.status;
      if (!fetched.ok && definition.fallbackUrl) {
        const viaFallback = await getText(definition.fallbackUrl);
        if (viaFallback.ok) {
          fetched = { ok: true, text: viaFallback.text, status: viaFallback.status, retrievedVia: definition.fallbackUrl };
        } else {
          lastError = `${lastError || 'primary failed'}; fallback: ${viaFallback.error || 'failed'}`;
          lastHttpStatus = viaFallback.status;
        }
      }
    }
    const record = sourceResult(definition, fetchedAt);
    if (fetched && fetched.ok) {
      record.status = 'ok';
      record.retrievedVia = fetched.retrievedVia || definition.url;
      record.sha256 = sha256Of(fetched.text);
      record.bytes = Buffer.byteLength(fetched.text);
      record.lines = fetched.text.split(/\r?\n/).length;
      sourceTexts[definition.id] = fetched.text;
      sourceResults[definition.id] = record;
      writeSourceCache(definition.id, fetched.text, {
        id: definition.id,
        url: definition.url,
        retrievedVia: record.retrievedVia,
        sha256: record.sha256,
        bytes: record.bytes,
        lines: record.lines,
        fetchedAt
      });
      continue;
    }
    const cached = REFRESH_SOURCES ? null : readSourceCache(definition.id);
    if (cached) {
      const cachedAt = Date.parse(cached.meta.fetchedAt || '') || 0;
      const ageDays = cachedAt ? Math.round((Date.parse(fetchedAt) - cachedAt) / 86400000) : null;
      record.status = ageDays !== null && ageDays <= CACHE_FRESH_DAYS ? 'ok-cache' : 'ok-cache-stale';
      record.retrievedVia = `cache:${path.relative(ROOT, path.join(CACHE_DIR, `${definition.id}.txt`)).split(path.sep).join('/')}`;
      record.sha256 = cached.meta.sha256;
      record.bytes = cached.meta.bytes;
      record.lines = cached.meta.lines;
      record.cachedAt = cached.meta.fetchedAt || null;
      record.cacheAgeDays = ageDays;
      sourceTexts[definition.id] = cached.text;
      record.notice = lastError ? `live fetch unavailable (${lastError}); used on-disk cache` : 'used on-disk cache';
    } else {
      record.status = 'unavailable';
      record.error = lastError || 'fetch failed and no cached source is available';
      record.httpStatus = lastHttpStatus;
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
      statSource: card.statSource || null,
      statConfidence: card.statConfidence || null,
      statProvenance: card.statProvenance || null,
      statEvidence: card.statEvidence || null,
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
    cardsWithSecondaryStats: entries.filter((entry) => entry.runtime.statEvidence && entry.runtime.statEvidence.filled.length > 0).length,
    secondaryStatFields: entries.reduce((total, entry) => total + (entry.runtime.statEvidence?.filled?.length || 0), 0),
    secondaryConflictFields: entries.reduce((total, entry) => total + (entry.runtime.statEvidence?.conflicts?.length || 0), 0),
    pendingCanonical: entries.filter((entry) => entry.researchStatus !== 'implemented').length,
    sources: sourceResults
  };
  const previousSummary = readPreviousSummary();
  const degradation = buildDegradation(previousSummary, summary);
  summary.degraded = degradation.degraded ? degradation : null;

  if (summary.degraded && !ALLOW_DEGRADED) {
    console.error('[card-research] ABORT: this build would degrade the evidence register; refusing to overwrite it.');
    console.error(JSON.stringify({
      lostSources: summary.degraded.lostSources,
      previousCardsWithOfficialMentions: summary.degraded.previousCardsWithOfficialMentions,
      nextCardsWithOfficialMentions: summary.degraded.cardsWithOfficialMentions,
      mentionDelta: summary.degraded.mentionDelta
    }, null, 2));
    console.error('Re-run with --allow-degraded to record the loss explicitly, or with --offline to use the on-disk source cache.');
    process.exitCode = 1;
    return;
  }

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
    degraded: summary.degraded ? summary.degraded.lostSources.map((item) => item.id) : null,
    sourceStatuses: Object.fromEntries(Object.entries(sourceResults).map(([id, record]) => [id, record.status]))
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
