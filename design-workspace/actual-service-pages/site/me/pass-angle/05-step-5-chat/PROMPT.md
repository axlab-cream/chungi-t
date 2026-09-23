# 05 결과 목록·상담 허브 생성 프롬프트

## 역할

당신은 UMSH의 리포트 정보 구조 설계자, RAG 편집자, 목록형 상담 UX 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`와 KMS 검색 계약을 먼저 읽고, 결제 후 고객이 결과를 빠르게 훑고 원하는 항목을 고를 수 있는 05 목록 페이지를 만든다.

## 입력

```text
SERVICE_TITLE: {{서비스 제목}}
SERVICE_DESCRIPTION: {{분석 질문과 범위}}
SERVICE_CATEGORY: {{대분류}}
ANALYSIS_BASIS: {{계산 사실과 필요한 RAG 도메인}}
REPORT_ID: {{리포트 식별자}}
INTERPRETATION_INDEX_SEED: {{사용자가 제공했거나 01에서 확정한 대분류 > 중분류 풀이 리스트}}
REPRESENTATIVE_CHARACTER: `C:\Users\user\Desktop\운명상회 템플릿\IMAGE` 안의 대표 캐릭터 이미지
```

## 기준 화면과 연결

- 구조 기준: `C:\Users\user\Desktop\운명상회 템플릿\sample\05-step-5-chat\chat.html`
- 이 페이지는 긴 해석 본문을 처음부터 펼치는 곳이 아니라 `대분류 → 중분류 → 상세 풀이`로 들어가는 결과 목록이다.
- 항목 클릭: `../06-step-6_1-report-detail/index.html?section={{section_id}}#step-6_1-report`
- 상단 뒤로가기와 하단 입력창·상담 CTA 등 샘플의 공통 UX는 유지한다.

## 대표 캐릭터와 톤앤무드

- 대분류 대표 이미지와 목록 카드 썸네일은 `IMAGE`의 같은 대표 캐릭터를 공통 참조한다.
- 01·02·04에서 이어진 얼굴 인상, 헤어, 연령감, 의상 계열, 팔레트, 조명, 감정 톤을 유지한다.
- 목록의 대분류마다 장면·포즈·배경·소품만 바꿔 새 주제를 표현한다. 인물과 분위기가 서로 다른 카드가 되지 않게 한다.
- 이미지 안에는 목차명·해석 문장·가격·CTA를 넣지 않으며, `reference_status`와 `reference_image`를 manifest에 기록한다.

## KMS 기반 목록 생성

1. 사용자 질문과 이미 계산된 분석 데이터를 결합해 KMS에서 근거를 검색한다.
2. 서비스 도메인과 `writing_type`을 필터링한다. `TRAIT_INTERPRETATION`, `DICTIONARY`, `SITUATION_ADVICE`, `COUNSELING`을 서로 같은 말투로 섞지 않는다.
3. 승인본 우선 상위 5개 근거를 사용한다. 검색 결과가 낮거나 비어 있으면 목록을 억지로 채우지 않고 `추가 확인 필요` 상태를 표시한다.
4. `INTERPRETATION_INDEX_SEED`가 있으면 이를 `report_index.groups`의 1차 기준으로 사용한다. 항목을 임의로 삭제하거나 다른 서비스 목차로 바꾸지 않는다.
5. `INTERPRETATION_INDEX_SEED`가 없을 때만 새 서비스의 질문을 4~6개 대분류로 나누고, 각 대분류에 3~5개 중분류를 만든다. 비슷한 항목을 분량을 늘리기 위해 반복하지 않는다.
6. 각 항목은 `한 줄 예고`, `왜 필요한지`, `근거 ID`, `상세로 이동할 section_id`를 가진다. 상세 결론 전체를 목록에 노출하지 않는다.
7. 대분류 제목은 고객 언어로 쓰고, 전문 분석 요소는 보조 설명에서 쉽게 풀이한다.
8. 제공된 풀이 리스트가 서비스 제목·분류·분석 기준과 충돌하면 `QA_RESULT.scope_mismatch`에 기록하고 제작 전 확인이 필요한 상태로 둔다.

## 목록 카드 문구

