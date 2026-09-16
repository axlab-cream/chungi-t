# Closure Review — work_move corpus 2.1.0

- task: `task-tone-v2-p05-work-move-corpus-rag-release-candidate`
- decision: Approved with comments
- critical: 0
- major: 0
- minor: 0

## Review

- 사용자 확인 사실, 실제 문서, 서버 계산값, 확인되지 않은 회사 조건과 상징 해석을 분리했다.
- 구두 약속은 사용자가 보고한 발언으로만 취급하며 서면 근로조건이나 지급 보장으로 바꾸지 않는다.
- 회사 문화·기밀·조직 변화, 상사·동료의 의도와 채용 결과를 추정하지 않는다.
- 일간·오행·십신·대운·세운은 직업 적합도, 감당력, 합격, 연봉, 퇴사·입사 시점의 성패를 증명하지 않는다.
- 건강·괴롭힘·근로조건·계약·세금·재무 문제는 실제 기록과 의료·노무·법률·재무 지원을 우선한다.
- 모든 사례는 `가상 사례:`로 표시하고 입력되지 않은 준비 기간이나 횟수를 만들지 않는다.
- 신규 리포트만 2.1.0 후보를 사용하며 기존 저장 리포트는 2.0.0 스냅샷을 유지한다.
- 후보 해시 불일치 시 닫힌 상태로 실패하고 registry 기반 롤백 경로가 명시돼 있다.

## Verification

- focused: 8/8
- related: 153/153
- full: 815/815 (113 suites)
- typecheck: pass
- Vercel build: pass

## Comment

실제 공급자 출력 평가는 실행하지 않았으며 Production 배포와 고객 데이터 변경도 수행하지 않았다. 상태는 로컬 `candidate`이다.
