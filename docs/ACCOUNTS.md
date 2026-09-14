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

### ⚠️ Naming note, read before enrolling

`LAUNCH_PLAN.md` D2 says the developer account is "Organization: **RAL Technologies**".
The D-U-N-S record says **RAL SOFTWARE SERVICES**, and **Apple and Google both display the
legal entity name attached to the D-U-N-S** as the seller/developer name on the listing.

So the store pages will read **RAL SOFTWARE SERVICES** unless the D&B record is changed
first (free, via D&B's update form, and it adds another wait). The app name itself
(`Letterlock: Party Quiz`, D1) is unaffected. **Decision needed from Suhaib:** accept
`RAL SOFTWARE SERVICES` as the public developer name, or update the D&B record before
enrolling. Accepting it costs nothing and unblocks enrolment on 2026-09-21.

---

## 2. Store and service accounts

Fill each row in as the account is created. `—` means it does not exist yet.

| Account | Status | Identifier | Blocked item |
|---|---|---|---|
| Apple Account (company) | ✅ Created + verified 2026-09-07 | Browser-only, never signed into a phone's iCloud | — |
| Apple Developer Program ($99/yr, Organization) | ⏳ Blocked until 2026-09-21 | Team ID: `—` | B3, B7 |
| Google Play Console ($25, Organization) | ⏳ Not started | Developer ID: `—` | B3 |
| Google Play merchant account | ⏳ Not started | — | B3 |
| AdMob | ⏳ Not started | Publisher ID: `—` | B3, B5, B10 |
| RevenueCat | ⏳ Not started | Project ID: `—` | B3, B6 |
| Google Cloud OAuth (consent screen) | 🔄 Client exists, consent screen unverified | Client ID is in `.env.production` | B3 |
| Codemagic (CI for iOS) | ⏳ Not started | — | B13 |
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
| AdMob app ID (Android) | `—` (Google test ID today) | `android/app/src/main/res/values/strings.xml` | B5 |
| AdMob app ID (iOS) | `—` (Google test ID today) | `ios/App/App/Info.plist` | B5 |
| AdMob unit IDs (banner / interstitial / rewarded × 2 platforms) | `—` (Google test IDs today) | `src/lib/adUnits.ts` | B5 |
| `app-ads.txt` line | `—` (placeholder) | `public/app-ads.txt` | B10 |
| RevenueCat **public** iOS key | `—` | `VITE_REVENUECAT_IOS_KEY` env | B6 |
| RevenueCat **public** Android key | `—` | `VITE_REVENUECAT_ANDROID_KEY` env | B6 |
| Remove Ads product id | `remove_ads` (planned, $3.99 non-consumable) | Both stores + RevenueCat entitlement | B3 |
| Sentry DSN | `—` | `VITE_SENTRY_DSN` env + GitHub Actions variable | B14 |

---

## 4. Change log

- **2026-09-13** — D-U-N-S `561683753` issued for RAL SOFTWARE SERVICES (Bahrain), usable
  from 2026-09-21. File created. Flagged the entity-name mismatch against D2.
