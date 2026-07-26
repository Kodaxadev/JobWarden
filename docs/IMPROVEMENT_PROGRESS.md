# JobWarden — What Has Shipped Against the Audit

The running record of work done against [`IMPROVEMENT_AUDIT.md`](IMPROVEMENT_AUDIT.md), which
keeps its original wording so the tradeoffs stay visible even where they were later taken.
Section numbers (§1, §2…) refer to that file. Newest first would hide the arc, so this is in
shipping order: oldest pass at the top.

## Progress — shipped 2026-07-03 (SW v52→v58)

Most of the actionable list below is now done and verified (105 tests, eslint + `tsc --checkJs`
+ tests all green in CI):

- **✅ Photo downscaling on ingest** (~2000px, 80% smaller; seal hashes the stored bytes) + **Blob-built backups** (no more single megastring). §3, §8.
- **✅ Weekly-hours roll-up + daily-OT note** (seven 7-hour days now flags as a >40h week; CA daily OT >8h/>12h, exempt/AWS-aware). §2.
- **✅ Records filtering + month grouping + teaching empty state + scoped export** (filter to one employer → report exactly those). §6.
- **✅ eslint (flat) + JSDoc typedefs with `tsc --checkJs` on the domain layer, both in CI**; fixed the Date-coercion + cross-env Buffer issues the typecheck surfaced. §4, §9.
- **✅ Time-sanity validation warnings** (never blocking) + **overnight date convention** documented + hinted. §2.
- **✅ Statute-of-limitations nudge** on records older than ~2 years. §2.
- **✅ SW update toast + version + storage estimate in Settings**; **security headers + CSP on all pages** (microphone hard-blocked at the platform); **font preload**, **lazy thumbnails**. §4, §5, §8.
- **✅ Light theme** (opt-in; dark stays default; all text AA-verified). §6.
- **✅ Local error-log ring buffer + Settings diagnostics**; **one shared focus trap**. §9, §4.
- **✅ Landing answers "can my employer see it?"**. §1.

---

## Progress — shipped 2026-07-24 (SW v59→v67)

Second pass, aimed at durability, trust, and failure paths — plus the two catalog gaps a
California worker hits most often (198 tests, eslint + `tsc --checkJs` green, zero
vulnerabilities in the dependency tree, dev included):

- **✅ Passphrase-encrypted backup** (AES-256-GCM, PBKDF2-SHA256 310k, on-device key, no
  escrow, binary format so a photo-heavy archive never becomes a base64 megastring; header
  authenticated as AAD; hostile iteration counts refused). §5.
- **✅ DST-correct overnight time math** — the flat `+24h` wrap was an hour wrong across a
  transition, which moves meal deadlines and the >10h line. §2.
- **✅ Seal schema-evolution rule is now a gate**, not a comment: the blank record's sealed
  view is pinned and a golden content hash fails on any silent change to the view. §3.
- **✅ DB migration ladder** — append-only steps with the rules written down, version derived
  from the ladder length, steps proven re-run-safe. §3.
- **✅ The data layer has tests** (`fake-indexeddb`, devDependency only): sealing on write,
  soft delete/restore, restore-without-resealing, tamper detection, legacy hydration. §4.
- **✅ Offline-asset gate** — a test walks the real import graph and fails if a reachable
  module is missing from the SW cache list (the failure mode that is invisible in a tab). §4.
- **✅ The SW dev-loop friction is gone** — network-first + HTTP-cache bypass on localhost, so
  a plain reload runs the edit; `launch.json` cut from 37 one-shot servers to 2. §4, §9.
- **✅ CHANGELOG**, keyed on the SW cache id the user can read back in Settings. §9.
- **✅ Shift-alert honesty** — the panel and the landing page now say the reminder only fires
  while the app is open, and name the workaround. §1.
- **✅ Two light-theme contrast failures fixed** — the header mark (1.87:1) and the shift
  status (1.68:1) were inheriting light-mode ink on the permanently-navy surfaces. §6, §7.
- **✅ Findings for reported-but-undetailed issues** — a picked chip with no times now says so
  instead of producing nothing. §2.
