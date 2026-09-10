# chungi_t — 천명사주 개인 사주 LLM 대화 엔진

**천명사주 대화 로직**을 별도로 개발하는 프로젝트입니다.

## 연결 상태

- GitHub origin: `https://github.com/axlab-cream/chungi-t.git`
- GitHub upstream: `https://github.com/jaeyong-planner/chungi-t.git` (fetch only)
- Vercel: `ax-lab-cream/chungi-t`
- Production: `https://chungi-t.vercel.app/`
- Supabase: `axlab-os/chungi-t` (`wdyzollywccgaepjeynu`, `ap-northeast-2`)
- Local Vercel link: `.vercel/project.json`에서 관리하며 Git에는 올리지 않습니다.

## 기능

- **사주팔자 계산**: 생년월일시 → 년·월·일·시주
- **명리학 분석**: 일간, 오행, 십신, 용신 추정
- **RAG 검색**: 사주·명리학 코퍼스에서 질문+개인 사주 기반 지식 검색
- **LLM 프롬프트 생성**: 개인 사주 + RAG + 캐릭터 페르소나 조합

## 빠른 시작

```bash
cd C:\Users\user\Desktop\chungi-t
npm install
cp .env.example .env   # OPENAI_API_KEY 입력
npm start
```

브라우저에서 **http://localhost:8790** 접속

## 환경변수 동기화 (검증된 절차)

`src/env/load.ts`는 `.env`를 먼저 읽고 `.env.local`을 `override: true`로 덮어씁니다.

> **`vercel env pull .env` / `vercel env pull .env.local`을 쓰지 마세요.**
> 이 프로젝트의 모든 비밀값은 Vercel에서 Sensitive로 설정되어 있어 pull 시
> `KEY=""` 빈 값으로 내려옵니다. `.env.local`이 override로 이기기 때문에
> 정상 동작하던 `OPENAI_API_KEY`가 조용히 비워집니다.
> 게다가 `vercel env pull`은 병합이 아니라 **파일 전체를 다시 씁니다** —
> 손으로 추가한 줄은 다음 pull에서 사라집니다.

권장 절차: 저장소 밖으로 받아 이름만 비교한 뒤 필요한 값만 손으로 옮깁니다.

```bash
# 1) 저장소 밖 임시 파일로 받는다 (.env는 건드리지 않는다)
vercel env pull "$TEMP/vercel-dev.env" --environment=development --yes

# 2) 값이 아니라 이름과 빈 값 여부만 비교한다
#    (값을 터미널에 출력하지 않는다)

# 3) 비어 있지 않은 값만 .env에 손으로 옮긴다
```

pull로 받을 수 있는 값과 대시보드에서만 얻는 값:

| 구분 | 변수 |
| --- | --- |
| `vercel env pull`로 획득 가능 | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_*_PROVIDER`, `SUPABASE_GOOGLE_CLIENT_ID`, `PUBLIC_BASE_URL`, `UMSH_ADMIN_EMAILS` |
| Sensitive — 항상 빈 값, 손으로 입력 | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INICIS_MID`, `PUNGSU_DATASET_API_BASE`, `PUNGSU_API_KEY` |
| Vercel에 아예 없음 | `INICIS_SIGNKEY`, `DATABASE_URL`, `PAYMENT_TEST_MODE`, `REPORT_OPENAI_MODEL`, `REPORT_STORAGE_DIR` |

로컬에서 결제·유료 리포트 흐름까지 확인하려면 실제 이니시스 키 없이
`PAYMENT_TEST_MODE=1`을 `.env`에 넣습니다 (`NODE_ENV=production`에서는 무시됨).

## 배포 (Vercel)

