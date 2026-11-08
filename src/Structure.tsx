import { WORD_BY_ID, shortGloss, type Word } from './data'

/** Particles get no gloss: their block's label already says what they do. */
const gloss = (w: Word) => ('了吗呢吧'.includes(w.hanzi) ? '' : shortGloss(w))

/**
 * A sentence split into its parts, in the basic order Subject → When → Where → How → Verb → Object.
 * Only the skeleton (subject, verb, object) is coloured, in hues kept apart from the tone colours;
 * the rest are labelled neutral blocks, so colour never has to be decoded on its own.
 */
export function Structure({ w, order }: { w: Word; order?: boolean }) {
  if (!w.structure) return null
  return (
    <div className="structure" aria-label="Sentence structure">
      {w.structure.map((clause, i) => (
        <div key={i} className="clause">
          {clause.map((c, j) => (
            <div key={j} className={`chunk r-${c.role}`}>
              <span className="chunk-label">{c.label}</span>
              <span className="chunk-words">
                {c.ids.map((id, k) => {
                  const x = WORD_BY_ID.get(id)!
                  return (
                    <span key={k} className={`chunk-word ${id === w.id ? 'focus' : ''}`}>
                      <span className="hz" lang="zh-CN">{x.hanzi}</span>
                      <small>{gloss(x)}</small>
                    </span>
                  )
                })}
              </span>
            </div>
          ))}
        </div>
      ))}
      {order && <p className="structure-order">Chinese word order: Subject → When → Where → How → Verb → Object</p>}
    </div>
  )
}
