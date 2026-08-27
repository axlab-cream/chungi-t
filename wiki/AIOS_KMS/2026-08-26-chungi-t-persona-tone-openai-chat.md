# AIOS KMS 기록: chungi-t 샘플 말투와 OpenAI 상담 연결 보강

작성일: 2026-08-26  
상태: 확인됨

## 요청

브라우저에서 선택한 결과 화면의 샘플 말투를 기준으로, 다른 사주를 입력해도 전체 서비스와 LLM 상담이 같은 남부대공 페르소나로 답하게 한다.

## 근거

| 영역 | 상태 | 근거 |
|---|---|---|
| 사용자 샘플 | 확인됨 | `수(水) 기운이 먼저 보입니다`, `직장고민 때문에 여기까지 왔군요`, `사주의 결부터 ... 풀어드리겠습니다` |
| 타이트사주 추출 문서 | 확인됨 | `사주/사주/teaser_korean_content.md`, `사주/사주/extracted_content.md` |
| 안전 기준 | 확인됨 | 기존 WIKI의 상담 품질평가 기준: 건강·법률·투자·미래 단정 금지 |
| OpenAI 연결 | 확인됨 | 로컬 `/api/chat`에서 GPT-5 호출 성공 |

## 적용 내용

- `prompts/system-prompt.md`: LLM 상담 말투를 샘플 기준으로 고정했다.
- `data/character.json`: 남부대공 캐릭터의 tone/style/sample phrase를 갱신했다.
- `src/saju/analyzer.ts`: 결과 화면 preview 문장을 `보입니다`, `왔군요`, `흐름이 보입니다` 계열로 변경했다.
- `사주/사주/index.html`: 결과 화면 하드코딩 문구와 CTA 설명을 같은 말투로 맞췄다.
- `사주/js/chat.js`, `사주/chat.html`: 상담 첫 멘트와 입력 placeholder를 샘플 말투로 맞췄다.
- `src/llm/openai-adapter.ts`: `OPENAI_MODEL=gpt-5`에서 `max_tokens` 오류가 나지 않도록 `max_completion_tokens`를 사용한다.
- `data/corpus/consultation-templates.json`: `직장고민`, `퇴사`, `버틸`, `옮길` 등을 career intent로 분류하도록 보강했다.

## 검증 결과

- `npm test`: 17개 테스트 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- 로컬 `/api/saju/analyze`: preview에 `흥미롭네요`, `기운이 먼저 보이고`, `흐름이 보입니다` 확인
- 로컬 `/api/chat`: `직장 고민 때문에 여기까지 오셨군요`, `사주의 결부터 보겠습니다`, `흐름이 보입니다` 말투로 GPT-5 응답 확인
- Vercel production 배포: `dpl_DVjtkzka3SjFpn8Je11Ucg44838n`, alias `https://chungi-t.vercel.app`
- Live `/api/health`: `{ ok: true, openai: true }`
- Live `/api/saju/analyze`: preview에 샘플 말투 반영 확인
- Live `/api/chat`: `intent: career`, `직장 고민 때문에 여기까지 오셨군요`, `일의 결부터 보겠습니다` 응답 확인

## 운영 메모

- 샘플 말투는 몰입감을 위해 쓰되, 확정 예언·질병 판단·수익 보장·법률 판단은 금지한다.
- Vercel-GitHub 자동 배포 연결은 아직 Vercel GitHub app 권한 이슈가 남아 있으므로, 권한 부여 전까지는 CLI production 배포로 반영한다.

## 2026-08-27 선택지 이미지 톤 보강

상태: 확인됨

사용자 피드백에 따라 사주 입력 플로우의 `본인/가족/연인/친구/기타` 선택지 이미지는 점잖고 정상적인 상담사 톤이 아니라, 차갑고 도시적인 `차도남 남부대공` 톤을 기준으로 한다.

- 시각 기준: 블랙 롱코트와 한복 실루엣의 결합, 붉은 연기, 도시 야경, 원형 사주 차트, 차가운 눈빛, 무심한 상담 제스처
- 말투 기준: 다정한 안내문보다 짧고 냉정한 판정형 문장
- 현재 리포트 본문은 `/assets/hero-mystic.png` 공통 이미지를 사용한다.
- 아래 선택지 이미지는 로컬 초안 asset이며, 현 코드/배포에는 적용하지 않는다.
  - `사주/assets/consultation-targets/target-self-cha-do-nam.png`
  - `사주/assets/consultation-targets/target-family-cha-do-nam.png`
  - `사주/assets/consultation-targets/target-lover-cha-do-nam.png`
  - `사주/assets/consultation-targets/target-friend-cha-do-nam.png`
  - `사주/assets/consultation-targets/target-other-cha-do-nam.png`

선택지별 말풍선 문구는 각각 `핑계는 됐고, 당신부터 봅니다`, `정 때문인지, 구조 때문인지 봅시다`, `좋아하는 것과 맞는 건 다릅니다`, `편한 사람인지, 필요한 사람인지 봅니다`, `말 못 한 쪽이 핵심입니다`를 기준으로 한다.