- **✅ A failed save blocks instead of toasting**, explains the cause in plain words, and offers
  the drop-the-photos trade that keeps the facts. §3.
- **✅ Two of §2's catalog gaps closed**: reporting-time pay (IWC §5) and necessary work
  expenses (§2802), with matching rights-guide topics — and logged as new attorney-review
  surface in `LEGAL_FOUNDATION.md`, which now tables every legal claim the app makes. §2.
- **✅ Reading-level pass on the rights guide** (median grade 8.9 → 7.0, no sentence past 28
  words) — and the sentence ceiling is a test now, not a one-time cleanup. §7.
- **✅ Sub-12px metadata audit**: record content raised to 12.5px, issue labels to 12px; the
  10px wordmark stays, being a brand lockup rather than reading text. §6.
- **✅ House rules are CI checks**: the 400-line cap, no debug markers, zero runtime deps. §9.

## Progress — shipped 2026-07-25 (SW v85→v86)

The first app-wide visual-system pass is verified at phone widths in both themes. Issue
selection now uses five icon-led disclosures instead of sixteen equal-weight buttons.
Action cells, quick capture, record review, and edit mode now share hierarchy, labels,
icons, caution semantics, visible save actions, and unsaved-change protection.

**Still open after SW v86**: 🔴 attorney review (external), now the only public-launch
blocker; 🔴/🟠 **Spanish/i18n** — the string layer is a clean
refactor but the *legal-adjacent content must be human-translated*, so it's a dedicated
project, not an auto-translate. SW v84 closed the remaining structured California catalog
gaps in §2: split shifts, §226 pay stubs, tip problems, and paid-sick-leave action. Still
open are E2EE sync (a deliberate cut); Playwright in CI (the loop is verified by hand each
pass, but automating it needs a browser runner); trusted timestamping (OpenTimestamps);
per-record *checkbox*
selection (the filter-scoped export covers the main use case); a real screen-reader pass on a
budget Android. The shield-and-check logo rework was completed in `jobwarden-v81`, with
one canonical vector source now driving the header and generated PWA icons.

## Progress — shipped 2026-07-26 (SW v103)

A hardening pass aimed at what the earlier passes had not thought to look at: the deployed
artifact, the destructive path, and the things that only misbehave in production (311 tests,
eslint + `tsc --checkJs` green).

- **🔴 A production-only service-worker defect, found and fixed.** The worker precached the site
  root. Production redirects `/` to the landing page, so the cached entry was a *redirected*
  response — and a browser answering a navigation from one of those returns a network error, not
  a page. The bare domain would have failed for every returning visitor, online as much as off,
  and localhost has no redirect, so nothing in development could show it. The install also
  fetches past the browser's HTTP cache now, closing the classic PWA failure where a new build
  installs the previous build's files. §4.
- **✅ The service worker has behaviour tests** (`tests/serviceWorkerRuntime.test.mjs`): install,
  activate, cache-first, the three offline navigation fallbacks, non-GET pass-through, the
  localhost dev path, the version reply — driven against stub globals. It was the most dangerous
  untested file in the repo: its mistakes reach everyone at once and survive a reinstall. Part of
  §4's "test suite is domain-only".
- **✅ Permanent deletion exists.** Move-to-Deleted is recoverable by design, so nothing in the
  app could actually destroy a record; the only route was the browser's own site-settings screen,
  which is not a real option for someone about to hand the phone to a manager. Now **Delete
  forever** per record, and **Erase everything on this phone** in Settings (records, photos,
  settings, diagnostics log, running shift → back to first-run state). One dialog, not a
  gauntlet, because whoever reaches for it may be in a hurry; what makes it safe is that it
  counts what will go, opens focused on Cancel, and labels the confirm button with the act. A gap
  none of the audit's sections had named.
- **✅ Restore refuses records it cannot safely store.** A backup file is untrusted input: a
  wrong-typed `incidentDate` breaks the list sort and a non-array `types` breaks every screen —
  after the bad record is saved, so a reload does not fix it. Invalid records are now counted and
  reported rather than dropped in silence. §3.
