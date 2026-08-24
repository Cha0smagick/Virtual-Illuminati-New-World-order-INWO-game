/* audit_mechanics.cjs â€” auditorÃ­a integral de triggers/mecÃ¡nicas/dados */
const fs = require('fs'); const path = require('path');
global.window = {};
const R = p => require(path.join('D:/Illuminati NWO/game/js', p));
R('images.js'); R('cards.js'); R('cardtexts_data.js'); R('cardstats_fix.js'); R('statsfix.js'); R('texts.js');
R('engine.js');
const C = global.window.INWO_CARDS, E = global.window.Engine;

/* ---- 1) Cobertura de mecÃ¡nicas por familia ---- */
const fam = {};
C.cards.forEach(c => { const k = (c.effect && c.effect.kind) || 'sin-effect'; fam[k] = (fam[k] || 0) + 1; });
const eng = fs.readFileSync(path.join(__dirname, '../game/js/engine.js'), 'utf8');
const handled = Object.keys(fam).filter(k => k !== 'sin-effect' && k !== 'plot_generic' && eng.includes("'" + k + "'"));
const unhandled = Object.keys(fam).filter(k => handled.indexOf(k) < 0 && k !== 'sin-effect' && k !== 'plot_generic');

/* ---- 2) VerificaciÃ³n estadÃ­stica de dados en partidas reales ---- */
const hist = {}; let samples = 0;
function newGame() {
  E.newGame([{ name: 'A', human: false }, { name: 'B', human: false }]);
  const av = E.availableIlluminati();
  E.setIlluminati(0, av[0].id); E.setIlluminati(1, av[1].id);
  E.startGame();
}
newGame();
for (let t = 0; t < 120; t++) {
  let st = E.getState(); if (st.phase === 'gameover') break;
  const pid = st.currentPid;
  try { global.window.AI.takeTurn(E, pid); } catch (e) {}
  try { E.resolveAttack(); } catch (e) {}
  st = E.getState();
  const LR=st.lastRoll; const rr=(LR&&typeof LR.d==='number')?LR.d:(LR&&LR.rolls?LR.rolls[0]+LR.rolls[1]:null); if(rr!=null){hist[rr]=(hist[rr]||0)+1;samples++;}
  try { E.endTurn(); } catch (e) {}
}
const expected = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3 }; // 11/12 nunca Ã©xito
let diceOK = true;
for (const r in hist) if (!(r >= 2 && r <= 10)) diceOK = false;

/* ---- 3) Sanidad del estado tras la partida ---- */
const fin = E.getState();
const nanScan = JSON.stringify(fin).match(/NaN|"power":null/g);

console.log('=== FAMILIAS DE EFECTO ===');
Object.keys(fam).sort((a, b) => fam[b] - fam[a]).forEach(k => console.log(`${k}: ${fam[k]} ${handled.includes(k) ? '[motor âœ“]' : (k === 'sin-effect' || k === 'plot_generic' ? '[genÃ©rico]' : '[NO manejado]')}`));
console.log('\n=== DADOS ===');
console.log('muestras:', samples, 'Â· fuera de rango Ã©xito:', diceOK ? 'NINGUNA âœ“ (11-12 jamÃ¡s aparecen como Ã©xito)' : 'ERROR');
console.log('distribuciÃ³n:', JSON.stringify(hist));
console.log('\n=== SANIDAD ===');
console.log('NaN/power-null en estado final:', nanScan ? nanScan.length : 0);
