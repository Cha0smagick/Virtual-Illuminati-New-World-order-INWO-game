# Official INWO rules — authoritative findings

Source of truth: `inwo_rules_extracted.txt` (135,158 bytes) in repo root.
This file supersedes any earlier assumption made in this project about alignments,
attributes, card types or mechanics. Everything below is quoted/paraphrased from
the official Steve Jackson Games rulebook text, not from OCR and not invented.

## 1. The TEN alignments (not 14 — my earlier list was wrong)

> "There are ten different alignments. They are shown at the bottom left of
> Group cards. Some Groups have one alignment, some have several, and a few
> have none."

| Alignment | Opposite |
|---|---|
| Government | Corporate |
| Corporate | Government |
| Liberal | Conservative |
| Conservative | Liberal |
| Peaceful | Violent |
| Violent | Peaceful |
| Straight | Weird |
| Weird | Straight |
| Criminal | (none) |
| Fanatic | *any two Fanatics are "opposite" to each other* |

### Consequences for the card data
- `conservative`, `fanatic`, `straight`, `violent`, `liberal` are **REAL**, not OCR
  inventions. The earlier audit report claiming 8 "invented OCR tags" was wrong.
- The genuinely non-alignment tags found in `cards.js` are only:
  - `huge`   -> a Place **Attribute**
  - `magic`  -> an **Attribute**
  - `green`  -> OCR garbage
- **Correction to previous findings:** the engine's doubling goals reference
  `computer`, `corporate`, `weird` as if they were alignments. `Computer` is
  actually an **Attribute** (rulebook: "For instance, Computer is an attribute").
  `Corporate` and `Weird` ARE alignments. Those goals therefore mix the two systems
  and must be implemented against both.

### Alignment rules
> "A Group can never have two alignments that are opposite; if it is Violent, for
> instance, and something makes it Peaceful, it is no longer Violent. Likewise, a
> Group cannot have 'double alignments.' If it is Violent and something happens to
> make it Violent again, there is no further effect."

## 2. Attributes (bottom-right of the card, printed in italic)

> "Certain 'attributes,' in italic, may appear at the bottom right of a Group
> card. These define which cards are affected by certain Plots or special
> abilities. For instance, Computer is an attribute. A card that affects 'all
> Computer Groups' affects only those Groups with Computer in the lower right."
> "Attributes have no automatic effect on each other."

Confirmed attribute names seen on the real cards: `Computer`, `Magic`.
Confirmed attribute names referenced by Plot text: `Coastal`, `Huge`.

**KEY CONSEQUENCE:** `cards.js` currently stores alignments as ONE flat array
(`c.alignments`). The official card face has TWO separate fields:
- bottom-left = **Alignments** (from the 10)
- bottom-right = **Attributes** (Computer, Magic, Coastal, Huge, ...)

Any mechanic that targets "all Computer groups" must match the ATTRIBUTE, not the
alignment. The data model must split these two lists.

## 3. The FOUR types of Groups (confirms the `subtype` discovery)

> "There are four types of Groups:
> - **Illuminati**: These are the Secret Masters. Each player has only one
>   Illuminati Group, at the center of his Power Structure. These are black and
>   have a horizontal design... Illuminati Groups have **no Resistance, because
>   they cannot be attacked directly**.
> - **Places**: These represent the cabal that controls that place's government.
>   **Places are vulnerable to Disasters.**
> - **Personalities**: These represent key individuals with their loyal henchmen
>   and tools. **Personalities are vulnerable to Assassinations.**
> - **Organizations**: Most Groups are Organizations, not particularly
>   associated with any place or personality."

This EXACTLY matches the `subtype` values already present in `game/js/cards.js`:
`organization: 118, personality: 22, place: 27, (illuminati: 18)`.
`engine.js` currently ignores `subtype` entirely and treats all 167 as Groups.
**49 of them (22 Personalities + 27 Places) are not deck cards at all** — in the
real game they live on the table as attack targets.

## 4. Power and Global Power — the data model is wrong

> "A Group's Power is a measure of its ability to dominate other Groups. Some
> Groups have two Power numbers — for example, **7/4**. The first number is
> regular Power... The second number is **Global Power**, which can be used to aid
> or oppose attacks **regardless of alignments**."

`cards.js` stores `power` and `resistance` as two separate fields. That is
WRONG for cards printed as `7/4`: the second number is **Global Power**, not
Resistance. This must be resolved per-card by reading the card face (the printed
label under the second number says either "Global Power" or "Resistance").
Ambiguity to resolve: the A.M.A. was read as "Power 3 / Resistance 4", but per the
rulebook a second *Power* number is Global Power, so it is likely `3 / Global 4`.

