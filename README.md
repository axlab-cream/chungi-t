# chungi_t — 천명대공(天命大公) 개인 사주 LLM 대화 엔진

**천명대공(天命大公) 대화 로직**을 별도로 개발하는 프로젝트입니다.

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

`vercel env pull .env --environment=production --scope ax-lab-cream`로 환경변수를
내려받을 수 있지만, Vercel sensitive 값은 로컬에서 빈 값으로 내려올 수 있습니다.
그 경우 `.env`의 `OPENAI_API_KEY`만 직접 채우면 됩니다.

## 배포 (Vercel)

현재 Vercel 프로젝트는 `ax-lab-cream/chungi-t`에 링크되어 있고, GitHub
`axlab-cream/chungi-t`의 `main` 브랜치 push가 Production 배포를 트리거합니다.

```bash
git status --short --branch
npm run typecheck
npm test
git push origin main
```

수동 배포가 필요할 때만 다음 명령을 사용합니다.

```bash
vercel --prod --scope ax-lab-cream
```

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

## 화면 흐름

1. **몰입형 사주 입력** (`/`) — 신당 입장 → 다단계 입력 → 타이트사주 스타일 결과
2. **천명대공(天命大公) 상담** (`/chat.html`) — OpenAI LLM 텍스트 상담

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
