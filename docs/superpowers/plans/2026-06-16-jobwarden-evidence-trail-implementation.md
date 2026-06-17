# JobWarden Evidence Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign JobWarden into the approved Evidence Trail Field Log PWA with plain-language, full interactive polish across all tabs.

**Architecture:** Keep the vanilla ES module PWA. Add a small copy/icon layer, split CSS by concern, and preserve IndexedDB/domain/export behavior.

**Tech Stack:** Vanilla HTML/CSS/ES modules, IndexedDB, Node built-in test runner, `lucide-static@1.20.0` as a dev-time source for committed local icons.

---

## References

- Design spec: `docs/superpowers/specs/2026-06-16-jobwarden-evidence-trail-design.md`
- App shell: `index.html`, `css/styles.css`, `js/app.js`
- Capture flow: `js/capture/captureFields.js`, `js/capture/captureForm.js`
- Records/export/settings: `js/ui/incidentList.js`, `js/ui/exportView.js`, `js/ui/settingsView.js`
- Offline cache: `service-worker.js`

## File Structure

- Create `js/config/uiCopy.js`: approved plain-language labels, issue groups, trail steps.
- Create `js/ui/icons.js`: local SVG icon helper generated from Lucide static SVGs.
- Create `scripts/build-icons.mjs`: dev script that writes `js/ui/icons.js`.
- Create `tests/uiCopy.test.mjs`: copy guard for step order and banned jargon.
- Create `css/tokens.css`: colors, spacing, type, reset, focus.
- Create `css/shell.css`: header, tabs, banners, dialogs, toasts.
- Create `css/forms.css`: trail steps, fields, buttons, evidence thumbnails.
- Create `css/records.css`: records, export, settings, history.
- Modify `css/styles.css`: import the split CSS files.
- Modify `index.html`: remove emoji navigation and use icon-ready labels.
- Modify `service-worker.js`: cache new assets and bump version.
- Modify `README.md`, `manifest.webmanifest`, and UI modules listed above.

This folder is not a git repo. Use verification checkpoints instead of commit checkpoints unless a repo is initialized before execution.

---

### Task 1: Plain Copy And Icons

**Files:**
- Create: `tests/uiCopy.test.mjs`
- Create: `js/config/uiCopy.js`
- Create: `scripts/build-icons.mjs`
- Create: `js/ui/icons.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing copy test**

Create `tests/uiCopy.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRAIL_STEPS, ISSUE_GROUPS, BANNED_PRIMARY_WORDS } from '../js/config/uiCopy.js';

const primaryCopy = () => [
  ...TRAIL_STEPS.flatMap(step => [step.title, step.helper]),
  ...ISSUE_GROUPS.flatMap(group => [group.label, ...group.items.map(item => item.label)]),
].join(' ').toLowerCase();

test('trail steps use approved order', () => {
  assert.deepEqual(TRAIL_STEPS.map(step => step.title), [
    'Pick what happened',
    'Add work times',
    'Add lunch breaks',
    'Add unpaid work',
    'Add proof',
    'Tell what happened',
  ]);
});

