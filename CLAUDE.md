# 🧪 TESTING MANDATE (read first — the user's standing instruction)

> **Every feature must be tested fully end-to-end with Playwright before it's
> called done.** For any change or feature list: drive the real app with Playwright
> (the device-matrix `noscroll` checker + the e2e suite + live MCP-browser runs,
> incl. two-page host+player for online), **identify the issues, fix them ALL, then
> re-verify — and keep fixing-and-re-testing in a loop until everything passes.**
> Don't report something as working on inspection alone; prove it by exercising the
> actual UI. Online/multi-device features get a two-client test; signed-in features
> get a real login via a TEMP email (mailinator) — **never** the user's work email.
> Also always show the full status table (see below) on every reply.

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

## 📊 Working convention: always report a status table

> **Show the FULL status board every single time the user gives a command or
> task — no exceptions** — and also constantly/regularly as work progresses, not
> just at the end. Render the COMPLETE current task list (every active/pending
> item, not a subset) as a Markdown table with: an emoji status (✅ done / 🔄
> in-progress / ⏳ pending / 🚫 blocked), the task, and a **% completion**. Keep it
> tight. The user must always see where everything stands. (Recorded twice at the
> user's explicit request — this is mandatory in every session.)

## 📚 Content authoring: see `CONTENT_QUEUE.md`

Pack authoring has its own living doc, **`CONTENT_QUEUE.md`**: the pipeline (Opus authors,
the agent self-verifies with `scripts/checkpack.mjs`, a separate Sonnet agent fact-audits a
sample, then register, verify, push), the full script list, the copy-paste authoring spec,
the remaining queue, and the running pack/question counters. **Read it before authoring any
pack, and update its counters every wave.** It also records the finding that cost a million
tokens: content authored by a cheap model passed every scriptable gate and was 60-100%
factually wrong, so all ten of those packs were deleted. Never author content with a cheap
model.

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

## II.3e Round-5 — answer-logic bug, timer smoothness (2026-06-11)

- ✅ **Clue-restatement / sentence-answer bug** (e.g. board letter "U", answer stored as
  "Ukraine's capital is Kyiv"): audited **every** answer in **every** pack via the loaded pack
  data (quote-safe), found the class already largely fixed in round-4 plus two stragglers
  ("Afrika Niger"→"Niger", "Old Heraclitus"→"Heraclitus"); now **0** remain. Added a permanent
  **guard test** that fails the build if any answer restates its clue ("capital is", possessive
  "…'s … is …", "the country whose…", etc.) — so it can never regress (132 unit/content tests).
- ✅ **Timer smoothness**: removed the CSS `transition` on the fill bar that was fighting the
  per-frame rAF updates (caused the stutter / "doesn't sweep cleanly"). Verified via Playwright
  that the bar depletes monotonically and exactly one timer is ever present.

## II.3f Round-6 — swap UX, host controls, no-repeat, charades, content to 200+ (2026-06-12)

- ✅ **Pie-rule "swap sides" is now an OVERLAY popup** (`.pie-pop`, `position:absolute`) with an
  ✕ to dismiss — it no longer reflows/shrinks the board (was crushing the hex to ~166px on
  mobile; now stays full-size). Swapping leaves the game on-screen (the reported "blank screen"
  could not be reproduced and is moot now the prompt never consumes layout).
- ✅ **One skip per pick**, and the **timer no longer resets on skip** — the `Timer` `resetKey`
  is now `selectedCell-pulse` (stable across a skip, changes on a new pick), so the countdown
  *continues*. Skip button disables after one use.
- ✅ **Manual switch-turn** (`SWITCH_TURN` → a `TurnPassed`) in the turn banner — host
  intervention, fully undoable.
- ✅ **Full undo audit** — 6 new unit cases (serve-only, claim, skip-sequence, pie-swap,
  manual switch, repeated-undo-to-start) on top of the existing replay-equivalence tests.
- ✅ **No-repeat question cycle** (`src/state/progress.ts`): questions don't repeat until the
  whole pack is exhausted, then a fresh cycle starts; **Home shows "↻ N unique left" per pack**;
  a **"↻ Repeat" badge** appears when a forced repeat is served. Persisted in localStorage.
- ✅ **Letterless packs serve from the WHOLE pack** (tiles not pinned to a letter) — flags,
  logos, songs, melodies, charades.
- ✅ **Charades** (5 packs → all 200+: easy, animals, Movies & TV, actions, hard): the card
  shows a **QR** to a standalone **`/?view=img` secret-prompt page** (`ImgView`) that renders the
  thing's **image + name** privately for the acting player. Images auto-attached via loremflickr.
- ✅ **Content expansion to 200+**: Movies & TV (227) + Hard (208), Music (214) + Hard (216),
  Sports easy (217) + medium (226), World Geography (242). New **regional packs**: Bahrain,
  Saudi Arabia, UAE, Gulf Culture & Geography.
- ✅ **Music**: replaced random-note generative ambience with **original composed looping
  melodies + a bass progression** (4 moods) — real tunes in a mellow vibe, copyright-free.
- ✅ **`QUESTION_AUTHORING.md`** (authoring rules) + **`DEFERRED.md`** (blocked work + how to
  unblock) added.
- 🚩 **Deferred (see `DEFERRED.md`)**: accounts/login/OTP/Google-SSO + global leaderboard
  (no Resend key in ral-workspace, no Supabase/OAuth creds — needs the user to provide them);
  real movie/TV video clips (no free legal source); real licensed/Minecraft music (copyright);
  logos/flags/melodies/songs packs stay under 200 (source-capped).

## II.3g Round-7 — movie trailers, exit/timer polish, iPhone layout (2026-06-12)

- ✅ **🎬 "Guess the Movie (Trailer)" pack SHIPS** (the long-standing "movie clips" ask, finally
  unblocked WITHOUT a TMDB key). `src/content/movieClips.ts` (id `movies-clips`, letterless)
  embeds **64 real official trailers** via the existing `youtube` field →
  `youtube-nocookie.com/embed/<id>`. Built by `scripts/genmovies.mjs`: a curated
  `[title, year, youtubeId]` list, each id **verified at build time against the real video title
  via YouTube's keyless oEmbed** — only ids whose title matches the movie AND is a trailer are
  kept (10/74 candidates auto-dropped as dead). A wrong/dead id can never ship. Guarded by an
  e2e test. To expand: add rows to the script + re-run.
- ✅ **Exit-modal "Keep playing"**: the `‹` arrow is now pinned at the button's LEFT edge on its
  own (absolute), with the label centred — was glued to the text (`.exit-keep` + `.exit-keep-arrow`).
- ✅ **Steal-phase timer fix** (user: "looks weird when it gets towards the second team
  stealing"): (a) the `urgent` pulse no longer blinks for the WHOLE steal phase — it pulses only
  in the last 5s of either phase; the steal phase is signalled by amber colour + a `⚡ {team}
  steals` label + a gently-flashing bolt. (b) The steal label no longer truncates to "⚡ Amber
  st…" (`.timer.steal .timer-label { max-width: 18ch }`). (c) The bar refills to full instantly
  on phase change (`setRemaining(seconds/2)`) so there's no empty-frame flicker; rAF still drives
  depletion (no CSS transition fighting it).
- ✅ **iPhone portrait + landscape re-verified** (390×844, 375×667, 844×390, 667×375): question
  text, revealed answer, and host pad all fully on-screen, board the biggest element, zero
  document scroll. New `scripts/verify_fixes.mjs` captures all four fixes before/after.
- ✅ **218 unit/content tests, 34 Playwright e2e**, noscroll ALL CLEAR (default + `movies-clips`).

## II.3h Round-8 — category menu, movie+TV clip tiers, media robustness, desktop gap (2026-06-12)

- ✅ **Searchable category menu** (`CategoryMenu.tsx`): Home's pack carousel is replaced by a
  single **Category** button that opens a full-screen, scrollable, **searchable** browser. Packs
  are organised into 8 groups (Trivia & Knowledge, Movies & TV, Music, Flags, Logos & Brands,
  Sports, Charades, Regional — `groupOf(id)` + `PACK_GROUPS` in `content/index.ts`), filterable by
  search box + group chips, difficulty-tinted cards. Selecting a pack closes the menu. Cards keep
  `data-testid="pack-<id>"` so tests work via a `selectPack()` helper (opens menu → click).
- ✅ **Movie clips → 3 tiers + NEW TV clips → 3 tiers** (`scripts/genmovies.mjs`):
  - 🎬 **Movie Clips Easy/Medium/Hard** = official YouTube trailers (33/35/26), each id verified
    via YouTube oEmbed. Embedded through the **IFrame Player API** (`YouTubeEmbed.tsx`) so an
    unplayable/non-embeddable trailer is caught (onError 100/101/150 / load-timeout) → clean
    fallback + "Watch on YouTube" + Skip.
  - 📺 **TV Show Clips Easy/Medium/Hard** = REAL iTunes episode **preview clips** (38/40/33;
    `entity=tvEpisode` → hotlinked `.m4v`), matched by show name — "guess the show from real
    footage". The creative fix for the no-API-key blocker (iTunes is the source of truth; no
    guessed ids). **~207 clip questions total.**
- ✅ **Media robustness** (`scripts/checkmedia.mjs`): every clip/audio/flag URL verified reachable
  — **0 dead** across flags (39/55/81), movie trailers, TV clips, melodies (23), songs (222).
  Every media element (`image/audio/video/youtube`) has an `onError` → and now **AUTO-ADVANCES to
  another question on its own** (`AUTO_SKIP` action; no manual skip needed, doesn't spend the host's
  skip), capped at 12/pick so a fully-broken pack can't loop (then it shows the manual Retry/skip
  card). **Skip is also always enabled on a clip question** (`hasClip`) as a backstop.
  Charade keyword-images (loremflickr, flaky on abstract nouns) now hide gracefully on error (the
  WORD always shows) on both the card and the `/img` secret-prompt page.
