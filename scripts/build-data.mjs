// Converts content/*.tsv + content/dialogues.json into src/data/*.json
// Run: npm run data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

function parse(files, prefix, kind) {
  const items = []
  let unit = ''
  for (const f of files) {
    for (const raw of readFileSync(f, 'utf8').split('\n')) {
      const line = raw.trim()
      if (!line) continue
      if (line.startsWith('#')) {
        const m = line.match(/^#\s*((?:Unit|Phrases) .*)$/)
        if (m) unit = m[1]
        continue
      }
      const [hanzi, pinyin, en, zh, py, sen] = line.split('|')
      if (!sen) throw new Error(`Bad row in ${f}: ${line}`)
      items.push({
        id: prefix + String(items.length + 1).padStart(3, '0'),
        kind, hanzi, pinyin, en, unit,
        sentence: { zh, py, en: sen },
      })
    }
  }
  return items
}

const words = parse(['content/words1.tsv', 'content/words2.tsv', 'content/words3.tsv'], 'w', 'word')
const phrases = parse(['content/phrases.tsv'], 'p', 'phrase')
const dialogues = JSON.parse(readFileSync('content/dialogues.json', 'utf8'))

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/words.json', JSON.stringify(words, null, 1))
writeFileSync('src/data/phrases.json', JSON.stringify(phrases, null, 1))
writeFileSync('src/data/dialogues.json', JSON.stringify(dialogues, null, 1))
console.log(`words: ${words.length}, phrases: ${phrases.length}, dialogues: ${dialogues.length}`)
