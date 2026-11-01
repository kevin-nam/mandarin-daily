import { useState } from 'react'
import { Icon } from './icons'
import { VERSION, type Updates } from './updates'

export function UpdateNotice({ updates }: { updates: Updates }) {
  if (!updates.ready) return null
  return (
    <div className="notice">
      <Icon name="refresh" />
      <p>A new version is ready.</p>
      <button className="btn small primary" onClick={updates.apply}>Update</button>
    </div>
  )
}

/** Settings rows: the version, and a check that reports what it found. */
export function UpdateRows({ updates }: { updates: Updates }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const check = async () => {
    setBusy(true)
    setMsg('Checking…')
    setMsg(await updates.check())
    setBusy(false)
  }
  return (
    <>
      <div className="list-row">
        <span>Version</span>
        <span className="value num">{VERSION}</span>
      </div>
      {updates.ready ? (
        <button className="list-row action" onClick={updates.apply}>
          <Icon name="refresh" /><span>Install the new version</span>
        </button>
      ) : (
        <button className="list-row action" onClick={check} disabled={busy}>
          <Icon name="refresh" /><span>{busy ? 'Checking…' : 'Check for updates'}</span>
        </button>
      )}
      {msg && !busy && <p className="list-note" role="status">{msg}</p>}
    </>
  )
}
