/* Headless render smoke: stub DOM, drive engine 6 turns, render real states */
global.window = {};
require('./game/js/images.js');
require('./game/js/cards.js');
require('./game/js/engine.js');
const E = window.Engine;
require('./game/js/ai.js');

function El() { return { children: [], style: {}, innerHTML: '', textContent: '', className: '',
  appendChild(c) { this.children.push(c); }, remove() {}, insertAdjacentHTML() {}, insertAdjacentElement() {},
  addEventListener() {}, getAttribute() { return null; }, closest() { return null; },
  scrollTop: 0, scrollHeight: 0, onclick: null }; }
const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = El()); },
  createElement() { return El(); },
  querySelector() { return El(); },
  addEventListener() {}
};
global.alert = m => console.log('[alert]', m);

require('./game/js/ui.js');

try {
  E.newGame([{ name: 'P1', human: true }, { name: 'IA', human: false }]);
  const av = E.availableIlluminati();
  E.setIlluminati(0, av.filter(c => c.id.indexOf('bavarianilluminati') === 0)[0].id);
  E.setIlluminati(1, av.filter(c => c.id.indexOf('servantsofcthulhu') === 0)[0].id);
  E.startGame();
  let st = E.getState();
  window.UI.init({});
  window.UI.log('render test');
  for (let t = 0; t < 6 && st.phase !== 'gameover'; t++) {
    const pid = st.currentPid;
    window.AI.takeTurn(E, pid);
    st = E.getState();
    if (st.attack && !st.attack.resolved) E.resolveAttack();
    st = E.getState();
    if (st.phase !== 'gameover') E.endTurn();
    st = E.getState();
    window.UI.render(st);
  }
  const s2 = E.getState();
  window.UI.render(s2);
  window.UI.showGameOver('prueba', s2);
  console.log('UI RENDER SMOKE OK · turn=', s2.turn, 'p0 groups=', JSON.stringify(countG(s2, 0)), 'attack=', !!s2.attack);
} catch (e) { console.error('FAIL:', e.stack || e); process.exitCode = 1; }

function countG(st, p) { let n = 0; (function w(nd) { if (nd.cardId != null) n++; (nd.children || []).forEach(w); })(st.players[p].structure); return n; }
