import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Grade } from 'ts-fsrs'
import {
  MORE_TIME, PAIR_ITEMS, PHRASES, TONE_ITEMS, TONE_VOICES, WORD_BY_ID, gradeNote, knownChars, target, thinkFor, voiceKey,
  type Stage, type Word,
} from './data'
import { epoch, lineKey, play, sleep, stop, wordKey } from './audio'
import {
  byRisk, dueKeys, grade, introduce, logDay, markKnown, newQuota, nextNewItems, parseKey, pickDialogue, recordDialogue, Rating,
  LADDER_PASS, LADDER_WINDOW, TONE_LEVELS, TONE_NAMES, ladderName, ladderRecent, ladderStep, readLapses, recordLadder, recordTones, speakStage, toneLevel, streak, toneErrors, toneFocus, trickyReads, untaughtIn, type AppState,
} from './store'
import { CharParts } from './CharParts'
import { LookAlikes } from './LookAlikes'
import { lookalikes } from './lookalike'
import { LISTEN_MINUTES, listeningToday } from './listening'
import { Icon } from './icons'
import { Pinyin, ToneContour } from './Pinyin'
import { BurstContext, STREAK_EVERY, useBurst, useBurstState } from './burst'
import { PauseContext, usePause, usePauseClock } from './pause'
import { Burst, Countdown, PauseScreen, PlayButton, SpeakPrompt, SpokenAnswer, StepHeader, Tally, WordFace, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void
type StepId = 'reviews' | 'new' | 'drill' | 'dialogue' | 'tones' | 'listen' | 'done'

const STEPS: { id: StepId; label: string; minutes: number }[] = [
  { id: 'reviews', label: 'Review', minutes: 12 },
  { id: 'new', label: 'New words', minutes: 5 },
  { id: 'drill', label: 'Speak', minutes: 8 },
  // Tones before the dialogue: the weakest skill goes before the step a short session can do without.
  { id: 'tones', label: 'Tones', minutes: 4 },
  { id: 'dialogue', label: 'Dialogue', minutes: 4 },
  { id: 'listen', label: 'Listening (optional)', minutes: LISTEN_MINUTES },
]

export default function Session({ state, commit, onExit }: { state: AppState; commit: Commit; onExit: () => void }) {
  const [step, setStep] = useState<StepId>('reviews')
  const [learnedNow, setLearnedNow] = useState<string[]>([])
  // Characters failed on a read card this session, read again in the drill.
  const [missedReads, setMissedReads] = useState<string[]>([])
  const [knownNow, setKnownNow] = useState(0)
  // For the end screen: how the reviews went, and where the tone ladder started today.
  const [reviewed, setReviewed] = useState({ n: 0, missed: 0 })
  const [toneStart] = useState(() => toneLevel(state))
  // Outside the app on purpose for listening, so only the other steps pause by themselves.
  const clock = usePauseClock(step !== 'listen' && step !== 'done')
  const { active } = clock
  const [burst, fire] = useBurstState()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor(active() / 1000)), 1000)
    return () => {
      clearInterval(t)
      stop()
    }
  }, [active])

  const next = () => {
    stop()
    const i = STEPS.findIndex((s) => s.id === step)
    setStep(i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : 'done')
  }

  const finish = () => {
    commit((s) => logDay(s, { minutes: Math.round(clock.active() / 60000), ...(step === 'done' && { finishedAt: new Date().toISOString() }) }))
    onExit()
  }

  // Read the clock again on pause, so an away pause shows the time it was taken back to.
  const secs = clock.paused ? Math.floor(clock.active() / 1000) : elapsed
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const over = secs > state.settings.sessionMinutes * 60
  const at = STEPS.findIndex((s) => s.id === step)

  return (
    <PauseContext.Provider value={clock}>
    <BurstContext.Provider value={fire}>
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
        {step === 'done' ? (
          <span className="timer num" aria-label={`Time ${mm}`}>{mm}</span>
        ) : (
          <button className={`timer num ${over ? 'over' : ''}`} onClick={() => clock.pause()} aria-label={`Pause. Time ${mm}`}>
            <Icon name="pause" size={18} />{mm}
          </button>
        )}
      </div>

      {step === 'reviews' && <Reviews state={state} commit={commit} onDone={next}
        onGraded={(missed) => setReviewed((r) => ({ n: r.n + 1, missed: r.missed + (missed ? 1 : 0) }))}
        onMissRead={(id) => setMissedReads((m) => (m.includes(id) ? m : [...m, id]))} />}
      {step === 'new' && (
        <NewWords state={state} commit={commit} onDone={(ids, known) => { setLearnedNow(ids); setKnownNow(known); next() }} />
      )}
      {step === 'drill' && <Drill state={state} learnedNow={learnedNow} missedReads={missedReads} onDone={next} />}
      {step === 'dialogue' && <DialogueStep state={state} commit={commit} onDone={next} />}
      {step === 'tones' && (toneLevel(state) < TONE_LEVELS.length
        ? <ToneLadder state={state} commit={commit} onDone={next} />
        : <Tones state={state} commit={commit} onDone={next} />)}
      {step === 'listen' && <Listening commit={commit} onDone={next} />}
      {step === 'done' && (
        <>
          <div className="stage done">
            <div className="done-mark" aria-hidden="true">
              <div className="done-seal hz" lang="zh-CN">好</div>
              <span className="splash">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': `${i * 36 + 8}deg`, '--d': `${54 + (i % 3) * 12}px` } as CSSProperties} />)}</span>
            </div>
            <h2>Done for today</h2>
            <p className="done-stats num">
              {streak(state)} {streak(state) === 1 ? 'day' : 'days'} in a row · {mm} · {learnedNow.length - knownNow} new
              {knownNow > 0 && ` · ${knownNow} already known`}
            </p>
            <TodaySummary state={state} reviewed={reviewed} toneStart={toneStart} missedReads={missedReads} />
            <UseToday state={state} learnedNow={learnedNow} />
            <p className="hint center-text">Next session tomorrow, after a night’s sleep.</p>
          </div>
          <div className="dock">
            <button className="btn primary wide" onClick={finish}>Finish</button>
          </div>
        </>
      )}
      <Burst {...burst} />
      {clock.paused && (
        <PauseScreen why={clock.paused} time={`${mm} so far`} onResume={clock.resume} endLabel="End session"
          onEnd={() => confirm('End the session? Progress so far is saved.') && finish()} />
      )}
    </div>
    </BurstContext.Provider>
    </PauseContext.Provider>
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

function Reviews({ state, commit, onDone, onGraded, onMissRead }: {
  state: AppState; commit: Commit; onDone: () => void; onGraded: (missed: boolean) => void; onMissRead: (id: string) => void
}) {
  const [queue, setQueue] = useState(() => reviewQueue(state))
  const [revealed, setRevealed] = useState(false)
  const [count, setCount] = useState(0)
  const clock = usePause()
  const fire = useBurst()
  const run = useRef(0)
  const [start] = useState(clock.active)
  const known = useMemo(() => knownChars(state.introduced), [state.introduced])

  useEffect(() => {
    if (queue.length === 0) onDone()
  }, [queue.length, onDone])
  if (queue.length === 0) return null

  const key = queue[0]
  const { wordId, kind } = parseKey(key)
  const w = WORD_BY_ID.get(wordId)!
  // Fixed per card (the grade changes the stage), so the answer matches what was asked.
  const stage: Stage = kind === 'speak' ? speakStage(state, wordId) : 'sentence'
  const t = target(w, stage)
  const note = gradeNote(w, kind, stage)
  const timeUp = clock.active() - start > REVIEW_MINUTES * 60 * 1000

  const rate = (r: Grade) => {
    commit((s) => {
      grade(s, key, r)
      logDay(s, { reviews: 1 })
    })
    onGraded(r === Rating.Again)
    if (r === Rating.Again && kind === 'read') onMissRead(wordId)
    if (r === Rating.Again) {
      run.current = 0
      fire('again')
    } else {
      run.current++
      fire(run.current % STREAK_EVERY === 0 ? 'streak' : 'good', run.current % STREAK_EVERY === 0 ? `${run.current} in a row` : undefined)
    }
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
    speak: t.word ? 'Say the word in Mandarin. Whispering or mouthing it counts.' : 'Say it in Mandarin. Whispering or mouthing it counts.',
    read: 'Read it. What does it mean? Tones don’t count here.',
    sentence: 'Read the sentence. What does it say?',
  }[kind]

  return (
    <>
    <div className="stage turn" key={count}>
      <StepHeader title="Review" hint={prompt} right={<span className="num">{queue.length} left</span>} />
      {!revealed && (
        <div className="front" onClick={kind !== 'listen' ? reveal : undefined}>
          {kind === 'listen' && (
            <div className="center-col">
              <PlayButton k={t.key} text={t.zh} size="hero" autoPlay />
              <PlayButton k={t.key} text={t.zh} slow />
              {w.kind === 'word' && <p className="hint">Get the gist. You’ll grade the word it’s built around.</p>}
            </div>
          )}
          {kind === 'speak' && (
            <div className="center-col">
              <SpeakPrompt w={w} stage={stage} />
            </div>
          )}
          {kind === 'read' && <div className={`hz prompt-hanzi ${w.kind}`} lang="zh-CN">{w.hanzi}</div>}
          {kind === 'sentence' && <div className="hz prompt-hanzi phrase" lang="zh-CN">{w.sentence.zh}</div>}
        </div>
      )}
      {revealed && (
        <WordFace
          w={w}
          // Phrase examples are context, not taught word by word: no glossary under them.
          fresh={w.kind === 'word' ? untaughtIn(state, w) : []}
          // The breakdown opens where the sentence is what was tested; elsewhere it's one tap away.
          structure={kind === 'listen' || kind === 'sentence' || (kind === 'speak' && !t.word) ? 'toggle' : 'closed'}
          // A read card's own help goes right under the character, above the sentence.
          aids={kind === 'read' ? <><LookAlikes w={w} state={state} /><CharParts hanzi={w.hanzi} known={known} /></> : undefined}
        />
      )}
      {revealed && kind === 'sentence' && <CharParts hanzi={w.hanzi} known={known} />}
    </div>
    <div className="dock">
      {count > 0 && timeUp && <p className="dock-note">{REVIEW_MINUTES} minutes reached: this is the last card.</p>}
      {revealed && note && <p className="dock-note">{note}</p>}
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
  const fire = useBurst()

  useEffect(() => {
    if (items.length === 0) onDone([], 0)
  }, [items.length, onDone])
  if (items.length === 0) return null
  const w = items[i]
  const t = target(w)

  // A word: the word twice, then its sentence twice (slow, then normal). A phrase: itself four times.
  const shadow = async () => {
    setShadowing(true)
    const word = target(w, 'word')
    const steps = word.word
      ? [{ c: word, slow: true }, { c: word, slow: false }, { c: t, slow: true }, { c: t, slow: false }]
      : [true, true, false, false].map((slow) => ({ c: t, slow }))
    for (const { c, slow } of steps) {
      const p = play(c.key, c.zh, { slow })
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
    fire('good')
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
      <WordFace
        w={w}
        fresh={untaughtIn(state, w)}
        structure={phase === 'teach' ? 'open' : 'closed'}
        // Reading is the weak skill: how the characters are built comes right after the word.
        aids={phase === 'teach' ? <CharParts hanzi={w.hanzi} known={knownChars(state.introduced)} /> : undefined}
      />
    </div>
    {phase === 'check' ? (
      <div className="dock pair">
        <button className="btn wide" onClick={() => setPhase('teach')}>Not quite</button>
        <button className="btn primary wide" onClick={knewIt}>Yes, I knew it</button>
      </div>
    ) : (
      <div className="dock">
        <button className={`btn wide ${shadowing ? 'live' : ''}`} onClick={shadow} disabled={shadowing}>
          {shadowing ? 'Your turn after each play…' : target(w, 'word').word ? 'Shadow: word ×2, then sentence ×2' : 'Shadow it 4 times, slow to normal'}
        </button>
        <button className="btn primary wide" onClick={learned}>Next</button>
      </div>
    )}
    </>
  )
}

/* ---------------- Recall drill (prompted recall, expanding intervals) ---------------- */

/**
 * `read`: a character to read (字 → meaning) instead of speak: one missed on a read card today, or
 * one missed often before (store.trickyReads). Each comes with its closest look-alike as a read item
 * of its own (`like`: the character it gets mixed up with), a couple of items apart, so the two are
 * told apart by recalling each, not by picking from a list (recall builds stronger memories).
 * `stage`: say the word alone, or its sentence (store.speakStage); today's new words are always words.
 * `retire`: recalls in a row that retire it.
 */
interface DrillItem { w: Word; hits: number; stage: Stage; retire: number; read?: 'missed' | 'tricky' | 'like'; like?: string }

const DRILL_MINUTES = 8
/** More retrievals in the first session improve long-term recall (Nakata 2017: 5+ beat 1-3). */
const RETIRE_AFTER = 3
/** A look-alike added for contrast is usually known already: two recalls are enough. */
const RETIRE_LIKE = 2

/** Recognising a character is quick; a short wait still makes you try before it's shown. */
const READ_SECONDS = 4
const MAX_READS = 8
const thinkSeconds = (it: DrillItem) => (it.read ? READ_SECONDS : thinkFor(target(it.w, it.stage).zh))

function Drill({ state, learnedNow, missedReads, onDone }: {
  state: AppState; learnedNow: string[]; missedReads: string[]; onDone: () => void
}) {
  const known = useMemo(() => knownChars(state.introduced), [state.introduced])
  const [queue, setQueue] = useState<DrillItem[]>(() => {
    const recent = state.introduced.slice(-30).filter((id) => !learnedNow.includes(id) && WORD_BY_ID.has(id))
    const ids = [...learnedNow.slice(0, 12), ...shuffle(recent).slice(0, Math.max(3, 8 - learnedNow.length))]
    const speak: DrillItem[] = ids.map((id) => ({ w: WORD_BY_ID.get(id)!, hits: 0, stage: speakStage(state, id), retire: RETIRE_AFTER }))
    const reads: DrillItem[] = []
    const taken = new Set<string>()
    for (const id of [...missedReads, ...trickyReads(state)]) {
      if (taken.has(id) || reads.length >= MAX_READS) continue
      const w = WORD_BY_ID.get(id)!
      taken.add(id)
      reads.push({ w, hits: 0, stage: 'word', retire: RETIRE_AFTER, read: missedReads.includes(id) ? 'missed' : 'tricky' })
      const twin = lookalikes(w, state.introduced, (x) => readLapses(state, x)).map((x) => x.w).find((x) => !taken.has(x.id))
      if (twin && reads.length < MAX_READS) {
        taken.add(twin.id)
        reads.push({ w: twin, hits: 0, stage: 'word', retire: RETIRE_LIKE, read: 'like', like: w.hanzi })
      }
    }
    // Every third item is a character to read, so both get spaced retrievals.
    const out: DrillItem[] = []
    while (speak.length || reads.length) out.push(...speak.splice(0, 2), ...reads.splice(0, 1))
    return out
  })
  const [phase, setPhase] = useState<'prompt' | 'answer'>('prompt')
  const [countdown, setCountdown] = useState(() => (queue[0] ? thinkSeconds(queue[0]) : 0))
  const clock = usePause()
  const [start] = useState(clock.active)
  const fire = useBurst()
  const [turn, setTurn] = useState(0)
  // Seconds added with "More time" on the current item (the ring restarts over the longer total).
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    if (queue.length === 0) onDone()
  }, [queue.length, onDone])

  useEffect(() => {
    if (phase !== 'prompt' || queue.length === 0 || clock.paused) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [phase, queue, clock.paused])

  const item = queue[0]
  useEffect(() => {
    if (phase === 'prompt' && countdown <= 0 && item) {
      setPhase('answer')
      if (item.read) {
        play(wordKey(item.w.id), item.w.hanzi)
        return
      }
      ;(async () => {
        const t = target(item.w, item.stage)
        const p = play(t.key, t.zh)
        const e = epoch()
        await p
        await sleep(1500)
        if (e === epoch()) play(t.key, t.zh)
      })()
    }
  }, [countdown, phase, item])

  if (!item) return null
  const t = target(item.w, item.stage)

  const mark = (ok: boolean) => {
    stop()
    const timeUp = clock.active() - start > DRILL_MINUTES * 60 * 1000
    const next = (() => {
      const [cur, ...rest] = queue
      if (timeUp) return [] // time cap reached
      const hits = ok ? cur.hits + 1 : 0
      if (hits >= cur.retire) return rest // retired: recalled 3 times with growing gaps
      const gap = ok ? 5 : 2 // expanding interval: short after a miss, longer after a hit
      const copy = [...rest]
      copy.splice(Math.min(gap, copy.length), 0, { ...cur, hits })
      return copy
    })()
    const hits = ok ? item.hits + 1 : 0
    if (!ok) fire('again')
    else if (hits >= item.retire) fire('retire', `${item.retire} of ${item.retire}`)
    else fire('good')
    setQueue(next)
    // Reset together with the phase so the answer effect never sees a stale 0.
    if (next[0]) setCountdown(thinkSeconds(next[0]))
    setExtra(0)
    setPhase('prompt')
    setTurn((n) => n + 1)
  }

  return (
    <>
    <div className="stage turn" key={turn}>
      {item.read ? (
        <StepHeader
          title="Read"
          hint={{
            missed: 'You missed this one earlier. What does it mean?',
            tricky: 'One you’ve often mixed up. What does it mean?',
            like: `Looks like ${item.like}. What does this one mean?`,
          }[item.read]}
          right={<span className="num">{queue.length} left</span>}
        />
      ) : (
        <StepHeader title="Speak" hint="Say it in Mandarin before the answer plays. Whispering or mouthing counts." right={<span className="num">{queue.length} left</span>} />
      )}
      <div className="center-col fill">
        {item.read ? (
          <div className={`hz prompt-hanzi ${item.w.kind}`} lang="zh-CN">{item.w.hanzi}</div>
        ) : (
          <SpeakPrompt w={item.w} stage={item.stage} />
        )}
        <Pips hits={item.hits} of={item.retire} />
        {phase === 'prompt' ? (
          <Countdown key={`${turn}-${extra}`} value={countdown} total={thinkSeconds(item) + extra} paused={!!clock.paused} />
        ) : item.read ? (
          <div className="answer">
            <Pinyin text={item.w.pinyin} className="answer-py" />
            <div className="prompt-en">{item.w.en}</div>
            <PlayButton k={wordKey(item.w.id)} text={item.w.hanzi} label="Again" />
            <LookAlikes w={item.w} state={state} />
            <CharParts hanzi={item.w.hanzi} known={known} />
          </div>
        ) : (
          <div className="answer">
            <SpokenAnswer w={item.w} stage={item.stage} />
            <Pinyin text={t.py} className="answer-py" />
            <PlayButton k={t.key} text={t.zh} label="Again" />
          </div>
        )}
      </div>
    </div>
    <div className="dock pair">
      {phase === 'prompt' ? (
        <>
          <button className="btn wide" onClick={() => { setExtra((x) => x + MORE_TIME); setCountdown((c) => c + MORE_TIME) }}>More time</button>
          <button className="btn wide" onClick={() => setCountdown(0)}>Show answer</button>
        </>
      ) : (
        <>
          {!item.read && !t.word && item.w.kind === 'word' && <p className="dock-note span">Counts if you said {item.w.hanzi}, even if the rest of the sentence slipped.</p>}
          <button className="btn wide" onClick={() => mark(false)}>Missed it</button>
          <button className="btn primary wide" onClick={() => mark(true)}>{item.read ? 'Knew it' : 'Said it'}</button>
        </>
      )}
    </div>
    </>
  )
}

/** Recalls so far out of the three that retire an item. */
function Pips({ hits, of }: { hits: number; of: number }) {
  return (
    <span className="pips" role="img" aria-label={`${hits} of ${of} recalls`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < hits ? 'on' : ''} />)}
    </span>
  )
}

