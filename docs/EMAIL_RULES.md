# 📧 Email rules (Resend), and how to stay out of Gmail's Promotions tab

**Written 2026-09-08** after the day-1 backup email landed in Suhaib's **Promotions** tab.
**Read this before touching any code that sends email.** Every sender in this repo must
follow it: `apps/api/src/mail/mail.service.ts`, `.github/workflows/notify.yml`,
`.github/workflows/backup-watch.yml`, `.github/workflows/supabase-retirement-reminder.yml`.

Sources: Resend's own deliverability docs (via Context7), Resend's Gmail/Yahoo 2024 bulk-sender
post, and Gmail tab-classification write-ups from Mailjet, Litmus and WP Mail SMTP.

---

## 0. The one thing to understand first

**Gmail's tab choice is not a setting you can send.** There is no header that says "put me in
Primary". It is a classifier, and it weights **per-recipient behaviour** above everything the
sender does. So the rules below are split honestly:

| | What it is |
|---|---|
| **§1 Deterministic** | A Gmail filter on the recipient's side. This is the only 100% guarantee |
| **§2 Sender rules** | What we control. Strong signals, not guarantees. Non-negotiable in this repo |
| **§3 Never do** | Things that actively push mail into Promotions |

---

## 1. ✅ The deterministic fix (recipient side, once)

For an address we own and care about, do not rely on the classifier at all:

1. Gmail → ⚙️ → **See all settings** → **Filters and Blocked Addresses** → **Create a new filter**
2. `From:` `ops@mail.raltech.dev` (or `@mail.raltech.dev` for everything we send)
3. Create filter, then tick **Categorise as: Primary** and **Never send it to Spam**
4. Also: open one of the emails, ⋮ → **Add to Contacts**. A contact sender is a heavy Primary signal

Dragging one message to Primary and answering **"Do this for future messages?"** with yes does
most of the same job, but the filter is the version that cannot drift.

---

## 1b. ⚠️ The finding from round two: for a notification, send NO HTML at all

Adding a plain-text part beside the HTML was not enough. The next email still landed in
Promotions. Two reasons, and both matter:

1. **Any HTML part at all is a promotional signal for this kind of mail.** A styled `<div>`, a
   `<table>` of figures and a `<pre>` block read as a template even with zero images. A
   `text/plain`-only message has nothing to classify as a template.
2. **Gmail learns per sender, per recipient.** Once a few messages from an address have been
   filed under Promotions, later ones inherit that, whatever the new message looks like. No
   sender-side change can undo it. **Only the recipient can**, by moving one message to Primary
   or setting the filter in §1.

So the rule for anything whose job is to *tell you something*, as opposed to a product email a
user expects to look designed:

> **Send `text` only. Omit `html` entirely.**

`notify.yml`, `backup-watch.yml` and the Supabase reminder are all text-only now. The OTP mail keeps its HTML,
deliberately: it is a product email, its HTML is already minimal with no images and no links,
and iOS and Gmail read the code out of the HTML `<title>` for auto-fill.

## 2. 🔒 Sender rules, mandatory for every Resend send in this repo

| # | Rule | Why |
|---|---|---|
| 1 | **Always send a `text` part. For notification mail, send text ONLY, no `html`** | HTML-only is one of the strongest "this is a template blast" signals. A `multipart/alternative` message reads as person-to-person. This is the single biggest lever we control |
| 2 | **Set a unique `X-Entity-Ref-ID` header per message** | Stops Gmail collapsing repeat notifications into one bulk thread, and marks the mail as entity-specific rather than a campaign |
| 3 | **Set a real `reply_to` that a human reads** | A sender nobody can answer looks like a broadcast |
| 4 | **Use `/emails`, never `/broadcasts`** | `/broadcasts` is Resend's marketing pipe and carries marketing headers by design. Everything we send is transactional |
| 5 | **Local part must not read like marketing** | `ops@`, `alerts@`, `no-reply@` are fine. `news@`, `promo@`, `hello@`, `offers@`, `reminders@` skew promotional. We moved from `reminders@` to `ops@` for exactly this |
| 6 | **No images at all**, and certainly no banner or logo image | A wall of graphics is the classic Promotions trigger. Text and a plain table only |
| 7 | **Keep links to a handful**, and only ones the reader needs | Link density is a scored signal. Header links, footer links and social icons are what marketing mail looks like |
| 8 | **No `List-Unsubscribe` on transactional mail** | Required for bulk sending, and a *reliable Promotions signal*. Our mail is triggered by an event, not subscribed to, so it must not carry it |
| 9 | **Open and click tracking OFF** on the sending domain | Tracking is a 1×1 pixel plus rewritten links through a tracking subdomain, and both read as marketing. Check Resend → Domains → the domain → Open/Click tracking |
| 10 | **Specific, non-salesy subject lines** | "Letterlock backups: one week in, all good" is fine. Anything with free, offer, deal, %, ALL CAPS or an emoji at the front is not |
| 11 | **SPF, DKIM and DMARC all verified** in Resend → Domains | Table stakes. Without them the question is the spam folder, not the tab |
| 12 | **Sensible volume from a warm domain** | Nine identical sends in one minute while testing is a bulk pattern. Use a `dry_run`-style flag or one real send, not a loop |

### The minimum correct Resend payload

```jsonc
{
  "from": "Letterlock server <ops@mail.raltech.dev>",
  "to": ["…"],
  "subject": "specific, factual, no marketing words",
  "text": "the whole message, as plain text",         // rule 1: NO html field
  "reply_to": "a mailbox a human reads",               // rule 3
  "headers": { "X-Entity-Ref-ID": "<uuid per send>" }  // rule 2
}
```

The workflows build that text with a heredoc and then strip the YAML block indent, so the mail
is not one long indented blob:

```bash
TEXT=$(cat <<TEXTEOF
          …lines…
TEXTEOF
)
TEXT=$(printf %s "$TEXT" | sed -e 's/^          //')
```

`apps/api/src/mail/mail.service.ts` (the OTP mail) already followed all of this before this doc
existed: separate `otpText()`, no images, no links, `X-Entity-Ref-ID`, a `replyTo`. **Do not
"improve" it with a logo, a banner or a marketing footer.** An OTP in the Promotions tab means
players cannot sign in.

---

## 3. 🚫 Never do these

- Ship an HTML-only email with no `text` part, or add an `html` part to a notification email
- Add a logo, hero image, product image or social icons
- Add `List-Unsubscribe` to transactional mail
- Turn on open or click tracking for a transactional domain
- Send from `news@`, `promo@`, `offers@` or `marketing@`
- Route anything in this repo through `/broadcasts`
- Use a subject with a discount, a percentage, ALL CAPS or a leading emoji
- Reuse one `X-Entity-Ref-ID` across sends
- Loop the send while debugging. Test the *build* of the payload, send once

---

## 4. Change log

- **2026-09-08 (round two):** a text part alongside the HTML was NOT enough, the next email still
  landed in Promotions. All three senders (`notify.yml`, `backup-watch.yml`, the Supabase reminder) are now **text-only** (no `html`
  field at all) and send as `Letterlock server`. Added §1b: any HTML part is a signal for
  notification mail, and Gmail's per-sender history cannot be undone from the sending side.
- **2026-09-08:** written after the day-1 backup email landed in Promotions. All three workflow
  senders gained a `text` part, a unique `X-Entity-Ref-ID`, a real `reply_to`, and moved from
  `reminders@mail.raltech.dev` to `ops@mail.raltech.dev`. The API's OTP mail already complied.
