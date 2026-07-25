# Design QA — Editorial landing and install experience

Final result: passed

## Scope

- Selected source: `C:\Users\Justi\.codex\generated_images\019f9aef-b609-7981-9acd-f30f694ee1df\call_s1C14Di9BM4bseP8veEBrpdt.png`
- Implementation: `landing.html`, `install.html`, `css/marketing.css`, and `css/install.css`
- Product artifact: `assets/marketing-app-preview.png`
- Texture asset: `assets/marketing-paper-texture.png`

## Comparison evidence

- Source and implementation comparison:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\landing-redesign\design-comparison.png`
- Final desktop implementation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\landing-redesign\landing-desktop-viewport.png`
- Final phone implementation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\landing-redesign\landing-mobile-viewport.png`
- Install desktop:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\landing-redesign\install-desktop-viewport.png`
- Install phone:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\landing-redesign\install-mobile-viewport.png`

## Viewports checked

- Desktop: 1440 × 1024, 1× browser density
- Tablet: 820 × 1024, 1× browser density
- Phone: requested 390 × 844; browser content viewport reported 375 × 844 because of browser chrome

All three widths reported zero horizontal overflow.

## Comparison history

### Pass 1

- P1 typography/layout: the initial implementation used a display serif and wrapped the hero
  into four lines. The source used a heavy two-line sans headline, so the hero was too tall
  and delayed the paper section.
- P2 accessibility: links and buttons still relied on browser-default focus presentation.
- P2 icon fidelity: the trust row used text dividers where the source used restrained line icons.

Fixes:

- Mapped the hero and section display type to Geist 600, reduced the hero to the source's
  two-line measure, replaced the full-width underline with a short gold rule, and reduced the
  hero frame so the paper section enters the first desktop viewport.
- Added high-contrast `:focus-visible` outlines and retained reduced-motion handling.
- Reused licensed Lucide lock, shield, and offline icons as cached local assets.

### Pass 2

- P2 record layout: the field-record heading wrapped early and the paper artifact sat too far
  left compared with the selected source.

Fix:

- Rebalanced the record grid to give the heading a wider editorial column and move the paper
  artifact into the source's right-hand position.

## Final checks

- Fonts and hierarchy: match the selected bold editorial sans treatment; brand wordmark keeps
  its existing Cinzel identity.
- Spacing and layout: hero, app crop, CTA group, trust rail, and paper-section reveal match the
  source's desktop hierarchy.
- Color and surfaces: dark navy, restrained gold, warm ivory, thin borders, and the paper texture
  map directly to the target. No gradients, decorative blobs, glass cards, or fake device bezel.
- Image quality: hero uses a direct capture of the actual app; the paper texture contains no text
  or baked-in UI.
- Responsiveness: desktop, tablet, and phone layouts do not overlap or overflow. Mobile CTAs are
  full-width and the product capture remains legible.
- Content: privacy and product claims stay within JobWarden's local-only, personal-account boundary.
- Accessibility: semantic landmarks and headings, useful image alternative text, 52–54 px primary
  controls, keyboard focus indicators, reduced motion, and rem-based type are present.
- States and interactions: install-disabled, device-guidance, installed, and canceled states remain
  implemented. Landing-to-install and install-to-landing navigation were exercised in-browser.
- Browser console: no warnings or errors in the final landing and install checks.
- P0 remaining: none.
- P1 remaining: none.
- P2 remaining: none.
