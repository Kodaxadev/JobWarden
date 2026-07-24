import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICON_NAMES, extractIconBody } from '../scripts/build-icons.mjs';

const USED_ICON_NAMES = [
  'circle-alert',
  'clock',
  'camera',
  'clipboard-pen',
  'coffee',
  'footprints',
  'map-pin',
  'message-square',
  'notebook-pen',
  'sandwich',
  'save',
  'shield-check',
  'triangle-alert',
  'wallet',
];

test('icon generator covers every icon used by the app UI', () => {
  for (const name of USED_ICON_NAMES) assert.ok(ICON_NAMES.includes(name), name);
  assert.equal(ICON_NAMES.includes('alert'), false, 'use a real Lucide icon name');
});

test('icon generator stores SVG inner markup only', () => {
  const svg = readFileSync('node_modules/lucide-static/icons/clock.svg', 'utf8');
  const body = extractIconBody(svg);
  assert.equal(body.includes('<svg'), false);
  assert.equal(body.includes('</svg>'), false);
  assert.ok(body.includes('<circle'));
});
