import { CHARS } from './data'
import { Pinyin } from './Pinyin'

const isHan = (c: string) => /\p{Script=Han}/u.test(c)

/**
 * How each character is built: meaning part + sound part, or its parts and a hint.
 * Linking the parts to sounds and meanings you already know helps characters stick.
 */
export function CharParts({ hanzi, known }: { hanzi: string; known: Set<string> }) {
  const chars = [...new Set([...hanzi].filter(isHan))].filter((c) => {
    const i = CHARS[c]
    return i && (i.s || i.c || i.h)
  })
  if (chars.length === 0) return null
  const rows = chars.map((c) => <CharRow key={c} c={c} known={known} />)
  // Phrases have many characters: keep them out of the way until asked for.
  if (chars.length > 2) {
    return (
      <details className="char-parts">
        <summary>How the characters are built</summary>
        {rows}
      </details>
    )
  }
  return (
    <section className="char-parts">
      <h3>How it’s built</h3>
      {rows}
    </section>
  )
}

function Part({ p, role, known }: { p: string; role?: 'meaning' | 'sound'; known: Set<string> }) {
  const info = CHARS[p]
  const isKnown = known.has(p)
  return (
    <span className={`part ${isKnown ? 'known' : ''}`}>
      <span className="hz part-char" lang="zh-CN">{p}</span>
      <span className="part-label">
        {role === 'sound' && info?.p ? <Pinyin text={info.p} /> : info?.m}
        {role && <span className="part-role">{role}</span>}
        {isKnown && <span className="part-role known-mark">you know it</span>}
      </span>
    </span>
  )
}

function CharRow({ c, known }: { c: string; known: Set<string> }) {
  const i = CHARS[c]
  const parts = i.s && i.f
    ? [<Part key="s" p={i.s} role="meaning" known={known} />, <Part key="f" p={i.f} role="sound" known={known} />]
    : (i.c ?? []).map((p) => <Part key={p} p={p} known={known} />)
  return (
    <div className="char-row">
      <div className="char-eq">
        <span className="hz char-main" lang="zh-CN">{c}</span>
        {parts.length > 0 && <span className="op">=</span>}
        {parts.flatMap((el, k) => (k > 0 ? [<span key={`op${k}`} className="op">+</span>, el] : [el]))}
      </div>
      {i.h && !(i.s && i.f) && <p className="char-hint">{i.h}</p>}
    </div>
  )
}
