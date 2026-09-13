# 운명상회 Tone V2 첫머리·내부 필드 실제 출력 평가

## observation

- 합성 입력만 사용하는 격리 생성 도구로 격식체 `saju_master`, 해요체 `love_mind`, 반말체 `pass_angle`을 각 2회, 총 6개 모델 응답으로 검수했다.
- 모델은 `gpt-5.5-2026-04-23`이었고 운영 DB·결제·인증 데이터는 사용하지 않았다.
- 6개 응답 모두 첫 hook에서 해당 항목 질문에 직접 답했다. 제작 안내형 첫머리와 `concept`, `serviceKey`, `reportFeatures`, `scoring`, `debug` 등 내부 필드 노출은 0건이었다.
- 6개 응답은 한자 설명, 문단 밀도, 안전 경계 등 이번 범위 밖 검수에서 거부됐다. 따라서 전체 생성 성공으로 기록하지 않는다.

## decision

- ZIP-003-008, ZIP-003-009, ZIP-003-032는 프롬프트·정적 반례와 대표 3말투 실제 출력 증거를 확보했지만, 20개 서비스 전량 실제 출력 승인이 남아 있어 `IN_PROGRESS`를 유지한다.
- 이번 대표 출력 체크포인트만 PASS다. 전체 P01과 20개 서비스 전량 출력 평가는 계속 IN_PROGRESS이며, 다른 게이트 실패를 이번 세 규칙의 실패로 섞지 않는다.
- 현재 세 규칙에서 재현된 결함이 없어 런타임 정규식이나 프롬프트를 추가 수정하지 않는다.

## artifact

- `tone-v2/evaluations/P01-opening-internal-live-20260912.json`
- `tests/unit/tone-v2-generation.test.ts`
- `src/report/tone-v2-review.ts`
- `scripts/check-reading-live.ts`
- 평가 파일은 각 원시 응답의 SHA-256, prose SHA-256, 첫 3개 가시 문장, 결정적 스캔 결과, 모델·토큰·실행 명령·종료 코드를 보존한다.

## QA result

- `npx tsx --test tests/unit/tone-v2-generation.test.ts`: 29/29 PASS.
- 실제 모델 호출: 3서비스, 6시도 응답 확보. ZIP-003-008/009/032 각각 6/6 PASS.
- 전체 생성 완료: 0/6. 범위 밖 게이트 실패로 정확히 분리 기록.
- 독립 리뷰에서 ignored 캐시만으로는 장기 재현이 어렵다는 Major를 받아 위 추적 증거를 평가 파일에 추가했다.
- 저장된 원문·prose SHA-256을 격리 캐시에서 다시 계산한 검증은 6/6 PASS다.
- 전체 회귀는 668/668 PASS이며 typecheck, Vercel build, diff check도 PASS다.
- Antigravity 조사와 Claude fallback은 결과를 만들지 못해 `NOT_RUN (degraded)`이다. 조사 성공을 주장하지 않는다.

## lesson

- 생성 파이프라인 전체 상태가 failed여도 원시 시도 응답을 규칙별로 분리 판독하면 특정 계약의 실제 준수 증거를 잃지 않는다.
- 반대로 일부 규칙이 통과했다고 전체 출력이나 릴리스를 PASS로 올리면 안 된다.
- 내부 필드 스캔은 응답 envelope가 아니라 사용자가 실제로 보는 `hook + interpretation` prose에 적용해야 한다. envelope 자체를 스캔하면 정상 키 `interpretation`을 노출로 오판한다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-persona-contract-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-technical-terms-gate-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-safety-claims-gate-20260912.md`

## next_patch

- 범위 밖 실제 실패 중 가장 반복된 한 문장 복수 한자 설명/문단 밀도 오탐·실패를 다음 단일 이슈에서 판독한다.
- 20개 서비스 전량 실제 출력과 완성 리포트 의미 평가는 별도 P01 릴리스 게이트로 남긴다.
