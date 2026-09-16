# T24 — 실제 콘텐츠 승인·예약 workflow

## Context

- Project: 운명상회 운영 관리자
- AIOS routes: `00 Context`, `01 Skills`, `04 Workflows`, `07 Design System`, `08 Components`, `11 Ops`, `12 QA/Eval`, `13 Deploy`, `14 Memory/KMS`
- Result: `content_versions`의 고객센터 상단 공지를 편집·검토·승인·예약·취소·발행하는 실제 운영 vertical slice를 연결했다.

## Verified pattern

- 승인 증거는 현재 payload checksum에 묶는다. 편집 또는 내부 검수 의견 저장 시 승인 요청, 승인, 예약을 모두 무효화한다.
- 승인·예약·발행은 UI 조건만 믿지 않고 DB RPC에서도 revision CAS와 checksum 일치를 검증한다.
- 예약 시각은 서버와 DB에서 미래 1분 이후인지 확인하고, due row를 잠근 동일 트랜잭션에서 기존 발행본 보관과 새 발행본 승격을 처리한다.
- 기존 cron route에서 서로 다른 작업을 순차 의존시키지 않는다. 작업 큐와 콘텐츠 due 발행을 동시에 시작해 한 기능의 장애가 다른 기능의 실행 시작을 막지 않게 한다.
- 발행본이 없는 운영 빈 상태는 `없음`으로 표시하고 예시 콘텐츠를 생성하지 않는다. 운영 smoke를 위한 임의 공지 발행도 하지 않는다.
- `SECURITY DEFINER` 함수는 빈 `search_path`, fully-qualified relation, service_role 전용 EXECUTE를 사용한다.

## Evidence

- Unit/API/shell: focused 38/38, full 657/657.
- Build: TypeScript and Vercel production build PASS.
- Supabase: migration `20260912093000` applied and local/remote history aligned.
- Production: deployment `dpl_5GSwim9Pn812gsuPCf7iwC3BhW2b` Ready; `umsh.kr` alias; unauthenticated cron 401.
- Browser: authenticated LNB, actual-version editor, preview/diff, approval and scheduling controls, truthful empty state.

## Prevention rules

예약 발행을 기존 worker 뒤에서 순차 실행하면 선행 worker 장애가 관련 없는 콘텐츠 발행까지 막는다. 같은 인증 경계 안에서도 독립 작업은 함께 시작하고 결과/오류 관측은 명확히 분리한다.

원격 migration history를 정렬하려고 `migration fetch`를 실행하면 동일 이름의 로컬 추적 파일이 원격 본문으로 덮일 수 있다. 실행 전후 추적 diff를 검사하고 현재 저장소 정본과 다른 변경은 복구한 뒤 새 migration만 push한다.

## Unverified

- 운영에 실제 draft/published 공지가 없어 실제 문안의 승인→예약→취소와 due 시각 자동 발행 smoke는 NOT_RUN이다.
- CreamWIKI 공유 저장·원격 재색인은 인증된 저장소가 없어 NOT_RUN이다.

비밀번호, 쿠키, service key, cron secret, authorization header는 이 문서에 저장하지 않았다.
