# JobWarden

[![tests](https://github.com/Kodaxadev/JobWarden/actions/workflows/test.yml/badge.svg)](https://github.com/Kodaxadev/JobWarden/actions/workflows/test.yml)

A private, offline-first PWA for documenting California wage-and-hour problems **the moment they happen** — fast capture on a phone, review and export on any device. Built for hourly workers; it currently covers **California** rules, with more states planned.

It records **facts, not legal conclusions** — meal/rest-break timing (§512, §226.7), off-the-clock work, on-duty meals, reporting-time pay when you're sent home early (IWC §5), work expenses you paid for yourself (§2802), final-pay timing (§§201–203), and adverse action after speaking up. It is **not legal advice**.

Preview: <https://jobwarden.kodaxa.dev> — made by **Kodaxa Innovations** ([kodaxa.dev](https://kodaxa.dev)), an independent developer, not a company and not a law firm. Contact: <Justin@Kodaxa.dev>.

> **Not cleared for public launch.** One blocker remains: review of the findings language and UPL posture by a licensed California employment attorney. See [`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md).

## Privacy model (read this)
- **All data stays in the browser on the device** (IndexedDB). Nothing is sent to any server. No account, no tracking, no analytics, no network calls.
- Hosting the *app code* (so it can be installed) does **not** upload anyone's *records* — records never leave the device unless the user taps Export / Email / Print / Share.
- **No audio recording** — California is all-party-consent (Penal Code §632); covert recording can be a crime.
- **Back up often.** Local-only means a lost or wiped phone loses the records. The app nags after 7 days; "Email to myself" or "Save full backup" keeps a copy off-device, and "Restore from a backup" brings it back.
- **A plain backup is readable by anyone who opens it** — that is what makes it restorable. Since the usual way it leaves the phone is an email to yourself, **"Save locked backup"** encrypts it with a passphrase (AES-256-GCM, PBKDF2-SHA256 at 310k iterations, key derived on-device). Nothing is escrowed: a lost passphrase means the file cannot be opened by anyone.

## How to run it
ES modules + the service worker require serving over `http(s)` — double-clicking `index.html` will **not** work.

**Local (desktop, quick look):**
```bash
python3 -m http.server 8099
```
Then open <http://localhost:8099>. On localhost the service worker deliberately goes
network-first and bypasses the HTTP cache, so a plain reload runs whatever you just
edited — no version bump, no fresh port. In production it stays cache-first, because
offline is the point.

**Install on a phone:** deploy the static files to any HTTPS static host (Vercel, Netlify, GitHub Pages — static only, no backend). Open the URL on the phone → browser menu → **Add to Home Screen**. It installs as an app and works fully offline; the entered data stays on the phone. `install.html` is an in-app marketing + install guide.

## Using it
- **Log** — pick *what happened*; the form then asks **only** for the details those issues need (hours, lunch, rest, unpaid work, the shift you were scheduled for, what you paid for out of pocket, final pay, what happened after you spoke up), each with a one-line "why," and the rest tucked behind "More details." Add GPS + photos (timeclock, paystub, manager texts) and write plain facts. Also here: a live **shift tracker** (start a shift → get meal-deadline alerts, *while the app is open* — a closed PWA can't fire one without a server, and the panel says so) and a **Quick log** for capturing an interrupted lunch in seconds.
- **Records** — every entry, newest first, with the computed findings and a tamper-evident SHA-256 fingerprint seal, plus an at-a-glance pattern roll-up (e.g. "lunch interrupted 4× — Manager (3)"). Expand to edit, delete, or duplicate; edits are logged and the original `createdAt` never changes (contemporaneity).
- **Export** — Email to myself (summary + backup file), full JSON backup (with photos), a **passphrase-locked backup**, CSV spreadsheet, a printable **PDF report**, a one-page **pattern summary**, and **Restore from a backup** (plain or locked).
- **Settings** — profile (name, role, employer, pay type); schedule & coverage (alternative workweek / union contract, so findings don't overstate); workplaces; a **"Know your rights"** offline California guide; a **"Legal & privacy"** disclosure; and a storage-protection toggle.

## What it does NOT do (by design)
- **No dollar/damage math.** Premium pay turns on the "regular rate" (incl. bonuses/commissions) — getting that wrong hurts credibility. The app records the inputs; let DLSE/counsel compute.
- **No audio recording.** California is all-party-consent (Penal Code §632).
- **No cloud sync, no account.** Local-first by design — it is the privacy model *and* the trust model.
- **No legal advice or filings.** General information plus the user's own records — not the practice of law. See [`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md).

## Architecture (for maintainers)
Vanilla ES modules, no build step, no runtime dependencies. One concern per file, every source file under the 400-line cap. The evidence engine (capture, model, integrity, patterns, export) is jurisdiction-agnostic; per-state **rules** live behind a thin seam — `js/rules/index.js` (`getRules` dispatch + merged finding labels) over `js/rules/california.js` and `js/rules/newYork.js` (draft, attorney-gated), scoped by `config/jurisdictions.js`.

```
index.html · install.html · manifest.webmanifest · service-worker.js
css/   styles · tokens · shell · forms · records
js/
  app.js · installPage.js · version.js   bootstrap · routing · shift-alert monitor · SW version query
  config/  infractionTypes (type catalog + field map) · uiCopy · jurisdictions ·
           disclaimers (the one place that says what this is and is not)
  rules/   index (getRules dispatch + finding labels) · california · newYork (draft)
  domain/  types (JSDoc typedefs) · timeUtils · breakRules (meal/rest/2nd-meal/waiver/off-clock/on-duty/
           final-pay/daily-OT/reporting-time/expenses) · incidentModel (schema, edit-diff,
           soft-delete, sanity warnings) · integrity (versioned SHA-256 content+record seals) ·
           patterns (roll-ups + weekly OT) · shiftClock
  data/    db (IndexedDB + append-only migration ladder) · incidentRepo · settingsRepo · shiftRepo ·
           errorLog (local ring buffer)
  capture/ captureForm · captureFields · quickCapture (interrupted-lunch) · geo · media (downscale on ingest)
  ui/      dom (el + shared focus trap) · icons · theme (dark/light/system) · onboarding · incidentList
           (filter/group/scoped-export) · exportView · settingsView · shiftPanel · rightsFaq · legalView ·
           passphraseDialog (locked backups)
  export/  download · exportJson (Blob backups) · backupCrypto (AES-GCM passphrase lock) · exportCsv ·
           exportReport · exportSummary · reportBrand (paper mode) · emailExport · importBackup · backup
tests/     Node built-in runner — 220 tests
docs/      LEGAL_FOUNDATION.md · IMPROVEMENT_AUDIT.md · superpowers/plans/ (design + Phase 3 plan)
scripts/   build-app-icons.mjs (SVG → PNG app icons) · build-icons.mjs (Lucide → js/ui/icons.js)
CHANGELOG.md   keyed on the service-worker cache id shown in Settings → About
```

### Tests
Committed tests under `tests/`, using Node's built-in runner. The app ships **zero runtime dependencies**; the only test-time dependency is `fake-indexeddb`, which lets the storage layer run outside a browser.

```bash
npm test          # alias for: node --test
```

The suite (**220 tests** at last run) covers:

- **Rules** — meal timing and waivers (measured in hours *worked*), the >10h second-meal rule, reporting-time pay (the less-than-half-the-scheduled-shift trigger, with the unpaid meal netted out first), §2802 work expenses, picked-issue assertions (a chip alone produces its finding, and a chip with no times produces a *reported* finding rather than silence), daily + weekly overtime roll-ups, on-duty-meal agreements, final-pay/waiting-time timing, off-the-clock minutes, the exempt/AWS/CBA caveats, non-blocking time-sanity warnings, and the New York draft set (noon/evening/night §162 windows, overnight shifts).
- **Time** — DST-correct overnight spans (a 10pm–6am shift is 7h on spring-forward, 9h on fall-back), and the null-in/null-out edges.
- **Integrity** — versioned content + record sealing, legacy-seal survival across schema growth, finalPay tamper detection, and a **seal contract** gate: the blank record's sealed view and a golden content hash are pinned, so the view cannot change without a deliberate `SEAL_VERSION` bump.
- **Storage** — the incident and settings repos against `fake-indexeddb`: sealing on write, soft delete and restore, restore-without-resealing, tamper detection on read, legacy hydration, and the migration ladder (steps are re-run-safe; the version is the ladder length).
- **Export** — email summary + backup build/import round-trips, CSV formula-injection neutralization (CWE-1236), and the locked backup (round-trip, wrong passphrase, edited ciphertext, edited header, absurd-iteration refusal, and a check that no plaintext leaks into the file).
- **Framing** — every user-facing string is scanned for words that assert what the app cannot know ("proof", "your case", "guarantee"), and fails unless the sentence is disclaiming them; both printable documents must carry the "whose account is this" preamble *before* the first record; no finding note may state a conclusion or a dollar figure; the rights guide must describe rules rather than tell a reader what they personally are owed.
- **Imports** — every named import across the reachable module graph must resolve to a real export in the target (a UI module importing a symbol nobody exports is a blank screen and a green suite).
- **Failure paths** — every storage-write failure (full phone, blocked/private-mode storage, a second tab holding the database, the unknown case) maps to a message that says the record was *not* saved and what to do next, and cannot be made to throw by any junk passed to it.
- **Print** — both printable documents are built from a record whose every free-text field carries a script payload; no tag, event handler, or `javascript:` URL survives, and each document declares its own `script-src 'none'` policy.
- **Shell** — an offline-asset gate that walks the real import graph and fails if a reachable module is missing from the service worker's cache list, the icon build pipeline, a plain-language copy guard (banned jargon *and* a 28-word sentence ceiling on the rights guide), and repo hygiene: the 400-line cap, no debug markers, zero runtime dependencies.

Lint (`npm run lint`) and type-check (`npm run typecheck`, JSDoc + `tsc --checkJs` over the domain layer) run alongside tests in CI. After changing any cached asset, bump `CACHE` in `service-worker.js` so installed clients update — and note it in [`CHANGELOG.md`](CHANGELOG.md), which is keyed on that same string.

## Design
The "Field Log" UI: plain-language, navy-and-gold "legal authority" branding on a dark canvas, self-hosted fonts (Geist / Geist Mono / Cinzel), offline-safe icons from `lucide-static`, and WCAG 2.1 AA contrast/structure.

## Disclaimer
Not legal advice. A self-kept log is structured testimony, not automatic proof — its strength comes from being contemporaneous, factual, and corroborated (timeclock/paystub photos, manager texts). Confirm classification and strategy with an employment attorney or the California Labor Commissioner.
