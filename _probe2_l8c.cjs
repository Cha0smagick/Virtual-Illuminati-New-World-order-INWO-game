const fs = require('fs');
const ROOT = process.cwd();

function grab(file, specs) {
  const p = ROOT + '/' + file;
  let lines;
  try { lines = fs.readFileSync(p, 'utf8').split('\n'); }
  catch (e) { console.log('\n########## ' + file + ' READ ERROR: ' + e.message); return; }
  console.log('\n########## ' + file + ' (' + lines.length + ' lines) ##########');
  for (const spec of specs) {
    if (spec.from != null) {
      console.log('\n--- [lines ' + (spec.from + 1) + '-' + (spec.to + 1) + '] ---');
      for (let j = spec.from; j <= spec.to; j++) console.log(String(j + 1).padStart(5) + ': ' + lines[j]);
      continue;
    }
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
  { from: 999, to: 1014 },
  { a: "dm.mode==='draw'", b: 2, c: 14, max: 2 },
  { re: 'function placeUnder', b: 0, c: 22 },
]);

grab('game/js/app.js', [
  { from: 24, to: 36 },
  { re: 'function maybeRunAI', b: 0, c: 26 },
  { from: 314, to: 348 },
]);

grab('game/js/ui.js', [
  { a: 'NO_TARGET_KINDS', b: 0, c: 3 },
  { a: 'Jugar Plot ahora', b: 2, c: 4, max: 2 },
  { re: 'function card\\(', b: 0, c: 4, max: 2 },
  { a: 'INWO_CARDS', b: 1, c: 2, max: 3 },
  { from: 1040, to: 1072 },
]);

grab('test_fase4_cards.js', [
  { from: 102, to: 145 },
]);

// RUNTIME probe: estructura de nodo, placeUnder, grupos Magic en el mazo
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
var C = window.INWO_CARDS, E = window.Engine;
E.newGame([{ name: 'Tu', human: true }, { name: 'R1' }, { name: 'R2' }]);
var illuIds = C.cards.filter(function (c) { return c.type === 'illuminati'; }).map(function (c) { return c.id; });
console.log('\n########## RUNTIME ##########');
console.log('illuminati ids: ' + illuIds.join(','));
E.setIlluminati(0, 'ufos');
E.setIlluminati(1, 'adepts');
E.setIlluminati(2, 'bavarian');
E.startGame();
var st = E.getState();
console.log('phase=' + st.phase + ' currentPid=' + st.currentPid + ' turn=' + E._raw().turn);
console.log('structure0=' + JSON.stringify(st.players[0].structure).slice(0, 500));
var magicIdx = -1, magicCount = 0;
C.cards.forEach(function (c, i) {
  if (c.type === 'group' && c.alignments && c.alignments.indexOf('magic') >= 0) { magicCount++; if (magicIdx < 0) magicIdx = i; }
});
console.log('magic groups in deck: ' + magicCount + ' first=' + (magicIdx >= 0 ? magicIdx + ' ' + C.cards[magicIdx].name : 'none'));
var unlucky = C.cards.filter(function (c) { return c.id === 'unlucky13'; })[0];
console.log('unlucky13: type=' + (unlucky && unlucky.type) + ' effect=' + JSON.stringify(unlucky && unlucky.effect).slice(0, 120));
