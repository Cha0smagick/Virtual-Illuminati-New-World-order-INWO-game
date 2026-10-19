const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('ignoreDiscordian')) { console.log('ya'); process.exit(0); }
const a = "      if(discordianBlocks(owner,att,attCard))";
if (!t.includes(a)) throw new Error('ancla no encontrada');
const b = "      /* L51 - Deprogrammers: su texto exime el bloqueo Discordian. */\n      var igD51=(attCard&&attCard.effect&&attCard.effect.ignoreDiscordian===true);\n      if(!igD51&&discordianBlocks(owner,att,attCard))";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('ignoreDiscordian ok');
