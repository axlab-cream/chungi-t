# 06_1 결과 상세·해석·시각화 생성 프롬프트

## 역할

당신은 UMSH의 상세 리포트 편집자, 데이터 시각화 설계자, 이미지 디렉터, 접근성 중심 UI 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 05 목록에서 선택한 중분류 하나를 결과 해석 페이지로 완성한다.

## 이번 서비스

```text
SERVICE_KEY: job_choice
SERVICE_SLUG: job-choice
SERVICE_TITLE: 자미두수로 보는 내가 선택한 직장 괜찮을까
SERVICE_CATEGORY: 직장운
TARGET_QUESTION: 이 회사, 나랑 결 맞아?
SECTION_ID: {{05 목록에서 선택한 중분류 ID}}
REPORT_INDEX: 05에서 확정한 10개 대분류 > 중분류 리스트와 section_id
REPRESENTATIVE_CHARACTER: ../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png
```

## 기준 화면과 연결

- 구조 기준: `../sample/06-step-6_1-report-detail/index.html`
- 05 목록에서 클릭해 들어오며, 뒤로가기는 목록과 기존 스크롤 위치를 복원한다.
- 첫 진입은 `#step-6_1-report`와 `section={{section_id}}`를 복원한다.
- `SECTION_ID`는 반드시 `REPORT_INDEX` 안에 존재해야 한다. 05에 없는 대분류·중분류를 상세 페이지에서 새로 만들지 않는다.

## 해석 품질 계약

모든 상세 페이지는 아래 순서를 기본으로 한다.

1. 한 줄 결론: 고객 질문에 먼저 답한다.
2. 확인된 근거: 계산된 사실과 RAG 근거를 분리한다.
3. 현실에서 보이는 모습: 직무, 사람, 돈, 환경, 타이밍 중 해당 section에 맞춰 연결한다.
4. 시기·강약·조건: 데이터가 있을 때만 기간과 변화를 제시한다.
5. 지금 할 행동: 오늘 또는 이번 주에 할 수 있는 행동 1~3개.
6. 주의할 선택: 공포가 아니라 확인 방법과 대안을 제시한다.
7. 연관 항목: 05의 이전·다음 상세 페이지로 이동하는 링크.

문장과 블록마다 `evidence_ids` 또는 `calculated_fact_keys`를 연결한다. 근거가 부족하면 `이 항목은 현재 자료만으로 단정하기 어렵습니다`처럼 명시한다.

## 그래프·이미지·테이블

- 그래프는 실제 구조화된 숫자, 기간, 강도 데이터가 있을 때만 만든다.
- 숫자가 없으면 그래프를 장식으로 만들지 말고 흐름 카드나 텍스트로 대체한다.
- 테이블의 각 값은 원천 필드나 계산 결과 키를 가진다. 빈 값은 0으로 바꾸지 않는다.
- 이미지가 필요한 경우 `asset_key`를 만들고 `image_manifest`와 1:1로 매칭한다.
- 파일명은 `assets/generated/job-choice/06-{{section_id}}-{{역할}}.webp` 형식이다.
- 이미지 안에 목차명, 해석 문장, 숫자, 가격을 넣지 않는다.
- 실제 파일이 존재하고 HTML에서 참조될 때만 `generation_status: generated`, `file_exists: true`로 기록한다.

## 권한·오류 규칙

- 상세 API와 화면 모두에서 서버가 `user_id`, `service_key`, `profile_id`, `report_id`, `report_version`, entitlement를 검증한다.
- 미결제, 다른 사용자, 만료 reportId는 본문·그래프·이미지 데이터까지 반환하지 않는다.
- 권한이 없으면 04 무료 티저 또는 결제 복귀 경로로 이동한다.
- reportId가 없거나 결과가 아직 생성 중이면 무한 로딩 대신 상태, 재시도, 목록으로 가기 버튼을 보여준다.

## 출력 형식

```json
{
  "service": {},
  "detail": {
    "section_id": "",
    "report_index_source": "user_seed",
    "title": "",
    "conclusion": "",
    "evidence": [],
    "interpretation_blocks": [],
    "actions": [],
    "cautions": [],
    "related_sections": []
  },
  "image_manifest": [],
  "character_reference": {},
  "render_contract": {
    "back_route": "../05-step-5-chat/chat.html#step-5-chat",
    "next_section": "",
    "previous_section": ""
  },
  "qa": []
}
```

## 실패 조건

- 05 목록에 없는 section을 상세에서 새로 만듦
- 근거 없는 확률, 점수, 기간을 그래프나 표로 만듦
- 고전 용어와 현대 해석을 구분하지 않음
- 결론, 근거, 행동이 없는 긴 감상문만 제공함
- 이미지에 본문 문구를 합성해 텍스트가 중복됨
- 미결제 사용자가 직접 URL로 상세 데이터에 접근함
- 상세 페이지의 이전·다음·목록 복귀가 깨짐
