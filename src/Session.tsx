import { useEffect, useMemo, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { DIALOGUES, TONE_ITEMS, WORD_BY_ID, target, toneOf, type Word } from './data'
import { epoch, lineKey, play, sleep, stop, wordKey } from './audio'
import {
  byRisk, dueKeys, grade, introduce, logDay, markKnown, newQuota, nextNewItems, parseKey, Rating, streak,
  wordsLearned, type AppState,
} from './store'
import { PlayButton, StepHeader, WordFace, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void
type StepId = 'reviews' | 'new' | 'drill' | 'dialogue' | 'tones' | 'done'

const STEPS: { id: StepId; label: string; minutes: number }[] = [
  { id: 'reviews', label: 'Review', minutes: 8 },
  { id: 'new', label: 'New words', minutes: 5 },
  { id: 'drill', label: 'Speak', minutes: 7 },
  { id: 'dialogue', label: 'Dialogue', minutes: 3 },
  { id: 'tones', label: 'Tones', minutes: 2 },
]

export default function Session({ state, commit, onExit }: { state: AppState; commit: Commit; onExit: () => void }) {
  const [step, setStep] = useState<StepId>('reviews')
  const [learnedNow, setLearnedNow] = useState<string[]>([])
  const [knownNow, setKnownNow] = useState(0)
  const startRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => {
      clearInterval(t)
      stop()
    }
  }, [])

  const next = () => {
    stop()
    const i = STEPS.findIndex((s) => s.id === step)
    setStep(i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : 'done')
  }

  const finish = () => {
    commit((s) => logDay(s, { minutes: Math.round(elapsed / 60) }))
    onExit()
  }

  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const over = elapsed > state.settings.sessionMinutes * 60

  return (
    <div className="session">
      <div className="topbar">
        <button className="link" onClick={step === 'done' ? finish : () => confirm('End session? Progress so far is saved.') && finish()}>
          ✕
        </button>
        <div className="steps">
          {STEPS.map((s) => (
            <span key={s.id} className={`dot ${s.id === step ? 'on' : ''}`} title={s.label} />
          ))}
        </div>
        <span className={`timer ${over ? 'over' : ''}`}>{mm}</span>
      </div>

      {step === 'reviews' && <Reviews state={state} commit={commit} onDone={next} />}
      {step === 'new' && (
        <NewWords state={state} commit={commit} onDone={(ids, known) => { setLearnedNow(ids); setKnownNow(known); next() }} />
      )}
      {step === 'drill' && <Drill state={state} learnedNow={learnedNow} onDone={next} />}
      {step === 'dialogue' && <DialogueStep state={state} onDone={next} />}
      {step === 'tones' && <Tones onDone={next} />}
      {step === 'done' && (
        <div className="card center-text">
          <h2>Done for today 🎉</h2>
          <p className="streak-big">🔥 {streak(state)}-day streak</p>
          <p>{mm} · {learnedNow.length - knownNow} new{knownNow > 0 && ` · ${knownNow} already known`}</p>
          <p className="hint">Next session: tomorrow, after a night's sleep.</p>
          <button className="primary" onClick={finish}>Finish</button>
        </div>
      )}
    </div>
  )
}

/* ---------------- Reviews ---------------- */

const REVIEW_MINUTES = 8

/**
 * Due cards, most at risk of being forgotten first (only ~40 fit in the time cap), with
 * speak cards prioritised (2 speak : 1 other) so the main gap gets the most time, still interleaved.
 */
function reviewQueue(state: AppState) {
  const due = byRisk(state, dueKeys(state)).slice(0, 80)
  const speak = due.filter((k) => parseKey(k).kind === 'speak')
  const other = due.filter((k) => parseKey(k).kind !== 'speak')
  const out: string[] = []
  while (speak.length || other.length) out.push(...speak.splice(0, 2), ...other.splice(0, 1))
  return out
}