- 첫 줄은 고객이 궁금해한 질문에 가깝게 쓴다.
- 예고 문구는 결론을 다 공개하지 않으면서도 무엇을 얻게 되는지 명확히 한다.
- `곧 공개`, `비밀`, `더보기`만으로 가치가 전달되지 않게 한다.
- 항목 CTA는 `이 항목 자세히 보기`, `내 흐름으로 읽기`처럼 목적을 말한다.
- 내부 용어·RAG·KMS·유사도 숫자는 고객 카드에 노출하지 않는다.

## 목록 상태와 권한

- 리포트가 없거나 만료됨: 새 분석·보관함·재시도 경로
- 분석 생성 중: 실제 상태와 일치하는 진행 문구
- 결제 권한 있음: 목록과 상세 접근
- 권한 없음: 목록의 허용된 티저만 노출하고 상세 API도 차단
- 네트워크 오류: 마지막 정상 목록을 유지하고 재시도
- `reportId`가 다른 사용자 것인 경우 서버 소유권·entitlement 검증 후 거부

## 이미지 산출물

- 대분류 대표 이미지 또는 카드 썸네일을 서비스 주제에 맞춰 새로 만든다.
- 기본 비율은 1:1 또는 샘플 카드 비율이며, 상세 결과를 가리지 않는 어두운 배경·명확한 alt를 사용한다.
- 이미지 안에 목차명·문장·가격을 넣지 않는다.
- 파일명은 `assets/generated/{{service_slug}}/05-{{section_id}}.webp` 형식이며 개인정보를 넣지 않는다.
- 목록에서 이미지 슬롯을 쓰는 대분류·중분류 항목은 각각 고유 `asset_key`를 가진다. 같은 이미지를 여러 카드에 재사용하지 않는다.
- `report_index`의 각 `asset_key`는 `image_manifest`와 1:1로 매칭한다.
- 대표 캐릭터 이미지는 공통 참조 이미지로만 사용한다. 카드 최종 이미지를 대신하는 용도로 재사용하지 않는다.
- 각 `image_manifest` 항목에는 `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- 이미지 생성 도구를 사용할 수 있는 환경에서는 실제 파일을 생성하고 목록 카드에 적용해야 완료로 처리한다.
- 이미지 생성 도구를 사용할 수 없는 환경이면 `generation_status: pending|blocked`, `file_exists: false`와 QA 사유를 남긴다.

## 실행 작업

1. 샘플 `chat.html`, `chat.js`, `immersive-chat.css`의 목록 렌더링과 클릭 이벤트를 읽는다.
2. 서비스별 `section_id`와 대분류·중분류를 생성한다.
3. KMS 근거를 항목별로 연결해 `report_index` 데이터를 만든다.
4. 목록 이미지 슬롯과 `image_manifest`를 확정하고, 이미지 생성 도구가 가능하면 실제 파일을 생성해 각 카드에 연결한다.
5. 목록 카드, 로딩, 오류, 권한 상태, 상세 링크를 구현한다.
6. 첫 항목 클릭, 다른 항목 클릭, 뒤로가기, 새로고침, 직접 section URL 접근, 이미지 로딩 실패 상태를 점검한다.

## 출력 형식

```json
{
  "service": {},
  "report_index": {
    "report_id": "",
    "source": "user_seed|rag_derived|scope_mismatch",
    "groups": [
      {
        "id": "",
        "title": "",
        "subtitle": "",
        "items": [
          {
            "section_id": "",
            "title": "",
            "preview": "",
            "evidence_ids": [],
            "asset_key": "",
            "route": ""
          }
        ]
      }
    ]
  },
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected|missing|ambiguous|invalid",
    "reference_image": "",
    "style_lock": [],
    "generation_policy": "same-character-new-scene"
  },
  "qa": []
}
```

## 실패 조건

- KMS 근거 없이 목차와 해석을 생성함
- 모든 서비스에서 같은 대분류·중분류를 복사함
- 목록 페이지에 상세 본문 전체를 노출함
- 권한 없는 사용자가 API나 직접 URL로 상세를 읽음
- 카드 클릭이 06_1의 실제 section_id와 연결되지 않음
