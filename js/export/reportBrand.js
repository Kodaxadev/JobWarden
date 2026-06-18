// reportBrand.js — shared letterhead + brand styling for the printable documents
// (full report + pattern summary). One concern: making the exports look like a real
// product. Print-safe: web-safe serif (Georgia) + inline SVG mark, no font loading
// needed in the popup print window; navy + gold, minimal ink.

export const BRAND_CSS = `
  :root { --navy:#16263f; --gold:#b78f2c; --gold-2:#c8a23a; }
  body { color:#1a2230; }
  h1 { color: var(--navy); }
  h2 { color: var(--navy); }
  .doc-head { display:flex; align-items:center; gap:13px; padding-bottom:12px; border-bottom:2px solid var(--gold-2); margin:0 0 18px; }
  .doc-mark { flex:none; }
  .doc-mark svg { width:42px; height:46px; display:block; }
  .doc-brand { font-family: Georgia,"Times New Roman",serif; font-size:21px; font-weight:700; letter-spacing:.05em; line-height:1; }
  .doc-brand .j { color: var(--navy); } .doc-brand .w { color: var(--gold); }
  .doc-tagline { margin-left:auto; font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; color: var(--gold); white-space:nowrap; }
  .integrity { background:#faf7ee; border-color:#e0cd96; }
  .attest { background:#f6f8fb; border-color:#d6dde8; }
  .attest .imm { color: var(--navy); }
  .foot { border-top-color: var(--gold-2); }
  table th { background:#eef1f6; color: var(--navy); }
  td.f { color:#8a6a12; }
  @media (max-width:520px){ .doc-tagline { display:none; } }
`;

export function docHead() {
  return `<div class="doc-head">
    <span class="doc-mark"><svg viewBox="0 0 100 110" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 8 L84 22 V53 C84 78 68 93 50 100 C32 93 16 78 16 53 V22 Z" stroke="#16263f" stroke-width="5"/>
      <path d="M34 55 L46 67 L72 36" stroke="#b78f2c" stroke-width="9"/></svg></span>
    <span class="doc-brand"><span class="j">JOB</span><span class="w">WARDEN</span></span>
    <span class="doc-tagline">Document · Protect · Empower</span>
  </div>`;
}
