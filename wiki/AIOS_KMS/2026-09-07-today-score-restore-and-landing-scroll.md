# 오늘운 점수 복원 및 소개 화면 스크롤 수정

## Error / 사용자 요청

- 해석 보강 과정에서 상단 종합 점수와 하단 영역별 점수가 UI에서 빠졌다. 사용자 요청은 점수 삭제가 아니었으므로 표시 범위를 복원한다.
- `/today/free#step-1-story`에서 소개 화면 아래로 스크롤할 수 없어 마지막 안내와 CTA에 접근할 수 없었다.

## Reference / 원인 근거

- `src/saju/today-fortune.ts`의 `reading.score` 및 `reading.details[key].score`는 v3에도 남아 있고, 저장 payload는 이를 그대로 보존한다. 엔진 재계산·DB 수정 없이 기존 값을 표시할 수 있다.
- 저장된 점수는 5가지 오행 관계별 규칙형 지표이며 사건 확률이나 측정치가 아니다. `caution`은 종합에 양의 가중치로 들어가므로 위험 확률로 표시하거나 `100 - score`로 뒤집지 않는다.
- 실제 운영 스크롤 재현: viewport 912px, 문서 높이 925px, 부모 `.stage` overflow hidden. 자식 `.scroll`의 표시 높이 840px보다 내용 높이 1,348px가 크지만 overflow visible이고, CTA 하단 좌표는 1,342.58px였다. 휠 입력 후에도 문서 scrollY는 13px에서 멈췄다.
- 공통 크롬 CSS의 고정 높이와 부모 clipping이 충돌했다. 공통 CSS 전체 수정 대신 오늘운 소개 페이지에만 자연 문서 스크롤을 복원한다.

## Fix / 구현 계약

- 실제 `/cmdg/` 소스 `사주/사주/index.html` 및 미러 `사주/cmdg/index.html`: 제목 우측 종합 점수, 일·돈·관계·주의점 제목 우측 점수 배지 복원.
- `사주/js/umsh-report-access.js`와 `사주/css/umsh-verified-reader.css`: 저장 결과 리더에도 같은 총점·4개 영역 점수 표시.
- 유한 숫자 0~100인 저장값만 표시한다. 0·100·소수 값 보존, 문자열·누락·NaN·Infinity·범위 밖 값은 미표시. 영역은 본문과 짝인 `details[key].score` 우선, 유효한 `reading.score[key]`로 fallback. 총점은 `reading.score.total`만 쓰고 새 평균이나 기본 점수를 만들지 않는다.
- 점수 캡션은 `100점 기준 · 오늘의 흐름 지표`. 띠별 풀이·기운 키워드·결론에는 별도 저장 점수가 없으므로 새 점수를 만들지 않는다.
- `사주/today/free/index.html`: `[data-today-landing]` 전용 고정 높이 해제, 부모 clipping 해제, 공통 GNB host sticky, 실측 하단 메뉴 높이와 safe-area를 고려한 여백 확보. 인증·풀이 호출·내용은 변경하지 않는다.
- 모든 기존 해석, 고유 UUID, 재조회/소유권 검사, 앞서 제거한 중복 재조회 링크 상태는 유지한다.

## Success Case / 검증

- 오늘운 포털·리더·규칙·영속화·공통 메뉴·소개 스크롤 집중 회귀 **66/66 통과**, 2 suites, 실패·취소·스킵 0, 506ms. `npm run vercel-build` 및 `git diff --check` 통과.
- 로컬 합성 브라우저: 320px 열 너비에서 포털과 리더의 종합+4개 배지 표시, 제목·배지 비겹침, 가로 넘침 없음, 콘솔 error 없음.
- 소개 화면 로컬 합성: 320px 열에서 콘텐츠 높이=표시 높이 1,574px, 휠 스크롤 scrollY=939px, 마지막 CTA가 하단 메뉴 위에 표시됨, GNB top=0, 가로 넘침·콘솔 error 없음.
- 위 320px 검증은 실제 모바일 기기/viewport 에뮬레이션이 아닌 좁은 컨테이너 검사이다. 실제 터치 장치의 스와이프를 검증했다고 확대하지 않는다.
- 재사용 fixture `scripts/verify-today-ui.ts`: 실제 렌더 함수/스타일/공통 크롬과 합성 엔진 결과를 사용. 운영 서버·저장 모듈을 import하지 않고 외부 요청 차단, loopback GET 전용. `/__qa/today-portal?width=320`, `/today/free?reportId=local-today-ui&width=320`, `/today/free?width=320#step-1-story` 지원. width=375도 지원한다.