> **기본 배포 경로는 `main` push입니다. CLI Production 배포는 예외입니다.**
>
> 1. **`main` push → 자동 배포** (기본 경로). 2026-09-10 확인 기준으로 GitHub
>    `axlab-cream/chungi-t`가 Vercel 프로젝트에 연결되어 있고, 관측한 `main` push는
>    Production 배포를, 관측한 브랜치 push는 Preview 배포를 만들었습니다.
> 2. **`vercel deploy --prod` CLI** — 로컬 작업 트리를 **Git 상태와 무관하게** 그대로
>    올립니다. `main`에 없는 소스가 운영이 될 수 있습니다.
>
> 2026-09-10에 서로 다른 두 로컬 소스가 각각 운영에 올라가, 나중 배포가 앞선 배포의
> 공개 SEO·FAQ·about 페이지를 404로 만든 일이 있었습니다.
> 기록: `docs/admin-ops/production-state-20260910-1511.md`
>
> **규칙: CLI Production 배포는 승인된 긴급 복구 예외로만 씁니다.**
> 쓴 경우 직후에 같은 커밋을 `main`에 push해 원격과 운영을 일치시키고, 그 사실을
> `status.md`에 남깁니다.
>
> **주의: 이 규칙을 자동으로 강제하는 장치는 없습니다.** 아래 게이트는 수동 preflight일
> 뿐이며 `vercel deploy --prod`를 차단하지도, 원격 배포 산출물을 검증하지도 않습니다.

### 배포 절차 (권장 경로)

```bash
# 1) 배포 전 게이트. 작업 트리가 깨끗하고 HEAD가 방금 fetch한 origin/main을
#    포함하는지 검사한다. 실패하면 push하지 않는다.
npm run check:production-source

# 2) 회귀 기준
npm run typecheck
npm test

# 3) push — 이것이 배포를 만든다
git push origin HEAD:main

# 4) 배포 후 검증
npm run check:integrations
```

### 왜 게이트를 먼저 돌려야 하는가

Git 연동이 있어도 **CLI 배포가 그것을 우회할 수 있습니다.** 또 여러 사람이 각자
브랜치에서 작업하면 `main`에 먼저 올린 쪽이 기준이 됩니다.
`check:production-source`가 "HEAD가 방금 fetch한 `origin/main`을 포함하는가"를 요구하는
이유가 이것입니다. 이 검사를 건너뛰면 다른 사람의 작업이 빠진 소스를 올릴 수 있습니다.

**이 게이트의 한계를 스크립트 자신이 밝힙니다** (`scripts/check-production-source.mjs`):

> Manual preflight only: this command does not intercept other deploys or verify a
> remote deployment artifact.

즉 **다른 경로의 배포를 막지 못하고 배포된 산출물도 검사하지 않습니다.**
push 전에 사람이 실행해야만 효력이 있습니다.

### 배포 소스를 확인하는 방법

```bash
vercel inspect <배포 URL> --scope ax-lab-cream
```

**단일 신호로 판정하지 마세요.** target, git 관련 메타데이터, Aliases, 생성 시각을
저장소의 push 기록과 **함께** 대조합니다.

- 이 프로젝트에서 관측한 연동 배포(`dpl_42Ckhx…`)는 Aliases에
  `chungi-t-git-main-ax-lab-cream.vercel.app`를 가졌습니다.
- git 메타데이터 부재는 CLI 배포와 양립하지만 **그것만으로 배포 경로를 확정하지 못합니다.**
- 경로가 불확실하면 정적 파일 마커나 API 응답을 커밋과 비교해 소스를 추정합니다.

### 브랜치 기준

- `origin/main`이 배포 기준이자 통합 기준입니다.
- 로컬 `main` 브랜치는 2026-09-02에 갈라진 낡은 라인입니다. **쓰지 마세요.**
  그 브랜치의 `data/pungsu/**`와 `src/pungsu/home-service.ts`는 현재 외부 풍수
  API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 코드에서 참조되지 않습니다.
## 환경 변수

