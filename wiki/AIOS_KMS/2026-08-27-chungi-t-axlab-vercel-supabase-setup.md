# chungi-t AxLab Git/Vercel/Supabase 연결 기록

## 범위

- 로컬 개발 경로: `C:\Users\user\Desktop\chungi-t`
- GitHub origin: `https://github.com/axlab-cream/chungi-t.git`
- GitHub upstream: `https://github.com/jaeyong-planner/chungi-t.git`
- Vercel project: `ax-lab-cream/chungi-t`
- Production URL: `https://chungi-t.vercel.app/`
- Supabase project: `axlab-os/chungi-t`
- Supabase ref: `wdyzollywccgaepjeynu`
- Supabase region: `ap-northeast-2`

## 실행 내용

1. `jaeyong-planner/chungi-t`를 `axlab-cream/chungi-t`로 fork.
2. 로컬 저장소 `origin`을 `axlab-cream/chungi-t`로 변경하고, 기존 저장소는 `upstream`으로 유지.
3. `upstream` push URL을 `DISABLED`로 설정해 원본 저장소 오푸시를 방지.
4. 운영 배포 브랜치였던 `codex/persona-tone-openai-chat`의 32개 커밋을 `main`에 fast-forward.
5. `origin/main`에 push해 Vercel Production 자동 배포를 검증.
6. Vercel 프로젝트를 `axlab-cream/chungi-t` GitHub 저장소에 연결.
7. Supabase 조직 `ztpswimpisbegwnpzxtc`에 `chungi-t` 프로젝트를 신규 생성.
8. Vercel Production, Preview, Development 환경에 Supabase env vars 등록.

## 검증

- `npm run typecheck`: 통과
- `npm test`: 39개 테스트 통과
- Vercel deployment: `Ready`
- Supabase project status: `ACTIVE_HEALTHY`
- Supabase security advisors: lint 없음
- Supabase performance advisors: Auth connection strategy 정보성 항목 1개

## 후속 작업

- Supabase를 실제 기능에 쓰기 전 테이블, RLS, API 권한 정책을 먼저 설계한다.
- 브라우저 클라이언트에서 직접 Supabase를 사용할 경우 public 노출 변수명과 RLS 정책을 별도로 정한다.
- 서버 전용 데이터 접근이 필요하면 service-role 키는 로컬/서버 비밀 저장소에만 두고 Git에는 절대 기록하지 않는다.
