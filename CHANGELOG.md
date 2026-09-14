# Changelog

Versions are the service-worker cache id (`jobwarden-vNN`), shown in **Settings → About**.
That string is the build identifier a user can read back. Newest first.

This project has not had a public production launch. See
[`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md) for the pending review gate.

## v108 — 2026-09-14

**Your side of the working day.**

Replaced the public homepage's floating phone and numbered feature grid with a
personal-journal identity: warm paper, deep ink, terracotta, expressive serif type,
and a fictional workday note rendered in native HTML. No generated lettering,
external photography, new font download, or additional script was introduced.

Copy now begins with recognisable moments in a worker's day, rather than software
features. The deeper explanation remains on `how-it-works.html`; its shared
stylesheet carries the same warmer identity. Trial status, local-storage boundaries,
and pending California employment-attorney review remain visible.

The homepage was rendered locally at 1440, 1024, 768, 580, 390, and 320 pixels using
fallback fonts, without horizontal page overflow. These are local static renders,
not screenshots of the deployed domain. Automated checks run in repository CI.

No record schema, app screen, legal rule, database, export, or service-worker
fetch behaviour changed. Only the cache version advanced to v108.

## v107 — 2026-09-14

Added a separate product explanation page, a focused homepage, trial labelling,
marketing regression tests, and a sitemap entry. The new guide and website
stylesheet were added to the offline cache. See
[`docs/MARKETING_V107.md`](docs/MARKETING_V107.md) for that implementation's notes.

## Earlier versions

The full previous changelog, through v106, is retained unchanged in
[`CHANGELOG-PRE-V107.md`](CHANGELOG-PRE-V107.md). It remains at the repository root
so its original relative links continue to resolve.
The older archive remains at
[`docs/CHANGELOG-ARCHIVE.md`](docs/CHANGELOG-ARCHIVE.md).
