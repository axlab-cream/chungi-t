# 회원별 대운 흐름과 공통 현실 기준

> **Execution:** Implement this plan as one local vertical slice. No migration, commit, push, or deployment is included.

## 목적

로그인한 회원이 저장된 전체 해석에서 해당 리포트가 계산할 때 만든 실제 `analysis.fortune.daewoon` 결과를 읽고, 현재 대운과 전체 대운 구간을 볼 수 있게 한다. 해석에 필요한 현실 조건은 리포트마다 다시 묻지 않고 회원 프로필에 한 번 저장해 공통으로 읽는다.

## 요구사항

- LF-01: 저장 전체 해석 API는 소유자가 조회한 경우에만 해당 회원의 공통 현실 기준을 함께 반환한다.
- LF-02: 공용 리더는 API의 실제 대운 10개와 현재 대운만 표시한다. 임의 나이, 운세 점수, 미래 사건, 삼재 계산값을 생성하지 않는다.
- LF-03: 프로필은 일·직장, 재물·보상, 관계·연애, 계획 기준을 선택적으로 저장·수정·삭제할 수 있다.
- LF-04: 공통 현실 기준은 프로필 JSONB payload에 저장한다. 새 테이블·마이그레이션은 만들지 않는다.
- LF-05: 기존 가입·프로필 클라이언트가 새 필드를 보내지 않으면 기존에 저장된 공통 현실 기준을 지우지 않는다.

## 데이터와 권한

- 원천: 저장 리포트의 `analysis.fortune.daewoon`, `analysis.fortune.currentDaewoon`, `analysis.fortune.currentYear`.
- 보조 데이터: `cheongi_user_profiles.profile_payload.life_context`.
- 읽기: 리포트 소유권 검사를 통과한 `/api/report/:reportId` 응답에만 포함한다.
- 쓰기: 로그인된 회원의 기존 `/api/user/profile` PUT 경로를 사용한다.
- 불변성: 저장 리포트 원문·계산 결과·다른 회원 데이터는 수정하지 않는다.

## 화면 흐름

1. 회원이 MY > 개인정보 수정에서 선택적인 현실 기준을 한 번 저장한다.
2. 이후 저장 해석을 열면 공용 리더가 대운 구간과 현재 위치를 실제 리포트 계산값으로 표시한다.
3. 저장한 현실 기준이 있으면 해당 값만 보이며, 없으면 프로필에서 한 번 등록하라는 링크만 보인다.

## 검증

- 프로필 저장소: life_context 직렬화·복원, 구형 클라이언트의 값 보존.
- 리더: 실제 fortune 배열만 렌더, 현재 구간 강조, 점수 예측 문구 없음.
- API: 원래의 `private, no-store` 응답·소유권 경계 유지.
- 품질: TypeScript, 집중 단위 테스트, diff 공백 검사, 로컬 브라우저 확인.

## 제외 범위

- DB migration, 원격 데이터 변경, 운영 배포, 기존 저장 본문 재생성.
- 만세력 엔진에 없는 삼재·재물운·직장운·연애운 점수 계산.
- 프로필 값을 자동으로 기존 LLM 원문에 주입하거나 과거 원문을 바꾸는 일.
