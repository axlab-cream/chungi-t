배너 UI 디프를 읽기 전용으로 검토합니다. CSS·HTML·캐러셀 스크립트와 숨김 슬라이드 접근성을 대조하겠습니다.숨김 슬라이드 규칙과 기존 `[hidden]{display:none}` 충돌, 캐러셀 JS, 주간 카드 마크업을 대조합니다.캡션 고정 높이와 카피 오버플로를 계산하기 위해 포털 레이아웃·배너 카피 길이 제한을 확인합니다.# Review Report - BANNER-FIT-01 home consultation rail

## 1. Scope
- Task id: BANNER-FIT-01
- Reviewed files: `사주/css/consultation.css`; `사주/portal.html`; `사주/js/consultation-rail.js`; `사주/css/portal.css` (weekly-free caption/card, `.phone` width, `.section-block` padding); `src/consultation/settings.ts` (banner copy limits and defaults)
- Review time: 2026-10-02T01:26:14Z

## 2. Verdict
- Changes requested
- Summary: 숨김 슬라이드를 같은 grid cell에 올려 높이를 맞추는 방식과 `visibility:hidden` 조합은 맞다. 다만 캡션을 `56px`로 고정한 뒤 `overflow:hidden`을 걸어 좁은 폭에서 제목이 잘리고, overlay 카피에서 `-webkit-line-clamp`를 제거한 뒤 admin `bannerBody` 300자(기본 제목도 320px에서 2줄)를 aspect-ratio 박스에 그대로 넣는다. 기본 게시 카피·좁은 뷰포트 기준으로 수정이 필요하다.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`사주/css/consultation.css:19-24`] Issue: 슬라이드가 `display:grid; grid-template-rows:1fr 56px; overflow:hidden`이고 캡션은 `padding:12px 14px`(content 높이 약 31px)이다. `.weekly-free-caption>span`는 `white-space:nowrap` (`사주/css/portal.css:2036`)이라 제목만 줄바꿈한다. 320px 뷰포트에서 rail 너비는 `.phone` `min(430px,100%)` − `.section-block` padding 40px = 280px이다. `금사빠·금사식 테스트`(14px) + `무료로 해보기 ↗`(11px nowrap) + gap 8px + padding 28px가 한 줄을 넘기면 2줄 캡션은 약 64px가 되어 56px 행에서 잘린다. portal `max-width:360px` 캡션 패딩 완화(`portal.css:2039`)도 이 규칙이 덮어쓴다.
  - Risk: 홈 첫 배너(금사빠 카드) CTA/제목이 잘려 보인다. 두 슬라이드 높이는 같아도 캡션 가독성이 깨진다.
  - Recommendation: `grid-template-rows:1fr auto`로 캡션 높이를 내용에 맡기거나, `strong`에 `min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`을 걸어 한 줄을 보장한다. 320/360px에서 두 슬라이드 캡션이 모두 보이는지 확인한다.

- [`사주/css/consultation.css:25-31`] Issue: 기존 `.consultation-promo-copy strong, p`의 `-webkit-line-clamp:2`가 삭제됐다. 카피는 in-flow이고 visual은 `aspect-ratio:1200/630`, 슬라이드는 `overflow:hidden`이다. 기본 게시값 `bannerTitle: 천명과 나누는 사주 상담`, `bannerBody: 내 사주를 바탕으로, 지금 마음에 걸리는 이야기를 나눠 보세요.` (`src/consultation/settings.ts:25-26`)는 `word-break:keep-all` + `clamp(18px,5.5cqw,24px)`로 280px rail에서 제목 2줄·본문 3줄이 된다. padding 32px + small 14px + 제목 ≈61px + 본문 ≈51px ≈ 158px이고 visual 높이는 `280 * 630/1200 ≈ 147px`이다. `bannerTitle` 100자 / `bannerBody` 300자 (`settings.ts:30`)는 이 박스를 더 넘긴다. 같은 cell을 쓰므로 카피가 min-content로 커지면 주간 카드도 같이 늘어나고, 1fr이 aspect 높이에 묶이면 overlay가 잘린다.
  - Risk: API가 기본값만 내려도 320px에서 눈썹/마지막 줄이 잘리거나, 긴 관리자 카피에서 주간 카드가 세로로 과도하게 커진다. HTML 기본문안(`천명상담` + `<br />` 2줄)만 보면 통과하기 쉽다.
  - Recommendation: title/body에 다시 line-clamp(또는 max-height)를 두거나, `@container`로 padding/font를 줄여 280px rail에서 기본 게시 카피가 aspect 박스 안에 들어가게 한다. 검증은 HTML 기본문이 아니라 `/api/consultation/banner` 기본 설정 적용 후로 한다.

## 5. Minor Issues
- [`사주/portal.html:263`] Issue: overlay `data-consultation-title`만 API로 갱신되고, 하단 캡션 `천명상담`은 고정이다 (`사주/js/consultation-rail.js:41-42`).
  - Risk: 기본 설정이 켜지면 그림 안 제목과 캡션 제목이 달라진다.
  - Recommendation: 캡션 제목도 같은 노드에 묶거나, overlay 제목을 빼고 캡션만 남긴다.

- [`사주/css/consultation.css:4` + `:20`] Issue: `[hidden]`의 `display:none!important`를 슬라이드에서 `display:grid!important`로 덮고 `visibility:hidden; pointer-events:none`을 쓴다. specificity(0,3,0)가 line 4(0,2,0)보다 높아 높이 예약은 된다. `inert`/`aria-hidden`은 없다.
  - Risk: display를 덮은 `[hidden]`은 일부 AT에서 둘 다 읽힐 여지가 있다. `visibility:hidden`이 있으면 Chromium/Firefox에서는 보통 트리에서 빠진다.
  - Recommendation: 비활성 슬라이드에 `inert`를 함께 켜면 포커스·AT가 더 안정적이다. 현재 패턴만으로도 탭 순서는 대체로 막힌다.

## 6. Verification Gaps
- Gap: 이 리뷰는 브라우저에서 320/360/390px 실측을 하지 않았다. 카피 넘침이 clip인지 카드 높이 증가인지는 엔진의 grid + aspect-ratio min-content 처리에 달려 있다.
  - Suggested check: 홈 rail을 320·360·390px에서 열고, (1) 배너 API 실패(주간 카드만), (2) 기본 설정 enabled, (3) title 100자·body 300자. 각 경우 캡션 전체, overlay 눈썹/제목/본문, 두 슬라이드 높이, 숨김 슬라이드 포커스 여부를 확인한다.
- Gap: 캐러셀 컨트롤(`min-width:44px` × prev/next/pause, dots, `1 / 2`)의 줄바꿈은 320px에서 여유, 280px 이하에서 불확실하다.
  - Suggested check: 320px에서 컨트롤이 한 줄인지, pause 문구가 잘리는지 확인한다.
- Gap: 숨김 슬라이드 접근성 실측 없음.
  - Suggested check: 활성 슬라이드 `<a>`만 tab 순서에 있는지, 스크린 리더가 숨김 슬라이드 텍스트를 읽지 않는지 확인한다.

## 7. Final Recommendation
- Next action: 캡션 행을 `auto`(또는 한 줄 ellipsis)로 고치고, overlay 카피에 clamp/max-height 또는 좁은 container 타이포를 다시 넣는다. 그 다음 320px + 기본 `/api/consultation/banner` 카피로 잘림·높이·숨김 슬라이드 포커스를 확인한 뒤 재리뷰한다. 숨김 슬라이드의 grid 높이 예약 자체는 유지해도 된다.