# JobWarden — Where It's Weak, and Where It Could Be Better

Written 2026-07-02 against `986e6c9` (SW v51, 93 tests). The two **Progress** sections below
record what has shipped since; the numbered sections keep the original wording so the
tradeoffs stay visible even where they were later taken. Last reviewed 2026-07-25 (SW v86,
248 tests).

This is the honest document: every place the project is bad, fragile, missing, or
deliberately traded away — from product strategy to the tech stack — with what it would
take to fix each one. Some entries are defects; many are **deliberate tradeoffs whose
cost should stay visible** so they're re-decided on purpose, not by inertia.

**Severity:** 🔴 Critical (undermines the product's core promise) · 🟠 High (real user harm
or ceiling) · 🟡 Medium (friction, drift risk) · ⚪ Low (polish).
**Effort:** S (hours) · M (days) · L (weeks+).

---

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

---

## 1. Product & Strategy

### 🔴 No Spanish. (L)
The target user is a California hourly worker — retail, food service, caregiving,
warehouse. A very large share of that workforce is Spanish-dominant, and wage theft
skews *toward* immigrant workers. An English-only wage-theft tool misses much of the
population it claims to serve, and there is **no i18n architecture at all**: copy is
hardcoded across `js/config/uiCopy.js`, `infractionTypes.js`, every UI module, the
rights FAQ, the reports, and both HTML pages. This is the single biggest gap between
the product's mission and its build. Fix path: extract a string layer first (M), then
translate (M, needs a human reviewer for the legal-adjacent phrasing — machine
translation is a UPL risk in a domain this sensitive).

### 🔴 The data dies with the phone — at exactly the wrong moment. (M–L)
Local-first is the trust model and the moat, but the catastrophic case is the *likely*
case: the worker who most needs the record is the one who gets fired, has the phone
break, or has it taken. Mitigations today are a 7-day nag banner and manual
export/email. A stressed user will not back up. What's missing, in increasing ambition:
- **Image-light auto-safety**: prompt Web-Share-to-self after every Nth record, not on a timer. (S)
- **Storage estimate + eviction warning**: `navigator.storage.estimate()` surfaced in Settings; warn when persistence was denied. (S)
- **The cut E2EE sync** (decision 2026-06-20) remains the only real answer to device
  loss. The cut was defensible (server erodes the "nothing leaves your phone" pitch),
  but the cost — evidence loss for the least-prepared users — should be re-examined
  once there are real users. Hash-only OpenTimestamps (already planned, unbuilt) is
  orthogonal and should come first.

### 🟠 Shift alerts silently don't work when the app is closed. (M, partially unsolvable)
The meal-deadline alert (`app.js` `monitorShift`) runs on a 60s interval **only while a
tab is open**. A closed PWA fires nothing: no Push (needs a server — conflicts with
no-server), no Notification Triggers (API is dead). So the headline live feature — "it
warns you before you skip lunch" — quietly depends on the app staying open, and neither
the app nor the landing page says so. Minimum fix: honest copy in the shift panel
("keep JobWarden open in the background") + suggest setting an OS alarm at shift start. (S)

### 🟠 No discovery strategy. (L)
The product only works if a worker finds it in a moment of stress. There is no store
presence (PWA-only), no SEO content (a "was my lunch break illegal in California?"
article would out-convert any landing page), no partnership channel (worker centers,
legal-aid orgs, unions — the natural distributors). The landing page also never answers
the #1 fear question: **"Will my employer know I'm using this?"** (S for the copy; L for
the channel work.)

### 🟡 No product learning loop, by design. (—)
Zero analytics is the right privacy call, but it means no idea where users drop off.
Cheap partial: a local-only, user-visible diagnostics screen (counts of records,
errors caught) that the user can choose to share when reporting a problem. (S)

---

## 2. Legal Coverage & Accuracy (California)

### 🔴 Attorney review is still not engaged. (—)
Tracked in `docs/LEGAL_FOUNDATION.md`; it is the only launch blocker left and it is
external. Everything below is secondary to this.

### 🟠 The infraction catalog stops at meal/rest/off-clock/final-pay/retaliation. (M each)
Adjacent wage-hour claims a CA worker would reasonably expect to log, all absent from
`js/config/infractionTypes.js`:
- **Overtime itself.** The app records hours but never flags daily OT (>8h/>12h) or
  weekly OT — see next item. AWS caveat exists; the base finding doesn't.
