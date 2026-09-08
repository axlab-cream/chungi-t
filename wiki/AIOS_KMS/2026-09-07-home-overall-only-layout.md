# 전체 집 배치는 1번 총평에만 표시

요청: 침실·창·책상을 전 페이지에서 반복하지 않고 각 제목에 집중.

수정: 공통 대시보드는 home-fit-overall(또는 기본 총평)에서만 표시. 2~10번과 05목차에서는 기존 대시보드 제거. 생성 지침에도 전체 배치 설명은 1번에만, 나머지는 항목별 주제에만 답하도록 명시.

검증: 9개 주제/목차의 제거 회귀 검사 포함 관련 테스트 5개 통과, 프롬프트 검사 20서비스 통과.

한계: 기존 reportId의 저장 본문은 수정하지 않았다. 서버 조회 자격증명 미설정이며 인앱 브라우저 연결 재시도도 kernel assets 경로 오류로 실패했다. 기존 10개 본문 전수 재작성 완료가 아님.

## Deploy Result

- URL: https://chungi-hb1fpx718-ax-lab-cream.vercel.app
- Alias: https://umsh.kr
- Target: production
- Commit: eeccca4 + 미커밋 변경
- Framework: Express / Vercel Node function
- Status: READY. 운영 JS HTTP 200 및 총평 전용 조건 확인.
- Build Duration: 12초 / 전체 42초

## Post-Deploy Observability

- Error scan: 배포 후 조회.
- Drains: 미확인.
- Monitoring: 제한적 확인, 지속 모니터링 미검증.
