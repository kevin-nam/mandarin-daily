import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { PHRASES, WORD_BY_ID, WORDS, type Stage, type Word } from './data'
import { looksLike } from './lookalike'
import type { Theme } from './theme'

/** `sentence` (read the example sentence, characters only) unlocks once a word's `read` card is Good. */
export type CardKind = 'listen' | 'speak' | 'read' | 'sentence'
/** Cards every item gets when introduced. */
export const KINDS: CardKind[] = ['listen', 'speak', 'read']

export interface AppState {
  version: 1
  cards: Record<string, Card> // key: `${wordId}:${kind}`
  introduced: string[] // word ids, in order introduced
  history: Record<string, DayLog> // by YYYY-MM-DD
  settings: {
    newPerDay: number
    phrasesPerDay: number
    sessionMinutes: number
    audioSpeed: number
    /** Light, dark, or follow the phone (default). */
    theme?: Theme
    /** ISO date: don't suggest a faster audio speed before this. */
    speedNudgeAfter?: string
  }
  lastBackup?: string
  /** Items missed in a quick recall: their speak card comes first in the next review. */
  flagged?: Record<string, true>
  /** Tone drill answers per syllable: how often each tone was played, and what you picked when wrong ('3>2'). */
  tones?: { seen: Record<string, number>; missed: Record<string, number> }
  /** Tone ladder: the current level (TONE_LEVELS index) and the last answers at it (1 right, 0 wrong). */
  toneLadder?: { level: number; recent: number[] }
}

// `newPhrases` and `known` were added later, so older days don't have them.
export interface DayLog {
  reviews: number; newWords: number; newPhrases?: number; known?: number; minutes: number; listened?: number
  /** When the session was finished (ISO), and how many items the quick recall covered. */
  finishedAt?: string; recalled?: number
}

const KEY = 'mandarin-daily:v1'
// No same-day learning steps: the session itself (Speak drill, Again re-queue) covers same-day practice,
// so every grade schedules whole days. With steps on, graded cards came due again minutes later.
const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9, enable_short_term: false })

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Local midnight at the start of the day `days` from `d`. */
export function startOfDay(d = new Date(), days = 0) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

function emptyState(): AppState {
  return { version: 1, cards: {}, introduced: [], history: {}, settings: { newPerDay: 5, phrasesPerDay: 2, sessionMinutes: 30, audioSpeed: 0.85 } }
}

