import { useState } from 'react'
import { VERSION, type Updates } from './updates'

export function UpdateBanner({ updates }: { updates: Updates }) {
  if (!updates.ready) return null
  return (
    <button className="banner update" onClick={updates.apply}>
      ✨ New version ready: tap to update
    </button>
  )
}

export function CheckForUpdates({ updates }: { updates: Updates }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <UpdateBanner updates={updates} />
      {!updates.ready && (
        <button
          className="secondary wide"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setMsg('Checking…')
            setMsg(await updates.check())
            setBusy(false)
          }}
        >
          Check for updates
        </button>
      )}
      <p className="hint">{msg || `Version ${VERSION}`}</p>
    </>
  )
}
