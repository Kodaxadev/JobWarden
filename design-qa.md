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

## v81 logo refinement addendum

- Before/after comparison:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\logo-refinement-comparison.png`
- Final landing context:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\logo-refinement-landing.png`
- The shield-and-check concept remains intact. The refined mark improves curve continuity,
  check centering, negative space, stroke consistency, and 192 px reproduction.
- Header, app shell, favicon, standard PWA tile, and maskable PWA tile now resolve from the
  same canonical SVG geometry. The maskable mark remains inside the platform-safe center area.

## v82 daylight theme addendum

Final result: passed

### Source and implementation

- Source visual truth (the previous light theme):
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\before-settings-viewport.jpg`
- Final implementation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\after-settings-viewport.jpg`
- Same-state comparison:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\comparison-settings.jpg`
- Focused selected-state evidence:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\after-selected-state.jpg`
- Empty-state evidence:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\after-empty-records.jpg`
- Dark-theme isolation comparison:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\light-theme\comparison-dark-regression.jpg`

The source and implementation use the same Settings screen, content, browser, theme,
and requested 390 × 844 CSS viewport at 1× density. Screenshots with a vertical scrollbar
are 375 × 812 pixels because the in-app browser excludes its scrollbar and browser chrome.
The side-by-side comparison is 750 × 812 pixels with no rescaling.

### Comparison history

#### Pass 1

- P1 color/materials: pure-white cards on a cool blue-gray canvas created the reported
  glare, while black inset shadows carried dark-theme plasticity into the light theme.
- P2 state fidelity: white hover tints disappeared on pale surfaces, and recessed data wells
  remained too heavily shadowed for a daylight material.

Fixes:

- Replaced the light palette with warm stone, layered ivory paper, navy ink, and deepened
  text gold; no app surface uses pure white.
- Added light-specific elevation for fields, buttons, chips, data wells, navigation,
  interaction tints, and danger controls in the isolated `css/light.css` module.

#### Pass 2

- P2 accessibility: the first warm-palette pass left the faint/placeholder token at 3.93:1
  against the input well.

Fix:

- Darkened the faint token and pinned native placeholder opacity. Automated checks now require
  text at 7:1 and muted/faint/brand-link text at 4.5:1 or better across the canvas, card,
  secondary surface, and field well.

### Final checks

- Fonts and typography: existing Geist/Cinzel hierarchy, sizes, line heights, and wrapping are
  unchanged; the theme changes material, not information density.
- Spacing and layout: card geometry, 16 px page margins, 48 px minimum controls, radii, and
  vertical rhythm remain consistent. The softer shadows improve separation without increasing
  apparent bulk.
- Colors and tokens: the visible hierarchy comes from warm tonal layers rather than white
  luminance. Navy selected chips, green local-only status, amber attention, and red danger
  states remain semantically distinct.
- Image and icon quality: the canonical logo and existing Lucide icon set are unchanged and
  retain their sharp source assets; no replacement artwork or CSS-drawn asset was introduced.
- Copy and content: all product, privacy, and legal language is unchanged.
- States and interactions: default, selected, empty, theme-switching, and no-record export
  feedback were exercised. The dark theme was switched through the real UI and showed no
  light-theme leakage.
- Responsiveness: 320 × 568, 390 × 844, and 768 × 1024 were browser-checked. There was no
  horizontal overflow; the narrow header wraps intentionally and persistent navigation remains
  reachable.
- Accessibility: semantic controls and labels are unchanged, rem-based type and reduced motion
  remain present, focus rings remain gold and high contrast, and new token tests enforce text
  contrast. Settings reported no locally recorded app errors.
- P0 remaining: none.
- P1 remaining: none.
- P2 remaining: none.

Final result: passed

## v88 live feedback addendum

Final result: passed for the captured mobile states.

- Prior live-shift state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\02-shift-before-phone.png`
- Final dark live-shift state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\10-shift-refined-dark-final.png`
- Final light live-shift state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\07-shift-refined-light-final.png`
- Dark end-shift confirmation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\04-end-shift-dialog-dark.png`
- Light end-shift confirmation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\08-end-shift-dialog-light.png`
- Persistent inline validation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-shift-feedback-audit\09-inline-validation-light.png`

The final light captures came from a fresh localhost origin so the new service-worker
cache could not supply stale theme CSS. This exposed and verified the fix for paper button
materials leaking into the navy shift panel. The interaction pass exercised cancellation,
focus return, and the missing-issue save path. No horizontal overflow or browser console
errors were observed in the accepted states.

## v89 feedback and recovery addendum

Final result: passed for the captured mobile states.

- Prior Records empty state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\01-records-empty-before.png`
- Prior no-record Export state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\02-export-empty-before.png`
- Final Records empty state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\06-records-empty-v89.png`
- Final no-record Export state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\07-export-empty-v89.png`
- Final Settings status and app-health state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\13-settings-status-final-v89.png`
- Final unsaved-Settings confirmation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\12-settings-unsaved-dialog-v89.png`
- Final daylight success feedback:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-status-states-audit\10-settings-toast-light-v89.png`

The final run used a fresh localhost origin and a 375 × 812 viewport. The direct Log
actions, empty Export path, settings save, leave-without-saving cancellation, clean
navigation after saving, status announcements, and zero horizontal overflow were exercised.
Screenshot review cannot establish full assistive-technology behavior, so a physical iOS
VoiceOver and Android TalkBack pass remains separate release evidence.

## v90 first-run and resilience addendum

Final result: passed for the captured mobile states.

- Prior first-run state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\01-first-run-before.png`
- Prior shift-reminder state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\03-shift-reminder-before.png`
- Final first-run expectations:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\06-first-run-v90.png`
- Final required-acknowledgment feedback:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\07-first-run-validation-v90.png`
- Final denied-alert recovery and update-ready state:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\04-shift-alerts-blocked-v90.png`
- Final update/unsaved-work confirmation:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\05-update-unsaved-guard-v90.png`
- Final daylight denied-alert recovery:
  `C:\Users\Justi\.codex\visualizations\2026\07\25\019f9aef-b609-7981-9acd-f30f694ee1df\jobwarden-edge-states-audit-v90\08-shift-alerts-light-v90.png`

The run used fresh localhost origins and a 375 × 812 viewport. It exercised first-run
validation and focus, the browser-denied notification state, dark and daylight rendering,
service-worker update discovery, and cancellation of an update around an unsaved record.
The offline state model is covered by focused tests; this browser surface did not expose a
network-offline control for a true connectivity transition. Physical-device notification,
VoiceOver, and TalkBack behavior remain separate release evidence.
