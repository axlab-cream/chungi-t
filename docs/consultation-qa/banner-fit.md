# BANNER-FIT-01 — 홈 롤링 배너 크기·문구 수정
- 원인: 테스트 배너는 이미지+캡션, 상담 배너는 이미지 비율 단일 카드로 구성되어 높이가 달랐다. 상담 문구 absolute 중앙 배치, 모바일29px 및2줄 clamp가 제목/설명을 잘랐다.
- 수정: 동일 grid cell의 두 카드가 최대 높이를 공유; 이미지1200:630 + 하단56px 캡션. 비활성 카드는 visibility:hidden으로 공간만 유지하며 클릭/보조기술 노출을 막는다. 문구는 정상 흐름, 컨테이너 기준18~24px 제목, 강제 말줄임 제거. 운영 발행 문구와 이미지는 보존.
- 검증: 실제 운영 banner API를 읽는 로컬 정적 프리뷰. Codex browser 320/375/430/768/1024/1440 모두 두 카드 동일 높이, 문구 내부 포함. 320px203.94px,375px232.81px,430px 이상261.69px. 1/2 전환 시각 확인. 기존 관련18/18, build/typecheck/SEO PASS.
- 키 설정 및 DB 마이그레이션과 독립된 UI 변경. DB 변경 없음.

## Review feedback / final correction
Grok requested changes: fixed caption height and long admin copy. Caption is now automatic with64px minimum; long visual copy uses a minimum1200:630 height, not a forced ratio, so text expands both cards equally. At320px maximum100-char title/300-char body test: both592.21875px, copy526.21875px fully inside visual526.21875px. Fixture is local-only. Default published copy passes all six widths:211.94/240.81/269.69px. Added inert and aria-hidden to inactive slide; actual DOM verified. Fixed caption names the service, while overlay is its editable marketing headline; intentionally distinct roles. Clamping was not restored because user requested complete text. Reviewer findings were addressed and manually rechecked via browser measurements; no claim of a second external review.

## Final production verification — 2026-10-02
- Runtime commit: d7a0d72c; production deployment dpl_HReMcZKMNVJBavFGeuwAAw8NeYDU (https://chungi-donx4slc8-ax-lab-cream.vercel.app), promoted to https://umsh.kr.
- Downloaded production CSS SHA256 matches tested source. Final browser DOM: both cards 390 x 269.6875px; complete published title/body visible. Screenshot: banner-production-final.png.
- Final relevant tests18/18 and build/typecheck/SEO PASS. Six widths320/375/430/768/1024/1440 and maximum admin copy verified locally; review findings corrected. No DB changes.
