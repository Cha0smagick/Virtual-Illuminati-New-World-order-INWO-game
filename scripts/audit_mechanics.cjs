/* audit_mechanics.cjs — auditoría reproducible de familias, dados y estado. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const load = (name) => require(path.join(ROOT, 'game', 'js', name));
global.window = {};
['images.js', 'cards.js', 'cardtexts_data.js', 'cardstats_fix.js', 'statsfix.js', 'texts.js', 'engine.js', 'ai.js'].forEach(load);

const C = global.window.INWO_CARDS;
const E = global.window.Engine;
if (!C || !E) throw new Error('No se pudieron cargar cards/engine');

const families = {};
C.cards.forEach((card) => {
  const kind = (card.effect && card.effect.kind) || 'sin-effect';
  families[kind] = (families[kind] || 0) + 1;
});

const engineSource = fs.readFileSync(path.join(ROOT, 'game', 'js', 'engine.js'), 'utf8');
const blockedKinds = new Set(['unverified', 'ability_unverified', 'plot_generic', 'resource_generic', 'generic']);
const implementedKinds = new Set(C.cards
  .filter((card) => card.mechanicsStatus === 'implemented' || card.mechanicsStatus === 'implemented-special')
  .map((card) => (card.effect && card.effect.kind) || 'sin-effect'));
const handled = Object.keys(families).filter((kind) => {
  if (kind === 'sin-effect' || blockedKinds.has(kind)) return false;
  return implementedKinds.has(kind) || engineSource.includes("'" + kind + "'");
});
const unhandled = Object.keys(families).filter((kind) =>
  kind !== 'sin-effect' && !blockedKinds.has(kind) && !handled.includes(kind)
);
const statusCounts = {};
C.cards.forEach((card) => {
  const status = card.mechanicsStatus || 'sin-status';
  statusCounts[status] = (statusCounts[status] || 0) + 1;
});
const pendingStatuses = Object.keys(statusCounts).filter((status) =>
  new Set(['unverified', 'source-text-unmapped', 'pending-engine']).has(status)
);

function newGame() {
  E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
  const available = E.availableIlluminati();
  if (available.length < 2) throw new Error('No hay Illuminati suficientes para la auditoría');
  E.setIlluminati(0, available[0].id);
  E.setIlluminati(1, available[1].id);
  E.startGame();
}

const histogram = Object.create(null);
const errors = [];
let samples = 0;
let invalidRolls = 0;

newGame();
for (let turn = 0; turn < 120; turn++) {
  let state = E.getState();
  if (state.phase === 'gameover') break;
  const pid = state.currentPid;
  try {
    global.window.AI.takeTurn(E, pid);
  } catch (error) {
    errors.push('AI turno ' + (turn + 1) + ': ' + error.message);
  }

  state = E.getState();
  if (state.attack && !state.attack.resolved) {
    try {
      E.resolveAttack();
    } catch (error) {
      errors.push('resolución turno ' + (turn + 1) + ': ' + error.message);
    }
  }

  state = E.getState();
  const last = state.lastRoll;
  if (last && Array.isArray(last.rolls)) {
    last.rolls.forEach((value) => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 2 || value > 12) invalidRolls++;
      else {
        histogram[value] = (histogram[value] || 0) + 1;
        samples++;
      }
    });
  } else if (last && typeof last.d === 'number') {
    if (last.d < 2 || last.d > 12 || !Number.isFinite(last.d)) invalidRolls++;
    else {
      histogram[last.d] = (histogram[last.d] || 0) + 1;
      samples++;
    }
  }

  state = E.getState();
  if (state.phase !== 'gameover') {
    try {
      E.endTurn();
    } catch (error) {
      errors.push('fin de turno ' + (turn + 1) + ': ' + error.message);
    }
  }
}

const finalState = E.getState();
const serialized = JSON.stringify(finalState);
const nanCount = (serialized.match(/NaN/g) || []).length;
const nullPowerCount = (serialized.match(/"power":null/g) || []).length;
const diceOK = samples > 0 && invalidRolls === 0;

console.log('=== FAMILIAS DE EFECTO ===');
Object.keys(families).sort((a, b) => families[b] - families[a]).forEach((kind) => {
  const label = handled.includes(kind)
    ? '[motor específico]'
    : blockedKinds.has(kind)
      ? '[bloqueado: falta fuente/motor]'
      : (kind === 'sin-effect' ? '[sin efecto]' : '[NO manejado]');
  console.log(kind + ': ' + families[kind] + ' ' + label);
});
console.log('\n=== ESTADOS DE MECÁNICA ===');
Object.keys(statusCounts).sort().forEach((status) => console.log(status + ': ' + statusCounts[status]));
console.log('estados pendientes de verificación/motor:', pendingStatuses.join(', ') || 'ninguno');
console.log('\n=== DADOS ===');
console.log('muestras:', samples, '· valores fuera de rango:', invalidRolls, diceOK ? 'OK' : 'ERROR');
console.log('distribución de totales 2d6:', JSON.stringify(histogram));
console.log('\n=== SANIDAD ===');
console.log('NaN en estado final:', nanCount);
console.log('poder null en estado final:', nullPowerCount);
console.log('familias no manejadas no bloqueadas:', unhandled.join(', ') || 'ninguna');
console.log('errores de ejecución:', errors.length);
errors.slice(0, 20).forEach((error) => console.log('  - ' + error));

const report = [
  '# Auditoría de mecánicas — INWO',
  '',
  '## Familias de efecto',
  ...Object.keys(families).sort((a, b) => families[b] - families[a]).map((kind) => {
    const label = handled.includes(kind)
      ? 'motor específico'
      : blockedKinds.has(kind)
        ? 'bloqueado: falta fuente/motor'
        : (kind === 'sin-effect' ? 'sin efecto' : 'NO manejada');
    return `- ${kind}: ${families[kind]} (${label})`;
  }),
  '',
  '## Estados de mecánica',
  ...Object.keys(statusCounts).sort().map((status) => `- ${status}: ${statusCounts[status]}`),
  `- Pendientes de verificación/motor: ${pendingStatuses.join(', ') || 'ninguno'}`,
  '',
  '## Simulación y sanidad',
  `- Muestras de dados: ${samples}`,
  `- Dados inválidos: ${invalidRolls}`,
  `- NaN: ${nanCount}`,
  `- Poder null: ${nullPowerCount}`,
  `- Errores: ${errors.length}`,
  `- Familias no manejadas no bloqueadas: ${unhandled.join(', ') || 'ninguna'}`,
  '',
  errors.slice(0, 20).map((error) => `- Error: ${error}`).join('\n')
].join('\n') + '\n';
const reportDir = path.join(ROOT, 'research', 'audit_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'mechanics.md'), report, 'utf8');

const reportOnly = process.argv.includes('--report-only');
if (!reportOnly && (!diceOK || nanCount || errors.length || unhandled.length || pendingStatuses.length)) process.exitCode = 1;
