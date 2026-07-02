// media.js — photo attachments. One concern: media file handling.
// Stores the File/Blob directly (IndexedDB keeps it via structured clone). Converts to
// data URL only for export (JSON/printable report).
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'att-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

export async function fileToAttachment(file) {
  return {
    id: uuid(),
    name: file.name || 'photo.jpg',
    type: file.type || 'image/jpeg',
    size: file.size || 0,
    addedAt: new Date().toISOString(),
    blob: file, // File is a Blob
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
