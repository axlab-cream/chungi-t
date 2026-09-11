# 실행 상태·인계
상태 기준일 2026-09-10. 현재 완료된 것은 **실행 명세 패키지 작성**이다. 관리자 앱은 이 작업에서 구현하지 않았다.

## 현재 상태
M0~M5 구현: 미착수. T01~T38: todo. 패키지 작성 중의 로컬 소스 조사는 E01~E16에 기록했지만 구현 시작 시 최신 상태를 다시 확인한다.
운영 변경: 없음. 실 PG 결제/환불: 없음. 고객 데이터 export: 없음.
다음 작업: T01. 병행 후보: T02~T04는 T01 후 시작.

## 에이전트 인계 양식
- 작업일·작업자·저장소 HEAD:
- 실행한 task ID:
- 변경 파일:
- 확인된 사실과 근거:
- 신규 제안·미확정:
- 테스트 명령·결과:
- UI 검증 화면·폭:
- 스키마 변경·복구:
- 운영 반영 여부:
- 미완료와 해제 조건:
- 다음 ready task:
- 갱신한 WIKI:

## 2026-09-12 T22 Slice 1 인계

- 작업일·작업자·저장소 HEAD: 2026-09-12, Codex, 커밋 전 `f4dd75d`
- 실행한 task ID: T22 / Slice 1 실제 서비스·버전 조회
- 변경 파일: `src/admin/service-version-store.ts`, `src/server/service-directory.ts`, `src/server/app.ts`, `src/auth/staff.ts`, `admin-ui/index.html`, 관련 테스트·migration
- 확인된 사실과 근거: 실제 판매 정본은 19개이며 discovery 노출 15, 숨김 4다. 버전 테이블 운영 권한은 service_role SELECT/INSERT/UPDATE만 남긴 SQL 조회로 검증했다.
- 신규 제안·미확정: 로컬 실행에는 service role 키가 없어 버전 REST 실조회는 NOT_RUN. 이는 Vercel 운영 환경 누락 증거가 아니다.
- 테스트 명령·결과: 관련 25 PASS, `npm test` 622 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS.
- UI 검증 화면·폭: 운영 배포 전이므로 NOT_RUN.
- 스키마 변경·복구: `20260911215407_tighten_service_content_grants.sql` 적용·migration history 반영. 복구가 필요하면 정확한 이전 권한 계약을 재검토한 별도 migration을 사용하며 DELETE를 임의 복원하지 않는다.
- 운영 반영 여부: DB 권한 반영 완료, 애플리케이션 배포 전.
- 미완료와 해제 조건: 운영 배포 Ready 및 인증된 `/admin/services` 확인, 이후 draft 생성 API의 revision/감사 계약 구현.
- 다음 ready task: T22 Slice 2 구조화 draft 생성.
- 갱신한 WIKI: `personal/carrotcap/notes/umsh-t22-service-version-read-20260912.md` 저장·재조회·검색 확인.

## 결과 보고 규칙
코드작성/로컬검증/스테이징검증/운영반영을 구분한다. 각 완료 task는 수용 조건 증거를 첨부한다. 새 에이전트가 완료 상태를 추측하게 하지 않는다.
