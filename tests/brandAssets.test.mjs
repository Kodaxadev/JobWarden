import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MARK_PATH = './icons/logo-mark.svg';
const pages = ['index.html', 'landing.html', 'install.html'];

const pngSize = file => {
  const png = readFileSync(file);
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${file} must be a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

test('every branded shell uses the canonical logo mark', () => {
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /src="\.\/icons\/logo-mark\.svg"/, `${page} must use ${MARK_PATH}`);
  }
});

test('the PWA icon generator reads the canonical logo mark', () => {
  const script = readFileSync('scripts/build-app-icons.mjs', 'utf8');
  assert.match(script, /readFileSync\('icons\/logo-mark\.svg'/);
  assert.match(script, /icon-maskable-512\.png/);
});

test('generated app icons retain their manifest dimensions', () => {
  assert.deepEqual(pngSize('icons/icon-192.png'), { width: 192, height: 192 });
  assert.deepEqual(pngSize('icons/icon-512.png'), { width: 512, height: 512 });
  assert.deepEqual(pngSize('icons/icon-maskable-512.png'), { width: 512, height: 512 });
});
