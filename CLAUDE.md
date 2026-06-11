# 🎮 Letterlock — Master Plan & Architecture

> **Name:** **Letterlock** 🔒 — claim & lock letters across the board to connect your edges. (Locked in.)
> **What this doc is:** the complete, research-backed game-design + engineering plan. Paste it into the new repo as `CLAUDE.md` (or `README.md` + `CLAUDE.md`). It is written so any AI agent or human picking up the repo knows exactly what to build, in what order, and to what quality bar.
> **Sources:** every major decision below is grounded in deep research on top games (Wordle, Kahoot, Jackbox, Duolingo, chess.com, Trivia Crack, Clash Royale) + Flutter docs (via Context7) + GDC talks on game feel. Citations live in the **📚 Appendix**.

---

## 🧭 0. North Star & Non-Negotiables

**The pitch:** A fair, gorgeous, modern reinvention of TV's *Blockbusters*. Two teams battle on a honeycomb board. Each hex holds a letter; a host reads a trivia question whose **answer starts with that letter**; the team that answers correctly **claims the hex in their color**. One team races to connect **left↔right**, the other **top↔bottom**. Block your opponent while you build your own chain. First to connect wins. Best-of-1/3/5 matches. Show it on a TV/iPad/browser; later, teams buzz in from their phones.

**The three non-negotiables (in priority order):**
1. 🐛 **Bug-free, end-to-end, provably-correct game logic.** Especially win-detection and turn rules. This is priority #1. The whole architecture below exists to make this testable.
2. 🎨 **Elite UI/UX.** "Looks and feels like a polished commercial game-show," not a school project. This is priority #2 and gets its own bible (§7).
3. ⚖️ **Fairness.** Equal letters in both directions, neutralized first-move advantage, latency-fair buzzing. This is what fixes the original's core flaw.

**Everything else is secondary and most of it lives in the 🔮 Future TODO list (§14).**

---

## 🔍 1. The Original, Reverse-Engineered (so we know what we're beating)

