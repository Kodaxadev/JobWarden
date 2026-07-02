// reportBrand.js — shared letterhead + the "paper mode" styles for the printable
// documents (full report + pattern summary). One concern: making the exports look like
// one product on paper. Print-safe: web-safe serif (Georgia) + inline SVG mark, no font
// loading needed in the popup print window; navy + gold on white, minimal ink.
//
// PAPER_CSS is the documented light palette for printed documents (see DESIGN.md
// "Paper mode") — the one place these values live. Both export files consume it and
// keep only their own layout rules, referencing the tokens.

export const PAPER_CSS = `
  :root {
    --paper-navy:#16263f; --paper-gold:#b78f2c; --paper-gold-2:#c8a23a; --paper-gold-deep:#8a6a12;
    --paper-ink:#1a2230; --paper-ink-2:#444; --paper-muted:#555; --paper-faint:#5f6673;
    --paper-line:#ccc; --paper-well:#f7f7f7;
    --paper-green:#166b3a;
    --paper-gold-tint:#faf7ee; --paper-gold-line:#e0cd96;
    --paper-navy-tint:#f6f8fb; --paper-navy-line:#d6dde8;
    --paper-red:#a10000;
  }
  *{box-sizing:border-box}
  body{font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:var(--paper-ink);margin:32px}
  h1{font-size:20px;margin:0 0 4px;color:var(--paper-navy)}
  h2{color:var(--paper-navy)}
  .sub{color:var(--paper-muted);margin:0 0 18px;font-size:12px}
  code{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
  .integrity{margin:0 0 18px;padding:10px 12px;background:var(--paper-gold-tint);border:1px solid var(--paper-gold-line);border-radius:6px;font-size:11px;color:var(--paper-ink-2)}
  .integrity p{margin:6px 0 0;color:var(--paper-muted)}
  .foot{margin-top:24px;font-size:11px;color:var(--paper-muted);border-top:1px solid var(--paper-gold-2);padding-top:10px}
  .sign{margin-top:30px}
  .sign p{font-size:11px;color:var(--paper-ink-2)}
  .sign .line{border-top:1px solid #000;width:280px;margin-top:34px;padding-top:4px;font-size:11px}
  @media print{body{margin:12mm}}
`;

export const BRAND_CSS = `
  .doc-head { display:flex; align-items:center; gap:13px; padding-bottom:12px; border-bottom:2px solid var(--paper-gold-2); margin:0 0 18px; }
  .doc-mark { flex:none; }
  .doc-mark svg { width:42px; height:46px; display:block; }
  .doc-brand { font-family: Georgia,"Times New Roman",serif; font-size:21px; font-weight:700; letter-spacing:.05em; line-height:1; }
  .doc-brand .j { color: var(--paper-navy); } .doc-brand .w { color: var(--paper-gold); }
  .doc-tagline { margin-left:auto; font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; color: var(--paper-gold); white-space:nowrap; }
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
