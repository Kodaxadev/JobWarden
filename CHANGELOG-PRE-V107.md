# Changelog

Versions are the service-worker cache id (`jobwarden-vNN`), shown in **Settings → About**.
That string is the only build identifier a user can read back to you, so it is what this
file is keyed on. Newest first.

This project has not had a public production launch — see
[`docs/LEGAL_FOUNDATION.md`](docs/LEGAL_FOUNDATION.md) for what is still blocking one.

## v106 — 2026-07-26

**Every literal colour and radius in the stylesheets now has a name.**

The design detector had been flagging roughly fifty values a session, which meant it was flagging
nothing: the signal was buried. Most of it turned out to be bookkeeping — the light theme and the
landing/install palettes were documented in prose but never in the machine-readable frontmatter, so
tooling scored the entire daylight theme as drift. With that closed, fourteen genuine strays were
left standing, and they were real.

The install guide and landing page each keep their own `:root` block, and then nine and two colours
respectively were written straight into rules anyway — a disabled button fill, the status line, the
three hairlines ruling the device guides, the gold that carries text on paper. They are named in
those files now. The app had a matching pair: white ink hardcoded on the selected chip and on the
photo-remove button, which are a navy fill and a red one, so they are `--on-navy` and `--on-danger`
rather than one shared `#fff`. The save button's ramp was documented with a hole in it — the hover
gradient's base stop and the hover border were the only two of the set never written down.

Four square icon tiles were still carrying hand-picked radii of 9, 10, 10 and 12px. `--radius-tile`
was introduced to end exactly that, and these four were missed: 30% of their tile lands within a
pixel of each. The landing and install buttons keep their deliberately sharp 3px corner, now named
as an editorial choice on the brand surface rather than sitting there looking like drift.

No pixel moved. Every rendered value was checked against the hex it replaced on all three surfaces.

**Still blocking public launch:** review of the findings language and UPL posture by a licensed
California employment attorney.

## v105 — 2026-07-26

**The interaction states get the same treatment the surfaces already had.**

Everything resting had a scale — surfaces, shadows, spacing, type, motion. The *states* did not, so
every control eyeballed its own: seven different press washes between .045 and .06, three hover
washes, four press-inset depths, and two controls that faded instead of pressing. None of it was a
decision; it is what happens when there is no token to reach for, exactly as the type scale went
before it had one.

That gap was also a real daylight defect. A white 3% wash is invisible on a cream surface, so the
light theme had to re-patch hover selector by selector — and everything the list forgot had no
visible hover or press at all in daylight: the action cells in Export and Settings, the issue
choices, the group heads, the back button. Five tokens, remapped per theme, now cover every
pressable and every sunk surface at once. In daylight a hover shifts the surface by seven levels
and a press by thirteen, where before it was about one.

**Disclosures open instead of appearing.** Adaptive disclosure is what the app is built on, every
caret already rotated on the shared curve — and then the panel it pointed at simply existed. All
eight now share one keyframe, the record row included, which toggles `hidden` and could never
transition at all. Nothing animates height under a clipped box: a reveal that stalls must leave the
content plainly readable, not hidden inside a panel that never finished opening.

**The active-tab indicator travels.** It was a mark on whichever tab was active, so it vanished
from one and appeared on another with nothing connecting them — the one state change in the app
with no motion, on the control used most. It is now a single marker on the fascia, identical at
rest, moved by transform alone.

Smaller surface work: an open issue group reads as a sunk container rather than borrowing the
hover wash, so resting a thumb on a group and standing it open no longer look the same; and the
edit-history and Deleted drawers stop drawing the browser's own triangle next to five disclosures
that use the app's caret, with a real 44px target and the same press feedback as everything else.

**Still blocking public launch:** review of the findings language and UPL posture by a licensed
California employment attorney.

## v104 — 2026-07-26

**Four ways the app could quietly write the wrong thing, or nothing at all.**

**Double-tapping Save wrote the record twice.** Sealing hashes every attached photo before the
write, so on the phones this is built for that window is long enough to hit again — and each tap
ran the record factory afresh, minting a new id, so both writes landed. Two identical records in
an evidence log, with nothing to tell them apart afterwards. Both capture paths now go dead on
the first tap and show that they are working; the quick "interrupted lunch" sheet needed it most,
since being fast is the whole point of it.

