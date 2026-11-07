import { describe, expect, it } from 'vitest'
import {
  dropShape,
  hitTest,
  placeShape,
  slotCentre,
  rotateShape,
  withFill,
  type DropTarget,
} from './drops'
import { fillsOf, type Design } from './model'
import { FIRST_LOAD } from './samples'
import { TEMPLATES, type Point } from './templates'

const BAND = 0.085

const on = (slot: number): DropTarget => ({ kind: 'slot', slot })

describe('hit testing', () => {
  it('finds the slot under a point on the tile in focus', () => {
    expect(hitTest(FIRST_LOAD, [0.75, 0.25], BAND)).toEqual(on(1))
  })

  it('treats the band inside the border as the edge', () => {
    expect(hitTest(FIRST_LOAD, [0.05, 0.5], BAND)?.kind).toBe('edge')
    expect(hitTest(FIRST_LOAD, [0.5, 0.97], BAND)?.kind).toBe('edge')
  })

  it('ignores the edge when asked for slots only', () => {
    expect(hitTest(FIRST_LOAD, [0.02, 0.02], 0)).toEqual(on(0))
  })

  it('has nothing to hit on the copies around it', () => {
    for (const point of [
      [1.25, 0.25],
      [0.25, -0.25],
      [-0.5, 0.5],
      [0.5, 1.5],
    ] as Point[]) {
      expect(hitTest(FIRST_LOAD, point, BAND)).toBeNull()
      expect(hitTest(FIRST_LOAD, point, 0)).toBeNull()
    }
  })

  it('tells the two triangles of a split tile apart', () => {
    const design: Design = { ...FIRST_LOAD, template: 'halfSquare' }
    expect(hitTest(design, [0.3, 0.3], BAND)).toEqual(on(0))
    expect(hitTest(design, [0.7, 0.7], BAND)).toEqual(on(1))
  })

  it.each(TEMPLATES)('finds every slot of $name where its shape sits', (template) => {
    const design: Design = { ...FIRST_LOAD, template: template.id }
    template.slots.forEach((_, slot) => {
      expect(hitTest(design, slotCentre(design, slot), 0)).toEqual(on(slot))
    })
  })

  it('stays put whatever the copies are doing', () => {
    const design: Design = {
      ...FIRST_LOAD,
      turn: 'scatter',
      gaps: true,
      shift: { axis: 'rows', amount: 0.5 },
    }
    expect(hitTest(design, [0.75, 0.25], BAND)).toEqual(on(1))
  })
})

describe('dropping a shape', () => {
  const empty: Design = {
    ...FIRST_LOAD,
    fills: FIRST_LOAD.fills.map(() => ({ shape: null, rotation: 0, ink: 1, patch: null })),
  }

  it('changes only the slot it landed on', () => {
    const next = dropShape(FIRST_LOAD, on(1), 'star')
    expect(fillsOf(next).map((fill) => fill.shape)).toEqual(['leaf', 'star', 'dot', 'leaf'])
  })

  it('fills every slot from the edge', () => {
    const target: DropTarget = { kind: 'edge' }
    const next = dropShape(FIRST_LOAD, target, 'star')
    expect(new Set(fillsOf(next).map((fill) => fill.shape))).toEqual(new Set(['star']))
    expect(new Set(fillsOf(next).map((fill) => fill.ink)).size).toBe(1)
  })

  it('leaves the design it was given alone, so a preview can be thrown away', () => {
    const before = JSON.stringify(FIRST_LOAD)
    dropShape(FIRST_LOAD, on(1), 'star')
    expect(JSON.stringify(FIRST_LOAD)).toBe(before)
  })

  it('reuses the colour of the same shape already in the tile', () => {
    const next = placeShape(FIRST_LOAD, 1, 'leaf')
    expect(fillsOf(next)[1].ink).toBe(fillsOf(FIRST_LOAD)[0].ink)
  })

  it('otherwise keeps the colour of the shape it replaces', () => {
    const next = placeShape(FIRST_LOAD, 1, 'star')
    expect(fillsOf(next)[1].ink).toBe(fillsOf(FIRST_LOAD)[1].ink)
  })

  it('otherwise uses the least-used colour, never the background', () => {
    const one = placeShape(empty, 0, 'star')
    const two = placeShape(one, 1, 'ring')
    const inks = fillsOf(two)
      .slice(0, 2)
      .map((fill) => fill.ink)
    expect(inks[0]).not.toBe(empty.background)
    expect(inks[1]).not.toBe(empty.background)
    expect(inks[0]).not.toBe(inks[1])
  })

  it('never picks a colour that would hide the shape against its patch', () => {
    const patched = withFill(empty, 1, { patch: fillsOf(placeShape(empty, 0, 'star'))[0].ink })
    const withStar = placeShape(patched, 0, 'star')
    const next = placeShape(withStar, 1, 'star')
    expect(fillsOf(next)[1].ink).not.toBe(fillsOf(next)[1].patch)
    expect(fillsOf(next)[1].ink).not.toBe(next.background)
  })

  it('starts a new shape upright, and keeps a repeated one as it is', () => {
    const turned = placeShape(FIRST_LOAD, 3, 'star')
    expect(fillsOf(turned)[3].rotation).toBe(0)
    expect(placeShape(FIRST_LOAD, 3, 'leaf')).toBe(FIRST_LOAD)
  })
})

describe('rotating a shape', () => {
  it('cycles through only the rotations that look different', () => {
    const once = rotateShape(FIRST_LOAD, 0)
    expect(fillsOf(once)[0].rotation).toBe(1)
    expect(fillsOf(rotateShape(once, 0))[0].rotation).toBe(0)
  })

  it('has nothing to rotate in an empty slot', () => {
    const empty = withFill(FIRST_LOAD, 0, { shape: null })
    expect(rotateShape(empty, 0)).toBe(empty)
  })
})
