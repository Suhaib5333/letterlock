# Store listing kit (LAUNCH_PLAN Phase 6)

Everything the two store consoles ask for, ready to paste. Franchise names never appear
in store metadata (D11); the listing name is D1. Screenshots come from
`node scripts/storeshots.mjs` after Phase 1b (real build, no logos or franchise names on
screen).

## Identity

| Field | Value |
|---|---|
| Name (both stores) | Letterlock: Party Quiz |
| Bundle id / package | dev.raltech.letterlock |
| Developer | RAL Technologies (Organization) |
| Category | Games > Trivia (Apple: Games, secondary Trivia; Play: Trivia) |
| Age rating | Apple 12+ (infrequent/mild themes absent; rated by the new questionnaire), Play IARC via questionnaire, target audience 13+ (D6) |
| Contains ads | Yes (AdMob). Declared on both stores; App Privacy + Data safety include AdMob and RevenueCat collection |
| In-app purchases | Remove Ads, non-consumable, $3.99 tier, Family Sharing on iOS |
| Support URL | https://letterlock.raltech.dev/ |
| Marketing URL | https://letterlock.raltech.dev/ (same domain as app-ads.txt) |
| Privacy policy | https://letterlock.raltech.dev/privacy.html |
| Terms | https://letterlock.raltech.dev/terms.html |
| Account deletion URL (Play) | https://letterlock.raltech.dev/account/delete/ |
| Contact | legal@raltech.dev (takedown SOP: pull a pack within 48 h) |

## Subtitle / short description (30 / 80 chars)

- Apple subtitle: `Trivia showdown on a hex board`
- Play short description: `Two teams, one hex board. Answer trivia, claim letters, connect your edges first.`

## Keywords (Apple, 100 chars)

`trivia,party game,quiz,hex,board game,teams,family,classroom,letters,tv,couch,multiplayer`

## Description (both stores)

Letterlock is a party trivia game for two teams on a honeycomb board.

Every hex holds a letter. Pick one, the host reads a question whose answer starts with that
letter, and the team that answers first claims the hex. One team races to connect left to
right, the other top to bottom. Block your rivals, build your own chain, and the first team
to connect wins. Someone always wins: the board can never end in a draw.

HOW YOU PLAY
• Couch mode: one screen, the host taps who answered right.
• Party mode: cast the board to a TV or tablet, everyone answers from their own phone. No
  install needed for the phones, they join with a code or QR.
• Best of 1, 3 or 5. Board sizes 4x4, 5x5 and 7x7.

WHAT IS INSIDE
• 180+ question packs and 40,000+ questions: general knowledge, geography, science,
  history, sport, movies and TV trivia, music trivia, flags, logos, charades, emoji
  puzzles, kids, and a full Arabic library.
• Fair by design: both teams cross the same number of hexes, the pie rule removes
  first-move advantage, and the winning chain is highlighted the moment it connects.
• Ranks, XP and leaderboards for signed-in players. Friends, saved games that follow your
  account, and no-repeat questions until a pack is exhausted.
• Colour-blind safe (blue and amber, never red and green), reduced-motion mode, readable
  fonts, text scaling, read-aloud questions.

WORKS ON YOUR TV
Install on Android TV or Google TV and play with the remote, or cast the board from your
phone.

Letterlock contains ads between games. A one-time Remove Ads purchase turns them off on
every device where you are signed in.

Unofficial fan trivia packs are not affiliated with or endorsed by any rights holder.

## What's new (first release)

`First release: couch and party modes, 180+ packs, Arabic library, Android TV support.`

## Review notes (paste into both consoles)

1. No account is required to play. To try signed-in features use the test account below.
2. Couch mode: Home > Play > Couch > pick a pack > Start. Tap a hex, tap "Reveal", then tap
   the team that answered. Undo is always available.
3. Party mode (two devices): Home > Play > Party > Create room. Open
   https://letterlock.raltech.dev/join/CODE on a second device (or scan the QR), pick a
   team, tap Start on the host. Both phones answer the same question; the host reveals and
   awards.
4. Offline: everything local keeps working in airplane mode. Online rooms and the packs
   that stream media are hidden while offline and return when the connection does.
5. Ads appear only after a game ends. Remove Ads is under Settings, with Restore Purchases.
6. Account deletion: Settings > Profile > Delete account (also documented at
   /account/delete/).
7. Test account: `<email>` / one-time code sent by email (reviewers: use "Continue with
   Apple" or the email code; we will supply a fixed reviewer login before submission).

## Forms

| Form | Answer |
|---|---|
| Apple App Privacy | Contact info (email, account only), Identifiers (user id), Usage data (AdMob, not linked when ATT denied), Purchases (RevenueCat). No tracking unless ATT allowed. |
| Apple export compliance | `ITSAppUsesNonExemptEncryption = false` (HTTPS only) |
| Apple Sign in | Sign in with Apple offered because Google sign-in exists (4.8) |
| Play Data safety | Email (account), user ids, app interactions (AdMob), purchase history (RevenueCat). Data encrypted in transit. Users can request deletion in-app. |
| Play ads declaration | Contains ads, AdMob |
| Play target audience | 13+ |
| Play Billing | Uses Play Billing through RevenueCat |
| Play Android TV | Opt in to the TV track; TV banner 320x180 at `android/app/src/main/res/drawable-xhdpi/tv_banner.png`; 1920x1080 TV screenshots from `scripts/storeshots.mjs` |

## Assets checklist

| Asset | Size | Source |
|---|---|---|
| iOS icon | 1024x1024 PNG, no alpha | `resources/icon.png` |
| Play icon | 512x512 PNG | `public/icons/icon-512.png` |
| Play feature graphic | 1024x500 | `scripts/storeshots.mjs --feature` |
| iPhone 6.9" screenshots | 1320x2868 (3 to 8) | `scripts/storeshots.mjs` |
| iPad 13" screenshots | 2064x2752 | `scripts/storeshots.mjs` |
| Play phone screenshots | 1080x1920 or the iPhone set | `scripts/storeshots.mjs` |
| Play 7"/10" tablet | 1200x1920 / 1600x2560 | `scripts/storeshots.mjs` |
| Android TV screenshots | 1920x1080 | `scripts/storeshots.mjs` |
