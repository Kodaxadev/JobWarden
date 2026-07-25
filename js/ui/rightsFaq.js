// rightsFaq.js — offline "Know your rights" reference. One concern: plain-language California
// wage-and-hour basics so the facts they log make sense. GENERAL INFORMATION ONLY, not legal
// advice about anyone's situation (kept deliberately educational to stay clear of UPL). Bundled
// so it works with no network. Mirrors the rules the app already encodes in breakRules.
import { el, clear } from './dom.js';

// Exported so tests/uiCopy.test.mjs can hold the line on sentence length: this is the
// longest prose in the app, read on a phone by someone who is upset, and a 35-word
// sentence is where comprehension goes even when every word in it is plain.
export const TOPICS = [
  {
    q: 'Meal breaks — the “5th hour” rule',
    paras: [
      'California law requires a 30-minute meal break once a worker passes 5 hours. It is unpaid, and it must be free of all duty. It also has to start before the end of your 5th hour of work.',
      'Work more than 10 hours and a second 30-minute meal is owed.',
      'A meal only counts if you are truly relieved: free to leave, doing nothing for the employer, and uninterrupted. A short shift (6 hours or less) can waive the first meal by mutual agreement.',
    ],
    cite: 'Labor Code §512; IWC Wage Orders',
    app: 'The shift tracker warns you before your 5th hour, and records flag a late, missed, short, or interrupted meal.',
  },
  {
    q: 'On-duty meals (working through lunch)',
    paras: [
      'An “on-duty” meal is one where you keep working or stay available. It is allowed only when two things are both true. The nature of the work genuinely prevents being relieved. And you have signed a written agreement to it — one you can cancel. When that applies, the meal is paid.',
      'Being told to keep a radio or phone on, cover the register, or answer questions during lunch generally means you were not relieved of all duty.',
    ],
    cite: 'Labor Code §512; IWC Wage Order §11',
    app: 'The lunch step and the “Interrupted lunch” quick button capture whether you worked during the meal and whether a written agreement exists.',
  },
  {
    q: 'Rest breaks',
    paras: [
      'California law requires a paid 10-minute rest break for every 4 hours worked, or major fraction of 4 hours. Roughly: one break for 3.5–6 hours, two for 6–10 hours, three for 10–14 hours.',
      'A rest break must also be duty-free: you cannot be kept on call during it.',
    ],
    cite: 'Labor Code §226.7; Augustus v. ABM (2016)',
    app: 'Records compare the rest breaks you took against the number owed for the hours worked.',
  },
  {
    q: 'Off-the-clock work',
    paras: [
      'All time the employer “suffers or permits” you to work must be paid. That covers setting up before clock-in, closing after clock-out, working through an unpaid break, and answering messages off the clock.',
      'An employer may not edit or round your time records in a way that erases hours you actually worked.',
    ],
    cite: 'Labor Code §§1194, 1198, 226',
    app: 'The off-the-clock step records the unpaid minutes, who directed the work, and whether your time record was changed.',
  },
  {
    q: 'Sent home early after you showed up',
    paras: [
      'When a worker reports for a scheduled shift and is sent home before working half of it, California law calls for “reporting-time pay.” That is half the scheduled shift — at least 2 hours of pay, and at most 4.',
      'It is about the shift you were scheduled for, not the hours you ended up working. So the scheduled start and end are the numbers to write down.',
      'There are exceptions. If the cause was outside the employer’s control — a power failure, a threat to safety, an official shutdown — reporting-time pay may not be owed. Write down the reason you were given, in their words.',
    ],
    cite: 'IWC Wage Orders §5',
    app: 'Pick “Sent home early after showing up” and the Log screen asks for the scheduled shift, who sent you home, and the reason. A shift worked at under half its schedule gets flagged.',
  },
  {
    q: 'Paying for things the job needs',
    paras: [
      'California law requires an employer to pay a worker back for what they have to spend to do the job. That covers required uniforms, tools and equipment, mileage in your own car, and a phone or data plan you are expected to use for work.',
      'This holds even if you agreed to pay. You cannot sign away the right to be reimbursed.',
      'Keep the receipt, and keep the message where you asked to be paid back. The asking is evidence too.',
    ],
    cite: 'Labor Code §2802',
    app: 'Pick “Paid for something the job needed” and the Log screen records what it was and what it cost. It also asks whether you were paid back, when you asked, and what they said.',
  },
  {
    q: 'Overtime and the four-10s schedule',
    paras: [
      'Normally overtime is 1.5× pay after 8 hours in a day or 40 in a week, and 2× after 12 in a day.',
      'An alternative workweek (for example, four 10-hour days) can make the scheduled hours up to 10 straight time. That only holds if it was adopted by a two-thirds secret-ballot vote and properly reported. If it was not, daily overtime still applies. Either way, meal and rest rules do not change.',
    ],
    cite: 'Labor Code §§510, 511',
    app: 'In Settings you can mark an alternative workweek so findings note the exception instead of overstating overtime. The app does not calculate dollar amounts.',
  },
  {
    q: 'Final pay and waiting-time penalties',
    paras: [
      'If you are fired, your final pay is due immediately. If you quit with at least 72 hours’ notice, it is due on your last day; without notice, within 72 hours.',
      'If the employer is late with final wages, a “waiting-time penalty” of up to 30 days of your daily pay can apply.',
    ],
    cite: 'Labor Code §§201–203',
  },
  {
    q: 'Pay stubs and your records',
    paras: [
      'California law requires an accurate, itemized wage statement each pay period, and gives workers the right to inspect or copy their own time and pay records.',
      'Keeping your own contemporaneous log — like this one — protects you if the employer’s records are wrong or missing.',
    ],
    cite: 'Labor Code §§226, 1174',
  },
  {
    q: 'Speaking up and retaliation',
    paras: [
      'It is illegal for an employer to fire, demote, cut hours, or otherwise punish you for raising concerns about wages or breaks, or for filing a claim.',
      'If something changes after you speak up, write down the timeline — what you said, to whom, and what happened next.',
    ],
    cite: 'Labor Code §§98.6, 1102.5',
    app: 'The “what happened after I spoke up” field captures adverse action after a complaint.',
  },
  {
    q: 'Deadlines and filing a claim',
    paras: [
      'You can file a wage claim with the California Labor Commissioner (DLSE). It is free and you do not need a lawyer.',
      'Claims have deadlines (statutes of limitation) — often three years for many wage violations, and shorter for some. Do not wait too long.',
    ],
    cite: 'Code of Civil Procedure §338; Labor Code §203',
  },
];

