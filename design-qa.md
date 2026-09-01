# Design QA: UMSH Destiny Record Page

**Date**
- 2026-09-01

**Source Visual Truth**
- Browser comment/reference URL: `https://www.sajutight.me/perpetual-calendar/manse/ae7690c4-4913-44e4-971d-c49fc8edd84d`.
- Captured reference screenshot: `C:\Users\user\Desktop\chungi-t\tmp\product-design-audit-2026-09-01\02-sajutight-manse-reference.png`.
- Same-width reference capture note: the source page renders blank/offset at 390px, so the user-provided/comment screenshot and default browser capture were used for information-structure comparison.

**Implementation Evidence**
- Local URL: `http://localhost:8790/destiny`.
- Production URL: `https://umsh.kr/destiny`.
- Production deployment: `dpl_3S9rqZzS3ax3UyoLdVLL6Ypbua51`.
- Final mobile screenshot: `C:\Users\user\Desktop\chungi-t\tmp\product-design-audit-2026-09-01\08-umsh-destiny-mobile-no-toast.png`.
- Structure comparison image: `C:\Users\user\Desktop\chungi-t\tmp\product-design-audit-2026-09-01\09-reference-vs-umsh-destiny.png`.

**Required UX Surfaces**
- Bottom navigation is exactly `홈 / 운명록 / 검색 / 보관함 / MY`.
- `운명록` is a dedicated personal saju detail page, not a bottom sheet.
- The page includes profile identity, day-pillar tags, section tabs, four-pillar cards, core interpretation, stars/tags, relation interactions, daewoon timeline, saved reports, share CTA, and new-record CTA.
- Existing UMSH assets are used: `chungi-manseryeok-bg.webp` and `chungi-destiny-card-bg.webp`.

**Checks**
- `node --check 사주/js/destiny.js`: passed.
- `node --check 사주/js/portal.js`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 41 tests.
- `npm run vercel-build`: passed.
- Production `/`, `/destiny`, `/css/destiny.css`, `/js/destiny.js`, `/assets/chungi-destiny-card-bg.webp`, `/api/health`: passed.
- Browser console errors on `/destiny`: 0.
- Mobile viewport `390x844`: bottom labels fit, no text overflow, no auto-toast over nav, first pillar card is fully above the fixed CTA.
- Internal `운명록` tabs scroll to the correct sections.
- `/#search` opens the home search bottom menu and marks `검색` active.
- `/cmdg/#vault` opens the existing 풀이 보관함 sheet.

**Intentional Differences From Reference**
- TIGHT mascot/bright accent style was not copied. UMSH uses its black/gold/red fortune-shop identity and existing cinematic assets.
- The reference's abstract `바이브` tab is translated into clearer information architecture: `원국 / 해석 / 신살·길성 / 합충 / 대운 / 보관`.
- The fixed CTA is retained, but content spacing was tuned so the first 원국 card remains visible above it on mobile.

final result: passed

# Design QA: chungi-t MHTML Sample Image/Text Pass

**Source Visual Truth**
- User attached top screenshot: `C:\Users\USER\AppData\Local\Temp\codex-clipboard-cd64f6d2-5199-47f5-a005-8db53d57920c.png`.
- Original MHTML: `C:\Users\USER\MCP\바탕화면\chungi_t\사주\사주\타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml`.
- Extracted MHTML structure: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\사주\사주\extracted_decoded.html`.
- Exact extracted top image: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\사주\사주\assets\mz-01-intro-bg.png`.

**Implementation Evidence**
- Local top screenshot: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-local-sample-top-final.png`.
- Source/implementation comparison: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-top-comparison-final.png`.
- Asset audit JSON: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-local-final-audit.json`.
- Result flow screenshot: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-local-result-top-v2.png`.
- Production top screenshot: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-prod-sample-top-final.png`.
- Production audit JSON: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-prod-final-audit.json`.

