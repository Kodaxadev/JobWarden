// payIssueRules.js — California analysis for structured pay-stub, tip, split-shift,
// and paid-sick-leave reports. One concern: factual pointers, never legal verdicts.
import { formatDate } from './timeUtils.js';
import { payStubIssueLabel, tipProblemLabel, sickActionLabel } from '../config/payIssueOptions.js';

const flag = (key, value, note) => ({ key, value, note });
const picked = (incident, type) => (incident.types || []).includes(type);
const day = value => value ? Date.parse(`${value}T00:00:00`) : NaN;

function splitShiftFlags(incident) {
  if (!picked(incident, 'split_shift')) return [];
  const split = incident.splitShift || {};
  if (split.employerSet === true && split.livesAtWork === false && split.premiumPaid === false) {
    return [flag('splitShiftPremiumMissing', true,
      'Reported an employer-set unpaid gap between work periods, no live-at-work exception, and no extra split-shift pay shown. Many IWC Wage Orders require a split-shift premium; the applicable Wage Order must be confirmed.')];
  }
  if (split.livesAtWork === true) {
    return [flag('splitShiftContext', true,
      'Reported living at the workplace. Many IWC Wage Orders include a live-at-work exception to split-shift premium pay; confirm the applicable Wage Order.')];
  }
  if (split.employerSet === false) {
    return [flag('splitShiftContext', true,
      'Reported that the worker, not the employer, chose the unpaid gap. The Wage Orders define a split shift as an employer-established gap; confirm the schedule facts.')];
  }
  return [flag('splitShiftReported', true,
    'Reported two work periods separated by an unpaid gap. Whether the employer set the gap, any live-at-work exception, and the applicable Wage Order still need confirmation.')];
}

function payStubFlags(incident, asOfDate) {
  if (!picked(incident, 'pay_stub_problem')) return [];
  const stub = incident.payStub || {};
  const issues = Array.isArray(stub.issues) ? stub.issues : [];
  const out = [];
  if (issues.length) {
    out.push(flag('payStubProblemReported', issues,
      `Reported pay-stub concern(s): ${issues.map(payStubIssueLabel).join('; ')}. Labor Code §226 generally requires specified itemized information; exceptions and injury standards can affect a claim.`));
  } else {
    out.push(flag('payStubReported', true,
      'Reported a missing or inaccurate pay stub, but the item or statement detail was not recorded. Potential Labor Code §226 issue as reported.'));
  }
  if (stub.requestedOn && !stub.receivedOn) {
    const elapsed = Math.floor((day(asOfDate) - day(stub.requestedOn)) / 86400000);
    if (elapsed > 21) {
      out.push(flag('payStubCopyOverdue', elapsed,
        `A copy was requested on ${formatDate(stub.requestedOn)} and no receipt date was recorded after ${elapsed} days. Section 226 generally requires a response within 21 calendar days.`));
    }
  }
  return out;
}

function tipFlags(incident) {
  if (!picked(incident, 'tips_problem')) return [];
  const tips = incident.tips || {};
  if (!tips.problem) {
    return [flag('tipsReported', true,
      'Reported a tip problem without selecting what happened. Labor Code §351 may apply; add the tip event and any pay-stub or message detail available.')];
  }
  const details = {
    kept: 'Labor Code §351 generally bars an employer or agent from taking gratuities left for employees.',
    fees: 'Labor Code §351 generally requires the full credit-card tip without deducting processing fees.',
    late_card: 'Labor Code §351 generally requires credit-card tips by the next regular payday.',
    tip_credit: 'California generally does not allow tips to count toward the employer’s minimum-wage obligation.',
    manager_pool: 'Owner, manager, or supervisor participation can raise a §351 tip-pool issue; the person’s actual role and authority matter.',
    other: 'Labor Code §351 may apply; preserve the pay stub, tip record, policy, and messages.',
  };
  return [flag('tipsProblemReported', tips.problem,
    `Reported tip issue: ${tipProblemLabel(tips.problem)}. ${details[tips.problem] || details.other}`)];
}

function sickLeaveFlags(incident) {
  if (!picked(incident, 'sick_leave_problem')) return [];
  const sick = incident.sickLeave || {};
  if (!sick.action) {
    return [flag('sickLeaveReported', true,
      'Reported a paid-sick-leave problem without recording what happened after the request. Add the request and employer action if known.')];
  }
  if (sick.available === false) {
    return [flag('sickLeaveContext', sick.action,
      `Reported employer action: ${sickActionLabel(sick.action)}. The worker marked that accrued sick time was not available; other leave or retaliation rules may still matter.`)];
  }
  const availability = sick.available === true ? 'Accrued sick time was reported as available.' : 'Whether accrued sick time was available is not confirmed.';
  return [flag('sickLeaveActionReported', sick.action,
    `Reported employer action after a paid-sick-leave request: ${sickActionLabel(sick.action)}. ${availability} Labor Code §246.5 protects specified sick-leave use and related activity; the facts still require review.`)];
}

/**
 * @param {import('./types.js').Incident} incident
 * @param {{asOfDate?: string}} [options]
 */
export function analyzePayIssues(incident, options = {}) {
  const asOfDate = options.asOfDate || '';
  return [
    ...splitShiftFlags(incident),
    ...payStubFlags(incident, asOfDate),
    ...tipFlags(incident),
    ...sickLeaveFlags(incident),
  ];
}
