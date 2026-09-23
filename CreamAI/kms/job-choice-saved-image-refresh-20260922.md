# 직장 선택 저장 해석 이미지 지연 교체 실패 — 2026-09-22

- observation: 운영 DOM의 21개 해석 이미지가 전부 예전 `01-scene-05-index-preview.webp`였고 `data-umsh-template-image` 마커가 0개였다. 설정에는 고유 실사 21개가 정상 배포되어 있었다. 하이라이트의 `cutB`도 예전 일러스트 경로였다.
- decision: 저장 리포트가 설정보다 먼저 그려지는 경우에도 `job_choice` 이미지에 교체 마커를 붙인다. 하이라이트와 폴백 경로를 이미 제작된 `reading-v2` 실사로 바꾸고 공용 스크립트 캐시 버전을 통일한다. 새 이미지 생성은 필요하지 않았다.
- artifact: 공용 렌더러·서비스 설정·캐시 버전·회귀 테스트, 커밋 `7144f7b360322a07a357a115fb55e88bdf4fd424`.
- QA result: 회귀 테스트 red/green, 전체 1,537/1,537, 타입 검사, Vercel build, 직장 선택 계약 검사 통과. 운영 Vercel `dpl_ADwnXHz5DfwyvjQmBk5rTaGVVRGS` Ready, 브라우저 DOM의 목차 이미지 21개 고유 경로와 구 이미지 0개, 첫 토글 실사 화면, 21개 정적 파일 HTTP 200 확인.
- lesson: 정적 설정 파일에 새 이미지 경로를 넣는 것만으로는 저장된 보고서의 기존 이미지가 바뀌지 않는다. 비동기 설정 도착 후 재선택 대상 마커와 실제 운영 DOM 이미지 경로를 함께 검증해야 한다.
- relation: `personal/carrotcap/notes/umsh-job-choice-reading-visuals-v2-20260922.md`; `personal/carrotcap/notes/job-choice-reader-mobile-deploy-20260922.md`.
- next_patch: 없음. 팝업·팝업 관리자와 DB는 범위 밖으로 보존했다.
