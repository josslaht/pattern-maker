import { repeatBlock } from './layout'
import type { Design } from './model'

export type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

/** `angle` is degrees clockwise around (cx, cy). */
export type Camera = { cx: number; cy: number; scale: number; angle: number }

/** How far an angled pattern turns. */
export const ANGLE = 45

const MASTER_CENTRE = { x: 0.5, y: 0.5 }

/** The box around `rect` once it turns `degrees` around `centre`. */
export const turnedBounds = (rect: Rect, degrees: number, centre = MASTER_CENTRE): Rect => {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ].map(([x, y]) => [
    centre.x + (x - centre.x) * cos - (y - centre.y) * sin,
    centre.y + (x - centre.x) * sin + (y - centre.y) * cos,
  ])
  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** [across, down] in tiles. Turned 45°, the square block's side is √2 times the longer repeat. */
const repeatSides = (design: Design): [number, number] => {
  const [across, down] = repeatBlock(design)
  if (!design.angled) return [across, down]
  const side = Math.SQRT2 * lcm(across, down)
  return [side, side]
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const lcm = (a: number, b: number) => (a * b) / gcd(a, b)

export type LayoutId = 'phone' | 'tablet' | 'desktop' | 'square' | 'a4' | 'tile' | 'custom'

/** In the Save view's order. `label` is shown there, `name` goes in the file name. */
export const LAYOUTS: Record<LayoutId, { label: string; name: string; size: Size | null }> = {
  phone: { label: 'Phone', name: 'Phone wallpaper', size: { width: 1179, height: 2556 } },
  tablet: { label: 'Tablet', name: 'Tablet wallpaper', size: { width: 2048, height: 2732 } },
  desktop: { label: 'Desktop', name: 'Desktop 16:9', size: { width: 1920, height: 1080 } },
  square: { label: 'Square', name: 'Square', size: { width: 2048, height: 2048 } },
  a4: { label: 'A4 print', name: 'A4 print', size: { width: 2480, height: 3508 } },
  tile: { label: 'Repeat tile', name: 'Repeat tile', size: null },
  custom: { label: 'Custom', name: 'Custom', size: { width: 2000, height: 1500 } },
}

export const CUSTOM_RANGE = [64, 8000]

export const layoutSize = (layout: LayoutId, custom?: Size) =>
  layout === 'custom' && custom ? custom : LAYOUTS[layout].size

export const outputFrame = (
  design: Design,
  layout: LayoutId,
  across: number,
  custom?: Size,
): Rect => {
  const size = layoutSize(layout, custom)
  if (!size) {
    const [width, height] = repeatSides(design)
    // Centred like the others, since an angled pattern turns around the master's centre
    return design.angled
      ? { x: 0.5 - width / 2, y: 0.5 - height / 2, width, height }
      : { x: 0, y: 0, width, height }
  }
  // Centred on the master tile, so opposite edges crop the same
  const height = (across * size.height) / size.width
  return { x: 0.5 - across / 2, y: 0.5 - height / 2, width: across, height }
}

const REPEAT_TILE_PIXELS = 512

/** Whole pixels per tile keep a repeat tile's edges crisp. */
export const outputSize = (design: Design, layout: LayoutId, custom?: Size): Size => {
  const size = layoutSize(layout, custom)
  if (size) return size
  const [across, down] = repeatSides(design)
  return {
    width: Math.round(across * REPEAT_TILE_PIXELS),
    height: Math.round(down * REPEAT_TILE_PIXELS),
  }
}

/** Like pattern-phone-wallpaper.png or pattern-repeat-tile-2x2.svg. */
export const outputName = (
  design: Design,
  layout: LayoutId,
  extension: 'png' | 'svg',
  custom?: Size,
) => {
  const slug = LAYOUTS[layout].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const size = layoutSize(layout, custom)
  if (layout === 'custom' && size)
    return `pattern-${slug}-${size.width}x${size.height}.${extension}`
  if (size) return `pattern-${slug}.${extension}`
  const [across, down] = repeatBlock(design)
  const angled = design.angled ? '-angled' : ''
  return `pattern-${slug}-${across}x${down}${angled}.${extension}`
}

/** Both views centre the master, so switching is one zoom. `share` is of the shorter side. */
export const centredCamera = (viewport: Size, share: number, angle = 0): Camera => ({
  cx: 0.5,
  cy: 0.5,
  scale: Math.min(viewport.width, viewport.height) * share,
  angle,
})

/** Narrower than this is a phone. Tailwind's `sm`, so the CSS switches at the same width. */
export const PHONE_WIDTH = 640

/**
 * On a phone the tile is as wide as fits, leaving `margin` px of the copies at each side,
 * but no taller than `share` of the height. Its middle sits `middle` of the way down,
 * above the bar.
 */
export const phoneTileCamera = (
  viewport: Size,
  margin: number,
  share: number,
  middle: number,
): Camera => {
  const scale = Math.min(viewport.width - 2 * margin, viewport.height * share)
  const cy = 0.5 + (viewport.height / 2 - viewport.height * middle) / scale
  return { cx: 0.5, cy, scale, angle: 0 }
}

/** Where an upright camera puts the master on the stage, in px from the stage's top. */
export const tileOnStage = (viewport: Size, camera: Camera) => ({
  top: viewport.height / 2 - camera.cy * camera.scale,
  size: camera.scale,
})

/** In world units. Turned cameras see a turned window, so this is the box around it. */
export const visibleRect = (screen: Size, stage: Rect, camera: Camera): Rect =>
  turnedBounds(
    {
      x: camera.cx - (stage.x + stage.width / 2) / camera.scale,
      y: camera.cy - (stage.y + stage.height / 2) / camera.scale,
      width: screen.width / camera.scale,
      height: screen.height / camera.scale,
    },
    -camera.angle,
    { x: camera.cx, y: camera.cy },
  )

export type TileRange = { i0: number; i1: number; j0: number; j1: number }

/** The margin covers spring overshoot. */
export const coverRange = (rects: Rect[], margin = 2): TileRange => ({
  i0: Math.floor(Math.min(...rects.map((r) => r.x))) - margin,
  i1: Math.ceil(Math.max(...rects.map((r) => r.x + r.width))) + margin,
  j0: Math.floor(Math.min(...rects.map((r) => r.y))) - margin,
  j1: Math.ceil(Math.max(...rects.map((r) => r.y + r.height))) + margin,
})
