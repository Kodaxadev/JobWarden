# JobWarden Phase 3 Plan — Productization (California)

**Date:** 2026-06-17 · **Status:** planning · **Scope:** California only (legal + market) for now.

> Not legal advice. The legal sections below are research to *confirm with a California
> employment attorney* before any public launch — they shape product decisions, they are
> not a compliance opinion.

Phases 0–2 + accessibility + the UI refinement are shipped and local-first with zero backend.
Phase 3 turns JobWarden from "polished personal tool" into a launchable product **without
spending the "keep both open" optionality** until a step actually requires it. Ordered so the
cheap, launch-gating work happens before the heavy backend work.

---

## 0. Guiding constraints (carried from earlier phases)

- **Local-first IndexedDB stays the source of truth.** Anything new plugs in behind the repo
  seam (`js/data/incidentRepo.js`, `settingsRepo.js`); domain (`breakRules`, `incidentModel`,
  `integrity`, `patterns`) stays pure and network-unaware.
- **Facts, not conclusions.** No damage/penalty math, no legal advice, no "you have a case."
- **California-specific.** One jurisdiction, done well.
- **WCAG 2.1 AA + the field-instrument design language** apply to everything new.

---

## 1. Legal & compliance foundation  *(do FIRST — gates public launch; mostly low-effort)*

### 1.1 UPL guardrails — the DoNotPay lesson
DoNotPay drew a **California Bar cease-and-desist (Jun 2023)** and an **FTC final order
(Jan 2025): $193K + notice to subscribers**, for marketing a "robot lawyer" it couldn't
substantiate and for generating legal documents. The takeaways become a hard product rule:

- **Never** position JobWarden as a lawyer, a substitute for one, or able to "win"/"sue."
- **Never** output legal advice, a legal conclusion ("this is a violation"), or a court/agency
  *filing drafted as legal work*. Organizing the user's own facts into a report is fine;
  drafting a legal pleading for them is the line.
- **Substantiate every marketing claim.** "Record facts, organize evidence, build a timeline"
  is defensible; "get the wages you're owed" is not.
- Keep the existing "potential issue / confirm with counsel" framing in `breakRules` — it is
  the moat against this trap, not just caution.

**Action:** write a one-page `docs/CLAIMS_POLICY.md` (what the app + marketing may/may not say)
and audit all copy + the landing page against it.

### 1.2 Keep California wage-and-hour law current
- **Meal/rest premium is "wages"** → **3-year statute of limitations** (often 4 via the UCL
  for the underlying wages). Premium = **1 hour at the regular rate per day**. Surface a
  non-alarming "records older than ~3 years may matter less — ask counsel" note; never compute.
- **2024 PAGA reform (AB 2288 / SB 92, notices on/after Jun 19 2024)** *raises* the value of a
  worker's contemporaneous log: standing now requires the worker **personally experienced** the
  violation, and employers can cap penalties by showing "all reasonable steps" to comply — both
  of which the worker's own dated, factual records directly speak to. This is a *positioning*
  win, not a code change; reflect it in the research doc and (carefully) in copy.
- Confirm in-app legal one-liners (`infractionTypes.js`) still cite live authority
  (§512, §226.7, §226, *Donohue*, *Augustus*, *Naranjo*).

### 1.3 Privacy — CalOPPA now, CCPA later
- **CalOPPA has no size threshold**: any app collecting PII from California residents needs a
  conspicuous **privacy policy** reachable from normal navigation (Settings), covering what's
  collected, sharing, how to request changes, change-notification, and DNT. Penalty up to
  **$2,500/violation**. → Add a privacy policy + a Settings link **before launch**, even while
  fully local ("this app collects nothing on a server"). Cheap, required.
- **CCPA/CPRA** applies only above thresholds (**~$26.6M revenue**, 100k consumers, or 50% of
  revenue from selling data) — not a near-term obligation. **E2EE (§2) keeps you out of it
  longer**: a server holding only ciphertext it cannot read is minimally exposed. Design now,
  comply when scale demands.
- **Add a short Terms of Use.** Confirm both with counsel.

### 1.4 Recording consent — unchanged
California stays **two-party consent (Penal Code §632)**. Keep the "no audio capture" non-goal
and the in-app warning. No change.

### 1.5 The one thing I cannot do
**A California employment attorney must review** disclaimers, claims policy, privacy policy,
terms, and the legal one-liners before public launch. Budget for one consult.

---

## 2. Optional E2EE account + sync  *(the big technical item)*

**Goal:** durability + multi-device + attorney-sharing, **without** the server ever reading a
record. Default stays local-only; sync is opt-in.

