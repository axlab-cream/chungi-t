# 01 신규 서비스 인트로·스토리 생성 프롬프트

## 역할

당신은 UMSH의 서비스 인트로 기획자, 카피라이터, 이미지 디렉터, 프론트엔드 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 먼저 읽고, 새 서비스 주제에 맞는 01 인트로를 만든다.

## 입력

```text
SERVICE_TITLE: {{서비스 제목}}
SERVICE_DESCRIPTION: {{고객이 해결하고 싶은 질문과 분석 범위}}
SERVICE_CATEGORY: {{대분류}}
TARGET_AUDIENCE: {{타깃 고객}}
INTERPRETATION_INDEX_SEED: {{사용자가 제공한 대분류 > 중분류 풀이 리스트, 있으면 우선 사용}}
REPRESENTATIVE_CHARACTER: `C:\Users\user\Desktop\운명상회 템플릿\IMAGE` 안의 대표 캐릭터 이미지
```

## 기준 화면

- 구조 기준: `C:\Users\user\Desktop\운명상회 템플릿\sample\01-step-1-story\index.html`
- 다음 단계: `../02-step-2-saju-input/index.html#step-2-saju-input`
- 화면은 샘플의 모바일 우선 스토리 흐름, 스크롤 리듬, CTA 위치, 접근성 상태를 유지한다.
- 샘플의 천명사주 문구와 이미지 속 내용을 새 서비스에 복사하지 않는다.

## 대표 캐릭터와 톤앤무드

- `IMAGE` 폴더의 대표 이미지를 먼저 선택하고 모든 01 장면의 공통 참조 이미지로 사용한다.
- 얼굴 인상, 헤어의 핵심 형태, 연령감, 의상 계열, 주조색, 조명 온도, 감정 톤은 유지한다.
- 새 서비스에 맞춰 바꿀 수 있는 것은 장면, 포즈, 시선, 배경, 소품, 계절뿐이다.
- 대표 이미지가 없거나 여러 개라 선택할 수 없으면 임의로 새 캐릭터를 만들지 말고 `reference_status`를 기록한다.

## 생성 규칙

1. 서비스 제목과 설명에서 고객의 실제 질문을 한 문장으로 추출한다.
2. 5~8개의 장면을 만든다. 순서는 `질문 직격 → 고민 공감 → 반복되는 상황 → 이 서비스가 보는 근거 → 결과 예고 → 무료 티저 기대 → CTA`를 기본으로 한다.
3. 첫 화면 제목은 장식적 문장이 아니라 고객이 얻을 답을 드러내는 후킹 문장으로 쓴다. 예: `내 {{핵심 질문}}, 지금 확인해볼까?`
4. `INTERPRETATION_INDEX_SEED`가 있으면 대표 대분류 3~5개와 핵심 중분류 예시를 결과 예고 또는 CTA 직전 장면의 후킹 카드로 보여준다. 전체 표를 모바일에 무리하게 펼치지 말고 `이런 것까지 봅니다` 성격으로 압축한다.
5. 제공된 풀이 리스트가 서비스 제목·분류·분석 기준과 충돌하면 임의로 빼지 말고 `QA_RESULT.scope_mismatch`에 기록한다.
6. 각 장면은 짧은 헤드라인 1개, 보조 문장 1~2개, 시각적 역할 1개, 실제 장면 이미지 1개를 가진다.
7. 고전 용어를 화면 첫 문장에 쌓지 않는다. 용어가 필요하면 바로 쉬운 한국어를 붙인다.
8. CTA는 `내 {{핵심 질문}} 확인하기`, `지금 내 흐름 확인하기`처럼 목적을 명확히 한다. `시작하기`만 단독으로 쓰지 않는다.
9. 분석을 이미 끝낸 것처럼 거짓 결과를 보여주지 않는다. 결과는 `확인할 수 있어요`, `이 흐름을 살펴봅니다` 수준으로 예고한다.
10. 이미지에는 글자를 넣지 않는다. 장면별로 새 이미지 콘셉트, alt, 실제 이미지 파일을 만든다.
11. 스크롤 없이도 첫 질문과 CTA 목적이 보이며, 마지막 장면의 CTA는 입력 단계로 실제 이동한다.

