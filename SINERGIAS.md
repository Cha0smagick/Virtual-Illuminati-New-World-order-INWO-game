# Auditoría de Sinergias — INWO

## 1 · Mecánicas del motor verificadas en código

| Mecánica | Implementada | Línea aprox |
|---|---|---|
| Control: P-R, roll<=str | ✅ | 16 |
| Auto-fallo fuerza<2 | ✅ | 606 |
| 11-12 fallan siempre | ⚠️ buscar variante | — |
| ±4 alineamientos líder (inline en computeStrength) | ✅ | 552 |
| Defensa master-align +4 (inline) | ✅ | 552 |
| Posición +10/+5 | ✅ | 73 |
| Autodefensa Power×2 | ✅ | 444 |
| Aid suma Power completo | ✅ | 443 |
| Oppose resta | ✅ | 443 |
| Boosts +10 (plots) | ✅ | 444 |
| Boost defensa | ✅ | 444 |
| Privilegio | ✅ | 443 |
| Captura subárbol | ✅ | 629 |
| Títeres a mano al destruir | ✅ | 660 |
| Inmunidad Discordian | ✅ | 558 |
| Secretos (regla Secret) | ✅ | 115 |
| Área neutral | ✅ | 43 |
| Parálisis | ✅ | 85 |
| Zap estructura | ✅ | 291 |
| Congelar atributo | ⚠️ buscar variante | — |
| Power Increase | ✅ | 750 |
| Asesinato permanente | ✅ | 763 |
| Desastre/devastación | ✅ | 291 |
| Metas GOAL | ✅ | 867 |
| NWO por color | ✅ | 2 |
| Doble conteo Network/Gnomes/Discordian | ✅ | 192 |
| Meta pacífica Shangri-La | ✅ | 190 |
| Pick3 UFOs | ✅ | 164 |
| Destruir-8 Cthulhu | ✅ | 162 |
| Bavarian P10 | ⚠️ buscar variante | — |
| Límite 5 Plots fuera de turno | ✅ | 132 |
| Intercambio tokens->Plot | ✅ | 333 |
| Takeover automático 1/turno | ✅ | 131 |
| Recurso 1 acción/turno | ✅ | 112 |
| Draw extra Grupo 1★ | ✅ | 112 |
| Eliminación sin títeres | ✅ | 115 |

## 2 · Sinergias por sociedad secreta (con cartas reales del mazo)

| Sociedad | Habilidad clave | Sinergia cuantificada | Combo recomendado |
|---|---|---|---|
| Bavarian Illuminati (P10) | Ataques más fuertes + Privilegio 1/turno | Privilegio bloquea interferencias mientras encadenas +10: combo privilegiado con 2-3 Plots garantiza capturas grandes. | Cualquier objetivo costoso (Resistance alta) |
| The Network | Computer cuenta doble para la meta | 3 cartas Computer en el mazo (Finland, Japan, N.S.A.…) | Prioriza controlar esas 3 → meta llega antes |
| Gnomes of Zurich | +4 controlar grupos Bank | Detecta "Bank"/financieros por texto | Sinergia con Offshore Banks, Federal Reserve, Savings&Loans, OPEC-corporate |
| Servants of Cthulhu | +4 a DESTRUIR (no instantáneo) + meta Destruir 8 | Ojo: asesinatos/desastres SON instantáneos → NO reciben ese +4 | Combina ataques normales de destroy con boosts; desastres aparte para Places |
| Discordian Society | Estructura inmune a Straight+Government; Weird doble | 16 Government y 3 Straight rivales quedan fuera; 3 Weird cuentan doble | Defensa pasiva total vs ejércitos gobierno; acelera meta vía Weird |
| Shangri-La | Meta Poder Pacífico 30; no puede destruir no-Violent; +5 vs instantáneos | 4 cartas Peaceful | Tomaover pacíficos + takeovers; defensa anti-desastre nata |
| UFOs | 2 acciones/turno + meta Pick3 Secretos | 0 Secretos disponibles | Doble acción = doble takeover temprano; reserva Secretos buenos |
| Adepts of Hermes | Conserva intentos de control fallidos desde la mano | Reintento gratis turno tras turno | Siege barato de objetivos duros con refuerzos +10 acumulables |
| Bermuda Triangle | Reorganiza su estructura al fin de turno | Recoloca para posición +10 (directo bajo Illuminati) antes del KNOCK | Maximiza defensa posicional justo cuando se checan metas |

