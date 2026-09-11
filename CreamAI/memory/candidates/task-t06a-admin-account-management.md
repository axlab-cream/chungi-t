# 운명상회 관리자 계정 실제 변경 — 2026-09-11

## Observation

`umsh_admin_accounts`에는 실제 관리자 계정, 활성 상태, revision이 이미 있었지만 설정 화면에서는 목록과 최초 bootstrap만 가능했다. 생성·비밀번호 변경·비활성화를 연결할 때 비밀번호와 민감 정보를 감사 원장에 남기지 않아야 한다.

## Decision

관리자 변경 API는 `settings:write` 범위를 요구하고, T06의 `executeAdminCommand`를 공통으로 사용한다. 감사·멱등 본문에는 이메일 또는 계정 식별자와 revision만 담고, 비밀번호는 서버에서 즉시 scrypt 해시로 변환해 `password_hash`로만 저장한다. 수정은 revision 조건 PATCH로 낙관적 동시성 제어를 사용하며, 자기 계정 비활성화는 차단한다.

## Verification

- `npm run typecheck` PASS
- focused admin tests: 33/33 PASS
- 저장소 테스트에서 POST와 PATCH 요청이 평문 비밀번호를 전송하지 않고 revision 조건을 갖는지 확인

## Reuse

새로운 관리자 쓰기 도메인은 화면별로 직접 DB를 갱신하지 말고 `executeAdminCommand`와 Idempotency-Key, audit ledger, receipt를 사용한다.
