# 프로젝트 입력값

실행 프롬프트 2절의 입력란이다. **코드·설정과 대조해 확인한 값만 채웠고, 확인하지 못한
값은 `미확인` 으로 남겼다.** 추정으로 메우지 않았다.

```yaml
project:
  service_name: "운명상회"
  production_url: "https://umsh.kr"
  staging_url: "미확인"
  repository_or_local_path: "github.com/axlab-cream/chungi-t"
  base_branch: "main"
  existing_specifications: "prompts/services/*.md, tests/unit/*.test.ts (381개), check:* 스크립트 14개"
  release_scope: "웹 기능 전체를 앱에서 제공. 결제만 앱에서 Google Play 결제로 대체"

android:
  app_name_ko: "운명상회"
  app_name_en: "미확인"
  application_id: "kr.umsh.app"          # 소유자 확정 완료
  existing_play_app: "없음"               # Play Console 미확인 상태에서의 진술
  existing_signing_setup: "미확인"        # 업로드 키 미생성
  supported_countries: ["KR"]
  supported_languages: ["ko-KR"]
  target_users_and_age: "미확인"          # 연령등급 설문에 필요
  supported_devices: "스마트폰"           # 태블릿·폴더블 범위 미확인

business:
  account_type: "조직"                    # 2026-09-10 소유자 확인
  account_created_at: "해당 없음"          # 12명·14일 의무는 개인 계정 대상이라 적용되지 않는다
  publisher_name: "더크림유니언"
  website_ownership: "umsh.kr 운영·배포 권한 보유 (Vercel 프로젝트 ax-lab-cream/chungi-t)"
  support_email: "axlab@crea-m.com"
  privacy_policy_url: "https://umsh.kr/privacy"
  account_deletion_url: "https://umsh.kr/leave"
  monetization: "디지털 단건"             # 구독 없음, 상담별 건당 결제
  web_payment_provider: "이니시스 (웹), Google Play 결제 (앱)"
  existing_web_purchases: "웹 구매분은 같은 계정 로그인 시 운명록에서 그대로 열림"
  billing_program_enrollment: "미확인"    # 서비스 계정·재무 권한 미설정

features:
  sign_in_methods: "Google / 카카오 / 네이버 (Supabase Auth)"
  generative_ai: "맞춤 리포트 + 결과 화면 이어서 질문"
  user_generated_content: "없음"          # 공개 게시·댓글 기능 없음
  sensitive_inputs: "생년월일시, 성별, 상대 생년월일, 상담별 주관식 답변"
  optional_native_features: "미정"        # 알림·다운로드·공유는 범위 판단 필요

execution:
  authorized_actions: "코드 수정 / 로컬 검증. 테스트 트랙 업로드·심사 제출은 미승인"
  credentials_location: "Vercel 환경변수 (ax-lab-cream/chungi-t), .env (로컬, 커밋 금지)"
  available_test_devices: "없음"          # 이 PC 에 JDK·Android SDK 없음
  intended_launch_date: "미정"
```

## 확인이 필요한 값과 그 영향

| 값 | 왜 필요한가 | 모르면 막히는 것 |
|---|---|---|
| ~~`account_type`~~ | **확인됨 · 조직(더크림유니언)**. 개인 계정의 12명·14일 의무는 적용되지 않는다. 다만 조직 계정에도 콘솔이 요구하는 테스트 절차가 있을 수 있어 실제 화면에서 확인해야 한다 | 해소 |
| `existing_play_app` | 같은 패키지의 기존 앱이 있으면 서명·버전이 이어져야 한다 | D01 서명 |
| `target_users_and_age` | 연령등급 설문 답이 달라진다 | C01 |
| `billing_program_enrollment` | 서비스 계정에 재무 권한이 없으면 영수증 검증이 동작하지 않는다 | B04 실기기 검증 |
| 테스트 기기 | 실제 앱 QA(9절)를 대체할 방법이 없다 | D02 전체 |
