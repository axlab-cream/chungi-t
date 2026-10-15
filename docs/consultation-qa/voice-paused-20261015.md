# 천명상담 음성 상담 일시 중단 (2026-10-15)

음성 상담이 제대로 작동하지 않아 화면에서 뺐다. 나중에 다시 켤 수 있도록 서버·음성 코드는 지우지 않고 그대로 둔다.

## 화면에서 뺀 것 (`사주/consultation/index.html`)

- 상단 `채팅 | 음성` 전환 버튼 (`#consultation-mode-chat`, `#consultation-mode-voice`)
- 캐릭터 위 음성 연결 상자 (`.consultation-voice-controls` 안의 `#voice-progress`, `#voice-gate`, `#voice-scene-status`, `#voice-scene-button`)
- 입력창 옆 `◉ 음성으로 말하기` 버튼 (`#voice-button`)
- `consultation-live.js` 스크립트 태그
- 음성 관련 안내 문구 세 줄
  - "음성은 전사한 텍스트로 남깁니다."
  - "녹음한 음성은 결제 화면으로 이동하면 보관되지 않아요."
  - "말로 전달하는 것보다 정확하게 확인할 수 있어요."

`사주/js/consultation.js` 는 `#voice-button` 이 없어도 오류가 나지 않게 null 확인만 넣었다. 음성 로직(`toggleVoice`, `liveVoice`, 모드 전환)은 그대로 남아 있다.

## 그대로 남겨 둔 것

| 파일 | 역할 |
|---|---|
| `사주/js/consultation-live.js` | 브라우저 마이크 → Gemini Live 실시간 연결 |
| `사주/css/consultation.css` | `.consultation-modes`, `.consultation-voice-controls`, `[data-consultation-mode=voice]` 스타일 |
| `src/consultation/live.ts` | Live 세션 발급 |
| `src/consultation/backend.ts` | `/live-session`, `/live-turn` 경로 (화면에서 부르지 않을 뿐 서버에는 살아 있음) |
| `src/consultation/voice.ts`, `api/consultation-voice.py`, `integrations/aitalk/neural_voice.py` | 답변 음성 합성 |
| 관리자 상담 설정 | "실시간 음성 상담 목소리 (Gemini)" 항목 |
| `tests/unit/consultation-frontend.test.ts` | 음성 흐름 테스트 (가짜 화면 요소로 계속 돈다) |

## 다시 켜는 방법

1. 이 변경을 넣은 PR(브랜치 `claude/remove-voice-consult`)의 머지 커밋을 `git revert` 한다. HTML 과 테스트 단언이 원래대로 돌아온다.
2. 그 전에 아래 "알려진 문제"를 먼저 고친다. 그대로 되돌리면 같은 증상이 다시 난다.
3. 되돌린 뒤 `consultation.js`·`consultation-live.js` 의 `?v=` 값을 새로 올려 캐시를 비운다.
4. 실기기(안드로이드 앱, 폰 Chrome, PC)에서 연결 → 말하기 → 답변 → 보관함 저장까지 확인한다.

## 중단 당시 알려진 문제

- 사용자가 "작동을 안 한다"고 해서 뺐다. 이번에 원인은 따로 확인하지 않았다.
- 2026-10-02 실기기 측정 기록: 권한·연결·마이크 스트림은 정상인데 내 목소리가 전달되지 않았다. `consultation-live.js` 가 소리 크기(RMS) 0.012 이상만 보내는데, 앱 안에서 잰 값은 최대 0.034·평균 0.0005 라서 대부분 잘렸을 것으로 추정했다. 제안했던 해결책: 연결 직후 주변 소음을 재서 기준을 정하는 적응형 기준 + 말끝 여유.
- 폰 Chrome 이 뒤에 떠 있으면 Android 가 앱 마이크 입력을 0으로 막는다. 측정할 때 주의한다.
- Gemini 목소리 30개가 모두 동작하는지는 확인하지 않았다.
- Play Console Data safety 에 마이크·음성 항목을 넣을지는 음성 재개 여부에 따라 다시 정한다.
