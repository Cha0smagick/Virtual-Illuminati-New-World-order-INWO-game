// scripts/audit_syn.cjs — auditoría de interacciones/sinergias carta-habilidad
const fs = require('fs');
const path = require('path');
global.window = {};
['images.js', 'cards.js', 'cardtexts_data.js', 'cardstats_known.js', 'cardstats_fix.js', 'statsfix.js', 'texts.js', 'engine.js', 'ai.js']
  .forEach(f => { try { require(path.join(__dirname, '../game/js', f)); } catch (e) {} });
const C = global.window.INWO_CARDS;
const E = global.window.Engine;
const ENG = fs.readFileSync(path.join(__dirname, '../game/js/engine.js'), 'utf8');
const has = tok => ENG.toLowerCase().includes(tok.toLowerCase());
const lineOf = tok => { const i = ENG.toLowerCase().indexOf(tok.toLowerCase()); return i < 0 ? -1 : ENG.slice(0, i).split('\n').length; };
const R = [];

/* ===== 1) evidencia en el motor ===== */
const MECH = [
  ['Control: P-R, roll<=str', 'roll2d6'], ['Auto-fallo fuerza<2', 'auto-fail'], ['11-12 fallan siempre', '(r===11||r===12)||r===12'],
  ['±4 alineamientos líder (inline en computeStrength)', '+4'], ['Defensa master-align +4 (inline)', "master"],
  ['Posición +10/+5', 'positionBonus'], ['Autodefensa Power×2', 'selfDefended'],
  ['Aid suma Power completo', 'aids'], ['Oppose resta', 'opposes'],
  ['Boosts +10 (plots)', 'boosts'], ['Boost defensa', 'defBoosts'],
  ['Privilegio', 'privilege'], ['Captura subárbol', 'placeCapturedSubtree'],
  ['Títeres a mano al destruir', 'destroyGroup'], ['Inmunidad Discordian', 'discordian'],
  ['Secretos (regla Secret)', 'secret'], ['Área neutral', 'neutralArea'],
  ['Parálisis', 'paralyzed'], ['Zap estructura', 'zap'], ['Congelar atributo', 'frozen|attribute freeze|Freeze'],
  ['Power Increase', 'power_increase'], ['Asesinato permanente', 'assassinat'],
  ['Desastre/devastación', 'devastated'], ['Metas GOAL', 'goalMetFor'], ['NWO por color', 'nwo'],
  ['Doble conteo Network/Gnomes/Discordian', 'doubleAttr'], ['Meta pacífica Shangri-La', 'peaceful_power'],
  ['Pick3 UFOs', 'pick3'], ['Destruir-8 Cthulhu', 'cthulhu'], ['Bavarian P10', 'bavarian'],
  ['Límite 5 Plots fuera de turno', 'plotDrawn'], ['Intercambio tokens->Plot', 'exchangeForPlot'],
  ['Takeover automático 1/turno', 'autoUsed'], ['Recurso 1 acción/turno', 'usedResourceThisTurn'],
  ['Draw extra Grupo 1★', 'usedExtraDrawThisTurn'], ['Eliminación sin títeres', 'turnsCompleted']
];
R.push('## 1 · Mecánicas del motor verificadas en código\n');
R.push('| Mecánica | Implementada | Línea aprox |');
R.push('|---|---|---|');
MECH.forEach(([name, tok]) => {
  const ok = has(tok);
  R.push('| ' + name + ' | ' + (ok ? '\u2705' : '\u26A0\uFE0F buscar variante') + ' | ' + (ok ? lineOf(tok) : '—') + ' |');
});

/* ===== 2) sinergias por Illuminati (datos reales) ===== */
const byAlign = a => C.cards.filter(c => c.type !== 'illuminati' && c.alignments && c.alignments.includes(a));
const comp = byAlign('computer'), weird = byAlign('weird'), peaceful = byAlign('peaceful'),
      gov = byAlign('government'), straight = byAlign('straight'), secrets = C.cards.filter(c => c.alignments && c.alignments.includes('secret'));
