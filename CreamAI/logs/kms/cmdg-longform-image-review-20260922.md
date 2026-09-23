# 천명사주 해석 이미지 격리 검토 — 2026-09-22

## observation

- 공용 저장 해석의 전체 요약 이미지는 세로 원본을 21:9 프레임과 `object-fit: cover`에 넣어 상단 일부만 보여 주고 있었다.
- 첫 하이라이트는 본문인 `타고난 그릇과 쓰는 법`과 무관한 기존 인물 이미지를 공유하고 있었다.

## decision

- 운영 페이지를 변경하지 않고 `design-workspace/actual-service-pages/review/`에 동일한 리더 구조의 격리 검토본을 만들었다.
- 검토본은 요약 원본을 카드 폭 전체에 원본 비율로 표시하고, 첫 하이라이트는 강한 나무 기운·책임·기준을 정돈하는 맥락의 실사 사진을 사용한다.
- 검토본에는 운영과 같은 공통 상단·하단 내비게이션, 전체 요약, 하이라이트 3개, 첫 해석 카드의 이미지·본문과 16개 해석 목차를 함께 둔다.

## artifact

- `design-workspace/actual-service-pages/review/cmdg-longform.html`
- `design-workspace/actual-service-pages/review/cmdg-longform.css`
- `design-workspace/actual-service-pages/site/사주/assets/cmdg-wood-order-highlight-v1.png`
- `tests/unit/cmdg-longform-review.test.ts`

## qa_result

- 집중 단위 테스트 2/2와 TypeScript 검사를 통과했다.
- 로컬 브라우저에서 요약 원본은 `388×689px`로 전체 비율을 유지했고, 새 하이라이트는 `388×166px` 21:9 카드에 표시됐다.
- CreamWIKI 로컬 터널이 연결 거부 상태여서 원격 동기화는 대기다.

## lesson

- 운영 UI의 실제 구조를 보존한 격리 검토본을 먼저 두면, 이미지 교체와 프레임 정책을 운영 배포와 분리해 확인할 수 있다.

## relation

- `notes/verified-reader-image-frame-20260922.md`

## next_patch

- 사용자 검토 확정 후에만 운영 `사주/data/longform-blocks.json`과 운영 CSS에 별도 반영한다.

## 2026-09-22 후속 — 16개 카드 실사 이미지·원문 검수

### decision

- 사용자 요청에 따라 검토본의 16개 해석 카드마다 내용 맥락이 중복되지 않는 실사 사진을 각각 붙였다. 이미지의 공통 스타일은 가로 16:10, 자연광, 텍스트·로고·워터마크 없음으로 통일했다.
- 운영 저장 리포트 원문은 수정하지 않았다. 읽기 쉬움과 단정 표현의 수정 요건은 `review/cmdg-content-audit.md`에 분리 기록했다.

### artifact

- `design-workspace/actual-service-pages/site/사주/assets/cmdg-review/01-core-strength.png` ~ `16-next-signal.png`
- `design-workspace/actual-service-pages/review/cmdg-content-audit.md`

### qa_result

- `npx tsx --test tests/unit/cmdg-longform-review.test.ts`: PASS (3/3)
- `npm run typecheck`: PASS
- 로컬 브라우저: 카드 16개, 이미지 16개, 고유 경로 16개, 모두 자연 크기 로드 확인.

### lesson

- 카드별 실사 자산을 고유 파일명으로 관리하면, 같은 해석 이미지를 반복하는 문제가 회귀 테스트로 바로 탐지된다.

## 2026-09-22 후속 — 저장 풀이 전문 로컬 복제

### decision

- 로그인된 `good1621` 보관함의 천명사주 저장 리포트 16개 카드 본문을 로컬 검토본으로 복제했다. 개인화된 이름·원문·해석은 사용자의 명시적 요청에 따라 로컬 전용 검토 산출물에만 유지했다.
- 카드별 실사 검토 이미지는 그대로 두고, 운영에 있던 공통 이미지 참조는 검토본에 복제하지 않았다.

### qa_result

- 브라우저에서 운영·로컬의 각 카드 `textContent`를 공백 제외 기준으로 대조: 16/16 일치.
- 단위 테스트는 모든 카드의 한 줄 답·근거·행동 3개 블록 존재를 확인한다.
