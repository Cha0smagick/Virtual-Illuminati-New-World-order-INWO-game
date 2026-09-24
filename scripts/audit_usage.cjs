'use strict';

/* audit_usage.cjs — mide uso real sin alterar SINERGIAS.md. */
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

const use = Object.create(null);
const bump = (key) => { use[key] = (use[key] || 0) + 1; };
const methods = ['autoTakeover', 'playResource', 'playPlot', 'declareAttack', 'exchangeForPlot', 'illumDrawGroup', 'extraGroupDraw', 'addBoost', 'moveGroup', 'giveCard', 'discardCard', 'instantAttack'];
const originals = Object.create(null);
for (const method of methods) {
  if (typeof E[method] !== 'function') continue;
  originals[method] = E[method];
  E[method] = function (...args) {
    bump('ACCION:' + method);
    if (method === 'playPlot' || method === 'playResource' || method === 'discardCard') {
      const card = C.cards[args[1]];
      if (card) {
        bump('KIND:' + ((card.effect && card.effect.kind) || 'sin-effect'));
        if (card.type === 'resource') bump('RECURSO:' + card.name);
      }
    }
    if (method === 'declareAttack') bump('ATTACK:' + args[1]);
    try {
      return originals[method].apply(E, args);
    } catch (error) {
      if (method === 'playPlot' || method === 'playResource') {
        const card = C.cards[args[1]];
        rejections.push({
          method,
          cardId: card ? card.id : null,
          cardName: card ? card.name : null,
          effectKind: card && card.effect ? card.effect.kind : null,
          mechanicsStatus: card ? (card.mechanicsStatus || null) : null,
          message: error && error.message ? error.message : String(error)
        });
      }
      throw error;
    }
  };
}

const GAMES = 8;
const MAX_TURNS = 80;
const allLogs = [];
const errors = [];
const rejections = [];
let completedGames = 0;
let totalTurns = 0;

for (let game = 0; game < GAMES; game++) {
  try {
    E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
    const available = E.availableIlluminati();
    const first = (game * 2) % available.length;
    const second = (game * 2 + 1 + game) % available.length;
    E.setIlluminati(0, available[first].id);
    E.setIlluminati(1, available[second === first ? (first + 1) % available.length : second].id);
    E.startGame();
    let seenLogs = 0;
    let turns = 0;
    while (E.getState().phase !== 'gameover' && turns++ < MAX_TURNS) {
      const before = E.getState();
      if (before.phase !== 'main') throw new Error('fase inesperada antes de IA: ' + before.phase);
      const pid = before.currentPid;
      AI.takeTurn(E, pid);
      const afterAi = E.getState();
      if (afterAi.attack && !afterAi.attack.resolved) throw new Error('la IA dejó un ataque pendiente');
      if (afterAi.phase !== 'gameover') E.endTurn();
      const after = E.getState();
      allLogs.push(...(after.log || []).slice(seenLogs).map((entry) => entry.msg || String(entry)));
      seenLogs = after.log.length;
    }
    if (E.getState().phase !== 'gameover') throw new Error('la partida no terminó dentro del límite');
    completedGames++;
    totalTurns += turns;
  } catch (error) {
    errors.push(`partida ${game + 1}: ${error.message}`);
  }
}

const families = Object.create(null);
C.cards.forEach((card) => {
  const kind = (card.effect && card.effect.kind) || 'sin-effect';
  families[kind] = (families[kind] || 0) + 1;
});
const countLog = (pattern) => allLogs.filter((line) => pattern.test(line)).length;
const attacks = {
  control: countLog(/a control con|ATTACK TO CONTROL/),
  destroy: countLog(/a destroy con|ATTACK TO DESTROY/)
};
const report = [
  '=== USO REAL DE CARTAS ===',
  `partidas completadas: ${completedGames}/${GAMES}`,
  `turnos: ${totalTurns}`,
  `errores: ${errors.length}`,
  '',
  '| Familia | Cartas | Veces jugada |',
  '|---|---:|---:|',
  ...Object.keys(families).sort().map((kind) => `| ${kind} | ${families[kind]} | ${use['KIND:' + kind] || 0} |`),
  '',
  '| Acción | Llamadas |',
  '|---|---:|',
  ...Object.keys(use).filter((key) => key.startsWith('ACCION:') || key.startsWith('RECURSO:')).sort().map((key) => `| ${key.replace('ACCION:', '').replace('RECURSO:', 'res ')} | ${use[key]} |`),
  '',
  '## 🚫 Intentos rechazados',
  `- Total: ${rejections.length}`,
  ...(rejections.length ? rejections.slice(0, 20).map((item) => `- ${item.method} ${item.cardId} (${item.cardName}; ${item.mechanicsStatus}): ${item.message}`) : ['- Ninguno']),
  '',
  `CONTROLAR: ${attacks.control}`,
  `DESTRUIR: ${attacks.destroy}`,
  '',
  ...errors.map((error) => 'ERROR: ' + error)
].join('\n');

const reportDir = path.join(ROOT, 'research', 'audit_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'usage.md'), report + '\n', 'utf8');
console.log(report);
if (errors.length || completedGames !== GAMES) process.exitCode = 1;
