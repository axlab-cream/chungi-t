# AIOS KMS 기록: chungi-t GitHub/Vercel 연결 점검

작성일: 2026-08-26  
상태: 부분 확인됨

## 요청

`https://chungi-t.vercel.app/` 프로젝트를 분석하고 GitHub와 Vercel 연결 상태를 정리한다.

## 확인 결과

| 영역 | 상태 | 근거 |
|---|---|---|
| Live site | 확인됨 | `https://chungi-t.vercel.app/` 첫 화면 제목은 `남부대공 · 사주` |
| Local Git | 확인됨 | 로컬 폴더 `C:\Users\USER\MCP\OneDrive\문서\ChatGPT\천기선생`은 `origin/main`을 추적 |
| GitHub repo | 확인됨 | `jaeyong-planner/chungi-t`, default branch `main`, HEAD `5b8f70544751c2839af9a8cbd7dff92ce2036f3a` |
| Vercel local link | 확인됨 | `.vercel/project.json` projectId `prj_83OG8hBV8JxhI10zAlbUVUXRpYV3`, orgId `team_l0ovcxd3Fv5NvzWfI2ltgPsA` |
| Vercel production | 확인됨 | deployment `dpl_AVnZZApiRgND7KrcqC1DTpb5Gr71`, alias `chungi-t.vercel.app`, status `READY` |
| Vercel env | 확인됨 | production `OPENAI_API_KEY`가 encrypted secret으로 존재 |
| Vercel-GitHub auto deploy | 최신화 필요 | `vercel git connect https://github.com/jaeyong-planner/chungi-t.git`가 repo admin/write 권한 요구로 실패 |

## 분석 요약

- 현재 운영 배포는 Vercel project `ax-lab-cream/chungi-t`에 올라가 있다.
- 최신 production deployment는 `source: cli`, `meta.actor: cursor-cli`로 기록되어 있어 GitHub push 기반 자동 배포가 아니라 CLI 배포로 판단된다.
- 로컬 작업 폴더는 GitHub 원격 `https://github.com/jaeyong-planner/chungi-t.git`와 연결됐고 `main` 브랜치를 추적한다.
- Vercel 로컬 링크는 생성됐으며 `.vercel`은 `.gitignore`에 추가됐다.
- Codex GitHub app 기준으로는 `jaeyong-planner/chungi-t`에 admin/push 권한이 확인되지만, Vercel CLI 계정의 GitHub 연결 권한은 별도라 자동 연결이 실패했다.

## 코드 구조

- `api/index.ts`: Vercel serverless entrypoint
- `src/server/app.ts`: Express app, static UI 서빙, `/api/health`, `/api/saju/analyze`, `/api/chat`
- `src/saju/*`: 사주 계산과 분석
- `src/rag/*`: RAG 검색과 임베딩 기반 보조 검색
- `src/conversation/*`: 시스템 프롬프트, 개인 사주, RAG, history 조합
- `사주/`: 정적 UI와 상담 화면

## 검증 결과

- `npm install`: 성공, audit 취약점 0건
- `npm test`: 15개 테스트 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- Live `/api/health`: `{ ok: true, openai: true }`
- Live `/api/saju/analyze`: 샘플 생년월일 분석 JSON 정상 반환

## 리스크와 후속 작업

1. Vercel Dashboard 또는 Vercel GitHub app에서 `jaeyong-planner/chungi-t` 저장소 접근 권한을 부여한 뒤 `vercel git connect https://github.com/jaeyong-planner/chungi-t.git --scope ax-lab-cream`를 재실행한다.
2. 결제 화면은 현재 데모 문구와 화면 전환만 있으며 실제 결제 모듈은 연결되지 않았다.
3. `src/server/app.ts`의 `cors()`는 전체 origin 허용이므로 운영 도메인 기준 제한 여부를 검토한다.
4. README의 로컬 경로 안내는 현재 작업 경로와 다르므로 문서 최신화가 필요하다.
