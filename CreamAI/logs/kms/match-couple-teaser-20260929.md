# 커플궁합 무료 티저 실제 데이터 패턴 (2026-09-29)

## observation

- 커플궁합은 공통 실제 본문 티저와 서비스별 5회 조회 대상에서 빠져 있었다.
- 입력 화면은 브라우저 캐시만 만들고 실제 리포트 생성과 03 준비 화면을 거치지 않았다.
- 직접 `reportId`로 04를 열 때 정적 요약을 사용했고, 공통 GNB는 런타임 마운트 과정에서 티저 아래로 이동했다.

## decision

- 로그인 회원의 저장 사주 또는 직접 선택한 새 사주, 상대 사주, 관계 단계, 현재 온도, 반복 갈등, 직접 고민을 서버 리포트 문맥의 정본으로 삼는다.
- 무료 공개는 실제 1·2번만 허용하고 03번 이후 실제 TOC는 기본 닫힘의 잠금 목록으로 표시한다.
- 권한은 `entitled`와 `unlockReason`을 정본으로 삼아 미결제자는 결제, 구매·관리자 권한은 05 목차로 보낸다.
- 공통 chrome 마운트가 끝난 뒤 상단 GNB 호스트를 화면 루트의 첫 요소로 복구한다.

## artifact

- 구현 커밋: `4cef6a2b`
- GNB 런타임 보정 커밋: `c459e9d0`
- Production: `dpl_9hYdPmV8fMVTKs2V9VdumgwqoJNf`
- CI: `36513425518`

## QA result

- 전체 회귀 1,630/1,630 PASS.
- TypeScript, JavaScript 구문, 커플 계약 20개·페이지 6개·대분류 14개, 20개 서비스 계약·QA, Vercel production build, diff 검사 PASS.
- 운영 STEP2에서 저장 사주와 상대·관계 입력, 공통 상·하단 내비게이션을 확인했다.
- 운영 STEP4에서 GNB가 티저보다 먼저 배치되는 DOM 순서를 확인했다.
- 운영 관리자에서 기존 커플궁합 리포트와 실제 두 사람의 사주·관계 입력에 연결된 전체 28개 해석 저장 이력을 확인했다. 새 가상 운영 데이터는 만들지 않았다.

## lesson

- 공용 렌더러 로드 여부만 검사하지 않고 서버 rich-teaser 분기, 실제 TOC, 조회 quota namespace, 04/05/06 권한 차이와 런타임 DOM 순서를 함께 계약으로 고정한다.
- 새 사주는 계정 프로필을 덮지 않고 입력 자체를 report identity에 포함해야 결제 후 별도 보관함 리포트로 유지된다.

## relation

- `personal/carrotcap/notes/umsh-money-save-teaser-real-first-two-20260928.md`
- `personal/carrotcap/notes/umsh-work-move-teaser-personalized-20260928.md`
- `personal/carrotcap/notes/umsh-standard-funnel-and-admin-audit-20260928.md`
