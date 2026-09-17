# task-024 — 프로젝트 분석 · 외부 연동 점검 · 리뷰어 CLI 전환

- status: active
- active: true
- created: 2026-09-17
- owner: Claude (PM)

## 사용자 요청 원문

1. "그록으로 코드리뷰하자 코덱스는 리밋이다"
2. "우선 프로젝트 분석하자, 깃, 버셀, 수파베이스 모두 연동하고 위키와 연동해줘"

## Task 큐 (한 번에 하나만 실행)

| # | Task | 상태 | 비고 |
|---|------|------|------|
| T1 | 프로젝트 분석 + 연동 상태 실측 (git/vercel/supabase/wiki) | DONE | 이 런에서 실행 |
| T2 | Supabase CLI 재인증 + 프로젝트 link 복구 | BLOCKED | 브라우저 로그인 필요 — 사용자 실행 |
| T3 | Reviewer 역할을 Grok으로 전환 (`run-reviewer.ps1 -Cli grok`) | QUEUED | Codex rate limit 회피 |
| T4 | 미커밋 report-queue 교착 수정 마무리 (테스트 + 리뷰 + 커밋) | QUEUED | 작업 트리에 변경분 존재 |
| T5 | Auditor(Grok) 경로 정식 편입 — `run-auditor.ps1` 커밋 | QUEUED | 현재 untracked |

## T1 성공 기준

- [x] ProjectOps 코어 문서(goal/ROADMAP/status) 확인
- [x] git remote·브랜치·작업 트리 실측
- [x] vercel 연동 상태 실측
- [x] supabase 연동 상태 실측 (CLI / 런타임 분리 판정)
- [x] CreamWIKI 터널·토큰 신원 실측
- [x] 연동 결과를 `CreamAI/integrations/state.json`에 기록

## 리스크

- Supabase CLI 인증은 에이전트가 대신 수행할 수 없다(브라우저 로그인). 마이그레이션/db 작업은 T2 완료 전까지 BLOCKED.
- 작업 트리에 미커밋 소스 변경(report-queue 교착 수정)이 있어 다른 Task와 섞이면 diff 추적이 어려워진다.
