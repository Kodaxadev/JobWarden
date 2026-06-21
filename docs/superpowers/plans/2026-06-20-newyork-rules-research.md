# New York / NYC — wage-and-hour research + design (JobWarden state #2)

Status: **RESEARCH + DESIGN, 2026-06-20.** No code yet. This maps New York's rules onto
JobWarden's evidence model so the per-state rules interface can be **extracted from CA + NY**
(two real implementations) instead of guessed from California alone. Every specific figure
and the findings language are **[VERIFY]/[ATTORNEY]** before any NY release (per
`docs/LEGAL_FOUNDATION.md`). Sources are listed at the end.

---

## 0. The headline

**New York is not "California with different numbers." It is a different *shape* of law.**
A naive port of the CA engine would be wrong in both directions — it would *invent* protections
NY doesn't have (daily overtime, a paid rest-break ladder) and *miss* protections CA doesn't
have (spread-of-hours, reporting pay, weekly-pay timing, predictive scheduling). This is the
concrete proof that the rules interface must come from two states, not one.

### CA ↔ NY divergence map (the core of this doc)

| Concept | California (built) | New York | For JobWarden |
| --- | --- | --- | --- |
| **First meal** | 30 min, must *begin* before end of 5th hour (§512) | 30 min "noon" meal for shifts >6 h spanning 11am–2pm (Labor Law §162); +20 min evening meal if shift starts before 11am and ends after 7pm; longer for factory/night | **Different trigger + a 2nd "evening" meal concept.** Reuse the meal fields; the *rule* differs. |
| **Paid rest breaks** | 10 min per 4 h worked; on-call rest illegal (§226.7, Augustus) | **None for most adults.** No general paid rest-break mandate. | **Big divergence.** NY analysis must NOT flag "missed rest break." Rest fields can still record facts. |
| **Daily overtime** | 1.5× after 8 h/day, 2× after 12 h; AWS exception | **None.** OT is weekly only — 1.5× after 40 h/week (no daily OT, no double-time). | **Drop daily-OT framing + the AWS concept for NY.** |
| **Spread of hours** | — (does not exist) | +1 hour at minimum wage when the workday *spans* >10 h start-to-end (incl. breaks/off-duty). Hospitality (§146-1.6): owed regardless of pay rate. Misc. (§142-2.4): only if daily pay is below the floor. | **NEW concept.** Span is derivable from clock-in/out we already capture. |
| **Reporting / call-in pay** | Reporting-time pay exists in CA Wage Orders | NY "call-in pay": minimum hours of pay when sent home early / shift cancelled (varies by wage order; hospitality is most generous). | **NEW concept** — needs scheduled-vs-worked / "sent home early." |
| **Pay frequency** | Semi-monthly default | **Manual workers must be paid weekly** (Labor Law §191(1)(a)). 2025 amendment cut damages for late (but otherwise-paid) wages to lost interest on a first violation. | **NEW concept** — "are you a manual worker, paid weekly, and when did pay actually arrive?" |
| **Final pay** | Immediately if fired; ≤72 h if quit (§§201–203); waiting-time penalty | By the **next regular payday** (§191). No CA-style immediate-pay rule or waiting-time penalty. | **Divergence** — our `finalPay` timing logic is CA-specific; NY's due-date = next payday. |
| **Wage notice / stubs** | Itemized wage statement (§226) | **WTPA**: written wage notice *at hire* (rate, payday, employer) + accurate wage statement each period (§195); penalties per pay period. | **NEW concept** — "did you get a hire notice? are your pay stubs accurate?" |
| **Tipped workers** | **No tip credit** — tipped workers get full min wage | **Tip credit allowed** (hospitality): lower cash wage + tip credit; spread-of-hours and uniform rules. | **NEW domain** — CA never needed tip fields. |
| **Predictive scheduling** | — (state) | **NYC Fair Workweek** (fast food + retail): 14-day advance schedule, premium pay for changes, 11-h "clopening" rule + $100 premium, just-cause termination (fast food), access-to-hours. | **NEW domain + a CITY sub-layer.** Large for the app. |
| **Retaliation** | §1102.5 / §98.6 | §215 — anti-retaliation for wage complaints | **Analogous** — reuse the notice/adverse-action capture. |
| **Sick leave** | CA paid sick leave | NY State Paid Sick Leave + NYC Earned Safe & Sick Time | **NEW** (state + city); lower priority for v1. |

**Minimum wage (2026, [VERIFY annually]):** $17.00/h NYC + Long Island (Nassau/Suffolk) + Westchester; $16.00/h rest of state; CPI-indexed from 2027. NYC tipped food-service cash wage $11.35 + $5.65 tip credit. We **don't** store wage rates or compute dollars — but spread-of-hours/reporting/tip facts reference the minimum wage, so the *findings language* must cite "the applicable NY minimum wage," not a number.

---

## 1. Concept-by-concept (what the app captures, and how NY changes it)

