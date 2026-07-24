import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptBackup, decryptBackup, isEncryptedBackup, passphraseStrength, MAGIC, PBKDF2_ITERATIONS,
} from '../js/export/backupCrypto.js';
import { buildBackupParts } from '../js/export/exportJson.js';
import { parseBackup } from '../js/export/importBackup.js';
import { createIncident } from '../js/domain/incidentModel.js';
import { stampIntegrity } from '../js/domain/integrity.js';

const PASS = 'blue tractor lunch 41';

const records = async () => [
  await stampIntegrity(createIncident({
    incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
    workplace: 'Store #12', narrative: 'No lunch; covered the register alone.',
  })),
];

test('an encrypted backup round-trips back to a readable backup', async () => {
  const items = await records();
  const { parts } = await buildBackupParts(items, { employer: 'Acme' });
  const blob = await encryptBackup(parts, PASS);

  const text = await decryptBackup(await blob.arrayBuffer(), PASS);
  const parsed = parseBackup(text);
  assert.equal(parsed.app, 'JobWarden');
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].narrative, 'No lunch; covered the register alone.');
});

test('the wrong passphrase does not open it', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  const buf = await (await encryptBackup(parts, PASS)).arrayBuffer();
  await assert.rejects(() => decryptBackup(buf, 'blue tractor lunch 42'), /Wrong passphrase/);
});

test('the file is unreadable without the passphrase — no plaintext leaks into it', async () => {
  const { parts } = await buildBackupParts(await records(), { employer: 'Acme' });
  const bytes = new Uint8Array(await (await encryptBackup(parts, PASS)).arrayBuffer());
  const raw = String.fromCharCode(...bytes);
  for (const secret of ['Store #12', 'register', 'Acme', 'missed_meal', '2026-06-16']) {
    assert.equal(raw.includes(secret), false, `"${secret}" must not be readable in the file`);
  }
});

test('editing the ciphertext is detected', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  const bytes = new Uint8Array(await (await encryptBackup(parts, PASS)).arrayBuffer());
  bytes[bytes.length - 20] ^= 0xff;
  await assert.rejects(() => decryptBackup(bytes.buffer, PASS), /changed after it was saved/);
});

test('editing the header is detected too (it is authenticated, not just carried)', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  const bytes = new Uint8Array(await (await encryptBackup(parts, PASS)).arrayBuffer());
  // Flip a byte inside the header JSON, past the magic + length prefix.
  bytes[MAGIC.length + 4 + 2] ^= 0x01;
  await assert.rejects(() => decryptBackup(bytes.buffer, PASS), /damaged|changed after it was saved/);
});

test('a file demanding an absurd iteration count is refused, not run', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  const bytes = new Uint8Array(await (await encryptBackup(parts, PASS)).arrayBuffer());
  const headerLen = new DataView(bytes.buffer).getUint32(MAGIC.length, false);
  const start = MAGIC.length + 4;
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + headerLen)));
  header.kdf.iterations = 900000000;
  const evil = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, evil.length, false);
  const rebuilt = await new Blob([MAGIC, len, evil, bytes.subarray(start + headerLen)]).arrayBuffer();
  await assert.rejects(() => decryptBackup(rebuilt, PASS), /damaged/);
});

test('encrypted and plain backups are told apart by their first bytes', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  const enc = new Uint8Array(await (await encryptBackup(parts, PASS)).arrayBuffer());
  assert.equal(isEncryptedBackup(enc), true);
  assert.equal(isEncryptedBackup(new TextEncoder().encode('{"app":"JobWarden"')), false);
  assert.equal(isEncryptedBackup(new Uint8Array(2)), false, 'a tiny file must not crash the check');
});

test('a plain backup still parses, so encryption stays optional', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  assert.equal(parseBackup(parts.join('')).records.length, 1);
});

test('encrypting without a passphrase is refused', async () => {
  const { parts } = await buildBackupParts(await records(), {});
  await assert.rejects(() => encryptBackup(parts, ''), /passphrase/i);
});

test('the work factor stays at the recommended floor', () => {
  assert.ok(PBKDF2_ITERATIONS >= 310000, 'do not lower PBKDF2 iterations');
});

test('passphrase strength is advice a person can act on', () => {
  assert.equal(passphraseStrength('abc').level, 'weak');
  assert.equal(passphraseStrength('lunchtime').level, 'weak');
  assert.equal(passphraseStrength('Lunchtime22!').level, 'strong');
  assert.equal(passphraseStrength('blue tractor lunch 41').level, 'strong');
  assert.ok(passphraseStrength('abc').text.length > 0);
});
