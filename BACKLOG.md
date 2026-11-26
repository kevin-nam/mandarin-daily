# Backlog

Ideas not built yet.

## From the day-8 backup analysis (2026-11-08)
Data: 8 days, 53 words + 16 phrases, ~400 graded reviews. Listening 0% Again (88 reviews), speaking 4% (only long phrases), reading 29%, tones 39% right. Items 1–2 of that analysis (tone ladder, look-alikes) shipped in 1.13.

### Re-evaluated after 1.11–1.16 (same day)
Upcoming reviews from the backup: listen cards ~30% of what's due in the next 30 days; median stability listen 7.3 d, speak 7.3 d, read 2.3 d. Word read lapses: 46, of which 27 (59%) are five characters (也 7, 们 6, 呢 5, 喂 5, 很 4); 39 of 53 words never lapsed. Speak lapses: 4 of 5 on phrases.

**1. Less time on listening: build (small).** ~8 listen reviews a day now at ~8 s, so ~1 min/day saved now, 1–2 later (not the ~5 first estimated). Target retention 0.85 for `:listen` only (a second ts-fsrs scheduler; intervals ~1.6× longer, ~35% fewer reviews). Justified beyond time: 0 lapses against the 10% the default model expects means it underestimates this learner's listening (a crude stand-in for per-user parameter fitting). "Make it harder" is already the speed nudge.

**2a. Phrase read card only once its HSK 1 words are learned: build.** Phrase read cards test characters never taught (懂 慢 意思 帮); 6 read lapses. Matches the 1.11 rule (read only what you know). New phrases only; existing cards stay.

**2b. Backward build-up for long phrases (什么意思 → 这是什么意思？): later.** Less urgent since 1.11's longer think time and More time; review cards are untimed. If built: lesson shadowing for phrases of 7+ characters, chunks from segmentation, extra TTS clips for the partials.

**2c. 1 new phrase a day: dropped.** Phrases serve the conversation/travel goal, 4 lapses isn't alarming, and Settings → New phrases already does it.

**3. Pace new words by reading health: dropped for now.** The read Again rate is concentrated in five look-alike characters, which 1.13–1.15 target directly; a global slowdown would delay HSK 1 for everyone else. The existing behind-on-reviews cut covers overload. Re-check with a backup around 2026-11-15: if the tricky characters haven't moved, revisit (perhaps keyed to the number of tricky characters, not the overall rate).

## From the day-13 backup analysis (2026-11-12)
Data: 13 days, 77 words + 25 phrases, 330 cards. Miss rate per review: listen 1% (2/180), speak words 3%, speak phrases 12%, sentence 9%, read words 28%, read phrases 22%. Tone ladder on the 4-way step at 50% (39% on day 8); mix-ups 1→4, 2→3, 4→3. ~28 min/day.

Built in 1.18: difficulty capped at 8 (24 read cards were stuck at 9.4–10); pre-1.17 phrase read cards locked until their words are learned; speed nudge goes to 100% when listening is almost never missed.

Still open:
- **Backward build-up for long phrases (2b above): now worth building.** Phrase speak misses are 12%, against 3% for words.
- **Tones:** after the 4-way step passes, stress 1↔4 and 2↔3 in the two-syllable stage.
- **Pace: keep 5/day.** Recent batches don't miss more than earlier ones; numbers (一–千, simple and distinct) read well at 11–16 days' stability.
- Re-check around 2026-11-26: are 也 们 喂 很 呢 at multi-day stability? Did read misses drop?

## From the day-15 backup analysis (2026-11-15)
Grades replayed from the two backups: 80 Good, 10 Hard, 1 Again, 1 Easy of 92. Read misses 18.5% since day 13 (28% before); the 1.18 difficulty cap moved 也 们 呢 很 吗 to 1.5–2.5 days with no new misses. Tone ladder passed; mixed drill ~57% per syllable. Built in 1.20: review log, word speak at 85%, voices one at a time, gradual two-syllable words, word-by-word English.

- **Fit FSRS parameters to the review log** once there are ~1,000 logged reviews (about 3 weeks after 1.20). ts-fsrs has no optimizer; options: `@open-spaced-repetition/binding` (WASM), or fit offline from a backup and ship the parameters. Then drop the hand-set 85% schedulers.
- **Easy from think time?** The log keeps time to Show answer; if fast Goods turn out to be as safe as Easy, grade them Easy automatically.

## From the day-20 backup analysis (2026-11-20)
Review log (347 reviews since day 15): Again rate read 34% (48/142, spread over many characters, half from words learned in the last week), listen 12% at 100% speed (target 15%), speak 6%, sentence 7%. Median think time read 3.9 s, speak 3.0 s. Tone mixed drill ~62% per syllable (57% day 15, 50% day 13). Built in 1.22: 18-min reviews, reading in the quick recall, tone drill changes.

