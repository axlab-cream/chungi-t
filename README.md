# chungi_t — 천기 선생님 개인 사주 LLM 대화 엔진

**천기 선생님 대화 로직**을 별도로 개발하는 프로젝트입니다.

## 연결 상태

- GitHub: `https://github.com/jaeyong-planner/chungi-t.git`
- Vercel: `ax-lab-cream/chungi-t`
- Production: `https://chungi-t.vercel.app/`
- Local Vercel link: `.vercel/project.json`에서 관리하며 Git에는 올리지 않습니다.

## 기능

- **사주팔자 계산**: 생년월일시 → 년·월·일·시주
- **명리학 분석**: 일간, 오행, 십신, 용신 추정
- **RAG 검색**: 사주·명리학 코퍼스에서 질문+개인 사주 기반 지식 검색
- **LLM 프롬프트 생성**: 개인 사주 + RAG + 캐릭터 페르소나 조합

## 빠른 시작

```bash
npm install
cp .env.example .env   # OPENAI_API_KEY 입력
npm start
```

브라우저에서 **http://localhost:8790** 접속

## 배포 (Vercel)

```bash
# Vercel 프로젝트 링크 후 CLI 배포:
vercel --prod
```

Vercel 프로젝트가 GitHub push 기반 자동 배포를 사용하려면 Vercel GitHub app에
`jaeyong-planner/chungi-t` 저장소 접근 권한을 부여한 뒤 다음 명령을 실행합니다.

```bash
vercel git connect https://github.com/jaeyong-planner/chungi-t.git --scope ax-lab-cream
```

**필수 환경 변수 (Vercel Dashboard → Settings → Environment Variables)**

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |
| `OPENAI_MODEL` | (선택) 기본 `gpt-4o-mini` |

## 화면 흐름

1. **몰입형 사주 입력** (`/`) — 신당 입장 → 다단계 입력 → 타이트사주 스타일 결과
2. **천기 선생님 상담** (`/chat.html`) — OpenAI LLM 텍스트 상담

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/saju/analyze` | 사주 분석 |
| POST | `/api/chat` | LLM 상담 (OpenAI) |
| GET | `/api/health` | 서버 상태 |

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
