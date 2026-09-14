import { normalizeReferenceOrder, referenceOrderText } from "./referenceOrder.js";

const baseNegative = [
  "애니메이션",
  "웹툰",
  "만화",
  "일러스트",
  "그림체",
  "인형 같은 얼굴",
  "플라스틱 피부",
  "읽을 수 있는 글자",
  "자막",
  "로고",
  "워터마크",
  "얼굴 변형",
  "손 왜곡",
  "손가락 추가",
  "얼굴이 다른 사람으로 바뀜",
  "과한 피부 보정",
  "AI처럼 매끈한 피부",
  "과한 카메라 줌",
  "빠른 화면 전환",
  "공포 분위기",
  "선정적인 노출"
];

export function compilePrompt(manifest, scene) {
  const defaults = manifest.defaults || {};
  const duration = defaults.durationSeconds || 7;
  const aspectRatio = defaults.aspectRatio || "9:16";
  const ageRange = scene.ageRange || defaults.ageRange || "late 20s";
  const lighting = scene.lighting || inferLighting(scene.setting);
  const soundLine = defaults.sound === false ? "무음 영상." : `${scene.audio || "자연스러운 공간 소리와 작은 움직임 소리"}.`;
  const identityLine = manifest.identityReference
    ? "기준 얼굴 이미지와 같은 인물로 유지. 한국인 실제 사람의 얼굴형, 피부 결, 눈매, 코, 입, 턱선, 머리 분위기를 유지."
    : "인물이 실제 사람처럼 자연스럽고 장면 안에서 일관되게 보이게 함.";
  const viewLine = scene.view === "side"
    ? "요청한 옆모습을 쓰되, 얼굴 정보가 충분히 보이게 합니다."
    : "얼굴은 정면 또는 살짝 정면으로 보이게 하고, 완전한 옆모습은 피합니다.";
  const phoneLine = scene.phoneAllowed
    ? "핸드폰은 보조 소품으로만 쓰고, 장면 전체가 핸드폰 중심이 되지 않게 합니다."
    : "인물이 핸드폰만 바라보거나 핸드폰 중심 장면이 되지 않게 합니다.";
  const safetyLine = scene.safetyNotes?.length
    ? `안전 기준: ${scene.safetyNotes.join(", ")}. 노출 없이 단정한 광고용 생활 장면으로 만듭니다.`
    : "안전 기준: 필요한 경우 성인 인물로만 표현하고, 노출 없이 단정한 광고용 생활 장면으로 만듭니다.";
  const negative = [...baseNegative, ...(scene.negative || [])].join(", ");
  const references = referenceOrderText(normalizeReferenceOrder(manifest));

  return [
    `[의도]`,
    `제공된 이미지를 바탕으로 ${duration}초짜리 세로 ${aspectRatio} 실사 영상을 만듭니다. 광고용으로 자연스럽고 현실적인 한국 MZ 연령대의 생활 장면이어야 합니다.`,
    "",
    `[참고 순서]`,
    references,
    "위 순서를 지킵니다. 핀터레스트 이미지는 분위기와 구도의 1차 기준이고, 소스방은 실제로 만들 원천 자료입니다. 힉스필드 결과물은 마지막 완성도 기준으로만 참고합니다.",
    "",
    `[보존]`,
    identityLine,
    "인물의 나이대, 얼굴 비율, 머리 길이와 흐름, 옷의 소재감, 손가락 개수와 손 모양을 유지합니다.",
    "얼굴은 생성 중 바뀌지 않고 같은 사람으로 유지합니다. 피부는 실제 촬영처럼 모공과 미세한 결이 보이게 합니다.",
    "",
    `인물: ${labelSubject(scene.subject)}, ${labelAge(ageRange)}.`,
    `구도: ${labelView(scene.view)}. ${viewLine}`,
    `장소: ${scene.setting || "한국의 현실적인 생활 공간"}.`,
    `행동: ${scene.action || "카메라를 보며 작고 자연스럽게 움직입니다"}.`,
    "",
    `[움직임]`,
    `${scene.motion || "자연스러운 눈 깜빡임, 작은 호흡, 옷감과 빛의 부드러운 움직임"}. 움직임은 작고 절제합니다. 몸이 녹거나 얼굴이 변하는 과한 변형은 만들지 않습니다.`,
    "",
    `[카메라]`,
    `${scene.camera || "천천히 가까워지는 카메라, 자연스러운 손촬영 느낌"}. 한 컷으로 이어지는 영상이며 빠른 장면 전환은 없습니다.`,
    "",
    `[조명]`,
    `${lighting}. 빛은 실제 촬영처럼 얼굴과 배경에 자연스럽게 닿고, 피부가 플라스틱처럼 보이지 않게 합니다.`,
    "",
    `[소리]`,
    soundLine,
    "",
    `[제한]`,
    phoneLine,
    safetyLine,
    "- 실제 사람 비율과 자연스러운 피부 질감",
    "- 애니, 웹툰, 일러스트, 그림체 느낌 금지",
    "- 영상 안 글자, 자막, 로고, 워터마크 금지",
    "- 기준 인물과 얼굴이 달라지지 않게 유지",
    "- 손과 손가락은 자연스럽게 표현",
    "- 한 컷으로 이어지는 영상, 빠른 장면 전환이나 과한 변신 금지",
    "- 20대 실제 한국인처럼 보이는 자연스러운 얼굴과 표정",
    "",
    `[금지]`,
    `${negative}.`
  ].join("\n");
}

function inferLighting(setting = "") {
  if (/비|밤|야간|네온|도시/.test(setting)) return "비 오는 밤의 현실적인 반사광과 실내의 따뜻한 보조 조명";
  if (/아침|햇빛|창가|침실/.test(setting)) return "창문에서 들어오는 부드러운 자연광";
  if (/수영장|물빛/.test(setting)) return "물에 반사되는 부드러운 확산광";
  if (/촛불|어두운|딥|블랙/.test(setting)) return "낮은 조도와 촛불의 따뜻한 포인트 조명";
  return "현실적인 공간 조명과 얼굴이 선명하게 보이는 부드러운 주광";
}

function labelSubject(value) {
  if (value === "woman") return "여성";
  if (value === "man") return "남성";
  if (value === "couple") return "커플";
  if (value === "hands") return "손과 소품";
  if (value === "bridge") return "배경 컷";
  return "인물";
}

function labelView(value) {
  if (value === "front") return "정면";
  if (value === "three_quarter_front") return "살짝 정면";
  if (value === "side") return "옆모습";
  if (value === "over_shoulder") return "어깨 너머";
  if (value === "detail") return "부분 확대";
  return "정면";
}

function labelAge(value) {
  if (value === "late 20s") return "20대 후반";
  if (value === "early 30s") return "30대 초반";
  return value || "20대 후반";
}
