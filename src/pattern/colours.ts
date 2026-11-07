import { dropShape, hitTest, withFill, type DropTarget } from './drops'
import { fillsOf, type Design } from './model'
import { MOODS } from './moods'
import { fitToSlot, SHAPE_BY_ID, type ShapeId } from './shapes'
import { placeInSlot } from './placement'
import { TEMPLATE_BY_ID, type Point } from './templates'

/** `edge` is every shape. `background` is the chip: the slot's patch if `slot` is set. */
export type ColourTarget =
  | { kind: 'shape'; slot: number }
  | { kind: 'patch'; slot: number }
  | { kind: 'edge' }
  | { kind: 'background'; slot?: number }

export type Carried = { kind: 'shape'; shape: ShapeId } | { kind: 'colour'; ink: number }

export type Target = DropTarget | ColourTarget

const unrotated = ([x, y]: Point, degrees: number): Point => {
  const [sin, cos] = [Math.sin((degrees * Math.PI) / 180), Math.cos((degrees * Math.PI) / 180)]
  return [x * cos + y * sin, y * cos - x * sin]
}

type Reach = { optical: Record<ShapeId, number>; shapeZone: number; edgeBand: number }

/** Only the middle of the slot counts, or a full-size shape would leave no way to its patch. */
const isOverShape = (design: Design, index: number, [x, y]: Point, reach: Reach) => {
  const { shape, rotation } = fillsOf(design)[index]
  if (!shape) return false

  const place = placeInSlot(TEMPLATE_BY_ID[design.template].slots[index], shape, rotation)
  const dx = x - place.cx
  const dy = y - place.cy
  if (Math.max(Math.abs(dx), Math.abs(dy)) > (place.size * reach.shapeZone) / 2) return false

  const { box, art } = SHAPE_BY_ID[shape]
  const size = place.size * fitToSlot(design.shapeSize, reach.optical[shape])
  const [localX, localY] = unrotated([dx, dy], place.degrees)
  const gridX = (localX / size) * box.side + box.x + box.side / 2
  const gridY = (localY / size) * box.side + box.y + box.side / 2
  return (
    gridX >= art.x && gridX <= art.x + art.width && gridY >= art.y && gridY <= art.y + art.height
  )
}

export const colourTargetAt = (design: Design, world: Point, reach: Reach): ColourTarget | null => {
  const hit = hitTest(design, world, reach.edgeBand)
  if (hit?.kind !== 'slot') return hit
  const kind = isOverShape(design, hit.slot, world, reach) ? 'shape' : 'patch'
  return { kind, slot: hit.slot }
}

/** `slotBackground` is a slot waiting for a patch colour. */
export type Selection =
  | { kind: 'slot'; slot: number }
  | { kind: 'slotBackground'; slot: number }
  | { kind: 'background' }

export const slotOf = (selection: Selection | null) =>
  selection && selection.kind !== 'background' ? selection.slot : null

export const selectionAt = (design: Design, world: Point): Selection | null => {
  const hit = hitTest(design, world, 0)
  return hit?.kind === 'slot' ? { kind: 'slot', slot: hit.slot } : null
}

/** The shape, unless there is none or the patch was asked for. */
export const targetOf = (
  design: Design,
  selection: Selection,
): Exclude<ColourTarget, { kind: 'edge' }> => {
  if (selection.kind === 'background') return selection
  const { slot } = selection
  const shaped = selection.kind === 'slot' && fillsOf(design)[slot].shape !== null
  return { kind: shaped ? 'shape' : 'patch', slot }
}

export const inkOf = (design: Design, selection: Selection) => {
  const target = targetOf(design, selection)
  if (target.kind === 'background') return design.background
  const fill = fillsOf(design)[target.slot]
  return target.kind === 'shape' ? fill.ink : (fill.patch ?? design.background)
}

/** Anything in the new background colour swaps to the old one, so nothing disappears. */
const withBackground = (design: Design, background: number): Design => {
  const old = design.background
  const traded = (ink: number) => (ink === background ? old : ink === old ? background : ink)
  const fills = design.fills.map((fill) => {
    const shapeWouldVanish = fill.patch === null && fill.ink === background
    if (!shapeWouldVanish && fill.patch !== background) return fill
    return {
      ...fill,
      ink: traded(fill.ink),
      patch: fill.patch === null ? null : traded(fill.patch),
    }
  })
  return { ...design, background, fills }
}

/** Painting a patch the background colour clears it. */
const withPatch = (design: Design, slot: number, ink: number): Design =>
  withFill(design, slot, { patch: ink === design.background ? null : ink })

export const dropColour = (design: Design, target: ColourTarget, ink: number): Design => {
  if (target.kind === 'shape') return withFill(design, target.slot, { ink })
  if (target.kind === 'patch') return withPatch(design, target.slot, ink)
  if (target.kind === 'background') {
    return target.slot === undefined
      ? withBackground(design, ink)
      : withPatch(design, target.slot, ink)
  }
  const showing = fillsOf(design).length
  const fills = design.fills.map((fill, slot) => (slot < showing ? { ...fill, ink } : fill))
  return { ...design, fills }
}

/** The one function behind both the preview and the real drop. */
export const applyDrop = (design: Design, carried: Carried, target: Target): Design =>
  carried.kind === 'colour'
    ? dropColour(design, target as ColourTarget, carried.ink)
    : dropShape(design, target as DropTarget, carried.shape)

const COLOUR_LABELS = {
  shape: 'Shape colour',
  patch: 'Slot background',
  edge: 'Every shape',
  background: 'Background',
}

export const dropLabel = (carried: Carried, target: Target) => {
  if (carried.kind === 'colour') {
    const colour = target as ColourTarget
    return colour.kind === 'background' && colour.slot !== undefined
      ? COLOUR_LABELS.patch
      : COLOUR_LABELS[colour.kind]
  }
  return target.kind === 'edge' ? 'Fill every slot' : 'Into this slot'
}

export const slotsOf = (design: Design, target: Target) => {
  if (target.kind === 'background' || target.kind === 'patch') return []
  if (target.kind === 'edge') return fillsOf(design).map((_, slot) => slot)
  return [target.slot]
}

export const moodOf = ({ colours }: Design) =>
  MOODS.find((mood) =>
    mood.colours.every((colour, ink) => colour.toLowerCase() === colours[ink].toLowerCase()),
  ) ?? null

export const withColour = (design: Design, ink: number, colour: string): Design => ({
  ...design,
  colours: design.colours.map((old, k) => (k === ink ? colour : old)),
})

export type Hsv = { h: number; s: number; v: number }

export const hsvToHex = ({ h, s, v }: Hsv) => {
  const channel = (n: number) => {
    const k = (n + h * 6) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  const hex = [channel(5), channel(3), channel(1)].map((value) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0'),
  )
  return `#${hex.join('')}`
}

export const parseHex = (text: string) => {
  const digits = text.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(digits)) return `#${digits}`
  if (/^[0-9a-f]{3}$/.test(digits)) return `#${digits.replace(/./g, '$&$&')}`
  return null
}

export const hexToHsv = (hex: string): Hsv => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
  const v = Math.max(r, g, b)
  const range = v - Math.min(r, g, b)
  if (range === 0) return { h: 0, s: 0, v }

  let sextant = (r - g) / range + 4
  if (v === r) sextant = ((g - b) / range + 6) % 6
  else if (v === g) sextant = (b - r) / range + 2
  return { h: sextant / 6, s: range / v, v }
}
