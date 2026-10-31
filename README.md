# Mandarin Daily (每天)

A personal, offline-first PWA for daily Mandarin listening and speaking practice, aimed at **new HSK 1 (2026, 294 words)**. Built for iPhone, no microphone, no backend, no database, no paid APIs.

## Daily session (~25 min)

| Step | Time | What you do | Why |
|---|---|---|---|
| Review | ≤10 min | Due cards, mixed: **listen** (audio → meaning), **speak** (English → say it aloud), **read** (character → pinyin/meaning). Rate Again/Hard/Good/Easy. | Retrieval practice + FSRS spaced repetition |
| New words | ~5 min | 5 words, each inside a sentence. Shadow ×4 (slow → normal). | Context + production effect |
| Speak | ≤5 min | English prompt → 4 s to say it aloud → hear the answer twice. Missed items come back sooner; items retire after 2 hits. | Prompted recall with expanding intervals |
| Dialogue | ~3 min | Listen with no text → listen while reading → shadow line by line. | Comprehensible input |
| Tones | ~2 min | Hear a syllable, pick the tone (15 rounds). | Early tone perception training |

At 5 new words/day you cover all of HSK 1 in about 9 weeks.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
```

### Better audio (recommended, free)

Out of the box the app uses the iPhone's built-in Chinese voice. For natural neural voices, generate MP3s once:

```bash
pip install edge-tts
npm run audio        # writes public/audio/*.mp3 + manifest.json (~650 files)
npm run build
```

The app automatically uses the MP3s when `public/audio/manifest.json` exists.

## Put it on your iPhone

1. Deploy `dist/` to any static host. Easiest: import this repo on [Netlify](https://app.netlify.com) or [Vercel](https://vercel.com) (build command `npm run build`, output `dist`).
2. Open the URL in **Safari** → Share → **Add to Home Screen**.
3. Always launch from the home-screen icon (Safari can clear storage for sites you don't install).
4. Turn the silent switch off during sessions — it mutes web audio.

## Your progress

- Stored in the browser's `localStorage` on your phone. Nothing leaves the device.
- **Back up weekly:** Settings → Export backup → Save to Files. The home screen reminds you every 7 days.
- Restore with Settings → Import backup.

## Editing content

- Words: `content/words1-3.tsv` — `hanzi|pinyin|english|sentence|sentence pinyin|sentence english`. Order = teaching order.
- Dialogues: `content/dialogues.json` (`unlockAfter` = number of words learned before it unlocks).
- After editing: `npm run data` (rebuilds `src/data/*.json`), then `npm run audio` for new audio.

## Structure

```
content/            source word lists + dialogues (edit these)
scripts/            build-data.mjs, generate_audio.py
src/data/           generated JSON
src/store.ts        state, FSRS scheduling (ts-fsrs), backup
src/audio.ts        MP3 playback with device-voice fallback
src/Session.tsx     the five session steps
src/App.tsx         home + settings
```

Word list source: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), 2026 HSK level 1. Example sentences, pinyin and translations written for this app.
