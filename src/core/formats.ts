/**
 * Format parsers and serializers for LYS, QRC, and TTML.
 * All formats are converted to/from a common internal structure (LyricLine[]).
 */

import type { Token } from '../types'

// --- Common internal structure ---

export type LyricLine = {
  /** 0-8 property for LYS; derived from agent/bg for TTML/QRC */
  property: number
  tokens: Token[]
  /** Translation text if present (from TTML x-translation) */
  translation?: string
  /** Whether this line is background vocal */
  isBackground: boolean
}

export type ParsedLyrics = {
  format: 'lys' | 'qrc' | 'ttml'
  lines: LyricLine[]
  /** Translation lines extracted from TTML */
  translations?: string[]
  /** Metadata extracted from TTML <amll:meta> */
  metadata?: Record<string, string>
  /** Raw original TTML header content for passthrough */
  ttmlRawHead?: string
  /** Raw original <tt> opening tag attributes */
  ttmlRootAttrs?: string
  /** Raw body dur attribute */
  ttmlBodyDur?: string
  /** Raw div begin/end */
  ttmlDivBegin?: string
  ttmlDivEnd?: string
}

// --- Format detection ---

export function detectFormat(content: string): 'lys' | 'qrc' | 'ttml' | 'unknown' {
  const trimmed = content.trim()
  if (trimmed.startsWith('<') || trimmed.startsWith('<?xml')) return 'ttml'
  // QRC: line starts with [number,number]
  if (/^\[\d+,\d+\]/.test(trimmed)) return 'qrc'
  // LYS: line starts with [single digit]
  if (/^\[\d\]/.test(trimmed)) return 'lys'
  return 'unknown'
}

// --- Time utilities ---

/** Parse "m:ss.ms", "mm:ss.ms", "mm:ss:ms", or bare seconds "ss.ms" to milliseconds */
function ttmlTimeToMs(time: string): number {
  if (!time || time === '0') return 0
  // Match m:ss.ms or mm:ss.ms or m:ss:ms
  const match = time.match(/^(\d+):(\d+)[.:](\d+)$/)
  if (match) {
    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10)
    return minutes * 60000 + seconds * 1000 + ms
  }
  // Match bare seconds: ss.ms
  const secMatch = time.match(/^(\d+)[.](\d+)$/)
  if (secMatch) {
    const seconds = parseInt(secMatch[1], 10)
    const ms = parseInt(secMatch[2].padEnd(3, '0').slice(0, 3), 10)
    return seconds * 1000 + ms
  }
  return 0
}

/** Convert milliseconds to TTML time format matching input style (m:ss.ms for >= 1min) */
function msToTtmlTime(ms: number): string {
  if (ms < 0) ms = 0
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
  }
  return `${seconds}.${String(millis).padStart(3, '0')}`
}

/** Convert milliseconds to LRC timestamp "[mm:ss.ms]" */
function msToLrcTime(ms: number): string {
  return `[${msToTtmlTime(ms)}]`
}

// --- LYS Parser ---

export function parseLys(content: string): ParsedLyrics {
  const lines: LyricLine[] = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\[(\d)\](.*)$/)
    if (!match) continue
    const property = parseInt(match[1], 10)
    const tokens = parseLysTokens(match[2])
    if (!tokens.length) continue
    const isBackground = property === 6 || property === 7 || property === 8
    lines.push({ property, tokens, isBackground })
  }
  return { format: 'lys', lines }
}

function parseLysTokens(content: string): Token[] {
  const parts = content.split(/(\(\d+,\d+\))/g)
  const tokens: Token[] = []
  for (let i = 0; i < parts.length - 1; i += 2) {
    const match = parts[i + 1].match(/\d+/g)
    if (!match || match.length < 2) continue
    tokens.push({ text: parts[i], start: Number(match[0]), duration: Number(match[1]) })
  }
  return tokens
}

// --- QRC Parser ---

