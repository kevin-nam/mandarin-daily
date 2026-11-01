import { useMemo, useState } from 'react'
import { CharParts } from './CharParts'
import { WORD_BY_ID, knownChars, type Word } from './data'
import { wordKey } from './audio'
import { Icon } from './icons'
import { Pinyin } from './Pinyin'
import { cardKey, LEVELS, level, recallChance, type AppState, type CardKind, type Level } from './store'
import { PlayButton } from './ui'

// Each skill is marked by the Chinese verb for it: 听 listen, 说 speak, 读 read, 句 sentence.
const SKILLS: { kind: CardKind; mark: string; label: string }[] = [
  { kind: 'listen', mark: '听', label: 'Listening' },
  { kind: 'speak', mark: '说', label: 'Speaking' },
  { kind: 'read', mark: '读', label: 'Reading' },
  // Words only, unlocked once Reading is Good (phrases are already sentences).
  { kind: 'sentence', mark: '句', label: 'Sentences' },
]
const applies = (kind: CardKind, w: Word) => kind !== 'sentence' || w.kind === 'word'
const locked = (state: AppState, kind: CardKind, w: Word) => kind === 'sentence' && !state.cards[cardKey(w.id, kind)]

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
  const known = useMemo(() => knownChars(state.introduced), [state.introduced])

  const entries = useMemo(() => {
    const out: Entry[] = []
    state.introduced.forEach((id, order) => {
      const w = WORD_BY_ID.get(id)
      if (!w) return // removed from the content
      const levels = SKILLS.map((s) => level(state.cards[cardKey(id, s.kind)]))
      // Sort score ignores sentences, which start locked.
      out.push({ w, order, levels, score: levels.slice(0, 3).reduce<number>((a, b) => a + b, 0) })
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
    <div className="screen bank">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <h1 className="bar-title">Word bank</h1>
        <span className="icon-btn bar-count num" aria-label={`${entries.length} items`}>{entries.length}</span>
      </header>

      {entries.length === 0 ? (
        <div className="panel empty">
          <p>Words and phrases you study show up here, with how well you know each one.</p>
        </div>
      ) : (
        <>
          <section className="panel strength" aria-label="Strength by skill">
            {SKILLS.map((s, i) => {
              const pool = ofKind.filter((e) => applies(s.kind, e.w) && !locked(state, s.kind, e.w))
              return (
                <div key={s.kind} className="strength-row">
                  <span className="skill-mark hz" aria-hidden="true">{s.mark}</span>
                  <span className="strength-label">{s.label}</span>
                  {pool.length === 0 ? (
                    <span className="strength-empty">Unlocks per word once its reading is Good</span>
                  ) : (
                    <div className="strength-bar" role="img"
                      aria-label={LEVELS.map((n, l) => `${pool.filter((e) => e.levels[i] === l).length} ${n.toLowerCase()}`).join(', ')}>
                      {LEVELS.map((name, l) => {
                        const n = pool.filter((e) => e.levels[i] === l).length
                        return n > 0 && <span key={l} className={`seg lv${l}`} style={{ flexGrow: n }} title={`${n} ${name.toLowerCase()}`}>{n}</span>
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            <ul className="legend" aria-hidden="true">
              {LEVELS.map((name, l) => <li key={l}><span className={`swatch lv${l}`} />{name}</li>)}
            </ul>
          </section>

          <div className="bank-controls">
            <label className="search">
              <Icon name="search" size={18} />
              <input type="search" placeholder="Search 字, pinyin or English" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="bank-filters">
              <div className="seg-control" role="group" aria-label="Show">
                {(['all', 'word', 'phrase'] as const).map((f) => (
                  <button key={f} className={filter === f ? 'on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                    {{ all: 'All', word: 'Words', phrase: 'Phrases' }[f]}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                <option value="weakest">Weakest first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          <div className="panel bank-list">
            {shown.length === 0 && <p className="empty-line">Nothing matches “{q}”.</p>}
            {shown.map((e) => (
              <BankRow key={e.w.id} e={e} state={state} known={known} open={open === e.w.id}
                onToggle={() => setOpen(open === e.w.id ? null : e.w.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Marks({ e, state }: { e: Entry; state: AppState }) {
  return (
    <span className="marks">
      {e.levels.map((l, i) => {
        const s = SKILLS[i]
        if (!applies(s.kind, e.w)) return <span key={i} className="mark none" aria-hidden="true" />
        const isLocked = locked(state, s.kind, e.w)
        return (
          <span key={i} className={`mark hz ${isLocked ? 'locked' : `lv${l}`}`} aria-label={`${s.label}: ${isLocked ? 'locked' : LEVELS[l]}`}>
            {s.mark}
          </span>
        )
      })}
    </span>
  )
}

function BankRow({ e, state, known, open, onToggle }: {
  e: Entry; state: AppState; known: Set<string>; open: boolean; onToggle: () => void
}) {
  const { w, levels } = e
  return (
    <div className={`bank-item ${w.kind} ${open ? 'open' : ''}`}>
      <button className="bank-row" onClick={onToggle} aria-expanded={open}>
        <span className="hz bank-hanzi" lang="zh-CN">{w.hanzi}</span>
        <span className="bank-text">
          <Pinyin text={w.pinyin} />
          <span className="en">{w.en}</span>
        </span>
        <Marks e={e} state={state} />
      </button>
      {open && (
        <div className="bank-detail">
          <div className="play-row start">
            <PlayButton k={wordKey(w.id)} text={w.hanzi} label={w.kind === 'word' ? 'Word' : 'Phrase'} />
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} label={w.kind === 'word' ? 'Sentence' : 'Example'} />
          </div>
          <div className="bank-sentence">
            <div className="hz zh" lang="zh-CN">{w.sentence.zh}</div>
            <Pinyin text={w.sentence.py} />
            <div className="en">{w.sentence.en}</div>
          </div>
          <CharParts hanzi={w.hanzi} known={known} />
          <dl className="skill-stats">
            {SKILLS.map((s, i) => {
              if (!applies(s.kind, w)) return null
              const c = state.cards[cardKey(w.id, s.kind)]
              const r = recallChance(c)
              return (
                <div key={s.kind} className="skill-stat">
                  <dt><span className={`mark hz ${!c && s.kind === 'sentence' ? 'locked' : `lv${levels[i]}`}`} aria-hidden="true">{s.mark}</span>{s.label}</dt>
                  <dd>
                    <b>{!c && s.kind === 'sentence' ? 'Locked' : LEVELS[levels[i]]}</b>
                    <span>
                      {!c && s.kind === 'sentence'
                        ? 'Unlocks once reading is Good'
                        : r === null || !c
                        ? 'First review coming up'
                        : `${Math.round(r * 100)}% recall now · ${dueText(c.due)}${c.lapses ? ` · forgot ${c.lapses}×` : ''}`}
                    </span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </div>
  )
}

function dueText(due: Date) {
  if (+due <= Date.now()) return 'due now'
  return `next ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}
