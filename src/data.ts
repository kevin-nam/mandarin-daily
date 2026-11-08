import wordsJson from './data/words.json'
import phrasesJson from './data/phrases.json'
import dialoguesJson from './data/dialogues.json'
import charsJson from './data/chars.json'

/** A study item: an HSK word, or a ready-made phrase for conversation and travel. */
export interface Word {
  id: string
  kind: 'word' | 'phrase'
  hanzi: string
  pinyin: string
  en: string
  unit: string
  sentence: { zh: string; py: string; en: string }
  /** Other words the sentence uses (scripts/build-data.mjs), to gloss the ones you haven't learned yet. */
  parts: string[]
  /** Phrases: the HSK 1 words in the phrase itself (its reading card waits for them). */
  words?: string[]
  /** The sentence's structure, per clause: chunks of words sharing a role (scripts/structure.mjs). Words only. */
  structure?: Chunk[][]
  /** Tones (1-4) per syllable if the word is a fair tone-drill item (see scripts/build-data.mjs). */
  tones?: number[]
}

export type Role = 'addressee' | 'subject' | 'when' | 'where' | 'how' | 'verb' | 'object' | 'to' | 'particle' | 'phrase'
export interface Chunk { role: Role; label: string; ids: string[] }

export interface DialogueLine { s: string; zh: string; py: string; en: string }
export interface Dialogue {
  id: string
  title: string
  /** The speaker you play in role-play (default B). */
  you?: string
  lines: DialogueLine[]
  /** Per character of the dialogue: the words and phrases that cover it (scripts/build-data.mjs). */
  cover: string[][]
}

export const WORDS = wordsJson as unknown as Word[]
export const PHRASES = phrasesJson as unknown as Word[]
export const DIALOGUES: Dialogue[] = dialoguesJson
/**
 * How a character is built (scripts/build-chars.mjs): m meaning, p pinyin, c parts,
 * s/f the meaning and sound parts of a meaning+sound character, h a hint.
 */
export interface CharInfo { m: string; p?: string; c?: string[]; s?: string; f?: string; h?: string }
export const CHARS: Record<string, CharInfo> = charsJson

/** All items (words and phrases) by id. */
export const WORD_BY_ID = new Map([...WORDS, ...PHRASES].map((w) => [w.id, w]))

/** Characters in items you've studied, to point out parts you already know. */
export function knownChars(introduced: string[]) {
  const out = new Set<string>()
  for (const id of introduced) for (const c of WORD_BY_ID.get(id)?.hanzi ?? '') out.add(c)
  return out
}

/**
 * What you're asked to say: a new word on its own first, its sentence once you can say the word
 * (store.speakStage). Short answers first, so a sentence is never the hard part of learning a word.
 */
export type Stage = 'word' | 'sentence'

/** Particles and suffixes mean nothing alone, so they're always practised in their sentence. */
export const needsSentence = (w: Word) => w.kind === 'word' && w.en.startsWith('(')

/**
 * What to say or hear for an item. A phrase is practised as itself; a word as itself (stage
 * 'word') or inside its example sentence (stage 'sentence', the default: listen cards use it).
 */
export function target(w: Word, stage: Stage = 'sentence') {
  if (w.kind === 'phrase') return { key: w.id, zh: w.hanzi, py: w.pinyin, en: w.en, word: false }
  if (stage === 'word' && !needsSentence(w)) return { key: w.id, zh: w.hanzi, py: w.pinyin, en: w.en, word: true }
  return { key: `${w.id}s`, zh: w.sentence.zh, py: w.sentence.py, en: w.sentence.en, word: false }
}

/**
 * Seconds to form an answer before it plays: 5 for a word, about 1 more per character for a
 * sentence (up to 15). Saying a sentence from English takes a beginner far longer than hearing it.
 */
export const thinkFor = (zh: string) =>
  Math.min(15, Math.max(5, Math.round(3 + [...zh.replace(/[，。！？、：；—\s]/g, '')].length)))
/** "More time" on a countdown adds this much. */
export const MORE_TIME = 5

/** What grammar words do, in a few words (their entries are notes like "(general measure word)"). */
const GRAMMAR: Record<string, string> = {
  的: '’s', 们: 'plural', 个: 'measure word', 本: 'measure word', 件: 'measure word', 只: 'measure word; only',
  口: 'mouth; measure word', 第: '-th', 了: 'done / change', 吗: 'yes/no question', 呢: 'and…?', 吧: 'suggestion',
}
/** A short gloss: the first meaning, or what a grammar word does. */
export const shortGloss = (w: Word) => GRAMMAR[w.hanzi] ?? w.en.split(';')[0].replace(/\s*\(.*?\)\s*/g, ' ').trim()

/** Words whose first English gloss another word shares (想 / 要 "to want"): the prompt adds context. */
const firstGloss = (w: Word) => w.en.split(';')[0].replace(/\(.*?\)/g, '').trim()
const GLOSS_COUNT = new Map<string, number>()
for (const w of WORDS) GLOSS_COUNT.set(firstGloss(w), (GLOSS_COUNT.get(firstGloss(w)) ?? 0) + 1)
export const glossClash = (w: Word) => w.kind === 'word' && (GLOSS_COUNT.get(firstGloss(w)) ?? 0) > 1

/**
 * What a grade is about. A word's cards test the word: in a sentence, only the underlined word
 * counts. A sentence card tests reading the whole sentence.
 */
export function gradeNote(w: Word, kind: 'listen' | 'speak' | 'read' | 'sentence', stage: Stage) {
  if (w.kind === 'phrase') return kind === 'speak' ? 'Grade the whole phrase. Tone a bit off: Hard, not Again.' : undefined
  if (kind === 'sentence') return 'Grade the whole sentence.'
  if (kind === 'listen') return `Grade ${w.hanzi} only: did you catch what it means?`
  if (kind === 'speak' && !target(w, stage).word) return `Grade ${w.hanzi} only, not the rest. Tone a bit off: Hard.`
  if (kind === 'speak') return 'Tone a bit off: Hard, not Again.'
  return undefined
}

/** Tone-drill items: single syllables and two-syllable words with clear tones. */
export const TONE_ITEMS = WORDS.filter((w) => w.tones?.length === 1)
export const PAIR_ITEMS = WORDS.filter((w) => w.tones?.length === 2)

/** Tone-drill voices: 0 is the normal word audio, 1-3 are extra speakers. */
export const TONE_VOICES = 4
export const voiceKey = (id: string, voice: number) => (voice === 0 ? id : `v${voice}-${id}`)
