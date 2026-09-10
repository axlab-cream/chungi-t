# 20종 서비스 매핑
기준: 로컬 manifest·catalog·directory. 서비스 표시명은 운영 코드와 다시 동기화한다. 가격은 변경 가능한 값이므로 패키지에 고정하지 않는다.
discovery '후보'는 seed 존재이며 실제 공개 상태는 route guard·runtime config까지 대조한다.

| canonical / prompt key | 결제 key | 고객 route | discovery 기준 | 운영 주의 |
|---|---|---|---|---|
| today_fortune | 없음 | /today/free/ | 별도 무료 경로 | 무료와 유료 승인 KPI 분리 |
| saju_master | cmdg | /cmdg/ | 후보 | alias 보존 |
| love_this_year | love_this_year | /love/this-year | 후보 | 연간 맥락 |
| job_choice | job_choice | /work/job-choice | 후보 | returnPath와 landing 다를 수 있음 |
| quit_fortune | quit_fortune | /work/quit | 후보 | 민감한 직업 판단 단정 금지 |
| money_save | money_save | /money/save | 후보 | 금전 성향 콘텐츠 |
| cat_compatibility | cat_compatibility | /match/cat | 후보 | 반려 정보 입력 별도 |
| match_couple | match_couple | /match/couple | 후보 | 두 사람 입력·동의·마스킹 |
| marry_match | marry_match | /match/marry | 후보 | 결혼 궁합 |
| couple_signal | couple_signal | /love/signal | 후보 | 상대 의도 확정 금지 |
| pass_angle | pass_angle | /me/pass-angle | 후보 | 합격 보장 금지 |
| work_move | work_move | /work/move | 후보 | 이직 |
| work_job | work_job | /work/job | hidden=true | 기존 결과 링크 유지 |
| love_mind | love_mind | /love/mind | hidden=true | 기존 결과 링크 유지 |
| love_again | love_again | /love/again | hidden=true | 기존 결과 링크 유지 |
| love_spouse | love_spouse | /love/spouse | hidden=true | 기존 결과 링크 유지 |
| home_fit | home_pungsu | /place/home | 후보 | 주소·공간 입력 민감 |
| newyear_flow | newyear_flow | /flow/newyear | 후보 | 대상 연도 필드 관리 |
| wedding_day | wedding_day | /day/wedding | 후보 | 후보일 데이터 |
| lucky_color | lucky_color | /me/lucky | 후보 | 색·물건 가이드 |

관리자는 canonicalKey, paymentKey, promptKey, corpus domain, landingPath, returnPath를 별도 관리·조회한다. route 문자열이나 서비스명만으로 상품을 매칭하지 않는다.
서비스별 콘텐츠 체크: 제목·한줄설명·포스터·영상·입력·미리보기·상품가격·리포트·보관함·FAQ·prompt·corpus·평가셋·공개상태·판매상태.
