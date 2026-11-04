import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { WORD_BY_ID, WORDS } from './data'
import { cardKey, LEVELS, level, startOfDay, today, wordsLearned, type AppState, type CardKind } from './store'

const SKILLS: { kind: CardKind; label: string; well: string }[] = [
  { kind: 'speak', label: 'Say', well: 'you can say well' },
  { kind: 'listen', label: 'Hear', well: 'you understand well by ear' },
  { kind: 'read', label: 'Read', well: 'you read well' },
]

/** Always show at least four weeks, so the first days have room to grow into. */
const WINDOW = 28
/** Past this many days, a column is a week. */
const MAX_DAY_COLUMNS = 56
const GAP = 2
const MAX_CELL = 14
const MAX_HEIGHT = 168
const AXIS = 30

interface Column { start: Date; days: number; ids: string[]; future: boolean; today: boolean }

/** Items in the order they were introduced, placed on their day from the day log's new + known counts. */
function columns(s: AppState, now: Date): Column[] {
  const keys = Object.keys(s.history).sort()
  if (keys.length === 0 || s.introduced.length === 0) return []
  const counts = keys.map((k) => s.history[k].newWords + (s.history[k].newPhrases ?? 0) + (s.history[k].known ?? 0))
  // Anything the log can't place (older data) counts as the first day.
  counts[0] += Math.max(0, s.introduced.length - counts.reduce((a, b) => a + b, 0))
  const at: Record<string, string[]> = {}
  let i = 0
  keys.forEach((k, j) => { at[k] = s.introduced.slice(i, (i += counts[j])) })

  const [y, m, d] = keys[0].split('-').map(Number)
  const todayAt = +startOfDay(now)
  const lived = Math.round((todayAt - +new Date(y, m - 1, d)) / 86400000) + 1
  const span = Math.max(WINDOW, lived)
  const per = span > MAX_DAY_COLUMNS ? 7 : 1
  const out: Column[] = []
  for (let n = 0; n < span; n += per) {
    const start = new Date(y, m - 1, d + n)
    const ids: string[] = []
    let isToday = false
    for (let k = 0; k < per; k++) {
      const day = new Date(y, m - 1, d + n + k)
      ids.push(...(at[today(day)] ?? []))
      if (+day === todayAt) isToday = true
    }
    out.push({ start, days: per, ids, future: +start > todayAt, today: isToday })
  }
  return out
}

const short = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const long = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

