# AIOS KMS 기록: chungi-t 샘플 디자인 반영 QA 루프

작성일: 2026-08-26  
상태: 확인됨

## 요청

사용자가 지정한 샘플 HTML/MHTML 페이지 디자인과 말투를 직접 화면으로 확인하며, 반영률을 퍼센트로 보고하고 90% 이상 반영될 때까지 반복 수정한다.

## 근거

| 영역 | 상태 | 근거 |
|---|---|---|
| 사용자 샘플 | 확인됨 | 브라우저 주석 스크린샷과 `teaser_korean_content.md` |
| 초기 라이브 화면 | 확인됨 | `qa-live-before.png`, 초기 반영률 56% |
| 최종 로컬 화면 | 확인됨 | `qa-local-final-top.png`, `qa-local-final-mid.png`, `qa-local-final-bottom.png` |
| 상담 CTA | 확인됨 | 결과 화면 CTA 클릭 시 `/chat.html` 이동 |
| LLM 말투 연결 | 확인됨 | 채팅 인트로가 `"직장 운" 때문에 여기까지 왔군요` 말투 유지 |
| Vercel production | 확인됨 | `dpl_DWcNRuxU3xhvuZEMLP27qv5rfri2`, alias `https://chungi-t.vercel.app` |

## 적용 내용

- `사주/사주/index.html` 결과 화면을 샘플의 긴 모바일 스토리 구조에 맞춰 재구성했다.
- 결과 화면 섹션을 26개로 확장하고, 11개 비주얼 컷을 사용했다.
- 성격, 고민, 팔자, 사주표, 대운/세운, 좋은 말만 하지 않는 경고, 재물운, 운명의 상대, 복채, 비교, 리포트 미리보기, 후기/지표, 상담 CTA 흐름을 추가했다.
- 8자리 생년월일 입력을 `1975.09.26`처럼 안정적으로 표시하고 분석하도록 보강했다.
- 결과 전환 시 `phone.scrollTop`과 `stage.scrollTop`을 0으로 리셋해 상단 헤더가 잘리지 않게 했다.
- 사용자 입력/분석 문자열을 결과 HTML에 넣을 때 `escapeHtml()`로 이스케이프한다.

## QA 결과

- 초기 반영률: 56%
- 1차 반영률: 86%
- 최종 반영률: 92%
- 필수 샘플 키워드 누락: 0개
- 콘솔 에러: 0개
- `npm test`: 17개 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- Vercel production 배포: `dpl_DWcNRuxU3xhvuZEMLP27qv5rfri2`
- Live `/api/health`: `{ ok: true, openai: true }`
- Live `/api/chat`: `직장 고민 때문에 여기까지 오셨군요. 흐름이 보입니다. 일의 결부터 보겠습니다.` 말투 확인

## 리스크와 메모

- 원본 MHTML의 `file://` 직접 열기는 브라우저 보안 정책으로 차단되어, 사용자 주석 스크린샷과 추출 문서를 기준으로 비교했다.
- 최종 92%로 본 이유는 원본의 모든 원격 이미지, 애니메이션, 세부 마이크로카피를 1:1 복제하지 않고 현재 프로젝트 자산으로 샘플 구조와 말투를 재현했기 때문이다.
- 운영 배포는 기존 WIKI 기록과 같이 Vercel-GitHub 자동 연결 권한 이슈가 있어 CLI production 배포로 반영한다.
