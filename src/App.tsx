import { useCallback, useEffect, useRef, useState } from 'react'
import Session from './Session'
import WordBank from './WordBank'
import { PHRASES, WORDS } from './data'
import { hasRecordedAudio, initAudio, setSpeed } from './audio'
import {
  dueKeys, exportState, importState, load, newQuota, phrasesLearned, save, speedSuggestion, streak, today,
  wordsLearned, type AppState,
} from './store'

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

/** Only count it as backed up once the file was actually saved, not if the share sheet was cancelled. */
async function backup(state: AppState, commit: (fn: (s: AppState) => void) => void) {
  if (await exportState(state)) commit((s) => { s.lastBackup = new Date().toISOString() })
}

export default function App() {
  const [state, setState] = useState<AppState>(load)
  const [screen, setScreen] = useState<'home' | 'session' | 'settings' | 'bank'>('home')
  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    initAudio().then(() => setAudioReady(true))
    // Ask the browser to keep our storage (helps on iOS)
    navigator.storage?.persist?.().catch(() => {})
  }, [])

  useEffect(() => setSpeed(state.settings.audioSpeed), [state.settings.audioSpeed])

  const commit = useCallback((fn: (s: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      save(next)
      return next
    })
  }, [])

  if (screen === 'session') return <Session state={state} commit={commit} onExit={() => setScreen('home')} />
  if (screen === 'bank') return <WordBank state={state} onBack={() => setScreen('home')} />
  if (screen === 'settings')
    return <Settings state={state} commit={commit} replace={(s) => { save(s); setState(s) }} onBack={() => setScreen('home')} />

  const due = dueKeys(state).length
  const quota = newQuota(state)
  const newLeft = quota.words + quota.phrases
  const learned = wordsLearned(state)
  const phrases = phrasesLearned(state)
  const startedToday = !!state.history[today()]
  const doneToday = startedToday && due === 0 && newLeft === 0
  const days = streak(state)
  const faster = speedSuggestion(state)
  const pct = Math.round((learned / WORDS.length) * 100)
  const daysSinceBackup = state.lastBackup ? Math.floor((Date.now() - +new Date(state.lastBackup)) / 86400000) : null
  const needsBackup = learned > 0 && (daysSinceBackup === null || daysSinceBackup >= 7)

  return (
    <div className="home">
      <header>
        <h1>每天 <span>Mandarin Daily</span></h1>
        <button className="link" onClick={() => setScreen('settings')} aria-label="Settings">⚙︎</button>
      </header>

      <div className="card stats">
        <div><b>{days > 0 ? `🔥${days}` : 0}</b><span>day streak</span></div>
        <div><b>{due}</b><span>due</span></div>
        <div><b>{newLeft}</b><span>new today</span></div>
      </div>

      <div className="card">
        <div className="progress-label">HSK 1 · {learned}/{WORDS.length} words</div>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="progress-label gap">Phrases · {phrases}/{PHRASES.length}</div>
        <div className="progress"><div style={{ width: `${Math.round((phrases / PHRASES.length) * 100)}%` }} /></div>
        {learned + phrases > 0 && (
          <button className="secondary wide gap" onClick={() => setScreen('bank')}>📖 Word bank</button>
        )}
      </div>

      {faster && (
        <div className="banner speed">
          <p>🎧 Your listening is going well. Try audio at {Math.round(faster * 100)}% (now {Math.round(state.settings.audioSpeed * 100)}%)?</p>
          <div className="row center">
            <button className="secondary" onClick={() => commit((s) => { s.settings.audioSpeed = faster; s.settings.speedNudgeAfter = inDays(7) })}>
              Try {Math.round(faster * 100)}%
            </button>
            <button className="link small" onClick={() => commit((s) => { s.settings.speedNudgeAfter = inDays(7) })}>Not now</button>
          </div>
        </div>
      )}

      {quota.paused && newLeft === 0 && !doneToday && (
        <p className="hint center-text">New words paused: catch up on reviews first.</p>
      )}
      {quota.paused && newLeft > 0 && <p className="hint center-text">Fewer new words today while you catch up on reviews.</p>}

      {doneToday ? (
        <>
          <div className="card center-text">
            <h2>✓ Done for today</h2>
            <p className="hint">Come back tomorrow, after a night's sleep.</p>
          </div>
          <button className="secondary wide" onClick={() => setScreen('session')}>Practice anyway</button>
        </>
      ) : (
        <button className="primary start" onClick={() => setScreen('session')}>
          {startedToday ? 'Continue today’s session' : 'Start today’s session'}
          <small>~{state.settings.sessionMinutes} min</small>
        </button>
      )}

      {needsBackup && (
        <button className="banner" onClick={() => backup(state, commit)}>
          💾 Back up your progress (Save to Files)
        </button>
      )}
      {audioReady && !hasRecordedAudio() && (
        <p className="hint center-text">Using your phone’s built-in Chinese voice. Run the audio script for better quality.</p>
      )}
    </div>
  )
}

function Settings({ state, commit, replace, onBack }: {
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

  return (
    <div className="home">
      <header>
        <button className="link" onClick={onBack}>‹ Back</button>
        <h1>Settings</h1>
        <span />
      </header>
      <div className="card form">
        <label>
          New words per day
          <select value={state.settings.newPerDay} onChange={(e) => set('newPerDay', +e.target.value)}>
            {[3, 4, 5, 6, 7, 8, 10].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <p className="hint">5/day finishes all {WORDS.length} HSK 1 words in ~9 weeks. Words you mark as already known don't count.</p>
        <label>
          New phrases per day
          <select value={state.settings.phrasesPerDay} onChange={(e) => set('phrasesPerDay', +e.target.value)}>
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <p className="hint">Travel and conversation phrases ({PHRASES.length} total).</p>
        <label>
          Audio speed
          <select value={state.settings.audioSpeed} onChange={(e) => set('audioSpeed', +e.target.value)}>
            {[0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1].map((n) => <option key={n} value={n}>{Math.round(n * 100)}%</option>)}
          </select>
        </label>
        <p className="hint">Start slow; move toward 100% as listening gets easier.</p>
        <label>
          Session length (min)
          <select value={state.settings.sessionMinutes} onChange={(e) => set('sessionMinutes', +e.target.value)}>
            {[15, 20, 25, 30, 45, 60].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="card form">
        <button className="secondary wide" onClick={() => backup(state, commit)}>
          💾 Export backup
        </button>
        <button className="secondary wide" onClick={() => fileRef.current?.click()}>📂 Import backup</button>
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
        <p className="hint">{state.lastBackup ? `Last backup: ${state.lastBackup.slice(0, 10)}` : 'No backup yet.'}</p>
      </div>
      <div className="card form">
        <button
          className="danger wide"
          onClick={() => confirm('Delete ALL progress? This cannot be undone.') && replace({ ...load(), cards: {}, introduced: [], history: {} })}
        >
          Reset progress
        </button>
      </div>
    </div>
  )
}
