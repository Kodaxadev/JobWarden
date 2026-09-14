import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const landing = read('landing.html');
const guide = read('how-it-works.html');
const worker = read('service-worker.js');

test('homepage routes the detailed explanation to its own page', () => {
  assert.match(landing, /href="\.\/how-it-works\.html"/);
  assert.doesNotMatch(landing, /<details\b/);
  assert.match(guide, /id="capture"/);
  assert.match(guide, /id="review"/);
  assert.match(guide, /id="export"/);
  assert.match(guide, /id="privacy"/);
  assert.match(guide, /id="trial"/);
});

test('trial and legal-review boundaries are explicit on both marketing pages', () => {
  for (const html of [landing, guide]) {
    assert.match(html, /[Ii]n trial|IN TRIAL/);
    assert.match(html, /California/);
    assert.match(html, /attorney review (?:is )?pending/i);
    assert.match(html, /Not legal advice/i);
    assert.match(html, /https:\/\/kodaxa\.dev/);
  }
  assert.match(guide, /not a clearance for public launch/);
  assert.match(guide, /does not certify that an account is true/);
  assert.match(guide, /no automatic cloud synchronization/);
  assert.match(guide, /does not mean the app’s local records or ordinary exports are encrypted/);
});

test('new pages remain static and have accessible document entry points', () => {
  for (const html of [landing, guide]) {
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /class="skip-link" href="#main"/);
    assert.match(html, /<main id="main">/);
    assert.match(html, /Content-Security-Policy/);
    assert.doesNotMatch(html, /<script\b|<iframe\b|<form\b/);
    assert.match(html, /href="\.\/index\.html"/);
    assert.match(html, /href="\.\/install\.html"/);
    assert.match(html, /property="og:image"/);
  }
  assert.match(landing, /Interface illustration · Example entry/);
  assert.match(guide, /<summary>What is a PWA\?<\/summary>/);
});

test('new navigation and stylesheet are included in the offline shell', () => {
  assert.ok(Number(worker.match(/jobwarden-v(\d+)/)?.[1]) >= 107);
  assert.match(worker, /'\.\/how-it-works\.html'/);
  assert.match(worker, /'\.\/css\/website\.css'/);
  assert.match(worker, /path\.endsWith\('\/how-it-works\.html'\)/);
  assert.match(read('sitemap.xml'), /https:\/\/jobwarden\.kodaxa\.dev\/how-it-works\.html/);
});

test('same-page guide links resolve to real section ids', () => {
  const ids = new Set([...guide.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const match of guide.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), match[1]);
  assert.equal(ids.size, [...guide.matchAll(/\bid="([^"]+)"/g)].length);
});
