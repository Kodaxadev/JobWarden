// geo.js — geolocation capture. One concern: GPS.
// Location is optional, but a denial, timeout, and unsupported browser need different
// recovery copy. Capture never blocks a record from being saved.
export function locationFailureReason(error) {
  if (error?.code === 1) return 'denied';
  if (error?.code === 3) return 'timeout';
  return 'unavailable';
}

export function requestCurrentPosition(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return resolve({ location: null, reason: 'unsupported' });
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        location: {
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy || 0),
          at: new Date().toISOString(),
        },
        reason: '',
      }),
      error => resolve({ location: null, reason: locationFailureReason(error) }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export async function getCurrentPosition(timeoutMs = 8000) {
  return (await requestCurrentPosition(timeoutMs)).location;
}

export function mapsLink(loc) {
  if (!loc || loc.lat == null) return '';
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

export function formatLoc(loc) {
  if (!loc || loc.lat == null) return '';
  return `${loc.lat}, ${loc.lng} (±${loc.accuracy}m)`;
}
