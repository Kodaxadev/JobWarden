# Changelog

Versions are the service-worker cache id (`jobwarden-vNN`), shown in **Settings → About**.
That string is the only build identifier a user can read back to you, so it is what this
file is keyed on. Newest first.

This project has not had a public production launch — see
[`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md) for what is still blocking one.

## v89 — 2026-07-25

**Empty, loading, success, and recovery states now behave like a finished product.**
Records gives a direct first-record action instead of pointing at the tab bar. Export no
longer presents six unusable actions when there is nothing to export; it offers a clear
path to Log while keeping backup restore available. Settings replaces an empty “Copy error
log” action with an honest app-health result and turns storage, auto-delete protection, and
the installed build into scannable status rows.

Transient feedback now uses a shared icon-led status capsule with distinct success,
warning, error, and neutral treatments. Settings protects unsaved profile, schedule, and
workplace changes, explains that theme changes save immediately, and places the global save
action outside the Workplaces card so its scope is unambiguous. The accepted phone states
were checked in dark and light themes on fresh browser origins.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v88 — 2026-07-25

**Live tracking and consequential decisions now use one deliberate feedback system.**
The active-shift panel separates elapsed time from start time, turns meal timing into a
scannable status row, gives lunch, rest, and end-shift actions an intentional hierarchy,
and keeps the reminder limitation honest without dominating the panel. Ending a shift now
asks before clearing the live tracker and explains that the result still needs review and
save.

Confirmations across unsaved edits, typo checks, readable backups, restores, recoverable
deletion, and storage failures now use a shared titled dialog with a real Lucide icon,
specific action language, trapped focus, Escape/scrim cancellation, and returned focus.
Missing issue selections stay visible beside the picker as an announced inline error
instead of disappearing in a toast. Dark and daylight states were rechecked on a fresh
phone-sized browser origin; the daylight pass also fixed pale control materials leaking
into the navy live panel.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v86 — 2026-07-25

**Quick capture and record review now carry the same finish as the main Log screen.**
The interrupted-lunch sheet keeps its save action visible while optional details scroll,
uses real labels instead of placeholder-only fields, and makes every unconfirmed fact
optional. Saving a quick record no longer throws away a separate Log draft.

Records now show that rows expand, separate green fingerprint verification from gold
possible-issue notes, label the worker's own notes, and give repeat, edit, and recoverable
delete actions a clear hierarchy. Edit mode identifies the saved record being changed and
warns before navigation can discard unsaved work.

Both flows were rechecked on a phone-sized viewport in dark and light themes. The formal
policy and findings language still require review by a licensed California employment
attorney before public launch.

## v85 — 2026-07-25

**The mobile interface now behaves like one designed system.** The Log screen replaces
the oversized wall of issue buttons with compact, icon-led categories that disclose only
the choices a worker needs. Selected choices have a clear checked state, advanced form
sections use real chevrons, and both dark and light themes keep the same hierarchy.

Export and Settings now use shared action cells with leading icons, concise supporting
copy, and consistent recommended, secure, and navigation states. First-run setup fits its
required disclosure and start action on a phone, while the backup reminder is calmer and
more specific about where the data lives. Back controls, rights-guide disclosures,
checkbox rows, focus treatments, and narrow-screen spacing received the same pass.

The public landing page now shows the refined interface in its app preview. The formal
policy and findings language still require review by a licensed California employment
attorney before public launch.

## v84 — 2026-07-25

**The remaining California pay-event gaps are now real records, not free-form notes.**
Workers can capture split workdays, specific pay-stub defects and copy requests, tip
problems, and employer action after a paid-sick-leave request. Each flow asks only for
decision-useful facts, keeps medical diagnoses out of sick-leave entries, and carries those
facts through editing, fingerprints, Records, CSV, and printable reports.

The offline rights guide and cautious rule pointers now cover the same four areas. The app
does not calculate a split-shift amount, decide whether tip-pool participation was lawful,
or label sick-leave action retaliation. Capture sections now have unique control names and
section-specific disclosure labels for screen readers.

The canonical logo remains the single source for the header, SVG favicon, Apple touch icon,
standard and maskable PWA icons, notification icon, landing lockups, and marketing app
capture. The formal policy and findings language still require review by a licensed
California employment attorney before public launch.

## v83 — 2026-07-25

**Safer defaults and sharper California wording.** First-run setup now leaves pay and
exemption status unknown until the worker chooses it; salary no longer silently means
exempt. The optional profile is collapsed so the required disclosure and start action fit
the mobile first screen. Settings and reports use the same explicit hourly, commission,
salary-unknown, salary-nonexempt, and confirmed-exempt choices.

Meal logging now records mutual first- and second-meal waivers, explains their 6- and
12-hour limits, and states both conditions for an on-duty-meal exception. Final-pay capture
uses the exact 72-hour distinction and keeps a quit-without-notice entry pending while that
window is still open. Recording-consent language is limited to confidential conversations,
and unencrypted backups now say what they contain, who can read them, and ask for
confirmation before leaving the app.

The California rule review date is July 2026. The formal policy and findings language still
require review by a licensed California employment attorney before public launch.

## v82 — 2026-07-25

**Light without the glare.** Light mode is now the paper-and-ink counterpart to the dark
ledger: warm stone canvas, ivory surfaces, navy ink, restrained gold, and softer daylight
elevation. Inputs, buttons, data wells, hover states, alerts, and navigation all receive
light-specific materials instead of carrying dark-mode black shadows onto white panels.
There is no pure-white app surface, while text and secondary copy retain accessible
contrast for bright-condition reading.

## v81 — 2026-07-25

**The same mark, properly resolved.** The shield-and-check identity now uses smoother shield
curvature, a centered check, balanced negative space, and a restrained navy-to-gold finish
that stays clear at favicon and home-screen sizes. The canonical SVG is now the source for
all generated PWA icons, so the header mark and installed app icon cannot drift apart.

## v80 — 2026-07-25

**A real front door.** The root now opens a focused marketing page built around the actual
JobWarden interface: one clear promise, direct access to the app, a concise product story,
and an explicit local-only privacy model. The previous all-in-one marketing and install page
is now a dedicated install guide with permanent Safari and browser-menu instructions,
device-aware emphasis, and an honest reminder to export backups.

The new editorial direction uses a restrained navy, gold, and warm-paper system, with a
real app capture rather than an invented device mockup. Both pages remain static,
offline-cached, responsive, and free of third-party requests.

## v71 — 2026-07-25

**The operator is named.** JobWarden is made by **Kodaxa Innovations** ([kodaxa.dev](https://kodaxa.dev)),
an independent developer — not a company, not a law firm. Contact: **Justin@Kodaxa.dev**.

That fills the `[Operator: your legal name]` and `[contact email]` placeholders that both
policy pages had been carrying, and it closes one of the two launch blockers. The pages now
say who stands behind the app, that it is **not an incorporated company**, and — at the end
of each — that they have not yet been reviewed by a licensed attorney, with the address to
write to if something in them is wrong. The in-app Legal screen carries the same, because
someone who thinks the app got the law wrong should have somewhere to write before they
escalate.

A test now asserts both pages name the operator, give a working `mailto:`, carry no
placeholder, and never imply an LLC or corporation that does not exist.

**Still blocking public launch:** review of the findings language and UPL posture by a
licensed California employment attorney.

## v68–v70 — 2026-07-25

**Saying plainly what this is.** The policies said the app records a worker's own account
and decides nothing. The product did not. The landing headline was "Keep the proof." Step
two was "It builds your case file." The tamper-evident feature claimed the report "can
prove it." The capture flow called photos "Add proof." The rights guide told the reader
"you are owed" a break. Each of those asserts something the app cannot know — and they are
what people actually read; nobody forms their expectations from §6 of the Terms.

All of it now traces to one file, `js/config/disclaimers.js`, holding four positions:

- your records are **your own account**, unverified by anyone, never asserted to be true;
- a **"possible issue" is a pointer at a rule, not a determination** that it was broken;
- nothing says you have a claim, and nothing predicts what anyone will do about it;
- the fingerprint shows a record **has not changed since it was saved on that device** —
  not that its contents are true, and not a third-party timestamp.

Where you'll see them: an **"About this document"** block leading both printable reports,
above the first record, at body size rather than fine print, because a stranger reads that
page before anything the worker wrote. A **"What does 'possible issue' mean?"** explainer
right under the Records counts. The plainest sentence in the app leading the Legal screen.
A straight-talking paragraph in the landing hero, above the fold. The same framing now
follows the records off the device, in the **email body** and in the **spreadsheet** (which
leads with three note rows before the header, and whose "Findings" column is now "Possible
issues (pointers, not determinations)").

**First run acknowledges it.** The disclaimer used to sit at the bottom of the setup screen.
It now leads that screen, links the Privacy Policy and Terms, and setup will not continue
until you tick one plain sentence — stored verbatim with its timestamp, so a later reword
cannot rewrite what someone agreed to.

**Terms** gains §6 (your records are your own statements), §7 (no reliance; a log does not
toll a deadline and is not notice to an employer), and an indemnity paragraph.

**The part that lasts** is `tests/disclaimers.test.mjs`. It scans every user-facing string —
literals and HTML text, not identifiers, not comments — for words that assert what the app
cannot know, and fails unless the sentence is disclaiming them. It also checks the preamble
precedes the first record, that no finding note states a conclusion or a dollar figure, and
that the rights guide describes rules rather than telling a reader what they are owed. It
caught a real miss while being written, and it has a test asserting the guard still fires.

*Brand note:* the tagline "Document · Protect · Empower" became "Document · Preserve ·
Understand" — both old verbs promise an outcome. Easy to revert; it appears in the report
letterhead, the landing footer, and the page title.

*Also:* a UI module importing a symbol nobody exported shipped green, because no test
imports the view layer. Every named import across the app is now checked against the target
module's actual exports.

## v65–v67 — 2026-07-24

**Two claims a California hourly worker meets constantly, that the app had nowhere to log.**

- **Sent home early after showing up** — reporting-time pay. Report for a scheduled shift,
  get sent home before working half of it, and half the scheduled day is owed (at least 2
  hours, at most 4). The Log screen now asks what the shift was *scheduled* to be, because
  that is what the rule compares against, plus who sent you home and the reason they gave.
  A shift worked at under half its schedule is flagged, with the unpaid meal netted out
  first. IWC Wage Orders §5.
- **Paid for something the job needed** — uniforms, tools, a required phone, mileage. Record
  what it was, what it cost, when you paid, whether you were paid back, when you asked, and
  what they said. Lab. Code §2802.

Both behave like everything else here: facts, never a dollar figure. The finding says a
premium *may* be owed and points at the section; the arithmetic is left to the DLSE or
counsel. Picking either issue without filling in details still produces a *reported* finding
rather than nothing, and both new field groups are sealed evidence — editing one after the
fact is caught.

Existing records are untouched and their fingerprints still verify: the new fields default
empty, which the v2 seal prunes before hashing. That is the forward-compatibility contract,
and the gate added in v61 is what proves it held here.

The rights guide gained matching topics, so a worker who logs one of these can read what the
rule actually is without leaving the app.

**These are new attorney-review surface.** `docs/LEGAL_FOUNDATION.md` now carries a table of
every legal claim the app makes and where it came from, with the specific open questions on
these two written down rather than assumed settled.

*Corrected in v67:* the first cut of these findings counted supporting detail — the reason
you were given for being sent home, the fact that you asked to be reimbursed — as separate
issues in the pattern roll-up, so a six-record week reported eight. One incident now counts
once. Supporting facts still appear on the record and in the report; they no longer inflate
the tally.

## v64 — 2026-07-24

**A failed save no longer flashes past.** Both capture paths used to answer a write failure
with a two-second toast carrying a raw error name. That is the wrong instrument here: the
next thing a user does is put the phone away believing the record is kept, and what is lost
is not a form but a record of something that already happened and cannot be observed again.
A failure now blocks until acknowledged, says plainly that the record was **not** saved, and
gives a next step per cause — a full phone, a private/incognito window, a second tab holding
the database, or the unknown case. When the cause is space, it offers the trade that keeps
the evidence: **save without the photos, keep the facts.**

**A content policy inside the printed report.** The printable report and summary are
generated HTML written into a same-origin window. Escaping and the `data:image/` allowlist
were the only defence, and a restored backup file is untrusted input. Both documents now
carry their own CSP (`script-src 'none'`), so anything that slipped past the escaper still
cannot run. Plus edge headers: `X-Frame-Options`, COOP, CORP, and topic/cohort opt-outs.

**Legibility and reading level.** Record metadata on the Records screen was 11.5px mono —
fine on a good screen, hostile on a cheap one in a parking lot; now 12.5px. Issue-group
labels 11 → 12px. In the rights guide, five paragraphs ran 31–35 words in a single sentence:
median reading grade is now 7.6 (was 8.9), worst 12.0 (was 14.2), nothing past 28 words per
sentence — and a test keeps it there.

**Under the hood:** AGENTS.md's 400-line cap, the no-debug-marker rule, and the
zero-runtime-dependencies promise are now CI checks rather than things to remember.
176 tests.

## v61 — 2026-07-24

**Encrypted backups.** New **Save locked backup** on the Export screen writes the same
archive under AES-256-GCM, with the key derived on-device from a passphrase you choose
(PBKDF2-SHA256, 310,000 iterations). This exists because the normal way a backup leaves
the phone is an email to yourself, after which the whole evidence archive — names,
employer, GPS, photos — sits in an inbox in cleartext, and for this app's users the
adversary is sometimes a household member. No server, no key escrow, no new runtime
dependency; the passphrase is never stored or sent. **A forgotten passphrase means the
file cannot be opened by anyone, including us**, and the app says so at full size before
you commit to one. Restore detects a locked file automatically and re-asks in place after
a typo rather than sending you back to the file picker.

**Time math is now DST-correct.** An overnight span used to get a flat 24 hours added,
which is wrong by an hour across a daylight-saving transition. A 10pm–6am shift is seven
worked hours on spring-forward and nine on fall-back, and that hour moves meal deadlines,
the >10h second-meal threshold, and the daily-overtime line.

**Findings for issues you report without details.** Picking "no second lunch on a long
shift" or "worked but was not paid" with no times entered used to produce nothing at all.
The pick is itself a fact, so the record now carries a `…Reported` finding that says so
plainly, instead of looking empty.

**Light-theme contrast fixes.** Three surfaces stay dark navy in both themes (the brand
mark, the live shift panel, the empty-state seal) but were inheriting light mode's dark
ink — measured 1.87:1 on the header mark and 1.68:1 on the shift status, both well below
AA. Dark-theme ink is now pinned inside them: 10.2:1 and 6.11:1.

**Honest copy about shift reminders.** The meal-deadline reminder only fires while
JobWarden is open — a closed PWA cannot fire one without a server, which this app does not
have. The shift panel and the landing page now say so and name the workaround (leave it
running, or set a phone alarm for the deadline shown) instead of promising an alert that
does not arrive.

**Pre-release legal pages.** `privacy.html` and `terms.html` no longer ship `[Operator]` /
`[contact email]` placeholders dressed as a policy. They state plainly that this is a
preview and must not launch publicly until the operating entity, contact email, and
attorney review are done. The privacy policy also documents the locked-backup option and
its irreversibility.

**Under the hood**

- **Offline-asset gate.** The service worker's asset list is hand-maintained, and a module
  missing from it breaks the app *offline only* — the one state a browser tab never shows
  you. A test now walks the real import graph from the entry points and fails on a gap.
- **Seal contract gate.** "Every new schema field must default to empty" lived in a comment
  in `integrity.js`. It is now enforced: the blank record's sealed view is pinned, and a
  golden content hash fails if the view, the normalizers, or the pruning move without a
  deliberate `SEAL_VERSION` bump.
- **Database migration ladder.** `db.js` had one create-if-missing block. It is now an
  ordered, append-only list of steps with the rules for adding one written down, and the
  version is derived from the list length so it cannot drift.
- **The data layer has tests.** `fake-indexeddb` (devDependency only — the app still ships
  zero runtime dependencies) covers the incident and settings repos: sealing on write,
  soft delete and restore, restore-without-resealing, tamper detection, legacy hydration.
- **The dev loop stopped needing a fresh port.** On localhost the service worker now goes
  network-first and bypasses the HTTP cache, so a plain reload runs the edit.
  `launch.json` drops from 37 accumulated one-shot servers to 2.
- **Icon pipeline.** The generator's name list had drifted from what the UI renders
  (`iconEl('alert')` resolved to nothing). `scripts/build-icons.mjs` is now the single
  source of truth, with a test that fails if a name the UI uses is missing.
- 158 tests, `eslint` and `tsc --checkJs` green. Zero vulnerabilities in the dependency
  tree, dev included.

## v58 and earlier

Not individually recorded — this file starts at v61. The commit history is the record for
earlier builds, and `docs/IMPROVEMENT_AUDIT.md` tracks what shipped against the audit.
The larger earlier landmarks:

- **v58** — scoped export: filter Records to a subset (one employer) and report exactly those.
- **v57** — light theme (opt-in; dark stays the brand default), System/Light/Dark toggle.
- **v56** — local error-log ring buffer + Settings diagnostics; one shared focus trap.
- **v55** — Records search, issue/place filters, month grouping, teaching empty state.
- **v54** — photo downscaling on ingest; backups built as Blob parts, not one megastring.
- **v53** — overtime findings (daily + weekly), time-sanity warnings, statute-of-limitations nudge.
- **v52** — security headers + CSP on all pages, SW update toast, version in Settings.
- **v49** — versioned seals covering final pay; jurisdiction seam; report XSS fixes.
- **v48** — full Privacy Policy and Terms of Service pages.
- **v44/v47** — the per-state rules seam, and New York behind it (draft, attorney-gated).
