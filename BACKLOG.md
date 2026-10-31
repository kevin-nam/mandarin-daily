# Backlog

Ideas not built yet.

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
