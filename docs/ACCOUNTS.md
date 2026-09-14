# 🏢 ACCOUNTS.md: company identity and store account IDs

> **What this is:** the one place the team looks up the identifiers Letterlock's store
> launch depends on. This repo is private, and everything below is **business-identity
> data, not secrets**: a D-U-N-S number, a Team ID and an app-signing fingerprint are
> printed on public store listings or served from `.well-known/` on the open web.
>
> ⛔ **Nothing secret goes in this file.** No passwords, no API secrets, no private keys,
> no RevenueCat *secret* keys, no Apple `.p8` files. Those live only in gitignored
> `infra/*-creds` files and GitHub Actions secrets, exactly as `CLAUDE.md` §2c requires.
> The RevenueCat keys listed below are the **public SDK keys**, which ship inside the app
> bundle anyway.
>
> Related: `LAUNCH_PLAN.md` (why each of these is needed), `CLAUDE.md` (the blocked list B3-B14).

---

## 1. Legal entity

| Field | Value | Notes |
|---|---|---|
| **Business name (as registered with D&B)** | **RAL SOFTWARE SERVICES** | ⚠️ Not "RAL Technologies". See the naming note below. |
| City | Al Mazrowiah | |
| Country | Bahrain | |
| **D-U-N-S Number** | **`561683753`** | ✅ Issued 2026-09-13 |
| D&B request ID | `102122-10923080` | Submitted 2026-09-07 via Apple's fast-tracked lookup |
| D&B resolution | New Record Created using 3rd parties | |
| **Usable from** | **2026-09-21** | D&B: "You may start using your number in 7 days." Apple's D-U-N-S lookup will not find it before D&B propagates the record. |

### ✅ Naming: RESOLVED 2026-09-14, the public developer name is RAL SOFTWARE SERVICES

`LAUNCH_PLAN.md` D2 originally said "Organization: RAL Technologies". It is not the legal name. The Bahrain
commercial registration reads **RAL SOFTWARE SERVICES**, which is why D&B issued the record under it, so there is
nothing to correct: D&B only accepts a name your legal documents prove, and Apple requires the entity name to match
those documents anyway.

**Both store listings will therefore show `RAL SOFTWARE SERVICES` as the developer.** The app name
(`Letterlock: Party Quiz`, D1) is unaffected, and that is the name players actually read. D2 is updated to match.

---

## 2. Store and service accounts

Fill each row in as the account is created. `—` means it does not exist yet.

| Account | Status | Identifier | Blocked item |
|---|---|---|---|
| Apple Account (company) | ✅ Created + verified 2026-09-07 | Browser-only, never signed into a phone's iCloud | — |
| Apple Developer Program ($99/yr, Organization) | ⏳ Blocked until 2026-09-21 | Team ID: `—` | B3, B7 |
| Google Play Console ($25, Organization) | ⏳ **Blocked until 2026-09-21**: Google requires a D-U-N-S for organization accounts and validates it against D&B | Developer ID: `—` | B3 |
| Google Play merchant account | ⏳ Not started | — | B3 |
| AdMob | ✅ Complete 2026-09-14: 2 apps, 6 ad units, app-ads.txt | Publisher ID: **`pub-7138183978612183`** | — |
| RevenueCat | ⏳ Not started | Project ID: `—` | B3, B6 |
| Google Cloud OAuth (consent screen) | 🔄 Client exists, consent screen unverified | Client ID is in `.env.production` | B3 |
| Codemagic (CI for iOS) | ⏳ Not started, now optional | Suhaib has a Mac (2026-09-14), so iOS can be built locally in Xcode | B13 |
| Sentry | ⏳ Not started | DSN: `—` | B14 |
| Backblaze B2 (backups) | ✅ Live 2026-09-08 | Bucket `letterlock-backups`; key in gitignored `infra/b2-creds` | — |

---

## 3. Identifiers the build needs (the B4-B10 placeholder list)

Every row below is a placeholder in tracked code today. When the value arrives, put it here
**and** in the file named, then redeploy.

| ID | Value | Lives in | Blocked item |
|---|---|---|---|
| Bundle / application id | `dev.raltech.letterlock` | `capacitor.config.ts` | ✅ set |
| Store listing name | `Letterlock: Party Quiz` | App Store Connect + Play Console | D1 |
| Apple **Team ID** (10 chars) | `—` (literal `TEAMID` today) | `public/.well-known/apple-app-site-association` | B7 |
| Apple **Services ID** (web Sign in with Apple) | `—` | `VITE_APPLE_SERVICES_ID` env | B4 |
| Play **app-signing SHA-256** | `—` (literal `TODO:REPLACE:...`) | `public/.well-known/assetlinks.json` | B8 |
| AdMob app ID (Android) | ✅ **`ca-app-pub-7138183978612183~2806227311`** | `android/app/src/main/res/values/strings.xml` | done |
| AdMob app ID (iOS) | ✅ **`ca-app-pub-7138183978612183~9998708668`** | `ios/App/App/Info.plist` | done |
| AdMob unit: Android banner | ✅ `ca-app-pub-7138183978612183/5264869696` | `VITE_ADMOB_BANNER_ANDROID` | done |
| AdMob unit: Android interstitial | ✅ `ca-app-pub-7138183978612183/6388222989` | `VITE_ADMOB_INTERSTITIAL_ANDROID` | done |
| AdMob unit: Android rewarded | ✅ `ca-app-pub-7138183978612183/2448977972` | `VITE_ADMOB_REWARDED_ANDROID` | done |
| AdMob unit: iOS banner | ✅ `ca-app-pub-7138183978612183/5815921071` | `VITE_ADMOB_BANNER_IOS` | done |
| AdMob unit: iOS interstitial | ✅ `ca-app-pub-7138183978612183/9887028028` | `VITE_ADMOB_INTERSTITIAL_IOS` | done |
| AdMob unit: iOS rewarded | ✅ `ca-app-pub-7138183978612183/1984487278` | `VITE_ADMOB_REWARDED_IOS` | done |
| `app-ads.txt` line | ✅ `google.com, pub-7138183978612183, DIRECT, f08c47fec0942fa0` | `public/app-ads.txt` | done |
| RevenueCat **public** iOS key | `—` | `VITE_REVENUECAT_IOS_KEY` env | B6 |
| RevenueCat **public** Android key | `—` | `VITE_REVENUECAT_ANDROID_KEY` env | B6 |
| Remove Ads product id | `remove_ads` (planned, $3.99 non-consumable) | Both stores + RevenueCat entitlement | B3 |
| Sentry DSN | `—` | `VITE_SENTRY_DSN` env + GitHub Actions variable | B14 |

---

## 4. Change log

- **2026-09-14** (later still) — AdMob **complete**: 2 apps, all 6 ad units, the real `app-ads.txt` line.
  Every AdMob placeholder in the codebase is gone. B5 and B10 are closed.
- **2026-09-14** (later) — Naming resolved: the CR says RAL SOFTWARE SERVICES, so that is the developer name
  on both stores and D2 is revised. Confirmed Play org accounts also need the D-U-N-S, so Play waits for
  2026-09-21 as well.
- **2026-09-14** — Suhaib has a **Mac**, so iOS can be built and run locally in Xcode; a free Apple
  Account signs a 7-day build onto a real iPhone before the paid membership exists. Codemagic is now
  optional. Added `.github/workflows/duns-reminder.yml`, which emails the reminder on 21 Sep.
- **2026-09-13** — D-U-N-S `561683753` issued for RAL SOFTWARE SERVICES (Bahrain), usable
  from 2026-09-21. File created. Flagged the entity-name mismatch against D2.