- **Reporting-time pay** (sent home early after showing up — IWC orders §5). We already
  capture clock-in/out; a "scheduled vs. actual" pair would unlock it.
- **Split-shift premium** (IWC §4): needs a second work interval per day; the model has
  `meal`/`meal2` but no second *work* span.
- **Expense reimbursement (§2802)** — uniforms, tools, mileage, personal phone. Common
  in exactly the dealership/service context this app grew from.
- **Paystub violations (§226)** as a structured type (currently only a photo).
- **Tip theft (§351)**, **sick-leave retaliation (Labor Code §246.5)**.
Each addition is also new attorney-review surface — batch them.

### 🟠 No cross-record math: weekly overtime is invisible. (M)
Records are per-day and `js/domain/patterns.js` only counts flags. Seven 7-hour days
is 49 hours — no daily OT, clear weekly OT — and the app says nothing. The pattern
layer already has all the inputs; a week-bucketed hours roll-up (with the AWS/exempt
caveats it already knows) is the highest-value pure-domain feature left.

### 🟡 No statute-of-limitations awareness. (S)
The rights FAQ states deadlines statically. The Records screen knows the oldest
incident date and could nudge: "Your oldest record is 14 months old — many wage claims
have 3-year deadlines." Facts only, no advice — but time-decay is real and invisible.

### 🟡 Time semantics are fragile at the edges. (M)
- `minutesBetween` (`timeUtils.js`) wraps any negative interval by +24h. Overnight
  shifts work, but a **typo** (clock-out before clock-in) silently becomes a 20-hour
  shift and can generate false findings, and the wrap is wrong by an hour across a
  **DST transition**.
- `incidentDate` is ambiguous for overnight shifts (date of clock-in vs. clock-out) —
  undocumented, affects NY noon-window logic and future scheduling rules.
- `validateIncident` checks only date + ≥1 type. No cross-field sanity (meal outside
  shift bounds, shift >16h, meal end before start). Bad input flows straight into
  sealed "evidence" — an impeachment risk. Validation warnings (not blocks) fit the
  facts-only ethos.

---

## 3. Data Durability & Trust

### 🟠 Photos are stored and exported at full size. (S–M)
`media.js` stores the raw `File` (multi-MB per photo on modern phones) into IndexedDB
and base64-inflates it (+33%) into the JSON backup built **entirely in memory as one
string** (`exportJson.js`). Twenty photos ≈ a 100 MB+ string on a budget phone: OOM,
un-emailable attachments, quota pressure. Fix: canvas-downscale on ingest (~2000px
long edge, JPEG q0.85 — evidence stays legible; hash the *stored* bytes so seals stay
valid), and build backups as `Blob` parts, not a string.

### 🟡 Seal schema-evolution rule is enforced only by convention. (S)
`sealVersion: 2`'s forward-compatibility depends on every future schema field
defaulting to `''`/`null` (never `false`). That rule lives in a comment in
`integrity.js`. Add a test that walks `createIncident()`'s normalized output and fails
if any default is `false`-typed-but-empty — turn the convention into a gate.

### 🟡 Trusted timestamping is still a caveat, not a feature. (M)
Every report honestly says "not a third-party timestamp." OpenTimestamps (hash-only,
free, no PII leaves the device) is the planned, aligned upgrade and would materially
change what the seal proves. Still unbuilt.

### ⚪ DB has no migration story. (S)
`db.js` is `DB_VERSION = 1` with create-if-missing. Fine today; the first added index
or store needs a versioned upgrade path — write the pattern before it's needed in a
hurry.

---

## 4. Architecture & Tech Stack

### The core decision, restated fairly
Vanilla ES modules, no build, no runtime deps, IndexedDB, SW cache-first. This buys:
zero supply-chain surface (right for an evidence tool), no toolchain rot, instant
onboarding, and honest auditability. It costs the items below. **The stack is not the
weakness people would guess; the gaps are around it, not under it.**