/** HSK 1 finish date at the current pace, if there are words left. */
function finishDate(s: AppState, now: Date) {
  const left = WORDS.length - wordsLearned(s)
  if (left <= 0) return undefined
  return startOfDay(now, Math.ceil(left / s.settings.newPerDay))
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Every item you've learned is one square of ink, stacked on the day you learned it.
 * Squares darken as the memory gets stronger, strongest at the base, so old days settle
 * into solid ink while today's sit pale on top.
 */
export function Growth({ state }: { state: AppState }) {
  const [now] = useState(() => new Date())
  const [skill, setSkill] = useState<CardKind>('speak')
  const [ref, width] = useWidth()
  const cols = useMemo(() => columns(state, now), [state, now])
  const lastFilled = cols.reduce((a, c, i) => (c.ids.length && !c.future ? i : a), 0)
  const [picked, setPicked] = useState<number | null>(null)
  const todayFilled = cols.findIndex((c) => c.today && c.ids.length > 0)
  const sel = picked ?? (todayFilled >= 0 ? todayFilled : lastFilled)

  if (cols.length === 0) return null
  const levelOf = (id: string) => level(state.cards[cardKey(id, skill)])
  const stacks = cols.map((c) => c.ids.map((id) => ({ id, l: levelOf(id) })).sort((a, b) => b.l - a.l))

  const total = state.introduced.length
  const good = state.introduced.filter((id) => levelOf(id) >= 3).length
  const weekAgo = +startOfDay(now, -6)
  const thisWeek = cols.filter((c) => !c.future && +c.start >= weekAgo).reduce((a, c) => a + c.ids.length, 0)
  const s = SKILLS.find((x) => x.kind === skill)!
  const finish = finishDate(state, now)

  const tallest = Math.max(4, ...stacks.map((x) => x.length))
  const pitch = width / cols.length
  const cell = Math.max(3, Math.min(MAX_CELL, Math.floor(pitch - GAP), Math.floor((MAX_HEIGHT + GAP) / tallest) - GAP))
  const plotH = tallest * (cell + GAP)
  const base = plotH
  const col = cols[sel]
  const selItems = stacks[sel] ?? []

  return (
    <section className="panel growth" aria-labelledby="growth-title">
      <div className="growth-head">
        <div>
          <h2 id="growth-title" className="growth-n">{total}</h2>
          <p className="growth-unit">words and phrases</p>
        </div>
        <div className="seg-control small" role="group" aria-label="Skill">
          {SKILLS.map((x) => (
            <button key={x.kind} className={skill === x.kind ? 'on' : ''} aria-pressed={skill === x.kind} onClick={() => setSkill(x.kind)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <p className="growth-sub num"><b>{good}</b> {s.well} · <b>+{thisWeek}</b> this week</p>

      <div ref={ref} className="growth-plot">
        <svg width={width} height={plotH + AXIS} role="group" aria-label={`Items learned per ${cols[0].days === 7 ? 'week' : 'day'}, shaded by ${s.label.toLowerCase()} strength`}>
          <line className="growth-base" x1={0} x2={width} y1={base + 1} y2={base + 1} />
          {cols.map((c, i) => {
            const x = i * pitch + (pitch - cell) / 2
            const label = `${c.days === 7 ? `Week of ${short(c.start)}` : long(c.start)}: ${c.ids.length} learned${c.ids.length ? `, ${
              LEVELS.map((n, l) => [n, stacks[i].filter((e) => e.l === l).length] as const).filter(([, k]) => k).map(([n, k]) => `${k} ${n.toLowerCase()}`).join(', ')}` : ''}`
            return (
              <g key={i} className={`growth-col ${i === sel ? 'is-sel' : ''} ${c.future ? 'is-future' : ''}`}
                role={c.future ? undefined : 'button'} tabIndex={c.future ? undefined : 0} aria-label={c.future ? undefined : label} aria-pressed={c.future ? undefined : i === sel}
                onClick={c.future ? undefined : () => setPicked(i)}
                onKeyDown={c.future ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked(i) } }}>
                <rect className="hit" x={i * pitch} y={0} width={pitch} height={plotH + AXIS} />
                {stacks[i].map((e, k) => (
                  <rect key={k} className={`cell c-lv${e.l}`} x={x} y={base - (k + 1) * (cell + GAP) + GAP} width={cell} height={cell}
                    rx={Math.min(2, cell / 4)} style={{ animationDelay: `${Math.min(i * 18 + k * 14, 700)}ms` }} />
                ))}
                {i === sel ? (
                  <path className="caret" d={`M${i * pitch + pitch / 2 - 4} ${base + 10}l4 -5l4 5Z`} />
                ) : (c.future || c.today) && (
                  // Days still to come wait as dots on the baseline; today's dot is ink.
                  <circle className={c.today ? 'today-dot' : 'future-dot'} cx={i * pitch + pitch / 2} cy={base + 7} r={c.today ? 2 : 1.5} />
                )}
              </g>
            )
          })}
          <text className="growth-tick" x={0} y={plotH + AXIS - 2}>{short(cols[0].start)}</text>
          <text className="growth-tick" x={width} y={plotH + AXIS - 2} textAnchor="end">{short(new Date(+cols[cols.length - 1].start + (cols[0].days - 1) * 86400000))}</text>
        </svg>
      </div>

      <div className="growth-day" aria-live="polite">
        <p className="growth-day-title num">
          <b>{col.today ? 'Today' : col.days === 7 ? `Week of ${short(col.start)}` : long(col.start)}</b>
          <span>{selItems.length ? `${selItems.length} learned` : 'Nothing new'}</span>
        </p>
        {selItems.length > 0 && (
          <ul className="growth-chips">
            {selItems.map((e) => (
              <li key={e.id} className={`hz lv${e.l}`} lang="zh-CN" title={`${WORD_BY_ID.get(e.id)?.en}: ${LEVELS[e.l]}`}>
                {WORD_BY_ID.get(e.id)?.hanzi}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="growth-legend" aria-hidden="true">
        <span>{LEVELS[0]}</span>
        {LEVELS.map((_, l) => <i key={l} className={`swatch lv${l}`} />)}
        <span>{LEVELS[4]}</span>
      </div>
      {finish && (
        <p className="growth-pace">At {state.settings.newPerDay} new words a day, you’ll finish HSK 1 around <b>{short(finish)}</b>.</p>
      )}
    </section>
  )
}

