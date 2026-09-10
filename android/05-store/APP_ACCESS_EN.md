# C03 · 심사자용 App access 안내 (영문)

Play Console 의 App access 필드에 넣을 원문이다. **계정 비밀번호는 이 파일에 넣지 않는다.**
콘솔의 지정 필드에 직접 입력한다.

## 상태

| 항목 | 상태 |
|---|---|
| 안내문 | 작성됨 (아래) |
| 심사용 계정 | **BLOCKED** — 소유자가 발급해야 한다 |
| 유료 기능 확인 경로 | **BLOCKED** — Play 라이선스 테스터 등록 필요 |

심사자는 소유자 개입 없이 유료 기능까지 확인할 수 있어야 한다. 두 가지 방법이 있고
**두 번째를 권한다.**

1. 심사 계정에 관리자 권한을 준다 — `UMSH_ADMIN_EMAILS` 에 넣으면 결제 없이 열람된다.
   구현은 이미 있다(`isAdminOwner`). 다만 일반 사용자와 다른 경험이 되어 문서 12절의
   R22(심사·일반 사용자 기능 차이)에 걸린다. **권하지 않는다.**
2. Play 라이선스 테스터로 등록한다 — 실제 결제 흐름을 그대로 거치되 요금이 청구되지
   않는다. 일반 사용자와 같은 화면을 보게 된다. **이쪽을 권한다.**

## 안내문

```text
App purpose
Unmyeongsanghoe (운명상회) is a Korean fortune-telling consultation service. It
calculates a saju chart from the user's birth date and time and answers specific
questions about relationships, money, work, compatibility and wedding-date choice.

Access instructions
1. Launch the app. The home screen lists the available consultations.
2. Tap "오늘 나한테 들어오는 운" to see the free daily reading. No sign-in required
   to reach the screen; sign-in is required to generate a result.
3. Sign in with the review credentials provided in the App access fields. The app
   opens the sign-in page in the system browser because Google blocks OAuth inside
   embedded WebViews; it returns to the app through an Android App Link.
4. Open "내 사주 정보" and save the birth details. This is required once before any
   consultation can be generated.
5. Tap any consultation card, answer its questions, and continue to the free
   preview. The preview shows part of the reading and the full table of contents.
6. Continue to payment to open the full reading.

Authentication and access conditions
Sign-in uses Google, Kakao or Naver through Supabase Auth. The review account is a
normal user account with no elevated permissions, so the reviewer sees exactly what
a paying user sees. No owner action is needed at any point.

Purchases
In-app purchases use Google Play Billing. Consultations are one-time purchases
priced from KRW 4,900 to KRW 49,900. There are no subscriptions. The review account
is registered as a Play license tester, so the purchase flow completes without a
charge. The server verifies every purchase token with the Google Play Developer API
before unlocking a reading.

Account deletion
In-app path: MY > 회원 탈퇴
Web resource: https://umsh.kr/leave
The page explains what is deleted and what is retained for legal record-keeping,
and is reachable without signing in.

AI content reporting
Every generated reading shows a "해석 신고" button. Tapping it opens a form with five
reasons and an optional description, and submits the report to the server, where it
is stored with the reading it refers to.

Support
axlab@crea-m.com
```

## 소유자가 해야 할 일

1. 심사용 Google 계정을 하나 만든다(서비스 소유자 계정과 분리).
2. Play Console > 설정 > 라이선스 테스트 에 그 계정을 추가한다.
3. App access 필드에 아이디와 비밀번호를 입력한다. **이 파일이나 저장소에는 적지 않는다.**
4. 그 계정으로 새 기기에서 위 1~6 단계를 그대로 따라가 막히는 지점이 없는지 확인한다.
