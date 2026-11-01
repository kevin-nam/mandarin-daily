import { today } from './store'

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'] // 星期一 … 星期日
const EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Monday to Sunday of the current week. */
function thisWeek(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return WEEKDAY.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
}

/**
 * This week, Monday to Sunday, as seals: a day you practised is stamped in red with its
 * Chinese weekday. `stamp` animates today's seal landing (right after a session).
 */
export function Week({ history, stamp }: { history: Record<string, unknown>; stamp: boolean }) {
  const days = thisWeek()
  const todayKey = today()
  const first = Object.keys(history).sort()[0] ?? todayKey // days before you started aren't missed
  return (
    <ol className="week" aria-label="This week">
      {WEEKDAY.map((zh, i) => {
        const d = days[i]
        const key = today(d)
        const done = !!history[key]
        const state = done ? 'done' : key === todayKey ? 'today' : key < todayKey ? (key > first ? 'missed' : 'before') : 'future'
        const cls = `day is-${state} ${stamp && key === todayKey && done ? 'stamp' : ''}`
        const label = `${EN[i]} ${d.getDate()}: ${{ done: 'practised', today: 'today, not yet', missed: 'missed', before: 'before you started', future: 'coming up' }[state]}`
        return (
          <li key={key} className={cls} aria-label={label}>
            <span className="seal hz" aria-hidden="true">{zh}</span>
            <span className="date" aria-hidden="true">{d.getDate()}</span>
          </li>
        )
      })}
    </ol>
  )
}
