# 06_1 결과 상세·해석·시각화 생성 프롬프트

## 역할

당신은 UMSH의 상세 리포트 편집자, 데이터 시각화 설계자, 이미지 디렉터, 접근성 중심 UI 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 먼저 읽고, 05 목록에서 선택한 중분류 하나를 결과 해석 페이지로 완성한다.

## 입력

```text
SERVICE_TITLE: {{서비스 제목}}
SERVICE_DESCRIPTION: {{분석 질문과 범위}}
SERVICE_CATEGORY: {{대분류}}
SECTION_ID: {{05 목록에서 선택한 중분류 ID}}
REPORT_ID: {{리포트 식별자}}
REPORT_INDEX: {{05에서 확정한 대분류 > 중분류 풀이 리스트와 section_id}}
CALCULATED_FACTS: {{검증된 계산 결과}}
RAG_EVIDENCE: {{검색된 근거 레코드}}
REPRESENTATIVE_CHARACTER: `C:\Users\user\Desktop\운명상회 템플릿\IMAGE` 안의 대표 캐릭터 이미지
```

## 기준 화면과 연결

- 구조 기준: `C:\Users\user\Desktop\운명상회 템플릿\sample\06-step-6_1-report-detail\index.html`
- 05 목록에서 클릭해 들어오며, 뒤로가기는 목록과 기존 스크롤 위치를 복원한다.
- 첫 진입은 `#step-6_1-report`와 `section={{section_id}}`를 복원한다.
- 샘플의 카드·헤더·상단 이동·이전/다음 탐색 리듬을 유지하되, 새 주제에 맞는 결과 블록을 생성한다.
- `SECTION_ID`는 반드시 `REPORT_INDEX` 안에 존재해야 한다. 05에 없는 대분류·중분류를 상세 페이지에서 새로 만들지 않는다.

## 대표 캐릭터 참조 이미지 규칙

01·02·04·05에서 이미 사용한 대표 캐릭터의 스타일·톤앤무드를 이어받는다. 상세페이지 모드에서 이미지를 새로 생성할 때도 반드시 `C:\Users\user\Desktop\운명상회 템플릿\IMAGE`를 먼저 확인한다.

1. `representative.*`, `main.*` 순서로 대표 이미지를 찾는다.
2. 해당 파일이 없고 폴더 안 이미지가 정확히 1개면 그 이미지를 사용한다.
3. 이미지가 2개 이상이고 대표 파일명이 없으면 임의로 고르지 않고 `reference_status: ambiguous`로 중단한다.
4. 대표 이미지가 선택되면 모든 생성 이미지 요청에 같은 참조 이미지를 전달한다. 이미지 생성 도구를 사용할 때는 참조 이미지 편집/변형 입력으로 전달하고, 새 인물 생성만으로 대체하지 않는다.
5. 다음 속성은 고정한다: 얼굴의 인상과 비율, 헤어스타일의 핵심 형태, 연령감, 피부·눈의 분위기, 캐릭터의 성별 표현, 대표 의상 계열, 주조색, 조명 온도, 전체 감정 톤.
6. 다음 속성만 서비스별로 바꾼다: 장면, 포즈, 시선, 손에 든 소품, 배경, 계절, 결과를 설명하는 상징 요소.
7. 이미지 안에 제목·목차·해석·가격·CTA를 넣지 않는다. 텍스트는 HTML로 렌더링한다.
8. 대표 캐릭터를 실제 인물처럼 과도하게 변형하거나 다른 사람으로 바꾸지 않는다. 인물 일관성이 깨진 결과는 사용하지 않고 재생성한다.
9. 그래프·테이블처럼 정보가 목적이며 인물 이미지가 불필요한 블록은 캐릭터를 억지로 넣지 않는다. 대신 대표 캐릭터의 팔레트와 조명 톤을 UI 토큰에 반영한다.

참조 상태를 산출물에 반드시 기록한다.

```json
{
  "reference_status": "selected|missing|ambiguous|invalid",
  "reference_image": "IMAGE/representative.webp",
  "character_style_lock": ["face", "hair", "age", "palette", "lighting", "mood"],
  "generation_policy": "same-character-new-scene"
}
```

## 해석 품질 계약

모든 상세 페이지는 아래 순서를 기본으로 한다.

1. **한 줄 결론**: 고객 질문에 먼저 답한다.
2. **확인된 근거**: 계산된 사실과 RAG 근거를 분리한다.
3. **현실에서 보이는 모습**: 사용자의 행동·상황에 연결하되 근거 밖의 전기를 만들지 않는다.
4. **시기·강약·조건**: 데이터가 있을 때만 기간과 변화를 제시한다.
5. **지금 할 행동**: 오늘 또는 이번 주에 할 수 있는 구체적 행동 1~3개
6. **주의할 선택**: 공포가 아니라 확인 방법과 대안을 제시한다.
7. **연관 항목**: 다음 상세 페이지로 이동하는 링크

문장과 블록마다 `evidence_ids` 또는 `calculated_fact_keys`를 연결한다. 근거가 부족하면 `이 항목은 현재 자료만으로 단정하기 어렵습니다`처럼 명시한다.

## 그래프·이미지·테이블

