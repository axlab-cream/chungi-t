# 운명상회 관리자 코퍼스·프롬프트 원천 목록

## Observation

런타임은 실제 코퍼스와 서비스 프롬프트 파일을 읽고 있었지만 관리자 두 메뉴에는 공통 미구현 안내만 표시됐다. 운영자는 배포된 파일의 버전과 변경 여부를 확인할 수 없었다.

## Decision

인증된 관리자에게만 현재 배포 파일의 안전한 메타데이터를 제공한다. 코퍼스는 레지스트리와 활성 팩을, 프롬프트는 공통·가이드 네 파일과 서비스 파일 20개를 나열한다. 원문은 보내지 않고 내용 해시로 배포 정합성을 확인한다.

## Artifact

- `src/prompt/admin-snapshot.ts`
- `src/server/app.ts`
- `admin-ui/index.html`
- `tests/unit/admin-shell.test.ts`

## QA result

- focused 29/29 PASS
- full regression 658/658 PASS
- Vercel build and typecheck PASS

## Lesson

실제 런타임 연결과 관리자 가시성은 별도 계약이다. 운영 화면은 목업 없이 원천 파일 메타데이터를 직접 읽되, 내부 시스템 프롬프트 본문은 브라우저로 노출하지 않아도 된다.

## Relation

- `personal/carrotcap/notes/umsh-admin-tone-v2-source-visibility-20260912.md`

## Next patch

T25 import·버전 저장소와 T27 프롬프트 버전 비교를 구현할 때 이 읽기 목록을 버전 엔티티와 연결한다.
