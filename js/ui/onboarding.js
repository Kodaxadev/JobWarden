// onboarding.js — first-run setup gate. One concern: collect the profile that makes
// records and reports complete (name, employer, pay type, workplaces) before the first
// log, then hand off to the Log screen. Shown once; Settings edits everything later.
import { el, clear, toast } from './dom.js';
import { icon } from './icons.js';
import { getSettings, saveSettings } from '../data/settingsRepo.js';
import { requestPersistence } from '../data/db.js';
import { NOT_A_VERDICT, ONBOARD_ACK } from '../config/disclaimers.js';
import { PAY_STATUS_OPTIONS, PAY_STATUS_HINT, EXEMPT_STATUS_WARNING } from '../config/payStatus.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }), input,
  hint ? el('span', { class: 'hint', text: hint }) : null,
]);
const text = (v, ph) => el('input', { type: 'text', value: v || '', placeholder: ph || '' });

export async function renderOnboarding(container, { onDone } = {}) {
  clear(container);
  const s = await getSettings();

  const name = text(s.employeeName, 'Your name');
  const employer = text(s.employer, 'Employer');
  const role = text(s.role, 'e.g. cashier, server, caregiver');

  const pay = el('select', {});
  PAY_STATUS_OPTIONS.forEach(([v, t]) => pay.appendChild(el('option', { value: v, text: t, selected: s.payType === v })));
  const payWarn = el('p', { class: 'hint warn-text', hidden: s.payType !== 'salary_exempt',
    text: EXEMPT_STATUS_WARNING });
  pay.addEventListener('change', () => { payWarn.hidden = pay.value !== 'salary_exempt'; });

  const places = el('textarea', { rows: '3', placeholder: 'One place per line' });
  places.value = (s.workplaces || []).join('\n');

  const start = el('button', { type: 'button', class: 'btn primary big', onclick: finish },
    [iconEl('clipboard-pen'), document.createTextNode(' Start logging')]);

  // Acknowledged, not merely displayed. One sentence, in the same plain voice as everything
  // else, and the timestamp is stored with the profile — so what the person agreed to, and
  // when, is part of their own record rather than something only we would know.
  const ackBox = el('input', { type: 'checkbox', id: 'ack-understood' });
  const ack = el('label', { class: 'check onboard-ack', for: 'ack-understood' }, [
    ackBox,
    el('span', { text: ONBOARD_ACK }),
  ]);
  const ackHint = el('p', { class: 'hint', hidden: true, text: 'Tick the box above to continue.' });
  ackBox.addEventListener('change', () => { ackHint.hidden = true; });

  async function finish() {
    if (!ackBox.checked) {
      ackHint.hidden = false;
      ack.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ackBox.focus();
      return;
    }
    start.disabled = true;
    try { await requestPersistence(); } catch { /* best-effort; not fatal */ }
    try {
      await saveSettings({
        employeeName: name.value.trim(),
        employer: employer.value.trim(),
        role: role.value.trim(),
        payType: pay.value,
        workplaces: places.value.split('\n').map(x => x.trim()).filter(Boolean),
        onboardedAt: new Date().toISOString(),
        disclaimerAckAt: new Date().toISOString(),
        disclaimerAckText: ONBOARD_ACK,
      });
      toast('Saved on this phone ✓');
      onDone?.();
    } catch (err) {
      start.disabled = false;
      toast('Could not save: ' + (err?.message || err));
    }
  }

  container.appendChild(el('section', { class: 'onboard' }, [
    el('div', { class: 'onboard-head' }, [
      iconEl('shield-check'),
      el('h1', { text: 'Welcome to JobWarden' }),
      el('p', { class: 'onboard-tag', text: 'Keep a private record of meal breaks, rest breaks, and unpaid work — the moment it happens. It stays on this phone; only you can see it.' }),
      el('p', { class: 'onboard-scope', text: 'Currently built for California rules. More states are coming.' }),
    ]),
    el('details', { class: 'card onboard-setup', open: !!(s.employeeName || s.employer || s.role || s.workplaces?.length) }, [
      el('summary', { class: 'onboard-setup-summary' }, [
        el('span', { class: 'onboard-setup-title', text: 'Add optional profile details' }),
        el('span', { class: 'onboard-setup-action', text: 'Add' }),
      ]),
      el('div', { class: 'onboard-setup-body' }, [
        el('p', { class: 'hint', text: 'These make reports more complete. You can add or change them later in Settings.' }),
        field('Your name', name, 'Goes on your printable report.'),
        field('Employer', employer),
        field('Role', role),
        field('Pay and exemption status', pay, PAY_STATUS_HINT), payWarn,
        field('Where you work', places, 'These fill in the place box when you log.'),
      ]),
    ]),
    el('section', { class: 'card onboard-legal' }, [
      el('p', { class: 'legal-lead', text: NOT_A_VERDICT }),
      ack, ackHint,
      el('p', { class: 'hint' }, [
        document.createTextNode('Read the full '),
        el('a', { class: 'rights-link', href: './privacy.html', target: '_blank', rel: 'noopener noreferrer', text: 'Privacy Policy' }),
        document.createTextNode(' and '),
        el('a', { class: 'rights-link', href: './terms.html', target: '_blank', rel: 'noopener noreferrer', text: 'Terms of Service' }),
        document.createTextNode('. Your records stay on this phone.'),
      ]),
    ]),
    el('div', { class: 'savewrap' }, [start]),
  ]));
}
