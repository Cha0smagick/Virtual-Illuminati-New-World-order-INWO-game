const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const a = "      if(sc!=='owner'&&(!defNode||nd.uid!==defNode.uid))return;  /* 'self': solo el defensor */";
if (!t.includes(a)) throw new Error('ancla no encontrada');
if (t.includes('isPuppetOf')) { console.log('ya'); process.exit(0); }
const b = a + "\n      /* L48 - Wall Street: solo los TITERES del grupo con el efecto. */\n      if(cl.vsDef&&cl.vsDef.isPuppetOf){var parD=findNodeThatHas(st,defNode?defNode.uid:null);if(!parD||parD.uid!==nd.uid)return;}";
t = t.split(a).join(b);
fs.writeFileSync(P, t);
console.log('F ok');
