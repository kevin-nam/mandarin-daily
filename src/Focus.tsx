import { WORD_BY_ID } from './data'
import {
  LADDER_PASS, LADDER_WINDOW, TONE_LEVELS, cardKey, ladderName, ladderRecent, level, toneLevel, trickyReads, type AppState,
} from './store'
import { Tally } from './ui'

/**
 * What the app is working on with you right now: the tone ladder step and the characters you keep
 * mixing up. The session adapts to both; this makes that visible between sessions.
 */
export function Focus({ state }: { state: AppState }) {
  if (state.introduced.length === 0) return null
  const tricky = trickyReads(state)
  const step = toneLevel(state)
  const onLadder = step < TONE_LEVELS.length
  if (!onLadder && tricky.length === 0) return null
  const recent = ladderRecent(state)
  const right = recent.reduce((a, b) => a + b, 0)
  const need = Math.round(LADDER_PASS * LADDER_WINDOW)
  return (
    <section className="panel focus" aria-labelledby="focus-title">
      <div className="panel-head"><h2 id="focus-title">Working on</h2></div>
      {onLadder && (
        <div className="focus-item">
          <p className="focus-title">
            <b>Tones: {ladderName(step)}</b>
            <span className="num">Step {step + 1} of {TONE_LEVELS.length}</span>
          </p>
          <Tally recent={recent} of={LADDER_WINDOW} />
          <p className="focus-note num">
            {recent.length ? `${right} of your last ${recent.length} right. ` : ''}{need} of {LADDER_WINDOW} unlocks {ladderName(step + 1)}.
          </p>
        </div>
      )}
      {tricky.length > 0 && (
        <div className="focus-item">
          <p className="focus-title"><b>Characters you mix up</b></p>
          <ul className="growth-chips">
            {tricky.map((id) => {
              const w = WORD_BY_ID.get(id)!
              return <li key={id} className={`hz lv${level(state.cards[cardKey(id, 'read')])}`} lang="zh-CN" title={w.en}>{w.hanzi}</li>
            })}
          </ul>
          <p className="focus-note">Each comes back in the Speak step with its look-alike until you read it well.</p>
        </div>
      )}
    </section>
  )
}
