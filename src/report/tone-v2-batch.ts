export interface ToneOutlineItem { id: string; title: string }
export interface ToneGeneratedItem { id: string; title: string; body: string }
export interface ToneBatchInput {
  item: ToneOutlineItem
  previous: ToneGeneratedItem[]
}

/** Only supplied outline IDs are accepted. A failed item stops subsequent work. */
export async function generateToneOutline(
  outline: readonly ToneOutlineItem[],
  generate: (input: ToneBatchInput) => Promise<ToneGeneratedItem>,
  review: (item: ToneGeneratedItem, previous: readonly ToneGeneratedItem[]) => string[],
): Promise<ToneGeneratedItem[]> {
  if (!outline.length || new Set(outline.map(item => item.id)).size !== outline.length
      || outline.some(item => !item.id.trim() || !item.title.trim())) {
    throw new Error('A complete, uniquely identified source outline is required')
  }
  const completed: ToneGeneratedItem[] = []
  for (const item of outline) {
    const generated = await generate({ item: { ...item }, previous: structuredClone(completed) })
    if (generated.id !== item.id || generated.title !== item.title || !generated.body.trim()) {
      throw new Error(`Outline mismatch or empty result: ${item.id}`)
    }
    const issues = review(generated, structuredClone(completed))
    if (issues.length) throw new Error(`Review failed for ${item.id}: ${issues.join('; ')}`)
    completed.push({ ...generated })
  }
  return completed
}
