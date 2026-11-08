# Mandarin Daily (每天)

A personal, offline-first PWA for daily Mandarin listening and speaking practice, aimed at **new HSK 1 (2026, 294 words)** plus 58 travel and conversation phrases. Built for iPhone: no microphone, no backend, no database, no paid APIs.

**Version 1.14** · see [Changelog](#changelog) · ideas not built yet: [BACKLOG.md](BACKLOG.md)

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
| Feedback so far | Day ~8: timed Speak cards were too short for longer sentences; unclear whether to grade the word or the whole sentence; some new words came in sentences full of other new words (85 of 294 sentences had 2–4 untaught words, because common words like 了 和 这 有 在 were taught last) — hence 1.11. ~25 min sessions feel right. Day 2 data: no Again ratings; reading (characters) is the weak skill (8 of 15 Hard), speaking mostly Good; ~9 s per review card. Most HSK 1 words are new. Normal-speed audio was too fast (hence 85% default). 4 s to answer was too short (hence 5–12 s scaled to length). Willing to do 30–40 min/day if it's more effective (hence 1.2's ~30 min + optional 8 min listening). |

So: speaking (productive recall) gets priority; prompts never demand speaking out loud; known words can be skipped fast; phrases and dialogues target real situations; role-play stands in for a partner.

## Daily session (~30 min + optional 8 min listening)

