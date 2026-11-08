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
