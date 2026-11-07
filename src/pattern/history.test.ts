import { describe, expect, it } from 'vitest'
import { withFill } from './drops'
import {
  afterChange,
  afterGesture,
  changedShapes,
  NO_HISTORY,
  redone,
  undone,
  type History,
} from './history'
import type { Design } from './model'
import { FIRST_LOAD } from './samples'

const sized = (shapeSize: number): Design => ({ ...FIRST_LOAD, shapeSize })

/** Change from one size to the next, as the store does. */
const changes = (sizes: number[], gesture: string | null = null) => {
  let history: History = NO_HISTORY
  for (let k = 1; k < sizes.length; k++) {
    history = afterChange(history, sized(sizes[k - 1]), sized(sizes[k]), gesture)
  }
  return history
}

describe('undo and redo', () => {
  it('steps back through changes, and forward again', () => {
    const history = changes([0.1, 0.2, 0.3])

    const back = undone(history, sized(0.3))!
    expect(back.design.shapeSize).toBe(0.2)

    const further = undone(back.history, back.design)!
    expect(further.design.shapeSize).toBe(0.1)
    expect(undone(further.history, further.design)).toBeNull()

    const forward = redone(further.history, further.design)!
    expect(forward.design.shapeSize).toBe(0.2)

    const again = redone(forward.history, forward.design)!
    expect(again.design.shapeSize).toBe(0.3)
    expect(redone(again.history, again.design)).toBeNull()
  })

  it('has nothing to undo or redo at the start', () => {
    expect(undone(NO_HISTORY, FIRST_LOAD)).toBeNull()
    expect(redone(NO_HISTORY, FIRST_LOAD)).toBeNull()
  })

  it('forgets what could be redone once something new happens', () => {
    const back = undone(changes([0.1, 0.2]), sized(0.2))!
    expect(back.history.future).toHaveLength(1)
    expect(afterChange(back.history, back.design, sized(0.5)).future).toEqual([])
  })

  it('ignores a change that makes no difference', () => {
    expect(afterChange(NO_HISTORY, sized(0.1), sized(0.1))).toBe(NO_HISTORY)
  })

  it('stops growing at a limit, losing the oldest first', () => {
    const sizes = Array.from({ length: 150 }, (_, k) => k / 150)
    const { past } = changes(sizes)
    expect(past).toHaveLength(100)
    expect(past.at(-1)?.shapeSize).toBe(sizes[148])
  })
})

describe('a drag', () => {
  it('counts as one step, however many changes it makes', () => {
    const history = changes([0.1, 0.2, 0.3, 0.4], 'size')
    expect(history.past).toHaveLength(1)
    expect(undone(history, sized(0.4))?.design.shapeSize).toBe(0.1)
  })

  it('makes a new step when a different drag starts straight after', () => {
    const first = changes([0.1, 0.2], 'size')
    expect(afterChange(first, sized(0.2), sized(0.3), 'colour').past).toHaveLength(2)
  })

  it('makes a new step for the same control once the first drag has ended', () => {
    const ended = afterGesture(changes([0.1, 0.2], 'size'), sized(0.2))
    expect(afterChange(ended, sized(0.2), sized(0.3), 'size').past).toHaveLength(2)
  })

  it('adds nothing if it finishes back where it started', () => {
    const history = changes([0.1, 0.2, 0.1], 'size')
    expect(afterGesture(history, sized(0.1)).past).toEqual([])
  })

  it('leaves earlier steps alone when it finishes back where it started', () => {
    const earlier = changes([0.5, 0.1])
    const dragged = afterChange(earlier, sized(0.1), sized(0.2), 'size')
    expect(afterGesture(dragged, sized(0.1)).past).toHaveLength(1)
  })
})

describe('what reacts to an undo', () => {
  it('names only the slots whose shape looks different', () => {
    const after = withFill(FIRST_LOAD, 2, { shape: 'star' })
    expect(changedShapes(FIRST_LOAD, after)).toEqual([2])
    expect(changedShapes(FIRST_LOAD, withFill(FIRST_LOAD, 1, { ink: 3 }))).toEqual([1])
    expect(changedShapes(FIRST_LOAD, withFill(FIRST_LOAD, 1, { rotation: 1 }))).toEqual([1])
  })

  it('skips a slot left empty, a patch alone, and anything outside the tile', () => {
    expect(changedShapes(FIRST_LOAD, withFill(FIRST_LOAD, 0, { shape: null }))).toEqual([])
    expect(changedShapes(FIRST_LOAD, withFill(FIRST_LOAD, 0, { patch: 2 }))).toEqual([])
    expect(changedShapes(FIRST_LOAD, sized(0.9))).toEqual([])
  })

  it('names nothing when the template changed', () => {
    expect(changedShapes(FIRST_LOAD, { ...FIRST_LOAD, template: 'ninePatch' })).toEqual([])
  })
})