**If the database would not open, the app went blank.** It was a toast — which vanishes after two
seconds and leaves an empty shell someone can still type a record into, believing it was kept.
The causes are ordinary here: a private window, "block all cookies", a locked-down work phone.
Now it says the app cannot save on this phone, why, and what to do, and stays on screen.

**Overlapping settings saves overwrote each other.** The theme saves the moment it is picked, and
tapping "Save settings" straight after raced it — both reads started from the same stored value
and the later write dropped the earlier change. Marking a backup as done raced the same way, and
losing that revives the overdue banner. The read and the write are now one transaction.

**Every export filename carried the wrong date after about 4pm.** The stamp was the UTC date, so
in California an evening backup was named for tomorrow — and "which backup is the newest" is read
straight off those filenames.

Two smaller ones. The weekly-hours roll-up adds up every record in a Sunday–Saturday week
whatever workplace it came from, but overtime is owed per employer and two hourly jobs is
ordinary: when a flagged week draws on more than one workplace it now says so, and both surfaces
that print the number take that caveat from one place instead of each wording their own. And the
"map" link on a record — the only control in the app that hands recorded evidence to a third
party — now says "open in Google Maps" rather than "map", carries `noreferrer` like every other
outbound link, and is named in the privacy policy's list of ways data leaves the phone. A photo
that fails to attach in the quick sheet is reported instead of just not appearing.

**Still blocking public launch:** review of the findings language and UPL posture by a licensed
California employment attorney.

## v103 — 2026-07-26

**A production defect that only existed in production, and the missing half of "your records
are yours."**

The service worker precached the site root. In production the root redirects to the landing
page, so what got stored under `/` was a redirected response — and a browser answering a
navigation from one of those returns a network error, not a page. Every returning visitor to the
bare domain would have hit a failure screen, online as much as off, and nothing in development
could show it because there is no redirect on localhost. The worker now stores a plain copy of
the body, and while installing it fetches past the browser's HTTP cache so a new build cannot
ship the previous build's files. The worker also has behaviour tests now — install, activate,
cache-first, the offline navigation fallbacks, the dev-loop path — rather than only a check that
its asset list is complete.

Deleting a record moves it to **Deleted**, which is right, and nothing ever emptied that drawer:
a record logged by mistake stayed on the phone for good and travelled inside every backup.
**Delete forever** removes one. **Erase everything on this phone**, in Settings, removes all
records, photos, settings, the local diagnostics log and any running shift, leaving the app as it
was before first use. Both say plainly that they cannot be undone and cannot reach a backup or
email already sent. The privacy policy and the in-app Legal screen no longer point at the
browser's own storage screen as the only way out.

Restoring a backup now refuses records whose fields are the wrong type, instead of saving them
and breaking Records on the next read, and it reports how many it could not read rather than
dropping them in silence.

The light theme stopped announcing itself as an afterthought: the app no longer opens dark and
snaps to light once the database answers, and the phone's status bar takes the theme's colour
instead of staying black above a cream header. Installed to an iPhone home screen, the header
reserved the top safe area on its **bottom** padding, putting the brand row under the status
bar — fixed. Records and Export each read the whole store twice per render and re-ran the rules
engine over every record twice; they read it once.

Shared links arrive as a card rather than a bare URL, the pages declare canonical addresses,
`robots.txt` and a sitemap exist, and search now lands on the page that explains what this is
instead of on the app shell.

**Still blocking public launch:** review of the findings language and UPL posture by a licensed
California employment attorney.

## v92–v102 — 2026-07-25

**Backfilled.** These builds shipped without entries, which defeats the point of a file keyed on
the id a user reads back to you. Newest first:

- **v102** — the header badge reported a constant in live-status green, and was greenest in the
  riskiest state (records on the phone, no copy anywhere). It now reports whether a backup exists
  and how fresh it is, or stays silent and gives the banner the floor.
- **v101** — the hero image was an upscaled screenshot, 39% of it cropped away, still showing a
  placeholder the app had dropped. Redrawn as markup in the app's own tokens: sharp at every DPR,
  and it cannot drift out of date.
- **v100** — one trade's vocabulary had crept back into the capture form's first field and the
  sample copy. Removed, with a test so it stays out.
- **v99** — the record chevron left the screen at 200% text size.
- **v98** — dialog action labels wrapped at phone width.
- **v97** — light-theme gold was under AA wherever it carried text.
- **v96** — printed evidence ran outside the paper.
- **v95** — unbounded user text broke the record row.
- **v94** — the install and legal footers had no real tap targets.
- **v93** — six landing-page tap targets sat under the floor, the Install button among them.
- **v92** — copy that carried the meaning was being truncated; the icon-tile radius got a name.

