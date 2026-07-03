// installPage.js — install.html install-prompt logic. Externalized from an inline <script>
// so the landing page can carry the same strict CSP as the app (script-src 'self').
const $ = id => document.getElementById(id);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferred = null;

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
  $('install').disabled = false;
  $('status').textContent = 'Ready to install on this device.';
});
window.addEventListener('appinstalled', () => {
  $('status').textContent = 'Installed! Find JobWarden on your home screen.';
  $('status').className = 'status ok';
  $('install').classList.add('hide');
});

$('install').addEventListener('click', async () => {
  if (!deferred) return;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  $('status').textContent = outcome === 'accepted' ? 'Installing…' : 'Install canceled — you can try again.';
  deferred = null;
  $('install').disabled = true;
});

(function init() {
  if (isStandalone) {
    $('install').classList.add('hide');
    $('open').textContent = 'Open JobWarden';
    $('status').textContent = 'The app is installed on this device.';
    $('status').className = 'status ok';
    return;
  }
  if (isiOS) {
    $('install').classList.add('hide');
    $('ios').classList.remove('hide');
    $('status').textContent = 'On iPhone / iPad, install from the Share menu (steps below).';
    return;
  }
  setTimeout(() => {
    if (!deferred) {
      $('manual').classList.remove('hide');
      $('status').textContent = 'If the Install button stays greyed out, use the browser menu (steps below).';
    }
  }, 1500);
})();
