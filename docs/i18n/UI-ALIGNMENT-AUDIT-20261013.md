# EN/JA UI alignment audit, 2026-10-13

## Approved slice

Review all existing EN/JA customer screen families for price/button baselines, natural heading/description wrapping, readable cards, and retired KRW/reference display copy. Preserve Korean pages, customer quotations/stored report prose, calculation inputs/enums, product amounts/rates, payment and authorization behavior. No live API, DB, model, purchase or schema operations. Ship only verified display changes on the latest main.

## Audience, purpose and success

English- and Japanese-speaking customers must read the existing question-led shop without clipped text, concatenated English words, or mixed currency labels. Preserve the existing dark/gold and service-specific palettes, imagery, hierarchy and transitions rather than redesigning the shop. Fixed price rates and WON billing are unchanged; customer-facing product labels show a bare amount plus USD/JPY.

## Inventory and baseline

- 106 HTML files per language, exact path parity; total 212.
- 14 redirects per language and 92 substantive documents per language; total 184 initial documents.
- Families: portal, search, about/community/policies/support, FAQ hub + 11 categories, 14 five-step funnels, CMDG, 4 combined applications, daily free reading and chat.
- Actual served middleware used in a local server. API requests return a deterministic offline error; external script/connection requests are blocked. No fabricated customer result is used as release evidence.
- 320/390/1440-width iframe baseline: 552 checks; 55 cases with geometry warnings, concentrated in 31 Japanese document paths. Six chat checks navigated away under the unauthenticated/offline gate and are not passed checks.
- Frame rendering is not native-device or authenticated/customer-data E2E verification. The initial resource detector incorrectly accepted an empty failed stylesheet; separately confirmed actual HTTP 404 and an unstyled wedding screenshot. Resource success must use HTTP status and original-source parity, not stylesheet-object existence.

## Implementation plan

1. RED regressions for numeric won/ウォン display, known JS-repainted price CTA selectors, protected quotes/report facts and unchanged machine/payment data.
2. Restore three CSS files as six byte-identical locale-only copies; never rebase CSS through paused KO service routes. Rebase known customer binary visual subtrees and redirect missing localized neutral font/media requests to same-origin already-public static paths. Existing locale binaries win. No HTML/JS/JSON/CSS/private/API fallback, filesystem mount or service-gate change.
3. Locale-only typography: ordinary Japanese breaking with strict punctuation and safe word wrapping; min-width for flexible text/controls. Scope price no-wrap to actual numeric values and keep descriptive rows wrapping.
4. Fix proven missing spaces at EN inline emphasis boundaries without rewriting the underlying interpretation/copy.
5. Rerender the complete initial matrix after fixes; inspect suspected image-copy overlays after real assets load. Keep full-size image aspect ratios and gradient contacts.
6. Focused + existing regressions, typecheck, production preparation, independent review, latest-main preservation, scoped normal push, deployment and live static/source/DOM verification.

## Known boundaries / deferred functional findings

- Eleven step-05 aliases per language target absent sibling chat documents. Record separately rather than redirecting them to an unrelated chat UI without preserving service/report/authorization semantics.
- Customer routes such as account/payment/refund management have no corresponding locale HTML templates; their authenticated contents and foreign-currency settlement are not verified by this display slice.
- Saved/purchased report text, populated chat, API-backed catalog results and real mobile-device E2E require a separate safe fixture/customer-data gate.
- Project design skill registries and imported sources are absent from this deploy worktree. Read available project workflow/router and use existing design plus native browser measurements; unavailable Grok runner remains substituted by read-only independent code review.

## Evidence

Local raw screenshots, matrix JSON and offline server are retained only under the session temporary directory, not deployed. Independent source audits cover inventory, price producers and wrapping boundaries. Final verified results are append-only in status.md.

## Verified implementation and final gate

- Quote-aware visible HTML parser protects script/style/comments, readonly quotation/template/report-body/editable data and machine attributes. Unquoted display values serialize safely; encoded URL pathnames are retained.
- Normalize actual root language even with extra/boolean attributes. Sixty-six substantive roots had the old exact-tag matcher miss.
- Preserve saved financial summaries: save state body is never a dynamic price scope. Only its fixed pricing guidance line and route-owned purchase CTA labels change. CMDG scope is purchase/paymentReady scene data-step, not report finance rows.
- Sixteen EN emphasis boundaries gain spaces only. Scoped shell labels/ARIA translate exact owned leaves.
- Actual main/app/policy/phone wrappers receive locale-only wrapping. Four narrow form/teaser grids use safe min-content tracks; one EN quit grid overlay gets <=360px padding only, with image files/size/aspect/cover/gradient unchanged.
- 130 related tests, production static preparation and typecheck verified before latest-main integration. Independent source review found four P2 problems; all were resolved and rereviewed PASS. Final post-integration evidence is recorded in status.md.
- Five representative original static images/video/font URLs returned live HTTP200 with correct content types and no redirect. This is asset connectivity, not a complete image-pixel language audit.
- Final matrix uses 320/390/430/768/1440 widths and the actual document client width, including scrollbar space; 920 initial conditions. No fabricated customer financial result is release evidence.

Additional functional issues discovered but not activated by this display slice: missing locale newyear assets/app.js, signal-video.js, couple 06-detail-data.js and job-choice shared/job-choice-data.js (both languages), plus locale manifest.json. Shared-code fallback could change API/report/paused-service behavior and is intentionally not added. These and missing step05 aliases remain [blocked] pending service/authorization-safe functional localization.
