// Converts content/*.tsv + content/dialogues.json into src/data/*.json
// Run: npm run data
//
// Every row starts with a permanent id (w001, p001, …). Saved progress and audio
// files are keyed by it, so rows can be reordered or inserted freely. New rows
// can leave the id out; this script assigns the next free one and writes it back.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { structure } from './structure.mjs'

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

/* ---------- Sentence parts and teaching order ---------- */

// Split a sentence into known words, longest match first. Characters no word covers come back as '?字'.
const byHanzi = new Map(words.map((w) => [w.hanzi, w]))
const longest = Math.max(...words.map((w) => [...w.hanzi].length))
const PUNCT = /[，。！？、：；“”‘’（）—…\s,.!?:;()'"-]/u
function segment(text) {
  const chars = [...text].filter((c) => !PUNCT.test(c))
  const out = []
  for (let i = 0; i < chars.length;) {
    let hit
    for (let n = Math.min(longest, chars.length - i); n >= 1 && !hit; n--) hit = byHanzi.get(chars.slice(i, i + n).join(''))
    if (hit) { out.push(hit.id); i += [...hit.hanzi].length } else { out.push(`?${chars[i]}`); i++ }
  }
  return out
}

// `parts`: the other words a sentence uses, so the app can gloss the ones you haven't learned yet.
const problems = []
for (const it of [...words, ...phrases]) {
  const segs = segment(it.sentence.zh)
  const oov = segs.filter((s) => s.startsWith('?'))
  if (it.kind === 'word' && oov.length) {
    problems.push(`${it.id} ${it.hanzi}: "${it.sentence.zh}" uses ${oov.map((s) => s.slice(1)).join('')}, which no HSK 1 word covers`)
  }
  it.parts = [...new Set(segs.filter((s) => !s.startsWith('?') && s !== it.id))]
}

/**
 * Teaching order: file order, except a word can wait a few places for the words its sentence uses,
 * so a new word's sentence is made of words you already know. Of the next WINDOW words in file order,
 * the earliest with the fewest untaught words goes next. More than one untaught word fails the build:
 * simplify that sentence, or move the row after the words it needs.
 */
const MAX_UNTAUGHT = 1
const WINDOW = 8
const taught = new Set()
const order = []
const left = [...words]
while (left.length) {
  const untaught = (w) => w.parts.filter((p) => !taught.has(p)).length
  let best = 0
  for (let i = 1; i < Math.min(WINDOW, left.length) && untaught(left[best]) > 0; i++) if (untaught(left[i]) < untaught(left[best])) best = i
  const [w] = left.splice(best, 1)
  const n = untaught(w)
  if (n > MAX_UNTAUGHT) {
    const which = w.parts.filter((p) => !taught.has(p)).map((p) => words.find((x) => x.id === p).hanzi)
    problems.push(`${w.id} ${w.hanzi}: "${w.sentence.zh}" needs ${which.join(' ')}, not taught yet`)
  }
  taught.add(w.id)
  order.push(w)
}
// Colour-coded structure of each word's sentence (scripts/structure.mjs), corrected by content/structure.tsv.
const STRUCTURE_FILE = 'content/structure.tsv'
const overrides = new Map()
if (existsSync(STRUCTURE_FILE)) {
  for (const raw of readFileSync(STRUCTURE_FILE, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const [id, roles] = line.split('|')
    if (!words.some((w) => w.id === id)) throw new Error(`${STRUCTURE_FILE}: no word ${id}`)
    overrides.set(id, roles.trim().split(/\s+/))
  }
}
const wordById = new Map(words.map((w) => [w.id, w]))
for (const w of words) w.structure = structure(w.sentence.zh, segment, wordById, overrides.get(w.id))
if (process.argv.includes('--structure')) {
  for (const w of words) {
    console.log(w.id, w.sentence.zh, '  ', w.structure.map((c) => c.map((k) => `[${k.ids.map((id) => wordById.get(id).hanzi).join('')}:${k.label}]`).join(' ')).join(' / '))
  }
}

if (problems.length) throw new Error(`Simplify these sentences (a new word's sentence may use at most ${MAX_UNTAUGHT} word not taught yet):\n${problems.join('\n')}`)
words.splice(0, words.length, ...order)
if (process.argv.includes('--order')) {
  order.forEach((w, i) => console.log(i + 1, w.id, w.hanzi, w.sentence.zh, w.parts.filter((p) => order.findIndex((x) => x.id === p) > i).length ? '(+1)' : ''))
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/words.json', JSON.stringify(words, null, 1))
writeFileSync('src/data/phrases.json', JSON.stringify(phrases, null, 1))
writeFileSync('src/data/dialogues.json', JSON.stringify(dialogues, null, 1))
console.log(`words: ${words.length}, phrases: ${phrases.length}, dialogues: ${dialogues.length}`)
