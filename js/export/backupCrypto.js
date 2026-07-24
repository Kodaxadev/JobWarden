// backupCrypto.js — optional passphrase encryption for backup files. One concern:
// turning backup bytes into a sealed file and back.
//
// Why this exists: the plain backup is the user's whole evidence archive — names,
// employer, GPS, photos — and the normal way it leaves the phone is an email to
// themselves. It then sits in an inbox in cleartext, where the threat model includes a
// household member or a shared/known account, not only an employer. Encrypting it costs
// nothing at rest and does not touch the privacy model: no server, no key escrow, no
// dependency. The tradeoff is stated plainly in the UI — a forgotten passphrase means
// the file is gone, and nobody (including us) can open it.
//
// Format (binary, so the base64 of a photo-heavy archive never becomes one huge string):
//   "JWENC1\n"                      magic + format version
//   uint32 big-endian                header length
//   header JSON (utf8)               kdf params + iv; also fed to AES-GCM as additional
//                                    authenticated data, so an edited header fails to open
//   ciphertext                       AES-256-GCM, tag included

export const MAGIC = 'JWENC1\n';
export const PBKDF2_ITERATIONS = 310000;   // OWASP guidance for PBKDF2-HMAC-SHA256
const MAX_ITERATIONS = 2000000;            // ceiling on what a FILE may ask us to run
const SALT_BYTES = 16;
const IV_BYTES = 12;

const subtle = () => globalThis.crypto?.subtle || null;
const utf8 = new TextEncoder();
const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(passphrase, salt, iterations) {
  const s = subtle();
  const base = await s.importKey('raw', utf8.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return s.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// True if these bytes are a JobWarden encrypted backup (checked before anything else).
export function isEncryptedBackup(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < MAGIC.length) return false;
  return String.fromCharCode(...bytes.subarray(0, MAGIC.length)) === MAGIC;
}

// Encrypt backup parts (strings/Blobs) into a downloadable Blob.
export async function encryptBackup(parts, passphrase) {
  if (!subtle()) throw new Error('This browser cannot encrypt backups. Save an unencrypted backup instead.');
  if (!passphrase) throw new Error('Pick a passphrase first.');

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const header = utf8.encode(JSON.stringify({
    app: 'JobWarden',
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: toB64(salt) },
    cipher: { name: 'AES-GCM', iv: toB64(iv) },
    note: 'Encrypted JobWarden backup. Open it in JobWarden under "Restore from a backup" with the passphrase you chose. There is no way to recover a lost passphrase.',
  }));

  const plaintext = await new Blob(parts).arrayBuffer();
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: header }, key, plaintext);

  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, header.length, false);
  return new Blob([MAGIC, len, header, ciphertext], { type: 'application/octet-stream' });
}

// Decrypt an encrypted backup back to its JSON text. Throws plain-language errors.
export async function decryptBackup(buffer, passphrase) {
  if (!subtle()) throw new Error('This browser cannot open encrypted backups.');
  const bytes = new Uint8Array(buffer);
  if (!isEncryptedBackup(bytes)) throw new Error('That is not an encrypted JobWarden backup.');

  let header, headerBytes, iv, salt, iterations;
  try {
    const lenAt = MAGIC.length;
    const headerLen = new DataView(bytes.buffer, bytes.byteOffset + lenAt, 4).getUint32(0, false);
    headerBytes = bytes.subarray(lenAt + 4, lenAt + 4 + headerLen);
    header = JSON.parse(new TextDecoder().decode(headerBytes));
    salt = fromB64(header.kdf.salt);
    iv = fromB64(header.cipher.iv);
    iterations = header.kdf.iterations;
  } catch { throw new Error('That backup file is damaged and cannot be opened.'); }

  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) {
    throw new Error('That backup file is damaged and cannot be opened.');
  }

  const ciphertext = bytes.subarray(MAGIC.length + 4 + headerBytes.length);
  const key = await deriveKey(passphrase, salt, iterations);
  let plaintext;
  try {
    plaintext = await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: headerBytes }, key, ciphertext);
  } catch {
    // AES-GCM cannot tell a wrong key from edited bytes — both fail the same way. Say both.
    throw new Error('Wrong passphrase, or this file was changed after it was saved.');
  }
  return new TextDecoder().decode(plaintext);
}

// How strong is this passphrase, in words a person can act on? Never blocks — the app
// reports facts here too, and a user under pressure gets to make the call.
export function passphraseStrength(pass = '') {
  const len = pass.length;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(pass)).length;
  if (len < 8) return { level: 'weak', text: 'Too short — use at least 8 characters.' };
  if (len >= 16 || (len >= 12 && classes >= 3)) return { level: 'strong', text: 'Strong. Write it down somewhere safe.' };
  if (len >= 12 || classes >= 3) return { level: 'ok', text: 'Okay. A few more words would be stronger.' };
  return { level: 'weak', text: 'Weak — try a short sentence you will remember.' };
}
