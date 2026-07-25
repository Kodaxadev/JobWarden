# JobWarden — Legal Foundation (public, multi-state launch)

Status: **DRAFT — started 2026-06-20.** This is the gate before JobWarden ships to the
public in any state. Nothing here is legal advice; items marked **[ATTORNEY]** require a
licensed California employment attorney's review and sign-off before launch.

The product's promise is also its legal posture: **a private tool that helps a worker
document their own facts.** It is *not* a law firm, *not* legal advice, and *not* a filing
service. Everything below protects that line.

---

## 1. UPL guardrails (Unauthorized Practice of Law)

The cautionary tale is DoNotPay (FTC action + multiple bar complaints for posing as a
"robot lawyer"). JobWarden must never cross from *information + documentation* into
*legal services*. Hard rules — enforce in copy review and in code:

- **Never** use "lawyer," "attorney" (except "consult an attorney"), "legal advice,"
  "we'll handle your case," "you have a case," "you are owed $X," or "file your claim for you."
- **Never** generate a legal filing, demand letter, or PAGA/LWDA notice. (Already a non-goal.)
- **Never** predict outcomes or compute damages/penalties. (Dollar math is already banned
  app-wide; days-late and counts are facts, not damages.)
- **Always** frame findings as *"potential issue / factual observation, not a legal
  conclusion"* and route the user to the Labor Commissioner (DLSE) or a licensed attorney.
- The app **describes the law generally** and **records the user's own facts** — that is
  information + a tool, not the practice of law.

**[ATTORNEY]** Confirm the findings language and the rights guide stay on the information
side of the UPL line in California (and re-confirm per state at each expansion).

## 2. Disclaimers (where they must appear)

A consistent, plain disclaimer — *"General information about your state's labor law, not
legal advice. Rules have exceptions and deadlines. For advice about your situation, contact
the Labor Commissioner or a licensed employment attorney."*

- Onboarding (first run). _(Done — scope pill + a "general information, not legal advice" line.)_
- The rights guide footer. _(Present.)_
- Every printable report + pattern summary footer. _(Present for CA.)_
- A persistent, dismissible-once line or an "About / Legal" entry in Settings.
- Per state: the disclaimer names the correct jurisdiction.

## 3. Privacy policy **[ATTORNEY]**

Required even though data is local-first. CalOPPA obligates any commercial app/site that
collects personally identifiable information to post a conspicuous policy; app stores
require one regardless. Must state plainly and truthfully:

- Records and profile are stored **only on the user's device** (IndexedDB); there is **no
  server, no account, no cloud sync, no analytics, no tracking, no third-party sharing**.
- Data leaves the device **only when the user themselves exports/shares** (file, email,
  print). After that it is in the user's control / their chosen app.
- Photos are stored locally; no audio is recorded (CA all-party-consent law).
- Durability is the user's responsibility (local data can be lost if the device is lost or
  the browser clears storage) — hence backup/restore. State this honestly.
- Children: not directed at users under 13.
- Contact + effective date + how changes are communicated.

**Drafted 2026-06-22:** [`privacy.html`](../privacy.html) — full policy covering all of the
above, written to match how the app actually behaves (no collection, no servers, local-only).
Linked from the in-app Legal screen (`legalView.js` "Full policies" card) and the landing
footer. Public release is blocked until the operating entity name and contact email are
filled in. Still needs **[ATTORNEY]** review of the final wording.

## 4. Terms of Service **[ATTORNEY]**

- Provided **"as is,"** no warranty that findings are complete, current, or correct;
  the user is responsible for verifying facts and confirming the law.
- Limitation of liability; not a substitute for legal counsel or for the Labor Commissioner.
- Acceptable use; the user owns their data.
- Governing law; changes.

**Drafted 2026-06-22:** [`terms.html`](../terms.html) — full ToS with the not-legal-advice /
no-attorney-client clause, "as is" / no-warranty, limitation of liability, acceptable use
(incl. the no-audio-recording rule), IP/license, governing law (California), and severability.
Public release is blocked until the operating entity name and contact email are filled in.
Still needs **[ATTORNEY]** review.

## 5. Accuracy & currency of the law **[ATTORNEY]**

- A documented review cadence for each live state's wage-and-hour rules (rates, thresholds,
  new statutes). California note: PAGA's 2024 reform raises the value of a worker's
  contemporaneous record; meal/rest premium is *wages* (3-year SOL). Keep current.
- A dated "rules current as of" stamp per jurisdiction, shown in the rights guide / reports.

## 6. Per-state expansion gate

Each new state goes live only after: (a) its rules implemented + tested, (b) its disclaimers
and rights content written, (c) **[ATTORNEY]** review of that state's findings language and
UPL posture, (d) the app correctly scopes findings to the user's selected state.

## 7. Distribution compliance

