import { fillsOf, type Design, type SlotFill } from './model'
import type { ShapeId } from './shapes'
import { placeInSlot, rotationsIn } from './placement'
import { TEMPLATE_BY_ID, type Point } from './templates'

export type DropTarget = { kind: 'slot'; slot: number } | { kind: 'edge' }

/** Outlines run clockwise, so inside means the same side of every edge. */
export const isInside = (poly: Point[], [x, y]: Point) =>
  poly.every(([ax, ay], k) => {
    const [bx, by] = poly[(k + 1) % poly.length]
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0
  })

/** Only the tile in focus counts. `edgeBand` 0 means slots only. */
export const hitTest = (design: Design, [x, y]: Point, edgeBand: number): DropTarget | null => {
  const fromEdge = Math.min(x, 1 - x, y, 1 - y)
  if (fromEdge < 0) return null
  if (fromEdge < edgeBand) return { kind: 'edge' }

  const slot = TEMPLATE_BY_ID[design.template].slots.findIndex(({ poly }) => isInside(poly, [x, y]))
  return slot < 0 ? null : { kind: 'slot', slot }
}

export const slotCentre = (design: Design, slot: number): Point => {
  const slotShape = TEMPLATE_BY_ID[design.template].slots[slot]
  const { shape, rotation } = fillsOf(design)[slot]
  if (!shape) return [slotShape.cx, slotShape.cy]
  const { cx, cy } = placeInSlot(slotShape, shape, rotation)
  return [cx, cy]
}

export const withFill = (design: Design, slot: number, change: Partial<SlotFill>): Design => {
  const fills = design.fills.map((fill, k) => (k === slot ? { ...fill, ...change } : fill))
  return { ...design, fills }
}

const leastUsedInk = (design: Design, avoid: (number | null)[]) => {
  const uses = design.colours.map(() => 0)
  for (const fill of fillsOf(design)) {
    if (fill.shape) uses[fill.ink]++
    if (fill.patch != null) uses[fill.patch]++
  }
  const inks = uses.map((_, ink) => ink).filter((ink) => !avoid.includes(ink))
  return inks.reduce((best, ink) => (uses[ink] < uses[best] ? ink : best))
}

/** The same shape's colour if it's already in the tile, then the slot's, then the least used. */
const defaultInk = (design: Design, slot: number, shape: ShapeId) => {
  const fills = fillsOf(design)
  const old = fills[slot]
  const avoid = [design.background, old.patch]
  const candidates = [
    fills.find((fill) => fill.shape === shape)?.ink,
    old.shape ? old.ink : undefined,
  ]
  const usable = candidates.find((ink) => ink !== undefined && !avoid.includes(ink))
  return usable ?? leastUsedInk(design, avoid)
}

export const placeShape = (design: Design, slot: number, shape: ShapeId): Design => {
  if (fillsOf(design)[slot].shape === shape) return design
  return withFill(design, slot, { shape, rotation: 0, ink: defaultInk(design, slot, shape) })
}

/** Used by both the ghost preview and the real drop. */
export const dropShape = (design: Design, target: DropTarget, shape: ShapeId): Design => {
  if (target.kind === 'slot') return placeShape(design, target.slot, shape)
  return fillsOf(design).reduce((next, _, slot) => placeShape(next, slot, shape), design)
}

export const rotateShape = (design: Design, slot: number): Design => {
  const { shape, rotation } = fillsOf(design)[slot]
  if (!shape) return design
  const rotations = rotationsIn(TEMPLATE_BY_ID[design.template].slots[slot], shape)
  return withFill(design, slot, { rotation: ((rotation % rotations) + 1) % rotations })
}
