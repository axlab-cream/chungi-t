# 저축운 저장 리포트 이미지·가독성 보강 — 2026-09-23

## observation

- `money_save`에는 실제 8개 대분류·16개 목차가 있지만 `sectionImageMode: summary-only`와 런타임 예외가 모든 토글 이미지를 막고 있었다.
- 상세 화면은 밝은 종이 배경인데 공용 다크 리더의 폴백 색이 섞여 보조문·표·그래프 축 대비가 불안정했고, 공용 저장 리포트 뒤에 구형 단일 상세와 이전·다음·PDF UI가 중복될 수 있었다.

## decision

- 저장 원문·회원별 계산값·서비스 목차 순서를 보존한다.
- 메인 재물 썸네일의 초록 머리 고양이 귀 안내자와 에메랄드·금색 수채화 웹툰 톤을 유지한 3:2 이미지 한 장을 각 목차에 연결한다.
- 표와 대운 그래프는 공용 렌더러가 실제 데이터가 있을 때만 표시하는 기존 조건을 유지하고, 임의 점수나 그래프를 추가하지 않는다.
- 밝은 테마 전용 텍스트·표·그래프 색 토큰을 상세 페이지에서 좁게 덮어쓰고, 공용 리더가 채워진 뒤에만 구형 UI를 숨긴다.

## artifact

- `사주/data/longform-blocks.json`
- `사주/js/umsh-report-access.js`
- `사주/money/save/06-step-6_1-report-detail/index.html`
- `사주/money/save/assets/save/reading-v2/*.webp` 16개
- `tests/unit/all-service-reading-template.test.ts`

## QA result

- 생성 이미지: 16/16, 1536×1024, SHA-256 고유 해시 16개
- 전체 단위 테스트: 1,554/1,554 PASS
- `npm run check:save`: PASS
- `npm run typecheck`: PASS
- `npm run qa:all-services`: 20/20 PASS
- `npm run vercel-build`: PASS
- `git diff --check`: PASS
- 로컬 브라우저 비로그인 잠금 상태: PASS. 운영 저장 원문은 로그인 권한 없이 재조회하지 않았다.

## lesson

- 밝은 서비스 상세에 공용 리더를 삽입할 때는 `--text`, `--muted`, `--panel`, 표 머리글과 SVG 축 색을 페이지 테마에서 명시해야 다크 폴백이 섞이지 않는다.
- 서비스별 목차 수와 `sectionImages` 길이를 테스트로 묶어야 새 목차 추가 시 이미지 순서가 조용히 어긋나는 문제를 막을 수 있다.

## relation

- `personal/carrotcap/notes/umsh-markdown-view-20260923.md`
- `personal/carrotcap/notes/umsh-all-service-reading-template-20260922.md`

## next_patch

- 운영 반영 후 로그인된 저장 리포트에서 16개 토글 이미지, 실제 표·대운 그래프, 공유/PDF, 마지막 토글까지의 모바일 스크롤을 확인한다.
