// installPage.js — device-aware install state for the dedicated install guide.
const $ = id => document.getElementById(id);
const installButton = $('install');
const status = $('status');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferred = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferred = event;
  installButton.disabled = false;
  status.textContent = 'This browser can install JobWarden directly.';
});

window.addEventListener('appinstalled', () => {
  status.textContent = 'Installed. JobWarden is now on your home screen.';
  status.className = 'status ok';
  installButton.hidden = true;
});

installButton.addEventListener('click', async () => {
  if (!deferred) return;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  status.textContent = outcome === 'accepted'
    ? 'Installing…'
    : 'Install canceled. You can try again whenever you are ready.';
  deferred = null;
  installButton.disabled = true;
});

if (isStandalone) {
  installButton.hidden = true;
  $('open').textContent = 'Open JobWarden';
  status.textContent = 'JobWarden is installed on this device.';
  status.className = 'status ok';
} else if (isiOS) {
  $('ios').classList.add('recommended');
  installButton.hidden = true;
  status.textContent = 'On iPhone or iPad, follow the Safari steps below.';
} else {
  $('manual').classList.add('recommended');
  setTimeout(() => {
    if (!deferred) {
      status.textContent = 'Use the browser menu steps below if direct install is unavailable.';
    }
  }, 1500);
}
