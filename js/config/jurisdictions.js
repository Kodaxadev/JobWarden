// jurisdictions.js — which legal rule set the app covers. One concern: keeping the scope
// EXPLICIT so a now-broader audience is never misled into thinking California findings apply
// to their state. Only California is implemented today. The per-state rules interface will be
// EXTRACTED from the second state (New York) — not guessed from California alone — so this file
// stays deliberately thin (labels/scope only, no rules abstraction) until there are two states.
export const JURISDICTIONS = {
  CA: { code: 'CA', label: 'California', status: 'live', rulesAsOf: 'June 2026' },
  // 'draft' = rules built + tested, but NOT exposed to users until a NY employment-attorney
  // reviews the findings language (see docs/LEGAL_FOUNDATION.md). No picker offers it yet.
  NY: { code: 'NY', label: 'New York', status: 'draft', rulesAsOf: 'June 2026' },
};
export const DEFAULT_JURISDICTION = 'CA';

const at = (code) => JURISDICTIONS[code] || JURISDICTIONS[DEFAULT_JURISDICTION];
export function jurisdictionLabel(code) { return at(code).label; }
export function rulesAsOf(code) { return at(code).rulesAsOf; }
// Jurisdictions a user may actually select (attorney-cleared). NY stays out until reviewed.
export function liveJurisdictions() { return Object.values(JURISDICTIONS).filter(j => j.status === 'live'); }
