'use strict';

/* audit_syn.cjs — evidencia estática + simulación sin escribir SINERGIAS.md. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const load = (name) => require(path.join(ROOT, 'game', 'js', name));

global.window = {};
['images.js', 'cards.js', 'cardtexts_data.js', 'cardstats_known.js', 'cardstats_fix.js', 'statsfix.js', 'texts.js', 'engine.js', 'ai.js'].forEach(load);
const C = global.window.INWO_CARDS;
const E = global.window.Engine;
const AI = global.window.AI;
if (!C || !E || !AI) throw new Error('No se pudieron cargar cards, engine o ai');
const source = fs.readFileSync(path.join(ROOT, 'game', 'js', 'engine.js'), 'utf8').toLowerCase();
const has = (token) => source.includes(String(token).toLowerCase());
const lineOf = (token) => {
  const index = source.indexOf(String(token).toLowerCase());
  return index < 0 ? 0 : source.slice(0, index).split('\n').length;
};

const mechanics = [
  ['Control: P-R y tirada 2d6', 'roll2d6'],
  ['Auto-fallo por fuerza < 2', 'auto-fail'],
  ['11-12 fallan siempre', 'r===11'],
  ['Alineamientos del líder', '+4'],
  ['Defensa de master-alignment', 'master'],
  ['Bonus de posición', 'positionBonus'],
  ['Autodefensa ×2', 'selfDefended'],
  ['Ayudas', 'aids'],
  ['Oposiciones', 'opposes'],
  ['Boosts de ataque', 'boosts'],
  ['Boosts defensivos', 'defBoosts'],
  ['Privilegio', 'privilege'],
  ['Captura de subárbol', 'placeCapturedSubtree'],
  ['Títeres vuelven a mano', 'destroyGroup'],
  ['Inmunidad Discordian', 'discordian'],
  ['Secretos', 'secret'],
  ['Área neutral', 'neutralArea'],
  ['Parálisis', 'paralyzed'],
  ['Zap', 'zap'],
  ['Power increase', 'power_increase'],
  ['Asesinato', 'assassination'],
  ['Desastre/devastación', 'devastated'],
  ['Metas', 'goalMetFor'],
  ['NWO', 'nwo'],
  ['Meta paz de Shangri-La', 'peaceful_power'],
  ['Meta Cthulhu', 'cthulhu'],
  ['Límite de Plots', 'exposedPlots'],
  ['Intercambio', 'exchangeForPlot'],
  ['Takeover', 'autoUsed'],
  ['Recurso por turno', 'usedResourceThisTurn'],
  ['Draw extra', 'usedExtraDrawThisTurn'],
  ['Eliminación', 'turnsCompleted']
];

const alignCount = (alignment) => C.cards.filter((card) => card.type !== 'illuminati' && card.alignments && card.alignments.includes(alignment)).length;
const familyCount = (kind) => C.cards.filter((card) => card.effect && card.effect.kind === kind).length;
const statusCount = (status) => C.cards.filter((card) => card.mechanicsStatus === status).length;
const pendingStatuses = ['unverified', 'source-text-unmapped', 'pending-engine'].filter((status) => statusCount(status) > 0);
const mechanicsMissing = mechanics.filter(([, token]) => !has(token)).map(([name]) => name);
const legacyFamilies = ['plot_generic', 'resource_generic', 'generic', 'illu_special'].filter((kind) => familyCount(kind) > 0);

E.newGame([{ name: 'IA-1', human: false }, { name: 'IA-2', human: false }]);
const available = E.availableIlluminati();
E.setIlluminati(0, available[0].id);
E.setIlluminati(1, available[1].id);
E.startGame();
let turns = 0;
while (E.getState().phase !== 'gameover' && turns++ < 120) {
  const state = E.getState();
  if (state.phase !== 'main') throw new Error('fase inesperada: ' + state.phase);
  const pid = state.currentPid;
  AI.takeTurn(E, pid);
  const after = E.getState();
  if (after.attack && !after.attack.resolved) throw new Error('ataque pendiente tras turno de IA');
  if (after.phase !== 'gameover') E.endTurn();
}
const final = E.getState();
const logs = (final.log || []).map((entry) => entry.msg || String(entry));
const count = (pattern) => logs.filter((line) => pattern.test(line)).length;
const report = [
  '# Auditoría de sinergias — INWO',
  '',
  '## Mecánicas detectadas en código',
  '| Mecánica | Estado | Línea |',
  '|---|---|---:|',
  ...mechanics.map(([name, token]) => `| ${name} | ${has(token) ? 'PRESENTE' : 'PENDIENTE'} | ${has(token) ? lineOf(token) : '—'} |`),
  '',
  '## Sinergias por alineamiento',
  `- Computer: ${alignCount('computer')}`,
  `- Weird: ${alignCount('weird')}`,
  `- Peaceful: ${alignCount('peaceful')}`,
  `- Government: ${alignCount('government')}`,
  `- Straight: ${alignCount('straight')}`,
  `- Secret: ${alignCount('secret')}`,
  '',
  '## Estado de mecánicas',
  `- Implementadas: ${statusCount('implemented')}`,
  `- Implementadas especiales: ${statusCount('implemented-special')}`,
  `- Texto fuente sin motor: ${statusCount('source-text-unmapped')}`,
  `- Bloqueadas por verificación: ${statusCount('unverified')}`,
  `- Pendientes de motor: ${statusCount('pending-engine')}`,
  `- Familias legacy detectadas (no jugables): ${legacyFamilies.join(', ') || 'ninguna'}`,
  `- Asesinato: ${familyCount('assassination')}`,
  `- Desastre: ${familyCount('disaster')}`,
  '',
  '## Simulación AI-vs-AI',
  `- turnos: ${turns}`,
  `- resultado: ${final.winner ? final.winner.name : 'sin ganador'}`,
  `- takeovers: ${count(/posesi\u00f3n autom\u00e1tica|takes automatic control/)}`,
  `- ataques control: ${count(/a control con|ATTACK TO CONTROL/)}`,
  `- ataques destroy: ${count(/a destroy con|ATTACK TO DESTROY/)}`,
  `- destrucciones: ${count(/DESTRUIDO|DESTROYED/)}`,
  `- victorias: ${count(/VICTORIA|WINS/)}`,
  '',
  `Mecánicas de código pendientes: ${mechanicsMissing.length ? mechanicsMissing.join(', ') : 'ninguna'}`,
  `Estados con verificación pendiente: ${pendingStatuses.join(', ') || 'ninguno'}`
].join('\n');

const reportDir = path.join(ROOT, 'research', 'audit_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'synergies.md'), report + '\n', 'utf8');
console.log(report);
const reportOnly = process.argv.includes('--report-only');
if (!reportOnly && (mechanicsMissing.length || pendingStatuses.length)) process.exitCode = 1;
