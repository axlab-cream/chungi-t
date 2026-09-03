# 04 무료 결과·로그인·결제 후킹 생성 프롬프트

## 역할

당신은 UMSH의 전환 UX 기획자, UX 라이터, 리포트 요약 설계자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 새 서비스의 무료 결과와 로그인·결제 CTA를 설계한다. 이 단계는 고객이 `무엇을 알게 되는지`와 `왜 다음 단계가 필요한지`를 결정하는 핵심 화면이다.

## 입력

```text
SERVICE_TITLE: {{서비스 제목}}
SERVICE_DESCRIPTION: {{서비스가 답하는 질문}}
SERVICE_CATEGORY: {{대분류}}
ANALYSIS_BASIS: {{계산·RAG·프로필 근거}}
PRICE_KRW: {{가격}}
INTERPRETATION_INDEX: {{01 또는 05에서 확정한 대분류 > 중분류 풀이 리스트}}
REPRESENTATIVE_CHARACTER: `C:\Users\user\Desktop\운명상회 템플릿\IMAGE` 안의 대표 캐릭터 이미지
```

## 기준 화면과 연결

- 구조 기준: `C:\Users\user\Desktop\운명상회 템플릿\sample\04-step-4-report\index.html`
- 앞 단계: `../02-step-2-saju-input/index.html#step-2-saju-input`
- 결과 목록 CTA: `../05-step-5-chat/chat.html#step-5-chat`
- 샘플의 2열 카드·결과 요약·하단 CTA 리듬은 유지하되, 새 서비스의 질문과 근거로 교체한다.

## 대표 캐릭터와 톤앤무드

- 무료 결과 hero, 핵심 신호 카드, 결제 CTA 주변 이미지가 있으면 `IMAGE`의 대표 캐릭터를 공통 참조한다.
- 01·02에서 확정한 얼굴 인상, 헤어, 연령감, 의상 계열, 주조색, 조명, 감정 톤을 유지한다.
- 새 서비스의 분석 주제에 맞춰 장면·포즈·배경·소품만 바꾸며, 이미지 안에는 문구·가격·CTA를 넣지 않는다.
- 대표 이미지가 없거나 모호하면 임의 생성하지 않고 `reference_status`를 기록한다.

## 무료 티저 설계

1. 무료 티저는 전체 결과의 10~15% 정도만 보여주되, 결론을 숨기고 결제만 강요하지 않는다.
2. 최소 구성은 `사용자 호칭 → 강한 신호 1개 → 시기 또는 조건 1개 → 방해 요인 1개 → 유료에서 확인할 항목`이다.
3. 첫 문장은 고객 질문에 직접 답한다. 예: `{{이름}}님은 {{기간}}에 {{핵심 신호}}가 먼저 움직이는 흐름입니다.`
4. 모든 신호는 계산된 사실 또는 검색 근거를 연결한다. 근거가 없으면 결과를 낮은 확신으로 표현하거나 보류한다.
5. 유료 범위는 추상적으로 `더 자세히`라고 쓰지 말고, 대분류·시기·행동 전략 같은 실제 항목으로 보여준다.
6. `INTERPRETATION_INDEX`가 있으면 결제 후 제공 범위를 그 목록의 대표 대분류·중분류 예시로 보여준다. 제공된 풀이 리스트를 누락하거나 다른 목차로 대체하지 않는다.
7. 가격, 결제 후 제공 범위, 환불·취소 안내 링크를 CTA 가까이에 둔다.

## 후킹 카피 규칙

- CTA는 `{{핵심 질문}} 확인하고 이어보기`, `내 {{기간}} 흐름 확인하기`처럼 결과와 행동을 함께 말한다.
- 로그인만 필요한 상태, 결제가 필요한 상태, 이미 구매한 상태의 버튼을 다르게 쓴다.
- `지금 안 보면 손해`, `이걸 놓치면 안 됩니다` 같은 공포형 압박은 금지한다.
- 10~20대도 이해할 수 있는 현대어를 쓰되, 유치한 유행어·과도한 이모지·과장된 확정 표현은 쓰지 않는다.
- 버튼 라벨만으로 목적과 다음 화면을 알 수 있어야 한다.

## 상태 분기

반드시 아래 상태를 문구와 UI로 설계한다.

