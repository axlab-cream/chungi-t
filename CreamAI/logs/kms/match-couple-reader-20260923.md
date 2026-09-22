# 커플궁합 저장 리포트 이미지·가독성 보강

## Observation

- `match_couple`은 실제 28개 목차를 갖지만 `summary-only` 이미지 모드여서 저장 해석 카드에는 목차별 이미지가 없었다.
- 저장 리포트가 공용 리더로 채워진 뒤에도 구형 목차·단일 상세 화면이 뒤에 남을 수 있었다.
- 운영 링크는 비로그인 브라우저 세션에서 소유권 확인을 통과하지 않아 고객 원문을 읽지 않았으며, 저장 데이터는 추정하거나 수정하지 않았다.

## Decision

- 대표 썸네일과 하이라이트는 기존 커플궁합 정체성을 유지한다.
- 28개 목차에는 각 질문 맥락을 표현한 3:2 실사형 WebP를 한 장씩 연결한다. 같은 그림을 반복하지 않는다.
- 공용 마크다운 뷰의 실제 저장 원문, 시맨틱 표, 계산 그래프를 그대로 사용한다. 임의 궁합 점수나 성공 확률은 만들지 않는다.
- 공용 리더가 채워지면 구형 rail과 단일 상세 화면을 숨기고, 토글 상태·15px 본문·1.9 행간·전체 문서 스크롤을 적용한다.

## Artifact

- `사주/data/longform-blocks.json`
- `사주/js/umsh-report-access.js`
- `사주/match/couple/06-step-6_1-report-detail/index.html`
- `사주/match/couple/assets/couple/reading-v2/*.webp` (28개)
- `tests/unit/all-service-reading-template.test.ts`

## QA result

- 목차 이미지: 28개, SHA-256 고유값 28개, 총 3,800,612바이트.
- 집중 테스트 19/19 PASS.
- 전체 단위 테스트 1,542/1,542 PASS.
- TypeScript PASS, 20개 서비스 QA PASS, Vercel build PASS, `check:couple` PASS, `git diff --check` PASS.
- 로그인된 운영 화면의 변경 후 시각 검수와 운영 배포는 NOT_RUN.

## Lesson

- 공용 렌더러의 이미지 설정은 비동기이므로 저장된 구형 이미지도 `data-umsh-template-image`로 표시해 설정 도착 후 교체해야 한다.
- 서비스 내부 별칭 `couple_match`와 정식 키 `match_couple`을 정규화해야 로컬 상세와 저장 API가 같은 설정을 사용한다.

## Relation

- `personal/carrotcap/notes/umsh-markdown-view-20260923.md`
- `personal/carrotcap/notes/umsh-all-service-reading-template-20260922.md`

## Next patch

- 명시적 운영 배포 승인 후 로그인된 실제 저장 리포트에서 28개 이미지, 첫·마지막 토글, 표·그래프, 공유·PDF, 모바일 끝 스크롤을 확인한다.
