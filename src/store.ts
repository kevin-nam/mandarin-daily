import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import { PHRASES, WORDS } from './data'

export type CardKind = 'listen' | 'speak' | 'read'
export const KINDS: CardKind[] = ['listen', 'speak', 'read']

export interface AppState {
  version: 1
  cards: Record<string, Card> // key: `${wordId}:${kind}`
  introduced: string[] // word ids, in order introduced
  history: Record<string, DayLog> // by YYYY-MM-DD
  settings: { newPerDay: number; phrasesPerDay: number; sessionMinutes: number }
  lastBackup?: string
}

// `newPhrases` and `known` were added later, so older days don't have them.
export interface DayLog { reviews: number; newWords: number; newPhrases?: number; known?: number; minutes: number }

const KEY = 'mandarin-daily:v1'
const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 })

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function emptyState(): AppState {
  return { version: 1, cards: {}, introduced: [], history: {}, settings: { newPerDay: 5, phrasesPerDay: 2, sessionMinutes: 25 } }
}

function revive(s: AppState): AppState {
  s.settings = { ...emptyState().settings, ...s.settings }
  for (const c of Object.values(s.cards)) {
    c.due = new Date(c.due)
    if (c.last_review) c.last_review = new Date(c.last_review)
  }
  return s
}

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return revive({ ...emptyState(), ...JSON.parse(raw) })
  } catch {
    /* storage unavailable or corrupt */
  }
  return emptyState()
}

export function save(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    alert('Could not save progress — export a backup.')
  }
}

export function cardKey(wordId: string, kind: CardKind) {
  return `${wordId}:${kind}`
}

export function parseKey(key: string) {
  const [wordId, kind] = key.split(':')
  return { wordId, kind: kind as CardKind }
}

/** Introduce a word: create its three cards, due now. */
export function introduce(s: AppState, wordId: string, now = new Date()) {
  if (s.introduced.includes(wordId)) return
  s.introduced.push(wordId)
  for (const k of KINDS) s.cards[cardKey(wordId, k)] = createEmptyCard(now)
}

export function grade(s: AppState, key: string, rating: Grade, now = new Date()) {
  s.cards[key] = scheduler.next(s.cards[key], now, rating).card
}

/** Keys of cards due by `now`, most overdue first. */
export function dueKeys(s: AppState, now = new Date()) {
  return Object.entries(s.cards)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => +a[1].due - +b[1].due)
    .map(([k]) => k)
}

/** Mark an item you already understand: its listen card jumps ahead, speak and read still get tested. */
export function markKnown(s: AppState, wordId: string, now = new Date()) {
  introduce(s, wordId, now)
  grade(s, cardKey(wordId, 'listen'), Rating.Easy, now)
}

/** Next unseen words and phrases, in teaching order, skipping ids in `exclude`. */
export function nextNewItems(s: AppState, words: number, phrases: number, exclude: string[] = []) {
  const skip = new Set([...s.introduced, ...exclude])
  const fresh = (list: typeof WORDS, n: number) => list.filter((w) => !skip.has(w.id)).slice(0, n)
  return [...fresh(WORDS, words), ...fresh(PHRASES, phrases)]
}

export function newDoneToday(s: AppState) {
  return s.history[today()]?.newWords ?? 0
}

export function phrasesDoneToday(s: AppState) {
  return s.history[today()]?.newPhrases ?? 0
}

export function wordsLearned(s: AppState) {
  return s.introduced.filter((id) => id.startsWith('w')).length
}

export function phrasesLearned(s: AppState) {
  return s.introduced.filter((id) => id.startsWith('p')).length
}

export function logDay(s: AppState, patch: Partial<DayLog>) {
  const d = (s.history[today()] ??= { reviews: 0, newWords: 0, minutes: 0 })
  d.reviews += patch.reviews ?? 0
  d.newWords += patch.newWords ?? 0
  d.newPhrases = (d.newPhrases ?? 0) + (patch.newPhrases ?? 0)
  d.known = (d.known ?? 0) + (patch.known ?? 0)
  d.minutes += patch.minutes ?? 0
}

export function streak(s: AppState) {
  let n = 0
  const d = new Date()
  if (!s.history[today(d)]) d.setDate(d.getDate() - 1) // today not done yet doesn't break streak
  while (s.history[today(d)]) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function exportState(s: AppState) {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' })
  const file = new File([blob], `mandarin-backup-${today()}.json`, { type: 'application/json' })
  // iOS: share sheet lets you "Save to Files"
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {})
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
  }
}

export async function importState(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text())
  if (parsed?.version !== 1 || typeof parsed.cards !== 'object') throw new Error('Not a valid backup file')
  return revive({ ...emptyState(), ...parsed })
}

export { Rating }