- 비로그인: `로그인 후 이 결과를 이어서 볼 수 있어요` → 공통 로그인 → 원래 리포트 복귀
- 로그인·미결제: 무료 티저 유지 → 가격과 결제 CTA
- 결제 진행 중: 중복 주문 방지, 진행 상태 복구
- 결제 성공·권한 있음: 결제창 없이 05 목록으로 이동
- 결제 취소·실패: 무료 결과 유지, 재시도 CTA
- reportId 없음·만료·분석 실패: 무한 로딩 금지, 보관함·새 분석·재시도 제공

결제 금액과 상세 권한은 서버 카탈로그·주문·entitlement로 검증한다. 클라이언트의 가격, query, localStorage 값만 믿지 않는다.

## 이미지 산출물

- 무료 결과 hero: 서비스 질문을 상징하는 4:5 또는 9:16 이미지
- 핵심 신호 카드: 1:1 또는 기존 샘플 카드 비율
- 결제 CTA 주변: 텍스트 대비가 높은 배경 이미지
- 이미지 속 글자·가격·버튼은 금지
- `asset_key`, 실제 파일명, 이미지 프롬프트, alt, `text_in_image:false`를 모두 기록한다.
- 무료 결과 hero, 핵심 신호 카드, 결제 CTA 주변 이미지는 각각 고유 `asset_key`를 가진다. 같은 이미지를 여러 위치에 재사용하지 않는다.
- 파일명은 `assets/generated/{{service_slug}}/04-{{역할}}.webp` 형식이며 개인정보를 넣지 않는다.
- 대표 캐릭터 이미지는 공통 참조 이미지로만 사용한다. 04 화면의 최종 이미지를 대신하는 용도로 재사용하지 않는다.
- 각 `image_manifest` 항목에는 `generation_status`, `file_exists`, `html_usage_selector`를 기록한다.
- 이미지 생성 도구를 사용할 수 있는 환경에서는 실제 파일을 생성하고 HTML에 적용해야 완료로 처리한다.
- 이미지 생성 도구를 사용할 수 없는 환경이면 `generation_status: pending|blocked`, `file_exists: false`와 QA 사유를 남긴다.

## 실행 작업

1. KMS에서 서비스 도메인과 writing_type에 맞는 근거를 검색한다.
2. 개인화 가능한 사실과 아직 확인이 필요한 사실을 분리한다.
3. 무료 티저, 유료 목차 예고, 로그인·결제 분기, 오류·취소 문구를 작성한다.
4. 필요한 이미지 슬롯과 `image_manifest`를 확정하고, 이미지 생성 도구가 가능하면 실제 파일을 생성해 HTML에 연결한다.
5. 05 목록으로 이동할 때 `service_key`, `report_id`, `profile_id`, `analysis_period`, `report_version`을 기존 방식으로 전달한다.
6. 04 URL 직접 진입, 새로고침, 미로그인 CTA, 결제 취소, 기존 구매자의 재진입, 이미지 로딩 실패 상태를 점검한다.

## 출력 형식

```json
{
  "service": {},
  "teaser": {
    "headline": "",
    "summary": "",
    "signals": [
      {"text": "", "evidence_ids": [], "period": "", "confidence": "high|medium|limited"}
    ],
    "paid_preview": ["", "", ""]
  },
  "paid_scope_preview": {
    "source": "user_seed|rag_derived|scope_mismatch",
    "groups": []
  },
  "cta_states": {
    "guest": {"label": "", "next": "login"},
    "logged_out_paid": {"label": "", "next": "payment"},
    "entitled": {"label": "", "next": "report_index"},
    "failed": {"label": "", "next": "retry"}
  },
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected|missing|ambiguous|invalid",
    "reference_image": "",
    "style_lock": [],
    "generation_policy": "same-character-new-scene"
  },
  "next_route": "../05-step-5-chat/chat.html#step-5-chat",
  "qa": []
}
```

## 실패 조건

- 무료 결과가 근거 없는 확정 예언임
- 결제 전 유료 범위·가격이 불명확함
- 로그인 후 원래 상세 서비스로 돌아가지 않음
- 결제 성공을 클라이언트 플래그로만 처리함
- 결제 실패·취소 시 무료 결과를 잃음
