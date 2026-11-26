/**
 * Easy-listening suggestions for after the session: beginner channels in slow, clear Mandarin.
 * Links are YouTube searches, so they keep working if a channel moves.
 */
export const LISTENING = [
  { name: 'Comprehensible Chinese', note: 'Very simple Mandarin with pictures and gestures', q: 'Comprehensible Chinese beginner' },
  { name: 'Mandarin Click', note: 'Short stories, told slowly and clearly', q: 'Mandarin Click easy Chinese story' },
  { name: 'BlaBla Chinese', note: 'Super-beginner playlist', q: 'BlaBla Chinese super beginner' },
  { name: 'Peppa Pig in Mandarin', note: 'Short episodes about family, food and play, in clear everyday Mandarin', q: '小猪佩奇 中文 Peppa Pig Mandarin' },
  { name: 'Growing Up with Chinese', note: 'A CCTV series for learners starting from zero, explained in English', q: 'Growing Up with Chinese CCTV' },
]

/** Today's suggestion: rotates daily. */
export function listeningToday(d = new Date()) {
  const day = Math.floor(+new Date(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
  const r = LISTENING[day % LISTENING.length]
  return { ...r, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(r.q)}` }
}

export const LISTEN_MINUTES = 8
