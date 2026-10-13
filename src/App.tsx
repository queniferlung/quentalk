import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Backdrop from './components/Backdrop'
import StoryForm from './components/StoryForm'
import TypedText from './components/TypedText'
import { prefersReducedMotion } from './motion'
import { ringOnce } from './ring'
import cordLeft from './assets/cord.png'
import cordFar from './assets/cord-far.png'
import cordRight from './assets/cord-right.png'
import phoneFar from './assets/phone-far.png'
import phoneLeft from './assets/phone.png'
import phoneRight from './assets/phone-right.png'
import rotaryPhone from './assets/rotary-phone.webp'

/** True when this page load is a refresh, so the opening animation can be skipped. */
function isReload() {
  const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  return nav?.type === 'reload'
}

const animateTitle = !isReload()

/**
 * Opening sequence (ms): the handsets drop in, in a shuffled order, while the heading comes
 * into focus (1.4s). Then the tagline starts typing and the button rises, together.
 */
const ENTER_TIME = 900
const ENTER_STAGGER = 120
/**
 * The heading blurs in alongside the drops; the tagline and button start together a little
 * before the last handset settles (at 1.26s), so the two waves overlap slightly.
 */
const TAGLINE_DELAY = 1000

/**
 * How far down the page the heading sits (the handsets' cords run up from it to the top).
 * Set on <main> as --title-top: 25svh + 53px, or 32svh + 53px below 900px wide.
 */
const TITLE_TOP = 'var(--title-top)'

/** Very faint, soft shadow each handset casts on the wall behind it, a little down and right. */
const WALL_SHADOW = 'drop-shadow(7px 12px 10px rgb(0 0 0 / 0.13))'

/**
 * Exit timings (ms): everything starts together. The handsets reel up one after another;
 * the texts sink and fade slowly alongside them, finishing just after the last handset.
 */
const REEL_TIME = 1100
const REEL_STAGGER = 140
const SINK_START = 0
const SINK_TIME = 1650
const SINK_STAGGER = 120

/** Return timings (ms): handsets drop back in with a bounce; texts rise back alongside them. */
const DROP_TIME = 1100
const RISE_TIME = 1100
/** How long the form takes to fade out before the page comes back. */
const FORM_FADE = 300

/** Exit ends once the last text has faded; return ends once the last handset has settled. */
const EXIT_TOTAL = SINK_START + 2 * SINK_STAGGER + SINK_TIME
const RETURN_TOTAL = 3 * REEL_STAGGER + DROP_TIME
/** With reduced motion, the page simply fades out and back in. */
const FADE_TOTAL = 1000

/** Which way the page is moving: clearing away for the form, or coming back after it. */
type Move = 'enter' | 'leave' | 'return' | undefined

/** Inline style that sinks a text away (or brings it back up), `order` steps after the first. */
const textMove = (move: Move, order: number): CSSProperties | undefined => {
  // The opening ('enter') is the heading's own blur-in and the typed tagline, not a slide
  if (!move || move === 'enter' || prefersReducedMotion()) return undefined
  return move === 'leave'
    ? { animation: `sink-out ${SINK_TIME}ms cubic-bezier(0.4, 0, 0.6, 1) ${SINK_START + order * SINK_STAGGER}ms both` }
    : { animation: `rise-back ${RISE_TIME}ms cubic-bezier(0.22, 1, 0.36, 1) ${order * SINK_STAGGER}ms both` }
}

/** Handset size, relative to the original placement (1216 photo pixels = 3.4em). */
const PHONE_SIZE = 0.768

/** Both handset photos are drawn at the same scale. */
const PHOTO_SCALE = (PHONE_SIZE * 3.4) / 1216

/** Each handset shrinks about its own middle, so the space it gave up is split above and below. */
const sizeOffset = (photoH: number) => ((1 - PHONE_SIZE) / 2) * (photoH * PHOTO_SCALE) / PHONE_SIZE