export function parseQrc(content: string): ParsedLyrics {
  const lines: LyricLine[] = []
  for (const line of content.split(/\r?\n/)) {
    const lineMatch = line.match(/^\[(\d+),(\d+)\](.*)$/)
    if (!lineMatch) continue
    const tokens = parseLysTokens(lineMatch[3])
    if (!tokens.length) continue
    const text = tokens.map((t) => t.text).join('')
    const isBackground = /^\s*[(\uff08]/.test(text) && /[)\uff09]\s*$/.test(text)
    lines.push({ property: 0, tokens, isBackground })
  }
  // Assign properties based on background detection
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].isBackground) {
      lines[i].property = 6
    }
  }
  return { format: 'qrc', lines }
}

// --- TTML Parser ---

export function parseTtml(content: string): ParsedLyrics {
  // Extract raw structural info for passthrough before cleaning
  const ttOpenMatch = content.match(/<tt\s([^>]*)>/)
  const ttmlRootAttrs = ttOpenMatch ? ttOpenMatch[1] : ''
  const headMatch = content.match(/<head>([\s\S]*?)<\/head>/)
  const ttmlRawHead = headMatch ? headMatch[1] : ''
  const bodyDurMatch = content.match(/<body\s[^>]*dur="([^"]*)"/)
  const ttmlBodyDur = bodyDurMatch ? bodyDurMatch[1] : ''
  const divMatch = content.match(/<div[^>]*begin="([^"]*)"[^>]*end="([^"]*)"/)
  const ttmlDivBegin = divMatch ? divMatch[1] : ''
  const ttmlDivEnd = divMatch ? divMatch[2] : ''

  const parser = new DOMParser()
  // Remove default namespace to simplify querying
  const cleaned = content.replace(/xmlns="[^"]*"/g, '')
  const doc = parser.parseFromString(cleaned, 'text/xml')

  // Extract metadata from <amll:meta>
  const metadata: Record<string, string> = {}
  const metaEls = doc.querySelectorAll('[key]')
  metaEls.forEach((el) => {
    const key = el.getAttribute('key')
    const value = el.getAttribute('value')
    if (key && value && el.tagName?.includes('meta')) {
      // Only take first value for each key
      if (!metadata[key]) metadata[key] = value
    }
  })
  // Also try to extract ttmlAuthorGithubLogin for [by:]
  const authorLogin = doc.querySelector('[key="ttmlAuthorGithubLogin"]')
  if (authorLogin?.getAttribute('value')) {
    metadata['ttmlAuthorGithubLogin'] = authorLogin.getAttribute('value')!
  }

  // Detect agents
  const agents = doc.querySelectorAll('[type="person"],[type="other"]')
  const agentIds: string[] = []
  agents.forEach((agent) => {
    const id = agent.getAttribute('xml:id') || agent.getAttribute('id')
    if (id) agentIds.push(id)
  })

  const hasMultipleAgents = agentIds.length > 1
  const lines: LyricLine[] = []
  const translations: string[] = []

  // Also handle top-level x-bg spans (not inside <p>)
  const divEl = doc.querySelector('div') || doc.querySelector('body')
  if (!divEl) return { format: 'ttml', lines }

  const topChildren = divEl.childNodes
  for (let ci = 0; ci < topChildren.length; ci++) {
    const node = topChildren[ci]
    if (node.nodeType !== 1) continue
    const el = node as Element
    const tagName = el.tagName?.toLowerCase()

    if (tagName === 'span' && el.getAttribute('ttm:role') === 'x-bg') {
      // Top-level background span
      const bgResult = parseTtmlSpanChildren(el)
      if (bgResult.tokens.length) {
        lines.push({ property: 6, tokens: bgResult.tokens, isBackground: true, translation: bgResult.translation })
        translations.push('')
      }
      continue
    }

    if (tagName !== 'p') continue

    const p = el
    const agent = p.getAttribute('ttm:agent') || ''
    const mainTokens: Token[] = []
    const bgTokens: Token[] = []
    let translation = ''
    let bgTranslation = ''

    // Walk all child nodes of <p> including text nodes
    const pChildren = p.childNodes
    for (let i = 0; i < pChildren.length; i++) {
      const child = pChildren[i]

      // Text node (space between spans)
      if (child.nodeType === 3) {
        const text = child.textContent || ''
        if (/^\s+$/.test(text)) {
          // Space-only text node: preserve as independent token with 0,0 timing
          mainTokens.push({ text, start: 0, duration: 0 })
        }
        continue
      }

      if (child.nodeType !== 1) continue
      const span = child as Element
      const role = span.getAttribute('ttm:role') || ''

      if (role === 'x-translation') {
        translation = span.textContent || ''
        continue
      }
      if (role === 'x-roman') continue

      if (role === 'x-bg') {
        // Background vocal: parse inner spans - keep inside same <p> context
        const bgResult = parseTtmlSpanChildren(span)
        bgTokens.push(...bgResult.tokens)
        if (bgResult.translation) {
          bgTranslation = bgResult.translation
        }
        continue
      }

      // Regular span
      const begin = ttmlTimeToMs(span.getAttribute('begin') || '0')
      const end = ttmlTimeToMs(span.getAttribute('end') || '0')
      const text = span.textContent || ''
      mainTokens.push({ text, start: begin, duration: end - begin })
    }

    // Determine property
    let property = 0
    const isV1 = agent === agentIds[0] || agent === 'v1'
    const isV2 = agent === agentIds[1] || agent === 'v2'

    if (hasMultipleAgents) {
      property = isV1 ? 4 : isV2 ? 5 : 4
    }

    if (mainTokens.length) {
      lines.push({ property, tokens: mainTokens, isBackground: false, translation: translation || undefined })
      translations.push(translation)
    }

    if (bgTokens.length) {
      const bgProperty = hasMultipleAgents ? (isV1 ? 7 : 8) : 6
      lines.push({ property: bgProperty, tokens: bgTokens, isBackground: true, translation: bgTranslation || undefined })
      translations.push('')
    }
  }

  const hasTranslations = translations.some((t) => t.length > 0)
  return {
    format: 'ttml',
    lines,
    translations: hasTranslations ? translations : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    ttmlRawHead,
    ttmlRootAttrs,
    ttmlBodyDur,
    ttmlDivBegin,
    ttmlDivEnd,
  }
}

