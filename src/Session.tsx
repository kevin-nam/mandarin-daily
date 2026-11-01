import { useEffect, useMemo, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { DIALOGUES, PAIR_ITEMS, PHRASES, TONE_ITEMS, TONE_VOICES, WORD_BY_ID, knownChars, target, thinkFor, voiceKey, type Word } from './data'
import { epoch, lineKey, play, sleep, stop, wordKey } from './audio'
import {
  byRisk, dueKeys, grade, introduce, logDay, markKnown, newQuota, nextNewItems, parseKey, phrasesLearned, Rating,
  streak, wordsLearned, type AppState,
} from './store'
import { CharParts } from './CharParts'
import { LISTEN_MINUTES, listeningToday } from './listening'
import { Icon } from './icons'
import { Pinyin, ToneContour } from './Pinyin'
import { Countdown, PlayButton, SpeakPrompt, SpokenAnswer, StepHeader, WordFace, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void
type StepId = 'reviews' | 'new' | 'drill' | 'dialogue' | 'tones' | 'listen' | 'done'

const STEPS: { id: StepId; label: string; minutes: number }[] = [
  { id: 'reviews', label: 'Review', minutes: 12 },
  { id: 'new', label: 'New words', minutes: 5 },
  { id: 'drill', label: 'Speak', minutes: 8 },
  { id: 'dialogue', label: 'Dialogue', minutes: 4 },
  { id: 'tones', label: 'Tones', minutes: 2 },
  { id: 'listen', label: 'Listening (optional)', minutes: LISTEN_MINUTES },
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
    commit((s) => logDay(s, { minutes: Math.round(elapsed / 60), ...(step === 'done' && { finishedAt: new Date().toISOString() }) }))
    onExit()
  }

  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const over = elapsed > state.settings.sessionMinutes * 60
  const at = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="session">
      <div className="session-bar">
        <button
          className="icon-btn"
          aria-label={step === 'done' ? 'Finish' : 'End session'}
          onClick={step === 'done' ? finish : () => confirm('End the session? Progress so far is saved.') && finish()}
        >
          <Icon name="close" />
        </button>
        <div className="steps" aria-label={at >= 0 ? `Step ${at + 1} of ${STEPS.length}: ${STEPS[at].label}` : 'Done'}>
          <div className="segments" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={at < 0 || i < at ? 'past' : i === at ? 'now' : ''} />
            ))}
          </div>
          <span className="step-name num">{at >= 0 ? `${at + 1} of ${STEPS.length}` : 'Done'}</span>
        </div>
        <span className={`timer num ${over ? 'over' : ''}`} aria-label={`Time ${mm}`}>{mm}</span>
      </div>

      {step === 'reviews' && <Reviews state={state} commit={commit} onDone={next} />}
      {step === 'new' && (
        <NewWords state={state} commit={commit} onDone={(ids, known) => { setLearnedNow(ids); setKnownNow(known); next() }} />
      )}
      {step === 'drill' && <Drill state={state} learnedNow={learnedNow} onDone={next} />}
      {step === 'dialogue' && <DialogueStep state={state} onDone={next} />}
      {step === 'tones' && <Tones onDone={next} />}
      {step === 'listen' && <Listening commit={commit} onDone={next} />}
      {step === 'done' && (
        <>
          <div className="stage done">
            <div className="done-seal hz" lang="zh-CN" aria-hidden="true">好</div>
            <h2>Done for today</h2>
            <p className="done-stats num">
              {streak(state)} {streak(state) === 1 ? 'day' : 'days'} in a row · {mm} · {learnedNow.length - knownNow} new
              {knownNow > 0 && ` · ${knownNow} already known`}
            </p>
            <UseToday state={state} learnedNow={learnedNow} />
            <p className="hint center-text">Next session tomorrow, after a night’s sleep.</p>
          </div>
          <div className="dock">
            <button className="btn primary wide" onClick={finish}>Finish</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Reviews ---------------- */

const REVIEW_MINUTES = 12

/**
 * Due cards, most at risk of being forgotten first (only ~80 fit in the time cap), with
 * speak cards prioritised (2 speak : 1 other) so the main gap gets the most time, still interleaved.
 */
function reviewQueue(state: AppState) {
  // Items missed in a quick recall go first; then most at risk.
  const flagged = (k: string) => parseKey(k).kind === 'speak' && !!state.flagged?.[parseKey(k).wordId]
  const ranked = byRisk(state, dueKeys(state))
  const due = [...ranked.filter(flagged), ...ranked.filter((k) => !flagged(k))].slice(0, 80)
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
  const known = useMemo(() => knownChars(state.introduced), [state.introduced])

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
    <>
    <div className="stage">
      <StepHeader title="Review" hint={prompt} right={<span className="num">{queue.length} left</span>} />
      {!revealed && (
        <div className="front" onClick={kind !== 'listen' ? reveal : undefined}>
          {kind === 'listen' && (
            <div className="center-col">
              <PlayButton k={t.key} text={t.zh} size="hero" autoPlay />
              <PlayButton k={t.key} text={t.zh} slow />
              {w.kind === 'word' && <p className="hint">Listen for the focus word in the sentence.</p>}
            </div>
          )}
          {kind === 'speak' && (
            <div className="center-col">
              <SpeakPrompt w={w} />
            </div>
          )}
          {kind === 'read' && <div className={`hz prompt-hanzi ${w.kind}`} lang="zh-CN">{w.hanzi}</div>}
          {kind === 'sentence' && <div className="hz prompt-hanzi phrase" lang="zh-CN">{w.sentence.zh}</div>}
        </div>
      )}
      {revealed && <WordFace w={w} />}
      {revealed && (kind === 'read' || kind === 'sentence') && <CharParts hanzi={w.hanzi} known={known} />}
    </div>
    <div className="dock">
      {count > 0 && timeUp && <p className="dock-note">{REVIEW_MINUTES} minutes reached: this is the last card.</p>}
      {!revealed ? (
        <button className="btn primary wide" onClick={reveal}>Show answer</button>
      ) : (
        <div className="grades" role="group" aria-label="How well did you know it?">
          <button className="grade again" onClick={() => rate(Rating.Again)}>Again<small>missed it</small></button>
          <button className="grade" onClick={() => rate(Rating.Hard)}>Hard<small>with effort</small></button>
          <button className="grade" onClick={() => rate(Rating.Good)}>Good<small>got it</small></button>
          <button className="grade" onClick={() => rate(Rating.Easy)}>Easy<small>instantly</small></button>
        </div>
      )}
    </div>
    </>
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
      right={<span className="num">{i + 1} of {items.length}</span>}
    />
  )

  if (phase === 'probe')
    return (
      <>
        <div className="stage">
          {header}
          <div className="center-col fill">
            <PlayButton k={t.key} text={t.zh} size="hero" autoPlay />
            <PlayButton k={t.key} text={t.zh} slow />
          </div>
        </div>
        <div className="dock pair">
          <button className="btn wide" onClick={() => setPhase('teach')}>New to me</button>
          <button className="btn primary wide" onClick={() => setPhase('check')}>I know it</button>
        </div>
      </>
    )

  return (
    <>
    <div className="stage">
      {header}
      <p className="unit">{w.unit}</p>
      <WordFace w={w} />
      {phase === 'teach' && <CharParts hanzi={w.hanzi} known={knownChars(state.introduced)} />}
    </div>
    {phase === 'check' ? (
      <div className="dock pair">
        <button className="btn wide" onClick={() => setPhase('teach')}>Not quite</button>
        <button className="btn primary wide" onClick={knewIt}>Yes, I knew it</button>
      </div>
    ) : (
      <div className="dock">
        <button className={`btn wide ${shadowing ? 'live' : ''}`} onClick={shadow} disabled={shadowing}>
          {shadowing ? 'Your turn after each play…' : 'Shadow it 4 times, slow to normal'}
        </button>
        <button className="btn primary wide" onClick={learned}>Next</button>
      </div>
    )}
    </>
  )
}

/* ---------------- Recall drill (prompted recall, expanding intervals) ---------------- */

interface DrillItem { w: Word; hits: number }

const DRILL_MINUTES = 8
/** More retrievals in the first session improve long-term recall (Nakata 2017: 5+ beat 1-3). */
const RETIRE_AFTER = 3

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
    const timeUp = Date.now() - start.current > DRILL_MINUTES * 60 * 1000
    const next = (() => {
      const [cur, ...rest] = queue
      if (timeUp) return [] // time cap reached
      const hits = ok ? cur.hits + 1 : 0
      if (hits >= RETIRE_AFTER) return rest // retired: recalled 3 times with growing gaps
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
    <>
    <div className="stage">
      <StepHeader title="Speak" hint="Say it in Mandarin before the answer plays. Whispering or mouthing counts." right={<span className="num">{queue.length} left</span>} />
      <div className="center-col fill">
        <SpeakPrompt w={item.w} />
        {phase === 'prompt' ? (
          <Countdown value={countdown} total={thinkSeconds(item.w)} />
        ) : (
          <div className="answer">
            <SpokenAnswer w={item.w} />
            <Pinyin text={t.py} className="answer-py" />
            <PlayButton k={t.key} text={t.zh} label="Again" />
          </div>
        )}
      </div>
    </div>
    <div className="dock pair">
      {phase === 'prompt' ? (
        <button className="btn wide span" onClick={() => setCountdown(0)}>Show the answer now</button>
      ) : (
        <>
          <button className="btn wide" onClick={() => mark(false)}>Missed it</button>
          <button className="btn primary wide" onClick={() => mark(true)}>Said it</button>
        </>
      )}
    </div>
    </>
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
    <>
    <div className="stage">
      <StepHeader title={d.title} hint={hints[phase]} right={<span className="num">{phase + 1} of 4</span>} />
      {phase === 0 ? (
        <div className="center-col fill">
          <button className={`play hero round ${playing ? 'busy' : ''}`} onClick={() => playAll()} disabled={playing} aria-label="Play the dialogue">
            <Icon name="play" size={34} />
          </button>
          <p className="hint">{playing ? 'Listening…' : 'No text yet: just listen.'}</p>
        </div>
      ) : phase < 3 ? (
        <div className="dialogue">
          {d.lines.map((l, i) => (
            <div
              key={i}
              className={`line ${l.s === 'A' ? 'a' : 'b'} ${active === i ? 'active' : ''}`}
              onClick={() => play(lineKey(d.id, i), l.zh, { slow })}
              role="button"
              tabIndex={0}
              aria-label={`Play line ${i + 1}`}
            >
              <span className="speaker">{l.s}</span>
              <div className="hz zh" lang="zh-CN">{l.zh}</div>
              <Pinyin text={l.py} />
              <div className="en">{l.en}</div>
            </div>
          ))}
          <div className="controls">
            <button className="btn" onClick={() => playAll(phase === 2 ? 3000 : 400)} disabled={playing}>
              <Icon name="play" size={18} /> {playing ? 'Playing…' : phase === 2 ? 'Play with pauses' : 'Play all'}
            </button>
            <label className="switch">
              <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
              <span>Slow</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="dialogue">
          {d.lines.slice(0, line + 1).map((l, i) => {
            const hidden = i === line && l.s === me && !reveal
            return (
              <div key={i} className={`line ${l.s === 'A' ? 'a' : 'b'} ${l.s === me ? 'mine' : ''} ${i === line ? 'active' : ''}`}>
                <span className="speaker">{l.s === me ? 'You' : l.s}</span>
                {hidden ? (
                  <>
                    <div className="en big">{l.en}</div>
                    <div className="your-turn">
                      <Countdown value={countdown} total={thinkFor(l.zh)} small />
                      <button className="btn small" onClick={() => { skip.current = true }}>Show it</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hz zh" lang="zh-CN">{l.zh}</div>
                    <Pinyin text={l.py} />
                    <div className="en">{l.en}</div>
                  </>
                )}
              </div>
            )
          })}
          <div className="controls">
            {!playing && (
              <button className="btn" onClick={rolePlay}>
                <Icon name="play" size={18} /> {line < 0 ? `Start as ${me}` : 'Run it again'}
              </button>
            )}
            {(line < 0 || lastLine) && (
              <button className="btn ghost" onClick={() => { cancelRun(); setLine(-1); setMe(me === 'A' ? 'B' : 'A') }}>
                <Icon name="swap" size={18} /> Be {me === 'A' ? 'B' : 'A'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
    <div className="dock">
      <button className="btn primary wide" onClick={() => { cancelRun(); if (phase < 3) setPhase((phase + 1) as 1 | 2 | 3); else onDone() }}>
        {phase < 3 ? ['Show the text', 'Shadow it', 'Role-play'][phase] : 'Finish dialogue'}
      </button>
    </div>
    </>
  )
}

/* ---------------- Tone drill (single syllables, then two-syllable words; several voices) ---------------- */

const TONE_NAMES = ['1st', '2nd', '3rd', '4th']
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
    <>
    <div className="stage">
      <StepHeader
        title="Tones"
        hint={tones.length === 1 ? 'Which tone do you hear?' : 'Two syllables: pick the tone of each.'}
        right={<span className="num">{i + 1} of {items.length} · {score} right</span>}
      />
      <div className="center-col tone-stage">
        {done ? (
          <div className="tone-answer">
            <div className="hz" lang="zh-CN">{w.hanzi}</div>
            <Pinyin text={w.pinyin} />
            <div className="en">{w.en}</div>
          </div>
        ) : (
          <PlayButton k={voiceKey(w.id, voice)} text={w.hanzi} size="hero" autoPlay />
        )}
        {done && <PlayButton k={voiceKey(w.id, voice)} text={w.hanzi} label="Hear it again" />}
      </div>
      {tones.map((tone, k) => (
        <div key={`${i}-${k}`} className="tone-group">
          {tones.length > 1 && <p className="tone-group-label">{k === 0 ? 'First syllable' : 'Second syllable'}</p>}
          <div className={`tones ${tones.length > 1 ? 'compact' : ''}`}>
            {TONE_NAMES.map((name, idx) => {
              const t = idx + 1
              const cls = !done ? (picks[k] === t ? 'picked' : '') : t === tone ? 'right' : t === picks[k] ? 'wrong' : 'dim'
              return (
                <button key={t} className={`tone ${cls}`} onClick={() => choose(k, t)} aria-label={`${name} tone`} aria-pressed={picks[k] === t}>
                  <ToneContour tone={t} />
                  <span>{name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
    {done && <div className="dock"><button className="btn primary wide" onClick={next}>{i + 1 < items.length ? 'Next' : 'Finish tones'}</button></div>}
    </>
  )
}

/* ---------------- Easy listening (optional, outside the app) ---------------- */

function Listening({ commit, onDone }: { commit: Commit; onDone: () => void }) {
  const r = listeningToday()
  const listened = () => {
    commit((s) => logDay(s, { listened: LISTEN_MINUTES }))
    onDone()
  }
  return (
    <>
    <div className="stage">
      <StepHeader title="Easy listening" hint={`Optional, about ${LISTEN_MINUTES} minutes. Now or later today.`} />
      <p className="body">
        Watch one beginner video in Mandarin. Don’t try to understand every word: following the gist is the point.
      </p>
      <a className="listen-link" href={r.url} target="_blank" rel="noreferrer">
        <Icon name="headphones" size={26} />
        <span className="listen-text"><b>{r.name}</b><span>{r.note}</span></span>
        <Icon name="external" size={18} />
      </a>
      <p className="hint">Opens YouTube; needs internet.</p>
    </div>
    <div className="dock pair">
      <button className="btn wide" onClick={onDone}>Later</button>
      <button className="btn primary wide" onClick={listened}>I listened</button>
    </div>
    </>
  )
}

/* ---------------- Use it today ---------------- */

/** One phrase to use for real today: one learned this session if any, else one from before (same all day). */
function todayPhrase(state: AppState, learnedNow: string[]) {
  const learned = PHRASES.filter((p) => state.introduced.includes(p.id))
  const fresh = learned.filter((p) => learnedNow.includes(p.id))
  const pool = fresh.length ? fresh : learned
  if (!pool.length) return undefined
  return pool[new Date().getDate() % pool.length]
}

function UseToday({ state, learnedNow }: { state: AppState; learnedNow: string[] }) {
  const p = todayPhrase(state, learnedNow)
  if (!p) return null
  return (
    <section className="use-today">
      <h3>Use it today</h3>
      <div className="use-row">
        <div>
          <div className="hz zh" lang="zh-CN">{p.hanzi}</div>
          <Pinyin text={p.pinyin} />
          <div className="en">{p.en}</div>
        </div>
        <PlayButton k={p.id} text={p.hanzi} />
      </div>
      <p className="hint">Say it to someone, or to yourself when the moment comes up.</p>
    </section>
  )
}
