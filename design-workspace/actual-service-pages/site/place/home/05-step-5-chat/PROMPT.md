# 05 결과 목록·상담 허브 생성 프롬프트

## 역할

당신은 UMSH의 리포트 정보 구조 설계자, RAG 편집자, 목록형 상담 UX 구현자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 결제 후 고객이 결과를 빠르게 훑고 원하는 항목을 고를 수 있는 05 목록 페이지를 만든다.

## 이번 서비스

```text
SERVICE_KEY: job_choice
SERVICE_SLUG: job-choice
SERVICE_TITLE: 자미두수로 보는 내가 선택한 직장 괜찮을까
SERVICE_CATEGORY: 직장운
TARGET_QUESTION: 이 회사, 나랑 결 맞아?
REPORT_INDEX_SOURCE: user_seed
INTERPRETATION_INDEX_SEED: ../00-SERVICE-GENERATION-CONTRACT.md의 10개 대분류 > 중분류 표
REPRESENTATIVE_CHARACTER: ../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png
```

## 기준 화면과 연결

- 구조 기준: `../sample/05-step-5-chat/chat.html`
- 이 페이지는 긴 해석 본문을 처음부터 펼치는 곳이 아니라 `대분류 -> 중분류 -> 상세 풀이`로 들어가는 결과 목록이다.
- 항목 클릭: `../06-step-6_1-report-detail/index.html?section={{section_id}}#step-6_1-report`
- 상단 뒤로가기와 하단 입력창·상담 CTA 등 샘플의 공통 UX는 유지한다.

## 목록 생성 규칙

1. `INTERPRETATION_INDEX_SEED`의 10개 대분류를 `report_index.groups`의 1차 기준으로 사용한다.
2. 대분류를 임의로 삭제하거나 성격사주/realme 목차로 바꾸지 않는다.
3. 화면 밀도 때문에 중분류를 접거나 탭으로 나눌 수는 있어도 대분류는 10개 모두 접근 가능해야 한다.
4. 각 중분류는 `section_id`, `title`, `preview`, `evidence_ids`, `asset_key 또는 visual_key`, `route`를 가진다.
5. 상세 결론 전체를 목록에 노출하지 않는다. 목록은 한 줄 예고와 이동 목적을 보여준다.
6. 고객 화면에는 `RAG`, `KMS`, 유사도 숫자, 내부 경로를 노출하지 않는다.
7. 관록궁, 재백궁, 교우궁, 천이궁, 복덕궁, 운한 근거를 항목별로 연결한다.
8. 근거가 약한 항목은 `추가 확인 필요` 상태를 남기고 억지로 단정하지 않는다.

## 이미지 산출물

- 대분류 대표 이미지 또는 카드 썸네일을 사용할 경우 카드마다 고유 `asset_key`를 가진다.
- 10개 대분류 카드를 이미지형으로 만들면 대분류별 썸네일 10개를 실제 생성한다.
- 파일명은 `assets/generated/job-choice/05-{{section_id}}.webp` 형식이다.
- 이미지 안에 목차명, 해석 문장, 가격, CTA를 넣지 않는다.
- 대표 캐릭터 이미지는 공통 참조로만 사용한다. 카드 최종 이미지를 대신하지 않는다.
- `report_index`의 각 이미지 `asset_key`는 `image_manifest`와 1:1로 매칭한다.
- 실제 파일이 존재하고 HTML에서 참조될 때만 `generation_status: generated`, `file_exists: true`로 기록한다.

## 출력 형식

```json
{
  "service": {},
  "report_index": {
    "report_id": "",
    "source": "user_seed",
    "groups": []
  },
  "image_manifest": [],
  "character_reference": {},
  "qa": []
}
```

## 실패 조건

- 10개 대분류 중 일부가 05 목록에서 접근 불가함
- KMS 근거 없이 목차와 해석을 단정함
- 목록 페이지에 상세 본문 전체를 노출함
- 권한 없는 사용자가 상세 API나 직접 URL로 본문을 읽음
- 카드 클릭이 06_1의 실제 `section_id`와 연결되지 않음