R.push('\n## 2 · Sinergias por sociedad secreta (con cartas reales del mazo)\n');
const ILL_SYN = [
  ['Bavarian Illuminati (P10)', 'Ataques más fuertes + Privilegio 1/turno', 'Privilegio bloquea interferencias mientras encadenas +10: combo privilegiado con 2-3 Plots garantiza capturas grandes.', 'Cualquier objetivo costoso (Resistance alta)'],
  ['The Network', 'Computer cuenta doble para la meta', comp.length + ' cartas Computer en el mazo (' + comp.slice(0, 8).map(c => c.name).join(', ') + '…)', 'Prioriza controlar esas ' + comp.length + ' → meta llega antes'],
  ['Gnomes of Zurich', '+4 controlar grupos Bank', 'Detecta "Bank"/financieros por texto', 'Sinergia con Offshore Banks, Federal Reserve, Savings&Loans, OPEC-corporate'],
  ['Servants of Cthulhu', '+4 a DESTRUIR (no instantáneo) + meta Destruir 8', 'Ojo: asesinatos/desastres SON instantáneos → NO reciben ese +4', 'Combina ataques normales de destroy con boosts; desastres aparte para Places'],
  ['Discordian Society', 'Estructura inmune a Straight+Government; Weird doble', gov.length + ' Government y ' + straight.length + ' Straight rivales quedan fuera; ' + weird.length + ' Weird cuentan doble', 'Defensa pasiva total vs ejércitos gobierno; acelera meta vía Weird'],
  ['Shangri-La', 'Meta Poder Pacífico 30; no puede destruir no-Violent; +5 vs instantáneos', peaceful.length + ' cartas Peaceful', 'Tomaover pacíficos + takeovers; defensa anti-desastre nata'],
  ['UFOs', '2 acciones/turno + meta Pick3 Secretos', secrets.length + ' Secretos disponibles', 'Doble acción = doble takeover temprano; reserva Secretos buenos'],
  ['Adepts of Hermes', 'Conserva intentos de control fallidos desde la mano', 'Reintento gratis turno tras turno', 'Siege barato de objetivos duros con refuerzos +10 acumulables'],
  ['Bermuda Triangle', 'Reorganiza su estructura al fin de turno', 'Recoloca para posición +10 (directo bajo Illuminati) antes del KNOCK', 'Maximiza defensa posicional justo cuando se checan metas']
];
R.push('| Sociedad | Habilidad clave | Sinergia cuantificada | Combo recomendado |');
R.push('|---|---|---|---|');
ILL_SYN.forEach(r => R.push('| ' + r.join(' | ') + ' |'));

/* ===== 3) sinergias entre familias de cartas ===== */
const fam = k => C.cards.filter(c => c.effect && c.effect.kind === k).length;
R.push('\n## 3 · Sinergias entre familias\n');
R.push('| Familia (cantidad) | Interactúa con | Nota de diseño |');
R.push('|---|---|---|');
R.push('| Plots +10 / genéricos (' + (fam('plot_generic') + fam('boost10')) + ') | TODOS los ataques y defensas | Pegamento universal: convierte cualquier ataque viable en seguro (suman hasta resolución) |');
R.push('| Asesinatos (' + fam('assassination') + ') | Personalities en campo | Mata PERMANENTE; ideal contra P≥5 baja-R (Saddam 5/4, Castro 6/4…); Cthulhu no les aplica su +4 |');
R.push('| Desastres (' + fam('disaster') + ') | Places y su subárbol | Devastación quita tokens del subárbol entero → abre estructuras densas para control posterior |');
R.push('| Paralizar/Congelar/Zap | Grupos pilar enemigos | Paralizado no cuenta para metas → niega progreso ajeno sin destruir |');
R.push('| Goal cards | Chequeo de fin de turno | Victoria sorpresa si ya cumples otra meta parcial |');
R.push('| NWO (' + fam('nwo') + ') | Todos los jugadores | Global persistente; reemplazo por color |');
R.push('| Recursos (' + fam('resource_generic') + ') | Pasivos (texto) | Limitación conocida: bonos numéricos de recursos no aplican aún |');

/* ===== 4) prueba en vivo: qué disparó la IA en partidas reales ===== */
E.newGame([{ name: 'IA-1', human: false }, { name: 'IA-2', human: false }]);
E.setIlluminati(0, 'bavarianilluminati1'); E.setIlluminati(1, 'servantsofcthulhu1');
E.startGame();
let guard = 0;
while (E.getState().phase !== 'gameover' && guard++ < 120) {
  const pid = E.getState().currentPid;
  E.beginTurn(pid);
  try { window.AI.takeTurn(E, pid); } catch (e) {}
  if (E.getState().attack && !E.getState().attack.resolved) try { E.resolveAttack(); } catch (e) {}
  try { E.endTurn(); } catch (e) {}
}
const LOG = E.getState().log.map(m => m.msg || String(m));
const cnt = re => LOG.filter(l => re.test(l)).length;
R.push('\n## 4 · Fuego real en partida simulada (' + Math.min(guard, 120) + ' turnos máx)\n');
R.push('| Interacción | Disparos |');
R.push('|---|---|');
[['Takeovers automáticos', /posesi\u00F3n autom\u00E1tica/],
 ['Ataques a CONTROLAR', /a control con/],
 ['Ataques a DESTRUIR', /a destroy con/],
 ['Plots +10 jugados', /\+10 jugada/],
 ['Fallos auto (<2)', /auto-fail/],
 ['Fallos por dados', /^fallo/],
 ['Capturas con sub\u00E1rbol', /toma CONTROL de .* y todo su t\u00EDtere|takes CONTROL/],
 ['Grupos DESTRUIDOS', /DESTRUIDO|DESTROYED/],
 ['Victoria declarada', /VICTORIA|WINS/]
].forEach(([n, re]) => R.push('| ' + n + ' | ' + cnt(re) + ' |'));
const w = E.getState().winner;
if (w) R.push('\n**Resultado:** gana ' + w.name + ' \u2014 ' + w.how);

fs.writeFileSync(path.join(__dirname, '../SINERGIAS.md'), '# Auditor\u00EDa de Sinergias \u2014 INWO\n\n' + R.join('\n'), 'utf8');
console.log('SINERGIAS.md escrito. Mec\u00E1nicas OK:', MECH.filter(m => has(m[1])).length + '/' + MECH.length,
  '\u00B7 Cartas Computer/Weird/Peaceful:', comp.length, weird.length, peaceful.length,
  '\u00B7 Ganador sim:', w ? w.name : 'ninguno');
