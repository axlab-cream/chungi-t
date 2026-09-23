# 회원가입 오늘의 운명 레이어 팝업 — 2026-09-22

## observation

- 공용 `umsh-chrome.js`는 공개 서비스 페이지에 공통 GNB와 하단 메뉴를 연결한다.
- 오늘의 운명 무료 해석은 `/signup?entry=today&returnTo=/today/free?start=1#login` 뒤 `/today/free?start=1` 흐름에서 시작한다.

## decision

- 회원가입 혜택을 전 서비스 일반 베네핏이 아니라, 회원가입 뒤 오늘 나에게 들어온 운 해석을 무료로 확인하는 흐름으로 안내한다. 배너 문구는 `오늘 나에게 들어온 운을 확인해 보세요`와 `회원가입하면 100% 무료로 볼 수 있어요`로 압축해 같은 표현의 반복을 줄인다.
- 팝업은 2026-09-22부터 2026-10-01(KST)까지만 표시하고, `일주일간 다시 보지 않기`를 선택하면 브라우저 로컬 저장소에 7일 만료 시각을 저장한다.

## artifact

- `사주/js/umsh-signup-benefit-popup.js`
- `사주/css/umsh-signup-benefit-popup.css`
- `사주/사주/assets/signup-benefit-popup-2026-09-22.png`
- `tests/unit/signup-benefit-popup.test.ts`

## QA result

- `npx tsx --test tests/unit/signup-benefit-popup.test.ts`: 3/3 PASS.
- `npm run typecheck`: PASS.
- 로컬 `/cmdg/` 브라우저에서 팝업 표시, 문구, 닫기·CTA·일주일 숨김의 접근성 컨트롤과 화면 비율을 확인했다.

## lesson

- 이미지 안의 CTA·체크 영역은 실제 링크와 버튼을 같은 위치에 겹쳐 두어, 시각 디자인을 보존하면서 키보드 접근성과 정상적인 회원가입 이동을 함께 제공한다.

## relation

- `personal/carrotcap/notes/umsh-fall-sns-marketing-plan-20260921.md`

## next_patch

- 배포 전에는 별도 브라우저 프로필에서 회원가입 완료 뒤 오늘운 결과까지의 실제 인증 흐름을 점검한다.
