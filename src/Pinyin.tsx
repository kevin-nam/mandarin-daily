/**
 * Pinyin coloured by tone (1 red, 2 orange, 3 green, 4 blue, neutral grey: the Pleco convention),
 * so each syllable's tone is seen as well as heard.
 */
const MARKS: Record<string, number> = {}
for (const [tone, vowels] of [[1, 'āēīōūǖ'], [2, 'áéíóúǘ'], [3, 'ǎěǐǒǔǚ'], [4, 'àèìòùǜ']] as const)
  for (const v of vowels) { MARKS[v] = tone; MARKS[v.toUpperCase()] = tone }

const V = 'aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'
// initial? + vowels + (ng | n | r) when not starting the next syllable
const SYLLABLE = new RegExp(`(?:zh|ch|sh|[bpmfdtnlgkhjqxzcsryw])?[${V}]+(?:ng(?![${V}])|n(?![${V}])|r(?![${V}]))?`, 'giu')

const toneOf = (syllable: string) => {
  for (const c of syllable.normalize('NFC')) if (MARKS[c]) return MARKS[c]
  return 0
}

export function Pinyin({ text, className = '' }: { text: string; className?: string }) {
  const parts: { s: string; t: number | null }[] = []
  let last = 0
  for (const m of text.matchAll(SYLLABLE)) {
    if (m.index > last) parts.push({ s: text.slice(last, m.index), t: null })
    parts.push({ s: m[0], t: toneOf(m[0]) })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ s: text.slice(last), t: null })
  return (
    <span className={`py ${className}`}>
      {parts.map((p, i) => (p.t === null ? p.s : <span key={i} className={`t${p.t}`}>{p.s}</span>))}
    </span>
  )
}

/** The pitch shape of a tone on a 5-level scale (Chao numbers): 55, 35, 214, 51. */
const CONTOURS = ['M3 6 H29', 'M3 16 L29 5', 'M3 12 Q11 22 17 21 T29 9', 'M3 5 L29 21']

export function ToneContour({ tone }: { tone: number }) {
  return (
    <svg className={`contour t${tone}`} width="32" height="26" viewBox="0 0 32 26" aria-hidden="true">
      <path d={CONTOURS[tone - 1]} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
