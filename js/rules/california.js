// rules/california.js — the California rule set.
// For now it re-exports the CA logic that already lives, pure, in domain/breakRules.js.
// The full per-state interface (issues / sections / disclosures) will be EXTRACTED once
// New York exists as a second implementation — deliberately NOT guessed from California
// alone. See docs/superpowers/plans/2026-06-20-newyork-rules-research.md.
export { analyze, summarize } from '../domain/breakRules.js';