/* ---------------- Dialogue: listen → read → shadow ---------------- */

function DialogueStep({ state, commit, onDone }: { state: AppState; commit: Commit; onDone: () => void }) {
  // Fixed for the step: finishing it records it, which would otherwise pick the next one mid-step.
  const [d] = useState(() => pickDialogue(state))
  const [last] = useState(() => state.dialogues?.[d.id])
  const finishDialogue = () => {
    commit((s) => recordDialogue(s, d.id))
    onDone()
  }
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)
  const [active, setActive] = useState(-1)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)
  // Reading along in Chinese only: with the English beside it, the eye goes to the English.
  const [english, setEnglish] = useState(false)

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
  const clock = usePause()
  useEffect(() => () => { run.current++ }, [])

  const [runs, setRuns] = useState(0)
  const rolePlay = async () => {
    setRuns((r) => r + 1)
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
          await clock.running()
        }
        setCountdown(0)
        if (!live()) break
      }
      setReveal(true)
      // A pause stops the audio mid-line; hear that line again on resume.
      let cut = true
      while (cut && live()) {
        await clock.running()
        const e = epoch()
        await play(lineKey(d.id, i), l.zh, { slow })
        cut = epoch() !== e + 1
      }
      await sleep(l.s === me ? 1200 : 500)
      await clock.running()
    }
    if (live()) setPlaying(false)
  }

  const cancelRun = () => { run.current++; stop(); setPlaying(false) }

  const hints = [
    'Listen with no text. How much do you catch?',
    'Listen again while reading the Chinese. English is a tap away if you need it.',
    'Shadow: repeat each line after it plays, whispering is fine (tap a line to replay).',
    `Role-play: you're ${me}. Say your line from the English before the answer plays.`,
  ]
  const lastLine = line === d.lines.length - 1 && !playing

  return (
    <>
    <div className="stage">
      <p className="dialogue-tag">
        {!last ? 'New dialogue' : last === '2000-01-01' ? 'Seen before' : `Last time ${new Date(`${last}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
      </p>
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
              {(phase !== 1 || english) && <div className="en">{l.en}</div>}
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
            {phase === 1 && (
              <label className="switch">
                <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} />
                <span>English</span>
              </label>
            )}
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
                      <Countdown key={`${runs}-${line}`} value={countdown} total={thinkFor(l.zh)} small paused={!!clock.paused} />
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
      <button className="btn primary wide" onClick={() => { cancelRun(); if (phase < 3) setPhase((phase + 1) as 1 | 2 | 3); else finishDialogue() }}>
        {phase < 3 ? ['Show the text', 'Shadow it', 'Role-play'][phase] : 'Finish dialogue'}
      </button>
    </div>
    </>
  )
}

