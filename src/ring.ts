import ringSound from './assets/ring.mp3'

/*
 * The button's telephone ring: a short recorded clip (src/assets/ring.mp3), loaded
 * ahead of time so it plays the instant the button is clicked.
 */
const ring = typeof Audio === 'undefined' ? undefined : new Audio(ringSound)
if (ring) ring.preload = 'auto'

/** Ring once. Ignored while the ring is already playing. */
export function ringOnce() {
  if (!ring || !ring.paused) return
  ring.currentTime = 0
  void ring.play().catch(() => {})
}