- App-store privacy labels consistent with §3 (essentially "no data collected").
- Android TWA is viable; iOS App Store is hard for this category (Guideline 4.2) — likely
  rely on Add-to-Home-Screen / PWA install. Revisit at distribution time.

---

## Launch checklist (California, v1 public)

> **Attorney status (2026-06-21): not yet engaged.** The `[ATTORNEY]` items below need a
> California employment-attorney referral; none is retained yet. Public production launch is also
> blocked on the operating entity name and contact email for the policy pages.

- [x] Disclaimer line on onboarding + a Settings "Legal & privacy" screen (`js/ui/legalView.js`, SW v38): disclaimer, plain-language privacy summary, facts-not-a-calculator, "as is," and "information last updated" stamp.
- [ ] **[ATTORNEY]** Formal privacy policy — review/replace the in-app plain-language summary; linked in-app + in the store listing.
- [ ] **[ATTORNEY]** Formal Terms of Service — review/replace the in-app "as is" summary; linked.
- [x] "Information last updated <date>" stamp surfaced (per jurisdiction, via `jurisdictions.rulesAsOf`).
- [ ] **[ATTORNEY]** CA employment-attorney review of findings language + UPL posture.
- [x] Final copy sweep for banned UPL phrasing — now **automated**, not a one-time sweep. `tests/disclaimers.test.mjs` fails the build on "proof", "your case", "guarantee", "will hold up" and the rest of `BANNED_CLAIM_WORDS` anywhere a user can read them, unless the sentence is disclaiming them. The §1 list above is the source of that list.

### The framing surface (added 2026-07-25)

Everything the app says about what it *is* now lives in one file: `js/config/disclaimers.js`.
That is deliberate — this text used to be retyped at every surface, and duplicated
disclaimers drift until the weakest wording is the one that gets quoted back at you. It is
also the shortest possible review: **edit that one file and every screen, both printable
documents, and the landing page change with it.**

The four positions it holds, which the attorney should confirm are the right ones and are
worded strongly enough:

1. **The records are the user's own account.** Nobody verified them; the operator never sees
   them; the app does not assert they are true.
2. **A "possible issue" is a pointer, not a determination.** It points at a rule that may
   relate to what was entered. Whether a rule was broken turns on facts the app does not have.
3. **Nothing states or implies the user has a claim**, and nothing predicts what an employer,
   agency, or court will do.
4. **The fingerprint shows only that a record has not changed since it was saved on that
   device.** Not that the contents are true, and not a third-party timestamp.

`tests/disclaimers.test.mjs` enforces these mechanically: it scans every user-facing string
(not identifiers, not comments) for words that assert something the app cannot know —
"proof", "your case", "guarantee", "will hold up" — and fails on any that is not part of a
disclaiming sentence. It also asserts both printable documents carry the preamble *before*
the first record, that no finding note states a conclusion or a dollar figure, and that the
rights guide describes rules rather than telling the reader what they personally are owed.

Terms of Service §§6–8 (`terms.html`) are the contractual version of the same four positions,
plus indemnity. Those sections are new and unreviewed.

### Findings surface awaiting that review

Everything the app tells a user about the law is in one of two places: the finding notes in
`js/domain/breakRules.js` (California) and the topic text in `js/ui/rightsFaq.js`. Reviewing
those two files covers the whole surface. The list below exists so nothing is reviewed twice
or missed, not as a claim that any of it is correct today.

| Area | Authority the app cites | Added |
| --- | --- | --- |
| Meal timing, length, waivers, second meal | Lab. Code §512; IWC Wage Orders | initial |
| On-duty meal agreements | Lab. Code §512; Wage Order §11 | initial |
| Rest breaks, duty-free requirement | Lab. Code §226.7; *Augustus v. ABM* | initial |
| Off-the-clock / suffered-or-permitted work | Lab. Code §§1194, 1198, 226 | initial |
| Retaliation after a complaint | Lab. Code §§98.6, 1102.5 | initial |
| Final pay timing + waiting time | Lab. Code §§201–203 | initial |
| Daily/weekly overtime notes, AWS caveat | Lab. Code §§510, 511 | SW v53 |
| **Reporting-time pay** (sent home before half the scheduled shift) | **IWC Wage Orders §5** | **SW v65** |
| **Necessary work expenses** (uniform, tools, phone, mileage) | **Lab. Code §2802** | **SW v65** |

The two additions marked **SW v65** are the newest and least-settled. Specific questions for
review: whether the half-the-scheduled-shift trigger should also fire on the second-reporting
rule (§5(B), two hours' pay for a second daily report of under two hours, which the app does
not model); whether naming the §5(C) exceptions in a finding note edges toward advice; and
whether the §2802 findings should distinguish a *necessary* expense from any work-related
purchase, which the app deliberately does not attempt to judge.
