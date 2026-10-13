import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../motion'

type TypedTextProps = {
  text: string
  /** Whether to type it in at all (false shows the text straight away). */
  animate: boolean
  /** Wait before the first letter, in ms. */
  delay?: number
  /** Time per letter, in ms: each letter takes somewhere between these, so it feels hand-typed. */
  speed?: [number, number]
  /** Called once the last letter is typed (straight away when not animating). */
  onDone?: () => void
  className?: string
}

/** How long the cursor keeps blinking after the last letter, then how long it takes to fade. */
const CURSOR_LINGER = 2700
const CURSOR_FADE = 400

/**
 * Text that types itself in, one letter at a time, with a thin blinking cursor that blinks a
 * few more times after the last letter and then fades out. The untyped letters are kept
 * invisible rather than removed, so the line takes its full space from the start and nothing
 * around it shifts. Screen readers get the whole sentence at once.
 */
export default function TypedText({ text, animate, delay = 0, speed = [45, 60], onDone, className = '' }: TypedTextProps) {
  const typing = animate && !prefersReducedMotion()
  const [shown, setShown] = useState(typing ? 0 : text.length)
  const [cursor, setCursor] = useState<'on' | 'fading' | 'off'>(typing ? 'on' : 'off')

  useEffect(() => {
    if (!typing) {
      onDone?.()
      return
    }
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))
    let at = delay
    for (let i = 1; i <= text.length; i++) {
      at += speed[0] + Math.random() * (speed[1] - speed[0])
      later(() => setShown(i), at)
    }
    later(() => onDone?.(), at)
    later(() => setCursor('fading'), at + CURSOR_LINGER)
    later(() => setCursor('off'), at + CURSOR_LINGER + CURSOR_FADE)
    return () => timers.forEach(window.clearTimeout)
    // Runs once per page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>
        {text.slice(0, shown)}
        {cursor !== 'off' && (
          <span
            className="relative inline-block w-0 align-[-0.1em] transition-opacity"
            style={{ opacity: cursor === 'fading' ? 0 : 1, transitionDuration: `${CURSOR_FADE}ms` }}
          >
            <span className="absolute left-[0.04em] block w-[0.06em] animate-caret bg-current" style={{ height: '0.95em', bottom: 0 }} />
          </span>
        )}
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </p>
  )
}
