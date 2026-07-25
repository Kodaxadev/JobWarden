// navigationGuard.js — one concern: preserving unsaved form work during navigation.
export function createNavigationGuard(confirmLeave) {
  let dirty = false;
  return {
    markDirty() { dirty = true; },
    reset() { dirty = false; },
    isDirty() { return dirty; },
    canLeave() { return !dirty || confirmLeave(); },
  };
}
