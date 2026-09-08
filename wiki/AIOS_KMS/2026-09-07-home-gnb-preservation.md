# 집 풍수 공통 GNB 유지

원인: native home renderer가 권한 확인용 umsh-verified-layout 제거 시, 그 안에 이미 생성된 공통 GNB 호스트도 삭제했다. service-shell은 한 번 마운트하므로 빈 원래 자리에는 재생성되지 않았다.

수정: 04/05/06의 원래 root로 live top host를 먼저 이동하고 임시 래퍼를 제거한다. 새 헤더 복제 없이 기존 DOM/이벤트 유지. 반복 갱신 시 중복 생성 없음. 세 페이지의 브리지 캐시 버전 갱신.

검증: 3페이지 이동 순서/반복 렌더 단위 검사 포함 관련 테스트 46개 통과. 운영 JS와 HTML 참조 확인. 인증된 reportId 브라우저 재열람은 미수행.

## Deploy Result

- URL: https://chungi-7emgt3gna-ax-lab-cream.vercel.app
- Alias: https://umsh.kr
- Target: production
- Status: READY
- Commit: eeccca4 + 미커밋 변경
- Framework: Express / Vercel Node function
- Build Duration: 빌드 12초 / 전체 41초

## Post-Deploy Observability

- Error scan: 배포 직후 최근 5분 오류 로그 조회.
- Drains: 미확인.
- Monitoring: 제한된 배포 검증, 지속 모니터링 미검증.

재사용: 일회성 공통 셸이 포함된 임시 컨테이너를 제거할 때는 셸의 기존 호스트를 먼저 보존한다.
