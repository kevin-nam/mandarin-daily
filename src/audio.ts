// Plays pre-generated MP3s from /audio when available (see scripts/generate_audio.py),
// otherwise falls back to the device's built-in Mandarin voice.

let manifest: Set<string> | null = null
// One shared <audio> element: iOS unlocks it on the first tap, so later
// programmatic plays (auto-play, drill answers) are allowed.
let el: HTMLAudioElement | null = null
const audioEl = () => (el ??= new Audio())
let pending: (() => void) | null = null
let speed = 1
/** Playback speed for "normal" audio (1 = as recorded); slow is 70% of this. */
export const setSpeed = (x: number) => { speed = x }
let ep = 0
/** Changes every time playback is stopped — loops use it to bail out. */
export const epoch = () => ep

export async function initAudio() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
    if (res.ok) manifest = new Set(await res.json())
  } catch {
    manifest = null
  }
}

export function hasRecordedAudio() {
  return !!manifest && manifest.size > 0
}

function zhVoice() {
  const voices = speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'zh-CN') ?? voices.find((v) => v.lang.startsWith('zh'))
}

export function stop() {
  ep++
  el?.pause()
  pending?.()
  pending = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

/** key: audio file name (without .mp3); text: Chinese text for the TTS fallback. */
export function play(key: string, text: string, opts: { slow?: boolean } = {}): Promise<void> {
  stop()
  const rate = speed * (opts.slow ? 0.7 : 1)
  if (manifest?.has(key)) {
    return new Promise((resolve) => {
      pending = resolve
      const a = audioEl()
      a.src = `${import.meta.env.BASE_URL}audio/${key}.mp3`
      a.playbackRate = rate
      a.onended = () => resolve()
      a.onerror = () => resolve()
      a.play().catch(() => resolve())
    })
  }
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    const v = zhVoice()
    if (v) u.voice = v
    u.rate = 0.9 * rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

export const wordKey = (id: string) => id
export const sentenceKey = (id: string) => `${id}s`
export const lineKey = (dialogueId: string, i: number) => `${dialogueId}-${i}`

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
