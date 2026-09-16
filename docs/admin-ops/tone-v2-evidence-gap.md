# Tone V2 실호출 증거 현황과 남은 작업

최종 갱신: 2026-09-14 · 측정 주체: Cowork 세션 (릴리스·평가 JSON 실측)

---

## 한 줄 요약

20개 서비스 중 **7개**가 검증을 마쳤고 **13개**가 남았다.
남은 13개는 **512섹션 / 약 2,570만 토큰**의 실호출이 필요하다 — 자동화할 수 없고, 돈이 든다.

---

## 지금 상태 (릴리스 파일 실측)

| 서비스 | 섹션 | 풀 아웃라인 실호출 | 시각 증거 |
|---|---:|---|---|
| pass_angle | 52 | pass 52/52 | ○ |
| quit_fortune | 48 | pass 48/48 | ○ |
| saju_master | 37 | pass 37/37 | ○ |
| newyear_flow | 36 | pass 36/36 | ○ |
| lucky_color | 24 | pass 24/24 | ○ |
| wedding_day | 20 | pass 20/20 | ○ |
| today_fortune | — | 결정형 — 평가 비대상 | ✕ |
| **이하 13개** | | | |
| match_couple | 70 | 미실행 | ✕ |
| marry_match | 70 | 미실행 | ✕ |
| couple_signal | 70 | 미실행 | ✕ |
| job_choice | 57 | 미실행 | ✕ |
| cat_compatibility | 50 | 미실행 | ✕ |
| love_this_year | 48 | 미실행 | ✕ |
| money_save | 41 | 미실행 | ✕ |
| work_job | 21 | 미실행 | ✕ |
| love_mind | 21 | 미실행 | ✕ |
| love_again | 21 | 미실행 | ✕ |
| love_spouse | 21 | 미실행 | ✕ |
| home_fit | 12 | 미실행 | ✕ |
| work_move | 10 | 미실행 | ✕ |

---

## 이번에 고친 것 — 장부가 증거와 어긋나 있었다

두 서비스는 **이미 검증을 통과했는데 릴리스에는 안 한 것처럼 적혀 있었다.**

| 서비스 | 릴리스 게이트 | 실제 증거 |
|---|---|---|
| lucky_color | `not_run_for_2.1.0` | `status: pass`, 24/24 complete, replay 24 pass / 0 fail |
| quit_fortune | **키 자체가 없음** | `status: pass`, 48/48 complete, replay 48 pass / 0 fail |

두 증거 모두 `provider.actualCalls: true`, `recordSha256`·`acceptedProseSha256` 가 릴리스에 적힌
값과 정확히 일치하고, 독립 리뷰도 `approved_with_comments` 였다. 게이트 문자열만 갱신되지 않았다.

**증거 파일에서 계산해 게이트를 맞췄다.** 새로 돌리거나 지어낸 값이 아니다.

이 어긋남의 비용은 작지 않다 — 통과한 평가를 다시 돌리면 lucky_color 80만 토큰,
quit_fortune 276만 토큰을 그대로 다시 쓴다.

---

## 회귀 방지

`tests/unit/tone-v2-release-evidence-binding.test.ts` — 5 tests, 뮤테이션 7/7 감지.

| # | 고정하는 계약 |
|---|---|
| 1 | 증거가 붙어 있으면 게이트 문자열이 증거의 `completedSections/expectedSections` 와 정확히 같다 |
| 2 | 증거가 없으면 사유가 적혀 있고 게이트는 `not_run*`. 둘을 동시에 가질 수 없다 |
| 3 | 시각 증거 파일의 실제 해시가 릴리스에 적힌 값과 같다 |
| 4 | 두 증거 모두 `containsProviderProse: false` |
| 5 | 검증 완료 7개 서비스의 증거 연결이 끊기면 멈춘다 |

> 함정 하나: **이 저장소 파일은 CRLF 인데 릴리스에 적힌 해시는 LF 기준으로 계산돼 있다.**
> 원본 바이트로 재면 6개 전부 불일치로 나온다. 테스트는 줄끝을 맞춘 뒤 잰다.

---

## 남은 13개 — 비용 추정

측정된 5개 실호출(180섹션 / 9,037,079토큰)에서 **섹션당 평균 50,206토큰**.
재시도가 포함된 값이다 — quit_fortune 은 48섹션에 109회 시도(섹션당 2.27회)가 들었다.

| 서비스 | 섹션 | 예상 토큰 |
|---|---:|---:|
| match_couple | 70 | ~3,514,000 |
| marry_match | 70 | ~3,514,000 |
| couple_signal | 70 | ~3,514,000 |
| job_choice | 57 | ~2,862,000 |
| cat_compatibility | 50 | ~2,510,000 |
| love_this_year | 48 | ~2,410,000 |
| money_save | 41 | ~2,058,000 |
| work_job | 21 | ~1,054,000 |
| love_mind | 21 | ~1,054,000 |
| love_again | 21 | ~1,054,000 |
| love_spouse | 21 | ~1,054,000 |
| home_fit | 12 | ~602,000 |
| work_move | 10 | ~502,000 |
| **합계** | **512** | **~25,705,000** |

### 권장 순서

작은 것부터 붙여 하네스를 안정시키고, 큰 것은 그 뒤에 돌린다.

1. **work_move (10)** — 가장 싸다. 하네스와 증거 형식을 여기서 확정한다
2. **home_fit (12)**
3. **love_mind / love_again / love_spouse / work_job (각 21)** — 구조가 같아 한 번에 묶기 좋다
4. **money_save (41) → love_this_year (48) → cat_compatibility (50) → job_choice (57)**
5. **couple_signal / marry_match / match_couple (각 70)** — 마지막

### 실행에 필요한 것 (Cowork 에서 불가)

- `OPENAI_API_KEY` — 실호출이므로 키와 비용이 필요하다
- 격리 저장소 — `REPORT_STORAGE_DIR` 를 임시 경로로 잡아 고객 레코드를 건드리지 않는다
- 합성 입력만 사용 — `provider.syntheticOnly: true` 를 증거에 기록한다
- 실패 시 즉시 중단 — 첫 실패 이후 어떤 섹션도 시도하지 않는다(`attemptedAfterFailure: 0`)
- 독립 리뷰 — 기존 7건 모두 `independentReview` 를 기록했다

기존 하네스가 참고 기준이다: `scripts/check-saju-master-outline-live.ts`,
`scripts/qa-wedding-live-reader.ts`.
