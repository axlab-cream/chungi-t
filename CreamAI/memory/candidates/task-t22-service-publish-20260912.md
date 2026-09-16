---
wiki_type: knowledge
doc_type: work-log
topic: umsh-service-content-publish
category: Operations
tags:
  - CreamWIKI
  - AIOS
  - Supabase
  - Vercel
  - service-content
routes:
  - 04 Workflows
  - 11 Ops
  - 12 QA/Eval
  - 13 Deploy
  - 14 Memory/KMS
privacy_level: internal
created_at: 2026-09-12
updated_at: 2026-09-12
---

# 운명상회 서비스 초안 발행과 공개 읽기 경계

## Date

2026-09-12

## Request Summary

관리자가 검토한 서비스 문구 초안을 명시적으로 발행하고, 운명상회 고객 서비스 목록이 발행본의 실제 데이터만 읽도록 연결했다. 결제 가격·이미지·경로는 코드 정본으로 유지했다.

## KMS Queries

- T22 publish service version customer read
- service content version publish audit idempotency

## Evidence Paths

- `docs/superpowers/plans/2026-09-12-service-content-versioning.md`
- `src/admin/service-version-store.ts`
- `src/server/published-service-directory.ts`
- `supabase/migrations/20260911222600_publish_service_config_draft.sql`

## AIOS Routes

- 04 Workflows: 초안 저장과 발행을 분리한 승인 흐름
- 11 Ops: 관리자 scope·감사·멱등·revision CAS
- 12 QA/Eval: 공개 DTO, 장애 복귀, 숨김 서비스 노출 방지
- 13 Deploy: Supabase 선적용 후 Vercel 배포와 운영 E2E
- 14 Memory/KMS: 검증된 패턴 저장

## Changes

- `services:publish`를 별도 권한으로 추가했다.
- 발행 RPC는 서비스 키 advisory lock 뒤 기존 published를 archived로 바꾸고 draft를 published로 승격한다.
- 함수는 security invoker, 빈 search path, service_role 전용 EXECUTE로 제한했다.
- 공개 API는 발행된 제목·한줄 설명·요약·분류·검색 노출만 합성한다.
- canonical key, 금액, 이미지, 고객 경로는 코드 정본을 유지한다.
- 코드에서 숨긴 서비스는 발행 payload만으로 공개할 수 없다.
- 버전 저장소 장애 시 목업이 아니라 기존 코드 카탈로그로 복귀한다.

## Verification

| Check | Command or Method | Result | Notes |
| --- | --- | --- | --- |
| Targeted tests | service store, public adapter, admin shell | PASS | 31/31 |
| Full regression | `npm test` | PASS | 632/632 |
| Build | `npm run vercel-build` | PASS | typecheck 및 SEO 포함 |
| DB privileges | Supabase routine privilege query | PASS | anon/authenticated false, service_role true |
| Production UI | `/admin/services` actual publish | PASS | cmdg published v1, draft 없음 |
| Public API | `/api/services` | PASS | source=published, 15건, 내부 필드 없음 |
| Audit | `admin_audit_events` | PASS | started/succeeded |
| Deployment | Vercel inspect/logs | PASS | Ready, umsh.kr, error log 0 |

## Reusable Success Pattern

관리 콘텐츠는 `draft 저장 → revision CAS → 별도 publish scope → 감사/멱등 명령 → DB 단일 트랜잭션 승격 → 공개 DTO allowlist 합성` 순서로 연결한다. 결제 필드와 라우팅 정본은 콘텐츠 payload에서 분리한다.

## Failure or Risk Prevention Rule

발행 payload 전체를 공개 응답에 전달하지 않는다. 공개 가능 필드만 검증 후 복사하고 저장소 실패에는 목업을 만들지 않는다. 코드상 비공개 상태는 콘텐츠 발행만으로 해제하지 않는다.

## Follow-Up

- T22 다음 slice에서 공지·FAQ·배너 등 `content_versions`의 편집/발행 흐름을 같은 경계로 구현한다.
- 이전 published가 존재하는 상태의 archive 전환 운영 실측은 다음 실제 개정 발행 때 확인한다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Redactions applied: 관리자 비밀번호·세션·토큰·서비스 키 값을 기록하지 않음
