import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { lastSound, sleep, stop } from './audio'

/** No tap and no audio for this long means you've stepped away. */
export const AWAY_AFTER_MS = 2 * 60 * 1000

/** Why it paused: you tapped pause, went quiet, or left the app. */
export type PauseReason = 'tap' | 'away' | 'left'

export interface PauseClock {
  paused: PauseReason | null
  pause: (why?: PauseReason) => void
  resume: () => void
  /** Milliseconds of active time so far; paused time doesn't count. */
  active: () => number
  /** Resolves once the clock is running again (at once if it is). */
  running: () => Promise<void>
}

/**
 * A session clock that stops while paused. With `auto`, it pauses itself when you leave the app
 * or go quiet for AWAY_AFTER_MS, and the quiet stretch is taken back off the clock.
 */
export function usePauseClock(auto: boolean): PauseClock {
  const [start] = useState(Date.now)
  const pausedFor = useRef(0)
  const pausedAt = useRef<number | null>(null)
  const lastTouch = useRef(start)
  const [paused, setPaused] = useState<PauseReason | null>(null)

  const active = useCallback(() => (pausedAt.current ?? Date.now()) - start - pausedFor.current, [start])

  const pauseAt = useCallback((why: PauseReason, at: number) => {
    if (pausedAt.current !== null) return
    stop()
    pausedAt.current = at
    setPaused(why)
  }, [])
  const pause = useCallback((why: PauseReason = 'tap') => pauseAt(why, Date.now()), [pauseAt])

  const resume = useCallback(() => {
    if (pausedAt.current === null) return
    pausedFor.current += Date.now() - pausedAt.current
    pausedAt.current = null
    lastTouch.current = Date.now()
    setPaused(null)
  }, [])

  const gone = useRef(false)
  useEffect(() => {
    gone.current = false
    return () => { gone.current = true }
  }, [])
  const running = useCallback(async () => {
    while (pausedAt.current !== null && !gone.current) await sleep(250)
  }, [])

  useEffect(() => {
    if (!auto) return
    lastTouch.current = Date.now()
    const touched = () => { lastTouch.current = Date.now() }
    const left = () => { if (document.hidden) pauseAt('left', Date.now()) }
    const check = setInterval(() => {
      const quietSince = Math.max(lastTouch.current, lastSound())
      if (Date.now() - quietSince > AWAY_AFTER_MS) pauseAt('away', quietSince)
    }, 5000)
    window.addEventListener('pointerdown', touched, true)
    window.addEventListener('keydown', touched, true)
    document.addEventListener('visibilitychange', left)
    return () => {
      clearInterval(check)
      window.removeEventListener('pointerdown', touched, true)
      window.removeEventListener('keydown', touched, true)
      document.removeEventListener('visibilitychange', left)
    }
  }, [auto, pauseAt])

  return { paused, pause, resume, active, running }
}

const idle: PauseClock = {
  paused: null, pause: () => {}, resume: () => {}, active: () => 0, running: async () => {},
}
export const PauseContext = createContext<PauseClock>(idle)
export const usePause = () => useContext(PauseContext)
