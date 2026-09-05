# Saved browser session (infra/browser-state.json)

Suhaib signed in to Google once, on 2026-09-05, so no future session has to ask
him again. `infra/browser-state.json` is a Playwright `storageState` dump holding
the Google session cookies plus `letterlock.raltech.dev` localStorage (which is
where the app keeps its own access and refresh tokens).

**It is gitignored and must stay that way.** Anyone holding this file can act as
Suhaib on Google until the session expires or is revoked.

## Reusing it

Playwright, for scripts and the e2e suite:

```js
const ctx = await browser.newContext({ storageState: 'infra/browser-state.json' });
```

Via the Playwright MCP tools, load it into the live context with
`browser_run_code_unsafe`:

```js
async (page) => {
  const fs = require('fs');
  const s = JSON.parse(fs.readFileSync('infra/browser-state.json', 'utf8'));
  await page.context().addCookies(s.cookies);
  return s.cookies.length;
}
```

## Refreshing it

Google sessions expire, and Google sometimes invalidates a session it decides is
automated. When a run lands on a sign-in page instead of the app, ask Suhaib to
sign in once more in the Playwright browser, then re-save with:

```js
async (page) => page.context().storageState({ path: 'infra/browser-state.json' })
```

## What to prefer

For testing Letterlock itself, prefer a TEMP account over this one (the testing
mandate in CLAUDE.md: maildrop.cc, then delete it afterwards with the QA cleanup
workflow). Use this session for things that genuinely need Suhaib's own identity:
the admin dashboard, his real profile, Google Cloud and Cloudflare consoles.