/** Parse child spans inside a bg span or similar container */
function parseTtmlSpanChildren(container: Element): { tokens: Token[]; translation?: string } {
  const tokens: Token[] = []
  let translation = ''
  const children = container.childNodes
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.nodeType === 3) {
      const text = child.textContent || ''
      if (/^\s+$/.test(text)) {
        tokens.push({ text, start: 0, duration: 0 })
      }
      continue
    }
    if (child.nodeType !== 1) continue
    const span = child as Element
    const role = span.getAttribute('ttm:role') || ''
    if (role === 'x-translation') {
      translation = span.textContent || ''
      continue
    }
    if (role === 'x-roman') continue
    if (span.tagName?.toLowerCase() !== 'span') continue
    const begin = ttmlTimeToMs(span.getAttribute('begin') || '0')
    const end = ttmlTimeToMs(span.getAttribute('end') || '0')
    tokens.push({ text: span.textContent || '', start: begin, duration: end - begin })
  }
  return { tokens, translation: translation || undefined }
}

/** No-op: spaces are now preserved as independent tokens */
function normalizeSpaces(_tokens: Token[], _p: Element): void {}

// --- LYS Serializer ---

/** Generate metadata header lines for LYS/QRC from parsed metadata */
function metadataHeader(metadata?: Record<string, string>): string {
  if (!metadata) return ''
  const lines: string[] = []
  if (metadata.musicName) lines.push(`[ti:${metadata.musicName}]`)
  if (metadata.artists) lines.push(`[ar:${metadata.artists}]`)
  if (metadata.album) lines.push(`[al:${metadata.album}]`)
  if (metadata.ttmlAuthorGithubLogin) lines.push(`[by:${metadata.ttmlAuthorGithubLogin}]`)
  return lines.length ? lines.join('\n') + '\n' : ''
}

