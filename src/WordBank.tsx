import { useMemo, useState } from 'react'
import { WORD_BY_ID, type Word } from './data'
import { wordKey } from './audio'
import { cardKey, LEVELS, level, recallChance, type AppState, type CardKind, type Level } from './store'
import { PlayButton } from './ui'

const SKILLS: { kind: CardKind; icon: string; label: string }[] = [
  { kind: 'listen', icon: '👂', label: 'Listening' },
  { kind: 'speak', icon: '🗣', label: 'Speaking' },
  { kind: 'read', icon: '字', label: 'Reading' },
]

type Filter = 'all' | 'word' | 'phrase'
type Sort = 'weakest' | 'newest' | 'oldest'
interface Entry { w: Word; order: number; levels: Level[]; score: number }

/** Strip tone marks and spaces so "nihao" finds "nǐ hǎo". */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ\s]/g, '').toLowerCase()

export default function WordBank({ state, onBack }: { state: AppState; onBack: () => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('weakest')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const entries = useMemo(() => {
    const out: Entry[] = []
    state.introduced.forEach((id, order) => {
      const w = WORD_BY_ID.get(id)
      if (!w) return // removed from the content
      const levels = SKILLS.map((s) => level(state.cards[cardKey(id, s.kind)]))
      out.push({ w, order, levels, score: levels.reduce<number>((a, b) => a + b, 0) })
    })
    return out
  }, [state])

  const ofKind = entries.filter((e) => filter === 'all' || e.w.kind === filter)
  const q = query.trim()
  const shown = ofKind.filter(
    (e) => !q || e.w.hanzi.includes(q) || plain(e.w.pinyin).includes(plain(q)) || e.w.en.toLowerCase().includes(q.toLowerCase()),
  )
  if (sort === 'weakest') shown.sort((a, b) => a.score - b.score || b.order - a.order)
  if (sort === 'newest') shown.reverse()

  return (
    <div className="home">
      <header>
        <button className="link" onClick={onBack}>‹ Back</button>
        <h1>Word bank</h1>
        <span className="count">{entries.length}</span>
      </header>

      {entries.length === 0 ? (
        <div className="card center-text"><p className="hint">Words you study will show up here.</p></div>
      ) : (
        <>
          <div className="card bank-summary">
            {SKILLS.map((s, i) => (
              <div key={s.kind} className="bank-skill">
                <span className="bank-skill-name">{s.icon} {s.label}</span>
                <span className="row">
                  {LEVELS.map((name, l) => {
                    const n = ofKind.filter((e) => e.levels[i] === l).length
                    return n > 0 && <span key={l} className={`chip lv${l}`} title={name}>{n} {name.toLowerCase()}</span>
                  })}
                </span>
              </div>
            ))}
          </div>

          <div className="bank-controls">
            <input type="search" placeholder="Search 字, pinyin or English" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="row">
              {(['all', 'word', 'phrase'] as const).map((f) => (
                <button key={f} className={`chip toggle ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                  {{ all: 'All', word: 'Words', phrase: 'Phrases' }[f]}
                </button>
              ))}
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                <option value="weakest">Weakest first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          <div className="card bank-list">
            {shown.length === 0 && <p className="hint center-text">No matches.</p>}
            {shown.map((e) => (
              <BankRow key={e.w.id} e={e} state={state} open={open === e.w.id} onToggle={() => setOpen(open === e.w.id ? null : e.w.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BankRow({ e, state, open, onToggle }: { e: Entry; state: AppState; open: boolean; onToggle: () => void }) {
  const { w, levels } = e
  return (
    <div className={`bank-item ${open ? 'open' : ''}`}>
      <button className="bank-row" onClick={onToggle} aria-expanded={open}>
        <span className={`bank-hanzi ${w.kind}`}>{w.hanzi}</span>
        <span className="bank-text">
          <span className="py">{w.pinyin}</span>
          <span className="en">{w.en}</span>
        </span>
        <span className="bank-levels">
          {levels.map((l, i) => (
            <span key={i} className={`lv lv${l}`} aria-label={`${SKILLS[i].label}: ${LEVELS[l]}`}>{SKILLS[i].icon}</span>
          ))}
        </span>
      </button>
      {open && (
        <div className="bank-detail">
          <div className="row">
            <PlayButton k={wordKey(w.id)} text={w.hanzi} label="▶ word" />
            {w.kind === 'word' && <PlayButton k={`${w.id}s`} text={w.sentence.zh} label="▶ sentence" />}
            {w.kind === 'phrase' && <PlayButton k={`${w.id}s`} text={w.sentence.zh} label="▶ example" />}
          </div>
          <div className="bank-sentence">
            <div className="zh">{w.sentence.zh}</div>
            <div className="py">{w.sentence.py}</div>
            <div className="en">{w.sentence.en}</div>
          </div>
          {SKILLS.map((s, i) => {
            const c = state.cards[cardKey(w.id, s.kind)]
            const r = recallChance(c)
            return (
              <div key={s.kind} className="bank-stat">
                <span className={`chip lv${levels[i]}`}>{s.icon} {LEVELS[levels[i]]}</span>
                <span className="hint">
                  {r === null || !c
                    ? 'Comes up in your next review'
                    : `${Math.round(r * 100)}% recall now · ${dueText(c.due)} · forgot ${c.lapses}×`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function dueText(due: Date) {
  if (+due <= Date.now()) return 'due now'
  return `next ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}
