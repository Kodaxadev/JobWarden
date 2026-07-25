// build-app-icons.mjs — render PWA tiles from the canonical vector brand mark.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const markData = Buffer.from(readFileSync('icons/logo-mark.svg', 'utf8')).toString('base64');

const tile = ({ radius, markScale }) => {
  const markWidth = 310 * markScale;
  const markHeight = 341 * markScale;
  const x = (512 - markWidth) / 2;
  const y = (512 - markHeight) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#263f68"/>
        <stop offset="1" stop-color="#0b1728"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="${radius}" fill="url(#tile)"/>
    <image href="data:image/svg+xml;base64,${markData}" x="${x}" y="${y}" width="${markWidth}" height="${markHeight}"/>
  </svg>`;
};

const render = (source, width, output) => {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(output, png);
  console.log(`wrote ${output} (${png.length} bytes)`);
};

const standard = tile({ radius: 115, markScale: 1 });
render(standard, 512, 'icons/icon-512.png');
render(standard, 192, 'icons/icon-192.png');
render(tile({ radius: 0, markScale: 0.78 }), 512, 'icons/icon-maskable-512.png');