## 운영 배포 보호

- 수정 중 운영 배포가 `dpl_5zGfY7JyLwCBkgwkwE3YEZW1vwRk`로 바뀐 것을 확인했다. 이 배포에는 별도 작업의 풍수 연동 변경이 이미 포함돼 있었다.
- `.env.example`, `src/pungsu/dataset-client.ts`, `src/report/standard-reading.ts`, `src/server/app.ts`, `src/types/index.ts`의 로컬 파일 SHA-1이 해당 운영 배포 소스와 모두 일치함을 확인했다. 내용을 출력하거나 변경하지 않고 유지한다.
- 위 변경을 되돌리는 깨끗한 Git checkout 배포를 하지 않는다. 이번 수정만 커밋하고, 후보 배포와 기존 운영 배포의 소스 파일 차이가 이번 작업 파일로 한정되는지 확인한 후 승격한다. 배포에는 이미 운영 중인 미커밋 변경이 포함되므로 커밋만으로 전체 런타임을 재현할 수 있다고 표현하지 않는다.

## 배포 결과

- **URL:** [chungi-9oc0vtrc7-ax-lab-cream.vercel.app](https://chungi-9oc0vtrc7-ax-lab-cream.vercel.app)
- **Target / Status:** Production / READY. 후보 health 확인 후 승격, `umsh.kr` inspect 매핑 확인.
- **Deployment / Commit:** `dpl_54xi6EA7icX4wKxrbb1io4NXn3FR` / `a866ed2` 및 위에 기록한 기존 운영 미커밋 파일 유지.
- **Framework / Duration:** Express·Node 24. 생성 2026-09-07 16:44:26 KST, 원격 빌드 15초, CLI 총 배포 표시 약 1분.
- **후보 소스 대조:** 이전 운영 대비 변경 파일은 오늘운 HTML·리더 JS/CSS·엔진 주석·관련 테스트·로컬 fixture·AIOS 문서 및 대응 public 빌드 복사본뿐이었다. 별도 풍수 연동 파일은 동일하다.
- **후보 health:** `/api/health`에서 `ok:true`. 이번 UI 수정에서 실제 DB readiness를 별도로 재검사한 것은 아니다.
- **실제 포털:** 저장 UUID `91db22a5-013d-4a6c-ae49-d97f9d4b5bdc` 재조회 시 종합 **64**, 일 **78**, 돈 **62**, 관계 **58**, 주의점 **54** 표시. 배포 전후 7개 해석 블록 일치, 제거했던 재조회 링크 0개 유지.
- **실제 저장 리더:** `/today/free?reportId=동일UUID`에서도 총점·4개 영역 점수 동일, 배포 전 7개 해석 모두 존재, 콘솔 error 없음 확인. 동일 결과를 새로 생성하지 않았다.
- **실제 소개 화면:** `/today/free#step-1-story`에서 휠로 하단 CTA 도달. 검증 탭 viewport 720px 기준 문서 높이 1,539px, scrollY 819px, 내용 높이=표시 높이 1,454px, CTA가 하단 메뉴 위에 표시, GNB top=0, 콘솔 error 없음. 문제 재현 당시의 사용자 탭 viewport 912px와 구분한다.
- **추가 좁은 열 검사:** 375px 포털·리더 점수 배치와 가로 넘침 없음 확인. 소개 화면은 휠 완료 후 scrollY 889px, CTA가 하단 메뉴 위에 표시, GNB top=0.
- **Error scan:** 16:45 KST부터 16:46:27 KST 검사 시점까지 해당 배포의 HTTP 500 로그는 `No logs found`였다.
- **Drains / Monitoring:** 구성 확인·변경 없음. 상시 모니터링을 새로 설정하지 않았으며 전체 기간 무오류를 보장하지 않는다.
- **보존:** 기존 키·DB 스키마·결과 원문 변경 없음, 고객 데이터 삭제 없음. 별도 작업의 미커밋 파일은 임의로 커밋하지 않았다.
