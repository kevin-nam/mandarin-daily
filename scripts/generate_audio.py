#!/usr/bin/env python3
"""Generate natural Mandarin audio for every word, sentence and dialogue line.

Uses Microsoft Edge's free neural voices via the `edge-tts` package.
Run once on your laptop (needs internet), then rebuild/deploy the app:

    pip install edge-tts
    python3 scripts/generate_audio.py            # skips files that already exist
    python3 scripts/generate_audio.py --force    # regenerate everything

Output: public/audio/<key>.mp3 + public/audio/manifest.json
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


async def render(key, text, voice, force, sem):
    path = OUT / f"{key}.mp3"
    if path.exists() and not force:
        return key
    async with sem:
        for attempt in range(3):
            try:
                # Slightly slower than default: clearer for learners
                await edge_tts.Communicate(text, voice, rate="-10%").save(str(path))
                return key
            except Exception as e:  # network hiccups
                if attempt == 2:
                    print(f"FAILED {key} ({text}): {e}")
                    return None
                await asyncio.sleep(2)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(6)
    todo = list(jobs())
    done = await asyncio.gather(*(render(k, t, v, args.force, sem) for k, t, v in todo))
    keys = sorted(k for k in done if k)
    (OUT / "manifest.json").write_text(json.dumps(keys))
    print(f"{len(keys)}/{len(todo)} audio files ready in {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
