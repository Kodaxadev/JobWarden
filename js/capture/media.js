// media.js — photo attachments. One concern: media file handling.
// Stores the File/Blob directly (IndexedDB keeps it via structured clone). Converts to
// data URL only for export (JSON/printable report).
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'att-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// Downscale a photo at ingest so a modern phone's multi-MB shot doesn't bloat IndexedDB and
// make backups un-emailable. ~2000px long edge keeps a timeclock/paystub fully legible as
// evidence. The seal hashes the STORED (downscaled) bytes at save time, so integrity is intact.
// Returns null (keep the original) for non-images, already-small JPEGs, or any failure.
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;
async function downscaleImage(file) {
  if (!file || !/^image\//.test(file.type) || /gif|svg/.test(file.type)) return null;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return null;
  let bmp;
  try {
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { bmp = await createImageBitmap(file); }
    const longEdge = Math.max(bmp.width, bmp.height);
    const scale = Math.min(1, MAX_EDGE / longEdge);
    if (scale === 1 && /jpe?g/.test(file.type)) return null; // already small enough; don't re-encode
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
    return (blob && blob.size < file.size) ? blob : null; // only if it actually saved space
  } catch { return null; }
  finally { bmp?.close?.(); }
}

export async function fileToAttachment(file) {
  const down = await downscaleImage(file);
  const blob = down || file; // File is a Blob
  return {
    id: uuid(),
    name: file.name || 'photo.jpg',
    type: down ? 'image/jpeg' : (file.type || 'image/jpeg'),
    size: blob.size || 0,
    addedAt: new Date().toISOString(),
    blob,
  };
}

// One object URL per attachment, reused across re-renders (an unbounded
// URL.createObjectURL per render leaks the blob for the life of the page).
const _urlCache = new Map();
export function attachmentUrl(att) {
  if (!att) return '';
  if (att.dataUrl) return att.dataUrl;
  if (att.blob) {
    const key = att.id || att.name || att.blob;
    if (!_urlCache.has(key)) _urlCache.set(key, URL.createObjectURL(att.blob));
    return _urlCache.get(key);
  }
  return '';
}

export function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    if (!blob) return resolve('');
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}

export function humanSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