test('primary copy avoids jargon', () => {
  const text = primaryCopy();
  for (const word of BANNED_PRIMARY_WORDS) assert.equal(text.includes(word), false, word);
});
```

- [ ] **Step 2: Run red test**

Run: `npm test -- tests/uiCopy.test.mjs`

Expected: FAIL because `js/config/uiCopy.js` does not exist.

- [ ] **Step 3: Add copy module**

Create `js/config/uiCopy.js`:

```js
export const BANNED_PRIMARY_WORDS = ['infraction', 'waiver', 'classification', 'compliance', 'indexeddb'];
export const TRAIL_STEPS = [
  { id: 'issue', icon: 'circle-alert', title: 'Pick what happened', helper: 'Choose the things that went wrong today.' },
  { id: 'time', icon: 'clock', title: 'Add work times', helper: 'Add when you started and stopped work.' },
  { id: 'meal', icon: 'utensils', title: 'Add lunch breaks', helper: 'Add lunch times, or say if lunch did not happen.' },
  { id: 'offClock', icon: 'timer-off', title: 'Add unpaid work', helper: 'Add work time that was not paid.' },
  { id: 'proof', icon: 'camera', title: 'Add proof', helper: 'Add photos, place, and witnesses.' },
  { id: 'story', icon: 'file-pen-line', title: 'Tell what happened', helper: 'Write short facts. Names, times, and what was said help.' },
];
export const ISSUE_GROUPS = [
  { id: 'lunch', label: 'Lunch problem', items: [
    { id: 'worked_past_5h_no_meal', label: 'Worked over 5 hours, no lunch' },
    { id: 'late_meal', label: 'Lunch started late' },
    { id: 'short_meal', label: 'Lunch was under 30 minutes' },
    { id: 'missed_meal', label: 'No lunch at all' },
    { id: 'interrupted_meal', label: 'Someone bothered me at lunch' },
    { id: 'second_meal_missed', label: 'No second lunch on a long shift' },
  ] },
  { id: 'rest', label: 'Rest break problem', items: [
    { id: 'rest_missed', label: 'Missed rest break' },
    { id: 'rest_interrupted', label: 'Rest break was interrupted' },
  ] },
  { id: 'pay', label: 'Unpaid work', items: [{ id: 'off_clock_work', label: 'Worked but was not paid' }] },
  { id: 'notice', label: 'I told someone', items: [{ id: 'complaint_raised', label: 'I reported the problem' }] },
];
```

- [ ] **Step 4: Add icon dependency and generator**

Run: `npm install lucide-static@1.20.0 --save-dev`

Add scripts:

```json
"scripts": {
  "build:icons": "node scripts/build-icons.mjs",
  "test": "node --test"
}
```

Create `scripts/build-icons.mjs` with selected names:

```js
import { readFileSync, writeFileSync } from 'node:fs';
const names = ['circle-alert','clock','utensils','timer-off','camera','file-pen-line','list','download','settings','shield-check','map-pin','trash-2','rotate-ccw','check'];
const entries = names.map(name => {
  const svg = readFileSync(`node_modules/lucide-static/icons/${name}.svg`, 'utf8');
  const inner = svg.replace(/^<svg[^>]*>/, '').replace('</svg>', '').trim();
  return `  ${JSON.stringify(name)}: ${JSON.stringify(inner)}`;
});
writeFileSync('js/ui/icons.js', `const ICONS = {\n${entries.join(',\n')}\n};\n\nexport function icon(name, label = '') {\n  const body = ICONS[name] || '';\n  const aria = label ? \` role="img" aria-label="\${label}"\` : ' aria-hidden="true"';\n  return \`<span class="icon"\${aria}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${body}</svg></span>\`;\n}\n`);
```

- [ ] **Step 5: Verify green**

Run:

```bash
npm run build:icons
npm test -- tests/uiCopy.test.mjs
```

Expected: PASS and `js/ui/icons.js` exports `icon`.

---

### Task 2: CSS System And App Shell

**Files:**
- Create: `css/tokens.css`, `css/shell.css`, `css/forms.css`, `css/records.css`
- Modify: `css/styles.css`, `index.html`, `service-worker.js`

- [ ] **Step 1: Add split CSS**

Set `css/styles.css` to:

```css
@import "./tokens.css";
@import "./shell.css";
@import "./forms.css";
@import "./records.css";
```

Create `css/tokens.css` starting with:

```css
:root {
  --bg:#070b10; --surface:#101820; --surface-2:#16212b; --surface-3:#1d2a35;
  --line:#2c3d4d; --text:#f4f0e8; --muted:#9ca9b4; --primary:#3e8fb0;
  --primary-strong:#57b7da; --incident:#c98a3a; --danger:#e15b4f; --ok:#57b982;
  --radius:8px; --tap:48px;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
```

- [ ] **Step 2: Rebuild shell styles**

Move header, banner, tabbar, toast, overlay, and dialog rules into `css/shell.css`. Use `.icon svg { width: 1.2em; height: 1.2em; }` and keep all buttons at least `48px`.

- [ ] **Step 3: Update nav markup**

Replace nav buttons in `index.html`:

```html
<button class="tab active" data-view="log"><span>Log</span></button>
<button class="tab" data-view="records"><span>Records</span></button>
<button class="tab" data-view="export"><span>Export</span></button>
<button class="tab" data-view="settings"><span>Settings</span></button>
```

- [ ] **Step 4: Cache assets**

Add new CSS and `./js/ui/icons.js`, `./js/config/uiCopy.js` to `ASSETS`; set `const CACHE = 'jobwarden-v5';`.

- [ ] **Step 5: Verify**

Run:

```bash
npm test
node --check service-worker.js
```

Expected: PASS.

---

### Task 3: Evidence Trail Log Flow

**Files:**
- Modify: `js/capture/captureFields.js`, `js/capture/captureForm.js`, `css/forms.css`

- [ ] **Step 1: Group issue buttons**

Import `ISSUE_GROUPS`. Replace the flat chip grid with grouped `.issue-group` sections. Each issue toggles `state.types` exactly as today.

- [ ] **Step 2: Add trail steps**

Import `TRAIL_STEPS` and add `trailStep(stepId, body, complete)` in `captureFields.js`. It renders `.trail-step`, `.trail-dot`, title, helper, and body. Use the step IDs from `TRAIL_STEPS`.

- [ ] **Step 3: Rename primary labels**

Use these exact labels in fields:

- `Did you skip lunch by choice?`
- `Add photos of time clock, pay stub, or messages`
- `Where were you?`
- `Who saw it?`
- `Tell what happened`

- [ ] **Step 4: Preserve save input shape**

Confirm `captureForm.js` still passes `types`, `clockIn`, `clockOut`, `meal`, `meal2`, `rest`, `offClock`, `notice`, `location`, `attachments`, `witnesses`, and `narrative` to `createIncident` or `reviseIncident`.

- [ ] **Step 5: Browser verify Log**

Run `python -m http.server 8099`. Verify selecting "No second lunch on a long shift" shows second-lunch fields and selecting "Worked but was not paid" shows unpaid-work fields.

---

### Task 4: Records, Export, Settings

**Files:**
- Modify: `js/ui/incidentList.js`, `js/ui/exportView.js`, `js/ui/settingsView.js`, `js/export/backup.js`, `css/records.css`

- [ ] **Step 1: Records plain labels**

Use labels `Started work`, `Stopped work`, `Lunch`, `Unpaid work`, `Proof saved`, `Saved at`, and `Edit history`.

- [ ] **Step 2: Export plain actions**

Use buttons `Save full backup`, `Make spreadsheet`, and `Make printable report`. Keep the existing export functions.

- [ ] **Step 3: Settings sections**

Use headings `About you`, `Workplaces`, and `Data safety`. Replace the exempt warning with: `Some pay types have different rules. If you are not sure, ask a lawyer or the Labor Commissioner.`

- [ ] **Step 4: Backup banner**

Use: `Back up your records today. If this phone is lost, records not backed up are gone.`

- [ ] **Step 5: Verify**

Check Records, Export, and Settings on mobile and desktop widths. All old actions must still work.

---

### Task 5: PWA Docs And Cache

**Files:**
- Modify: `manifest.webmanifest`, `README.md`, `service-worker.js`, `package.json`

- [ ] **Step 1: Manifest colors**

Set:

```json
"background_color": "#070b10",
"theme_color": "#070b10"
```

- [ ] **Step 2: README design note**

Add:

```md
## Design
JobWarden uses the Evidence Trail Field Log UI: plain-language steps, rugged dark surfaces, local-only privacy copy, and offline-safe icons generated from `lucide-static`.
```

- [ ] **Step 3: Copy scan**

Run:

```bash
rg -n "cloud sync|audio capture|Infraction type|Local-only IndexedDB" js css index.html
```

Expected: no matches.

---

### Task 6: Final Verification

**Files:** no planned edits.

- [ ] **Step 1: Automated checks**

Run:

```bash
npm test
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Expected: tests and syntax checks pass.

- [ ] **Step 2: Line cap**

Run:

```powershell
$over = Get-ChildItem -Recurse -File | Where-Object { $_.Extension -in '.css','.js','.mjs','.html','.md','.json','.webmanifest' } | ForEach-Object { $lines = (Get-Content -LiteralPath $_.FullName | Measure-Object -Line).Lines; [pscustomobject]@{ Path=$_.FullName; Lines=$lines } } | Where-Object Lines -gt 400; if ($over) { $over | Format-Table -AutoSize; exit 1 } else { 'All checked files are <= 400 lines.' }
```

Expected: PASS.

- [ ] **Step 3: Browser QA**

Verify mobile Log, Records empty/populated, Export, Settings warning, bottom tabs, dialog, toast, console errors, and 390px text fit.

- [ ] **Step 4: Final report**

Report changed files, test output, browser QA result, and residual risks.