## 3 · Sinergias entre familias

| Familia (cantidad) | Interactúa con | Nota de diseño |
|---|---|---|
| Plots +10 / genéricos (321) | TODOS los ataques y defensas | Pegamento universal: convierte cualquier ataque viable en seguro (suman hasta resolución) |
| Asesinatos (5) | Personalities en campo | Mata PERMANENTE; ideal contra P≥5 baja-R (Saddam 5/4, Castro 6/4…); Cthulhu no les aplica su +4 |
| Desastres (13) | Places y su subárbol | Devastación quita tokens del subárbol entero → abre estructuras densas para control posterior |
| Paralizar/Congelar/Zap | Grupos pilar enemigos | Paralizado no cuenta para metas → niega progreso ajeno sin destruir |
| Goal cards | Chequeo de fin de turno | Victoria sorpresa si ya cumples otra meta parcial |
| NWO (0) | Todos los jugadores | Global persistente; reemplazo por color |
| Recursos (35) | Pasivos (texto) | Limitación conocida: bonos numéricos de recursos no aplican aún |

## 4 · Fuego real en partida simulada (13 turnos máx)

| Interacción | Disparos |
|---|---|
| Takeovers automáticos | 13 |
| Ataques a CONTROLAR | 6 |
| Ataques a DESTRUIR | 6 |
| Plots +10 jugados | 17 |
| Fallos auto (<2) | 3 |
| Fallos por dados | 1 |
| Capturas con subárbol | 6 |
| Grupos DESTRUIDOS | 2 |
| Victoria declarada | 1 |

**Resultado:** gana IA-1 — Meta básica cumplida (12/12)
## 5 · Uso real por familia (8 partidas IA-vs-IA, hasta 80 turnos)

| Familia | Cartas en mazo | Veces jugada | Veredicto |
|---|---|---|---|
| (sin effect) | 29 | 0 | ❌ no disparó — revisar |
| assassination | 5 | 0 | ⚠️ rara: requiere objetivo válido en campo |
| disaster | 13 | 0 | ⚠️ rara: requiere objetivo válido en campo |
| illu_special | 18 | 0 | ❌ no disparó — revisar |
| plot_generic | 321 | 4 | ✅ pegamento universal (+10) |
| resource_generic | 35 | 49 | ⚙ pasiva por diseño (texto) |

### Acciones agregadas

| Acción | Llamadas |
|---|---|
| addBoost | 283 |
| autoTakeover | 164 |
| declareAttack | 237 |
| exchangeForPlot | 131 |
| illumDrawGroup | 164 |
| playPlot | 4 |
| playResource | 49 |
| res Angel's Feather | 1 |
| res Bigfoot | 2 |
| res Book of Kells | 1 |
| res Center for Weird Studies | 4 |
| res Clipper Chip | 1 |
| res Crystal Skull | 1 |
| res Cyborg Soldiers | 1 |
| res Death Mask | 2 |
| res Earthquake Projector | 1 |
| res Eliza | 1 |
| res Flying Saucer | 2 |
| res Hammer of Thor | 2 |
| res Hidden City | 4 |
| res Hitler's Brain | 1 |
| res Immortality Serum | 5 |
| res Loch Ness Monster | 1 |
| res Mercenaries | 1 |
| res Midas Mill | 1 |
| res Necronomicon | 1 |
| res Orbital Mind Control Lasers | 2 |
| res Perpetual Motion Machine | 1 |
| res Principia Discordia | 2 |
| res Rogue Boomer | 1 |
| res Shroud of Turin | 1 |
| res Spear of Longinus | 1 |
| res Suicide Squad | 1 |
| res The Frog God | 3 |
| res The Holy Grail | 1 |
| res The Library at Alexandria | 2 |
| res Weather Satellite | 1 |

### Ataques por tipo (vía log)

- CONTROLAR: 1265
- DESTRUIR: 1517

### Auditoría adicional verificable

- Eliminaciones por quedar sin títeres: 0
- Eventos de ÁREA NEUTRAL (fallos vs mano rival): 0
- Descartes (incluye límite 5 Plots): 0
- Intercambios tokens→Plot: 131
- Draws extra de Grupo (★): 164
- Recursos jugados con acción: 49