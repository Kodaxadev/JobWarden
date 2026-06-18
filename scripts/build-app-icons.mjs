// build-app-icons.mjs — dev-time generator for the PWA PNG icons from the navy+gold
// brand mark. Run: node scripts/build-app-icons.mjs   (requires @resvg/resvg-js devDep)
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const mark = (sw, cw) => `
  <path d="M256 132 L388 180 V286 C388 372 332 426 256 452 C180 426 124 372 124 286 V180 Z" fill="none" stroke="url(#gd)" stroke-width="${sw}"/>
  <path d="M204 286 L244 326 L344 214" fill="none" stroke="url(#gd)" stroke-width="${cw}" stroke-linecap="round" stroke-linejoin="round"/>`;

const svg = (rx, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="nv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#243c63"/><stop offset="1" stop-color="#0d1a2d"/></linearGradient>
    <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e7cd7e"/><stop offset="1" stop-color="#b78f2c"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#nv)"/>
  <g transform="translate(256 292) scale(${scale}) translate(-256 -292)">${mark(13, 30)}</g>
</svg>`;

const render = (svgStr, width, out) => {
  const png = new Resvg(svgStr, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
};

render(svg(115, 1), 512, 'icons/icon-512.png');
render(svg(115, 1), 192, 'icons/icon-192.png');
render(svg(0, 0.78), 512, 'icons/icon-maskable-512.png');
