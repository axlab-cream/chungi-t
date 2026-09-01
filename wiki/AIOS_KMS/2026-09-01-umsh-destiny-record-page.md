# UMSH 운명록 상세 페이지 구축

- 날짜: 2026-09-01
- 프로젝트: `C:\Users\user\Desktop\chungi-t`
- 요청: 하단 메뉴의 `운명록`을 개인 사주의 상세 내용을 담는 페이지 구조로 전환

## 결정

- 하단 내비게이션 최종 네이밍은 `홈 / 운명록 / 검색 / 보관함 / MY`.
- `운명록`은 하단 메뉴 시트가 아니라 전용 페이지 `/destiny`로 분리한다.
- 참고 화면의 핵심 구조는 유지하되 TIGHT 스타일을 복제하지 않는다.
- 운명상회 버전은 기존 UMSH 자산과 흑색/금색/붉은 계열의 브랜드 톤을 사용한다.

## 구현

- `사주/destiny.html`: 운명록 전용 모바일 페이지 추가.
- `사주/css/destiny.css`: 운명록 화면 전용 스타일, 고정 CTA, 하단 내비게이션, 원국 카드, 탭 구조 추가.
- `사주/js/destiny.js`: 샘플 운명록 렌더링, Supabase 세션 확인, 실제 사용자 운명록 조회, 섹션 탭 이동, 공유 동작 추가.
- `src/server/app.ts`: `/destiny` 라우트와 `/api/user/destiny` 읽기 API 추가.
- `사주/portal.html`, `사주/js/portal.js`, `사주/css/portal.css`: 홈 하단 `운명록`을 `/destiny`로 연결하고 검색/보관함/MY 메뉴 흐름 유지.
- `사주/사주/index.html`: `/cmdg/#vault`로 진입하면 풀이 보관함 시트가 바로 열리도록 보완.

## 운명록 정보 구조

- 상단 프로필: 이름, 생년월일, 성별/대상, 일주, 일간, 신강/중화/신약.
- 탭: `원국`, `해석`, `신살·길성`, `합충`, `대운`, `보관`.
- 원국: 년주/월주/일주/시주 카드, 십신, 지장간.
- 핵심 해석: 일간, 일주, 용신 후보, 격국 렌즈, 절기 기준, 대운 시작, 오행 균형.
- 신살·길성: 격국, 십신, 보완/주의 오행, 합충 유형 태그.
- 합충: 원국 내부 관계 작용과 해석 문장.
- 대운: 현재 대운과 다음 흐름.
- 보관: 저장된 풀이와 상담 기록 연결.

## 검증

- `node --check 사주/js/destiny.js`: 통과.
- `node --check 사주/js/portal.js`: 통과.
- `npm run typecheck`: 통과.
- `npm test`: 통과, 41개 테스트.
- `npm run vercel-build`: 통과. `public/` 배포 정적 파일 생성 후 타입체크.
- 로컬 브라우저 `/destiny`: 콘솔 오류 없음.
- 390x844 모바일 검증: 하단 네이밍 오버플로 없음, 자동 토스트 제거, 첫 원국 카드가 고정 CTA 위에 보임.
- `/#search`: 홈 검색 메뉴 자동 열림.
- `/cmdg/#vault`: 풀이 보관함 자동 열림.
- Production 배포: Vercel `dpl_3S9rqZzS3ax3UyoLdVLL6Ypbua51`, `https://umsh.kr` alias 연결.
- Production 확인: `https://umsh.kr/`, `https://umsh.kr/destiny`, `/css/destiny.css`, `/js/destiny.js`, `/assets/chungi-destiny-card-bg.webp`, `/api/health` 정상 응답.

## 배포 보강

- Vercel static route가 한글 경로 파일을 안정적으로 찾지 못해 배포용 ASCII `public/` 산출물 생성 스크립트를 추가했다.
- `scripts/prepare-vercel-public.mjs`: `사주` HTML/CSS/JS와 `사주/사주/assets`를 `public/` 및 `public/cmdg/`로 복사한다.
- `vercel.json`: `/`, `/destiny`, `/css/*`, `/js/*`, `/assets/*`, `/cmdg/*`는 static 파일로 서빙하고 `/api/*`만 Express 함수로 전달한다.
- `api/index.ts`: Vercel route가 전달한 `__umsh_path`를 Express `req.url`로 복원해 API 라우트를 보존한다.

## 재사용 포인트

- 운명록은 향후 실제 사주 프로필 고도화, 다중 인물 비교, 저장 리포트 상세화의 허브로 쓸 수 있다.
- `/api/user/destiny`는 LLM 리포트 생성 없이 `analyzeSaju` 결과와 저장 리포트 목록을 읽어 오는 경량 조회 API로 유지한다.

## 2026-09-01 보호 메뉴 업데이트

- 사용자 피드백: `운명록`, `보관함`, `MY`는 로그인과 사주등록을 꼭 거쳐야 한다.
- `사주/portal.html`: 하단 `운명록`을 직접 링크에서 보호 탭 버튼으로 바꾸고, 빠른 메뉴 문구를 로그인·사주등록 필수 구조로 수정.
- `사주/js/portal.js`: Supabase 세션과 `/api/user/profile` 완료 상태를 확인한 뒤 `ready`일 때만 목적지로 이동. 미로그인/미등록 상태는 하단 시트에서 CTA로 안내.
- `사주/destiny.html`, `사주/js/destiny.js`, `사주/css/destiny.css`: 비로그인 샘플 상세 노출을 제거하고, 로그인 필요/사주등록 필요 게이트 화면으로 교체.
- `사주/사주/index.html`: `entry=destiny`, `entry=vault`, `entry=my` 가입 진입을 추가하고, 프로필 저장 후 각각 운명록/보관함/MY 화면으로 연결.
- 검증: `node --check` 대상 JS 통과, `/cmdg` 인라인 스크립트 파싱 통과, `npm run vercel-build` 통과, `npm test` 41개 통과, 비인증 `/api/user/profile`과 `/api/user/destiny`가 401을 반환하는 것 확인.
