import wordsJson from './data/words.json'
import phrasesJson from './data/phrases.json'
import dialoguesJson from './data/dialogues.json'

/** A study item: an HSK word, or a ready-made phrase for conversation and travel. */
export interface Word {
  id: string
  kind: 'word' | 'phrase'
  hanzi: string
  pinyin: string
  en: string
  unit: string
  sentence: { zh: string; py: string; en: string }
}

export interface DialogueLine { s: string; zh: string; py: string; en: string }
export interface Dialogue { id: string; title: string; unlockAfter: number; lines: DialogueLine[] }

export const WORDS = wordsJson as Word[]
export const PHRASES = phrasesJson as Word[]
export const DIALOGUES: Dialogue[] = dialoguesJson
/** All items (words and phrases) by id. */
export const WORD_BY_ID = new Map([...WORDS, ...PHRASES].map((w) => [w.id, w]))

/**
 * What to say or hear for an item: a word is practised inside its sentence,
 * a phrase is practised as itself.
 */
export function target(w: Word) {
  return w.kind === 'phrase'
    ? { key: w.id, zh: w.hanzi, py: w.pinyin, en: w.en }
    : { key: `${w.id}s`, zh: w.sentence.zh, py: w.sentence.py, en: w.sentence.en }
}

/** Tone (1-4) of a single-syllable pinyin string, or 0 if neutral / multi-syllable. */
export function toneOf(pinyin: string): number {
  const p = pinyin.split('/')[0].trim()
  if (p.includes(' ')) return 0
  const marks: Record<string, number> = {
    ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
    á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
    ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
    à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
  }
  const tones = [...p].map((c) => marks[c]).filter(Boolean)
  return tones.length === 1 ? tones[0] : 0
}

/** Characters with more than one reading: heard on their own, the voice may say a different tone. */
const AMBIGUOUS = new Set([...'只还都要和'])

/** Single-character words with a clear tone — used for the tone drill. */
export const TONE_ITEMS = WORDS.filter(
  (w) => [...w.hanzi].length === 1 && toneOf(w.pinyin) > 0 && !w.pinyin.includes('/') && !AMBIGUOUS.has(w.hanzi),
)
