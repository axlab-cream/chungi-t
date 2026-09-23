# 직장 선택 공용 리더 이미지·마크다운 컴포넌트 — 2026-09-22

## observation
- 삽입형 `job_choice` 상세는 공용 리더가 섹션별 이미지 설정을 읽지 않아 요약 이미지가 잘리고, 해석 토글의 맥락 이미지가 빠질 수 있었다.
- 공용 마크다운 렌더러와 `<details>` 상태 컴포넌트는 이미 존재하므로, 서비스별 복제 대신 설정과 공용 렌더 경로를 연결하는 것이 안전하다.

## decision
- `summaryImageFit: wide`로 대표 이미지는 원본 비율을 유지한다.
- `sectionImages`에는 21개 토글 순서와 같은 21개의 고유 실사 이미지만 연결한다.
- 상세 HTML에서 삽입형 CSS를 정적으로 선행 로드하고, 공용 렌더러가 마크다운 표·차트·강조 및 `펼치기 +` / `접기 −` 토글 상태를 그대로 쓴다.

## artifact
- `사주/data/longform-blocks.json`
- `사주/js/umsh-report-access.js`
- `사주/css/umsh-verified-inplace.css`
- `사주/css/umsh-longform.css`
- `사주/work/job-choice/assets/job-choice/reading-v2/`
- `tests/unit/job-choice-reading-visuals.test.ts`

## qa result
- `npx tsx --test tests/unit/job-choice-reading-visuals.test.ts`: 2/2 PASS
- `npm run check:jobchoice`: PASS
- `npm run typecheck`: PASS
- 22개 이미지의 로컬 HTTP 200 확인

## lesson
- 공용 리더의 이미지 우선순위는 `sectionImages` → 저장된 개별 이미지 → 서비스 대표 컷 순서로 유지한다. 이 순서를 설정으로 보장하면 서비스별 렌더러를 복제하지 않아도 이미지·본문·토글 체험을 일관되게 유지할 수 있다.