- **✅ The deployed web surface exists at all**: canonical URLs, Open Graph/Twitter tags (this
  product travels by one worker texting another, and was arriving as a bare link), `robots.txt`,
  a sitemap, `noindex` on the app shell so search lands on the page that explains the tool, and
  the iOS home-screen metas. §1's discovery gap, at the cheap end.
- **✅ Two things the light theme was giving away as an afterthought**: the app opened dark and
  snapped to light once the database answered (the preference is mirrored where a `<head>` module
  can paint it before the first paint), and the phone's status bar stayed black above a cream
  header (`theme-color` tracks the theme now). §6.
- **✅ An iOS-only layout defect**: `.app-header` added `safe-area-inset-top` to its **bottom**
  padding, so installed to an iPhone the brand row sat under the status bar. Invisible anywhere
  the inset is 0, which is why it survived. §6.
- **✅ Records and Export stopped reading the store twice** and re-running the rules engine over
  every record twice per render; `countIncidents` stopped hydrating and analyzing every record
  just to produce a number. §8.
- **✅ The CHANGELOG is honest again.** v92–v102 shipped with no entries, in a file whose whole
  purpose is resolving the build id a user reads back to you. Backfilled; it now rolls into
  `CHANGELOG-ARCHIVE.md` at the line cap instead of drifting. §9.

## Progress — shipped 2026-07-26 (SW v104)

Second hardening pass, into the areas the first one did not reach: the capture path, the crypto
and export modules, the aggregate engine, and what happens when storage refuses (333 tests,
eslint + `tsc --checkJs` green). Five of these are ways the app could write the wrong thing, or
nothing, without saying so.

- **🔴 A double-tap on Save wrote the record twice.** Sealing hashes every attached photo before
  the write, so the window is long on a budget phone, and each tap re-ran `createIncident()` and
  minted a NEW id — so both writes landed and nothing afterwards could tell the two records
  apart. Both capture paths now hold a guard across the whole attempt (the Log screen opens a
  confirm dialog mid-save, so a disabled button alone is not enough) and show the write in
  progress. Verified in a browser: three rapid clicks, one record. §2's "bad input flows straight
  into sealed evidence", from a direction that section did not consider.
- **🔴 A database that would not open left a blank app.** It was a toast; toasts vanish, and the
  empty shell behind it still accepts typing. The causes are ordinary for this audience — a
  private window, "block all cookies", a locked-down work phone. `js/ui/storageUnavailable.js`
  now says the app cannot save here, names the cause, offers a retry, and promises nothing about
  deletion. Wired to both failure points: the open, and a first read that fails after a clean
  open (which used to be an unhandled rejection). §9.
- **🟠 Overlapping settings saves overwrote each other.** `saveSettings` read, then wrote, outside
  a transaction — so the theme (saved on pick) and a "Save settings" tap landing together dropped
  whichever lost. Marking a backup done raced identically, and losing that revives the overdue
  banner. Now one transaction; the test fails against the old code. §3.
- **🟠 Every export filename was dated in UTC** — `toISOString().slice(0,10)` — so in California
  an evening backup was stamped tomorrow, and "which backup is newest" is read off those names.
  It now uses the same local-date helper the rest of the app does. Pinned by a test that probes
  two timezones in child processes, because an in-process check only catches it half the day. §3.
- **🟠 Weekly overtime ignored which employer the hours came from.** The roll-up sums a
  Sunday–Saturday week across every record; overtime is owed per employer, and two hourly jobs is
  ordinary in this audience — 25 hours at one place plus 20 at another is not a five-hour overtime
  week. Flagged weeks now report the workplaces they drew on, and say so when there is more than
  one. Bucketing by workplace instead would be its own error (one employer, several sites), so the
  app names the assumption rather than guessing. Both surfaces that print the number now take the
  caveat from `disclaimers.js` instead of each hand-writing one. §2.
