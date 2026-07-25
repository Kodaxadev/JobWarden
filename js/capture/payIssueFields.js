// payIssueFields.js — structured capture for California pay and leave fact patterns.
// One concern: ask for the minimum facts that make each report useful without deciding it.
import { el } from '../ui/dom.js';
import { FIELD } from '../config/infractionTypes.js';
import {
  PAYSTUB_ITEMS, TIP_PROBLEM_OPTIONS, SICK_ACTION_OPTIONS,
} from '../config/payIssueOptions.js';
import {
  section, field, textInput, checkbox, triSelect, selectInput, timeRow, dateField,
} from './fieldUi.js';

function toggle(list, key, on) {
  const at = list.indexOf(key);
  if (on && at < 0) list.push(key);
  if (!on && at >= 0) list.splice(at, 1);
}

function splitShiftSection(state) {
  const split = state.splitShift;
  return section('split', 'clock', 'Your split workday',
    'Record both work periods and the unpaid gap between them.',
    [
      el('div', { class: 'grid2' }, [
        timeRow('First period started', split.firstStart, v => split.firstStart = v),
        timeRow('First period ended', split.firstEnd, v => split.firstEnd = v),
      ]),
      el('div', { class: 'grid2' }, [
        timeRow('Second period started', split.secondStart, v => split.secondStart = v),
        timeRow('Second period ended', split.secondEnd, v => split.secondEnd = v),
      ]),
    ],
    [
      field('Did the employer set the unpaid gap?', triSelect(split.employerSet, v => split.employerSet = v),
        'A voluntary gap may not be a split shift under the Wage Orders.'),
      field('Did you live at the workplace?', triSelect(split.livesAtWork, v => split.livesAtWork = v),
        'Many Wage Orders include a live-at-work exception.'),
      field('Was extra split-shift pay shown?', triSelect(split.premiumPaid, v => split.premiumPaid = v),
        'Record what the pay stub showed; JobWarden does not calculate the amount.'),
    ]);
}

function payStubSection(state) {
  const stub = state.payStub;
  return section('paystub', 'receipt-text', 'Your pay stub',
    'Choose what was missing or looked wrong. A photo can preserve the exact statement.',
    [
      el('div', { class: 'grid2' }, [
        dateField('Pay period started', stub.periodStart, v => stub.periodStart = v),
        dateField('Pay period ended', stub.periodEnd, v => stub.periodEnd = v),
      ]),
      el('p', { class: 'sub-head', text: 'What did you notice?' }),
      ...PAYSTUB_ITEMS.map(([key, label]) =>
        checkbox(label, stub.issues.includes(key), on => toggle(stub.issues, key, on))),
    ],
    [
      field('Other detail', textInput(stub.detail, v => stub.detail = v, {
        placeholder: 'Write what the statement showed',
      })),
      dateField('Date you asked for a copy', stub.requestedOn, v => stub.requestedOn = v),
      dateField('Date a copy arrived', stub.receivedOn, v => stub.receivedOn = v,
        'California generally allows up to 21 calendar days after a request.'),
    ]);
}

function tipsSection(state) {
  const tips = state.tips;
  const problem = selectInput(tips.problem, TIP_PROBLEM_OPTIONS, v => tips.problem = v);
  return section('tips', 'badge-dollar-sign', 'Your tips',
    'Record what happened to customer tips, without estimating what the law requires.',
    [
      field('What happened to the tips?', problem),
      el('div', { class: 'grid2' }, [
        dateField('Date it happened', tips.date, v => tips.date = v),
        field('Amount you recorded', textInput(tips.amount, v => tips.amount = v, {
          placeholder: 'e.g. $24.50',
          inputmode: 'decimal',
        })),
      ]),
    ],
    [
      field('Who handled or kept the tips', textInput(tips.by, v => tips.by = v, {
        placeholder: 'Name or role',
      })),
      dateField('Date you asked about it', tips.askedOn, v => tips.askedOn = v),
      field('What they said', textInput(tips.response, v => tips.response = v)),
    ]);
}

function sickLeaveSection(state) {
  const sick = state.sickLeave;
  const action = selectInput(sick.action, SICK_ACTION_OPTIONS, v => sick.action = v);
  return section('sick', 'calendar-heart', 'Your paid sick leave request',
    'Do not include a diagnosis. Record the request and what the employer did next.',
    [
      el('div', { class: 'grid2' }, [
        dateField('Date you requested leave', sick.requestDate, v => sick.requestDate = v),
        dateField('Date of the employer action', sick.actionDate, v => sick.actionDate = v),
      ]),
      field('What happened after the request?', action),
      field('Did you have accrued sick time available?', triSelect(sick.available, v => sick.available = v),
        'The state rule generally protects accrued and available sick leave.'),
    ],
    [
      field('Who you told', textInput(sick.told, v => sick.told = v, { placeholder: 'Name or role' })),
      field('How you asked', selectInput(sick.channel, [
        ['', 'Not entered'], ['Said it', 'Said it'], ['Text', 'Text'],
        ['Email', 'Email'], ['HR portal', 'HR portal'], ['Other', 'Other'],
      ], v => sick.channel = v)),
      field('What they said or wrote', textInput(sick.response, v => sick.response = v)),
    ]);
}

export function payIssueSections(state, activeFields) {
  const defs = [
    [FIELD.SPLIT, splitShiftSection],
    [FIELD.PAYSTUB, payStubSection],
    [FIELD.TIPS, tipsSection],
    [FIELD.SICK, sickLeaveSection],
  ];
  return defs.filter(([key]) => activeFields.includes(key)).map(([, render]) => render(state));
}
