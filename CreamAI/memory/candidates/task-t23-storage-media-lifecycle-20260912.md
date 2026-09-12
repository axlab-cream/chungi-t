# T23 Slice 2 — 실제 private Storage 미디어 lifecycle

## Context

- Project: 운명상회 운영 관리자
- AIOS routes: `08 Components`, `09 Assets`, `11 Ops`, `12 QA/Eval`, `13 Deploy`, `14 Memory/KMS`
- Result: 운영 Supabase private Storage와 관리자 미디어 등록·검사·미리보기·삭제 계약을 연결했다.

## Verified pattern

- 브라우저에는 service role key를 보내지 않는다. 서버가 짧은 signed upload URL을 발급하고 token은 DB·감사 결과에 저장하지 않는다.
- 업로드 시작의 MIME·크기를 신뢰하지 않는다. finalize에서 Storage bytes를 다시 내려받아 signature, byte size, dimensions/duration, SHA-256을 계산한다.
- 원본 버킷은 private로 두고 관리자 미리보기만 15분 signed URL을 사용한다. 고객 발행 URL과 섞지 않는다.
- alt와 권리 유형·증빙은 필수지만 `recorded`를 법무 승인으로 표현하지 않는다. 영상은 승인된 이미지 poster 없이는 시작하지 않는다.
- 삭제는 참조 테이블과 poster 사용을 DB 함수 안에서 잠근 뒤 Storage object와 metadata를 순서대로 정리한다. 참조 중이면 Storage 삭제 전에 거절한다.
- 저장소 제한은 계획값이 아니라 운영 프로젝트 설정을 먼저 조회한다. 이 프로젝트는 전역 50MB이므로 영상 상한·버킷·UI를 모두 50MB로 맞췄다.

## Evidence

- Unit/API/shell: targeted 36/36, full 654/654.
- Build: TypeScript, FAQ/SEO, Vercel build PASS.
- Supabase: migration `20260912002420`, RLS two tables, service_role only, delete RPC security invoker, private `umsh-media` 50MB and five MIME types.
- Production: `dpl_2pVJ7NvA4ejomUDWdSLGeCVjMiNY`, `umsh.kr`, authenticated LNB and 83 real deployed assets, console error 0.

## Prevention rule

Storage UI의 전역 업로드 상한과 애플리케이션 검사 상한이 다르면 signed upload 단계에서 예측하지 못한 실패가 난다. 구현 전에 운영 bucket/global limit을 실측하고 서버·브라우저·테스트 문구를 한 값으로 고정한다.

## Unverified

- 운영 실파일 1건의 upload→preview→delete smoke는 browser native file chooser 자동화 제한과 Production secret pull 차단 때문에 NOT_RUN이다.
- 기존 정적 83개 자산의 권리 증빙 이관과 고객 화면 발행은 수행하지 않았다.
- CreamWIKI 원격 저장·검색·재색인은 인증 토큰 부재로 NOT_RUN이다.

비밀번호, 쿠키, service key, signed URL, authorization header는 이 문서에 저장하지 않았다.
