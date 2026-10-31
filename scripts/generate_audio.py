#!/usr/bin/env python3
"""Generate natural Mandarin audio for every word, sentence and dialogue line.

Uses Microsoft Edge's free neural voices via the `edge-tts` package.
Run once on your laptop (needs internet), then rebuild/deploy the app:

    pip install edge-tts
    python3 scripts/generate_audio.py            # only new or changed text
    python3 scripts/generate_audio.py --force    # regenerate everything

Output: public/audio/<key>.mp3 + public/audio/manifest.json
scripts/audio-sources.json records the voice/rate/text each file was made from,
so editing a sentence regenerates its audio. Files for removed items are deleted.
"""
import argparse
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
VOICES = {"A": "zh-CN-XiaoxiaoNeural", "B": "zh-CN-YunxiNeural"}  # female / male
DEFAULT_VOICE = VOICES["A"]
RATE = "-10%"  # slightly slower than default: clearer for learners
SOURCES = ROOT / "scripts" / "audio-sources.json"


def jobs():
    words = json.loads((ROOT / "src/data/words.json").read_text("utf8"))
    phrases = json.loads((ROOT / "src/data/phrases.json").read_text("utf8"))
    dialogues = json.loads((ROOT / "src/data/dialogues.json").read_text("utf8"))
    for w in words + phrases:
        yield w["id"], w["hanzi"], DEFAULT_VOICE
        yield f'{w["id"]}s', w["sentence"]["zh"], DEFAULT_VOICE
    for d in dialogues:
        for i, line in enumerate(d["lines"]):
            yield f'{d["id"]}-{i}', line["zh"], VOICES.get(line["s"], DEFAULT_VOICE)


async def render(key, text, voice, fresh, sem):
    path = OUT / f"{key}.mp3"
    if path.exists() and fresh:
        return key
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice, rate=RATE).save(str(path))
                return key
            except Exception as e:  # network hiccups
                if attempt == 2:
                    print(f"FAILED {key} ({text}): {e}")
                    path.unlink(missing_ok=True)  # never leave stale or partial audio behind
                    return None
                await asyncio.sleep(2)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(6)
    todo = list(jobs())
    source = {k: f"{v}|{RATE}|{t}" for k, t, v in todo}
    if SOURCES.exists():
        old = json.loads(SOURCES.read_text("utf8"))
    else:
        # First run with source tracking: assume existing files match the current text.
        old = {k: src for k, src in source.items() if (OUT / f"{k}.mp3").exists()}
    fresh = {k for k, src in source.items() if not args.force and old.get(k) == src}
    changed = sum(1 for k in source if k not in fresh)

    done = await asyncio.gather(*(render(k, t, v, k in fresh, sem) for k, t, v in todo))
    keys = sorted(k for k in done if k)

    removed = [p for p in OUT.glob("*.mp3") if p.stem not in source]
    for p in removed:
        p.unlink()
    (OUT / "manifest.json").write_text(json.dumps(keys))
    SOURCES.write_text(json.dumps({k: source[k] for k in keys}, ensure_ascii=False, indent=1, sort_keys=True))
    print(f"{len(keys)}/{len(todo)} audio files ready in {OUT} ({changed} generated, {len(removed)} removed)")


if __name__ == "__main__":
    asyncio.run(main())
