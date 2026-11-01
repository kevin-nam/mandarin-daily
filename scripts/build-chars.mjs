// Builds src/data/chars.json: how each character in the words and phrases is put together
// (meaning part + sound part, or the parts and a hint), plus the meaning of each part.
// Run after `npm run data`: npm run chars [path/to/dictionary.txt]
//
// Source: Make Me a Hanzi dictionary.txt (https://github.com/skishore/makemeahanzi),
// LGPL-3.0, derived from Unihan and CJKlib. Downloaded if no path is given.
import { readFileSync, writeFileSync } from 'node:fs'

const URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt'
const text = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch(URL)).text()
const dict = new Map(text.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((e) => [e.character, e]))

const items = [...JSON.parse(readFileSync('src/data/words.json', 'utf8')), ...JSON.parse(readFileSync('src/data/phrases.json', 'utf8'))]
const isHan = (c) => /\p{Script=Han}/u.test(c)
// Ideographic description characters (⿰⿱…) and unknown parts (？) aren't components.
const partsOf = (e) => [...(e.decomposition ?? '')].filter((c) => isHan(c) && c !== e.character)
// "good, excellent, fine; proper" → "good"
const short = (d = '') => d.split(/[;,]/)[0].replace(/\(.*?\)/g, '').trim()

// Radical forms whose dictionary gloss is unclear as a meaning part.
const MEANING = { 亻: 'person', 讠: 'speech', 忄: 'heart', 犭: 'animal', 纟: 'silk', 钅: 'metal', 饣: 'food', 礻: 'spirit', 衤: 'clothing', 阝: 'mound / town', 辶: 'walk', 宀: 'roof', 艹: 'grass', 灬: 'fire', 罒: 'net', 冫: 'ice' }

const out = {}
const add = (c) => {
  const e = dict.get(c)
  if (!e || out[c]) return e
  out[c] = { m: MEANING[c] ?? short(e.definition), p: e.pinyin?.[0] }
  return e
}
for (const item of items) {
  for (const c of new Set([...item.hanzi].filter(isHan))) {
    const e = add(c)
    if (!e) continue
    const et = e.etymology ?? {}
    const parts = partsOf(e).filter((p) => dict.has(p))
    Object.assign(out[c], {
      ...(parts.length > 1 && { c: parts }),
      ...(et.type === 'pictophonetic' && et.semantic && et.phonetic && { s: et.semantic, f: et.phonetic }),
      ...(et.hint && { h: et.hint }),
    })
    for (const p of [...parts, et.semantic, et.phonetic]) if (p) add(p)
  }
}

writeFileSync('src/data/chars.json', JSON.stringify(out))
const n = Object.values(out).filter((v) => v.c || v.s || v.h).length
console.log(`chars.json: ${Object.keys(out).length} characters, ${n} with a breakdown`)