/** Merge space-only tokens into previous token's text (for LYS/QRC output) */
function mergeSpaceTokens(tokens: Token[]): Token[] {
  const result: Token[] = []
  for (const token of tokens) {
    if (token.start === 0 && token.duration === 0 && /^\s+$/.test(token.text)) {
      // Attach space to previous token
      if (result.length > 0) {
        result[result.length - 1] = { ...result[result.length - 1], text: result[result.length - 1].text + token.text }
      }
    } else {
      result.push(token)
    }
  }
  return result
}

export function serializeToLys(lines: LyricLine[], metadata?: Record<string, string>): string {
  const header = metadataHeader(metadata)
  const body = lines.map((line) => {
    const tokens = mergeSpaceTokens(line.tokens)
    const tokenStr = tokens.map((t) => `${t.text}(${t.start},${t.duration})`).join('')
    return `[${line.property}]${tokenStr}`
  }).join('\n')
  return header + body
}

/** Serialize to LYS format but keep space tokens intact (for internal refine pipeline) */
export function serializeToLysRaw(lines: LyricLine[]): string {
  return lines.map((line) => {
    const tokenStr = line.tokens.map((t) => `${t.text}(${t.start},${t.duration})`).join('')
    return `[${line.property}]${tokenStr}`
  }).join('\n')
}

// --- QRC Serializer ---

export function serializeToQrc(lines: LyricLine[], metadata?: Record<string, string>): string {
  const header = metadataHeader(metadata)
  const body = lines.map((line) => {
    const tokens = mergeSpaceTokens(line.tokens)
    const firstStart = tokens[0]?.start ?? 0
    const lastToken = tokens[tokens.length - 1]
    const lineDuration = lastToken ? (lastToken.start + lastToken.duration - firstStart) : 0
    const tokenStr = tokens.map((t) => `${t.text}(${t.start},${t.duration})`).join('')
    return `[${firstStart},${lineDuration}]${tokenStr}`
  }).join('\n')
  return header + body
}

// --- TTML Serializer ---