| Step | Time | What you do | Why |
|---|---|---|---|
| Review | ≤12 min | Due cards, mixed: **listen** (audio → meaning), **speak** (English → say it), **read** (character → pinyin/meaning), and **sentence** (whole example sentence in characters only; unlocks per word once its read card is Good). Most-at-risk cards first, speak cards prioritised (2 speak : 1 other). Read and sentence cards show **how each character is built** (meaning part + sound part, or its parts and a hint), marking parts from characters you've studied. **Speak cards ask for the word alone until that card is Good** (a week's stability), then for its sentence. Rate Again (missed it: couldn't produce it, or the wrong word/meaning) / Hard (got it, slowly, with effort, or a tone slightly off) / Good (got it) / Easy (instantly). **A word's cards grade the word only**: in a sentence, only the underlined word counts, the rest is practice (a note above the buttons says so on each card). Sentence (reading) cards grade the whole sentence. | Retrieval practice + FSRS spaced repetition; productive recall builds speaking |
| New words | ~5 min | 5 words (each inside a sentence made of words you already know, at most one exception, glossed as "Not learned yet") + 2 phrases. Hear it first: **I know it** → confirm → skipped ahead (listen card marked Easy, speak/read still tested, doesn't use up the daily quota). **New to me** → shadow the word ×2 then its sentence ×2 (slow → normal; phrases ×4), with the character breakdown. | Skip what you already understand (heritage learners); pretesting; context + production effect |
| Speak | ≤8 min | English prompt → say it (whisper/mouth is fine) → hear the answer twice. Today's new words are asked as words (5 s); older words whose speak card is Good are asked as sentences (3 s + 1 s per character, up to 15). **More time** adds 5 s. Counts if you said the word, even if the rest of the sentence slipped. Missed items come back sooner; items retire after 3 hits. | Prompted recall with expanding intervals |
| Dialogue | ~4 min | Listen with no text → listen while reading → shadow line by line → **role-play**: the app plays the other speaker, you say your line from the English before the model plays (switch sides any time). Early dialogues are built from the phrases you've learned, so there's one from day 1. | Comprehensible input; task-based practice |
| Tones | ≤4 min | **Tone ladder**: 30 quick single-syllable trials, two tones at a time (1–3, 2–4, 1–4, 2–3, 1–2, 3–4), then all four; 80% right over the last 20 moves you up. A right answer moves on by itself; a miss plays what you heard, then the tone you picked (same syllable where one exists: 买 mǎi / 卖 mài), with both contours. Past the ladder: 6 single syllables + 9 two-syllable words, 4-way. Every trial in a random one of 4 voices. | Identification training with immediate feedback and many trials; 2-way contrasts first because 4-way stayed near chance |
| Listening | ~8 min, optional | A link to one beginner video in slow Mandarin (Comprehensible Chinese, Mandarin Click, BlaBla Chinese; rotates daily, YouTube searches so links don't rot). Now or later in the day; also on the home screen once done. Needs internet. | Comprehensible input; a second, separate block beats a longer first one |

The end screen suggests one learned phrase to **use today** (on someone, or to yourself when the moment comes up): task-based practice outside the app.

At 5 new words/day you cover all of HSK 1 in about 9 weeks, faster if you mark words you already know. Phrases take about a month at 2/day.

## How the app paces you

- **Once a day.** New words reset at local midnight. New cards' first review is the *next* day (after sleep). Every grade schedules whole days (FSRS same-day learning steps are off: the session's own repetition covers same-day practice). After a session the home screen says **Done for today**; "Practice anyway" is there but same-day re-practice adds little.
- **Missing a day** costs only the streak. Reviews wait; the 12-min cap keeps sessions the same length; leftovers roll over (most at risk first). If reviewed cards are carried over from earlier days, new words are halved (>10 behind) or paused (>30 behind) until you catch up.
- **Audio speed** starts at 85% (Settings: 70–100%; 🐢 slow = 70% of it). Once ≥20 listen cards are reviewed and 70% are Good or better, the home screen suggests the next 5% step; "Not now" or changing it yourself pauses that for a week.
- **Word bank** (home screen): every studied item with a strength per skill — 👂 listening, 🗣 speaking, 字 reading, 句 sentences — from FSRS stability: Not tested · Learning (<2 d or relearning) · Getting there (<7 d) · Good (<30 d) · Strong. Search by 字, English, or pinyin without tone marks.
- **Words before sentences.** A word and the sentence built around it are two jobs, and doing both at once was too much (day ~8). So speaking a word starts with the word alone (English → 你), and moves to its sentence once the speak card reaches Good; particles (吗 呢 的 了 吧 们…) mean nothing alone, so they're always in their sentence. Listen cards keep the sentence (one word alone is ambiguous: 他/她/它 are all tā), but every sentence is now made of words you know, so the only new thing in it is the word being taught. When the English gloss is shared (想 / 要 "to want"), the word prompt adds the sentence's English as context.
- **Sentence parts.** Under each word's sentence the sentence is split into labelled blocks in the basic order Subject → When → Where → How → Verb → Object, plus Talking to, To (whom), Set phrase, and particles named by what they do (Yes/no question, And…?, Suggestion, Done / change). Each word has its English underneath; the word being taught is underlined. The learner asked for colour-coded structure. Only the skeleton is coloured (subject violet, verb plum, object teal), since pinyin already uses red/orange/green/blue for tones and hue must keep meaning one thing per screen; every block also has a text label, so colour is never the only cue. The verb block says *Is* (是, or a number/noun predicate like 我二十岁), *Describes* (adjective predicate: 很好) or *Verb*. Roles come from `scripts/structure.mjs` (word classes + position), corrected per sentence in `content/structure.tsv`. Words only; phrase examples have no breakdown. Where it shows: always in lessons, with the word-order line; open on review answers where the sentence is what was tested (listen, sentence, speaking at the sentence stage), unless you close the *Sentence structure* disclosure (remembered per device); closed, one tap away, where the sentence is only context (read cards, speaking a word alone).
- **Which new words come next.** The build orders words so each sentence uses only earlier words (see Editing content), and the app's picker re-checks against what *you* have learned (you may have skipped words with "I know it", or learned under an older order): of the next 8 unseen words, it takes the earliest whose sentence has the fewest words you haven't learned. Simulated from day 0: 245 of 294 words arrive in fully known sentences, 49 with one glossed word, none with more (before 1.11: 102 / 107 / 85 with 2–4).
- **Reading is the gap** (day 3: 10 of 23 read cards failed vs 0 speak and 0 listen; basic characters like 好 是 很 吗 呢 也). The learner doesn't recognise the characters, and finds tones very hard. So read cards ask for the meaning only (tones don't count), and words failed on a read card come back in the Speak drill as **Read** items (every third item, up to 6): 字 → 4-second try → pinyin, meaning, audio and the character breakdown; 3 hits to retire, ungraded like the rest of the drill.
- **Answer screens** (1.14 audit). Each card's answer leads with what helps for that card: a read card shows *Don't mix up* and how the characters are built right under the character, then the sentence; a lesson shows how it's built before the sentence (reading is the weak skill). Phrase answers drop the "Not learned yet" list (phrase examples are context; 5 glosses was clutter). Grammar words gloss as what they do (个 "measure word", 吗 "yes/no question"), not dictionary notes. Grade notes are one line. The listen card says up front "You'll grade the word it's built around."
- **Tone ladder** (1.13). The meter (1.14) shows the step ("Step 1 of 7"), what comes next, and your last 20 answers as a tally (ink right, outline wrong, blank not yet), with "16 right out of your last 20 unlocks the next step"; it used to read "Last 20: 0 right" at the start. Backup analysis on day 8: 39% right in the 4-way tone drill (25% is guessing), tone 2 wrong 78% of the time (heard as 3 or 4), 1↔4 swapped often. Four choices with ~15 items a day gave too little signal to learn from, so tones are now learned in 2-way pairs, most distinct first, with ~30 trials and a side-by-side replay after each miss. State: `toneLadder` {level, last 20 answers}; existing users start at level 1 (1st vs 3rd) and move up fast where they're already good.
- **Look-alike characters** (1.13). The same analysis: reading was 29% Again (listening 0%, speaking 4%), and the misses were look-alikes taught close together, not hard characters: 也 ×7 (inside 他 and 她), 们 ×6 (亻 like 你 他), and 吗 呢 喂 叫 (all 口 + a sound part) 16 of 46. `src/lookalike.ts` scores pairs from the character parts: one inside the other (3), or the same part first or last (2). Then:
  - Read answers show **Don't mix up**: the character and up to 3 studied look-alikes, with what's shared.
  - Read items in the Speak drill are recall, not multiple choice (1.14): the character, 4 s to think of its meaning, then the answer with *Don't mix up* and how it's built; Knew it / Missed it. Each missed or tricky character brings its closest studied look-alike as a read item of its own ("Looks like 也. What does this one mean?"), a couple of items apart, retiring after 2 recalls. Why not choices (1.13 had them; the learner questioned it): recall builds stronger memories than recognition (Kang, McDermott & Roediger 2007), a 3-option list can be passed by elimination, and lures can stick (Roediger & Marsh 2005); the discrimination benefit comes from interleaving the similar items (Carvalho & Goldstone 2014), which recall keeps.
  - **Tricky characters** (read card missed 4+ times and not yet Good) come back in every Speak drill until they're Good, alongside today's missed reads (up to 6).
  - The new-word picker counts a look-alike of a word already picked today as one more unknown, so look-alikes land on different days.
- **Tone drill adapts.** Every answer is recorded per syllable (which tone played, what you picked when wrong; counts halve past 60 per tone so recent sessions weigh most). Items are drawn weighted by their hardest tone's error rate (base weight 0.1, so every tone still appears; an even 25% guess until there's data). After 20 answers, if one tone's error rate is ≥15%, the step says which tone gets extra practice and what you usually hear it as. The learner finds tones very hard; 2 vs 3 is the classic confusion.
- **Pause**: tap the timer (session) or the pause icon (quick recall). Countdowns, the role-play and the step time caps all stop; the step stays where you left it. It also pauses by itself when you leave the app, or after **2 minutes with no taps and no audio** (you're assumed away, and that quiet stretch is taken off the timer, so logged minutes and the 12-/8-min caps stay honest). The listening step doesn't auto-pause, since leaving the app is the point there. The learner asked for this: sessions sometimes get interrupted.
- **Growth chart** (home): every item is one square of ink, stacked on the day it was learned (placed from the day log's new + known counts, in introduction order), shaded by its current strength in the chosen skill (Say / Hear / Read, same ink ramp and levels as the Word bank), strongest at the base, so older days settle into solid ink while new ones sit pale on top. Shows at least 4 weeks (days to come are dots on the baseline; missed days stay as gaps); past 56 days a column is a week. Tap a column to see that day's items. Headline: total, how many are Good or better in that skill, and this week's count; footer: when HSK 1 finishes at the current new-words-per-day. Built to the dataviz skill's rules (one sequential ramp, legend, thin hairline axis, no number on every mark, keyboard-focusable columns with full aria labels).
- **Streak**: the week as seals on the home screen, and at the end of a session.
- **After the session** the home screen offers three optional extras, each saying what it does:
  - **Quick recall · 5 min**, from 3 hours after the session (ideally before bed): today's new items, then the 4 weakest older ones (lowest speaking stability, under a week), speaking first. Never graded, so it can't inflate the schedule. A miss is flagged: its speak card is due no later than tomorrow and comes first in the next review (the flag clears when that card is graded). Older items aren't re-reviewed early because FSRS already times them; an early easy review teaches little. Research: a spaced same-day retrieval beats immediate re-practice, and retrieval before sleep followed by relearning after it helps most (Mazza et al. 2016).
  - **Easy listening · 8 min** (link out).
  - **Extra practice · about 10 min**: the session again, so any reviews still due (left over from the 12-min cap) are done and graded, then the Speak drill on recent words, a dialogue and the tone drill. New words are already used up. (What "Practice anyway" used to be; the user wanted it kept and its purpose stated. Day 3 showed it grading leftover reviews, so the wording now says so; the user chose fixing the wording over skipping reviews.)

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
- **Theme:** Settings → Appearance: System (follows the iPhone), Light or Dark. `src/theme.ts` sets `data-theme` on `<html>` before the first paint (no flash) and updates the status-bar colour; `index.css` has the dark tokens under both the system media query and `[data-theme='dark']`.
- **Checks.** All text ≥ 4.5:1 in light and dark; touch targets ≥ 44 px; `prefers-reduced-motion` turns motion off; dark mode is a full token set. Screens were verified in WebKit at 390×844 (iPhone) in both themes.
- **App icon:** 每天 in a seal frame (rendered from the same font).

### Motion

One vocabulary, from the ink-on-paper idea: things are **stamped**, **drawn** (stroke draws), and ink **spreads**. Two curves: `--ease` (fast out, soft landing) for everything, `--spring` (slight overshoot) only for getting something right.
- **Right** (review Good/Hard/Easy, Speak drill "Said it", recall "Got it", "Yes, I knew it", a right tone): an ink dot pops up just above the buttons with the check drawn in and a ring spreading out, then lifts away (`Burst`, ~0.9 s). Every 5 in a row adds a "5 in a row" label; retiring a drill item says "3 of 3".
- **Missed**: a quiet "Back in a moment" pill with a rewinding arrow. Never red, never a shake: missing is part of the method.
- **Tones**: the right answer pops and its ring draws in, ✓ springs in; a wrong pick shakes once; the score ticks.
- **Cards** slide in from the right with their parts a beat apart; **answers** bleed in from a blur; the practised word's underline is drawn in after.
- **Countdowns** drain smoothly (one CSS animation, frozen while paused); the number ticks each second.
- **Session bar** segments fill with a stroke from the left; the **done** seal stamps down, a ring of ink spreads and flecks fly out, then the stats follow in turn.
- **Home** panels arrive top to bottom; progress meters draw out; growth squares settle; the week's seal stamps.
- **Reduced motion**: all of it off, except the countdown still drains (it's information) and feedback simply fades.

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

- Words: `content/words1-3.tsv` — `id|hanzi|pinyin|english|sentence|sentence pinyin|sentence english`. File order ≈ teaching order: `npm run data` splits each sentence into words (longest match) and lets a word wait up to 8 places for the words its sentence uses. **Sentences may use only HSK 1 words** (no names, 北京, 次, 杯, 没 alone…) **and at most one word not taught yet**; the build lists every sentence that breaks this. Fix by simplifying the sentence or moving the row after the words it needs. "Unit 1 — First words" is hand-ordered so each sentence uses only the words above it. `node scripts/build-data.mjs --order` prints the order (`(+1)` marks a sentence with one untaught word). Each word gets `parts` (the other words in its sentence) for the app's gloss and picker.
- Phrases: `content/phrases.tsv` — `id|phrase|pinyin|english|example|example pinyin|example english`. The example is the phrase in use, often with the reply you'll hear.
- **Ids are permanent** — progress and audio files are keyed by them. Add new rows anywhere *without* an id; `npm run data` assigns the next free one and writes it into the file. Never change or reuse an existing id. Each word needs its own example sentence (the build checks). Simplified characters, mainland pinyin with 一/不 tone changes marked (yí ge, bú shì).
- Dialogues: `content/dialogues.json`. A dialogue unlocks once `unlockAfter` words and `unlockAfterPhrases` phrases are learned; `you` is the speaker you play in role-play (default B). File order = unlock order: the Dialogue step favours the newest unlocked one.
- Sentence parts: `npm run data` tags every word sentence by rule (`scripts/structure.mjs`: word classes, prepositions 在/给/到 before a verb, clock times as When, numbers as the predicate when there's no verb). Where it's wrong, add a line to `content/structure.tsv`: `id|` and one role code per word (A talking to · S subject · W when · L where · H how · V verb · O object · T to · P particle · X set phrase); the build says if the word count is off. Review with `node scripts/build-data.mjs --structure`.
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
src/pause.ts        pause clock (active time, auto-pause when away or app hidden)
src/Session.tsx     the five session steps
src/WordBank.tsx    word bank
src/CharParts.tsx   character breakdown (meaning/sound parts)
src/lookalike.ts    look-alike characters (scores from parts); LookAlikes.tsx = "Don't mix up" panel
src/Pinyin.tsx      tone-coloured pinyin, tone contours
src/Structure.tsx   colour-coded sentence parts
src/store.ts         also tone-drill stats (recordTones, toneErrors, toneFocus)
src/Growth.tsx      home growth chart (ink squares per day)
src/burst.ts        feedback burst state (Burst component in ui.tsx)
src/Week.tsx        the week as seals
src/Recall.tsx      quick recall (ungraded, flags misses)
src/icons.tsx       SVG icon set
src/theme.ts        light/dark/system theme
src/index.css       design tokens (light/dark) and all styles
src/listening.ts    easy-listening suggestions
src/updates.ts      service-worker update hook + version; UpdateUI.tsx = banner/button
src/App.tsx         home + settings
```

## Working on it

- Keep this README the record of context and decisions: update it with every change (profile, feedback, design choices, conventions).
- Bump `package.json` version for each release (minor for features, patch for fixes) and add a changelog line.
- Commit when asked; ask before pushing; push to `main` (that's what deploys).
- Lint has 3 known warnings (only-export-components in ui.tsx, purity in App.tsx, set-state-in-effect in the Speak drill); don't add new ones.
- New features should respect the profile above: whisper-friendly, no mic, no writing practice, offline-first.

## Changelog

**1.14** (2026-11-08)
- Reading items in the Speak step are recall again (think, then reveal), and each tricky character brings its look-alike as its own item, so you tell them apart by remembering, not picking.
- Answers lead with what helps for that card: look-alikes and how it's built come right under a character; sentence structure opens where the sentence was tested and stays one tap away elsewhere; tidier phrase answers and grade notes.
- Tone ladder shows your step, what's next, and your last 20 answers.

**1.13** (2026-11-08)
- Tone ladder: tones two at a time (most distinct pairs first), 30 quick trials, move up at 80%; a miss plays what you heard beside what you picked.
- Look-alike characters: "Don't mix up" on reading answers; reading items in the Speak drill ask you to pick the meaning from look-alikes; characters you've missed often come back every session until solid; look-alikes aren't introduced on the same day.

**1.12** (2026-11-08)
- Sentence parts: each word's sentence is broken into labelled, colour-coded blocks (Subject, When, Where, How, Verb, Object, particles) with the English for every word. Shown in lessons; on review answers until you hide it.

**1.11** (2026-11-08)
- New words come in sentences made of words you already know (at most one other new word, shown as "Not learned yet"). Common words (这 有 在 去 想 了 和 吧 太 买…) are taught first; 77 sentences rewritten; names and non-HSK 1 words removed. The next new words are picked to fit what you've learned.
- Speaking asks for the word alone until you can say it, then its sentence. Sentences get more time (up to 15 s), and **More time** adds 5 s.
- Each card says what to grade: a word's cards grade only that word, never the rest of the sentence; a tone slightly off is Hard. Sentence reading cards grade the whole sentence.
- Shadowing a new word: the word twice, then the sentence twice.
- Fix: a hook order bug in the New words step.

**1.10** (2026-11-04)
- Motion: feedback bursts for right answers (with streaks), a gentle note for misses, smooth countdowns, card and answer transitions, tone pop/shake, the done seal's stamp and ink splash, home entrance.

**1.9** (2026-11-04)
- Growth chart on the home screen: one ink square per item on the day you learned it, darkening as it sticks; switch between Say, Hear and Read; tap a day to see its words.

**1.8** (2026-11-02)
- The tone drill focuses on the tones you miss most and says which one it's working on.

**1.7** (2026-11-02)
- Words missed on a read card come back in the Speak drill as quick reading items, with the character breakdown. Read cards ask for meaning only; tones don't count.
- Extra practice says it does any reviews still due.

**1.6** (2026-11-02)
- Pause mid-session or mid-recall: tap the timer. Auto-pauses on leaving the app or after 2 minutes with no taps or audio, and away time isn't counted. Step time caps now use active time.

**1.5** (2026-11-01)
- Light / dark / system theme choice in Settings → Appearance.

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
