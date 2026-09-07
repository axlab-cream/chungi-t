# 운명상회 운영 배포·DB 연결 검증 기록

## ProjectOps — 현재 상태

- 기록일: 2026-09-07, Asia/Seoul.
- 프로젝트: `C:\Users\user\Desktop\chungi-t`.
- 사용자 승인 범위: 운영 배포, DB 연결 및 결과 저장·재조회 검증.
- 기준 구현 커밋: `fdc80f2`. 원격 `main`의 `b997040`에 있던 포털 연애 카드 영상 변경 1개 파일도 보존했다.
- Vercel CLI에서 확인한 팀/프로젝트: `ax-lab-cream/chungi-t`.
- Supabase 프로젝트: `wdyzollywccgaepjeynu`. 관리 UI에서 healthy 상태를 확인했다.
- 첫 후보 배포: [chungi-it1dckzs0-ax-lab-cream.vercel.app](https://chungi-it1dckzs0-ax-lab-cream.vercel.app). Production 환경에서 도메인 할당 없이 준비한 뒤 운영으로 승격했으나, **로그인 후 DB 읽기에서 HTTP 500이 발생했다**.
- 장애 대응: authenticated 역할의 **SELECT/INSERT/UPDATE/DELETE(CRUD) 권한을 복구**하고 이전 배포로 롤백했다. 담당 작업에서 이전 배포 롤백 성공을 확인했다. 이것은 신규 기능의 운영 승인이나 서버 전용 권한 전환 성공을 뜻하지 않는다.
- **최종 상태는 미완료다.** 실패 원인·서버 전용 저장소 준비 상태 확인, 수정 후보 재검증, 권한 전환 재적용 및 최종 운영 검증이 남았다. 빌드 성공·일반 health 200·롤백 성공을 신규 배포 성공으로 해석하지 않는다.
- 수정 후보: [chungi-9593srre5-ax-lab-cream.vercel.app](https://chungi-9593srre5-ax-lab-cream.vercel.app), `dpl_5eXxzaPJnNrYXysMpqxSF3wGsrvD`, 커밋 `f4ef85a`, Express/Node 24, Production 환경·도메인 승격 생략, Ready. 총 배포 41초, 원격 빌드 11초.
- 15:47 KST 수정 후보의 실제 저장소 검사: `mode:supabase`, `keyKind:unknown`, `httpStatus:401`, `REPORT_STORAGE_AUTH_REJECTED`. Vercel 런타임에 있는 서버 키 값은 정상 키 형식으로 인식되지 않고 DB가 인증을 거부했다. 문자열 값·길이·지문·고객 데이터는 출력하지 않았다. 이것은 단순한 새 키의 Bearer 헤더 호환 문제만으로 설명되지 않는다.
- 올바른 Supabase 프로젝트의 기존 secret 키가 관리 화면에 존재함을 확인했다. 새 키 발급·회전은 하지 않았다. Vercel 웹 설정은 로그인이 풀려 있어 사용자에게 `ax-lab-cream/chungi-t` 관리 계정 로그인을 요청했다. 실제 키 재연결 전에는 수정 후보를 승격하지 않는다.
- 15:48 KST `vercel inspect https://umsh.kr` 확인: 원래 배포 `dpl_BTW2yMUXcBTFCM76sKaXrgcHrfLt` / `chungi-95s9df0ql-ax-lab-cream.vercel.app` / 원격 main `b997040`을 유지한다. 실제 로그인 보관함이 다시 정상 표시됨을 브라우저에서 확인했다.

이 문서는 담당 작업에서 확인한 CLI·SQL·테스트 결과를 취합한 배포 기록 초안이다. 이 문서 작성 작업은 앱 코드, 운영 DB, 배포 상태를 변경하지 않았다. 아래 집계에는 키 값, 인증 토큰, 실제 고객의 입력·해석 본문을 포함하지 않는다.

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

위 흐름은 이번 변경의 목표 구조이며, 롤백된 현재 운영 상태 전체를 설명하는 것은 아니다. 목표는 브라우저가 DB 내부 payload를 직접 읽거나 수정하지 않도록 공개/로그인 사용자용 키와 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`의 책임을 분리하는 것이다. UUID는 위치를 찾는 식별자일 뿐 접근 권한이 아니다. 현재 authenticated CRUD 권한은 장애 복구를 위해 되돌린 상태이므로 서버 전용 경계가 완성되었다고 기록하지 않는다.

| 검증 지점 | 확인된 근거 | 상태 |
|---|---|---|
| 프런트 결과 주소·전체 본문 | 공통 리더의 ID 우선 GET, 원문 문단 표시, 소유자 캐시 격리 회귀 | 로컬 확인, 운영 브라우저는 예정 |
| 로그인 API 경계 | 모의 인증으로 미로그인 401, 타인 접근 403, 본인 삭제만 허용 | 로컬 회귀 통과 |
| 미결제 접근 | 서버 응답이 미리보기만 반환하고 본문·내부 생성 기록은 제외 | 로컬 회귀 통과 |
| DB 연결 | 실제 Supabase UI healthy, RLS 활성 상태 및 권한 현황 확인 | 운영 읽기 확인 |
| 서버 전용 테이블 접근 | cheongi_reports REST를 서버 전용 키로 전환, 사용자 ID 필터·앱 소유권 검사 유지 | 코드·모의 REST 검증, 첫 운영 전환은 실패 후 권한 복구 |
| 최초 저장·조건부 갱신·UUID 재조회 | 실제 DB에서 격리된 합성 SQL로 검증 후 트랜잭션 rollback | 통과, 합성 데이터 잔존 없음 |
| 첫 후보 배포 | 빌드·승격 이후 로그인 DB 읽기 500 확인 | 이전 배포로 롤백 성공 |
| 운영 도메인·로그 | 수정 후보에서 로그인·저장·재조회·권한거부·함수 오류를 재확인해야 함 | 최종 검증 미완료 |

### 첫 운영 전환과 복구 이력

1. 첫 Production 후보의 빌드와 운영 승격을 진행했다.
2. 승격 후 로그인된 사용자 경로의 DB 읽기에서 HTTP 500을 확인했다.
3. authenticated CRUD 권한을 복구하고 이전 배포로 롤백했다.
4. 이전 배포 롤백은 성공했다. 신규 배포의 로그인·DB 종단 검증은 실패 기록으로 남기며, 정확한 원인과 수정 후보의 최종 결과는 담당자가 후속 확인한다.

이 이력에는 아직 확인되지 않은 장애 지속 시간, 영향 사용자 수, 키 자체의 유효성 또는 오류의 단일 원인을 추정해 기재하지 않는다.

## Error → Fix

| 확인한 문제 / 위험 | 조치와 남은 조건 |
|---|---|
| `.env.production`이 CLI 업로드 제외 목록에 없었음 | `.vercelignore`를 `.env*` 제외, `!.env.example` 예외로 보강했다. 키 파일이 배포 소스에 포함되지 않도록 한다. |
| CLI 환경변수 pull 결과에서 민감값이 비어 있음 | 빈 pull 결과를 실제 설정 삭제·키 부재로 단정하지 않고 기존 원격 설정을 유지했다. 값을 문서·콘솔에 공개하거나 빈 값으로 덮어쓰지 않는다. 운영 연결 성공 여부는 별도 검증한다. |
| 기존 authenticated 역할에 cheongi_reports의 SELECT/INSERT/UPDATE/DELETE/TRUNCATE 등 광범위한 권한이 실재 | RLS만으로 내부 생성 원문·시도 기록 노출과 payload 직접 수정 위험을 해소했다고 보지 않는다. 서버 전용 전환을 진행했으나 로그인 DB 읽기 장애가 발생해 authenticated CRUD를 복구했다. 권한 축소의 최종 재적용은 미완료이며, TRUNCATE 등 모든 기존 권한을 복구했다고 확대 해석하지 않는다. |
| 첫 후보 빌드·승격 후 로그인 DB 읽기가 500으로 실패 | authenticated CRUD 복구 및 이전 배포 롤백에 성공했다. 저장소 연결을 실제로 검사하는 선택형 `/api/health?storage=1`을 추가했으며, 일반 health 200만으로 도메인 승격을 승인하지 않는다. 정확한 실패 원인과 수정 후보의 운영 검증은 후속 확인 대상이다. |
| 수정 후보의 실제 서버 키 인증이 401로 거부됨 | 현재 원격 서버 키 형식은 unknown이다. 올바른 프로젝트의 기존 키를 Vercel 서버 전용 설정에 재연결해야 하며 웹 로그인 요청 상태다. 값을 추측하거나 사용자 JWT로 우회하지 않는다. |
| 서버 전용 DB 권한 사용 시 RLS가 앱의 소유권 검사를 대신해 주지 않음 | 모든 고객용 보고서 읽기·수정·생성·삭제 경로에서 인증과 소유권을 검증한다. 서비스 역할 키를 사용자 요청의 토큰으로 대체하지 않는다. |
| 타인 보고서의 상담 이력·오늘의 운세 재조회에서 소유권 오류를 500으로 반환 | 해당 두 경로를 403으로 정규화했다. 실제 읽기/수정 차단과 응답 코드를 회귀 테스트로 확인했다. |
| 다른 PC의 원격 변경이 로컬 배포 작업에 누락될 위험 | 원격 `main`의 `b997040` 포털 영상 변경을 동일하게 보존했다. 관련 없는 작업을 되돌리지 않았다. |

## Improvement — DB 경계와 불변 결과

- 신규 코드의 cheongi_reports REST는 서버 전용 자격으로만 접근하도록 변경했다. 서버 키가 없으면 실패 처리하며, 공개 키·사용자 토큰으로 우회하지 않는다. 현재 운영은 첫 후보 실패로 이전 배포에 롤백되어 있으므로 코드의 목표 계약과 운영 적용 상태를 구별한다.
- `findReportRecord` 등 고객 경로는 확인된 소유자를 기준으로 조회한다. 서비스 역할이 DB RLS를 우회할 수 있으므로 앱의 소유권 검사와 `user_id` 범위 제한을 유지한다.
- 첫 저장 우선 정책, revision 기반 compare-and-swap(CAS), 생성 임대, 완료 본문 불변 규칙을 함께 적용한다. 화면 재방문은 저장 결과 조회이며 새 보고서 생성 요청이 아니다.
- JSON `resultId` 고유 인덱스와 소유자·수정일 조회 인덱스, **2개 인덱스 생성 확인**을 받았다. 기존 UUID 중복은 0건이었다.
- 기존 55행의 소유자 UUID 현황과 RLS 활성 상태를 확인했다. 이 집계 확인을 실제 고객 본문 품질 검증이나 55건 전체 생성 완료 확인으로 확대 해석하지 않는다.
- 내부 모델 시도·생성 임대·상담 프롬프트는 고객 응답에서 제외한다. 브라우저에는 검증된 미리보기 또는 허용된 최종 본문만 전달한다.
- 주문 저장소도 같은 서버 키를 사용하므로 opaque 키를 Bearer로 보내지 않도록 동일하게 보강했다. 합성 모의 REST 5/5와 타입 검사를 통과했고 프로필의 사용자 JWT 흐름은 변경하지 않았다. 이 주문 패치는 두 번째 후보 이후 로컬 변경이므로 다음 배포에 포함해야 한다.
- 남은 별도 위험: 기존 주문 저장소는 서버 키가 아예 없으면 운영에서도 메모리 모드가 될 수 있다. 이번 배포의 원격 키는 누락이 아니라 잘못된 형식으로 존재해 401을 반환하며 메모리로 우회하지 않는다. 최종 배포에서도 실제 주문 저장소 모드·기존 결제 조회를 별도 확인해야 한다. 실제 결제나 환불은 실행하지 않았다.

### 권한 전환 순서의 주의점

이전 배포가 사용자 토큰 기반 REST에 의존한다면 권한 회수부터 적용할 경우 기존 화면이 실패할 수 있다. 서버 전용 후보의 준비·설정 확인, 권한 회수, 도메인 승격을 담당자가 하나의 전환 작업으로 관리한다. 이번에는 로그인 DB 읽기 500 이후 authenticated CRUD 복구와 이전 배포 롤백으로 대응했다. 복구로 남은 직접 접근 위험을 해결 완료로 보지 않고, 저장소 readiness와 로그인 API를 확인한 수정 후보에서 권한 축소를 다시 검증해야 한다.

## Success Case — 확인 완료한 검증

### 자동 검증

- 첫 후보 준비 당시 전체 테스트: **226/226 PASS**. 아래 readiness 회귀 추가 후의 전체 테스트 최신 집계는 담당자가 별도 갱신한다.
- 수정 후보 `f4ef85a` 전체 `npm test`: **232/232 PASS**, 26 suites, 실패·생략 0, 45.8초. Supabase REST 모의 검증 19개와 health API 계약 회귀를 포함한다.
- 주문 키 호환 수정까지 포함한 최종 로컬 `npm test`: **237/237 PASS**, 27 suites, 실패·생략 0, 47.7초. `npm run vercel-build` 및 TypeScript 검사도 다시 통과했다. 이 최신 주문 수정은 DB 키 연결 완료 후 새 후보로 배포해야 한다.
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

연결 확인 결과 service_role의 CRUD 권한은 존재했다. 반면 authenticated의 광범위한 기존 권한도 확인되었으므로, 이 검증을 서버 전용 권한 전환 완료로 표시하지 않는다. 인덱스 생성 확인과 합성 검증의 rollback은 서로 다른 작업 기록이다.

## 후속 검증 — 운영 완료 판정 체크리스트

첫 후보의 승격은 진행됐으나 장애로 롤백했다. 아래 항목은 **수정 후보의 최종 승인 기준이며 미완료**다. 담당자가 실제 결과·시간·배포 식별자를 채운 뒤에만 체크한다.

- [ ] 로그인 DB 읽기 500의 원인과 수정 내용을 확인하고 실패 증거·복구 이력을 보완.
- [x] 수정 후보 outputs 배포가 완료되어 Ready 상태인지 확인. `f4ef85a` 후보 기준이며 DB 인증은 실패했다.
- [ ] 수정 후보에서 `/api/health?storage=1`과 로그인 API 양쪽으로 실제 서버 전용 DB 연결을 확인. 기존 원격 설정 유지 여부를 검사하되 키 값은 기록하지 않음.
- [ ] cheongi_reports의 anon/authenticated 역할 및 개별 열 권한 회수 적용 결과 확인. 서비스 역할과 RLS 상태도 재확인.
- [ ] 공개 키 및 로그인 사용자 토큰으로 cheongi_reports 직접 읽기·삽입·수정·삭제가 거절되는지 안전한 검증으로 확인.
- [ ] `umsh.kr`을 검증된 후보로 승격하고 실제 도메인이 해당 배포를 가리키는지 확인.
- [ ] 운영 브라우저에서 로그인 → 해석 접근 → UUID 주소 재방문 흐름 확인. 이미 완료된 결과의 본문·생성 횟수가 바뀌지 않는지 검증.
- [ ] 로그아웃·다른 계정·미결제 상태에서 본문과 내부 기록이 노출되지 않는지 확인.
- [ ] 운영 함수 로그에서 저장·조회 실패, 500, 중복 생성, 권한 오류가 없는지 점검. 실제 키/고객 본문은 문서에 옮기지 않음.
- [ ] 필요 시 테스트 계정·합성 데이터의 정확한 정리 결과와 복구 가능성을 기록.
- [ ] 최종 운영 판정, 승격 배포 ID/커밋, 확인 시각을 아래에 추가.

### 최종 판정 — 담당자 후속 기입

- 첫 후보 권한 전환: 로그인 DB 읽기 500 이후 authenticated CRUD 복구.
- 첫 후보 도메인 승격: 진행했으나 이전 배포로 롤백 성공.
- 수정 후보 준비 / 재승격: Ready이나 실제 DB 인증 401로 승격 보류.
- 운영 브라우저 검증: 첫 전환에서 실패 확인, 최종 재검증 미완료.
- 운영 로그 검증 및 정확한 원인 확인: 첫 후보에서 today/fortune 및 user/reports 500 기록 확인. 수정 후보는 실제 서버 키 인증 실패를 확인했으며, 연결 수정 후 성공 로그 검증이 남았다.
- 최종 상태: **첫 전환 실패·롤백 완료 — 신규 배포 성공 아님**.

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
| API 소유권·결제·상담 검증 | [report-api-access.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-api-access.test.ts), [report-api-chat.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-api-chat.test.ts) |
| 완료 결과·구형 ID 불변성 | [report-persistence.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-persistence.test.ts) |
| 브라우저 조회·권한 캐시 경계 | [report-access-frontend.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-access-frontend.test.ts) |

REG 검색어: `운명상회`, `production deploy`, `server-only cheongi_reports`, `service_role`, `authenticated revoke`, `RLS`, `immutable report`, `resultId UUID`, `first write wins`, `CAS revision`, `skip-domain`, `배포 전 권한 전환`, `226 tests`.

운영 재사용 시 이 문서의 상태를 복사해 성공으로 선언하지 않는다. 현재 프로젝트·배포·DB 권한과 실제 검증 결과를 다시 확인하고, Error/Fix/Improvement/Success 이력에 새 증거를 추가한다.
