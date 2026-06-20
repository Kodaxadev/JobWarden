// onboarding.js — first-run setup gate. One concern: collect the profile that makes
// records and reports complete (name, employer, pay type, workplaces) before the first
// log, then hand off to the Log screen. Shown once; Settings edits everything later.
import { el, clear, toast } from './dom.js';
import { icon } from './icons.js';
import { getSettings, saveSettings } from '../data/settingsRepo.js';
import { requestPersistence } from '../data/db.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }), input,
  hint ? el('span', { class: 'hint', text: hint }) : null,
]);
const text = (v, ph) => el('input', { type: 'text', value: v || '', placeholder: ph || '' });

const PAY_OPTIONS = [['hourly', 'Hourly'], ['commission', 'Commissioned'], ['salary_exempt', 'Salaried'], ['', 'Not sure yet']];

export async function renderOnboarding(container, { onDone } = {}) {
  clear(container);
  const s = await getSettings();

  const name = text(s.employeeName, 'Your name');
  const employer = text(s.employer, 'Employer');
  const role = text(s.role, 'e.g. cashier, server, caregiver');

  const pay = el('select', {});
  PAY_OPTIONS.forEach(([v, t]) => pay.appendChild(el('option', { value: v, text: t, selected: s.payType === v })));
  const payWarn = el('p', { class: 'hint warn-text', hidden: s.payType !== 'salary_exempt',
    text: 'Some pay types have different break rules. If you are not sure, ask a lawyer or the Labor Commissioner.' });
  pay.addEventListener('change', () => { payWarn.hidden = pay.value !== 'salary_exempt'; });

  const places = el('textarea', { rows: '3', placeholder: 'One place per line' });
  places.value = (s.workplaces || []).join('\n');

  const start = el('button', { type: 'button', class: 'btn primary big', onclick: finish },
    [iconEl('clipboard-pen'), document.createTextNode(' Start logging')]);

  async function finish() {
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
    el('section', { class: 'card' }, [
      el('h2', { text: 'Quick setup' }),
      el('p', { class: 'hint', text: 'All optional — it just makes your records and reports more complete. You can skip this and add it later in Settings.' }),
      field('Your name', name, 'Goes on your printable report.'),
      field('Employer', employer),
      field('Role', role),
      field('Pay type', pay, 'Hourly workers get the strongest break protections.'), payWarn,
      field('Where you work', places, 'These fill in the place box when you log.'),
    ]),
    el('div', { class: 'savewrap' }, [start]),
    el('p', { class: 'onboard-foot', text: 'You can change all of this later in Settings.' }),
  ]));
}