type HangingPhoneProps = {
  /** Handset photo (cord at the top), its size in pixels, and where the cord sits across it (0-1). */
  photo: string
  photoW: number
  photoH: number
  cordX: number
  /** One seamless coil cut from the photo's cord, stretched so exactly `coils` turns reach the top. */
  cord: string
  coils: number
  /**
   * Photo rows to hide above the handset (a whole number of the photo's coils), so the
   * loose cord runs straight into the handset's neck.
   */
  trim: number
  /** How far below the heading's top the handset's bottom sits (at full size). */
  bottom?: string
  /** Or: exactly where the handset's bottom hangs, measured from the heading's top. */
  hangTo?: string
  /** Outer edge placement, and a swing delay so the handsets don't move in step. */
  className: string
  swingDelay?: string
  /** Flip the photo left-to-right, so the handset faces the other way. */
  mirror?: boolean
  /** Extra size for this handset only, shrinking about its own middle (1 = shared size). */
  scale?: number
  /** Resting tilt of the handset (degrees), turning about where the cord meets it. */
  tilt?: number
  /**
   * Reeled up off the top of the screen (or dropped back in), `reelOrder` steps after the
   * first. On first open they drop in in `enterOrder` instead, a shuffled order.
   */
  move?: Move
  reelOrder?: number
  enterOrder?: number
}

/** A handset hanging from the very top of the page on a coiled cord, swinging gently from the top. */
function HangingPhone({
  photo,
  photoW,
  photoH,
  cordX,
  cord,
  coils,
  trim,
  bottom,
  hangTo,
  className,
  swingDelay,
  mirror,
  scale = 1,
  tilt = 0,
  move,
  reelOrder = 0,
  enterOrder = 0,
}: HangingPhoneProps) {
  const flip = mirror ? '-scale-x-100' : ''
  const photoScale = PHOTO_SCALE * scale
  const scaleOffset = ((1 - scale) / 2) * photoH * PHOTO_SCALE
  const pivotX = `${(mirror ? 1 - cordX : cordX) * 100}%`
  const style: CSSProperties = {
    top: `calc(-1 * ${TITLE_TOP})`,
    height: hangTo
      ? `calc(${TITLE_TOP} + ${hangTo})`
      : `calc(${TITLE_TOP} + ${bottom} - ${sizeOffset(photoH) + scaleOffset}em)`,
    width: `${photoW * photoScale}em`,
    transformOrigin: `${pivotX} 0`,
    filter: WALL_SHADOW,
    // Keep swinging while it drops in or is reeled up, so it moves from wherever it is
    ...(move && !prefersReducedMotion()
      ? {
          animation: `swing 3.2s ease-in-out ${swingDelay ?? '0s'} infinite alternate, ${
            move === 'leave'
              ? `reel-up ${REEL_TIME}ms linear ${reelOrder * REEL_STAGGER}ms`
              : move === 'return'
                ? `drop-in ${DROP_TIME}ms linear ${reelOrder * REEL_STAGGER}ms`
                : `drop-in ${ENTER_TIME}ms linear ${enterOrder * ENTER_STAGGER}ms`
          } both`,
        }
      : { animationDelay: swingDelay }),
  }
  return (
    <div aria-hidden className={`absolute flex flex-col justify-end motion-safe:animate-swing ${className}`} style={style}>
      <div
        className={`flex-1 ${flip}`}
        style={{
          backgroundImage: `url(${cord})`,
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'bottom',
          backgroundSize: `100% ${100 / coils}%`,
        }}
      />
      <div
        className="relative flex-none overflow-hidden"
        style={{ height: `${(photoH - trim) * photoScale}em`, rotate: `${tilt}deg`, transformOrigin: `${pivotX} 0` }}
      >
        <img
          src={photo}
          alt=""
          width={photoW}
          height={photoH}
          className={`absolute bottom-0 left-0 block w-auto max-w-none ${flip}`}
          style={{ height: `${photoH * photoScale}em` }}
        />
      </div>
    </div>
  )
}

