// rules/index.js — jurisdiction → rule set dispatch.
// The evidence engine (capture, model, integrity, patterns, export) is jurisdiction-agnostic;
// only the RULES vary. getRules(j) returns the rule module for a record's jurisdiction;
// an unknown or missing jurisdiction falls back to California. New York slots in here as
// './newYork.js' + RULES.NY once its rules are implemented (NY research doc §3).
import * as california from './california.js';
import * as newYork from './newYork.js';

const RULES = { CA: california, NY: newYork };

export function getRules(jurisdiction) {
  return RULES[jurisdiction] || RULES.CA;
}

// Plain-language labels for every rule set's finding keys, merged. Keys are namespaced
// per state (or shared deliberately, e.g. timeRecordEdited), so merging is safe.
export function findingLabels() {
  return Object.assign({}, ...Object.values(RULES).map(r => r.FINDING_LABELS || {}));
}