Vercel Dashboard -> `ax-lab-cream/chungi-t` -> Settings -> Environment Variables에
Production, Preview, Development 기준으로 등록합니다.

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |
| `OPENAI_MODEL` | (선택) 기본 `gpt-4o-mini` |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_ANON_KEY` | 레거시 anon key 호환용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 결제 주문 저장에 필요 (RLS 우회) |
| `PUBLIC_BASE_URL` | 결제 return/close URL 기준 도메인 |
| `INICIS_MID` | KG이니시스 상점 ID |
| `INICIS_SIGNKEY` | KG이니시스 SignKey (서버 전용) |
| `UMSH_ADMIN_EMAILS` | (선택) 결제 없이 풀이를 여는 관리자 이메일 |

## 결제 연동 순서

결제는 **이니시스 설정과 주문 저장소가 모두 준비돼야** 열립니다
(`src/server/app.ts`의 `paymentConfigPayload`). 저장소 없이 MID만 넣으면
서버리스 인스턴스가 요청마다 초기화되어 승인 콜백이 주문을 찾지 못하므로,
아래 순서를 지켜야 합니다.

1. **주문 테이블 생성** — Supabase SQL Editor에서 `supabase-payment-orders.sql` 실행
2. **저장소 키 등록** — `SUPABASE_SERVICE_ROLE_KEY`(또는 `DATABASE_URL`)를 Vercel에 추가
3. **이니시스 키 등록** — 심사 완료 후 `INICIS_MID`, `INICIS_SIGNKEY` 추가
4. **재배포 후 검증** — `npm run check:integrations`

## 연동 검증

Git·Vercel·Supabase·결제 배선을 한 번에 점검합니다.

```bash
npm run check:integrations
```

기본 대상은 `https://umsh.kr`이며 `--base`로 바꿀 수 있습니다.
필수 항목이 하나라도 실패하면 종료 코드 1을 반환하므로 배포 게이트로 쓸 수 있습니다.

## 화면 흐름

1. **몰입형 사주 입력** (`/`) — 신당 입장 → 다단계 입력 → 타이트사주 스타일 결과
2. **천명사주 상담** (`/chat.html`) — OpenAI LLM 텍스트 상담

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/user/profile` | 로그인 사용자의 기본 사주 프로필 조회 |
| PUT/POST | `/api/user/profile` | 이름·생년월일·태어난 시간 저장 |
| GET | `/api/user/reports` | 로그인 사용자의 계정별 풀이 보관함 조회 |
| DELETE | `/api/user/reports/:reportId` | 로그인 사용자의 저장 풀이 삭제 |
| POST | `/api/today/fortune` | 저장 프로필 기반 오늘의 운세 생성 |
| POST | `/api/saju/analyze` | 사주 분석 |
| POST | `/api/chat` | LLM 상담 (OpenAI) |
| GET | `/api/health` | 서버 상태 |

브라우저 로그인은 Supabase 세션 저장을 사용하며, 앱 레벨에서 기기별 30일 유지 후 재로그인을 요구합니다. 이름, 성별, 생년월일, 태어난 시간은 `cheongi_user_profiles.user_id`에 저장되고 풀이 이력은 `cheongi_reports.user_id` 기준으로 PC/모바일에서 동기화됩니다.

## 사용 예시

```typescript
import { prepareConversation } from './src/index.js'

const result = prepareConversation({
  birth: {
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    gender: 'female',
    calendar: 'solar',
  },
  message: '올해 연애운이 궁금해요',
})

console.log(result.sajuAnalysis.summary)
console.log(result.messages) // → LLM API에 전달
```

## 코퍼스

| 파일 | 내용 |
|------|------|
| `data/corpus/myeongri-basics.json` | 사주·오행·십신·용신·대운 기초 |
| `data/corpus/saju-elements.json` | 천간·지지·오행 프로필 |
| `data/corpus/consultation-templates.json` | 직업·연애·운세·건강 상담 템플릿 |

## 아키텍처

자세한 내용은 [ARCHITECTURE.md](./ARCHITECTURE.md) 참고.

## 다음 단계

- [x] LLM API 어댑터 (OpenAI)
- [x] 대운·세운 계산 모듈
- [x] 벡터 임베딩 RAG 업그레이드
- [ ] 음력 변환 정확도 개선
