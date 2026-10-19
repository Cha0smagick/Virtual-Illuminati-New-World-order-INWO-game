const fs = require('fs');
const t = fs.readFileSync('game/js/engine.js', 'utf8');
const i = t.indexOf("act==='places_roll_draw'");
console.log('pos:', i);
console.log(JSON.stringify(t.slice(i - 200, i + 900)));