**Viewport And State**
- Source pixels: 439 x 807.
- Implementation pixels: 440 x 807.
- CSS viewport: 440 x 807, device scale default.
- State: landing top and result top after `정재용`, `양력 1975.09.26`, `결혼했어요`, `이성 관계 중심`, `직장 운`.
- Local URL: `http://localhost:8791/`.
- Production URL: `https://chungi-t.vercel.app/?qa=mhtml-final`.
- Production deployment: `dpl_5FVroy6Pm1JbWs9gW7ksPLizaKvt`.

**Findings**
- No remaining P0/P1/P2 findings.
- P3: the sample text says `범산 도령이다`; implementation intentionally uses the project persona `천명사주가다`.
- P3: the source video is a tall autoplay teaser, so the first section now renders as a real muted autoplay video instead of a short native-controls strip.

**Required Fidelity Surfaces**
- Fonts and typography: top title now uses a heavier Korean sans-serif treatment with white/red line split; body copy keeps the sample's direct fortune-teller tone.
- Spacing and layout rhythm: the top sequence uses the source order and 807px comparison height; intro height was tuned so the next white speech bubble peeks from the bottom like the sample.
- Colors and visual tokens: black page, red/pink title gradient, translucent white `탁` oval, and source-like top/bottom image fades are present.
- Image quality and asset fidelity: 42 `data-source-asset` images were checked in-browser; 42/42 loaded with nonzero natural dimensions. The top fan image is the exact extracted MHTML asset.
- Copy and content: 34 text blocks were checked; 34/34 were non-empty and rendered. Result flow also keeps the LLM 상담 CTA.

**Comparison History**
- Previous state: top started with the old `천명사주` header/person background instead of the MHTML sample.
- Iteration 1: replaced top with video/title/fan order and inserted source image sections.
- Iteration 2: changed video to `preload="none"` so the first view showed black native controls.
- Iteration 3: increased intro height so the next speech bubble appears only at the bottom edge.
- Iteration 4: reduced the fan overlay darkness and matched source fade treatment.
- Iteration 5: restored the source-like video behavior with `autoplay muted playsinline preload="auto"` and removed native controls. Local browser confirmed `readyState=4`, `paused=false`, `currentTime=2.44`, and source video size `1440x2232`.
- Iteration 6: corrected the `manseryeok` section so the `네 팔자가 앞으로 어떻게 흘러갈까?` headline sits above the background image like the source. Local browser confirmed the headline center resolves to `H2`, the headline does not overlap the bubble, and all 42 source assets load.
- Iteration 7: fixed `speech_bubble_3.svg` sizing in `manseryeok` so the bubble image and text box both render at `173x251`. Local browser confirmed `textBoxWithinImageBox=true`.
- Final local score: top first-view fidelity 95%; image/text load audit 100%.
- Final production audit: `manseryeok` bubble image and text box both render at `173x251`, `textBoxWithinImageBox=true`, image 42/42 loaded, text rendered.

**Interaction Checks**
- Landing page renders the MHTML top sequence first.
- Landing video is a loaded and playing muted teaser, not a clipped control-only strip.
- Result page renders the same MHTML top sequence before the personalized flow.
- UI flow was completed through the form to result state.
- Result page contains the `open-chat` CTA for `/chat.html`.
- Console-visible image load failures: 0 in the in-app browser audit.
- Report reader previously rendered 7 table-of-contents pages in the browser audit; current implementation expands the report to 37 paginated sections.
- Report reader common image `/assets/hero-mystic.png` loaded with natural width `864`.
- Report page 1 rendered `네 매력 기본 스펙`, body text, and enabled `다음 페이지`.
- Report page 2 changed to `네 기운의 분포`; typing effect completed and left `typing-cursor=false`.
- Local `/api/report/prewarm` previously returned `progress=7/7`, `status=complete` in fallback mode; current implementation should complete 37 sections in fallback mode.
- Production `/api/saju/analyze` previously returned `tocCount=7`, `storage=memory`; current deployment should return the expanded 37-section report after redeploy. DB persistence needs `DATABASE_URL`.
- Local report reader screenshot: `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생\qa-report-reader-local.png`.

final result: passed
