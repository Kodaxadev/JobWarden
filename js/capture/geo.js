// geo.js — geolocation capture. One concern: GPS.
// Resolves null on denial/unsupported/timeout — capture must never block on location.
export function getCurrentPosition(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: +pos.coords.latitude.toFixed(6),
        lng: +pos.coords.longitude.toFixed(6),
        accuracy: Math.round(pos.coords.accuracy || 0),
        at: new Date().toISOString(),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export function mapsLink(loc) {
  if (!loc || loc.lat == null) return '';
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

export function formatLoc(loc) {
  if (!loc || loc.lat == null) return '';
  return `${loc.lat}, ${loc.lng} (±${loc.accuracy}m)`;
}
