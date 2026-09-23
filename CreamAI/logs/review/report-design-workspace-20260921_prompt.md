[FOCUS AREAS]
- `design-workspace/report-pages`가 운영 코드·API·인증·결제·분석·저장소와 실제로 격리되어 있는지
- 티저, 보관함 목록, 해석 상세가 현재 운영 화면의 핵심 구조를 충실히 재현하면서 편집하기 쉬운지
- 모바일 320px 이상과 데스크톱에서 깨질 가능성, 접근성, 상대 경로, 이미지 교체 안내
- `tests/unit/report-design-workspace.test.ts`의 회귀 방지 범위와 누락
- 기존의 무관한 변경은 리뷰 대상에서 제외

[FILES]
- docs/superpowers/plans/2026-09-21-report-design-workspace.md
- design-system/pages/report-design-workspace.md
- design-workspace/report-pages/**
- tests/unit/report-design-workspace.test.ts

[VERIFICATION ALREADY RUN]
- npx tsx --test tests/unit/report-design-workspace.test.ts
- npm run typecheck
- git diff --check
- 브라우저에서 index.html, teaser.html, reading-list.html, reading-detail.html 및 편집 가이드 토글 시각 확인

[DELIVERABLE]
심각도 순으로 구체적인 문제만 보고하고, 문제가 없으면 승인으로 명시한다. 운영 배포나 커밋은 하지 않는다.
