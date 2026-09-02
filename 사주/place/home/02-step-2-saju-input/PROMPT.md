# 02 신규 서비스 입력 폼 생성 프롬프트

## 역할

당신은 UMSH의 입력 설계자, UX 라이터, 폼 접근성 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 직장 선택 풀이에 정말 필요한 입력만 받는 02 화면을 만든다.

## 이번 서비스

```text
SERVICE_KEY: job_choice
SERVICE_SLUG: job-choice
SERVICE_TITLE: 자미두수로 보는 내가 선택한 직장 괜찮을까
SERVICE_CATEGORY: 직장운
PRICE_KRW: 9900
TARGET_QUESTION: 이 회사, 나랑 결 맞아?
INTERPRETATION_INDEX_SEED: ../00-SERVICE-GENERATION-CONTRACT.md의 10개 대분류 > 중분류 표
REPRESENTATIVE_CHARACTER: ../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png
```

## 기준 화면과 연결

- 구조 기준: `../sample/02-step-2-saju-input/index.html`
- 앞 단계: `../01-step-1-story/index.html#step-1-story`
- 다음 단계: 공통 로그인 또는 프로필 확인 후 `../04-step-4-report/index.html#step-4-report`
- 입력 후 로그인을 거치더라도 입력값, 현재 서비스, 유입 상태, `INTERPRETATION_INDEX_SEED`를 보존한다.

## 입력 설계 규칙

1. 기존 로그인 프로필의 기본 사주 정보가 완전하면 다시 묻지 않는다.
2. 새 사주로 보기일 때만 이름 또는 호칭, 성별, 생년월일, 출생시간, 양력/음력, 출생지를 받는다.
3. 직장 선택 판단에 필요한 회사/오퍼 입력을 별도 섹션으로 받는다. 기본 필드는 `선택한 회사 또는 오퍼명`, `직무`, `근무 형태`, `출퇴근/근무지`, `연봉·조건 체감`, `입사 또는 결정 예정일`, `가장 찝찝한 포인트`다.
4. 회사명, 생년월일, 주소는 URL query와 장기 localStorage에 저장하지 않는다. 운영에서는 서버 세션 또는 기존 인증 저장 방식을 따른다.
5. 필수값은 사주 계산에 필요한 최소값과 직장 판단에 필요한 핵심값으로 제한한다.
6. 필드 라벨은 전문용어보다 사용자가 답하기 쉬운 말로 쓴다.
7. 오류 문구는 원인과 수정 방법을 같이 말한다.
8. 제출 버튼은 `입력한 정보로 직장 핏 보기`처럼 다음 결과를 설명한다.
9. 01에서 전달받은 10개 대분류는 `interpretation_index_payload`로 04까지 전달한다. 입력 폼에서 목차를 임의로 삭제하거나 다른 서비스 목차로 바꾸지 않는다.

## 이미지 산출물

- 입력 화면에 이미지 슬롯을 만들면 실제 파일을 생성해 HTML에 연결한다.
- 파일명은 `assets/generated/job-choice/02-{{역할}}.webp` 형식이다.
- 이미지 안에 텍스트, 가격, 버튼, 개인정보를 넣지 않는다.
- 각 manifest 항목에는 `generation_status`, `file_exists`, `html_usage_selector`, `reference_image`, `reference_status`, `character_style_lock`, `generation_policy`를 기록한다.
- 이미지 생성이 불가능하면 `pending|blocked`와 QA 사유를 남긴다.

## 출력 형식

```json
{
  "service": {},
  "input_schema": {
    "subject_mode": "single",
    "fields": []
  },
  "interpretation_index_payload": {
    "source": "user_seed",
    "persist_keys": []
  },
  "copy": {},
  "image_manifest": [],
  "character_reference": {},
  "next_route": "../04-step-4-report/index.html#step-4-report",
  "qa": []
}
```

## 실패 조건

- 직장 선택과 무관한 성격사주 입력 폼을 복사함
- 01의 10개 대분류 payload를 잃음
- 개인정보를 URL에 노출함
- 로그인 후 원래 서비스와 입력값을 잃음
- 이미지 슬롯이 있는데 실제 파일이나 manifest가 없음
