// Converts content/*.tsv + content/dialogues.json into src/data/*.json
// Run: npm run data
//
// Every row starts with a permanent id (w001, p001, …). Saved progress and audio
// files are keyed by it, so rows can be reordered or inserted freely. New rows
// can leave the id out; this script assigns the next free one and writes it back.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const MARKS = {
  ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
  á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
  ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
  à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
}
// More than one reading: heard on their own, the voice may say a different tone.
const AMBIGUOUS = new Set([...'只还都要和'])

/**
 * Tones for the tone drill (1–2 syllables), or undefined if the word isn't a fair test:
 * neutral tones, several readings, or 3+3 (pronounced 2+3, so the written tones mislead).
 */
function drillTones(hanzi, pinyin) {
  const chars = [...hanzi]
  if (chars.length > 2 || pinyin.includes('/')) return undefined
  const tones = [...pinyin].map((c) => MARKS[c]).filter(Boolean)
  if (tones.length !== chars.length) return undefined
  if (chars.length === 1 && AMBIGUOUS.has(hanzi)) return undefined
  if (tones.join() === '3,3') return undefined
  return tones
}

function parse(files, prefix, kind) {
  const rows = []
  for (const f of files) {
    let unit = ''
    readFileSync(f, 'utf8').split('\n').forEach((raw, i) => {
      const line = raw.trim()
      if (!line) return
      if (line.startsWith('#')) {
        const m = line.match(/^#\s*((?:Unit|Phrases) .*)$/)
        if (m) unit = m[1]
        return
      }
      const cols = line.split('|')
      const id = cols.length === 7 ? cols.shift() : null
      if (cols.length !== 6 || cols.some((c) => !c)) throw new Error(`Bad row in ${f}:${i + 1}: ${line}`)
      if (id !== null && !new RegExp(`^${prefix}\\d{3,}$`).test(id)) throw new Error(`Bad id "${id}" in ${f}:${i + 1}`)
      rows.push({ f, i, id, unit, cols })
    })
  }

  // Assign ids to new rows, then write them back so they never change.
  let max = Math.max(0, ...rows.filter((r) => r.id).map((r) => +r.id.slice(prefix.length)))
  const stamped = new Set()
  for (const r of rows) {
    if (r.id) continue
    r.id = prefix + String(++max).padStart(3, '0')
    stamped.add(r.f)
  }
  for (const f of stamped) {
    const lines = readFileSync(f, 'utf8').split('\n')
    for (const r of rows.filter((r) => r.f === f)) lines[r.i] = [r.id, ...r.cols].join('|')
    writeFileSync(f, lines.join('\n'))
    console.log(`assigned new ids in ${f}`)
  }

  const items = rows.map(({ id, unit, cols: [hanzi, pinyin, en, zh, py, sen] }) => ({
    id, kind, hanzi, pinyin, en, unit,
    sentence: { zh, py, en: sen },
    ...(kind === 'word' && drillTones(hanzi, pinyin) && { tones: drillTones(hanzi, pinyin) }),
  }))
  for (const field of ['id', 'hanzi']) {
    const seen = new Set()
    for (const it of items) {
      if (seen.has(it[field])) throw new Error(`Duplicate ${field} "${it[field]}" in ${files.join(', ')}`)
      seen.add(it[field])
    }
  }
  return items
}

const words = parse(['content/words1.tsv', 'content/words2.tsv', 'content/words3.tsv'], 'w', 'word')
const phrases = parse(['content/phrases.tsv'], 'p', 'phrase')
const dialogues = JSON.parse(readFileSync('content/dialogues.json', 'utf8'))
for (const d of dialogues) {
  if (d.you && !d.lines.some((l) => l.s === d.you)) throw new Error(`Dialogue ${d.id}: "you" is ${d.you} but nobody speaks as ${d.you}`)
}

// Listen cards play the example sentence, so two words sharing one would be ambiguous.
const bySentence = new Map()
for (const w of words) {
  const other = bySentence.get(w.sentence.zh)
  if (other) throw new Error(`"${other}" and "${w.hanzi}" share the sentence ${w.sentence.zh} — give each its own`)
  bySentence.set(w.sentence.zh, w.hanzi)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/words.json', JSON.stringify(words, null, 1))
writeFileSync('src/data/phrases.json', JSON.stringify(phrases, null, 1))
writeFileSync('src/data/dialogues.json', JSON.stringify(dialogues, null, 1))
console.log(`words: ${words.length}, phrases: ${phrases.length}, dialogues: ${dialogues.length}`)
