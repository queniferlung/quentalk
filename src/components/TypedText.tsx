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

/**
 * Text that types itself in, one letter at a time. The untyped letters are kept invisible
 * rather than removed, so the line takes its full space from the start and nothing around it
 * shifts. Screen readers get the whole sentence at once.
 */
export default function TypedText({ text, animate, delay = 0, speed = [45, 60], onDone, className = '' }: TypedTextProps) {
  const typing = animate && !prefersReducedMotion()
  const [shown, setShown] = useState(typing ? 0 : text.length)

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
    return () => timers.forEach(window.clearTimeout)
    // Runs once per page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>
        {text.slice(0, shown)}
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </p>
  )
}
