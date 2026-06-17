// captureForm.js — Evidence Trail orchestration. One concern: assemble the trail → validate → save.
import { el, clear, toast } from '../ui/dom.js';
import { fieldsForTypes, FIELD } from '../config/infractionTypes.js';
import { TRAIL_STEPS, EXTRA_STEPS } from '../config/uiCopy.js';
import { createIncident, reviseIncident, validateIncident } from '../domain/incidentModel.js';
import { addIncident, putIncident } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import {
  buildInitialState, logStatusRow, trailStep, issueGroups, basicsBody,
  clockBody, mealBody, restBody, offClockBody, noticeBody, proofBody, storyBody,
} from './captureFields.js';

const STEP = Object.fromEntries(TRAIL_STEPS.map(s => [s.id, s]));

export async function renderCaptureForm(container, { onSaved, existing } = {}) {
  clear(container);
  const settings = await getSettings();
  const state = buildInitialState(existing, settings);

  const wrap = el('form', { class: 'capture', autocomplete: 'off' });
  wrap.addEventListener('submit', e => e.preventDefault());
  wrap.appendChild(logStatusRow());

  const trail = el('div', { class: 'trail' });
  wrap.appendChild(trail);

  const saveBtn = el('button', { type: 'button', class: 'btn primary big',
    text: existing ? 'Save changes' : 'Save record', onclick: () => save() });
  wrap.appendChild(el('div', { class: 'actions' }, [saveBtn]));

  if ((settings.workplaces || []).length) {
    const dl = el('datalist', { id: 'workplaces' });
    settings.workplaces.forEach(w => dl.appendChild(el('option', { value: w })));
    wrap.appendChild(dl);
  }

  container.appendChild(wrap);
  renderTrail();

  function renderTrail() {
    clear(trail);
    const f = fieldsForTypes(state.types);
    const issueBody = el('div', {}, [basicsBody(state), issueGroups(state, renderTrail)]);
    trail.appendChild(trailStep(STEP.issue, issueBody, state.types.length > 0));

    if (f.includes(FIELD.CLOCK)) {
      trail.appendChild(trailStep(STEP.time, clockBody(state), !!(state.clockIn && state.clockOut)));
    }
    if (f.includes(FIELD.MEAL) || f.includes(FIELD.MEAL2)) {
      trail.appendChild(trailStep(STEP.meal, mealBody(state, f.includes(FIELD.MEAL2)), !!(state.meal.start || state.meal.taken === false)));
    }
    if (f.includes(FIELD.REST)) {
      trail.appendChild(trailStep(EXTRA_STEPS.rest, restBody(state), state.rest.taken != null || state.rest.interrupted || state.rest.onCall));
    }
    if (f.includes(FIELD.OFFCLOCK)) {
      trail.appendChild(trailStep(STEP.offClock, offClockBody(state), !!(state.offClock.start || state.offClock.task)));
    }
    if (f.includes(FIELD.NOTICE)) {
      trail.appendChild(trailStep(EXTRA_STEPS.notice, noticeBody(state), !!state.notice.to));
    }
    trail.appendChild(trailStep(STEP.proof, proofBody(state), !!(state.attachments.length || state.location || state.witnesses)));
    trail.appendChild(trailStep(STEP.story, storyBody(state), !!state.narrative));
  }

  async function save() {
    const input = {
      incidentDate: state.incidentDate, workplace: state.workplace, location: state.location,
      clockIn: state.clockIn, clockOut: state.clockOut, types: state.types,
      classification: { payType: settings.payType },
      meal: state.meal, meal2: state.meal2, rest: state.rest, offClock: state.offClock, notice: state.notice,
      witnesses: state.witnesses, narrative: state.narrative, attachments: state.attachments,
    };
    const draft = existing ? reviseIncident(existing, input) : createIncident(input);
    const { valid, errors } = validateIncident(draft);
    if (!valid) { toast(errors[0] === 'Pick at least one issue type.' ? 'Pick what happened' : errors[0]); return; }
    try {
      if (existing) await putIncident(draft); else await addIncident(draft);
      toast(existing ? 'Record updated' : 'Saved on this phone ✓');
      onSaved?.(draft);
    } catch (err) {
      toast('Could not save: ' + (err?.message || err));
    }
  }
}
