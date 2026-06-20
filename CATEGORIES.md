# 🗂️ Letterlock — Category & Pack Organisation

> The lineup of question packs the player browses on the home screen, and the
> rules for grouping them. Pairs with [`QUESTION_AUTHORING.md`](./QUESTION_AUTHORING.md)
> — that doc is **how to write a question**; this doc is **where a pack lives**
> in the browser. **Read both before adding a new pack.**

---

## Rules for adding a new pack (the short list)

1. **Author the content** per `QUESTION_AUTHORING.md` (≥200 questions, ≥16
   distinct first letters, no rule-2 leaks, factual, etc.).
2. **Place it in a group** below. If it genuinely doesn't fit any group, add
   a new group entry to `PACK_GROUPS` in `src/content/index.ts` and update the
   `groupOf(id)` regex in the same file.
3. **Difficulty tiering**: if a topic spans easy/medium/hard, ship them as
   three sibling packs (e.g. `<topic>-easy`, `<topic>-medium`, `<topic>-hard`)
   so the browser can stack them under a single label with a difficulty
   selector — see §3 below.
4. **Register the pack** in the `PACKS` array of `src/content/index.ts` in
   difficulty-rank order. The home screen's category browser will pick it up
   automatically.
5. **Test it**: `npm test` + `npm run e2e`. Content tests are the hard gate.

---

## 1. The eight category groups

The home-screen browser ships eight groups (kept in `PACK_GROUPS` order so the
visual flow on the home shelf is stable).

| Order | Group | Lives in | What goes here |
|---|---|---|---|
| 1 | **Trivia & Knowledge** | default | General-knowledge, history, science, geography, mythology, animals, space, genius — anything text-trivia and not in another group. |
| 2 | **Movies & TV** | id matches `/^sitcoms/`, `/^movies/`, `/clips/`, `/^movies-tv/` | Sitcoms, films, TV-clip identification. |
| 3 | **Music** | id matches `/^music/`, `/^melodies/`, `/^songs/` | Music trivia, decade & genre packs, song-clip identification, melody clips. |
| 4 | **Flags & Maps** | id matches `/^flags/`, `/^maps/` | Country identification by flag or by location on a world map. |
| 5 | **Logos & Brands** | id matches `/^logos/` | Brand-logo identification. |
| 6 | **Sports** | id matches `/^sports/` | Athletes, teams, championships, terms. |
| 7 | **Charades** | id matches `/^charades/` | Mime-it-out QR-code prompts. |
| 8 | **Regional** | id matches `/^bahrain/`, `/^saudi/`, `/^uae/`, `/^gulf/` | Country- and region-specific trivia. |

When introducing a brand-new theme, prefer fitting it into an existing group
before creating a new one — only branch out when the conceptual mismatch is
obvious (e.g. a future "Bible Trivia" → new "Faith" group).

---

## 2. Pack id convention

Pack ids are stable kebab-case slugs that drive grouping AND deep-linking:

```
<topic>[-<sub>][-easy|medium|hard|extreme]
```

Examples:
- `kids` — base topic, no tier.
- `sitcoms-easy`, `sitcoms-medium`, `sitcoms-hard` — three-tier topic.
- `music-90s-hiphop` — decade + genre.
- `maps-easy` — image-identification topic with a difficulty tier.
- `charades-animals` — sub-theme of charades.

Once a pack ships, **never rename its id** — the no-repeat cycle keeps state
keyed by id in `localStorage`, and a global leaderboard (future) keys scores
the same way. Add a new pack rather than renaming an old one.

---

## 3. Difficulty tiers — group siblings under one card with a selector

Topics with three difficulty tiers (e.g. World Flags, Sitcoms, World History,
World Maps, Movie Trivia, Music decades) feel cluttered as three separate
cards. The category browser **collapses sibling tiers into a single visual
card** with a difficulty selector (Easy ▸ Medium ▸ Hard ▸ Extreme) so the
player picks one tier without scrolling past three near-duplicate cards.

The grouping is computed at runtime from pack ids — anything matching
`/-easy$|-medium$|-hard$|-extreme$/` with a common stem is offered as a tier.
Single-tier packs render as a normal card.

This is rule **#3 in the new-pack checklist** above: if you ship a single
"Mythology · Hard" pack today and a "Mythology · Easy" pack tomorrow, the
browser will automatically collapse them into one tier-selector card the
moment the easy pack is registered.

---

## 4. Letterless packs (`hideBoardLetters: true`)

These packs serve from the WHOLE pack regardless of the hex letter (because
the prompt is an image / clip / charade, not a letter-bound question). The
board hides per-hex letters and renders **chess-style coordinates** instead
(columns 1..N on top, rows A..N on the side) so players can still say "B3".

When authoring a new letterless pack, pick a generic prompt that never names
the answer — see the media-clip rules in `QUESTION_AUTHORING.md`.

---

## 5. Standalone packs vs. clip extras

Sitcom and music decade packs ship as **mixed packs**: a trivia base
(`sitcomsEasyPack`, `music80sPopPack`, …) merged via `withExtra(…)` with a
clip companion (`sitcomsEasyClipsExtra`, `music80sPopClipsExtra`, …). Players
encountering one of these packs see both text-trivia and real iTunes audio /
video preview questions interleaved. See `src/content/clipsExtras.ts` for the
wiring and `scripts/genClipsAll.mjs` for the fetcher.

---

## 6. Current ship list (snapshot)

The authoritative list is `PACKS` in `src/content/index.ts`. Audit it with:
```
npx vite-node scripts/audit_letters.mjs
```
which reports any pack with letters under five questions, and:
```
npm test
```
which fails the build on any rule-2 / dedupe / letter-coverage violation.
