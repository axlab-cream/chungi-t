# Localized display maintenance

## Scope

Maintain the existing Fate Shop / 運命商会 customer UI. This is an alignment and wrapping repair, not a new visual direction. English/Japanese pages only; Korean source and functional/customer state unchanged. Detailed slice: docs/i18n/UI-ALIGNMENT-AUDIT-20261013.md.

## Existing tokens, retained

Shop: background #080807 / #0c0b0a, panel #171510, gold #c5a152 / #d8ba72, text #f7f2e9, muted #a39a8c. Each product's existing daylight, teal, paper or indigo palette takes precedence. Do not recolor product screens.

## Typography

Keep current brand/display/UI font roles. Product amount and adjacent CTA text use the same first baseline; amounts remain one unit. Descriptive labels may wrap. Japanese prose uses normal Japanese line breaking with strict punctuation rather than Korean keep-all; long English words get an emergency wrap, not arbitrary hard segmentation. No blanket no-wrap on descriptive values, no joined emphasis boundaries.

## Layout and visual signature

Keep the centered existing phone/store frame, question-led cards, gold detailing, original scene ordering and service-specific full-size images. Preserve intrinsic image aspect ratios, image files and separate gradient-overlay contacts. Long copy must grow/wrap rather than clip or spill into adjacent content. Flex/grid text can shrink to the available width; controls stay within their containing field.

## Anti-patterns and acceptance

No shared Korean CSS changes, forced image cropping, broad content rewrites, opaque currency suffixes, pricing-rate/payment changes, fake customer results or disabled failing tests. Verify desktop/mobile iframe widths, price line/baseline and clipping with real DOM geometry, asset HTTP status/source parity and screenshots. Authentication/payment/customer-report/native-device coverage must be stated separately.
