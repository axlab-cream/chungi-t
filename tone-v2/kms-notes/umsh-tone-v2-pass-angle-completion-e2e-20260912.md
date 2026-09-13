# 운명상회 Tone V2 pass_angle 단일 항목 완료 E2E

## observation

이전 저장 실패 응답의 결정적 재평가만으로는 실제 생성·재시도·저장 경로가 완료되는지 증명할 수 없었다. 고유 version의 합성 `pass_angle` 한 항목을 실제 provider로 실행하자 첫 시도는 nextCriterion에서 실패했고, 기존 교정 재시도는 전 검수를 통과해 새 레코드를 `complete`로 저장했다.

## decision

- fresh E2E는 provider 호출 전 `not-generated`를 확인하고 `--fresh`가 기존 레코드를 fail-closed로 거부한다.
- 생성 직후에도 저장소의 `created=true`를 요구한다.
- production 생성과 saved replay는 같은 `reviewGeneratedSajuReportSection`을 호출해 interpretation, tone copy, density, uniqueness, technical terms, score visuals, hook-required 검수를 동일하게 계산한다.
- 추적 증거에는 ID, 사용량, 해시, 짧은 판독 문장만 남기고 비밀키와 전체 원문은 남기지 않는다.

## QA result

- 신규 report/section `complete`; 공개 hook/body 비어 있지 않음
- saved full review PASS, density 4/4 PASS, record SHA-256 일치
- focused 35/35, related 61/61, compiler/task 7/7, full 676/676 PASS
- typecheck, Vercel build, fresh guard, diff check PASS
- 독립 재리뷰: 기존 Major 2건 해결, Critical/Major/Minor 0

## lesson

fresh E2E 성공은 고유 버전의 사전 부재, 실제 신규 생성, 완료 저장, production과 동일한 전수 검수 재생, 해시 불변성을 함께 증명해야 한다. 기존 실패 원문의 재평가나 일부 gate 재생만으로 대체하지 않는다.

## next_patch

`pass_angle` 전체 목차를 순서대로 생성하고 앞 항목 실패 시 중단되는지 검증한다. 이 한 항목 결과를 20개 서비스나 Production 릴리스 승인으로 확대하지 않는다.
