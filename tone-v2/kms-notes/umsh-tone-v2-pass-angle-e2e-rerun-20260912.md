# 운명상회 Tone V2 pass_angle fresh E2E 재실행

## observation

- scene 경계 수정 후 고유 version을 먼저 조회했고 기존 레코드가 없었다.
- 합성 `pass_angle` 한 항목이 실제 OpenAI provider와 기존 최대 2회 재시도를 거쳐 격리 파일에 저장됐다.
- 두 응답 모두 directAnswer, grounding, scene은 PASS였다.
- 첫 응답은 2~4문장 문단 규칙과 nextCriterion을 실패했고, 두 번째 응답은 nextCriterion만 실패했다.
- 공개 section hook/body는 실패 정책에 따라 비어 있고 원문은 ignored 격리 레코드의 attempts에만 남았다.

## decision

- 증거 Task는 DONE이지만 business acceptance는 FAIL로 유지한다.
- scene 수정은 새 출력에서도 유효하다고 기록하되, 전체 P01이나 릴리스 성공으로 확대하지 않는다.
- 다음 Task는 두 번째 응답의 구체적 대상·행동 종결문을 좁게 진단하며, 포기성·일반 격려 반례를 유지한다.

## artifact

- `tone-v2/evaluations/P01-pass-angle-e2e-rerun-20260912.json`
- ignored record SHA-256 `1423900f1e5e74739e3dec8ba8cac58c3c1f826e7560ef12c3e949bfd1687a24`
- record id `d1d5fefcbf022006aec2aecf28f9`

## QA result

- focused related 59/59 PASS
- compiler/task 7/7 PASS
- full regression 674/674 PASS
- typecheck, Vercel build, saved-record replay, diff check PASS
- independent review initial Major 2 applied; closure re-review Approved, Critical/Major/Minor 0

## lesson

- 재시도 마지막 실패만 보지 말고 attempt별 density와 non-density 오류를 별도로 보존해야 원인을 과도하게 축소하지 않는다.
- 검수기 하나의 수정이 새 실제 출력에서 통과해도 저장 section이 complete가 아니면 제품 성공이 아니다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-pass-angle-e2e-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-review-session-scene-20260912.md`

## next_patch

- attempt 2의 `기록해`류 대상·행동이 nextCriterion으로 인정되지 않은 이유를 단일 Task에서 반례와 함께 진단한다.
- 20개 서비스 실제 출력 평가와 릴리스 부착은 여전히 미완료다.
