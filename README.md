# 👁 INWO — Illuminati: New World Order · Fan Web Edition

**A playable fan web prototype of Steve Jackson Games' classic CCG *Illuminati: New World Order* (1995)** — 421 scanned cards, a core rules engine, a heuristic AI opponent, hot-seat multiplayer and an AI-vs-AI spectator mode. Pure vanilla JavaScript. No build step, no dependencies at runtime, no server needed.

> *"Everything is true. Everything is conspiratorial."*

## ▶️ **[PLAY NOW — live on GitHub Pages](https://cha0smagick.github.io/Virtual-Illuminati-New-World-order-INWO-game/game/)**

*No install, no account — works on desktop and mobile browsers.*

---

## ✨ Features

- 🎴 **All 421 cards** from the original scans (Groups, Illuminati ×9, Plots, Resources) rendered straight from their PNG art
- 📖 **Card text corpus** recovered via OCR (399/421 entries currently available) shown in the card inspector, plus a built-in glossary with 30+ terms
- ⚔️ **Core rules engine** (World Domination Handbook v1.2, One Big Deck variant): attacks to control/destroy, alignment math, master defense, positional bonuses, self-defense, aiding/opposing, neutral area, token economy, hand limits and basic/special goal scaffolding. Several card-effect families and edge rules remain explicitly incomplete; see `docs/audit/INWO_SURGICAL_AUDIT.md`.
- 🤖 **Heuristic AI opponent** — takes over groups, plays a subset of supported cards, attacks, defends and reacts to some attacks. It is not yet a rules-complete strategic engine.
- 👥 **Hot-seat** for 2 humans with privacy curtain
- 🍿 **IA vs IA spectator mode** with adjustable speed (×1 = 4 s/action, ×2, ×4) and a live event console
- 🌐 **English / Spanish** — switch without reloading; translation runs on explicit UI renders and overlays
- 🏆 Victory bars, dice-roll feedback (11–12 always fail), success/fail feedback, card preview and an accessible conspiracy-dossier visual design

## 🎮 How to play (60 seconds)

1. Pick your mode and each player's secret society.
2. On your turn: **① Draw** a Plot and/or Group card → **② Free takeover** (place one group from hand — no dice!) → **③ Actions**: attack to control (steal with puppets) or destroy, move groups, play resources/plots → **④ End turn**.
3. Attack strength = Power − Resistance ± alignment bonuses − defense. Roll **≤ strength** on 2d6. An 11 or 12 always fails.
4. **Win** by controlling **12 groups** including your Illuminati (or your society's Special Goal).

Full tutorial included in-game (`?` button).

## 🚀 Run it

**Local:** double-click `game/index.html`. That's it. (Or `npx serve .` if you prefer a server.)

**Deploy to GitHub Pages:**

```bash
git init
git add .
git commit -m "INWO web edition"
git branch -M main
git remote add origin https://github.com/Cha0smagick/Virtual-Illuminati-New-World-order-INWO-game.git
git push -u origin main
```

Then **Settings → Pages → Deploy from branch → `main` / root**. The game goes live at:

**https://cha0smagick.github.io/Virtual-Illuminati-New-World-order-INWO-game/game/**

## 📁 Structure

```
├── game/
│   ├── index.html            # entry point (?v=NN cache-busting)
│   ├── css/style.css         # conspiracy dossier design system
│   └── js/
│       ├── images.js         # manifest of 421 card PNGs
│       ├── cards.js          # generated card database (stats + effect kinds)
│       ├── cardtexts_data.js # OCR verbatim texts
│       ├── statsfix.js       # fills verified Power/Resistance
│       ├── texts.js          # Illuminati role/goal documentation
│       ├── engine.js         # WDH v1.2 rules engine (OBD)
│       ├── ai.js             # AI v3 opponent + reactions
│       ├── ui.js             # board, hand, attacks, encyclopedia, animations
│       ├── app.js            # orchestration & game flow
│       └── i18n.js           # EN/ES real-time translation
├── Groups/ · Illuminati/ · Plots/        # original card scans (assets)
├── scripts/                  # OCR pipeline + audits (mechanics, usage, synergies)
├── scripts/run_tests.cjs      # suite runner used by npm test
├── test_p0_invariants.js      # strict P0 regression fixtures
├── tests: test_flow · test_engine · test_ai_vs_ai · test_appflow · test_respond · test_ui
├── SINERGIAS.md              # card-interaction audit report
└── BIBLIA.md                 # deep technical bible (ES)
```

## 🧪 Verified by machines

- `npm test` runs seven headless suites, including strict P0 invariants, lifecycle, response and UI smoke tests
- `npm run audit:mechanics` validates observed 2d6 totals, execution errors and NaN state, and exits non-zero on failures
- AI-vs-AI simulations are smoke tests, not proof of complete rules or balanced AI
- DOM-flow smoke tests use a minimal stub; Chrome headless smoke is still required for visual/keyboard verification

## ⚠️ Known limitations

- OCR-backed text is preserved for reference, but it is not treated as a verified rule until mapped to a mechanic and covered by tests
- Unverified/unmapped cards (`unverified`, `ability_unverified`, and legacy `plot_generic`/`resource_generic`) are rejected before spending action tokens or changing hand/resource/discard state
- P0 regression coverage includes fail-fast tests for both unverified Plot and Resource cards
- Some Power/Resistance values remain OCR/model estimates or `null`; the card catalog records coverage and verification status per card
- Several rules are still pending canonical clarification: hand-target control, linked-resource capture, instant attacks, privilege, immunity, secrets and UFO progress
- Audits distinguish `implemented`, `implemented-special`, `source-text-unmapped`, `pending-engine`, and `unverified`; blocked cards are not presented as playable
- Generated data uses `gen_cards.js` as the canonical generator; legacy `build_cards.js` must not regenerate the runtime dataset

## 📜 Legal

This is a **non-commercial fan project**. *Illuminati*, *Illuminati: New World Order* and all card artwork are © Steve Jackson Games. Card scans are used here as personal-use game assets — please buy the real game / support SJG. The famous urban legend is real history though: SJG offices were raided by the US Secret Service in 1990 (*Operation Sundevil*) — but the game was never banned. Read the full story inside the game's **About** tab.

Code: MIT. Assets: respective owners.