## v91 — 2026-07-25

**Evidence access, backup restore, and deleted-record recovery now protect the user’s work.**
Denied or unavailable location access gets a persistent explanation instead of failing
silently, photo attachment status names partial failures, and clean permission attempts no
longer trigger a false unsaved-work warning. The location control also has an accurate
accessible name, and photo removal uses the app’s icon system.

Every full backup path now includes recoverable Deleted records. Export separates complete
phone backups from active-record reports, keeps backup actions available when only Deleted
records remain, and makes restore progress and outcomes persistent. Records opens a direct
recovery state when Deleted is the only remaining content.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v90 — 2026-07-25

**First run, shift-alert access, offline use, and app updates now explain themselves.**
The welcome flow names the local-only storage boundary, offline behavior, and the user’s
backup responsibility before the first record. Its required acknowledgment now uses a
visible error state, focus, `aria-invalid`, and an announced instruction instead of a faint
hint.

Starting a shift no longer triggers a surprise browser permission prompt. The live panel
shows whether shift alerts are available, allowed, or blocked, provides the explicit allow
action when appropriate, and always names the phone-alarm fallback. Offline use now gets a
persistent reassuring shell status. A ready update gets a persistent action and passes
through the existing unsaved-work guard before reloading.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v89 — 2026-07-25

**Empty, loading, success, and recovery states now behave like a finished product.**
Records gives a direct first-record action instead of pointing at the tab bar. Export no
longer presents six unusable actions when there is nothing to export; it offers a clear
path to Log while keeping backup restore available. Settings replaces an empty “Copy error
log” action with an honest app-health result and turns storage, auto-delete protection, and
the installed build into scannable status rows.

Transient feedback now uses a shared icon-led status capsule with distinct success,
warning, error, and neutral treatments. Settings protects unsaved profile, schedule, and
workplace changes, explains that theme changes save immediately, and places the global save
action outside the Workplaces card so its scope is unambiguous. The accepted phone states
were checked in dark and light themes on fresh browser origins.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v88 — 2026-07-25

**Live tracking and consequential decisions now use one deliberate feedback system.**
The active-shift panel separates elapsed time from start time, turns meal timing into a
scannable status row, gives lunch, rest, and end-shift actions an intentional hierarchy,
and keeps the reminder limitation honest without dominating the panel. Ending a shift now
asks before clearing the live tracker and explains that the result still needs review and
save.

Confirmations across unsaved edits, typo checks, readable backups, restores, recoverable
deletion, and storage failures now use a shared titled dialog with a real Lucide icon,
specific action language, trapped focus, Escape/scrim cancellation, and returned focus.
Missing issue selections stay visible beside the picker as an announced inline error
instead of disappearing in a toast. Dark and daylight states were rechecked on a fresh
phone-sized browser origin; the daylight pass also fixed pale control materials leaking
into the navy live panel.

The formal policy and findings language still require review by a licensed California
employment attorney before public launch.

## v86 — 2026-07-25

**Quick capture and record review now carry the same finish as the main Log screen.**
The interrupted-lunch sheet keeps its save action visible while optional details scroll,
uses real labels instead of placeholder-only fields, and makes every unconfirmed fact
optional. Saving a quick record no longer throws away a separate Log draft.

Records now show that rows expand, separate green fingerprint verification from gold
possible-issue notes, label the worker's own notes, and give repeat, edit, and recoverable
delete actions a clear hierarchy. Edit mode identifies the saved record being changed and
warns before navigation can discard unsaved work.

Both flows were rechecked on a phone-sized viewport in dark and light themes. The formal
policy and findings language still require review by a licensed California employment
attorney before public launch.

## v85 — 2026-07-25

**The mobile interface now behaves like one designed system.** The Log screen replaces
the oversized wall of issue buttons with compact, icon-led categories that disclose only
the choices a worker needs. Selected choices have a clear checked state, advanced form
sections use real chevrons, and both dark and light themes keep the same hierarchy.

Export and Settings now use shared action cells with leading icons, concise supporting
copy, and consistent recommended, secure, and navigation states. First-run setup fits its
required disclosure and start action on a phone, while the backup reminder is calmer and
more specific about where the data lives. Back controls, rights-guide disclosures,
checkbox rows, focus treatments, and narrow-screen spacing received the same pass.

