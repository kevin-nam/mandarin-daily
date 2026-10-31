import wordsJson from './data/words.json'
import dialoguesJson from './data/dialogues.json'

export interface Word {
  id: string
  hanzi: string
  pinyin: string
  en: string
  unit: string
  sentence: { zh: string; py: string; en: string }
}

export interface DialogueLine { s: string; zh: string; py: string; en: string }
export interface Dialogue { id: string; title: string; unlockAfter: number; lines: DialogueLine[] }

export const WORDS: Word[] = wordsJson
export const DIALOGUES: Dialogue[] = dialoguesJson
export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]))

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

/** Single-character words with a clear tone — used for the tone drill. */
export const TONE_ITEMS = WORDS.filter((w) => [...w.hanzi].length === 1 && toneOf(w.pinyin) > 0)
