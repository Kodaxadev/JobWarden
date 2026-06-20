// jurisdictions.js — which legal rule set the app covers. One concern: keeping the scope
// EXPLICIT so a now-broader audience is never misled into thinking California findings apply
// to their state. Only California is implemented today. The per-state rules interface will be
// EXTRACTED from the second state (New York) — not guessed from California alone — so this file
// stays deliberately thin (labels/scope only, no rules abstraction) until there are two states.
export const JURISDICTIONS = {
  CA: { code: 'CA', label: 'California', status: 'live' },
};
export const DEFAULT_JURISDICTION = 'CA';

export function jurisdictionLabel(code) {
  return (JURISDICTIONS[code] || JURISDICTIONS[DEFAULT_JURISDICTION]).label;
}
