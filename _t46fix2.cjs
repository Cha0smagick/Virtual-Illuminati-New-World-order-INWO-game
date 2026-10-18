const fs = require('fs');
const P = 'test_fase2_rules.js';
let t = fs.readFileSync(P, 'utf8');
// 1) fusionar el aserto de L45 Recording (partido por el insert de CT)
const a1 = "  ok(d45d.boosts === 2,\n  /* ===== L46 - acciones de grupo, limite de mano, privilege break ===== */";
const a1b = "  ok(d45d.boosts === 2, 'L45 Recording Industry +2 Power al Media Personality atacante -> boosts=' + d45d.boosts);\n  /* ===== L46 - acciones de grupo, limite de mano, privilege break ===== */";
if (!t.includes(a1)) throw new Error('patron A no encontrado');
t = t.split(a1).join(a1b);
// 2) fusionar el aserto de CT (partido por el insert de SV)
const a2 = "ok(E._raw().players[0].hand.length === 6,\n  fresh(idxOfId(U), idxOfId(V));\n  if (readyToAttack(0) != null) {\n    plant(0, 'sv46', idxOfId('siliconvalley'), 1);";
const a2b = "ok(E._raw().players[0].hand.length === 6, \"L46 Conspiracy Theorists: 6 Plots al fin de turno (limite +1) -> \" + E._raw().players[0].hand.length);\n  fresh(idxOfId(U), idxOfId(V));\n  if (readyToAttack(0) != null) {\n    plant(0, 'sv46', idxOfId('siliconvalley'), 1);";
if (!t.includes(a2)) throw new Error('patron B no encontrado');
t = t.split(a2).join(a2b);
// 3) mover el aserto de SV a su sitio: la cola del aserto SV (tras Moonies) vuelve
const a3 = "  } else { ok(true, \"L46 (Moonies) SKIP\"); }\n    ok(E._raw().players[0].hand.length === hb46 + 1 && sv46n && sv46n.tokens === 0, \"L46 Silicon Valley roba Plot extra y gasta su ficha\");\n  } else { ok(true, \"L46 (SV) SKIP\"); }";
const a3b = "  } else { ok(true, \"L46 (SV) SKIP\"); }";
if (!t.includes(a3)) throw new Error('patron C no encontrado');
t = t.split(a3).join(a3b);
fs.writeFileSync(P, t);
console.log('reparado');
