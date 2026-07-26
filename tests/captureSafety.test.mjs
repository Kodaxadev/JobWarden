// Saving is the one action in this app that cannot be retried from memory: the event being
// recorded already happened and cannot be observed again. So the save path gets its own file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withBusy } from '../js/ui/dom.js';
import { dateStamp } from '../js/export/download.js';
import { photoStatusCopy } from '../js/capture/evidenceStatus.js';

// A button stub with only what withBusy touches.
function stubButton({ withLabel = false } = {}) {
  const label = withLabel ? { textContent: 'Save record' } : null;
  return {
    disabled: false,
    textContent: 'Save record',
    attrs: {},
    children: withLabel ? ['<svg>', label] : ['<svg>', 'text'],
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    querySelector(sel) { return sel === '.btn-label' ? label : null; },
    label,
  };
}

// This is the whole defence against a double-tap: the control has to be dead before the first
// await, because both taps land in the same turn of the event loop. Sealing a record hashes
// every attached photo first, so on a budget phone that window is long enough to hit twice —
// and each tap minted a new record id, so the same event went into the log twice.
test('withBusy disables the control before it awaits anything', async () => {
  const btn = stubButton({ withLabel: true });
  let sawDisabled = null;
  const pending = withBusy(btn, 'Saving…', async () => { sawDisabled = btn.disabled; });
  assert.equal(btn.disabled, true, 'a second tap must find the button already disabled');
  assert.equal(btn.attrs['aria-busy'], 'true');
  await pending;
  assert.equal(sawDisabled, true, 'still disabled while the write is in flight');
  assert.equal(btn.disabled, false, 'and usable again afterwards');
  assert.equal(btn.attrs['aria-busy'], undefined);
});

test('withBusy releases the control even when the write throws', async () => {
  const btn = stubButton({ withLabel: true });
  await assert.rejects(withBusy(btn, 'Saving…', async () => { throw new Error('quota'); }));
  assert.equal(btn.disabled, false, 'a failed save must not leave the button dead');
  assert.equal(btn.label.textContent, 'Save record', 'and the label comes back');
});

// withBusy falls back to button.textContent when there is no .btn-label, which REPLACES every
// child — including the icon element, permanently. Buttons that carry an icon need the span.
test('a busy label swaps the words without touching the icon beside them', async () => {
  const btn = stubButton({ withLabel: true });
  await withBusy(btn, 'Saving…', async () => {
    assert.equal(btn.label.textContent, 'Saving…');
    assert.equal(btn.textContent, 'Save record', 'the button itself was never rewritten');
  });
});

test('every icon-bearing save control carries a .btn-label for withBusy to write into', () => {
  for (const file of ['js/capture/captureForm.js', 'js/capture/quickCapture.js']) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /withBusy\(saveBtn/, `${file} must run its write through withBusy`);
    assert.match(src, /class: 'btn-label'/, `${file} needs a .btn-label so the icon survives`);
  }
});

// The Log screen opens a confirm dialog for sanity warnings before writing, so it cannot rely on
// a disabled button alone — the guard has to span the whole attempt, dialog included.
test('the Log screen refuses a second save while one is already running', () => {
  const src = readFileSync('js/capture/captureForm.js', 'utf8');
  assert.match(src, /let saving = false/);
  assert.match(src, /if \(saving\) return;/);
  assert.match(src, /finally \{\s*saving = false;/);
});

// --- export filenames -------------------------------------------------------

// Every export filename and the email subject carry this date, and "which backup is newest" is
// read straight off it. `toISOString().slice(0,10)` is the UTC date: in California every backup
// saved after about 4pm was stamped tomorrow.
test('the export stamp is the local date, not the UTC one', () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  assert.equal(dateStamp(), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
});

test('the stamp is right on both sides of the date line, not just where the tests run', () => {
  // At any instant at least one of these two zones is on a different calendar day from UTC, so
  // this fails deterministically if the UTC shortcut ever comes back.
  const probe = "import('./js/export/download.js').then(m => {"
    + 'const d = new Date(), p = n => String(n).padStart(2, "0");'
    + 'const local = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;'
    + 'process.stdout.write(m.dateStamp() + " " + local);});';
  for (const tz of ['Pacific/Kiritimati', 'Pacific/Midway']) {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
      env: { ...process.env, TZ: tz }, encoding: 'utf8',
    });
    const [stamped, expected] = out.trim().split(' ');
    assert.equal(stamped, expected, `wrong date in ${tz} (UTC date was ${new Date().toISOString().slice(0, 10)})`);
  }
});

// --- optional evidence ------------------------------------------------------

test('a photo that could not be attached is reported, on the quick path too', () => {
  const src = readFileSync('js/capture/quickCapture.js', 'utf8');
  assert.match(src, /catch \{ failed\+\+; \}/, 'one bad file must not take the rest down with it');
  assert.match(src, /photoStatusCopy/, 'the quick sheet uses the same words as the Log screen');
  assert.match(photoStatusCopy(2, 1).text, /1 file could not be added/);
});
