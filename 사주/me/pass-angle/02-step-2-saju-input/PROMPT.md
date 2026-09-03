# 02 신규 서비스 입력 폼 생성 프롬프트

## 역할

당신은 UMSH의 입력 설계자, UX 라이터, 폼 접근성 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 새 주제에 정말 필요한 입력만 받는 02 화면을 만든다.

## 입력

```text
SERVICE_TITLE: {{서비스 제목}}
SERVICE_DESCRIPTION: {{고객의 질문과 분석 범위}}
SERVICE_CATEGORY: {{대분류}}
ANALYSIS_BASIS: {{예: 도화·세운·배우자성, 주소·방향·지형 등}}
EXISTING_PROFILE_FIELDS: {{기존 사주 프로필에서 재사용 가능한 필드}}
INTERPRETATION_INDEX_SEED: {{01에서 전달된 대분류 > 중분류 풀이 리스트 또는 seed id}}
REPRESENTATIVE_CHARACTER: `C:\Users\user\Desktop\운명상회 템플릿\IMAGE` 안의 대표 캐릭터 이미지
```

## 기준 화면과 연결

- 구조 기준: `C:\Users\user\Desktop\운명상회 템플릿\sample\02-step-2-saju-input\index.html`
- 앞 단계: `../01-step-1-story/index.html#step-1-story`
- 다음 단계: 공통 로그인(필요 시) 후 `../04-step-4-report/index.html#step-4-report`
- 입력 후 로그인을 거치더라도 입력값·현재 서비스·유입 상태를 보존해 로그인 완료 후 복원한다.

## 대표 캐릭터와 톤앤무드

- 폼의 배경·보조 이미지가 있으면 `IMAGE`의 같은 대표 캐릭터를 참조한다.
- 01에서 사용한 얼굴 인상, 헤어, 의상 계열, 색감, 조명, 감정 톤을 유지하고 입력 주제에 맞는 자세·소품·배경만 바꾼다.
- 입력 필드와 가독성을 우선하며 캐릭터가 폼과 라벨을 가리지 않게 배치한다.
- 대표 이미지 상태를 `selected|missing|ambiguous|invalid` 중 하나로 기록한다.

## 입력 설계 규칙

1. 제목과 설명에서 분석에 필요한 사실을 먼저 분해한다. `필수`, `조건부 필수`, `선택`으로 구분한다.
2. 이미 로그인한 사용자의 완전한 기본 사주 프로필은 다시 묻지 않는다. 다른 사람 또는 다른 사주로 보기를 선택한 경우에만 추가 입력을 연다.
3. 주제가 1인 사주면 이름·성별·생년월일·출생시간·양력/음력·출생지 등 실제 계산에 필요한 필드를 기존 프로필 규칙에 맞춰 수집한다.
4. 궁합·결혼·상대방 마음처럼 2인 분석이면 본인과 상대방을 명확히 구분하고, 상대 입력 누락을 본인 정보로 채우지 않는다.
5. 풍수·주소 서비스면 주소, 건물·호수 범위, 사용 목적, 출입구·향 등 RAG와 지오코딩이 실제 요구하는 값만 수집한다. 모르는 값은 선택 입력으로 둔다.
6. 서비스 질문과 직접 관련 없는 설문은 추가하지 않는다. 입력 개수와 예상 소요 시간을 화면에서 알려준다.
7. 필드 라벨은 전문용어보다 사용자가 답하기 쉬운 말로 쓴다. 도움말에는 왜 필요한지 한 문장으로 설명한다.
8. 오류 문구는 원인을 말하고 수정 방법을 안내한다. 예: `출생 시간을 입력하면 시간 흐름까지 볼 수 있어요.`
9. 제출 버튼은 `내 정보로 확인하기`, `입력한 정보로 이어가기`처럼 다음 결과를 설명한다.
10. 이름·주소·생년월일은 이벤트 로그와 이미지 파일명에 기록하지 않는다.

## 로그인 복원 계약

