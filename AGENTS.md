# Project Instructions

## File Size

- Authored source, documentation, and test files stay under 400 lines.
- Generated dependency lockfiles are exempt. `package-lock.json` is allowed to exceed 400 lines because it is machine-generated npm metadata and keeps installs reproducible.
- If another generated file must exceed 400 lines, document the reason here before accepting it.

## Architecture

- Keep one responsibility per file.
- Prefer small domain modules, UI modules, and tests that are easy to audit independently.
- Do not hide legal or compliance uncertainty behind vague copy. Mark unknown operator, contact, state coverage, and attorney-review status plainly.

## Verification

- Run `npm test`, `npm run lint`, and `npm run typecheck` before calling code changes done.
- After changing cached app assets, bump `CACHE` in `service-worker.js`.
