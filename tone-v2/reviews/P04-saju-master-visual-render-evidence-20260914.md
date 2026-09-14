# P04 saju_master visual/render review — 2026-09-14

## Decision

APPROVED for the isolated `saju_master` 2.1.0 candidate visual-evidence slice. The complete 20-service release remains `NO_GO`.

## Reviewed surfaces

- Actual shared saved-result reader with one immutable 37/37 synthetic record
- Generic `/r/{resultId}` permalink
- Direct final-section route
- Keyboard disclosure close/reopen and focus indicator
- Desktop and exact 390px mobile render
- Complete print render and representative first/middle/final pages

## Finding resolved

- Major: the generic permalink had no route-derived service key, while boot required a key. A valid result therefore remained on the loading shell. The reader now derives only the immutable locator from the path, authenticates, and trusts the authorized response for the service identity. A functional unit test and browser verification cover the path.

## Final findings

- Critical: 0
- Major: 0
- Minor: 0
- Editorial comments: 0

## Evidence boundary

Tracked evidence contains only hashes, counts, dimensions and outcomes. Screenshots, printable model prose, credentials, customer data and production records are excluded.
