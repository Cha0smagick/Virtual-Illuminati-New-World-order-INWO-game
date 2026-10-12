const fs = require('fs');
const ROOT = process.cwd();

function grab(file, specs) {
  const p = ROOT + '/' + file;
  let lines;
  try { lines = fs.readFileSync(p, 'utf8').split('\n'); }
  catch (e) { console.log('\n########## ' + file + ' READ ERROR: ' + e.message); return; }
  console.log('\n########## ' + file + ' (' + lines.length + ' lines) ##########');
  for (const spec of specs) {
    const re = spec.re ? new RegExp(spec.re) : null;
    const a = spec.a || '';
    const before = spec.b != null ? spec.b : 3;
    const after = spec.c != null ? spec.c : 12;
    const max = spec.max || 1;
    const hits = [];
    lines.forEach((l, i) => { if (re ? re.test(l) : l.indexOf(a) >= 0) hits.push(i); });
    console.log('\n--- [' + (re ? '/' + spec.re + '/' : a) + '] x' + hits.length + ' ---');
    if (!hits.length) { console.log('  NOT FOUND'); continue; }
    for (const i of hits.slice(0, max)) {
      const from = Math.max(0, i - before);
      const to = Math.min(lines.length - 1, i + after);
      console.log('  [line ' + (i + 1) + ']');
      for (let j = from; j <= to; j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
    }
  }
}

grab('game/js/engine.js', [
  { re: 'requireOwnMain\\s*[:=]\\s*function|function requireOwnMain', b: 1, c: 8 },
  { re: 'endTurn\\s*[:=]\\s*function', b: 0, c: 50 },
  { re: 'beginTurn\\s*[:=]\\s*function', b: 0, c: 76 },
  { re: 'expireTurnFlags\\s*[:=]\\s*function|function expireTurnFlags', b: 0, c: 34 },
  { re: 'drawPlot\\s*[:=]\\s*function', b: 0, c: 24 },
  { re: 'exchangeForPlot\\s*[:=]\\s*function', b: 0, c: 34 },
  { re: 'playPlot\\s*[:=]\\s*function', b: 0, c: 62 },
  { re: 'function firstUsableAid|firstUsableAid\\s*[:=]\\s*function', b: 1, c: 14 },
  { a: "eff0.kind==='deck_manip'", b: 3, c: 2 },
  { a: "case 'deck_manip':{", b: 1, c: 14 },
  { a: 'pendingDraw:S.pendingDraw', b: 2, c: 8 },
  { a: 'pendingDraw:null', b: 2, c: 3 },
  { re: 'players\\s*:\\s*S\\.players\\.map', b: 0, c: 12 },
  { a: '.human', b: 1, c: 1, max: 3 },
]);

grab('gen_cards.js', [
  { a: 'const L8B_FX = {', b: 2, c: 12 },
  { a: 'L8B_FXN[key]', b: 1, c: 1 },
  { a: 'payAlign', b: 1, c: 2, max: 3 },
  { a: "'magic'", b: 0, c: 1, max: 4 },
]);

grab('game/js/ui.js', [
  { a: 'pendingDraw', b: 2, c: 24, max: 2 },
  { a: 'drawpick', b: 2, c: 8, max: 2 },
  { a: 'isDeck', b: 2, c: 8, max: 2 },
  { a: '.human', b: 1, c: 1, max: 3 },
]);

grab('game/js/app.js', [
  { a: 'onResolveDraw', b: 1, c: 10, max: 2 },
  { a: 'function after', b: 1, c: 8 },
  { a: 'finishAITurn', b: 1, c: 15, max: 2 },
  { a: '.human', b: 1, c: 1, max: 3 },
  { a: 'onPlayPlot', b: 1, c: 8, max: 2 },
]);

grab('game/js/ai.js', [
  { a: 'settleWindows', b: 1, c: 16, max: 2 },
]);

grab('test_fase2_rules.js', [
  { a: '/* ---------- Utilidad global:', b: 10, c: 2 },
]);

grab('test_fase4_cards.js', [
  { a: 'MAX_PENDING_PLR', b: 1, c: 3 },
  { a: 'MIN_IMPLEMENTED', b: 1, c: 3 },
]);
