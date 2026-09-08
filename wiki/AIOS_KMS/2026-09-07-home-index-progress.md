# 집 풍수 목차: 실제 생성 진행률

문제: 완료된 리포트에도 내부 권한/단계 설명과 준비 안내가 표시됨.

수정: 내부 헤딩/하단 설명 삭제. 인증된 report.sections의 complete 개수만 progress 값으로 반영한다. pending/generating은 진행 중, failed는 완료에 포함하지 않고 별도 안내한다. 전체 완료 시 상태 영역 제거 및 PDF 버튼 활성화. 기존 1.8초 서버 갱신 흐름을 그대로 사용하며 임의 시간 기반 진행률 없음. PDF 저장 창 안내는 실제 클릭 후만 표시.

검증: home-progress 및 report-access-frontend 테스트 43개 통과. 타입 검사 통과. 운영 HTML 200, 내부 헤딩 제거, 최신 브리지/실제 count 계산 배포 확인. 인증된 개인 리포트의 브라우저 전 상태 재현은 미수행.

재사용: 완료 시 안내 숨김, 실패와 처리 중 분리, 전체 수 미확인 시 indeterminate progress 사용.

## Deploy Result

- URL: https://chungi-mt1b74368-ax-lab-cream.vercel.app
- Alias: https://umsh.kr
- Target: production
- Status: READY
- Commit: eeccca4 + 미커밋 작업 디렉터리
- Framework: Express / Vercel Node function
- Build Duration: 12초 / 전체 42초

## Post-Deploy Observability

- Error scan: 배포 직후 최근 5분 오류 로그 조회.
- Drains: 미확인.
- Monitoring: 운영 응답 점검, 지속 모니터링 미검증.
