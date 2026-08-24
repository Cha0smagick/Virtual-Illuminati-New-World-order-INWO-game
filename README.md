# INWO — Illuminati: New World Order (juego web)

Juego completo jugable contra IA o humano (hot-seat), reglas oficiales WDH v1.2 con variante One Big Deck.

## Jugar
Abrir `game/index.html` (doble clic). No requiere servidor ni internet (las fuentes de Google son opcionales).

## Subirlo a GitHub y jugar online (GitHub Pages)
```powershell
cd "D:\Illuminati NWO"
git init
git add game/ README.md .gitignore
git commit -m "INWO web game"
git branch -M main
# crea el repo vacío en github.com primero, luego:
git remote add origin https://github.com/TU_USUARIO/inwo-game.git
git push -u origin main
```
Luego en GitHub: **Settings → Pages → Source: `main` / carpeta `/game`** → Save.
En ~1 minuto el juego queda en `https://TU_USUARIO.github.io/inwo-game/` — jugable desde cualquier navegador/celular.

> Todo es estático (HTML+JS+PNG): no necesita backend, Node ni base de datos en producción.

## Estructura
```
game/
  index.html          # shell + orden de scripts
  css/style.css       # tema conspiranoico (negro/neón)
  js/images.js        # manifiesto de las 421 imágenes PNG
  js/cards.js         # base de datos de cartas (stats/efectos)
  js/cardtexts_data.js# AUTO: texto verbatim por OCR (window.INWO_OCR)
  js/texts.js         # fusiona OCR + transcripciones manuales → c.text
  js/engine.js        # motor de reglas OBD v1.2 (window.Engine)
  js/ai.js            # IA oponente (window.AI)
  js/ui.js            # render/tablero/selecciones (window.UI)
  js/app.js           # orquestador (window.App)
scripts/ocr_cards.mjs # pipeline OCR tesseract.js (regenera cardtexts_data.js)
research/             # datos crudos (cards_parsed.json, card_ocr.json…)
SPEC-RULES.md / SPEC-ARCH.md / BIBLIA.md
```

## Regenerar textos OCR
```powershell
node scripts/ocr_cards.mjs   # reanudable; guarda progreso cada 5 cartas
```
