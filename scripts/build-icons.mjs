// build-icons.mjs - dev-time generator. One concern: vendor selected Lucide SVGs
// into a committed, dependency-free js/ui/icons.js. Run: npm run build:icons
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ICON_NAMES = Object.freeze([
  'calendar',
  'calendar-heart',
  'badge-dollar-sign',
  'camera',
  'check',
  'chevron-right',
  'circle-alert',
  'clipboard-pen',
  'clock',
  'coffee',
  'download',
  'footprints',
  'list',
  'lock',
  'map-pin',
  'message-square',
  'notebook-pen',
  'rotate-ccw',
  'receipt-text',
  'sandwich',
  'save',
  'settings',
  'shield',
  'shield-check',
  'trash-2',
  'triangle-alert',
  'wallet',
  'x',
]);

export function extractIconBody(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/^\s*<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

export function buildIcons({
  iconDir = 'node_modules/lucide-static/icons',
  outFile = 'js/ui/icons.js',
} = {}) {
  const entries = ICON_NAMES.map(name => {
    const svg = readFileSync(`${iconDir}/${name}.svg`, 'utf8');
    return `  ${JSON.stringify(name)}: ${JSON.stringify(extractIconBody(svg))}`;
  });

  writeFileSync(outFile, `const ICONS = {\n${entries.join(',\n')}\n};\n\nexport function icon(name, label = '') {\n  const body = ICONS[name] || '';\n  const aria = label ? \` role="img" aria-label="\${label}"\` : ' aria-hidden="true"';\n  return \`<span class="icon"\${aria}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${body}</svg></span>\`;\n}\n`);
  return ICON_NAMES.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`build-icons: wrote ${buildIcons()} icons to js/ui/icons.js`);
}
