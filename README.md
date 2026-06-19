# JobWarden

A private, offline-first PWA for logging California meal/rest-break and wage infractions **the moment they happen** — built for in-the-moment capture on a phone, review and export on any device.

For California hourly workers — meal/rest-break timing (§512, §226.7), off-the-clock work, and adverse action after speaking up. Captures **facts, not legal conclusions**; not legal advice.

## Privacy model (read this)
- **All data stays in the browser on the device** (IndexedDB). Nothing is sent to any server. There is no account, no tracking, no network call.
- Hosting the *app code* (to install it on a phone) does **not** upload her *records* — the records never leave the device unless she taps Export.
- **Back up often.** Local-only means a lost/wiped phone = lost evidence. The app nags you after 7 days. Email the JSON backup to yourself so a copy lives off-device.

## How to run it
ES modules + the service worker require it to be served over `http(s)` — double-clicking `index.html` will **not** work.

**Local (desktop, quick look):**
```bash
cd JobWarden
python3 -m http.server 8099
# open http://localhost:8099
```

**On her phone (the real use case):** host the folder on any free static HTTPS host (Netlify drop, GitHub Pages, Vercel — the static files only, no backend). Open the URL on her phone → browser menu → **Add to Home Screen**. It installs as an app and works fully offline afterward. The data she enters stays on her phone.

## Using it
- **Log** — tap the issue type(s), times prefill to *now* (one-tap "Now" buttons), add the lunch/clock details that appear, capture GPS + photos (timeclock, paystub, manager texts), write what happened in plain facts. Save in seconds.
- **Records** — every entry, newest first, with the computed findings (e.g. "Meal began after the 5th hour"). Tap to expand, edit, or delete. Edits are logged; the original `createdAt` never changes (contemporaneity).
- **Export** — JSON backup (full, with photos), CSV (spreadsheet), or a printable **PDF report** to hand to the Labor Commissioner, an attorney, or HR.
- **Settings** — name, role, pay type (flags exempt-status caveats), employer, and workplace list.

## What it does NOT do (by design)
- **No dollar/damage math.** Premium pay is the "regular rate" (incl. bonuses/commissions) — getting that wrong hurts credibility. The app records the inputs; let DLSE/counsel compute. (Research doc §1.3, stress-test #8.)
- **No audio recording.** California is all-party-consent (Penal Code §632); covert recording can be a crime. (Stress-test #5.)
- **No cloud sync.** Privacy and longevity over convenience. (Decision log in research doc §4.)

## Architecture (for maintainers)
Vanilla ES modules, no build step, no runtime dependencies. One concern per file, every source file under the 400-line cap.

```
index.html · manifest.webmanifest · service-worker.js · css/styles.css
js/
  app.js                     bootstrap + view routing
  config/infractionTypes.js  type catalog + field map + 1-line legal refs
  domain/  timeUtils · breakRules (meal/rest/2nd-meal/waiver/off-clock logic) · incidentModel (schema, edit-diff, soft-delete)
  data/    db (IndexedDB) · incidentRepo · settingsRepo
  capture/ captureForm · captureFields · geo · media
  ui/      dom · incidentList · exportView · settingsView
  export/  download · exportJson · exportCsv · exportReport · backup
tests/     breakRules · incidentModel · exportCsv   (Node built-in runner)
```

### Tests
Rule-engine and export logic are covered by committed tests under `tests/` — no dependencies, using Node's built-in runner:

```bash
npm test          # alias for: node --test
```

They cover meal timing, first/second-meal waivers (valid vs. invalid), the >10h second-meal requirement, off-the-clock minutes, the exempt caveat, legacy-record hydration, the edit-diff/soft-delete audit trail, CSV formula-injection neutralization (CWE-1236), and a plain-language copy guard. 21 tests at last run. After changing any cached asset, bump `CACHE` in `service-worker.js` so installed clients update.

## Design
JobWarden uses the Evidence Trail Field Log UI: plain-language steps, rugged dark surfaces, local-only privacy copy, and offline-safe icons generated from `lucide-static`.

## Disclaimer
Not legal advice. A self-kept log is structured testimony, not automatic proof. Its strength comes from being contemporaneous, factual, and corroborated (timeclock/paystub photos, manager texts). Confirm classification and strategy with an employment attorney or the CA Labor Commissioner.
