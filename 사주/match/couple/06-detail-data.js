window.COUPLE_MATCH_DETAIL_DATA = {
  "service": {
    "service_key": "couple_match",
    "service_slug": "couple-match",
    "service_title": "우리 둘, 진짜 잘 맞아?",
    "category": "커플궁합",
    "subcategory": "명리궁합",
    "price_krw": 19900,
    "service_url_hint": "https://match.umsh.kr/couple",
    "analysis_period": "현재 관계 흐름과 오늘의 관계 액션",
    "target_question": "우리 둘은 어떤 지점에서 잘 맞고, 어디서 조심해야 할까?",
    "analysis_basis": [
      "명리궁합",
      "오행",
      "일지",
      "띠/지지 관계"
    ],
    "interpretation_index_source": "user_seed",
    "report_version": "couple-match-r1",
    "copy_version": "step06_1-copy-v1"
  },
  "prompt_input": {
    "stage": "06-step-6_1-report-detail",
    "service_title": "우리 둘, 진짜 잘 맞아?",
    "category": "커플궁합",
    "section_policy": "render_only_section_id_from_step05_report_index",
    "default_section_id": "relationship_overview__chemistry_one_line",
    "section_count": 70,
    "analysis_basis": [
      "명리궁합",
      "오행",
      "일지",
      "띠/지지 관계"
    ],
    "domain": "match.umsh.kr/couple",
    "price_krw": 19900
  },
  "report_index": {
    "source": "user_seed_plus_today_action",
    "groups": [
      {
        "id": "relationship_overview",
        "title": "관계 총평",
        "subtitle": "첫 화면에서 케미, 신호, 난이도를 짧게 잡는 입구",
        "cluster": "initial",
        "asset_key": "couple-match-05-relationship-overview",
        "items": [
          {
            "section_id": "relationship_overview__chemistry_one_line",
            "title": "케미 한 줄",
            "preview": "두 사람 관계의 첫인상을 한 문장으로 압축해요.",
            "why_needed": "긴 리포트 전에 지금 관계의 큰 톤을 빠르게 잡는 항목입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000228",
              "zip-궁합-qa-000230",
              "item-00-p1-g03"
            ],
            "asset_key": "couple-match-05-relationship-overview",
            "route": "../06-step-6_1-report-detail/index.html?section=relationship_overview__chemistry_one_line#step-6_1-report"
          },
          {
            "section_id": "relationship_overview__green_light_points",
            "title": "그린라이트 포인트",
            "preview": "잘 맞는 버튼이 어디서 켜지는지 먼저 보여줘요.",
            "why_needed": "관계를 이어갈 힘이 생기는 지점을 사용자가 놓치지 않게 돕습니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-relationship-overview",
            "route": "../06-step-6_1-report-detail/index.html?section=relationship_overview__green_light_points#step-6_1-report"
          },
          {
            "section_id": "relationship_overview__yellow_points",
            "title": "옐로포인트",
            "preview": "좋아도 살짝 걸리는 신호를 과하게 키우지 않고 체크해요.",
            "why_needed": "초반 설렘 속에서 반복될 수 있는 어긋남을 미리 분리합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000074",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-relationship-overview",
            "route": "../06-step-6_1-report-detail/index.html?section=relationship_overview__yellow_points#step-6_1-report"
          },
          {
            "section_id": "relationship_overview__maintenance_difficulty",
            "title": "관계 유지 난이도",
            "preview": "좋아하는 마음과 실제 유지 체력을 나눠서 봐요.",
            "why_needed": "감정만으로 밀어붙이기보다 현실 리듬까지 확인하는 항목입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "couple-match-05-relationship-overview",
            "route": "../06-step-6_1-report-detail/index.html?section=relationship_overview__maintenance_difficulty#step-6_1-report"
          },
          {
            "section_id": "relationship_overview__question_to_check",
            "title": "지금 확인할 질문",
            "preview": "오늘 바로 물어봐도 덜 부담스러운 질문을 뽑아요.",
            "why_needed": "마음속 결론보다 확인 가능한 대화를 먼저 열기 위한 장치입니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "item-41-qa-0003",
              "item-00-p1-g03"
            ],
            "asset_key": "couple-match-05-relationship-overview",
            "route": "../06-step-6_1-report-detail/index.html?section=relationship_overview__question_to_check#step-6_1-report"
          }
        ]
      },
      {
        "id": "zodiac_branch_match",
        "title": "띠/지지 궁합",
        "subtitle": "띠와 지지의 붙는 지점, 부딪히는 버튼, 장기 호흡",
        "cluster": "initial",
        "asset_key": "couple-match-05-zodiac-branch-match",
        "items": [
          {
            "section_id": "zodiac_branch_match__best_fit_combo",
            "title": "찰떡 조합",
            "preview": "같이 있을 때 자연스럽게 편해지는 조합 신호를 봐요.",
            "why_needed": "두 사람이 노력 없이 맞는 부분과 의식적으로 키울 부분을 구분합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000305",
              "zip-궁합-qa-000153"
            ],
            "asset_key": "couple-match-05-zodiac-branch-match",
            "route": "../06-step-6_1-report-detail/index.html?section=zodiac_branch_match__best_fit_combo#step-6_1-report"
          },
          {
            "section_id": "zodiac_branch_match__steady_combo",
            "title": "무난한 조합",
            "preview": "큰 드라마보다 꾸준함으로 가는 궁합 결을 확인해요.",
            "why_needed": "설렘이 약해 보여도 안정감으로 쌓이는 관계인지 보는 항목입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-zodiac-branch-match",
            "route": "../06-step-6_1-report-detail/index.html?section=zodiac_branch_match__steady_combo#step-6_1-report"
          },
          {
            "section_id": "zodiac_branch_match__needs_space_combo",
            "title": "거리 필요한 조합",
            "preview": "붙어 있을수록 예민해질 수 있는 거리감을 체크해요.",
            "why_needed": "좋아하는 마음과 별개로 숨 쉴 공간이 필요한 조합을 분리합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000074",
              "zip-궁합-qa-000228",
              "item-41-qa-0007"
            ],
            "asset_key": "couple-match-05-zodiac-branch-match",
            "route": "../06-step-6_1-report-detail/index.html?section=zodiac_branch_match__needs_space_combo#step-6_1-report"
          },
          {
            "section_id": "zodiac_branch_match__collision_button",
            "title": "충돌 버튼",
            "preview": "별일 아닌데 크게 튀는 포인트를 버튼처럼 표시해요.",
            "why_needed": "싸움의 주제보다 실제로 눌리는 감정 트리거를 찾기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000074",
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-zodiac-branch-match",
            "route": "../06-step-6_1-report-detail/index.html?section=zodiac_branch_match__collision_button#step-6_1-report"
          },
          {
            "section_id": "zodiac_branch_match__marriage_business_match",
            "title": "결혼/동업 궁합",
            "preview": "연애 감정과 생활·파트너십 체력을 따로 봐요.",
            "why_needed": "오래 가는 관계는 감정, 책임, 돈의 리듬이 같이 움직이기 때문입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "couple-match-05-zodiac-branch-match",
            "route": "../06-step-6_1-report-detail/index.html?section=zodiac_branch_match__marriage_business_match#step-6_1-report"
          }
        ]
      },
      {
        "id": "five_element_chemistry",
        "title": "오행 케미",
        "subtitle": "서로 충전되는 에너지와 오래 보면 피곤해지는 결",
        "cluster": "initial",
        "asset_key": "couple-match-05-five-element-chemistry",
        "items": [
          {
            "section_id": "five_element_chemistry__generating_tension",
            "title": "상생 텐션",
            "preview": "서로에게 힘을 실어주는 흐름을 오행으로 읽어요.",
            "why_needed": "관계가 편하게 굴러가는 이유를 감정이 아닌 에너지 구조로 설명합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "zip-색체명리학-qa-000147"
            ],
            "asset_key": "couple-match-05-five-element-chemistry",
            "route": "../06-step-6_1-report-detail/index.html?section=five_element_chemistry__generating_tension#step-6_1-report"
          },
          {
            "section_id": "five_element_chemistry__controlling_tension",
            "title": "상극 텐션",
            "preview": "끌리는데 피곤한 이유를 상극의 말투로 풀어요.",
            "why_needed": "다른 에너지가 나쁘다는 뜻이 아니라 조율법이 다르다는 점을 보여줍니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "zip-궁합-qa-000230",
              "item-00-p1-g03"
            ],
            "asset_key": "couple-match-05-five-element-chemistry",
            "route": "../06-step-6_1-report-detail/index.html?section=five_element_chemistry__controlling_tension#step-6_1-report"
          },
          {
            "section_id": "five_element_chemistry__energy_charge_type",
            "title": "에너지 충전형",
            "preview": "만나고 나면 기분이 차오르는 순간을 찾아요.",
            "why_needed": "데이트, 대화, 협업에서 두 사람이 살아나는 패턴을 잡습니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "zip-궁합-qa-000153"
            ],
            "asset_key": "couple-match-05-five-element-chemistry",
            "route": "../06-step-6_1-report-detail/index.html?section=five_element_chemistry__energy_charge_type#step-6_1-report"
          },
          {
            "section_id": "five_element_chemistry__energy_drain_type",
            "title": "에너지 소모형",
            "preview": "좋은데 자꾸 지치는 구간을 조용히 분리해요.",
            "why_needed": "감정 탓으로 몰기 전에 대화량, 속도, 기대치의 피로를 확인합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "zip-궁합-qa-000074",
              "item-41-qa-0007"
            ],
            "asset_key": "couple-match-05-five-element-chemistry",
            "route": "../06-step-6_1-report-detail/index.html?section=five_element_chemistry__energy_drain_type#step-6_1-report"
          },
          {
            "section_id": "five_element_chemistry__missing_element_support",
            "title": "부족한 오행 보완 포인트",
            "preview": "둘 사이에서 비어 보이는 결을 생활 습관으로 채워요.",
            "why_needed": "오행 부족을 불안 소재가 아니라 보완 가능한 루틴으로 바꾸기 위해 필요합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "zip-색체명리학-qa-000147",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-five-element-chemistry",
            "route": "../06-step-6_1-report-detail/index.html?section=five_element_chemistry__missing_element_support#step-6_1-report"
          }
        ]
      },
      {
        "id": "daymaster_sync",
        "title": "일간 성향 싱크",
        "subtitle": "각자의 기본 반응 속도와 편해지는 조건",
        "cluster": "saju",
        "asset_key": "",
        "items": [
          {
            "section_id": "daymaster_sync__expression_speed",
            "title": "표현 속도",
            "preview": "좋아하는 마음이 말로 나오는 속도 차이를 봐요.",
            "why_needed": "느린 표현을 무관심으로, 빠른 표현을 압박으로 오해하지 않게 돕습니다.",
            "evidence_ids": [
              "item-10-p1-0071",
              "zip-색체명리학-qa-000147",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=daymaster_sync__expression_speed#step-6_1-report"
          },
          {
            "section_id": "daymaster_sync__emotion_processing",
            "title": "감정 처리 방식",
            "preview": "서운함을 바로 말하는지, 혼자 정리하는지 나눠요.",
            "why_needed": "감정 처리 방식이 다르면 같은 사건도 전혀 다르게 느껴질 수 있습니다.",
            "evidence_ids": [
              "item-10-p1-0071",
              "item-41-qa-0003",
              "zip-궁합-qa-000153"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=daymaster_sync__emotion_processing#step-6_1-report"
          },
          {
            "section_id": "daymaster_sync__affection_style",
            "title": "애정 표현 스타일",
            "preview": "말, 행동, 챙김 중 어디서 사랑이 드러나는지 봐요.",
            "why_needed": "표현 방식이 다르면 애정이 있어도 덜 받은 것처럼 느껴질 수 있습니다.",
            "evidence_ids": [
              "item-10-p1-0071",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=daymaster_sync__affection_style#step-6_1-report"
          },
          {
            "section_id": "daymaster_sync__independence_dependence",
            "title": "독립성/의존도",
            "preview": "각자 시간이 필요한 쪽과 붙어 있어야 안정되는 쪽을 비교해요.",
            "why_needed": "거리감 문제를 사랑의 크기 문제가 아니라 안정 방식의 차이로 봅니다.",
            "evidence_ids": [
              "item-10-p1-0071",
              "item-41-qa-0007",
              "zip-궁합-qa-000074"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=daymaster_sync__independence_dependence#step-6_1-report"
          },
          {
            "section_id": "daymaster_sync__comfort_condition",
            "title": "관계에서 편해지는 조건",
            "preview": "두 사람이 긴장을 풀고 자기답게 있는 조건을 찾습니다.",
            "why_needed": "장기 관계에서 편안함이 생기는 환경을 구체화하는 항목입니다.",
            "evidence_ids": [
              "item-10-p1-0071",
              "zip-궁합-qa-000153",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=daymaster_sync__comfort_condition#step-6_1-report"
          }
        ]
      },
      {
        "id": "ten_star_code",
        "title": "십성 관계 코드",
        "subtitle": "친구, 설렘, 책임, 기대고 싶은 감정의 역할 분담",
        "cluster": "saju",
        "asset_key": "",
        "items": [
          {
            "section_id": "ten_star_code__friend_like_love",
            "title": "친구 같은 연애",
            "preview": "편하게 장난치고 같이 노는 관계 코드를 봐요.",
            "why_needed": "설렘만큼 중요한 동료감과 일상 친밀도를 확인합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000550",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=ten_star_code__friend_like_love#step-6_1-report"
          },
          {
            "section_id": "ten_star_code__flirting_code",
            "title": "설렘/플러팅 코드",
            "preview": "상대가 나를 끌리게 만드는 포인트를 짧게 잡아요.",
            "why_needed": "초반 호감의 이유를 감각, 말투, 태도의 조합으로 분리합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000550",
              "zip-궁합-qa-000203"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=ten_star_code__flirting_code#step-6_1-report"
          },
          {
            "section_id": "ten_star_code__real_life_care",
            "title": "현실 케어 코드",
            "preview": "챙김, 계획, 생활 안정감이 어디서 나오는지 봐요.",
            "why_needed": "연애 감정이 실제 도움과 돌봄으로 이어지는 방식을 읽습니다.",
            "evidence_ids": [
              "zip-만세력-qa-000550",
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=ten_star_code__real_life_care#step-6_1-report"
          },
          {
            "section_id": "ten_star_code__official_commitment",
            "title": "책임/공식 관계 코드",
            "preview": "관계 이름표와 약속을 대하는 태도를 확인해요.",
            "why_needed": "공개 연애, 약속, 미래 이야기를 부담으로 느끼는 지점을 분리합니다.",
            "evidence_ids": [
              "zip-만세력-qa-000550",
              "zip-궁합-qa-000203",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=ten_star_code__official_commitment#step-6_1-report"
          },
          {
            "section_id": "ten_star_code__emotional_leaning",
            "title": "기대고 싶은 정서 코드",
            "preview": "힘든 날 누구에게 어떻게 기대고 싶은지 읽어요.",
            "why_needed": "서로가 원하는 위로 방식이 다를 때 생기는 서운함을 줄입니다.",
            "evidence_ids": [
              "zip-만세력-qa-000550",
              "item-41-qa-0003",
              "item-41-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=ten_star_code__emotional_leaning#step-6_1-report"
          }
        ]
      },
      {
        "id": "communication_match",
        "title": "소통 궁합",
        "subtitle": "말투 온도, 연락 리듬, 싸우고 풀리는 방식",
        "cluster": "initial",
        "asset_key": "couple-match-05-communication-match",
        "items": [
          {
            "section_id": "communication_match__tone_temperature",
            "title": "말투 온도",
            "preview": "차갑게 들리는 말과 따뜻하게 받는 말의 차이를 봐요.",
            "why_needed": "같은 내용도 온도 때문에 다르게 느껴지는 순간을 줄입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000230",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-communication-match",
            "route": "../06-step-6_1-report-detail/index.html?section=communication_match__tone_temperature#step-6_1-report"
          },
          {
            "section_id": "communication_match__reply_rhythm",
            "title": "답장/연락 리듬",
            "preview": "답장 속도를 관심의 크기로만 보지 않게 정리해요.",
            "why_needed": "연락 템포 차이가 불안으로 번지기 전에 기준을 맞춥니다.",
            "evidence_ids": [
              "zip-궁합-qa-000230",
              "item-05-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-communication-match",
            "route": "../06-step-6_1-report-detail/index.html?section=communication_match__reply_rhythm#step-6_1-report"
          },
          {
            "section_id": "communication_match__hurt_handling",
            "title": "서운함 처리법",
            "preview": "서운할 때 바로 꺼낼 말과 잠깐 보류할 말을 나눠요.",
            "why_needed": "감정이 커진 뒤 대화하는 패턴을 부드럽게 바꾸기 위한 항목입니다.",
            "evidence_ids": [
              "item-41-qa-0003",
              "item-41-qa-0007",
              "zip-궁합-qa-000153"
            ],
            "asset_key": "couple-match-05-communication-match",
            "route": "../06-step-6_1-report-detail/index.html?section=communication_match__hurt_handling#step-6_1-report"
          },
          {
            "section_id": "communication_match__defense_pattern",
            "title": "싸울 때 방어 패턴",
            "preview": "말이 세지는 쪽, 닫히는 쪽, 피하는 쪽을 구분해요.",
            "why_needed": "싸움의 승패보다 서로가 방어하는 이유를 먼저 보기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000230",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-communication-match",
            "route": "../06-step-6_1-report-detail/index.html?section=communication_match__defense_pattern#step-6_1-report"
          },
          {
            "section_id": "communication_match__reconciliation_sentence",
            "title": "화해 문장 추천",
            "preview": "상대 방어를 덜 건드리는 첫 문장을 제안해요.",
            "why_needed": "잘 풀고 싶은 마음이 있어도 시작 문장이 어긋나면 다시 싸울 수 있습니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "item-41-qa-0003",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-communication-match",
            "route": "../06-step-6_1-report-detail/index.html?section=communication_match__reconciliation_sentence#step-6_1-report"
          }
        ]
      },
      {
        "id": "attraction_points",
        "title": "끌림/호감 포인트",
        "subtitle": "첫눈 텐션과 오래 볼수록 스며드는 매력",
        "cluster": "relationship",
        "asset_key": "",
        "items": [
          {
            "section_id": "attraction_points__first_spark",
            "title": "첫눈 텐션",
            "preview": "처음부터 시선이 가는 이유를 감각적으로 정리해요.",
            "why_needed": "초반 끌림의 이유를 외모나 분위기 하나로만 줄이지 않기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=attraction_points__first_spark#step-6_1-report"
          },
          {
            "section_id": "attraction_points__slow_burn_charm",
            "title": "오래 볼수록 스며드는 매력",
            "preview": "처음보다 시간이 갈수록 좋아지는 결을 봐요.",
            "why_needed": "당장 강한 신호가 아니어도 관계가 쌓이는 타입을 놓치지 않게 돕습니다.",
            "evidence_ids": [
              "zip-궁합-qa-000230",
              "zip-궁합-qa-000153"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=attraction_points__slow_burn_charm#step-6_1-report"
          },
          {
            "section_id": "attraction_points__peach_blossom_charm",
            "title": "도화/홍염식 매력",
            "preview": "자꾸 눈길 가는 분위기와 플러팅 결을 가볍게 봐요.",
            "why_needed": "매력 신호를 과장하지 않고 관계 안에서 체감되는 방식으로 설명합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-만세력-qa-000550"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=attraction_points__peach_blossom_charm#step-6_1-report"
          },
          {
            "section_id": "attraction_points__comfort_point",
            "title": "편안함 포인트",
            "preview": "말하지 않아도 덜 긴장되는 지점을 찾아요.",
            "why_needed": "설렘과 별개로 오래 머무를 수 있는 안정감을 확인합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=attraction_points__comfort_point#step-6_1-report"
          },
          {
            "section_id": "attraction_points__spark_maintenance",
            "title": "설렘 유지 버튼",
            "preview": "관계가 익숙해져도 식지 않게 눌러볼 포인트예요.",
            "why_needed": "반복되는 데이트와 연락 속에서 새로움을 만드는 행동을 연결합니다.",
            "evidence_ids": [
              "item-05-qa-0001",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=attraction_points__spark_maintenance#step-6_1-report"
          }
        ]
      },
      {
        "id": "conflict_report",
        "title": "갈등 리포트",
        "subtitle": "반복되는 싸움의 흐름과 넘지 말아야 할 기준",
        "cluster": "initial",
        "asset_key": "couple-match-05-conflict-report",
        "items": [
          {
            "section_id": "conflict_report__repeating_loop",
            "title": "반복 갈등 루프",
            "preview": "매번 비슷하게 돌아오는 싸움 패턴을 도식화해요.",
            "why_needed": "이번 싸움만 보지 않고 반복되는 시작점과 끝점을 찾기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000230",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-conflict-report",
            "route": "../06-step-6_1-report-detail/index.html?section=conflict_report__repeating_loop#step-6_1-report"
          },
          {
            "section_id": "conflict_report__competition_point",
            "title": "경쟁심 포인트",
            "preview": "누가 맞는지 겨루게 되는 순간을 체크해요.",
            "why_needed": "대화가 협상에서 승부로 바뀌는 지점을 알아야 관계 소모가 줄어듭니다.",
            "evidence_ids": [
              "zip-궁합-qa-000153",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "couple-match-05-conflict-report",
            "route": "../06-step-6_1-report-detail/index.html?section=conflict_report__competition_point#step-6_1-report"
          },
          {
            "section_id": "conflict_report__communication_obstacle",
            "title": "의사소통 장애",
            "preview": "말은 오가는데 뜻이 엇갈리는 구간을 분리해요.",
            "why_needed": "상대가 일부러 못 알아듣는 것처럼 느껴지는 악순환을 줄입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000230",
              "zip-궁합-qa-000153",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-conflict-report",
            "route": "../06-step-6_1-report-detail/index.html?section=conflict_report__communication_obstacle#step-6_1-report"
          },
          {
            "section_id": "conflict_report__trust_shake",
            "title": "신뢰 흔들림",
            "preview": "믿음이 약해지는 행동과 회복 포인트를 봐요.",
            "why_needed": "불안과 실제 확인할 사실을 나눠서 관계의 안전감을 지키기 위한 항목입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000228",
              "item-41-qa-0003",
              "item-05-qa-0007"
            ],
            "asset_key": "couple-match-05-conflict-report",
            "route": "../06-step-6_1-report-detail/index.html?section=conflict_report__trust_shake#step-6_1-report"
          },
          {
            "section_id": "conflict_report__line_crossing_moment",
            "title": "선 넘는 순간",
            "preview": "서로가 멈춰야 하는 말과 행동의 기준을 세워요.",
            "why_needed": "갈등이 있어도 관계의 존중선을 지키기 위한 안전장치입니다.",
            "evidence_ids": [
              "item-41-qa-0007",
              "item-00-p1-g03",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-conflict-report",
            "route": "../06-step-6_1-report-detail/index.html?section=conflict_report__line_crossing_moment#step-6_1-report"
          }
        ]
      },
      {
        "id": "dating_stage_reading",
        "title": "연애 단계별 풀이",
        "subtitle": "썸, 고백, 초반, 장기, 결혼 전 체크 흐름",
        "cluster": "relationship",
        "asset_key": "",
        "items": [
          {
            "section_id": "dating_stage_reading__some_possibility",
            "title": "썸 가능성",
            "preview": "아직 애매한 관계에서 신호와 착각을 나눠요.",
            "why_needed": "호감 신호를 과하게 키우지 않고 다음 대화의 힌트로 쓰기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "item-05-qa-0007",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=dating_stage_reading__some_possibility#step-6_1-report"
          },
          {
            "section_id": "dating_stage_reading__confession_timing",
            "title": "고백 타이밍",
            "preview": "밀어붙이기보다 대화 온도가 맞는 순간을 봐요.",
            "why_needed": "관계 전환은 타이밍보다 상대가 받을 준비가 되었는지가 중요합니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "zip-궁합-qa-000230",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=dating_stage_reading__confession_timing#step-6_1-report"
          },
          {
            "section_id": "dating_stage_reading__early_love_caution",
            "title": "연애 초반 주의점",
            "preview": "초반에 과속하거나 과하게 참는 패턴을 체크해요.",
            "why_needed": "초반 습관이 관계의 기본 리듬으로 굳기 전에 조율합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000074",
              "zip-궁합-qa-000153",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=dating_stage_reading__early_love_caution#step-6_1-report"
          },
          {
            "section_id": "dating_stage_reading__long_term_stamina",
            "title": "장기연애 체력",
            "preview": "오래 만나도 유지되는 힘과 지치는 구간을 봐요.",
            "why_needed": "익숙함 속에서 관계가 흐려지는 지점을 생활 리듬으로 점검합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000228",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=dating_stage_reading__long_term_stamina#step-6_1-report"
          },
          {
            "section_id": "dating_stage_reading__pre_marriage_check",
            "title": "결혼 전 체크포인트",
            "preview": "생활, 가족, 돈, 책임 이야기를 나누는 기준을 잡아요.",
            "why_needed": "좋아하는 마음과 함께 현실 약속을 다루는 대화가 필요하기 때문입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000203",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=dating_stage_reading__pre_marriage_check#step-6_1-report"
          }
        ]
      },
      {
        "id": "real_life_match",
        "title": "현실 궁합",
        "subtitle": "돈, 약속, 일, 가족, 생활 루틴이 맞는지 보는 파트",
        "cluster": "relationship",
        "asset_key": "",
        "items": [
          {
            "section_id": "real_life_match__money_temperature",
            "title": "돈 쓰는 온도",
            "preview": "데이트비, 선물, 소비 감각의 차이를 가볍게 점검해요.",
            "why_needed": "돈 이야기를 애정 평가로 바꾸지 않기 위해 기준을 분리합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000228"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=real_life_match__money_temperature#step-6_1-report"
          },
          {
            "section_id": "real_life_match__promise_style",
            "title": "약속 지키는 방식",
            "preview": "시간, 답장, 말한 것 지키는 태도의 결을 봐요.",
            "why_needed": "신뢰는 큰 사건보다 작은 약속의 누적으로 흔들릴 수 있습니다.",
            "evidence_ids": [
              "zip-궁합-qa-000228",
              "item-05-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=real_life_match__promise_style#step-6_1-report"
          },
          {
            "section_id": "real_life_match__work_business_partnership",
            "title": "일/사업 파트너십",
            "preview": "같이 일하거나 목표를 세울 때 맞는 역할을 봐요.",
            "why_needed": "연애 케미와 일 케미는 다른 기준으로 움직일 수 있습니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=real_life_match__work_business_partnership#step-6_1-report"
          },
          {
            "section_id": "real_life_match__family_expectation",
            "title": "가족 기대치",
            "preview": "가족, 주변 사람, 공개 범위를 대하는 온도를 봐요.",
            "why_needed": "두 사람 밖의 관계가 커질 때 생기는 부담을 미리 언어화합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-궁합-qa-000051",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=real_life_match__family_expectation#step-6_1-report"
          },
          {
            "section_id": "real_life_match__daily_routine_fit",
            "title": "생활 루틴 맞춤",
            "preview": "잠, 식사, 일상 템포가 관계 체감에 미치는 영향을 봐요.",
            "why_needed": "작은 생활 리듬 차이가 애정 문제처럼 번지는 걸 줄입니다.",
            "evidence_ids": [
              "zip-궁합-qa-000051",
              "zip-궁합-qa-000074",
              "item-41-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=real_life_match__daily_routine_fit#step-6_1-report"
          }
        ]
      },
      {
        "id": "luck_flow_match",
        "title": "운 흐름 궁합",
        "subtitle": "올해, 이번 달, 오늘의 대화 타이밍을 나누는 파트",
        "cluster": "timing",
        "asset_key": "",
        "items": [
          {
            "section_id": "luck_flow_match__year_temperature",
            "title": "올해 관계 온도",
            "preview": "올해 두 사람 관계가 어느 쪽으로 예민한지 봐요.",
            "why_needed": "긴 흐름에서 지금의 뜨거움과 식은 느낌을 따로 읽기 위해 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "zip-만세력-qa-000539"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=luck_flow_match__year_temperature#step-6_1-report"
          },
          {
            "section_id": "luck_flow_match__month_rhythm",
            "title": "이번 달 관계 리듬",
            "preview": "이번 달 연락, 만남, 감정 기복의 리듬을 봐요.",
            "why_needed": "월 단위 컨디션을 알면 불필요한 확대해석을 줄일 수 있습니다.",
            "evidence_ids": [
              "item-05-qa-0001",
              "zip-만세력-qa-000539"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=luck_flow_match__month_rhythm#step-6_1-report"
          },
          {
            "section_id": "luck_flow_match__today_contact_day",
            "title": "오늘 연락해도 되는 날",
            "preview": "오늘 먼저 말을 걸 때 부담이 덜한 톤을 골라요.",
            "why_needed": "하고 싶은 말과 오늘 보내기 좋은 말은 다를 수 있습니다.",
            "evidence_ids": [
              "item-05-qa-0001",
              "item-05-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=luck_flow_match__today_contact_day#step-6_1-report"
          },
          {
            "section_id": "luck_flow_match__clash_day_talk",
            "title": "충 있는 날 대화법",
            "preview": "예민한 날에는 말을 줄일지, 구조를 바꿀지 봐요.",
            "why_needed": "대화가 꼬일 수 있는 날에는 문장보다 순서가 중요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000074",
              "item-41-qa-0003",
              "item-41-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=luck_flow_match__clash_day_talk#step-6_1-report"
          },
          {
            "section_id": "luck_flow_match__relationship_turning_time",
            "title": "관계 전환 타이밍",
            "preview": "썸에서 연애, 연애에서 약속으로 넘어가는 결을 봐요.",
            "why_needed": "관계의 이름을 바꾸는 대화는 감정과 현실 준비가 같이 필요합니다.",
            "evidence_ids": [
              "zip-궁합-qa-000203",
              "item-05-qa-0007",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=luck_flow_match__relationship_turning_time#step-6_1-report"
          }
        ]
      },
      {
        "id": "mind_care",
        "title": "마음 돌봄",
        "subtitle": "불안, 감정 이름, 거리두기, 경계 문장",
        "cluster": "care",
        "asset_key": "",
        "items": [
          {
            "section_id": "mind_care__separate_confidence_anxiety",
            "title": "확신과 불안 분리",
            "preview": "좋아하는 마음과 불안한 상상을 따로 놓고 봐요.",
            "why_needed": "감정이 커질수록 확인한 사실과 상상이 섞이기 쉽습니다.",
            "evidence_ids": [
              "item-41-qa-0003",
              "item-05-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=mind_care__separate_confidence_anxiety#step-6_1-report"
          },
          {
            "section_id": "mind_care__name_the_feeling",
            "title": "감정 이름 붙이기",
            "preview": "짜증, 서운함, 불안, 외로움을 한 단어로 잡아요.",
            "why_needed": "감정 이름이 잡히면 상대에게 던지는 말도 덜 날카로워집니다.",
            "evidence_ids": [
              "item-41-qa-0003",
              "item-41-qa-0007"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=mind_care__name_the_feeling#step-6_1-report"
          },
          {
            "section_id": "mind_care__one_beat_late",
            "title": "한 박자 늦추기",
            "preview": "보내기 직전 멈추면 달라지는 문장을 확인해요.",
            "why_needed": "순간 감정으로 보낸 말은 관계의 피로를 키울 수 있습니다.",
            "evidence_ids": [
              "item-41-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=mind_care__one_beat_late#step-6_1-report"
          },
          {
            "section_id": "mind_care__distance_mission",
            "title": "거리두기 미션",
            "preview": "붙잡는 대신 나를 회복하는 짧은 미션을 줘요.",
            "why_needed": "거리두기는 무관심이 아니라 감정 과열을 낮추는 방법이 될 수 있습니다.",
            "evidence_ids": [
              "item-41-qa-0007",
              "zip-궁합-qa-000074"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=mind_care__distance_mission#step-6_1-report"
          },
          {
            "section_id": "mind_care__boundary_sentence",
            "title": "나를 지키는 경계 문장",
            "preview": "관계를 지키면서도 내 선을 말하는 문장을 준비해요.",
            "why_needed": "좋아하는 마음 때문에 계속 참는 패턴을 줄이는 항목입니다.",
            "evidence_ids": [
              "item-41-qa-0007",
              "item-41-qa-0003",
              "item-00-p1-g03"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=mind_care__boundary_sentence#step-6_1-report"
          }
        ]
      },
      {
        "id": "result_packaging",
        "title": "결과 패키징",
        "subtitle": "카드, 퀘스트, 미션, 연락 가이드, 단정 금지 안내",
        "cluster": "care",
        "asset_key": "",
        "items": [
          {
            "section_id": "result_packaging__chemistry_card",
            "title": "우리 둘 케미 카드",
            "preview": "둘만의 관계 키워드를 카드처럼 저장해요.",
            "why_needed": "긴 리포트를 다시 열지 않아도 핵심 톤을 빠르게 떠올릴 수 있습니다.",
            "evidence_ids": [
              "zip-궁합-qa-000228",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=result_packaging__chemistry_card#step-6_1-report"
          },
          {
            "section_id": "result_packaging__support_quest",
            "title": "보완 퀘스트",
            "preview": "잘 안 맞는 지점을 작은 실천으로 바꿔요.",
            "why_needed": "궁합을 판정표가 아니라 개선 가능한 관계 과제로 바꾸기 위한 항목입니다.",
            "evidence_ids": [
              "zip-만세력-qa-000539",
              "item-05-qa-0001",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=result_packaging__support_quest#step-6_1-report"
          },
          {
            "section_id": "result_packaging__conversation_mission",
            "title": "대화 미션",
            "preview": "오늘 해볼 수 있는 대화 주제를 짧게 제안해요.",
            "why_needed": "읽고 끝나는 리포트가 아니라 실제 대화로 이어지게 합니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=result_packaging__conversation_mission#step-6_1-report"
          },
          {
            "section_id": "result_packaging__date_contact_guide",
            "title": "데이트/연락 가이드",
            "preview": "만남과 연락을 어떤 톤으로 잡을지 제안해요.",
            "why_needed": "관계 온도에 맞는 행동을 고르면 불필요한 부담이 줄어듭니다.",
            "evidence_ids": [
              "item-05-qa-0001",
              "zip-궁합-qa-000230",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=result_packaging__date_contact_guide#step-6_1-report"
          },
          {
            "section_id": "result_packaging__no_absolute_decision_notice",
            "title": "“헤어져/결혼해” 단정 금지 안내",
            "preview": "리포트가 선택을 대신하지 않는다는 기준을 분명히 둬요.",
            "why_needed": "관계 결정은 사주 문장 하나가 아니라 두 사람의 실제 선택으로 다뤄야 합니다.",
            "evidence_ids": [
              "item-00-p1-g03",
              "item-41-qa-0003"
            ],
            "asset_key": "",
            "route": "../06-step-6_1-report-detail/index.html?section=result_packaging__no_absolute_decision_notice#step-6_1-report"
          }
        ]
      },
      {
        "id": "today_relationship_action",
        "title": "오늘의 관계 액션",
        "subtitle": "오늘 보내기 좋은 톤, 질문, 거리, 화해, 피할 말투",
        "cluster": "initial",
        "asset_key": "couple-match-05-today-relationship-action",
        "items": [
          {
            "section_id": "today_relationship_action__contact_tone",
            "title": "오늘 연락 톤",
            "preview": "먼저 연락한다면 어떤 온도가 덜 부담스러운지 골라요.",
            "why_needed": "오늘의 컨디션에 맞는 말투를 고르면 대화 시작이 부드러워집니다.",
            "evidence_ids": [
              "item-05-qa-0001",
              "item-05-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-today-relationship-action",
            "route": "../06-step-6_1-report-detail/index.html?section=today_relationship_action__contact_tone#step-6_1-report"
          },
          {
            "section_id": "today_relationship_action__one_sentence_question",
            "title": "한 문장 확인 질문",
            "preview": "관계를 흔들지 않고 확인할 수 있는 질문을 뽑아요.",
            "why_needed": "궁금한 마음을 추궁처럼 보이지 않게 바꾸는 항목입니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "item-41-qa-0003"
            ],
            "asset_key": "couple-match-05-today-relationship-action",
            "route": "../06-step-6_1-report-detail/index.html?section=today_relationship_action__one_sentence_question#step-6_1-report"
          },
          {
            "section_id": "today_relationship_action__distance_mission",
            "title": "거리두기 미션",
            "preview": "말을 더 하기보다 잠깐 덜어내는 미션을 제안해요.",
            "why_needed": "감정 과열 상태에서는 대화보다 회복 시간이 먼저 필요할 수 있습니다.",
            "evidence_ids": [
              "item-41-qa-0007",
              "item-05-qa-0001"
            ],
            "asset_key": "couple-match-05-today-relationship-action",
            "route": "../06-step-6_1-report-detail/index.html?section=today_relationship_action__distance_mission#step-6_1-report"
          },
          {
            "section_id": "today_relationship_action__reconciliation_sentence",
            "title": "화해 문장 추천",
            "preview": "오늘 먼저 풀고 싶을 때 쓸 수 있는 시작 문장을 줘요.",
            "why_needed": "사과와 설명의 순서가 바뀌면 좋은 의도도 다르게 들릴 수 있습니다.",
            "evidence_ids": [
              "item-05-qa-0007",
              "item-41-qa-0003",
              "zip-궁합-qa-000230"
            ],
            "asset_key": "couple-match-05-today-relationship-action",
            "route": "../06-step-6_1-report-detail/index.html?section=today_relationship_action__reconciliation_sentence#step-6_1-report"
          },
          {
            "section_id": "today_relationship_action__avoid_tone_today",
            "title": "오늘 피할 말투",
            "preview": "상대 방어를 키울 수 있는 표현을 미리 덜어내요.",
            "why_needed": "관계가 예민한 날에는 내용보다 말투가 먼저 닿기 때문입니다.",
            "evidence_ids": [
              "item-41-qa-0003",
              "item-41-qa-0007",
              "item-05-qa-0001"
            ],
            "asset_key": "couple-match-05-today-relationship-action",
            "route": "../06-step-6_1-report-detail/index.html?section=today_relationship_action__avoid_tone_today#step-6_1-report"
          }
        ]
      }
    ]
  },
  "detail_sections": {
    "relationship_overview__chemistry_one_line": {
      "section_id": "relationship_overview__chemistry_one_line",
      "report_index_source": "user_seed",
      "group_id": "relationship_overview",
      "group_title": "관계 총평",
      "title": "케미 한 줄",
      "question": "관계 총평에서 케미 한 줄은 두 사람에게 어떤 의미일까?",
      "conclusion": "케미 한 줄은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
      "summary": "두 사람 관계의 첫인상을 한 문장으로 압축해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "관계 총평 > 케미 한 줄",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠/지지 관계, 관계 신호, 대화 온도",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "케미 한 줄은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "관계 총평 > 케미 한 줄",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠/지지 관계 · 관계 신호 · 대화 온도",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감이 있는데도 답장, 약속, 말투 같은 작은 장면에서 체감이 갈릴 수 있어요. 그래서 이 파트는 좋아 보이는 순간과 살짝 걸리는 순간을 같은 화면에 놓고 읽습니다. 이 항목에서는 특히 '케미 한 줄'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "관계 단계, 최근 연락 온도, 이미 쌓인 서운함이 들어오면 강약이 달라집니다. 아직 계산값이 비어 있으면 큰 결만 보고, 실제 판정처럼 받아들이지 않는 편이 좋습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
              "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "좋은 신호 하나만 보고 관계 전체를 판단하지 않기 / 불안한 상상을 확인한 사실처럼 말하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
              "불안한 상상을 확인한 사실처럼 말하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
        "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
      ],
      "cautions": [
        "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
        "불안한 상상을 확인한 사실처럼 말하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "today_relationship_action__avoid_tone_today",
          "title": "오늘 피할 말투",
          "route": "index.html?section=today_relationship_action__avoid_tone_today#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "relationship_overview__green_light_points",
          "title": "그린라이트 포인트",
          "route": "index.html?section=relationship_overview__green_light_points#step-6_1-report"
        }
      ]
    },
    "relationship_overview__green_light_points": {
      "section_id": "relationship_overview__green_light_points",
      "report_index_source": "user_seed",
      "group_id": "relationship_overview",
      "group_title": "관계 총평",
      "title": "그린라이트 포인트",
      "question": "관계 총평에서 그린라이트 포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "그린라이트 포인트은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
      "summary": "잘 맞는 버튼이 어디서 켜지는지 먼저 보여줘요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "관계 총평 > 그린라이트 포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠/지지 관계, 관계 신호, 대화 온도",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "그린라이트 포인트은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "관계 총평 > 그린라이트 포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠/지지 관계 · 관계 신호 · 대화 온도",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감이 있는데도 답장, 약속, 말투 같은 작은 장면에서 체감이 갈릴 수 있어요. 그래서 이 파트는 좋아 보이는 순간과 살짝 걸리는 순간을 같은 화면에 놓고 읽습니다. 이 항목에서는 특히 '그린라이트 포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "관계 단계, 최근 연락 온도, 이미 쌓인 서운함이 들어오면 강약이 달라집니다. 아직 계산값이 비어 있으면 큰 결만 보고, 실제 판정처럼 받아들이지 않는 편이 좋습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
              "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "좋은 신호 하나만 보고 관계 전체를 판단하지 않기 / 불안한 상상을 확인한 사실처럼 말하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
              "불안한 상상을 확인한 사실처럼 말하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
        "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
      ],
      "cautions": [
        "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
        "불안한 상상을 확인한 사실처럼 말하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "relationship_overview__chemistry_one_line",
          "title": "케미 한 줄",
          "route": "index.html?section=relationship_overview__chemistry_one_line#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "relationship_overview__yellow_points",
          "title": "옐로포인트",
          "route": "index.html?section=relationship_overview__yellow_points#step-6_1-report"
        }
      ]
    },
    "relationship_overview__yellow_points": {
      "section_id": "relationship_overview__yellow_points",
      "report_index_source": "user_seed",
      "group_id": "relationship_overview",
      "group_title": "관계 총평",
      "title": "옐로포인트",
      "question": "관계 총평에서 옐로포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "옐로포인트은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
      "summary": "좋아도 살짝 걸리는 신호를 과하게 키우지 않고 체크해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "관계 총평 > 옐로포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠/지지 관계, 관계 신호, 대화 온도",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "옐로포인트은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "관계 총평 > 옐로포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠/지지 관계 · 관계 신호 · 대화 온도",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감이 있는데도 답장, 약속, 말투 같은 작은 장면에서 체감이 갈릴 수 있어요. 그래서 이 파트는 좋아 보이는 순간과 살짝 걸리는 순간을 같은 화면에 놓고 읽습니다. 이 항목에서는 특히 '옐로포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "관계 단계, 최근 연락 온도, 이미 쌓인 서운함이 들어오면 강약이 달라집니다. 아직 계산값이 비어 있으면 큰 결만 보고, 실제 판정처럼 받아들이지 않는 편이 좋습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
              "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "좋은 신호 하나만 보고 관계 전체를 판단하지 않기 / 불안한 상상을 확인한 사실처럼 말하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
              "불안한 상상을 확인한 사실처럼 말하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
        "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
      ],
      "cautions": [
        "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
        "불안한 상상을 확인한 사실처럼 말하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "relationship_overview__green_light_points",
          "title": "그린라이트 포인트",
          "route": "index.html?section=relationship_overview__green_light_points#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "relationship_overview__maintenance_difficulty",
          "title": "관계 유지 난이도",
          "route": "index.html?section=relationship_overview__maintenance_difficulty#step-6_1-report"
        }
      ]
    },
    "relationship_overview__maintenance_difficulty": {
      "section_id": "relationship_overview__maintenance_difficulty",
      "report_index_source": "user_seed",
      "group_id": "relationship_overview",
      "group_title": "관계 총평",
      "title": "관계 유지 난이도",
      "question": "관계 총평에서 관계 유지 난이도은 두 사람에게 어떤 의미일까?",
      "conclusion": "관계 유지 난이도은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
      "summary": "좋아하는 마음과 실제 유지 체력을 나눠서 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "관계 총평 > 관계 유지 난이도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠/지지 관계, 관계 신호, 대화 온도",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "관계 유지 난이도은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "관계 총평 > 관계 유지 난이도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠/지지 관계 · 관계 신호 · 대화 온도",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감이 있는데도 답장, 약속, 말투 같은 작은 장면에서 체감이 갈릴 수 있어요. 그래서 이 파트는 좋아 보이는 순간과 살짝 걸리는 순간을 같은 화면에 놓고 읽습니다. 이 항목에서는 특히 '관계 유지 난이도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "관계 단계, 최근 연락 온도, 이미 쌓인 서운함이 들어오면 강약이 달라집니다. 아직 계산값이 비어 있으면 큰 결만 보고, 실제 판정처럼 받아들이지 않는 편이 좋습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
              "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "좋은 신호 하나만 보고 관계 전체를 판단하지 않기 / 불안한 상상을 확인한 사실처럼 말하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
              "불안한 상상을 확인한 사실처럼 말하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
        "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
      ],
      "cautions": [
        "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
        "불안한 상상을 확인한 사실처럼 말하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "relationship_overview__yellow_points",
          "title": "옐로포인트",
          "route": "index.html?section=relationship_overview__yellow_points#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "relationship_overview__question_to_check",
          "title": "지금 확인할 질문",
          "route": "index.html?section=relationship_overview__question_to_check#step-6_1-report"
        }
      ]
    },
    "relationship_overview__question_to_check": {
      "section_id": "relationship_overview__question_to_check",
      "report_index_source": "user_seed",
      "group_id": "relationship_overview",
      "group_title": "관계 총평",
      "title": "지금 확인할 질문",
      "question": "관계 총평에서 지금 확인할 질문은 두 사람에게 어떤 의미일까?",
      "conclusion": "지금 확인할 질문은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
      "summary": "오늘 바로 물어봐도 덜 부담스러운 질문을 뽑아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "관계 총평 > 지금 확인할 질문",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠/지지 관계, 관계 신호, 대화 온도",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "지금 확인할 질문은 첫 체감과 유지 체력을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 두 사람은 좋은 신호와 확인할 신호를 같이 봐야 관계 톤이 선명해집니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "관계 총평 > 지금 확인할 질문",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠/지지 관계 · 관계 신호 · 대화 온도",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감이 있는데도 답장, 약속, 말투 같은 작은 장면에서 체감이 갈릴 수 있어요. 그래서 이 파트는 좋아 보이는 순간과 살짝 걸리는 순간을 같은 화면에 놓고 읽습니다. 이 항목에서는 특히 '지금 확인할 질문'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "관계 단계, 최근 연락 온도, 이미 쌓인 서운함이 들어오면 강약이 달라집니다. 아직 계산값이 비어 있으면 큰 결만 보고, 실제 판정처럼 받아들이지 않는 편이 좋습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "질문은 '내가 느낀 것'과 '확인하고 싶은 것'을 나눠 한 문장으로 쓰기",
              "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
              "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "좋은 신호 하나만 보고 관계 전체를 판단하지 않기 / 불안한 상상을 확인한 사실처럼 말하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
              "불안한 상상을 확인한 사실처럼 말하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "질문은 '내가 느낀 것'과 '확인하고 싶은 것'을 나눠 한 문장으로 쓰기",
        "좋았던 장면 하나와 걸렸던 장면 하나를 따로 적기",
        "상대에게 결론보다 확인 질문 하나를 먼저 보내기"
      ],
      "cautions": [
        "좋은 신호 하나만 보고 관계 전체를 판단하지 않기",
        "불안한 상상을 확인한 사실처럼 말하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "relationship_overview__maintenance_difficulty",
          "title": "관계 유지 난이도",
          "route": "index.html?section=relationship_overview__maintenance_difficulty#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "zodiac_branch_match__best_fit_combo",
          "title": "찰떡 조합",
          "route": "index.html?section=zodiac_branch_match__best_fit_combo#step-6_1-report"
        }
      ]
    },
    "zodiac_branch_match__best_fit_combo": {
      "section_id": "zodiac_branch_match__best_fit_combo",
      "report_index_source": "user_seed",
      "group_id": "zodiac_branch_match",
      "group_title": "띠/지지 궁합",
      "title": "찰떡 조합",
      "question": "띠/지지 궁합에서 찰떡 조합은 두 사람에게 어떤 의미일까?",
      "conclusion": "찰떡 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
      "summary": "같이 있을 때 자연스럽게 편해지는 조합 신호를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "띠/지지 궁합 > 찰떡 조합",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠 조합, 지지 관계, 협력과 충돌 패턴",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000305",
          "kind": "rag",
          "label": "자료 근거",
          "value": "띠와 지지 관계를 조화, 불화, 협력, 갈등 축으로 나누어 관계 해석에 연결할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "찰떡 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "띠/지지 궁합 > 찰떡 조합",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠 조합 · 지지 관계 · 협력과 충돌 패턴",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 취향보다 반응 방식에서 차이가 납니다. 같이 움직일 때 편한지, 중요한 선택 앞에서 서로 다른 방향을 보는지가 핵심입니다. 이 항목에서는 특히 '찰떡 조합'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "정밀 해석은 두 사람의 출생 정보로 지지 관계가 계산된 뒤 좁혀집니다. 현재 화면은 선택한 항목의 해석 구조를 먼저 보여주는 단계입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "둘이 잘 맞았던 공동 행동을 하나 고르기",
              "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "띠 하나로 결혼이나 동업을 판정하지 않기 / 거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "띠 하나로 결혼이나 동업을 판정하지 않기",
              "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000305",
            "zip-궁합-qa-000153",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "둘이 잘 맞았던 공동 행동을 하나 고르기",
        "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
      ],
      "cautions": [
        "띠 하나로 결혼이나 동업을 판정하지 않기",
        "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "relationship_overview__question_to_check",
          "title": "지금 확인할 질문",
          "route": "index.html?section=relationship_overview__question_to_check#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "zodiac_branch_match__steady_combo",
          "title": "무난한 조합",
          "route": "index.html?section=zodiac_branch_match__steady_combo#step-6_1-report"
        }
      ]
    },
    "zodiac_branch_match__steady_combo": {
      "section_id": "zodiac_branch_match__steady_combo",
      "report_index_source": "user_seed",
      "group_id": "zodiac_branch_match",
      "group_title": "띠/지지 궁합",
      "title": "무난한 조합",
      "question": "띠/지지 궁합에서 무난한 조합은 두 사람에게 어떤 의미일까?",
      "conclusion": "무난한 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
      "summary": "큰 드라마보다 꾸준함으로 가는 궁합 결을 확인해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "띠/지지 궁합 > 무난한 조합",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠 조합, 지지 관계, 협력과 충돌 패턴",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "무난한 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "띠/지지 궁합 > 무난한 조합",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠 조합 · 지지 관계 · 협력과 충돌 패턴",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 취향보다 반응 방식에서 차이가 납니다. 같이 움직일 때 편한지, 중요한 선택 앞에서 서로 다른 방향을 보는지가 핵심입니다. 이 항목에서는 특히 '무난한 조합'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "정밀 해석은 두 사람의 출생 정보로 지지 관계가 계산된 뒤 좁혀집니다. 현재 화면은 선택한 항목의 해석 구조를 먼저 보여주는 단계입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "둘이 잘 맞았던 공동 행동을 하나 고르기",
              "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "띠 하나로 결혼이나 동업을 판정하지 않기 / 거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "띠 하나로 결혼이나 동업을 판정하지 않기",
              "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "둘이 잘 맞았던 공동 행동을 하나 고르기",
        "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
      ],
      "cautions": [
        "띠 하나로 결혼이나 동업을 판정하지 않기",
        "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "zodiac_branch_match__best_fit_combo",
          "title": "찰떡 조합",
          "route": "index.html?section=zodiac_branch_match__best_fit_combo#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "zodiac_branch_match__needs_space_combo",
          "title": "거리 필요한 조합",
          "route": "index.html?section=zodiac_branch_match__needs_space_combo#step-6_1-report"
        }
      ]
    },
    "zodiac_branch_match__needs_space_combo": {
      "section_id": "zodiac_branch_match__needs_space_combo",
      "report_index_source": "user_seed",
      "group_id": "zodiac_branch_match",
      "group_title": "띠/지지 궁합",
      "title": "거리 필요한 조합",
      "question": "띠/지지 궁합에서 거리 필요한 조합은 두 사람에게 어떤 의미일까?",
      "conclusion": "거리 필요한 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
      "summary": "붙어 있을수록 예민해질 수 있는 거리감을 체크해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "띠/지지 궁합 > 거리 필요한 조합",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠 조합, 지지 관계, 협력과 충돌 패턴",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "거리 필요한 조합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "띠/지지 궁합 > 거리 필요한 조합",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠 조합 · 지지 관계 · 협력과 충돌 패턴",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 취향보다 반응 방식에서 차이가 납니다. 같이 움직일 때 편한지, 중요한 선택 앞에서 서로 다른 방향을 보는지가 핵심입니다. 이 항목에서는 특히 '거리 필요한 조합'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "정밀 해석은 두 사람의 출생 정보로 지지 관계가 계산된 뒤 좁혀집니다. 현재 화면은 선택한 항목의 해석 구조를 먼저 보여주는 단계입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "둘이 잘 맞았던 공동 행동을 하나 고르기",
              "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "띠 하나로 결혼이나 동업을 판정하지 않기 / 거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "띠 하나로 결혼이나 동업을 판정하지 않기",
              "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000228",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "둘이 잘 맞았던 공동 행동을 하나 고르기",
        "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
      ],
      "cautions": [
        "띠 하나로 결혼이나 동업을 판정하지 않기",
        "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "zodiac_branch_match__steady_combo",
          "title": "무난한 조합",
          "route": "index.html?section=zodiac_branch_match__steady_combo#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "zodiac_branch_match__collision_button",
          "title": "충돌 버튼",
          "route": "index.html?section=zodiac_branch_match__collision_button#step-6_1-report"
        }
      ]
    },
    "zodiac_branch_match__collision_button": {
      "section_id": "zodiac_branch_match__collision_button",
      "report_index_source": "user_seed",
      "group_id": "zodiac_branch_match",
      "group_title": "띠/지지 궁합",
      "title": "충돌 버튼",
      "question": "띠/지지 궁합에서 충돌 버튼은 두 사람에게 어떤 의미일까?",
      "conclusion": "충돌 버튼은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
      "summary": "별일 아닌데 크게 튀는 포인트를 버튼처럼 표시해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "띠/지지 궁합 > 충돌 버튼",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠 조합, 지지 관계, 협력과 충돌 패턴",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "충돌 버튼은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "띠/지지 궁합 > 충돌 버튼",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠 조합 · 지지 관계 · 협력과 충돌 패턴",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 취향보다 반응 방식에서 차이가 납니다. 같이 움직일 때 편한지, 중요한 선택 앞에서 서로 다른 방향을 보는지가 핵심입니다. 이 항목에서는 특히 '충돌 버튼'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "정밀 해석은 두 사람의 출생 정보로 지지 관계가 계산된 뒤 좁혀집니다. 현재 화면은 선택한 항목의 해석 구조를 먼저 보여주는 단계입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "둘이 잘 맞았던 공동 행동을 하나 고르기",
              "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "띠 하나로 결혼이나 동업을 판정하지 않기 / 거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "띠 하나로 결혼이나 동업을 판정하지 않기",
              "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "둘이 잘 맞았던 공동 행동을 하나 고르기",
        "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
      ],
      "cautions": [
        "띠 하나로 결혼이나 동업을 판정하지 않기",
        "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "zodiac_branch_match__needs_space_combo",
          "title": "거리 필요한 조합",
          "route": "index.html?section=zodiac_branch_match__needs_space_combo#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "zodiac_branch_match__marriage_business_match",
          "title": "결혼/동업 궁합",
          "route": "index.html?section=zodiac_branch_match__marriage_business_match#step-6_1-report"
        }
      ]
    },
    "zodiac_branch_match__marriage_business_match": {
      "section_id": "zodiac_branch_match__marriage_business_match",
      "report_index_source": "user_seed",
      "group_id": "zodiac_branch_match",
      "group_title": "띠/지지 궁합",
      "title": "결혼/동업 궁합",
      "question": "띠/지지 궁합에서 결혼/동업 궁합은 두 사람에게 어떤 의미일까?",
      "conclusion": "결혼/동업 궁합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
      "summary": "연애 감정과 생활·파트너십 체력을 따로 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "띠/지지 궁합 > 결혼/동업 궁합",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "띠 조합, 지지 관계, 협력과 충돌 패턴",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "결혼/동업 궁합은 띠와 지지의 붙는 방식을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 띠와 지지는 두 사람이 어디서 자연스럽게 붙고 어디서 거리를 둬야 하는지 보는 보조 렌즈입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "띠/지지 궁합 > 결혼/동업 궁합",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "띠 조합 · 지지 관계 · 협력과 충돌 패턴",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 취향보다 반응 방식에서 차이가 납니다. 같이 움직일 때 편한지, 중요한 선택 앞에서 서로 다른 방향을 보는지가 핵심입니다. 이 항목에서는 특히 '결혼/동업 궁합'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "정밀 해석은 두 사람의 출생 정보로 지지 관계가 계산된 뒤 좁혀집니다. 현재 화면은 선택한 항목의 해석 구조를 먼저 보여주는 단계입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "둘이 잘 맞았던 공동 행동을 하나 고르기",
              "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "띠 하나로 결혼이나 동업을 판정하지 않기 / 거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "띠 하나로 결혼이나 동업을 판정하지 않기",
              "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "둘이 잘 맞았던 공동 행동을 하나 고르기",
        "반복해서 부딪히는 상황을 사람 탓이 아닌 버튼으로 적기"
      ],
      "cautions": [
        "띠 하나로 결혼이나 동업을 판정하지 않기",
        "거리 조절이 필요하다는 말을 마음이 식었다는 뜻으로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "zodiac_branch_match__collision_button",
          "title": "충돌 버튼",
          "route": "index.html?section=zodiac_branch_match__collision_button#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "five_element_chemistry__generating_tension",
          "title": "상생 텐션",
          "route": "index.html?section=five_element_chemistry__generating_tension#step-6_1-report"
        }
      ]
    },
    "five_element_chemistry__generating_tension": {
      "section_id": "five_element_chemistry__generating_tension",
      "report_index_source": "user_seed",
      "group_id": "five_element_chemistry",
      "group_title": "오행 케미",
      "title": "상생 텐션",
      "question": "오행 케미에서 상생 텐션은 두 사람에게 어떤 의미일까?",
      "conclusion": "상생 텐션은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
      "summary": "서로에게 힘을 실어주는 흐름을 오행으로 읽어요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오행 케미 > 상생 텐션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오행 상생, 오행 상극, 일간과 일지",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "zip-색체명리학-qa-000147",
          "kind": "rag",
          "label": "자료 근거",
          "value": "사주는 생년, 생월, 생일, 생시의 천간과 지지를 보고 일주의 천간은 일간, 지지는 일지로 구분함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "상생 텐션은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오행 케미 > 상생 텐션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오행 상생 · 오행 상극 · 일간과 일지",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 만나고 나서 기운이 차오르는지, 대화 후 자꾸 지치는지로 체감됩니다. 다른 기운은 틀린 기운이 아니라 조율법이 다른 기운으로 다룹니다. 이 항목에서는 특히 '상생 텐션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "두 사람의 일간, 일지, 오행 분포가 계산되면 상생·상극·보완 포인트가 더 좁아집니다. 숫자 점수 없이 장식 그래프를 만들지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
              "둘이 같이 하면 편해지는 활동 하나 고르기",
              "대화가 지치는 시간대를 피해서 만남 잡기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상극을 나쁜 궁합으로 바로 읽지 않기 / 부족한 오행을 결핍처럼 소비하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상극을 나쁜 궁합으로 바로 읽지 않기",
              "부족한 오행을 결핍처럼 소비하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
        "둘이 같이 하면 편해지는 활동 하나 고르기",
        "대화가 지치는 시간대를 피해서 만남 잡기"
      ],
      "cautions": [
        "상극을 나쁜 궁합으로 바로 읽지 않기",
        "부족한 오행을 결핍처럼 소비하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "zodiac_branch_match__marriage_business_match",
          "title": "결혼/동업 궁합",
          "route": "index.html?section=zodiac_branch_match__marriage_business_match#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "five_element_chemistry__controlling_tension",
          "title": "상극 텐션",
          "route": "index.html?section=five_element_chemistry__controlling_tension#step-6_1-report"
        }
      ]
    },
    "five_element_chemistry__controlling_tension": {
      "section_id": "five_element_chemistry__controlling_tension",
      "report_index_source": "user_seed",
      "group_id": "five_element_chemistry",
      "group_title": "오행 케미",
      "title": "상극 텐션",
      "question": "오행 케미에서 상극 텐션은 두 사람에게 어떤 의미일까?",
      "conclusion": "상극 텐션은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
      "summary": "끌리는데 피곤한 이유를 상극의 말투로 풀어요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오행 케미 > 상극 텐션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오행 상생, 오행 상극, 일간과 일지",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "상극 텐션은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오행 케미 > 상극 텐션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오행 상생 · 오행 상극 · 일간과 일지",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 만나고 나서 기운이 차오르는지, 대화 후 자꾸 지치는지로 체감됩니다. 다른 기운은 틀린 기운이 아니라 조율법이 다른 기운으로 다룹니다. 이 항목에서는 특히 '상극 텐션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "두 사람의 일간, 일지, 오행 분포가 계산되면 상생·상극·보완 포인트가 더 좁아집니다. 숫자 점수 없이 장식 그래프를 만들지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
              "둘이 같이 하면 편해지는 활동 하나 고르기",
              "대화가 지치는 시간대를 피해서 만남 잡기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상극을 나쁜 궁합으로 바로 읽지 않기 / 부족한 오행을 결핍처럼 소비하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상극을 나쁜 궁합으로 바로 읽지 않기",
              "부족한 오행을 결핍처럼 소비하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000230",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
        "둘이 같이 하면 편해지는 활동 하나 고르기",
        "대화가 지치는 시간대를 피해서 만남 잡기"
      ],
      "cautions": [
        "상극을 나쁜 궁합으로 바로 읽지 않기",
        "부족한 오행을 결핍처럼 소비하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "five_element_chemistry__generating_tension",
          "title": "상생 텐션",
          "route": "index.html?section=five_element_chemistry__generating_tension#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "five_element_chemistry__energy_charge_type",
          "title": "에너지 충전형",
          "route": "index.html?section=five_element_chemistry__energy_charge_type#step-6_1-report"
        }
      ]
    },
    "five_element_chemistry__energy_charge_type": {
      "section_id": "five_element_chemistry__energy_charge_type",
      "report_index_source": "user_seed",
      "group_id": "five_element_chemistry",
      "group_title": "오행 케미",
      "title": "에너지 충전형",
      "question": "오행 케미에서 에너지 충전형은 두 사람에게 어떤 의미일까?",
      "conclusion": "에너지 충전형은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
      "summary": "만나고 나면 기분이 차오르는 순간을 찾아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오행 케미 > 에너지 충전형",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오행 상생, 오행 상극, 일간과 일지",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "에너지 충전형은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오행 케미 > 에너지 충전형",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오행 상생 · 오행 상극 · 일간과 일지",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 만나고 나서 기운이 차오르는지, 대화 후 자꾸 지치는지로 체감됩니다. 다른 기운은 틀린 기운이 아니라 조율법이 다른 기운으로 다룹니다. 이 항목에서는 특히 '에너지 충전형'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "두 사람의 일간, 일지, 오행 분포가 계산되면 상생·상극·보완 포인트가 더 좁아집니다. 숫자 점수 없이 장식 그래프를 만들지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
              "둘이 같이 하면 편해지는 활동 하나 고르기",
              "대화가 지치는 시간대를 피해서 만남 잡기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상극을 나쁜 궁합으로 바로 읽지 않기 / 부족한 오행을 결핍처럼 소비하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상극을 나쁜 궁합으로 바로 읽지 않기",
              "부족한 오행을 결핍처럼 소비하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000153",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
        "둘이 같이 하면 편해지는 활동 하나 고르기",
        "대화가 지치는 시간대를 피해서 만남 잡기"
      ],
      "cautions": [
        "상극을 나쁜 궁합으로 바로 읽지 않기",
        "부족한 오행을 결핍처럼 소비하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "five_element_chemistry__controlling_tension",
          "title": "상극 텐션",
          "route": "index.html?section=five_element_chemistry__controlling_tension#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "five_element_chemistry__energy_drain_type",
          "title": "에너지 소모형",
          "route": "index.html?section=five_element_chemistry__energy_drain_type#step-6_1-report"
        }
      ]
    },
    "five_element_chemistry__energy_drain_type": {
      "section_id": "five_element_chemistry__energy_drain_type",
      "report_index_source": "user_seed",
      "group_id": "five_element_chemistry",
      "group_title": "오행 케미",
      "title": "에너지 소모형",
      "question": "오행 케미에서 에너지 소모형은 두 사람에게 어떤 의미일까?",
      "conclusion": "에너지 소모형은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
      "summary": "좋은데 자꾸 지치는 구간을 조용히 분리해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오행 케미 > 에너지 소모형",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오행 상생, 오행 상극, 일간과 일지",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "에너지 소모형은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오행 케미 > 에너지 소모형",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오행 상생 · 오행 상극 · 일간과 일지",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 만나고 나서 기운이 차오르는지, 대화 후 자꾸 지치는지로 체감됩니다. 다른 기운은 틀린 기운이 아니라 조율법이 다른 기운으로 다룹니다. 이 항목에서는 특히 '에너지 소모형'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "두 사람의 일간, 일지, 오행 분포가 계산되면 상생·상극·보완 포인트가 더 좁아집니다. 숫자 점수 없이 장식 그래프를 만들지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
              "둘이 같이 하면 편해지는 활동 하나 고르기",
              "대화가 지치는 시간대를 피해서 만남 잡기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상극을 나쁜 궁합으로 바로 읽지 않기 / 부족한 오행을 결핍처럼 소비하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상극을 나쁜 궁합으로 바로 읽지 않기",
              "부족한 오행을 결핍처럼 소비하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-궁합-qa-000074",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
        "둘이 같이 하면 편해지는 활동 하나 고르기",
        "대화가 지치는 시간대를 피해서 만남 잡기"
      ],
      "cautions": [
        "상극을 나쁜 궁합으로 바로 읽지 않기",
        "부족한 오행을 결핍처럼 소비하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "five_element_chemistry__energy_charge_type",
          "title": "에너지 충전형",
          "route": "index.html?section=five_element_chemistry__energy_charge_type#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "five_element_chemistry__missing_element_support",
          "title": "부족한 오행 보완 포인트",
          "route": "index.html?section=five_element_chemistry__missing_element_support#step-6_1-report"
        }
      ]
    },
    "five_element_chemistry__missing_element_support": {
      "section_id": "five_element_chemistry__missing_element_support",
      "report_index_source": "user_seed",
      "group_id": "five_element_chemistry",
      "group_title": "오행 케미",
      "title": "부족한 오행 보완 포인트",
      "question": "오행 케미에서 부족한 오행 보완 포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "부족한 오행 보완 포인트은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
      "summary": "둘 사이에서 비어 보이는 결을 생활 습관으로 채워요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오행 케미 > 부족한 오행 보완 포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오행 상생, 오행 상극, 일간과 일지",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "zip-색체명리학-qa-000147",
          "kind": "rag",
          "label": "자료 근거",
          "value": "사주는 생년, 생월, 생일, 생시의 천간과 지지를 보고 일주의 천간은 일간, 지지는 일지로 구분함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "부족한 오행 보완 포인트은 오행의 충전과 소모을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오행 케미는 끌림보다 에너지 사용법을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오행 케미 > 부족한 오행 보완 포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오행 상생 · 오행 상극 · 일간과 일지",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 만나고 나서 기운이 차오르는지, 대화 후 자꾸 지치는지로 체감됩니다. 다른 기운은 틀린 기운이 아니라 조율법이 다른 기운으로 다룹니다. 이 항목에서는 특히 '부족한 오행 보완 포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "두 사람의 일간, 일지, 오행 분포가 계산되면 상생·상극·보완 포인트가 더 좁아집니다. 숫자 점수 없이 장식 그래프를 만들지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
              "둘이 같이 하면 편해지는 활동 하나 고르기",
              "대화가 지치는 시간대를 피해서 만남 잡기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상극을 나쁜 궁합으로 바로 읽지 않기 / 부족한 오행을 결핍처럼 소비하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상극을 나쁜 궁합으로 바로 읽지 않기",
              "부족한 오행을 결핍처럼 소비하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "zip-색체명리학-qa-000147",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "같이 있을 때 충전되는 활동과 지치는 활동을 하나씩 적어보기",
        "둘이 같이 하면 편해지는 활동 하나 고르기",
        "대화가 지치는 시간대를 피해서 만남 잡기"
      ],
      "cautions": [
        "상극을 나쁜 궁합으로 바로 읽지 않기",
        "부족한 오행을 결핍처럼 소비하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "five_element_chemistry__energy_drain_type",
          "title": "에너지 소모형",
          "route": "index.html?section=five_element_chemistry__energy_drain_type#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "daymaster_sync__expression_speed",
          "title": "표현 속도",
          "route": "index.html?section=daymaster_sync__expression_speed#step-6_1-report"
        }
      ]
    },
    "daymaster_sync__expression_speed": {
      "section_id": "daymaster_sync__expression_speed",
      "report_index_source": "user_seed",
      "group_id": "daymaster_sync",
      "group_title": "일간 성향 싱크",
      "title": "표현 속도",
      "question": "일간 성향 싱크에서 표현 속도은 두 사람에게 어떤 의미일까?",
      "conclusion": "표현 속도은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
      "summary": "좋아하는 마음이 말로 나오는 속도 차이를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "일간 성향 싱크 > 표현 속도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "일간, 일지, 표현 방식",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-10-p1-0071",
          "kind": "rag",
          "label": "자료 근거",
          "value": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
        },
        {
          "id": "zip-색체명리학-qa-000147",
          "kind": "rag",
          "label": "자료 근거",
          "value": "사주는 생년, 생월, 생일, 생시의 천간과 지지를 보고 일주의 천간은 일간, 지지는 일지로 구분함"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "표현 속도은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "일간 성향 싱크 > 표현 속도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "일간 · 일지 · 표현 방식",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 한쪽은 바로 말하고, 한쪽은 생각을 정리한 뒤 움직이는 식으로 드러날 수 있어요. 속도 차이를 마음의 크기 차이로 오해하지 않는 게 핵심입니다. 이 항목에서는 특히 '표현 속도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "일간은 기준점일 뿐이라 사주 전체 구조와 관계 맥락을 함께 봐야 합니다. 입력값이 부족하면 성격 단정 대신 확인 질문으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대가 편해지는 대화 속도를 물어보기",
              "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "느린 표현을 무관심으로 단정하지 않기 / 빠른 표현을 압박으로만 해석하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "느린 표현을 무관심으로 단정하지 않기",
              "빠른 표현을 압박으로만 해석하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-색체명리학-qa-000147",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대가 편해지는 대화 속도를 물어보기",
        "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
      ],
      "cautions": [
        "느린 표현을 무관심으로 단정하지 않기",
        "빠른 표현을 압박으로만 해석하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "five_element_chemistry__missing_element_support",
          "title": "부족한 오행 보완 포인트",
          "route": "index.html?section=five_element_chemistry__missing_element_support#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "daymaster_sync__emotion_processing",
          "title": "감정 처리 방식",
          "route": "index.html?section=daymaster_sync__emotion_processing#step-6_1-report"
        }
      ]
    },
    "daymaster_sync__emotion_processing": {
      "section_id": "daymaster_sync__emotion_processing",
      "report_index_source": "user_seed",
      "group_id": "daymaster_sync",
      "group_title": "일간 성향 싱크",
      "title": "감정 처리 방식",
      "question": "일간 성향 싱크에서 감정 처리 방식은 두 사람에게 어떤 의미일까?",
      "conclusion": "감정 처리 방식은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
      "summary": "서운함을 바로 말하는지, 혼자 정리하는지 나눠요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "일간 성향 싱크 > 감정 처리 방식",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "일간, 일지, 표현 방식",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-10-p1-0071",
          "kind": "rag",
          "label": "자료 근거",
          "value": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "감정 처리 방식은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "일간 성향 싱크 > 감정 처리 방식",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "일간 · 일지 · 표현 방식",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 한쪽은 바로 말하고, 한쪽은 생각을 정리한 뒤 움직이는 식으로 드러날 수 있어요. 속도 차이를 마음의 크기 차이로 오해하지 않는 게 핵심입니다. 이 항목에서는 특히 '감정 처리 방식'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "일간은 기준점일 뿐이라 사주 전체 구조와 관계 맥락을 함께 봐야 합니다. 입력값이 부족하면 성격 단정 대신 확인 질문으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대가 편해지는 대화 속도를 물어보기",
              "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "느린 표현을 무관심으로 단정하지 않기 / 빠른 표현을 압박으로만 해석하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "느린 표현을 무관심으로 단정하지 않기",
              "빠른 표현을 압박으로만 해석하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0003",
            "zip-궁합-qa-000153",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대가 편해지는 대화 속도를 물어보기",
        "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
      ],
      "cautions": [
        "느린 표현을 무관심으로 단정하지 않기",
        "빠른 표현을 압박으로만 해석하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "daymaster_sync__expression_speed",
          "title": "표현 속도",
          "route": "index.html?section=daymaster_sync__expression_speed#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "daymaster_sync__affection_style",
          "title": "애정 표현 스타일",
          "route": "index.html?section=daymaster_sync__affection_style#step-6_1-report"
        }
      ]
    },
    "daymaster_sync__affection_style": {
      "section_id": "daymaster_sync__affection_style",
      "report_index_source": "user_seed",
      "group_id": "daymaster_sync",
      "group_title": "일간 성향 싱크",
      "title": "애정 표현 스타일",
      "question": "일간 성향 싱크에서 애정 표현 스타일은 두 사람에게 어떤 의미일까?",
      "conclusion": "애정 표현 스타일은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
      "summary": "말, 행동, 챙김 중 어디서 사랑이 드러나는지 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "일간 성향 싱크 > 애정 표현 스타일",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "일간, 일지, 표현 방식",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-10-p1-0071",
          "kind": "rag",
          "label": "자료 근거",
          "value": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "애정 표현 스타일은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "일간 성향 싱크 > 애정 표현 스타일",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "일간 · 일지 · 표현 방식",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 한쪽은 바로 말하고, 한쪽은 생각을 정리한 뒤 움직이는 식으로 드러날 수 있어요. 속도 차이를 마음의 크기 차이로 오해하지 않는 게 핵심입니다. 이 항목에서는 특히 '애정 표현 스타일'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "일간은 기준점일 뿐이라 사주 전체 구조와 관계 맥락을 함께 봐야 합니다. 입력값이 부족하면 성격 단정 대신 확인 질문으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대가 편해지는 대화 속도를 물어보기",
              "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "느린 표현을 무관심으로 단정하지 않기 / 빠른 표현을 압박으로만 해석하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "느린 표현을 무관심으로 단정하지 않기",
              "빠른 표현을 압박으로만 해석하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대가 편해지는 대화 속도를 물어보기",
        "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
      ],
      "cautions": [
        "느린 표현을 무관심으로 단정하지 않기",
        "빠른 표현을 압박으로만 해석하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "daymaster_sync__emotion_processing",
          "title": "감정 처리 방식",
          "route": "index.html?section=daymaster_sync__emotion_processing#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "daymaster_sync__independence_dependence",
          "title": "독립성/의존도",
          "route": "index.html?section=daymaster_sync__independence_dependence#step-6_1-report"
        }
      ]
    },
    "daymaster_sync__independence_dependence": {
      "section_id": "daymaster_sync__independence_dependence",
      "report_index_source": "user_seed",
      "group_id": "daymaster_sync",
      "group_title": "일간 성향 싱크",
      "title": "독립성/의존도",
      "question": "일간 성향 싱크에서 독립성/의존도은 두 사람에게 어떤 의미일까?",
      "conclusion": "독립성/의존도은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
      "summary": "각자 시간이 필요한 쪽과 붙어 있어야 안정되는 쪽을 비교해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "일간 성향 싱크 > 독립성/의존도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "일간, 일지, 표현 방식",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-10-p1-0071",
          "kind": "rag",
          "label": "자료 근거",
          "value": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "독립성/의존도은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "일간 성향 싱크 > 독립성/의존도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "일간 · 일지 · 표현 방식",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 한쪽은 바로 말하고, 한쪽은 생각을 정리한 뒤 움직이는 식으로 드러날 수 있어요. 속도 차이를 마음의 크기 차이로 오해하지 않는 게 핵심입니다. 이 항목에서는 특히 '독립성/의존도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "일간은 기준점일 뿐이라 사주 전체 구조와 관계 맥락을 함께 봐야 합니다. 입력값이 부족하면 성격 단정 대신 확인 질문으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대가 편해지는 대화 속도를 물어보기",
              "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "느린 표현을 무관심으로 단정하지 않기 / 빠른 표현을 압박으로만 해석하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "느린 표현을 무관심으로 단정하지 않기",
              "빠른 표현을 압박으로만 해석하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "item-41-qa-0007",
            "zip-궁합-qa-000074",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대가 편해지는 대화 속도를 물어보기",
        "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
      ],
      "cautions": [
        "느린 표현을 무관심으로 단정하지 않기",
        "빠른 표현을 압박으로만 해석하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "daymaster_sync__affection_style",
          "title": "애정 표현 스타일",
          "route": "index.html?section=daymaster_sync__affection_style#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "daymaster_sync__comfort_condition",
          "title": "관계에서 편해지는 조건",
          "route": "index.html?section=daymaster_sync__comfort_condition#step-6_1-report"
        }
      ]
    },
    "daymaster_sync__comfort_condition": {
      "section_id": "daymaster_sync__comfort_condition",
      "report_index_source": "user_seed",
      "group_id": "daymaster_sync",
      "group_title": "일간 성향 싱크",
      "title": "관계에서 편해지는 조건",
      "question": "일간 성향 싱크에서 관계에서 편해지는 조건은 두 사람에게 어떤 의미일까?",
      "conclusion": "관계에서 편해지는 조건은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
      "summary": "두 사람이 긴장을 풀고 자기답게 있는 조건을 찾습니다.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "일간 성향 싱크 > 관계에서 편해지는 조건",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "일간, 일지, 표현 방식",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-10-p1-0071",
          "kind": "rag",
          "label": "자료 근거",
          "value": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "관계에서 편해지는 조건은 일간 기반 반응 속도을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 일간 성향은 두 사람이 마음을 처리하고 표현하는 속도를 보는 기준점입니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "일간 성향 싱크 > 관계에서 편해지는 조건",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "일간 · 일지 · 표현 방식",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 한쪽은 바로 말하고, 한쪽은 생각을 정리한 뒤 움직이는 식으로 드러날 수 있어요. 속도 차이를 마음의 크기 차이로 오해하지 않는 게 핵심입니다. 이 항목에서는 특히 '관계에서 편해지는 조건'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "일간은 기준점일 뿐이라 사주 전체 구조와 관계 맥락을 함께 봐야 합니다. 입력값이 부족하면 성격 단정 대신 확인 질문으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대가 편해지는 대화 속도를 물어보기",
              "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "느린 표현을 무관심으로 단정하지 않기 / 빠른 표현을 압박으로만 해석하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "느린 표현을 무관심으로 단정하지 않기",
              "빠른 표현을 압박으로만 해석하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-10-p1-0071",
            "zip-궁합-qa-000153",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대가 편해지는 대화 속도를 물어보기",
        "바로 답이 필요한 말과 기다려도 되는 말을 나누기"
      ],
      "cautions": [
        "느린 표현을 무관심으로 단정하지 않기",
        "빠른 표현을 압박으로만 해석하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "daymaster_sync__independence_dependence",
          "title": "독립성/의존도",
          "route": "index.html?section=daymaster_sync__independence_dependence#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "ten_star_code__friend_like_love",
          "title": "친구 같은 연애",
          "route": "index.html?section=ten_star_code__friend_like_love#step-6_1-report"
        }
      ]
    },
    "ten_star_code__friend_like_love": {
      "section_id": "ten_star_code__friend_like_love",
      "report_index_source": "user_seed",
      "group_id": "ten_star_code",
      "group_title": "십성 관계 코드",
      "title": "친구 같은 연애",
      "question": "십성 관계 코드에서 친구 같은 연애은 두 사람에게 어떤 의미일까?",
      "conclusion": "친구 같은 연애은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
      "summary": "편하게 장난치고 같이 노는 관계 코드를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "십성 관계 코드 > 친구 같은 연애",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "십성, 육친 관계, 감정 역할",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "친구 같은 연애은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "십성 관계 코드 > 친구 같은 연애",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "십성 · 육친 관계 · 감정 역할",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 장난이 편한 관계인지, 챙김이 먼저 나오는 관계인지, 약속과 책임을 중요하게 보는 관계인지로 드러납니다. 이 항목에서는 특히 '친구 같은 연애'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "십성은 일간을 기준으로 잡기 때문에 정확한 계산값이 들어와야 세부 역할이 좁혀집니다. 현재는 역할 프레임을 먼저 보여줍니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "상대에게 가장 고마웠던 역할을 하나 말하기",
              "부담이 되는 기대를 역할 이름으로 정리하기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기 / 책임 이야기를 애정 시험으로 만들지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
              "책임 이야기를 애정 시험으로 만들지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "상대에게 가장 고마웠던 역할을 하나 말하기",
        "부담이 되는 기대를 역할 이름으로 정리하기"
      ],
      "cautions": [
        "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
        "책임 이야기를 애정 시험으로 만들지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "daymaster_sync__comfort_condition",
          "title": "관계에서 편해지는 조건",
          "route": "index.html?section=daymaster_sync__comfort_condition#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "ten_star_code__flirting_code",
          "title": "설렘/플러팅 코드",
          "route": "index.html?section=ten_star_code__flirting_code#step-6_1-report"
        }
      ]
    },
    "ten_star_code__flirting_code": {
      "section_id": "ten_star_code__flirting_code",
      "report_index_source": "user_seed",
      "group_id": "ten_star_code",
      "group_title": "십성 관계 코드",
      "title": "설렘/플러팅 코드",
      "question": "십성 관계 코드에서 설렘/플러팅 코드은 두 사람에게 어떤 의미일까?",
      "conclusion": "설렘/플러팅 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
      "summary": "상대가 나를 끌리게 만드는 포인트를 짧게 잡아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "십성 관계 코드 > 설렘/플러팅 코드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "십성, 육친 관계, 감정 역할",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "설렘/플러팅 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "십성 관계 코드 > 설렘/플러팅 코드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "십성 · 육친 관계 · 감정 역할",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 장난이 편한 관계인지, 챙김이 먼저 나오는 관계인지, 약속과 책임을 중요하게 보는 관계인지로 드러납니다. 이 항목에서는 특히 '설렘/플러팅 코드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "십성은 일간을 기준으로 잡기 때문에 정확한 계산값이 들어와야 세부 역할이 좁혀집니다. 현재는 역할 프레임을 먼저 보여줍니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 가장 고마웠던 역할을 하나 말하기",
              "부담이 되는 기대를 역할 이름으로 정리하기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기 / 책임 이야기를 애정 시험으로 만들지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
              "책임 이야기를 애정 시험으로 만들지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 가장 고마웠던 역할을 하나 말하기",
        "부담이 되는 기대를 역할 이름으로 정리하기"
      ],
      "cautions": [
        "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
        "책임 이야기를 애정 시험으로 만들지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "ten_star_code__friend_like_love",
          "title": "친구 같은 연애",
          "route": "index.html?section=ten_star_code__friend_like_love#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "ten_star_code__real_life_care",
          "title": "현실 케어 코드",
          "route": "index.html?section=ten_star_code__real_life_care#step-6_1-report"
        }
      ]
    },
    "ten_star_code__real_life_care": {
      "section_id": "ten_star_code__real_life_care",
      "report_index_source": "user_seed",
      "group_id": "ten_star_code",
      "group_title": "십성 관계 코드",
      "title": "현실 케어 코드",
      "question": "십성 관계 코드에서 현실 케어 코드은 두 사람에게 어떤 의미일까?",
      "conclusion": "현실 케어 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
      "summary": "챙김, 계획, 생활 안정감이 어디서 나오는지 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "십성 관계 코드 > 현실 케어 코드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "십성, 육친 관계, 감정 역할",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "현실 케어 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "십성 관계 코드 > 현실 케어 코드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "십성 · 육친 관계 · 감정 역할",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 장난이 편한 관계인지, 챙김이 먼저 나오는 관계인지, 약속과 책임을 중요하게 보는 관계인지로 드러납니다. 이 항목에서는 특히 '현실 케어 코드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "십성은 일간을 기준으로 잡기 때문에 정확한 계산값이 들어와야 세부 역할이 좁혀집니다. 현재는 역할 프레임을 먼저 보여줍니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 가장 고마웠던 역할을 하나 말하기",
              "부담이 되는 기대를 역할 이름으로 정리하기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기 / 책임 이야기를 애정 시험으로 만들지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
              "책임 이야기를 애정 시험으로 만들지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 가장 고마웠던 역할을 하나 말하기",
        "부담이 되는 기대를 역할 이름으로 정리하기"
      ],
      "cautions": [
        "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
        "책임 이야기를 애정 시험으로 만들지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "ten_star_code__flirting_code",
          "title": "설렘/플러팅 코드",
          "route": "index.html?section=ten_star_code__flirting_code#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "ten_star_code__official_commitment",
          "title": "책임/공식 관계 코드",
          "route": "index.html?section=ten_star_code__official_commitment#step-6_1-report"
        }
      ]
    },
    "ten_star_code__official_commitment": {
      "section_id": "ten_star_code__official_commitment",
      "report_index_source": "user_seed",
      "group_id": "ten_star_code",
      "group_title": "십성 관계 코드",
      "title": "책임/공식 관계 코드",
      "question": "십성 관계 코드에서 책임/공식 관계 코드은 두 사람에게 어떤 의미일까?",
      "conclusion": "책임/공식 관계 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
      "summary": "관계 이름표와 약속을 대하는 태도를 확인해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "십성 관계 코드 > 책임/공식 관계 코드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "십성, 육친 관계, 감정 역할",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "책임/공식 관계 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "십성 관계 코드 > 책임/공식 관계 코드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "십성 · 육친 관계 · 감정 역할",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 장난이 편한 관계인지, 챙김이 먼저 나오는 관계인지, 약속과 책임을 중요하게 보는 관계인지로 드러납니다. 이 항목에서는 특히 '책임/공식 관계 코드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "십성은 일간을 기준으로 잡기 때문에 정확한 계산값이 들어와야 세부 역할이 좁혀집니다. 현재는 역할 프레임을 먼저 보여줍니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 가장 고마웠던 역할을 하나 말하기",
              "부담이 되는 기대를 역할 이름으로 정리하기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기 / 책임 이야기를 애정 시험으로 만들지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
              "책임 이야기를 애정 시험으로 만들지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "zip-궁합-qa-000203",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 가장 고마웠던 역할을 하나 말하기",
        "부담이 되는 기대를 역할 이름으로 정리하기"
      ],
      "cautions": [
        "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
        "책임 이야기를 애정 시험으로 만들지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "ten_star_code__real_life_care",
          "title": "현실 케어 코드",
          "route": "index.html?section=ten_star_code__real_life_care#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "ten_star_code__emotional_leaning",
          "title": "기대고 싶은 정서 코드",
          "route": "index.html?section=ten_star_code__emotional_leaning#step-6_1-report"
        }
      ]
    },
    "ten_star_code__emotional_leaning": {
      "section_id": "ten_star_code__emotional_leaning",
      "report_index_source": "user_seed",
      "group_id": "ten_star_code",
      "group_title": "십성 관계 코드",
      "title": "기대고 싶은 정서 코드",
      "question": "십성 관계 코드에서 기대고 싶은 정서 코드은 두 사람에게 어떤 의미일까?",
      "conclusion": "기대고 싶은 정서 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
      "summary": "힘든 날 누구에게 어떻게 기대고 싶은지 읽어요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "십성 관계 코드 > 기대고 싶은 정서 코드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "십성, 육친 관계, 감정 역할",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "기대고 싶은 정서 코드은 관계 안의 역할 코드을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 십성 코드는 두 사람이 친구, 케어, 책임, 설렘 중 어떤 역할로 서로에게 닿는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "십성 관계 코드 > 기대고 싶은 정서 코드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "십성 · 육친 관계 · 감정 역할",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 장난이 편한 관계인지, 챙김이 먼저 나오는 관계인지, 약속과 책임을 중요하게 보는 관계인지로 드러납니다. 이 항목에서는 특히 '기대고 싶은 정서 코드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "십성은 일간을 기준으로 잡기 때문에 정확한 계산값이 들어와야 세부 역할이 좁혀집니다. 현재는 역할 프레임을 먼저 보여줍니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 가장 고마웠던 역할을 하나 말하기",
              "부담이 되는 기대를 역할 이름으로 정리하기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기 / 책임 이야기를 애정 시험으로 만들지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
              "책임 이야기를 애정 시험으로 만들지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000550",
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 가장 고마웠던 역할을 하나 말하기",
        "부담이 되는 기대를 역할 이름으로 정리하기"
      ],
      "cautions": [
        "상대가 맡아주길 바라는 역할을 당연하게 요구하지 않기",
        "책임 이야기를 애정 시험으로 만들지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "ten_star_code__official_commitment",
          "title": "책임/공식 관계 코드",
          "route": "index.html?section=ten_star_code__official_commitment#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "communication_match__tone_temperature",
          "title": "말투 온도",
          "route": "index.html?section=communication_match__tone_temperature#step-6_1-report"
        }
      ]
    },
    "communication_match__tone_temperature": {
      "section_id": "communication_match__tone_temperature",
      "report_index_source": "user_seed",
      "group_id": "communication_match",
      "group_title": "소통 궁합",
      "title": "말투 온도",
      "question": "소통 궁합에서 말투 온도은 두 사람에게 어떤 의미일까?",
      "conclusion": "말투 온도은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
      "summary": "차갑게 들리는 말과 따뜻하게 받는 말의 차이를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "소통 궁합 > 말투 온도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "의사소통, 감정 표현, 오늘 대화",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "말투 온도은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "소통 궁합 > 말투 온도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "의사소통 · 감정 표현 · 오늘 대화",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 내용보다 온도 때문에 서운해지는 장면이 많습니다. 답장 속도, 말 끝, 설명 순서가 관계 체감에 크게 작용할 수 있어요. 이 항목에서는 특히 '말투 온도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 연락 빈도와 다툰 뒤 회복 방식이 들어오면 더 정확해집니다. 지금은 상대를 몰아붙이지 않는 문장 구조를 우선합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
              "답장 속도보다 답장 내용의 온도를 먼저 보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "읽씹 같은 단어로 바로 몰아가지 않기 / 긴 설명을 한 번에 보내 상대 방어를 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "읽씹 같은 단어로 바로 몰아가지 않기",
              "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
        "답장 속도보다 답장 내용의 온도를 먼저 보기"
      ],
      "cautions": [
        "읽씹 같은 단어로 바로 몰아가지 않기",
        "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "ten_star_code__emotional_leaning",
          "title": "기대고 싶은 정서 코드",
          "route": "index.html?section=ten_star_code__emotional_leaning#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "communication_match__reply_rhythm",
          "title": "답장/연락 리듬",
          "route": "index.html?section=communication_match__reply_rhythm#step-6_1-report"
        }
      ]
    },
    "communication_match__reply_rhythm": {
      "section_id": "communication_match__reply_rhythm",
      "report_index_source": "user_seed",
      "group_id": "communication_match",
      "group_title": "소통 궁합",
      "title": "답장/연락 리듬",
      "question": "소통 궁합에서 답장/연락 리듬은 두 사람에게 어떤 의미일까?",
      "conclusion": "답장/연락 리듬은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
      "summary": "답장 속도를 관심의 크기로만 보지 않게 정리해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "소통 궁합 > 답장/연락 리듬",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "의사소통, 감정 표현, 오늘 대화",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "답장/연락 리듬은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "소통 궁합 > 답장/연락 리듬",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "의사소통 · 감정 표현 · 오늘 대화",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 내용보다 온도 때문에 서운해지는 장면이 많습니다. 답장 속도, 말 끝, 설명 순서가 관계 체감에 크게 작용할 수 있어요. 이 항목에서는 특히 '답장/연락 리듬'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 연락 빈도와 다툰 뒤 회복 방식이 들어오면 더 정확해집니다. 지금은 상대를 몰아붙이지 않는 문장 구조를 우선합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
              "답장 속도보다 답장 내용의 온도를 먼저 보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "읽씹 같은 단어로 바로 몰아가지 않기 / 긴 설명을 한 번에 보내 상대 방어를 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "읽씹 같은 단어로 바로 몰아가지 않기",
              "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
        "답장 속도보다 답장 내용의 온도를 먼저 보기"
      ],
      "cautions": [
        "읽씹 같은 단어로 바로 몰아가지 않기",
        "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "communication_match__tone_temperature",
          "title": "말투 온도",
          "route": "index.html?section=communication_match__tone_temperature#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "communication_match__hurt_handling",
          "title": "서운함 처리법",
          "route": "index.html?section=communication_match__hurt_handling#step-6_1-report"
        }
      ]
    },
    "communication_match__hurt_handling": {
      "section_id": "communication_match__hurt_handling",
      "report_index_source": "user_seed",
      "group_id": "communication_match",
      "group_title": "소통 궁합",
      "title": "서운함 처리법",
      "question": "소통 궁합에서 서운함 처리법은 두 사람에게 어떤 의미일까?",
      "conclusion": "서운함 처리법은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
      "summary": "서운할 때 바로 꺼낼 말과 잠깐 보류할 말을 나눠요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "소통 궁합 > 서운함 처리법",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "의사소통, 감정 표현, 오늘 대화",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "서운함 처리법은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "소통 궁합 > 서운함 처리법",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "의사소통 · 감정 표현 · 오늘 대화",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 내용보다 온도 때문에 서운해지는 장면이 많습니다. 답장 속도, 말 끝, 설명 순서가 관계 체감에 크게 작용할 수 있어요. 이 항목에서는 특히 '서운함 처리법'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 연락 빈도와 다툰 뒤 회복 방식이 들어오면 더 정확해집니다. 지금은 상대를 몰아붙이지 않는 문장 구조를 우선합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
              "답장 속도보다 답장 내용의 온도를 먼저 보기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "읽씹 같은 단어로 바로 몰아가지 않기 / 긴 설명을 한 번에 보내 상대 방어를 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "읽씹 같은 단어로 바로 몰아가지 않기",
              "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "zip-궁합-qa-000153",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
        "답장 속도보다 답장 내용의 온도를 먼저 보기"
      ],
      "cautions": [
        "읽씹 같은 단어로 바로 몰아가지 않기",
        "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "communication_match__reply_rhythm",
          "title": "답장/연락 리듬",
          "route": "index.html?section=communication_match__reply_rhythm#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "communication_match__defense_pattern",
          "title": "싸울 때 방어 패턴",
          "route": "index.html?section=communication_match__defense_pattern#step-6_1-report"
        }
      ]
    },
    "communication_match__defense_pattern": {
      "section_id": "communication_match__defense_pattern",
      "report_index_source": "user_seed",
      "group_id": "communication_match",
      "group_title": "소통 궁합",
      "title": "싸울 때 방어 패턴",
      "question": "소통 궁합에서 싸울 때 방어 패턴은 두 사람에게 어떤 의미일까?",
      "conclusion": "싸울 때 방어 패턴은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
      "summary": "말이 세지는 쪽, 닫히는 쪽, 피하는 쪽을 구분해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "소통 궁합 > 싸울 때 방어 패턴",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "의사소통, 감정 표현, 오늘 대화",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "싸울 때 방어 패턴은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "소통 궁합 > 싸울 때 방어 패턴",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "의사소통 · 감정 표현 · 오늘 대화",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 내용보다 온도 때문에 서운해지는 장면이 많습니다. 답장 속도, 말 끝, 설명 순서가 관계 체감에 크게 작용할 수 있어요. 이 항목에서는 특히 '싸울 때 방어 패턴'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 연락 빈도와 다툰 뒤 회복 방식이 들어오면 더 정확해집니다. 지금은 상대를 몰아붙이지 않는 문장 구조를 우선합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
              "답장 속도보다 답장 내용의 온도를 먼저 보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "읽씹 같은 단어로 바로 몰아가지 않기 / 긴 설명을 한 번에 보내 상대 방어를 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "읽씹 같은 단어로 바로 몰아가지 않기",
              "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
        "답장 속도보다 답장 내용의 온도를 먼저 보기"
      ],
      "cautions": [
        "읽씹 같은 단어로 바로 몰아가지 않기",
        "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "communication_match__hurt_handling",
          "title": "서운함 처리법",
          "route": "index.html?section=communication_match__hurt_handling#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "communication_match__reconciliation_sentence",
          "title": "화해 문장 추천",
          "route": "index.html?section=communication_match__reconciliation_sentence#step-6_1-report"
        }
      ]
    },
    "communication_match__reconciliation_sentence": {
      "section_id": "communication_match__reconciliation_sentence",
      "report_index_source": "user_seed",
      "group_id": "communication_match",
      "group_title": "소통 궁합",
      "title": "화해 문장 추천",
      "question": "소통 궁합에서 화해 문장 추천은 두 사람에게 어떤 의미일까?",
      "conclusion": "화해 문장 추천은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
      "summary": "상대 방어를 덜 건드리는 첫 문장을 제안해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "소통 궁합 > 화해 문장 추천",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "의사소통, 감정 표현, 오늘 대화",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "화해 문장 추천은 말투와 연락 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 소통 궁합은 마음보다 먼저 닿는 말투와 리듬을 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "소통 궁합 > 화해 문장 추천",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "의사소통 · 감정 표현 · 오늘 대화",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 내용보다 온도 때문에 서운해지는 장면이 많습니다. 답장 속도, 말 끝, 설명 순서가 관계 체감에 크게 작용할 수 있어요. 이 항목에서는 특히 '화해 문장 추천'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 연락 빈도와 다툰 뒤 회복 방식이 들어오면 더 정확해집니다. 지금은 상대를 몰아붙이지 않는 문장 구조를 우선합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
              "답장 속도보다 답장 내용의 온도를 먼저 보기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "읽씹 같은 단어로 바로 몰아가지 않기 / 긴 설명을 한 번에 보내 상대 방어를 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "읽씹 같은 단어로 바로 몰아가지 않기",
              "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "느낀 것과 확인하고 싶은 것을 한 문장씩 나누기",
        "답장 속도보다 답장 내용의 온도를 먼저 보기"
      ],
      "cautions": [
        "읽씹 같은 단어로 바로 몰아가지 않기",
        "긴 설명을 한 번에 보내 상대 방어를 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "communication_match__defense_pattern",
          "title": "싸울 때 방어 패턴",
          "route": "index.html?section=communication_match__defense_pattern#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "attraction_points__first_spark",
          "title": "첫눈 텐션",
          "route": "index.html?section=attraction_points__first_spark#step-6_1-report"
        }
      ]
    },
    "attraction_points__first_spark": {
      "section_id": "attraction_points__first_spark",
      "report_index_source": "user_seed",
      "group_id": "attraction_points",
      "group_title": "끌림/호감 포인트",
      "title": "첫눈 텐션",
      "question": "끌림/호감 포인트에서 첫눈 텐션은 두 사람에게 어떤 의미일까?",
      "conclusion": "첫눈 텐션은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
      "summary": "처음부터 시선이 가는 이유를 감각적으로 정리해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "끌림/호감 포인트 > 첫눈 텐션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "호감 신호, 관계 체감, 매력 표현",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "첫눈 텐션은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "끌림/호감 포인트 > 첫눈 텐션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "호감 신호 · 관계 체감 · 매력 표현",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 처음엔 강하게 끌려도 유지가 어렵거나, 처음엔 잔잔해도 시간이 갈수록 스며드는 관계가 있습니다. 둘 중 어느 쪽인지 분리합니다. 이 항목에서는 특히 '첫눈 텐션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "도화·홍염 같은 매력 코드는 사주 전체와 실제 관계 맥락을 함께 봐야 합니다. 매력 신호를 상대의 마음 증거로 과하게 키우지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 끌렸던 첫 장면을 하나 적기",
              "시간이 지나며 좋아진 점을 하나 말해보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "강한 끌림을 관계 안정감으로 바로 바꾸지 않기 / 매력 코드를 상대 통제의 이유로 쓰지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
              "매력 코드를 상대 통제의 이유로 쓰지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 끌렸던 첫 장면을 하나 적기",
        "시간이 지나며 좋아진 점을 하나 말해보기"
      ],
      "cautions": [
        "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
        "매력 코드를 상대 통제의 이유로 쓰지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "communication_match__reconciliation_sentence",
          "title": "화해 문장 추천",
          "route": "index.html?section=communication_match__reconciliation_sentence#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "attraction_points__slow_burn_charm",
          "title": "오래 볼수록 스며드는 매력",
          "route": "index.html?section=attraction_points__slow_burn_charm#step-6_1-report"
        }
      ]
    },
    "attraction_points__slow_burn_charm": {
      "section_id": "attraction_points__slow_burn_charm",
      "report_index_source": "user_seed",
      "group_id": "attraction_points",
      "group_title": "끌림/호감 포인트",
      "title": "오래 볼수록 스며드는 매력",
      "question": "끌림/호감 포인트에서 오래 볼수록 스며드는 매력은 두 사람에게 어떤 의미일까?",
      "conclusion": "오래 볼수록 스며드는 매력은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
      "summary": "처음보다 시간이 갈수록 좋아지는 결을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "끌림/호감 포인트 > 오래 볼수록 스며드는 매력",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "호감 신호, 관계 체감, 매력 표현",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "오래 볼수록 스며드는 매력은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "끌림/호감 포인트 > 오래 볼수록 스며드는 매력",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "호감 신호 · 관계 체감 · 매력 표현",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 처음엔 강하게 끌려도 유지가 어렵거나, 처음엔 잔잔해도 시간이 갈수록 스며드는 관계가 있습니다. 둘 중 어느 쪽인지 분리합니다. 이 항목에서는 특히 '오래 볼수록 스며드는 매력'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "도화·홍염 같은 매력 코드는 사주 전체와 실제 관계 맥락을 함께 봐야 합니다. 매력 신호를 상대의 마음 증거로 과하게 키우지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 끌렸던 첫 장면을 하나 적기",
              "시간이 지나며 좋아진 점을 하나 말해보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "강한 끌림을 관계 안정감으로 바로 바꾸지 않기 / 매력 코드를 상대 통제의 이유로 쓰지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
              "매력 코드를 상대 통제의 이유로 쓰지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 끌렸던 첫 장면을 하나 적기",
        "시간이 지나며 좋아진 점을 하나 말해보기"
      ],
      "cautions": [
        "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
        "매력 코드를 상대 통제의 이유로 쓰지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "attraction_points__first_spark",
          "title": "첫눈 텐션",
          "route": "index.html?section=attraction_points__first_spark#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "attraction_points__peach_blossom_charm",
          "title": "도화/홍염식 매력",
          "route": "index.html?section=attraction_points__peach_blossom_charm#step-6_1-report"
        }
      ]
    },
    "attraction_points__peach_blossom_charm": {
      "section_id": "attraction_points__peach_blossom_charm",
      "report_index_source": "user_seed",
      "group_id": "attraction_points",
      "group_title": "끌림/호감 포인트",
      "title": "도화/홍염식 매력",
      "question": "끌림/호감 포인트에서 도화/홍염식 매력은 두 사람에게 어떤 의미일까?",
      "conclusion": "도화/홍염식 매력은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
      "summary": "자꾸 눈길 가는 분위기와 플러팅 결을 가볍게 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "끌림/호감 포인트 > 도화/홍염식 매력",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "호감 신호, 관계 체감, 매력 표현",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-만세력-qa-000550",
          "kind": "rag",
          "label": "자료 근거",
          "value": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "도화/홍염식 매력은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "끌림/호감 포인트 > 도화/홍염식 매력",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "호감 신호 · 관계 체감 · 매력 표현",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 처음엔 강하게 끌려도 유지가 어렵거나, 처음엔 잔잔해도 시간이 갈수록 스며드는 관계가 있습니다. 둘 중 어느 쪽인지 분리합니다. 이 항목에서는 특히 '도화/홍염식 매력'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "도화·홍염 같은 매력 코드는 사주 전체와 실제 관계 맥락을 함께 봐야 합니다. 매력 신호를 상대의 마음 증거로 과하게 키우지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 끌렸던 첫 장면을 하나 적기",
              "시간이 지나며 좋아진 점을 하나 말해보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "강한 끌림을 관계 안정감으로 바로 바꾸지 않기 / 매력 코드를 상대 통제의 이유로 쓰지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
              "매력 코드를 상대 통제의 이유로 쓰지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000550",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 끌렸던 첫 장면을 하나 적기",
        "시간이 지나며 좋아진 점을 하나 말해보기"
      ],
      "cautions": [
        "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
        "매력 코드를 상대 통제의 이유로 쓰지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "attraction_points__slow_burn_charm",
          "title": "오래 볼수록 스며드는 매력",
          "route": "index.html?section=attraction_points__slow_burn_charm#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "attraction_points__comfort_point",
          "title": "편안함 포인트",
          "route": "index.html?section=attraction_points__comfort_point#step-6_1-report"
        }
      ]
    },
    "attraction_points__comfort_point": {
      "section_id": "attraction_points__comfort_point",
      "report_index_source": "user_seed",
      "group_id": "attraction_points",
      "group_title": "끌림/호감 포인트",
      "title": "편안함 포인트",
      "question": "끌림/호감 포인트에서 편안함 포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "편안함 포인트은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
      "summary": "말하지 않아도 덜 긴장되는 지점을 찾아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "끌림/호감 포인트 > 편안함 포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "호감 신호, 관계 체감, 매력 표현",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "편안함 포인트은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "끌림/호감 포인트 > 편안함 포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "호감 신호 · 관계 체감 · 매력 표현",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 처음엔 강하게 끌려도 유지가 어렵거나, 처음엔 잔잔해도 시간이 갈수록 스며드는 관계가 있습니다. 둘 중 어느 쪽인지 분리합니다. 이 항목에서는 특히 '편안함 포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "도화·홍염 같은 매력 코드는 사주 전체와 실제 관계 맥락을 함께 봐야 합니다. 매력 신호를 상대의 마음 증거로 과하게 키우지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 끌렸던 첫 장면을 하나 적기",
              "시간이 지나며 좋아진 점을 하나 말해보기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "강한 끌림을 관계 안정감으로 바로 바꾸지 않기 / 매력 코드를 상대 통제의 이유로 쓰지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
              "매력 코드를 상대 통제의 이유로 쓰지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 끌렸던 첫 장면을 하나 적기",
        "시간이 지나며 좋아진 점을 하나 말해보기"
      ],
      "cautions": [
        "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
        "매력 코드를 상대 통제의 이유로 쓰지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "attraction_points__peach_blossom_charm",
          "title": "도화/홍염식 매력",
          "route": "index.html?section=attraction_points__peach_blossom_charm#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "attraction_points__spark_maintenance",
          "title": "설렘 유지 버튼",
          "route": "index.html?section=attraction_points__spark_maintenance#step-6_1-report"
        }
      ]
    },
    "attraction_points__spark_maintenance": {
      "section_id": "attraction_points__spark_maintenance",
      "report_index_source": "user_seed",
      "group_id": "attraction_points",
      "group_title": "끌림/호감 포인트",
      "title": "설렘 유지 버튼",
      "question": "끌림/호감 포인트에서 설렘 유지 버튼은 두 사람에게 어떤 의미일까?",
      "conclusion": "설렘 유지 버튼은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
      "summary": "관계가 익숙해져도 식지 않게 눌러볼 포인트예요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "끌림/호감 포인트 > 설렘 유지 버튼",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "호감 신호, 관계 체감, 매력 표현",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "설렘 유지 버튼은 끌림과 오래 가는 호감을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 끌림은 첫눈 신호와 오래 볼수록 쌓이는 편안함을 나눠서 봐야 합니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "끌림/호감 포인트 > 설렘 유지 버튼",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "호감 신호 · 관계 체감 · 매력 표현",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 처음엔 강하게 끌려도 유지가 어렵거나, 처음엔 잔잔해도 시간이 갈수록 스며드는 관계가 있습니다. 둘 중 어느 쪽인지 분리합니다. 이 항목에서는 특히 '설렘 유지 버튼'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "도화·홍염 같은 매력 코드는 사주 전체와 실제 관계 맥락을 함께 봐야 합니다. 매력 신호를 상대의 마음 증거로 과하게 키우지 않습니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "상대에게 끌렸던 첫 장면을 하나 적기",
              "시간이 지나며 좋아진 점을 하나 말해보기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "강한 끌림을 관계 안정감으로 바로 바꾸지 않기 / 매력 코드를 상대 통제의 이유로 쓰지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
              "매력 코드를 상대 통제의 이유로 쓰지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "상대에게 끌렸던 첫 장면을 하나 적기",
        "시간이 지나며 좋아진 점을 하나 말해보기"
      ],
      "cautions": [
        "강한 끌림을 관계 안정감으로 바로 바꾸지 않기",
        "매력 코드를 상대 통제의 이유로 쓰지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "attraction_points__comfort_point",
          "title": "편안함 포인트",
          "route": "index.html?section=attraction_points__comfort_point#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "conflict_report__repeating_loop",
          "title": "반복 갈등 루프",
          "route": "index.html?section=conflict_report__repeating_loop#step-6_1-report"
        }
      ]
    },
    "conflict_report__repeating_loop": {
      "section_id": "conflict_report__repeating_loop",
      "report_index_source": "user_seed",
      "group_id": "conflict_report",
      "group_title": "갈등 리포트",
      "title": "반복 갈등 루프",
      "question": "갈등 리포트에서 반복 갈등 루프은 두 사람에게 어떤 의미일까?",
      "conclusion": "반복 갈등 루프은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
      "summary": "매번 비슷하게 돌아오는 싸움 패턴을 도식화해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "갈등 리포트 > 반복 갈등 루프",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "갈등 패턴, 의사소통 장애, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "반복 갈등 루프은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "갈등 리포트 > 반복 갈등 루프",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "갈등 패턴 · 의사소통 장애 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 주제로 싸우는 것 같아도 실제로는 무시당한 느낌, 통제받는 느낌, 혼자 애쓰는 느낌이 반복될 수 있어요. 이 항목에서는 특히 '반복 갈등 루프'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 다툼 사례, 먼저 사과하는 쪽, 회복까지 걸리는 시간이 들어오면 강약이 좁혀집니다. 폭발 직전에는 해석보다 멈춤이 먼저입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "싸움의 주제와 진짜 눌린 감정을 따로 적기",
              "오늘 넘지 말아야 할 말투 하나 정하기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대의 약점을 이기는 말로 쓰지 않기 / 사과를 받아내기 위해 감정을 크게 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대의 약점을 이기는 말로 쓰지 않기",
              "사과를 받아내기 위해 감정을 크게 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000230",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "싸움의 주제와 진짜 눌린 감정을 따로 적기",
        "오늘 넘지 말아야 할 말투 하나 정하기"
      ],
      "cautions": [
        "상대의 약점을 이기는 말로 쓰지 않기",
        "사과를 받아내기 위해 감정을 크게 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "attraction_points__spark_maintenance",
          "title": "설렘 유지 버튼",
          "route": "index.html?section=attraction_points__spark_maintenance#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "conflict_report__competition_point",
          "title": "경쟁심 포인트",
          "route": "index.html?section=conflict_report__competition_point#step-6_1-report"
        }
      ]
    },
    "conflict_report__competition_point": {
      "section_id": "conflict_report__competition_point",
      "report_index_source": "user_seed",
      "group_id": "conflict_report",
      "group_title": "갈등 리포트",
      "title": "경쟁심 포인트",
      "question": "갈등 리포트에서 경쟁심 포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "경쟁심 포인트은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
      "summary": "누가 맞는지 겨루게 되는 순간을 체크해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "갈등 리포트 > 경쟁심 포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "갈등 패턴, 의사소통 장애, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "경쟁심 포인트은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "갈등 리포트 > 경쟁심 포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "갈등 패턴 · 의사소통 장애 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 주제로 싸우는 것 같아도 실제로는 무시당한 느낌, 통제받는 느낌, 혼자 애쓰는 느낌이 반복될 수 있어요. 이 항목에서는 특히 '경쟁심 포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 다툼 사례, 먼저 사과하는 쪽, 회복까지 걸리는 시간이 들어오면 강약이 좁혀집니다. 폭발 직전에는 해석보다 멈춤이 먼저입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "싸움의 주제와 진짜 눌린 감정을 따로 적기",
              "오늘 넘지 말아야 할 말투 하나 정하기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대의 약점을 이기는 말로 쓰지 않기 / 사과를 받아내기 위해 감정을 크게 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대의 약점을 이기는 말로 쓰지 않기",
              "사과를 받아내기 위해 감정을 크게 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000153",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "싸움의 주제와 진짜 눌린 감정을 따로 적기",
        "오늘 넘지 말아야 할 말투 하나 정하기"
      ],
      "cautions": [
        "상대의 약점을 이기는 말로 쓰지 않기",
        "사과를 받아내기 위해 감정을 크게 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "conflict_report__repeating_loop",
          "title": "반복 갈등 루프",
          "route": "index.html?section=conflict_report__repeating_loop#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "conflict_report__communication_obstacle",
          "title": "의사소통 장애",
          "route": "index.html?section=conflict_report__communication_obstacle#step-6_1-report"
        }
      ]
    },
    "conflict_report__communication_obstacle": {
      "section_id": "conflict_report__communication_obstacle",
      "report_index_source": "user_seed",
      "group_id": "conflict_report",
      "group_title": "갈등 리포트",
      "title": "의사소통 장애",
      "question": "갈등 리포트에서 의사소통 장애은 두 사람에게 어떤 의미일까?",
      "conclusion": "의사소통 장애은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
      "summary": "말은 오가는데 뜻이 엇갈리는 구간을 분리해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "갈등 리포트 > 의사소통 장애",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "갈등 패턴, 의사소통 장애, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "의사소통 장애은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "갈등 리포트 > 의사소통 장애",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "갈등 패턴 · 의사소통 장애 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 주제로 싸우는 것 같아도 실제로는 무시당한 느낌, 통제받는 느낌, 혼자 애쓰는 느낌이 반복될 수 있어요. 이 항목에서는 특히 '의사소통 장애'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 다툼 사례, 먼저 사과하는 쪽, 회복까지 걸리는 시간이 들어오면 강약이 좁혀집니다. 폭발 직전에는 해석보다 멈춤이 먼저입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "싸움의 주제와 진짜 눌린 감정을 따로 적기",
              "오늘 넘지 말아야 할 말투 하나 정하기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대의 약점을 이기는 말로 쓰지 않기 / 사과를 받아내기 위해 감정을 크게 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대의 약점을 이기는 말로 쓰지 않기",
              "사과를 받아내기 위해 감정을 크게 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000230",
            "zip-궁합-qa-000153",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "싸움의 주제와 진짜 눌린 감정을 따로 적기",
        "오늘 넘지 말아야 할 말투 하나 정하기"
      ],
      "cautions": [
        "상대의 약점을 이기는 말로 쓰지 않기",
        "사과를 받아내기 위해 감정을 크게 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "conflict_report__competition_point",
          "title": "경쟁심 포인트",
          "route": "index.html?section=conflict_report__competition_point#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "conflict_report__trust_shake",
          "title": "신뢰 흔들림",
          "route": "index.html?section=conflict_report__trust_shake#step-6_1-report"
        }
      ]
    },
    "conflict_report__trust_shake": {
      "section_id": "conflict_report__trust_shake",
      "report_index_source": "user_seed",
      "group_id": "conflict_report",
      "group_title": "갈등 리포트",
      "title": "신뢰 흔들림",
      "question": "갈등 리포트에서 신뢰 흔들림은 두 사람에게 어떤 의미일까?",
      "conclusion": "신뢰 흔들림은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
      "summary": "믿음이 약해지는 행동과 회복 포인트를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "갈등 리포트 > 신뢰 흔들림",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "갈등 패턴, 의사소통 장애, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "신뢰 흔들림은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "갈등 리포트 > 신뢰 흔들림",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "갈등 패턴 · 의사소통 장애 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 주제로 싸우는 것 같아도 실제로는 무시당한 느낌, 통제받는 느낌, 혼자 애쓰는 느낌이 반복될 수 있어요. 이 항목에서는 특히 '신뢰 흔들림'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 다툼 사례, 먼저 사과하는 쪽, 회복까지 걸리는 시간이 들어오면 강약이 좁혀집니다. 폭발 직전에는 해석보다 멈춤이 먼저입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "싸움의 주제와 진짜 눌린 감정을 따로 적기",
              "오늘 넘지 말아야 할 말투 하나 정하기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대의 약점을 이기는 말로 쓰지 않기 / 사과를 받아내기 위해 감정을 크게 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대의 약점을 이기는 말로 쓰지 않기",
              "사과를 받아내기 위해 감정을 크게 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-41-qa-0003",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "싸움의 주제와 진짜 눌린 감정을 따로 적기",
        "오늘 넘지 말아야 할 말투 하나 정하기"
      ],
      "cautions": [
        "상대의 약점을 이기는 말로 쓰지 않기",
        "사과를 받아내기 위해 감정을 크게 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "conflict_report__communication_obstacle",
          "title": "의사소통 장애",
          "route": "index.html?section=conflict_report__communication_obstacle#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "conflict_report__line_crossing_moment",
          "title": "선 넘는 순간",
          "route": "index.html?section=conflict_report__line_crossing_moment#step-6_1-report"
        }
      ]
    },
    "conflict_report__line_crossing_moment": {
      "section_id": "conflict_report__line_crossing_moment",
      "report_index_source": "user_seed",
      "group_id": "conflict_report",
      "group_title": "갈등 리포트",
      "title": "선 넘는 순간",
      "question": "갈등 리포트에서 선 넘는 순간은 두 사람에게 어떤 의미일까?",
      "conclusion": "선 넘는 순간은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
      "summary": "서로가 멈춰야 하는 말과 행동의 기준을 세워요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "갈등 리포트 > 선 넘는 순간",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "갈등 패턴, 의사소통 장애, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "선 넘는 순간은 반복 갈등과 신뢰 회복을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 갈등 리포트는 누가 맞는지보다 어떤 루프가 반복되는지를 먼저 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "갈등 리포트 > 선 넘는 순간",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "갈등 패턴 · 의사소통 장애 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 주제로 싸우는 것 같아도 실제로는 무시당한 느낌, 통제받는 느낌, 혼자 애쓰는 느낌이 반복될 수 있어요. 이 항목에서는 특히 '선 넘는 순간'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "최근 다툼 사례, 먼저 사과하는 쪽, 회복까지 걸리는 시간이 들어오면 강약이 좁혀집니다. 폭발 직전에는 해석보다 멈춤이 먼저입니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "싸움의 주제와 진짜 눌린 감정을 따로 적기",
              "오늘 넘지 말아야 할 말투 하나 정하기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "상대의 약점을 이기는 말로 쓰지 않기 / 사과를 받아내기 위해 감정을 크게 키우지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "상대의 약점을 이기는 말로 쓰지 않기",
              "사과를 받아내기 위해 감정을 크게 키우지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-00-p1-g03",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "싸움의 주제와 진짜 눌린 감정을 따로 적기",
        "오늘 넘지 말아야 할 말투 하나 정하기"
      ],
      "cautions": [
        "상대의 약점을 이기는 말로 쓰지 않기",
        "사과를 받아내기 위해 감정을 크게 키우지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "conflict_report__trust_shake",
          "title": "신뢰 흔들림",
          "route": "index.html?section=conflict_report__trust_shake#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "dating_stage_reading__some_possibility",
          "title": "썸 가능성",
          "route": "index.html?section=dating_stage_reading__some_possibility#step-6_1-report"
        }
      ]
    },
    "dating_stage_reading__some_possibility": {
      "section_id": "dating_stage_reading__some_possibility",
      "report_index_source": "user_seed",
      "group_id": "dating_stage_reading",
      "group_title": "연애 단계별 풀이",
      "title": "썸 가능성",
      "question": "연애 단계별 풀이에서 썸 가능성은 두 사람에게 어떤 의미일까?",
      "conclusion": "썸 가능성은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
      "summary": "아직 애매한 관계에서 신호와 착각을 나눠요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "연애 단계별 풀이 > 썸 가능성",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 단계, 대화 온도, 현실 준비",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "썸 가능성은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "연애 단계별 풀이 > 썸 가능성",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 단계 · 대화 온도 · 현실 준비",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감은 있는데 이름 붙이기가 부담스럽거나, 이미 가까운데 약속 이야기가 늦어지는 식으로 드러날 수 있습니다. 이 항목에서는 특히 '썸 가능성'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "썸, 연애 초반, 장기연애, 결혼 전 관계는 확인해야 할 질문이 다릅니다. 단계가 없으면 다음 행동을 넓게 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "지금 관계 이름을 혼자 먼저 정하지 않기",
              "상대가 편하게 답할 수 있는 질문부터 던지기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "타이밍을 이유로 상대의 속도를 무시하지 않기 / 불안해서 관계 이름표만 급하게 붙이지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "타이밍을 이유로 상대의 속도를 무시하지 않기",
              "불안해서 관계 이름표만 급하게 붙이지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "지금 관계 이름을 혼자 먼저 정하지 않기",
        "상대가 편하게 답할 수 있는 질문부터 던지기"
      ],
      "cautions": [
        "타이밍을 이유로 상대의 속도를 무시하지 않기",
        "불안해서 관계 이름표만 급하게 붙이지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "conflict_report__line_crossing_moment",
          "title": "선 넘는 순간",
          "route": "index.html?section=conflict_report__line_crossing_moment#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "dating_stage_reading__confession_timing",
          "title": "고백 타이밍",
          "route": "index.html?section=dating_stage_reading__confession_timing#step-6_1-report"
        }
      ]
    },
    "dating_stage_reading__confession_timing": {
      "section_id": "dating_stage_reading__confession_timing",
      "report_index_source": "user_seed",
      "group_id": "dating_stage_reading",
      "group_title": "연애 단계별 풀이",
      "title": "고백 타이밍",
      "question": "연애 단계별 풀이에서 고백 타이밍은 두 사람에게 어떤 의미일까?",
      "conclusion": "고백 타이밍은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
      "summary": "밀어붙이기보다 대화 온도가 맞는 순간을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "연애 단계별 풀이 > 고백 타이밍",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 단계, 대화 온도, 현실 준비",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "고백 타이밍은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "연애 단계별 풀이 > 고백 타이밍",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 단계 · 대화 온도 · 현실 준비",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감은 있는데 이름 붙이기가 부담스럽거나, 이미 가까운데 약속 이야기가 늦어지는 식으로 드러날 수 있습니다. 이 항목에서는 특히 '고백 타이밍'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "썸, 연애 초반, 장기연애, 결혼 전 관계는 확인해야 할 질문이 다릅니다. 단계가 없으면 다음 행동을 넓게 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "지금 관계 이름을 혼자 먼저 정하지 않기",
              "상대가 편하게 답할 수 있는 질문부터 던지기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "타이밍을 이유로 상대의 속도를 무시하지 않기 / 불안해서 관계 이름표만 급하게 붙이지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "타이밍을 이유로 상대의 속도를 무시하지 않기",
              "불안해서 관계 이름표만 급하게 붙이지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "zip-궁합-qa-000230",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "지금 관계 이름을 혼자 먼저 정하지 않기",
        "상대가 편하게 답할 수 있는 질문부터 던지기"
      ],
      "cautions": [
        "타이밍을 이유로 상대의 속도를 무시하지 않기",
        "불안해서 관계 이름표만 급하게 붙이지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "dating_stage_reading__some_possibility",
          "title": "썸 가능성",
          "route": "index.html?section=dating_stage_reading__some_possibility#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "dating_stage_reading__early_love_caution",
          "title": "연애 초반 주의점",
          "route": "index.html?section=dating_stage_reading__early_love_caution#step-6_1-report"
        }
      ]
    },
    "dating_stage_reading__early_love_caution": {
      "section_id": "dating_stage_reading__early_love_caution",
      "report_index_source": "user_seed",
      "group_id": "dating_stage_reading",
      "group_title": "연애 단계별 풀이",
      "title": "연애 초반 주의점",
      "question": "연애 단계별 풀이에서 연애 초반 주의점은 두 사람에게 어떤 의미일까?",
      "conclusion": "연애 초반 주의점은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
      "summary": "초반에 과속하거나 과하게 참는 패턴을 체크해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "연애 단계별 풀이 > 연애 초반 주의점",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 단계, 대화 온도, 현실 준비",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "zip-궁합-qa-000153",
          "kind": "rag",
          "label": "자료 근거",
          "value": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "연애 초반 주의점은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "연애 단계별 풀이 > 연애 초반 주의점",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 단계 · 대화 온도 · 현실 준비",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감은 있는데 이름 붙이기가 부담스럽거나, 이미 가까운데 약속 이야기가 늦어지는 식으로 드러날 수 있습니다. 이 항목에서는 특히 '연애 초반 주의점'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "썸, 연애 초반, 장기연애, 결혼 전 관계는 확인해야 할 질문이 다릅니다. 단계가 없으면 다음 행동을 넓게 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "지금 관계 이름을 혼자 먼저 정하지 않기",
              "상대가 편하게 답할 수 있는 질문부터 던지기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "타이밍을 이유로 상대의 속도를 무시하지 않기 / 불안해서 관계 이름표만 급하게 붙이지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "타이밍을 이유로 상대의 속도를 무시하지 않기",
              "불안해서 관계 이름표만 급하게 붙이지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "zip-궁합-qa-000153",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "지금 관계 이름을 혼자 먼저 정하지 않기",
        "상대가 편하게 답할 수 있는 질문부터 던지기"
      ],
      "cautions": [
        "타이밍을 이유로 상대의 속도를 무시하지 않기",
        "불안해서 관계 이름표만 급하게 붙이지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "dating_stage_reading__confession_timing",
          "title": "고백 타이밍",
          "route": "index.html?section=dating_stage_reading__confession_timing#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "dating_stage_reading__long_term_stamina",
          "title": "장기연애 체력",
          "route": "index.html?section=dating_stage_reading__long_term_stamina#step-6_1-report"
        }
      ]
    },
    "dating_stage_reading__long_term_stamina": {
      "section_id": "dating_stage_reading__long_term_stamina",
      "report_index_source": "user_seed",
      "group_id": "dating_stage_reading",
      "group_title": "연애 단계별 풀이",
      "title": "장기연애 체력",
      "question": "연애 단계별 풀이에서 장기연애 체력은 두 사람에게 어떤 의미일까?",
      "conclusion": "장기연애 체력은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
      "summary": "오래 만나도 유지되는 힘과 지치는 구간을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "연애 단계별 풀이 > 장기연애 체력",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 단계, 대화 온도, 현실 준비",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "장기연애 체력은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "연애 단계별 풀이 > 장기연애 체력",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 단계 · 대화 온도 · 현실 준비",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감은 있는데 이름 붙이기가 부담스럽거나, 이미 가까운데 약속 이야기가 늦어지는 식으로 드러날 수 있습니다. 이 항목에서는 특히 '장기연애 체력'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "썸, 연애 초반, 장기연애, 결혼 전 관계는 확인해야 할 질문이 다릅니다. 단계가 없으면 다음 행동을 넓게 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "지금 관계 이름을 혼자 먼저 정하지 않기",
              "상대가 편하게 답할 수 있는 질문부터 던지기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "타이밍을 이유로 상대의 속도를 무시하지 않기 / 불안해서 관계 이름표만 급하게 붙이지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "타이밍을 이유로 상대의 속도를 무시하지 않기",
              "불안해서 관계 이름표만 급하게 붙이지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "지금 관계 이름을 혼자 먼저 정하지 않기",
        "상대가 편하게 답할 수 있는 질문부터 던지기"
      ],
      "cautions": [
        "타이밍을 이유로 상대의 속도를 무시하지 않기",
        "불안해서 관계 이름표만 급하게 붙이지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "dating_stage_reading__early_love_caution",
          "title": "연애 초반 주의점",
          "route": "index.html?section=dating_stage_reading__early_love_caution#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "dating_stage_reading__pre_marriage_check",
          "title": "결혼 전 체크포인트",
          "route": "index.html?section=dating_stage_reading__pre_marriage_check#step-6_1-report"
        }
      ]
    },
    "dating_stage_reading__pre_marriage_check": {
      "section_id": "dating_stage_reading__pre_marriage_check",
      "report_index_source": "user_seed",
      "group_id": "dating_stage_reading",
      "group_title": "연애 단계별 풀이",
      "title": "결혼 전 체크포인트",
      "question": "연애 단계별 풀이에서 결혼 전 체크포인트은 두 사람에게 어떤 의미일까?",
      "conclusion": "결혼 전 체크포인트은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
      "summary": "생활, 가족, 돈, 책임 이야기를 나누는 기준을 잡아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "연애 단계별 풀이 > 결혼 전 체크포인트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 단계, 대화 온도, 현실 준비",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "결혼 전 체크포인트은 관계 단계와 전환 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 연애 단계별 풀이는 지금 관계가 어느 속도로 다음 단계에 가도 편한지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "연애 단계별 풀이 > 결혼 전 체크포인트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 단계 · 대화 온도 · 현실 준비",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 호감은 있는데 이름 붙이기가 부담스럽거나, 이미 가까운데 약속 이야기가 늦어지는 식으로 드러날 수 있습니다. 이 항목에서는 특히 '결혼 전 체크포인트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "썸, 연애 초반, 장기연애, 결혼 전 관계는 확인해야 할 질문이 다릅니다. 단계가 없으면 다음 행동을 넓게 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "지금 관계 이름을 혼자 먼저 정하지 않기",
              "상대가 편하게 답할 수 있는 질문부터 던지기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "타이밍을 이유로 상대의 속도를 무시하지 않기 / 불안해서 관계 이름표만 급하게 붙이지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "타이밍을 이유로 상대의 속도를 무시하지 않기",
              "불안해서 관계 이름표만 급하게 붙이지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "지금 관계 이름을 혼자 먼저 정하지 않기",
        "상대가 편하게 답할 수 있는 질문부터 던지기"
      ],
      "cautions": [
        "타이밍을 이유로 상대의 속도를 무시하지 않기",
        "불안해서 관계 이름표만 급하게 붙이지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "dating_stage_reading__long_term_stamina",
          "title": "장기연애 체력",
          "route": "index.html?section=dating_stage_reading__long_term_stamina#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "real_life_match__money_temperature",
          "title": "돈 쓰는 온도",
          "route": "index.html?section=real_life_match__money_temperature#step-6_1-report"
        }
      ]
    },
    "real_life_match__money_temperature": {
      "section_id": "real_life_match__money_temperature",
      "report_index_source": "user_seed",
      "group_id": "real_life_match",
      "group_title": "현실 궁합",
      "title": "돈 쓰는 온도",
      "question": "현실 궁합에서 돈 쓰는 온도은 두 사람에게 어떤 의미일까?",
      "conclusion": "돈 쓰는 온도은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
      "summary": "데이트비, 선물, 소비 감각의 차이를 가볍게 점검해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "현실 궁합 > 돈 쓰는 온도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "생활 궁합, 신뢰, 파트너십",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "돈 쓰는 온도은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "현실 궁합 > 돈 쓰는 온도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "생활 궁합 · 신뢰 · 파트너십",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 데이트비, 시간 약속, 가족 기대치, 일하는 방식에서 관계 체감이 갈립니다. 감정과 생활 기준을 따로 놓고 봐야 합니다. 이 항목에서는 특히 '돈 쓰는 온도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "동거, 결혼, 동업처럼 현실 단위가 커질수록 확인 항목이 늘어납니다. 아직 초기 관계라면 돈과 약속 이야기부터 작게 꺼냅니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "돈 쓰는 기준을 애정 평가와 분리하기",
              "반복되는 약속 하나의 기준을 맞추기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기 / 가족이나 돈 이야기를 미루기만 하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
              "가족이나 돈 이야기를 미루기만 하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000228",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "돈 쓰는 기준을 애정 평가와 분리하기",
        "반복되는 약속 하나의 기준을 맞추기"
      ],
      "cautions": [
        "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
        "가족이나 돈 이야기를 미루기만 하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "dating_stage_reading__pre_marriage_check",
          "title": "결혼 전 체크포인트",
          "route": "index.html?section=dating_stage_reading__pre_marriage_check#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "real_life_match__promise_style",
          "title": "약속 지키는 방식",
          "route": "index.html?section=real_life_match__promise_style#step-6_1-report"
        }
      ]
    },
    "real_life_match__promise_style": {
      "section_id": "real_life_match__promise_style",
      "report_index_source": "user_seed",
      "group_id": "real_life_match",
      "group_title": "현실 궁합",
      "title": "약속 지키는 방식",
      "question": "현실 궁합에서 약속 지키는 방식은 두 사람에게 어떤 의미일까?",
      "conclusion": "약속 지키는 방식은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
      "summary": "시간, 답장, 말한 것 지키는 태도의 결을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "현실 궁합 > 약속 지키는 방식",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "생활 궁합, 신뢰, 파트너십",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "약속 지키는 방식은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "현실 궁합 > 약속 지키는 방식",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "생활 궁합 · 신뢰 · 파트너십",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 데이트비, 시간 약속, 가족 기대치, 일하는 방식에서 관계 체감이 갈립니다. 감정과 생활 기준을 따로 놓고 봐야 합니다. 이 항목에서는 특히 '약속 지키는 방식'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "동거, 결혼, 동업처럼 현실 단위가 커질수록 확인 항목이 늘어납니다. 아직 초기 관계라면 돈과 약속 이야기부터 작게 꺼냅니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "돈 쓰는 기준을 애정 평가와 분리하기",
              "반복되는 약속 하나의 기준을 맞추기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기 / 가족이나 돈 이야기를 미루기만 하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
              "가족이나 돈 이야기를 미루기만 하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "돈 쓰는 기준을 애정 평가와 분리하기",
        "반복되는 약속 하나의 기준을 맞추기"
      ],
      "cautions": [
        "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
        "가족이나 돈 이야기를 미루기만 하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "real_life_match__money_temperature",
          "title": "돈 쓰는 온도",
          "route": "index.html?section=real_life_match__money_temperature#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "real_life_match__work_business_partnership",
          "title": "일/사업 파트너십",
          "route": "index.html?section=real_life_match__work_business_partnership#step-6_1-report"
        }
      ]
    },
    "real_life_match__work_business_partnership": {
      "section_id": "real_life_match__work_business_partnership",
      "report_index_source": "user_seed",
      "group_id": "real_life_match",
      "group_title": "현실 궁합",
      "title": "일/사업 파트너십",
      "question": "현실 궁합에서 일/사업 파트너십은 두 사람에게 어떤 의미일까?",
      "conclusion": "일/사업 파트너십은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
      "summary": "같이 일하거나 목표를 세울 때 맞는 역할을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "현실 궁합 > 일/사업 파트너십",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "생활 궁합, 신뢰, 파트너십",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "일/사업 파트너십은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "현실 궁합 > 일/사업 파트너십",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "생활 궁합 · 신뢰 · 파트너십",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 데이트비, 시간 약속, 가족 기대치, 일하는 방식에서 관계 체감이 갈립니다. 감정과 생활 기준을 따로 놓고 봐야 합니다. 이 항목에서는 특히 '일/사업 파트너십'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "동거, 결혼, 동업처럼 현실 단위가 커질수록 확인 항목이 늘어납니다. 아직 초기 관계라면 돈과 약속 이야기부터 작게 꺼냅니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "돈 쓰는 기준을 애정 평가와 분리하기",
              "반복되는 약속 하나의 기준을 맞추기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기 / 가족이나 돈 이야기를 미루기만 하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
              "가족이나 돈 이야기를 미루기만 하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "돈 쓰는 기준을 애정 평가와 분리하기",
        "반복되는 약속 하나의 기준을 맞추기"
      ],
      "cautions": [
        "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
        "가족이나 돈 이야기를 미루기만 하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "real_life_match__promise_style",
          "title": "약속 지키는 방식",
          "route": "index.html?section=real_life_match__promise_style#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "real_life_match__family_expectation",
          "title": "가족 기대치",
          "route": "index.html?section=real_life_match__family_expectation#step-6_1-report"
        }
      ]
    },
    "real_life_match__family_expectation": {
      "section_id": "real_life_match__family_expectation",
      "report_index_source": "user_seed",
      "group_id": "real_life_match",
      "group_title": "현실 궁합",
      "title": "가족 기대치",
      "question": "현실 궁합에서 가족 기대치은 두 사람에게 어떤 의미일까?",
      "conclusion": "가족 기대치은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
      "summary": "가족, 주변 사람, 공개 범위를 대하는 온도를 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "현실 궁합 > 가족 기대치",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "생활 궁합, 신뢰, 파트너십",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "가족 기대치은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "현실 궁합 > 가족 기대치",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "생활 궁합 · 신뢰 · 파트너십",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 데이트비, 시간 약속, 가족 기대치, 일하는 방식에서 관계 체감이 갈립니다. 감정과 생활 기준을 따로 놓고 봐야 합니다. 이 항목에서는 특히 '가족 기대치'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "동거, 결혼, 동업처럼 현실 단위가 커질수록 확인 항목이 늘어납니다. 아직 초기 관계라면 돈과 약속 이야기부터 작게 꺼냅니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "돈 쓰는 기준을 애정 평가와 분리하기",
              "반복되는 약속 하나의 기준을 맞추기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기 / 가족이나 돈 이야기를 미루기만 하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
              "가족이나 돈 이야기를 미루기만 하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-궁합-qa-000051",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "돈 쓰는 기준을 애정 평가와 분리하기",
        "반복되는 약속 하나의 기준을 맞추기"
      ],
      "cautions": [
        "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
        "가족이나 돈 이야기를 미루기만 하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "real_life_match__work_business_partnership",
          "title": "일/사업 파트너십",
          "route": "index.html?section=real_life_match__work_business_partnership#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "real_life_match__daily_routine_fit",
          "title": "생활 루틴 맞춤",
          "route": "index.html?section=real_life_match__daily_routine_fit#step-6_1-report"
        }
      ]
    },
    "real_life_match__daily_routine_fit": {
      "section_id": "real_life_match__daily_routine_fit",
      "report_index_source": "user_seed",
      "group_id": "real_life_match",
      "group_title": "현실 궁합",
      "title": "생활 루틴 맞춤",
      "question": "현실 궁합에서 생활 루틴 맞춤은 두 사람에게 어떤 의미일까?",
      "conclusion": "생활 루틴 맞춤은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
      "summary": "잠, 식사, 일상 템포가 관계 체감에 미치는 영향을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "현실 궁합 > 생활 루틴 맞춤",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "생활 궁합, 신뢰, 파트너십",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000051",
          "kind": "rag",
          "label": "자료 근거",
          "value": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "생활 루틴 맞춤은 돈, 약속, 생활 리듬을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 현실 궁합은 좋아하는 마음이 생활 속 약속으로 버틸 수 있는지 보는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "현실 궁합 > 생활 루틴 맞춤",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "생활 궁합 · 신뢰 · 파트너십",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 데이트비, 시간 약속, 가족 기대치, 일하는 방식에서 관계 체감이 갈립니다. 감정과 생활 기준을 따로 놓고 봐야 합니다. 이 항목에서는 특히 '생활 루틴 맞춤'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "동거, 결혼, 동업처럼 현실 단위가 커질수록 확인 항목이 늘어납니다. 아직 초기 관계라면 돈과 약속 이야기부터 작게 꺼냅니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "돈 쓰는 기준을 애정 평가와 분리하기",
              "반복되는 약속 하나의 기준을 맞추기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기 / 가족이나 돈 이야기를 미루기만 하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
              "가족이나 돈 이야기를 미루기만 하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000051",
            "zip-궁합-qa-000074",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "돈 쓰는 기준을 애정 평가와 분리하기",
        "반복되는 약속 하나의 기준을 맞추기"
      ],
      "cautions": [
        "현실 기준 차이를 사랑이 부족한 것으로 바로 연결하지 않기",
        "가족이나 돈 이야기를 미루기만 하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "real_life_match__family_expectation",
          "title": "가족 기대치",
          "route": "index.html?section=real_life_match__family_expectation#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "luck_flow_match__year_temperature",
          "title": "올해 관계 온도",
          "route": "index.html?section=luck_flow_match__year_temperature#step-6_1-report"
        }
      ]
    },
    "luck_flow_match__year_temperature": {
      "section_id": "luck_flow_match__year_temperature",
      "report_index_source": "user_seed",
      "group_id": "luck_flow_match",
      "group_title": "운 흐름 궁합",
      "title": "올해 관계 온도",
      "question": "운 흐름 궁합에서 올해 관계 온도은 두 사람에게 어떤 의미일까?",
      "conclusion": "올해 관계 온도은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
      "summary": "올해 두 사람 관계가 어느 쪽으로 예민한지 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "운 흐름 궁합 > 올해 관계 온도",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "올해 흐름, 월 흐름, 오늘 행동",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "올해 관계 온도은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "운 흐름 궁합 > 올해 관계 온도",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "올해 흐름 · 월 흐름 · 오늘 행동",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 말도 어떤 날에는 잘 닿고, 어떤 날에는 방어를 키울 수 있습니다. 그래서 시기 해석은 예언보다 대화 순서 조정에 가깝습니다. 이 항목에서는 특히 '올해 관계 온도'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "연·월·일 흐름은 계산 기준값이 들어와야 기간별로 좁힐 수 있습니다. 자료가 없으면 오늘 할 수 있는 작은 선택만 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "오늘 보낼 말은 짧게 만들기",
              "감정이 큰 날에는 결론보다 확인 질문을 고르기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "날짜 하나에 관계 결정을 맡기지 않기 / 예민한 날의 반응을 관계 전체로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "날짜 하나에 관계 결정을 맡기지 않기",
              "예민한 날의 반응을 관계 전체로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "zip-만세력-qa-000539",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "오늘 보낼 말은 짧게 만들기",
        "감정이 큰 날에는 결론보다 확인 질문을 고르기"
      ],
      "cautions": [
        "날짜 하나에 관계 결정을 맡기지 않기",
        "예민한 날의 반응을 관계 전체로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "real_life_match__daily_routine_fit",
          "title": "생활 루틴 맞춤",
          "route": "index.html?section=real_life_match__daily_routine_fit#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "luck_flow_match__month_rhythm",
          "title": "이번 달 관계 리듬",
          "route": "index.html?section=luck_flow_match__month_rhythm#step-6_1-report"
        }
      ]
    },
    "luck_flow_match__month_rhythm": {
      "section_id": "luck_flow_match__month_rhythm",
      "report_index_source": "user_seed",
      "group_id": "luck_flow_match",
      "group_title": "운 흐름 궁합",
      "title": "이번 달 관계 리듬",
      "question": "운 흐름 궁합에서 이번 달 관계 리듬은 두 사람에게 어떤 의미일까?",
      "conclusion": "이번 달 관계 리듬은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
      "summary": "이번 달 연락, 만남, 감정 기복의 리듬을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "운 흐름 궁합 > 이번 달 관계 리듬",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "올해 흐름, 월 흐름, 오늘 행동",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "이번 달 관계 리듬은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "운 흐름 궁합 > 이번 달 관계 리듬",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "올해 흐름 · 월 흐름 · 오늘 행동",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 말도 어떤 날에는 잘 닿고, 어떤 날에는 방어를 키울 수 있습니다. 그래서 시기 해석은 예언보다 대화 순서 조정에 가깝습니다. 이 항목에서는 특히 '이번 달 관계 리듬'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "연·월·일 흐름은 계산 기준값이 들어와야 기간별로 좁힐 수 있습니다. 자료가 없으면 오늘 할 수 있는 작은 선택만 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "오늘 보낼 말은 짧게 만들기",
              "감정이 큰 날에는 결론보다 확인 질문을 고르기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "날짜 하나에 관계 결정을 맡기지 않기 / 예민한 날의 반응을 관계 전체로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "날짜 하나에 관계 결정을 맡기지 않기",
              "예민한 날의 반응을 관계 전체로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-만세력-qa-000539",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "오늘 보낼 말은 짧게 만들기",
        "감정이 큰 날에는 결론보다 확인 질문을 고르기"
      ],
      "cautions": [
        "날짜 하나에 관계 결정을 맡기지 않기",
        "예민한 날의 반응을 관계 전체로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "luck_flow_match__year_temperature",
          "title": "올해 관계 온도",
          "route": "index.html?section=luck_flow_match__year_temperature#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "luck_flow_match__today_contact_day",
          "title": "오늘 연락해도 되는 날",
          "route": "index.html?section=luck_flow_match__today_contact_day#step-6_1-report"
        }
      ]
    },
    "luck_flow_match__today_contact_day": {
      "section_id": "luck_flow_match__today_contact_day",
      "report_index_source": "user_seed",
      "group_id": "luck_flow_match",
      "group_title": "운 흐름 궁합",
      "title": "오늘 연락해도 되는 날",
      "question": "운 흐름 궁합에서 오늘 연락해도 되는 날은 두 사람에게 어떤 의미일까?",
      "conclusion": "오늘 연락해도 되는 날은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
      "summary": "오늘 먼저 말을 걸 때 부담이 덜한 톤을 골라요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "운 흐름 궁합 > 오늘 연락해도 되는 날",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "올해 흐름, 월 흐름, 오늘 행동",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "오늘 연락해도 되는 날은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "운 흐름 궁합 > 오늘 연락해도 되는 날",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "올해 흐름 · 월 흐름 · 오늘 행동",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 말도 어떤 날에는 잘 닿고, 어떤 날에는 방어를 키울 수 있습니다. 그래서 시기 해석은 예언보다 대화 순서 조정에 가깝습니다. 이 항목에서는 특히 '오늘 연락해도 되는 날'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "연·월·일 흐름은 계산 기준값이 들어와야 기간별로 좁힐 수 있습니다. 자료가 없으면 오늘 할 수 있는 작은 선택만 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "오늘 보낼 말은 짧게 만들기",
              "감정이 큰 날에는 결론보다 확인 질문을 고르기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "날짜 하나에 관계 결정을 맡기지 않기 / 예민한 날의 반응을 관계 전체로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "날짜 하나에 관계 결정을 맡기지 않기",
              "예민한 날의 반응을 관계 전체로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "오늘 보낼 말은 짧게 만들기",
        "감정이 큰 날에는 결론보다 확인 질문을 고르기"
      ],
      "cautions": [
        "날짜 하나에 관계 결정을 맡기지 않기",
        "예민한 날의 반응을 관계 전체로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "luck_flow_match__month_rhythm",
          "title": "이번 달 관계 리듬",
          "route": "index.html?section=luck_flow_match__month_rhythm#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "luck_flow_match__clash_day_talk",
          "title": "충 있는 날 대화법",
          "route": "index.html?section=luck_flow_match__clash_day_talk#step-6_1-report"
        }
      ]
    },
    "luck_flow_match__clash_day_talk": {
      "section_id": "luck_flow_match__clash_day_talk",
      "report_index_source": "user_seed",
      "group_id": "luck_flow_match",
      "group_title": "운 흐름 궁합",
      "title": "충 있는 날 대화법",
      "question": "운 흐름 궁합에서 충 있는 날 대화법은 두 사람에게 어떤 의미일까?",
      "conclusion": "충 있는 날 대화법은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
      "summary": "예민한 날에는 말을 줄일지, 구조를 바꿀지 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "운 흐름 궁합 > 충 있는 날 대화법",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "올해 흐름, 월 흐름, 오늘 행동",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "충 있는 날 대화법은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "운 흐름 궁합 > 충 있는 날 대화법",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "올해 흐름 · 월 흐름 · 오늘 행동",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 말도 어떤 날에는 잘 닿고, 어떤 날에는 방어를 키울 수 있습니다. 그래서 시기 해석은 예언보다 대화 순서 조정에 가깝습니다. 이 항목에서는 특히 '충 있는 날 대화법'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "연·월·일 흐름은 계산 기준값이 들어와야 기간별로 좁힐 수 있습니다. 자료가 없으면 오늘 할 수 있는 작은 선택만 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "오늘 보낼 말은 짧게 만들기",
              "감정이 큰 날에는 결론보다 확인 질문을 고르기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "날짜 하나에 관계 결정을 맡기지 않기 / 예민한 날의 반응을 관계 전체로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "날짜 하나에 관계 결정을 맡기지 않기",
              "예민한 날의 반응을 관계 전체로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000074",
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "오늘 보낼 말은 짧게 만들기",
        "감정이 큰 날에는 결론보다 확인 질문을 고르기"
      ],
      "cautions": [
        "날짜 하나에 관계 결정을 맡기지 않기",
        "예민한 날의 반응을 관계 전체로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "luck_flow_match__today_contact_day",
          "title": "오늘 연락해도 되는 날",
          "route": "index.html?section=luck_flow_match__today_contact_day#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "luck_flow_match__relationship_turning_time",
          "title": "관계 전환 타이밍",
          "route": "index.html?section=luck_flow_match__relationship_turning_time#step-6_1-report"
        }
      ]
    },
    "luck_flow_match__relationship_turning_time": {
      "section_id": "luck_flow_match__relationship_turning_time",
      "report_index_source": "user_seed",
      "group_id": "luck_flow_match",
      "group_title": "운 흐름 궁합",
      "title": "관계 전환 타이밍",
      "question": "운 흐름 궁합에서 관계 전환 타이밍은 두 사람에게 어떤 의미일까?",
      "conclusion": "관계 전환 타이밍은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
      "summary": "썸에서 연애, 연애에서 약속으로 넘어가는 결을 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "운 흐름 궁합 > 관계 전환 타이밍",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "올해 흐름, 월 흐름, 오늘 행동",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000203",
          "kind": "rag",
          "label": "자료 근거",
          "value": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "관계 전환 타이밍은 관계 온도와 대화 타이밍을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 운 흐름 궁합은 오늘 바로 움직일 말과 조금 기다릴 말을 나누는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "운 흐름 궁합 > 관계 전환 타이밍",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "올해 흐름 · 월 흐름 · 오늘 행동",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 같은 말도 어떤 날에는 잘 닿고, 어떤 날에는 방어를 키울 수 있습니다. 그래서 시기 해석은 예언보다 대화 순서 조정에 가깝습니다. 이 항목에서는 특히 '관계 전환 타이밍'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "연·월·일 흐름은 계산 기준값이 들어와야 기간별로 좁힐 수 있습니다. 자료가 없으면 오늘 할 수 있는 작은 선택만 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
              "오늘 보낼 말은 짧게 만들기",
              "감정이 큰 날에는 결론보다 확인 질문을 고르기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "날짜 하나에 관계 결정을 맡기지 않기 / 예민한 날의 반응을 관계 전체로 확대하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "날짜 하나에 관계 결정을 맡기지 않기",
              "예민한 날의 반응을 관계 전체로 확대하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000203",
            "item-05-qa-0007",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "관계 이름보다 상대가 편하게 답할 수 있는 다음 질문을 먼저 고르기",
        "오늘 보낼 말은 짧게 만들기",
        "감정이 큰 날에는 결론보다 확인 질문을 고르기"
      ],
      "cautions": [
        "날짜 하나에 관계 결정을 맡기지 않기",
        "예민한 날의 반응을 관계 전체로 확대하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "luck_flow_match__clash_day_talk",
          "title": "충 있는 날 대화법",
          "route": "index.html?section=luck_flow_match__clash_day_talk#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "mind_care__separate_confidence_anxiety",
          "title": "확신과 불안 분리",
          "route": "index.html?section=mind_care__separate_confidence_anxiety#step-6_1-report"
        }
      ]
    },
    "mind_care__separate_confidence_anxiety": {
      "section_id": "mind_care__separate_confidence_anxiety",
      "report_index_source": "user_seed",
      "group_id": "mind_care",
      "group_title": "마음 돌봄",
      "title": "확신과 불안 분리",
      "question": "마음 돌봄에서 확신과 불안 분리은 두 사람에게 어떤 의미일까?",
      "conclusion": "확신과 불안 분리은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
      "summary": "좋아하는 마음과 불안한 상상을 따로 놓고 봐요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "마음 돌봄 > 확신과 불안 분리",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "감정 분리, 거리두기, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "확신과 불안 분리은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "마음 돌봄 > 확신과 불안 분리",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "감정 분리 · 거리두기 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 좋아할수록 작은 답장이나 말투가 크게 느껴질 수 있어요. 이때 필요한 건 더 많은 추측이 아니라 감정의 이름과 확인 질문입니다. 이 항목에서는 특히 '확신과 불안 분리'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "불안이 큰 날에는 대화보다 한 박자 늦추는 선택이 낫습니다. 관계를 지키려면 나를 지키는 문장도 함께 필요합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "지금 감정을 한 단어로 적기",
              "확인한 사실과 상상을 두 줄로 나누기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "불안을 증거처럼 제시하지 않기 / 참는 것을 배려로만 포장하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "불안을 증거처럼 제시하지 않기",
              "참는 것을 배려로만 포장하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-05-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "지금 감정을 한 단어로 적기",
        "확인한 사실과 상상을 두 줄로 나누기"
      ],
      "cautions": [
        "불안을 증거처럼 제시하지 않기",
        "참는 것을 배려로만 포장하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "luck_flow_match__relationship_turning_time",
          "title": "관계 전환 타이밍",
          "route": "index.html?section=luck_flow_match__relationship_turning_time#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "mind_care__name_the_feeling",
          "title": "감정 이름 붙이기",
          "route": "index.html?section=mind_care__name_the_feeling#step-6_1-report"
        }
      ]
    },
    "mind_care__name_the_feeling": {
      "section_id": "mind_care__name_the_feeling",
      "report_index_source": "user_seed",
      "group_id": "mind_care",
      "group_title": "마음 돌봄",
      "title": "감정 이름 붙이기",
      "question": "마음 돌봄에서 감정 이름 붙이기은 두 사람에게 어떤 의미일까?",
      "conclusion": "감정 이름 붙이기은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
      "summary": "짜증, 서운함, 불안, 외로움을 한 단어로 잡아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "마음 돌봄 > 감정 이름 붙이기",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "감정 분리, 거리두기, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "감정 이름 붙이기은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "마음 돌봄 > 감정 이름 붙이기",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "감정 분리 · 거리두기 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 좋아할수록 작은 답장이나 말투가 크게 느껴질 수 있어요. 이때 필요한 건 더 많은 추측이 아니라 감정의 이름과 확인 질문입니다. 이 항목에서는 특히 '감정 이름 붙이기'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "불안이 큰 날에는 대화보다 한 박자 늦추는 선택이 낫습니다. 관계를 지키려면 나를 지키는 문장도 함께 필요합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "지금 감정을 한 단어로 적기",
              "확인한 사실과 상상을 두 줄로 나누기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "불안을 증거처럼 제시하지 않기 / 참는 것을 배려로만 포장하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "불안을 증거처럼 제시하지 않기",
              "참는 것을 배려로만 포장하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "지금 감정을 한 단어로 적기",
        "확인한 사실과 상상을 두 줄로 나누기"
      ],
      "cautions": [
        "불안을 증거처럼 제시하지 않기",
        "참는 것을 배려로만 포장하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "mind_care__separate_confidence_anxiety",
          "title": "확신과 불안 분리",
          "route": "index.html?section=mind_care__separate_confidence_anxiety#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "mind_care__one_beat_late",
          "title": "한 박자 늦추기",
          "route": "index.html?section=mind_care__one_beat_late#step-6_1-report"
        }
      ]
    },
    "mind_care__one_beat_late": {
      "section_id": "mind_care__one_beat_late",
      "report_index_source": "user_seed",
      "group_id": "mind_care",
      "group_title": "마음 돌봄",
      "title": "한 박자 늦추기",
      "question": "마음 돌봄에서 한 박자 늦추기은 두 사람에게 어떤 의미일까?",
      "conclusion": "한 박자 늦추기은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
      "summary": "보내기 직전 멈추면 달라지는 문장을 확인해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "마음 돌봄 > 한 박자 늦추기",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "감정 분리, 거리두기, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "한 박자 늦추기은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "마음 돌봄 > 한 박자 늦추기",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "감정 분리 · 거리두기 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 좋아할수록 작은 답장이나 말투가 크게 느껴질 수 있어요. 이때 필요한 건 더 많은 추측이 아니라 감정의 이름과 확인 질문입니다. 이 항목에서는 특히 '한 박자 늦추기'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "불안이 큰 날에는 대화보다 한 박자 늦추는 선택이 낫습니다. 관계를 지키려면 나를 지키는 문장도 함께 필요합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "지금 감정을 한 단어로 적기",
              "확인한 사실과 상상을 두 줄로 나누기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "불안을 증거처럼 제시하지 않기 / 참는 것을 배려로만 포장하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "불안을 증거처럼 제시하지 않기",
              "참는 것을 배려로만 포장하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "지금 감정을 한 단어로 적기",
        "확인한 사실과 상상을 두 줄로 나누기"
      ],
      "cautions": [
        "불안을 증거처럼 제시하지 않기",
        "참는 것을 배려로만 포장하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "mind_care__name_the_feeling",
          "title": "감정 이름 붙이기",
          "route": "index.html?section=mind_care__name_the_feeling#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "mind_care__distance_mission",
          "title": "거리두기 미션",
          "route": "index.html?section=mind_care__distance_mission#step-6_1-report"
        }
      ]
    },
    "mind_care__distance_mission": {
      "section_id": "mind_care__distance_mission",
      "report_index_source": "user_seed",
      "group_id": "mind_care",
      "group_title": "마음 돌봄",
      "title": "거리두기 미션",
      "question": "마음 돌봄에서 거리두기 미션은 두 사람에게 어떤 의미일까?",
      "conclusion": "거리두기 미션은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
      "summary": "붙잡는 대신 나를 회복하는 짧은 미션을 줘요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "마음 돌봄 > 거리두기 미션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "감정 분리, 거리두기, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000074",
          "kind": "rag",
          "label": "자료 근거",
          "value": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "거리두기 미션은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "마음 돌봄 > 거리두기 미션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "감정 분리 · 거리두기 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 좋아할수록 작은 답장이나 말투가 크게 느껴질 수 있어요. 이때 필요한 건 더 많은 추측이 아니라 감정의 이름과 확인 질문입니다. 이 항목에서는 특히 '거리두기 미션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "불안이 큰 날에는 대화보다 한 박자 늦추는 선택이 낫습니다. 관계를 지키려면 나를 지키는 문장도 함께 필요합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "지금 감정을 한 단어로 적기",
              "확인한 사실과 상상을 두 줄로 나누기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "불안을 증거처럼 제시하지 않기 / 참는 것을 배려로만 포장하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "불안을 증거처럼 제시하지 않기",
              "참는 것을 배려로만 포장하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "zip-궁합-qa-000074",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "지금 감정을 한 단어로 적기",
        "확인한 사실과 상상을 두 줄로 나누기"
      ],
      "cautions": [
        "불안을 증거처럼 제시하지 않기",
        "참는 것을 배려로만 포장하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "mind_care__one_beat_late",
          "title": "한 박자 늦추기",
          "route": "index.html?section=mind_care__one_beat_late#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "mind_care__boundary_sentence",
          "title": "나를 지키는 경계 문장",
          "route": "index.html?section=mind_care__boundary_sentence#step-6_1-report"
        }
      ]
    },
    "mind_care__boundary_sentence": {
      "section_id": "mind_care__boundary_sentence",
      "report_index_source": "user_seed",
      "group_id": "mind_care",
      "group_title": "마음 돌봄",
      "title": "나를 지키는 경계 문장",
      "question": "마음 돌봄에서 나를 지키는 경계 문장은 두 사람에게 어떤 의미일까?",
      "conclusion": "나를 지키는 경계 문장은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
      "summary": "관계를 지키면서도 내 선을 말하는 문장을 준비해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "마음 돌봄 > 나를 지키는 경계 문장",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "감정 분리, 거리두기, 경계 문장",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "나를 지키는 경계 문장은 불안과 경계 세우기을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 마음 돌봄은 상대 마음을 맞히는 대신 내 감정과 확인할 사실을 분리하는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "마음 돌봄 > 나를 지키는 경계 문장",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "감정 분리 · 거리두기 · 경계 문장",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 좋아할수록 작은 답장이나 말투가 크게 느껴질 수 있어요. 이때 필요한 건 더 많은 추측이 아니라 감정의 이름과 확인 질문입니다. 이 항목에서는 특히 '나를 지키는 경계 문장'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "불안이 큰 날에는 대화보다 한 박자 늦추는 선택이 낫습니다. 관계를 지키려면 나를 지키는 문장도 함께 필요합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "지금 감정을 한 단어로 적기",
              "확인한 사실과 상상을 두 줄로 나누기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "불안을 증거처럼 제시하지 않기 / 참는 것을 배려로만 포장하지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "불안을 증거처럼 제시하지 않기",
              "참는 것을 배려로만 포장하지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "지금 감정을 한 단어로 적기",
        "확인한 사실과 상상을 두 줄로 나누기"
      ],
      "cautions": [
        "불안을 증거처럼 제시하지 않기",
        "참는 것을 배려로만 포장하지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "mind_care__distance_mission",
          "title": "거리두기 미션",
          "route": "index.html?section=mind_care__distance_mission#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "result_packaging__chemistry_card",
          "title": "우리 둘 케미 카드",
          "route": "index.html?section=result_packaging__chemistry_card#step-6_1-report"
        }
      ]
    },
    "result_packaging__chemistry_card": {
      "section_id": "result_packaging__chemistry_card",
      "report_index_source": "user_seed",
      "group_id": "result_packaging",
      "group_title": "결과 패키징",
      "title": "우리 둘 케미 카드",
      "question": "결과 패키징에서 우리 둘 케미 카드은 두 사람에게 어떤 의미일까?",
      "conclusion": "우리 둘 케미 카드은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
      "summary": "둘만의 관계 키워드를 카드처럼 저장해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "결과 패키징 > 우리 둘 케미 카드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 요약, 보완 행동, 대화 미션",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-궁합-qa-000228",
          "kind": "rag",
          "label": "자료 근거",
          "value": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "우리 둘 케미 카드은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "결과 패키징 > 우리 둘 케미 카드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 요약 · 보완 행동 · 대화 미션",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 리포트를 보고 고개를 끄덕여도 실제 대화가 달라지지 않으면 관계 체감이 바뀌기 어렵습니다. 그래서 저장, 대화, 데이트 가이드를 함께 묶습니다. 이 항목에서는 특히 '우리 둘 케미 카드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "패키징 항목은 정밀 계산보다 사용자의 실천 맥락이 중요합니다. 둘 사이의 현재 온도에 맞춰 과하지 않은 액션으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "오늘 기억할 키워드 하나 저장하기",
              "상대에게 보낼 문장을 30자 안팎으로 줄이기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "리포트를 상대를 설득하는 카드로 쓰지 않기 / 관계 결정을 문장 하나에 맡기지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "리포트를 상대를 설득하는 카드로 쓰지 않기",
              "관계 결정을 문장 하나에 맡기지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-궁합-qa-000228",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "오늘 기억할 키워드 하나 저장하기",
        "상대에게 보낼 문장을 30자 안팎으로 줄이기"
      ],
      "cautions": [
        "리포트를 상대를 설득하는 카드로 쓰지 않기",
        "관계 결정을 문장 하나에 맡기지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "mind_care__boundary_sentence",
          "title": "나를 지키는 경계 문장",
          "route": "index.html?section=mind_care__boundary_sentence#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "result_packaging__support_quest",
          "title": "보완 퀘스트",
          "route": "index.html?section=result_packaging__support_quest#step-6_1-report"
        }
      ]
    },
    "result_packaging__support_quest": {
      "section_id": "result_packaging__support_quest",
      "report_index_source": "user_seed",
      "group_id": "result_packaging",
      "group_title": "결과 패키징",
      "title": "보완 퀘스트",
      "question": "결과 패키징에서 보완 퀘스트은 두 사람에게 어떤 의미일까?",
      "conclusion": "보완 퀘스트은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
      "summary": "잘 안 맞는 지점을 작은 실천으로 바꿔요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "결과 패키징 > 보완 퀘스트",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 요약, 보완 행동, 대화 미션",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "zip-만세력-qa-000539",
          "kind": "rag",
          "label": "자료 근거",
          "value": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "보완 퀘스트은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "결과 패키징 > 보완 퀘스트",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 요약 · 보완 행동 · 대화 미션",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 리포트를 보고 고개를 끄덕여도 실제 대화가 달라지지 않으면 관계 체감이 바뀌기 어렵습니다. 그래서 저장, 대화, 데이트 가이드를 함께 묶습니다. 이 항목에서는 특히 '보완 퀘스트'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "패키징 항목은 정밀 계산보다 사용자의 실천 맥락이 중요합니다. 둘 사이의 현재 온도에 맞춰 과하지 않은 액션으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "오늘 기억할 키워드 하나 저장하기",
              "상대에게 보낼 문장을 30자 안팎으로 줄이기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "리포트를 상대를 설득하는 카드로 쓰지 않기 / 관계 결정을 문장 하나에 맡기지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "리포트를 상대를 설득하는 카드로 쓰지 않기",
              "관계 결정을 문장 하나에 맡기지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "zip-만세력-qa-000539",
            "item-05-qa-0001",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "오늘 기억할 키워드 하나 저장하기",
        "상대에게 보낼 문장을 30자 안팎으로 줄이기"
      ],
      "cautions": [
        "리포트를 상대를 설득하는 카드로 쓰지 않기",
        "관계 결정을 문장 하나에 맡기지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "result_packaging__chemistry_card",
          "title": "우리 둘 케미 카드",
          "route": "index.html?section=result_packaging__chemistry_card#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "result_packaging__conversation_mission",
          "title": "대화 미션",
          "route": "index.html?section=result_packaging__conversation_mission#step-6_1-report"
        }
      ]
    },
    "result_packaging__conversation_mission": {
      "section_id": "result_packaging__conversation_mission",
      "report_index_source": "user_seed",
      "group_id": "result_packaging",
      "group_title": "결과 패키징",
      "title": "대화 미션",
      "question": "결과 패키징에서 대화 미션은 두 사람에게 어떤 의미일까?",
      "conclusion": "대화 미션은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
      "summary": "오늘 해볼 수 있는 대화 주제를 짧게 제안해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "결과 패키징 > 대화 미션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 요약, 보완 행동, 대화 미션",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "대화 미션은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "결과 패키징 > 대화 미션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 요약 · 보완 행동 · 대화 미션",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 리포트를 보고 고개를 끄덕여도 실제 대화가 달라지지 않으면 관계 체감이 바뀌기 어렵습니다. 그래서 저장, 대화, 데이트 가이드를 함께 묶습니다. 이 항목에서는 특히 '대화 미션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "패키징 항목은 정밀 계산보다 사용자의 실천 맥락이 중요합니다. 둘 사이의 현재 온도에 맞춰 과하지 않은 액션으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "오늘 기억할 키워드 하나 저장하기",
              "상대에게 보낼 문장을 30자 안팎으로 줄이기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "리포트를 상대를 설득하는 카드로 쓰지 않기 / 관계 결정을 문장 하나에 맡기지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "리포트를 상대를 설득하는 카드로 쓰지 않기",
              "관계 결정을 문장 하나에 맡기지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "오늘 기억할 키워드 하나 저장하기",
        "상대에게 보낼 문장을 30자 안팎으로 줄이기"
      ],
      "cautions": [
        "리포트를 상대를 설득하는 카드로 쓰지 않기",
        "관계 결정을 문장 하나에 맡기지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "result_packaging__support_quest",
          "title": "보완 퀘스트",
          "route": "index.html?section=result_packaging__support_quest#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "result_packaging__date_contact_guide",
          "title": "데이트/연락 가이드",
          "route": "index.html?section=result_packaging__date_contact_guide#step-6_1-report"
        }
      ]
    },
    "result_packaging__date_contact_guide": {
      "section_id": "result_packaging__date_contact_guide",
      "report_index_source": "user_seed",
      "group_id": "result_packaging",
      "group_title": "결과 패키징",
      "title": "데이트/연락 가이드",
      "question": "결과 패키징에서 데이트/연락 가이드은 두 사람에게 어떤 의미일까?",
      "conclusion": "데이트/연락 가이드은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
      "summary": "만남과 연락을 어떤 톤으로 잡을지 제안해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "결과 패키징 > 데이트/연락 가이드",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 요약, 보완 행동, 대화 미션",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "데이트/연락 가이드은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "결과 패키징 > 데이트/연락 가이드",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 요약 · 보완 행동 · 대화 미션",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 리포트를 보고 고개를 끄덕여도 실제 대화가 달라지지 않으면 관계 체감이 바뀌기 어렵습니다. 그래서 저장, 대화, 데이트 가이드를 함께 묶습니다. 이 항목에서는 특히 '데이트/연락 가이드'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "패키징 항목은 정밀 계산보다 사용자의 실천 맥락이 중요합니다. 둘 사이의 현재 온도에 맞춰 과하지 않은 액션으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "오늘 기억할 키워드 하나 저장하기",
              "상대에게 보낼 문장을 30자 안팎으로 줄이기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "리포트를 상대를 설득하는 카드로 쓰지 않기 / 관계 결정을 문장 하나에 맡기지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "리포트를 상대를 설득하는 카드로 쓰지 않기",
              "관계 결정을 문장 하나에 맡기지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "zip-궁합-qa-000230",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "오늘 기억할 키워드 하나 저장하기",
        "상대에게 보낼 문장을 30자 안팎으로 줄이기"
      ],
      "cautions": [
        "리포트를 상대를 설득하는 카드로 쓰지 않기",
        "관계 결정을 문장 하나에 맡기지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "result_packaging__conversation_mission",
          "title": "대화 미션",
          "route": "index.html?section=result_packaging__conversation_mission#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "result_packaging__no_absolute_decision_notice",
          "title": "“헤어져/결혼해” 단정 금지 안내",
          "route": "index.html?section=result_packaging__no_absolute_decision_notice#step-6_1-report"
        }
      ]
    },
    "result_packaging__no_absolute_decision_notice": {
      "section_id": "result_packaging__no_absolute_decision_notice",
      "report_index_source": "user_seed",
      "group_id": "result_packaging",
      "group_title": "결과 패키징",
      "title": "“헤어져/결혼해” 단정 금지 안내",
      "question": "결과 패키징에서 “헤어져/결혼해” 단정 금지 안내은 두 사람에게 어떤 의미일까?",
      "conclusion": "“헤어져/결혼해” 단정 금지 안내은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
      "summary": "리포트가 선택을 대신하지 않는다는 기준을 분명히 둬요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "결과 패키징 > “헤어져/결혼해” 단정 금지 안내",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "관계 요약, 보완 행동, 대화 미션",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-00-p1-g03",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "“헤어져/결혼해” 단정 금지 안내은 결과 저장과 실천 미션을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 결과 패키징은 읽고 끝나는 풀이를 오늘 쓸 수 있는 카드와 미션으로 바꾸는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "결과 패키징 > “헤어져/결혼해” 단정 금지 안내",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "관계 요약 · 보완 행동 · 대화 미션",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 리포트를 보고 고개를 끄덕여도 실제 대화가 달라지지 않으면 관계 체감이 바뀌기 어렵습니다. 그래서 저장, 대화, 데이트 가이드를 함께 묶습니다. 이 항목에서는 특히 '“헤어져/결혼해” 단정 금지 안내'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "패키징 항목은 정밀 계산보다 사용자의 실천 맥락이 중요합니다. 둘 사이의 현재 온도에 맞춰 과하지 않은 액션으로 내려갑니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
              "오늘 기억할 키워드 하나 저장하기",
              "상대에게 보낼 문장을 30자 안팎으로 줄이기"
            ]
          },
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "리포트를 상대를 설득하는 카드로 쓰지 않기 / 관계 결정을 문장 하나에 맡기지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "리포트를 상대를 설득하는 카드로 쓰지 않기",
              "관계 결정을 문장 하나에 맡기지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-00-p1-g03",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "현실 기준은 감정 평가가 아니라 생활 규칙처럼 짧게 합의하기",
        "오늘 기억할 키워드 하나 저장하기",
        "상대에게 보낼 문장을 30자 안팎으로 줄이기"
      ],
      "cautions": [
        "리포트를 상대를 설득하는 카드로 쓰지 않기",
        "관계 결정을 문장 하나에 맡기지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "result_packaging__date_contact_guide",
          "title": "데이트/연락 가이드",
          "route": "index.html?section=result_packaging__date_contact_guide#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "today_relationship_action__contact_tone",
          "title": "오늘 연락 톤",
          "route": "index.html?section=today_relationship_action__contact_tone#step-6_1-report"
        }
      ]
    },
    "today_relationship_action__contact_tone": {
      "section_id": "today_relationship_action__contact_tone",
      "report_index_source": "user_seed",
      "group_id": "today_relationship_action",
      "group_title": "오늘의 관계 액션",
      "title": "오늘 연락 톤",
      "question": "오늘의 관계 액션에서 오늘 연락 톤은 두 사람에게 어떤 의미일까?",
      "conclusion": "오늘 연락 톤은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
      "summary": "먼저 연락한다면 어떤 온도가 덜 부담스러운지 골라요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오늘의 관계 액션 > 오늘 연락 톤",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오늘 대화, 확인 질문, 거리두기",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "오늘 연락 톤은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오늘의 관계 액션 > 오늘 연락 톤",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오늘 대화 · 확인 질문 · 거리두기",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 지금 당장 보내고 싶은 말이 있어도 상대가 받을 수 있는 톤은 다를 수 있어요. 그래서 말의 길이, 온도, 순서를 먼저 고릅니다. 이 항목에서는 특히 '오늘 연락 톤'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "오늘 컨디션, 마지막 대화, 상대의 응답 리듬이 들어오면 더 좁혀집니다. 없을 때는 부담이 낮은 행동부터 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "확인 질문 하나만 남기기",
              "감정 설명은 짧게, 요구는 뒤로 미루기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "오늘 반응 하나로 관계 전체를 판단하지 않기 / 급한 마음으로 긴 메시지를 연속해서 보내지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "오늘 반응 하나로 관계 전체를 판단하지 않기",
              "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0001",
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "확인 질문 하나만 남기기",
        "감정 설명은 짧게, 요구는 뒤로 미루기"
      ],
      "cautions": [
        "오늘 반응 하나로 관계 전체를 판단하지 않기",
        "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "result_packaging__no_absolute_decision_notice",
          "title": "“헤어져/결혼해” 단정 금지 안내",
          "route": "index.html?section=result_packaging__no_absolute_decision_notice#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "today_relationship_action__one_sentence_question",
          "title": "한 문장 확인 질문",
          "route": "index.html?section=today_relationship_action__one_sentence_question#step-6_1-report"
        }
      ]
    },
    "today_relationship_action__one_sentence_question": {
      "section_id": "today_relationship_action__one_sentence_question",
      "report_index_source": "user_seed",
      "group_id": "today_relationship_action",
      "group_title": "오늘의 관계 액션",
      "title": "한 문장 확인 질문",
      "question": "오늘의 관계 액션에서 한 문장 확인 질문은 두 사람에게 어떤 의미일까?",
      "conclusion": "한 문장 확인 질문은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
      "summary": "관계를 흔들지 않고 확인할 수 있는 질문을 뽑아요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오늘의 관계 액션 > 한 문장 확인 질문",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오늘 대화, 확인 질문, 거리두기",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "한 문장 확인 질문은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오늘의 관계 액션 > 한 문장 확인 질문",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오늘 대화 · 확인 질문 · 거리두기",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 지금 당장 보내고 싶은 말이 있어도 상대가 받을 수 있는 톤은 다를 수 있어요. 그래서 말의 길이, 온도, 순서를 먼저 고릅니다. 이 항목에서는 특히 '한 문장 확인 질문'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "오늘 컨디션, 마지막 대화, 상대의 응답 리듬이 들어오면 더 좁혀집니다. 없을 때는 부담이 낮은 행동부터 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "질문은 '내가 느낀 것'과 '확인하고 싶은 것'을 나눠 한 문장으로 쓰기",
              "확인 질문 하나만 남기기",
              "감정 설명은 짧게, 요구는 뒤로 미루기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "오늘 반응 하나로 관계 전체를 판단하지 않기 / 급한 마음으로 긴 메시지를 연속해서 보내지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "오늘 반응 하나로 관계 전체를 판단하지 않기",
              "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "질문은 '내가 느낀 것'과 '확인하고 싶은 것'을 나눠 한 문장으로 쓰기",
        "확인 질문 하나만 남기기",
        "감정 설명은 짧게, 요구는 뒤로 미루기"
      ],
      "cautions": [
        "오늘 반응 하나로 관계 전체를 판단하지 않기",
        "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "today_relationship_action__contact_tone",
          "title": "오늘 연락 톤",
          "route": "index.html?section=today_relationship_action__contact_tone#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "today_relationship_action__distance_mission",
          "title": "거리두기 미션",
          "route": "index.html?section=today_relationship_action__distance_mission#step-6_1-report"
        }
      ]
    },
    "today_relationship_action__distance_mission": {
      "section_id": "today_relationship_action__distance_mission",
      "report_index_source": "user_seed",
      "group_id": "today_relationship_action",
      "group_title": "오늘의 관계 액션",
      "title": "거리두기 미션",
      "question": "오늘의 관계 액션에서 거리두기 미션은 두 사람에게 어떤 의미일까?",
      "conclusion": "거리두기 미션은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
      "summary": "말을 더 하기보다 잠깐 덜어내는 미션을 제안해요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오늘의 관계 액션 > 거리두기 미션",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오늘 대화, 확인 질문, 거리두기",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "거리두기 미션은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오늘의 관계 액션 > 거리두기 미션",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오늘 대화 · 확인 질문 · 거리두기",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "2개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 지금 당장 보내고 싶은 말이 있어도 상대가 받을 수 있는 톤은 다를 수 있어요. 그래서 말의 길이, 온도, 순서를 먼저 고릅니다. 이 항목에서는 특히 '거리두기 미션'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "오늘 컨디션, 마지막 대화, 상대의 응답 리듬이 들어오면 더 좁혀집니다. 없을 때는 부담이 낮은 행동부터 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
              "확인 질문 하나만 남기기",
              "감정 설명은 짧게, 요구는 뒤로 미루기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "오늘 반응 하나로 관계 전체를 판단하지 않기 / 급한 마음으로 긴 메시지를 연속해서 보내지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "오늘 반응 하나로 관계 전체를 판단하지 않기",
              "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0007",
            "item-05-qa-0001",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "오늘 바로 할 수 있는 가장 작은 행동 하나만 고르기",
        "확인 질문 하나만 남기기",
        "감정 설명은 짧게, 요구는 뒤로 미루기"
      ],
      "cautions": [
        "오늘 반응 하나로 관계 전체를 판단하지 않기",
        "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "today_relationship_action__one_sentence_question",
          "title": "한 문장 확인 질문",
          "route": "index.html?section=today_relationship_action__one_sentence_question#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "today_relationship_action__reconciliation_sentence",
          "title": "화해 문장 추천",
          "route": "index.html?section=today_relationship_action__reconciliation_sentence#step-6_1-report"
        }
      ]
    },
    "today_relationship_action__reconciliation_sentence": {
      "section_id": "today_relationship_action__reconciliation_sentence",
      "report_index_source": "user_seed",
      "group_id": "today_relationship_action",
      "group_title": "오늘의 관계 액션",
      "title": "화해 문장 추천",
      "question": "오늘의 관계 액션에서 화해 문장 추천은 두 사람에게 어떤 의미일까?",
      "conclusion": "화해 문장 추천은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
      "summary": "오늘 먼저 풀고 싶을 때 쓸 수 있는 시작 문장을 줘요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오늘의 관계 액션 > 화해 문장 추천",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오늘 대화, 확인 질문, 거리두기",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-05-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "zip-궁합-qa-000230",
          "kind": "rag",
          "label": "자료 근거",
          "value": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "화해 문장 추천은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오늘의 관계 액션 > 화해 문장 추천",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오늘 대화 · 확인 질문 · 거리두기",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 지금 당장 보내고 싶은 말이 있어도 상대가 받을 수 있는 톤은 다를 수 있어요. 그래서 말의 길이, 온도, 순서를 먼저 고릅니다. 이 항목에서는 특히 '화해 문장 추천'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "오늘 컨디션, 마지막 대화, 상대의 응답 리듬이 들어오면 더 좁혀집니다. 없을 때는 부담이 낮은 행동부터 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
              "확인 질문 하나만 남기기",
              "감정 설명은 짧게, 요구는 뒤로 미루기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "오늘 반응 하나로 관계 전체를 판단하지 않기 / 급한 마음으로 긴 메시지를 연속해서 보내지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "오늘 반응 하나로 관계 전체를 판단하지 않기",
              "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-05-qa-0007",
            "item-41-qa-0003",
            "zip-궁합-qa-000230",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "설명보다 먼저 인정 문장 하나를 두고, 긴 이야기는 다음 대화로 미루기",
        "확인 질문 하나만 남기기",
        "감정 설명은 짧게, 요구는 뒤로 미루기"
      ],
      "cautions": [
        "오늘 반응 하나로 관계 전체를 판단하지 않기",
        "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "today_relationship_action__distance_mission",
          "title": "거리두기 미션",
          "route": "index.html?section=today_relationship_action__distance_mission#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "today_relationship_action__avoid_tone_today",
          "title": "오늘 피할 말투",
          "route": "index.html?section=today_relationship_action__avoid_tone_today#step-6_1-report"
        }
      ]
    },
    "today_relationship_action__avoid_tone_today": {
      "section_id": "today_relationship_action__avoid_tone_today",
      "report_index_source": "user_seed",
      "group_id": "today_relationship_action",
      "group_title": "오늘의 관계 액션",
      "title": "오늘 피할 말투",
      "question": "오늘의 관계 액션에서 오늘 피할 말투은 두 사람에게 어떤 의미일까?",
      "conclusion": "오늘 피할 말투은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
      "summary": "상대 방어를 키울 수 있는 표현을 미리 덜어내요.",
      "evidence": [
        {
          "id": "calc-selected-section",
          "kind": "calculated_fact",
          "label": "선택한 항목",
          "value": "오늘의 관계 액션 > 오늘 피할 말투",
          "calculated_fact_key": "section_id_in_report_index"
        },
        {
          "id": "calc-pair-input",
          "kind": "calculated_fact",
          "label": "입력 구조",
          "value": "본인과 상대의 생년월일을 분리해 비교",
          "calculated_fact_key": "subjects_pair_birth"
        },
        {
          "id": "calc-analysis-basis",
          "kind": "calculated_fact",
          "label": "분석 기준",
          "value": "오늘 대화, 확인 질문, 거리두기",
          "calculated_fact_key": "analysis_basis"
        },
        {
          "id": "item-41-qa-0003",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
        },
        {
          "id": "item-41-qa-0007",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
        },
        {
          "id": "item-05-qa-0001",
          "kind": "rag",
          "label": "자료 근거",
          "value": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
        }
      ],
      "interpretation_blocks": [
        {
          "type": "text",
          "title": "한 줄 결론",
          "content": "오늘 피할 말투은 오늘 바로 할 작은 행동을 중심으로 두 사람의 케미를 너무 크게 단정하지 않고 읽는 항목입니다. 오늘의 관계 액션은 마음을 크게 증명하려는 대신 오늘 할 수 있는 한 문장과 한 행동으로 줄이는 파트입니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "table",
          "title": "확인된 근거",
          "content": "두 사람의 입력값과 자료 근거를 나눠서 봅니다. 아직 계산값이 비어 있으면 화면은 구조만 보여줍니다.",
          "data": {
            "columns": [
              "구분",
              "현재 상태",
              "해석에 쓰는 방식"
            ],
            "rows": [
              {
                "label": "선택 항목",
                "value": "오늘의 관계 액션 > 오늘 피할 말투",
                "source_key": "section_id_in_report_index"
              },
              {
                "label": "두 사람 입력",
                "value": "본인/상대 정보를 따로 받는 구조",
                "source_key": "subjects_pair_birth"
              },
              {
                "label": "분석 축",
                "value": "오늘 대화 · 확인 질문 · 거리두기",
                "source_key": "analysis_basis"
              },
              {
                "label": "자료 연결",
                "value": "3개 항목 연결",
                "source_key": "evidence_ids"
              }
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "section_id_in_report_index",
            "subjects_pair_birth",
            "analysis_basis"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "현실에서 보이는 모습",
          "content": "현실에서는 지금 당장 보내고 싶은 말이 있어도 상대가 받을 수 있는 톤은 다를 수 있어요. 그래서 말의 길이, 온도, 순서를 먼저 고릅니다. 이 항목에서는 특히 '오늘 피할 말투'에 해당하는 장면만 좁혀서 봅니다.",
          "data": {},
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "시기·강약·조건",
          "content": "오늘 컨디션, 마지막 대화, 상대의 응답 리듬이 들어오면 더 좁혀집니다. 없을 때는 부담이 낮은 행동부터 제안합니다.",
          "data": {
            "has_numeric_chart": false,
            "chart_reason": "구조화된 기간·강도 숫자가 없어서 그래프 대신 조건 카드로 표시"
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "runtime_calculation_required"
          ],
          "asset_key": ""
        },
        {
          "type": "action",
          "title": "지금 할 행동",
          "content": "오늘 또는 이번 주에 바로 해볼 수 있는 작은 행동입니다.",
          "data": {
            "actions": [
              "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
              "확인 질문 하나만 남기기",
              "감정 설명은 짧게, 요구는 뒤로 미루기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001"
          ],
          "calculated_fact_keys": [
            "relationship_context"
          ],
          "asset_key": ""
        },
        {
          "type": "text",
          "title": "주의할 선택",
          "content": "오늘 반응 하나로 관계 전체를 판단하지 않기 / 급한 마음으로 긴 메시지를 연속해서 보내지 않기 / 사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기",
          "data": {
            "cautions": [
              "오늘 반응 하나로 관계 전체를 판단하지 않기",
              "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
              "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
            ]
          },
          "evidence_ids": [
            "item-41-qa-0003",
            "item-41-qa-0007",
            "item-05-qa-0001",
            "item-00-p1-g03"
          ],
          "calculated_fact_keys": [
            "safety_policy"
          ],
          "asset_key": ""
        }
      ],
      "actions": [
        "보내기 전 문장을 한 번 줄이고, 상대가 답하기 쉬운 형태로 바꾸기",
        "확인 질문 하나만 남기기",
        "감정 설명은 짧게, 요구는 뒤로 미루기"
      ],
      "cautions": [
        "오늘 반응 하나로 관계 전체를 판단하지 않기",
        "급한 마음으로 긴 메시지를 연속해서 보내지 않기",
        "사주 해석을 상대에게 들이대는 증거처럼 쓰지 않기"
      ],
      "related_sections": [
        {
          "relation": "previous",
          "section_id": "today_relationship_action__reconciliation_sentence",
          "title": "화해 문장 추천",
          "route": "index.html?section=today_relationship_action__reconciliation_sentence#step-6_1-report"
        },
        {
          "relation": "next",
          "section_id": "relationship_overview__chemistry_one_line",
          "title": "케미 한 줄",
          "route": "index.html?section=relationship_overview__chemistry_one_line#step-6_1-report"
        }
      ]
    }
  },
  "evidence": [
    {
      "evidence_id": "zip-궁합-qa-000305",
      "source": "ZIP-궁합",
      "locator": "궁합 상담 구조",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "띠와 지지 관계를 조화, 불화, 협력, 갈등 축으로 나누어 관계 해석에 연결할 수 있음"
    },
    {
      "evidence_id": "zip-궁합-qa-000203",
      "source": "ZIP-궁합",
      "locator": "궁합 상담 사례",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "호감, 결혼, 동업, 관계 지속 가능성을 같은 상담 흐름에서 분리해 다룰 수 있음"
    },
    {
      "evidence_id": "zip-궁합-qa-000074",
      "source": "ZIP-궁합",
      "locator": "지지 관계 항목",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "거리 조절이 필요한 조합과 충돌 지점을 항목화하는 근거"
    },
    {
      "evidence_id": "zip-궁합-qa-000051",
      "source": "ZIP-궁합",
      "locator": "부부·사업 궁합 항목",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "생활 관계와 동업 관계를 별도 체크포인트로 나누는 근거"
    },
    {
      "evidence_id": "zip-궁합-qa-000228",
      "source": "ZIP-궁합",
      "locator": "pdf0020001 p.105",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "다툼, 결혼·동업, 신뢰, 의사소통을 관계 리포트 축으로 함께 구성할 수 있음"
    },
    {
      "evidence_id": "zip-궁합-qa-000230",
      "source": "ZIP-궁합",
      "locator": "pdf0020001 p.107",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "공동 목표, 협력, 의사소통 장애, 성격 충돌, 이해와 애정을 관계 해석 축으로 사용할 수 있음"
    },
    {
      "evidence_id": "zip-궁합-qa-000153",
      "source": "ZIP-궁합",
      "locator": "pdf0020001 p.27",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "상호 협조, 주도권 투쟁, 소통 장애, 공통 이해 기반을 관계 상태로 나누어 설명하는 근거"
    },
    {
      "evidence_id": "zip-색체명리학-qa-000147",
      "source": "ZIP-색체명리학",
      "locator": "일간·일지 설명 항목",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "사주는 생년, 생월, 생일, 생시의 천간과 지지를 보고 일주의 천간은 일간, 지지는 일지로 구분함"
    },
    {
      "evidence_id": "zip-만세력-qa-000539",
      "source": "ZIP-만세력",
      "locator": "오행 상생·상극 항목",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "오행 상생과 상극 흐름을 관계 에너지의 충전·소모 축으로 변환할 수 있음"
    },
    {
      "evidence_id": "zip-만세력-qa-000550",
      "source": "ZIP-만세력",
      "locator": "십신·육친 관계 항목",
      "review_status": "unreviewed",
      "writing_type": "",
      "takeaway": "십성 구조를 친구 같은 연애, 책임, 현실 케어, 기대고 싶은 정서 코드로 재분류할 수 있음"
    },
    {
      "evidence_id": "item-10-p1-0071",
      "source": "ITEM-10_사주 핵심 해석",
      "locator": "일간 설명 항목",
      "review_status": "cataloged",
      "writing_type": "",
      "takeaway": "일간은 해석 기준점이며 단독으로 성격이나 결과를 단정하지 않음"
    },
    {
      "evidence_id": "item-05-qa-0001",
      "source": "ITEM-05_오늘의 액션",
      "locator": "오늘 행동 항목",
      "review_status": "cataloged",
      "writing_type": "",
      "takeaway": "관계 질문을 오늘 할 수 있는 작은 행동으로 바꾸는 근거"
    },
    {
      "evidence_id": "item-05-qa-0007",
      "source": "ITEM-05_오늘의 액션",
      "locator": "확인 질문 항목",
      "review_status": "cataloged",
      "writing_type": "",
      "takeaway": "바로 결론을 내리기보다 확인 가능한 한 문장 질문으로 연결함"
    },
    {
      "evidence_id": "item-41-qa-0003",
      "source": "ITEM-41_마음 돌봄 리포트",
      "locator": "관계 대화 항목",
      "review_status": "cataloged",
      "writing_type": "",
      "takeaway": "관계 대화에서 느낀 것과 확인하고 싶은 것을 나누어 표현하는 방식을 권장함"
    },
    {
      "evidence_id": "item-41-qa-0007",
      "source": "ITEM-41_마음 돌봄 리포트",
      "locator": "거리두기 항목",
      "review_status": "cataloged",
      "writing_type": "",
      "takeaway": "관계 불안을 줄이기 위해 잠깐 멈추고 경계를 세우는 액션을 구성할 수 있음"
    },
    {
      "evidence_id": "item-00-p1-g03",
      "source": "ITEM-00_공통_RAG_플랫폼",
      "locator": "공통 안전 샘플",
      "review_status": "golden_sample",
      "writing_type": "",
      "takeaway": "관계의 종료나 결혼 여부를 사주로 단정하지 않고 선택은 사용자의 몫으로 둠"
    },
    {
      "evidence_id": "zip-궁합-qa-000357",
      "source": "궁합",
      "locator": "pdf0030001.pdf:p.122",
      "review_status": "synthetic_question_from_sqlite_evidence_unreviewed",
      "writing_type": "COUNSELING",
      "takeaway": "관계·재물·직업·외형 관찰처럼 개인의 고민과 선택을 다루는 상담형 콘텐츠입니다. 왜 그런 패턴이 나타날 수 있는지와 현실에서 활용할 방법을 함께 설명하며, 결론을 대신 정하지 않습니다."
    },
    {
      "evidence_id": "zip-궁합-qa-000152",
      "source": "궁합",
      "locator": "pdf0020001.pdf:p.26",
      "review_status": "synthetic_question_from_sqlite_evidence_unreviewed",
      "writing_type": "COUNSELING",
      "takeaway": "관계·재물·직업·외형 관찰처럼 개인의 고민과 선택을 다루는 상담형 콘텐츠입니다. 왜 그런 패턴이 나타날 수 있는지와 현실에서 활용할 방법을 함께 설명하며, 결론을 대신 정하지 않습니다."
    },
    {
      "evidence_id": "zip-궁합-qa-000331",
      "source": "궁합",
      "locator": "pdf0030001.pdf:p.95",
      "review_status": "synthetic_question_from_sqlite_evidence_unreviewed",
      "writing_type": "COUNSELING",
      "takeaway": "관계·재물·직업·외형 관찰처럼 개인의 고민과 선택을 다루는 상담형 콘텐츠입니다. 왜 그런 패턴이 나타날 수 있는지와 현실에서 활용할 방법을 함께 설명하며, 결론을 대신 정하지 않습니다."
    },
    {
      "evidence_id": "zip-만세력-qa-000588",
      "source": "만세력",
      "locator": "p.102:chunk.1",
      "review_status": "synthetic_question_from_pdf_unreviewed",
      "writing_type": "DICTIONARY",
      "takeaway": "용어와 자료의 의미를 먼저 쉬운 말로 설명하고, 특징·장점·주의점·활용 가능성을 구분합니다. 전문 용어는 필요한 만큼만 사용하며, 원문 표현은 참고로 다루고 개인의 성격이나 미래를 확정하지 않습니다."
    },
    {
      "evidence_id": "zip-만세력-qa-000540",
      "source": "만세력",
      "locator": "p.54:chunk.1",
      "review_status": "synthetic_question_from_pdf_unreviewed",
      "writing_type": "DICTIONARY",
      "takeaway": "용어와 자료의 의미를 먼저 쉬운 말로 설명하고, 특징·장점·주의점·활용 가능성을 구분합니다. 전문 용어는 필요한 만큼만 사용하며, 원문 표현은 참고로 다루고 개인의 성격이나 미래를 확정하지 않습니다."
    },
    {
      "evidence_id": "zip-만세력-qa-000552",
      "source": "만세력",
      "locator": "p.66:chunk.1",
      "review_status": "synthetic_question_from_pdf_unreviewed",
      "writing_type": "DICTIONARY",
      "takeaway": "용어와 자료의 의미를 먼저 쉬운 말로 설명하고, 특징·장점·주의점·활용 가능성을 구분합니다. 전문 용어는 필요한 만큼만 사용하며, 원문 표현은 참고로 다루고 개인의 성격이나 미래를 확정하지 않습니다."
    },
    {
      "evidence_id": "item-05-qa-0008",
      "source": "오늘의 마음 돌봄",
      "locator": "question@L125",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    },
    {
      "evidence_id": "item-05-qa-0003",
      "source": "오늘의 마음 돌봄",
      "locator": "question@L65",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    },
    {
      "evidence_id": "item-05-qa-0004",
      "source": "오늘의 마음 돌봄",
      "locator": "question@L77",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    },
    {
      "evidence_id": "item-41-qa-0001",
      "source": "마음 돌봄 리포트",
      "locator": "question@L41",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    },
    {
      "evidence_id": "item-41-qa-0015",
      "source": "마음 돌봄 리포트",
      "locator": "question@L216",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    },
    {
      "evidence_id": "item-41-qa-0014",
      "source": "마음 돌봄 리포트",
      "locator": "question@L203",
      "review_status": "source_extracted_unreviewed",
      "writing_type": "SITUATION_ADVICE",
      "takeaway": "오늘·대운·세운·택일처럼 시기와 선택을 다루는 콘텐츠입니다. 예언이나 확정된 결과보다 현재 확인할 조건, 주의할 행동, 활용할 작은 선택을 중심으로 설명합니다."
    }
  ],
  "image_manifest": [],
  "character_reference": {
    "reference_status": "selected",
    "reference_image": "IMAGE/Codex 이미지 2026년 9월 3일 오후 01_18_29.png",
    "template_image_folder_status": "missing_bitmap",
    "style_lock": [
      "반실사 웹툰풍 커플",
      "청록/화이트/블랙 팔레트",
      "블랙 재킷",
      "실버 헤어 포인트",
      "차가운 하이패션 조명"
    ],
    "style_variation": [
      "06_1은 정보형 상세 화면이라 신규 인물 이미지를 만들지 않고 UI 색감과 조명 톤에 반영"
    ],
    "generation_policy": "same-character-new-scene"
  },
  "render_contract": {
    "back_route": "../05-step-5-chat/chat.html#step-5-chat",
    "default_section": "relationship_overview__chemistry_one_line",
    "next_section": "relationship_overview__green_light_points",
    "previous_section": "today_relationship_action__avoid_tone_today"
  },
  "qa_result": {
    "stage": "06-step-6_1-report-detail",
    "status": "ready_for_review",
    "scope_mismatch": false,
    "checks": [
      {
        "item": "section id integrity",
        "status": "pass",
        "note": "05의 70개 section_id만 상세 렌더 대상으로 사용하고 새 항목을 만들지 않았습니다."
      },
      {
        "item": "detail structure",
        "status": "pass",
        "note": "각 상세 항목은 한 줄 결론, 확인된 근거, 현실 모습, 시기·조건, 지금 행동, 주의할 선택, 연관 항목을 가집니다."
      },
      {
        "item": "chart policy",
        "status": "pass",
        "note": "구조화된 숫자나 기간이 없어 장식 그래프를 만들지 않고 조건 카드와 표로 대체했습니다."
      },
      {
        "item": "entitlement handling",
        "status": "pass",
        "note": "운영 화면은 서버가 주입한 소유자·이용 상태가 맞을 때만 본문을 렌더링하고, 로컬 파일 검토만 예외로 허용합니다."
      },
      {
        "item": "image policy",
        "status": "pass",
        "note": "템플릿 IMAGE 폴더에는 실제 이미지가 없어 신규 인물 이미지를 만들지 않았고, 프로젝트 대표 이미지는 참조 상태로 기록했습니다."
      },
      {
        "item": "customer-facing internal term exposure",
        "status": "pass",
        "note": "고객 화면에는 내부 검색·생성 용어와 원천 경로를 노출하지 않습니다."
      }
    ],
    "notes": [
      "정밀 사주 계산값은 운영 서버에서 user_id, service_key, profile_id, report_id, report_version, entitlement 확인 후 주입되는 전제입니다.",
      "로컬 정적 시안에는 상세 데이터를 포함하지만 운영 배포에서는 상세 데이터 응답 자체가 권한 확인 뒤 내려가야 합니다.",
      "RAG 검색 결과 중 ZIP 자료는 unreviewed가 많아 운영 문장 확정 전 검수 대상입니다."
    ]
  }
};
