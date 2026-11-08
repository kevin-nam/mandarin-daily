import { CHARS, WORDS, type Word } from './data'

/**
 * Characters that look alike, from how they're built (src/data/chars.json). Most reading misses
 * were look-alikes taught close together, not hard characters: 也 inside 他 and 她, and 吗 呢 喂 叫
 * all built as 口 + a sound part. Telling them apart side by side (discrimination practice) is
 * what helps with confusable items.
 */

/** Why two characters get mixed up, or undefined if they don't look alike. */
export interface Likeness { score: number; why: string }

const parts = (c: string) => CHARS[c]?.c ?? []

export function likeness(a: string, b: string): Likeness | undefined {
  if (a === b) return undefined
  const pa = parts(a)
  const pb = parts(b)
  // One is built from the other: 他 = 亻 + 也.
  if (pb.includes(a)) return { score: 3, why: `${b} has ${a} inside it (${pb.join(' + ')})` }
  if (pa.includes(b)) return { score: 3, why: `${a} has ${b} inside it (${pa.join(' + ')})` }
  // The same part in the same place: 吗 呢 喂 叫 all start with 口.
  if (pa.length > 1 && pb.length > 1 && pa[0] === pb[0]) {
    return { score: 2, why: `both start with ${pa[0]}: ${a} = ${pa.join(' + ')}, ${b} = ${pb.join(' + ')}` }
  }
  if (pa.length > 1 && pb.length > 1 && pa[pa.length - 1] === pb[pb.length - 1]) {
    const end = pa[pa.length - 1]
    return { score: 2, why: `both end with ${end}: ${a} = ${pa.join(' + ')}, ${b} = ${pb.join(' + ')}` }
  }
  return undefined
}

/** Single-character words, the ones read cards test on their own. */
const SINGLE = WORDS.filter((w) => [...w.hanzi].length === 1)

/**
 * Up to `n` studied single-character words that look like `w`, most alike first
 * (ties: the one learned most recently, which is the likeliest to interfere).
 */
export function lookalikes(w: Word, studied: string[], n = 3) {
  if ([...w.hanzi].length !== 1) return []
  const order = new Map(studied.map((id, i) => [id, i]))
  return SINGLE.filter((x) => order.has(x.id))
    .map((x) => ({ w: x, like: likeness(w.hanzi, x.hanzi) }))
    .filter((x): x is { w: Word; like: Likeness } => !!x.like)
    .sort((a, b) => b.like.score - a.like.score || order.get(b.w.id)! - order.get(a.w.id)!)
    .slice(0, n)
}

/** Whether two words share a look-alike character (the new-word picker keeps them on different days). */
export function looksLike(a: Word, b: Word) {
  return [...a.hanzi].some((x) => [...b.hanzi].some((y) => (likeness(x, y)?.score ?? 0) >= 2))
}

/** A short meaning for a choice button: the first gloss, grammar notes without brackets. */
export const shortMeaning = (w: Word) => w.en.split(';')[0].replace(/[()]/g, '').trim()