- ✅ **Desktop host-pad gap fixed**: the Blue/Amber/No-one/Undo pad sat ~260px below the question
  on desktop (`.question-zone` stretched the column). Now the timer+card+pad group sizes to content
  and centres (`flex: 0 1 auto`) → gap **260px → 13px** desktop, 10px laptop, 42px landscape.
- ✅ **Anti-spoiler trailers** (round-8b): YouTube embeds revealed the answer via the title bar,
  thumbnail poster, and end-screen. `YouTubeEmbed.tsx` now hides all of it — a Play cover masks the
  poster/title until tapped, a top strip masks the title bar (flashes on start/hover/pause),
  `fs/disablekb/iv_load_policy/rel` are locked down, and the trailer **re-covers on end** (Replay)
  so end-screen titles never show. Guarded by an e2e assertion (`qcard-yt-play` cover present).
- ✅ **238 unit/content tests, 36 Playwright e2e**, noscroll ALL CLEAR (default + movie + TV packs).
  The ≥16-letters playability rule is relaxed for letterless packs (clips/flags serve from the
  whole pool regardless of letter) → `totalQuestions ≥ 16` instead.

## II.3i Round-8c — YouTube removed, TV clips + safe fullscreen, timer-on-play, mobile keyboard, TECH.md (2026-06-12)

- ✅ **YouTube removed entirely** (`YouTubeEmbed.tsx` deleted; movie-clip packs dropped). A YouTube
  iframe always leaks the answer (title bar, thumbnail, end-screen, click-through to youtube.com)
  and **can't be made spoiler-safe in fullscreen** — and the user requires fullscreen. iTunes' movie
  API is dead, so there's no fullscreen-safe movie-*video* source; movie **content lives in the
  Movies & TV trivia packs**. (Reverses the round-8/8b YouTube work by design.)
- ✅ **TV Show Clips kept + expanded to ~221** (easy/med/hard) via iTunes `entity=tvEpisode`
  previews, played in the native **`<video controls>`** → **safe fullscreen** (real footage, no
  title overlay). `scripts/genmovies.mjs` is now TV-only with much bigger show lists.
