# 01 신규 서비스 인트로·스토리 생성 프롬프트

## 역할

당신은 UMSH의 서비스 인트로 기획자, 카피라이터, 이미지 디렉터, 프론트엔드 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 먼저 읽고, 이번 서비스의 01 인트로를 만든다.

## 이번 서비스

```text
SERVICE_TITLE: 자미두수로 보는 내가 선택한 직장 괜찮을까
SERVICE_CATEGORY: 직장운
SERVICE_SUBCATEGORY: 직장 선택 핏
SERVICE_PRICE_KRW: 9900
SERVICE_URL_HINT: me.umsh.kr/job-choice
SERVICE_KEY: job_choice
SERVICE_SLUG: job-choice
TARGET_QUESTION: 이 회사, 나랑 결 맞아?
INTERPRETATION_INDEX_SEED: ../00-SERVICE-GENERATION-CONTRACT.md의 10개 대분류 > 중분류 표
REPRESENTATIVE_CHARACTER: ../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png
```

`성격사주`, `남들은 모르는 내 본캐`, `realme` 문구와 데이터는 사용하지 않는다.

## 기준 화면

- 구조 기준: `../sample/01-step-1-story/index.html`
- 다음 단계: `../02-step-2-saju-input/index.html#step-2-saju-input`
- 샘플의 모바일 우선 스토리 흐름, 스크롤 리듬, CTA 위치, 접근성 상태를 유지한다.
- 샘플의 서비스명, 고객 이름, 사주값, 결과 문장, 이미지 속 문구를 복사하지 않는다.

## 생성 규칙

1. 첫 화면 제목은 `이 회사, 나랑 결 맞을까?`처럼 고객 질문에 직접 닿게 쓴다.
2. 5~8개의 장면을 만든다. 기본 순서는 `질문 직격 -> 고민 공감 -> 반복되는 상황 -> 이 서비스가 보는 근거 -> 풀이 리스트 예고 -> 무료 티저 기대 -> CTA`다.
3. 각 장면은 짧은 헤드라인 1개, 보조 문장 1~2개, 시각적 역할 1개, 실제 장면 이미지 1개를 가진다.
4. `INTERPRETATION_INDEX_SEED`의 10개 대분류는 01 후킹 또는 결과 예고 장면에서 모두 노출한다. 중분류는 모바일 가독성을 위해 축약할 수 있지만, HTML JSON에는 전체 중분류를 보존한다.
5. 풀이 리스트를 대표 3~5개만 보여주고 나머지를 숨긴 상태로 완료 처리하지 않는다.
6. RAG/KMS 근거는 고객 화면에 노출하지 않고, `RAG_EVIDENCE` JSON에만 남긴다.
7. 고전 용어를 화면 첫 문장에 쌓지 않는다. 관록궁, 재백궁 같은 용어가 필요하면 직장, 돈 흐름처럼 쉬운 말로 같이 쓴다.
8. CTA는 `내 직장 핏 확인하러 가기`처럼 다음 행동과 목적을 드러낸다.
9. 분석을 이미 끝낸 것처럼 거짓 결과를 보여주지 않는다. 결과는 예고와 확인 가능 범위로 표현한다.
10. 모바일에서 문구가 잘리거나 이미지 위 텍스트 대비가 부족하면 완료하지 않는다.

## 이미지 산출물

- 장면 수만큼 실제 이미지를 생성한다. 01의 모든 `scene.asset_key`는 `image_manifest.asset_key`와 1:1로 매칭한다.
- 파일명은 `assets/generated/job-choice/01-scene-{{번호}}-{{역할}}.webp` 형식이다.
- 이미지 안에 제목, 가격, CTA, 해석 문구를 넣지 않는다.
- 대표 캐릭터 이미지는 참조로만 사용한다. 각 장면 최종 이미지는 새로 생성한다.
- 각 manifest 항목에는 `reference_image`, `reference_status`, `character_style_lock`, `generation_policy`, `prompt`, `alt`, `text_in_image:false`, `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- `generation_status: generated`는 실제 파일이 존재하고 HTML에서 해당 selector로 참조될 때만 쓴다.
- 이미지 생성이 불가능하면 가짜 URL을 만들지 말고 `pending|blocked`와 QA 사유를 기록한다.

## 출력 형식

`index.html`과 `01-SERVICE-STORY-RESULT.json`에 아래 계약을 남긴다.

```json
{
  "service": {},
  "hook_question": "이 회사, 나랑 결 맞아?",
  "interpretation_index_preview": {
    "source": "user_seed",
    "groups": []
  },
  "scenes": [],
  "image_manifest": [],
  "character_reference": {},
  "next_route": "../02-step-2-saju-input/index.html#step-2-saju-input",
  "qa": []
}
```

HTML에는 `PROMPT_INPUT`, `INTERPRETATION_INDEX`, `RAG_EVIDENCE`, `IMAGE_MANIFEST`, `QA_RESULT` JSON 블록을 포함한다.

## 실패 조건

- `realme`, `성격사주`, `남들은 모르는 내 본캐`가 고객 화면에 남음
- 10개 대분류 중 일부가 01 후킹 화면이나 JSON에서 빠짐
- 같은 이미지를 여러 장면의 최종 이미지로 재사용함
- 이미지 파일이 없는데 manifest를 `generated`로 기록함
- CTA가 02 입력 단계로 연결되지 않음