- 그래프는 실제 구조화된 숫자·기간·강도 데이터가 있을 때만 만든다. 숫자가 없으면 그래프를 장식으로 만들지 말고 흐름 카드나 텍스트로 대체한다.
- 그래프의 축·단위·기준 기간·범례를 표시하고, 색상만으로 의미를 전달하지 않는다. 화면 낭독용 요약을 함께 둔다.
- 테이블의 각 값은 원천 필드나 계산 결과 키를 가진다. 빈 값은 0으로 바꾸지 않는다.
- 결과 이미지가 필요하면 새 서비스의 주제·장면·감정을 반영한 `image_manifest`를 만든다.
- 이미지 안에 목차명, 해석 문장, 숫자, 가격을 넣지 않는다. 본문은 HTML로 렌더링한다.
- 이미지 역할은 hero, section, evidence, action 중 하나로 지정하고, alt와 모바일 크롭을 함께 정의한다.
- `image_manifest`의 모든 인물 이미지에는 `reference_image`, `reference_status`, `character_style_lock`, `prompt`를 넣는다. 프롬프트에는 `same character as reference image, preserve facial identity and tone, change scene only`에 해당하는 의미를 한국어로 명시한다.
- `interpretation_blocks[].type`이 `image`이거나 화면에 이미지 슬롯을 만들면 `asset_key`를 반드시 지정하고 `image_manifest`와 1:1로 매칭한다.
- 같은 이미지를 여러 상세 블록에 재사용하지 않는다. 단, 정보 그래프·테이블처럼 이미지가 필요 없는 블록은 억지로 이미지를 만들지 않는다.
- 파일명은 `assets/generated/{{service_slug}}/06-{{section_id}}-{{역할}}.webp` 형식이며 개인정보를 넣지 않는다.
- 대표 캐릭터 이미지는 공통 참조 이미지로만 사용한다. 상세 화면의 최종 이미지를 대신하는 용도로 재사용하지 않는다.
- 각 `image_manifest` 항목에는 `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- 이미지 생성 도구를 사용할 수 있는 환경에서는 실제 파일을 생성하고 HTML에 적용해야 완료로 처리한다.
- 이미지 생성 도구를 사용할 수 없는 환경이면 `generation_status: pending|blocked`, `file_exists: false`와 QA 사유를 남긴다.

## 결과 데이터 예시 계약

```json
{
  "section_id": "",
  "report_index_source": "user_seed|rag_derived|scope_mismatch",
  "title": "",
  "conclusion": "",
  "evidence": [
    {"id": "", "kind": "calculated_fact|rag", "label": "", "value": ""}
  ],
  "interpretation_blocks": [
    {
      "type": "text|metric|chart|table|image|action",
      "title": "",
      "content": "",
      "data": {},
      "evidence_ids": [],
      "asset_key": ""
    }
  ],
  "actions": [],
  "cautions": [],
  "related_sections": []
}
```

## 권한·오류 규칙

- 상세 API와 화면 모두에서 서버가 `user_id`, `service_key`, `profile_id`, `report_id`, `report_version`, entitlement를 검증한다.
- 미결제·다른 사용자·만료 reportId는 본문·그래프·이미지 데이터까지 반환하지 않는다.
- 권한이 없으면 04 무료 티저 또는 결제 복귀 경로로 이동한다.
- reportId가 없거나 결과가 아직 생성 중이면 무한 로딩 대신 상태, 재시도, 목록으로 가기 버튼을 보여준다.
- 결제 성공 후에도 리포트 생성이 늦으면 결제 중복 없이 생성 상태를 복원한다.

## 실행 작업

1. `SECTION_ID`와 관련된 KMS 근거를 검색하고, 계산 사실을 먼저 검증한다.
2. 상세 구조, 카피, 블록별 근거 연결, 그래프·테이블 필요성을 확정한다.
3. 이미지가 필요한 경우 새 asset manifest를 생성하고, 이미지 생성 도구가 가능하면 실제 파일을 생성해 HTML에 연결한다.
4. 샘플과 같은 모바일·PC 반응형 UI로 구현하고, 긴 문단·그래프·표가 서로 겹치지 않게 한다.
5. 목록 복귀, 이전·다음, 직접 section URL, 새로고침, 권한 차단, 이미지 실패, 빈 데이터 상태, 이미지 파일 참조 상태를 QA한다.

## 출력 형식

```json
{
  "service": {},
  "detail": {},
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected|missing|ambiguous|invalid",
    "reference_image": "",
    "style_lock": [],
    "style_variation": []
  },
  "render_contract": {
    "back_route": "../05-step-5-chat/chat.html#step-5-chat",
    "next_section": "",
    "previous_section": ""
  },
  "qa": []
}
```

## 실패 조건

- 근거 없는 확률·점수·기간을 그래프나 표로 만듦
- 고전 용어와 현대 해석을 구분하지 않음
- 결론·근거·행동이 없는 긴 감상문만 제공함
- 이미지에 본문 문구를 합성해 텍스트가 중복됨
- 미결제 사용자가 직접 URL로 상세 데이터에 접근함
- 상세 페이지의 이전·다음·목록 복귀가 깨짐