### Meals (Labor Law §162)
- **Rule:** Mercantile/most employees — a 30-minute *unpaid* meal between 11am–2pm for a shift of **more than 6 hours** that covers that period. Factory — 60 minutes. **Evening meal:** an additional 20 minutes (5–7pm) when a shift **starts before 11am and continues past 7pm**. **Night meals** for long shifts starting after specific hours.
- **vs CA:** CA keys off the 5th hour and shift length (5h/10h); NY keys off the noon period + 6-hour threshold + an evening-meal concept CA lacks.
- **Model:** reuse `meal` / `meal2`. `meal2` becomes the "evening meal" in NY (different trigger). The capture fields are the same (start/end, interrupted, free-to-leave); only the *rule* + labels differ.
- **Note:** NY does not have CA's "on-duty meal written agreement" doctrine in the same form — keep that field CA-only.

### Rest breaks — **NY has none (for most adults)**
- The NY analysis must **not** produce a "missed rest break" finding. The `rest` fields may still record facts (e.g., "no break all day") as supporting narrative, but there's no statutory hook for adults. This is the single clearest reason the rules engine must be per-state.

### Overtime — weekly only
- 1.5× after **40 hours/week**; no daily OT, no double-time (some residential/farm thresholds differ). We don't compute OT dollars, but the *findings language* and any "hours worked" framing must not imply daily OT. The CA **AWS** (alternative workweek) concept is meaningless in NY — gate it off.

### Spread of hours — **NEW, and cheap for us**
- +1 hour at minimum wage when **(clock-out − clock-in) > 10 hours**, counting breaks and unpaid gaps — i.e., the *span*, not hours worked. We already capture clock-in/out, so the **fact is derivable today**. Caveats: hospitality owes it regardless of pay rate; misc. industries only if the day's pay falls below the floor (we can't know that without a wage rate, so we flag it as *potential* and caveat). Strong, easy NY signal.

### Reporting / call-in pay — **NEW**
- When a worker shows up and is sent home early, or a shift is cancelled late, NY wage orders guarantee minimum hours of pay. Needs new facts: **scheduled** start/end vs **actual**, and "sent home early / shift cancelled."

### Pay frequency for manual workers (§191) — **NEW**
- Manual workers (>25% physical labor) must be paid **weekly**. Late payment is a violation even if eventually paid; the **2025 budget amendment** reduced first-violation damages to lost interest where the employer otherwise paid on regular paydays at least semi-monthly. Capture: "manual worker? paid weekly? when did the period's pay actually arrive?" — facts, not the damages math.

### Final pay (§191) — **divergence**
- Due by the **next regular payday**, not immediately. Our `finalPay` due-date logic (immediate / 72h) is California's. For NY, due-date = next scheduled payday, and there is **no waiting-time penalty** equivalent — so the `finalPayLate` finding must be NY-specific (days past next payday) and not cite §203.

