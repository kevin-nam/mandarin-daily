import { CHARS } from './data'

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
    <div className="char-parts">
      <p className="char-parts-title">How it’s built</p>
      {rows}
    </div>
  )
}

function CharRow({ c, known }: { c: string; known: Set<string> }) {
  const i = CHARS[c]
  const part = (p: string, note: string) => (
    <span className={`part ${known.has(p) ? 'known' : ''}`}>
      <span className="part-char">{p}</span>
      <small>{note}{known.has(p) && ' ✓'}</small>
    </span>
  )
  if (i.s && i.f) {
    return (
      <div className="char-row">
        <span className="char-main">{c}</span>
        <span className="char-eq">=</span>
        {part(i.s, `${CHARS[i.s]?.m ?? ''} · meaning`)}
        <span className="char-eq">+</span>
        {part(i.f, `${CHARS[i.f]?.p ?? ''} · sound`)}
      </div>
    )
  }
  return (
    <div className="char-row">
      <span className="char-main">{c}</span>
      {i.c && (
        <>
          <span className="char-eq">=</span>
          {i.c.map((p, k) => (
            <span key={p} className="char-plus">
              {k > 0 && <span className="char-eq">+</span>}
              {part(p, CHARS[p]?.m ?? '')}
            </span>
          ))}
        </>
      )}
      {i.h && <span className="char-hint">{i.h}</span>}
    </div>
  )
}