- **✅ The one outbound evidence link is honest.** A record with a location had a link labelled
  "map" that hands those coordinates to Google — the only thing in the app that sends recorded
  evidence anywhere. It now says "open in Google Maps", carries `noreferrer` like every other
  outbound link (it was the one that did not), and is listed in the privacy policy's account of
  when data leaves the phone. §5.
- **✅ `style-src 'unsafe-inline'` is documented as load-bearing.** Nothing in the app uses an
  inline style, so it reads like something to tighten — but the printable documents are written
  into a popup that inherits the app's policy, and their stylesheet is an inline `<style>`.
  Tightening it would render printed evidence, the thing a worker hands a lawyer, as unstyled
  text. Now commented and pinned by a test that also proves the app has no inline styles. §5.
- **✅ A photo that fails to attach in the quick sheet is reported** rather than just not
  appearing, and one bad file no longer takes the rest of the selection down with it. The Log
  screen already did this. §2.

## Progress — shipped 2026-07-26 (SW v105)

A frontend craft pass on depth, lighting and micro-interactions, run against DESIGN.md's own named
rules rather than taste (342 tests, eslint + `tsc --checkJs` green).

- **✅ The interaction states are tokenized.** Surfaces, shadows, spacing, type and motion each had
  a scale; the states did not, so the app shipped seven press washes (.045–.06), three hover washes
  and four press-inset depths, plus two controls that faded (`opacity: .7`) instead of pressing.
  Five tokens now carry both halves of the Press-Rises / Data-Sinks Rule — `--wash-hover`,
  `--wash-press`, `--press-drop`, `--press-sink`/`-sm`, `--recess`/`--recess-field` — and every
  control routes through them. Same class of drift as the pre-token type scale in §6.
- **🟠 …which fixes an invisible-hover bug in daylight.** A white 3% wash cannot be seen on cream,
  so light-theme interaction tints were patched selector by selector, and every control the list
  missed had no visible hover or press at all in the light theme: the Export and Settings action
  cells, the issue choices, the group heads, the back button. Overriding the tokens covers every
  pressable at once. Measured: hover now shifts the surface by 7 levels and press by 13, from ~1.
- **✅ Disclosures open instead of appearing.** Adaptive disclosure is the product's central
  pattern and every caret already rotated on the shared curve, but the panel it pointed at was
  simply there. All eight disclosures share one keyframe now, including the record row (which
  toggles `hidden` and cannot transition). Deliberately NOT a height-to-`auto` transition under
  `overflow: hidden`: wherever the timeline does not advance — print, a paused renderer, a browser
  without `::details-content` — that leaves a panel clipped around content that is really there.
  Written up as the **Reveal-Never-Hides Rule** in DESIGN.md §4.
- **✅ The active-tab indicator travels** rather than teleporting between per-tab marks — the one
  state change in the app with no motion, on the most-used control. One marker on the fascia,
  identical at rest, transform-only, driven by a `--tab-i` custom property.
- **✅ Two surface inconsistencies closed**: an open issue group borrowed the hover wash, so a
  hovered group and an open one rendered identically (it reads as a sunk container now); and the
  edit-history and Deleted drawers were the last two disclosures drawing the browser's own
  triangle, in a codebase that spends a whole section of `tokens.css` removing exactly that kind of
  UA tell.
- **✅ DESIGN.md's frontmatter caught up with its prose.** The light theme was documented in §2 but
  never listed in the machine-readable frontmatter, so tooling reading it scored every daylight
  value as palette drift. The 21 light tokens and the new interaction-lighting vocabulary are both
  documented now.

**Still open after v104**: 🔴 attorney review (external, unchanged, still the only launch
blocker); 🔴/🟠 Spanish/i18n; a 1200×630 social card — the shield tile stands in, because the
vendored resvg build cannot read woff2 and a generated card would have shipped with no type;
Playwright in CI; trusted timestamping; E2EE sync (a deliberate cut); a real screen-reader pass
on a budget Android. One design finding left for the owner rather than changed unasked:
`landing.html` runs two numbering systems at once — `section-number` eyebrows ("01 / Record")
wrapping steps numbered "01 02 03".
