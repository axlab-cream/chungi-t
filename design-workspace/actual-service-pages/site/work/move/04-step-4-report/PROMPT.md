# 04 무료 결과·로그인·결제 후킹 생성 프롬프트

## 역할

당신은 UMSH의 전환 UX 기획자, UX 라이터, 리포트 요약 설계자다. `../00-SERVICE-GENERATION-CONTRACT.md`를 읽고, 직장 선택 서비스의 무료 결과와 결제 CTA를 만든다.

## 이번 서비스

```text
SERVICE_KEY: job_choice
SERVICE_SLUG: job-choice
SERVICE_TITLE: 자미두수로 보는 내가 선택한 직장 괜찮을까
SERVICE_CATEGORY: 직장운
PRICE_KRW: 9900
TARGET_QUESTION: 이 회사, 나랑 결 맞아?
INTERPRETATION_INDEX: 01 또는 02에서 전달된 10개 대분류 > 중분류 리스트
REPRESENTATIVE_CHARACTER: ../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png
```

## 기준 화면과 연결

- 구조 기준: `../sample/04-step-4-report/index.html`
- 앞 단계: `../02-step-2-saju-input/index.html#step-2-saju-input`
- 다음 단계: 결제 또는 권한 확인 후 `../05-step-5-chat/chat.html#step-5-chat`
- 샘플의 무료 결과 요약, 로그인/결제 상태, 하단 CTA 리듬은 유지하되 직장 선택 질문으로 교체한다.

## 무료 티저 설계

1. 무료 티저는 전체 결과의 10~15%만 보여주되, 결론을 완전히 숨긴 결제 압박으로 만들지 않는다.
2. 최소 구성은 `직장 선택 한 줄 방향 -> 강한 신호 1개 -> 조건 또는 시기 1개 -> 방해 요인 1개 -> 유료에서 열리는 항목`이다.
3. 첫 문장은 `이 회사가 지금 나에게 맞는지`에 답해야 한다.
4. 관록궁, 재백궁, 교우궁, 천이궁, 복덕궁, 운한 근거 중 실제로 확인된 것만 쓴다.
5. 유료 범위는 사용자가 제공한 10개 대분류를 기준으로 보여준다. `더 자세히` 같은 추상 표현만 쓰지 않는다.
6. 가격 `9,900원`, 결제 후 제공 범위, 취소/환불 안내 진입점을 CTA 가까이에 둔다.
7. 고객 화면에는 `RAG`, `KMS`, 내부 파일명을 보이지 않는다.

## 상태 분기

- 비로그인: 로그인 후 이 결과를 이어서 볼 수 있음을 안내하고 원래 리포트로 복귀한다.
- 로그인·미결제: 무료 티저 유지, 가격과 결제 CTA 제공.
- 결제 진행 중: 중복 주문 방지, 진행 상태 복구.
- 결제 성공·권한 있음: 결제창 없이 05 목록으로 이동.
- 결제 취소·실패: 무료 결과 유지, 재시도 CTA.
- reportId 없음·만료·분석 실패: 무한 로딩 금지, 보관함·새 분석·재시도 제공.

## 이미지 산출물

- 무료 결과 hero, 핵심 신호 카드, 결제 CTA 주변 이미지는 각각 고유 `asset_key`를 가진다.
- 파일명은 `assets/generated/job-choice/04-{{역할}}.webp` 형식이다.
- 이미지 안에 텍스트, 가격, 버튼을 넣지 않는다.
- 실제 이미지 파일을 생성하고 HTML에 적용한 경우만 `generation_status: generated`, `file_exists: true`로 기록한다.
- 각 manifest 항목에는 `html_usage_selector`, `alt`, `reference_image`, `reference_status`, `character_style_lock`, `generation_policy`를 기록한다.

## 출력 형식

```json
{
  "service": {},
  "teaser": {
    "headline": "",
    "summary": "",
    "signals": [],
    "paid_preview": []
  },
  "paid_scope_preview": {
    "source": "user_seed",
    "groups": []
  },
  "cta_states": {},
  "image_manifest": [],
  "character_reference": {},
  "next_route": "../05-step-5-chat/chat.html#step-5-chat",
  "qa": []
}
```

## 실패 조건

- 무료 결과가 근거 없는 확정 예언임
- 유료 범위에서 10개 대분류가 사라짐
- 결제 성공을 클라이언트 플래그로만 처리함
- 결제 실패·취소 시 무료 결과를 잃음
- 이미지 manifest와 실제 HTML 참조가 맞지 않음
