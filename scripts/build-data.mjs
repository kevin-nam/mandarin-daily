// Converts content/*.tsv + content/dialogues.json into src/data/*.json
// Run: npm run data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const files = ['content/words1.tsv', 'content/words2.tsv', 'content/words3.tsv']
const words = []
let unit = ''
for (const f of files) {
  for (const raw of readFileSync(f, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) {
      const m = line.match(/^#\s*(Unit .*)$/)
      if (m) unit = m[1]
      continue
    }
    const [hanzi, pinyin, en, zh, py, sen] = line.split('|')
    if (!sen) throw new Error(`Bad row in ${f}: ${line}`)
    words.push({
      id: 'w' + String(words.length + 1).padStart(3, '0'),
      hanzi, pinyin, en, unit,
      sentence: { zh, py, en: sen },
    })
  }
}

const dialogues = JSON.parse(readFileSync('content/dialogues.json', 'utf8'))

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/words.json', JSON.stringify(words, null, 1))
writeFileSync('src/data/dialogues.json', JSON.stringify(dialogues, null, 1))
console.log(`words: ${words.length}, dialogues: ${dialogues.length}`)
