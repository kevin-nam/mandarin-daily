"""Subset Noto Serif SC to the characters the app shows, as public/fonts/hanzi.woff2.

Run after `npm run data` / `npm run chars` when content gains new characters:
    python3 scripts/build-font.py path/to/NotoSerifSC[wght].ttf
Source: https://github.com/google/fonts/tree/main/ofl/notoserifsc (SIL OFL 1.1).
Needs: pip install fonttools brotli
"""
import json, re, string, sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src = sys.argv[1]
text = ''.join(Path(p).read_text('utf8') for p in ['src/data/words.json', 'src/data/phrases.json', 'src/data/dialogues.json'])
text += ''.join(json.loads(Path('src/data/chars.json').read_text('utf8')).keys())
text += '每天今日一二三四五六日听说读句'  # app chrome
chars = sorted(set(re.findall(r'[⺀-⿟　-〿㐀-鿿豈-﫿＀-￯]', text)))

font = TTFont(src)
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
opts.name_IDs = ['*']
sub = subset.Subsetter(opts)
# Digits and Latin inside Chinese text (3点, 100块, T恤) stay in the same face.
sub.populate(text=''.join(chars) + string.digits + string.ascii_letters + '.,!?%:;()-')
sub.subset(font)
font = instancer.instantiateVariableFont(font, {'wght': (400, 700)})  # only the weights we use
out = Path('public/fonts/hanzi.woff2')
subset.save_font(font, str(out), opts)
print(f'{out}: {len(chars)} characters, {out.stat().st_size // 1024} KB')