function revive(s: AppState): AppState {
  s.settings = { ...emptyState().settings, ...s.settings }
  for (const c of Object.values(s.cards)) {
    c.due = new Date(c.due)
    if (c.last_review) c.last_review = new Date(c.last_review)
    // Cards graded before learning steps were turned off (1.1): move "due in minutes" to the next day.
    if (c.last_review && c.due < startOfDay(c.last_review, 1)) c.due = startOfDay(c.last_review, 1)
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

/**
 * Introduce a word: create its three cards, first due tomorrow. Today's
 * lesson and Speak drill already cover it; the first real review comes after a night's sleep.
 */
export function introduce(s: AppState, wordId: string, now = new Date()) {
  if (s.introduced.includes(wordId)) return
  s.introduced.push(wordId)
  for (const k of KINDS) s.cards[cardKey(wordId, k)] = { ...createEmptyCard(now), due: startOfDay(now, 1) }
}

export function grade(s: AppState, key: string, rating: Grade, now = new Date()) {
  s.cards[key] = scheduler.next(s.cards[key], now, rating).card
  if (key.endsWith(':speak') && s.flagged) delete s.flagged[parseKey(key).wordId]
  // Reading a word on its own reliably unlocks reading its whole sentence, characters only.
  const { wordId, kind } = parseKey(key)
  const sentence = cardKey(wordId, 'sentence')
  if (kind === 'read' && WORD_BY_ID.get(wordId)?.kind === 'word' && level(s.cards[key]) >= 3 && !s.cards[sentence]) {
    s.cards[sentence] = { ...createEmptyCard(now), due: startOfDay(now, 1) }
  }
}

/** Keys of cards due by `now`, most overdue first. Cards for items removed from the content are skipped. */
export function dueKeys(s: AppState, now = new Date()) {
  return Object.entries(s.cards)
    .filter(([k, c]) => c.due <= now && WORD_BY_ID.has(parseKey(k).wordId))
    .sort((a, b) => +a[1].due - +b[1].due)
    .map(([k]) => k)
}

/** Mark an item you already understand: its listen card jumps ahead, speak and read still get tested. */
export function markKnown(s: AppState, wordId: string, now = new Date()) {
  introduce(s, wordId, now)
  grade(s, cardKey(wordId, 'listen'), Rating.Easy, now)
}

/** Of the next unseen words in teaching order, how far ahead the picker may look. */
const PICK_WINDOW = 8

/**
 * Next unseen words and phrases, skipping ids in `exclude`. Words follow the teaching order, but
 * each pick is the earliest of the next few whose sentence has the fewest words you haven't learned
 * (counting today's earlier picks as learned), so a new word arrives in a sentence you can follow,
 * whatever you've marked as known along the way. A word that looks like one already picked today
 * (他 and 也) counts as one more unknown, so look-alikes land on different days.
 */
export function nextNewItems(s: AppState, words: number, phrases: number, exclude: string[] = []) {
  const known = new Set([...s.introduced, ...exclude])
  const pool = WORDS.filter((w) => !known.has(w.id))
  const picked: Word[] = []
  const unknown = (w: Word) => w.parts.filter((p) => !known.has(p)).length + (picked.some((x) => looksLike(x, w)) ? 1 : 0)
  while (picked.length < words && pool.length) {
    let best = 0
    for (let i = 1; i < Math.min(PICK_WINDOW, pool.length) && unknown(pool[best]) > 0; i++) {
      if (unknown(pool[i]) < unknown(pool[best])) best = i
    }
    const [w] = pool.splice(best, 1)
    picked.push(w)
    known.add(w.id)
  }
  return [...picked, ...PHRASES.filter((p) => !known.has(p.id)).slice(0, phrases)]
}

/** Words in an item's sentence you haven't learned yet (the lesson glosses them). */
export function untaughtIn(s: AppState, w: Word) {
  return w.parts.filter((p) => !s.introduced.includes(p)).map((p) => WORD_BY_ID.get(p)).filter((x): x is Word => !!x)
}

/**
 * Say the word on its own until its speak card is Good (a week's stability), then its sentence.
 * Learning a word and building a sentence around it are two jobs; doing both at once was too much.
 */
export function speakStage(s: AppState, wordId: string): Stage {
  return level(s.cards[cardKey(wordId, 'speak')]) >= 3 ? 'sentence' : 'word'
}

/** Lowest chance of recall first: never-reviewed cards, then the ones you're most likely to have forgotten. */
export function byRisk(s: AppState, keys: string[], now = new Date()) {
  const risk = (k: string) => recallChance(s.cards[k], now) ?? 0
  return [...keys].sort((a, b) => risk(a) - risk(b))
}

/**
 * New words and phrases allowed right now. Cut back when reviews are carried over
 * from earlier days (missed days, or more than the review cap): reviewing beats adding.
 */
export function newQuota(s: AppState, now = new Date()) {
  // Only reviewed cards count: a never-reviewed card waiting a day isn't a sign of falling behind.
  const behind = Object.entries(s.cards).filter(
    ([k, c]) => c.reps > 0 && c.due < startOfDay(now) && WORD_BY_ID.has(parseKey(k).wordId),
  ).length
  const scale = behind > 30 ? 0 : behind > 10 ? 0.5 : 1
  return {
    words: Math.ceil(Math.max(0, s.settings.newPerDay - newDoneToday(s)) * scale),
    phrases: Math.ceil(Math.max(0, s.settings.phrasesPerDay - phrasesDoneToday(s)) * scale),
    paused: scale < 1,
  }
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
  if (patch.listened) d.listened = (d.listened ?? 0) + patch.listened
  if (patch.recalled) d.recalled = (d.recalled ?? 0) + patch.recalled
  if (patch.finishedAt && !d.finishedAt) d.finishedAt = patch.finishedAt // the first finish; extra practice doesn't move it
}

/** Items introduced today: their cards are new, first due tomorrow, not yet reviewed. */
export function introducedToday(s: AppState, now = new Date()) {
  const tomorrow = +startOfDay(now, 1)
  return s.introduced.filter((id) => {
    const c = s.cards[cardKey(id, 'speak')]
    return c && c.reps === 0 && +c.due === tomorrow && WORD_BY_ID.has(id)
  })
}

/** Old answers fade: past this many per tone, all counts are halved so recent sessions weigh most. */
const TONE_WINDOW = 60

export function recordTones(s: AppState, heard: number[], picked: number[]) {
  const t = (s.tones ??= { seen: {}, missed: {} })
  heard.forEach((h, i) => {
    t.seen[h] = (t.seen[h] ?? 0) + 1
    if (picked[i] !== h) t.missed[`${h}>${picked[i]}`] = (t.missed[`${h}>${picked[i]}`] ?? 0) + 1
    if (t.seen[h] > TONE_WINDOW) {
      for (const k in t.seen) t.seen[k] /= 2
      for (const k in t.missed) t.missed[k] /= 2
    }
  })
}

/** Error rate per tone (index 1-4), starting from an even 25% guess until there are answers. */
export function toneErrors(s: AppState) {
  const err = [0, 0, 0, 0, 0]
  for (let h = 1; h <= 4; h++) {
    let miss = 0
    for (let p = 1; p <= 4; p++) miss += s.tones?.missed[`${h}>${p}`] ?? 0
    err[h] = (miss + 1) / ((s.tones?.seen[h] ?? 0) + 4)
  }
  return err
}

/** The tone you miss most and what you most often hear it as, once there's enough to say. */
export function toneFocus(s: AppState): { tone: number; as: number } | undefined {
  const seen = Object.values(s.tones?.seen ?? {}).reduce((a, b) => a + b, 0)
  if (seen < 20) return undefined
  const err = toneErrors(s)
  const tone = [1, 2, 3, 4].reduce((a, b) => (err[b] > err[a] ? b : a))
  if (err[tone] < 0.15) return undefined
  const as = [1, 2, 3, 4].filter((p) => p !== tone)
    .reduce((a, b) => ((s.tones!.missed[`${tone}>${b}`] ?? 0) > (s.tones!.missed[`${tone}>${a}`] ?? 0) ? b : a))
  return { tone, as }
}

/**
 * Tone ladder. Picking 1 of 4 tones stayed near chance (39% right after 8 days; 25% is guessing),
 * so tones are learned two at a time, most distinct pairs first, then all four, then two-syllable
 * words (level TONE_LEVELS.length: the mixed drill). Identification with feedback and many trials
 * is how tone perception training works.
 */
export const TONE_LEVELS = [[1, 3], [2, 4], [1, 4], [2, 3], [1, 2], [3, 4], [1, 2, 3, 4]]
/** Move up after this share right over the last LADDER_WINDOW answers at a level. */
export const LADDER_WINDOW = 20
export const LADDER_PASS = 0.8

export function toneLevel(s: AppState) {
  return Math.min(s.toneLadder?.level ?? 0, TONE_LEVELS.length)
}

/** The ladder after one answer, and whether it moved you up a level. */
export function ladderStep(ladder: AppState['toneLadder'], ok: boolean) {
  const l = ladder ?? { level: 0, recent: [] }
  if (l.level >= TONE_LEVELS.length) return { ladder: l, up: false }
  const recent = [...l.recent, ok ? 1 : 0].slice(-LADDER_WINDOW)
  const up = recent.length >= LADDER_WINDOW && recent.reduce((a, b) => a + b, 0) / LADDER_WINDOW >= LADDER_PASS
  return { ladder: up ? { level: l.level + 1, recent: [] } : { level: l.level, recent }, up }
}

export function recordLadder(s: AppState, ok: boolean) {
  s.toneLadder = ladderStep(s.toneLadder, ok).ladder
}

/** Read cards missed this often that still aren't Good: they come back in every Speak drill. */
const TRICKY_LAPSES = 4
export function trickyReads(s: AppState) {
  const lapses = (id: string) => s.cards[cardKey(id, 'read')]?.lapses ?? 0
  return s.introduced
    .filter((id) => lapses(id) >= TRICKY_LAPSES && level(s.cards[cardKey(id, 'read')]) < 3 && WORD_BY_ID.has(id))
    .sort((a, b) => lapses(b) - lapses(a)) // most missed first
}

/** Older items with the weakest speaking memory (lowest stability, under a week). */
export function weakestItems(s: AppState, n: number, exclude: string[] = []) {
  return s.introduced
    .filter((id) => !exclude.includes(id) && WORD_BY_ID.has(id))
    .map((id) => ({ id, c: s.cards[cardKey(id, 'speak')] }))
    .filter(({ c }) => c && c.reps > 0 && c.stability < 7)
    .sort((a, b) => a.c.stability - b.c.stability)
    .slice(0, n)
    .map(({ id }) => id)
}

/**
 * A miss in the quick recall: the item's speak card comes first in the next review, and no later
 * than tomorrow. The recall itself is never graded, so it can't inflate the schedule.
 */
export function flagMissed(s: AppState, id: string, now = new Date()) {
  ;(s.flagged ??= {})[id] = true
  const c = s.cards[cardKey(id, 'speak')]
  if (c && +c.due > +startOfDay(now, 1)) c.due = startOfDay(now, 1)
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

/** Longest run of consecutive practice days. */
export function bestStreak(s: AppState) {
  let best = 0
  let run = 0
  let prev: Date | undefined
  for (const k of Object.keys(s.history).sort()) {
    const d = new Date(`${k}T12:00:00`)
    run = prev && Math.round((+d - +prev) / 86400000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** How well a card is known, from FSRS stability (roughly: days until recall drops to 90%). */
export const LEVELS = ['Not tested', 'Learning', 'Getting there', 'Good', 'Strong'] as const
export type Level = 0 | 1 | 2 | 3 | 4

export function level(c: Card | undefined): Level {
  if (!c || c.reps === 0) return 0
  if (c.state === State.Learning || c.state === State.Relearning || c.stability < 2) return 1
  if (c.stability < 7) return 2
  if (c.stability < 30) return 3
  return 4
}

/**
 * A faster audio speed (next 5% step) once listening is solid: at least 20 listen
 * cards reviewed and 70% of them Good or Strong. Null if no suggestion right now.
 */
export function speedSuggestion(s: AppState, now = new Date()) {
  const speed = s.settings.audioSpeed
  if (speed >= 1 || (s.settings.speedNudgeAfter && now < new Date(s.settings.speedNudgeAfter))) return null
  const tested = s.introduced.map((id) => s.cards[cardKey(id, 'listen')]).filter((c) => c && c.reps > 0)
  if (tested.length < 20 || tested.filter((c) => level(c) >= 3).length / tested.length < 0.7) return null
  return Math.min(1, Math.round((speed + 0.05) * 100) / 100)
}

/** Estimated chance you'd recall it right now, 0–1 (null if never reviewed). */
export function recallChance(c: Card | undefined, now = new Date()) {
  if (!c || c.reps === 0) return null
  return scheduler.get_retrievability(c, now, false)
}

/** Resolves true once the backup was handed off (share sheet completed or download started), false if cancelled. */
export async function exportState(s: AppState): Promise<boolean> {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' })
  const file = new File([blob], `mandarin-backup-${today()}.json`, { type: 'application/json' })
  // iOS: share sheet lets you "Save to Files"
  if (navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).then(() => true, () => false)
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  return true
}

export async function importState(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text())
  if (parsed?.version !== 1 || typeof parsed.cards !== 'object') throw new Error('Not a valid backup file')
  return revive({ ...emptyState(), ...parsed })
}

export { Rating }
