// reminderPermission.js — visible notification permission and recovery state.
// One concern: request shift-alert permission only after explaining its limits.
import { el, toast, withBusy } from './dom.js';
import { icon } from './icons.js';

const iconEl = (name) => {
  const span = el('span');
  span.innerHTML = icon(name);
  return span.firstElementChild || span;
};

function currentState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function reminderPermissionCopy(state, backupText) {
  return {
    granted: {
      icon: 'bell-ring',
      title: 'Shift alerts on',
      detail: `JobWarden must stay open. ${backupText}`,
      tone: 'success',
    },
    default: {
      icon: 'bell-ring',
      title: 'Turn on shift alerts',
      detail: `Get a browser alert if JobWarden stays open but is off screen. ${backupText}`,
      tone: 'neutral',
    },
    denied: {
      icon: 'bell-off',
      title: 'Shift alerts blocked',
      detail: `Turn notifications on in browser settings. ${backupText}`,
      tone: 'warning',
    },
    unsupported: {
      icon: 'bell-off',
      title: 'Shift alerts unavailable',
      detail: `This browser cannot show them. ${backupText}`,
      tone: 'neutral',
    },
  }[state];
}

export function reminderPermissionCard({ backupText, onChanged } = {}) {
  const state = currentState();
  const copy = reminderPermissionCopy(state, backupText);

  const children = [
    el('span', { class: 'shift-reminder-icon', 'aria-hidden': 'true' }, [iconEl(copy.icon)]),
    el('span', { class: 'shift-reminder-copy' }, [
      el('strong', { text: copy.title }),
      el('span', { text: copy.detail }),
    ]),
  ];

  if (state === 'default') {
    const allow = el('button', { type: 'button', class: 'btn tiny', text: 'Allow alerts' });
    allow.addEventListener('click', () => withBusy(allow, 'Asking…', async () => {
      try {
        const result = await Notification.requestPermission();
        if (result === 'granted') toast('Shift alerts turned on', { tone: 'success' });
        else toast('Shift alerts were not turned on', { tone: 'warning' });
      } catch {
        toast('This browser could not change alert access', { tone: 'error' });
      }
      onChanged?.();
    }));
    children.push(allow);
  }

  return el('section', {
    class: `shift-reminder ${copy.tone}`,
    'aria-label': 'Shift alert status',
  }, children);
}
