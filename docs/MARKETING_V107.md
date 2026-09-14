# jobwarden-v107 — product website and trial explanation

The homepage is shorter, with a static, labelled interface illustration and a
navy, warm-paper, and gold editorial layout. Detailed product content lives on
`how-it-works.html`, not in additional homepage sections.

The new page documents capture, review, export, privacy, local storage, PWA
installation, California coverage, and the pending attorney-review gate. It
makes no legal determination, automatic-sync, closed-app alert, or blanket
local-encryption promise. Trial status remains explicit.

`css/website.css` is isolated to the two public pages. The install guide and
recordkeeping app retain their existing styles and behavior. No record schema,
database migration, legal rule, account, analytics, or data-upload path changed.
The service worker advances to v107 and caches the new page and stylesheet.

The Kodaxa portfolio presents this as an independent website + PWA in trial,
not commissioned client work or a generally released legal service.

Local checks: rendered desktop, 390px and 320px layouts with fallback fonts;
checked horizontal overflow and native FAQ disclosure interaction. Full app
regression tests, lint, and type checking run in the repository CI.
