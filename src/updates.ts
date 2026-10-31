import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** "1.1.0" → "1.1" */
export const VERSION = __APP_VERSION__.replace(/\.0$/, '')

/**
 * New versions download in the background and wait; `ready` turns true once one is
 * downloaded, and `apply()` switches to it (reloads the app). Also checks for a new
 * version whenever the app comes back to the foreground, since a home-screen app can
 * stay open in memory for days.
 */
export function useUpdates() {
  const reg = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const { needRefresh: [ready], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, r) {
      reg.current = r
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r?.update().catch(() => {})
      })
    },
  })

  /** Looks for a new version now; resolves to a message for the user. */
  const check = async () => {
    const r = reg.current
    if (!r) return 'Updates aren’t available in this browser.'
    try {
      await r.update()
    } catch {
      return 'Couldn’t check. Are you offline?'
    }
    if (r.waiting) return ''
    if (r.installing) return 'Downloading the new version…'
    return `You’re up to date (version ${VERSION}).`
  }

  return { ready, apply: () => updateServiceWorker(true), check }
}

export type Updates = ReturnType<typeof useUpdates>
