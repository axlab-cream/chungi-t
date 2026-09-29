# 이직운 무료 티저 공통 GNB 상단 복구 — 2026-09-29

## observation
운영 이직운 STEP4에서 공통 상단 호스트는 삭제되지 않았지만 개인화 티저 호스트 다음에 배치되었다. sticky 셸은 약 6,500px 본문 뒤에서 시작해 첫 화면에서 보이지 않았다.

## decision
`data-umsh-service-top`을 `umsh-preview-host`보다 먼저 렌더하고, HTML 순서를 검증하는 회귀 테스트를 추가했다.

## artifact
- commit: f75872a3
- production: dpl_6NWMgVRLPy9pWFmvgzZTWsH5QEjM
- CI: 36508514403

## QA result
focused 31/31, full 1624/1624, typecheck, Vercel build, CI PASS. 운영 DOM에서 GNB y=0/h=85, 티저 y=85, 로고·뒤로·메뉴 마운트를 확인했다.

## lesson
공통 GNB는 존재 여부뿐 아니라 동적 본문보다 앞서는 DOM 순서를 테스트해야 한다. sticky 요소가 긴 본문 뒤에 있으면 삭제되지 않았어도 사용자에게는 사라진 것처럼 보인다.

## relation
personal/carrotcap/notes/umsh-work-move-teaser-personalized-20260928.md

## next_patch
없음.
