# 👁 INWO — Illuminati: New World Order · Fan Web Edition

**A complete, playable web implementation of Steve Jackson Games' classic CCG *Illuminati: New World Order* (1995)** — 421 scanned cards, full rules engine, a competitive AI opponent, hot-seat multiplayer and an AI-vs-AI spectator mode. Pure vanilla JavaScript. No build step, no dependencies at runtime, no server needed.

> *"Everything is true. Everything is conspiratorial."*

## ▶️ **[PLAY NOW — live on GitHub Pages](https://cha0smagick.github.io/Virtual-Illuminati-New-World-order-INWO-game/game/)**

*No install, no account — works on desktop and mobile browsers.*

---

## ✨ Features

- 🎴 **All 421 cards** from the original scans (Groups, Illuminati ×9, Plots, Resources) rendered straight from their PNG art
- 📖 **Real card texts** recovered via OCR (418/421 clean) shown on hover — plus a built-in glossary with 30+ hoverable terms (alignments, card types, tokens…)
- ⚔️ **Full rules engine** (World Domination Handbook v1.2, One Big Deck variant): attacks to control/destroy, ±4 alignment math, master-alignment defense, positional bonuses (+10/+5), self-defense ×2, aiding/opposing, privilege, secrets, immunity, neutral area, instant attacks, assassinations, disasters, NWO, Goal cards, token economy, hand limits, special goals per Illuminati
- 🤖 **AI opponent (v3)** — plays takeovers, resources, boosts, attacks with win-probability estimation over the real 2d6 curve, defends its structures, opposes your attacks and pushes for victory (~turn 17–21)
- 👥 **Hot-seat** for 2 humans with privacy curtain
- 🍿 **IA vs IA spectator mode** with adjustable speed (×1 = 4 s/action, ×2, ×4) and a live event console
- 🌐 **English / Spanish** — real-time switch, everything translated (UI + engine log)
- 🏆 Victory bars, dice-roll feedback (11–12 always fail!), success/fail banners, animated card preview, conspiracy-dossier visual design (Cinzel + typewriter)

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
├── tests: test_flow · test_engine · test_ai_vs_ai · test_appflow · test_respond
├── SINERGIAS.md              # card-interaction audit report
└── BIBLIA.md                 # deep technical bible (ES)
```

## 🧪 Verified by machines

- Dice distribution checked against theoretical 2d6 (120k samples) — 7 ≈ 16.7%, extremes ≈ 2.8%
- Full AI-vs-AI games end in legitimate victories (Basic Goal 12/12 around turn 17–21)
- Usage instrumentation proves the engine fires: hundreds of takeovers/attacks, +10 boosts, resources, discards, neutral-area flows (see `SINERGIAS.md`)
- DOM-flow smoke test (`test_flow.js`) runs the real UI code headless — zero alerts

## ⚠️ Known limitations

- Resource abilities are passive placeholders (card text shown; numeric bonuses not applied yet)
- Most Plot cards currently act as universal **+10 boosters**; special plot families (Paralyze/Zap/NWO…) are being reclassified from OCR keywords
- Some Power/Resistance values are model-sourced estimates (flagged); core ones verified from tournament logs

## 📜 Legal

This is a **non-commercial fan project**. *Illuminati*, *Illuminati: New World Order* and all card artwork are © Steve Jackson Games. Card scans are used here as personal-use game assets — please buy the real game / support SJG. The famous urban legend is real history though: SJG offices were raided by the US Secret Service in 1990 (*Operation Sundevil*) — but the game was never banned. Read the full story inside the game's **About** tab.

Code: MIT. Assets: respective owners.