The public landing page now shows the refined interface in its app preview. The formal
policy and findings language still require review by a licensed California employment
attorney before public launch.

## v84 — 2026-07-25

**The remaining California pay-event gaps are now real records, not free-form notes.**
Workers can capture split workdays, specific pay-stub defects and copy requests, tip
problems, and employer action after a paid-sick-leave request. Each flow asks only for
decision-useful facts, keeps medical diagnoses out of sick-leave entries, and carries those
facts through editing, fingerprints, Records, CSV, and printable reports.

The offline rights guide and cautious rule pointers now cover the same four areas. The app
does not calculate a split-shift amount, decide whether tip-pool participation was lawful,
or label sick-leave action retaliation. Capture sections now have unique control names and
section-specific disclosure labels for screen readers.

The canonical logo remains the single source for the header, SVG favicon, Apple touch icon,
standard and maskable PWA icons, notification icon, landing lockups, and marketing app
capture. The formal policy and findings language still require review by a licensed
California employment attorney before public launch.

## v83 — 2026-07-25

**Safer defaults and sharper California wording.** First-run setup now leaves pay and
exemption status unknown until the worker chooses it; salary no longer silently means
exempt. The optional profile is collapsed so the required disclosure and start action fit
the mobile first screen. Settings and reports use the same explicit hourly, commission,
salary-unknown, salary-nonexempt, and confirmed-exempt choices.

Meal logging now records mutual first- and second-meal waivers, explains their 6- and
12-hour limits, and states both conditions for an on-duty-meal exception. Final-pay capture
uses the exact 72-hour distinction and keeps a quit-without-notice entry pending while that
window is still open. Recording-consent language is limited to confidential conversations,
and unencrypted backups now say what they contain, who can read them, and ask for
confirmation before leaving the app.

The California rule review date is July 2026. The formal policy and findings language still
require review by a licensed California employment attorney before public launch.

## v82 — 2026-07-25

**Light without the glare.** Light mode is now the paper-and-ink counterpart to the dark
ledger: warm stone canvas, ivory surfaces, navy ink, restrained gold, and softer daylight
elevation. Inputs, buttons, data wells, hover states, alerts, and navigation all receive
light-specific materials instead of carrying dark-mode black shadows onto white panels.
There is no pure-white app surface, while text and secondary copy retain accessible
contrast for bright-condition reading.

## v81 — 2026-07-25

**The same mark, properly resolved.** The shield-and-check identity now uses smoother shield
curvature, a centered check, balanced negative space, and a restrained navy-to-gold finish
that stays clear at favicon and home-screen sizes. The canonical SVG is now the source for
all generated PWA icons, so the header mark and installed app icon cannot drift apart.

## v80 — 2026-07-25

**A real front door.** The root now opens a focused marketing page built around the actual
JobWarden interface: one clear promise, direct access to the app, a concise product story,
and an explicit local-only privacy model. The previous all-in-one marketing and install page
is now a dedicated install guide with permanent Safari and browser-menu instructions,
device-aware emphasis, and an honest reminder to export backups.

The new editorial direction uses a restrained navy, gold, and warm-paper system, with a
real app capture rather than an invented device mockup. Both pages remain static,
offline-cached, responsive, and free of third-party requests.

## v71 — 2026-07-25

**The operator is named.** JobWarden is made by **Kodaxa Innovations** ([kodaxa.dev](https://kodaxa.dev)),
an independent developer — not a company, not a law firm. Contact: **Justin@Kodaxa.dev**.

That fills the `[Operator: your legal name]` and `[contact email]` placeholders that both
policy pages had been carrying, and it closes one of the two launch blockers. The pages now
say who stands behind the app, that it is **not an incorporated company**, and — at the end
of each — that they have not yet been reviewed by a licensed attorney, with the address to
write to if something in them is wrong. The in-app Legal screen carries the same, because
someone who thinks the app got the law wrong should have somewhere to write before they
escalate.

A test now asserts both pages name the operator, give a working `mailto:`, carry no
placeholder, and never imply an LLC or corporation that does not exist.

**Still blocking public launch:** review of the findings language and UPL posture by a
licensed California employment attorney.

## Earlier builds

v68 and earlier are in [`docs/CHANGELOG-ARCHIVE.md`](docs/CHANGELOG-ARCHIVE.md). This file
stays under the 400-line cap in AGENTS.md by rolling old entries into that archive rather than
dropping them — a build id a user reads back to you has to resolve to something, however old.
