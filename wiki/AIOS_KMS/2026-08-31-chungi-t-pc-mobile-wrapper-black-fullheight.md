# 2026-08-31 Chungi-T PC Mobile Wrapper Full-Height Fix

## Context
- Desktop browser view had a light gray outer background.
- The mobile web frame was vertically centered with desktop padding and a 900px height cap.
- This made the approved mobile web experience look like it was blocked at the top and bottom.

## Fix
- Changed desktop outer page background to black.
- Removed the 24px desktop top/bottom padding.
- Removed the 920px/900px height cap from the mobile wrapper.
- Kept the mobile web width at `min(100vw, 440px)`.
- Made desktop wrapper use full viewport height with `100svh`.
- Removed desktop-only rounded frame and shadow so the mobile web appears as the actual page, not a device mockup.
- Applied the same wrapper rule to both the saju input page and chat page stylesheet.

## Verification
- `npm run typecheck` passed.
- `npm test` passed: 46 tests.
- Local desktop browser check confirmed:
  - body background `rgb(0, 0, 0)`
  - body padding top/bottom `0px`
  - phone top `0`
  - phone bottom `0`
  - phone width `440px`
  - phone height equals viewport height
  - desktop frame radius `0px`
  - desktop box shadow `none`
