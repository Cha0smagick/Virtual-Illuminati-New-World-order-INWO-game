const fs = require('fs');
const P = 'game/js/engine.js';
let t = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
let ops = 0;
// 1) eximir del gasto de ficha el modo mirar (free move) y cablear los handlers nuevos
const a1 = "  if(S.attack&&!S.attack.resolved)throw new Error(c.name+': no durante un ataque');\n  var act=String(e.act||'');";
const b1 = "  if(S.attack&&!S.attack.resolved)throw new Error(c.name+': no durante un ataque');\n  var act=String(e.act||'');\n  var freeLook=(act==='look_hand'&&!opts.expose);";
if (!t.includes('var freeLook=')) { t = t.split(a1).join(b1); ops++; }
const a2 = "  }else{\n    throw new Error(c.name+': accion de grupo desconocida ('+act+')');\n  }\n  nd.tokens--;\n  return out===undefined?publicState():out;";
const b2 = "  }else{\n    throw new Error(c.name+': accion de grupo desconocida ('+act+')');\n  }\n  if(!freeLook)nd.tokens--;\n  return out===undefined?publicState():out;";
if (!t.includes('if(!freeLook)nd.tokens--;')) { t = t.split(a2).join(b2); ops++; }
// 2) insertar los dos handlers (look_hand antes de discard_exposed; places_roll_draw tambien)
const anchorH = "  }else if(act==='discard_exposed'){";
const f4 = fs.readFileSync('_f4.txt', 'utf8').replace(/\r\n/g, '\n');
if (!t.includes("act==='look_hand'")) { t = t.split(anchorH).join(f4 + anchorH); ops++; }
const f5 = fs.readFileSync('_f5.txt', 'utf8').replace(/\r\n/g, '\n');
if (!t.includes("act==='places_roll_draw'")) { t = t.split(anchorH).join(f5 + anchorH); ops++; }
fs.writeFileSync(P, t);
console.log('ops: ' + ops);
