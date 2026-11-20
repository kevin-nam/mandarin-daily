import { useEffect, useRef, useState } from 'react'
import { MORE_TIME, WORD_BY_ID, target, thinkFor, type Stage, type Word } from './data'
import { epoch, play, sleep, stop, wordKey } from './audio'
import { Icon } from './icons'
import { Pinyin } from './Pinyin'
import { flagMissed, introducedToday, logDay, speakStage, weakestItems, type AppState } from './store'
import { useBurstState } from './burst'
import { usePauseClock } from './pause'
import { Burst, Countdown, PauseScreen, PlayButton, SpeakPrompt, SpokenAnswer, StepHeader, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void

/** About 5 minutes; anything left is covered by tomorrow's review. */
const RECALL_MINUTES = 7
const WEAK = 4
/** Seconds to think of a character's meaning. */
const READ_THINK = 5

interface Item { w: Word; stage: Stage; retry: boolean; read?: boolean }
const thinkTime = (it: Item) => (it.read ? READ_THINK : thinkFor(target(it.w, it.stage).zh))

/**
 * Quick recall, a few hours after the session (ideally before bed): first today's new words read
 * (character → meaning: reading is the weak skill, and a new character's first review the next day was
 * missed ~40% of the time), then the weakest older items and today's new ones said from memory.
 * Reading goes first so the spoken answers, which show the characters, don't give it away; the
 * weakest older items go between the two passes. Never graded; a missed spoken item moves to the
 * front of tomorrow's review.
 */
export default function Recall({ state, commit, onExit }: { state: AppState; commit: Commit; onExit: () => void }) {
  const [queue, setQueue] = useState(() => {
    // One order for both passes, with the older weak items between them, so each new word's read and
    // spoken turns are as far apart as possible (a read answer shows the pinyin and meaning).
    const fresh = shuffle(introducedToday(state))
    const say = (id: string): Item => ({ w: WORD_BY_ID.get(id)!, stage: speakStage(state, id), retry: false })
    const reads: Item[] = fresh.map((id) => WORD_BY_ID.get(id)!).filter((w) => w.kind === 'word')
      .map((w) => ({ w, stage: 'word', retry: false, read: true }))
    return [...reads, ...weakestItems(state, WEAK, fresh).map(say), ...fresh.map(say)]
  })
  const [total] = useState(queue.length)
  const [phase, setPhase] = useState<'prompt' | 'answer'>('prompt')
  const [countdown, setCountdown] = useState(() => (queue[0] ? thinkTime(queue[0]) : 0))
  const [got, setGot] = useState(0)
  const [missed, setMissed] = useState<Word[]>([])
  const left = useRef(countdown)
  const item = queue[0]
  const clock = usePauseClock(!!item)
  const [burst, fire] = useBurstState()
  const [turn, setTurn] = useState(0)
  // Seconds added with "More time" on the current item.
  const [extra, setExtra] = useState(0)

  /** Show the answer and play it twice. */
  const reveal = (it: Item) => {
    setPhase('answer')
    if (it.read) {
      play(wordKey(it.w.id), it.w.hanzi)
      return
    }
    const t = target(it.w, it.stage)
    ;(async () => {
      const p = play(t.key, t.zh)
      const e = epoch()
      await p
      await sleep(1500)
      if (e === epoch()) play(t.key, t.zh)
    })()
  }

  // The countdown drives the reveal from its own timer.
  useEffect(() => {
    if (phase !== 'prompt' || !item || clock.paused) return
    const t = setInterval(() => {
      left.current -= 1
      setCountdown(left.current)
      if (left.current <= 0) {
        clearInterval(t)
        reveal(item)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [phase, item, clock.paused])

  useEffect(() => () => stop(), [])

  const finish = () => {
    commit((s) => logDay(s, { recalled: total }))
    onExit()
  }

  const bar = (
    <header className="bar">
      <button className="icon-btn" onClick={() => (queue.length === 0 ? finish() : confirm('Stop the quick recall?') && finish())} aria-label="Close">
        <Icon name="close" />
      </button>
      <h1 className="bar-title">Quick recall</h1>
      {item ? (
        <button className="icon-btn" onClick={() => clock.pause()} aria-label="Pause"><Icon name="pause" /></button>
      ) : <span className="icon-btn" />}
    </header>
  )

  if (total === 0) {
    return (
      <div className="session">
        {bar}
        <div className="stage">
          <p className="body">Nothing new today to recall. Tomorrow’s review has you covered.</p>
        </div>
        <div className="dock"><button className="btn primary wide" onClick={onExit}>Back</button></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="session">
        {bar}
        <div className="stage done">
          {missed.length === 0 && <div className="done-mark" aria-hidden="true"><div className="done-seal hz" lang="zh-CN">好</div></div>}
          <h2>{got} of {total} recalled</h2>
          <p className="done-stats">
            {missed.length === 0
              ? 'Everything came back. Sleep on it.'
              : 'These come back in tomorrow’s review (the ones you couldn’t say come first):'}
          </p>
          {missed.length > 0 && (
            <ul className="panel list missed-list">
              {missed.map((w) => (
                <li key={w.id} className="list-row">
                  <span className="hz" lang="zh-CN">{w.hanzi}</span>
                  <span className="value">{w.en}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dock"><button className="btn primary wide" onClick={finish}>Done</button></div>
      </div>
    )
  }

  const t = target(item.w, item.stage)
  const mark = (ok: boolean) => {
    stop()
    const [cur, ...rest] = queue
    const timeUp = clock.active() > RECALL_MINUTES * 60 * 1000
    fire(ok ? 'good' : 'again')
    setTurn((n) => n + 1)
    if (ok) setGot((g) => g + (cur.retry ? 0 : 1))
    else if (!cur.retry) {
      // A missed character's read card is already due tomorrow (new today); a missed spoken item moves up.
      if (!cur.read) commit((s) => flagMissed(s, cur.w.id))
      setMissed((m) => (m.some((x) => x.id === cur.w.id) ? m : [...m, cur.w]))
    }
    // A miss comes back once at the end; time's up ends the round.
    const next = timeUp ? [] : !ok && !cur.retry ? [...rest, { ...cur, retry: true }] : rest
    setQueue(next)
    if (next[0]) setCountdown((left.current = thinkTime(next[0])))
    setExtra(0)
    setPhase('prompt')
  }

  return (
    <div className="session">
      {bar}
      <div className="stage turn" key={turn}>
        <StepHeader
          title={item.retry ? 'Once more' : item.read ? 'Read it' : 'From memory'}
          hint={item.read
            ? 'What does it mean? Nothing here changes your schedule.'
            : 'Say it in Mandarin before the answer plays. Whispering counts. Nothing here changes your schedule.'}
          right={<span className="num">{queue.length} left</span>}
        />
        <div className="center-col fill">
          {item.read ? <div className="hz prompt-hanzi word" lang="zh-CN">{item.w.hanzi}</div> : <SpeakPrompt w={item.w} stage={item.stage} />}
          {phase === 'prompt' ? (
            <Countdown key={`${turn}-${extra}`} value={countdown} total={thinkTime(item) + extra} paused={!!clock.paused} />
          ) : item.read ? (
            <div className="answer">
              <Pinyin text={item.w.pinyin} className="answer-py" />
              <div className="face-meaning">{item.w.en}</div>
              <PlayButton k={wordKey(item.w.id)} text={item.w.hanzi} label="Again" />
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
            <button className="btn wide" onClick={() => { setExtra((x) => x + MORE_TIME); setCountdown((left.current += MORE_TIME)) }}>More time</button>
            <button className="btn wide" onClick={() => { left.current = 0; setCountdown(0); reveal(item) }}>Show answer</button>
          </>
        ) : (
          <>
            {!item.read && !t.word && item.w.kind === 'word' && <p className="dock-note">Counts if you said {item.w.hanzi}, even if the rest of the sentence slipped.</p>}
            <button className="btn wide" onClick={() => mark(false)}>Missed it</button>
            <button className="btn primary wide" onClick={() => mark(true)}>Got it</button>
          </>
        )}
      </div>
      <Burst {...burst} />
      {clock.paused && (
        <PauseScreen why={clock.paused} onResume={clock.resume} endLabel="Stop the quick recall" onEnd={finish} />
      )}
    </div>
  )
}