- ✅ **Answer timer starts on the clip's FIRST play** (audio/video) — `onMediaPlay` → `timerActive`
  in `Game.tsx`; reset per question. So watching/listening isn't on the clock. Images start at once.
- ✅ **Fullscreen always allowed** — native media controls (no `controlslist` restriction);
  verified `fullscreenEnabled` on mobile.
- ✅ **Mobile category search no longer auto-pops the keyboard** — `autoFocus` only on
  `(pointer: fine)` (desktop); touch devices focus only when the field is tapped.
- ✅ **New `TECH.md`** — the canonical "everything" doc: every technology, decision, external media
  source (+ how fetched/verified/legality), layout/UX decisions, and a change-log index. Linked
  from `AGENTS.md`. `QUESTION_AUTHORING.md` gained a **media-clip rules** section (no-spoiler source,
  native player, onError→auto-advance, timer-on-play, generic prompt).
- ✅ **226 unit/content tests, 36 Playwright e2e** (incl. timer-holds-until-play + auto-advance +
  tv-clips + category menu), noscroll ALL CLEAR. Mobile verified: search no-autofocus + video
  fullscreen-enabled + readyState 4.

## II.3j Round-9 — every pack 200+ except flags (2026-06-12)

- ✅ **Regional packs authored to 200+**: Bahrain 259, Saudi 229, UAE 228, Gulf 233 (round-9
  `bahrainExtra.ts` / `saudiExtra2.ts` / `uaeExtra2.ts` / `gulfExtra2.ts`, written by 4 parallel
  agents). Accuracy-first (well-established facts only); then a leak-fix agent pass + a manual fix
  cleared all answer-in-question leaks. Content tests green.
- ✅ **Guess the Melody → 235**: kept the synthesized PD WAVs (~23) and added ~214 **real iTunes
  preview clips of famous instrumental themes** (film/TV/game scores + classical) via
  `scripts/genmelodies_itunes.mjs` → `melodiesExtra.ts`. Each preview is confirmed (loose token
  match) to be the right piece; `checkmedia` → 235/235 reachable.
- ✅ **TV Show Clips → one 204-question pack**: the 3 difficulty tiers were merged (iTunes has no
  200+ *recognisable* shows per tier, so per-tier 200 was impossible without obscure padding —
  which violates accuracy). `groupOf('tv-clips')` keeps it in Movies & TV.
