// shiftPanel.js — the live shift tracker on the Log screen. One concern: starting/running an
// in-progress shift and capturing breaks live, then handing a pre-filled draft to the capture
// form at end of shift. Alerts (lunch due/overdue) are fired app-wide by the monitor in app.js.
import { el, clear, toast } from './dom.js';
import { icon } from './icons.js';
import { confirmDialog } from './confirmDialog.js';
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
  const addRest = async () => {
    shift.restCount = (shift.restCount || 0) + 1;
    await save();
    toast(`Rest break ${shift.restCount} logged`, { tone: 'success' });
    draw();
  };
  const endShift = async () => {
    const ok = await confirmDialog(
      'JobWarden will fill a new record with the times and breaks you tracked so you can review it before saving.',
      {
        title: 'End this shift?',
        confirmText: 'End shift',
        cancelText: 'Keep tracking',
        iconName: 'clock',
      },
    );
    if (!ok) return;
    const draft = shiftToDraft(shift, new Date().toISOString(), settings);
    await clearActiveShift();
    onEndShift?.(draft);
  };

  function draw() {
    clear(body);
    const st = shiftStatus(shift);
    body.appendChild(el('div', { class: 'shift-head' }, [
      el('span', { class: 'shift-live' }, [
        el('span', { class: 'dot' }),
        el('span', { text: 'Tracking shift' }),
      ]),
      el('span', { class: 'shift-time' }, [
        el('strong', { text: `${Math.floor(st.elapsedMin / 60)}h ${st.elapsedMin % 60}m` }),
        el('span', { text: `Started ${fmt(shift.startedAt)}` }),
      ]),
    ]));

    const meal = st.firstMealTaken
      ? {
        cls: st.onMeal ? 'soon' : 'ok',
        title: st.onMeal ? 'Lunch in progress' : 'Lunch recorded',
        detail: st.onMeal ? 'End it when you return to work.' : 'Your first lunch is in this shift.',
        icon: st.onMeal ? 'utensils' : 'circle-check',
      }
      : st.mealState === 'overdue' ? {
        cls: 'over', title: 'Lunch is overdue', detail: 'Your shift passed the 5th hour.', icon: 'clock-alert',
      }
      : st.mealState === 'soon' ? {
        cls: 'soon', title: `Lunch by ${fmt(fromMs(st.firstMealByMs))}`, detail: 'Due soon.', icon: 'clock-alert',
      }
      : {
        cls: 'ok', title: `Lunch by ${fmt(fromMs(st.firstMealByMs))}`, detail: 'Still on time.', icon: 'clock',
      };
    body.appendChild(el('div', { class: 'shift-meal ' + meal.cls }, [
      iconEl(meal.icon),
      el('span', { class: 'shift-meal-copy' }, [
        el('strong', { text: meal.title }),
        el('span', { text: meal.detail }),
      ]),
    ]));
    if (st.secondMealDue) body.appendChild(el('div', { class: 'shift-meal over' }, [
      iconEl('clock-alert'),
      el('span', { class: 'shift-meal-copy' }, [
        el('strong', { text: 'Second lunch due' }),
        el('span', { text: 'This shift passed 10 hours.' }),
      ]),
    ]));

    const lunchBtn = st.onMeal
      ? el('button', { type: 'button', class: 'btn primary shift-lunch', onclick: endLunch },
        [iconEl('utensils'), document.createTextNode('End lunch')])
      : el('button', { type: 'button', class: 'btn primary shift-lunch', onclick: startLunch },
        [iconEl('utensils'), document.createTextNode(st.firstMealTaken ? 'Start another lunch' : 'Start lunch')]);
    body.appendChild(el('div', { class: 'shift-actions' }, [
      lunchBtn,
      el('button', {
        type: 'button',
        class: 'btn shift-rest',
        'aria-label': `Log a rest break. ${shift.restCount || 0} logged`,
        onclick: addRest,
      }, [
        iconEl('coffee'),
        el('span', { text: 'Rest' }),
        el('span', { class: 'shift-count', text: String(shift.restCount || 0), 'aria-hidden': 'true' }),
      ]),
      el('button', { type: 'button', class: 'btn shift-end', onclick: endShift }, [
        iconEl('log-out'),
        document.createTextNode('End shift'),
      ]),
    ]));

    // Honesty: the alert loop runs in the page. A closed app fires nothing, and there is no
    // way around that without a server (Push) — so say it, and name the backup that works.
    if (!st.firstMealTaken) {
      body.appendChild(el('p', {
        class: 'shift-note',
      }, [
        iconEl('clock-alert'),
        el('span', { text: `Reminders need JobWarden open. Set a phone alarm for ${fmt(fromMs(st.firstMealByMs))}.` }),
      ]));
    }
  }

  draw();
  host._shiftTimer = setInterval(() => {
    if (!document.body.contains(body)) { clearInterval(host._shiftTimer); return; }
    draw();
  }, 20000);
}
