# JobWarden Evidence Trail Design

## Goal

Turn JobWarden into a polished, full-product Field Log PWA that feels rugged,
fast, and trustworthy. The selected direction is Evidence Trail: the main Log
screen reads like a simple path from "what happened" to "save proof."

The app must stay usable by a stressed or low-literacy employee. Primary labels
use plain verbs, short words, and obvious next steps. Legal nuance stays in
helper text and export notes, not in the main capture path.

## Non-Goals

- No cloud sync, accounts, analytics, or server storage.
- No audio recording.
- No legal verdict language such as "violation proved."
- No full framework rewrite.
- No desktop-only dashboard that weakens the phone-first capture flow.

## Product Principles

- Phone-first, thumb-friendly, and fast.
- "Saved on this phone" must be visible and reassuring.
- Every screen should say what to do next.
- Evidence capture should feel factual, not accusatory.
- Use icons to aid scanning, but text must still explain the action.
- Avoid decorative effects that compete with record keeping.

## Visual Direction

Evidence Trail uses a deep ink background, blackened slate surfaces, off-white
text, muted amber incident accents, steel blue action accents, and green saved
signals. The interface should feel like a premium field report tool.

Use a vertical trail on the Log screen with large steps:

1. Pick what happened
2. Add work times
3. Add lunch breaks
4. Add unpaid work
5. Add proof
6. Tell what happened

Each step has an icon, completion state, short helper copy, and an obvious input
or action. The Save Record button stays easy to reach.

## Plain Language Rules

Use these labels in primary UI:

- "Pick what happened" instead of "Infraction type"
- "Add work times" instead of "Clock data"
- "Did you skip lunch by choice?" instead of "Waiver"
- "Add unpaid work" instead of "Off-the-clock work details"
- "Add proof" instead of "Evidence attachments"
- "Tell what happened" instead of "Narrative"
- "Saved on this phone" instead of "Local-only IndexedDB"

Keep legal references in helper text, record details, and exports.

## Information Architecture

The existing four tabs stay:

- Log: evidence-trail capture flow
- Records: readable list with findings, proof, edit history, deleted records
- Export: backup, spreadsheet, and printable report actions
- Settings: profile, pay type, workplaces, persistent storage

The app should not add new routes. It should improve the existing screens and
states.

## Screen Design

### Log

The Log tab becomes a trail-style capture screen. The top summary shows the date,
privacy state, and backup status. The issue picker becomes large and grouped by
plain categories: lunch, rest, unpaid work, and reported it.

Conditional fields stay functional, but the layout shows them as trail steps
instead of unrelated cards. Steps with no needed fields can collapse to a short
"Nothing needed here" or stay hidden.

### Records

Records become a compact case log. Each row shows date, place, issue chips,
plain-language findings, proof count, and saved time. Expanding a row shows facts
in simple rows, proof thumbnails, map link, edit history, and action buttons.

Deleted records remain recoverable and visually quieter.

### Export

Export becomes a three-action utility screen:

- Save full backup
- Make spreadsheet
- Make printable report

Each action explains what the file is for in one short sentence. The backup
reminder should feel urgent but not alarming.

### Settings

Settings become a calm setup screen with plain grouping:

- About you
- Workplaces
- Data safety

The exempt-pay warning stays, but it should read as a simple caution.

## Components

Add or refine these modular UI pieces:

- App shell/header
- Bottom tabs with real icons
- Trail step
- Issue button
- Status badge
- Field row
- Action button
- Record row
- Empty state
- Banner
- Dialog

Small dependencies are allowed if they improve quality. Preferred dependency:
an icon package such as Lucide. Avoid a UI framework takeover.

## Accessibility

- Minimum touch target: 48px.
- Text must not overflow controls.
- Focus states must be clear.
- Color must not be the only state indicator.
- Use simple labels and helper text for screen readers.
- Avoid tiny explanatory copy on primary tasks.

## Data And Behavior

The redesign should preserve current data shape and behavior:

- IndexedDB remains the only storage.
- Existing create/edit/delete/restore behavior stays intact.
- Existing analysis flags remain factual and caveated.
- Export behavior stays the same.
- Legacy record hydration stays in place.

Visual polish must not weaken legal/evidence integrity.

## Error Handling

- Storage errors show plain toasts.
- Location denial says "Location not added" and does not block saving.
- Backup/export with no records says "No records yet."
- Save validation says the next specific action, such as "Pick what happened."

## Testing And Verification

Run the existing Node test suite. Add focused tests only if behavior changes.

Browser verification must cover:

- Mobile Log flow with several issue types selected
- Records empty and populated states
- Export actions visible and readable
- Settings warning state
- Bottom navigation on mobile and desktop
- Console has no errors
- Text does not overlap at mobile width

## Implementation Decisions

- Use a small Lucide icon dependency or locally bundled Lucide icons. Do not use
  emoji for primary navigation or action controls.
- Keep the current system font stack for speed, offline reliability, and
  readability.
- Keep CSS modular and under the 400-line file cap. Split CSS by concern if the
  current stylesheet would exceed the cap.