### 2.1 Principles / threat model
- **Zero-knowledge:** server stores ciphertext blobs + salts + per-device wrapped keys only.
- Trust the user's device + password; do **not** trust the server with plaintext.
- Identity (who you are) is separate from encryption (what only you can read).

### 2.2 Crypto design (current best practice)
- **Key derivation:** master password → **Argon2id** (memory-hard; e.g. 64 MB / 3–4 iters)
  → a key-encryption key. (WebCrypto lacks Argon2 → needs an `argon2` WASM asset; PBKDF2-SHA256
  at high iteration count is the dependency-free fallback, weaker but native.)
- **Data encryption:** a random **data key**; records encrypted client-side with **AES-GCM**
  (WebCrypto native). Data key is wrapped by the KEK; the data key is **never** sent in plaintext.
- **Multi-device:** each device has its own keypair; the data key is **wrapped per device**;
  only wrapped blobs transmit. Adding a device = wrap the data key for its public key.
- **Recovery:** zero-knowledge has **no server recovery path**. Provide a one-time
  **recovery code** (high-entropy, shown once, user stores offline) that also wraps the data
  key. Lose password *and* recovery code *and* all devices → data is gone. That tradeoff *is*
  the privacy guarantee; make it explicit in onboarding.

### 2.3 Backend
- **Supabase** (already wired in this environment): Auth for identity (email magic-link or
  passkey), Postgres for ciphertext blobs, **RLS** so a row is readable only by its owner.
  Server schema is deliberately dumb: `(user_id, record_id, version, ciphertext, nonce,
  updated_at)` + a device-keys table. No record content columns server-side.

### 2.4 Sync model
- Per-record encrypted blob keyed by `id` + monotonic `version`. **Reuse the Phase 1
  `contentHash`/`recordHash`** as both the integrity check on decrypt *and* the change/conflict
  detector. Start with last-write-wins + "conflicting copy kept" (never silently drop a record);
  upgrade to a vector clock only if real conflicts appear.
- Offline-first: queue encrypted mutations locally; flush when online. No iOS background sync
  (see §6) → sync on app open + manual "Sync now."

### 2.5 Phasing (smallest valuable first)
1. **E2EE cloud backup** — one encrypted bundle pushed on a schedule / button. Solves the
   lost-phone risk with the least surface.
2. **Multi-device sync** — per-record blobs + device key wrapping.
3. **Attorney share** — export an encrypted bundle or a time-limited, separately-keyed link the
   worker hands to counsel/DLSE (key shared out-of-band).

### 2.6 Tensions to decide explicitly
- **Recovery UX vs. durability:** the recovery code is friction for a stressed user but is the
  only honest answer. Decision needed.
- **"No build / no runtime deps" vs. crypto + sync:** sync adds a backend and likely an
  `argon2` WASM asset + a small sync client. This is the phase where that purity intentionally
  bends. Keep it to vetted, self-hosted assets in the SW precache; no framework.
- **Security review is mandatory** before this ships (the `/code-review ultra` cloud review or
  an external audit). Crypto you roll yourself is the classic footgun.

---

## 3. Trusted timestamping — evidence upgrade  *(new; surfaced by research)*

Phase 1 fingerprints honestly say "self-kept, not a third-party timestamp." Research confirms
the gap: a self-hash proves *integrity since creation*, not *when* it was created. A
**certified timestamp (RFC 3161 TSA, or an OpenTimestamps/blockchain anchor)** links a record's
hash to a precise time via independent infrastructure — turning "created at X" from *asserted*
into *provable*, which materially strengthens authentication under CA Evidence Code
§§1400/1410–1421.

- **Approach:** on seal (when online), submit `recordHash` to a free TSA / OpenTimestamps; store
  the returned timestamp token with the record; show "independently time-stamped ✓" and include
  the proof in the report. Degrade gracefully offline (stays self-kept until next online seal).
- **Why it's worth it:** it directly elevates the product's core differentiator (credible
  evidence) and is contained. Strong candidate to do *before* the heavy sync work.

---

## 4. Cold-user onboarding  *(de-couple from the founder's wife)*

**Done (2026-06-19):** `settingsRepo` defaults are now blank (employer/role no longer pre-filled
to a specific worker; pay type still defaults to hourly), the onboarding welcome orients a cold
user ("Welcome to JobWarden" + what it logs + privacy + clearly-optional setup), and Penske/BDC
references were scrubbed from the app + README. Remaining cold-user polish:

- A short intro: *what this is* (a private record of your own work facts), *what it is NOT*
  (not a lawyer, not legal advice), the privacy promise, and a **guided first capture**.
