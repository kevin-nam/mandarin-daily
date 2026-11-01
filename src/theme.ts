export type Theme = 'system' | 'light' | 'dark'

const BAR = { light: '#f3f2ee', dark: '#121110' }

/**
 * Light or dark regardless of the phone's setting, or follow the phone ('system').
 * index.css reads `data-theme`; the status bar colour (theme-color) follows too.
 */
export function applyTheme(theme: Theme = 'system') {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const own = m.media.includes('dark') ? BAR.dark : BAR.light
    m.content = theme === 'system' ? own : BAR[theme]
  })
}
