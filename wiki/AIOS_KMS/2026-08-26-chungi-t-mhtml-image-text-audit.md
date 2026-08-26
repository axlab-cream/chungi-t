# AIOS KMS 기록: chungi-t MHTML 이미지/텍스트 전수 반영

작성일: 2026-08-26  
상태: 확인됨

## 요청

사용자가 지정한 MHTML 샘플의 최상단 구조를 기준으로 페이지를 다시 맞추고, 모든 이미지가 그대로 로드되는지와 각 영역 텍스트가 표시되는지 직접 확인한다.

## 페이지 정의

- 1페이지: 사용자가 지정한 MHTML 샘플 페이지. 운영 URL bare `/`에서 먼저 보여야 한다.
- 2페이지: `천기 선생님 · 사주` 사주 등록 단계. 1페이지 CTA 이후 `#target` 상태로 `누구의 사주를 볼까요?` 화면부터 보여야 한다.

## 근거

| 영역 | 상태 | 근거 |
|---|---|---|
| 최상단 기준 | 확인됨 | 사용자 첨부 이미지 `codex-clipboard-cd64f6d2-5199-47f5-a005-8db53d57920c.png` |
| 원본 MHTML | 확인됨 | `C:\Users\USER\MCP\바탕화면\chungi_t\사주\사주\타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml` |
| 원본 구조 | 확인됨 | `사주/사주/extracted_decoded.html`의 `video -> 01_intro_bg.png -> 02_hero_character.png` 순서 |
| 상단 부채 이미지 | 확인됨 | `사주/사주/assets/mz-01-intro-bg.png`, 원본 `01_intro_bg.png` 추출 자산 |
| 로컬 렌더링 | 확인됨 | `qa-local-sample-top-final.png`, `qa-top-comparison-final.png` |
| 이미지/텍스트 전수 검사 | 확인됨 | `qa-local-final-audit.json`, 이미지 42/42 로드, 텍스트 34/34 표시 |

## 적용 내용

- `사주/사주/index.html` 랜딩 첫 화면을 샘플처럼 `비디오 컨트롤 -> 검은 타이틀 -> 부채 이미지/탁` 순서로 재구성했다.
- 결과 화면 상단도 같은 MHTML 상단 시퀀스로 시작하도록 맞췄다.
- MHTML에서 확인한 `mzmudang/teaser` 원본 이미지들을 `data-source-asset`로 배치해 브라우저에서 전수 로드 검사가 가능하게 했다.
- 비디오는 `preload="none"`으로 두어 첨부 샘플처럼 검은 native control 상태로 보이게 했다.
- 인트로 높이와 이미지 fade를 조정해 하단에 다음 말풍선이 살짝만 보이도록 맞췄다.
- 샘플의 `범산 도령이다` 문구는 프로젝트 페르소나에 맞춰 `천기 선생님이다`로 치환했다.
- `/`와 내부 장면이 혼동되지 않도록 1페이지는 bare `/`에 고정하고, 2페이지 사주 등록 화면은 `#target` URL hash로 구분한다.
- `extracted_decoded.html`을 운영 앱에 원본 HTML 통째로 복붙한 방식은 아니며, 해당 파일의 첫 페이지 시퀀스와 이미지/텍스트 자산을 현재 앱 구조 안에 재구성했다.
- 랜딩/결과 stage가 flex 컨테이너로 동작하면서 긴 `.sample-story`가 화면 높이로 줄어 하단 스크롤이 막히던 문제를 수정했다. 랜딩/결과 stage는 block 흐름으로 두고, `.sample-story`는 줄어들지 않도록 고정한다.
- 영상 영역은 원본 `extracted_decoded.html`처럼 자동재생 티저로 보여야 한다. 이전 `controls + preload="none"` 구성은 검은 컨트롤 띠처럼 보이는 문제가 있어 `autoplay muted playsinline preload="auto"`로 되돌리고 native controls를 제거했다.

## QA 결과

- 상단 1뷰 반영률: 95%
- 이미지 로드: 42/42
- 텍스트 블록 표시: 34/34
- 결과 화면 CTA: `open-chat` 존재 확인
- `npm test`: 17개 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- `design-qa.md`: `final result: passed`
- Vercel production 배포: `dpl_ANLShpa8oAsGk4h2XpDbzDy2uQsK`, alias `https://chungi-t.vercel.app`
- Production 브라우저 검증: 이미지 42/42, 텍스트 34/34, 콘솔 에러 0개
- 라우팅 수정 배포: `dpl_EBVhwfrBwgGEpUNRHPWipeSNwntj`, bare `/`는 1페이지, `/#immersion`은 2페이지로 검증됨
- 최신 라우팅 정정: 1페이지 다음은 연출 화면이 아니라 사주 등록 화면이므로 CTA는 `#target`으로 이동한다.
- 사주 등록 플로우 배포: `dpl_8iSuqACTsMWcwgzkHavno4Dub9u1`, bare `/`는 1페이지, CTA 이후 `#target`에서 `누구의 사주를 볼까요?` 등록 화면으로 검증됨
- 로컬 스크롤 수정 검증: bare `/`에서 `stageScrollHeight 19674px`, `storyHeight 19650px`, wheel 후 `scrollTop 2200`으로 하단 스크롤 동작 확인
- 로컬 영상 영역 검증: `readyState=4`, `paused=false`, `currentTime=2.44`, 원본 영상 크기 `1440x2232`, native controls 없음, 이미지 42/42 로드, CTA 후 `#target` 진입 확인
- 영상 영역 수정 배포: `dpl_G2TAGUntNwsa2wd5ChrREyNfPx2F`, alias `https://chungi-t.vercel.app`
- Production 영상 검증: `readyState=4`, `paused=false`, `currentTime=3.45`, 영역 높이 `659px`, 이미지 42/42 로드, CTA 후 `#target` 진입 확인

## 리스크와 메모

- 브라우저 native video controls는 OS/브라우저에 따라 아이콘 위치와 progress line이 조금 달라질 수 있다.
- 사용자 샘플 브랜드명 `범산 도령`과 현재 서비스명 `천기 선생님`은 다르므로, 텍스트 1:1이 아니라 페르소나명만 서비스명으로 치환했다.
- Vercel-GitHub 자동 배포 연결은 여전히 권한 이슈가 있어, 운영 반영은 Vercel CLI production 배포로 진행한다.
