import type { Selection } from './colours'
import type { Design } from './model'

/** What someone has tried at least once. Kept across visits. */
export type Learned = {
  /** A shape or the template changed. */
  tile: boolean
  colour: boolean
  looked: boolean
  /** How the tile repeats changed. */
  shifted: boolean
  saved: boolean
  /** Opened, whether or not anything was saved. */
  openedSave: boolean
  clickedSlot: boolean
  changes: number
  /** `changes` when the repeat first changed, for the Save hint to count from. */
  shiftedAt: number
}

export const NOTHING_LEARNED: Learned = {
  tile: false,
  colour: false,
  looked: false,
  shifted: false,
  saved: false,
  openedSave: false,
  clickedSlot: false,
  changes: 0,
  shiftedAt: 0,
}

const differ = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)

const shapesOf = (design: Design) => [
  design.template,
  design.shapeSize,
  design.fills.map(({ shape, rotation }) => [shape, rotation]),
]

const repeatOf = (design: Design) => [
  design.shift,
  design.turn,
  design.alternateColours,
  design.gaps,
  design.angled,
  design.shuffle,
]

/** A dropped shape brings its own colour, which doesn't count as choosing one. */
const recoloured = (before: Design, after: Design) =>
  differ(before.colours, after.colours) ||
  before.background !== after.background ||
  before.fills.some((fill, k) => {
    const next = after.fills[k]
    return fill.patch !== next.patch || (fill.shape === next.shape && fill.ink !== next.ink)
  })

export const learnedFromChange = (learned: Learned, before: Design, after: Design): Learned => ({
  ...learned,
  tile: learned.tile || differ(shapesOf(before), shapesOf(after)),
  colour: learned.colour || recoloured(before, after),
  shifted: learned.shifted || differ(repeatOf(before), repeatOf(after)),
  changes: learned.changes + 1,
  shiftedAt: learned.shifted ? learned.shiftedAt : learned.changes + 1,
})

export const learnedFromClick = (learned: Learned, selection: Selection): Learned => {
  if (selection.kind === 'slot' && !learned.clickedSlot) return { ...learned, clickedSlot: true }
  return learned
}

export type HintId = 'tile' | 'colour' | 'look' | 'shift' | 'save'

/** Each hint goes once its thing has been tried, in any order. */
export const nextHint = (
  learned: Learned,
  view: 'tile' | 'pattern',
  selected: Selection | null,
  lookAfter: number,
  saveFor: number,
): HintId | null => {
  if (learned.shifted) {
    const done =
      learned.saved || learned.openedSave || learned.changes - learned.shiftedAt >= saveFor
    return done ? null : 'save'
  }
  if (view === 'pattern') return 'shift'
  if (selected && !learned.colour) return 'colour'
  const madeItTheirs = (learned.tile && learned.colour) || learned.changes >= lookAfter
  if (madeItTheirs && !learned.looked) return 'look'
  if (!learned.tile) return 'tile'
  if (!learned.colour) return 'colour'
  return null
}

export const selectLabel = (learned: Learned) =>
  learned.clickedSlot ? null : 'Click to select this slot'

/** Anything that doesn't parse counts as nothing learned. Missing keys count as not done yet. */
export const parseLearned = (text: string | null): Learned => {
  try {
    const saved = JSON.parse(text ?? '') as Record<string, unknown>
    const learned = { ...NOTHING_LEARNED }
    for (const key of Object.keys(learned) as (keyof Learned)[]) {
      if (saved[key] === undefined) continue
      if (typeof saved[key] !== typeof learned[key]) return NOTHING_LEARNED
      Object.assign(learned, { [key]: saved[key] })
    }
    return learned
  } catch {
    return NOTHING_LEARNED
  }
}
