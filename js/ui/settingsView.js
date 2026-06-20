// settingsView.js — profile, workplaces, data safety. One concern: settings UI.
import { el, clear, toast } from './dom.js';
import { getSettings, saveSettings } from '../data/settingsRepo.js';
import { requestPersistence } from '../data/db.js';

const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }), input,
  hint ? el('span', { class: 'hint', text: hint }) : null,
]);
const text = (v, ph) => el('input', { type: 'text', value: v || '', placeholder: ph || '' });

export async function renderSettingsView(container, { onShowRights } = {}) {
  clear(container);
  const s = await getSettings();

  const name = text(s.employeeName, 'Your name');
  const role = text(s.role, 'e.g. cashier, server, caregiver');
  const employer = text(s.employer, 'Employer');
  const pay = el('select', {});
  [['', 'Select…'], ['hourly', 'Hourly'], ['commission', 'Commissioned'], ['salary_exempt', 'Salaried']]
    .forEach(([v, t]) => pay.appendChild(el('option', { value: v, text: t, selected: s.payType === v })));
  const payWarn = el('p', { class: 'hint warn-text', hidden: s.payType !== 'salary_exempt',
    text: 'Some pay types have different rules. If you are not sure, ask a lawyer or the Labor Commissioner.' });
  pay.addEventListener('change', () => { payWarn.hidden = pay.value !== 'salary_exempt'; });

  const sched = (val) => {
    const sel = el('select', {});
    [['', 'Not sure / N/A'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) => sel.appendChild(el('option', { value: v, text: t, selected: val === v })));
    return sel;
  };
  const aws = sched(s.awsElection);
  const cba = sched(s.cbaCovered);

  const places = el('textarea', { rows: '3', placeholder: 'One place per line' });
  places.value = (s.workplaces || []).join('\n');

  const save = el('button', { class: 'btn primary', text: 'Save settings', onclick: async () => {
    await saveSettings({
      employeeName: name.value.trim(), role: role.value.trim(), employer: employer.value.trim(),
      payType: pay.value, awsElection: aws.value, cbaCovered: cba.value,
      workplaces: places.value.split('\n').map(x => x.trim()).filter(Boolean),
    });
    toast('Settings saved');
  } });
  const persistBtn = el('button', { class: 'btn', text: 'Keep records on this phone', onclick: async () => {
    const ok = await requestPersistence();
    toast(ok ? 'Storage set to persistent' : 'Browser said no — back up often');
  } });

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'About you' }),
    field('Name', name), field('Role', role), field('Employer', employer),
    field('Pay type', pay, 'Hourly workers get the strongest break protections.'), payWarn,
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Schedule & coverage' }),
    el('p', { class: 'hint', text: 'Optional — helps the app avoid flagging rules that may not apply to you.' }),
    field('Alternative workweek (e.g. four 10-hour days)?', aws, 'If validly adopted by a vote, daily overtime after 8 hours may not apply.'),
    field('Covered by a union contract (CBA)?', cba, 'A union agreement can change the meal/rest rules.'),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Workplaces' }),
    field('Your workplaces', places, 'These fill in the place box when you log.'),
    el('div', { class: 'actions' }, [save]),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Know your rights' }),
    el('p', { class: 'hint', text: 'Plain-language California wage-and-hour basics — general information, not legal advice.' }),
    el('div', { class: 'actions' }, [
      el('button', { type: 'button', class: 'btn', text: 'Open the rights guide', onclick: () => onShowRights?.() }),
    ]),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Data safety' }),
    el('p', { class: 'hint', text: 'Records stay on this phone only. Keeping storage persistent lowers the chance the browser clears them — but it is not a backup. Export often.' }),
    el('p', { class: 'hint', text: 'Not legal advice. No audio recording (illegal in California without all-party consent).' }),
    el('div', { class: 'actions' }, [persistBtn]),
  ]));
}