- 로그인 전 임시 상태 키에는 `service_key`, 입력 스키마 버전, 비개인 진행 단계만 둔다.
- 개인정보는 URL query나 localStorage에 장기 보관하지 않는다. 운영에서는 서버 세션 또는 기존 인증 저장 방식을 따른다.
- 로그인 완료 뒤 원래 열었던 서비스와 단계로 돌아가고, 이미 입력한 값은 중복 질문 없이 확인 화면에서 보여준다.
- 로그인 취소·실패 시 입력 화면과 재시도 경로를 유지한다.

## 이미지·문구 산출물

입력 폼도 주제에 맞는 배경·보조 이미지가 필요하면 `image_manifest`를 만들고, 이미지 생성 도구를 사용할 수 있는 환경에서는 실제 파일 생성과 HTML 적용까지 완료한다.

- 이미지에는 텍스트를 넣지 않는다.
- 폼 입력을 방해하지 않는 4:5 또는 9:16 보조 이미지 1~2개를 기본으로 한다.
- `alt`는 장식이면 빈 문자열, 정보 전달이면 장면과 역할을 설명한다.
- 입력 안내 카피는 `무엇을`, `왜`, `얼마나`를 한눈에 보여준다.
- 파일명은 `assets/generated/{{service_slug}}/02-{{역할}}.webp` 형식이며 개인정보를 넣지 않는다.
- 대표 캐릭터 이미지는 공통 참조 이미지로만 사용한다. 입력 화면의 최종 배경·보조 이미지를 대신하는 용도로 재사용하지 않는다.
- 각 `image_manifest` 항목에는 `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- 이미지 슬롯을 HTML에 만들었다면 실제 파일이 존재하고 해당 selector에서 참조되어야 완료로 처리한다.
- 이미지 생성 도구를 사용할 수 없는 환경이면 `generation_status: pending|blocked`, `file_exists: false`와 QA 사유를 남긴다.

## 실행 작업

1. 샘플 폼의 컴포넌트, 상태, validation, back/next 이벤트를 읽는다.
2. 새 서비스용 `input_schema`와 조건부 필드 규칙을 작성한다.
3. 입력 UI, 도움말, 오류, 로딩, 로그인 복귀 문구를 주제에 맞춰 생성한다.
4. 필요한 이미지 슬롯과 `image_manifest`를 확정하고, 이미지 생성 도구가 가능하면 실제 파일을 생성해 HTML에 연결한다.
5. 제출 시 04 단계로 이어지는 payload 계약을 작성하고, `INTERPRETATION_INDEX_SEED` 또는 확정된 목차 식별자를 비개인 상태로 보존한다.
6. 클라이언트가 계산 사실·결제 권한·최종 풀이 목차를 단독 결정하지 않도록 한다.
7. 이름만 입력하고 제출, 필수값 누락, 기존 프로필 재사용, 로그인 복귀, 새로고침, 이미지 로딩 실패 상태를 점검한다.

## 출력 형식

```json
{
  "service": {},
  "input_schema": {
    "subject_mode": "single|pair|place|custom",
    "fields": [
      {
        "key": "",
        "label": "",
        "type": "text|date|time|select|address|radio",
        "required": true,
        "condition": "",
        "why_needed": "",
        "error_message": ""
      }
    ]
  },
  "interpretation_index_payload": {
    "source": "user_seed|rag_derived|scope_mismatch",
    "persist_keys": []
  },
  "copy": {
    "title": "",
    "helper": "",
    "submit_cta": "",
    "login_return": ""
  },
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected|missing|ambiguous|invalid",
    "reference_image": "",
    "style_lock": [],
    "generation_policy": "same-character-new-scene"
  },
  "next_route": "../04-step-4-report/index.html#step-4-report",
  "qa": []
}
```

## 실패 조건

- 이름·성별만으로 전체 사주 결과를 만들 수 있다고 가정함
- 모든 서비스에 같은 입력 폼을 복사함
- 이미 있는 프로필을 매번 다시 입력하게 함
- 로그인 후 원래 서비스·입력값을 잃음
- 입력값을 URL에 노출하거나 결제 권한 판단에 사용함
