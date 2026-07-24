// AGENTS.md sets the house rules — one responsibility per file, everything under 400 lines,
// bump the SW cache when cached assets change. They were enforced by remembering. These are
// the ones a machine can check, so a machine checks them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAX_LINES = 400;
const SKIP_DIRS = new Set(['node_modules', '.git', 'fonts', 'icons', '.claude', '.impeccable', '.github']);
const AUTHORED = new Set(['.js', '.mjs', '.css', '.html', '.md', '.json']);
// Machine-generated, exempt per AGENTS.md. Anything added here needs a reason written there.
const EXEMPT = new Set(['package-lock.json']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (AUTHORED.has(extname(name)) && !EXEMPT.has(name)) out.push(path);
  }
  return out;
}

const FILES = walk('.');
const lines = (f) => readFileSync(f, 'utf8').split('\n').length;

test('every authored file stays under the 400-line cap', () => {
  const over = FILES
    .map(f => ({ f: f.replace(/\\/g, '/'), n: lines(f) }))
    .filter(x => x.n > MAX_LINES)
    .sort((a, b) => b.n - a.n)
    .map(x => `${x.n} lines: ${x.f}`);
  assert.deepEqual(over, [], `split these, or document the exemption in AGENTS.md:\n${over.join('\n')}`);
});

test('the repo is actually being scanned (a guard against the guard silently passing)', () => {
  assert.ok(FILES.length > 40, `only found ${FILES.length} files — the walk is probably broken`);
  assert.ok(FILES.some(f => f.includes('breakRules')), 'the domain layer should be in the scan');
});

test('no source file carries a leftover debugging marker', () => {
  const markers = [];
  // This file is skipped because it necessarily contains the very strings it searches for.
  const scanned = FILES.filter(f => /\.(js|mjs)$/.test(f) && !f.includes('repoHygiene'));
  for (const f of scanned) {
    const src = readFileSync(f, 'utf8');
    // eslint's no-console is off for scripts/, so check the shipped app specifically.
    if (f.replace(/\\/g, '/').startsWith('js/') && /\bconsole\.(log|debug|table)\s*\(/.test(src)) {
      markers.push(`${f.replace(/\\/g, '/')}: console.log`);
    }
    if (/\bdebugger\b/.test(src)) markers.push(`${f.replace(/\\/g, '/')}: debugger`);
    if (/\.only\s*\(/.test(src) && f.includes('tests')) markers.push(`${f.replace(/\\/g, '/')}: .only( would skip the rest of the suite`);
  }
  assert.deepEqual(markers, [], markers.join('\n'));
});

test('the app ships zero runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(pkg.dependencies ?? {}, {},
    'a runtime dependency is supply-chain surface on an evidence tool — keep it in devDependencies or vendor it');
});
