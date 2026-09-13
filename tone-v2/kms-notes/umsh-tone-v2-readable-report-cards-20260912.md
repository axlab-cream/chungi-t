# 운명상회 Tone V2 §11 가독성·모바일 리포트 카드

## Context

공통 프롬프트 §11의 문장·단락·문법·구두점 규칙과 모바일 카드 계층을 기존 저장 리포트 흐름에 붙였다. 인증, 결제, 저장 스키마, 기존 완료 원문은 바꾸지 않았다.

## Reusable success pattern

1. 생성 지침과 저장 전 검수에 같은 2~4문장 단락 계약을 둔다.
2. Markdown 제목과 표 전용 블록은 산문 단락 검수에서 제외하되, 실제 산문 조각은 허용하지 않는다.
3. 새 원고는 마지막 의미 단락을 행동으로 예약한다.
4. 저장 화면은 hook을 `한 줄 답`, 중간 문단을 `근거`, 마지막 문단을 `행동`으로 표시한다.
5. 구조가 없는 레거시 한 문단은 `근거와 행동`으로 표시하여 의미를 발명하지 않는다.
6. hook이 본문 첫머리에 정확히 반복될 때만 중복을 제거한다.

## Prevention rules

- 한 문장 한 중심 생각은 정규식으로 증명할 수 없으므로 live/human 평가를 남긴다.
- 4개 이상 슬래시 항목은 URL·날짜 같은 정상 슬래시와 구분되는 최소 하한으로만 막는다.
- 판정문 마침표 규칙을 카드 라벨에 적용하지 않는다. 라벨은 마침표를 제거하고 가운뎃점으로 구분한다.
- 같은 체언형이라도 콘텐츠 역할을 먼저 판별한다. narrator hook은 `지금은 보류.`처럼 마침표를 유지하고, 시스템 라벨은 `관계 경고등 · 주의`처럼 마침표 없이 렌더링한다.
- 레거시 저장 데이터를 다시 쓰거나 마지막 문장을 임의의 행동으로 해석하지 않는다.

## Verification

- RED 5 failures reproduced, then focused frontend 44/44 and persistence 8/8 PASS.
- Typecheck PASS; Vercel build PASS.
- First full regression 666/667 exposed only a superseded five-sentence fixture; fixture updated to the new contract and final full regression 667/667 passed.
- Compiler/task coverage 7/7, typecheck, Vercel build, and diff check passed.
- Actual styled semantic-block visual inspection remains NOT_RUN because browser security policy blocked synthetic result injection into the authenticated reader.
