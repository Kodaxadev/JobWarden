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

- Onboarding (first run). _(Scope pill exists; add the legal disclaimer line.)_
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

## 4. Terms of Service **[ATTORNEY]**

- Provided **"as is,"** no warranty that findings are complete, current, or correct;
  the user is responsible for verifying facts and confirming the law.
- Limitation of liability; not a substitute for legal counsel or for the Labor Commissioner.
- Acceptable use; the user owns their data.
- Governing law; changes.

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

- [x] Disclaimer line on onboarding + a Settings "Legal & privacy" screen (`js/ui/legalView.js`, SW v38): disclaimer, plain-language privacy summary, facts-not-a-calculator, "as is," and "information last updated" stamp.
- [ ] **[ATTORNEY]** Formal privacy policy — review/replace the in-app plain-language summary; linked in-app + in the store listing.
- [ ] **[ATTORNEY]** Formal Terms of Service — review/replace the in-app "as is" summary; linked.
- [x] "Information last updated <date>" stamp surfaced (per jurisdiction, via `jurisdictions.rulesAsOf`).
- [ ] **[ATTORNEY]** CA employment-attorney review of findings language + UPL posture.
- [ ] Final copy sweep for banned UPL phrasing.
