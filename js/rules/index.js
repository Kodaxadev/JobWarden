// rules/index.js — jurisdiction → rule set dispatch.
// The evidence engine (capture, model, integrity, patterns, export) is jurisdiction-agnostic;
// only the RULES vary. getRules(j) returns the rule module for a record's jurisdiction;
// an unknown or missing jurisdiction falls back to California. New York slots in here as
// './newYork.js' + RULES.NY once its rules are implemented (NY research doc §3).
import * as california from './california.js';

const RULES = { CA: california };

export function getRules(jurisdiction) {
  return RULES[jurisdiction] || RULES.CA;
}
