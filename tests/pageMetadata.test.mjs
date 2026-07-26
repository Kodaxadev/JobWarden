// This product spreads by one worker sending another a link. What that link looks like when it
// lands — and which page a search sends a stranger to — is distribution, not decoration. None
// of it is visible while developing, so it is checked here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SITE = 'https://jobwarden.kodaxa.dev';
const page = (f) => readFileSync(f, 'utf8');
const head = (f) => page(f).split('</head>')[0];
const PUBLIC_PAGES = ['landing.html', 'install.html', 'privacy.html', 'terms.html'];

const meta = (src, name) =>
  new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`).exec(src)?.[1];

// The domain is asserted in the privacy policy and the terms as the operator's site. A social
// tag pointing somewhere else would be a link preview for a site that is not this one.
test('the site URL in the metadata is the one the legal pages name', () => {
  const host = SITE.replace('https://', '');
  assert.ok(page('privacy.html').includes(host), 'privacy.html must name the same host');
  assert.ok(page('terms.html').includes(host), 'terms.html must name the same host');
});

test('every public page declares one canonical address', () => {
  for (const f of PUBLIC_PAGES) {
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(head(f))?.[1];
    assert.ok(canonical, `${f} has no canonical URL`);
    assert.ok(canonical.startsWith(SITE), `${f} canonical must be absolute: ${canonical}`);
  }
  // '/' serves the landing page, so that — not landing.html — is the address to consolidate on.
  assert.equal(/<link rel="canonical" href="([^"]+)"/.exec(head('landing.html'))[1], SITE + '/');
});

test('a shared link arrives as a card, not a bare URL', () => {
  const src = head('landing.html');
  assert.ok(meta(src, 'og:title'), 'og:title missing');
  assert.ok(meta(src, 'og:url').startsWith(SITE), 'og:url must be absolute');
  assert.ok(meta(src, 'og:image').startsWith(SITE), 'og:image must be absolute — crawlers do not resolve relative paths');
  assert.ok(meta(src, 'og:image:alt'), 'the preview image needs alt text too');
  assert.equal(meta(src, 'og:type'), 'website');
  assert.ok(meta(src, 'twitter:card'), 'twitter:card missing');

  const imagePath = meta(src, 'og:image').slice(SITE.length + 1);
  assert.ok(existsSync(imagePath), `og:image points at a file that is not in the repo: ${imagePath}`);
});

test('the preview text answers the fear before the tap, not after', () => {
  const description = meta(head('landing.html'), 'og:description');
  assert.ok(description.length > 60 && description.length < 300, 'aim for one readable sentence or two');
  assert.match(description, /phone|device/i, 'where the records live is the thing people need to know first');
});

test('search sends people to the page that explains this, not to the app shell', () => {
  assert.match(meta(head('index.html'), 'robots'), /noindex/);
  for (const f of PUBLIC_PAGES) {
    const robots = meta(head(f), 'robots');
    assert.ok(!robots || !/noindex/.test(robots), `${f} should be indexable`);
  }
});

test('robots.txt lets the crawler reach the page whose noindex it needs to read', () => {
  const robots = page('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow: \/index\.html/m,
    'a disallowed page is never fetched, so its noindex is never seen');
  assert.doesNotMatch(robots, /^Disallow: \/$/m, 'that would delist the whole site');
  assert.match(robots, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
});

test('the sitemap lists the real pages and leaves the app out', () => {
  const listed = [...page('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(listed.includes(SITE + '/'), 'the landing page is the entry point');
  assert.ok(!listed.some(u => u.includes('index.html')), 'the app shell has nothing to index');
  for (const url of listed) {
    const path = url.slice(SITE.length + 1);
    assert.ok(path === '' || existsSync(path), `sitemap lists a page that does not exist: ${url}`);
  }
});

// Installed to a home screen, the log is an app. iOS needed telling that long before manifests.
test('the app shell asks to open as an app on iOS as well as Android', () => {
  const src = head('index.html');
  assert.equal(meta(src, 'apple-mobile-web-app-capable'), 'yes');
  assert.equal(meta(src, 'apple-mobile-web-app-title'), 'JobWarden');
  assert.match(src, /viewport-fit=cover/, 'the safe-area padding in shell.css depends on this');
});

// The app itself never uses an inline style, so `style-src 'unsafe-inline'` looks like something
// to tighten. It is not: the printable report and pattern summary are written into a popup the
// app opens, that popup inherits the app's policy on top of its own, and their stylesheet is an
// inline <style> block. Tightening it renders printed evidence — the thing a worker hands to a
// lawyer — as unstyled text. Scripts stay strict either way.
test('no inline styles in the app, and the print reports still get to use them', () => {
  for (const f of ['index.html', ...PUBLIC_PAGES]) {
    // Comments discuss markup without being it — including the note this test refers to.
    const markup = page(f).replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(markup, /\sstyle="/, `${f} has an inline style attribute`);
    assert.doesNotMatch(markup, /<style[\s>]/, `${f} has an inline <style> block`);
  }
  // The CSP is an http-equiv meta, not a name/property one.
  const appCsp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(head('index.html'))?.[1];
  assert.ok(appCsp, 'index.html must declare a policy in the document too, not only at the edge');
  assert.match(appCsp, /script-src 'self'/);
  assert.doesNotMatch(appCsp, /script-src[^;]*unsafe/, 'no inline or eval scripts, ever');
  assert.match(appCsp, /style-src [^;]*'unsafe-inline'/,
    'the printable documents are written into a popup that inherits this policy — see the note in index.html');
  const report = readFileSync('js/export/reportBrand.js', 'utf8');
  assert.match(report, /style-src 'unsafe-inline'/, 'the report also declares its own policy');
  assert.match(report, /script-src 'none'/, 'a tag that slipped past the escaper still cannot run');
});

// With viewport-fit=cover the page runs under the status bar and the notch. The inset has to be
// on the padding that pushes content DOWN, or the brand row sits on top of the clock.
test('the header reserves the top safe area at the top', () => {
  const css = readFileSync('css/shell.css', 'utf8');
  const header = /\.app-header \{([^}]*)\}/.exec(css)[1];
  const padding = /padding:\s*([^;]+);/.exec(header)[1];
  assert.match(padding, /^calc\(\s*\d+px \+ env\(safe-area-inset-top\)\s*\)/,
    `the top inset belongs on the first padding value, got: ${padding}`);
});

// The app's promise is that nothing leaves the phone unless the person sends it. One control
// breaks that on purpose — the map link on a record with a saved location hands those
// coordinates to Google — so it has to name the third party where it is tapped AND be listed
// where the promise is made. A link labelled "map" was the wrong amount of warning.
test('the only outbound evidence link names Google, and is disclosed where the promise is', () => {
  const list = readFileSync('js/ui/incidentList.js', 'utf8');
  assert.match(list, /text: 'open in Google Maps'/, 'the link must name where it sends the coordinates');
  assert.match(list, /rel: 'noopener noreferrer'/, 'and match every other outbound link in the app');

  for (const [file, src] of [['privacy.html', page('privacy.html')], ['js/ui/legalView.js', readFileSync('js/ui/legalView.js', 'utf8')]]) {
    assert.match(src, /open in Google Maps/, `${file} must disclose the map link`);
    assert.match(src, /coordinates/i, `${file} must say what is sent`);
  }
});

test('every outbound link in the app is opener- and referrer-safe', () => {
  const files = ['js/ui/incidentList.js', 'js/ui/legalView.js', 'js/ui/rightsFaq.js', 'js/ui/onboarding.js'];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/el\('a',\s*\{([^}]*)\}/g)) {
      if (!/target:\s*'_blank'/.test(m[1])) continue;
      assert.match(m[1], /rel:\s*'noopener noreferrer'/, `${f} opens a tab without noopener noreferrer`);
    }
  }
});
