# 운명상회 관리자 Tone V2 원천 가시성 연결

## Observation

Tone V2 코퍼스와 서비스 프롬프트는 실제 생성·RAG 런타임에서 사용되고 있었지만, 관리자 `/admin/corpus`와 `/admin/prompts`는 공통 미구현 안내로 끝났다. 기존 운영 요약 API는 활성 코퍼스 팩 수와 지문만 제공해 어떤 가이드·퍼소나·생성 파일이 연결됐는지 확인할 수 없었다.

## Decision

관리자 전용 읽기 API가 배포 파일을 직접 읽어 안전한 메타데이터만 반환한다.

- 코퍼스: 레지스트리 버전, 지문, 정책, 활성 팩의 서비스 매핑·역할·경로·내용 해시
- 프롬프트: 생성 번들 버전, 원천 지문, `releaseReady`, 공통 규칙 파일, 기준 가이드, 20개 퍼소나·서비스 파일
- 원문 시스템 프롬프트와 파일 본문은 브라우저로 반환하지 않는다.
- `releaseReady=false`는 릴리스 완료로 꾸미지 않고 검수 진행 중으로 표시한다.

## Artifact

- `src/prompt/admin-snapshot.ts`
- `src/server/app.ts`
- `admin-ui/index.html`
- `vercel.json`
- `tests/unit/admin-shell.test.ts`
- `tests/unit/static-exposure.test.ts`

## QA result

- TDD RED: 관리자 로더 부재, 두 API 404 재현
- focused: 84/84 PASS
- full regression: 668/668 PASS
- typecheck and Vercel build: PASS
- static exposure default-deny: PASS
- authenticated browser visual QA: NOT_RUN because the isolated fork has no matching local admin account record

## Lesson

런타임 연결과 운영 가시성은 별도 계약이다. 실제 파일을 사용하더라도 관리자가 버전·지문·서비스 매핑을 볼 수 없으면 운영상 “연결되지 않은 것”과 구분할 수 없다. 반대로 가시성을 위해 원문 프롬프트를 노출할 필요는 없으며, 인증된 메타데이터와 내용 해시로 배포 정합성을 검증할 수 있다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-service-rag-copy-boundary-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-persona-contract-20260912.md`

## Next patch

승인된 커밋·배포 후 Production `/admin/corpus`와 `/admin/prompts`에서 배포 해시와 파일 목록을 확인한다. 전체 실제 출력 평가가 끝나기 전에는 `releaseReady`를 true로 바꾸지 않는다.
