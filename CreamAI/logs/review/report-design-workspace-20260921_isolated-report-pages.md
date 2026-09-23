# Review Report - report-design-workspace

## 1. Scope

- Task id: `report-design-workspace-20260921`
- Reviewed files: 지정 계획서·디자인 명세, `design-workspace/report-pages/**`, `tests/unit/report-design-workspace.test.ts`
- 비교 근거: 운영 보관함, 정적 서버 마운트, Vercel 빌드·배포 설정
- 리뷰 시점: `2026-09-21T11:32:31Z`
- 무관한 변경은 제외했으며 파일 수정·커밋·배포는 수행하지 않았다.

## 2. Verdict

- **Approved with comments**
- Summary: 현재 코드에서 운영 API·인증·결제·분석·저장소 연결은 발견되지 않았다. 자원은 작업 폴더 내부 상대 경로를 사용하고 운영 정적 배포 원본과 분리되어 있다. 차단할 수준의 결함은 없으나 편집 가이드 배치와 격리 회귀 검사에 보완이 필요하다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

- 없음.

## 5. Minor Issues

- [`design-workspace/report-pages/css/pages.css:19`] Issue: `.teaser-signal`의 `margin-top: -52px`가 편집 가이드를 켠 상태에도 적용된다. `teaser.html:21`의 이미지 교체 안내가 이미지와 신호 제목 사이에 표시되므로 제목이 안내 영역 위로 올라온다.
- Risk: 편집에 필요한 파일명과 본문이 겹쳐 가독성이 떨어진다.
- Recommendation: 가이드 표시 상태에서는 음수 여백을 해제하거나 교체 안내를 겹침 영역 밖으로 이동한다.

## 6. Verification Gaps

- Gap: `tests/unit/report-design-workspace.test.ts:32–47`은 CSS를 검사하지 않으며, 외부 참조 검사는 큰따옴표의 `http(s)` 주소만 탐지한다. CSS `@import`·`url()`, 프로토콜 상대 주소, 작업 폴더 밖 상대 경로를 추가해도 통과할 수 있다.
- Suggested check: HTML·CSS의 자원 참조를 추출해 정규화된 경로가 작업 폴더 내부에 있고 실제 존재하는지 검사한다.

- Gap: 현재 테스트는 가이드 토글·필터 동작, 키보드 접근, 320px 레이아웃을 실행하지 않는다. PM의 브라우저 확인 보고에는 뷰포트 크기와 접근성 확인 결과가 없다.
- Suggested check: 320px와 데스크톱에서 가이드 켜기/끄기, 모든 필터, 아코디언, 키보드 포커스와 가로 넘침을 확인한다. 운영 화면과의 시각적 일치도는 잔여 검증 항목이다.

- 검증 결과: `node --test tests/unit/report-design-workspace.test.ts` **4/4 통과**, `tsc --noEmit` 통과. `tsx` 재실행은 샌드박스 임시 디렉터리 생성 권한 오류로 실패하여 Node로 대체했다.
- 지정 경로 `git diff --check`는 통과했으나 대상이 untracked여서 신규 파일 내용 검증 근거로는 제한적이다.
- `WIKI_UNAVAILABLE`: 토큰 부재로 위키 검색 불가. 로컬 코드 근거로 리뷰했다.

## 7. Final Recommendation

- Next action: 로컬 디자인 작업실로 승인한다. 편집 가이드 겹침을 보완하고 경로 격리·320px·키보드 검증을 추가한다. 읽기 전용 지시에 따라 보고서 파일은 저장하지 않았다.