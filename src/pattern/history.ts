import { fillsOf, type Design } from './model'

const LIMIT = 100

/** `gesture` names the drag in progress, so all of it is one step. */
export type History = { past: Design[]; future: Design[]; gesture: string | null }

export const NO_HISTORY: History = { past: [], future: [], gesture: null }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** A change that makes no difference adds no step. */
export const afterChange = (
  history: History,
  before: Design,
  after: Design,
  gesture: string | null = null,
): History => {
  if (same(before, after)) return history
  if (gesture && gesture === history.gesture) return history
  return { past: [...history.past, before].slice(-LIMIT), future: [], gesture }
}

/** A drag that ends where it started adds no step. */
export const afterGesture = (history: History, design: Design): History => {
  if (!history.gesture) return history
  const isBackAtStart = same(history.past.at(-1), design)
  return {
    ...history,
    past: isBackAtStart ? history.past.slice(0, -1) : history.past,
    gesture: null,
  }
}

export const undone = (history: History, design: Design) => {
  const previous = history.past.at(-1)
  if (!previous) return null
  return {
    design: previous,
    history: {
      past: history.past.slice(0, -1),
      future: [design, ...history.future],
      gesture: null,
    },
  }
}

export const redone = (history: History, design: Design) => {
  const next = history.future[0]
  if (!next) return null
  return {
    design: next,
    history: { past: [...history.past, design], future: history.future.slice(1), gesture: null },
  }
}

export const changedShapes = (before: Design, after: Design) => {
  if (before.template !== after.template) return []
  const shapeIn = (design: Design, slot: number) => {
    const { shape, rotation, ink } = fillsOf(design)[slot]
    return shape ? { shape, rotation, ink } : null
  }
  return fillsOf(after)
    .map((_, slot) => slot)
    .filter((slot) => shapeIn(after, slot) && !same(shapeIn(before, slot), shapeIn(after, slot)))
}
