# Backlog

Ideas not built yet.

## From the day-8 backup analysis (2026-11-08)
Data: 8 days, 53 words + 16 phrases, ~400 graded reviews. Listening 0% Again (88 reviews), speaking 4% (only long phrases), reading 29%, tones 39% right. Items 1–2 of that analysis (tone ladder, look-alikes) shipped in 1.13.

### Less time on listening, which is mastered
Listen cards are 22% of reviews and none has been missed; every one is rated low difficulty. Options: a lower target retention for listen cards only (0.85 instead of 0.9: ts-fsrs takes `request_retention` per scheduler, so keep a second scheduler for `:listen` keys), or make them harder (normal speed; the learner postponed the speed nudge at 85%). Frees ~5 min a day for reading.

### Lighter phrases
All speaking misses and 6 reading misses were phrases (这是什么意思？ 这个用中文怎么说？ 能帮我一下吗？ 你说得太快了。).
- 1 new phrase a day instead of 2 (setting default `phrasesPerDay: 1`).
- A phrase's read card only once the words inside it are learned (phrases already get `parts`; gate `introduce` for the `read` kind, create it in `grade` like the sentence card).
- Long phrases built up in steps when spoken: 什么意思 → 这是什么意思？ (backward build-up / chunking).

### Pace new words by reading health
~21 new cards a day (7 items × 3) while reviews already reach 60–84 a day. If more than ~25% of the last ~40 read reviews were Again, cut new words to 3 until it recovers (alongside the existing behind-on-reviews cut). Needs a short log of recent read grades in state (like `toneLadder.recent`).

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
