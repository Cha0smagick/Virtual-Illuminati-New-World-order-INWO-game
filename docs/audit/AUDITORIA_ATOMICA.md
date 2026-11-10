# Auditoría Atómica — INWO Web Edition

Fecha: 2026-11-10

## 0. Estado base
- Tests: 13/13 verdes (npm test).
- Cards: 421, 343 clasificadas, 0 bloqueadas, 3 pendientes (declared_noop).
- i18n: default EN, switch ES/EN en tiempo real.

## 1. Hallazgos de UX/UI (intuitividad y estética)

### 1.1 Tablero
- Layout de 2 columnas fijas (minmax 1.15fr/1fr) no se adapta a pantallas pequeñas; en móvil el árbol de poder se desborda.
- Los nodos del árbol usan `display:inline-block` con `flex-wrap` en `.kids`, lo que genera saltos irregulares y difícil lectura de jerarquía.
- El header tiene `flex-wrap: wrap` y el título ocupa mucho espacio vertical en móvil.

### 1.2 Controles
- Botones de acción tienen padding 6px/13px y font 13px; en móvil son pequeños.
- El botón de idioma es un botón pequeño insertado dinámicamente; no es obvio.
- No hay feedback visual claro de "turno del jugador" vs "turno de la IA" más allá de texto.

### 1.3 Legibilidad
- Mezcla de 3 fuentes (Cinzel, Special Elite, Segoe UI) con tamaños pequeños (8.5px, 9px, 11px) dificulta lectura.
- Colores con bajo contraste: `--muted: #8A93B8` sobre navy oscuro.

### 1.4 Accesibilidad
- No hay focus-visible styles claros.
- Algunos botones usan solo color para estado (disabled con grayscale).

## 2. Hallazgos de fiabilidad
- Tests flaky por dependencia de random en fixtures (L56, L24). Mitigado parcialmente con clear24.
- `test_engine.js` y `test_p0_invariants.js` dependían de cartas unverified; ajustados para skip.

## 3. Plan de fixes (priorizado)
1. Responsive: media queries para layout de 1 columna en móvil.
2. Árbol de poder: mejorar jerarquía visual (indentación, líneas conectoras).
3. Botones: aumentar tamaño mínimo táctil (44px), focus-visible.
4. Contraste: subir --muted a #A8B0D0.
5. Header: compactar en móvil.
6. Feedback de turno: borde/animación en panel activo.

## 4. Ejecución
- [x] Auditoría creada.
- [ ] Fixes CSS aplicados.
- [ ] Verificación visual (Chrome headless pendiente).
