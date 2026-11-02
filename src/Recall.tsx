import { useEffect, useRef, useState } from 'react'
import { WORD_BY_ID, target, thinkFor, type Word } from './data'
import { epoch, play, sleep, stop } from './audio'
import { Icon } from './icons'
import { Pinyin } from './Pinyin'
import { flagMissed, introducedToday, logDay, weakestItems, type AppState } from './store'
import { usePauseClock } from './pause'
import { Countdown, PauseScreen, PlayButton, SpeakPrompt, SpokenAnswer, StepHeader, shuffle } from './ui'

type Commit = (fn: (s: AppState) => void) => void

/** About 5 minutes; anything left is covered by tomorrow's review. */
const RECALL_MINUTES = 6
const WEAK = 4

/**
 * Quick recall, a few hours after the session (ideally before bed): today's new items, then the
 * weakest older ones, speaking first. Never graded, so it can't push anything further out;
 * a miss moves the item to the front of tomorrow's review.
 */
export default function Recall({ state, commit, onExit }: { state: AppState; commit: Commit; onExit: () => void }) {
  const [queue, setQueue] = useState(() => {
    const fresh = introducedToday(state)
    const ids = [...shuffle(fresh), ...weakestItems(state, WEAK, fresh)]
    return ids.map((id) => ({ w: WORD_BY_ID.get(id)!, retry: false }))
  })
  const [total] = useState(queue.length)
  const [phase, setPhase] = useState<'prompt' | 'answer'>('prompt')
  const [countdown, setCountdown] = useState(() => (queue[0] ? thinkFor(target(queue[0].w).zh) : 0))
  const [got, setGot] = useState(0)
  const [missed, setMissed] = useState<Word[]>([])
  const left = useRef(countdown)
  const item = queue[0]
  const clock = usePauseClock(!!item)

  /** Show the answer and play it twice. */
  const reveal = (w: Word) => {
    setPhase('answer')
    const t = target(w)
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
        reveal(item.w)
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
          <h2>{got} of {total} recalled</h2>
          <p className="done-stats">
            {missed.length === 0
              ? 'Everything came back. Sleep on it.'
              : 'The ones you missed come first in tomorrow’s review:'}
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

  const t = target(item.w)
  const mark = (ok: boolean) => {
    stop()
    const [cur, ...rest] = queue
    const timeUp = clock.active() > RECALL_MINUTES * 60 * 1000
    if (ok) setGot((g) => g + (cur.retry ? 0 : 1))
    else if (!cur.retry) {
      commit((s) => flagMissed(s, cur.w.id))
      setMissed((m) => [...m, cur.w])
    }
    // A miss comes back once at the end; time's up ends the round.
    const next = timeUp ? [] : !ok && !cur.retry ? [...rest, { ...cur, retry: true }] : rest
    setQueue(next)
    if (next[0]) setCountdown((left.current = thinkFor(target(next[0].w).zh)))
    setPhase('prompt')
  }

  return (
    <div className="session">
      {bar}
      <div className="stage">
        <StepHeader
          title={item.retry ? 'Once more' : 'From memory'}
          hint="Say it in Mandarin before the answer plays. Whispering counts. Nothing here changes your schedule."
          right={<span className="num">{queue.length} left</span>}
        />
        <div className="center-col fill">
          <SpeakPrompt w={item.w} />
          {phase === 'prompt' ? (
            <Countdown value={countdown} total={thinkFor(t.zh)} />
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
          <button className="btn wide span" onClick={() => { left.current = 0; setCountdown(0); reveal(item.w) }}>Show the answer now</button>
        ) : (
          <>
            <button className="btn wide" onClick={() => mark(false)}>Missed it</button>
            <button className="btn primary wide" onClick={() => mark(true)}>Got it</button>
          </>
        )}
      </div>
      {clock.paused && (
        <PauseScreen why={clock.paused} onResume={clock.resume} endLabel="Stop the quick recall" onEnd={finish} />
      )}
    </div>
  )
}
