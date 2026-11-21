/**
 * Accidental double taps. When a tap changes the screen, the next screen's button often sits right
 * where the first one was: tap "Show answer" twice and the second tap grades the card ("Hard" or
 * "Good" is under your finger). So a button can't be clicked for TAP_GUARD_MS after it appeared or its
 * label changed. Buttons that update on their own (the session timer) opt out with data-tap-free.
 */
export const TAP_GUARD_MS = 300

export function installTapGuard(root: HTMLElement = document.body) {
  const changed = new WeakMap<Element, number>()
  const touch = (el: Element | null | undefined, now: number) => {
    const b = el?.closest('button')
    if (b) changed.set(b, now)
  }
  const observer = new MutationObserver((records) => {
    const now = performance.now()
    for (const r of records) {
      if (r.type === 'characterData') {
        touch(r.target.parentElement, now)
        continue
      }
      r.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return touch(n.parentElement, now)
        touch(n, now)
        n.querySelectorAll('button').forEach((b) => changed.set(b, now))
      })
      // A label replaced inside a button that stayed (React reuses the element: "More time" → "Missed it").
      if (r.addedNodes.length && r.target instanceof Element) touch(r.target, now)
    }
  })
  observer.observe(root, { childList: true, subtree: true, characterData: true })
  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest?.('button')
    if (!b || b.hasAttribute('data-tap-free')) return
    const t = changed.get(b)
    if (t !== undefined && performance.now() - t < TAP_GUARD_MS) {
      e.stopPropagation()
      e.preventDefault()
    }
  }
  root.addEventListener('click', onClick, true)
  return () => {
    observer.disconnect()
    root.removeEventListener('click', onClick, true)
  }
}
