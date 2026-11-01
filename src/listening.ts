/**
 * Easy-listening suggestions for after the session: beginner channels in slow, clear Mandarin.
 * Links are YouTube searches, so they keep working if a channel moves.
 */
export const LISTENING = [
  { name: 'Comprehensible Chinese', note: 'Very simple Mandarin with pictures and gestures', q: 'Comprehensible Chinese beginner' },
  { name: 'Mandarin Click', note: 'Short stories, told slowly and clearly', q: 'Mandarin Click easy Chinese story' },
  { name: 'BlaBla Chinese', note: 'Super-beginner playlist', q: 'BlaBla Chinese super beginner' },
]

/** Today's suggestion: rotates daily. */
export function listeningToday(d = new Date()) {
  const day = Math.floor(+new Date(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
  const r = LISTENING[day % LISTENING.length]
  return { ...r, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(r.q)}` }
}

export const LISTEN_MINUTES = 8
