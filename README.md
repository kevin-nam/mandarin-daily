# Mandarin Daily (每天)

A personal, offline-first PWA for daily Mandarin listening and speaking practice, aimed at **new HSK 1 (2026, 294 words)** plus 58 travel and conversation phrases. Built for iPhone: no microphone, no backend, no database, no paid APIs.

**Version 1.1.1** · see [Changelog](#changelog) · ideas not built yet: [BACKLOG.md](BACKLOG.md)

## Who it's for

One learner, and every design decision follows from this profile:

| | |
|---|---|
| Background | Heritage exposure: heard Mandarin growing up, knows very basic words, below HSK 1. Understanding is ahead of speaking. |
| Goal | Conversation, travel, daily life. Not exams. |
| Where | Phone in hand (commute, breaks). Can **whisper or mouth** words, rarely speak aloud. |
| Microphone | **No.** No recording, no speech recognition. |
| Characters | Wants to **read** properly. Does **not** want handwriting/character-writing practice. |
| Partner | None: the app is the main practice. |
| Feedback so far | ~25 min sessions feel right. Day 2 data: no Again ratings; reading (characters) is the weak skill (8 of 15 Hard), speaking mostly Good; ~9 s per review card. Most HSK 1 words are new. Normal-speed audio was too fast (hence 85% default). 4 s to answer was too short (hence 5–12 s scaled to length). |

So: speaking (productive recall) gets priority; prompts never demand speaking out loud; known words can be skipped fast; phrases and dialogues target real situations; role-play stands in for a partner.

## Daily session (~25 min)

| Step | Time | What you do | Why |
|---|---|---|---|
| Review | ≤8 min | Due cards, mixed: **listen** (audio → meaning), **speak** (English → say it), **read** (character → pinyin/meaning), and **sentence** (whole example sentence in characters only; unlocks per word once its read card is Good). Most-at-risk cards first, speak cards prioritised (2 speak : 1 other). Rate Again (missed it, even partly: wrong tone, wrong meaning) / Hard (got it, slowly or with effort) / Good (got it) / Easy (instantly). | Retrieval practice + FSRS spaced repetition; productive recall builds speaking |
| New words | ~5 min | 5 words (each inside a sentence) + 2 phrases. Hear it first: **I know it** → confirm → skipped ahead (listen card marked Easy, speak/read still tested, doesn't use up the daily quota). **New to me** → shadow ×4 (slow → normal). | Skip what you already understand (heritage learners); pretesting; context + production effect |
| Speak | ≤6 min | English prompt → 5–12 s (scaled to length) to say it (whisper/mouth is fine) → hear the answer twice. Missed items come back sooner; items retire after 2 hits. | Prompted recall with expanding intervals |
| Dialogue | ~4 min | Listen with no text → listen while reading → shadow line by line → **role-play**: the app plays the other speaker, you say your line from the English before the model plays (switch sides any time). Early dialogues are built from the phrases you've learned, so there's one from day 1. | Comprehensible input; task-based practice |
| Tones | ~2 min | 6 single syllables, then 9 two-syllable words (pick each syllable's tone), each in a random one of 4 voices. | Multi-talker tone perception training |

At 5 new words/day you cover all of HSK 1 in about 9 weeks, faster if you mark words you already know. Phrases take about a month at 2/day.

## How the app paces you

- **Once a day.** New words reset at local midnight. New cards' first review is the *next* day (after sleep). Every grade schedules whole days (FSRS same-day learning steps are off: the session's own repetition covers same-day practice). After a session the home screen says **Done for today**; "Practice anyway" is there but same-day re-practice adds little.
- **Missing a day** costs only the streak. Reviews wait; the 8-min cap keeps sessions the same length; leftovers roll over (most at risk first). If reviewed cards are carried over from earlier days, new words are halved (>10 behind) or paused (>30 behind) until you catch up.
- **Audio speed** starts at 85% (Settings: 70–100%; 🐢 slow = 70% of it). Once ≥20 listen cards are reviewed and 70% are Good or better, the home screen suggests the next 5% step; "Not now" or changing it yourself pauses that for a week.
- **Word bank** (home screen): every studied item with a strength per skill — 👂 listening, 🗣 speaking, 字 reading, 句 sentences — from FSRS stability: Not tested · Learning (<2 d or relearning) · Getting there (<7 d) · Good (<30 d) · Strong. Search by 字, English, or pinyin without tone marks.
- **Streak** (🔥) on the home screen and at the end of a session.

## Research behind it

Retrieval practice and the testing effect (Roediger & Karpicke 2006) · productive vs receptive recall (Webb 2009) · production effect, incl. mouthing (MacLeod et al. 2010) · heritage learners' receptive > productive skills (Montrul 2010; Kagan & Dillon 2001) · pretesting (Richland et al. 2009) · formulaic phrases and fluency (Boers et al. 2006) · task-based practice (Ellis 2003) · multi-talker tone training (Wang et al. 1999, 2003) · comprehensible input / narrow listening (Krashen 1996) · slower speech for beginners (Griffiths 1992) · spacing (Cepeda et al. 2006) · sleep consolidation (Diekelmann & Born 2010) · habit formation (Lally et al. 2010) · divided attention at encoding (Craik et al. 1996, for the backlog's grind mode).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
```

### Audio

The app plays neural-voice MP3s from `public/audio/` (falls back to the phone's built-in Chinese voice for anything missing). They're committed, so a host can build without Python. To (re)generate:

```bash
pip install edge-tts
npm run audio        # only new/changed text; ~1,470 files, ~17 MB
npm run build
```

Voices: words/sentences/phrases and dialogue speaker A = Xiaoxiao, dialogue speaker B = Yunxi, tone drill extra voices = Yunyang, Xiaoyi, Yunjian (`v1-`…`v3-` files). Everything is generated at −10% rate. Clips are CBR MPEG-2 Layer III, 24 kHz, 48 kbps mono with no ID3/Xing headers — keep it that way (grind mode in the backlog relies on joining them byte-for-byte).

## Put it on your iPhone

1. Deploy `dist/` to any static host (Netlify/Vercel: build command `npm run build`, output `dist`). It deploys from `main`.
2. Open the URL in **Safari** → Share → **Add to Home Screen**.
3. Always launch from the home-screen icon (Safari can clear storage for sites you don't install).
4. Turn the silent switch off during sessions — it mutes web audio.

## Updates

A new version downloads in the background when you open the app (or bring it back to the foreground). Once downloaded, the home screen shows **✨ New version ready: tap to update**, which reloads into it. It never interrupts a session. Settings → **Check for updates** checks on demand and shows the version.

The version is in `package.json` and shown at the bottom of the home screen and in Settings. (Up to 1.0 the app updated itself silently on the second open; the first version with the button needs one last full close — swipe away — to take over.)

## Your progress

- Stored in `localStorage` on each device, tied to the site's URL. Nothing leaves the device. **Progress is per device** (phone and PC are separate; import a backup to copy it over).
- **Deploys never lose progress.** You lose it only if the URL changes (new domain/project), you delete the home-screen app, or you clear Safari's website data.
- **Back up weekly:** Settings → Export backup → Save to Files. The home screen reminds you every 7 days (only counts if the share sheet actually completed). Restore with Settings → Import backup.
- Old backups keep working: missing settings are filled with defaults on load.

## Editing content

- Words: `content/words1-3.tsv` — `id|hanzi|pinyin|english|sentence|sentence pinyin|sentence english`. Order = teaching order.
- Phrases: `content/phrases.tsv` — `id|phrase|pinyin|english|example|example pinyin|example english`. The example is the phrase in use, often with the reply you'll hear.
- **Ids are permanent** — progress and audio files are keyed by them. Add new rows anywhere *without* an id; `npm run data` assigns the next free one and writes it into the file. Never change or reuse an existing id. Each word needs its own example sentence (the build checks). Simplified characters, mainland pinyin with 一/不 tone changes marked (yí ge, bú shì).
- Dialogues: `content/dialogues.json`. A dialogue unlocks once `unlockAfter` words and `unlockAfterPhrases` phrases are learned; `you` is the speaker you play in role-play (default B). File order = unlock order: the Dialogue step favours the newest unlocked one.
- Tone drill items are chosen by the build: 1–2 syllable words with a mark on every syllable, excluding multi-reading characters (只还都要和) and 3+3 pairs (pronounced 2+3).
- After editing: `npm run data` (rebuilds `src/data/*.json`), then `npm run audio`. It only generates audio for new or changed text (tracked in `scripts/audio-sources.json`) and deletes audio for removed rows.

## Structure

```
content/            source word lists, phrases, dialogues (edit these)
scripts/            build-data.mjs (ids, tones, checks), generate_audio.py (edge-tts)
src/data/           generated JSON
src/store.ts        state, FSRS scheduling (ts-fsrs), quotas, strength levels, backup
src/audio.ts        MP3 playback with device-voice fallback, speed
src/Session.tsx     the five session steps
src/WordBank.tsx    word bank
src/updates.ts      service-worker update hook + version; UpdateUI.tsx = banner/button
src/App.tsx         home + settings
```

## Working on it

- Keep this README the record of context and decisions: update it with every change (profile, feedback, design choices, conventions).
- Bump `package.json` version for each release (minor for features, patch for fixes) and add a changelog line.
- Commit when asked; ask before pushing; push to `main` (that's what deploys).
- Lint has 8 known warnings (React purity/refs rules on existing timer code); don't add new ones.
- New features should respect the profile above: whisper-friendly, no mic, no writing practice, offline-first.

## Changelog

**1.1.1** (2026-11-01)
- Fix: graded cards came due again 1–10 min later (FSRS learning steps), so the home screen never said Done and the next day's new words were paused as "behind". Steps are off; affected cards move to the next day on load.
- Rating buttons say what each means (Again = missed it, Hard = got it slowly). The learner didn't know the difference between Again and Hard until day 2.

**1.1** (2026-10-31)
- Update button + version display; checks for updates on foreground.
- Role-play in dialogues; 9 early phrase-based dialogues (first unlocks on day 1).
- Tone drill: two-syllable words, 4 voices. Sentence-reading cards. Audio speed suggestion.
- Word bank with per-skill strength. Streak on the end screen; "Done for today" state.
- New cards first due the next day; at-risk reviews first; fewer new words when behind.
- "I know it" check for new items; speaking-first reviews; 58 phrases; whisper-friendly prompts.
- Audio speed setting (85% default); Speak countdown 5–12 s by length.
- Fixes: permanent content ids, audio regenerates on text change, shared sentences, ambiguous tone-drill characters, backup reminder, Speak countdown skipping.

**1.0** — HSK 1 PWA: reviews (FSRS), new words, speak drill, dialogues, tones; neural audio.

Word list source: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), 2026 HSK level 1. Example sentences, phrases, dialogues, pinyin and translations written for this app.
