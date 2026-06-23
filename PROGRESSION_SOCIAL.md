# Letterlock — Progression, Social & Unlocks (spec + build log)

This is the living spec for the XP/level/prestige system, the friends system,
content unlocks/gating, login incentives, and admin controls. Build phases are
checked off as they land. Every phase is unit- and/or Playwright-tested before
commit; the app deploys via push-to-`main` (CI applies Supabase migrations).

---

## 1. XP, Levels & Prestige (Call-of-Duty style)

**Earning XP** (server-authoritative via RPC; never trust the client):
- Win a game: **+100 XP**
- Play a game to completion (loss): **+40 XP**
- Join/host an online room (per match, once): **+25 XP**
- Daily first-play bonus (future): +50 XP

**Levels:** 1 → 10 within a prestige. Each level costs progressively more,
expressed in "games" (1 win ≈ 100 XP). Games needed to advance FROM a level:

| From level | Games to next | Tier name | Tier colour |
|---|---|---|---|
| 1 | 2  | Bronze I   | bronze |
| 2 | 3  | Bronze II  | bronze |
| 3 | 5  | Silver I   | silver |
| 4 | 7  | Silver II  | silver |
| 5 | 9  | Gold I     | gold |
| 6 | 11 | Gold II    | gold |
| 7 | 13 | Platinum   | platinum |
| 8 | 15 | Diamond    | diamond |
| 9 | 20 | Master     | master |
| 10 | — (prestige) | Grandmaster | grandmaster |

Cumulative XP thresholds are derived from the games column × 100 and stored in
`src/core/progression.ts` (pure + unit-tested). A progress bar shows XP toward
the next level.

**Prestige:** at level 10 with its requirement met, the player may **Prestige**
→ prestige +1, level resets to 1, XP resets. Prestige 0 → 10. **Prestige 10 +
level 10 = maxed** (stored, no further progression). Prestige shows as a badge
(Roman numeral / star icon) next to the name everywhere.

---

## 2. Unlocks & Gating (progressive)

Locked until a level/prestige is reached; **everything base unlocks by Prestige 1**;
admin can grant `full_access` to override all gates per user.

| Feature | Unlock |
|---|---|
| Board 4×4 | always |
| Board 5×5 | level 3 |
| Board 7×7 | level 6 |
| Easy/Medium categories | always |
| Hard categories | level 4 |
| Extreme categories (Genius, etc.) | level 8 |
| Best-of-5 matches | level 5 |
| (cosmetic) board themes / hex skins / name colours | various levels |
| (cosmetic) prestige name-glow | each prestige |
| EVERYTHING | Prestige ≥ 1, OR admin `full_access` |

Gates are enforced in the UI (locked option shows a 🔒 + "Unlocks at Level N")
**and** validated server-side where it matters (score submission). A signed-out
guest plays with the base (always-unlocked) set only.

---

## 3. Login incentives & first-time username

- Before **host/join/Play**, a signed-out user sees a non-blocking nudge:
  "Sign in to earn XP, level up, add friends and appear on the leaderboard."
  They can still play as guest (no XP, base unlocks only).
- **First sign-in** → forced username claim (already exists) → now also seeds the
  progression row (level 1, prestige 0, xp 0).

---

## 4. Friends system (researched design)

Canonical, dedupe-safe model — a single `friendships` row per pair, ordered so
`user_low < user_high`, with a status machine. (This avoids the duplicate-row
bugs of naive directional designs and makes "are A and B friends?" a single
indexed lookup.)

```
friendships(
  user_low uuid, user_high uuid,           -- ordered pair (PK)
  status   text,                           -- 'pending' | 'accepted' | 'blocked'
  action_by uuid,                          -- who last acted (who sent/blocked)
  created_at, updated_at
)
```

**State machine:**
- none → `pending` (A requests B; action_by = A)
- pending → `accepted` (B accepts) | deleted (B declines / A cancels)
- accepted → deleted (either removes) 
- any → `blocked` (action_by blocks the other; only blocker can unblock)

**RPCs (SECURITY DEFINER, validate caller):** `send_friend_request(target)`,
`respond_friend_request(other, accept bool)`, `remove_friend(other)`,
`block_user(other)`, `unblock_user(other)`. A `friends_view` returns a caller's
accepted friends + incoming/outgoing pending, with usernames + level/prestige +
online flag.

**Presence & notifications (Supabase Realtime):**
- Each signed-in client tracks presence on a global `presence:online` channel →
  derive who's online.
- A per-user channel `user:<id>` receives `friend_request` / `room_invite`
  broadcasts → shows an in-app **notification popup** (toast) when online.
- **Room invite:** from a friend's online card, "Invite to room" sends the room
  code to `user:<friendId>`; the friend gets a popup with Join.

**UI:** a Friends modal — tabs: Friends (online first, with invite + remove),
Requests (accept/decline), Add (search by username → send request). Online dot,
level/prestige badge per friend.

---

## 5. Admin

- Admin dashboard **Users** tab already lists accounts; extend with: level,
  prestige, XP, and a **Full access** toggle (grants `full_access` = unlock all),
  plus **Grant XP / Reset progression** actions. All via admin-only RPCs.
- Admin can see every account (existing `admin_list_users` RPC, extended).

---

## 6. Leaderboard integration

- Each row/podium shows the player's **rank badge** (tier + prestige) next to the
  username. Add a sort/scope by level (global rank by total XP) as an option.

---

## 7. Build phases

- [x] **P1** `core/progression.ts` (pure: xp→level/prestige, tiers, unlock checks) + 15 unit tests
- [x] **P2** migration `0007_progression_social.sql` (profiles cols + friendships + RPCs + RLS) — DEPLOYED
- [x] **P3** award XP on game completion via `award_xp` RPC + level-up toast; row seeds via column defaults
- [x] **P4** unlock-gating in Setup (board size + match mode; 🔒 + "Lv N"; clamps; guest=base set) + guest-gating test
- [x] **P5** login-incentive nudge on Mode Select (signed-out)
- [x] **P6** RankBadge + RankBar; leaderboard podium/rows + profile + friends list
- [x] **P7** Friends modal (list/requests/add/remove/block) + presence + invite/notif popups
- [x] **P8** Admin: rank column + full-access toggle + grant/reset XP (RPCs)
- [~] **P9** cosmetic unlocks: prestige stars/tier colours on the rank badge (fuller skins/themes = future)
- [~] **P10** UI polish: bordered cards, leaderboard podium, rank palettes (ongoing)
- [x] **P11** device-matrix pass: noscroll covers all new screens (mode-select nudge, friends, admin progression) — ALL CLEAR ×17

### Notes / follow-ups
- Category-difficulty gating (lock hard/extreme packs in the menu) — Setup gates board/mode; pack-difficulty lock TBD.
- Controller (phone player) XP — players on the anonymous controller page don't earn XP yet (needs controller auth).
- award_xp is clamped [0,200]/call; a determined client could repeat it — acceptable for a party game; admin can reset.

> See `TESTING.md` for the Playwright device matrix every new screen must pass.
