import { WORD_BY_ID, type Word } from './data'

/** Short gloss under each word; grammar words get what they do rather than "(particle)". */
const GRAMMAR: Record<string, string> = {
  的: '’s', 们: 'plural', 个: 'measure', 本: 'measure', 件: 'measure', 只: 'measure', 口: 'measure', 第: '-th',
  了: '', 吗: '', 呢: '', 吧: '',
}
const gloss = (w: Word) => GRAMMAR[w.hanzi] ?? w.en.split(';')[0].replace(/\s*\(.*?\)\s*/g, ' ').trim()

/**
 * A sentence split into its parts, in the basic order Subject → When → Where → How → Verb → Object.
 * Only the skeleton (subject, verb, object) is coloured, in hues kept apart from the tone colours;
 * the rest are labelled neutral blocks, so colour never has to be decoded on its own.
 */
export function Structure({ w }: { w: Word }) {
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
      <p className="structure-order">Order: Subject → When → Where → How → Verb → Object</p>
    </div>
  )
}