/* ---------------- Tone drill (single syllables, then two-syllable words; several voices) ---------------- */

const randomVoice = () => Math.floor(Math.random() * TONE_VOICES)

/**
 * Draw n items, each weighted by its hardest tone, so the tones you miss come up more often
 * while every tone still appears (an easy tone keeps a base weight).
 */
function weightedPick(items: Word[], n: number, err: number[]) {
  const pool = items.map((w) => ({ w, weight: 0.1 + Math.max(...w.tones!.map((t) => err[t])) }))
  const out: Word[] = []
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((a, p) => a + p.weight, 0)
    const i = pool.findIndex((p) => (r -= p.weight) <= 0)
    out.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0].w)
  }
  return out
}

function Tones({ state, commit, onDone }: { state: AppState; commit: Commit; onDone: () => void }) {
  // Each round in a random voice: hearing many speakers makes tone perception carry over.
  const [items] = useState(() => {
    const err = toneErrors(state)
    return [...weightedPick(TONE_ITEMS, 6, err), ...weightedPick(PAIR_ITEMS, 9, err)]
      .map((w) => ({ w, voice: randomVoice() }))
  })
  const [focus] = useState(() => toneFocus(state))
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<(number | undefined)[]>([])
  const [score, setScore] = useState(0)
  const fire = useBurst()
  const streakRun = useRef(0)
  const { w, voice } = items[i]
  const tones = w.tones!
  const done = tones.every((_, k) => picks[k] !== undefined)

  const choose = (syllable: number, t: number) => {
    if (done) return
    const p = [...picks]
    p[syllable] = t
    setPicks(p)
    if (tones.some((_, k) => p[k] === undefined)) return
    commit((s) => recordTones(s, tones, p as number[]))
    if (tones.every((x, k) => p[k] === x)) {
      setScore((s) => s + 1)
      const n = ++streakRun.current
      fire(n % STREAK_EVERY === 0 ? 'streak' : 'good', n % STREAK_EVERY === 0 ? `${n} in a row` : undefined)
    } else streakRun.current = 0
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
        right={<span className="num">{i + 1} of {items.length} · <span key={score} className="tick">{score}</span> right</span>}
      />
      {focus && i === 0 && (
        <p className="tone-focus">
          More of the <b>{TONE_NAMES[focus.tone - 1]} tone</b> today: it’s the one you miss most, usually hearing it as the {TONE_NAMES[focus.as - 1]}.
        </p>
      )}
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

/* ---------------- Tone ladder (two tones at a time, then all four) ---------------- */

const LADDER_TRIALS = 30
const LADDER_MINUTES = 4
const toneless = (py: string) => py.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Trials for a level: single syllables with those tones, the tones taking turns at random, each in a random voice. */
function ladderTrials(level: number, n: number) {
  const tones = TONE_LEVELS[level]
  const by = tones.map((t) => TONE_ITEMS.filter((w) => w.tones![0] === t))
  return Array.from({ length: n }, () => {
    const pool = by[Math.floor(Math.random() * by.length)]
    return { w: pool[Math.floor(Math.random() * pool.length)], voice: randomVoice() }
  })
}

/** An example of `tone` to set beside what you heard: the same syllable if there is one (买 mǎi / 卖 mài). */
function contrastItem(heard: Word, tone: number) {
  const same = TONE_ITEMS.filter((w) => w.tones![0] === tone && toneless(w.pinyin) === toneless(heard.pinyin))
  const pool = same.length ? same : TONE_ITEMS.filter((w) => w.tones![0] === tone)
  return pool[Math.floor(Math.random() * pool.length)]
}

function ToneLadder({ state, commit, onDone }: { state: AppState; commit: Commit; onDone: () => void }) {
  const [level, setLevel] = useState(() => toneLevel(state))
  const [trials, setTrials] = useState(() => ladderTrials(level, LADDER_TRIALS))
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<number>()
  const [contrast, setContrast] = useState<Word>()
  const [levelUp, setLevelUp] = useState(false)
  const clock = usePause()
  const [start] = useState(clock.active)
  const fire = useBurst()
  const run = useRef(0)
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(advance.current), [])

  const { w, voice } = trials[i]
  const heard = w.tones![0]
  const recent = state.toneLadder?.level === level ? state.toneLadder.recent : []
  const right = recent.reduce((a, b) => a + b, 0)
  const choices = TONE_LEVELS[Math.min(level, TONE_LEVELS.length - 1)]
  const need = Math.round(LADDER_PASS * LADDER_WINDOW)
  const nextName = ladderName(level + 1)

  const next = () => {
    clearTimeout(advance.current)
    stop()
    setPick(undefined)
    setContrast(undefined)
    const timeUp = clock.active() - start > LADDER_MINUTES * 60 * 1000
    if (i + 1 >= trials.length || timeUp) onDone()
    else setI(i + 1)
  }

  const choose = (t: number) => {
    if (pick !== undefined) return
    setPick(t)
    const ok = t === heard
    // Worked out here as well as in the commit, which React may run later.
    const { up } = ladderStep(state.toneLadder, ok)
    commit((s) => {
      recordTones(s, [heard], [t])
      recordLadder(s, ok)
    })
    if (ok) {
      const n = ++run.current
      fire(n % STREAK_EVERY === 0 ? 'streak' : 'good', n % STREAK_EVERY === 0 ? `${n} in a row` : undefined)
    } else {
      run.current = 0
      // Hear the two side by side: what was played, then the tone you picked.
      const c = contrastItem(w, t)
      setContrast(c)
      ;(async () => {
        await sleep(300)
        const p = play(voiceKey(w.id, voice), w.hanzi)
        const e = epoch()
        await p
        await sleep(600)
        if (e === epoch()) play(voiceKey(c.id, voice), c.hanzi)
      })()
    }
    if (up) {
      const nl = level + 1
      setLevelUp(true)
      setLevel(nl)
      // The rest of today's trials move to the new level (or end, past the last pair).
      if (nl < TONE_LEVELS.length) setTrials((tr) => [...tr.slice(0, i + 1), ...ladderTrials(nl, tr.length - i - 1)])
      return
    }
    if (ok) advance.current = setTimeout(next, 750)
  }

  if (levelUp) {
    const finished = level >= TONE_LEVELS.length
    return (
      <>
        <div className="stage done">
          <div className="done-mark" aria-hidden="true"><div className="done-seal hz" lang="zh-CN">好</div></div>
          <h2>{finished ? 'All four tones' : 'Next level'}</h2>
          <p className="done-stats">
            {finished
              ? 'You can tell all four apart. From tomorrow the drill adds two-syllable words.'
              : `${Math.round(LADDER_PASS * 100)}% right over your last ${LADDER_WINDOW}. Now: ${ladderName(level)}.`}
          </p>
        </div>
        <div className="dock">
          <button className="btn primary wide" onClick={() => { setLevelUp(false); if (finished) onDone(); else next() }}>
            {finished ? 'Finish tones' : 'Continue'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
    <div className="stage">
      <StepHeader
        title="Tones"
        hint={choices.length === 2 ? `Two tones at a time: ${ladderName(level)}. Which one do you hear?` : 'All four tones. Which one do you hear?'}
        right={<span className="num">{i + 1} of {trials.length}</span>}
      />
      <div
        className="ladder-meter"
        role="img"
        aria-label={`Step ${level + 1} of ${TONE_LEVELS.length}. ${right} of your last ${recent.length} answers right. ${need} of ${LADDER_WINDOW} unlocks ${nextName}.`}
      >
        <div className="ladder-head">
          <b>Step {level + 1} of {TONE_LEVELS.length}</b>
          <span>Next: {nextName}</span>
        </div>
        <Tally recent={recent} of={LADDER_WINDOW} />
        <p>{need} right out of your last {LADDER_WINDOW} unlocks the next step.</p>
      </div>
      <div className="center-col tone-stage">
        {pick === undefined ? (
          <PlayButton key={i} k={voiceKey(w.id, voice)} text={w.hanzi} size="hero" autoPlay />
        ) : (
          <div className="tone-answer">
            <div className="hz" lang="zh-CN">{w.hanzi}</div>
            <Pinyin text={w.pinyin} />
            <div className="en">{w.en}</div>
          </div>
        )}
      </div>
      <div className={`tones ${choices.length === 2 ? 'two' : ''}`}>
        {choices.map((t) => {
          const cls = pick === undefined ? '' : t === heard ? 'right' : t === pick ? 'wrong' : 'dim'
          return (
            <button key={t} className={`tone ${cls}`} onClick={() => choose(t)} aria-label={`${TONE_NAMES[t - 1]} tone`}>
              <ToneContour tone={t} />
              <span>{TONE_NAMES[t - 1]}</span>
            </button>
          )
        })}
      </div>
      {contrast && pick !== undefined && (
        <div className="tone-contrast">
          <p className="hint">Hear them side by side:</p>
          <div className="contrast-row">
            <div className="contrast-item">
              <small>You heard · {TONE_NAMES[heard - 1]}</small>
              <span className="hz" lang="zh-CN">{w.hanzi}</span>
              <Pinyin text={w.pinyin} />
              <ToneContour tone={heard} />
              <PlayButton k={voiceKey(w.id, voice)} text={w.hanzi} />
            </div>
            <div className="contrast-item">
              <small>You picked · {TONE_NAMES[pick - 1]}</small>
              <span className="hz" lang="zh-CN">{contrast.hanzi}</span>
              <Pinyin text={contrast.pinyin} />
              <ToneContour tone={pick} />
              <PlayButton k={voiceKey(contrast.id, voice)} text={contrast.hanzi} />
            </div>
          </div>
        </div>
      )}
    </div>
    {contrast && pick !== undefined && <div className="dock"><button className="btn primary wide" onClick={next}>Next</button></div>}
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

/* ---------------- Today, at the end ---------------- */

/** How the session went, in three lines: reviews, the tone ladder, characters to watch. */
function TodaySummary({ state, reviewed, toneStart, missedReads }: {
  state: AppState; reviewed: { n: number; missed: number }; toneStart: number; missedReads: string[]
}) {
  const level = toneLevel(state)
  const recent = ladderRecent(state)
  const right = recent.reduce((a, b) => a + b, 0)
  const rows = [
    reviewed.n > 0 && (
      <div key="r" className="list-row">
        <span>Reviews</span>
        <span className="value num">{reviewed.n} · {reviewed.missed === 0 ? 'none missed' : `${reviewed.missed} missed`}</span>
      </div>
    ),
    toneStart < TONE_LEVELS.length && (
      <div key="t" className="list-row">
        <span>Tones</span>
        <span className="value num">
          {level > toneStart ? `Up to ${ladderName(level)}` : `${right} of last ${recent.length} right`}
        </span>
      </div>
    ),
    missedReads.length > 0 && (
      <div key="m" className="list-row watch">
        <span>Back tomorrow</span>
        <span className="value">
          {missedReads.map((id) => <span key={id} className="hz" lang="zh-CN">{WORD_BY_ID.get(id)?.hanzi}</span>)}
        </span>
      </div>
    ),
  ].filter(Boolean)
  if (rows.length === 0) return null
  return <section className="panel list today-summary" aria-label="Today">{rows}</section>
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
