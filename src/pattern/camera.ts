import { repeatBlock } from './layout'
import type { Design } from './model'

export type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

export type Camera = { cx: number; cy: number; scale: number }

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
    const [width, height] = repeatBlock(design)
    return { x: 0, y: 0, width, height }
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
  const [across, down] = repeatBlock(design)
  return { width: across * REPEAT_TILE_PIXELS, height: down * REPEAT_TILE_PIXELS }
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
  return `pattern-${slug}-${across}x${down}.${extension}`
}

/** Both views centre the master, so switching is one zoom. `share` is of the shorter side. */
export const centredCamera = (viewport: Size, share: number): Camera => ({
  cx: 0.5,
  cy: 0.5,
  scale: Math.min(viewport.width, viewport.height) * share,
})

export const visibleRect = (screen: Size, stage: Rect, camera: Camera): Rect => ({
  x: camera.cx - (stage.x + stage.width / 2) / camera.scale,
  y: camera.cy - (stage.y + stage.height / 2) / camera.scale,
  width: screen.width / camera.scale,
  height: screen.height / camera.scale,
})

export type TileRange = { i0: number; i1: number; j0: number; j1: number }

/** The margin covers spring overshoot. */
export const coverRange = (rects: Rect[], margin = 2): TileRange => ({
  i0: Math.floor(Math.min(...rects.map((r) => r.x))) - margin,
  i1: Math.ceil(Math.max(...rects.map((r) => r.x + r.width))) + margin,
  j0: Math.floor(Math.min(...rects.map((r) => r.y))) - margin,
  j1: Math.ceil(Math.max(...rects.map((r) => r.y + r.height))) + margin,
})
