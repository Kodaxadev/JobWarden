// legalView.js — in-app legal & privacy disclosure. One concern: telling the user plainly what
// JobWarden is (a documentation tool + general info, NOT legal advice) and what it does with
// their data (nothing leaves the device unless they export it). Plain-language summary; the
// formal privacy policy + terms still need an attorney before public launch (see docs/LEGAL_FOUNDATION.md).
import { el, clear } from './dom.js';
import { jurisdictionLabel, rulesAsOf } from '../config/jurisdictions.js';
import { NOT_A_VERDICT, WHAT_FINDINGS_MEAN, WHAT_THE_SEAL_MEANS } from '../config/disclaimers.js';

const link = (text, href) => el('a', { class: 'rights-link', href, target: '_blank', rel: 'noopener noreferrer', text });
const card = (title, paras, extra) => el('section', { class: 'card' }, [
  el('h3', { text: title }), ...paras.map(p => el('p', { class: 'legal-p', text: p })), ...(extra || []),
]);

export function renderLegal(container, { settings = {}, onBack } = {}) {
  clear(container);
  const region = jurisdictionLabel(settings.jurisdiction);

  container.appendChild(el('div', { class: 'rights-head' }, [
    onBack ? el('button', { type: 'button', class: 'btn tiny', text: '← Back', onclick: onBack }) : null,
    el('h2', { text: 'Legal & privacy' }),
  ]));

  container.appendChild(el('section', { class: 'card legal-disclaim' }, [
    el('p', { class: 'legal-lead', text: NOT_A_VERDICT }),
    el('p', { text: `JobWarden gives you general information about ${region} labor law and helps you keep your own records. It is not legal advice, not a law firm, and not a substitute for a lawyer or the Labor Commissioner.` }),
    el('p', { text: `The rules and checks shown here cover ${region} only. Rules in other states differ.` }),
    el('p', { text: 'Rules have exceptions and deadlines. For advice about your situation, talk to a licensed employment attorney or your state Labor Commissioner.' }),
  ]));

  container.appendChild(card('What your records are — and are not', [
    'What you enter is your own account of your own working conditions, in your own words. Nobody has checked it, and the app does not claim it is true — it records what you said, and when you said it.',
    ...WHAT_FINDINGS_MEAN,
    WHAT_THE_SEAL_MEANS,
  ]));

  container.appendChild(card('Full policies', [
    'The summary below is the short version. Read the complete documents:',
  ], [
    el('div', { class: 'rights-links' }, [
      link('Privacy Policy', './privacy.html'),
      link('Terms of Service', './terms.html'),
    ]),
  ]));

  container.appendChild(card('Your privacy', [
    'Your records and profile are stored only on this device. There is no account, no server, no cloud sync, no analytics, and no tracking — nothing is sent anywhere on its own.',
    'Your information leaves this device only when you choose to export, email, print, or share it. After that, it is in your hands.',
    'Photos you add stay on this device. JobWarden never records audio. California generally requires every party’s consent before recording a confidential conversation; exceptions can apply.',
    'Because everything is local, losing this phone or letting the browser clear its storage can lose your records. Back up regularly from the Export screen.',
  ]));

  container.appendChild(card('Facts, not a calculator', [
    'JobWarden records facts and counts — times, dates, and what happened. It does not calculate what you are owed, does not decide whether a rule was broken, and does not predict what any employer, agency, or court will do. Those are for the Labor Commissioner or an attorney.',
  ]));

  container.appendChild(card('Provided “as is”', [
    'JobWarden is provided as is, with no guarantee that its information is complete or current. You are responsible for confirming the facts you enter and the law that applies to you.',
    `${region} information last updated ${rulesAsOf(settings.jurisdiction)}.`,
  ]));

  container.appendChild(card('Where to get help', [
    'Filing a wage claim is free and you do not need a lawyer.',
  ], [
    el('div', { class: 'rights-links' }, [
      link('California Labor Commissioner (DLSE)', 'https://www.dir.ca.gov/dlse/'),
      link('How to file a wage claim', 'https://www.dir.ca.gov/dlse/HowToFileWageClaim.htm'),
    ]),
    el('p', { class: 'hint', text: 'Not affiliated with any employer or government agency.' }),
  ]));

  // A reachable human. Someone who thinks the app got the law wrong, or wants their name
  // out of something, should have somewhere to write before they escalate.
  container.appendChild(card('Who makes this', [
    'JobWarden is made by Kodaxa Innovations (kodaxa.dev) — an independent developer, not a company and not a law firm.',
    'Something wrong, unclear, or out of date? Write and it gets fixed.',
  ], [
    el('div', { class: 'rights-links' }, [link('Justin@Kodaxa.dev', 'mailto:Justin@Kodaxa.dev')]),
  ]));
}
