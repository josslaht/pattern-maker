import type { Design, SlotFill } from './model'
import { SHAPE_BY_ID } from './shapes'
import { MOST_SLOTS, TEMPLATE_BY_ID } from './templates'

const SHIFT_AXES = ['none', 'rows', 'cols']
const TILE_TURNS = ['none', 'pinwheel', 'mirror', 'scatter']

const isCount = (value: number, below: number) =>
  Number.isInteger(value) && value >= 0 && value < below

const isInk = (value: number) => isCount(value, 5)

const isFill = ({ shape, rotation, ink, patch }: SlotFill) =>
  (shape === null || Object.hasOwn(SHAPE_BY_ID, shape)) &&
  isCount(rotation, 4) &&
  isInk(ink) &&
  (patch === null || isInk(patch))

const isDesign = (design: Design) =>
  Object.hasOwn(TEMPLATE_BY_ID, design.template) &&
  design.fills.length === MOST_SLOTS &&
  design.fills.every(isFill) &&
  Number.isFinite(design.shapeSize) &&
  SHIFT_AXES.includes(design.shift.axis) &&
  Number.isFinite(design.shift.amount) &&
  TILE_TURNS.includes(design.turn) &&
  typeof design.alternateColours === 'boolean' &&
  typeof design.gaps === 'boolean' &&
  Number.isInteger(design.shuffle) &&
  design.colours.length === 5 &&
  design.colours.every((colour) => /^#[0-9a-f]{6}$/i.test(colour)) &&
  isInk(design.background)

/** Older names, so designs saved before the rename still open. */
const OLD_NAMES: Record<string, string> = {
  offset: 'shift',
  seed: 'shuffle',
  swap: 'alternateColours',
  colors: 'colours',
}
const OLD_FILL_NAMES: Record<string, string> = { motif: 'shape', turn: 'rotation' }

const renamed = (saved: object, names: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(saved).map(([key, value]) => [
      Object.hasOwn(names, key) ? names[key] : key,
      value,
    ]),
  )

const withNewNames = (saved: object) => {
  const design = renamed(saved, OLD_NAMES)
  return { ...design, fills: design.fills.map((fill: object) => renamed(fill, OLD_FILL_NAMES)) }
}

/** Null if this version can't draw it, since a bad design would break every visit. */
export const parseDesign = (text: string | null): Design | null => {
  if (!text) return null
  try {
    const design = withNewNames(JSON.parse(text)) as Design
    return isDesign(design) ? design : null
  } catch {
    return null
  }
}

const LINK_KEY = 'd='

export const designToLink = (design: Design) =>
  LINK_KEY + btoa(JSON.stringify(design)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export const designFromLink = (hash: string): Design | null => {
  const text = hash.replace(/^#/, '')
  if (!text.startsWith(LINK_KEY)) return null
  try {
    return parseDesign(atob(text.slice(LINK_KEY.length).replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}
