import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Focus } from './Focus'
import { Growth } from './Growth'
import Recall from './Recall'
import Session from './Session'
import WordBank from './WordBank'
import { UpdateNotice, UpdateRows } from './UpdateUI'
import { useUpdates, type Updates } from './updates'
import { PHRASES, WORDS } from './data'
import { hasRecordedAudio, initAudio, setSpeed } from './audio'
import { Icon } from './icons'
import { LISTEN_MINUTES, listeningToday } from './listening'
import { applyTheme, type Theme } from './theme'
import { Week } from './Week'
import {
  bestStreak, dueKeys, introducedToday, exportState, importState, load, logDay, newQuota, phrasesLearned, save, speedSuggestion, streak,
  today, wordsLearned, type AppState,
} from './store'
import { VERSION } from './updates'

const RECALL_AFTER_HOURS = 3
const isPast = (d: Date) => +d <= Date.now()
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
const dateLabel = (d = new Date()) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Only count it as backed up once the file was actually saved, not if the share sheet was cancelled. */
async function backup(state: AppState, commit: (fn: (s: AppState) => void) => void) {
  if (await exportState(state)) commit((s) => { s.lastBackup = new Date().toISOString() })
}

export default function App() {
  const [state, setState] = useState<AppState>(load)
  const [screen, setScreen] = useState<'home' | 'session' | 'settings' | 'bank' | 'recall'>('home')
  const [audioReady, setAudioReady] = useState(false)
  // Set when a session just ended, so today's seal stamps in once.
  const [justFinished, setJustFinished] = useState(false)
  const updates = useUpdates()

  useEffect(() => {
    initAudio().then(() => setAudioReady(true))
    // Ask the browser to keep our storage (helps on iOS)
    navigator.storage?.persist?.().catch(() => {})
  }, [])

  useEffect(() => setSpeed(state.settings.audioSpeed), [state.settings.audioSpeed])
  useEffect(() => applyTheme(state.settings.theme), [state.settings.theme])

  const commit = useCallback((fn: (s: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      save(next)
      return next
    })
  }, [])

  if (screen === 'session')
    return <Session state={state} commit={commit} onExit={() => { setJustFinished(true); setScreen('home') }} />
  if (screen === 'recall') return <Recall state={state} commit={commit} onExit={() => setScreen('home')} />
  if (screen === 'bank') return <WordBank state={state} onBack={() => setScreen('home')} />
  if (screen === 'settings')
    return <Settings state={state} commit={commit} updates={updates} replace={(s) => { save(s); setState(s) }} onBack={() => setScreen('home')} />

  const due = dueKeys(state).length
  const quota = newQuota(state)
  const newLeft = quota.words + quota.phrases
  const learned = wordsLearned(state)
  const phrases = phrasesLearned(state)
  const startedToday = !!state.history[today()]
  const doneToday = startedToday && due === 0 && newLeft === 0
  const listening = listeningToday()
  const days = streak(state)
  const faster = speedSuggestion(state)
  const daysSinceBackup = state.lastBackup ? Math.floor((Date.now() - +new Date(state.lastBackup)) / 86400000) : null
  const needsBackup = learned > 0 && (daysSinceBackup === null || daysSinceBackup >= 7)
  const listenedToday = !!state.history[today()]?.listened
  // Quick recall works best a few hours after the session, ideally before bed.
  const finishedAt = state.history[today()]?.finishedAt
  const recallFrom = finishedAt ? new Date(+new Date(finishedAt) + RECALL_AFTER_HOURS * 3600000) : undefined
  const recallReady = !recallFrom || isPast(recallFrom)
  const recalled = !!state.history[today()]?.recalled
  const freshCount = introducedToday(state).length
  const start = () => setScreen('session')

  // The one question this screen answers: what is today's practice?
  const work = [due > 0 && plural(due, 'review'), newLeft > 0 && plural(newLeft, 'new item')].filter(Boolean).join(' and ')
  let headline: string
  let sub: ReactNode
  if (doneToday) {
    headline = 'Done for today'
    sub = 'Next session tomorrow, after a night’s sleep: that’s when today’s words settle in.'
  } else if (state.introduced.length === 0) {
    headline = `Your first ${plural(newLeft, 'word')}`
    sub = 'Hear each one first and skip any you already know.'
  } else if (startedToday) {
    headline = 'Pick up where you left off'
    sub = `${work} left.`
  } else {
    headline = `${work.charAt(0).toUpperCase()}${work.slice(1)}`
    sub = due > 50
      ? `Reviews stop at 12 minutes, most at risk first; the rest wait for tomorrow.`
      : `About ${state.settings.sessionMinutes} minutes, plus optional listening.`
  }

  return (
    <div className="screen home">
      <header className="bar">
        <div className="wordmark">
          <span className="seal-mark hz" lang="zh-CN">每天</span>
          <span>Mandarin Daily</span>
        </div>
        <button className="icon-btn" onClick={() => setScreen('settings')} aria-label="Settings"><Icon name="settings" /></button>
      </header>

      <div className="notices">
        <UpdateNotice updates={updates} />
        {needsBackup && (
          <div className="notice">
            <Icon name="export" />
            <p>{daysSinceBackup === null ? 'Back up your progress to Files.' : `Last backup ${plural(daysSinceBackup, 'day')} ago.`}</p>
            <button className="btn small" onClick={() => backup(state, commit)}>Back up</button>
          </div>
        )}
        {faster && (
          <div className="notice">
            <Icon name="headphones" />
            <p>Listening is going well. Try audio at {Math.round(faster * 100)}%?</p>
            <div className="notice-actions">
              <button className="btn small" onClick={() => commit((s) => { s.settings.audioSpeed = faster; s.settings.speedNudgeAfter = inDays(7) })}>
                Try it
              </button>
              <button className="btn small ghost" onClick={() => commit((s) => { s.settings.speedNudgeAfter = inDays(7) })}>Not now</button>
            </div>
          </div>
        )}
      </div>

      <section className="today" aria-labelledby="today-title">
        <p className="date">{dateLabel()}</p>
        <h1 id="today-title">{headline}</h1>
        <p className="today-sub">{sub}</p>
        {quota.paused && !doneToday && (
          <p className="today-note">
            {newLeft === 0 ? 'New words are paused until reviews catch up.' : 'Fewer new words today while reviews catch up.'}
          </p>
        )}
        {doneToday ? (
          freshCount > 0 && recallReady && !recalled && (
            <button className="btn primary wide start" onClick={() => setScreen('recall')}>
              <Icon name="moon" /> Quick recall · 5 min
            </button>
          )
        ) : (
          <button className="btn primary wide start" onClick={start}>
            {startedToday ? 'Continue session' : 'Start today’s session'}
          </button>
        )}
      </section>

      {doneToday && (
        <section className="group more" aria-labelledby="more-title">
          <h2 id="more-title">More for today, all optional</h2>
          <div className="panel list">
            {/* Shown as the main button above while it's ready and not done */}
            {freshCount > 0 && !(recallReady && !recalled) && (
              <button className="list-row option" onClick={() => setScreen('recall')} disabled={recalled}>
                <Icon name="moon" />
                <span className="option-text">
                  <b>Quick recall · 5 min</b>
                  <small>
                    {recalled
                      ? 'Done today.'
                      : recallReady
                      ? `Say today’s ${plural(freshCount, 'new item')} from memory, plus a few weak ones. Best before bed.`
                      : `Say today’s ${plural(freshCount, 'new item')} from memory. Best after ${recallFrom!.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}, ideally before bed.`}
                  </small>
                </span>
                {recalled ? <Icon name="check" size={18} /> : <Icon name="chevron" size={18} />}
              </button>
            )}
            {!listenedToday && (
              <a className="list-row option" href={listening.url} target="_blank" rel="noreferrer"
                onClick={() => commit((s) => logDay(s, { listened: LISTEN_MINUTES }))}>
                <Icon name="headphones" />
                <span className="option-text">
                  <b>Easy listening · {LISTEN_MINUTES} min</b>
                  <small>{listening.name}: {listening.note.toLowerCase()}. Opens YouTube.</small>
                </span>
                <Icon name="external" size={18} />
              </a>
            )}
            <button className="list-row option" onClick={start}>
              <Icon name="practice" />
              <span className="option-text">
                <b>Extra practice · about 10 min</b>
                <small>Any reviews still due, then speaking and reading practice with recent words, the tone ladder and a dialogue.</small>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="week-title">
        <div className="panel-head">
          <h2 id="week-title">{days > 0 ? `${plural(days, 'day')} in a row` : 'This week'}</h2>
          {bestStreak(state) > days && <span className="muted num">Best {bestStreak(state)}</span>}
        </div>
        <Week history={state.history} stamp={justFinished} />
      </section>

      <Focus state={state} />

      <Growth state={state} />

      <section className="panel list" aria-label="Progress">
        <ProgressRow label="HSK 1 words" n={learned} total={WORDS.length} />
        <ProgressRow label="Phrases" n={phrases} total={PHRASES.length} />
        {state.introduced.length > 0 && (
          <button className="list-row nav" onClick={() => setScreen('bank')}>
            <span>Word bank</span>
            <span className="value">{plural(state.introduced.length, 'item')} studied</span>
            <Icon name="chevron" size={18} />
          </button>
        )}
      </section>

      {audioReady && !hasRecordedAudio() && (
        <p className="foot">Using your phone’s built-in Chinese voice. Run the audio script for better quality.</p>
      )}
      <p className="foot num">Version {VERSION}</p>
    </div>
  )
}

function ProgressRow({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <div className="list-row progress-row">
      <span>{label}</span>
      <span className="value num">{n} <span className="of">/ {total}</span></span>
      <div className="meter" role="progressbar" aria-label={label} aria-valuenow={n} aria-valuemax={total}>
        <div style={{ width: `${(n / total) * 100}%` }} />
      </div>
    </div>
  )
}

function Settings({ state, commit, updates, replace, onBack }: {
  updates: Updates
  state: AppState
  commit: (fn: (s: AppState) => void) => void
  replace: (s: AppState) => void
  onBack: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: 'newPerDay' | 'phrasesPerDay' | 'sessionMinutes' | 'audioSpeed', v: number) =>
    commit((s) => {
      s.settings[k] = v
      if (k === 'audioSpeed') s.settings.speedNudgeAfter = inDays(7) // you chose a speed: don't nudge for a week
    })
  const weeks = Math.ceil(WORDS.length / state.settings.newPerDay / 7)

  return (
    <div className="screen settings">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <h1 className="bar-title">Settings</h1>
        <span className="icon-btn" aria-hidden="true" />
      </header>

      <section className="group">
        <h2>Daily plan</h2>
        <div className="panel list">
          <label className="list-row">
            <span>New words</span>
            <select value={state.settings.newPerDay} onChange={(e) => set('newPerDay', +e.target.value)}>
              {[3, 4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n} a day</option>)}
            </select>
          </label>
          <label className="list-row">
            <span>New phrases</span>
            <select value={state.settings.phrasesPerDay} onChange={(e) => set('phrasesPerDay', +e.target.value)}>
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} a day</option>)}
            </select>
          </label>
          <label className="list-row">
            <span>Session length</span>
            <select value={state.settings.sessionMinutes} onChange={(e) => set('sessionMinutes', +e.target.value)}>
              {[15, 20, 25, 30, 35, 40, 45, 60].map((n) => <option key={n} value={n}>{n} min</option>)}
            </select>
          </label>
        </div>
        <p className="group-note">
          At {state.settings.newPerDay} a day you cover all {WORDS.length} HSK 1 words in about {weeks} weeks. Words you
          already know don’t count. More new words means more reviews for weeks after.
        </p>
      </section>

      <section className="group">
        <h2>Audio</h2>
        <div className="panel list">
          <label className="list-row">
            <span>Speed</span>
            <select value={state.settings.audioSpeed} onChange={(e) => set('audioSpeed', +e.target.value)}>
              {[0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1].map((n) => <option key={n} value={n}>{Math.round(n * 100)}%</option>)}
            </select>
          </label>
        </div>
        <p className="group-note">Start slow and move toward 100% as listening gets easier. Slow buttons play at 70% of this.</p>
      </section>

      <section className="group">
        <h2>Appearance</h2>
        <div className="panel list">
          <div className="list-row">
            <span>Theme</span>
            <div className="seg-control" role="group" aria-label="Theme">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <button key={t} className={(state.settings.theme ?? 'system') === t ? 'on' : ''} aria-pressed={(state.settings.theme ?? 'system') === t}
                  onClick={() => commit((s) => { s.settings.theme = t })}>
                  {{ system: 'System', light: 'Light', dark: 'Dark' }[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="group-note">System follows your iPhone’s light or dark setting.</p>
      </section>

      <section className="group">
        <h2>Backup</h2>
        <div className="panel list">
          <button className="list-row action" onClick={() => backup(state, commit)}>
            <Icon name="export" /><span>Export backup</span>
          </button>
          <button className="list-row action" onClick={() => fileRef.current?.click()}>
            <Icon name="import" /><span>Import backup</span>
          </button>
        </div>
        <input
          ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              const s = await importState(f)
              if (confirm(`Replace current progress with this backup (${wordsLearned(s)} words)?`)) replace(s)
            } catch (err) {
              alert((err as Error).message)
            }
          }}
        />
        <p className="group-note">
          {state.lastBackup
            ? `Last backup ${new Date(state.lastBackup).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}. `
            : 'No backup yet. '}
          Progress lives only on this device, so keep a copy in Files.
        </p>
      </section>

      <section className="group">
        <h2>App</h2>
        <div className="panel list">
          <UpdateRows updates={updates} />
        </div>
      </section>

      <section className="group">
        <div className="panel list">
          <button
            className="list-row action danger"
            onClick={() => confirm('Delete all progress on this device? This cannot be undone.') && replace({ ...load(), cards: {}, introduced: [], history: {} })}
          >
            <span>Reset progress</span>
          </button>
        </div>
        <p className="group-note">Deletes every word, review and streak on this device. Export a backup first.</p>
      </section>
    </div>
  )
}
