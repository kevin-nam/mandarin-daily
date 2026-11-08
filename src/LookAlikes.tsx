import type { Word } from './data'
import { lookalikes } from './lookalike'
import { Pinyin } from './Pinyin'

/** Studied characters that look like this one, side by side, with what tells them apart. */
export function LookAlikes({ w, studied }: { w: Word; studied: string[] }) {
  const like = lookalikes(w, studied)
  if (like.length === 0) return null
  return (
    <section className="lookalikes">
      <h3>Don’t mix up</h3>
      <ul>
        {[{ w, why: '' }, ...like.map((x) => ({ w: x.w, why: x.like.why }))].map((x) => (
          <li key={x.w.id} className={x.w.id === w.id ? 'this' : ''}>
            <span className="hz lk-char" lang="zh-CN">{x.w.hanzi}</span>
            <span className="lk-text">
              <span><Pinyin text={x.w.pinyin} /> · {x.w.en.split(';')[0]}</span>
              {x.why && <small>{x.why}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
