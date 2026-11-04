import { createContext, useCallback, useContext, useState } from 'react'

/** good: recalled · again: missed, coming back · streak: a run of right answers · retire: done with this one */
export type BurstKind = 'good' | 'again' | 'streak' | 'retire'
export interface BurstState { n: number; kind: BurstKind; label?: string }
export type Fire = (kind: BurstKind, label?: string) => void

/** One feedback mark at a time, re-fired by bumping `n` (so the same kind can play twice in a row). */
export function useBurstState() {
  const [burst, setBurst] = useState<BurstState>({ n: 0, kind: 'good' })
  const fire = useCallback<Fire>((kind, label) => setBurst((b) => ({ n: b.n + 1, kind, label })), [])
  return [burst, fire] as const
}

export const BurstContext = createContext<Fire>(() => {})
export const useBurst = () => useContext(BurstContext)

/** Every this-many right answers in a row earns a streak burst. */
export const STREAK_EVERY = 5
