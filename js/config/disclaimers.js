// disclaimers.js — the exact wording of what JobWarden is and is not. One concern: that
// wording, in one place.
//
// Why one file: this text used to be retyped at every surface — onboarding, the Legal
// screen, Settings, the rights guide, both printable documents, the landing page. Duplicated
// disclaimers drift, and the moment one surface promises more than another, the weakest
// wording is the one that gets quoted back at you. This is also the file an attorney should
// review: change it here and every screen and every export changes with it.
//
// The line this text has to hold is narrow and it matters:
//   - The user's records are THEIR OWN ACCOUNT. Nobody has verified them.
//   - A "possible issue" is a pointer at a rule, NOT a determination that a law was broken.
//   - Nothing here says the user has a claim, and nothing here predicts what anyone will do.
//   - The fingerprint shows a record has not changed since it was saved on that device. It
//     does not show that what was typed is true, and it is not a third-party timestamp.
// See docs/LEGAL_FOUNDATION.md. Attorney review of this file is a launch blocker.

// The one-sentence version, for tight spaces (Settings footer, onboarding).
export const SHORT = 'Your own log, in your own words. General information, not legal advice.';

// The standing headline. Shown wherever the user is about to treat this as more than a log.
export const NOT_A_VERDICT =
  'JobWarden records what you say happened. It does not decide whether anything was actually done wrong, and it cannot tell you whether you have a claim.';

// The sentence the user ticks a box against on first run. Deliberately ONE sentence, in the
// same plain voice as everything else — a wall of legalese behind a checkbox is a thing
// people click past, which is worth nothing to them and nothing to us. The exact text is
// stored with the profile at the moment it is accepted, so a later reword does not rewrite
// what someone actually agreed to.
export const ONBOARD_ACK =
  'I understand this keeps my own account of what happened, and that it does not decide whether anything was done wrong or tell me whether I have a claim.';

// What a “possible issue” on a record actually means. Shown on the Records screen and in
// every printable document, because this is the single most misreadable thing in the app.
export const WHAT_FINDINGS_MEAN = [
  'A “possible issue” is a note pointing at a rule that may apply to what you entered. It is not a decision that the rule was broken.',
  'Whether a rule was actually broken depends on facts this app does not have — your exact job duties, agreements you may have signed, and how the law applies to your situation.',
  'Only the Labor Commissioner, a court, or your own attorney can tell you where you stand.',
];

// What the fingerprint proves, and what it does not. Any surface that shows a seal shows this.
export const WHAT_THE_SEAL_MEANS =
  'The fingerprint shows this record has not changed since it was saved on the device that made it. It does not show that the times or events entered are true, and it is not a timestamp from any outside service.';

// The block that leads every printable document. This is the one a stranger reads first —
// an employer, an HR investigator, an agency, an opposing lawyer — so it states plainly whose
// account this is and what has and has not been established.
export const DOCUMENT_PREAMBLE = {
  title: 'About this document',
  paras: [
    'This is a personal log kept by the person named above, recording their own account of their own working conditions. The entries are their statements, written by them, and have not been verified, investigated, or endorsed by anyone.',
    'The notes under each entry point at California wage-and-hour rules that may relate to what was recorded. They are general information, not legal conclusions. Nothing in this document establishes that any law was broken, that any amount is owed, or that any claim exists.',
    'No dollar amounts are calculated here. Premium and overtime pay depend on the “regular rate,” which this log does not attempt to compute.',
  ],
};

// The standing footer for printable documents.
export const DOCUMENT_FOOTER =
  'A self-kept log is one person’s contemporaneous account. Its value comes from being written at or near the time, sticking to facts, and being backed up by other material such as time-clock or pay-stub photos. It is not proof on its own, and no representation is made about how any employer, agency, or court will treat it. Not legal advice. Confirm anything you intend to rely on with an employment attorney or the California Labor Commissioner.';

// Lead rows for the CSV export. A spreadsheet is the export most likely to be forwarded
// and read out of context, and it has no room for a paragraph — so: short lines, the two
// facts that matter, before the header.
export const CSV_PREAMBLE = [
  'JobWarden export - a personal log kept by one worker, recording their own account.',
  'Not verified by anyone. The "possible issues" column points at rules that may apply; it is not a finding that any rule was broken, and it does not mean a claim exists.',
  'No dollar amounts are calculated. Not legal advice.',
];

// Words that must never appear in user-facing copy, because each one asserts something the
// app cannot know. Guarded by tests/disclaimers.test.mjs.
//   proof / prove — the app produces records, not proof
//   case file / your case — implies a claim exists
//   guarantee / hold up / win — predicts an outcome
//   violation / illegal — a conclusion only a factfinder reaches (quoting a statute is fine
//     in the rights guide, where the subject is the rule and not the user's situation)
export const BANNED_CLAIM_WORDS = [
  'proof', 'proves', 'prove it', 'case file', 'your case', 'you have a case',
  'guarantee', 'guaranteed', 'will hold up', 'holds up in court', 'win your',
  'your employer broke', 'this proves',
];