Other Power rules:
> "A Group with a printed Power of 0 gets Action tokens unless its card says
> otherwise, but if a Group's Power is reduced to 0, it loses its Action token(s)
> and cannot get more until its Power is increased above 0. **Power can never be
> reduced below 0.**"
> "If a Group's Power or Resistance has a *, read the instructions on the card!"
> "temporary Power bonuses (from +10 Plot cards, for instance) don't count toward Goals."

## 5. Action tokens

> "Each of your Groups that has no Action token gets one at the beginning of your
> turn. Some Plots and special abilities allow a Group to get extra Action tokens,
> or to get another Action token even though it already has one. **Some Resources
> (the ones that say 'Action' on the bottom) also get Action tokens.**"
> "A Group cannot get Action tokens if its Power is reduced to 0 (however, Groups
> that start with printed Power 0 get Action tokens normally)."
> "A Group spends an Action token when it makes an attack or when it aids or
> opposes another Group's attack... **Action tokens from Resources cannot be
> exchanged for Plot cards.**"
> "During the Main Phase of your turn, an Illuminati action can allow you to take
> over a Resource or draw an extra Group card."

CONFIRMS the `test_respond.js` fix: groups lose their token at end of turn
(engine correctly replenishes one per group per turn).

## 6. Six Plot families (these are the "dead code" case labels — they are REAL)

> - **+10 Plots**: gives a Group +10 Power or Resistance. May boost the Power of
>   the Group's action (lasts until resolved) or defend (lasts until end of turn,
>   counts only for defense). **Does not count for any Goal.**
> - **Attribute Freeze**: prevents all Groups with a certain attribute from acting
>   (except to defend itself) for the rest of the turn, or cancels a single action.
> - **Paralyze**: a paralyzed Group cannot spend Action tokens, cannot use any
>   special ability or linked Resource (even ones that work at no cost).
>   **Control of a paralyzed Group does not count for any Goal.** Puppets of a
>   paralyzed Group are not affected; however the paralyzed Group cannot be given
>   any new puppets.
> - **Power Increase**: linked to a Group of a certain type to increase its Power
>   to the stated value. No effect on a Group already at or above that value.
> - **Zap**: produces its effect on an entire Power Structure until removed.
>   **Any player may spend an Illuminati action at any time to remove all Zaps
>   from one player.**

The `case` labels `boost10, paralyze, power_increase, zap` in `engine.js` are the
correct names. `attribute_freeze` is a 6th family the engine is missing entirely.

## 7. Turn sequence (authoritative)

Beginning of Turn:
1. Draw top Plot card, if you wish. **At the same time you may exchange Action
   tokens on your Groups for additional Plot card draws** (see "Any Time" Moves).
2. Draw top Group card, if you wish.
3. **Make one automatic takeover, if you wish.** Choose any Group or Resource
   from your hand; brought into play automatically, no die roll. A Group's
   incoming control arrow must align with an outgoing control arrow, not
   overlapping any other Group. **You may not duplicate a Group already in play
   unless a card specifically allows it.** A Resource goes beside your Power
   Structure; **you may not duplicate a Unique Resource already in play.**
4. Place an Action token on each of your Groups that doesn't already have one.
   Resources marked "Action" also get tokens.

