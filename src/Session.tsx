import { useEffect, useMemo, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { DIALOGUES, PAIR_ITEMS, TONE_ITEMS, TONE_VOICES, WORD_BY_ID, target, voiceKey, type Word } from './data'
import { epoch, lineKey, play, sleep, stop, wordKey } from './audio'
import {
  byRisk, dueKeys, grade, introduce, logDay, markKnown, newQuota, nextNewItems, parseKey, phrasesLearned, Rating,
  streak, wordsLearned, type AppState,
} from './store'
import { PlayButton, StepHeader, WordFace, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void
type StepId = 'reviews' | 'new' | 'drill' | 'dialogue' | 'tones' | 'done'

const STEPS: { id: StepId; label: string; minutes: number }[] = [
  { id: 'reviews', label: 'Review', minutes: 8 },
  { id: 'new', label: 'New words', minutes: 5 },
  { id: 'drill', label: 'Speak', minutes: 6 },
  { id: 'dialogue', label: 'Dialogue', minutes: 4 },
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
    if (kind === 'sentence') play(t.key, t.zh)
  }

  const prompt = {
    listen: 'Listen. What does it mean?',
    speak: 'Say it in Mandarin. Whispering or mouthing it counts.',
    read: 'Read it. Pinyin and meaning?',
    sentence: 'Read the sentence. What does it say?',
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
          {kind === 'sentence' && <div className="hanzi phrase">{w.sentence.zh}</div>}
        </div>
      )}
      {revealed && <WordFace w={w} />}
      <div className="actions">
        {!revealed ? (
          <button className="primary wide" onClick={reveal}>Show answer</button>
        ) : (
          <div className="grades">
            <button className="g again" onClick={() => rate(Rating.Again)}>Again<small>missed it</small></button>
            <button className="g hard" onClick={() => rate(Rating.Hard)}>Hard<small>got it, slowly</small></button>
            <button className="g good" onClick={() => rate(Rating.Good)}>Good<small>got it</small></button>
            <button className="g easy" onClick={() => rate(Rating.Easy)}>Easy<small>instantly</small></button>
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
const thinkFor = (zh: string) => Math.min(12, Math.max(5, Math.round(2 + [...zh].length * 0.5)))
const thinkSeconds = (w: Word) => thinkFor(target(w).zh)

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
    const timeUp = Date.now() - start.current > 6 * 60 * 1000
    const next = (() => {
      const [cur, ...rest] = queue
      if (timeUp) return [] // 6-minute cap reached
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
  const words = wordsLearned(state)
  const phrases = phrasesLearned(state)
  const unlocked = DIALOGUES.filter((d) => d.unlockAfter <= words && (d.unlockAfterPhrases ?? 0) <= phrases)
  if (unlocked.length === 0) return DIALOGUES[0]
  // Mostly the newest unlocked one; sometimes revisit an older one.
  return Math.random() < 0.6 ? unlocked[unlocked.length - 1] : unlocked[Math.floor(Math.random() * unlocked.length)]
}

function DialogueStep({ state, onDone }: { state: AppState; onDone: () => void }) {
  const learned = wordsLearned(state)
  const phrases = phrasesLearned(state)
  const d = useMemo(() => pickDialogue(state), [learned, phrases]) // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)
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

  // Role-play: the app plays the other speaker; you say your line before the model plays.
  const [me, setMe] = useState(d.you ?? 'B')
  const [line, setLine] = useState(-1)
  const [reveal, setReveal] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const run = useRef(0) // bumped to cancel a running role-play
  const skip = useRef(false)
  useEffect(() => () => { run.current++ }, [])

  const rolePlay = async () => {
    const id = ++run.current
    const live = () => run.current === id
    setPlaying(true)
    for (let i = 0; i < d.lines.length && live(); i++) {
      const l = d.lines[i]
      setLine(i)
      if (l.s === me) {
        setReveal(false)
        skip.current = false
        for (let s = thinkFor(l.zh); s > 0 && !skip.current && live(); s--) {
          setCountdown(s)
          await sleep(1000)
        }
        setCountdown(0)
        if (!live()) break
      }
      setReveal(true)
      await play(lineKey(d.id, i), l.zh, { slow })
      await sleep(l.s === me ? 1200 : 500)
    }
    if (live()) setPlaying(false)
  }

  const cancelRun = () => { run.current++; stop(); setPlaying(false) }

  const hints = [
    'Listen with no text. How much do you catch?',
    'Listen again while reading.',
    'Shadow: repeat each line after it plays, whispering is fine (tap a line to replay).',
    `Role-play: you're ${me}. Say your line from the English before the answer plays.`,
  ]
  const lastLine = line === d.lines.length - 1 && !playing

  return (
    <div className="card">
      <StepHeader title={d.title} hint={hints[phase]} right={<span className="count">{phase + 1}/4</span>} />
      {phase === 0 ? (
        <div className="center-col">
          <button className="play big" onClick={() => playAll()} disabled={playing}>{playing ? '…' : '▶'}</button>
        </div>
      ) : phase < 3 ? (
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
      ) : (
        <div className="dialogue">
          {d.lines.slice(0, line + 1).map((l, i) => {
            const hidden = i === line && l.s === me && !reveal
            return (
              <div key={i} className={`line ${l.s === 'A' ? 'a' : 'b'} ${l.s === me ? 'mine' : ''} ${i === line ? 'active' : ''}`}>
                {hidden ? (
                  <>
                    <div className="en big">{l.en}</div>
                    <div className="countdown">{countdown || ''}</div>
                    <button className="link" onClick={() => { skip.current = true }}>Skip wait</button>
                  </>
                ) : (
                  <>
                    <div className="zh">{l.zh}</div>
                    <div className="py">{l.py}</div>
                    <div className="en">{l.en}</div>
                  </>
                )}
              </div>
            )
          })}
          <div className="row center">
            {!playing && (
              <button className="secondary" onClick={rolePlay}>{line < 0 ? `▶ Start (you're ${me})` : '▶ Again'}</button>
            )}
            {(line < 0 || lastLine) && (
              <button className="secondary" onClick={() => { cancelRun(); setLine(-1); setMe(me === 'A' ? 'B' : 'A') }}>
                ⇄ Be {me === 'A' ? 'B' : 'A'}
              </button>
            )}
          </div>
        </div>
      )}
      <div className="actions">
        <button className="primary wide" onClick={() => { cancelRun(); if (phase < 3) setPhase((phase + 1) as 1 | 2 | 3); else onDone() }}>
          {phase < 3 ? 'Next →' : 'Done →'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Tone drill (single syllables, then two-syllable words; several voices) ---------------- */

const TONE_LABELS = ['ˉ 1st', 'ˊ 2nd', 'ˇ 3rd', 'ˋ 4th']
const randomVoice = () => Math.floor(Math.random() * TONE_VOICES)

function Tones({ onDone }: { onDone: () => void }) {
  // Each round in a random voice: hearing many speakers makes tone perception carry over.
  const items = useMemo(
    () => [...shuffle(TONE_ITEMS).slice(0, 6), ...shuffle(PAIR_ITEMS).slice(0, 9)]
      .map((w) => ({ w, voice: randomVoice() })),
    [],
  )
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<(number | undefined)[]>([])
  const [score, setScore] = useState(0)
  const { w, voice } = items[i]
  const tones = w.tones!
  const done = tones.every((_, k) => picks[k] !== undefined)

  const choose = (syllable: number, t: number) => {
    if (done) return
    const p = [...picks]
    p[syllable] = t
    setPicks(p)
    if (tones.every((x, k) => p[k] === x)) setScore((s) => s + 1)
  }
  const next = () => {
    setPicks([])
    if (i + 1 < items.length) setI(i + 1)
    else onDone()
  }

  return (
    <div className="card">
      <StepHeader
        title="Tones"
        hint={tones.length === 1 ? 'Which tone do you hear?' : 'Two syllables: pick the tone of each.'}
        right={<span className="count">{i + 1}/{items.length} · {score}✓</span>}
      />
      <div className="center-col">
        <PlayButton k={voiceKey(w.id, voice)} text={w.hanzi} label="▶" autoPlay />
        {done && (
          <div className="word-face small">
            <div className="hanzi">{w.hanzi}</div>
            <div className="pinyin">{w.pinyin}</div>
            <div className="meaning">{w.en}</div>
          </div>
        )}
      </div>
      {tones.map((tone, k) => (
        <div key={`${i}-${k}`}>
          {tones.length > 1 && <p className="hint">{k === 0 ? '1st syllable' : '2nd syllable'}</p>}
          <div className={`tones ${tones.length > 1 ? 'compact' : ''}`}>
            {TONE_LABELS.map((lbl, idx) => {
              const t = idx + 1
              const cls = !done ? (picks[k] === t ? 'picked' : '') : t === tone ? 'right' : t === picks[k] ? 'wrong' : ''
              return <button key={t} className={`tone ${cls}`} onClick={() => choose(k, t)}>{lbl}</button>
            })}
          </div>
        </div>
      ))}
      {done && <button className="primary wide" onClick={next}>Next →</button>}
      <p className="hint center-text">Tap ▶ as often as you like. The voice changes between rounds.</p>
    </div>
  )
}