function Reviews({ state, commit, onDone }: { state: AppState; commit: Commit; onDone: () => void }) {
  const [queue, setQueue] = useState(() => reviewQueue(state))
  const [revealed, setRevealed] = useState(false)
  const [count, setCount] = useState(0)
  const start = useRef(Date.now())

  useEffect(() => {
    if (queue.length === 0) onDone()
  }, [queue.length, onDone])
  if (queue.length === 0) return null

  const key = queue[0]
  const { wordId, kind } = parseKey(key)
  const w = WORD_BY_ID.get(wordId)!
  const t = target(w)
  const timeUp = Date.now() - start.current > REVIEW_MINUTES * 60 * 1000

  const rate = (r: Grade) => {
    commit((s) => {
      grade(s, key, r)
      logDay(s, { reviews: 1 })
    })
    setCount((c) => c + 1)
    setRevealed(false)
    setQueue((q) => {
      const rest = q.slice(1)
      if (timeUp) return [] // time cap reached
      if (r === Rating.Again) rest.splice(Math.min(4, rest.length), 0, key) // see it again soon
      return rest
    })
  }

  const reveal = () => {
    setRevealed(true)
    if (kind === 'speak') play(t.key, t.zh)
    if (kind === 'read') play(wordKey(w.id), w.hanzi)
  }

  const prompt = {
    listen: 'Listen. What does it mean?',
    speak: 'Say it in Mandarin. Whispering or mouthing it counts.',
    read: 'Read it. Pinyin and meaning?',
  }[kind]

  return (
    <div className="card">
      <StepHeader title="Review" hint={prompt} right={<span className="count">{queue.length} left</span>} />
      {!revealed && (
        <div className="front" onClick={kind !== 'listen' ? reveal : undefined}>
          {kind === 'listen' && (
            <div className="center-col">
              <PlayButton k={t.key} text={t.zh} label="▶ play" autoPlay />
              <PlayButton k={t.key} text={t.zh} label="🐢 slow" slow />
              {w.kind === 'word' && <p className="hint">Focus word: listen for it in the sentence.</p>}
            </div>
          )}
          {kind === 'speak' && (
            <div className="center-col">
              <div className="meaning big">{t.en}</div>
              {w.kind === 'word' && <p className="hint">Key word: {w.en}</p>}
            </div>
          )}
          {kind === 'read' && <div className={`hanzi ${w.kind === 'phrase' ? 'phrase' : 'huge'}`}>{w.hanzi}</div>}
        </div>
      )}
      {revealed && <WordFace w={w} />}
      <div className="actions">
        {!revealed ? (
          <button className="primary wide" onClick={reveal}>Show answer</button>
        ) : (
          <div className="grades">
            <button className="g again" onClick={() => rate(Rating.Again)}>Again</button>
            <button className="g hard" onClick={() => rate(Rating.Hard)}>Hard</button>
            <button className="g good" onClick={() => rate(Rating.Good)}>Good</button>
            <button className="g easy" onClick={() => rate(Rating.Easy)}>Easy</button>
          </div>
        )}
      </div>
      {count > 0 && timeUp && <p className="hint center-text">{REVIEW_MINUTES} min reached — finishing after this card.</p>}
    </div>
  )
}

/* ---------------- New words & phrases (skip what you already know) ---------------- */

/** Cap on extra items pulled in per session when you mark things as known. */
const MAX_KNOWN = 20

function NewWords({ state, commit, onDone }: { state: AppState; commit: Commit; onDone: (ids: string[], known: number) => void }) {
  const [items, setItems] = useState(() => {
    const q = newQuota(state)
    return nextNewItems(state, q.words, q.phrases)
  })
  const [i, setI] = useState(0)
  // probe: audio only, "do you know it?" → check: reveal to confirm → teach: normal lesson
  const [phase, setPhase] = useState<'probe' | 'check' | 'teach'>('probe')
  const [shadowing, setShadowing] = useState(false)
  const [known, setKnown] = useState(0)

  useEffect(() => {
    if (items.length === 0) onDone([], 0)
  }, [items.length, onDone])
  if (items.length === 0) return null
  const w = items[i]
  const t = target(w)

  const shadow = async () => {
    setShadowing(true)
    for (const slow of [true, true, false, false]) {
      const p = play(t.key, t.zh, { slow })
      const e = epoch() // play() bumps the epoch; any later stop() changes it again
      await p
      await sleep(2500) // your turn: repeat it
      if (e !== epoch()) break
    }
    setShadowing(false)
  }

  const advance = (list: Word[], knownCount: number) => {
    stop()
    setPhase('probe')
    if (i + 1 < list.length) setI(i + 1)
    else onDone(list.map((x) => x.id), knownCount)
  }

  const knewIt = () => {
    commit((s) => {
      markKnown(s, w.id)
      logDay(s, { known: 1 })
    })
    // Known items don't use up today's quota: pull in the next one of the same kind.
    const extra = known < MAX_KNOWN
      ? nextNewItems(state, w.kind === 'word' ? 1 : 0, w.kind === 'phrase' ? 1 : 0, items.map((x) => x.id))
      : []
    const list = [...items, ...extra]
    setItems(list)
    setKnown(known + 1)
    advance(list, known + 1)
  }

  const learned = () => {
    commit((s) => {
      introduce(s, w.id)
      logDay(s, w.kind === 'word' ? { newWords: 1 } : { newPhrases: 1 })
    })
    advance(items, known)
  }

  const header = (
    <StepHeader
      title={w.kind === 'word' ? 'New word' : 'New phrase'}
      hint={{
        probe: 'Listen first. Do you already understand it?',
        check: 'Were you right?',
        teach: 'Hear it, read it, then shadow it (a whisper is fine).',
      }[phase]}
      right={<span className="count">{i + 1}/{items.length}</span>}
    />
  )

  if (phase === 'probe')
    return (
      <div className="card">
        {header}
        <div className="center-col">
          <PlayButton k={t.key} text={t.zh} label="▶ play" autoPlay />
          <PlayButton k={t.key} text={t.zh} label="🐢 slow" slow />
        </div>
        <div className="grades two">
          <button className="g good" onClick={() => setPhase('check')}>I know it</button>
          <button className="g again" onClick={() => setPhase('teach')}>New to me</button>
        </div>
      </div>
    )

  return (
    <div className="card">
      {header}
      <div className="unit">{w.unit}</div>
      <WordFace w={w} />
      {phase === 'check' ? (
        <div className="grades two">
          <button className="g good" onClick={knewIt}>Yes, knew it</button>
          <button className="g again" onClick={() => setPhase('teach')}>Not quite</button>
        </div>
      ) : (
        <div className="actions">
          <button className="secondary wide" onClick={shadow} disabled={shadowing}>
            {shadowing ? 'Repeat after each play…' : '🗣 Shadow ×4 (slow → normal)'}
          </button>
          <button className="primary wide" onClick={learned}>Got it →</button>
        </div>
      )}
    </div>
  )
}