export function serializeToTtml(lines: LyricLine[], translations?: string[], parsed?: ParsedLyrics): string {
  // Use passthrough metadata if available
  const rootAttrs = parsed?.ttmlRootAttrs || 'xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:amll="http://www.example.com/ns/amll" xmlns:itunes="http://music.apple.com/lyric-ttml-internal"'
  const rawHead = parsed?.ttmlRawHead || ''
  const bodyDur = parsed?.ttmlBodyDur || ''
  const divBegin = parsed?.ttmlDivBegin || ''
  const divEnd = parsed?.ttmlDivEnd || ''

  let xml = `<tt ${rootAttrs}>`

  if (rawHead) {
    xml += `<head>${rawHead}</head>`
  } else {
    const hasMultipleAgents = lines.some((l) => l.property === 5 || l.property === 8)
    xml += `<head><metadata>`
    xml += `<ttm:agent type="person" xml:id="v1"/>`
    if (hasMultipleAgents) xml += `<ttm:agent type="other" xml:id="v2"/>`
    xml += `</metadata></head>`
  }

  const timedAll = lines.flatMap((l) => l.tokens.filter((t) => t.start !== 0 || t.duration !== 0))
  const computedBodyDur = bodyDur || msToTtmlTime(timedAll.length ? Math.max(...timedAll.map((t) => t.start + t.duration)) : 0)
  const computedDivBegin = divBegin || msToTtmlTime(timedAll.length ? Math.min(...timedAll.map((t) => t.start)) : 0)
  const computedDivEnd = divEnd || computedBodyDur

  xml += `<body dur="${computedBodyDur}"><div begin="${computedDivBegin}" end="${computedDivEnd}">`

  let lineIndex = 0
  let mainLineCount = 0
  while (lineIndex < lines.length) {
    const line = lines[lineIndex]

    const agent = (line.property === 5 || line.property === 8) ? 'v2' : 'v1'
    const timedTokens = line.tokens.filter((t) => t.start !== 0 || t.duration !== 0)
    const pBegin = timedTokens[0]?.start ?? 0
    const pLastToken = timedTokens[timedTokens.length - 1]
    const pEnd = pLastToken ? pLastToken.start + pLastToken.duration : 0

    if (line.isBackground) {
      // Check if previous line was a non-bg line (inline bg)
      const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : null
      const isInlineBg = prevLine && !prevLine.isBackground

      if (isInlineBg) {
        // Already rendered as part of previous <p> - skip standalone rendering
        // We handle this below when rendering non-bg lines
      } else {
        // Top-level background span (no preceding <p>)
        mainLineCount++
        xml += `<span ttm:role="x-bg" begin="${msToTtmlTime(pBegin)}" end="${msToTtmlTime(pEnd)}">`
        for (const token of line.tokens) {
          if (token.start === 0 && token.duration === 0 && /^\s+$/.test(token.text)) {
            xml += token.text
          } else {
            xml += `<span begin="${msToTtmlTime(token.start)}" end="${msToTtmlTime(token.start + token.duration)}">${escapeXml(token.text)}</span>`
          }
        }
        if (line.translation) {
          xml += `<span ttm:role="x-translation" xml:lang="zh-CN">${escapeXml(line.translation)}</span>`
        }
        xml += `</span>`
      }
      lineIndex++
      continue
    }

    // Non-background line
    mainLineCount++
    xml += `<p begin="${msToTtmlTime(pBegin)}" end="${msToTtmlTime(pEnd)}" ttm:agent="${agent}" itunes:key="L${mainLineCount}">`
    for (const token of line.tokens) {
      if (token.start === 0 && token.duration === 0 && /^\s+$/.test(token.text)) {
        xml += token.text
      } else {
        xml += `<span begin="${msToTtmlTime(token.start)}" end="${msToTtmlTime(token.start + token.duration)}">${escapeXml(token.text)}</span>`
      }
    }
    if (line.translation) {
      xml += `<span ttm:role="x-translation" xml:lang="zh-CN">${escapeXml(line.translation)}</span>`
    }
    // Check if next line is inline background
    const nextLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1] : null
    if (nextLine && nextLine.isBackground) {
      const bgTimedTokens = nextLine.tokens.filter((t) => t.start !== 0 || t.duration !== 0)
      const bgBegin = bgTimedTokens[0]?.start ?? 0
      const bgLastToken = bgTimedTokens[bgTimedTokens.length - 1]
      const bgEnd = bgLastToken ? bgLastToken.start + bgLastToken.duration : 0
      xml += `<span ttm:role="x-bg" begin="${msToTtmlTime(bgBegin)}" end="${msToTtmlTime(bgEnd)}">`
      for (const token of nextLine.tokens) {
        if (token.start === 0 && token.duration === 0 && /^\s+$/.test(token.text)) {
          xml += token.text
        } else {
          xml += `<span begin="${msToTtmlTime(token.start)}" end="${msToTtmlTime(token.start + token.duration)}">${escapeXml(token.text)}</span>`
        }
      }
      if (nextLine.translation) {
        xml += `<span ttm:role="x-translation" xml:lang="zh-CN">${escapeXml(nextLine.translation)}</span>`
      }
      xml += `</span>`
    }
    xml += `</p>`
    lineIndex++
  }

  xml += `</div></body></tt>`
  return xml
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// --- Translation LRC output ---

export function serializeTranslationsToLrc(lines: LyricLine[]): string | null {
  const hasTranslation = lines.some((l) => l.translation)
  if (!hasTranslation) return null

  return lines.map((line) => {
    const start = line.tokens[0]?.start ?? 0
    const timestamp = msToLrcTime(start)
    return `${timestamp}${line.translation || ''}`
  }).join('\n')
}
