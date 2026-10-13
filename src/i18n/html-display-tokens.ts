/** Small quote-aware HTML display walker. Never changes executable or readonly content. */
const TOKENS = /<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>|<(?:(?:"[^"]*"|'[^']*')|[^'">])*?>|[^<]+|</gi
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])

export type DisplayAttribute = { name: string; value?: string; valueStart?: number; valueEnd?: number; start: number; end: number }
export function displayAttributes(tag: string): DisplayAttribute[] {
  const attributes: DisplayAttribute[] = []
  const pattern = /\s+([^\s"'<>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(tag))) {
    const raw = match[2]
    if (raw === undefined) { attributes.push({ name: match[1].toLowerCase(), start: match.index, end: pattern.lastIndex }); continue }
    const quoted = raw.startsWith('"') || raw.startsWith("'")
    const valueStart = match.index + match[0].lastIndexOf(raw) + (quoted ? 1 : 0)
    const valueEnd = valueStart + raw.length - (quoted ? 2 : 0)
    attributes.push({ name: match[1].toLowerCase(), value: tag.slice(valueStart, valueEnd), valueStart, valueEnd, start: match.index, end: pattern.lastIndex })
  }
  return attributes
}
export function replaceDisplayAttribute(tag: string, attribute: DisplayAttribute, value: string): string {
  if (attribute.valueStart === undefined || attribute.valueEnd === undefined) return tag.slice(0, attribute.start) + ' ' + attribute.name + '="' + value.replace(/"/g, '&quot;') + '"' + tag.slice(attribute.end)
  if (value === attribute.value) return tag
  const surrounding = tag[attribute.valueStart - 1]
  const quoted = surrounding === '"' || surrounding === "'"
  const quote = quoted ? surrounding : '"'
  const escaped = value.replace(quote === '"' ? /"/g : /'/g, quote === '"' ? '&quot;' : '&#39;')
  const serialized = quoted || !/[\s"'`=<>]/.test(value) ? escaped : '"' + escaped + '"'
  return tag.slice(0, attribute.valueStart) + serialized + tag.slice(attribute.valueEnd)
}

export type DisplayContext = { name: string; readonly: boolean; attributes: DisplayAttribute[] }
export function mapDisplayHtml(html: string, transform: (token: string, kind: 'tag' | 'text', context: readonly DisplayContext[]) => string, wholeToken?: RegExp): string {
  const stack: DisplayContext[] = []
  const tokens = wholeToken ? new RegExp(`${wholeToken.source}|${TOKENS.source}`, 'gi') : TOKENS
  return html.replace(tokens, (token: string) => {
    if (/^<!--|^<(?:script|style)\b/i.test(token)) return token
    const inherited = stack.some(item => item.readonly)
    if (!token.startsWith('<')) return inherited ? token : transform(token, 'text', stack)
    const closing = /^<\/\s*([a-z][\w:-]*)/i.exec(token)
    if (closing) {
      const name = closing[1].toLowerCase()
      const index = stack.map(item => item.name).lastIndexOf(name)
      if (index >= 0) stack.splice(index)
      return inherited ? token : transform(token, 'tag', stack)
    }
    const opening = /^<([a-z][\w:-]*)\b/i.exec(token)
    if (!opening) return token
    const name = opening[1].toLowerCase()
    const header = /^<(?:(?:"[^"]*"|'[^']*')|[^'">])*?>/.exec(token)?.[0] || token
    const attributes = displayAttributes(header)
    const readonly = inherited || ['blockquote','textarea','template'].includes(name)
      || attributes.some(a => ['contenteditable','data-raw-quote','data-customer-quote','data-report-body'].includes(a.name))
    const wholeElement = new RegExp(`</${name}\\s*>$`, 'i').test(token)
    if (!VOID.has(name) && !/\/\s*>$/.test(token) && !wholeElement) stack.push({ name, readonly, attributes })
    return readonly ? token : transform(token, 'tag', stack)
  })
}