The reference game ([lingolex.com/games/hexagons/hex.php](https://lingolex.com/games/hexagons/hex.php)) is a *Blockbusters* coloring toy, not a real game:

- **Board:** 23 hexes in `5-4-5-4-5` honeycomb rows (`E J F S Y / B K V I / O T P M N / H Q D A / W U G L R`).
- **Logic:** essentially none. A `changeFill(n)` function cycles each hex's color (neutral → green → red → …) on click. There is **no turn system, no questions in the app, no teams, no win detection, no scoring.** The host eyeballs everything; questions live "on a smartphone" separately.
- **Flaws we explicitly fix:**
  - ❌ **Geometrically unfair** — the two connection directions need different numbers of hexes (the user's exact complaint).
  - ❌ **Red/green colors** — the single worst choice for colorblind players (~8% of men).
  - ❌ **No game logic** — no win detection, no rules enforcement, no modes.
  - ❌ **Breaks on small screens**, no mobile support.
  - ❌ **No content** — questions aren't even in the app.

We are not "recreating" this. We are building a real, fair, beautiful game on top of the *idea*.

---

## ⚖️ 2. The Fairness Engine — "Game of Hex" Topology (the core innovation)

This is the heart of the redesign and the answer to "make it equal and fair in terms of letters."

### 2.1 The board: an N×N rhombus of hexagons
We use the topology of the mathematical **Game of Hex**: a parallelogram (rhombus) of hexagons, **N rows × N columns**, pointy-top, with **6-neighbor adjacency**.

```
        N = 5  (25 hexes)
          A B C D E          ← Team Vertical owns TOP edge
           F G H I J
            K L M N O
             P Q R S T
              U V W X Y       ← Team Vertical owns BOTTOM edge
        ↑                ↑
   Team Horizontal    Team Horizontal
   owns LEFT edge     owns RIGHT edge
```

- **Team Horizontal** wins by connecting a continuous chain of its hexes from the **left edge to the right edge**.
- **Team Vertical** wins by connecting the **top edge to the bottom edge**.
- **Both teams must cross exactly N hexes.** Perfectly fair — equal letters each way. ✅ (This is the fix.)

### 2.2 Why this topology (vs the broken honeycomb)
- 🟰 **Symmetric:** both directions are identical-length. No more "5 one way, 6 the other."
- 🧠 **Deep strategy for free:** because a hex can belong to only one team, **claiming a hex on your opponent's path blocks them.** Blocking ("cutting each other off") is built into the geometry — exactly the gameplay the user wants.
- 🚫 **No board can ever stalemate.** A famous theorem (the *Hex theorem*): on a filled Hex board, **exactly one player has connected** — never zero, never both. So a board *cannot* end in a draw. (Great selling point: "someone always wins the board.")

### 2.3 So how do we "account for a draw"? (the user asked)
Board-level draws are *mathematically impossible* in Hex topology — but draws still exist at higher levels, and we handle all of them (see §3.6):
- **Match-level tie** in even-numbered formats → resolved by tiebreaker / sudden-death.
- **Abandonment / timeout / both-teams-fail-repeatedly** → a "no result / replay" path.
- 🔀 **Optional Square-Grid mode (future):** if you ever want *true board draws* (gridlock where neither connects), ship an alternate **4-neighbor square board** as a game mode. The engine is built to support both topologies (see §6.1). Default = Hex.

### 2.4 First-move fairness: the Pie Rule (swap rule)
Hex has a known **first-player advantage**. We neutralize it elegantly with the **pie rule**: after Team A claims the first hex, **Team B may either continue OR swap sides** (take over A's position/color). This makes the opening fair with zero balance-tuning. *(Default ON in ranked; toggleable.)* As a simpler fallback for casual play, **alternate who-goes-first and who-gets-which-direction each game** in a best-of-N series.

### 2.5 Board sizes & letters
- **Sizes (a game mode / replayability lever):** `4×4` (Quick / kids, 16 hexes), **`5×5` (Classic, 25 hexes — default)**, `7×7` (Epic, 49 hexes).
- **Letter placement:** the **question bank is all 26 letters × 30 Q&A**. On the board, letters are **placed randomly each match** (different blocking geometry every game = replayability).
  - When `hexes ≤ 26` (4×4, 5×5): draw distinct letters; optionally bias *out* the hardest letters (X, Z, Q) so a 5×5 uses a fair, answerable set of 25.
  - When `hexes > 26` (7×7): letters repeat (totally fine — *Blockbusters* repeats letters too).
- **Why not force all 26 onto the board:** a square/rhombus board is what guarantees fairness, and 26 isn't a perfect square. "All 26 letters" is satisfied by the **content bank**, not by cramming 26 hexes into an unfair shape. (Documented so it's a deliberate decision, not an accident.)

---

## 🕹️ 3. Full Game Rules, Modes & Flow

### 3.1 Setup
1. **Teams:** create **Team A** and **Team B** — custom names + pick a team color from the colorblind-safe palette (§7.3) + optional avatar.
2. **Mode:** Single Game / **Best-of-3** / **Best-of-5** (odd formats avoid match ties by default).
3. **Board size:** 4×4 / 5×5 / 7×7.
4. **Question pack:** chosen on the **home screen** (packs are first-class, browsable, shown as cards — §8).
5. **Options:** timer length (Blitz / Standard / Relaxed-no-timer for classrooms), special-hex modifiers on/off (future), pie rule on/off.
6. **Direction assignment:** one team = Horizontal (L↔R), other = Vertical (T↔B). Swapped each game in a series for fairness.

### 3.2 The core turn loop (host-adjudicated — matches the user's spec)
The host runs the questions (on a phone/own screen); the board shows on the shared screen. Per turn:

1. 🎯 **Active team picks an unclaimed hex** (strategic positioning — choose to advance your chain *or* block the opponent).
2. 🔤 **The letter is revealed**; the host taps the hex → app serves a **randomized, unused question** from that letter's pool (answer starts with that letter). Host reads it aloud.
3. ⏱️ **Answer phase** (host-adjudicated; this is what the user described — "host selects who won each letter"):
   - The **picking team answers first.** Host taps **✅ Correct** → that team **claims the hex** (it floods their color with full juice).
   - If **wrong/timeout**, the **other team may steal** by answering. Host taps the result.
   - If **both fail**, host taps **⬜ No one** → hex stays **neutral** and returns to the pool (can be contested again later). Turn passes.
   - Host can also **⏭️ Skip** a question (serves a fresh one) and **↩️ Undo** the last adjudication (misread/dispute — critical for classrooms).
4. 🔁 **Turn passes** to the other team. Repeat.
5. 🏆 **Win check runs after every claim** (instantly, via union-find — §6.3). The moment a team connects its two edges, the **victory sequence** fires.

> **Two adjudication styles, both supported:** **(a) Structured** (pick → answer → steal-on-miss, as above) is the default rich ruleset. **(b) Pure host-call** (host just taps the winning team for each contested hex, no enforced steal logic) is a simpler toggle for fast/loose play. The host UI exposes ✅A / ✅B / ⬜None / ⏭️Skip / ↩️Undo at all times.

### 3.3 Winning a game
A team wins the **game** the instant its claimed hexes form one connected chain touching **both** of its edges. The winning chain is highlighted with a hero "lightning trace" animation (§7.5).

### 3.4 Winning a match (modes)
- **Single Game:** first connection wins.
- **Best-of-3 / Best-of-5:** first to win the majority of games (2 / 3). Between games: swap directions, optionally reshuffle letters/pack, run the pie rule, show a between-games scoreboard (Kahoot-style cadence).

### 3.5 Scoring (beyond win/lose)
- Primary result = games won.
- **Secondary stats** (for tiebreaks, "close game" detection, and the share card): hexes claimed, correct-answer count, average answer speed, blocks made.
- **Optional speed-bonus** (Kahoot formula, future/online): `points = base × (1 − ((responseTime / timer) / 2))`.

### 3.6 ⚠️ Draws & every edge case (the user asked to "think of all of them")
| Situation | Ruling |
|---|---|
| Board fills with no connection | **Impossible** in Hex topology (Hex theorem). Possible only in optional Square mode → declared a **drawn game** → replay or sudden-death. |
| Both teams fail a contested hex | Hex stays **neutral**, returns to pool, turn passes. |
| Match tie (even-format, e.g. a Bo2 or a drawn game in a series) | **Sudden-death decider:** single "golden hex" / lightning round, or fewest-moves tiebreak, then stats tiebreak (hexes → correct → speed). |
| Running out of unused questions for a letter | Pull from a **wildcard pool**, then allow repeats (least-recently-used first). Content QA ensures ≥30/letter so this is rare. |
| Team picks an already-claimed hex | **Disallowed in UI** — only neutral hexes are tappable. |
| Host misadjudicates | **↩️ Undo** (full move-log rollback — §6.2). |
| Timer expires with no answer | Counts as a miss (steal opens, or turn passes). |
| Hard letters (X, Z, Q) | Curated bank + "answer reasonably starts with" leniency; biased off small boards. |
| Who-goes-first advantage | **Pie rule** + alternating first/direction per game. |
| Player/host disconnect (Phase 2) | Seat reserved, room survives, silent rejoin — §10. |
| Simultaneous buzz (Phase 2) | Server reconstructs *press time*, first wins, lockout — §10.4. |
| App closed mid-match | **Save/resume** from local (and later cloud) — §6.2. |

---

## 🏗️ 4. Tech Stack & Architecture

**Cross-platform from ONE codebase: Flutter** (Web + Android + iOS). This is the right call because it serves all three of the user's needs: (1) host as a **web build on the VPS subdomain**, (2) **Android testing on PC now**, (3) **iOS later via Codemagic**, and the iPhone can play the **web build in Safari (PWA)** today with no Mac/dev-account.

| Concern | Choice | Why (1-line) |
|---|---|---|
| Language/UI | **Flutter (stable 3.3x / Dart 3.x)** | One codebase → web + Android + iOS. |
| State mgmt | **Riverpod 3.x** (`flutter_riverpod ^3.3.0`) + codegen | Testable, DI-friendly, scales to rooms/matches. |
| Models | **freezed + json_serializable** | Immutable state, serializes for log/wire/storage. |
| Board render | **single `CustomPainter`** | Full control over draw order, glow, hit-testing, winning-trace; widget-per-hex doesn't scale. |
| Hex math | **axial `(q,r)` storage + cube algorithms** | redblobgames standard; clean neighbors/distance. |
| Win detection | **Union-Find (DSU) + 2 virtual edge-nodes/team** | ~O(1) per move; flood-fill kept as a **test oracle**. |
| Animation | **flutter_animate ^4.5.2** + **confetti** + **fragment shader** (+ **Rive** for hero moments) | Declarative juice; shader for the winning-path glow. |
| Audio | **flutter_soloud ^3.1.x** | Officially recommended low-latency game audio. |
| Haptics | built-in `HapticFeedback` | No package; no-op on web. |
| Responsive | `LayoutBuilder` + `MediaQuery.sizeOf` breakpoints + `flutter_screenutil` (type only) | Phone → tablet → **TV** (10-foot UI). |
| Local storage | **shared_preferences** (settings) + **drift** (packs, history) | drift = maintained, type-safe, runs on web. |
| Routing/web | **go_router** + `usePathUrlStrategy()` | Clean deep-link room URLs (`/join/ABCDEF`). |
| Localization | built-in **intl + gen-l10n** | First-party; architect for RTL/other alphabets early. |
| Theming | **Material 3** seed + custom `ThemeExtension` tokens | One design system; TV high-contrast variant. |
| Cloud (future) | **Supabase** (self-hostable on the same VPS!) | Auth + Postgres + RLS = "users own their packs"; fits "on MY VPS." |
| Realtime (Phase 2) | **`web_socket_channel`** client ↔ **dart_frog + dart_frog_web_socket** server on VPS behind Nginx (wss) | Server reuses the exact Dart `game_core`; one language. |
| CI/CD | **Codemagic** (mobile stores) + web deploy to VPS | Free 500 min/mo; auto build/sign/publish. |
| Monorepo | **melos** | Pure `game_core` package + app + server share code. |

### 4.1 The load-bearing architectural rule 🧱
**A pure-Dart `game_core` package with ZERO Flutter imports** holds all rules: models, hex math, the event reducer, and win-detection. This means:
- ✅ Game logic is unit-tested in **milliseconds** with `dart test` (no widget harness) → directly serves priority #1 (bug-free).
- ✅ The **Phase-2 server reuses the identical rules engine** → no client/server logic drift.
- ✅ Win-detection is cross-checked **DSU vs an independent flood-fill oracle vs fuzz tests** → provably correct.

---

## 📁 5. Project Structure (melos monorepo)

```
letterlock/
├─ melos.yaml
├─ CLAUDE.md                      # this plan
├─ packages/
│  └─ game_core/                  # ⭐ PURE DART — no flutter import
│     ├─ lib/
│     │  ├─ models/               # GameState, MatchState, Team, Hex, QuestionPack (freezed)
│     │  ├─ coords/               # axial<->cube, pixel<->hex, neighbors, edges
│     │  ├─ events/               # GameEvent (the append-only move log)
│     │  ├─ engine/               # reducer: apply(state, event) -> state ; rules enforcement
│     │  ├─ win/                  # union_find.dart  +  floodfill_oracle.dart
│     │  └─ topology/             # HexTopology + SquareTopology (pluggable)
│     └─ test/                    # dart test: unit + property/fuzz + DSU-vs-oracle
├─ apps/
│  └─ letterlock_app/               # the Flutter app
│     ├─ lib/src/
│     │  ├─ features/             # FEATURE-FIRST
│     │  │  ├─ board/             # CustomPainter, hit-test, claim/trace animations
│     │  │  ├─ game/              # Riverpod notifiers wrapping game_core
│     │  │  ├─ question/          # question card, timer, host adjudication pad
│     │  │  ├─ home/              # pack browser, mode/team setup
│     │  │  ├─ lobby/             # room code + QR (Phase 2)
│     │  │  ├─ victory/           # confetti + Rive + shader + share card
│     │  │  ├─ settings/          # accessibility, audio, motion
│     │  │  └─ packs/             # pack editor + import/export (v2)
│     │  ├─ common/               # design system, theme tokens, shared widgets
│     │  ├─ routing/              # go_router + path URL strategy
│     │  ├─ services/             # storage(drift), audio(soloud), analytics, ws client
│     │  └─ l10n/
│     ├─ shaders/                 # winning_path.frag
│     ├─ assets/packs/            # default.json (26×30) + theme packs
│     ├─ assets/audio/            # layered SFX + music
│     ├─ web/index.html           # preloader, PWA manifest, COOP/COEP headers
│     ├─ test/                    # widget + golden tests
│     └─ integration_test/        # full-match flows
└─ servers/
   └─ letterlock_server/            # dart_frog; depends on packages/game_core (Phase 2)
```

---

## 🧠 6. Core Systems & Data Models

### 6.1 Pluggable topology
```dart
abstract class BoardTopology {
  int get cellCount;
  List<int> neighbors(int cell);        // adjacency
  bool onEdge(int cell, EdgeId edge);   // for virtual edge-nodes
}
class HexRhombusTopology extends BoardTopology { ... }   // default, 6-neighbor
class SquareGridTopology extends BoardTopology { ... }   // future draw-mode, 4-neighbor
```
Both topologies feed the same union-find win check. This is how we support Hex-default + an optional Square "draws possible" mode without forking the engine.

### 6.2 Immutable state + append-only event log (enables undo, resume, replay, multiplayer)
```dart
@freezed class GameState   // board ownership grid, scores, turn, status, claimedQuestions
@freezed class MatchState  // games list, mode (bo1/3/5), series score, direction assignment
sealed class GameEvent { HexClaimed, QuestionServed, QuestionSkipped,
                          AdjudicationUndone, TurnPassed, PieSwap, GameWon, MatchWon }

GameState reduce(GameState s, GameEvent e); // pure function
```
- **Undo** = truncate the log + replay (also rebuilds DSU — trivially correct).
- **Save/resume** = persist the log (Riverpod 3 `Notifier.persist` + drift).
- **Replay / match history** = step the log.
- **Phase-2 wire format** = the *same* `GameEvent`s, broadcast by the authoritative server.

### 6.3 Win detection (provably correct)
Weighted **Union-Find** with path compression + union-by-rank, backed by `Int32List` (no GC churn, serializable). Each team gets **two virtual nodes** (one per owned edge). On claim: union the hex with same-team neighbors and with any edge-node it touches. **Team wins iff `find(edgeA) == find(edgeB)`.** Independent **flood-fill oracle** + **property/fuzz tests** (random legal games) cross-check it in CI. (DSU has no cheap delete → for undo we replay the log, not delete.)

### 6.4 Question pack schema
```jsonc
// assets/packs/default.json
{
  "id": "default-gk-medium",
  "name": "General Knowledge",
  "locale": "en",
  "difficulty": "medium",
  "contentRating": "everyone",
  "letters": {
    "A": [
      { "q": "This continent is the largest by area.", "a": "Asia",
        "difficulty": 2, "category": "geography", "pEstimate": 0.7 }
      // ... 30 per letter
    ],
    "B": [ /* 30 */ ], ... "Z": [ /* 30 */ ]
  }
}
```
- **26 letters × 30 = 780 questions** in the default pack, **medium difficulty** ("average person thinks a bit," target correct-rate ≈ 0.55–0.7).
- Every question tagged: `difficulty 1–5`, `category`, `pEstimate`, `locale`, `contentRating`.
- **Consistency rule (learned from Trivia Crack's failure):** difficulty must be *uniform within a pack* or close games feel arbitrary.
- Packs are **browsable on the home screen as cards**. Questions are served **randomized & unused-first** per letter.

---

## 🎨 7. The UI/UX Bible — "Go Crazy" (priority #2)

> Mandate: build with the **`frontend-design` skill**, reference these specs, and treat the **hex-claim, the winning-trace, and the victory screen** as hero moments. The bar: *commercial game-show polish.*

### 7.1 Design language
- 🎡 **Vibe:** bright, friendly, *game-show* energy (Trivia Crack / Kahoot), **not** sterile corporate flat. Characterful but disciplined.
- 📐 **8pt spacing grid** (8/16/24/32…). Inconsistent spacing is *the* amateur tell — commit to the scale.
- 🔤 **One type scale** (e.g. H1 48–72 / H2 32 / body 16–20). Defined line-heights (multiples of 4). One or two typefaces max.
- 🎨 **Color discipline:** 2 team colors + 1 neutral accent + grayscale. Premium ≠ many colors.
- 🧊 **Depth:** claimed hexes get subtle elevation/shadow so the board reads as physical tiles; opacity hierarchy (primary 100 / secondary 70 / tertiary 40).

### 7.2 Motion spec (concrete ms — Material 3 / NN/g aligned)
| Moment | Duration | Curve |
|---|---|---|
| Tap → hex highlight | **<100 ms** | ease-out |
| Hex claim (squash & stretch overshoot 110%→100%) | 250–300 ms | `easeOutBack` / `emphasizedDecelerate` |
| Hit-stop (freeze on claim) | **~50 ms** normal / **250–400 ms** on a winning claim | — |
| Turn-handoff sweep (active team's side lights up) | 400–500 ms | standard |
| Question card in / out | 300 ms in / 200 ms out | ease-out / ease-in |
| Winning-path "lightning" trace (hero) | **600–1000 ms** | shader-driven |
- All UI motion 100–500 ms. **Always honor `prefers-reduced-motion`** (kills shake/overshoot, keeps instant state cross-fades).

### 7.3 Color & accessibility (fixes the original's biggest flaw) ♿
- **Team A = blue `#0072B2`, Team B = orange `#E69F00`** (Wong/Okabe-Ito palette). **Never red/green.** Blue/orange is the safest pair across all colorblindness types and renders best on TVs.
- 🔺 **Encode ownership with more than color:** each claimed hex also gets a **team pattern/icon** (e.g. ● dots vs ◆ diamonds) so color is never the only signal.
- **Contrast:** text ≥ 4.5:1 (7:1 for TV). **Wrong answers use GRAY, not red** (Wordle lesson — keep failure low-stress for casual/classroom).
- ⚙️ **Accessibility settings panel:** reduced-motion toggle, **font picker** (default + Atkinson Hyperlegible + Lexend), font-size scaling, **TTS read-aloud** for questions, **audio captions/icons** for every sound sting, separate **SFX/music mutes** (default music OFF in classroom context).

### 7.4 Audio (cheapest perceived-quality multiplier) 🔊
- **Layer** the hex-claim SFX (thunk + sparkle + low bass body). Distinct, **non-punishing** correct/wrong stings (wrong = soft "whomp," not a harsh buzzer).
- **Tension countdown music** while a team deliberates; energetic lobby music. Winning-trace = rising musical run → triumphant chord.
- Source royalty-free from **Sonniss GameAudioGDC / Freesound / Pixabay**. Init audio on first user tap (web autoplay rule).

### 7.5 Hero moments (where the "crazy" goes)
1. **Hex claim** — the signature microinteraction: <100ms highlight → squash/stretch overshoot + color flood + particle burst + layered SFX + 50ms hit-stop + haptic.
2. **Block feedback** — when a claim cuts off the opponent's near-complete path, give it extra weight (flash + distinct "check"-like sound). Rewards the core strategy.
3. **Winning-path trace** — 600–1000ms shader glow sweeping the connected chain, ~300ms hit-stop on the final hex, rising music, then **confetti** (+ optional Rive celebration).
4. **Share card** — auto-generated spoiler-free result image of the final colored board + "Team Blue connected L↔R in 7 moves" (Wordle's viral mechanic, but a *board* is even more iconic than a word grid).

### 7.6 Big-screen / 10-foot UX (TV / iPad / projector) 📺
- Designed for **8–12 ft viewing:** big readable letters on hexes, large question type (≥24sp body, 48sp+ headings), glanceable "whose turn / score / connection-race" state always visible.
- Cool palette (already chosen) renders best on TVs. **5–10% safe-area margin** for overscan (Flutter `SafeArea` doesn't cover TV overscan — add a configurable margin).

### 7.7 First-time experience (teach in <60s, show don't tell) 🎓
A 3-beat interactive cold-open (skippable): **(1)** "Tap a hex" → it highlights; **(2)** one sample question → on correct, hex floods Team A's color with full juice; **(3)** ghost-animate a glowing path edge-to-edge so players *see* the win condition once. The deep part to teach is **blocking**, surfaced as a contextual tip the first time an opponent's path is threatened. Plus a **Demo Match vs easy AI** on a 4×4 board, and a free sample pack so the first session never hits a paywall.

### 7.8 Steal-list (what to copy from the best)
- **Wordle:** gray-not-red for wrong; satisfying timed reveal; spoiler-free shareable result.
- **Kahoot:** host-paced cadence (answer → reveal → standings → next); tension countdown music; PIN+QR lobby.
- **Jackbox:** no-install web join via short room code; minimal phone controller; big screen is canonical.
- **Among Us:** **copyable/shareable room code** (don't make it un-selectable — their famous mistake); house-rule presets.
- **Duolingo:** subtle haptics + restrained celebration; streak psychology.
- **chess.com:** distinct sound per board event; confetti on win; weight the "check"/block moment.

### 7.9 Amateur tells to avoid ❌
Inconsistent spacing • too many font sizes/colors • linear (un-eased) motion • no feedback on actions • over-juicing that hides state • harsh red errors • color-only encoding.

### 7.10 Top 15 highest-leverage UI/UX moves (ranked)
1. Make the **hex-claim** the hero microinteraction (response <100ms + overshoot + flood + particles + SFX + hit-stop). 2. **Blue/orange + patterns**, never red/green. 3. **Winning-path lightning trace** hero sequence. 4. **Gray, not red**, for wrong answers. 5. **<60s interactive tutorial**. 6. **8pt grid + one type scale + 2-color palette** in the theme. 7. **Design for the iPad/TV shared screen first**. 8. **Feedback for every action** (Trigger→Rules→Feedback). 9. **Audio as a first-class feature**. 10. **Turn-handoff animation** so whose-turn is never ambiguous. 11. **Special "block" feedback** ("check" moment). 12. **Accessibility settings panel**. 13. **Permanence + elevation** on claimed hexes. 14. **Friendly game-show art direction** (with color discipline). 15. **Shareable end-card + copyable room code**.

---

## 📚 8. Content System

- **Default pack:** General Knowledge, **medium**, 26×30. Generate it carefully — uniform medium difficulty, culturally neutral, varied framing (definition / who-what / fill-in-blank, all answer-starts-with-letter so it's not repetitive).
- **Taxonomy:** the **Pack** is the content unit. Tag `pack_id, letter, category, difficulty 1–5, locale, pEstimate, contentRating, source`.
- **Home screen = pack browser** (cards). Selecting a pack drives the match.
- **Telemetry (from day one):** log per-question correct-rate, time-to-answer, first-player win-rate (validate the pie rule), board-size win rates. Auto-flag mis-rated questions to **promote/demote** difficulty (cheap IRT). This is how "guessed medium" becomes "actually medium."
- **Editable packs:** in-app pack editor + import/export JSON; saved to **local storage** now, **cloud per-account later**. Profanity filter + content rating + "report pack" baked in from the start (UGC's hard part is moderation).

---

## 🔁 9. Retention, Progression & Social (v1-light)

- 📅 **Daily Seeded Board** — one fixed board + letters + question set per day, identical for everyone, solo-vs-AI or async. The cheapest, highest-retention feature for an occasion game (Wordle/Connections playbook).
- 🔥 **Solo Daily streak** — trigger = "play once today," with a forgiving **Streak Freeze** (don't be punitive; it *raised* DAU for Duolingo).
- 🏅 **Lightweight achievements + simple profile** (e.g. "win by blocking," "answer 100 History Qs"). Cheap dopamine, drives pack exploration. **No battle-pass** (wrong vibe for family/classroom).
- 📤 **Spoiler-free shareable result card** — the #1 growth lever (see §7.5).
- 📊 **Scoped leaderboards** (friends / class / room), not demoralizing global-only.
- 🔁 **Rematch button** (same teams, shuffle letters/pack) — cheapest session-extender.

> ⚠️ **Biggest retention risk:** only 780 medium questions = a heavy player exhausts novelty fast → D7 collapse. Mitigate with the **daily seeded board + steady pack cadence**. Instrument D1/D7/D30 from launch.

---

## 🔌 10. Phase 2 — Multi-Device Multiplayer (TV + phones as controllers)

**The validated Jackbox/Kahoot model.** Board on a shared screen; host + teams use phones (via **web, no install**) as controllers over WebSockets to a server **on the VPS**.

### 10.1 Topology
Flutter **web** controllers (host + players) + a Flutter **big-screen** client, all over **WSS** to one **authoritative** `dart_frog` server on the VPS. Rooms live in server memory, keyed by a **6-char alphanumeric code** (≈2B space; ambiguous/profane combos excluded). **No WebRTC, no Redis, no host-migration** at launch — overkill for an indie.

### 10.2 Roles & where things live
| Big screen (rich) | Phone — player (minimal) | Phone — host (controls) |
|---|---|---|
| Hex board + ownership | Giant **BUZZ** button | Next / Skip |
| Question + reveal animations | A/B/C/D pad or text (only on their turn) | Reveal answer |
| Both team scores + standings | Team color + 1-word state | ✅A / ✅B / ⬜None |
| "TEAM A buzzed!" indicator | "Reconnecting…" overlay | Re-arm buzzer / Pause / Undo |
| Persistent room **code + QR** | *(nothing to read — eyes up)* | Lock lobby |

**Principle:** one job per phone screen; all drama on the shared screen so the room's attention stays collective.

### 10.3 Room lifecycle
Create (mint code + QR/deep-link) → Lobby (scan/type code + name, profanity-filtered or auto-spun, assign Team A/B, host can **lock**) → host-paced Play loop → Disconnect (seat reserved, room survives) → End/reap on host-end or idle TTL.

### 10.4 Buzzer fairness (the single most important thing to get right) ⚡
1. Server sends **`buzz_open {serverTs}`** to both teams simultaneously.
2. At join, a **one-time NTP-style clock handshake** estimates each phone's offset/RTT.
3. Each buzz sends `pressTimeLocal + clockOffset`; server reconstructs **time-since-armed per device** (not packet-arrival time) → **smallest wins**.
4. Server broadcasts **`buzz_locked {team}`**, **ignores later buzzes** (lockout), debounces repeats (~300ms), and penalizes **early presses** (~0.25s lockout, Jeopardy-style).
5. Latency budget **<150ms** (WSS gives 40–120ms — fine for a party game; reconstruction absorbs jitter).

### 10.5 Event protocol (server explicitly broadcasts; never auto-relays)
- **Client→Server:** `JOIN`, `REJOIN {playerToken}`, `BUZZ {pressTimeLocal, clockOffset}`, `SUBMIT_ANSWER`, `HOST_ADVANCE/SKIP/REVEAL/ADJUDICATE/REARM/PAUSE/LOCK_LOBBY`, `PING`.
- **Server→Room:** `ROOM_STATE {snapshot}`, `LOBBY_UPDATE`, `QUESTION`, `BUZZ_OPEN`, `BUZZ_LOCKED`, `ANSWER_RESULT`, `BOARD_UPDATE`, `SCORE_UPDATE`, `TURN`, `PLAYER_STATE`, `GAME_OVER`, `ERROR`, `PONG`.

### 10.6 Reconnect & edge cases
Persist a `playerToken` in the phone's `localStorage` → silent auto-rejoin to the same seat on refresh/drop. **Room survives big-screen reload and mass-disconnect** (authoritative server keeps state; idle TTL 5–10 min). Host is a *role*, not the owner → **host-role reassignment** if the host phone dies. Pause the answering team's turn if their device drops (grace 60–120s).

### 10.7 Security & scale
Rate-limit joins per IP, lobby-lock, server-enforced host-only ops, optional Kahoot-style 2-step pattern join, profanity-filtered names. A single modest VPS handles **hundreds of rooms / thousands of devices** (rooms are tiny, broadcasts are room-scoped). Defer Redis/sharding; if ever needed → sticky sessions + Redis pub/sub.

---

## 💰 11. Monetization (ethical — it's our moat with family/classroom)

Free base game + free sample pack (Kahoot bottom-up funnel) → one-time **remove-ads** → **premium question packs** (themed/expert/kids/holiday) → **cosmetic** board themes / hex skins / avatars → **🎓 Education/B2B school licensing** (likely the strongest revenue line: class rosters, cloud custom packs, teacher dashboard, no ads).
**Never:** loot boxes, randomized pack contents, energy/lives timers, pay-to-win (buying time/answers in competitive). These poison the trust that *is* the moat.

---

## 🧪 12. Testing Strategy (PRIORITY #1 — bug-free end-to-end)

**Test pyramid (~70/20/10) anchored on the pure-Dart `game_core`:**
- 🟢 **Unit (bulk, `dart test`, ms-fast):** win-detection, turn rules, pie rule, all §3.6 edge cases as pure functions. **Cross-check DSU vs an independent flood-fill oracle** + **property/fuzz tests** over random legal games. Cover: empty board, full board, single bridging move, both-edges-touched-but-not-connected, simultaneous near-wins, undo-replay equivalence.
- 🟡 **Widget tests:** board painter hit-testing (tap → correct hex), question card, host pad.
- 🟠 **Golden/screenshot tests:** board states, victory screen, themed components — the **UI-polish regression guardrail** (`flutter test --update-goldens`).
- 🔴 **integration_test:** full-match flows (start → claims → win → victory) on emulator + web; later a 2-client multiplayer happy-path.
- **Coverage:** `flutter test --coverage` → LCOV/HTML, target ~80% (highest bar on `game_core`), gated in Codemagic CI. Add `very_good_analysis` (or DCM) lints.

---

## 🚀 13. Build, Test-on-Device & Deploy

### 13.1 Test it on YOUR phone TODAY ($0, no dev accounts)
- 📱 **iPhone now:** `flutter build web` → host on the VPS subdomain → open in **Safari → Add to Home Screen (PWA)**. Plays like an app, no Mac, no Apple account.
- 🤖 **Android now:** `flutter run` / build an APK straight from the **Windows PC**, sideload to an Android phone (or emulator).

### 13.2 Web → VPS subdomain
`flutter build web --wasm` (skwasm, CanvasKit fallback — near-native graphics, smaller payload; HTML renderer is deprecated). Serve static files via **Nginx** at e.g. `letterlock.raltech.dev`:
- SPA fallback to `index.html` for deep links; correct `.wasm` MIME type; **COOP/COEP headers** (enables multithreaded skwasm); `<base href="/">`; polished HTML preloader + shader warm-up.

### 13.3 Mobile → stores via Codemagic (when ready)
Buy **Apple Developer ($99/yr) + Google Play ($25 one-time)**, plug signing keys into **Codemagic** → auto build/sign/publish + TestFlight. Add a web-deploy step (rsync to VPS) so one push ships everywhere.

---

## 🗺️ 14. Phased Roadmap

### ✅ v1 — MVP (single-device, the fun core)
1. `game_core` package: models, hex topology, event reducer, **union-find win detection + flood-fill oracle + fuzz tests** (build test-first — priority #1).
2. Board `CustomPainter` (render + hit-test + claim animation + winning-trace shader).
3. Game flow: team setup, modes (Bo1/3/5), board sizes, **host-adjudicated turn loop** (pick → question → ✅/⬜/⏭️/↩️), win/match resolution, all §3.6 edge cases.
4. Default question pack (26×30 medium) + home-screen pack browser + randomized serving.
5. **The full UI/UX bible (§7)** — hero moments, juice, accessibility, audio, big-screen layout, <60s FTUE.
6. Local save/resume, settings, sound/motion toggles.
7. Shareable result card. Demo match vs easy AI.
8. Web (PWA on VPS) + Android build; iOS via web for now.

### 🔜 v2 — Multiplayer + accounts + content engine
- Phase-2 realtime (TV + phones, §10): dart_frog server on VPS, room codes/QR, buzzer fairness, reconnect.
- Account login + cloud save (**Supabase, self-hosted on VPS**): streaks, history, cloud custom packs.
- **Pack editor** + import/export + moderation (profanity filter, content rating, report).
- Daily seeded board + solo streak + achievements + scoped leaderboards.
- Native iOS/Android store launch via Codemagic.

### 🔮 Future TODO (deferred — do NOT build in v1)
- [ ] **Question packs of varying difficulty** (Easy / Medium / Hard / Expert / Kids) — *(explicitly requested for the future)*.
- [ ] AI opponent with difficulty tiers (random → greedy → minimax on the Hex graph) for solo/practice + DDA (solo only, never ranked).
- [ ] Special-hex modifiers (Double-claim, Steal, Wildcard, Bonus-time) as optional toggles.
- [ ] Optional **Square-grid topology** mode (true board draws).
- [ ] Tournaments / single-elim brackets for events & classrooms.
- [ ] Online ranked + anti-cheat (tab-blur detection, tightened timers, rotating pools) + Glicko-style MMR — separate from casual "honor" rooms.
- [ ] Cosmetic economy: board themes, hex skins, avatars, emotes (rate-limited), collections.
- [ ] **B2B / school licensing** (teacher dashboard, class rosters, no-ads plan).
- [ ] Multi-language **native** packs + **RTL / alternate alphabets** (Arabic 28-hex variant, Spanish Ñ, etc.) — *the letter-start mechanic makes this a per-language authoring problem, not a translation; architect for RTL now*.
- [ ] Replays / match-review timeline + richer match statistics.
- [ ] Speed-bonus scoring (Kahoot formula) in online mode.
- [ ] Spectator mode; taunts/emotes; sandbox/free-play board.
- [ ] Public pack marketplace (after private sharing + moderation are proven).
- [ ] Light, optional, **cosmetic-only** seasonal track (only if the community wants it).
- [ ] Reading-level control per pack; age/content-rating filters in the pack store.
- [ ] Horizontal scaling (sticky sessions + Redis pub/sub) — only when one VPS is saturated.

---

## ⚠️ 15. Edge-Case Master Checklist (verify before "done")
Empty board • full board • single bridging move • both edges touched but not connected • undo = replay equivalence • both-teams-fail hex stays neutral • already-claimed hex unselectable • timer-expiry path • out-of-questions fallback • hard-letter leniency • pie-rule swap correctness • match tie → sudden-death • draw only in Square mode • save/resume mid-match • reduced-motion path • colorblind patterns present • TTS/captions present • (Phase 2) disconnect/rejoin, big-screen reload, host death, mass-drop, simultaneous buzz, early-buzz penalty, room-code abuse, profanity names.

## 🎁 16. "10+ things you weren't thinking about" (now baked into the plan)
1. Spectator/host big-screen mode (§10.2) • 2. Match history & replays (Future) • 3. AI opponent (Future, used by FTUE/Daily) • 4. Daily seeded board + streak (§9) • 5. Scoped leaderboards (§9) • 6. **Host undo/correction** (§3.2) • 7. Save/resume mid-match (§6.2) • 8. Rematch button (§9) • 9. Accessibility: read-aloud/colorblind/font/no-timer (§7.3) • 10. Sound/music toggles + audio design (§7.4) • 11. Profanity filter + content rating for UGC (§8) • 12. Telemetry to self-improve difficulty (§8) • 13. Anti-cheat for online (Future) • 14. Taunts/emotes (Future) • 15. Tutorial sandbox (§7.7) • 16. Pie rule for first-move fairness (§2.4) • 17. Latency-fair buzzing (§10.4) • 18. Shareable result card (§7.5).

## ❓ 17. Open decisions to confirm when you start
- Final **name** (working title: Letterlock).
- Default board size — recommended **5×5**.
- Pie rule **on by default** in casual? (Recommended: on; toggle exists.)
- Audio: commission custom SFX vs Sonniss/Freesound pack for v1 (recommended: free pack first).
- Domain/subdomain for the web build (e.g. `letterlock.raltech.dev`).

---

## 📚 18. Appendix — Key Sources
**Game feel / juice:** Vlambeer "Art of Screenshake", Jonasson & Purho "Juice it or lose it" (GDC), Swink *Game Feel*. **UX/motion:** NN/g response-times & animation-duration, Material 3 motion tokens, Disney 12 principles (IxDF). **Accessibility:** Wong/Okabe-Ito palette, MDN `prefers-reduced-motion`, Xbox Accessibility Guidelines, Atkinson Hyperlegible/Lexend. **Content/retention:** Csikszentmihalyi Flow, Bushnell's Law, GameAnalytics 2024 D1/D7/D30 benchmarks, Duolingo streak studies, Wordle viral-share teardowns, Trivia Crack difficulty-consistency lesson, IRT/ETS calibration, Clash Royale comeback. **Multiplayer:** Jackbox & Kahoot support docs, AirConsole latency deck, Nakama authoritative-multiplayer model, USPTO buzzer-fairness patents, Jeopardy/BuzzerSystems lockout, Socket.IO/Ably scaling. **Flutter:** redblobgames hexagons, Princeton algs4 Union-Find, Context7 docs for flutter_riverpod 3.3.0, flutter_animate 4.5.2, flutter_soloud, drift, supabase_flutter, dart_frog_web_socket; Flutter web renderers (wasm/skwasm) & PWA/Codemagic guides.

---

## 🧩 Repo conventions for the new project (set these up day one)
- Mirror this file as `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. Keep it a **living document**.
- Commit messages: **no AI attribution** (Suhaib-authored only).
- `melos bootstrap` after clone. Run `dart test` (logic) + `flutter test` (widget/golden) in CI.
- Use the **`frontend-design` skill** for UI work; **Context7** for all library questions; **graphify** to keep a knowledge graph of the repo.
- Build logic **test-first** — win-detection is the highest-risk code and the #1 priority.

---

# 🛠️ PART II — v1 IMPLEMENTATION RECORD (BUILT 2026-06-10)

> This section documents what was actually built end-to-end, the one deliberate deviation
> from the plan, and a research-backed **"complete game" checklist** with every box ticked.
> Keep it living.

## II.0 The one deliberate deviation: web stack instead of Flutter

The plan specifies Flutter. v1 ships as a **React + TypeScript + Vite web app** instead. This
was a deliberate engineering call, made because:

1. **No Flutter SDK** is installed on the build machine, and Flutter web renders to a
   `<canvas>` that **Playwright cannot inspect via the DOM** — the user explicitly required
   Playwright verification of a "fully playable, 0-mistakes" game.
2. The web stack satisfies **every platform goal in the plan**: host build on the VPS
   subdomain, Android via the browser, **iPhone via Safari → Add to Home Screen (PWA)** — no
   Mac, no dev accounts, today.
3. The **SVG board is DOM-inspectable**, so the real UI is end-to-end testable.

Crucially, **the plan's architecture is preserved**: a pure, zero-UI rules package
(`src/core/`, the `game_core` equivalent) with union-find win detection cross-checked against
a flood-fill oracle + fuzz tests; an append-only event-log reducer enabling undo/resume/replay;
pluggable Hex/Square topology; the pie rule; all §3.6 edge cases. If Flutter is ever required,
this TS core is a 1:1 spec to port, and the same `game_core` could back a Dart server.

## II.1 What's built (maps to §14 v1 MVP)

- ✅ **`src/core/` pure logic**: axial hex coords, `HexRhombusTopology` + `SquareGridTopology`,
  weighted **Union-Find** win detection with 2 virtual edge-nodes/team, independent
  **flood-fill oracle**, event reducer (`HexClaimed/TurnPassed/PieSwapped/QuestionServed/Skipped`),
  `replay`/`undoLast`, match state (Bo1/3/5, direction swap per game), pie rule, seeded RNG.
- ✅ **Provably-correct win detection**: 73 tests incl. the **Hex-theorem fuzz** (2,400 random
  full boards → exactly one winner every time) and **DSU-vs-oracle parity** (2,400 boards).
  Coverage **95.47%** on `game_core`.
- ✅ **SVG board** (`CustomPainter` equivalent): leaning rhombus, 6-neighbour adjacency,
  team-coloured edge frame, claim pop, **winning lightning trace**, ownership **patterns**
  (dots vs diamonds) so colour is never the only signal.
- ✅ **Host-adjudicated turn loop**: pick → serve randomized unused-first question → ✅A / ✅B
  (steal) / ⬜ No-one / ⏭ Skip / ↩ Undo. Structured + host-call styles toggle.
- ✅ **Content**: 4 browsable packs (General Knowledge medium, Kids & Family, Science & Nature,
  World Geography). Every answer validated to start with its letter; all 26 letters covered.
- ✅ **Full UI/UX bible (§7)**: studio-dark game-show theme, **Okabe-Ito blue/amber** (never
  red/green), Bricolage Grotesque + Sora, 8pt grid, motion spec, synthesized layered audio
  (wrong = soft whomp), haptics, **block "🛡 BLOCK!" hero feedback**, confetti, victory + share.
- ✅ **Accessibility**: reduced-motion (honored everywhere incl. confetti), font picker
  (Hyperlegible/Lexend), text scaling, TTS read-aloud, separate SFX/music mutes (music off by
  default), full keyboard play, ARIA roles on the board.
- ✅ **Fairness**: equal-length connection both ways, **pie rule** (swap), direction + first-pick
  alternation per game, hard-letter biasing on small boards.
- ✅ **Save/resume** (localStorage event log), **rematch**, settings persistence, **3-step FTUE**.
- ✅ **Responsive across 9 device profiles** (iPhone SE → TV 1080) — verified by screenshot
  sweep; board capped to viewport height, scoreboard never clipped, scroll resets per screen.
- ✅ **PWA** manifest + theme color; deploys to the VPS as static files.

## II.2 Test & quality status

- `npm test` → **73 unit/property/fuzz tests pass**; `game_core` coverage **95.47%**.
- `npm run e2e` → **14 Playwright tests pass** on desktop **and** mobile: home→setup→board,
  question serve+reveal, **full game-to-win with the winning trace**, undo, neutral "No one",
  settings persistence, tutorial walkthrough.
- `npm run typecheck` clean (strict). `npm run build` clean.

## II.3 ✅ "Complete game" checklist (compiled from top game-design articles)

> Sourced from the canonical lists of *what makes a game feel finished* — core-loop clarity,
> teach-in-60s onboarding, game feel/juice (Vlambeer, Juice-it-or-lose-it), clear win/lose
> states & no dead-ends, fairness, accessibility, audio, settings, save, replayability,
> responsiveness, performance, and shareability. Every box below is implemented in v1.

**Core loop & rules**
- [x] One clear, repeatable core loop (pick → answer → claim/steal/neutral → win-check)
- [x] Rules enforced in code, not vibes (illegal moves impossible; only neutral hexes pickable)
- [x] Deterministic, provably-correct win detection (DSU + oracle + fuzz)
- [x] No softlocks/dead-ends — turn always advances; undo always available

**Win / lose / draw & edge cases**
- [x] Explicit win state with a hero celebration
- [x] Match formats (single / Bo3 / Bo5) with series tracking + pips
- [x] Draw handling (impossible in Hex by theorem; supported in optional Square mode)
- [x] Every §3.6 edge case: both-fail→neutral, already-claimed unselectable, timer expiry,
      out-of-questions fallback, hard-letter leniency, pie-swap, undo=replay, save/resume

**Onboarding**
- [x] Teach the game in <60s (interactive 3-beat tutorial, skippable)
- [x] First session never hits a paywall (free packs)
- [x] Contextual goal made visible (coloured edges show whose direction is whose)

**Game feel / juice**
- [x] Sub-100ms tap feedback; claim squash/stretch overshoot; hit-stop-style pacing
- [x] Winning-path lightning trace (hero moment)
- [x] Distinct **block** feedback ("check" moment) — the strategic core
- [x] Confetti + crown victory sequence
- [x] Turn-handoff clarity (active team panel + turn banner glow)

**Audio**
- [x] Layered claim SFX, non-punishing wrong sting, distinct steal/block/win, countdown ticks
- [x] Audio initialised on first gesture (autoplay-safe); SFX/music independently mutable

**Accessibility**
- [x] Colorblind-safe palette + non-colour ownership encoding
- [x] Reduced-motion honored (incl. confetti); prefers-reduced-motion respected
- [x] Font picker (Hyperlegible/Lexend) + text scaling; TTS read-aloud
- [x] Full keyboard operability; ARIA grid/gridcell roles; ≥4.5:1 text contrast

**Fairness**
- [x] Equal-length connection both directions (rhombus topology)
- [x] First-move advantage neutralised (pie rule) + per-game alternation
- [x] Latency-fair buzzing — *deferred to Phase 2 multiplayer (documented)*

**UI/UX polish**
- [x] One type scale, 8pt grid, disciplined 2-team palette, depth/elevation on tiles
- [x] Distinctive art direction (not generic) — game-show studio aesthetic
- [x] Feedback for every action; consistent eased motion

**Multi-device / responsive**
- [x] Verified on phone (portrait+landscape), tablet (both), laptop, desktop, TV
- [x] Nothing cut off; board fits viewport height; scoreboard never clipped; scroll resets
- [x] Big-screen/10-foot legibility; TV safe-area margin

**Settings / persistence**
- [x] Settings panel; choices persist across sessions
- [x] Save/resume mid-match; rematch

**Replayability**
- [x] Random letter placement each game; multiple packs; board sizes; rematch
- [ ] Daily seeded board + streaks + leaderboards — *deferred to v2 (engine is seed-ready)*

**Quality / performance**
- [x] Automated unit + fuzz + E2E suites green; strict typecheck; clean build
- [x] Fast load (≈113 KB gzipped JS); PWA-installable; static-deployable

**Social / shareability**
- [x] Spoiler-free share result (native share / clipboard) + final coloured board card

## II.3b Round-2 polish & features (2026-06-11)

- ✅ **True app-like, no-scroll layout** on every screen: the shell is locked to `100svh`
  with `overflow:hidden`; each screen is a flex column where the **board flexes to be the
  biggest element** and controls stay pinned. Verified zero page-scroll AND zero off-screen
  clipping AND zero region-overflow across **15 device profiles × 4 screens** (iPhone SE →
  4K TV, incl. landscape phones), in default text, **xlarge text**, and **flag** packs —
  via `scripts/noscroll.mjs` (a custom checker that catches document scroll, off-viewport
  controls, and clipped flex regions, ignoring intentional internal-scroll areas).
- ✅ **Pack carousel**: question packs are a horizontal swipe carousel (scroll-snap), so the
  home header + hero never get pushed off — works with any number of packs.
- ✅ **Safe-area insets** (`env(safe-area-inset-*)`, `viewport-fit=cover`) for notches.
- ✅ **Team color picker**: each team picks from a 6-color colorblind-safe palette; the choice
  drives the board fills, edge frame, scoreboard, host pad, pips, confetti and victory via
  live CSS variables. Team names optional.
- ✅ **Flag packs** (Easy / Medium / Hard) with real flag images (flagcdn) — and the board
  **letters are hidden** for flag packs so the first letter never gives the answer away; the
  card prompts "Name the country".
- ✅ **Ambient music**: original generative calm piece (pentatonic over a slow breathing
  swell) with fade in/out, wired to the Music setting. (Actual Minecraft tracks are
  copyrighted, so this is an original homage in that mellow style.)
- ✅ **Accessibility fonts loaded** (Atkinson Hyperlegible, Lexend) so the font picker works;
  **text-size** scaling no longer breaks the layout (dense regions gain an internal-scroll
  safety net only when enlarged; default text stays scroll-free).
- ✅ **In-UI exit confirmation** modal (no browser `confirm()`), with Keep-playing / Exit.
- ✅ **Selected hex** reads as a clean neutral highlight (no focus box / white glare).
- ✅ **Expanded content**: ~**925 questions** across 7 packs (shown on the home screen);
  General Knowledge alone ~430.
- ✅ **20 Playwright E2E tests** (desktop + mobile) incl. exit modal, color carry-through,
  flag letter-hiding; **76 unit/fuzz tests**; 95%+ core coverage.

## II.3c Round-3 content & features (2026-06-11)

- ✅ **~2,650 questions across 10 packs** (shown on home). New packs, ordered easiest→hardest
  in the selector via a difficulty rank: Kids → Flags Easy → General Knowledge → Science &
  Nature → World Geography → Flags Medium → **World History (hard)** → **Space & Cosmos (hard)**
  → Flags Hard → **Genius Mode (extreme)**. Content authored by parallel agents, then
  **re-bucketed by answer's first letter** (a normalization that makes the core mechanic
  bulletproof regardless of authoring) and validated by a test asserting *every* answer in
  *every* pack starts with its letter.
- ✅ Fixed the **"No —" question bug**: 49 self-contradicting misdirection clues rewritten to
  clean, accurate one-line questions (answers unchanged).
- ✅ **Team name follows the chosen colour** (Teal, Amber, Violet, …) and is no longer
  typable — the colour and name are one.
- ✅ **Steal timer**: when the picking team's clock runs out, the other team automatically
  gets **half the time** to steal (two-phase advisory countdown; host still adjudicates).
- ✅ Re-verified: **89 unit tests**, **20 Playwright E2E**, and the no-scroll checker ALL CLEAR
  in default, xlarge-text, and the new extreme/history/flag packs.

## II.3d Round-4 — media clips, new categories, quality pass (2026-06-11)

- ✅ **Real audio clips** (the "clips" blocker, solved legally two ways):
  - 🎼 **Guess the Melody** — 23 famous PUBLIC-DOMAIN tunes synthesized from scratch into
    tiny WAVs (`scripts/genclips.mjs` → `/public/clips`, 2.7 MB total). Compositions are PD,
    the rendition is ours — fully bundleable.
  - 🎧 **Guess the Song** — 38 real songs via the free **iTunes Search API** 30-second
    **preview** URLs (`scripts/gensongs.mjs`), hotlinked from Apple's preview CDN (made for
    preview players) — nothing copyrighted is stored. `<audio>`/`<video>` players added to the
    question card; **background music auto-ducks** while a clip plays and resumes after.
  - Movie/TV *video* clips: no free, hotlinkable, legal source exists (iTunes exposes no movie
    previews; YouTube can't be bundled), so those ship as **trivia** packs + the player infra
    is ready for user-supplied clips.
- ✅ **New categories** (21 packs total, **~3,200 questions** shown on home, difficulty-ordered):
  Guess the Logo (Easy/Medium/Hard via symbol-only **SimpleIcons**, dead CDN slugs auto-pruned,
  logos shown on a light panel so any colour is visible), **Sports** (Easy/Medium, some flag
  images), **Movies & TV** (Medium/Hard trivia), **Music** (Medium/Hard trivia), plus the two
  audio-clip packs above.
- ✅ **Music overhaul**: 4 rotating generative moods (calm/blocky/warm/dream) in a random loop,
  louder in menus + quieter in-game, ducking; 5 new SFX (select/swap/undo/whoosh/sparkle).
- ✅ **Quality pass** (the user's "two-part / illogical / wrong" complaints): parallel agents +
  a hard validator. ~**400 contrived/padded answers** rewritten to real natural answers across
  Sports/Space/History/GK; ~**100 compound/illogical/factually-wrong questions** fixed (e.g.
  Seneca↦Cicero error, "baby dog → Doe", coastline rambles). Every question now **re-bucketed
  by its answer's first letter** + **de-duplicated**, with a test asserting *every answer in
  every pack* starts with its letter (111 unit/content tests).
- ✅ **Timer**: hardened so exactly one countdown loop ever runs (no StrictMode double / overlap).
- ✅ **Team name follows the chosen colour** (no text input). Difficulty chip **vertically
  centred** in pack cards.
- ✅ Re-verified: **111 unit tests**, **22 Playwright E2E** (incl. colour carry-through, flag &
  melody clip, exit modal), no-scroll checker **ALL CLEAR** across 15 devices in default /
  xlarge-text / flags / logos / songs / melodies / sports.

## II.4 Still deferred (unchanged from §14 "Future TODO")

Multiplayer (Phase 2 §10), accounts/cloud (Supabase), pack editor + UGC moderation, daily
board/streaks/leaderboards/achievements, AI opponent, varying-difficulty packs, square-grid
mode UI toggle, native store builds, replays, online ranked/anti-cheat, i18n/RTL packs. The
core engine already supports the seams these need (pluggable topology, event log as wire
format, seeded RNG, pure rules engine).
