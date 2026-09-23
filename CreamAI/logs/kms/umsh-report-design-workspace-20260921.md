# 운명상회 해석 화면 디자인 작업실

## observation

- 운영 보관함의 구매한 운은 공통 카드, 진행률, 상태 레일을 사용한다.
- 해석 상세는 대표 이미지와 제목, 진행률, 결론, 한눈에 보기, 접이식 항목, 현실 행동, 주의 범위 순서다.
- 디자인 검토 단계에서 운영 API를 그대로 복제하면 회원·리포트 데이터와 연결될 위험이 있다.

## decision

- `design-workspace/report-pages` 아래 정적 HTML 세 장과 허브를 만들었다.
- 실제 보관함과 이직운 상세의 화면 골격만 비식별 복제하고 개인 입력값과 리포트 식별자는 저장하지 않았다.
- 공통 토큰, 컴포넌트, 페이지 CSS, 이미지 복사본을 분리했다.
- 각 화면에 `DESIGN SANDBOX`, 예시 데이터, 편집 가이드, 이미지 교체 파일명을 표시했다.

## artifact

- `design-workspace/report-pages/index.html`
- `design-workspace/report-pages/teaser.html`
- `design-workspace/report-pages/reading-list.html`
- `design-workspace/report-pages/reading-detail.html`
- `design-workspace/report-pages/README.md`
- `design-system/pages/report-design-workspace.md`
- `tests/unit/report-design-workspace.test.ts`

## QA result

- 격리·파일·경로 단위 테스트: 5/5 PASS
- TypeScript typecheck: PASS
- whitespace 검사: PASS
- 데스크톱 브라우저에서 허브와 세 화면, 편집 가이드 토글 시각 확인: PASS
- 독립 리뷰: Approved with comments. 티저 가이드 겹침은 수정했고 경로 검사를 강화했다.
- 운영 반영, 커밋, 배포: 수행하지 않음

## lesson

- 운영 화면을 디자인용으로 분리할 때는 화면 HTML만 복사하지 말고 API·인증·분석·저장소 호출 금지와 폴더 밖 자원 참조 금지를 자동 검사해야 한다.
- 이미지 파일명을 화면에 직접 보여주면 비개발자도 같은 이름으로 교체해 빠르게 검토할 수 있다.
- 실제 리포트 내용은 비식별·축약하고 구조만 보존해야 디자인 검토와 개인정보 보호를 함께 만족한다.

## relation

- 기존 디자인 폴더·갤러리 패턴 기록
- AIOS small-slice workflow

## next_patch

- 사용자가 디자인·이미지 수정을 마친 뒤 명시적으로 적용을 요청하면 운영 템플릿별 차이를 다시 비교하고 별도 이슈로 반영·검증한다.
