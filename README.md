# JobWarden

[![tests](https://github.com/Kodaxadev/JobWarden/actions/workflows/test.yml/badge.svg)](https://github.com/Kodaxadev/JobWarden/actions/workflows/test.yml)

A private, offline-first PWA for documenting California wage-and-hour problems **the moment they happen** — fast capture on a phone, review and export on any device. Built for hourly workers; it currently covers **California** rules, with more states planned.

It records **facts, not legal conclusions** — meal/rest-break timing (§512, §226.7), off-the-clock work, on-duty meals, final-pay timing (§§201–203), and adverse action after speaking up. It is **not legal advice**.

Live: <https://jobwarden.kodaxa.dev>

## Privacy model (read this)
- **All data stays in the browser on the device** (IndexedDB). Nothing is sent to any server. No account, no tracking, no analytics, no network calls.
- Hosting the *app code* (so it can be installed) does **not** upload anyone's *records* — records never leave the device unless the user taps Export / Email / Print / Share.
- **No audio recording** — California is all-party-consent (Penal Code §632); covert recording can be a crime.
- **Back up often.** Local-only means a lost or wiped phone loses the records. The app nags after 7 days; "Email to myself" or "Save full backup" keeps a copy off-device, and "Restore from a backup" brings it back.

## How to run it
ES modules + the service worker require serving over `http(s)` — double-clicking `index.html` will **not** work.

**Local (desktop, quick look):**
```bash
cd JobWarden
python3 -m http.server 8099
# open http://localhost:8099
```

**Install on a phone:** deploy the static files to any HTTPS static host (Vercel, Netlify, GitHub Pages — static only, no backend). Open the URL on the phone → browser menu → **Add to Home Screen**. It installs as an app and works fully offline; the entered data stays on the phone. `install.html` is an in-app marketing + install guide.

## Using it
- **Log** — pick *what happened*; the form then asks **only** for the details those issues need (hours, lunch, rest, unpaid work, final pay, what happened after you spoke up), each with a one-line "why," and the rest tucked behind "More details." Add GPS + photos (timeclock, paystub, manager texts) and write plain facts. Also here: a live **shift tracker** (start a shift → get meal-deadline alerts) and a **Quick log** for capturing an interrupted lunch in seconds.
- **Records** — every entry, newest first, with the computed findings and a tamper-evident SHA-256 fingerprint seal, plus an at-a-glance pattern roll-up (e.g. "lunch interrupted 4× — Manager (3)"). Expand to edit, delete, or duplicate; edits are logged and the original `createdAt` never changes (contemporaneity).
- **Export** — Email to myself (summary + backup file), full JSON backup (with photos), CSV spreadsheet, a printable **PDF report**, a one-page **pattern summary**, and **Restore from a backup**.
- **Settings** — profile (name, role, employer, pay type); schedule & coverage (alternative workweek / union contract, so findings don't overstate); workplaces; a **"Know your rights"** offline California guide; a **"Legal & privacy"** disclosure; and a storage-protection toggle.

## What it does NOT do (by design)
- **No dollar/damage math.** Premium pay turns on the "regular rate" (incl. bonuses/commissions) — getting that wrong hurts credibility. The app records the inputs; let DLSE/counsel compute.
- **No audio recording.** California is all-party-consent (Penal Code §632).
- **No cloud sync, no account.** Local-first by design — it is the privacy model *and* the trust model.
- **No legal advice or filings.** General information plus the user's own records — not the practice of law. See [`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md).

## Architecture (for maintainers)
Vanilla ES modules, no build step, no runtime dependencies. One concern per file, every source file under the 400-line cap. The evidence engine (capture, model, integrity, patterns, export) is jurisdiction-agnostic; per-state **rules** live behind a thin seam (`config/jurisdictions.js`, `domain/breakRules.js`).

```
index.html · install.html · manifest.webmanifest · service-worker.js
css/   styles · tokens · shell · forms · records
js/
  app.js                       bootstrap · view routing · app-wide shift-alert monitor
  config/  infractionTypes (type catalog + field map) · uiCopy · jurisdictions
  domain/  timeUtils · breakRules (meal/rest/2nd-meal/waiver/off-clock/on-duty/final-pay) ·
           incidentModel (schema, edit-diff, soft-delete) · integrity (SHA-256 content+record seals) ·
           patterns (aggregate roll-ups) · shiftClock (live shift math)
  data/    db (IndexedDB) · incidentRepo · settingsRepo · shiftRepo (active shift)
  capture/ captureForm · captureFields · quickCapture (interrupted-lunch) · geo · media
  ui/      dom · icons · onboarding · incidentList · exportView · settingsView ·
           shiftPanel · rightsFaq · legalView
  export/  download · exportJson · exportCsv · exportReport · exportSummary ·
           reportBrand · emailExport · importBackup · backup
tests/     Node built-in runner — 60 tests
docs/      LEGAL_FOUNDATION.md · superpowers/plans/ (design + Phase 3 plan)
scripts/   build-app-icons.mjs (SVG → PNG app icons)
```

### Tests
Rule-engine and export logic are covered by committed tests under `tests/`, no dependencies, using Node's built-in runner:

```bash
npm test          # alias for: node --test
```

The suite (**60 tests** at last run) covers meal timing and waivers, the >10h second-meal rule, on-duty-meal agreements, final-pay/waiting-time timing, off-the-clock minutes, the exempt/AWS/CBA caveats, content + record hashing and verification, the pattern + interruption roll-ups, the live shift clock, the quick-capture draft, email summary + backup import round-trips, CSV formula-injection neutralization (CWE-1236), and a plain-language copy guard. After changing any cached asset, bump `CACHE` in `service-worker.js` so installed clients update.

## Design
The "Field Log" UI: plain-language, navy-and-gold "legal authority" branding on a dark canvas, self-hosted fonts (Geist / Geist Mono / Cinzel), offline-safe icons from `lucide-static`, and WCAG 2.1 AA contrast/structure.

## Disclaimer
Not legal advice. A self-kept log is structured testimony, not automatic proof — its strength comes from being contemporaneous, factual, and corroborated (timeclock/paystub photos, manager texts). Confirm classification and strategy with an employment attorney or the California Labor Commissioner.
