export type Token = {
  text: string
  start: number
  duration: number
}

export type VisualToken = {
  id: string
  text: string
  start: number
  end: number
  sourceIndexes: number[]
  merged: boolean
  manual?: boolean
}

export type Preview = {
  refinedText: string
  stats: {
    lines: number
    lyricLines: number
    beforeTokens: number
    afterTokens: number
    reduced: number
    ratio: number
  }
  rows: Array<{
    attr: string
    before: VisualToken[]
    after: VisualToken[]
  }>
}

export type Preset = {
  id: string
  label: string
  sensitivity: number
  description: string
}
