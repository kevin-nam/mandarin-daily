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
  /** Tones (1-4) per syllable if the word is a fair tone-drill item (see scripts/build-data.mjs). */
  tones?: number[]
}

export interface DialogueLine { s: string; zh: string; py: string; en: string }
export interface Dialogue {
  id: string
  title: string
  /** Unlocks once this many words and phrases are learned. */
  unlockAfter: number
  unlockAfterPhrases?: number
  /** The speaker you play in role-play (default B). */
  you?: string
  lines: DialogueLine[]
}

export const WORDS = wordsJson as Word[]
export const PHRASES = phrasesJson as Word[]
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
 * What to say or hear for an item: a word is practised inside its sentence,
 * a phrase is practised as itself.
 */
export function target(w: Word) {
  return w.kind === 'phrase'
    ? { key: w.id, zh: w.hanzi, py: w.pinyin, en: w.en }
    : { key: `${w.id}s`, zh: w.sentence.zh, py: w.sentence.py, en: w.sentence.en }
}

/** Tone-drill items: single syllables and two-syllable words with clear tones. */
export const TONE_ITEMS = WORDS.filter((w) => w.tones?.length === 1)
export const PAIR_ITEMS = WORDS.filter((w) => w.tones?.length === 2)

/** Tone-drill voices: 0 is the normal word audio, 1-3 are extra speakers. */
export const TONE_VOICES = 4
export const voiceKey = (id: string, voice: number) => (voice === 0 ? id : `v${voice}-${id}`)
