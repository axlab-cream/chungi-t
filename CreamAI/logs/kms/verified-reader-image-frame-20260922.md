# 공용 저장 해석 이미지 프레임 수정 — 2026-09-22

## observation

- 공용 `/r/:id` 리더는 섹션 이미지 마크업을 만들지만 in-place 전용 CSS를 로드하지 않는다.
- 세로 원본 이미지는 자연 크기(`864×1821`)로 렌더되어 310px 본문 열 밖으로 넘쳤다.

## decision

- 공용 리더 CSS에만 16:10 프레임과 `overflow: hidden`, 자식 이미지의 `width: 100%`, `height: 100%`, `object-fit: cover`를 둔다.
- 리포트 내용·소유권·권한과 서비스별 in-place 화면은 변경하지 않는다.
- 새 이미지 교체는 일러스트가 아닌 사진 질감의 실사 톤을 사용한다.

## artifact

- `사주/css/umsh-verified-reader.css`
- `tests/unit/verified-reader-image-frame.test.ts`
- `tests/fixtures/verified-reader-image-frame.html`

## qa_result

- RED: 프레임 규칙 부재를 집중 테스트로 재현.
- GREEN: 프레임 집중 테스트 1/1, 리더 셸 포함 6/6, TypeScript, Vercel production build 통과.
- Browser: 같은 세로 원본이 390px 열에서 `388×242px`로 표시되고 넘침 없음.

## lesson

- 동적 렌더러가 서로 다른 CSS 진입점을 쓰면, 마크업만 공통이어도 이미지 크기 계약이 빠질 수 있다. 공용 리더는 자체 CSS에 필수 프레임 규칙을 가져야 한다.

## relation

- `notes/umsh-report-design-workspace-20260921.md`

## next_patch

- CreamWIKI 터널 복구 후 이 기록을 `personal/carrotcap/notes/`에 동기화한다.
- 원격 push·Vercel 배포는 별도 승인 뒤에만 실행한다.
