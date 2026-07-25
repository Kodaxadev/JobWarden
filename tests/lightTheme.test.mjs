import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const light = readFileSync('css/light.css', 'utf8');
const styles = readFileSync('css/styles.css', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');

function color(name) {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(light);
  assert.ok(match, `missing --${name} hex color`);
  return match[1];
}

function rgb(hex) {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
}

function luminance(hex) {
  const channels = rgb(hex).map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test('light theme uses layered warm surfaces instead of pure white', () => {
  assert.doesNotMatch(light, /--(?:bg|surface|surface-2|surface-3|field-bg):\s*#f{3,6}\b/i);
  assert.notEqual(color('bg'), color('surface'));
  assert.notEqual(color('surface'), color('surface-2'));
  assert.match(light, /warm stone canvas/i);
});

test('light theme core text colors meet WCAG AA contrast', () => {
  const surfaces = [color('bg'), color('surface'), color('surface-2'), color('field-bg')];
  for (const surface of surfaces) {
    assert.ok(contrast(color('text'), surface) >= 7, `text contrast failed on ${surface}`);
    assert.ok(contrast(color('muted'), surface) >= 4.5, `muted contrast failed on ${surface}`);
    assert.ok(contrast(color('faint'), surface) >= 4.5, `faint contrast failed on ${surface}`);
  }
  assert.ok(contrast(color('primary-strong'), color('surface')) >= 4.5);
});

test('light theme is loaded last and cached for offline use', () => {
  assert.match(styles.trimEnd(), /@import "\.\/light\.css";$/);
  assert.match(worker, /'\.\/css\/light\.css'/);
});
