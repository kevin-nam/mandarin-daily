import { useEffect, useState, type ReactNode } from 'react'
import { play } from './audio'
import type { Word } from './data'

export function PlayButton({ k, text, label = '▶', slow, autoPlay }: { k: string; text: string; label?: string; slow?: boolean; autoPlay?: boolean }) {
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
  return (
    <button className={`play ${busy ? 'busy' : ''}`} onClick={go} aria-label={`Play ${text}`}>
      {label}
    </button>
  )
}

export function WordFace({ w, showSentence = true }: { w: Word; showSentence?: boolean }) {
  return (
    <div className="word-face">
      <div className="hanzi">{w.hanzi}</div>
      <div className="pinyin">{w.pinyin}</div>
      <div className="meaning">{w.en}</div>
      <div className="row center">
        <PlayButton k={w.id} text={w.hanzi} label="▶ word" />
        <PlayButton k={w.id} text={w.hanzi} label="🐢" slow />
      </div>
      {showSentence && (
        <div className="sentence">
          <div className="zh">{w.sentence.zh}</div>
          <div className="py">{w.sentence.py}</div>
          <div className="en">{w.sentence.en}</div>
          <div className="row center">
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} label="▶ sentence" />
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} label="🐢" slow />
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
      {right}
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
