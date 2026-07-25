import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const STYLES = {
  app: readFileSync('css/tokens.css', 'utf8'),
  marketing: readFileSync('css/marketing.css', 'utf8'),
  install: readFileSync('css/install.css', 'utf8'),
  legal: readFileSync('css/legal.css', 'utf8'),
};

const tokenValues = (css, prefix) =>
  [...css.matchAll(new RegExp(`--${prefix}-[\\w-]+:\\s*([^;]+);`, 'g'))]
    .map(match => match[1].trim());

test('every authored type-scale token follows the root text size', () => {
  const groups = [
    ['app', 'fs'],
    ['marketing', 'mk'],
    ['install', 'ls'],
    ['legal', 'lg'],
  ];

  for (const [sheet, prefix] of groups) {
    const values = tokenValues(STYLES[sheet], prefix);
    assert.ok(values.length >= 6, `${sheet} type scale was not found`);
    assert.equal(
      values.some(value => /\dpx\b/.test(value)),
      false,
      `${sheet} type tokens must use rem so browser text-size preferences work`,
    );
    assert.ok(
      values.every(value => /\drem\b/.test(value)),
      `${sheet} type tokens must resolve from the root font size`,
    );
  }
});

test('each page body consumes its type-scale token', () => {
  assert.match(STYLES.app, /font:\s*400 var\(--fs-body\)\/var\(--lh-body\)/);
  assert.match(STYLES.marketing, /font:\s*400 var\(--mk-body\)\/var\(--lh-body\)/);
  assert.match(STYLES.install, /font:\s*400 var\(--ls-body\)\/var\(--lh-body\)/);
  assert.match(STYLES.legal, /font:\s*400 var\(--lg-body\)\//);
});
