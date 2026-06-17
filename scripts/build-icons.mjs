// build-icons.mjs — dev-time generator. One concern: vendor selected Lucide SVGs into
// a committed, dependency-free js/ui/icons.js. Run: npm run build:icons
// Requires lucide-static installed (npm install lucide-static@1.20.0 --save-dev).
import { readFileSync, writeFileSync } from 'node:fs';

const names = ['circle-alert', 'clock', 'utensils', 'timer-off', 'camera', 'file-pen-line', 'list', 'download', 'settings', 'shield-check', 'map-pin', 'trash-2', 'rotate-ccw', 'check'];

const entries = names.map(name => {
  const svg = readFileSync(`node_modules/lucide-static/icons/${name}.svg`, 'utf8');
  const inner = svg.replace(/^<svg[^>]*>/, '').replace('</svg>', '').trim();
  return `  ${JSON.stringify(name)}: ${JSON.stringify(inner)}`;
});

writeFileSync('js/ui/icons.js', `const ICONS = {\n${entries.join(',\n')}\n};\n\nexport function icon(name, label = '') {\n  const body = ICONS[name] || '';\n  const aria = label ? \` role="img" aria-label="\${label}"\` : ' aria-hidden="true"';\n  return \`<span class="icon"\${aria}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${body}</svg></span>\`;\n}\n`);

console.log(`build-icons: wrote ${names.length} icons to js/ui/icons.js`);
