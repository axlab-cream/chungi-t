export const DEFAULT_REFERENCE_ORDER = [
  {
    priority: 1,
    key: "pinterest_images",
    label: "핀터레스트 참고 이미지",
    purpose: "원하는 실사 톤, 배경 밀도, 구도, 자연스러운 생활감"
  },
  {
    priority: 2,
    key: "source_room",
    label: "소스방",
    purpose: "만들고자 한 원천 소스, 기준 얼굴, 실제 대상 장면"
  },
  {
    priority: 3,
    key: "higgsfield_results",
    label: "힉스필드 결과물",
    purpose: "완성도 기준, 빛 움직임, 감정선, 영상 분위기"
  }
];

export function normalizeReferenceOrder(manifest) {
  const custom = Array.isArray(manifest.referenceOrder) ? manifest.referenceOrder : [];
  const order = custom.length ? custom : DEFAULT_REFERENCE_ORDER;
  return order
    .map((item, index) => ({
      priority: Number(item.priority || index + 1),
      key: item.key,
      label: item.label || item.key,
      purpose: item.purpose || ""
    }))
    .sort((a, b) => a.priority - b.priority);
}

export function referenceOrderText(order) {
  return order
    .map((item) => `${item.priority}차: ${item.label} - ${item.purpose}`)
    .join("\n");
}
