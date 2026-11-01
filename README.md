# Mandarin Daily (每天)

A personal, offline-first PWA for daily Mandarin listening and speaking practice, aimed at **new HSK 1 (2026, 294 words)** plus 58 travel and conversation phrases. Built for iPhone: no microphone, no backend, no database, no paid APIs.

**Version 1.4.1** · see [Changelog](#changelog) · ideas not built yet: [BACKLOG.md](BACKLOG.md)

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
| Feedback so far | ~25 min sessions feel right. Day 2 data: no Again ratings; reading (characters) is the weak skill (8 of 15 Hard), speaking mostly Good; ~9 s per review card. Most HSK 1 words are new. Normal-speed audio was too fast (hence 85% default). 4 s to answer was too short (hence 5–12 s scaled to length). Willing to do 30–40 min/day if it's more effective (hence 1.2's ~30 min + optional 8 min listening). |

So: speaking (productive recall) gets priority; prompts never demand speaking out loud; known words can be skipped fast; phrases and dialogues target real situations; role-play stands in for a partner.

## Daily session (~30 min + optional 8 min listening)

| Step | Time | What you do | Why |
|---|---|---|---|
| Review | ≤12 min | Due cards, mixed: **listen** (audio → meaning), **speak** (English → say it), **read** (character → pinyin/meaning), and **sentence** (whole example sentence in characters only; unlocks per word once its read card is Good). Most-at-risk cards first, speak cards prioritised (2 speak : 1 other). Read and sentence cards show **how each character is built** (meaning part + sound part, or its parts and a hint), marking parts from characters you've studied. Rate Again (missed it, even partly: wrong tone, wrong meaning) / Hard (got it, slowly or with effort) / Good (got it) / Easy (instantly). | Retrieval practice + FSRS spaced repetition; productive recall builds speaking |
| New words | ~5 min | 5 words (each inside a sentence) + 2 phrases. Hear it first: **I know it** → confirm → skipped ahead (listen card marked Easy, speak/read still tested, doesn't use up the daily quota). **New to me** → shadow ×4 (slow → normal), with the character breakdown. | Skip what you already understand (heritage learners); pretesting; context + production effect |
| Speak | ≤8 min | English prompt → 5–12 s (scaled to length) to say it (whisper/mouth is fine) → hear the answer twice. Missed items come back sooner; items retire after 3 hits. | Prompted recall with expanding intervals |
| Dialogue | ~4 min | Listen with no text → listen while reading → shadow line by line → **role-play**: the app plays the other speaker, you say your line from the English before the model plays (switch sides any time). Early dialogues are built from the phrases you've learned, so there's one from day 1. | Comprehensible input; task-based practice |
| Tones | ~2 min | 6 single syllables, then 9 two-syllable words (pick each syllable's tone), each in a random one of 4 voices. | Tone perception training (multi-voice benefit is mixed in newer studies, so this step stays short) |
| Listening | ~8 min, optional | A link to one beginner video in slow Mandarin (Comprehensible Chinese, Mandarin Click, BlaBla Chinese; rotates daily, YouTube searches so links don't rot). Now or later in the day; also on the home screen once done. Needs internet. | Comprehensible input; a second, separate block beats a longer first one |

The end screen suggests one learned phrase to **use today** (on someone, or to yourself when the moment comes up): task-based practice outside the app.

At 5 new words/day you cover all of HSK 1 in about 9 weeks, faster if you mark words you already know. Phrases take about a month at 2/day.

## How the app paces you

- **Once a day.** New words reset at local midnight. New cards' first review is the *next* day (after sleep). Every grade schedules whole days (FSRS same-day learning steps are off: the session's own repetition covers same-day practice). After a session the home screen says **Done for today**; "Practice anyway" is there but same-day re-practice adds little.
- **Missing a day** costs only the streak. Reviews wait; the 12-min cap keeps sessions the same length; leftovers roll over (most at risk first). If reviewed cards are carried over from earlier days, new words are halved (>10 behind) or paused (>30 behind) until you catch up.
- **Audio speed** starts at 85% (Settings: 70–100%; 🐢 slow = 70% of it). Once ≥20 listen cards are reviewed and 70% are Good or better, the home screen suggests the next 5% step; "Not now" or changing it yourself pauses that for a week.
- **Word bank** (home screen): every studied item with a strength per skill — 👂 listening, 🗣 speaking, 字 reading, 句 sentences — from FSRS stability: Not tested · Learning (<2 d or relearning) · Getting there (<7 d) · Good (<30 d) · Strong. Search by 字, English, or pinyin without tone marks.
- **Streak**: the week as seals on the home screen, and at the end of a session.
- **After the session** the home screen offers three optional extras, each saying what it does:
  - **Quick recall · 5 min**, from 3 hours after the session (ideally before bed): today's new items, then the 4 weakest older ones (lowest speaking stability, under a week), speaking first. Never graded, so it can't inflate the schedule. A miss is flagged: its speak card is due no later than tomorrow and comes first in the next review (the flag clears when that card is graded). Older items aren't re-reviewed early because FSRS already times them; an early easy review teaches little. Research: a spaced same-day retrieval beats immediate re-practice, and retrieval before sleep followed by relearning after it helps most (Mazza et al. 2016).
  - **Easy listening · 8 min** (link out).
  - **Extra practice · about 10 min**: Speak drill on recent words, a dialogue and the tone drill. Doesn't change the review schedule (what "Practice anyway" used to be; the user wanted it kept and its purpose stated).

## Research behind it

Retrieval practice and the testing effect (Roediger & Karpicke 2006) · productive vs receptive recall (Webb 2009) · production effect, incl. mouthing (MacLeod et al. 2010) · heritage learners' receptive > productive skills (Montrul 2010; Kagan & Dillon 2001) · pretesting (Richland et al. 2009) · formulaic phrases and fluency (Boers et al. 2006) · task-based practice (Ellis 2003) · multi-talker tone training (Wang et al. 1999, 2003; but a 2021 JSLHR meta-analysis finds mixed multi-talker benefits, and Dong et al. 2019 found none for tones) · repeated retrieval, 5+ retrievals beat 1–3 (Nakata 2017) · heritage learners need to connect oral language with characters (Xiao 2006) · teaching semantic/phonetic components aids character learning (small, mixed studies) · shadowing works better with text (Japanese-context review) · comprehensible input / narrow listening (Krashen 1996) · slower speech for beginners (Griffiths 1992) · spacing (Cepeda et al. 2006) · sleep consolidation (Diekelmann & Born 2010) · habit formation (Lally et al. 2010) · divided attention at encoding (Craik et al. 1996, for the backlog's grind mode).

## Design

Built against two design rule sets (Impeccable's "craft floor" and Operate-mode guidance, and taste-skill's app-screen rules), read as reference. The screens are "Operate" surfaces: a tool used daily, phone in hand, so clarity beats decoration.

- **Ink on paper, one red seal.** Neutral paper ground (`#f3f2ee`), white panels separated by a tone step (no borders or shadows at rest), black ink for text and the primary button. Vermilion (`--seal`) appears only on the wordmark, practised days and the end-of-session stamp.
- **Hue is data.** Pinyin is coloured by tone, using Pleco's convention: 1 red, 2 orange, 3 green, 4 blue, neutral grey (`src/Pinyin.tsx` splits syllables). The tone drill draws each tone's pitch contour in its colour. Word strength uses an ink ramp (not tested → strong), so it never collides with tone colours. Right/wrong in the tone drill is an ink ring ✓ / a strikethrough, not green/red.
- **Signature: the week as seals.** Home shows Monday–Sunday as seals marked 一…日 (星期一…星期日); a practised day is stamped red; finishing a session stamps today in (one authored animation). The end screen stamps 好.
- **Type.** System sans for the interface; Chinese in Noto Serif SC (a Song/Ming print face, the standard reading form), self-hosted as a ~190 KB subset of only the characters the app uses (`public/fonts/hanzi.woff2`, OFL). Tabular figures on all numbers.
- **One question per screen.** Home answers "what's today?" (headline like "58 reviews and 7 new items", the one primary action, then the week, then progress). Session steps put content in the middle and the actions in a dock at the bottom (thumb reach); rating buttons are neutral, with Again in the danger colour.
- **Icons** are one hand-drawn SVG set (`src/icons.tsx`), no emoji. Skills in the word bank are marked by their Chinese verbs: 听 listening, 说 speaking, 读 reading, 句 sentences.
- **Checks.** All text ≥ 4.5:1 in light and dark; touch targets ≥ 44 px; `prefers-reduced-motion` turns motion off; dark mode is a full token set. Screens were verified in WebKit at 390×844 (iPhone) in both themes.
- **App icon:** 每天 in a seal frame (rendered from the same font).

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
- Character breakdowns: `npm run chars` (after `npm run data`) rebuilds `src/data/chars.json` from Make Me a Hanzi's dictionary (downloads it, or pass a local path). Unclear radical glosses are overridden in `scripts/build-chars.mjs`.
- Listening suggestions: `src/listening.ts`.
- Chinese font subset: after adding content with new characters, run `python3 scripts/build-font.py path/to/NotoSerifSC[wght].ttf` (from google/fonts `ofl/notoserifsc`; needs `pip install fonttools brotli`). Characters missing from the subset fall back to the system font.
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
src/CharParts.tsx   character breakdown (meaning/sound parts)
src/Pinyin.tsx      tone-coloured pinyin, tone contours
src/Week.tsx        the week as seals
src/Recall.tsx      quick recall (ungraded, flags misses)
src/icons.tsx       SVG icon set
src/index.css       design tokens (light/dark) and all styles
src/listening.ts    easy-listening suggestions
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

**1.4.1** (2026-11-01)
- Speaking prompts (Speak review cards, Speak drill, quick recall) say "Say this sentence" or "Say this phrase" and name the word a sentence is built around; the answer underlines that word. The learner couldn't tell whether to recall the word or the sentence.

**1.4** (2026-11-01)
- Quick recall: an optional 5-minute, ungraded speaking recall of today's new items plus the weakest older ones, best a few hours after the session; misses come first in the next review.
- "Practise anyway" is now "Extra practice", with a description of what it runs and that it doesn't change the schedule. Home groups the optional extras after the session.
- Week seals don't mark days before you started as missed.

**1.3** (2026-11-01)
- Redesign: ink-on-paper system with light/dark tokens; tone-coloured pinyin everywhere; tone drill with pitch contours; the week as red seals with a stamp on finishing; Chinese set in a self-hosted Noto Serif SC subset; SVG icons instead of emoji; actions docked at the bottom of every session step; countdown rings; word bank rows that fit phrases, 听说读句 skill marks and strength bars; settings as grouped lists; new 每天 seal app icon.

**1.2** (2026-11-01)
- Character breakdowns on read/sentence cards, new-word lessons and the word bank, from Make Me a Hanzi.
- Review cap 8 → 12 min (simulation showed reviews passing 8 min by week 3–4); Speak drill retires at 3 hits (cap 8 min).
- Optional easy-listening step; "use it today" phrase on the end screen. Default session length 30 min.

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

Word list source: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), 2026 HSK level 1. Example sentences, phrases, dialogues, pinyin and translations written for this app. Character breakdowns: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) `dictionary.txt` (LGPL-3.0, from Unihan and CJKlib); see `src/data/chars.LICENSE.txt`. Chinese typeface: [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc) (SIL OFL 1.1, `public/fonts/OFL.txt`).
