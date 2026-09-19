# Git·Vercel·Supabase 통합 상태 복구 패턴

## 문제

- 로컬 브랜치가 원격 기본 브랜치보다 뒤처진 상태에서 미커밋 운영 증거가 함께 남아 있었다.
- 서비스 목차 축소는 승인된 변경이었지만 CI 기대값과 고객 안내가 예전 항목 수를 유지해 CI가 실패했다.
- Supabase 런타임은 정상인데 로컬 migration 파일과 원격 migration history가 서로 달랐다.

## 안전한 해결

1. 미커밋 증거를 별도 로컬 백업 브랜치와 커밋으로 먼저 보존한다.
2. 기본 브랜치는 fast-forward만 하고, 깨진 보조 remote는 삭제하지 말고 기본 fetch 대상에서 제외한다.
3. Git 이력에서 목차 축소가 의도된 변경인지 확인한 뒤 런타임 TOC, CI 가드, 고객 안내, 구조화 데이터를 같은 숫자로 맞춘다.
4. 고객 안내는 항목 수뿐 아니라 표시되는 묶음 칩 수까지 회귀 테스트한다.
5. Supabase는 런타임 상태와 migration history를 별도로 판단한다. 원격 migration statements와 동일한 historical 파일만 복원하고, schema가 이미 존재하는 local-only migration은 history repair 후보로만 기록한다.
6. `migration repair`, `db push`, Git push, 배포는 백업·권한·롤백 게이트가 확인되기 전 실행하지 않는다.

## 검증

- TypeScript typecheck 통과.
- 단위 테스트 1,474개 통과.
- 서비스별 CI 가드, SEO, 20개 서비스 QA, Vercel build 통과.
- 운영 연동 점검 10개 통과, Vercel Production Ready 확인.
- Supabase migration inventory는 원격 전용 0, 원격과 일치 22, schema-present/history-missing 로컬 전용 8로 정리됐다.
- 변경 파일 비밀정보 패턴 검사 통과.

## 교훈

- 서비스 범위를 줄일 때 런타임 배열만 바꾸면 안 된다. CI 기대값, 소개 페이지 숫자, JSON-LD, 묶음 칩을 하나의 계약으로 검증해야 한다.
- Supabase가 정상 응답한다는 사실은 migration history가 정합하다는 뜻이 아니다.
- 원격 schema에 이미 존재하는 migration을 그대로 push하면 중복 DDL 위험이 있으므로, history repair는 독립된 승인 작업으로 다룬다.