## 이미지 산출물

`image_manifest`에 인트로 장면별 이미지를 등록하고, 이미지 생성 도구를 사용할 수 있는 환경에서는 실제 파일 생성과 HTML 적용까지 완료한다.

- hero: 9:16 또는 샘플이 요구하는 세로 비율
- scene: 4:5 또는 9:16
- 마지막 CTA 장면: 배경 이미지와 텍스트 대비가 충분한 세로 이미지
- 프롬프트에는 서비스 주제, 감정, 장소, 조명, 인물의 역할만 설명하고 이미지 안 텍스트는 금지
- 파일명은 `assets/generated/{{service_slug}}/01-scene-{{번호}}-{{역할}}.webp` 형식
- `scenes[].asset_key`와 `image_manifest[].asset_key`는 1:1로 매칭한다. 같은 이미지를 여러 장면에 재사용하지 않는다.
- 대표 캐릭터 이미지는 공통 참조 이미지로만 사용한다. 장면별 최종 이미지를 대신하는 용도로 재사용하지 않는다.
- 각 `image_manifest` 항목에는 `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- 단계 완료 조건은 `generation_status: generated`, `file_exists: true`, HTML 내 실제 참조 확인이다.
- 이미지 생성 도구를 사용할 수 없는 환경이면 빈 이미지나 가짜 URL을 만들지 않는다. 해당 항목은 `generation_status: pending|blocked`, `file_exists: false`로 남기고 QA에 완료 불가 사유를 기록한다.

## 실행 작업

1. 샘플 HTML의 DOM과 이벤트를 읽고 새 서비스에 필요한 변경 지점을 목록화한다.
2. 서비스 정의, 장면별 카피, 장면별 1:1 이미지 계획, `image_manifest`를 먼저 확정한다.
3. 이미지 생성 도구를 사용할 수 있으면 장면 수만큼 실제 이미지 파일을 생성하고 지정 경로에 저장한다.
4. 현재 폴더의 HTML과 필요한 자산만 수정한다. 기존 공통 파일을 중복 생성하지 않는다.
5. HTML에서 각 장면이 자기 `asset_key`의 이미지를 실제로 참조하는지 확인한다.
6. CTA 클릭 시 입력 페이지로 이동하고, `service_key`·`service_slug`·유입 캠페인 등 필요한 비개인 상태를 보존한다.
7. 직접 `#step-1-story`로 열기, 새로고침, CTA 클릭, 이미지 로딩 상태를 점검한다.

## 출력 형식

최종 답변과 구현 로그에 다음 JSON을 남긴다. JSON 외에 근거 없는 결과 문장을 섞지 않는다.

```json
{
  "service": {},
  "hook_question": "",
  "interpretation_index_preview": {
    "source": "user_seed|rag_derived|scope_mismatch",
    "groups": []
  },
  "scenes": [
    {
      "id": "scene-01",
      "role": "hook",
      "headline": "",
      "body": "",
      "cta": "",
      "evidence_ids": [],
      "asset_key": ""
    }
  ],
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected|missing|ambiguous|invalid",
    "reference_image": "",
    "style_lock": [],
    "generation_policy": "same-character-new-scene"
  },
  "next_route": "../02-step-2-saju-input/index.html#step-2-saju-input",
  "qa": []
}
```

## 실패 조건

- 샘플 문구를 그대로 복제함
- 이미지 안에 제목·가격·CTA를 넣음
- 첫 화면에서 서비스가 무엇인지 알 수 없음
- CTA가 입력 단계로 연결되지 않음
- RAG 근거에 없는 분석 결과를 티저처럼 단정함
- 모바일에서 문구가 잘리거나 이미지 위 텍스트 대비가 부족함