const link = (text, href) => el('a', { class: 'rights-link', href, target: '_blank', rel: 'noopener noreferrer', text });

export function renderRightsFaq(container, { onBack } = {}) {
  clear(container);
  container.appendChild(el('div', { class: 'rights-head' }, [
    onBack ? el('button', { type: 'button', class: 'btn tiny', text: '← Back', onclick: onBack }) : null,
    el('h2', { text: 'Know your rights — California' }),
  ]));
  container.appendChild(el('p', { class: 'hint', text: 'Plain-language basics of California wage-and-hour law, so the facts you log make sense. This is general information, not legal advice about your situation.' }));

  TOPICS.forEach(t => {
    container.appendChild(el('details', { class: 'rights-item' }, [
      el('summary', {}, [el('span', { text: t.q })]),
      el('div', { class: 'rights-body' }, [
        ...t.paras.map(p => el('p', { text: p })),
        t.app ? el('p', { class: 'rights-app' }, [el('strong', { text: 'In this app: ' }), document.createTextNode(t.app)]) : null,
        el('p', { class: 'rights-cite', text: t.cite }),
      ]),
    ]));
  });

  container.appendChild(el('section', { class: 'card rights-foot' }, [
    el('h3', { text: 'Where to get help' }),
    el('p', { class: 'hint', text: 'These rules have exceptions and deadlines. For advice about your situation, contact the California Labor Commissioner (DLSE) or an employment attorney. Filing a wage claim is free.' }),
    el('div', { class: 'rights-links' }, [
      link('California Labor Commissioner (DLSE)', 'https://www.dir.ca.gov/dlse/'),
      link('How to file a wage claim', 'https://www.dir.ca.gov/dlse/HowToFileWageClaim.htm'),
      link('Meal & rest period FAQ', 'https://www.dir.ca.gov/dlse/faq_mealperiods.htm'),
    ]),
  ]));
}
