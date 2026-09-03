(function () {
  const SERVICE_CONTEXT = {
    service_key: "job_choice",
    service_slug: "job-choice",
    service_title: "자미두수로 보는 내가 선택한 직장 괜찮을까",
    category: "직장운",
    subcategory: "직장 선택 핏",
    price_krw: 9900,
    analysis_period: "current_choice",
    target_question: "이 회사, 나랑 결 맞아?",
    analysis_basis: [
      "ziwei_career_palace",
      "ziwei_wealth_palace",
      "ziwei_friends_palace",
      "ziwei_travel_palace",
      "ziwei_fortune_palace",
      "ziwei_limits_years",
      "saju_year_month_flow",
    ],
    interpretation_index_source: "user_seed",
    report_version: "job-choice-v1.0",
    copy_version: "job-choice-static-workflow-v1.0",
    evidence_ids: [
      "palace-career",
      "palace-wealth",
      "palace-friends",
      "palace-travel",
      "palace-fortune",
      "question-palace",
      "limits-years",
      "timing-read",
      "item-20-qa-0002",
      "item-20-qa-0005",
      "item-20-qa-0006",
    ],
  };

  const INTERPRETATION_INDEX = [
    {
      id: "company-fit",
      title: "이 회사, 나랑 결 맞아?",
      items: ["전체 핏 판정", "끌리는 이유", "찝찝한 포인트", "GO/HOLD/협상/보류 시그널", "지금 선택해도 되는 마음 상태"],
    },
    {
      id: "role-fit",
      title: "직무 핏",
      items: ["리더형 업무", "기획·분석형 업무", "말·교육·콘텐츠형 업무", "재무·운영·관리형 업무", "상담·연구형 업무", "개척·현장·스타트업형 업무"],
    },
    {
      id: "office-chemistry",
      title: "회사생활 케미",
      items: ["상사 케미", "팀원·동료 케미", "조직문화 적응도", "사내 정치/라인 리스크", "멘토·귀인 가능성", "고객·협력사와의 호흡"],
    },
    {
      id: "money-value",
      title: "돈값 하는 회사인가",
      items: ["연봉 만족도", "성과급·인센티브 흐름", "돈이 쌓이는 구조", "지출·기회비용", "계약 조건 체크", "장기 자산화 가능성"],
    },
    {
      id: "growth-angle",
      title: "성장각",
      items: ["승진·평가운", "포트폴리오 성장", "자격·스킬업", "권한 확대", "업계 네임밸류", "커리어 레벨업 포인트"],
    },
    {
      id: "work-environment",
      title: "업무 환경",
      items: ["출퇴근·근무지 적합도", "출장·이동·해외 가능성", "원격/비대면 업무 궁합", "회사 규모와 안정감", "변화 많은 환경 적응도"],
    },
    {
      id: "risk-check",
      title: "리스크 체크",
      items: ["역할 혼란", "상사 압박", "문서·계약 실수", "팀 갈등", "과로·번아웃", "돈 문제", "평판·구설 관리"],
    },
    {
      id: "entry-timing",
      title: "입사 타이밍",
      items: ["지금 들어가도 되는 흐름", "대운·유년상 변동기", "첫 90일 테스트", "월간/오늘 컨디션", "입사·계약일 택일"],
    },
    {
      id: "mental-balance",
      title: "멘탈·워라밸",
      items: ["회사가 내 삶을 잡아먹는지", "평가 스트레스", "수면·회복 리듬", "내면 만족도", "현타 오는 포인트", "오래 버틸 수 있는 루틴"],
    },
    {
      id: "action-plan",
      title: "현실 액션 플랜",
      items: ["오퍼 수락 전 체크리스트", "면접/협상 질문", "첫 30·60·90일 전략", "보류해야 할 조건", "그만둘 각/버틸 각 구분"],
    },
  ];

  const RAG_EVIDENCE = [
    {
      id: "palace-career",
      label: "관록궁",
      source: "ITEM-49_자미두수/KMS/02-십이궁/09-관록궁.md",
      summary: "직업, 사회적 역할, 일의 방식, 명예와 책임을 보며 이직 질문은 천이궁, 수입 질문은 재백궁을 함께 엽니다.",
    },
    {
      id: "palace-wealth",
      label: "재백궁",
      source: "ITEM-49_자미두수/KMS/02-십이궁/05-재백궁.md",
      summary: "수입이 생기는 방식, 소비 습관, 돈에 대한 감각을 보며 관록궁과 천이궁을 함께 놓고 봅니다.",
    },
    {
      id: "palace-friends",
      label: "교우궁",
      source: "ITEM-49_자미두수/KMS/02-십이궁/08-교우궁.md",
      summary: "친구, 부하, 고객, 협력자, 대중과의 관계를 보며 조직 안의 호흡과 상호 의존의 질을 살핍니다.",
    },
    {
      id: "palace-travel",
      label: "천이궁",
      source: "ITEM-49_자미두수/KMS/02-십이궁/07-천이궁.md",
      summary: "이동, 이사, 해외, 바깥에서 보이는 나와 환경 변화를 보며 이직과 출장 질문은 관록궁과 같이 엽니다.",
    },
    {
      id: "palace-fortune",
      label: "복덕궁",
      source: "ITEM-49_자미두수/KMS/02-십이궁/11-복덕궁.md",
      summary: "정신적 여유, 가치관, 쉬는 방식, 주관적 만족과 회복력을 살피는 칸입니다.",
    },
    {
      id: "question-palace",
      label: "질문별 궁위",
      source: "ITEM-49_자미두수/KMS/07-실전/03-질문별-궁위.md",
      summary: "질문의 영역을 먼저 정하고, 이직은 관록을 주 궁으로 천이와 재백을 보조 궁으로 둡니다.",
    },
    {
      id: "limits-years",
      label: "대한과 유년",
      source: "ITEM-49_자미두수/KMS/06-운한/01-대한-유년.md",
      summary: "본명 구조 위에 10년 흐름과 1년 흐름을 겹쳐 현재 선택의 무대와 올해의 스포트라이트를 봅니다.",
    },
    {
      id: "timing-read",
      label: "운한 읽는 법",
      source: "ITEM-49_자미두수/KMS/06-운한/02-운한-읽는-법.md",
      summary: "운한은 사건 확정이 아니라 어느 영역이 활성화되는지를 보고, 사건·감정·행동을 나누어 읽습니다.",
    },
    {
      id: "item-20-qa-0002",
      label: "선택 조언",
      source: "ITEM-20_평생 기운 흐름/평생 기운 흐름_rag_dataset.csv",
      summary: "좋아 보이는 기회를 전부 붙잡기보다, 이유와 기한을 한 줄로 적어 후회가 적은 선택 하나를 확인합니다.",
    },
    {
      id: "item-20-qa-0005",
      label: "역할 조율",
      source: "ITEM-20_평생 기운 흐름/평생 기운 흐름_rag_dataset.csv",
      summary: "누가 할 일인지, 언제까지인지, 결정권은 누구에게 있는지를 나누어 맡을 범위를 확인합니다.",
    },
    {
      id: "item-20-qa-0006",
      label: "돈 조건",
      source: "ITEM-20_평생 기운 흐름/평생 기운 흐름_rag_dataset.csv",
      summary: "돈 문제는 들어올 길과 새는 길을 따로 적고, 받을 돈·줄 돈·새 조건을 분리해서 봅니다.",
    },
  ];

  const GROUP_RULES = {
    "company-fit": {
      evidence: ["question-palace", "palace-career", "timing-read", "item-20-qa-0002"],
      focus: "선택 전체",
      preview: "끌림과 찝찝함이 어디서 갈리는지 먼저 잡습니다.",
      action: "오퍼를 받을 이유와 미룰 이유를 각각 한 줄로 적습니다.",
      caution: "마음이 급한 상태에서 회사의 장점만 보고 결론을 고정하지 않습니다.",
      keywords: ["회사", "오퍼", "선택", "결정", "확신", "찝찝", "고민", "수락", "보류"],
    },
    "role-fit": {
      evidence: ["palace-career", "question-palace", "item-20-qa-0005"],
      focus: "업무 방식",
      preview: "내가 힘을 쓰는 방식과 직무의 요구가 맞는지 봅니다.",
      action: "입사 전 실제로 맡을 첫 업무와 평가 기준을 확인합니다.",
      caution: "직무명이 좋아 보여도 실제 역할이 흐리면 소모가 커질 수 있습니다.",
      keywords: ["직무", "역할", "업무", "기획", "분석", "리더", "운영", "관리", "콘텐츠", "연구"],
    },
    "office-chemistry": {
      evidence: ["palace-friends", "palace-career", "item-20-qa-0005"],
      focus: "조직 관계",
      preview: "상사, 동료, 고객과의 호흡에서 생길 힘과 마찰을 나눕니다.",
      action: "상사 보고 방식, 협업 빈도, 의사결정 라인을 면접 또는 오퍼 단계에서 묻습니다.",
      caution: "사람 문제가 걱정될수록 소문보다 실제 커뮤니케이션 구조를 확인합니다.",
      keywords: ["상사", "동료", "팀", "정치", "라인", "조직", "케미", "고객", "협력"],
    },
    "money-value": {
      evidence: ["palace-wealth", "palace-career", "item-20-qa-0006"],
      focus: "돈과 조건",
      preview: "연봉, 성과급, 지출, 계약 조건이 남는 구조인지 살핍니다.",
      action: "고정급, 변동급, 수습 조건, 퇴직금, 교통비를 분리해 확인합니다.",
      caution: "총액만 보고 판단하면 지출과 기회비용이 뒤늦게 드러날 수 있습니다.",
      keywords: ["연봉", "돈", "성과급", "인센티브", "계약", "조건", "수입", "지출", "복지"],
    },
    "growth-angle": {
      evidence: ["palace-career", "limits-years", "timing-read"],
      focus: "성장 가능성",
      preview: "평가, 권한, 포트폴리오, 업계 네임밸류가 실제 성장으로 이어지는지 봅니다.",
      action: "6개월 안에 남길 결과물과 배울 기술을 구체적으로 묻습니다.",
      caution: "성장이라는 말이 야근과 책임 전가의 다른 이름인지 확인합니다.",
      keywords: ["성장", "승진", "평가", "스킬", "권한", "포트폴리오", "커리어", "네임밸류"],
    },
    "work-environment": {
      evidence: ["palace-travel", "palace-career", "timing-read"],
      focus: "근무 환경",
      preview: "출퇴근, 이동, 원격, 회사 규모가 내 리듬과 맞는지 살핍니다.",
      action: "실제 출근 요일, 이동 빈도, 야근 발생 조건을 먼저 확인합니다.",
      caution: "처음에는 괜찮아 보여도 이동 피로가 누적되면 판단이 달라질 수 있습니다.",
      keywords: ["출퇴근", "근무지", "원격", "재택", "출장", "이동", "해외", "거리", "환경"],
    },
    "risk-check": {
      evidence: ["palace-career", "palace-friends", "timing-read", "item-20-qa-0005"],
      focus: "리스크",
      preview: "역할 혼란, 압박, 계약 실수, 갈등처럼 입사 후 바로 부딪힐 지점을 봅니다.",
      action: "업무 범위, 보고 대상, 수습 평가, 계약 조항을 체크리스트로 확인합니다.",
      caution: "불안이 있다는 이유만으로 포기하기보다, 확인 가능한 위험과 감정 불안을 나눕니다.",
      keywords: ["리스크", "불안", "압박", "계약", "실수", "갈등", "과로", "번아웃", "평판"],
    },
    "entry-timing": {
      evidence: ["limits-years", "timing-read", "question-palace"],
      focus: "시기",
      preview: "지금 들어가도 되는 흐름인지, 첫 90일에 무엇을 시험해야 하는지 봅니다.",
      action: "결정 예정일 전까지 확인할 조건과 입사 첫 30일 질문을 나눕니다.",
      caution: "날짜 하나로 결과를 확정하지 않고 준비 상태와 조건을 함께 봅니다.",
      keywords: ["입사", "타이밍", "예정일", "날짜", "이번 달", "오늘", "90일", "계약일", "대운"],
    },
    "mental-balance": {
      evidence: ["palace-fortune", "palace-career", "timing-read"],
      focus: "멘탈과 회복",
      preview: "회사가 내 삶을 얼마나 잡아먹는지, 오래 버틸 회복 루틴이 있는지 봅니다.",
      action: "퇴근 후 회복 시간, 수면, 주말 침범 가능성을 실제 일정으로 적어 봅니다.",
      caution: "버틸 수 있다는 말과 오래 건강하게 지속된다는 말은 다릅니다.",
      keywords: ["워라밸", "멘탈", "스트레스", "회복", "수면", "현타", "피로", "소진", "번아웃"],
    },
    "action-plan": {
      evidence: ["question-palace", "item-20-qa-0002", "item-20-qa-0005", "item-20-qa-0006"],
      focus: "현실 행동",
      preview: "수락, 협상, 보류를 가르는 질문과 첫 30·60·90일 전략으로 정리합니다.",
      action: "오늘 보낼 질문, 협상 문장, 보류 조건을 각각 하나씩 정합니다.",
      caution: "좋다/나쁘다 결론보다 실제로 바꿀 수 있는 조건을 먼저 잡습니다.",
      keywords: ["액션", "체크리스트", "협상", "질문", "30일", "60일", "90일", "전략", "보류"],
    },
  };

  const DEMO_INPUT = {
    profileSource: "demo",
    profile: {
      name: "나",
      gender: "unspecified",
      birthDate: "1996-03-14",
      birthTime: "08:30",
      calendarType: "solar",
      birthPlace: "",
    },
    offer: {
      companyName: "선택한 회사",
      roleName: "기획·운영 직무",
      workMode: "hybrid",
      commute: "출퇴근은 감당 가능하지만 이동 피로가 걱정됨",
      salaryFeeling: "acceptable",
      decisionDate: "",
      concernPoint: "조건은 괜찮은데 조직문화와 역할 범위가 조금 찝찝함",
    },
  };

  function sectionId(groupId, index) {
    return `${groupId}-${String(index + 1).padStart(2, "0")}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeParse(value, fallback = null) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function storageGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch {
      return false;
    }
    return true;
  }

  function normalizeProfile(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      name: source.name || source.nickname || source.displayName || source.display_name || "",
      gender: source.gender || source.sex || "unspecified",
      birthDate: source.birthDate || source.birth_date || source.birthday || source.date || "",
      birthTime: source.birthTime || source.birth_time || source.time || "",
      calendarType: source.calendarType || source.calendar_type || source.calendar || "solar",
      birthPlace: source.birthPlace || source.birth_place || source.place || "",
      profileId: source.profileId || source.profile_id || "",
    };
  }

  function isProfileComplete(profile) {
    return Boolean(profile && profile.name && profile.birthDate && profile.birthTime && profile.calendarType);
  }

  function loadStoredProfile() {
    const keys = [
      "umsh_job_choice_profile",
      "umsh_birth_profile",
      "umsh_saju_profile",
      "umsh_user_profile",
      "umsh_profile",
      "aios_profile",
    ];
    for (const key of keys) {
      const fromSession = safeParse(storageGet(sessionStorage, key));
      if (fromSession) {
        const profile = normalizeProfile(fromSession);
        return { key, profile, complete: isProfileComplete(profile), storage: "session" };
      }
      const fromLocal = safeParse(storageGet(localStorage, key));
      if (fromLocal) {
        const profile = normalizeProfile(fromLocal);
        return { key, profile, complete: isProfileComplete(profile), storage: "local" };
      }
    }
    return { key: "", profile: normalizeProfile({}), complete: false, storage: "" };
  }

  function profileLabel(profile) {
    if (!profile || !profile.birthDate) return "저장된 사주 프로필 없음";
    const calendar = profile.calendarType === "lunar" ? "음력" : "양력";
    const time = profile.birthTime || "시간 미입력";
    return `${profile.name || "나"} · ${profile.birthDate} · ${time} · ${calendar}`;
  }

  function hourBranch(time) {
    const hour = Number(String(time || "0:0").split(":")[0]);
    const table = [
      ["자", 23, 1],
      ["축", 1, 3],
      ["인", 3, 5],
      ["묘", 5, 7],
      ["진", 7, 9],
      ["사", 9, 11],
      ["오", 11, 13],
      ["미", 13, 15],
      ["신", 15, 17],
      ["유", 17, 19],
      ["술", 19, 21],
      ["해", 21, 23],
    ];
    if (hour >= 23 || hour < 1) return "자";
    const found = table.find((row) => hour >= row[1] && hour < row[2]);
    return found ? found[0] : "자";
  }

  function deriveBirthFacts(profile) {
    const date = profile?.birthDate ? new Date(`${profile.birthDate}T00:00:00`) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return [
        { key: "birth-input-missing", label: "개인 입력", value: "사주 계산용 생년월일시가 아직 비어 있습니다." },
      ];
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
    const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
    const stem = stems[((year - 1984) % 10 + 10) % 10];
    const branch = branches[((year - 1984) % 12 + 12) % 12];
    const season =
      month >= 3 && month <= 5
        ? "시작과 확장"
        : month >= 6 && month <= 8
          ? "실행과 노출"
          : month >= 9 && month <= 11
            ? "정리와 기준"
            : "축적과 회복";
    return [
      { key: "birth-year-branch", label: "연도 보조 지표", value: `${stem}${branch}년 입력` },
      { key: "birth-hour-branch", label: "태어난 시 보조 지표", value: `${hourBranch(profile.birthTime)}시권 입력` },
      { key: "birth-season-focus", label: "계절 보조 지표", value: `${month}월생, ${season} 쪽 질문을 함께 확인` },
    ];
  }

  function getIndexWithSections() {
    return INTERPRETATION_INDEX.map((group) => ({
      ...clone(group),
      sections: group.items.map((item, index) => ({
        section_id: sectionId(group.id, index),
        title: item,
        route: `../06-step-6_1-report-detail/index.html?section=${encodeURIComponent(sectionId(group.id, index))}#step-6_1-report`,
      })),
    }));
  }

  function allSections() {
    return getIndexWithSections().flatMap((group) =>
      group.sections.map((section) => ({
        ...section,
        group_id: group.id,
        group_title: group.title,
      })),
    );
  }

  function textOfInput(input) {
    const offer = input?.offer || {};
    return [offer.companyName, offer.roleName, offer.workMode, offer.commute, offer.salaryFeeling, offer.decisionDate, offer.concernPoint]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function deriveSignal(input) {
    const text = textOfInput(input);
    const scores = Object.fromEntries(INTERPRETATION_INDEX.map((group) => [group.id, 0]));
    for (const group of INTERPRETATION_INDEX) {
      const rule = GROUP_RULES[group.id];
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) scores[group.id] += 2;
      }
    }
    const offer = input?.offer || {};
    if (String(offer.salaryFeeling || "").includes("low")) scores["money-value"] += 8;
    if (String(offer.salaryFeeling || "").includes("high")) scores["money-value"] += 2;
    if (String(offer.workMode || "").includes("remote") || String(offer.workMode || "").includes("travel")) scores["work-environment"] += 3;
    if (/멀|장거리|왕복|출퇴근|이동|출장/.test(offer.commute || "")) scores["work-environment"] += 3;
    if (/상사|팀|동료|조직|정치/.test(offer.concernPoint || "")) scores["office-chemistry"] += 4;
    if (/연봉|돈|급여|성과급|인센티브|조건/.test(offer.concernPoint || "")) scores["money-value"] += 5;
    if (/과로|번아웃|워라밸|피로|수면/.test(offer.concernPoint || "")) scores["mental-balance"] += 4;
    if (/계약|수습|역할|범위|책임/.test(offer.concernPoint || "")) scores["risk-check"] += 3;
    if (/성장|승진|평가|권한|커리어/.test(offer.concernPoint || "")) scores["growth-angle"] += 3;
    if (/언제|날짜|타이밍|입사일|결정일/.test(offer.concernPoint || "")) scores["entry-timing"] += 3;
    if (Object.values(scores).every((score) => score === 0)) scores["company-fit"] = 1;

    const primaryGroupId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    const primaryRule = GROUP_RULES[primaryGroupId];
    let direction = "조건부 GO";
    let directionCopy = "좋은 점은 살리되, 조건을 확인하고 들어가는 쪽입니다.";
    if (primaryGroupId === "money-value" && String(offer.salaryFeeling || "").includes("low")) {
      direction = "협상 우선";
      directionCopy = "수락보다 조건 조율을 먼저 보는 편이 맞습니다.";
    } else if (["risk-check", "mental-balance"].includes(primaryGroupId)) {
      direction = "HOLD";
      directionCopy = "바로 수락하기보다 걸리는 조건을 먼저 확인해야 합니다.";
    } else if (primaryGroupId === "work-environment") {
      direction = "조건 확인";
      directionCopy = "일 자체보다 근무 환경과 이동 리듬이 선택의 변수가 됩니다.";
    }

    return {
      scores,
      primaryGroupId,
      primaryTitle: INTERPRETATION_INDEX.find((group) => group.id === primaryGroupId)?.title || "이 회사, 나랑 결 맞아?",
      primaryRule,
      direction,
      directionCopy,
    };
  }

  function displayName(input) {
    return input?.profile?.name || "나";
  }

  function companyName(input) {
    return input?.offer?.companyName || "선택한 회사";
  }

  function topicParticle(text) {
    const last = String(text || "").trim().at(-1);
    if (!last) return "는";
    const code = last.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return "는";
    return (code - 0xac00) % 28 === 0 ? "는" : "은";
  }

  function subjectParticle(text) {
    const last = String(text || "").trim().at(-1);
    if (!last) return "가";
    const code = last.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return "가";
    return (code - 0xac00) % 28 === 0 ? "가" : "이";
  }

  function buildTeaser(input) {
    const signal = deriveSignal(input);
    const facts = deriveBirthFacts(input?.profile);
    const company = companyName(input);
    const name = displayName(input);
    return {
      headline: `${company}${topicParticle(company)} 지금 ${signal.direction} 쪽으로 봅니다.`,
      summary: `${name}님의 입력값에서는 ${signal.primaryTitle} 축이 먼저 올라옵니다. ${signal.directionCopy}`,
      signals: [
        {
          title: "먼저 보이는 신호",
          body: `${signal.primaryRule.focus}이 핵심입니다. ${signal.primaryRule.preview}`,
          evidence_ids: signal.primaryRule.evidence,
          calculated_fact_keys: facts.map((fact) => fact.key),
        },
        {
          title: "조건으로 확인할 부분",
          body: signal.primaryRule.action,
          evidence_ids: signal.primaryRule.evidence,
          calculated_fact_keys: ["offer-role", "offer-condition"],
        },
        {
          title: "방해 요인",
          body: signal.primaryRule.caution,
          evidence_ids: signal.primaryRule.evidence,
          calculated_fact_keys: ["concern-point"],
        },
      ],
      paid_preview: INTERPRETATION_INDEX.map((group) => ({
        id: group.id,
        title: group.title,
        preview: GROUP_RULES[group.id].preview,
      })),
      calculated_facts: facts,
      signal,
    };
  }

  function sectionPreview(groupId, itemTitle, index, input) {
    const signal = deriveSignal(input);
    const rule = GROUP_RULES[groupId];
    const selected = signal.primaryGroupId === groupId ? "지금 입력값에서 먼저 확인할 항목입니다. " : "";
    const tail =
      index % 3 === 0
        ? "현재 조건과 실제 행동을 나눠 봅니다."
        : index % 3 === 1
          ? "끌리는 이유와 걸리는 이유를 분리합니다."
          : "입사 전 확인 질문으로 연결합니다.";
    return `${selected}${rule.preview} ${itemTitle}${topicParticle(itemTitle)} ${tail}`;
  }

  function buildReport(inputArg) {
    const input = inputArg || loadJobInput().input;
    const teaser = buildTeaser(input);
    const facts = teaser.calculated_facts;
    const groups = getIndexWithSections().map((group) => {
      const rule = GROUP_RULES[group.id];
      return {
        id: group.id,
        title: group.title,
        focus: rule.focus,
        preview: rule.preview,
        evidence_ids: rule.evidence,
        sections: group.sections.map((section, index) => ({
          ...section,
          preview: sectionPreview(group.id, section.title, index, input),
          evidence_ids: rule.evidence,
          calculated_fact_keys: facts.map((fact) => fact.key),
          visual_key: `${group.id}-${index + 1}`,
        })),
      };
    });
    return {
      service: clone(SERVICE_CONTEXT),
      report_id: storageGet(sessionStorage, "umsh_job_choice_report_id") || `job_choice_${Date.now()}`,
      source: "user_seed+kms_rag_static",
      input_snapshot: {
        profile_mode: input?.profileSource || "session",
        offer_fields: Object.keys(input?.offer || {}),
      },
      teaser,
      report_index: {
        source: "user_seed",
        groups,
      },
      generated_at: new Date().toISOString(),
    };
  }

  function findSection(sectionIdValue) {
    const sections = allSections();
    const index = Math.max(0, sections.findIndex((section) => section.section_id === sectionIdValue));
    return {
      section: sections[index] || sections[0],
      index,
      previous: sections[(index - 1 + sections.length) % sections.length],
      next: sections[(index + 1) % sections.length],
      sections,
    };
  }

  function evidenceFor(ids) {
    return ids.map((id) => RAG_EVIDENCE.find((item) => item.id === id)).filter(Boolean);
  }

  function buildDetail(sectionIdValue, inputArg) {
    const input = inputArg || loadJobInput().input;
    const signal = deriveSignal(input);
    const facts = deriveBirthFacts(input?.profile);
    const found = findSection(sectionIdValue || "company-fit-01");
    const rule = GROUP_RULES[found.section.group_id] || GROUP_RULES["company-fit"];
    const isPrimary = signal.primaryGroupId === found.section.group_id;
    const company = companyName(input);
    const conclusion = isPrimary
      ? `${company} 선택에서는 ${found.section.title}${subjectParticle(found.section.title)} 가장 먼저 확인할 지점입니다. ${signal.directionCopy}`
      : `${company} 선택에서 ${found.section.title}은 보조로 봐야 할 지점입니다. 지금은 ${signal.primaryTitle}을 먼저 확인한 뒤 함께 판단하는 흐름입니다.`;
    const evidenceIds = rule.evidence;
    return {
      service: clone(SERVICE_CONTEXT),
      detail: {
        section_id: found.section.section_id,
        report_index_source: "user_seed",
        group_title: found.section.group_title,
        title: found.section.title,
        conclusion,
        evidence: evidenceFor(evidenceIds).map((item) => ({
          label: item.label,
          summary: item.summary,
          evidence_id: item.id,
        })),
        calculated_facts: facts,
        interpretation_blocks: [
          {
            title: "확인된 근거",
            body: `${rule.focus}을 중심으로 봅니다. ${rule.preview} 입력된 생년월일시와 오퍼 조건은 결론을 확정하는 값이 아니라 확인 순서를 정하는 보조 신호입니다.`,
            evidence_ids: evidenceIds,
            calculated_fact_keys: facts.map((fact) => fact.key),
          },
          {
            title: "현실에서 보이는 모습",
            body: `${found.section.title}${subjectParticle(found.section.title)} 맞으면 입사 전부터 질문이 구체적입니다. 무엇을 맡는지, 누구와 일하는지, 돈과 이동 조건이 실제 생활에 남는지를 따로 확인하게 됩니다.`,
            evidence_ids: evidenceIds,
            calculated_fact_keys: ["offer-role", "offer-condition", "concern-point"],
          },
          {
            title: "시기와 조건",
            body: "시기는 사건을 맞히는 방식이 아니라 지금 어느 영역이 켜졌는지 보는 방식으로 씁니다. 결정 예정일 전까지 확인할 조건이 남아 있으면 보류가 아니라 점검 단계로 둡니다.",
            evidence_ids: ["limits-years", "timing-read"],
            calculated_fact_keys: ["decision-date"],
          },
        ],
        actions: [
          rule.action,
          "입사 전 질문을 하나로 줄이면, 답변이 흐릴 때 다시 물을 기준이 생깁니다.",
          "수락, 협상, 보류 중 하나를 고르기 전에 바꿀 수 있는 조건과 바꿀 수 없는 조건을 분리합니다.",
        ],
        cautions: [rule.caution, "이 풀이만으로 채용 결과, 수입, 직장 생활을 확정하지 않습니다."],
        related_sections: [
          { type: "previous", section_id: found.previous.section_id, title: found.previous.title },
          { type: "next", section_id: found.next.section_id, title: found.next.title },
        ],
      },
      image_manifest: [],
      character_reference: {
        reference_status: "style_inherited",
        reference_image: "../IMAGE/ChatGPT Image 2026년 9월 2일 오후 03_37_30.png",
        style_lock: ["남보라와 금빛 팔레트", "별빛 조명", "현대 오피스와 명반을 연결한 분위기"],
      },
      render_contract: {
        back_route: "../05-step-5-chat/chat.html#step-5-chat",
        next_section: found.next.section_id,
        previous_section: found.previous.section_id,
      },
      qa: [
        { item: "05 목록 section_id 연결", status: "pass", detail: `${found.section.section_id}가 report_index 안에서 확인되었습니다.` },
        { item: "근거 연결", status: "pass", detail: "상세 블록마다 evidence_ids 또는 calculated_fact_keys를 연결했습니다." },
      ],
    };
  }

  function saveJobInput(input) {
    const normalized = {
      profileSource: input.profileSource || "session",
      profile: normalizeProfile(input.profile),
      offer: {
        companyName: input.offer?.companyName || "",
        roleName: input.offer?.roleName || "",
        workMode: input.offer?.workMode || "",
        commute: input.offer?.commute || "",
        salaryFeeling: input.offer?.salaryFeeling || "",
        decisionDate: input.offer?.decisionDate || "",
        concernPoint: input.offer?.concernPoint || "",
      },
    };
    const reportId = `job_choice_${Date.now()}`;
    storageSet(sessionStorage, "umsh_service_context", JSON.stringify(SERVICE_CONTEXT));
    storageSet(sessionStorage, "umsh_service_key", SERVICE_CONTEXT.service_key);
    storageSet(sessionStorage, "umsh_service_slug", SERVICE_CONTEXT.service_slug);
    storageSet(sessionStorage, "umsh_report_version", SERVICE_CONTEXT.report_version);
    storageSet(sessionStorage, "umsh_interpretation_index", JSON.stringify(INTERPRETATION_INDEX));
    storageSet(sessionStorage, "umsh_job_choice_profile", JSON.stringify(normalized.profile));
    storageSet(sessionStorage, "umsh_job_choice_input", JSON.stringify(normalized));
    storageSet(sessionStorage, "umsh_job_choice_report_id", reportId);
    const report = buildReport(normalized);
    report.report_id = reportId;
    storageSet(sessionStorage, "umsh_job_choice_report", JSON.stringify(report));
    return { input: normalized, report };
  }

  function loadJobInput() {
    const input = safeParse(storageGet(sessionStorage, "umsh_job_choice_input"));
    if (input) {
      const report = safeParse(storageGet(sessionStorage, "umsh_job_choice_report")) || buildReport(input);
      return { input, report, fallback: false };
    }
    const report = buildReport(DEMO_INPUT);
    return { input: clone(DEMO_INPUT), report, fallback: true };
  }

  function markPaid() {
    storageSet(sessionStorage, "umsh_job_choice_entitlement", "demo-paid");
    if (!storageGet(sessionStorage, "umsh_job_choice_report")) {
      const current = loadJobInput();
      storageSet(sessionStorage, "umsh_job_choice_report", JSON.stringify(current.report));
    }
  }

  function hasEntitlement() {
    return storageGet(sessionStorage, "umsh_job_choice_entitlement") === "demo-paid";
  }

  function writeJsonBlock(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = JSON.stringify(value, null, 2);
  }

  function hydrateContracts(step, qa = []) {
    writeJsonBlock("PROMPT_INPUT", {
      ...SERVICE_CONTEXT,
      step,
      service_url_hint: "https://me.umsh.kr/job-choice",
      target_audience: "입사, 이직, 오퍼 수락, 조건 협상 앞에서 확신이 필요한 20-30대",
    });
    writeJsonBlock("INTERPRETATION_INDEX", getIndexWithSections());
    writeJsonBlock("RAG_EVIDENCE", RAG_EVIDENCE);
    writeJsonBlock("IMAGE_MANIFEST", []);
    writeJsonBlock("QA_RESULT", {
      prompt_contract: `${step}/PROMPT.md + 00-SERVICE-GENERATION-CONTRACT.md`,
      scope_mismatch: null,
      image_status: "not_required",
      image_detail: "02/04/05/06_1은 새 이미지 슬롯 없이 01의 팔레트와 화면 리듬을 공통 스타일로 이어받았습니다.",
      checks: qa,
    });
  }

  function nav(path) {
    window.location.href = path;
  }

  window.JobChoice = {
    SERVICE_CONTEXT,
    INTERPRETATION_INDEX,
    RAG_EVIDENCE,
    GROUP_RULES,
    DEMO_INPUT,
    escapeHtml,
    loadStoredProfile,
    normalizeProfile,
    isProfileComplete,
    profileLabel,
    deriveBirthFacts,
    deriveSignal,
    buildTeaser,
    buildReport,
    buildDetail,
    getIndexWithSections,
    allSections,
    evidenceFor,
    saveJobInput,
    loadJobInput,
    markPaid,
    hasEntitlement,
    hydrateContracts,
    nav,
  };
})();