/* ---------------- Recall drill (prompted recall, expanding intervals) ---------------- */

interface DrillItem { w: Word; hits: number }

/** Time to form the answer: longer sentences need longer. */
const thinkSeconds = (w: Word) => Math.min(12, Math.max(5, Math.round(2 + [...target(w).zh].length * 0.5)))

function Drill({ state, learnedNow, onDone }: { state: AppState; learnedNow: string[]; onDone: () => void }) {
  const [queue, setQueue] = useState<DrillItem[]>(() => {
    const recent = state.introduced.slice(-30).filter((id) => !learnedNow.includes(id) && WORD_BY_ID.has(id))
    const ids = [...learnedNow.slice(0, 12), ...shuffle(recent).slice(0, Math.max(3, 8 - learnedNow.length))]
    return ids.map((id) => ({ w: WORD_BY_ID.get(id)!, hits: 0 }))
  })
  const [phase, setPhase] = useState<'prompt' | 'answer'>('prompt')
  const [countdown, setCountdown] = useState(() => (queue[0] ? thinkSeconds(queue[0].w) : 0))
  const start = useRef(Date.now())

  useEffect(() => {
    if (queue.length === 0) onDone()
  }, [queue.length, onDone])

  useEffect(() => {
    if (phase !== 'prompt' || queue.length === 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [phase, queue])

  const item = queue[0]
  useEffect(() => {
    if (phase === 'prompt' && countdown <= 0 && item) {
      setPhase('answer')
      ;(async () => {
        const t = target(item.w)
        const p = play(t.key, t.zh)
        const e = epoch()
        await p
        await sleep(1500)
        if (e === epoch()) play(t.key, t.zh)
      })()
    }
  }, [countdown, phase, item])

  if (!item) return null
  const t = target(item.w)

  const mark = (ok: boolean) => {
    stop()
    const timeUp = Date.now() - start.current > 7 * 60 * 1000
    const next = (() => {
      const [cur, ...rest] = queue
      if (timeUp) return [] // 7-minute cap reached
      const hits = ok ? cur.hits + 1 : 0
      if (hits >= 2) return rest // retired: recalled twice with growing gaps
      const gap = ok ? 5 : 2 // expanding interval: short after a miss, longer after a hit
      const copy = [...rest]
      copy.splice(Math.min(gap, copy.length), 0, { ...cur, hits })
      return copy
    })()
    setQueue(next)
    // Reset together with the phase so the answer effect never sees a stale 0.
    if (next[0]) setCountdown(thinkSeconds(next[0].w))
    setPhase('prompt')
  }

  return (
    <div className="card">
      <StepHeader title="Speak" hint="Say the Mandarin before the answer plays. Whisper or mouth it if you need to." right={<span className="count">{queue.length} left</span>} />
      <div className="center-col">
        <div className="meaning big">{t.en}</div>
        {phase === 'prompt' ? (
          <>
            <div className="countdown">{countdown > 0 ? countdown : ''}</div>
            <button className="link" onClick={() => setCountdown(0)}>Skip wait</button>
          </>
        ) : (
          <div className="sentence">
            <div className="zh">{t.zh}</div>
            <div className="py">{t.py}</div>
            <PlayButton k={t.key} text={t.zh} label="▶ again" />
          </div>
        )}
      </div>
      {phase === 'answer' && (
        <div className="grades two">
          <button className="g again" onClick={() => mark(false)}>Missed</button>
          <button className="g good" onClick={() => mark(true)}>Said it</button>
        </div>
      )}
    </div>
  )
}

/* ---------------- Dialogue: listen → read → shadow ---------------- */

function pickDialogue(state: AppState) {
  const n = wordsLearned(state)
  const unlocked = DIALOGUES.filter((d) => d.unlockAfter <= n)
  if (unlocked.length === 0) return DIALOGUES[0]
  // Mostly the newest unlocked one; sometimes revisit an older one.
  return Math.random() < 0.6 ? unlocked[unlocked.length - 1] : unlocked[Math.floor(Math.random() * unlocked.length)]
}

function DialogueStep({ state, onDone }: { state: AppState; onDone: () => void }) {
  const learned = wordsLearned(state)
  const d = useMemo(() => pickDialogue(state), [learned]) // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [active, setActive] = useState(-1)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)

  const playAll = async (pause = 400) => {
    setPlaying(true)
    for (let i = 0; i < d.lines.length; i++) {
      setActive(i)
      const p = play(lineKey(d.id, i), d.lines[i].zh, { slow })
      const e = epoch()
      await p
      await sleep(pause)
      if (e !== epoch()) break
    }
    setActive(-1)
    setPlaying(false)
  }

  const hints = [
    'Listen with no text. How much do you catch?',
    'Listen again while reading.',
    'Shadow: repeat each line after it plays, whispering is fine (tap a line to replay).',
  ]

  return (
    <div className="card">
      <StepHeader title={d.title} hint={hints[phase]} right={<span className="count">{phase + 1}/3</span>} />
      {phase === 0 ? (
        <div className="center-col">
          <button className="play big" onClick={() => playAll()} disabled={playing}>{playing ? '…' : '▶'}</button>
        </div>
      ) : (
        <div className="dialogue">
          {d.lines.map((l, i) => (
            <div
              key={i}
              className={`line ${l.s === 'A' ? 'a' : 'b'} ${active === i ? 'active' : ''}`}
              onClick={() => play(lineKey(d.id, i), l.zh, { slow })}
            >
              <div className="zh">{l.zh}</div>
              <div className="py">{l.py}</div>
              <div className="en">{l.en}</div>
            </div>
          ))}
          <div className="row center">
            <button className="secondary" onClick={() => playAll(phase === 2 ? 3000 : 400)} disabled={playing}>
              {playing ? 'Playing…' : phase === 2 ? '▶ Play with pauses' : '▶ Play all'}
            </button>
            <label className="toggle"><input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> slow</label>
          </div>
        </div>
      )}
      <div className="actions">
        <button className="primary wide" onClick={() => { stop(); if (phase < 2) setPhase((phase + 1) as 1 | 2); else onDone() }}>
          {phase < 2 ? 'Next →' : 'Done →'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Tone drill ---------------- */

const TONE_LABELS = ['ˉ 1st', 'ˊ 2nd', 'ˇ 3rd', 'ˋ 4th']

function Tones({ onDone }: { onDone: () => void }) {
  const items = useMemo(() => shuffle(TONE_ITEMS).slice(0, 15), [])
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const w = items[i]
  const tone = toneOf(w.pinyin)

  const choose = (t: number) => {
    if (answer !== null) return
    setAnswer(t)
    if (t === tone) setScore((s) => s + 1)
  }
  const next = () => {
    setAnswer(null)
    if (i + 1 < items.length) setI(i + 1)
    else onDone()
  }

  return (
    <div className="card">
      <StepHeader title="Tones" hint="Which tone do you hear?" right={<span className="count">{i + 1}/{items.length} · {score}✓</span>} />
      <div className="center-col">
        <PlayButton k={wordKey(w.id)} text={w.hanzi} label="▶" autoPlay />
        {answer !== null && (
          <div className="word-face small">
            <div className="hanzi">{w.hanzi}</div>
            <div className="pinyin">{w.pinyin}</div>
            <div className="meaning">{w.en}</div>
          </div>
        )}
      </div>
      <div className="tones">
        {TONE_LABELS.map((lbl, idx) => {
          const t = idx + 1
          const cls = answer === null ? '' : t === tone ? 'right' : t === answer ? 'wrong' : ''
          return <button key={t} className={`tone ${cls}`} onClick={() => choose(t)}>{lbl}</button>
        })}
      </div>
      {answer !== null && <button className="primary wide" onClick={next}>Next →</button>}
      <p className="hint center-text">Tap ▶ as often as you like.</p>
    </div>
  )
}
