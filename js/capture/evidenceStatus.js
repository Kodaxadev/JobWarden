// evidenceStatus.js — plain-language status for optional photos and GPS.
// One concern: explain evidence-access results without blocking the record.
export function locationStatusCopy(reason) {
  return {
    denied: {
      tone: 'warning',
      text: 'Location access is blocked. Turn it on in browser settings, or leave this blank.',
    },
    timeout: {
      tone: 'warning',
      text: 'Location timed out. Move somewhere with a clearer signal and try again.',
    },
    unavailable: {
      tone: 'warning',
      text: 'Location is unavailable right now. Try again later, or leave this blank.',
    },
    unsupported: {
      tone: 'neutral',
      text: 'This browser cannot add a location. You can still save the record.',
    },
  }[reason] || { tone: 'neutral', text: 'Location not added.' };
}

export function photoStatusCopy(count, failed = 0) {
  if (failed && !count) return {
    tone: 'warning',
    text: 'No photos were added. Choose image files and try again.',
  };
  const saved = count
    ? `${count} photo${count === 1 ? '' : 's'} added.`
    : 'No photos added.';
  return {
    tone: failed ? 'warning' : (count ? 'success' : 'neutral'),
    text: failed ? `${saved} ${failed} file${failed === 1 ? '' : 's'} could not be added.` : saved,
  };
}
