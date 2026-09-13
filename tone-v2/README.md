# 운명상회 Tone V2

독립 포크의 작업 결과입니다. 전체 서비스 교체 완료본이 아닙니다.

- 요구사항: PRD.md
- 순차 작업: PLAN.md
- 실제 검증·미완료: STATUS.md
- 원본 ZIP 내용: source/
- 생성된 공통 규칙·20개 페르소나: generated/
- 코퍼스 정적 점검: corpus-review/audit.json
- 전체 테스트 실행 기록: full-test.log (627 PASS)

```powershell
node tone-v2/compile.mjs
node --test tone-v2/compile.test.mjs
node tone-v2/audit-corpus.mjs
npm test
npm run typecheck
node tone-v2/check-release.mjs
```

마지막 명령은 현재 NOT READY로 종료합니다. 원본 전체 목차·외부 검수 자료, 신규 코퍼스 의미 검수, 기존 템플릿 대체, 실제 생성·화면·인쇄 검증이 남아 있습니다.

이 포크의 시스템 프롬프트는 generated/를 읽으며 기존 prompts/로 되돌아가지 않습니다. 기존 자료는 비교용으로 남아 있습니다. 실제 리포트 템플릿·티저·일부 후처리는 아직 기존 구현이므로 서비스에 부착하지 마십시오.
