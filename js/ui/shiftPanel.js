// shiftPanel.js — the live shift tracker on the Log screen. One concern: starting/running an
// in-progress shift and capturing breaks live, then handing a pre-filled draft to the capture
// form at end of shift. Alerts (lunch due/overdue) are fired app-wide by the monitor in app.js.
import { el, clear, toast } from './dom.js';
import { icon } from './icons.js';
import { getActiveShift, saveActiveShift, clearActiveShift } from '../data/shiftRepo.js';
import { newShift, shiftStatus, shiftToDraft } from '../domain/shiftClock.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
const fmt = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fromMs = ms => new Date(ms).toISOString();

export async function renderShiftPanel(host, { settings = {}, onEndShift } = {}) {
  clear(host);
  if (host._shiftTimer) { clearInterval(host._shiftTimer); host._shiftTimer = null; }
  let shift = await getActiveShift();

  if (!shift) {
    const start = async () => {
      try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* optional */ }
      shift = newShift((settings.workplaces || [])[0] || '');
      await saveActiveShift(shift);
      await renderShiftPanel(host, { settings, onEndShift });
    };
    host.appendChild(el('button', { type: 'button', class: 'btn shift-start', onclick: start },
      [iconEl('clock'), document.createTextNode(' Start a shift')]));
    return;
  }

  const body = el('div', { class: 'shift-panel' });
  host.appendChild(body);

  const save = () => saveActiveShift(shift);
  const startLunch = async () => { (shift.meals = shift.meals || []).push({ start: new Date().toISOString(), end: null }); await save(); draw(); };
  const endLunch = async () => { const m = shift.meals[shift.meals.length - 1]; if (m) m.end = new Date().toISOString(); await save(); draw(); };
  const addRest = async () => { shift.restCount = (shift.restCount || 0) + 1; await save(); toast('Rest break logged'); draw(); };
  const endShift = async () => { const draft = shiftToDraft(shift, new Date().toISOString(), settings); await clearActiveShift(); onEndShift?.(draft); };

  function draw() {
    clear(body);
    const st = shiftStatus(shift);
    body.appendChild(el('div', { class: 'shift-head' }, [
      el('span', { class: 'shift-live' }, [el('span', { class: 'dot' }), document.createTextNode(' Shift in progress')]),
      el('span', { class: 'shift-since', text: `${fmt(shift.startedAt)} · ${Math.floor(st.elapsedMin / 60)}h ${st.elapsedMin % 60}m` }),
    ]));

    const meal = st.firstMealTaken
      ? { cls: st.onMeal ? 'soon' : 'ok', text: st.onMeal ? 'On lunch now — tap “End lunch” when you’re back' : 'Lunch recorded ✓' }
      : st.mealState === 'overdue' ? { cls: 'over', text: 'Lunch is overdue — your shift passed the 5th hour' }
      : st.mealState === 'soon' ? { cls: 'soon', text: `Lunch due soon — must start by ${fmt(fromMs(st.firstMealByMs))}` }
      : { cls: 'ok', text: `Lunch must start by ${fmt(fromMs(st.firstMealByMs))}` };
    body.appendChild(el('div', { class: 'shift-meal ' + meal.cls, text: meal.text }));
    if (st.secondMealDue) body.appendChild(el('div', { class: 'shift-meal over', text: 'Over 10 hours — a second meal is owed.' }));

    const lunchBtn = st.onMeal
      ? el('button', { type: 'button', class: 'btn primary', text: 'End lunch', onclick: endLunch })
      : el('button', { type: 'button', class: 'btn primary', text: st.firstMealTaken ? 'Start another break' : 'Start lunch', onclick: startLunch });
    body.appendChild(el('div', { class: 'shift-actions' }, [
      lunchBtn,
      el('button', { type: 'button', class: 'btn', text: `Rest break (${shift.restCount || 0})`, onclick: addRest }),
      el('button', { type: 'button', class: 'btn', text: 'End shift', onclick: endShift }),
    ]));
  }

  draw();
  host._shiftTimer = setInterval(() => {
    if (!document.body.contains(body)) { clearInterval(host._shiftTimer); return; }
    draw();
  }, 20000);
}
