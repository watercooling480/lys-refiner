import type { Preset, Preview, Token, VisualToken } from '../types'

const BOOST_CAP = 1.75
const SENSITIVITY_GAIN = 1.18

const LETTER_WIDTH: Record<string, number> = {
  i: 0.38,
  l: 0.42,
  j: 0.48,
  t: 0.58,
  f: 0.62,
  r: 0.66,
  s: 0.78,
  z: 0.82,
  a: 0.88,
  c: 0.88,
  e: 0.88,
  g: 0.92,
  o: 0.94,
  q: 0.94,
  u: 0.94,
  v: 0.96,
  x: 0.96,
  y: 0.96,
  b: 1,
  d: 1,
  h: 1,
  k: 1,
  n: 1,
  p: 1,
  m: 1.32,
  w: 1.42,
}

export const PRESETS: Preset[] = [
  {
    id: 'strict',
    label: '精细',
    sensitivity: 0.24,
    description: '只合明显属于同一词的音节，保留更多滚动细节。',
  },
  {
    id: 'balanced',
    label: '标准',
    sensitivity: 0.35,
    description: '推荐默认值，兼顾可读性和拖长音位置。',
  },
  {
    id: 'loose',
    label: '宽松',
    sensitivity: 0.48,
    description: '更倾向合词，适合大屏或想减少碎片时使用。',
  },
]

function visualWidth(text: string): number {
  let width = 0
  for (const char of Array.from(text)) {
    if (!/[A-Za-z0-9\u4e00-\u9fff]/u.test(char)) continue
    const lower = char.toLowerCase()
    if (lower >= 'a' && lower <= 'z') width += LETTER_WIDTH[lower] ?? 1
    else if (lower >= '0' && lower <= '9') width += 0.9
    else width += 1
  }
  return width
}

function velocity(text: string, duration: number): number {
  const width = visualWidth(text)
  return width > 0 && duration > 0 ? duration / width : 0
}

function baseThreshold(sensitivity: number, duration: number): number {
  const boost = 1 + 500 / (duration + 100)
  return sensitivity * SENSITIVITY_GAIN * Math.min(BOOST_CAP, boost)
}

function threshold(sensitivity: number, text: string, duration: number, pairDuration: number): number {
  const width = visualWidth(text)
  let value = baseThreshold(sensitivity, pairDuration)

  if (width <= 5.2 && duration <= 1100) {
    return sensitivity >= 0.25 ? value * 1.45 : value
  }
  if (visualWidth(text.slice(0, 1)) > 0 && visualWidth(text.slice(0, 1)) <= 1.05 && width <= 5.4) {
    return value * 1.35
  }

  if (width >= 7.0) value *= 0.82
  if (width >= 9.5) value *= 0.72
  if (duration >= 1200) value *= 0.78
  if (duration >= 1550) value *= 0.62
  return value
}

function hasLongTail(leftText: string, rightText: string, leftDuration: number, rightDuration: number, mergedDuration: number): boolean {
  if (mergedDuration < 1200) return false
  if (visualWidth(leftText) <= 1.05 && visualWidth(leftText + rightText) <= 5.4) return false
  return rightDuration / Math.max(leftDuration, 1) >= 1.85
}

function parseTokens(content: string): Token[] {
  const parts = content.split(/(\(\d+,\d+\))/g)
  const tokens: Token[] = []
  for (let index = 0; index < parts.length - 1; index += 2) {
    const match = parts[index + 1].match(/\d+/g)
    if (!match || match.length < 2) continue
    tokens.push({ text: parts[index], start: Number(match[0]), duration: Number(match[1]) })
  }
  return tokens
}

function toVisual(tokens: Token[], rowIndex: number, prefix: string): VisualToken[] {
  return tokens.map((token, index) => ({
    id: `${prefix}-${rowIndex}-${index}`,
    text: token.text,
    start: token.start,
    end: token.start + token.duration,
    sourceIndexes: [index],
    merged: false,
  }))
}

export function refineTokens(tokens: Token[], sensitivity: number, rowIndex = 0): VisualToken[] {
  const result: VisualToken[] = []
  let index = 0

  while (index < tokens.length) {
    const first = tokens[index]
    let text = first.text
    const start = first.start
    let duration = first.duration
    const sourceIndexes = [index]
    let nextIndex = index + 1

    while (nextIndex < tokens.length) {
      const next = tokens[nextIndex]
      const gap = next.start - (start + duration)
      if (text.endsWith(' ') || next.text.startsWith(' ') || text.endsWith('-') || next.text.startsWith('-') || gap >= 10) break

      const leftVelocity = velocity(text, duration)
      const rightVelocity = velocity(next.text, next.duration)
      const velocityDiff = Math.max(leftVelocity, rightVelocity) > 0
        ? Math.abs(leftVelocity - rightVelocity) / Math.max(leftVelocity, rightVelocity)
        : 0
      const mergedText = text + next.text
      const mergedDuration = next.start + next.duration - start
      let limit = threshold(sensitivity, mergedText, mergedDuration, duration + next.duration)
      if (hasLongTail(text, next.text, duration, next.duration, mergedDuration)) limit *= 0.55
      if (velocityDiff > limit) break

      text = mergedText
      duration = mergedDuration
      sourceIndexes.push(nextIndex)
      nextIndex += 1
    }

    result.push({
      id: `after-${rowIndex}-${result.length}`,
      text,
      start,
      end: start + duration,
      sourceIndexes,
      merged: sourceIndexes.length > 1,
    })
    index = nextIndex
  }

  return result
}

export function serializeLine(attr: string, tokens: VisualToken[]): string {
  return `[${attr}]${tokens.map((token) => `${token.text}(${token.start},${token.end - token.start})`).join('')}`
}

export function refineLine(line: string, sensitivity: number): string {
  const lineMatch = line.trimEnd().match(/^\[(\d+)\](.*)$/)
  if (!lineMatch) return line

  const attr = lineMatch[1]
  const content = lineMatch[2]
  const tokens = parseTokens(content)
  return serializeLine(attr, refineTokens(tokens, sensitivity))
}

export function refineText(text: string, sensitivity: number): string {
  return text
    .split(/(\r?\n)/)
    .map((part, index) => (index % 2 === 0 && part.startsWith('[') ? refineLine(part, sensitivity) : part))
    .join('')
}

function countTokens(text: string): number {
  return text.match(/\(\d+,\d+\)/g)?.length ?? 0
}

export function preview(text: string, sensitivity: number): Preview {
  const lines = text.split(/\r?\n/)
  const refinedLines: string[] = []
  const rows: Preview['rows'] = []

  lines.forEach((line, index) => {
    const match = line.match(/^\[(\d+)\](.*)$/)
    if (!match) {
      refinedLines.push(line)
      return
    }

    const attr = match[1]
    const original = parseTokens(match[2])
    const before = toVisual(original, index, 'before')
    const after = refineTokens(original, sensitivity, index)
    refinedLines.push(serializeLine(attr, after))
    if (before.length) rows.push({ attr, before, after })
  })

  const refinedText = refinedLines.join('\n')
  const beforeTokens = countTokens(text)
  const afterTokens = countTokens(refinedText)

  return {
    refinedText,
    rows,
    stats: {
      lines: lines.length,
      lyricLines: rows.length,
      beforeTokens,
      afterTokens,
      reduced: beforeTokens - afterTokens,
      ratio: beforeTokens ? (beforeTokens - afterTokens) / beforeTokens : 0,
    },
  }
}
