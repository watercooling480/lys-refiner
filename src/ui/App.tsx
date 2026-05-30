import { useEffect, useMemo, useState } from 'react'
import { PRESETS, detectHasKorean, preview, serializeLine } from '../core/refiner'
import type { Preset, Preview, VisualToken } from '../types'
import { Timeline } from './Timeline'

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function hasWhitespaceBoundary(tokens: VisualToken[]) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (/\s$/.test(tokens[index].text) || /^\s/.test(tokens[index + 1].text)) return true
  }
  return false
}

function hasHyphenBoundary(tokens: VisualToken[]) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].text.endsWith('-') || tokens[index + 1].text.startsWith('-')) return true
  }
  return false
}

export function App() {
  const [fileName, setFileName] = useState('lyrics.lys')
  const [source, setSource] = useState('')
  const [preset, setPreset] = useState<Preset>(PRESETS[1])
  const [strength, setStrength] = useState(PRESETS[1].sensitivity)
  const [koreanStrength, setKoreanStrength] = useState(0.08)
  const [hasKorean, setHasKorean] = useState(false)
  const [result, setResult] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<Array<{ row: number; token: number }>>([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const activePreset = useMemo(() => PRESETS.find((item) => item.id === preset.id), [preset])
  const selectedIds = useMemo(
    () => selected.flatMap((item) => result?.rows[item.row]?.after[item.token]?.id ?? []),
    [result, selected],
  )
  const outputText = useMemo(() => {
    if (!result) return ''
    let rowCursor = 0
    return source.split(/\r?\n/).map((line) => {
      if (!/^\[\d+\]/.test(line)) return line
      const row = result.rows[rowCursor++]
      return row ? serializeLine(row.attr, row.after) : line
    }).join('\n')
  }, [result, source])

  useEffect(() => {
    if (!actionError) return
    setToastVisible(true)
    const hideTimer = window.setTimeout(() => setToastVisible(false), 4300)
    const clearTimer = window.setTimeout(() => setActionError(''), 5000)
    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(clearTimer)
    }
  }, [actionError])

  function showActionError(message: string) {
    setToastVisible(false)
    window.setTimeout(() => {
      setActionError(message)
      setToastVisible(true)
    }, 20)
  }

  function runPreview() {
    if (!source.trim()) {
      setError('请粘贴歌词或拖入 .lys 文件。')
      return
    }
    setError('')
    setActionError('')
    setHasKorean(detectHasKorean(source))
    setResult(preview(source, strength, koreanStrength))
    setSelected([])
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setSource(await file.text())
    setResult(null)
    setSelected([])
    setError('')
    setActionError('')
  }

  function clickToken(row: number, token: number) {
    setSelected((current) => {
      const exists = current.some((item) => item.row === row && item.token === token)
      if (exists) return current.filter((item) => !(item.row === row && item.token === token))
      const sameRow = current.length === 0 || current.every((item) => item.row === row)
      setActionError('')
      return sameRow ? [...current, { row, token }].sort((a, b) => a.token - b.token) : [{ row, token }]
    })
  }

  function splitSelected() {
    if (!result || selected.length !== 1) return
    const { row, token } = selected[0]
    setResult((current) => {
      if (!current) return current
      const rows = current.rows.map((item, rowIndex) => {
        if (rowIndex !== row) return item
        const target = item.after[token]
        if (!target || target.sourceIndexes.length <= 1) return item
        const replacements = target.sourceIndexes.map((sourceIndex) => ({
          ...item.before[sourceIndex],
          id: `split-${row}-${sourceIndex}-${Date.now()}`,
          sourceIndexes: [sourceIndex],
          merged: false,
          manual: true,
        }))
        return { ...item, after: [...item.after.slice(0, token), ...replacements, ...item.after.slice(token + 1)] }
      })
      return { ...current, rows }
    })
    setSelected([])
    setError('')
    setActionError('')
  }

  function mergeSelected() {
    if (!result || selected.length < 2) return
    const row = selected[0].row
    const indexes = selected.map((item) => item.token).sort((a, b) => a - b)
    const contiguous = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1)
    if (!contiguous) return
    setResult((current) => {
      if (!current) return current
      const rows = current.rows.map((item, rowIndex) => {
        if (rowIndex !== row) return item
        const picked = indexes.map((index) => item.after[index]).filter(Boolean)
        if (picked.length < 2) return item
        if (hasWhitespaceBoundary(picked)) {
          showActionError('所选片段不属于同一个单词，无法合并')
          return item
        }
        if (hasHyphenBoundary(picked)) {
          showActionError('所选片段不属于同一个单词，无法合并')
          return item
        }
        const merged: VisualToken = {
          id: `manual-${row}-${indexes[0]}-${Date.now()}`,
          text: picked.map((item) => item.text).join(''),
          start: picked[0].start,
          end: picked[picked.length - 1].end,
          sourceIndexes: picked.flatMap((item) => item.sourceIndexes),
          merged: true,
          manual: true,
        }
        return { ...item, after: [...item.after.slice(0, indexes[0]), merged, ...item.after.slice(indexes[indexes.length - 1] + 1)] }
      })
      return { ...current, rows }
    })
    setSelected([])
    setError('')
    setActionError('')
  }

  return (
    <div className="app">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="hero">
        <div>
          <h1>LYS Refiner</h1>
          <p>Lyricify Syllable 歌词合并工具。</p>
        </div>
        <div className="meter">
          <small>合并强度</small>
          <strong>{strength.toFixed(2)}</strong>
          <span>{activePreset?.label ?? '自定义'}</span>
        </div>
      </header>

      <main className="grid">
        <section className="card editor-card">
          <div className="card-head">
            <div>
              <h2>歌词输入</h2>
              <p>{fileName}</p>
            </div>
            <label className="file-button">
              选择文件
              <input type="file" accept=".lys,.txt" onChange={(event) => void chooseFile(event.target.files?.[0])} />
            </label>
          </div>
          <textarea
            className="lyrics-box"
            value={source}
            onChange={(event) => {
              setSource(event.target.value)
              setResult(null)
              setSelected([])
              setActionError('')
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void chooseFile(event.dataTransfer.files[0])
            }}
            placeholder="[4]spo(1000,500)ti(1500,500)fy(2000,500)"
            spellCheck={false}
          />
        </section>

        <section className="card output-card">
          <div className="card-head">
            <div>
              <h2>输出 LYS</h2>
              <p>点击预览后在这里复制结果。</p>
            </div>
          </div>
          <textarea
            className="lyrics-box output-box"
            value={outputText}
            readOnly
            placeholder="处理后的 .lys 会显示在这里"
            spellCheck={false}
          />
        </section>

        {result ? (
          <section className="card preview-card">
            <div className="card-head">
              <div>
                <h2>时间轴预览</h2>
                <p>点击输出 token 后在右侧操作。</p>
              </div>
            </div>
            <Timeline rows={result.rows} selectedIds={selectedIds} onTokenClick={clickToken} />
          </section>
        ) : null}

        <aside className="side">
          <section className="card controls">
            <h2>控制</h2>
            <div className="presets">
              {PRESETS.map((item) => (
                <button
                  className={item.id === preset.id ? 'preset active' : 'preset'}
                  key={item.id}
                  onClick={() => {
                    setPreset(item)
                    setStrength(item.sensitivity)
                  }}
                >
                  <b>{item.label}</b>
                  <span>{item.sensitivity.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <label className="slider-label">
              <span>合并强度</span>
              <b>{strength.toFixed(2)}</b>
            </label>
            <input
              className="slider"
              type="range"
              min={5}
              max={80}
              value={Math.round(strength * 100)}
              onChange={(event) => {
                setPreset({ id: 'custom', label: '自定义', sensitivity: Number(event.target.value) / 100, description: '手动设置。' })
                setStrength(Number(event.target.value) / 100)
              }}
            />

            {hasKorean ? (
              <>
                <label className="slider-label">
                  <span>韩语合并强度</span>
                  <b>{koreanStrength.toFixed(2)}</b>
                </label>
                <input
                  className="slider"
                  type="range"
                  min={1}
                  max={40}
                  value={Math.round(koreanStrength * 100)}
                  onChange={(event) => setKoreanStrength(Number(event.target.value) / 100)}
                />
              </>
            ) : null}

            <div className="buttons">
              <button onClick={runPreview}>转换</button>
            </div>
          </section>

          {error ? <div className="error">{error}</div> : null}

          {result ? (
            <section className="card stats">
              <h2>统计</h2>
              <div className="stat big"><span>合并率</span><b>{percent(result.stats.ratio)}</b></div>
              <div className="stat"><span>Token</span><b>{result.stats.beforeTokens} -&gt; {result.stats.afterTokens}</b></div>
              <div className="stat"><span>减少</span><b>{result.stats.reduced}</b></div>
              <div className="stat"><span>歌词行</span><b>{result.stats.lyricLines}</b></div>
            </section>
          ) : null}
        </aside>

      </main>
      {selected.length > 0 ? (
        <div className="floating-actions">
          <button onClick={splitSelected} disabled={selected.length !== 1}>拆开</button>
          <button onClick={mergeSelected} disabled={selected.length < 2}>合并</button>
        </div>
      ) : null}
      {actionError ? <div className={`toast ${toastVisible ? 'show' : 'hide'}`}>{actionError}</div> : null}
    </div>
  )
}
