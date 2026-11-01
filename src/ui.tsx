import { useEffect, useState, type ReactNode } from 'react'
import { play } from './audio'
import type { Word } from './data'
import { Icon } from './icons'
import { Pinyin } from './Pinyin'

/** Play a clip. With a label it's a pill ("Word", "Sentence"); `slow` plays at 70% with the slow icon. */
export function PlayButton({ k, text, label, slow, autoPlay, size }: {
  k: string; text: string; label?: string; slow?: boolean; autoPlay?: boolean; size?: 'hero'
}) {
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    await play(k, text, { slow })
    setBusy(false)
  }
  useEffect(() => {
    if (autoPlay) go()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, autoPlay])
  const name = slow ? 'Slow' : label
  return (
    <button
      className={`play ${busy ? 'busy' : ''} ${size === 'hero' ? 'hero' : ''} ${name ? '' : 'round'}`}
      onClick={go}
      aria-label={`${slow ? 'Play slowly' : 'Play'}: ${text}`}
    >
      <Icon name={slow ? 'slow' : 'play'} size={size === 'hero' ? 34 : 18} />
      {name && <span>{name}</span>}
    </button>
  )
}

export function WordFace({ w, showSentence = true }: { w: Word; showSentence?: boolean }) {
  return (
    <div className={`word-face ${w.kind}`}>
      <div className="hz face-hanzi" lang="zh-CN">{w.hanzi}</div>
      <Pinyin text={w.pinyin} className="face-pinyin" />
      <div className="face-meaning">{w.en}</div>
      <div className="play-row">
        <PlayButton k={w.id} text={w.hanzi} label={w.kind === 'word' ? 'Word' : 'Phrase'} />
        <PlayButton k={w.id} text={w.hanzi} slow />
      </div>
      {showSentence && (
        <div className="sentence-panel">
          <div className="hz sentence-zh" lang="zh-CN">{w.sentence.zh}</div>
          <Pinyin text={w.sentence.py} className="sentence-py" />
          <div className="sentence-en">{w.sentence.en}</div>
          <div className="play-row">
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} label={w.kind === 'word' ? 'Sentence' : 'Example'} />
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} slow />
          </div>
        </div>
      )}
    </div>
  )
}

export function StepHeader({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="step-header">
      <div>
        <h2>{title}</h2>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {right && <div className="step-count">{right}</div>}
    </div>
  )
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