### 🟠 No static types on a sprawling, stringly-typed record shape. (M)
The incident object has ~40 fields across 8 sub-objects, flowing through capture →
model → rules → integrity → export, all untyped. The audit's A1 bug (a chip id checked
against the wrong string) is exactly the bug class a type layer catches. The
no-build-step ethos does **not** require giving this up: JSDoc `@typedef` +
`tsc --checkJs --noEmit` in CI is types with zero build. Highest-leverage stack change
available.

### 🟠 No linter, no formatter. (S)
`package.json` has a test script and nothing else. One `eslint` (flat config) + CI step
catches unused imports, accidental globals, `==` drift. Cheap insurance that doesn't
touch the runtime.

### 🟡 Test suite is domain-only. (M–L)
93 tests, all Node-level. Untested: the entire UI layer, the IndexedDB repos
(`fake-indexeddb` would cover them), the service worker, and the real
capture→save→reload→verify loop. One Playwright smoke test (create record → reload →
seal verifies → export builds) would have caught several past bugs and guards the ones
just fixed. Visual regression (screenshot diff on the four screens) is the cheap way
to protect the design-polish investment.

### 🟡 SW updates are invisible and slow to land. (S)
Cache-first + version-bump means users run stale versions until a second visit's
reload, and nothing ever tells them. Add the standard `updatefound` → "New version
ready — refresh" toast, and surface the version (cache name) in Settings. Also: the
`python -m http.server` dev loop requiring a fresh port per verification (see
launch.json's 30 entries) is a symptom — a tiny dev flag to bypass SW caching would
end the port parade.

### 🟡 First load is 40+ uncached requests. (—, accepted)
No bundling means every module is a round trip on first visit; painful on slow 3G,
irrelevant after SW install. Acceptable tradeoff for this product; `<link rel=preload>`
for the two critical fonts is the only cheap win worth taking. (S)

### ⚪ Two hand-rolled focus traps. (S)
`dom.js` `confirmDialog` and `quickCapture.js` each implement their own Tab-cycling
trap. Extract one.

---

## 5. Security & Privacy

### 🟡 No security headers at the edge. (S)
`vercel.json` sets caching + content-type only. Add: `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy` (camera/geo self-only), and mirror the CSP as a header (meta CSP
can't cover everything, and `install.html`/`privacy.html`/`terms.html` have no CSP at
all today).

### 🟡 Backup files are plaintext PII. (M)
The JSON backup — names, employer, GPS, photos — travels through email unencrypted by
design ("in your hands after export"). An **optional passphrase-encrypted backup**
(AES-GCM via WebCrypto, no server, no dependency) would protect the at-rest copy in a
Gmail account without touching the privacy model. Disclosed honestly today, but "your
evidence archive sits in your inbox in cleartext" is a real exposure for this threat
model (the adversary is sometimes the employer *and* sometimes a household member).

### ⚪ Report print windows are same-origin `document.write`. (M, hardened)
The injection vectors found in the audit are fixed (escaping + `data:image/` allowlist
+ CSP), but the architecture — writing generated HTML into a same-origin window —
keeps the class alive. A `blob:` URL or sandboxed iframe would end it structurally.

---

## 6. Design & UX

### 🟠 The Records screen doesn't scale. (M)
Everything renders at once, newest-first, photos included, no search, no filter by
type/workplace/date-range, no month grouping. A committed daily user hits 200+ records
in a year; finding "that Tuesday in March the manager texted me" becomes scrolling
archaeology. Filtering is also *legal* functionality: an attorney asks "show me all
the missed meals at location X." Month headers + a type/workplace filter row is
enough; virtualization can wait.

### 🟠 Dark-only. (M)
The brand is a dark instrument, but the use case is "one-handed, on a break, in a
parking lot" — full sun, cheap dim screen. There is no `prefers-color-scheme` path and
no manual toggle. A light theme is a real accessibility/usability need here, not a
preference; the token architecture (`tokens.css`) makes it feasible without redesign.
(The "paper mode" for print proves the brand survives inversion.)

### 🟡 Empty states don't teach. (S)
"No records yet. Tap Log to add the first one" — the product-register bar is an empty
state that *teaches the interface* (what a finding looks like, what the seal means).
First-run is exactly when trust is decided. Same for the guided first capture that's
been on the roadmap since Phase 3 planning.

### 🟡 No per-record export selection. (M)
Export is all-or-nothing. Real scenario: share only the three records about employer A
with a lawyer, not the ones about employer B. Selection checkboxes on Records feeding
every export path.

### 🟡 Overnight-shift logging UX. (S)
Log screen defaults to today; a worker logging a 10pm–6am shift the next morning has
an ambiguous date and no "yesterday" affordance. Pairs with the `incidentDate`
semantics fix in §2.

### ⚪ Small-type metadata. (S)
10–11.5px mono metadata (row meta, captions, tab labels) is AA-large-text-legal but
hostile to tired eyes on cheap screens. Audit the sub-12px set; most can take +1px.

### ⚪ Logo rework pending (user-flagged). (M)
Current shield/check mark is serviceable; `icons/Logo.svg` (152 KB, unreferenced) is
the kept candidate source. When it happens, regenerate PNGs via
`scripts/build-app-icons.mjs` and update the inline SVGs in `index.html`,
`install.html`, and `reportBrand.js` — the mark is duplicated in four places, which is
itself a small maintenance smell.

---

## 7. Accessibility & Inclusion

- 🟠 **i18n is the headline** (see §1) — `lang="en"` everywhere, no string layer.
- 🟡 **No real-AT pass.** The ARIA architecture is solid (live regions, focus traps,
  `aria-current`, `aria-expanded`), but it has never been driven with VoiceOver or
  TalkBack. One hour with TalkBack on a budget Android — the actual device class of
  the audience — will find things no checklist does. (S)
- 🟡 **Reading level.** Copy is plain-language by policy and mostly good; the banned-word
  test guards jargon but not sentence complexity. The rights FAQ paragraphs run long
  for a stressed reader on a phone. A grade-level pass (target ~6th–8th) would fit the
  audience. (S)
- ⚪ Reduced-motion and contrast floors are genuinely handled; keep the tests honest as
  the theme evolves.

---

## 8. Performance

- 🟡 **Photo weight** dominates everything (see §3) — ingest downscaling is the fix.
- 🟡 **No `loading="lazy"`/`decoding="async"` on record thumbnails** — with photos on,
  the Records screen decodes every image eagerly. (S)
- ⚪ Font preload for Geist 400/500 would cut first-paint text swap. (S)
- ⚪ `renderIncidentList` rebuilds the whole list per change — irrelevant until §6's
  scale problem is addressed; solve them together.

---

## 9. Process & Tooling

- 🟡 **CI is tests-only** (`.github/workflows/test.yml`): no lint, no type-check, no
  Playwright, and it tests on Node 20 while development targets browsers. Grow it with
  §4's additions. (S each)
- 🟡 **Versioning is the SW cache string.** No CHANGELOG, no in-app version display.
  When a user reports "it's broken," there is no way to know what they're running. (S)
- 🟡 **No error visibility at all.** Errors toast or vanish. A local ring-buffer error
  log (last 20 errors, viewable in Settings, copy-to-clipboard) is support
  infrastructure with zero privacy cost. (S)
- ⚪ `launch.json` has 30 accumulated one-shot dev servers — symptom of the SW dev
  friction in §4; clean up when that lands.

---

## The Short List (what I'd actually do next, in order)

1. **Engage the CA employment attorney** — the only true launch blocker (§2).
2. **Photo downscaling on ingest + Blob-built backups** — protects the core artifact
   on the actual devices (§3, days).
3. **Weekly-hours roll-up + overtime findings** — biggest pure-domain value gap (§2, days).
4. **Records filtering + month grouping** — the app's first scale wall, and attorney-
   facing functionality (§6, days).
5. **JSDoc types + eslint + one Playwright smoke test in CI** — the bug classes that
   have actually bitten, prevented structurally (§4, days).
6. **Spanish** — start with the string-layer extraction so the door is open (§1, weeks
   total, extraction first).
7. **Time-sanity validation warnings + overnight date semantics** (§2, days).
8. **SW update toast + version in Settings** (§4, hours).
9. **Security headers in vercel.json + CSP on the other pages** (§5, hours).
10. **Light theme** (§6, days) and the **landing's "will my boss know?" answer** (§1, hours).

Everything above is written to be actionable independently; nothing blocks anything
else except attorney review blocking public distribution.
