# Auditoría Atómica — INWO Web Edition

Fecha: 2026-11-10 (reauditoría)

## 0. Estado base
- Tests: 13/13 verdes (`npm test`).
- Cards: 421, 343 clasificadas, 0 bloqueadas.
- i18n: default EN, switch ES/EN en tiempo real.

## 1. Hallazgos verificados y fixes aplicados

### 1.1 Encoding del HTML (crítico)
- `game/index.html` contenía caracteres corruptos (`�`) en `<title>`, `meta description`, `aria-label` y `alt`.
- Fix: archivo reescrito en UTF-8 correcto; `lang="es"` → `lang="en"` (coherente con el default EN).

### 1.2 Responsive
- Layout de 2 columnas fijas se desbordaba en móvil.
- Fix: media queries a 900px y 600px; una columna, header compacto, nodos más pequeños.

### 1.3 Accesibilidad
- Sin `focus-visible`; botones pequeños para táctil.
- Fix: `button:focus-visible` con outline dorado; `min-height/min-width: 40px`.

### 1.4 Contraste
- `--muted: #8A93B8` bajo sobre navy.
- Fix: `--muted: #A8B0D0`.

### 1.5 Turno activo
- No había indicador visual del panel activo.
- Fix: `.panel.active-turn` con borde/dorado (pendiente de cablear en `ui.js`).

## 2. Pendiente (no bloqueante)
- Cablear `.active-turn` al panel del jugador actual.
- Revisión visual en Chrome headless (no disponible en esta sesión).
- Rediseño profundo del árbol de poder (jerarquía con líneas conectoras).

## 3. Verificación
- `npm test` → ALL TESTS PASSED (13).
- `FASE 4` → 343 clasificadas, 0 bloqueadas.
