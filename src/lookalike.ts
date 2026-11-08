import { CHARS, WORDS, type Word } from './data'

/**
 * Characters that look alike, from how they're built (src/data/chars.json). Most reading misses
 * were look-alikes taught close together, not hard characters: 也 inside 他 and 她, and 吗 呢 喂 叫
 * all built as 口 + a sound part. Telling them apart side by side (discrimination practice) is
 * what helps with confusable items.
 */

/** Why two characters get mixed up, or undefined if they don't look alike. */
export interface Likeness { score: number; why: string }

/** Single strokes and stroke-like pieces: sharing one doesn't make characters look alike (百 and 十 both have 一). */
const TRIVIAL = new Set([...'一丨丿丶乙亅冂亠十'])
const parts = (c: string) => (CHARS[c]?.c ?? []).filter((p) => !TRIVIAL.has(p))
/**
 * Common radicals that are also words (口 女 日 人…): "吗 has 口 inside it" is true but useless, so
 * containing one only counts when it's nearly all there is (大 → 太, 日 → 早).
 */
const RADICALS = new Set([...'口日人女八二小大几月子木水火土心手目田门马白中'])
/** All parts, for showing how a character is put together. */
const built = (c: string) => (CHARS[c]?.c ?? []).join(' + ')

export function likeness(a: string, b: string): Likeness | undefined {
  if (a === b || TRIVIAL.has(a) || TRIVIAL.has(b)) return undefined
  const pa = parts(a)
  const pb = parts(b)
  // One is built from the other: 他 = 亻 + 也, 太 = 大 + 丶.
  const inside = (small: string, bigParts: string[]) =>
    bigParts.includes(small) && (bigParts.length === 1 || !RADICALS.has(small))
  if (inside(a, pb)) return { score: 3, why: `${b} has ${a} inside it (${built(b)})` }
  if (inside(b, pa)) return { score: 3, why: `${a} has ${b} inside it (${built(a)})` }
  // The same part in the same place: 吗 呢 喂 叫 all start with 口.
  if (pa.length > 1 && pb.length > 1 && pa[0] === pb[0]) {
    return { score: 2, why: `both start with ${pa[0]}: ${a} = ${built(a)}, ${b} = ${built(b)}` }
  }
  if (pa.length > 1 && pb.length > 1 && pa[pa.length - 1] === pb[pb.length - 1]) {
    const end = pa[pa.length - 1]
    return { score: 2, why: `both end with ${end}: ${a} = ${built(a)}, ${b} = ${built(b)}` }
  }
  return undefined
}

/** Single-character words, the ones read cards test on their own. */
const SINGLE = WORDS.filter((w) => [...w.hanzi].length === 1)

/**
 * Up to `n` studied single-character words that look like `w`: most alike first, then the ones you
 * miss reading most (your own mistakes are the best evidence of what you confuse), then the most
 * recently learned (the likeliest to interfere).
 */
export function lookalikes(w: Word, studied: string[], lapses: (id: string) => number = () => 0, n = 3) {
  if ([...w.hanzi].length !== 1) return []
  const order = new Map(studied.map((id, i) => [id, i]))
  return SINGLE.filter((x) => order.has(x.id))
    .map((x) => ({ w: x, like: likeness(w.hanzi, x.hanzi) }))
    .filter((x): x is { w: Word; like: Likeness } => !!x.like)
    .sort((a, b) => b.like.score - a.like.score || lapses(b.w.id) - lapses(a.w.id) || order.get(b.w.id)! - order.get(a.w.id)!)
    .slice(0, n)
}

/** Whether two words share a look-alike character (the new-word picker keeps them on different days). */
export function looksLike(a: Word, b: Word) {
  return [...a.hanzi].some((x) => [...b.hanzi].some((y) => (likeness(x, y)?.score ?? 0) >= 2))
}