- ✅ **Result: 31 packs, ~7,367 questions; the ONLY packs under 200 are the three World Flags
  packs** (the user's stated exception — ~195 countries exist). `checkmedia` 0 dead across
  melodies/tv-clips/songs. **218 unit tests, 36 e2e**, noscroll ALL CLEAR.

## II.3k Round-10 — leaderboard v2, category locking, level-up, mode-select fix (2026-06-23)

- ✅ **Leaderboard v2** (`Leaderboard.tsx`, **fullscreen on mobile**): two tabs — **🏁 Match
  scores** and **⭐ Ranks (XP)**. The broken native `<select>` is replaced by a custom
  pop-over dropdown (`lb-pack-menu`, dark-safe, works on mobile + casting). Match scores are
  **deduped** (one row per player = their BEST score) and **CoD-style paginated** (25/page,
  podium on page 1, `« ‹ Page n/N › »`) via the new `pack_leaderboard` RPC. Ranks tab lists
  players by **lifetime XP** (`global_ranks`) with the signed-in player **self-highlighted**
  (`is-me` + "YOU" badge) and a **pinned "you" row** (`my_global_rank`) when they're outside
  the top list. Rank badges show **tier icons** (🥉🥈🥇💠💎🔱👑) + a **prestige border band**.
- ✅ **Category locking properly enforced + shown** (`CategoryMenu.tsx`): packs gate by unlock
  level. A locked card is **dimmed + disabled** with a 🔒 overlay and an **"🔒 Unlocks at Lv N"**
  chip; locked difficulty tiers show 🔒 on the tier button. Verified live as a guest — World
  History's Hard tier locks, Genius Mode (Extreme) shows "🔒 Unlocks At Lv 8".
- ✅ **Level-up celebration** (`LevelUpOverlay.tsx`): full-screen confetti + tier-glow card on
  level-up / prestige, fired on the host (`Game.tsx`) **and on players' phones**
  (`PlayerController.tsx`); XP awarded on wins. **Home** shows a rank + XP progress bar
  (`RankBar`) for signed-in players.
- ✅ **Mode-select "Pick how you play" cutoff fixed** (`lobby.css`): the card descriptions were
  clipped by `overflow:hidden` + a fixed-height grid row. Fix: `.mode-card { overflow: visible }`
  (with `::before { border-radius: inherit }` to keep the gradient rounded) + grid
  `align-items: start` so each card **grows to fit its content** instead of being stretched to a
  short track; a narrow-portrait compact rule drops the forced `min-height`. Verified on 375px:
  `clipped:false`, `descBelowBorder:false` for every card.
- ✅ **DB: migration 0008** (`0008_global_ranks.sql`) — `global_ranks(p_limit)`,
  `my_global_rank()` (tie-break total_xp desc, created_at asc), `pack_leaderboard(p_pack,
  p_limit, p_offset)` (distinct-on best score + count over() for paging), granted anon+auth.
  Deployed green; both leaderboard tabs verified **live** with real data on `letterlock.raltech.dev`.
- ✅ Re-verified: **346 unit/content tests**, **98 Playwright e2e** (desktop+mobile),
  **noscroll ALL CLEAR** (17 devices × every screen incl. leaderboard + mode-select), strict
  typecheck + build clean. CI green (run 28015307305), live bundle hash matches local build.

## II.3l Round-11 — username change policy (2026-06-23)

- ✅ **Username changes limited to once a month** + hardened uniqueness/validation
  (`0009_username_change_limit.sql`). Usernames were already unique + lowercase +
  format-checked (3–20 `[a-z0-9_]`) since 0001; this adds:
  - **`change_username(p_name)` RPC** (SECURITY DEFINER) — validates format, blocks
    **reserved names** (admin/system/root/moderator/…), enforces a **30-day cooldown**
    (the first change after claiming is free), checks case-insensitive uniqueness, and
    returns a **structured result** `(ok, error, next_allowed_at)` so the UI shows
    "you can change again on <date>" instead of a raw SQL error.
  - **BEFORE INSERT/UPDATE trigger backstop** (`enforce_username_change_limit`) so the
    cooldown + reserved rules hold even against a direct table update (users have an
    UPDATE policy on their own row). New `profiles.username_changed_at` column tracks it.
  - **Client** (`AuthModal.tsx`): the edit path calls the RPC (not a raw update); shows
    the cooldown date, **dims the Edit button + a 🔒 lock notice** while in cooldown,
    and rejects reserved names instantly on both claim + edit.
- ✅ Verified **live** on the deployed Supabase: `is_reserved_username('admin')`→true,
  `('honeybadger42')`→false, `username_change_interval()`→"30 days", `change_username`
  (no auth)→`{ok:false, error:"not_signed_in"}`. **346 unit + 98 e2e** pass, typecheck +
  build clean, CI green (run 28020489903), live bundle matches local build.
- ➕ Dev seam: `?__leveluptest=level&lvl=N` / `=prestige&prestige=P` previews any tier's
  level-up celebration art (used to capture all 7 tiers + prestige). Inert in normal use.

## II.3m Round-12 — online sync hardening, account resume, anti-abuse, security gating (2026-06-24)

A large multi-request batch (all deployed + CI-green on `letterlock.raltech.dev`):

- ✅ **Account-linked resume** (`0010_saved_games.sql`, `state/savedGame.ts`): the
  in-progress match is saved to the signed-in account (Supabase, RLS, one row/user)
  so you can leave and resume on any device; guests keep a local save. Per-identity
  local cache key prevents one user's game leaking to another on a shared browser.
- ✅ **Username change policy** (Round-11, `0009`): once-a-month limit + reserved
  names + case-insensitive uniqueness via `change_username` RPC + trigger backstop.
- ✅ **OTP anti-spam** (`0011_otp_rate_limit.sql`): ≤3 sends per email AND per IP per
  5 min, enforced in the send-otp edge function via a service-role-only RPC.
- ✅ **Friends notifications on Home**: pending-request badge on the Friends button
  (surfaces requests that arrived while away); modal opens on Requests when pending.
- ✅ **Leaderboard fullscreen on every device** (centered max-width column on desktop).
- ✅ **Mode-select**: the 3 "Pick how you play" cards are identical size on all
  devices (equal-height grid + uniform copy, no clipped text).
- ✅ **Room code fits its container**: rendered as a 6-col grid that always spans the
  card width (no overflow / no wrap); QR capped to its card; lobby fits one phone
  screen with no internal scroll (shrunk QR + tightened paddings).
- ✅ **Online sync hardening** (`lib/lobby.ts`, `useOnlineHost.ts`, `PlayerController.tsx`,
  `LobbyHost.tsx`) — live-verified two-device:
  - **Start game auto-launches players**: host re-broadcasts `match_started` on
    (re)connect and any live game event lifts a phone out of the lobby.
  - **Synced timers**: host broadcasts an absolute deadline + its clock reading;
    phones measure the clock offset and count down to the same instant; reconnect
    resumes mid-countdown (stored deadline re-sent) instead of restarting full.
  - **Team-colour reassignment**: colours + names ride atomically with
    `team_assigned`, and presence no longer reverts an explicit assignment (fixes
    the stale/flicker colour on rapid blue↔amber changes).
  - **Auto username on join**: a signed-in phone uses its account username
    (controller wrapped in AuthProvider); guests still type one.
  - **Player exit anytime + Back-to-home** on game over.
  - **Host is not a player**: host screen earns no XP in online mode; players earn
    XP on their own phones, **per game** (`game_won`) in a best-of-N (`game_over` =
    match end → result screen).
- ✅ **Security audit + URL-tamper hardening** (`lib/devSeams.ts`): a full audit
  confirmed all privileged paths are server-enforced — every `admin_*` RPC checks
  `is_admin()`; `award_xp` clamps [0,200] + derives `auth.uid()`; `submit_score`
  derives username + bounds values; RLS on profiles/leaderboard/friendships/
  saved_games/question_progress/custom_packs blocks cross-user access; `?view=controller`
  only ever renders the controller; a malicious player can't forge host events that
  trigger server actions (scores/XP are submitted by each player's own RPC). The
  one client-side gap — dev/cheat seams usable via URL — is closed: `__unlockall`,
  `__devscreens`, `__leveluptest`, `__onlinepanel`, `__crashtest` now work ONLY on
  local dev/test hosts and are inert in production. (Deferred, low-risk: a client can
  still POST a leaderboard score for a not-yet-unlocked category — harmless since the
  board is social and XP is awarded by game logic, not by submission. Add a
  server-side eligibility check in `submit_score` only if a gate ever depends on it.)
- ✅ Re-verified each push: typecheck + build clean, **100 Playwright e2e**, **noscroll
  ALL CLEAR** (17 devices), CI green, live bundle matches; online cluster live-verified
  with a real two-device (host + player) session.

## II.3n Round-13 — answer-flow redesign + connection-resilience hardening (2026-06-25)

- ✅ **Online answer loop redesigned** (per the user): BOTH teams answer the same
  question (no picker-first/steal lockout, one player per team); the host sees each
  submission auto-graded ✓/✕ vs the real answer, reveals it to everyone, then taps
  the winning team to award + continue. Removed the auto 3-2-1 countdown auto-award.
- ✅ **One answer per player per question**: the answered cell is persisted, so a
  refresh / reconnect mid-question comes back LOCKED ("answer sent") — no double
  submit. Cleared on each `game_won` (NOT on `match_started`, which is re-broadcast
  on every reconnect — clearing there wrongly unlocked; caught by the matrix).
- ✅ **First-time username** always prompts (Google or email), at most once per
  session (no re-pop after a game); **QR sign-in returns to the room** (OAuth
  redirect preserves ?room=&view=controller); **category Hard→Medium switch** fixed;
  example name placeholders neutralised.
- ✅ **Connection-resilience matrix** (`tests-e2e/reconnect-matrix.spec.ts`, 7
  two-client scenarios, all green): refresh in lobby / after start / mid-question
  (unanswered → can answer) / after answering (stays locked) / **offline→online
  mid-question recovers with no reload** / late-join receives the live question /
  team assignment survives refresh.
- ✅ **Deep-research audit (20 findings)**: fixed the real bug (answer-lock leaking
  across series games); verified several "criticals" were non-issues (packById
  falls back to default — no crash; only the host submits scores — no double-submit;
  board_state auto-advances if match_started is missed). **Known limitation:** a
  HOST refresh loses the live match (no host-side match persistence) — deferred.
- 🧪 Playwright now retries once locally too (CI already retries twice) — the
  two-client realtime reconnect tests are inherently timing-sensitive and can flake
  under heavy local parallelism; a genuinely broken test still fails both attempts.
- ✅ Re-verified: typecheck + build clean, **346 unit**, full e2e green (+ reconnect
  matrix), **noscroll ALL CLEAR** (17 devices).

## II.3r Round-20: 21 more Opus-authored packs, and the topic-width finding (2026-08-27)

- ✅ **21 new packs, every one 210+ questions, 0 answer leaks, 0 misfiled letters.**
  English (15): Dinosaurs, Ocean & Sailing, Photography, Chess, Volcanoes & Earthquakes,
  Rivers Lakes & Waterfalls, Castles & Fortresses, Great Engineering, Predators & Prey,
  Dance & Ballet, Robots & AI, Codes Ciphers & Spies, Nobel Prizes, Wine Coffee & Tea,
  Cycling. Arabic (6): مدن العالم، مأكولات عالمية، مهن وأعمال، سفر ومواصلات،
  البيت والأدوات، مناخ وطبيعة. Repo total: **182 packs, 40,159 questions.**
- ☠️ **The finding worth keeping: topic WIDTH is the binding constraint, not effort.**
  210 questions must spread over 26 (EN) or 28 (AR) letters. A narrow topic simply has no
  answers for most letters, and `scripts/checkpack.mjs` shows it as a huge *misfiled*
  count on the first draft (30-80 answers filed under a letter they do not start with).
  Two packs were written and then **deleted** rather than padded: **Toys & Playthings**
  (52/187 unfileable — toy names cluster on B/L/M) and **طيور ومحميات** (64 leaks, bird
  names cluster on ب/ح/ن/ط). What works: EN topics whose *proper names* span the alphabet
  (Cycling only cleared 210 after being rebuilt around rider surnames), and in Arabic only
  broad everyday-vocabulary domains — food, home, jobs, travel, climate, cities, all six
  now shipped. Every other Arabic topic tried tops out at 110-170 real answers.
- 🔧 **Two Arabic authoring rules added to `CONTENT_QUEUE.md`:** never phrase a clue as
  «الـ+answer الذي…» (the leak test strips ال, so it is a leak), and prefer single-word
  answers — compound answers leak because the clue must name the common noun.
- 📐 **The Arabic distribution that lands 210 in one pass:** skew hard (ب/م ≈ 18-21,
  ك/س/ش/ت/ف/ح/ق ≈ 10-16, ث/ذ/ض/ظ ≈ 2-3). Spreading evenly always lands ~180.
- ✅ Re-verified at the end of the round: **987 unit/content tests**, **174 Playwright e2e**
  (desktop + mobile, incl. the online two-client and reconnect matrices), **noscroll ALL
  CLEAR** (17 devices × every screen, default and on a new Arabic pack), `scripts/leaks.mjs`
  reports **zero answer leaks repo-wide**, strict typecheck and production build clean.

## II.3s Round-21: the fact-audit sweep (2026-08-27)

The wave above was gate-clean but not fact-checked, so **every question of all 21 packs was
read line by line (~4,300 questions)** and corrected in place. No question was deleted, and
every pack still passes `checkpack.mjs` afterwards.

- ✅ **English: 15 packs read, 26 corrections.** Worst offender `cycling.ts` (9 wrong
  palmares stats: jersey counts, podium years). Two `shorten.mjs` over-trims that had
  produced non-answers (`blanc`, `Dry ice wine`) replaced with real ones (`Brut`, `Dolcetto`).
- ✅ **Arabic: 6 packs read, ~150 corrections.** `arWorldFood` was clean; `arHome` needed 85
  and `arClimate` 54. `arWorldCities` still carried five leftover «؟ لا، بل» trick clues and
  four geography errors (حيفا placed in the south, حضرموت and خراسان called cities).
- 🧠 **The finding: an everyday-vocabulary Arabic pack fails on LEXICON, not on facts.** To
  reach 210 under a 28-letter index the author reaches for a plausible word that does not
  exist (`ثيابدان`, `بشكير النوم`, `عصا الجمع`, `آلة الشفط`) or attaches a real word to the
  wrong object (`بانيو` clued as the bathroom, `شرشف` as a towel, `دورق` as a plate,
  `ممسحة` as a dish scourer). **No script can see either**: the answer is correctly lettered,
  unique and leak-free, so every gate passes. Rules now in `CONTENT_QUEUE.md`: author the
  noun before the clue; treat a `<noun> + <noun>` answer as a smell; sweep each letter for
  near-twins (ثريا/نجفة, صحراء/صحاري); **never disambiguate with tashkeel** (`برد` vs `بَرَد`
  looked distinct to `checkpack` but `normalizeArabic` makes them the same answer in play).
- ✅ Re-verified after the sweep: **987 unit/content tests**, **173 Playwright e2e** (one
  known-flaky reconnect test passed on retry), **noscroll ALL CLEAR** (17 devices, default
  and an Arabic pack), zero repo-wide leaks, strict typecheck + build clean, pushed and
  deployed green.

## II.3u Round-23: the swallowed "Choose a username" gate (2026-08-31)

The user reported that a fresh login doesn't land on the username claim. Reproduced live
with a real email-OTP sign-in (maildrop.cc inbox, read via its GraphQL API): after
"Verify & sign in" the auth modal **closed itself and never showed "Choose a username"**;
a page reload with a session-but-no-profile (exactly what a first-time **Google** login
lands in after the OAuth redirect) ALSO showed no prompt — the header even still showed
the signed-out 👤. Manually reopening the dialog showed the claim fine, so the bug was
pure auto-open orchestration:

- 🐛 **Root cause 1 (auth.tsx):** `profileChecked` was a plain boolean that stayed
  **stale-true from the signed-out state** for one render right after `user` arrived, so
  `needsUsername` flashed true → false (profile fetch starts) → true (fetch resolves).
- 🐛 **Root cause 2 (Home.tsx):** the false dip hit the auto-close branch (modal closes),
  and the module-level once-per-session `usernameClaimPrompted` flag — set during the
  true flash — then blocked the reopen forever. This fired on EVERY page load, which is
  why the Google-redirect path never prompted.
- ✅ **Fix:** `profileChecked` now derives from a `checkedUserId` keyed to the current
  user (`checkedUserId === user.id`), so it can never carry over between identities; the
  once-flag is deleted (the gate is mandatory and non-dismissable, so "open whenever
  needsUsername" is the correct behavior); AuthModal's loading branch also covers the
  not-yet-checked render (it used to fall through to ProfileView with a null profile).
- 🧪 **New e2e `tests-e2e/auth-username-gate.spec.ts`** (Supabase network mocked, real UI):
  (1) email-OTP verify → username claim visible immediately → claim → gate auto-closes;
  (2) page load with a seeded session + no profile → gate auto-opens (the Google path).
  Both **verified red on the pre-fix code, green on the fix**.
- 🔍 **Google SSO config verified live**: "Continue with Google" reaches
  accounts.google.com with the right client_id, Supabase `/auth/v1/callback` redirect_uri,
  PKCE `response_type=code`, and `redirect_to=letterlock.raltech.dev`. Google blocks
  automated credential entry, so the post-redirect app path is covered by test (2), which
  is byte-identical app-side.

## II.4 Still deferred (unchanged from §14 "Future TODO")

Multiplayer (Phase 2 §10), accounts/cloud (Supabase), pack editor + UGC moderation, daily
board/streaks/leaderboards/achievements, AI opponent, varying-difficulty packs, square-grid
mode UI toggle, native store builds, replays, online ranked/anti-cheat, i18n/RTL packs. The
core engine already supports the seams these need (pluggable topology, event log as wire
format, seeded RNG, pure rules engine).

## II.3o Round-17 — the Arabic section (معلومات عامة), 22 new packs, 10 bug fixes (2026-08-24)

- ✅ **Arabic support, engine-deep** (`src/core/packs.ts`): a 28-letter `ARABIC_ALPHABET`,
  `alphabetOf(pack)` (locale `ar*`), `normalizeArabic` (strips tashkeel/tatweel, unifies
  أإآٱ→ا, ة→ه, ى→ي, ؤ→و, ئ→ي, drops ء) and a locale-aware `bucketLetter(answer, locale)`
  that is now the **single source of truth** shared by the pack loader AND the content
  tests. Filing convention (matching معلومات عامة / حروف): the definite article **ال does not
  count**, so البحرين files under **ب** and القاهرة under **ق**; the article check runs on
  the RAW text so a hamza-initial word like ألمانيا is never mistaken for one (→ ا, not م).
  `answerMatches` is Arabic-aware, so tashkeel, hamza forms, taa marbuta and a leading ال
  never fail a correct guess. `HARD_LETTERS` + an Arabic ease order (`AR_EASE_ORDER`) bias
  ظ ض ذ off a 25-cell board. **The rules engine itself needed no change** (letters were
  already opaque strings; the SVG board renders any glyph).
- ✅ **RTL + fonts**: `dir="auto"` on the question text, the revealed answer, and the phone
  controller's prompt/letter, so Arabic lays out right-to-left and English stays LTR.
  **Tajawal** is appended to every font stack (incl. both accessibility fonts) so Arabic
  falls through to it per-glyph.
- ✅ **12 Arabic packs (2,517 questions)** in a dedicated **عربي** category group:
  معلومات عامة easy/medium/hard (208/206/204, a tier-card), جغرافيا وعواصم 206, كرة القدم والرياضة 209,
  مطبخ وأكلات عربية 228, إسلاميات 201, علوم وطبيعة 205, أمثال وحكم عربية 217,
  الخليج والعالم العربي 210, مشاهير العرب 213, أدب وشعر عربي 210. All MSA, no tashkeel.
- ✅ **10 new English packs**: Video Games easy/medium/hard (210/223/234, its own **Video
  Games** group, built on the 45 biggest/most nostalgic games), Anime easy/medium (207/209),
  Superheroes easy/medium (212/220), Emoji Puzzles easy/medium (245/215), Food & Drink
  easy/medium (222/211), Football easy/medium (208/206).
- ✅ **Every new pack is 200+.** Repo total: **83 packs, 19,097 questions**
  (`node scripts/packstats.mjs` prints the breakdown + anything under 200; the only
  under-200 packs remain the source-capped flags/maps/logos/songs-rnb).
- ✅ **New Arabic leak test** (`content.test.ts`): the English check tokenizes on `[^a-z0-9]`
  which erases Arabic, so an Arabic twin tokenizes on `[^ء-ي]+`, strips ال, and exempts
  generic head-nouns. It caught **13 packs / ~30 leaking questions**, all rewritten
  (question text only, answers untouched, no question deleted).
- 🐛 **10 bugs found and fixed** (deep audit of the game loop, online sync, core and menu):
  1. `core/fuzzyMatch.ts` — `normalizeAnswer` stripped **all Arabic** (`[^a-z0-9\s]`), so
     Party Mode on any `ar-*` pack graded **every** submission wrong and auto-continued
     "no one" forever: no hex could ever be claimed. Arabic block kept + normalised + ال stripped.
  2. 13 packs leaked their own answer into the question (above).
  3. `Game.tsx` — `submittedScore` was never re-armed, so a Bo3/Bo5 posted score **1**
     instead of the real series score. Re-armed per game.
  4. `useOnlineHost.ts` — a **skip** re-stamped the synced deadline, so phones jumped back
     to a full clock while the host's bar kept counting. Only a new *cell* re-stamps now.
  5. `PlayerController.tsx` — the host re-broadcasts `question_served` on any reconnect,
     which cleared `teammateAnswered` and wiped in-progress typing → a second answer for
     the same team. Those resets are now gated on a genuinely new cell.
  6. `Timer.tsx` — the reset sat *after* the `!active` bail-out, so a question waiting on
     its clip to play showed the previous question's **"Time! 0s"**. Reset moved first.
  7. `useOnlineHost.ts` — a new question on the same cell (skip, or undo then re-pick) kept
     the **previous** question's submissions, so the reveal panel and auto-winner could rule
     on stale guesses. Cleared per question.
  8. `store.tsx` — undoing back INTO a question reset `skipsUsed`/`autoSkips` to 0, giving
     unlimited skips and re-arming the broken-media loop guard. Both now carry forward.
  9. `QuestionCard.tsx` — an unreachable audio/video clip never called `onMediaPlay`, so
     past the auto-skip cap the question ran with **no timer at all**. Matches the image path now.
  10. The phone controller's Arabic prompt rendered LTR (no `dir="auto"`).
- ✅ Verified: **506 unit/content tests**, **174 Playwright e2e** (incl. the new
  `tests-e2e/arabic.spec.ts`: 25 distinct Arabic hexes, `direction: rtl`, full pick → reveal
  → claim, and the عربي group + tier picker), **noscroll ALL CLEAR** (17 devices × 18 screens
  on an Arabic pack), strict typecheck + build clean, and a live browser run of a real Arabic
  match (0 console errors).
- ✅ **Google SSO verified working**: "Continue with Google" on `letterlock.raltech.dev`
  redirects correctly to `accounts.google.com` with the right client_id and the Supabase
  `/auth/v1/callback` redirect_uri, so the provider is enabled and configured. (A full
  round-trip needs a real Google account; never the user's work email.)

## II.3p Round-18: bilingual category browser, Fandoms, +43 packs, settings on one page (2026-08-26)

- ✅ **Bilingual category browser** (`CategoryMenu.tsx`): a 🇬🇧 English / 🇸🇦 عربي segmented
  toggle at the top of the browser swaps the ENTIRE selector, groups and all. Arabic packs
  are no longer one catch-all "Arabic" bucket: they sit in 8 real Arabic groups
  (`AR_GROUPS` in `content/index.ts`) routed by topic in `groupOf(id)`, معلومات عامة،
  دين وتاريخ، علوم وطبيعة، جغرافيا وسفر، رياضة، فنون ومشاهير، أدب ولغة، طعام وتراث. Chips,
  search placeholder, empty state and the heading all localize; the search box is `dir="auto"`.
- ✅ **No reference to the show that inspired the format**: the three Arabic general-knowledge
  packs were renamed `arSeenJeem*.ts` → `arGeneral*.ts` (ids `ar-general-easy|medium|hard`,
  names معلومات عامة · Easy/Medium/Hard) and the mention in `core/packs.ts` was rewritten.
  A Playwright assertion fails the build if the string ever reappears in the menu.
- ✅ **New "Fandoms" group: 17 deep-dive packs, one per franchise** (205-216 questions each,
  ~3,580 total): Harry Potter, Star Wars, Marvel, LOTR, Game of Thrones, Pokémon, Minecraft,
  Zelda, Super Mario, GTA, Friends, The Office, Disney & Pixar, Breaking Bad, Stranger Things,
  DC & Batman, SpongeBob.
- ✅ **+26 more packs**. English: Ancient World, Architecture & Landmarks, Art & Painters,
  Aviation & Space Race, Business & Brands, Cars & Motorsport, Horror Movies, Inventions,
  Medicine & Body, Birds & Insects, Fairy Tales, Internet Memes, Languages & Words.
  Arabic: علماء وأعلام، مدن ومعالم، أنبياء وقصص، رمضان وعبادات، حيوانات وطبيعة، جسم الإنسان،
  فضاء وفلك، أدب وشعر، ألغاز، أغاني عربية، مشاهير العرب، تراث ومطبخ.
- ✅ **126 packs, 28,151 questions.** Every new pack is 200+. The only packs under 200 remain
  the source-capped ones (flags/maps/logos/songs-rnb, there aren't 200 countries).
- ✅ **Tooling** (kept, they pay for themselves): `scripts/autoregister.mjs` (registers any
  `<name>Pack: RawPack` not yet in `index.ts`, skipping merge-only intermediates and
  half-written files), `scripts/leaks.mjs` (prints every answer that leaks into its own
  question, per pack), `scripts/packstats.mjs` (per-group counts + anything under 200),
  `scripts/checksettings.mjs` (settings-fits-one-screen checker). Leak rules moved to
  `src/content/leakRules.ts` so the tests and the script share ONE definition.
- ✅ **⚙️ Settings fits on one page, every device, nothing cut off** (the user's report). Was:
  a fixed `88vh` scroll box whose 6-option "Countdown suspense" segment overflowed and whose
  controls fell off small screens. Now three regimes, all measured, not guessed:
  - **Tall screens**: one column, `max-height: calc(100svh - 16px)`, tightened rows.
  - **≥900px wide and short** (laptops, iPad landscape): the modal widens to 1040px and the
    three groups become **three columns**.
  - **Landscape phones (≤460px tall)**: `.set-group { display: contents }` turns the whole
    body into ONE wrapping strip of controls, so 9 settings land in ~3 lines instead of 9;
    hints hide, the Done button hides (✕ / scrim / Escape all close).
  `overflow-y: auto` stays purely as a safety net. Verified by `scripts/checksettings.mjs`:
  **15 viewports (375×667 → 1920×1080) × default AND xlarge text = ALL CLEAR**, zero internal
  scroll, zero controls outside the viewport.
- ✅ Re-verified: **707 unit/content tests**, full Playwright e2e, **noscroll ALL CLEAR**
  (17 devices × every screen), zero answer leaks repo-wide (`node scripts/leaks.mjs`),
  strict typecheck + build clean.
- ⏳ Deferred by budget, not by blocker: the further ~30 English + ~30 Arabic categories. The
  authoring pipeline (agent per pack → `autoregister` → `leaks` → `packstats`) is proven and
  can resume at any time.

## II.3q Round-19: settings on one page, 7 recovered packs, and the cheap-model experiment (2026-08-26)

- ✅ **7 packs recovered for free**: Military History (208), Languages & Words (211) and the
  Arabic تقنية (206), اختراعات (213), لغة (210), تاريخ إسلامي (209), مطبخ خليجي (207) were
  already fully written on disk from agents killed by a usage limit. Registering them cost
  nothing. **133 packs, 29,615 questions.**
- ✅ **A Sonnet sample audit (14 questions per pack) rated those 7 at 0-7% bad, all SHIP.**
  The two flagged items were fixed: an organ-transplant clue that described Barnard's 1967
  heart operation, and a Hattin clue that conflated the battle with the later recapture of
  Jerusalem.
- 🚫 **The cheap-model authoring experiment FAILED, and this is the finding worth keeping.**
  10 packs were authored by Haiku with the format spec inlined. They passed every gate that
  can be scripted (210+ questions, 20+ letters, no duplicates, no answer leaks after a fix
  loop) and failed the one that cannot: **facts**. A sampled audit put them at **60-100%
  wrong, invented or vague** (Houston hosted the 1992 Olympics, Comme des Garçons is Belgian,
  ARAMCO is an airline, the Great Dane is Italian, invented words like "Quay-haul"). One file
  still carried its own `// Wrong, Tokyo hosted 2020` comment. **All 10 were deleted, none
  shipped.** Authoring trivia is a knowledge task, not a formatting task: use a model that
  knows the facts, and sample-audit every wave before it ships.
- ✅ **New content tooling** (all three earn their keep):
  - `scripts/checkpack.mjs <file>` validates ONE unregistered pack (count, letter coverage,
    duplicate answers, misfiled answers, every leak) and exits non-zero until clean, so an
    authoring agent can self-verify instead of round-tripping through the orchestrator.
  - `scripts/dropleaks.mjs <files>` deletes leaking and duplicate-answer questions, refusing
    when the pack would fall under 200 (`MIN=` overrides).
  - It also caught a silent killer: a **duplicate `D:` key** in one pack, where JavaScript
    keeps only the last block, so 15 questions vanished AND were never leak-checked. Any new
    pack should be scanned for repeated letter keys.
- ✅ **⚙️ Settings fits on one page, every device, nothing cut off** (see II.3p for the CSS).
  Verified again here: `scripts/checksettings.mjs` ALL CLEAR on 15 viewports at default AND
  xlarge text; `noscroll.mjs` ALL CLEAR on 17 devices.

## II.3t Round-22: the second fact-audit sweep — every pack from the past week (2026-08-27)

The user asked for the Round-21 treatment to be extended to "the last couple of batches we
delivered in the past week or so". Scope came from git (`--since=2026-08-20 --diff-filter=A`):
125 files added, of which **103 were packs still unaudited (~21,600 questions)**. All 103 were
read question by question and corrected in place. Nothing was deleted; every edited pack
re-passes `scripts/checkpack.mjs`.

- ✅ **Arabic: 51 packs (~10,700 questions), 12 corrections.** All single facts (al-Baghdadi's
  nisba, Baligh Hamdi's birthplace, Tariq's ships, Baybars at Ain Jalut, an Ahmed Zaki film,
  a China population figure, an overstated Ibn Firnas claim). **The finding: the lexicon
  failure mode of Round 21 was specific to everyday-vocabulary packs, not to Arabic.** Every
  knowledge-domain Arabic pack (history, geography, religion, science, sport, literature,
  proverbs, poetry) held up.
- ✅ **English: 52 packs (~10,900 questions), 22 corrections.** The failure mode is
  **superlatives and dated claims**, never identity: "six straight titles in the 1980s"
  (Lancia's sixth came in 1987), "the episode that opened the Hundred Years War" (Crécy came
  years in), record-holder claims true of a different holder, "the very first Pokémon ever
  designed" attached to Rhyhorn when the drill horn and the anecdote both belong to Rhydon,
  and a Di María clue crediting him with a 2014 Champions League final goal he never scored.
- ✅ **The 17 Fandoms packs were the cleanest in the repo: 14 needed nothing at all.**
  In-universe facts are stable. All three fixes were out-of-universe slips (a film's own term
  vs the comics' term, step-brother written as half-brother, an episode clue naming the wrong
  character's office).
- ➕ **`src/content/dinosaurs.ts` was committed.** It was imported by `content/index.ts` but had
  never been added to git, so a clean clone could not build. It validates clean (212 questions).
- 🧠 **Authoring rules added to `CONTENT_QUEUE.md`:** never write "the first / the only / the
  biggest" unless the pack needs it (a plain identifying clue cannot be wrong, and a
  superlative rots as records change); never date a claim to a decade you have not checked,
  name the single year; a clue that names a film must use that film's own terms; and when two
  entities in a family share a trait, clue the trait that separates them.
- ✅ Re-verified after the sweep: **987 unit/content tests**, full Playwright e2e,
  **noscroll ALL CLEAR** (17 devices × every screen), `scripts/leaks.mjs` zero leaks repo-wide,
  strict typecheck and production build clean.