function App() {
  // The button waits for the tagline on an animated first open; otherwise it's there at once
  const [button, setButton] = useState<'waiting' | 'rising' | 'shown'>(() =>
    animateTitle && !prefersReducedMotion() ? 'waiting' : 'shown',
  )
  // ...rising as the tagline starts typing, rather than waiting for it to finish
  useEffect(() => {
    if (button !== 'waiting') return
    const timer = window.setTimeout(() => setButton((b) => (b === 'waiting' ? 'rising' : b)), TAGLINE_DELAY)
    return () => window.clearTimeout(timer)
    // Runs once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * Clicking "Send your story" rings and clears the stage (handsets reeled up, texts sink
   * away), then the story form appears. Closing it fades the form, drops the handsets back in
   * and brings the texts back up.
   */
  const [phase, setPhase] = useState<'home' | 'leaving' | 'form' | 'closing' | 'returning'>('home')
  const [hasLeft, setHasLeft] = useState(false)
  const sendButton = useRef<HTMLButtonElement>(null)
  const move: Move =
    phase === 'leaving' || phase === 'form' || phase === 'closing'
      ? 'leave'
      : phase === 'returning'
        ? 'return'
        : animateTitle && !hasLeft
          ? 'enter'
          : undefined

  const sendStory = () => {
    ringOnce()
    setHasLeft(true)
    setButton('shown')
    setPhase('leaving')
  }
  const closeForm = () => setPhase((p) => (p === 'form' ? 'closing' : p))

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const next = { leaving: 'form', closing: 'returning', returning: 'home' } as const
    if (!(phase in next)) return
    const wait = { leaving: reduced ? FADE_TOTAL : EXIT_TOTAL, closing: FORM_FADE, returning: reduced ? FADE_TOTAL : RETURN_TOTAL }[
      phase as keyof typeof next
    ]
    const timer = window.setTimeout(() => setPhase(next[phase as keyof typeof next]), wait)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Back home after the form: return keyboard focus to the button that opened it
  useEffect(() => {
    if (phase === 'home' && hasLeft) sendButton.current?.focus()
  }, [phase, hasLeft])

  // Escape closes the form
  useEffect(() => {
    if (phase !== 'form') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeForm()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const away = phase !== 'home'

  return (
    <>
      <Backdrop />
      <main
        className={`min-h-svh px-4 pt-(--title-top) text-center flex flex-col items-center [--title-top:calc(25svh+53px)] max-[900px]:[--title-top:calc(32svh+53px)] max-[600px]:[--title-top:calc(28svh+53px)] motion-reduce:transition-opacity motion-reduce:duration-1000 ${
          away ? 'pointer-events-none' : ''
        } ${move === 'leave' ? 'motion-reduce:opacity-0' : ''}`}
        aria-hidden={away || undefined}
        inert={away}
      >
        {/*
          Heading and handsets as one group. The handsets are sized from this group's font size;
          the heading itself is set 20% larger.
        */}
        <div className="relative inline-block text-[clamp(3.5rem,min(19vw,15svh),8.5rem)] [--gap-inner:clamp(75px,6.5vw,125px)] [--gap-outer:clamp(80px,8.5vw,160px)]">
          {/*
            Four handsets hang from the top of the page. On desktop: an inner pair with clear
            space either side of the word, and a smaller outer pair further out (from 1280px wide). Between 900px
            and 1280px only the inner pair fits; on phones and narrow tablets a smaller copy of
            the outer pair hangs near the screen edges, above and clear of the word. Heights (cord lengths) and tilts
            differ a little on purpose. (`+ 3svh - 53px` keeps each handset at its earlier height
            on the page as the heading has moved.)
          */}
          {/*
            Spacing grows with the screen: inner handsets 85-135px from the word (but never
            closer than 12px to the screen edge), outer ones a further 80-160px (10px more on
            the right).
          */}
          {/* Inner left */}
          <HangingPhone
            photo={phoneLeft}
            photoW={334}
            photoH={1216}
            cordX={0.524}
            cord={cordLeft}
            coils={7}
            trim={198}
            bottom="calc(3.8em - 210px + 3svh - 53px)"
            className="max-[900px]:hidden right-[min(calc(100%+var(--gap-inner)+10px),calc(50%+50vw-0.7172em-12px))]"
            tilt={-3}
            move={move}
            reelOrder={1}
            enterOrder={2}
          />
          {/* Outer left: the right photo mirrored, 10% smaller, beyond the inner left (334 photo px wide) */}
          <HangingPhone
            photo={phoneRight}
            photoW={356}
            photoH={1283}
            cordX={0.452}
            cord={cordRight}
            coils={6}
            trim={223}
            bottom="calc(3.45em - 240px + 3svh - 53px)"
            className="max-xl:hidden right-[calc(100%+var(--gap-inner)-13px+var(--gap-outer)+0.7172em)]"
            swingDelay="-2.3s"
            mirror
            scale={0.9}
            tilt={4}
            move={move}
            reelOrder={0}
            enterOrder={0}
          />
          {/* Inner right: hanging lowest */}
          <HangingPhone
            photo={phoneRight}
            photoW={356}
            photoH={1283}
            cordX={0.452}
            cord={cordRight}
            coils={9}
            trim={223}
            bottom="calc(4.15em - 190px + 3svh - 53px)"
            className="max-[900px]:hidden left-[min(calc(100%+var(--gap-inner)+10px),calc(50%+50vw-0.7645em-12px))]"
            swingDelay="-1.6s"
            tilt={2.5}
            move={move}
            reelOrder={2}
            enterOrder={3}
          />
          {/* Outer right: 10% smaller, beyond the inner right (356 photo px wide) */}
          <HangingPhone
            photo={phoneFar}
            photoW={313}
            photoH={1097}
            cordX={0.404}
            cord={cordFar}
            coils={6}
            trim={172}
            bottom="calc(3.14em - 180px + 3svh - 53px)"
            className="max-xl:hidden left-[calc(100%+var(--gap-inner)+10px+var(--gap-outer)+10px+0.7645em)]"
            swingDelay="-0.9s"
            scale={0.9}
            tilt={-4}
            move={move}
            reelOrder={3}
            enterOrder={1}
          />
          {/*
            Below 900px only: the outer pair, smaller, at the screen edges and well above the
            word. Sized from a fixed phone-scale font rather than the heading, so they stay
            small on narrow tablets too.
          */}
          <div className="pointer-events-none absolute inset-0 text-[min(19vw,74px)] max-[600px]:hidden min-[900px]:hidden">
            <HangingPhone
              photo={phoneRight}
              photoW={356}
              photoH={1283}
              cordX={0.452}
              cord={cordRight}
              coils={5}
              trim={223}
              hangTo="calc(-13.5svh - 53px)"
              className="left-[calc(50%-50vw+33px)]"
              swingDelay="-2.3s"
              mirror
              scale={0.75}
              tilt={4}
              move={move}
              reelOrder={0}
              enterOrder={1}
            />
            <HangingPhone
              photo={phoneFar}
              photoW={313}
              photoH={1097}
              cordX={0.404}
              cord={cordFar}
              coils={5}
              trim={172}
              hangTo="calc(-12svh - 53px)"
              className="right-[calc(50%-50vw+10px)]"
              swingDelay="-0.9s"
              scale={0.75}
              tilt={-4}
              move={move}
              reelOrder={1}
              enterOrder={0}
            />
          </div>
          {/*
            Under 600px: all four handsets, smaller, spaced evenly across the top (centred at
            12.5%, 37.5%, 62.5% and 87.5% of the screen) and hanging well above the word. (The
            heading sits 4svh higher here, so the cords are 4svh shorter to keep them in place.)
          */}
          <div className="pointer-events-none absolute inset-0 text-[min(19vw,74px)] min-[600px]:hidden">
            <HangingPhone
              photo={phoneRight}
              photoW={356}
              photoH={1283}
              cordX={0.452}
              cord={cordRight}
              coils={5}
              trim={223}
              hangTo="calc(-9.5svh - 53px)"
              className="left-[calc(50%-37.5vw-0.237em)]"
              swingDelay="-2.3s"
              mirror
              scale={0.62}
              tilt={4}
              move={move}
              reelOrder={0}
              enterOrder={1}
            />
            <HangingPhone
              photo={phoneLeft}
              photoW={334}
              photoH={1216}
              cordX={0.524}
              cord={cordLeft}
              coils={5}
              trim={198}
              hangTo="calc(-6.5svh - 53px)"
              className="left-[calc(50%-12.5vw-0.2224em)]"
              scale={0.62}
              tilt={-3}
              move={move}
              reelOrder={1}
              enterOrder={3}
            />
            <HangingPhone
              photo={phoneRight}
              photoW={356}
              photoH={1283}
              cordX={0.452}
              cord={cordRight}
              coils={5}
              trim={223}
              hangTo="calc(-11svh - 53px)"
              className="left-[calc(50%+12.5vw-0.237em)]"
              swingDelay="-1.6s"
              scale={0.62}
              tilt={2.5}
              move={move}
              reelOrder={2}
              enterOrder={0}
            />
            <HangingPhone
              photo={phoneFar}
              photoW={313}
              photoH={1097}
              cordX={0.404}
              cord={cordFar}
              coils={5}
              trim={172}
              hangTo="calc(-8svh - 53px)"
              className="left-[calc(50%+37.5vw-0.2084em)]"
              swingDelay="-0.9s"
              scale={0.62}
              tilt={-4}
              move={move}
              reelOrder={3}
              enterOrder={2}
            />
          </div>
          <h1
            className={`relative -top-[12px] font-serif text-[1.2em] leading-none font-normal tracking-[-0.015em] text-black ${
              animateTitle && !hasLeft ? 'motion-safe:animate-focus-in' : ''
            }`}
            style={textMove(move, 0)}
          >
            QuenTalk
          </h1>
        </div>
        {/* Rises as the tagline starts typing. Below the tagline, except on mobile where it's above it. */}
        <div
          className={`order-3 mt-[47px] max-[600px]:order-2 max-[600px]:mt-[46px] ${button === 'waiting' ? 'opacity-0' : button === 'rising' ? 'animate-rise-in' : ''}`}
          style={textMove(move, 1)}
        >
          <button
            ref={sendButton}
            type="button"
            onClick={sendStory}
            className="rounded-none bg-neutral-900 px-[48px] py-[20px] font-serif text-[27px] text-white max-[600px]:px-[38px] max-[600px]:py-[16px] max-[600px]:text-[21.6px] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_6px_16px_rgb(0_0_0/0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black active:translate-y-0 active:shadow-none"
          >
            Send your story
          </button>
        </div>
        {/*
          Tagline under the button: types itself in once the heading is in focus. Always one line:
          on narrow screens it's 84% of the size that would just fit (the sentence is 19.74 × its
          font size wide).
        */}
        <div className="order-2 max-[600px]:order-3" style={textMove(move, 2)}>
          <TypedText
            text="A series where I try to untangle your problems."
            animate={animateTitle}
            delay={TAGLINE_DELAY}
            speed={[23, 30]}
            className="mt-[60px] max-[600px]:mt-[52px] font-sans text-[min(21.84px,calc((100vw-48px)/23.57))] leading-none whitespace-nowrap text-[#555] max-[600px]:relative max-[600px]:-top-[4px]"
          />
        </div>
        {/*
          The red rotary phone sits at the bottom of the screen: on mobile its base is slightly cut
          off by the bottom edge; on larger screens only its top half shows. Sized from the screen height (and width) so
          it stays clear of the tagline on short phones too. On first open it springs up from
          below the screen with a slight bounce, as the handsets drop in from the top.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-[calc(50%-var(--rotary-w)/2)] [--rotary-crop:-0.3675] [--rotary-w:min(32vw,46svh)] max-[600px]:[--rotary-crop:-0.06] max-[600px]:[--rotary-w:min(70vw,30svh)]"
          style={{
            width: 'var(--rotary-w)',
            // Mobile: the base is slightly cut off. Larger screens: only the top half shows
            // (the phone is 0.735 × its width tall, so half of it is 0.3675 × the width).
            bottom: 'calc(var(--rotary-w) * var(--rotary-crop))',
            ...(move === 'enter' && !prefersReducedMotion()
              ? { animation: `pop-up ${ENTER_TIME}ms linear both` }
              : textMove(move, 3)),
          }}
        >
          <img src={rotaryPhone} alt="" width={800} height={588} className="block h-auto w-full" />
        </div>
      </main>
      {(phase === 'form' || phase === 'closing') && <StoryForm closing={phase === 'closing'} onClose={closeForm} />}
    </>
  )
}

export default App
