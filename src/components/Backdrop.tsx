/*
 * Plain, seamless studio backdrop: one continuous sheet of pale, cool paper in soft
 * daylight from the upper left. No floor, horizon or shapes. Just a very gradual fade
 * from almost-white at the top left to a slightly deeper cool grey at the bottom right.
 */

/** Brightest point (top left) through to the deepest (bottom-right corner). */
const PAPER = [
  [0, '#f8f9fa'],
  [18, '#f5f6f7'],
  [38, '#f0f1f2'],
  [58, '#eaebed'],
  [78, '#e4e6e8'],
  [100, '#dfe1e3'],
] as const

/** Soft daylight from the upper left, falling off smoothly across the sheet. */
const LIGHT = `radial-gradient(150% 140% at 0% 0%, ${PAPER.map(([at, color]) => `${color} ${at}%`).join(', ')})`

/** Tiny tiling SVG noise tile: barely-visible grain, which also hides any gradient banding. */
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden"
      style={{ background: LIGHT }}
    >
      {/* Fine photographic grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px' }}
      />
    </div>
  )
}