- Real empty states + a "see an example record" so the value is legible before data exists.
- Trauma-informed tone: calm, plain language, no alarmism (consistent with the current copy).

Pure client-side, low-risk; good to do alongside §5.

---

## 5. California-readiness without multi-state  *(per direction: stay CA-only)*

Do **not** build other states. But stop *assuming* California in code so a future state could
slot in without a rewrite:

- Introduce a `jurisdiction: 'CA'` constant; thread it through `breakRules` / legal refs as a
  parameter rather than a baked-in assumption.
- Keep CA as the only implemented ruleset. This is a small factoring, not a feature.

---

## 6. Distribution  *(2026 realities)*

- **PWA stays primary** (installable, offline, already shipped).
- **Android → Google Play via TWA** (PWABuilder/Bubblewrap): needs Lighthouse ≥ 80, manifest,
  SW, HTTPS, Digital Asset Links. **Viable and low-cost** — recommended first store presence.
- **iOS App Store is the hard path.** Guideline **4.2** rejects "repackaged website" wrappers;
  a Capacitor shell needs genuine native value to pass. **Recommendation:** rely on
  **Add to Home Screen** + the Persistent Storage API (already requested) for iOS, and only
  pursue the App Store if real native features justify it. iOS push works (16.4+, installed,
  non-EU) but there's **no background sync** → sync on open / manual (ties to §2.4).
- Polish the install funnel (`install.html`) + store listing assets when a store path is chosen.

---

## 7. Claim handoff — DLSE / attorney  *(turns evidence into action)*

The DLSE wage-claim process is **employee-friendly, no lawyer required** (online/mail/in-person),
and the worker's own record is "primary evidence," especially when the employer's records are
inaccurate. JobWarden already produces the report + the one-page Pattern Summary; close the loop:

- A "**Take this further**" flow: choose *file with the Labor Commissioner* or *send to an
  attorney*, with the right export bundle + a plain checklist and the 3-year-SOL reminder
  (informational, not advice). Links out to the DLSE wage-claim page.
- This is product glue, not legal work — keep it on the right side of §1.1.

---

## 8. Business model  *(brief; defer)*

Free **local tier** forever; **E2EE sync + multi-device + attorney share** as the paid tier
(durability + convenience people will pay for, without compromising privacy). Decide pricing at
launch; out of scope for build now.

---

## Sequencing & dependencies

1. **§1 Legal foundation** (claims policy, privacy policy, terms, law-currency, attorney consult) — gates everything public; cheap.
2. **§4 Onboarding + §5 CA-readiness factoring** — client-side, de-risks the wife-specific hardcoding, no backend.
3. **§3 Trusted timestamping** — contained, high-value evidence upgrade.
4. **§2 E2EE sync** — the big one; design → security review → build the 3 sub-phases. Needs §1 done first.
5. **§6 Distribution + §7 Claim handoff + §8 model** — as launch nears.

## Decisions needed
- **From you:** recovery-code UX (accept the "lose it all → data gone" tradeoff?); Android-store
  now vs. PWA-only; whether to add the `argon2` WASM asset or accept PBKDF2.
- **From an attorney (CA employment):** sign-off on disclaimers, claims policy, privacy policy, terms.
- **From a security review:** the E2EE design before it ships.

## Sources
- PAGA 2024 reform: https://www.seyfarth.com/news-insights/paga-reform--ab-2288-and-sb-92-introduced.html · https://www.lcwlegal.com/news/governor-newsom-signs-paga-reform-legislation/
- DoNotPay FTC order: https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires
- CalOPPA: https://www.termsfeed.com/blog/caloppa/ · CCPA thresholds: https://cppa.ca.gov/regulations/cpi_adjustment.html
- DLSE meal/rest + 3-yr SOL: https://www.dir.ca.gov/dlse/RestAndMealPeriods.pdf · https://www.unpaidwages.com/claim-time-limit
- E2EE patterns: https://devtechinsights.com/end-to-end-encryption-developers-2025/ · https://bitwarden.com/blog/end-to-end-encryption-and-zero-knowledge/
- iOS PWA 2026: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- PWA stores 2026: https://www.mobiloud.com/blog/publishing-pwa-app-store · https://web.dev/articles/pwas-in-app-stores
- CA evidence authentication / hash + timestamp: https://www.hulburtlaw.com/resources/how-to-authenticate-evidence-in-california · https://www.certifywebcontent.com/the-new-standard-for-digital-evidence-hashes-timestamps-and-forensic-declarations/