- **Tones: production, not just perception.** The learner finds tones hard and the drill moves slowly (~2–3 points a week). The app has no mic by design; a shadowing step with the pitch contour drawn over the model's could be done without recording anything (live pitch only). Revisit if per-syllable accuracy is under 70% on 2026-12-04.
- **New-word pace vs reading.** If read misses stay above 30% after the quick-recall reading, try 4 words + 2 phrases (forecast: ~80 reviews/day instead of ~92).

## Conversation practice with an AI partner
Real-life scenarios (ordering coffee, a taxi, meeting someone) played with a language model that adapts: it speaks only with words you've learned (plus at most one new one, glossed), keeps turns short, rephrases when you're stuck, corrects gently, and ends with a summary (words you missed, a better way to say what you said). Task-based practice is what the phrases and dialogues are for; this makes it two-way and unscripted.

What the model needs from the app: the words and phrases learned (hanzi, pinyin, English), the weakest ones to work in, the scenario, and the level rules. The app builds that as a prompt.

Options, simplest first:
1. **Copy a prompt into a Claude chat (start here).** A "Practice a conversation" screen: pick a scenario, the app copies a prompt with your words and opens Claude (app or claude.ai). Speaking works through the Claude app's voice mode. No API key, no cost beyond the subscription, nothing to host. Downsides: leaves the app; the summary doesn't come back on its own (could paste a short code back in to flag missed words).
2. **A claude.ai artifact page.** A small published page that talks to Claude through the artifact runtime with the learner's own account: no API key, stays one tap from the app (link), and can keep its own history of conversations. Text first; voice through the browser's speech features.
3. **In the app, calling the Claude API directly** with the learner's own API key stored on the device (browser access is allowed with an opt-in header). A small, fast model (Haiku) is enough for HSK 1–2 conversations and costs very little per conversation. Fully integrated (misses can flag cards), but the key lives in the browser: fine for personal use, not for sharing the app.
4. **The same through a tiny proxy** (e.g. a serverless function holding the key). Safer key, shareable, but something to host and pay for.
5. **On-device model** (a small Chinese-capable model running in the browser via WebGPU). Offline and free, but a ~1 GB download, slow on phones, and noticeably weaker conversation.
6. **Real-time voice models** (speech in, speech out, low latency). The most natural, but the costliest and most complex; worth it only once text conversations prove useful.

Voice: the app is no-mic by design (whisper-friendly, used in public). Typing pinyin or characters keeps that; voice input (browser speech recognition, or the Claude app's voice mode in option 1) would be opt-in.

## Grind mode (audio-only practice while gaming)
Practise hands-free while playing something that doesn't need full attention. Home-screen button opens a screen with three loops over **already-studied** items (new material learns poorly under divided attention, Craik et al. 1996):

| Loop | Audio | Grades |
|---|---|---|
| Recall | English → think/whisper → Mandarin ×2 | speak card |
| Listen | Mandarin → think → English → Mandarin | listen card |
| Shadow | Mandarin → repeat → again | none |

- **One continuous MP3 track** per batch (≈15 items, each twice), so it keeps playing with the screen locked / browser in the background, where iOS throttles timers. Clips are CBR MPEG-2 L3, 24 kHz, 48 kbps mono with no ID3/Xing headers, so they join byte-for-byte; silence = repeated empty frames (`FF F3 64 C4` + 140 zero bytes, 24 ms each). Prototyped and verified with ffmpeg: decodes cleanly, timing exact. Keep a cue timeline (item, start, answer time) for display and grading. Build the next track halfway through the current one.
- **Hands-free grading (optional)** via Media Session: next track = got it (Good), previous track = missed (Again), applied to the item whose answer most recently started; once per item per session. Works with AirPods, the lock screen, and PC keyboard media keys even while the game has focus. Ungraded items never touch the schedule.
- **Lock-screen metadata** shows the English prompt (recall) or "What does it mean?" (listen), never the answer before it plays.
- **English audio**: `en-<key>` clips (~350, ~5 MB) from `en-US-AriaNeural`; strip notes like "(you'll hear this)" and read "a / b" as "a, or b".
- **iOS playback unlock**: play a few silent frames inside the Start tap so the element may play after the async track build.
- **Per device**: progress stays per device; on a PC, import the phone's backup once to have studied words.
- **To verify on a real iPhone**: playback continues across the track-to-track switch while locked.
- Personal use only; avoid using a game's name or branding in the app.
