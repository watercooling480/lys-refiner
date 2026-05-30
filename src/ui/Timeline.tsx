import type { VisualToken } from '../types'

type Props = {
  rows: Array<{ before: VisualToken[]; after: VisualToken[] }>
  selectedIds: string[]
  onTokenClick: (rowIndex: number, tokenIndex: number) => void
}

function windowFor(before: VisualToken[], after: VisualToken[]) {
  const timed = [...before, ...after].filter((t) => !(t.start === 0 && t.end === 0))
  if (!timed.length) return { start: 0, span: 1 }
  const starts = timed.map((token) => token.start)
  const ends = timed.map((token) => token.end)
  const start = Math.min(...starts)
  const end = Math.max(...ends)
  return { start, span: Math.max(end - start, 1) }
}

function Lane({
  tokens,
  start,
  span,
  variant,
  rowIndex,
  selectedIds,
  onTokenClick,
}: {
  tokens: VisualToken[]
  start: number
  span: number
  variant: 'before' | 'after'
  rowIndex: number
  selectedIds: string[]
  onTokenClick: (rowIndex: number, tokenIndex: number) => void
}) {
  return (
    <div className={`lane ${variant}`}>
      {tokens.map((token, index) => {
        // Skip space-only placeholder tokens (start=0, end=0) in preview
        if (token.start === 0 && token.end === 0 && /^\s*$/.test(token.text)) return null
        const left = ((token.start - start) / span) * 100
        const width = ((token.end - token.start) / span) * 100
        return (
          <div
            className={[
              'token',
              token.merged ? 'merged' : '',
              token.manual ? 'manual' : '',
              selectedIds.includes(token.id) ? 'selected' : '',
            ].filter(Boolean).join(' ')}
            key={`${token.start}-${index}`}
            onClick={variant === 'after' ? () => onTokenClick(rowIndex, index) : undefined}
            style={{ left: `${left}%`, width: `${Math.max(width, 0.7)}%` }}
            title={`${token.text} ${token.start}-${token.end}ms${token.merged ? ' · merged' : ''}`}
          >
            <span>{token.text || '·'}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Timeline({ rows, selectedIds, onTokenClick }: Props) {
  if (!rows.length) return <div className="empty">生成预览后会在这里显示时间轴。</div>

  return (
    <div className="timeline">
      {rows.map((row, index) => {
        const win = windowFor(row.before, row.after)
        return (
          <section className="timeline-row" key={index}>
            <div className="row-title">Line {index + 1}</div>
            <div className="track">
              <b>原始</b>
              <Lane tokens={row.before} start={win.start} span={win.span} variant="before" rowIndex={index} selectedIds={selectedIds} onTokenClick={onTokenClick} />
            </div>
            <div className="track">
              <b>输出</b>
              <Lane tokens={row.after} start={win.start} span={win.span} variant="after" rowIndex={index} selectedIds={selectedIds} onTokenClick={onTokenClick} />
            </div>
          </section>
        )
      })}
    </div>
  )
}
