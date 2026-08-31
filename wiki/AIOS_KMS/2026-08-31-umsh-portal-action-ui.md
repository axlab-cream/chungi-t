# UMSH 포탈 액션 UI 인터렉션 추가

- 날짜: 2026-08-31
- 프로젝트: chungi-t / UMSH 운명상회 포탈
- 유형: Improvement / UX readability

## 배경

포탈 첫 화면에서 상품 카드, 카테고리 필터, 상단 액션 버튼의 상호작용 신호가 약해 사용자가 무엇을 누를 수 있는지 즉시 파악하기 어려웠다.

## 적용

- 상단 액션 아이콘을 실제 버튼으로 전환하고 빠른 메뉴를 추가했다.
- 카드, 칩, 하단 내비게이션, 가격표에 hover/focus/press 상태를 추가했다.
- 클릭 시 `click-spark` 피드백과 상품별 토스트 문구를 표시한다.
- 카테고리 필터 후 첫 결과로 자동 스크롤하고 빈 섹션은 숨긴다.
- 포스터 레일 드래그는 임계값을 넘은 뒤에만 포인터 캡처를 적용해 카드 클릭과 드래그가 충돌하지 않도록 했다.
- `prefers-reduced-motion` 환경에서는 애니메이션을 최소화한다.
- 테스트 실행 시 로컬 `.env`의 Supabase 설정이 리포트 저장 테스트를 오염시키지 않도록 test mode에서는 dotenv 로드를 건너뛰게 했다.

## 검증

- `node --check 사주/js/portal.js`
- `npm run typecheck`
- `npm test`
- `npm run vercel-build`
- Headless Chrome CDP 검증: 페이지 로드, hover 상태, 메뉴 열기, 연애 필터, 준비중 카드 클릭 토스트, 콘솔 오류 없음 확인

## 재사용 포인트

가로 카드 레일에서 드래그와 클릭을 함께 지원할 때는 `pointerdown` 즉시 `setPointerCapture`를 호출하지 않는다. 드래그 임계값을 넘은 순간에만 캡처해야 내부 버튼이나 링크의 일반 클릭이 안정적으로 동작한다.
