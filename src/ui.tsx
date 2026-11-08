import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { play } from './audio'
import { glossClash, target, type Stage, type Word } from './data'
import { Icon } from './icons'
import { Pinyin } from './Pinyin'
import { Structure } from './Structure'
import type { BurstState } from './burst'
import type { PauseReason } from './pause'

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

// Whether the sentence breakdown is shown on answers (per device; shown until you hide it).
const STRUCTURE_KEY = 'mandarin-daily:structure'
function structureShown() {
  try { return localStorage.getItem(STRUCTURE_KEY) !== '0' } catch { return true }
}

/**
 * `fresh`: words in the sentence you haven't learned yet, glossed under it.
 * `structure`: 'open' always shows the colour-coded breakdown (new-word lessons); 'toggle' lets you hide it.
 */
export function WordFace({ w, showSentence = true, fresh = [], structure = 'toggle' }: {
  w: Word; showSentence?: boolean; fresh?: Word[]; structure?: 'open' | 'toggle'
}) {
  const [shown, setShown] = useState(structureShown)
  const toggle = () => {
    setShown(!shown)
    try { localStorage.setItem(STRUCTURE_KEY, shown ? '0' : '1') } catch { /* storage unavailable */ }
  }
  const open = structure === 'open' || shown
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
          {fresh.length > 0 && <FreshWords words={fresh} />}
          <div className="play-row">
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} label={w.kind === 'word' ? 'Sentence' : 'Example'} />
            <PlayButton k={`${w.id}s`} text={w.sentence.zh} slow />
            {w.structure && structure === 'toggle' && (
              <button className="play" onClick={toggle} aria-expanded={shown}>
                <span>{shown ? 'Hide parts' : 'Parts'}</span>
              </button>
            )}
          </div>
          {w.structure && open && <Structure w={w} />}
        </div>
      )}
    </div>
  )
}

/** Words in a sentence you haven't learned yet: shown so nothing in it is a mystery, not to learn now. */
export function FreshWords({ words }: { words: Word[] }) {
  return (
    <p className="fresh">
      <span className="fresh-label">Not learned yet:</span>
      {words.map((x) => (
        <span key={x.id} className="fresh-word">
          <span className="hz" lang="zh-CN">{x.hanzi}</span> <Pinyin text={x.pinyin} /> {x.en.split(';')[0]}
        </span>
      ))}
    </p>
  )
}

/**
 * What to say from memory. At the word stage it's the word alone (with the sentence's English as
 * context when another word means the same); at the sentence stage, the sentence built around it.
 */
export function SpeakPrompt({ w, stage }: { w: Word; stage: Stage }) {
  const t = target(w, stage)
  if (t.word) {
    return (
      <div className="speak-prompt">
        <p className="prompt-kind">Say the word</p>
        <div className="prompt-en">{w.en}</div>
        {glossClash(w) && <p className="prompt-key">as in “{w.sentence.en}”</p>}
      </div>
    )
  }
  return (
    <div className="speak-prompt">
      <p className="prompt-kind">{w.kind === 'word' ? 'Say this sentence' : 'Say this phrase'}</p>
      <div className="prompt-en">{t.en}</div>
      {w.kind === 'word' && <p className="prompt-key">Use the word for <b>{w.en}</b></p>}
    </div>
  )
}

/** The Chinese answer, with the practised word underlined inside its sentence. */
export function SpokenAnswer({ w, stage }: { w: Word; stage: Stage }) {
  const t = target(w, stage)
  const at = w.kind === 'word' && !t.word ? t.zh.indexOf(w.hanzi) : -1
  return (
    <div className="hz answer-zh" lang="zh-CN">
      {at < 0 ? t.zh : (
        <>{t.zh.slice(0, at)}<mark className="key">{w.hanzi}</mark>{t.zh.slice(at + w.hanzi.length)}</>
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

/**
 * Seconds left to answer, drawn as a ring that drains smoothly (one CSS animation over the
 * whole countdown, frozen while paused). Give it a fresh `key` for each new countdown.
 */
export function Countdown({ value, total, small, paused }: { value: number; total: number; small?: boolean; paused?: boolean }) {
  const r = small ? 15 : 34
  const size = (r + 4) * 2
  // Where the ring starts, fixed at mount: the animation carries it from there to empty.
  const [start] = useState(() => ({ from: 1 - Math.max(0, value) / total, secs: Math.max(0, value) }))
  return (
    <div className={`countdown ${small ? 'small' : ''} ${value > 0 && value <= 3 ? 'last' : ''}`} role="timer" aria-label={`${Math.max(0, value)} seconds`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="track" cx={size / 2} cy={size / 2} r={r} />
        <circle className="left" cx={size / 2} cy={size / 2} r={r} pathLength={1} strokeDasharray={1}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ '--from': start.from, '--secs': `${start.secs}s`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties} />
      </svg>
      <span key={value} className="num">{value > 0 ? value : ''}</span>
    </div>
  )
}

/**
 * Feedback that rises from the buttons: a check drawn in an ink dot with a ring of ink spreading
 * out (right), a quiet "back soon" (missed), or the dot with a label (a streak, an item done).
 */
export function Burst({ n, kind, label }: BurstState) {
  if (n === 0) return null
  return (
    <div key={n} className={`burst ${kind}`} aria-hidden="true">
      {kind === 'again' ? (
        <span className="burst-note"><Icon name="refresh" size={16} />Back in a moment</span>
      ) : (
        <>
          <span className="burst-ring" />
          <span className="burst-dot">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path pathLength={1} d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </span>
          {label && <span className="burst-label">{label}</span>}
        </>
      )}
    </div>
  )
}

/** Covers the screen while paused; what's underneath stays where you left it. */
export function PauseScreen({ why, time, onResume, onEnd, endLabel }: {
  why: PauseReason; time?: string; onResume: () => void; onEnd: () => void; endLabel: string
}) {
  const note = {
    tap: 'Take your time. Everything stays where you left it.',
    away: 'No taps for a couple of minutes, so it paused. The time you were away doesn’t count.',
    left: 'You left the app, so it paused.',
  }[why]
  return (
    <div className="paused" role="dialog" aria-modal="true" aria-labelledby="paused-title">
      <div className="paused-body">
        <div className="paused-mark" aria-hidden="true"><Icon name="pause" size={30} /></div>
        <h2 id="paused-title">Paused</h2>
        <p className="body">{note}</p>
        {time && <p className="paused-time num">{time}</p>}
      </div>
      <div className="dock">
        <button className="btn primary wide" onClick={onResume} autoFocus>Resume</button>
        <button className="btn ghost wide" onClick={onEnd}>{endLabel}</button>
      </div>
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