Main Phase (5): as many of these as you like (except "once per turn"):
- Attack to control or destroy a Group (uses an action from the attacking Group)
- Move a Group to a different control arrow (spend an action, your own turn; or
  either player's turn if both agree and one pays the token cost)
- Create or move links
- Give or trade away a Resource in play (either player's turn, unused that turn;
  then linked to the recipient's Illuminati)
- Play a Plot card
- Discard any card / return a Plot to deck
- Give away or trade cards from hand
- Aid or oppose an attack (unless Privilege prevents it)

End of Turn:
6. Use Plots or special abilities that happen "at the end of your turn"
   (e.g. **the Bermuda Triangle's special ability** — transcription confirmed)
7. Knock. **At this time, any player who has achieved one of his Goals may
   declare victory.** Anyone may use Plots or abilities to thwart or secure it.
   Two or more winners share the victory unless they are factions of the same
   Illuminati.

"Any Time" Moves (even during somebody else's turn):
- Trade 1 Illuminati action OR 2 Group actions for 1 Plot card draw. "This does
  not count as an 'action' by the Group(s) that provide the tokens, and your
  rivals cannot use action-canceling Plots or abilities to prevent it."
- Use a special ability (timing and cost per the card text).

## 8. Plot card handling
> "When a Plot card is played, it is kept on the table for the duration of its
> effect and then discarded... Linked Plots and New World Order cards remain on
> the table indefinitely."
> "You may not play a Plot card immediately after someone attempts to look at or
> steal your Plot cards... However, you may play a Plot card to counter the attempt."
> "**Unless the card says otherwise, all costs to play a Plot card must be
> provided by the player who used it.**"
> "**When it is not your turn, you may hold up to 5 Plot cards** in your hand.
> Both hidden and exposed Plots count against your limit."
> "This limit applies only to Plot cards and only when it is not your turn."
> "You may not play a Plot card immediately after someone attempts to look at or
> steal your Plot cards."

## 9. The NWO-card first-turn rule (engine already implements this)
> "At the beginning of the game, you may not do anything to a rival who has not
> yet completed his first turn! You may not interfere with their attacks or target
> them with any card (however, you may play cards that affect all players, such as
> New World Order cards...). **Exception: If someone attacks you during his first
> turn, you are free to respond against that player in any way you choose.**"

This is `twoPlayerGuard` (engine.js:457). It is CORRECT, and the exception
("you are free to respond") justifies the `responderPid()` fix made earlier.

## 10. Group deck / draw rules
> "Once per turn during the Main Phase of your turn, you may spend an Action token
> from your Illuminati to draw a Group card."
> "**Once a Group is in play, you may not bring another copy of the same Group
> into play unless some card specifically permits it!** (Illuminati Groups are an
> exception; multiple copies of the same Illuminati can be in play as rival
> factions.)"
> "You may not simply discard [a Group] (for instance, **you cannot dump Peaceful
> Groups to prevent Shangri-La from winning**)."

## 11. Winning
> "You may win by controlling enough Groups, or by fulfilling the special goal of
> your own Illuminati, or by meeting the objectives on a Goal card. Or, of course,
> by destroying all of your foes!"

Confirms: Goal cards are a real mechanic and the UFOs Illuminati goal ("up to 3
different Goal cards in play") depends on them.

**CORRECTION 2026-09-30 (P1-010).** An earlier version of this line said the deck
contains "currently ZERO" Goal cards. That was wrong. There are exactly **7** cards
with `effect.kind === 'goal'`, matching the official list: *Alternate Goals* (190),
*Criminal Overlords* (231), *Fratricide* (261), *Hail Eris!* (272),
*Military-Industrial Complex* (315), *Peace in Our Time* (334) and
*World War Three* (419). Three of them are win conditions (Criminal Overlords,
Fratricide, Hail Eris!) and four are permanent modifiers (Alternate Goals,
Military-Industrial Complex, Peace in Our Time, World War Three); the modifiers are
declared `pending-engine` rather than simulated.

A Goal card is a **type of Plot card** (`inwo_rules_extracted.txt:979-991`), a player
may hold at most one (`inwo_rules_extracted.txt:938-944`), and it is **revealed, not
played**, during a victory attempt; if the attempt fails it returns to hand exposed
(`librarian_result.txt:2186`). See section 24 of `docs/audit/INWO_SURGICAL_AUDIT.md`.

## 12. Control arrows
> "Illuminati cards have four outgoing control arrows. Each of these can be used
> to control one Group. Other Groups have one incoming control arrow, and 0 to 3
> outgoing control arrows. When you take over a Group, put its incoming arrow next
> to an outgoing arrow of its master."

Engine's `maxChildren(node)` = `node.cardId==null?4:3` matches this.

## 13. Still to read from the rulebook (TODO)
The following pages are in the file and MUST be read before implementing combat:
- **p.7-8 Attacks**: Attack to Control, Automatic Failure, **Alignments**,
  Attributes, Aiding or Opposing Attacks, **Global Power**
- **p.9-10 Using Plots and Abilities, Resistance to Control, Resolving the
  Attack, Whoops!, Results of Attack to Control**
- **p.10-11 Attack to Destroy, Hidden Agents, Limits on Attacks, Privileged
  Attacks, Immunity**
- **p.11-12 Instant Attacks, Assassinations, Disasters, Devastation and Relief**
- **p.12 Moving Groups, Gifts and Trades**
- **p.14 Links, Moving Links, Illegal Links**
- **p.16 Winning the Game, Goal cards**
- **p.18 Glossary of Terms** — authoritative definition of every term
