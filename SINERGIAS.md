# Sinergias y uso real de cartas

> Auditoría generada a partir del runtime actual. No es una afirmación de reglas completas del juego de mesa.

## Estado de mecánicas

El catálogo contiene **421 cartas**:

| Estado | Conteo | Tratamiento |
|---|---:|---|
| `implemented` | 1 | Mecánica codificada y cubierta por auditoría |
| `implemented-special` | 18 | Familia Illuminati con effet especial identificado |
| `source-text-unmapped` | 46 | Texto OCR disponible, pero la regla aún no está mapeada al motor |
| `unverified` | 356 | Texto o fuente incompleta; el juego bloquea el uso de la carta |

Los estados se derivan de `card.mechanicsStatus` en `game/js/cards.js`. Los efectos históricos `plot_generic`, `resource_generic`, `generic` y `ability_unverified` ya no se presentan como mecánicas jugables verificadas. Si una carta no tiene una implementación segura, `playPlot` o `playResource` lanza un error antes de gastar tokens, mover la mano o cambiar el mazo.

El texto OCR se conserva para investigación, pero no se convierte automáticamente en una regla. Las mecánicas pendientes se listan en `docs/audit/CARD_CATALOG.md` y `research/audit_reports/card_catalog.json`.

## Uso observado por la IA

El último informe de `scripts/audit_usage.cjs --report-only` résumé:

- **8/8** partidas completas.
- **139** turnos.
- **0** errores de ejecución.
- **12** llamadas `playPlot` y **129** llamadas `playResource`.
- **141** intentos rechazados por cartas no verificadas, separados de los errores de juego.
- **103** ataques `CONTROLAR` y **128** ataques `DESTRUIR`.

El informe completo está en `research/audit_reports/usage.md`. Los rechazo son parte del comportamiento esperado mientras las cartas pendientes no tengan una implementación respaldada por fuente.

## Reglas de interpretación

- Las cartas `unverified` no se simulan como efectos genéricos.
- Las cartas con texto OCR no verificado no se consideran canónicas.
- Las familias especiales implementadas se mantienen separadas de los fallbacks de Illuminati.
- Las estadísticas NULL o estimadas siguen marcadas como pendientes; no se rellenan con valores inventados en runtime.
- El proyecto todavía requiere validación contra las reglas completas y las cartas faltantes de la fuente tabletop.

## Comandos de verificación

```powershell
npm run build:cards
npm run audit:mechanics:report
npm run audit:syn:report
npm run audit:usage:report
npm test
```
