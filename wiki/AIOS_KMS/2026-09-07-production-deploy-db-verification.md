# 운명상회 운영 배포·DB 연결 검증 기록

## ProjectOps — 현재 상태

- 기록일: 2026-09-07, Asia/Seoul.
- 프로젝트: `C:\Users\user\Desktop\chungi-t`.
- 사용자 승인 범위: 운영 배포, DB 연결 및 결과 저장·재조회 검증.
- 기준 구현 커밋: `fdc80f2`. 현재 운영 런타임 커밋: **`d158089`**. 원격 `main`의 `b997040`에 있던 포털 연애 카드 영상 변경 1개 파일도 보존했다.
- GitHub `main`에는 이번 변경을 push하지 않았다. 현재 운영은 로컬 소스의 CLI 배포 `d158089`이며, 후속 SQL·검증 스크립트·기록 문서 변경은 로컬 커밋 `c47fbfa`에 기록했다. 후속 커밋은 런타임 코드 변경을 포함하지 않는다.
- Vercel CLI에서 확인한 팀/프로젝트: `ax-lab-cream/chungi-t`.
- Supabase 프로젝트: `wdyzollywccgaepjeynu`. 관리 UI에서 healthy 상태를 확인했다.
- 첫 후보 배포: [chungi-it1dckzs0-ax-lab-cream.vercel.app](https://chungi-it1dckzs0-ax-lab-cream.vercel.app). Production 환경에서 도메인 할당 없이 준비한 뒤 운영으로 승격했으나, **로그인 후 DB 읽기에서 HTTP 500이 발생했다**.
- 장애 대응: authenticated 역할의 **SELECT/INSERT/UPDATE/DELETE(CRUD) 권한을 복구**하고 이전 배포로 롤백했다. 담당 작업에서 이전 배포 롤백 성공을 확인했다. 이것은 신규 기능의 운영 승인이나 서버 전용 권한 전환 성공을 뜻하지 않는다.
- 첫 롤백 직후에는 미완료 상태였다. 아래에 남긴 500·401 기록은 당시 결과이며, 이후 기존 키 재연결과 신규 후보 검증으로 해결했다. 빌드 성공·일반 health 200·롤백 성공만을 신규 배포 성공으로 해석하지 않았다.
- 수정 후보: [chungi-9593srre5-ax-lab-cream.vercel.app](https://chungi-9593srre5-ax-lab-cream.vercel.app), `dpl_5eXxzaPJnNrYXysMpqxSF3wGsrvD`, 커밋 `f4ef85a`, Express/Node 24, Production 환경·도메인 승격 생략, Ready. 총 배포 41초, 원격 빌드 11초.
- 15:47 KST 수정 후보의 실제 저장소 검사: `mode:supabase`, `keyKind:unknown`, `httpStatus:401`, `REPORT_STORAGE_AUTH_REJECTED`. Vercel 런타임에 있는 서버 키 값은 정상 키 형식으로 인식되지 않고 DB가 인증을 거부했다. 이 기록에는 상태 메타데이터만 남긴다. 이것은 단순한 새 키의 Bearer 헤더 호환 문제만으로 설명되지 않는다.
- 올바른 Supabase 프로젝트의 기존 secret 키가 관리 화면에 존재함을 확인했다. Vercel 웹 로그인이 풀려 사용자에게 관리 계정 로그인을 요청했고, 재로그인 후 **기존 `sb_secret_` 키를 Production의 서버 전용 비밀 환경변수에 다시 연결**했다. 새 키 발급·회전 없이 기존 키를 사용했고, 소스 파일 및 문서에 비밀값을 저장하지 않았다.
- 15:48 KST `vercel inspect https://umsh.kr` 확인: 원래 배포 `dpl_BTW2yMUXcBTFCM76sKaXrgcHrfLt` / `chungi-95s9df0ql-ax-lab-cream.vercel.app` / 원격 main `b997040`을 유지한다. 실제 로그인 보관함이 다시 정상 표시됨을 브라우저에서 확인했다.
- 현재 승격된 배포: [chungi-13cxpjler-ax-lab-cream.vercel.app](https://chungi-13cxpjler-ax-lab-cream.vercel.app), **`dpl_6FbJh6wciMkXC8B1N7w4qqNqQ9V1`**, 커밋 **`d158089`**, Express/Node 24, 생성 시각 **15:54:49 KST**, 총 배포 **41초**, 원격 빌드 **12초**. 도메인 할당 없는 Production 후보로 실제 DB 연결을 먼저 확인했고, CLI 승격 성공 및 `vercel inspect https://umsh.kr`의 새 배포 매핑을 확인했다.
- 실제 `/api/health?storage=1`은 승격 전과 보고서 테이블 권한 회수 후 모두 **HTTP 200**, `ok:true`, `openai:true`, `reportStorage:{mode:supabase,ok:true,durable:true,keyKind:secret,httpStatus:200}`을 반환했다. `openai:true`는 설정 존재 확인이며 실제 모델 응답 성공을 대신하지 않는다.
- **현재 확인된 결과:** 운영 배포·서버 전용 DB 연결·실제 로그인 오늘의 운세 저장·UUID 재조회/새로고침 불변성·미로그인 차단이 통과했다. `/orders`에서 발견한 주문 테이블 누락도 기존 스키마에 맞게 생성한 뒤 화면 정상화 및 메타데이터 readiness를 확인했다. **기존 키를 사용한 운영 OpenAI 상담 1건의 HTTP 200·완료 응답**과 수정 후 지정 구간의 500 로그 없음까지 확인했다. 전체 유료 해석 생성이나 실제 결제·정산을 실행했다는 뜻은 아니다.

이 문서는 담당 작업에서 확인한 CLI·SQL·브라우저·테스트 결과를 취합한 배포 기록이다. 이 문서 작성 작업은 앱 코드, 운영 DB, 배포 상태를 변경하지 않았다. 아래 집계에는 키 값, 인증 토큰, 실제 고객의 입력·해석 본문을 포함하지 않는다. 내부 검증을 위한 결과 UUID·해시·상태만 기록한다.

선행 기록: [수정 전 18종 감사](C:/Users/user/Desktop/chungi-t/wiki/AIOS_KMS/2026-09-07-18-service-teaser-paid-interpretation-audit.md), [로컬 해석 보강·결과 영속화](C:/Users/user/Desktop/chungi-t/wiki/AIOS_KMS/2026-09-07-interpretation-quality-and-result-persistence.md). 선행 문서의 “운영 미반영” 표시는 당시 범위이고, 이후 배포 진행 상태는 이 문서에 이어서 남긴다.

## 검증 Story — 고객 화면에서 저장 원본 재조회까지

```text
브라우저 입력 / 기존 결과 주소
  → 로그인 토큰을 서버 인증 API로 검증
  → 서버에서 보고서 소유자·구매 권한 검사
  → 서버 전용 권한으로 cheongi_reports 저장 / 조건부 갱신
  → resultId(UUID)를 포함한 주소 반환
  → /r/{resultId} 다시 열기
  → 동일 로그인·소유권·구매 권한 재검사
  → 저장된 본문 반환: 완료 결과의 재생성·덮어쓰기 없음
```

위 흐름은 현재 배포된 구현의 계약이다. 실제 운영 브라우저에서는 로그인된 오늘의 운세 저장과 UUID 재조회 경로를 확인했다. 전체 유료 서비스·다른 계정·실제 결제의 모든 조합을 운영에서 실행했다는 뜻은 아니다. 브라우저가 DB 내부 payload를 직접 읽거나 수정하지 않도록 공개/로그인 사용자용 키와 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`의 책임을 분리했다. UUID는 위치를 찾는 식별자일 뿐 접근 권한이 아니다. 초기 장애 복구 때 되돌렸던 authenticated CRUD 권한은 새 후보의 서버 DB 연결 검증 후 다시 회수했고, 테이블·열 권한 및 서비스 역할/RLS 상태를 SQL로 확인했다.

| 검증 지점 | 확인된 근거 | 상태 |
|---|---|---|
| 프런트 결과 주소·전체 본문 | 공통 리더 회귀 및 운영 오늘의 운세 UUID 주소 재방문·새로고침, 본문 해시/갱신 시각 불변 | 통과: 운영 1개 결과 경로 |
| 로그인 API 경계 | 모의 인증으로 미로그인 401, 타인 접근 403, 본인 삭제만 허용 | 로컬 회귀 통과 |
| 미결제 접근 | 서버 응답이 미리보기만 반환하고 본문·내부 생성 기록은 제외 | 로컬 회귀 통과 |
| DB 연결 | 실제 Vercel → Supabase readiness 200, 승격 전 및 권한 회수 후 재확인 | 통과 |
| 서버 전용 테이블 접근 | cheongi_reports 서버 전용 키, 사용자 ID 필터·앱 소유권 검사, anon/authenticated 테이블·열 권한 회수 | 코드·모의 REST·운영 SQL/로그인 경로 통과 |
| 최초 저장·조건부 갱신·UUID 재조회 | 실제 DB에서 격리된 합성 SQL로 검증 후 트랜잭션 rollback | 통과, 합성 데이터 잔존 없음 |
| 첫 후보 배포 | 빌드·승격 이후 로그인 DB 읽기 500 확인 | 이전 배포로 롤백 성공 |
| 현재 운영 도메인 | d158089 후보 승격 성공, umsh.kr의 배포 ID 매핑 확인 | 통과 |
| 주문 보관함 | cheongi_payment_orders 누락으로 500 발견 → 기존 SQL 스키마 생성 → 빈 주문 화면 정상 | 복구 후 통과, 실제 결제 미실행 |
| 운영 함수 로그·실제 모델 응답 | 16:00:38 상담 POST 200 및 UI 완료, 16:00 이후 조회 구간에서 500 로그 없음 | 통과: 단일 실호출·명시된 조회 구간 |

### 첫 운영 전환과 복구 이력

1. 첫 Production 후보의 빌드와 운영 승격을 진행했다.
2. 승격 후 로그인된 사용자 경로의 DB 읽기에서 HTTP 500을 확인했다.
3. authenticated CRUD 권한을 복구하고 이전 배포로 롤백했다.
4. 이전 배포 롤백은 성공했다. 신규 배포의 로그인·DB 종단 검증은 실패 기록으로 남겼다.
5. 두 번째 후보의 저장소 readiness에서 기존 원격 키가 `keyKind:unknown`, HTTP 401임을 확인하고 승격을 보류했다. opaque 키 헤더 호환 보완만으로 해결되었다고 단정하지 않았다.
6. 사용자가 Vercel에 다시 로그인한 뒤, 올바른 Supabase 프로젝트의 **기존** secret 키를 Vercel Production 비밀 설정에 재연결했다. 키 발급·회전은 없었다.
7. `d158089` 후보는 실제 저장소 readiness 200 확인 후 승격했다. 보고서 테이블의 공개/로그인 사용자 권한을 회수한 뒤에도 readiness 200 및 실제 로그인 저장·재조회를 확인했다.
8. 운영 `/orders`에서 별도의 500을 발견했다. SQL `to_regclass('public.cheongi_payment_orders')`가 NULL이므로 스키마가 없음을 확인했고, 기존 프로젝트 SQL과 동일한 제약·RLS·서버 CRUD·소유자/수정일 인덱스를 생성했다. 기존 주문 기록을 덮어쓰지 않았으며, 이후 화면은 “아직 결제한 풀이가 없습니다.”로 정상 표시됐다. 실제 결제·환불은 실행하지 않았다.

이 이력에는 아직 확인되지 않은 장애 지속 시간이나 영향 사용자 수를 추정해 기재하지 않는다. 첫 서버 키 설정은 실제 401로 거절됐고, 올바른 기존 키 재연결 후 같은 저장소 검사가 200으로 바뀐 사실을 원인·해결 근거로 사용한다. 주문 500은 별도의 테이블 부재 문제로 구분한다.

## Error → Fix

| 확인한 문제 / 위험 | 조치와 남은 조건 |
|---|---|
| `.env.production`이 CLI 업로드 제외 목록에 없었음 | `.vercelignore`를 `.env*` 제외, `!.env.example` 예외로 보강했다. 키 파일이 배포 소스에 포함되지 않도록 한다. |
| CLI 환경변수 pull 결과에서 민감값이 비어 있음 | 빈 pull 결과를 실제 설정 삭제·키 부재로 단정하지 않고 기존 원격 설정을 유지했다. 값을 문서·콘솔에 공개하거나 빈 값으로 덮어쓰지 않는다. 운영 연결 성공 여부는 별도 검증한다. |
| 기존 authenticated 역할에 cheongi_reports의 SELECT/INSERT/UPDATE/DELETE/TRUNCATE 등 광범위한 권한이 실재 | RLS만으로 내부 payload 직접 접근 위험이 해결되었다고 보지 않는다. 첫 장애 때 CRUD를 임시 복구했으나, 기존 키 재연결·후보 readiness 성공 후 anon/authenticated 테이블 및 열 권한을 다시 회수했다. 공개 읽기·로그인 직접 접근·로그인 열 읽기는 false, 서버 CRUD·RLS는 true임을 확인했다. |
| 첫 후보 빌드·승격 후 로그인 DB 읽기가 500으로 실패 | authenticated CRUD 복구 및 이전 배포 롤백으로 대응했다. 선택형 `/api/health?storage=1`을 추가하여 실제 DB 인증을 확인했고, 이후 후보는 readiness 200을 확인한 뒤에만 승격했다. 최종 후보의 로그인 저장·재조회도 통과했다. |
| 두 번째 후보의 실제 서버 키 인증이 401로 거부됨 | 당시 `keyKind:unknown`이었다. 올바른 프로젝트의 기존 secret 키를 Vercel Production 비밀 설정에 재연결한 뒤 `keyKind:secret`, HTTP 200으로 바뀌었다. 키 생성·회전, 값 추측, 사용자 JWT 우회는 하지 않았다. |
| 운영 주문 목록 GET이 500으로 실패 | `public.cheongi_payment_orders` 테이블이 없음을 SQL로 확인했다. 프로젝트의 기존 SQL 스키마대로 생성하고 RLS·서버 전용 CRUD·소유자 조회 인덱스를 적용한 뒤 `/orders`의 정상 빈 목록을 확인했다. 기존 주문 덮어쓰기나 실제 결제는 없었다. |
| 서버 전용 DB 권한 사용 시 RLS가 앱의 소유권 검사를 대신해 주지 않음 | 모든 고객용 보고서 읽기·수정·생성·삭제 경로에서 인증과 소유권을 검증한다. 서비스 역할 키를 사용자 요청의 토큰으로 대체하지 않는다. |
| 타인 보고서의 상담 이력·오늘의 운세 재조회에서 소유권 오류를 500으로 반환 | 해당 두 경로를 403으로 정규화했다. 실제 읽기/수정 차단과 응답 코드를 회귀 테스트로 확인했다. |
| 다른 PC의 원격 변경이 로컬 배포 작업에 누락될 위험 | 원격 `main`의 `b997040` 포털 영상 변경을 동일하게 보존했다. 관련 없는 작업을 되돌리지 않았다. |

## Improvement — DB 경계와 불변 결과

- 현재 운영 코드의 cheongi_reports REST는 서버 전용 자격으로만 접근한다. 서버 키가 없으면 실패 처리하며 공개 키·사용자 토큰으로 우회하지 않는다. 최종 후보에서 실제 서버 자격 DB 연결과 권한 회수 후 고객 경로를 확인했다.
- `findReportRecord` 등 고객 경로는 확인된 소유자를 기준으로 조회한다. 서비스 역할이 DB RLS를 우회할 수 있으므로 앱의 소유권 검사와 `user_id` 범위 제한을 유지한다.
- 첫 저장 우선 정책, revision 기반 compare-and-swap(CAS), 생성 임대, 완료 본문 불변 규칙을 함께 적용한다. 화면 재방문은 저장 결과 조회이며 새 보고서 생성 요청이 아니다.
- JSON `resultId` 고유 인덱스와 소유자·수정일 조회 인덱스, **2개 인덱스 생성 확인**을 받았다. 기존 UUID 중복은 0건이었다.
- 기존 55행의 소유자 UUID 현황과 RLS 활성 상태를 확인했다. 이 집계 확인을 실제 고객 본문 품질 검증이나 55건 전체 생성 완료 확인으로 확대 해석하지 않는다.
- 내부 모델 시도·생성 임대·상담 프롬프트는 고객 응답에서 제외한다. 브라우저에는 검증된 미리보기 또는 허용된 최종 본문만 전달한다.
- 주문 저장소도 같은 서버 키를 사용하므로 opaque 키를 Bearer로 보내지 않도록 동일하게 보강했다. 합성 모의 REST 5/5와 타입 검사를 통과했고 프로필의 사용자 JWT 흐름은 변경하지 않았다. 이 수정은 현재 운영 `d158089`에 포함된다.
- 실제 DB에 없던 주문 테이블은 기존 SQL의 컬럼·제약, RLS 및 서버 전용 CRUD와 소유자/수정일 인덱스로 생성했다. 이후 로그인 주문 화면의 정상 응답을 확인했다. 실제 결제·환불·정산은 실행하지 않았으므로 결제 종단 성공으로 확대하지 않는다.
- 주문 저장소 메타데이터 검증 스크립트의 **11개 boolean 조건이 모두 true**, `payment_storage_ready:true`였다. 이는 테이블·제약·권한 등 준비 상태 검증이며 실제 결제 생성이나 외부 결제사 승인 확인은 아니다.
- 남은 별도 위험: 기존 주문 저장소는 서버 키가 아예 없으면 운영에서도 메모리 모드가 될 수 있다. 현재 운영은 유효한 서버 키가 설정되어 있고 실제 DB 주문 목록을 읽는 경로를 확인했으나, 향후 키 삭제 시에도 내구성을 보장한다는 의미는 아니다.

### 권한 전환 순서의 주의점

이전 배포가 사용자 토큰 기반 REST에 의존한다면 권한 회수부터 적용할 경우 기존 화면이 실패할 수 있다. 서버 전용 후보의 준비·설정 확인, 도메인 승격, 권한 회수를 담당자가 하나의 전환 작업으로 관리한다. 이번에는 최초 실패 때 authenticated CRUD 복구·롤백으로 대응했고, 후속 후보에서는 실제 저장소 readiness 200 → 승격 → 권한 회수 → readiness 및 실제 로그인 재검증 순서로 확인했다. 롤백 자체를 권한 문제 해결로 취급하지 않고 최종 권한 상태를 별도로 검증했다.

## Success Case — 확인 완료한 검증

### 자동 검증

- 첫 후보 준비 당시 전체 테스트: **226/226 PASS**.
- 수정 후보 `f4ef85a` 전체 `npm test`: **232/232 PASS**, 26 suites, 실패·생략 0, 45.8초. Supabase REST 모의 검증 19개와 health API 계약 회귀를 포함한다.
- 주문 키 호환 수정까지 포함한 `d158089` 기준 최신 재실행 `npm test`: **237/237 PASS**, 27 suites, 실패·생략 0, **47.455초**. `npm run vercel-build` 및 TypeScript 검사도 통과했고 빌드·타입 검사 재실행은 **3.06초**였다. 이 코드는 현재 운영 배포에 포함된다.
- TypeScript: **PASS**.
- `npm run vercel-build`: **PASS**.
- 보고서 API 회귀에는 ID/UUID 조회, 일반·전용 analyze 재조회, section, prewarm, 상담 이력, 오늘의 운세 및 상담 부모 접근의 로그인/소유권 검사, 미결제 본문 차단, 보관함 분리, 타인 삭제 거부가 포함된다.
- 모의 Supabase REST 테스트는 서버 전용 키 헤더·사용자 범위·최초 저장·CAS 계약을 검사한다. 실제 자격 증명이나 실제 DB 호출을 사용하는 자동 테스트가 아니다.
- 추가 readiness 회귀: `NODE_ENV=test`에서 `node --import tsx --test tests/unit/report-api-access.test.ts` **10/10 PASS**. 일반 `/api/health`는 200이며 `reportStorage`를 포함하지 않는다. `?storage=1`의 memory 저장소는 503, `ok:false`, `durable:false`, `keyKind:'none'`, `errorCode:'REPORT_STORAGE_NOT_DURABLE'`을 반환한다. 응답은 `Cache-Control: no-store`이고, 외부 요청과 저장 데이터 변경이 없음을 확인했다.
- 실제 수정 후보의 미로그인 `/api/report/verification-no-such-id`: **401**, `Cache-Control: private, no-store`, `Vary: Authorization`. 내부 DB 오류·보고서 본문은 노출되지 않았다.

### 실제 DB 합성 검증

실제 연결된 DB에서 합성 레코드만 대상으로 다음을 확인했다. 고객 레코드의 해석 본문은 읽거나 수정하지 않았다.

1. 합성 레코드 insert 및 최초 저장 우선 동작: PASS.
2. 현재 revision 일치 시 CAS 성공, 오래된 revision으로 갱신하지 못함: PASS.
3. JSON에 저장된 UUID로 동일 스냅샷 재조회: PASS.
4. 합성 ID를 정확히 지정한 정리 검증: PASS.
5. 검증 트랜잭션 전체 rollback: PASS. 합성 레코드는 운영 데이터로 남기지 않았다.

위 합성 검증 당시 service_role CRUD와 authenticated의 광범위한 기존 권한이 함께 존재했다. 따라서 이 합성 검증 자체가 서버 전용 권한 전환 증거는 아니다. 이후 최종 권한 회수는 별도 SQL과 운영 readiness·로그인 경로로 확인했다. 인덱스 생성과 합성 검증의 rollback도 서로 다른 작업 기록이다.

### 실제 운영 저장·UUID 재조회

- 로그인된 브라우저에서 오늘의 운세 결과를 생성했다. 검증 대상은 `resultId: b9f45985-889c-49ca-a1d2-47124965af29`, 생성 시각 `2026-09-07T06:56:15.617Z`, 상태 `complete`, `revision:1`, 생성 방식 `daily-rules-v2`, 섹션 1개다. 이 규칙 기반 생성은 OpenAI 실호출 검증이 아니다.
- 동일 UUID의 `/r/` 주소를 다시 열고 새로고침한 뒤 같은 해석이 표시됨을 확인했다. 고객 해석 본문은 문서에 복사하지 않았다.
- 위 단일 결과를 대상으로 한 전후 SQL 비교에서 본문 MD5 `662c56c3d30d03bdcb95a69bebb41a5e`, `revision:1`, `updated_at`이 모두 동일했다. 재방문이 저장 원본의 재생성·갱신을 일으키지 않았다는 근거다. MD5는 이 검증의 동일성 비교용이며 보안 인증 수단이 아니다.
- 운영 미로그인 보고서 API는 **401**, `Cache-Control: private, no-store`, `Vary: Authorization`을 반환했다.
- 보고서 권한 확인 결과는 anon 읽기 **false**, authenticated 직접 접근 **false**, authenticated 열 읽기 **false**, service_role CRUD **true**, RLS **true**였다. 이는 DB 권한 상태 확인이며, 모든 외부 클라이언트·다른 계정 조합에 대한 침투 테스트 완료 주장은 아니다.
- 익명 직접 REST 요청 `select=*&limit=0`은 보고서·주문 테이블에서 모두 **HTTP 401**이었다. 행을 읽지 않는 범위의 거부 검증이며 실제 고객 데이터 조회나 변경을 시도하지 않았다.

### 실제 운영 OpenAI 1건 및 수정 후 로그

- 기존 API 키를 사용한 운영 상담 요청이 **16:00:38 KST HTTP 200**으로 완료됐고, 브라우저에서도 답변 완료를 확인했다. 정상 상태에서 적용할 일정·메시지 관련 판단 기준을 설명한 응답이었다. 실제 질문·응답 전문은 기록하지 않았다.
- 상담 결과 메타데이터는 UUID **`06e828bc-52d7-4557-be57-ae71be7de52e`**, 상태 `complete`, 모델 `gpt-4o-mini-2024-07-18`, `revision:3`, 응답 392자, `attempts:1`, 본문 MD5 `be3491b62ec059004c9592d697102d90`이었다.
- 해당 `/r/{UUID}`를 실제 브라우저에서 열어 같은 전체 답변을 확인했고, GET 이후 DB의 revision 3·시도 1회·본문 해시가 모두 동일했다. 재조회로 모델 호출을 다시 실행하지 않았음을 확인했다.
- 이 392자 응답은 단일 상담 진단 결과이지 유료 장문 해석 품질 표본이 아니다. 유료 해석 전체 생성이나 실제 결제는 실행하지 않았다. 이번 검증은 운영 Vercel → OpenAI → 결과 저장 → UUID 재조회 경로 1건의 확인이다.
- 주문 테이블 복구 후 `--status-code 500 --since 2026-09-07T07:00:00Z` 조건의 Vercel 로그 조회는 **No logs**였다. 이 결과는 16:00 KST 이후 해당 조회 시점까지의 구간에 한정한다.
- 일반 로그에는 `GET /api/user/reports 200`, `POST /api/report/chat-history 200`, `POST /api/chat 200` 및 **16:00:21.62 KST `GET /api/user/orders 200`**을 확인했다. error-level로 분류된 Node `DEP0169` deprecation 경고는 HTTP 200 요청과 마지막 스캔의 `GET /orders 304`에도 관찰됐으며, API 500과 구분한다. 마지막 16:00 KST 이후 error-level 스캔에는 이 경고만 있었고 500은 없었다. 경고가 존재하므로 모든 로그가 완전히 무경고라고 표현하지 않는다.

## 후속 검증 — 운영 완료 판정 체크리스트

초기 실패와 현재 성공을 구분하며, 아래는 `d158089` 운영 후보의 실제 확인 범위다.

- [x] 로그인 DB 읽기 500, 후속 readiness 401 및 키 재연결 후 200을 기록하고 복구 이력을 보존.
- [x] 최종 후보 Ready 확인 및 실제 저장소 readiness 200 이후 승격.
- [x] `/api/health?storage=1`과 로그인 생성·재조회 양쪽으로 실제 서버 전용 DB 연결 확인. 새 키 발급·회전 없이 기존 키 사용, 소스 파일 및 문서에 비밀값 저장 안 함.
- [x] cheongi_reports의 anon/authenticated 역할 및 개별 열 권한 회수, service_role CRUD와 RLS 상태 재확인.
- [x] 보고서·주문 테이블의 익명 직접 REST `limit=0` 요청에서 모두 401 확인.
- [x] `umsh.kr`의 실제 배포 ID가 `dpl_6FbJh6wciMkXC8B1N7w4qqNqQ9V1`인지 확인.
- [x] 운영 로그인 → 오늘의 운세 저장 → UUID 주소 재방문·새로고침 → 본문 해시/revision/갱신 시각 불변 확인.
- [x] 미로그인 보고서 API의 401 및 private/no-store 확인. 다른 계정·미결제·내부 기록 제외 계약은 로컬 자동 회귀로 확인했으며 실제 운영에서 모든 조합을 실행한 것은 아님.
- [x] `/orders`의 500 원인을 테이블 부재로 확인하고 스키마 생성 후 실제 화면 정상화.
- [x] 보고서 합성 DB 검증은 전체 rollback으로 정리. 실제 로그인으로 생성한 위 오늘의 운세 결과는 재조회 대상이므로 삭제하지 않음.
- [x] 운영 OpenAI 단일 상담 생성의 실제 HTTP 200·저장·UUID 브라우저 재조회·revision/시도 횟수/해시 불변 확인. 설정 health나 규칙 기반 오늘의 운세로 대체하지 않음.
- [x] 주문 메타데이터 검증 11개 조건 true 및 `payment_storage_ready:true` 확인.
- [x] 주문 테이블 복구 후 16:00 KST 이후 구간의 운영 함수 로그에서 500 없음, 주요 API 200 확인. 키/고객 본문은 문서에 옮기지 않음.

### 최종 판정 — 운영 배포·DB 연결·대표 생성/재조회 검증 완료

- 첫 후보: 로그인 DB 읽기 500 후 권한 임시 복구·롤백 성공. 실패 이력을 보존했다.
- 두 번째 후보 `f4ef85a`: 실제 서버 키 인증 401로 승격하지 않았다.
- 현재 후보 `d158089`: 기존 키 재연결 후 실제 저장소 200 → 운영 승격 → 공개/로그인 직접 DB 권한 회수 → 실제 로그인 저장·UUID 재조회까지 통과했다.
- 운영 주문 화면: 테이블 부재로 인한 별도 500을 복구했고 정상 빈 목록을 확인했다. 실제 결제·정산 성공을 주장하지 않는다.
- 운영 로그: 첫 후보 today/fortune 및 user/reports의 500, 현재 후보 **15:57:40 KST 주문 GET 500 1건**은 실제 발견된 이력이다. 해당 주문 오류는 테이블 생성 전이며, “모든 시간대 500 없음”으로 덮어쓰지 않는다. 수정 후 **16:00 KST부터 최종 조회 시점까지의 500 필터 결과는 No logs**였고, 상담·상담 이력·보고서 목록 API의 200을 확인했다.
- 실제 생성: 기존 키로 OpenAI 상담 1건이 **16:00:38 KST HTTP 200 및 UI 답변 완료**로 확인됐고, 저장된 UUID를 재조회해 모델 시도 횟수·revision·본문 해시 불변을 확인했다. 오늘의 운세 UUID 재조회 불변성과 별도로 검증했다.
- 최종 상태: **운영 배포·서버 DB 연결·대표 로그인 결과 저장/UUID 재조회·실제 OpenAI 단일 응답·수정 후 로그 점검 완료.**
- 검증 한계: 전체 608개 유료 해석의 운영 생성, 실제 결제/환불/정산, 외부 보안 평가 또는 모든 사용자·권한 조합의 운영 검증은 수행하지 않았다. Drains·상시 모니터링의 설정 유무와 동작도 확인하지 않았으며, 이번 단회 로그 점검을 지속 감시로 해석하지 않는다. 자동 테스트 237개와 대표 실제 흐름 검증의 범위를 구별한다.

## Theory / 재사용 가능한 원칙

첫 저장 우선과 CAS는 서로 다른 문제를 해결한다. 첫 저장 우선은 동일 요청의 최초 결과를 보존하고, CAS는 이미 저장된 결과를 동시에 갱신할 때 오래된 쓰기를 거절한다. UUID 고유 인덱스는 주소 충돌을 막지만 소유권·결제 권한을 대체하지 않는다.

RLS가 활성화되어 있어도 사용자 역할에 내부 JSON 전체 접근과 쓰기가 허용되어 있으면 앱 API를 우회할 수 있다. 내부 저장 테이블의 역할 권한을 줄이고, 서버에서 소유권·결제·불변성 규칙을 검사하는 경계를 명시해야 한다. 단위 테스트, 실제 DB 합성 검증, 운영 브라우저·로그 검증은 각각 다른 층을 확인하므로 어느 하나로 전체 성공을 대신하지 않는다.

Supabase의 opaque `sb_secret_` 키는 `apikey`로 보내고, 기존 JWT 키일 때만 Bearer를 추가한다. 사용자 프로필 경로는 공개 키와 실제 사용자 JWT를 사용하는 별도 계약이므로 이를 서버 키로 바꾸지 않는다. 근거: [Supabase API keys 공식 문서](https://supabase.com/docs/guides/getting-started/api-keys). readiness는 `select=report_id&limit=0`으로 고객 행을 읽지 않고, 3초 제한·30초 캐시·동시 요청 병합으로 상태만 확인한다.

## REG — 근거 파일과 재사용 경로

| 지식 / 동작 | 구현 또는 검증 근거 |
|---|---|
| 배포 파일 포함·비밀 파일 제외 | [vercel.json](C:/Users/user/Desktop/chungi-t/vercel.json), [.vercelignore](C:/Users/user/Desktop/chungi-t/.vercelignore), [정적 파일 구성](C:/Users/user/Desktop/chungi-t/scripts/prepare-vercel-public.mjs) |
| Vercel 요청 경로 복원·API 라우팅 | [api/index.ts](C:/Users/user/Desktop/chungi-t/api/index.ts), [server/app.ts](C:/Users/user/Desktop/chungi-t/src/server/app.ts) |
| 서버 전용 저장·소유권·CAS | [report-store.ts](C:/Users/user/Desktop/chungi-t/src/report/report-store.ts), [report-queue.ts](C:/Users/user/Desktop/chungi-t/src/report/report-queue.ts) |
| DB 권한·인덱스 및 합성 검증 | [supabase-reports.sql](C:/Users/user/Desktop/chungi-t/supabase-reports.sql), [verify-report-db.sql](C:/Users/user/Desktop/chungi-t/scripts/verify-report-db.sql) |
| UUID 리더·서버 확인 후 렌더 | [report-view.html](C:/Users/user/Desktop/chungi-t/사주/report-view.html), [umsh-report-view.js](C:/Users/user/Desktop/chungi-t/사주/js/umsh-report-view.js), [umsh-report-access.js](C:/Users/user/Desktop/chungi-t/사주/js/umsh-report-access.js) |
| REST 계약 검증 | [report-store-rest.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-store-rest.test.ts) |
| 주문 저장소 키 형식 호환 | [order-store.ts](C:/Users/user/Desktop/chungi-t/src/payment/order-store.ts), [payment-order-store-rest.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/payment-order-store-rest.test.ts) |
| 주문 테이블 스키마·권한·준비 상태 | [supabase-payment-orders.sql](C:/Users/user/Desktop/chungi-t/supabase-payment-orders.sql), [verify-payment-db.sql](C:/Users/user/Desktop/chungi-t/scripts/verify-payment-db.sql) |
| API 소유권·결제·상담 검증 | [report-api-access.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-api-access.test.ts), [report-api-chat.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-api-chat.test.ts) |
| 완료 결과·구형 ID 불변성 | [report-persistence.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-persistence.test.ts) |
| 브라우저 조회·권한 캐시 경계 | [report-access-frontend.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-access-frontend.test.ts) |

REG 검색어: `운명상회`, `production deploy`, `server-only cheongi_reports`, `service_role`, `authenticated revoke`, `RLS`, `immutable report`, `resultId UUID`, `first write wins`, `CAS revision`, `skip-domain`, `storage readiness`, `기존 키 재연결`, `401 rollback`, `cheongi_payment_orders 누락`, `237 tests`.

운영 재사용 시 이 문서의 상태를 복사해 성공으로 선언하지 않는다. 현재 프로젝트·배포·DB 권한과 실제 검증 결과를 다시 확인하고, Error/Fix/Improvement/Success 이력에 새 증거를 추가한다.
