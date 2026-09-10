# src/ 모듈 컨텍스트 (per-directory CLAUDE.md)

> Claude Code는 작업 중인 파일의 상위 폴더 CLAUDE.md를 자동으로 읽습니다.
> 이 파일에는 src/ 코드에만 해당하는 규칙·구조 설명을 적으세요.
> 하위 모듈(예: src/api/, src/payments/)에도 각각 CLAUDE.md를 두면
> 해당 모듈을 만질 때만 로드되어 컨텍스트 비용이 줄어듭니다.

## 이 모듈의 책임
- (예: 도메인 로직만. UI/IO 금지)

## 디렉토리 규칙
- (예: api/는 라우팅만, services/에 비즈니스 로직)

## 주의사항
- (예: 이 폴더의 public 함수 시그니처 변경 시 tests/unit 갱신 필수)