### WTPA — wage notice + accurate statements (§195) — **NEW**
- Capture: "Did you get a written wage notice when hired (rate, payday, employer)?" and "Are your pay stubs accurate/itemized?" Missing/incorrect → factual flag (penalties accrue per pay period, but we don't compute).

### Tipped workers — **NEW domain**
- Tip credit, spread-of-hours interplay, uniform maintenance, the "80/20"/side-work issues. CA needed none of this. Likely a later NY slice.

### Retaliation (§215) — analogous
- Reuse the existing "after you spoke up" capture; only the citation changes (§215 instead of §1102.5/§98.6).

### NYC Fair Workweek (fast food + retail) — **NEW domain + CITY layer**
- 14-day advance schedule; premium pay (~$10–$75) for employer-initiated changes; **clopening** (<11h between shifts) needs consent + $100 premium; **just-cause** termination + no >15% hour cut without cause (fast food); access-to-hours before new hires; **2025** expansion toward grocery-delivery workers. This is **predictive scheduling** — a whole capture domain (scheduled vs actual shifts, change notice, clopening). Big. Recommend a dedicated **NYC sub-phase** after NY-state basics.

---

## 2. Architecture — the interface that *emerges* from CA + NY

The universal evidence engine stays put: capture, `incidentModel`, `integrity`, `patterns`,
export, the whole UI shell. **Three things vary by jurisdiction**, and now we can see their
shapes because we have two real states:

1. **The issue catalog** — what a worker can pick. CA: late/missed/short meal, rest, off-clock,
   retaliation, final pay. NY: meal (different), **spread-of-hours**, **reporting pay**,
   **pay-frequency**, **WTPA wage notice/stub**, off-clock, retaliation, final pay (NY timing);
   NYC adds scheduling. → `issues(jurisdiction)`.
2. **The analysis** — facts/flags. Entirely different rule bodies. → `analyze(incident, profile)`
   per state.
3. **The relevant capture fields** — mostly shared, but each state has fields the other lacks
   (CA: on-duty-meal agreement, AWS; NY: spread span, scheduled-vs-actual, pay-frequency, wage
   notice). → `sections(jurisdiction, types)`.

### Proposed shape (do NOT build yet — extract when writing NY)
```
js/rules/
  index.js          getRules(jurisdiction) -> module
  california.js     { issues(), analyze(incident, profile), sections(types), disclosures() }
  newYork.js        { issues(), analyze(incident, profile), sections(types), disclosures() }
```
- `breakRules.js` becomes `rules/california.js` (its logic is already pure CA — minimal move).
- `analyze(i)` callers switch to `getRules(i.jurisdiction || profile.jurisdiction).analyze(i, profile)`.
- `infractionTypes` issue catalog is split/tagged per state (or each rules module owns its list).
- `captureFields` asks each state's `sections()` which field-groups to show.
- `jurisdictions.js` already exists as the registry; it gains `rulesModule` wiring + `rulesAsOf` per state (already there).

### Model/field changes the shared schema needs (all optional, like `finalPay` is now)
- `shift.scheduledStart` / `scheduledEnd` + `sentHomeEarly` (reporting/call-in pay).
- `pay.frequency` (manual worker? paid weekly? `periodEnd` vs `paidOn`) — generalize `finalPay`'s date math into a small pay-timing helper.
- `wageNotice` `{ gotHireNotice: tri, stubAccurate: tri }` (WTPA).
- `schedule` `{ advanceNoticeDays, lastMinuteChange, clopening }` (NYC Fair Workweek — sub-phase).
- Spread-of-hours needs **no new field** (derive span from clock-in/out). 
- `incidentModel` stays jurisdiction-agnostic; `analyze` is what differs. Hashing/integrity unaffected (new fields are additive, same content-view caveat as past additions).

---

## 3. Recommended NY build order (slices)

1. **NY scaffolding** — extract `rules/california.js` from `breakRules.js`; add `getRules()`;
   make `analyze` jurisdiction-dispatched; add `NY` to `jurisdictions.js`; a Settings region
   picker (CA/NY) once two exist. *(Refactor only — CA behavior unchanged, tests stay green.)*
2. **NY core rules** (highest value, mostly derivable): meal §162 (incl. evening meal),
   **spread-of-hours** (free from existing times), weekly-OT framing, final-pay (next-payday),
   retaliation §215, off-the-clock. Rights-guide + legal disclosure for NY.
3. **NY pay integrity:** WTPA wage notice + stub accuracy; pay-frequency (manual worker weekly).
4. **NY reporting/call-in pay:** scheduled-vs-actual, sent-home-early.
5. **NYC sub-layer — Fair Workweek** (predictive scheduling): its own capture domain; biggest
   lift; do last.
6. **Tipped-worker domain:** if demand warrants.

CA + NY done well validates the whole multi-state thesis before WA/MA/IL.

---

## 4. Open questions / gates
- **[ATTORNEY]** NY findings language + UPL posture; per-concept "potential issue, not a legal
  conclusion" framing; NY-specific disclaimer.
- **[VERIFY annually]** Minimum-wage rates; salary-exemption thresholds (NY has its own, higher
  than federal, regional); §191 damages posture (post-2025 amendment + any constitutional
  challenge); Fair Workweek premium amounts + coverage expansions.
- **Industry matters in NY more than CA:** spread-of-hours, reporting pay, and tip rules differ
  by *wage order* (hospitality vs. misc. vs. building service). The employment profile may need
  an **industry** field (hospitality / retail / other) to caveat correctly — without it, NY
  findings must stay conservative ("may be owed, depending on industry").
- **City layer:** NYC is a real sub-jurisdiction (Fair Workweek, ESSTA). The `jurisdiction`
  concept may need `state` + optional `locality` (e.g., `NY` / `NY-NYC`).

---

## Sources
- [NY minimum wage 2026 — Law and the Workplace](https://www.lawandtheworkplace.com/2025/12/new-york-state-minimum-wage-and-exempt-salary-updates-for-2026/) · [Ogletree](https://ogletree.com/insights-resources/blog-posts/2026-minimum-wage-increases-in-new-york-key-details-for-employers/) · [NY DOL](https://dol.ny.gov/minimum-wage)
- [§191 frequency-of-pay 2025 amendment — Morgan Lewis](https://www.morganlewis.com/pubs/2025/06/new-york-labor-law-amendment-limits-damages-for-frequency-of-pay-violations) · [Ogletree budget summary](https://ogletree.com/insights-resources/blog-posts/new-yorks-2025-26-budget-includes-immediate-labor-law-reforms-important-changes-to-pay-frequency-laws/)
- [Spread of hours §142-2.4 / §146-1.6 — Cornell LII](https://www.law.cornell.edu/regulations/new-york/12-NYCRR-146-1.6) · [NY Part 142 wage order](https://dol.ny.gov/minimum-wage-order-miscellaneous-industries-and-occupations-cr142)
- [NYC Fair Workweek — NYC DCWP (fast food)](https://www.nyc.gov/site/dca/businesses/fairworkweek-deductions-laws-employers.page) · [DCWP (retail)](https://www.nyc.gov/site/dca/businesses/fair-workweek-retail-employers.page)
- Structural (meal §162, OT, WTPA §195, retaliation §215, final pay §191): NY DOL + NY Labor Law (cite exact sections at [ATTORNEY] review).
